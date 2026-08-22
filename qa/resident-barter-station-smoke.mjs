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
await waitFor(()=>evaluate(`typeof canSeeBarterStationV127==='function'&&typeof exchangeAtBarterV127==='function'`),30000);
let snap=await evaluate(`(()=>{document.querySelectorAll('.barter-station-v127').forEach(el=>el.remove());const s=qaStateV84();window.state=s;applyZeroResourceOpeningV112(s);delete s.socialV122;delete s.barterStationV127;ensureSocialV122(s);ensureBarterStationV127(s);s.explorationV113={current:'warehouse',discovered:['base','warehouse']};s.explorationV118={selected:null,explored:['warehouse'],observed:{warehouse:true}};renderMap();return {known:s.barterStationV127.known,visible:canSeeBarterStationV127(s),panel:!!document.querySelector('.barter-station-v127')};})()`);await sleep(50);
snap=await evaluate(`(()=>({known:state.barterStationV127.known,visible:canSeeBarterStationV127(),panel:!!document.querySelector('.barter-station-v127'),text:document.getElementById('map')?.innerText||''}))()`);
assert(!snap.known&&!snap.visible&&!snap.panel,'barter station leaked before any trade lead');
assert(!snap.text.includes('現場交換桌'),'barter station label leaked before discovery');
await evaluate(`state.socialV122.people['npc-xu-peizhen'].talked=['npc-xu-peizhen-t09'];renderMap()`);await sleep(50);
snap=await evaluate(`(()=>({count:tradeLeadCountV127(),visible:canSeeBarterStationV127(),panel:!!document.querySelector('.barter-station-v127')}))()`);
assert(snap.count===1&&!snap.visible&&!snap.panel,'single trade lead revealed barter station');
await evaluate(`state.socialV122.people['npc-he-xinyi'].talked=['npc-he-xinyi-t09'];renderMap()`);await sleep(50);
snap=await evaluate(`(()=>({count:tradeLeadCountV127(),known:state.barterStationV127.known,visible:canSeeBarterStationV127(),panel:!!document.querySelector('.barter-station-v127'),offers:state.barterStationV127.inventory.length}))()`);
assert(snap.count===2&&snap.known&&snap.visible&&snap.panel,'two trade leads did not reveal station at observed warehouse');
assert(snap.offers>0,'barter station has no finite physical offers');
await evaluate(`state.explorationV113.current='homes';state.explorationV118.observed.homes=true;renderMap()`);await sleep(50);
snap=await evaluate(`(()=>({visible:canSeeBarterStationV127(),panel:!!document.querySelector('.barter-station-v127')}))()`);
assert(!snap.visible&&!snap.panel,'barter station remained visible away from its location');
await evaluate(`state.explorationV113.current='warehouse';state.backpack.items=[physicalItemV119('item-crackers')];recalcPhysicalWeightsV115(state);renderMap()`);await sleep(50);
const before=await evaluate(`(()=>({offer:state.barterStationV127.inventory[0]?.catalogId,player:state.backpack.items[0]?.catalogId,stationCount:state.barterStationV127.inventory.length}))()`);
assert(before.offer&&before.player==='item-crackers','barter exchange setup failed');
const result=await evaluate(`exchangeAtBarterV127(0,0)`);
assert(result?.ok,'barter exchange failed');
const after=await evaluate(`(()=>({player:state.backpack.items.some(x=>x.catalogId===${JSON.stringify(before.offer)}),stationGot:state.barterStationV127.inventory.some(x=>x.catalogId==='item-crackers'),stationCount:state.barterStationV127.inventory.length,exchanges:state.barterStationV127.exchanges.length}))()`);
assert(after.player&&after.stationGot,'barter exchange did not transfer physical items both directions');
assert(after.stationCount===before.stationCount,'barter exchange changed finite station item count');
assert(after.exchanges===1,'barter exchange history missing');
console.log('PASS resident Batch 7 discovery-gated barter station');ws.close();