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
await waitFor(()=>evaluate(`typeof visibleCommunityRequestV128==='function'&&typeof contributeCommunityRequestV128==='function'&&typeof talkV122==='function'`),30000);
let snap=await evaluate(`(()=>{document.querySelectorAll('.community-request-v128,.social-presence-v122').forEach(el=>el.remove());const s=qaStateV84();state=s;applyZeroResourceOpeningV112(s);delete s.coreNpcV121;delete s.socialV122;delete s.communityV128;ensureCoreNpcStateV121(s);ensureSocialV122(s);ensureCommunityV128(s);s.explorationV113={current:'homes',discovered:['base','homes']};s.explorationV118={selected:null,explored:['base','homes'],observed:{base:true,homes:true}};const n=npcV121('npc-xu-peizhen',s);n.location='homes';n.encountered=true;renderMap();return {known:requestKnownV128('npc-xu-peizhen',s),panel:!!document.querySelector('.community-request-v128')};})()`);await sleep(50);
assert(!snap.known&&!snap.panel,'community request framework leaked before needs conversation');
let r=await evaluate(`talkV122('npc-xu-peizhen','npc-xu-peizhen-t01')`);assert(r.ok,'starter conversation failed');
r=await evaluate(`talkV122('npc-xu-peizhen','npc-xu-peizhen-t04')`);assert(r.ok,'needs conversation failed');
await evaluate(`renderMap()`);await sleep(50);
snap=await evaluate(`(()=>({known:requestKnownV128('npc-xu-peizhen'),visible:!!visibleCommunityRequestV128('npc-xu-peizhen'),panel:!!document.querySelector('.community-request-v128'),text:document.querySelector('.community-request-v128')?.innerText||''}))()`);
assert(snap.known&&snap.visible&&snap.panel,'known local request did not appear');
assert(snap.text.includes('補一份能直接吃的食物'),'request content missing after legitimate conversation');
await evaluate(`state.explorationV113.current='base';renderMap()`);await sleep(50);
snap=await evaluate(`(()=>({panel:!!document.querySelector('.community-request-v128'),visible:!!visibleCommunityRequestV128('npc-xu-peizhen')}))()`);assert(!snap.panel&&!snap.visible,'community request leaked when NPC was not co-located');
await evaluate(`state.explorationV113.current='homes';state.backpack.items.push(physicalItemV119('item-crackers'));recalcPhysicalWeightsV115(state);renderMap()`);await sleep(50);
const before=await evaluate(`(()=>({bag:state.backpack.items.filter(x=>x.catalogId==='item-crackers').length,npc:socialNpcV122('npc-xu-peizhen').inventory.filter(x=>x.catalogId==='item-crackers').length,trust:socialNpcV122('npc-xu-peizhen').trust}))()`);
r=await evaluate(`contributeCommunityRequestV128('npc-xu-peizhen')`);assert(r.ok,'physical contribution failed');
await evaluate(`renderMap()`);await sleep(50);
const after=await evaluate(`(()=>({bag:state.backpack.items.filter(x=>x.catalogId==='item-crackers').length,npc:socialNpcV122('npc-xu-peizhen').inventory.filter(x=>x.catalogId==='item-crackers').length,trust:socialNpcV122('npc-xu-peizhen').trust,done:!!state.communityV128.completed['npc-xu-peizhen'],panel:!!document.querySelector('.community-request-v128')}))()`);
assert(after.bag===before.bag-1,'contributed physical item was not removed from backpack');
assert(after.npc===before.npc+1,'contributed physical item was not transferred to NPC inventory');
assert(after.trust===Math.min(6,before.trust+1),'contribution did not update relationship trust');
assert(after.done&&!after.panel,'completed request remained visible or completion was not persisted');
console.log('PASS resident Batch 7 encounter-gated community requests');ws.close();