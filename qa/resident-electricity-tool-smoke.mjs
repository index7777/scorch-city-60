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
await waitFor(()=>evaluate(`typeof qaStateV84==='function' && typeof ensureResidentToolV101==='function' && typeof chargeResidentToolV101==='function' && typeof useResidentToolV101==='function' && window.__SCORCH_ENTRY_ACTIVE===false`),30000);
const result=await evaluate(`(()=>{
 window.state=qaStateV84();
 state.electricity={batteryKWh:1,shelterOutputKW:.25,capacityKWh:4,tools:{}};
 ensureResidentToolV101('qaFan',{name:'QA 風扇',capacityKWh:.5,chargeKWh:0,drawKW:.1,maxChargeKW:.25});
 const charge=chargeResidentToolV101('qaFan',1);
 const runtime=residentToolRuntimeV101('qaFan');
 const use=useResidentToolV101('qaFan',2);
 const beforeFail=state.electricity.tools.qaFan.chargeKWh;
 const fail=useResidentToolV101('qaFan',1);
 const afterFail=state.electricity.tools.qaFan.chargeKWh;
 return {bank:state.electricity.batteryKWh,charge,runtime,use,beforeFail,fail,afterFail};
})()`);
assert(result.charge.ok&&Math.abs(result.charge.stored-.25)<1e-6,'tool did not charge at maxChargeKW for one hour');
assert(Math.abs(result.bank-.75)<1e-6,'tool charging did not consume resident battery energy');
assert(Math.abs(result.runtime-2.5)<1e-6,'tool runtime estimate is incorrect');
assert(result.use.ok&&Math.abs(result.use.used-.2)<1e-6,'tool use did not consume drawKW × hours');
assert(!result.fail.ok&&result.fail.reason==='tool-battery-empty','underpowered tool use did not fail explicitly');
assert(Math.abs(result.beforeFail-result.afterFail)<1e-6,'failed tool use mutated remaining tool charge');
console.log('PASS resident electricity tool regression');
ws.close();
