const CDP='http://127.0.0.1:9222';
const APP='http://127.0.0.1:4173/';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function assert(ok,msg){if(!ok)throw new Error(msg)}
async function waitFor(fn,timeout=20000,step=100){const end=Date.now()+timeout;while(Date.now()<end){try{const v=await fn();if(v)return v}catch{}await sleep(step)}throw new Error('timeout')}
const targets=await waitFor(async()=>{const r=await fetch(`${CDP}/json/list`);if(!r.ok)return null;const list=await r.json();return list.find(x=>x.type==='page'&&x.url.startsWith(APP))||list.find(x=>x.type==='page')});
assert(targets?.webSocketDebuggerUrl,'no Chrome page target');
const ws=new WebSocket(targets.webSocketDebuggerUrl);
await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true})});
let seq=0;const pending=new Map();
ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id&&pending.has(m.id)){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(new Error(m.error.message)):p.resolve(m.result)}});
function send(method,params={}){return new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}))})}
async function evaluate(expression){const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw new Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text||'evaluate exception');return r.result?.value}
await send('Runtime.enable');
await waitFor(()=>evaluate(`typeof qaStateV84==='function'&&typeof ensureExplorationV113==='function'&&window.__SCORCH_ENTRY_ACTIVE===false`),30000);
const result=await evaluate(`(()=>{
 window.state=qaStateV84();for(const d of document.querySelectorAll('dialog[open]'))d.close();state.onboarding.enabled=false;state.onboarding.completed=true;
 state.flags=state.flags||{};state.flags.hardFogOpeningV112=true;
 const ex=ensureExplorationV113(state);ex.current='base';ex.discovered=['base'];
 state.locations.warehouse.searched=false;delete state.intel.warehouse;
 const trueName=mapLoc('warehouse')?.name||'warehouse';
 const s=Object.values(state.settlements||{}).find(x=>x.location==='warehouse');if(s)s.population=9;
 const npc=Object.values(state.npcs||{}).find(x=>x.location==='warehouse');if(npc){npc.alive=true;npc.name='QA_SECRET_NPC'}
 state.coldStations=Array.from(new Set([...(state.coldStations||[]),'warehouse']));
 const asset=Object.values(state.assets||{}).find(x=>x&&x.location==='warehouse');if(asset){asset.discovered=true;asset.transported=false}
 renderMap();
 const map=document.getElementById('map'),text=map?.innerText||'';
 const ids=[...map.querySelectorAll('[data-step-go]')].map(x=>x.dataset.stepGo);
 const warehouseNode=map.querySelector('[data-step-go="warehouse"]');
 const planner=document.getElementById('mapPlannerPanel');
 const leaked=text.includes('QA_SECRET_NPC')||text.includes(trueName)||/9\\s*人/.test(text)||/warehouse/i.test(text)||/大型資產/.test(text)||/冷站/.test(text);
 return {
  warehouseAbsent:!warehouseNode&&!ids.includes('warehouse'),
  noLeaks:!leaked,
  onlyOpeningLayer:ids.includes('base')&&ids.includes('homes')&&!ids.includes('store')&&!ids.includes('school'),
  plannerHidden:!!planner&&planner.hidden===true&&(planner.textContent||'').trim()==='',
  noFullRoute:!map.querySelector('.planned-route,.alt-plan,.safe-plan,.fast-plan')
 }
})()`);
assert(result.warehouseAbsent,'far unknown location appeared in opening map');
assert(result.noLeaks,'stepwise map leaked concrete world truth from unseen location');
assert(result.onlyOpeningLayer,'opening map exposed more than current plus direct neighbor layer');
assert(result.plannerHidden,'legacy planner remained visible or populated');
assert(result.noFullRoute,'full-route overlay leaked through stepwise map');
console.log('PASS resident fog side-channel regression');
ws.close();
