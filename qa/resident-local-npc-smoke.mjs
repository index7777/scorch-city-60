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
await waitFor(()=>evaluate(`typeof localNpcV130==='function'&&typeof talkLocalV130==='function'&&typeof LOCAL_NPCS_V130==='object'`),30000);
let snap=await evaluate(`(()=>{document.querySelectorAll('.local-presence-v130').forEach(el=>el.remove());const s=qaStateV84();state=s;applyZeroResourceOpeningV112(s);delete s.localNpcV130;ensureLocalNpcV130(s);s.explorationV113={current:'homes',discovered:['base','homes']};s.explorationV118={selected:null,explored:['base'],observed:{base:true,homes:false}};renderMap();return {count:Object.keys(LOCAL_NPCS_V130).length,panel:!!document.querySelector('.local-presence-v130'),known:ensureLocalNpcV130(s).knownIds.length,text:document.getElementById('map')?.innerText||''};})()`);
assert(snap.count===8,'local NPC roster did not contain eight residents');
assert(!snap.panel&&snap.known===0,'local NPC framework or identity leaked before observation');
assert(!snap.text.includes('洪阿姨')&&!snap.text.includes('阿梅'),'unencountered local identity leaked into map');
await evaluate(`state.explorationV118.observed.homes=true;renderMap()`);
await waitFor(()=>evaluate(`!!document.querySelector('.local-presence-v130')`),3000,25);
snap=await evaluate(`(()=>({text:document.querySelector('.local-presence-v130')?.innerText||'',known:[...ensureLocalNpcV130().knownIds],hong:!!localNpcV130('npc-hong-ayi').encountered,other:document.querySelector('.local-presence-v130')?.innerText.includes('阿梅')||false,party:!!document.querySelector('.local-presence-v130 [data-party-v122]')}))()`);
assert(snap.text.includes('洪阿姨')&&snap.hong&&snap.known.includes('npc-hong-ayi'),'observed local NPC did not become a legitimate encounter');
assert(!snap.other,'local NPC from another location leaked into current panel');
assert(!snap.party,'local short-chain NPC incorrectly exposed core companion action');
let r=await evaluate(`talkLocalV130('npc-hong-ayi','npc-hong-ayi-l01')`);assert(r.ok&&r.first&&r.trust===1,'first local conversation did not update trust');
r=await evaluate(`talkLocalV130('npc-hong-ayi','npc-hong-ayi-l03')`);assert(r.ok&&r.first&&r.trust===2,'newly unlocked local topic did not work');
snap=await evaluate(`(()=>({available:availableLocalTopicsV130('npc-hong-ayi').length,talked:localNpcV130('npc-hong-ayi').talked.length,last:localNpcV130('npc-hong-ayi').lastBody}))()`);
assert(snap.available===3&&snap.talked===2&&snap.last.includes('沒有親眼確認'),'local topic progression is inconsistent');
await evaluate(`state.explorationV113.current='clinic';state.explorationV113.discovered.push('clinic');state.explorationV118.observed.clinic=false;renderMap()`);await sleep(50);
snap=await evaluate(`(()=>({panel:!!document.querySelector('.local-presence-v130'),text:document.getElementById('map')?.innerText||''}))()`);
assert(!snap.panel&&!snap.text.includes('阿梅'),'clinic local NPC leaked before clinic observation');
await evaluate(`state.explorationV118.observed.clinic=true;renderMap()`);
await waitFor(()=>evaluate(`document.querySelector('.local-presence-v130')?.innerText.includes('阿梅')`),3000,25);
assert(await evaluate(`!!localNpcV130('npc-mei').encountered`),'clinic local NPC was not encountered after observation');
console.log('PASS resident Batch 7 local short-chain NPC expansion');ws.close();