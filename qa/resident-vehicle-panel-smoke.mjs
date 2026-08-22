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
await waitFor(()=>evaluate(`typeof qaStateV84==='function' && typeof renderAuthoritativeVehiclePanelV107==='function' && window.__SCORCH_ENTRY_ACTIVE===false`),30000);
const result=await evaluate(`(()=>{
 window.state=qaStateV84();
 state.gear=state.gear||{};state.gear.cart=true;state.gear.vehicle=true;
 state.logistics=state.logistics||{};state.logistics.heavyReady=false;
 state.vehicle=state.vehicle||{};state.vehicle.capacityKg=700;state.vehicle.hasAC=true;state.vehicle.acActive=true;
 state.resources.fuel=18.5;
 render();renderAuthoritativeVehiclePanelV107();
 const carText=document.getElementById('vehicleContent')?.innerText||'';
 state.logistics.heavyReady=true;renderAuthoritativeVehiclePanelV107();
 const truckText=document.getElementById('vehicleContent')?.innerText||'';
 return {carText,truckText};
})()`);
assert(result.carText.includes('目前採用：汽車'),'vehicle panel did not resolve active car profile');
assert(result.carText.includes('24.0 km/h')&&result.carText.includes('700 kg')&&result.carText.includes('550 L'),'vehicle panel did not show authoritative car speed/capacity');
assert(result.carText.includes('0.12 L/km')&&result.carText.includes('庫存 18.5L'),'vehicle panel did not show authoritative fuel rate/current stock');
assert(result.carText.includes('冷氣')&&result.carText.includes('可用'),'vehicle panel did not show actual AC state');
assert(result.truckText.includes('目前採用：卡車'),'vehicle panel did not switch to truck after heavyReady');
assert(result.truckText.includes('1200 kg')&&result.truckText.includes('2400 L')&&result.truckText.includes('0.22 L/km'),'vehicle panel did not show authoritative truck profile');
console.log('PASS resident authoritative vehicle panel');
ws.close();
