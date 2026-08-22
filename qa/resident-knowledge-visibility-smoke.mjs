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
await waitFor(()=>evaluate(`typeof renderKnowledgeV125==='function'&&typeof learnIntelV123==='function'`),30000);
let snap=await evaluate(`(()=>{document.querySelectorAll('.knowledge-v125,.documents-v124').forEach(el=>el.remove());const s=qaStateV84();window.state=s;applyZeroResourceOpeningV112(s);delete s.knowledgeV123;delete s.discoveryV124;ensureKnowledgeV123(s);ensureDiscoveryV124(s);s.explorationV113={current:'base',discovered:['base']};s.explorationV118={selected:null,explored:['base'],observed:{base:true}};renderMap();return {panel:!!document.querySelector('.knowledge-v125'),text:document.getElementById('map')?.innerText||''};})()`);await sleep(50);
snap=await evaluate(`(()=>({panel:!!document.querySelector('.knowledge-v125'),text:document.getElementById('map')?.innerText||'',intel:Object.keys(state.knowledgeV123?.intelligence||{}).length}))()`);
assert(snap.intel===0,'knowledge isolation did not start with zero learned intelligence');
assert(!snap.panel,'knowledge framework appeared with zero learned intelligence');
assert(!snap.text.includes('商店正門鐵捲門受損'),'unknown intelligence leaked before learning');
await evaluate(`learnIntelV123('I-R01',{source:'observation',verified:true});renderMap()`);await sleep(50);
snap=await evaluate(`(()=>({panel:!!document.querySelector('.knowledge-v125'),text:document.querySelector('.knowledge-v125')?.innerText||'',clues:!!document.querySelector('.knowledge-clues-v125'),deductions:!!document.querySelector('.knowledge-deductions-v125')}))()`);
assert(snap.panel,'knowledge panel did not appear after learning a record');
assert(snap.text.includes('住宅巷口可直接通往基地附近'),'learned intelligence missing');
assert(!snap.text.includes('商店正門鐵捲門受損'),'unlearned intelligence leaked into knowledge panel');
assert(!snap.clues&&!snap.deductions,'empty clue/deduction frameworks appeared');
await evaluate(`learnIntelV123('I-C01',{source:'document'});evaluateDeductionsV123();renderMap()`);await sleep(50);
snap=await evaluate(`(()=>({text:document.querySelector('.knowledge-v125')?.innerText||'',clues:!!document.querySelector('.knowledge-clues-v125'),deductions:!!document.querySelector('.knowledge-deductions-v125')}))()`);
assert(snap.clues&&snap.text.includes('維護數值不一致'),'earned clue did not appear');
assert(!snap.text.includes('冷卻系統服務註記'),'unearned clue leaked');
assert(!snap.deductions,'deduction framework appeared before deduction existed');
await evaluate(`learnIntelV123('I-C08',{source:'observation',verified:true});evaluateDeductionsV123();renderMap()`);await sleep(50);
snap=await evaluate(`(()=>({text:document.querySelector('.knowledge-v125')?.innerText||'',deductions:!!document.querySelector('.knowledge-deductions-v125')}))()`);
assert(snap.deductions&&snap.text.includes('系統可能並未完全失效'),'earned deduction did not appear');
assert(!snap.text.includes('需要特定專業人員'),'unearned deduction leaked');
console.log('PASS resident Batch 6 discovery-gated knowledge presentation');ws.close();