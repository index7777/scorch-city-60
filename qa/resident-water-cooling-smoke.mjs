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
await waitFor(()=>evaluate(`typeof qaStateV84==='function' && typeof useResidentCoolingWaterV98==='function' && window.__SCORCH_ENTRY_ACTIVE===false`),30000);
const result=await evaluate(`(()=>{
 window.state=qaStateV84();for(const d of document.querySelectorAll('dialog[open]'))d.close();
 state.onboarding.enabled=false;state.onboarding.completed=true;
 state.resources.water=10;
 state.waterAllocation={schema:1,drinkingPool:6,coolingPool:4,emergencyCoolingFromDrinking:false};
 state.player={hydration:100,satiety:100,stamina:100,health:100,bodyTemp:39,heat:70,dead:false,deathReason:''};
 const before={water:state.resources.water,drink:state.waterAllocation.drinkingPool,cool:state.waterAllocation.coolingPool,heat:state.player.heat,temp:state.player.bodyTemp};
 const first=useResidentCoolingWaterV98(1);
 const afterCooling={water:state.resources.water,drink:state.waterAllocation.drinkingPool,cool:state.waterAllocation.coolingPool,heat:state.player.heat,temp:state.player.bodyTemp};
 state.waterAllocation.coolingPool=0;state.waterAllocation.drinkingPool=state.resources.water;state.waterAllocation.emergencyCoolingFromDrinking=false;
 const protectedBefore=state.resources.water;
 const blocked=useResidentCoolingWaterV98(1);
 const protectedAfter=state.resources.water;
 state.waterAllocation.emergencyCoolingFromDrinking=true;
 const emergencyBefore=state.resources.water;
 const emergency=useResidentCoolingWaterV98(1);
 const emergencyAfter=state.resources.water;
 return {before,first,afterCooling,blocked,protectedBefore,protectedAfter,emergency,emergencyBefore,emergencyAfter,allocation:state.waterAllocation};
})()`);
assert(result.first?.ok,'cooling reserve could not be consumed');
assert(result.afterCooling.water===result.before.water-1,'cooling action did not reduce total water by 1L');
assert(result.afterCooling.cool===result.before.cool-1,'cooling action did not reduce cooling reserve');
assert(result.afterCooling.drink===result.before.drink,'cooling reserve use changed drinking pool');
assert(result.afterCooling.heat<result.before.heat,'cooling water did not reduce heat');
assert(result.afterCooling.temp<result.before.temp,'cooling water did not reduce body temperature');
assert(result.blocked?.ok===false,'cooling should fail when reserve is empty and emergency use is disabled');
assert(result.protectedAfter===result.protectedBefore,'blocked cooling silently consumed drinking water');
assert(result.emergency?.ok,'explicit emergency drinking-water reallocation did not work');
assert(result.emergencyAfter===result.emergencyBefore-1,'emergency cooling did not consume exactly 1L');
assert(result.emergency.drinkingUsed===1,'emergency cooling did not report drinking-water use');
console.log('PASS resident explicit cooling-water integration');
ws.close();
