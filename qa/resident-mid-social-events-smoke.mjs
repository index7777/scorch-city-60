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
await waitFor(()=>evaluate(`typeof visibleMidEventV131==='function'&&typeof resolveMidEventV131==='function'&&typeof MID_EVENTS_V131==='object'`),30000);
let snap=await evaluate(`(()=>{document.querySelectorAll('.mid-event-v131').forEach(el=>el.remove());const s=qaStateV84();state=s;applyZeroResourceOpeningV112(s);delete s.localNpcV130;delete s.midEventsV131;ensureLocalNpcV130(s);ensureMidEventsV131(s);s.explorationV113={current:'homes',discovered:['base','homes']};s.explorationV118={selected:null,explored:['base'],observed:{base:true,homes:false}};const n=localNpcV130('npc-hong-ayi',s);n.location='homes';n.encountered=true;renderMap();return{count:Object.keys(MID_EVENTS_V131).length,panel:!!document.querySelector('.mid-event-v131'),visible:visibleMidEventV131(s)};})()`);
assert(snap.count===8,'mid-scale event slice did not contain eight events');
assert(!snap.panel&&!snap.visible,'mid-scale event framework leaked before observation/conversation');
await evaluate(`state.explorationV118.observed.homes=true;renderMap()`);await sleep(50);
assert(!(await evaluate(`!!document.querySelector('.mid-event-v131')`)),'event appeared from observation alone');
let r=await evaluate(`talkLocalV130('npc-hong-ayi','npc-hong-ayi-l02')`);assert(r.ok,'legitimate local conversation failed');
await evaluate(`renderMap()`);
await waitFor(()=>evaluate(`!!document.querySelector('.mid-event-v131')`),3000,25);
snap=await evaluate(`(()=>({id:visibleMidEventV131()?.id||'',text:document.querySelector('.mid-event-v131')?.innerText||''}))()`);
assert(snap.id==='neighbor-refuses-entry','wrong mid-scale event became visible');
assert(snap.text.includes('住戶拒絕開門'),'legitimate event copy missing');
assert(!snap.text.includes('尋人請求')&&!snap.text.includes('藥品需求'),'other mid-scale events leaked into current framework');
r=await evaluate(`resolveMidEventV131('neighbor-refuses-entry','handled')`);assert(r.ok,'mid-scale event resolution failed');
await waitFor(()=>evaluate(`!document.querySelector('.mid-event-v131')`),3000,25);
snap=await evaluate(`(()=>({resolved:ensureMidEventsV131().resolved['neighbor-refuses-entry']?.outcome||'',visible:visibleMidEventV131()}))()`);
assert(snap.resolved==='handled'&&!snap.visible,'resolved mid-scale event did not persist/disappear');
console.log('PASS resident Batch 7 encounter-gated mid-scale social events');ws.close();