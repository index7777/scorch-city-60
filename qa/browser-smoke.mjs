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
await waitFor(()=>evaluate(`window.__SCORCH_ENTRY_ACTIVE===false&&typeof goToV113==='function'&&typeof ensureExplorationV113==='function'&&typeof renderMapV118==='function'`));

const opening=await evaluate(`(()=>{const s=qaStateV84(),m=document.getElementById('map');return {flag:!!s.flags?.hardFogOpeningV112,current:s.explorationV113?.current,known:s.explorationV113?.discovered||[],ids:[...m.querySelectorAll('[data-select-v118]')].map(x=>x.dataset.selectV118),text:m.innerText,plannerHidden:document.getElementById('mapPlannerPanel')?.hidden===true,mapToolsHidden:document.querySelector('.map-tools')?.hidden===true};})()`);
assert(opening.flag,'hard-fog opening flag missing');
assert(opening.current==='base','opening exploration position is not shelter');
assert(opening.known.length===1&&opening.known[0]==='base','opening discovered-location state leaked');
assert(opening.ids.includes('homes'),'directly reachable neighbor missing');
assert(!opening.ids.includes('store')&&!opening.ids.includes('school'),'second-layer nodes leaked');
assert(!opening.text.includes('住宅區')&&!opening.text.includes('便利商店')&&!opening.text.includes('社區中心'),'unknown place identity leaked');
assert(opening.plannerHidden&&opening.mapToolsHidden,'legacy route-planning UI is visible');
console.log('PASS B6 hard-fog stepwise exploration shell');

const beforeSelect=await evaluate(`qaStateV84().hoursLeft`);
await evaluate(`document.querySelector('[data-select-v118="homes"]').click()`);
const selected=await evaluate(`(()=>{const s=qaStateV84(),p=document.querySelector('.step-selection-v118');return {hours:s.hoursLeft,current:s.explorationV113?.current,text:p?.innerText||'',hasGo:!!p?.querySelector('[data-go-v118="homes"]')};})()`);
assert(selected.hours===beforeSelect,'selecting a destination consumed time');
assert(selected.current==='base','selecting a destination moved immediately');
assert(selected.hasGo,'travel confirmation control missing');
assert(/預計\s*1h/.test(selected.text),'travel estimate missing');
console.log('PASS B1 destination selection requires confirmation and costs no time');

await evaluate(`document.querySelector('[data-go-v118="homes"]').click()`);
await waitFor(()=>evaluate(`qaStateV84().explorationV113?.current==='homes'`));
const arrived=await evaluate(`(()=>{const s=qaStateV84(),m=document.getElementById('map');return {hours:s.hoursLeft,known:s.explorationV113.discovered||[],ids:[...m.querySelectorAll('[data-select-v118]')].map(x=>x.dataset.selectV118),text:m.innerText,hasExplore:!!m.querySelector('[data-explore-v118]')};})()`);
assert(arrived.known.includes('homes'),'arrival did not unlock destination');
assert(arrived.text.includes('住宅區'),'arrived location name not revealed');
assert(!arrived.ids.includes('store')&&!arrived.ids.includes('school'),'arrival leaked next-layer neighbors before exploration');
assert(arrived.hasExplore,'arrival did not offer explicit exploration');
assert(arrived.hours<beforeSelect,'confirmed travel did not consume time');
console.log('PASS B2 confirmed travel arrives without auto-exploring');

const beforeExplore=arrived.hours;
await evaluate(`document.querySelector('[data-explore-v118]').click()`);
await waitFor(()=>evaluate(`qaStateV84().explorationV118?.explored?.includes('homes')`));
const explored=await evaluate(`(()=>{const s=qaStateV84(),m=document.getElementById('map');return {hours:s.hoursLeft,ids:[...m.querySelectorAll('[data-select-v118]')].map(x=>x.dataset.selectV118),text:m.innerText};})()`);
assert(explored.ids.includes('store')&&explored.ids.includes('school'),'exploration did not reveal local neighboring silhouettes');
assert(!explored.text.includes('便利商店')&&!explored.text.includes('社區中心'),'exploration leaked unknown neighbor identity');
assert(explored.hours<beforeExplore,'exploration did not consume time');
console.log('PASS B3 explicit exploration reveals silhouettes only');

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