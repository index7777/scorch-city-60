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
ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id&&pending.has(m.id)){const {resolve,reject}=pending.get(m.id);pending.delete(m.id);m.error?reject(new Error(m.error.message)):resolve(m.result)}else if(m.method==='Runtime.exceptionThrown'){const d=m.params?.exceptionDetails;exceptions.push(d?.exception?.description||d?.text||'Runtime exception')}});
function send(method,params={}){return new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}))})}
async function evaluate(expression){const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails){const d=r.exceptionDetails,desc=d.exception?.description||d.text||'evaluate exception';throw new Error(desc)}return r.result?.value}
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
 await waitFor(()=>evaluate(`ensureItineraryV27().status!=='running'`),10000);
});

await test('X23 risk cannot decay after a same-day improvement',async()=>{
 const ok=await evaluate(`(()=>{state.day=4;state.flags.riskTrendV69={display:null,lastDecayDay:null,lastSyncDay:4};state.resources.water=1;state.resources.food=1;const high=currentRiskScore();state.resources.water=120;state.resources.food=120;const same=currentRiskScore();return same>=high})()`);
 assert(ok,'risk display decayed inside the same day');
});

await test('X24 Day 1-3 briefing contains an early warning precursor',async()=>{
 const ok=await evaluate(`(()=>{state.day=2;state.phase='night';state.eventChains.water={level:0};openBrief();const text=document.getElementById('briefContent')?.textContent||'';const good=/前兆/.test(text)&&chainLevel('water')>=1;document.getElementById('briefDialog')?.close();return good})()`);
 assert(ok,'early briefing did not expose a Day 1-3 precursor');
});

await test('X25 same-day repeat search remains locked',async()=>{
 const ok=await evaluate(`(()=>{state.day=5;state.phase='night';state.hoursLeft=8;state.locations.store.searched=true;state.intel.store={day:5,verifiedDay:5,summary:'QA',source:'QA',confidence:100};const r=searchRecordV69('store');r.lastSearchDay=5;r.visits=Math.max(1,r.visits||0);openLocation('store');const b=document.getElementById('searchLoc');const good=!!b&&b.disabled&&/明日|Day 6/.test(b.textContent+' '+b.title);document.getElementById('locationDialog')?.close();return good})()`);
 assert(ok,'same-day revisit search was not locked');
});

await test('X26 quick search leaves hidden loot for a later full itinerary search',async()=>{
 const ok=await evaluate(`(()=>{
  state.day=5;state.phase='night';state.hoursLeft=8;state.gear.vehicle=false;state.gear.cart=false;
  state.locations.store.searched=true;state.intel.store={day:5,verifiedDay:5,summary:'QA',source:'QA',confidence:100};
  state.locations.store.remaining={water:1,food:1,battery:2,medicine:2};
  const r=searchRecordV69('store');r.visits=0;r.quick=0;r.full=0;r.lastSearchDay=0;
  const beforeBattery=state.locations.store.remaining.battery,beforeMedicine=state.locations.store.remaining.medicine;
  searchLocation(mapLoc('store'));
  const hiddenUntouched=state.locations.store.remaining.battery===beforeBattery&&state.locations.store.remaining.medicine===beforeMedicine;
  const quickMarked=searchRecordV69('store').quick===1&&searchRecordV69('store').lastSearchDay===5;
  state.day=6;state.phase='night';state.hoursLeft=8;
  collectStopLootV27(mapLoc('store'));
  const hiddenRecovered=state.locations.store.remaining.battery<beforeBattery||state.locations.store.remaining.medicine<beforeMedicine;
  return hiddenUntouched&&quickMarked&&hiddenRecovered&&searchRecordV69('store').full===1
 })()`);
 assert(ok,'quick search consumed hidden loot or full search could not recover it later');
});

await test('X27 direct NPC trade session consumes 0.5h',async()=>{
 const ok=await evaluate(`(()=>{for(const d of document.querySelectorAll('dialog[open]'))d.close();state.day=5;state.phase='night';state.hoursLeft=8;const id=Object.keys(state.npcs)[0],k=npcKnowledge(id);k.seen=k.nameKnown=k.roleKnown=k.tradeUnlocked=true;const before=state.hoursLeft;openTrade(id);const after=state.hoursLeft;document.getElementById('tradeDialog')?.close();return Math.abs((before-after)-.5)<.01})()`);
 assert(ok,'NPC trade session did not consume 0.5h');
});

await test('X28 relationship UI shows 0-100 score and actual unlock thresholds',async()=>{
 const ok=await evaluate(`(()=>{for(const d of document.querySelectorAll('dialog[open]'))d.close();state.day=5;state.phase='night';state.hoursLeft=8;const id=Object.keys(state.npcs)[0],k=npcKnowledge(id);k.seen=k.nameKnown=k.roleKnown=k.tradeUnlocked=true;openTrade(id);const t=document.getElementById('tradeContent')?.textContent||'';const good=/好感度 \d+\/100/.test(t)&&/55\/100/.test(t)&&/65\/100/.test(t)&&/85\/100/.test(t);document.getElementById('tradeDialog')?.close();return good})()`);
 assert(ok,'relationship unlock thresholds were not visible');
});

await test('X29 high-risk injury and time-overrun mutate real state',async()=>{
 const ok=await evaluate(`(()=>{const loc={id:'qa-risk',name:'QA 高風險地點',risk:4};state.flags.highRiskEventsV79={};state.flags.highRiskInjuriesV84={};state.phase='night';state.hoursLeft=8;state.fieldTeam.active=false;let injuryDay=null,overrunDay=null;const sum=loc.id.split('').reduce((a,c)=>a+c.charCodeAt(0),0);for(let d=1;d<=8;d++){const code=(d+sum)%4;if(code===1&&!injuryDay)injuryDay=d;if(code===2&&!overrunDay)overrunDay=d}state.day=injuryDay;applyHighRiskConsequenceV79(loc);const injured=!!ensureHighRiskInjuriesV84().player;state.flags.highRiskEventsV79={};state.day=overrunDay;state.hoursLeft=8;const before=state.hoursLeft;applyHighRiskConsequenceV79(loc);const overrun=Math.abs((before-state.hoursLeft)-.5)<.01;return injured&&overrun})()`);
 assert(ok,'high-risk injury/overrun did not affect state');
});

await test('X30 contacted settlement exposes enabled trade entry',async()=>{
 const ok=await evaluate(`(()=>{for(const d of document.querySelectorAll('dialog[open]'))d.close();const id=Object.keys(state.settlements||{})[0];if(!id)return false;const s=state.settlements[id];state.locations[s.location].searched=true;openSettlements();const b=document.querySelector('[data-settlement-trade-v79="'+id+'"]');const good=!!b&&!b.disabled&&/發起交易/.test(b.textContent);document.getElementById('settlementDialog')?.close();return good})()`);
 assert(ok,'contacted settlement did not expose trade entry');
});

await test('X31/X32 visible naming is normalized',async()=>{
 const ok=await evaluate(`(()=>{render();const research=document.getElementById('researchBtn')?.textContent||'',title=document.getElementById('researchDialog')?.querySelector('h2')?.textContent||'';const host=document.createElement('div');host.textContent='大型設備';normalizeVisibleCopyV81(host);return /研究/.test(research)&&title==='研究'&&host.textContent==='大型資產'})()`);
 assert(ok,'research/large-asset naming was not normalized');
});

await sleep(150);
assert(exceptions.length===0,`browser runtime exceptions: ${exceptions.join(' | ')}`);
console.log('PASS browser runtime exception check');
ws.close();
