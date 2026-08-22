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
await waitFor(()=>evaluate(`typeof qaStateV84==='function' && typeof ensureWaterAllocationV97==='function' && typeof consumeCoolingWaterV97==='function' && window.__SCORCH_ENTRY_ACTIVE===false`),30000);
const result=await evaluate(`(()=>{
 window.state=qaStateV84();
 state.resources.water=12;delete state.waterAllocation;
 const initial=ensureWaterAllocationV97();
 setCoolingWaterReserveV97(5);
 const split={total:state.resources.water,drinking:state.waterAllocation.drinkingPool,cooling:state.waterAllocation.coolingPool};
 const first=consumeCoolingWaterV97(3);
 const afterFirst={total:state.resources.water,drinking:state.waterAllocation.drinkingPool,cooling:state.waterAllocation.coolingPool};
 const blocked=consumeCoolingWaterV97(4);
 const afterBlocked={total:state.resources.water,drinking:state.waterAllocation.drinkingPool,cooling:state.waterAllocation.coolingPool};
 state.waterAllocation.emergencyCoolingFromDrinking=true;
 const emergency=consumeCoolingWaterV97(4,{allowEmergency:true,label:'QA'});
 const afterEmergency={total:state.resources.water,drinking:state.waterAllocation.drinkingPool,cooling:state.waterAllocation.coolingPool};
 return {initial:{drinking:initial.drinkingPool,cooling:initial.coolingPool},split,first,afterFirst,blocked,afterBlocked,emergency,afterEmergency};
})()`);
assert(result.initial.drinking===12&&result.initial.cooling===0,'water pools did not default to all drinking water');
assert(result.split.total===12&&result.split.drinking===7&&result.split.cooling===5,'cooling reserve split is incorrect');
assert(result.first.ok&&result.first.coolingUsed===3&&result.first.drinkingUsed===0,'cooling use did not consume reserved water first');
assert(result.afterFirst.total===9&&result.afterFirst.drinking===7&&result.afterFirst.cooling===2,'cooling consumption broke pool accounting');
assert(!result.blocked.ok,'cooling shortfall silently consumed drinking water');
assert(result.afterBlocked.total===9&&result.afterBlocked.drinking===7&&result.afterBlocked.cooling===2,'blocked cooling attempt mutated water state');
assert(result.emergency.ok&&result.emergency.coolingUsed===2&&result.emergency.drinkingUsed===2,'explicit emergency cooling did not use the expected pools');
assert(result.afterEmergency.total===5&&result.afterEmergency.drinking===5&&result.afterEmergency.cooling===0,'emergency cooling broke final pool accounting');
console.log('PASS resident water allocation regression');
ws.close();
