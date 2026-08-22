const CDP='http://127.0.0.1:9222',APP='http://127.0.0.1:4173/';
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
await waitFor(()=>evaluate(`typeof renderLocalEventV126==='function'&&typeof visibleLocalEventV126==='function'&&Object.keys(EVENTS_V123||{}).length===30`),30000);
let snap=await evaluate(`(()=>{document.querySelectorAll('.local-event-v126').forEach(el=>el.remove());const s=qaStateV84();window.state=s;applyZeroResourceOpeningV112(s);delete s.knowledgeV123;delete s.localEventsV126;ensureKnowledgeV123(s);s.explorationV113={current:'store',discovered:['base','store']};s.explorationV118={selected:null,explored:['base'],observed:{base:true,store:false}};renderMap();return true})()`);await sleep(60);
snap=await evaluate(`(()=>({panel:!!document.querySelector('.local-event-v126'),text:document.getElementById('map')?.innerText||'',knownEvents:Object.keys(state.knowledgeV123?.events||{}).length}))()`);
assert(!snap.panel,'local event framework appeared before active observation');
assert(!snap.text.includes('破窗熱流'),'event from another location leaked before observation');
assert(snap.knownEvents===0,'event outcome existed before encounter');
await evaluate(`(()=>{state.explorationV118.observed.store=true;renderMap();return true})()`);await sleep(60);
snap=await evaluate(`(()=>({panel:!!document.querySelector('.local-event-v126'),text:document.querySelector('.local-event-v126')?.innerText||'',id:visibleLocalEventV126()?.id,other:document.getElementById('map')?.innerText.includes('破窗熱流')}))()`);
assert(snap.panel,'observed location did not surface its local event');
assert(snap.id==='blocked-stairwell','store surfaced wrong deterministic local event');
assert(snap.text.includes('受阻樓梯'),'visible local event copy missing');
assert(!snap.other,'event from another location leaked into DOM');
const result=await evaluate(`resolveLocalEventV126('blocked-stairwell','handled')`);await sleep(60);
snap=await evaluate(`(()=>({panel:!!document.querySelector('.local-event-v126'),outcome:state.knowledgeV123?.events?.['blocked-stairwell']?.outcome,next:visibleLocalEventV126()}))()`);
assert(result.ok,'visible local event could not be resolved');
assert(snap.outcome==='handled','local event outcome was not persisted');
assert(!snap.panel&&!snap.next,'resolved local event framework did not disappear');
console.log('PASS resident Batch 6 discovery-gated local events');ws.close();