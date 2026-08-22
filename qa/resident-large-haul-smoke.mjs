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
await waitFor(()=>evaluate(`typeof qaStateV84==='function' && typeof haulEstimateV106==='function' && typeof transportAsset==='function' && window.__SCORCH_ENTRY_ACTIVE===false`),30000);
const result=await evaluate(`(()=>{
 window.state=qaStateV84();
 state.day=30;state.phase='day';state.base.population=4;state.base.core=false;state.base.ventilation=0;
 state.gear=state.gear||{};state.gear.vehicle=true;state.gear.cart=true;state.gear.coolingPack=true;
 state.logistics=state.logistics||{};state.logistics.heavyReady=false;state.logistics.moved=0;
 state.vehicle=state.vehicle||{};state.vehicle.capacityKg=700;state.vehicle.hasAC=false;state.vehicle.acActive=false;
 state.resources.battery=50;state.resources.fuel=50;
 state.mapPlanner={active:false,target:'fire',routeMode:'fastest'};
 state.assets=state.assets||{};
 state.assets.compressorA={...(state.assets.compressorA||{}),discovered:true,transported:false,owner:'world',location:'industrial'};
 state.assets.pump={...(state.assets.pump||{}),discovered:true,transported:false,owner:'world',location:'fire'};
 const compressor={id:'compressorA',weight:420,need:'vehicle'};
 const carBlocked=haulEstimateV106(compressor);
 state.logistics.heavyReady=true;
 const truckReady=haulEstimateV106(compressor);
 const pump={id:'pump',weight:145,need:'cart'};
 const pumpEstimate=haulEstimateV106(pump),before={battery:state.resources.battery,fuel:state.resources.fuel,moved:state.logistics.moved};
 transportAsset('pump');
 const after={battery:state.resources.battery,fuel:state.resources.fuel,moved:state.logistics.moved,transported:state.assets.pump.transported,owner:state.assets.pump.owner,location:state.assets.pump.location};
 return {carBlocked,truckReady,pumpEstimate,before,after};
})()`);
assert(result.carBlocked.ok===false&&result.carBlocked.issues.some(x=>x.includes('體積')||x.includes('重量')),'car did not block an oversized large object');
assert(result.truckReady.ok===true&&result.truckReady.transport.id==='truck','heavy-ready logistics did not resolve to a feasible truck haul');
assert(result.pumpEstimate.crewRequired>=1&&result.pumpEstimate.totalHours>0,'haul estimate did not include manpower/time');
assert(result.pumpEstimate.fuelL>0&&result.pumpEstimate.coolingKWh>0,'Day 30 haul did not include fuel and cooling costs');
assert(result.after.transported&&result.after.owner==='player'&&result.after.location==='vent','successful haul did not move ownership/location state');
assert(result.after.fuel<result.before.fuel&&result.after.battery<result.before.battery,'successful haul did not deduct authoritative fuel/cooling costs');
assert(result.after.moved===result.before.moved+1,'successful haul did not increment logistics moved count');
console.log('PASS resident authoritative large-object hauling');
ws.close();
