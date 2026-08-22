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
await waitFor(()=>evaluate(`typeof qaStateV84==='function' && typeof applyResidentItineraryExposureV96==='function' && window.__SCORCH_ENTRY_ACTIVE===false`),30000);
const result=await evaluate(`(()=>{
 window.state=qaStateV84();for(const d of document.querySelectorAll('dialog[open]'))d.close();
 state.day=30;state.phase='day';state.hoursLeft=0;state.onboarding.enabled=false;state.onboarding.completed=true;
 state.worldClock={schema:1,day:30,endlessElapsed:0};
 state.player={hydration:100,satiety:100,stamina:100,health:100,bodyTemp:36.5,heat:0,dead:false,deathReason:''};
 state.residentClock={day:30,phase:'day',hoursLeft:0};
 state.residentSurvivalClock={day:30,phase:'day',hoursLeft:0};
 state.gear=state.gear||{};state.gear.coolingPack=false;state.gear.vehicle=false;
 state.roadWorld={};state.roadIntel={};
 for(const n of Object.values(state.npcs||{}))n.alive=false;
 state.itinerary={schema:1,stops:[{id:'qa-home-scout',location:'homes',action:'scout'}],routeMode:'fastest',status:'running',index:0,current:'base',lastMessage:''};
 const before={heat:state.player.heat,temp:state.player.bodyTemp,hydration:state.player.hydration,elapsed:state.worldClock.endlessElapsed,index:state.itinerary.index};
 runItineraryStepV27();
 return {status:state.itinerary.status,message:state.itinerary.lastMessage||'',index:state.itinerary.index,heat:state.player.heat,temp:state.player.bodyTemp,hydration:state.player.hydration,dead:!!state.player.dead,elapsed:state.worldClock.endlessElapsed,before};
})()`);
assert(result.status!=='paused',`itinerary step paused unexpectedly${result.message?`: ${result.message}`:''}`);
assert(result.index>result.before.index,'itinerary did not execute the fixture stop');
assert(result.elapsed>result.before.elapsed,'itinerary step did not consume Day 30 world time');
assert(result.heat>result.before.heat,'Day 30 itinerary step did not accumulate resident heat');
assert(result.temp>result.before.temp,'Day 30 itinerary step did not raise resident body temperature');
assert(result.hydration<result.before.hydration,'Day 30 itinerary step did not consume resident hydration');
assert(!result.dead,'short Day 30 itinerary step should not instantly kill resident');
console.log('PASS resident itinerary survival integration');
ws.close();
