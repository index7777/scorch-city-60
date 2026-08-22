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
await waitFor(()=>evaluate(`typeof syncDiscoveryV124==='function'&&typeof inspectDocumentV124==='function'&&typeof learnIntelV123==='function'`),30000);
let snap=await evaluate(`(()=>{const s=qaStateV84();window.state=s;applyZeroResourceOpeningV112(s);ensurePhysicalInventoryV115(s);delete s.coreNpcV121;delete s.socialV122;delete s.knowledgeV123;delete s.discoveryV124;delete s.sceneInteractionsV119;ensureCoreNpcStateV121(s);ensureSocialV122(s);ensureKnowledgeV123(s);ensureDiscoveryV124(s);ensureSceneStateV119(s);s.day=1;s.phase='night';s.hoursLeft=8;s.explorationV113={current:'homes',discovered:['base','homes']};s.explorationV118={selected:null,explored:['base'],observed:{base:true,homes:false}};renderMap();return {intel:Object.keys(s.knowledgeV123.intelligence).length,docs:!!document.querySelector('.documents-v124'),batch6ui:!!document.querySelector('.knowledge-v123,.clues-v123,.deductions-v123')};})()`);
assert(snap.intel===0,'opening learned intelligence before observation');assert(!snap.docs,'document framework appeared before active exploration');assert(!snap.batch6ui,'Batch 6 knowledge framework appeared at opening');
await evaluate(`document.querySelector('[data-explore-v118]')?.click()`);await sleep(80);
snap=await evaluate(`(()=>({route:knownIntelV123('I-R01'),hazard:knownIntelV123('I-H01'),people:knownIntelV123('I-P01'),known:state.coreNpcV121.knownIds.includes('npc-xu-peizhen'),batch6ui:!!document.querySelector('.knowledge-v123,.clues-v123,.deductions-v123')}))()`);
assert(snap.route&&snap.hazard,'active exploration did not create observation intelligence');assert(snap.people&&snap.known,'actual co-located NPC encounter did not create people intelligence');assert(!snap.batch6ui,'intelligence discovery created an unwanted knowledge/clue framework');
await evaluate(`(()=>{state.hoursLeft=8;state.explorationV113.current='store';state.explorationV113.discovered=['base','homes','store'];state.explorationV118.observed.store=true;renderMap();return true})()`);await sleep(80);
snap=await evaluate(`(()=>({panel:!!document.querySelector('.documents-v124'),text:document.querySelector('.documents-v124')?.innerText||'',docIntel:knownIntelV123('I-S06'),route:knownIntelV123('I-R02')}))()`);
assert(snap.panel&&snap.text.includes('送貨便條'),'observed location did not expose its actual document');assert(!snap.docIntel,'unread document leaked its intelligence');assert(snap.route,'observed store did not create route intelligence');
const beforeDoc=await evaluate(`state.hoursLeft`);const docResult=await evaluate(`inspectDocumentV124('store-delivery-note')`);await sleep(60);const afterDoc=await evaluate(`state.hoursLeft`);
assert(docResult.ok,'visible document could not be inspected');assert(beforeDoc-afterDoc===.25,'document inspection did not cost 0.25h');
snap=await evaluate(`(()=>({known:knownIntelV123('I-S06'),source:state.knowledgeV123.intelligence['I-S06']?.source,verified:state.knowledgeV123.intelligence['I-S06']?.verified}))()`);
assert(snap.known&&snap.source==='document'&&snap.verified===false,'document intelligence metadata is wrong');
await evaluate(`searchObjectV119('store','store-shelf')`);await sleep(80);
snap=await evaluate(`(()=>({stock:knownIntelV123('I-S02'),source:state.knowledgeV123.intelligence['I-S02']?.source}))()`);
assert(snap.stock&&snap.source==='observation','searched finite stock did not create observation intelligence');
await evaluate(`(()=>{state.explorationV113.current='homes';state.explorationV118.observed.homes=true;renderMap();return true})()`);await sleep(60);
const talkResult=await evaluate(`(()=>{let r=null;for(let i=1;i<=9;i++){r=talkV122('npc-xu-peizhen','npc-xu-peizhen-t'+String(i).padStart(2,'0'));if(!r.ok)return r}syncDiscoveryV124();return r})()`);
assert(talkResult.ok,'progressive dialogue could not reach supplies testimony');
snap=await evaluate(`(()=>({known:knownIntelV123('I-S09'),source:state.knowledgeV123.intelligence['I-S09']?.source,reliability:state.knowledgeV123.intelligence['I-S09']?.reliability,verified:state.knowledgeV123.intelligence['I-S09']?.verified,counts:[Object.keys(INTELLIGENCE_V123).length,Object.keys(CLUES_V123).length,Object.keys(DEDUCTIONS_V123).length,Object.keys(EVENTS_V123).length]}))()`);
assert(snap.known&&snap.source==='testimony'&&snap.reliability==='low'&&snap.verified===false,'NPC testimony intelligence metadata is wrong');assert(snap.counts[0]>=50&&snap.counts[1]===12&&snap.counts[2]===3&&snap.counts[3]===30,'Batch 6 foundation counts regressed unexpectedly');
console.log('PASS resident Batch 6 source-driven intelligence discovery');ws.close();