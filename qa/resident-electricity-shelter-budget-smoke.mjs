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
await waitFor(()=>evaluate(`typeof qaStateV84==='function' && typeof shelterChargeSnapshotV103==='function' && typeof spendWorldTimeV26==='function' && window.__SCORCH_ENTRY_ACTIVE===false`),30000);
const result=await evaluate(`(()=>{
 window.state=qaStateV84();for(const d of document.querySelectorAll('dialog[open]'))d.close();
 state.day=1;state.phase='night';state.hoursLeft=8;state.worldClock={schema:1,day:1,endlessElapsed:0};
 state.fieldOperation={};state.itinerary={status:'planning'};state.expedition={};
 state.gear=state.gear||{};state.gear.coolingPack=true;
 ensurePowerStateV24();
 const pack=bestPlayerCoolingV24()||Object.values(state.equipmentInstances).find(e=>e.type==='coolpack');
 pack.holder='player';pack.location='base';pack.battery.chargeKWh=0;
 state.powerLogistics.charging=[{equipmentId:pack.instanceId,sourceId:'heatHouse',startedDay:1}];
 state.electricity={batteryKWh:0,capacityKWh:4,shelterOutputKW:.25,tools:{}};
 const before={bank:state.electricity.batteryKWh,pack:pack.battery.chargeKWh,hours:state.hoursLeft};
 const ok=spendWorldTimeV26(1,{label:'QA shelter charging'});
 const after={bank:state.electricity.batteryKWh,pack:pack.battery.chargeKWh,hours:state.hoursLeft};
 const eff=sourceStateV24().heatHouse.efficiency;
 return {ok,before,after,eff,totalInput:(after.pack-before.pack)/eff+(after.bank-before.bank)};
})()`);
assert(result.ok,'shelter charging fixture did not spend time');
assert(result.after.pack>result.before.pack,'queued cooling pack did not charge');
assert(result.after.hours===result.before.hours-1,'shelter charging did not consume one hour');
assert(result.totalInput<=0.2501,`shelter 0.25 kW source was double-counted: ${result.totalInput.toFixed(4)} kWh in one hour`);
assert(result.after.bank<0.05,'resident battery bank gained substantial energy while the cooling pack occupied the full shelter output');
console.log('PASS shared shelter electricity budget regression');
ws.close();
