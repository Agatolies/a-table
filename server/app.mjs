import {createServer} from 'node:http';
import {createHmac,randomBytes,randomUUID,scryptSync,timingSafeEqual} from 'node:crypto';
import {mkdirSync,readFileSync,writeFileSync,existsSync,statSync} from 'node:fs';
import {resolve,sep,join,extname} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {validData} from './validation.mjs';
const MAX_BODY=9*1024*1024;
function fail(status,message){return Object.assign(new Error(message),{status})}
async function readBody(req,max=MAX_BODY){let length=0;const chunks=[];for await(const chunk of req){length+=chunk.length;if(length>max)throw fail(413,'Le fichier ou le carnet dépasse la taille autorisée.');chunks.push(chunk)}return Buffer.concat(chunks)}
const equal=(a,b)=>a.length===b.length&&timingSafeEqual(a,b);
const escape=s=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function createApp({dataDir,publicUrl,password,secret,distDir=resolve('dist')}){
 if(!password||password.length<16)throw Error('ADMIN_PASSWORD doit contenir au moins 16 caractères.');
 if(!secret||secret.length<32)throw Error('SESSION_SECRET doit contenir au moins 32 caractères.');
 const origin=new URL(publicUrl).origin;const secure=origin.startsWith('https:');
 mkdirSync(dataDir,{recursive:true,mode:0o700});const filesDir=join(dataDir,'receipts');mkdirSync(filesDir,{recursive:true,mode:0o700});
 const db=new DatabaseSync(join(dataDir,'a-table.sqlite'));db.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
 const schemaVersion=db.prepare('PRAGMA user_version').get().user_version;
 if(schemaVersion>1)throw Error('La base utilise une version plus récente de l’application.');
 if(schemaVersion===0){db.exec('BEGIN; CREATE TABLE IF NOT EXISTS notebooks (id INTEGER PRIMARY KEY CHECK(id = 1), data TEXT NOT NULL, version INTEGER NOT NULL); PRAGMA user_version=1; COMMIT;');}
 const salt=randomBytes(16);const expected=scryptSync(password,salt,64);const attempts=new Map();
 function signature(s){return createHmac('sha256',secret).update(s).digest('base64url')}
 function session(req){const cookie=req.headers.cookie?.split(';').map(s=>s.trim()).find(s=>s.startsWith('atable_session='))?.slice(15);if(!cookie||cookie.length>500)return false;const [payload,sig]=cookie.split('.');if(!payload||!sig||!equal(Buffer.from(sig),Buffer.from(signature(payload))))return false;try{const parsed=JSON.parse(Buffer.from(payload,'base64url'));return parsed.exp>Date.now()}catch{return false}}
 function cookie(token,age){return `atable_session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${age}${secure?'; Secure':''}`}
 function send(res,status,value,headers={}){const body=typeof value==='string'?value:JSON.stringify(value);res.writeHead(status,{'Content-Type':typeof value==='string'?'text/html; charset=utf-8':'application/json; charset=utf-8','Cache-Control':'no-store',...headers});res.end(body)}
 function loginPage(error=''){return `<!doctype html><html lang="fr"><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Connexion · À table</title><style>body{background:#f5f5ee;color:#355540;font:15px system-ui;display:grid;place-items:center;min-height:90vh;margin:0}main{width:min(340px,80vw);padding:35px;background:white;border:1px solid #e2e5d7;border-radius:12px}h1{font:46px Georgia;margin:0 0 15px}p{line-height:1.6;color:#7d8873}label{font-size:13px}input,button{box-sizing:border-box;width:100%;padding:12px;border-radius:6px;font:inherit;margin-top:10px}input{border:1px solid #d7dfcb}button{background:#355540;color:white;border:0;cursor:pointer}.error{color:#ad5135}</style><main><h1>à table ✳</h1><p>Le carnet de la maison.<br>Connectez-vous pour retrouver vos recettes, menus et courses.</p>${error?'<p role="alert" class="error">'+escape(error)+'</p>':''}<form action="/auth/login" method="post"><label for="password">Mot de passe du foyer</label><input id="password" type="password" name="password" autocomplete="current-password" maxlength="1024" required autofocus><button>Ouvrir le carnet</button></form></main></html>`}
 const server=createServer(async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','same-origin');res.setHeader('X-Frame-Options','DENY');res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'self'; object-src 'none'");
  try{
   const url=new URL(req.url,origin);const method=req.method||'GET';
   if(url.pathname==='/healthz'&&method==='GET'){db.prepare('SELECT 1').get();return send(res,200,{status:'ok'})}
   if(!['GET','HEAD'].includes(method)&&(req.headers.origin!==origin||req.headers['sec-fetch-site']==='cross-site'))return send(res,403,{error:'Origine de la requête refusée.'});
   if(url.pathname==='/login'&&method==='GET')return session(req)?send(res,303,'',{'Location':'/'}):send(res,200,loginPage());
   if(url.pathname==='/auth/login'&&method==='POST'){
    const ip=req.socket.remoteAddress||'unknown';const now=Date.now();for(const [k,a]of attempts)if(a.until<now)attempts.delete(k);
    const attempt=attempts.get(ip)||{count:0,until:now+15*60*1000};if(attempt.count>=10)return send(res,429,loginPage('Trop de tentatives. Réessayez dans quinze minutes.'),{'Retry-After':'900'});
    const form=new URLSearchParams((await readBody(req,4096)).toString());const entered=form.get('password')||'';attempt.count++;attempts.set(ip,attempt);
    if(!equal(scryptSync(entered,salt,64),expected))return send(res,401,loginPage('Mot de passe incorrect.'));
    attempts.delete(ip);const payload=Buffer.from(JSON.stringify({exp:now+7*86400000,nonce:randomBytes(16).toString('hex')})).toString('base64url');return send(res,303,'',{'Location':'/','Set-Cookie':cookie(payload+'.'+signature(payload),7*86400)});
   }
   if(!session(req)){if(url.pathname.startsWith('/api/'))return send(res,401,{error:'Connexion requise'});return send(res,303,'',{'Location':'/login'})}
   if(url.pathname==='/auth/logout'&&method==='POST')return send(res,303,'',{'Location':'/login','Set-Cookie':cookie('',0)});
   if(url.pathname==='/api/data'&&method==='GET'){const row=db.prepare('SELECT data,version FROM notebooks WHERE id=1').get();return send(res,200,row?{data:JSON.parse(row.data),version:row.version}:{data:null,version:0})}
   if(url.pathname==='/api/data'&&method==='PUT'){
    if(!req.headers['content-type']?.includes('application/json'))return send(res,415,{error:'JSON requis'});
    let payload;try{payload=JSON.parse((await readBody(req,2500000)).toString())}catch(e){if(e.status)throw e;throw fail(400,'JSON invalide')}
    if(!Number.isInteger(payload.version)||payload.version<0||!validData(payload.data))return send(res,400,{error:'Données du carnet invalides.'});
    const result=payload.version===0?db.prepare('INSERT INTO notebooks (id,data,version) VALUES (1,?,1) ON CONFLICT(id) DO NOTHING RETURNING version').get(JSON.stringify(payload.data)):db.prepare('UPDATE notebooks SET data=?,version=version+1 WHERE id=1 AND version=? RETURNING version').get(JSON.stringify(payload.data),payload.version);
    return result?send(res,200,result):send(res,409,{error:'Le carnet a changé dans un autre onglet. Exportez vos modifications puis rechargez la page.'});
   }
   if(url.pathname==='/api/receipt'&&method==='POST'){
    const raw=await readBody(req);let form;try{form=await new Request(origin,{method:'POST',headers:{'Content-Type':req.headers['content-type']||''},body:raw}).formData()}catch{throw fail(400,'Fichier invalide')}
    const f=form.get('file');if(!(f instanceof File)||f.size>8*1024*1024||f.size===0||!['image/jpeg','image/png','image/webp','application/pdf'].includes(f.type))throw fail(400,'Photo JPG, PNG, WebP ou PDF, maximum 8 Mo.');
    const bytes=Buffer.from(await f.arrayBuffer());const valid=f.type==='image/jpeg'?bytes[0]===255&&bytes[1]===216:f.type==='image/png'?bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):f.type==='image/webp'?bytes.subarray(0,4).toString()==='RIFF'&&bytes.subarray(8,12).toString()==='WEBP':bytes.subarray(0,5).toString()==='%PDF-';
    if(!valid)throw fail(400,'Le contenu du fichier ne correspond pas à son format.');
    const fileId=randomUUID();writeFileSync(join(filesDir,fileId),bytes,{flag:'wx',mode:0o600});writeFileSync(join(filesDir,fileId+'.json'),JSON.stringify({name:f.name.slice(0,500),type:f.type}),{flag:'wx',mode:0o600});return send(res,201,{key:'household/'+fileId,name:f.name.slice(0,500)});
   }
   if(url.pathname==='/api/receipt'&&method==='GET'){
    const key=url.searchParams.get('key')||'';if(!/^household\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(key))throw fail(404,'Fichier introuvable');
    const fileId=key.split('/')[1];if(!existsSync(join(filesDir,fileId)))throw fail(404,'Fichier introuvable');const metadata=JSON.parse(readFileSync(join(filesDir,fileId+'.json'),'utf8'));res.writeHead(200,{'Content-Type':metadata.type,'Cache-Control':'no-store','Content-Disposition':"inline; filename*=UTF-8''"+encodeURIComponent(metadata.name)});return res.end(readFileSync(join(filesDir,fileId)));
   }
   if(url.pathname.startsWith('/api/'))return send(res,405,{error:'Méthode ou route non prise en charge'});
   if(!['GET','HEAD'].includes(method))return send(res,405,'Méthode non prise en charge');
   let pathname;try{pathname=decodeURIComponent(url.pathname)}catch{throw fail(400,'Chemin invalide')}
   const file=resolve(distDir,'.'+(pathname==='/'?'/index.html':pathname));if(!file.startsWith(resolve(distDir)+sep)||!existsSync(file)||!statSync(file).isFile())return send(res,404,'Page introuvable');
   const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.woff2':'font/woff2','.png':'image/png'};res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream','Cache-Control':url.pathname.startsWith('/assets/')?'private, max-age=31536000, immutable':'no-store'});return res.end(method==='HEAD'?undefined:readFileSync(file));
  }catch(e){if(!e.status)console.error('Request failed:',e.message);if(!res.headersSent)send(res,e.status||500,{error:e.status?e.message:'Une erreur est survenue.'});else res.end()}
 });
 server.once('close',()=>db.close());return server;
}
