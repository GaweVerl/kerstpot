import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import handler from '../netlify/functions/santa.mjs';
const db=new PGlite();
await db.exec('create role anon; create role authenticated; create role service_role;');
await db.exec(await readFile('supabase.sql','utf8'));
process.env.SUPABASE_URL='http://localhost:4173';
process.env.SUPABASE_SECRET_KEY='local-preview-secret';
process.env.OWNER_PASSWORD='kerstpot-demo-2026';
const server=http.createServer(async(req,res)=>{
  try{
    const url=new URL(req.url,'http://localhost:4173');
    if(req.method==='POST'){
      let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>4096){res.writeHead(413).end();return;}}
      if(url.pathname==='/rest/v1/rpc/kerstpot_action'){
        if(req.headers.apikey!==process.env.SUPABASE_SECRET_KEY){res.writeHead(403).end();return;}
        const b=JSON.parse(raw);const result=await db.query('select kerstpot_action($1,$2,$3) as value',[b.p_action,b.p_token_hash,b.p_name]);res.setHeader('Content-Type','application/json');res.end(JSON.stringify(result.rows[0].value));return;
      }
      if(url.pathname==='/.netlify/functions/santa'){
        const response=await handler(new Request(url,{method:'POST',headers:req.headers,body:raw}));const data=await response.json();data.preview=true;res.writeHead(response.status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data));return;
      }
    }
    const file={'/':'index.html','/beheer':'index.html','/beheer/':'index.html','/style.css':'style.css','/app.js':'app.js'}[url.pathname];
    if(!file){res.writeHead(404).end();return;}
    res.setHeader('Content-Type',file.endsWith('.css')?'text/css':file.endsWith('.js')?'text/javascript':'text/html');res.end(await readFile(`public/${file}`));
  }catch{res.writeHead(500).end('Previewfout');}
});
server.listen(4173,'localhost',()=>console.log('Local: http://localhost:4173 — tijdelijke demo, beheerwachtwoord: kerstpot-demo-2026'));
