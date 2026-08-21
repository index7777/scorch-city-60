const CDP='http://127.0.0.1:9222';
const APP='http://127.0.0.1:4173/';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function assert(ok,msg){if(!ok)throw new Error(msg)}
async function waitFor(fn,timeout=20000,step=100){const end=Date.now()+timeout;let last;while(Date.now()<end){try{last=await fn();if(last)return last}catch{}await sleep(step)}throw new Error(`timeout: ${String(last||'condition')}`)}

const targets=await waitFor(async()=>{
 const r=await fetch(`${CDP}/json/list`);if(!r.ok)return null;const list=await r.json();return list.find(x=>x.type==='page'&&x.url.startsWith(APP))||list.find(x=>x.type==='page')
});
assert(targets?.webSocketDebuggerUrl,'no Chrome page target');
const ws=new WebSocket(targets.webSocketDebuggerUrl);
await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true})});
let seq=0;const pending=new Map(),exceptions=[];
ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id&&pending.has(m.id)){const {resolve,reject}=pending.get(m.id);pending.delete(m.id);m.error?reject(new Error(m.error.message)):resolve(m.result)}else if(m.method==='Runtime.exceptionThrown'){exceptions.push(m.params?.exceptionDetails?.text||'Runtime exception')}});
function send(method,params={}){return new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}))})}
async function evaluate(expression){const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw new Error(r.exceptionDetails.text||'evaluate exception');return r.result?.value}
async function test(name,fn){await fn();console.log(`PASS ${name}`)}

await send('Runtime.enable');await send('Page.enable');
await waitFor(()=>evaluate(`document.readyState==='complete' && document.getElementById('demoEntryStatus')?.textContent.includes('Demo 已就緒')`),30000);
await evaluate(`document.getElementById('demoStart').click()`);
await waitFor(()=>evaluate(`window.__SCORCH_ENTRY_ACTIVE===false`));
await evaluate(`for(const d of document.querySelectorAll('dialog[open]'))d.close();state.onboarding.enabled=false;state.onboarding.completed=true;render();`);

await test('B6 unknown node is fogged and only scout action is exposed',async()=>{
 const ok=await evaluate(`(()=>{state.locations.warehouse.searched=false;delete state.intel.warehouse;renderMap();const n=document.querySelector('.node[data-id="warehouse"]');if(!n||!n.classList.contains('fog-unknown-v68')||!n.textContent.includes('? 未知區域'))return false;openLocation('warehouse');const dlg=document.getElementById('locationDialog');const good=!!document.getElementById('scoutUnknownV68')&&!document.getElementById('searchLoc')&&!document.getElementById('tradeLoc')&&!document.getElementById('openCraftFromLoc');dlg.close();return good})()`);
 assert(ok,'unknown warehouse leaked identity/actions');
});

await test('B3 insufficient-time quick search is visibly disabled',async()=>{
 const ok=await evaluate(`(()=>{state.day=1;state.phase='night';state.hoursLeft=.25;state.locations.store.searched=false;state.intel.store={day:1,verifiedDay:1,summary:'已確認地點用途',source:'QA',confidence:100};const r=searchRecordV69('store');r.lastSearchDay=0;r.visits=0;openLocation('store');const b=document.getElementById('searchLoc'),note=document.querySelector('.quick-search-time-v71');const good=!!b&&b.disabled&&/需/.test(b.textContent)&&!!note;document.getElementById('locationDialog')?.close();return good})()`);
 assert(ok,'quick search remained actionable without enough time');
});

await test('B1 over-budget itinerary shows disabled start and explicit overrun warning',async()=>{
 const ok=await evaluate(`(()=>{state.day=1;state.phase='night';state.hoursLeft=.1;state.locations.store.searched=false;state.intel.store={day:1,verifiedDay:1,summary:'QA',source:'QA',confidence:100};const r=searchRecordV69('store');r.lastSearchDay=0;clearItineraryV27();state.mapPlanner.active=true;addItineraryStopV27('store','scout');renderMap();const b=document.getElementById('itineraryStart'),w=document.getElementById('itineraryStartReasonV71');return !!b&&b.disabled&&!!w&&/時間超支/.test(w.textContent)})()`);
 assert(ok,'negative itinerary buffer did not render a hard blocker');
});

await test('B2 feasible itinerary start click reaches execution handler',async()=>{
 const ok=await evaluate(`(()=>{state.day=1;state.phase='night';state.hoursLeft=8;clearItineraryV27();state.mapPlanner.active=true;addItineraryStopV27('store','scout');renderMap();const b=document.getElementById('itineraryStart');if(!b||b.disabled||!itineraryStartStateV71().ok)return false;const before=ensureItineraryV27().status;b.click();const after=ensureItineraryV27().status;return before==='planning'&&after!=='planning'})()`);
 assert(ok,'enabled itinerary start click did not reach execution');
});

await test('X23 risk cannot decay after a same-day improvement',async()=>{
 const ok=await evaluate(`(()=>{state.day=4;state.flags.riskTrendV69={display:null,lastDecayDay:null,lastSyncDay:4};state.resources.water=1;state.resources.food=1;const high=currentRiskScore();state.resources.water=120;state.resources.food=120;const same=currentRiskScore();return same>=high})()`);
 assert(ok,'risk display decayed inside the same day');
});

await test('X25 same-day repeat search remains locked',async()=>{
 const ok=await evaluate(`(()=>{state.day=5;state.phase='night';state.hoursLeft=8;state.locations.store.searched=true;state.intel.store={day:5,verifiedDay:5,summary:'QA',source:'QA',confidence:100};const r=searchRecordV69('store');r.lastSearchDay=5;r.visits=Math.max(1,r.visits||0);openLocation('store');const b=document.getElementById('searchLoc');const good=!!b&&b.disabled&&/明日|Day 6/.test(b.textContent+' '+b.title);document.getElementById('locationDialog')?.close();return good})()`);
 assert(ok,'same-day revisit search was not locked');
});

await sleep(150);
assert(exceptions.length===0,`browser runtime exceptions: ${exceptions.join(' | ')}`);
console.log('PASS browser runtime exception check');
ws.close();
