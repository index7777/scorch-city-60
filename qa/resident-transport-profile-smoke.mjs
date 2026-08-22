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
await waitFor(()=>evaluate(`typeof qaStateV84==='function' && typeof transportProfileV104==='function' && typeof transportCanCarryV104==='function' && window.__SCORCH_ENTRY_ACTIVE===false`),30000);
const result=await evaluate(`(()=>{
 window.state=qaStateV84();
 state.gear=state.gear||{};state.logistics=state.logistics||{};state.vehicle=state.vehicle||{};
 state.gear.vehicle=false;state.gear.cart=false;state.logistics.heavyReady=false;
 const foot={p:transportProfileV104(),speed:itinerarySpeedV27(),cap:cargoCapacityKg(),fuel:transportFuelForDistanceV104(10)};
 state.gear.cart=true;
 const cart={p:transportProfileV104(),speed:itinerarySpeedV27(),cap:cargoCapacityKg(),fit:transportCanCarryV104(60,100)};
 state.gear.cart=false;state.gear.vehicle=true;state.vehicle.capacityKg=420;state.vehicle.hasAC=true;state.logistics.heavyReady=false;
 const car={p:transportProfileV104(),speed:itinerarySpeedV27(),cap:cargoCapacityKg(),fuel:transportFuelForDistanceV104(10)};
 state.logistics.heavyReady=true;
 const truck={p:transportProfileV104(),speed:itinerarySpeedV27(),cap:cargoCapacityKg(),fit:transportCanCarryV104(1000,2000)};
 return {foot,cart,car,truck};
})()`);
assert(result.foot.p.id==='foot'&&result.foot.speed===4.5&&result.foot.cap===18&&result.foot.fuel===0,'foot transport profile is inconsistent');
assert(result.cart.p.id==='cart'&&result.cart.speed===5&&result.cart.cap===80&&result.cart.fit.ok,'cart transport profile is inconsistent');
assert(result.car.p.id==='car'&&result.car.speed===24&&result.car.cap===420&&result.car.p.acAvailable&&result.car.fuel>0,'car transport profile is inconsistent');
assert(result.truck.p.id==='truck'&&result.truck.cap>=1200&&result.truck.fit.ok,'truck transport profile is inconsistent');
console.log('PASS resident authoritative transport profile regression');
ws.close();
