const CDP='http://127.0.0.1:9222',APP='http://127.0.0.1:4173/';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function assert(ok,msg){if(!ok)throw new Error(msg)}
async function waitFor(fn,timeout=20000,step=50){const end=Date.now()+timeout;while(Date.now()<end){try{const v=await fn();if(v)return v}catch{}await sleep(step)}throw new Error('timeout')}
const target=await waitFor(async()=>{const r=await fetch(`${CDP}/json/list`);if(!r.ok)return null;const list=await r.json();return list.find(x=>x.type==='page'&&x.url.startsWith(APP))||list.find(x=>x.type==='page')});
assert(target?.webSocketDebuggerUrl,'no Chrome page target');
const ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true})});
let seq=0;const pending=new Map();ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id&&pending.has(m.id)){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(new Error(m.error.message)):p.resolve(m.result)}});
function send(method,params={}){return new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}))})}
async function evaluate(expression){const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw new Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text||'evaluate exception');return r.result?.value}
await send('Runtime.enable');
await waitFor(()=>evaluate(`typeof recurringNpcV129==='function'&&typeof talkRecurringV129==='function'&&typeof advanceRecurringNpcAutonomyV129==='function'`),30000);
let snap=await evaluate(`(()=>{document.querySelectorAll('.recurring-presence-v129').forEach(el=>el.remove());const s=qaStateV84();state=s;applyZeroResourceOpeningV112(s);delete s.recurringNpcV129;ensureRecurringNpcV129(s);s.explorationV113={current:'store',discovered:['base','store']};s.explorationV118={selected:null,explored:['base'],observed:{base:true,store:false}};renderMap();return {count:Object.keys(RECURRING_NPCS_V129).length,panel:!!document.querySelector('.recurring-presence-v129'),text:document.getElementById('map')?.innerText||'',known:ensureRecurringNpcV129(s).knownIds.length};})()`);
assert(snap.count===6,'recurring NPC wave did not contain six residents');
assert(!snap.panel&&snap.known===0,'recurring NPC framework or identity leaked before observation');
assert(!snap.text.includes('周博明')&&!snap.text.includes('羅曉芬'),'unencountered recurring identity leaked into map');
await evaluate(`state.explorationV118.observed.store=true;renderMap()`);
await waitFor(()=>evaluate(`!!document.querySelector('.recurring-presence-v129')`),3000,25);
snap=await evaluate(`(()=>({text:document.querySelector('.recurring-presence-v129')?.innerText||'',encountered:!!recurringNpcV129('npc-zhou-boming').encountered,known:ensureRecurringNpcV129().knownIds.includes('npc-zhou-boming'),other:document.querySelector('.recurring-presence-v129')?.innerText.includes('羅曉芬')||false,party:!!document.querySelector('.recurring-presence-v129 [data-party-v122]')}))()`);
assert(snap.text.includes('周博明')&&snap.encountered&&snap.known,'observed recurring NPC did not become a legitimate encounter');
assert(!snap.other,'NPC from another location leaked into the current encounter panel');
assert(!snap.party,'recurring mid-depth NPC incorrectly exposed companion action');
let r=await evaluate(`talkRecurringV129('npc-zhou-boming','npc-zhou-boming-r01')`);assert(r.ok&&r.first&&r.trust===1,'first recurring conversation did not update trust');
r=await evaluate(`talkRecurringV129('npc-zhou-boming','npc-zhou-boming-r04')`);assert(r.ok&&r.first&&r.trust===2,'newly unlocked recurring topic did not work');
snap=await evaluate(`(()=>({available:availableRecurringTopicsV129('npc-zhou-boming').length,talked:recurringNpcV129('npc-zhou-boming').talked.length,last:recurringNpcV129('npc-zhou-boming').lastBody}))()`);
assert(snap.available===5&&snap.talked===2&&snap.last.includes('守住剩下的貨'),'recurring topic progression is inconsistent');
await evaluate(`state.explorationV113.current='base';renderMap()`);
await waitFor(()=>evaluate(`!document.querySelector('.recurring-presence-v129')`),3000,25);
assert(!(await evaluate(`!!document.querySelector('.recurring-presence-v129')`)),'recurring NPC framework leaked after leaving location');
const moved=await evaluate(`(()=>{const s=qaStateV84();delete s.recurringNpcV129;ensureRecurringNpcV129(s);const before=recurringNpcV129('npc-zhou-boming',s).location;advanceRecurringNpcAutonomyV129(8,s);const n=recurringNpcV129('npc-zhou-boming',s);return {before,after:n.location,routeIndex:n.routeIndex,energy:n.energy}})()`);
assert(moved.before==='store'&&moved.after==='warehouse'&&moved.routeIndex===1&&moved.energy===88,'recurring NPC autonomy did not advance along its physical route');
console.log('PASS resident Batch 7 recurring NPC social expansion');ws.close();