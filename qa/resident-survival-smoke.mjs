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
await waitFor(()=>evaluate(`typeof qaStateV84==='function' && typeof applyResidentSurvivalHoursV94==='function' && window.__SCORCH_ENTRY_ACTIVE===false`),30000);
const result=await evaluate(`(()=>{
 const reset=()=>{window.state=qaStateV84();state.day=30;state.phase='day';state.hoursLeft=8;state.player={hydration:100,satiety:100,stamina:100,health:100,bodyTemp:36.5,heat:0};state.residentSurvivalClock={day:30,phase:'day',hoursLeft:8};};
 reset();applyResidentSurvivalHoursV94(2,{outside:true,ambientTemp:100,coolingPack:false,vehicleAc:false});const hot={temp:state.player.bodyTemp,heat:state.player.heat,hydration:state.player.hydration};
 reset();applyResidentSurvivalHoursV94(2,{outside:true,ambientTemp:100,coolingPack:true,vehicleAc:false});const cooled={temp:state.player.bodyTemp,heat:state.player.heat};
 reset();state.player.bodyTemp=40;state.player.heat=80;applyResidentSurvivalHoursV94(2,{shelter:true,outside:false});const shelter={temp:state.player.bodyTemp,heat:state.player.heat};
 reset();state.player.bodyTemp=42.2;residentDeathCheckV94();const death={dead:state.player.dead,reason:state.player.deathReason};
 return {hot,cooled,shelter,death};
})()`);
assert(result.hot.temp>36.5&&result.hot.heat>0&&result.hot.hydration<100,'100C field exposure did not increase heat/body temperature or hydration cost');
assert(result.cooled.temp<result.hot.temp&&result.cooled.heat<result.hot.heat,'cooling pack did not reduce heat load');
assert(result.shelter.temp<40&&result.shelter.heat<80,'shelter did not recover heat/body temperature');
assert(result.death.dead&&result.death.reason==='致命高體溫','fatal body-temperature threshold did not produce explicit death cause');
console.log('PASS resident survival core regression');
ws.close();
