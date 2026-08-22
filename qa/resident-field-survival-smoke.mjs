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
await waitFor(()=>evaluate(`typeof qaStateV84==='function' && typeof applyResidentFieldExposureV95==='function' && window.__SCORCH_ENTRY_ACTIVE===false`),30000);
const result=await evaluate(`(()=>{
 window.state=qaStateV84();for(const d of document.querySelectorAll('dialog[open]'))d.close();
 state.day=30;state.phase='day';state.hoursLeft=0;state.onboarding.enabled=false;state.onboarding.completed=true;
 state.gear=state.gear||{};state.gear.coolingPack=true;state.gear.vehicle=false;
 state.resources.battery=999;state.resources.fuel=999;
 state.player={hydration:100,satiety:100,stamina:100,health:100,bodyTemp:36.5,heat:0,dead:false,deathReason:''};
 // Reset both resident clocks to Day 30 so this fixture measures one field action,
 // not a synthetic Day 1 -> Day 30 metabolism jump during the action's render().
 state.residentClock={day:30,phase:'day',hoursLeft:0};
 state.residentSurvivalClock={day:30,phase:'day',hoursLeft:0};
 state.searchPacingV69={schema:1,locations:{homes:{visits:0,quick:0,full:0,lastSearchDay:0}}};
 state.knowledge=state.knowledge||{};state.knowledge.scoutedLocations=state.knowledge.scoutedLocations||{};state.knowledge.scoutedLocations.homes={day:1,method:'QA'};
 state.intel=state.intel||{};state.intel.homes={day:1,verifiedDay:1,summary:'QA 已偵察',source:'QA',confidence:100};
 const loc=mapLoc('homes');state.locations.homes.searched=false;state.locations.homes.remaining={...state.locations.homes.remaining,water:4,food:2};
 const before={heat:state.player.heat,temp:state.player.bodyTemp,hydration:state.player.hydration,log:state.log.length};
 searchLocation(loc);
 const messages=state.log.slice(before.log).map(x=>x.msg||'');
 return {heat:state.player.heat,temp:state.player.bodyTemp,hydration:state.player.hydration,dead:!!state.player.dead,logged:messages.some(x=>x.startsWith('住宅區快速搜索：')||x.startsWith('住宅區 搜索：'))};
})()`);
assert(result.logged,'quick search did not complete in fixture');
assert(result.heat>0,'Day 30 quick search did not accumulate resident heat');
assert(result.temp>36.5,'Day 30 quick search did not raise resident body temperature');
assert(result.hydration<100,'Day 30 quick search did not consume resident hydration');
assert(!result.dead,'single cooled Day 30 quick search should not instantly kill resident');
console.log('PASS resident field survival integration');
ws.close();
