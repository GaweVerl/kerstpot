const $ = id => document.getElementById(id);
const admin = location.pathname.replace(/\/$/, '') === '/beheer';
const params = new URLSearchParams(location.hash.slice(1));
let token, storageWorks = true;
try {
  token = params.get('sleutel') || localStorage.getItem('kerstpot-sleutel') || crypto.randomUUID();
  localStorage.setItem('kerstpot-sleutel', token);
} catch { token = params.get('sleutel') || crypto.randomUUID(); storageWorks = false; }
if (params.has('sleutel')) history.replaceState(null, '', location.pathname);
let state, password = '', busy = false, shown = false;
const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function api(action, extra = {}) {
  const response = await fetch('/.netlify/functions/santa', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,token,...extra})});
  let data;
  try { data = await response.json(); } catch { throw new Error('De kerstpot is nog niet aangesloten. Probeer het later opnieuw.'); }
  if (!response.ok) throw new Error(data.error || 'Dat lukte even niet. Probeer opnieuw.');
  return data;
}
function render() {
  if(state.preview) document.querySelector('.header-note').textContent='Voorbeeld · namen worden niet bewaard';
  $('count').textContent = state.names.length;
  $('names').innerHTML = state.names.map(n => `<li>${esc(n)}</li>`).join('');
  if (!state.names.length) $('names').innerHTML = '<span class="empty">Nog helemaal leeg. Wie doet er als eerste mee?</span>';
  $('pot-status').textContent = state.drawn ? 'Alle lootjes zijn verdeeld. De verrassing kan beginnen!' : 'Een plekje voor iedereen die meedoet.';
  if (admin) {
    $('step').textContent = 'ALLEEN VOOR DE ORGANISATOR';
    $('content').innerHTML = `<h2 id="action-title">De touwtjes in handen.</h2><p>${state.drawn ? 'De trekking is open. Iedereen kan nu zijn eigen lootje bekijken.' : 'Staat iedereen in de pot? Open dan de trekking.'}</p>${state.drawn ? '' : `<form id="admin-form"><label for="password">Jouw beheerderswachtwoord</label><input id="password" type="password" autocomplete="current-password" required minlength="16"><p class="admin-note">Na het openen kunnen er geen namen meer bij. De verdeling staat dan vast.</p><label><input type="checkbox" id="confirm" required style="width:auto"> Iedereen staat in de pot</label><button ${state.names.length < 2 ? 'disabled' : ''}>Open de trekking ✦</button></form>`}<a class="button secondary" href="/">Terug naar de kerstpot</a>`;
    $('admin-form')?.addEventListener('submit', e => {e.preventDefault(); password = $('password').value; run(async () => {await api('draw',{password}); password=''; state = await api('status'); render();});});
  } else if (!state.me) {
    $('step').textContent = '01 / NAAM IN DE POT';
    $('content').innerHTML = state.drawn ? '<h2 id="action-title">De lootjes zijn verdeeld.</h2><p>Meedoen kan nu niet meer. Deed je al mee? Open deze site op je oorspronkelijke toestel of gebruik je persoonlijke terugkeerlink.</p>' : '<h2 id="action-title">Doe je mee?</h2><p>Vul je naam in en we bewaren een lootje voor jou.</p><form id="join-form"><label for="name">Hoe heet je?</label><input id="name" name="name" maxlength="40" autocomplete="given-name" placeholder="Bijvoorbeeld: Emma" required><button>Stop mijn naam in de pot <span aria-hidden="true">↗</span></button></form><p class="small">Je hoeft geen account aan te maken.</p>';
    $('join-form')?.addEventListener('submit', e => {e.preventDefault(); const name = $('name').value.trim(); if (!name) return; run(async()=>{await api('join',{name}); state=await api('status'); render();});});
  } else {
    $('step').textContent = state.drawn ? '03 / JOUW GEHEIME LOOTJE' : '02 / JIJ ZIT IN DE POT';
    $('content').innerHTML = `<div class="success-icon" aria-hidden="true">${state.drawn?'✦':'✓'}</div><h2 id="action-title">${state.drawn ? `Klaar voor je kerstgeheim?` : `Je zit erin, ${esc(state.me)}!`}</h2><p>${state.drawn ? `${esc(state.me)}, ontdek voor wie jij dit jaar iets leuks uitzoekt.` : 'Nu is het wachten tot iedereen erbij is. Zodra de organisator de trekking opent, kun je hier je lootje trekken.'}</p>${state.drawn ? '<div id="result"></div><button id="reveal">Trek mijn lootje ✦</button>' : '<button class="secondary" id="refresh">Is de trekking al open?</button>'}<p class="small">${storageWorks ? 'Kom terug op dit toestel, of bewaar je persoonlijke link. ' : 'Bewaar je persoonlijke link: dit toestel kan je niet onthouden. '}Houd hem geheim: wie hem heeft, kan jouw lootje zien.</p><button class="secondary" id="copy">Kopieer mijn persoonlijke link</button><a id="recovery" class="recovery" hidden></a>`;
    $('refresh')?.addEventListener('click',()=>run(async()=>{state=await api('status');render();if(!state.drawn) $('message').textContent='Nog even geduld, de trekking is nog niet open.';}));
    $('reveal')?.addEventListener('click',()=>run(async()=>{if(shown){$('result').replaceChildren();$('reveal').textContent='Bekijk mijn lootje opnieuw';shown=false;return;}const data=await api('reveal');$('result').innerHTML=`<span class="small">Jij kiest een cadeautje voor</span><div class="recipient">${esc(data.recipient)}</div><p class="small">Ssst… dat blijft ons geheimpje.</p>`;$('reveal').textContent='Verberg mijn lootje';shown=true;}));
    $('copy').addEventListener('click',()=>run(async()=>{const link=`${location.origin}/#sleutel=${encodeURIComponent(token)}`;try{await navigator.clipboard.writeText(link);$('message').textContent='Je persoonlijke link is gekopieerd. Bewaar hem op een veilige plek.';}catch{$('recovery').href=link;$('recovery').textContent=link;$('recovery').hidden=false;}}));
  }
}
async function run(fn){if(busy)return;busy=true;$('message').textContent='';document.querySelectorAll('button').forEach(b=>b.disabled=true);try{await fn();}catch(e){$('message').textContent=e.message;}finally{busy=false;document.querySelectorAll('button').forEach(b=>b.disabled=false);if(admin&&state?.names.length<2) document.querySelector('#admin-form button')?.setAttribute('disabled','');}}
await run(async()=>{state=await api('status');render();});
if(!state){$('content').innerHTML='<h2 id="action-title">De pot is even niet bereikbaar.</h2><p>Probeer het straks nog eens.</p><button id="retry">Opnieuw proberen</button>';$('retry').onclick=()=>location.reload();}
if(document.modelContext?.registerTool && !admin){
  const lifecycle=new AbortController();
  window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});
  try{Promise.resolve(document.modelContext.registerTool({
    name:'join_kerstpot',title:'Stop je naam in de kerstpot',
    description:'Schrijft de huidige deelnemer in voor Secret Santa en werkt de zichtbare namenpot bij. Gebruik alleen voor de eigen naam van de gebruiker.',
    inputSchema:{type:'object',properties:{name:{type:'string',minLength:1,maxLength:40}},required:['name'],additionalProperties:false},
    annotations:{readOnlyHint:false,untrustedContentHint:true},
    async execute(input){
      if(!input||typeof input.name!=='string'||!input.name.trim()||input.name.length>40)throw new Error('Vul een naam van 1 tot 40 tekens in.');
      if(busy)throw new Error('Er is nog een actie bezig. Probeer straks opnieuw.');
      busy=true;
      try{await api('join',{name:input.name});state=await api('status');render();return {joined:true,name:state.me};}finally{busy=false;}
    }
  },{signal:lifecycle.signal})).catch(()=>{});}catch{}
}
