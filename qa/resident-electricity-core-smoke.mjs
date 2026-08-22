const CDP='http://127.0.0.1:9222';
const APP='http://127.0.0.1:4173/';
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
await waitFor(()=>evaluate(`typeof qaStateV84==='function' && typeof consumeResidentEnergyV100==='function' && typeof shelterChargeResidentEnergyV100==='function' && typeof toolEnergyUseV100==='function' && window.__SCORCH_ENTRY_ACTIVE===false`),30000);
const result=await evaluate(`(()=>{
 window.state=qaStateV84();
 state.electricity={batteryKWh:1,shelterOutputKW:.25,capacityKWh:2,tools:{fan:{name:'測試風扇',drawKW:.1}}};
 const charged=shelterChargeResidentEnergyV100(2);
 const afterCharge=state.electricity.batteryKWh;
 const used=toolEnergyUseV100('fan',3);
 const afterUse=state.electricity.batteryKWh;
 const beforeFail=state.electricity.batteryKWh;
 const failed=consumeResidentEnergyV100(5,{label:'測試高耗能工具',silent:true});
 return {charged,afterCharge,used,afterUse,beforeFail,failed,afterFail:state.electricity.batteryKWh};
})()`);
assert(Math.abs(result.charged-.5)<1e-6&&Math.abs(result.afterCharge-1.5)<1e-6,'shelter 0.25 kW charging math is wrong');
assert(result.used.ok&&Math.abs(result.used.used-.3)<1e-6&&Math.abs(result.afterUse-1.2)<1e-6,'tool runtime did not consume kWh correctly');
assert(!result.failed.ok&&Math.abs(result.afterFail-result.beforeFail)<1e-6,'no-power failure mutated battery state');
console.log('PASS resident electricity core regression');
ws.close();
