import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {once} from 'node:events';
import {createApp} from '../server/app.mjs';
import {initialData} from '../src/model.ts';
const dir=mkdtempSync(join(tmpdir(),'atable-tests-'));
const config={dataDir:dir,publicUrl:'http://localhost:3000',password:'test-only-password-123456',secret:'test-only-session-secret-12345678901234567890'};
const app=createApp(config);app.listen(0,'127.0.0.1');await once(app,'listening');
let base='http://127.0.0.1:'+app.address().port;
let cookie;
const request=(path,opts={})=>fetch(base+path,{redirect:'manual',...opts,headers:{Origin:config.publicUrl,...(cookie?{Cookie:cookie}:{}),...opts.headers}});
after(async()=>{await new Promise(r=>app.close(r));rmSync(dir,{recursive:true,force:true})});
test('anonymous requests cannot read data or uploaded receipts',async()=>{
 assert.equal((await request('/healthz')).status,200);assert.equal((await request('/api/data')).status,401);assert.equal((await request('/api/receipt?key=household/test')).status,401);assert.equal((await request('/')).status,303);
});
test('login rejects incorrect passwords and cross-origin writes',async()=>{
 assert.equal((await request('/auth/login',{method:'POST',body:'password=wrong'})).status,401);
 assert.equal((await request('/auth/login',{method:'POST',body:'password=wrong',headers:{Origin:'https://evil.example'}})).status,403);
 const r=await request('/auth/login',{method:'POST',body:new URLSearchParams({password:config.password})});assert.equal(r.status,303);cookie=r.headers.get('set-cookie').split(';')[0];assert.ok(r.headers.get('set-cookie').includes('HttpOnly'));assert.ok(r.headers.get('set-cookie').includes('SameSite=Strict'));
});
test('notebook persists and rejects stale or malformed changes',async()=>{
 assert.deepEqual(await (await request('/api/data')).json(),{data:null,version:0});
 const body=JSON.stringify({data:initialData(),version:0});const opts={method:'PUT',headers:{'Content-Type':'application/json'},body};
 assert.deepEqual(await (await request('/api/data',opts)).json(),{version:1});assert.equal((await request('/api/data',opts)).status,409);
 const stored=await (await request('/api/data')).json();assert.equal(stored.data.recipes.length,12);assert.equal(stored.version,1);
 const invalid=initialData();invalid.recipes[0].servings=0;assert.equal((await request('/api/data',{...opts,body:JSON.stringify({data:invalid,version:1})})).status,400);
 assert.equal((await request('/api/data',{...opts,headers:{...opts.headers,Origin:'https://evil.example'}})).status,403);
});
test('receipt upload, download and path isolation work',async()=>{
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX2kAAAAASUVORK5CYII=','base64');
 const form=new FormData();form.set('file',new Blob([png],{type:'image/png'}),'ticket.png');const r=await request('/api/receipt',{method:'POST',body:form});assert.equal(r.status,201);const file=await r.json();assert.match(file.key,/^household\//);
 const down=await request('/api/receipt?key='+encodeURIComponent(file.key));assert.equal(down.status,200);assert.equal(down.headers.get('content-type'),'image/png');assert.deepEqual(Buffer.from(await down.arrayBuffer()),png);
 assert.equal((await request('/api/receipt?key=../../a-table.sqlite')).status,404);
 const forged=new FormData();forged.set('file',new Blob(['<script>bad</script>'],{type:'image/png'}),'fake.png');assert.equal((await request('/api/receipt',{method:'POST',body:forged})).status,400);
 const big=new FormData();big.set('file',new Blob([Buffer.alloc(8*1024*1024+1)],{type:'image/png'}),'large.png');assert.equal((await request('/api/receipt',{method:'POST',body:big})).status,400);
});
test('a restart preserves the database; tampered sessions are rejected',async()=>{
 await new Promise(r=>app.close(r));const restarted=createApp(config);restarted.listen(0,'127.0.0.1');await once(restarted,'listening');base='http://127.0.0.1:'+restarted.address().port;
 assert.equal((await (await request('/api/data')).json()).version,1);assert.equal((await request('/api/data',{headers:{Cookie:cookie+'tampered'}})).status,401);
 const logout=await request('/auth/logout',{method:'POST'});assert.equal(logout.status,303);assert.match(logout.headers.get('set-cookie'),/Max-Age=0/);await new Promise(r=>restarted.close(r));
});
