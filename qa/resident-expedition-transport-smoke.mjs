const CDP='http://127.0.0.1:9222';
const APP='http://127.0.0.1:4173/';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function assert(ok,msg){if(!ok)throw new Error(msg)}
async function waitFor(fn,timeout=20000,step=100){const end=Date.now()+timeout;while(Date.now()<end){try{const v=await fn();if(v)return v}catch{}await sleep(step)}throw new Error('timeout')}
const target=await waitFor(async()=>{const r=await fetch(`${CDP}/json/list`);if(!r.ok)return null;const list=await r.json();return list.find(x=>x.type==='page'&&x.url.startsWith(APP))||list.find(x=>x.type==='page')});
assert(target?.webSocketDebuggerUrl,'no Chrome page target');
const ws=new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true})});
let seq=0;const pending=new Map();
ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id&&pending.has(m.id)){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(new Error(m.error.message)):p.resolve(m.result)}});
function send(method,params={}){return new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}))})}
async function evaluate(expression){const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw new Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text||'evaluate exception');return r.result?.value}
await send('Runtime.enable');
await waitFor(()=>evaluate(`typeof qaStateV84==='function' && typeof expeditionEstimate==='function' && typeof transportProfileForModeV105==='function' && window.__SCORCH_ENTRY_ACTIVE===false`),30000);
const result=await evaluate(`(()=>{
 window.state=qaStateV84();
 state.day=30;state.phase='day';state.gear=state.gear||{};state.gear.cart=true;state.gear.vehicle=true;state.gear.toolkit=true;
 state.logistics=state.logistics||{};state.logistics.heavyReady=false;
 state.vehicle=state.vehicle||{};state.vehicle.capacityKg=700;state.vehicle.hasAC=false;state.vehicle.acActive=false;
 state.mapPlanner={active:false,target:'industrial',routeMode:'fastest'};
 const loc=mapLoc('industrial');
 const foot=expeditionEstimate(loc,'foot',2,2,false,'');
 const car=expeditionEstimate(loc,'vehicle',2,2,false,'');
 state.vehicle.hasAC=true;const carAc=expeditionEstimate(loc,'vehicle',2,2,false,'');
 state.logistics.heavyReady=true;const truck=expeditionEstimate(loc,'vehicle',2,2,false,'compressorA');
 state.logistics.heavyReady=false;const chiller=expeditionEstimate(mapLoc('coldstore'),'vehicle',2,2,false,'chiller');
 return {foot,car,carAc,truck,chiller};
})()`);
assert(result.car.transport.id==='car'&&result.truck.transport.id==='truck','vehicle mode did not resolve through authoritative car/truck profile');
assert(result.car.total<result.foot.total,'vehicle speed did not reduce expedition time');
assert(result.car.fuelNeed>0&&result.foot.fuelNeed===0,'fuel calculation did not follow transport profile');
assert(result.carAc.batteryNeed<=result.car.batteryNeed&&result.carAc.waterNeed<=result.car.waterNeed,'vehicle AC did not reduce Day 30 exposure budget');
assert(result.truck.cap>=1200&&result.truck.capacityL>=2400,'truck cargo profile was not applied to expedition estimate');
assert(result.truck.assetVolume>0&&result.truck.returnVolume<result.truck.capacityL,'large asset volume was not reserved from transport capacity');
assert(result.chiller.transport.id==='car'&&result.chiller.carry.ok===false,'oversized large object was not blocked by selected car weight/volume capacity');
console.log('PASS resident expedition transport integration');
ws.close();
