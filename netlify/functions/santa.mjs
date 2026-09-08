import { createHash, timingSafeEqual } from 'node:crypto';
const hash = s => createHash('sha256').update(s).digest('hex');
const reply = (data,status=200) => Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export default async function handler(request) {
  if(request.method!=='POST') return reply({error:'Gebruik POST.'},405);
  const origin = request.headers.get('origin');
  if(origin && origin !== new URL(request.url).origin) return reply({error:'Ongeldig verzoek.'},403);
  const {SUPABASE_URL:url,SUPABASE_SECRET_KEY:key,OWNER_PASSWORD:owner} = process.env;
  if(!url||!key||!owner||owner.length<16) return reply({error:'De organisator moet de kerstpot nog aansluiten.'},503);
  let body;
  try {const raw=await request.text();if(raw.length>4096)return reply({error:'Verzoek te groot.'},413);body=JSON.parse(raw);}catch{return reply({error:'Ongeldig verzoek.'},400);}
  if(!body||typeof body!=='object') return reply({error:'Ongeldig verzoek.'},400);
  const {action,token,password}=body;
  if(!['status','join','draw','reveal'].includes(action)||typeof token!=='string'||!/^[a-zA-Z0-9-]{32,80}$/.test(token)) return reply({error:'Ongeldige persoonlijke sleutel.'},400);
  if(action==='draw' && (typeof password!=='string'||!timingSafeEqual(Buffer.from(hash(password)),Buffer.from(hash(owner))))) return reply({error:'Het beheerderswachtwoord klopt niet.'},403);
  const name = typeof body.name==='string' ? body.name.trim().replace(/\s+/g,' ') : '';
  if(action==='join'&&(!name||name.length>40||/[\u0000-\u001f\u007f]/.test(name))) return reply({error:'Vul een naam van 1 tot 40 tekens in.'},400);
  try {
    const headers={'Content-Type':'application/json',apikey:key};
    if(!key.startsWith('sb_secret_')) headers.Authorization=`Bearer ${key}`;
    const response=await fetch(`${url.replace(/\/$/,'')}/rest/v1/rpc/kerstpot_action`,{method:'POST',headers,body:JSON.stringify({p_action:action,p_token_hash:hash(token),p_name:name}),signal:AbortSignal.timeout(10000)});
    if(!response.ok) return reply({error:'De kerstpot is even niet bereikbaar. Probeer opnieuw.'},502);
    const data=await response.json();
    return data.error ? reply(data,409) : reply(data);
  }catch{return reply({error:'Verbinding mislukt. Probeer het opnieuw.'},502);}
}
