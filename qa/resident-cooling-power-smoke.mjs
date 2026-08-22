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
await waitFor(()=>evaluate(`typeof qaStateV84==='function' && typeof residentCoolingEquipmentV102==='function' && typeof applyResidentSurvivalHoursV94==='function' && window.__SCORCH_ENTRY_ACTIVE===false`),30000);
const result=await evaluate(`(()=>{
 function setup(charge){
  window.state=qaStateV84();
  state.day=30;state.phase='day';state.hoursLeft=0;state.gear=state.gear||{};state.gear.coolingPack=true;
  state.player={hydration:100,satiety:100,stamina:100,health:100,bodyTemp:36.5,heat:0,dead:false,deathReason:''};
  state.residentSurvivalClock={day:30,phase:'day',hoursLeft:0};
  state.equipmentInstances={};state.powerLogistics={schema:1,charging:[],seq:1};
  ensurePowerStateV24();
  const eq=residentCoolingEquipmentV102();eq.mode='normal';eq.battery.chargeKWh=charge;
  return eq;
 }
 let eq=setup(.55);
 applyResidentSurvivalHoursV94(2,{outside:true,ambientTemp:100,coolingPack:true,vehicleAc:false});
 const partial={heat:state.player.heat,temp:state.player.bodyTemp,hydration:state.player.hydration,charge:eq.battery.chargeKWh,dead:!!state.player.dead};
 eq=setup(0);
 applyResidentSurvivalHoursV94(2,{outside:true,ambientTemp:100,coolingPack:true,vehicleAc:false});
 const empty={heat:state.player.heat,temp:state.player.bodyTemp,hydration:state.player.hydration,charge:eq.battery.chargeKWh,dead:!!state.player.dead};
 eq=setup(2.4);
 applyResidentSurvivalHoursV94(2,{outside:true,ambientTemp:100,coolingPack:true,vehicleAc:false});
 const full={heat:state.player.heat,temp:state.player.bodyTemp,hydration:state.player.hydration,charge:eq.battery.chargeKWh,dead:!!state.player.dead};
 return {partial,empty,full};
})()`);
assert(result.partial.charge<0.001,'partial cooling-pack battery did not drain to empty');
assert(result.partial.heat>result.full.heat,'mid-action battery exhaustion did not increase heat versus fully powered cooling');
assert(result.partial.heat<result.empty.heat,'partial battery provided no protection before exhaustion');
assert(result.empty.charge===0,'empty cooling pack mutated into available charge');
assert(result.full.charge<2.4,'fully powered cooling pack did not consume battery energy');
assert(!result.partial.dead&&!result.full.dead,'short powered exposure should not instantly kill resident');
console.log('PASS resident powered cooling pack regression');
ws.close();
