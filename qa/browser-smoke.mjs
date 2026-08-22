const CDP='http://127.0.0.1:9222';
const APP='http://127.0.0.1:4173/';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function assert(ok,msg){if(!ok)throw new Error(msg)}
async function waitFor(fn,timeout=20000,step=100){const end=Date.now()+timeout;let last;while(Date.now()<end){try{last=await fn();if(last)return last}catch{}await sleep(step)}throw new Error(`timeout: ${String(last||'condition')}`)}

const target=await waitFor(async()=>{const r=await fetch(`${CDP}/json/list`);if(!r.ok)return null;const list=await r.json();return list.find(x=>x.type==='page'&&x.url.startsWith(APP))||list.find(x=>x.type==='page')});
assert(target?.webSocketDebuggerUrl,'no Chrome page target');
const ws=new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true})});
let seq=0;const pending=new Map(),exceptions=[];
ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id&&pending.has(m.id)){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(new Error(m.error.message)):p.resolve(m.result)}else if(m.method==='Runtime.exceptionThrown'){const d=m.params?.exceptionDetails;exceptions.push(d?.exception?.description||d?.text||'Runtime exception')}});
function send(method,params={}){return new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}))})}
async function evaluate(expression){const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw new Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text||'evaluate exception');return r.result?.value}

await send('Runtime.enable');
await waitFor(()=>evaluate(`document.readyState==='complete'&&document.getElementById('demoEntryStatus')?.textContent.includes('Demo 已就緒')`),30000);
await evaluate(`document.getElementById('demoStart').click()`);
await waitFor(()=>evaluate(`window.__SCORCH_ENTRY_ACTIVE===false&&typeof goToV113==='function'&&typeof ensureExplorationV113==='function'`));

const opening=await evaluate(`(()=>{const s=qaStateV84(),m=document.getElementById('map');return {flag:!!s.flags?.hardFogOpeningV112,current:s.explorationV113?.current,known:s.explorationV113?.discovered||[],ids:[...m.querySelectorAll('[data-step-go]')].map(x=>x.dataset.stepGo),text:m.innerText,plannerHidden:document.getElementById('mapPlannerPanel')?.hidden===true,mapToolsHidden:document.querySelector('.map-tools')?.hidden===true};})()`);
assert(opening.flag,'hard-fog opening flag missing');
assert(opening.current==='base','opening exploration position is not shelter');
assert(opening.known.length===1&&opening.known[0]==='base','opening discovered-location state leaked');
assert(opening.ids.includes('homes'),'directly reachable neighbor missing');
assert(!opening.ids.includes('store')&&!opening.ids.includes('school'),'second-layer nodes leaked');
assert(!opening.text.includes('住宅區')&&!opening.text.includes('便利商店')&&!opening.text.includes('社區中心'),'unknown place identity leaked');
assert(opening.plannerHidden&&opening.mapToolsHidden,'legacy route-planning UI is visible');
console.log('PASS B6 hard-fog stepwise exploration shell');

const before=await evaluate(`qaStateV84().hoursLeft`);
await evaluate(`document.querySelector('[data-step-go="homes"]').click()`);
await waitFor(()=>evaluate(`qaStateV84().explorationV113?.current==='homes'`));
const arrived=await evaluate(`(()=>{const s=qaStateV84(),m=document.getElementById('map');return {hours:s.hoursLeft,known:s.explorationV113.discovered||[],ids:[...m.querySelectorAll('[data-step-go]')].map(x=>x.dataset.stepGo),text:m.innerText};})()`);
assert(arrived.known.includes('homes'),'arrival did not unlock destination');
assert(arrived.text.includes('住宅區'),'arrived location name not revealed');
assert(arrived.ids.includes('store')&&arrived.ids.includes('school'),'arrival did not unlock next-layer neighbors');
assert(!arrived.text.includes('便利商店')&&!arrived.text.includes('社區中心'),'new neighbor identity leaked before arrival');
assert(arrived.hours<before,'stepwise travel did not consume time');
console.log('PASS B1/B2 stepwise travel executes and reveals only next layer');

const zero=await evaluate(`(()=>{const s=qaStateV84();return Object.values(s.resources||{}).every(v=>Number(v)===0)&&s.backpack?.capacityKg===50&&s.backpack?.singleItemLimitKg===20&&s.shelterStorage?.capacityKg===200&&s.shelterPower?.outlets===1})()`);
assert(zero,'opening physical limits/resources are inconsistent');
console.log('PASS opening physical inventory constraints');

const broadcast=await evaluate(`document.getElementById('demoHowToPanel')?.textContent||''`);
assert(/Day 1–7/.test(broadcast)&&/Day 30/.test(broadcast)&&/100°C/.test(broadcast),'broadcast disaster schedule missing');
assert(!/Day 60|D60|期限/.test(broadcast),'broadcast leaks a Day 60 deadline');
console.log('PASS broadcast-only disaster rules');

await sleep(150);
if(exceptions.length)throw new Error(`browser runtime exceptions: ${exceptions.join(' | ')}`);
console.log('PASS browser runtime exception check');
ws.close();
