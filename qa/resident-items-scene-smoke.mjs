const CDP='http://127.0.0.1:9222',APP='http://127.0.0.1:4173/';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function assert(ok,msg){if(!ok)throw new Error(msg)}
async function waitFor(fn,timeout=20000,step=100){const end=Date.now()+timeout;while(Date.now()<end){try{const v=await fn();if(v)return v}catch{}await sleep(step)}throw new Error('timeout')}
const target=await waitFor(async()=>{const r=await fetch(`${CDP}/json/list`);if(!r.ok)return null;const list=await r.json();return list.find(x=>x.type==='page'&&x.url.startsWith(APP))||list.find(x=>x.type==='page')});
assert(target?.webSocketDebuggerUrl,'no Chrome page target');
const ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true})});
let seq=0;const pending=new Map();ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id&&pending.has(m.id)){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(new Error(m.error.message)):p.resolve(m.result)}});
function send(method,params={}){return new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}))})}
async function evaluate(expression){const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw new Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text||'evaluate exception');return r.result?.value}
await send('Runtime.enable');
await waitFor(()=>evaluate(`typeof ensureSceneStateV119==='function'&&typeof searchObjectV119==='function'&&typeof takeSceneItemV119==='function'&&typeof ITEMS_V119==='object'`),30000);
const opening=await evaluate(`(()=>{const s=qaStateV84();window.state=s;applyZeroResourceOpeningV112(s);ensurePhysicalInventoryV115(s);delete s.sceneInteractionsV119;ensureSceneStateV119(s);s.day=1;s.phase='night';s.hoursLeft=8;s.explorationV113={current:'homes',discovered:['base','homes']};s.explorationV118={selected:null,explored:['base'],observed:{base:true,homes:false}};renderMap();const m=document.getElementById('map');return {catalog:Object.keys(ITEMS_V119).length,panel:!!m.querySelector('.scene-panel-v119'),backpack:s.backpack.items.length,hours:s.hoursLeft};})()`);
assert(opening.catalog>=40&&opening.catalog<=55,'first-wave physical item catalog outside intended size');
assert(!opening.panel,'scene interaction framework appeared before active exploration');
assert(opening.backpack===0,'opening backpack was not empty');
await evaluate(`(()=>{state.explorationV118.observed.homes=true;renderMap();return true})()`);await sleep(50);
let snap=await evaluate(`(()=>{const m=document.getElementById('map'),p=m.querySelector('.scene-panel-v119');return {panel:!!p,text:p?.innerText||'',hours:state.hoursLeft};})()`);
assert(snap.panel,'explored location did not expose observable scene objects');
assert(snap.text.includes('玄關抽屜')&&snap.text.includes('上鎖的壁櫃'),'observable scene objects missing');
assert(!snap.text.includes('住宅鑰匙串')&&!snap.text.includes('小瓶水')&&!snap.text.includes('能量棒'),'unsearched or locked contents leaked');
await evaluate(`searchObjectV119('homes','homes-drawer')`);await sleep(50);
snap=await evaluate(`(()=>{const p=document.querySelector('.scene-panel-v119');return {text:p?.innerText||'',hours:state.hoursLeft,items:state.sceneInteractionsV119.locations.homes.find(x=>x.id==='homes-drawer').items.slice()};})()`);
assert(snap.hours===7.5,'search did not consume 0.5h');assert(snap.text.includes('住宅鑰匙串')&&snap.text.includes('蘇打餅乾'),'searched contents were not revealed');
await evaluate(`takeSceneItemV119('homes','homes-drawer','item-apartment-keyring')`);await sleep(50);
snap=await evaluate(`(()=>({hasKey:inventoryHasV119('item-apartment-keyring'),remaining:state.sceneInteractionsV119.locations.homes.find(x=>x.id==='homes-drawer').items.slice(),kg:state.backpack.currentKg}))()`);
assert(snap.hasKey,'taken key did not enter physical inventory');assert(!snap.remaining.includes('item-apartment-keyring'),'taken item remained at source');assert(snap.kg>0,'physical backpack weight did not update');
await evaluate(`unlockObjectV119('homes','homes-cabinet');renderMap()`);await sleep(50);
snap=await evaluate(`(()=>{const p=document.querySelector('.scene-panel-v119');return {text:p?.innerText||'',unlocked:state.sceneInteractionsV119.locations.homes.find(x=>x.id==='homes-cabinet').unlocked};})()`);
assert(snap.unlocked,'owned key did not unlock scene object');assert(!snap.text.includes('小瓶水'),'unlocking leaked contents before search');
await evaluate(`searchObjectV119('homes','homes-cabinet')`);await sleep(50);
snap=await evaluate(`(()=>({text:document.querySelector('.scene-panel-v119')?.innerText||'',hours:state.hoursLeft}))()`);
assert(snap.text.includes('小瓶水')&&snap.text.includes('能量棒'),'searched locked container did not reveal contents');assert(snap.hours===7,'second search did not consume 0.5h');
await evaluate(`takeSceneItemV119('homes','homes-cabinet','item-water-small-sealed')`);await sleep(50);
snap=await evaluate(`(()=>({water:backpackWaterLitersV115(state),source:state.sceneInteractionsV119.locations.homes.find(x=>x.id==='homes-cabinet').items.slice()}))()`);
assert(snap.water===0.5,'physical water item did not use bottle liters/weight model');assert(!snap.source.includes('item-water-small-sealed'),'water source respawned after pickup');
console.log('PASS resident Batch 3 physical items and scene interactions');ws.close();