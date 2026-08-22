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
await waitFor(()=>evaluate(`typeof ensureCoreNpcStateV121==='function'&&typeof advanceNpcAutonomyV121==='function'&&typeof setCompanionV121==='function'`),30000);
let snap=await evaluate(`(()=>{const s=qaStateV84();window.state=s;applyZeroResourceOpeningV112(s);delete s.coreNpcV121;ensureCoreNpcStateV121(s);s.explorationV113={current:'homes',discovered:['base','homes']};s.explorationV118={selected:null,explored:['base'],observed:{base:true,homes:false}};renderMap();return {count:Object.keys(s.coreNpcV121.people).length,known:s.coreNpcV121.knownIds.length,panel:!!document.querySelector('.npc-presence-v121'),text:document.getElementById('map')?.innerText||''};})()`);
assert(snap.count===10,'core NPC roster should contain exactly 10 people');
assert(snap.known===0,'opening leaked known NPC identities');
assert(!snap.panel,'NPC framework appeared before location was observed');
assert(!snap.text.includes('許佩真'),'unencountered NPC name leaked before exploration');
await evaluate(`(()=>{state.explorationV118.observed.homes=true;renderMap();return true})()`);await sleep(50);
snap=await evaluate(`(()=>({known:state.coreNpcV121.knownIds.slice(),text:document.querySelector('.npc-presence-v121')?.innerText||'',location:state.coreNpcV121.people['npc-xu-peizhen'].location}))()`);
assert(snap.known.includes('npc-xu-peizhen'),'observed co-located NPC was not encountered');
assert(snap.text.includes('許佩真')&&snap.text.includes('社區工作者'),'encountered NPC identity/role missing');
let follow=await evaluate(`(()=>{const n=state.coreNpcV121.people['npc-xu-peizhen'];const r=setCompanionV121(n.id,true);syncCompanionsV121('store');return {ok:r.ok,companion:n.companion,location:n.location};})()`);
assert(follow.ok&&follow.companion&&follow.location==='store','encountered companion did not follow movement');
const before=await evaluate(`state.coreNpcV121.people['npc-chen-guowei'].location`);
await evaluate(`advanceNpcAutonomyV121(6)`);
const after=await evaluate(`state.coreNpcV121.people['npc-chen-guowei'].location`);
assert(before!==after,'independent NPC autonomy did not advance route');
follow=await evaluate(`(()=>{const n=state.coreNpcV121.people['npc-xu-peizhen'];return {location:n.location,companion:n.companion}})()`);
assert(follow.location==='store'&&follow.companion,'companion was moved by independent autonomy');
console.log('PASS resident Batch 4 core NPC encounter/autonomy/companion foundation');ws.close();