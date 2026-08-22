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
await waitFor(()=>evaluate(`typeof qaStateV84==='function' && window.__SCORCH_ENTRY_ACTIVE===false`),30000);
const result=await evaluate(`(()=>{
 window.state=qaStateV84();for(const d of document.querySelectorAll('dialog[open]'))d.close();state.onboarding.enabled=false;state.onboarding.completed=true;
 state.locations.warehouse.searched=false;delete state.intel.warehouse;
 state.knowledge=state.knowledge||{};state.knowledge.scoutedLocations=state.knowledge.scoutedLocations||{};state.knowledge.observedLocations=state.knowledge.observedLocations||{};
 delete state.knowledge.scoutedLocations.warehouse;delete state.knowledge.observedLocations.warehouse;
 const trueName=mapLoc('warehouse')?.name||'warehouse';
 const s=Object.values(state.settlements||{}).find(x=>x.location==='warehouse');if(s)s.population=9;
 const npc=Object.values(state.npcs||{}).find(x=>x.location==='warehouse');if(npc){npc.alive=true;npc.name='QA_SECRET_NPC'}
 state.coldStations=Array.from(new Set([...(state.coldStations||[]),'warehouse']));
 const asset=Object.values(state.assets||{}).find(x=>x&&x.location==='warehouse');if(asset){asset.discovered=true;asset.transported=false}
 state.mapPlanner.active=true;state.mapPlanner.target='warehouse';renderMap();
 const node=document.querySelector('.node[data-id="warehouse"]');
 const planner=document.getElementById('mapPlannerPanel');
 const text=(node?.textContent||'')+' '+(planner?.textContent||'');
 const cls=node?.className||'';
 const style=node?.getAttribute('style')||'';
 const leakedSecret=text.includes('QA_SECRET_NPC')||text.includes(trueName)||/9\\s*人/.test(text)||/warehouse/i.test(text);
 return {
  nodeUnknown:!!node&&/未知區域/.test(node.textContent||''),
  plannerUnknown:!!planner&&/未知區域/.test(planner.textContent||''),
  noLeaks:!leakedSecret,
  neutralClass:!/(safe|danger|map-occupied|map-evacuated|map-depleted|map-thinning|cold|cleared|state-)/.test(cls),
  noLootStyle:!/--loot/.test(style),
  scoutOnly:!!planner?.querySelector('#plannerLocation')&&!planner?.querySelector('#plannerExpedition')
 }
})()`);
assert(result.nodeUnknown,'unknown node label leaked');
assert(result.plannerUnknown,'planner did not stay unknown');
assert(result.noLeaks,'planner/map text leaked concrete world truth');
assert(result.neutralClass,'unknown node leaked state through CSS classes');
assert(result.noLootStyle,'unknown node leaked resource ratio through CSS variable');
assert(result.scoutOnly,'unknown planner exposed non-scout actions');
console.log('PASS resident fog side-channel regression');
ws.close();
