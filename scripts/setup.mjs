import {randomBytes} from 'node:crypto';
import {existsSync,writeFileSync} from 'node:fs';
if(existsSync('.env')){console.error('Le fichier .env existe déjà : aucune modification.');process.exit(1)}
// No secrets are printed or committed. Open the file locally to retrieve your password.
writeFileSync('.env',`PUBLIC_URL=http://localhost:8080\nBIND_ADDRESS=127.0.0.1\nHTTP_PORT=8080\nADMIN_PASSWORD=${randomBytes(24).toString('base64url')}\nSESSION_SECRET=${randomBytes(48).toString('base64url')}\nATABLE_IMAGE=ghcr.io/agatolies/a-table:latest\n`,{flag:'wx',mode:0o600});
console.log('Configuration créée dans .env (permissions 600). Consultez-la localement pour récupérer le mot de passe et adapter PUBLIC_URL.');
