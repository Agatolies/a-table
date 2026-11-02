import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createApp} from './app.mjs';
function secret(name){return process.env[name+'_FILE']?readFileSync(process.env[name+'_FILE'],'utf8').trim():process.env[name]}
const app=createApp({dataDir:resolve(process.env.DATA_DIR||'data'),publicUrl:process.env.PUBLIC_URL||'http://localhost:3000',password:secret('ADMIN_PASSWORD'),secret:secret('SESSION_SECRET')});
const port=Number(process.env.PORT||3000);app.listen(port,'0.0.0.0',()=>console.log(`À table écoute sur le port ${port}.`));
for(const event of ['SIGTERM','SIGINT'])process.on(event,()=>{app.close(()=>process.exit(0));setTimeout(()=>process.exit(1),10000).unref()});
