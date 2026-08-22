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
await waitFor(()=>evaluate(`typeof qaStateV84==='function' && typeof ensureWaterAllocationV97==='function' && typeof drinkingReserveRiskV99==='function' && window.__SCORCH_ENTRY_ACTIVE===false`),30000);
const result=await evaluate(`(()=>{
 window.state=qaStateV84();
 state.base.population=1;state.base.waterTreatment=0;state.ration.water=2.5;state.resources.water=12;
 state.waterAllocation={schema:1,drinkingPool:12,coolingPool:0,emergencyCoolingFromDrinking:false};
 const safe=drinkingReserveRiskV99();
 setCoolingWaterReserveV97(10);
 const danger=drinkingReserveRiskV99();
 openWaterAllocationV97();
 const dialog=document.getElementById('waterAllocationDialog');
 const text=dialog?.querySelector('.water-allocation-dialog-risk-v99')?.textContent||'';
 if(dialog?.open)dialog.close();
 return {safe,danger,text,drinking:state.waterAllocation.drinkingPool,cooling:state.waterAllocation.coolingPool};
})()`);
assert(result.safe.level==='ok'||result.safe.level==='warning','safe drinking reserve was incorrectly marked dangerous');
assert(result.danger.level==='critical','sub-one-day drinking reserve was not marked critical');
assert(result.drinking===2&&result.cooling===10,'risk warning mutated water allocation accounting');
assert(/危險分配|不足 1 天/.test(result.text),'allocation dialog did not show a foreground dangerous-allocation warning');
console.log('PASS resident drinking reserve risk regression');
ws.close();
