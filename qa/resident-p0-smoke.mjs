const CDP='http://127.0.0.1:9222';
const APP='http://127.0.0.1:4173/';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function assert(ok,msg){if(!ok)throw new Error(msg)}
async function waitFor(fn,timeout=20000,step=100){const end=Date.now()+timeout;while(Date.now()<end){try{const v=await fn();if(v)return v}catch{}await sleep(step)}throw new Error('timeout')}
const targets=await waitFor(async()=>{const r=await fetch(`${CDP}/json/list`);if(!r.ok)return null;const list=await r.json();return list.find(x=>x.type==='page'&&x.url.startsWith(APP))||list.find(x=>x.type==='page')});
assert(targets?.webSocketDebuggerUrl,'no Chrome page target');
const ws=new WebSocket(targets.webSocketDebuggerUrl);
await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true})});
let seq=0;const pending=new Map();
ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id&&pending.has(m.id)){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(new Error(m.error.message)):p.resolve(m.result)}});
function send(method,params={}){return new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}))})}
async function evaluate(expression){const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw new Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text||'evaluate exception');return r.result?.value}
await send('Runtime.enable');
await waitFor(()=>evaluate(`typeof qaStateV84==='function' && window.__SCORCH_ENTRY_ACTIVE===false`),30000);
const result=await evaluate(`(()=>{
 window.state=qaStateV84();for(const d of document.querySelectorAll('dialog[open]'))d.close();
 state.day=1;state.phase='night';state.hoursLeft=8;state.knownCore=false;if(state.base)state.base.core=false;
 state.onboarding.enabled=false;state.onboarding.completed=true;
 state.knowledge=state.knowledge||{};state.knowledge.contacts=[];state.knowledge.heardSettlements=[];
 for(const loc of locations){if(loc.id!=='base'&&state.locations?.[loc.id])state.locations[loc.id].searched=false}
 state.intel={};render();
 const coreBtn=document.getElementById('coreProjectBtn');
 const bottom=[...document.querySelectorAll('.bottom-strip>div')];
 const tutorial=document.getElementById('tutorialDialog');
 const tutorialText=tutorial?.textContent||'';
 const forbiddenTutorial=['修復城市','中央安全區','冷源核心','0/10','10 階','10階','主線'];
 const hud=document.getElementById('residentHud');
 const hudText=hud?.textContent||'';
 const cityTransformationVisible=[...document.querySelectorAll('button,.card,.summary-card')].some(el=>(el.textContent||'').includes('城市轉化')&&!el.classList.contains('resident-hidden')&&getComputedStyle(el).display!=='none');
 let settlementHidden=true,settlementTruthLeak=false;
 const sid=Object.keys(state.settlements||{})[0];
 if(sid){
  const s=state.settlements[sid];
  if(s?.location&&state.locations?.[s.location])state.locations[s.location].searched=false;
  openSettlements();
  const dlg=document.getElementById('settlementDialog');
  const text=dlg?.textContent||'';
  settlementHidden=!dlg?.querySelector('[data-settlement-trade-v79]');
  const truth=[s?.name,mapLoc(s?.location)?.name].filter(Boolean);
  settlementTruthLeak=truth.some(v=>text.includes(v));
  dlg?.close();
 }
 return {
  coreHidden:!!coreBtn&&coreBtn.classList.contains('resident-locked')&&!!bottom[2]?.classList.contains('resident-hidden'),
  tutorialClean:tutorialText.includes('耐熱屋')&&tutorialText.includes('Day 30')&&tutorialText.includes('100°C')&&!forbiddenTutorial.some(x=>tutorialText.includes(x)),
  playerHud:!!hud&&['水分','飽足','體力','健康','體溫'].every(x=>hudText.includes(x)),
  noCityTransformation:!cityTransformationVisible,
  settlementHidden,
  settlementTruthLeak
 }
})()`);
assert(result.coreHidden,'Day 1 cold-core UI is not fully hidden');
assert(result.tutorialClean,'opening tutorial leaked solution/city-manager information');
assert(result.playerHud,'resident player-status HUD is incomplete');
assert(result.noCityTransformation,'city transformation language became visible');
assert(result.settlementHidden,'uncontacted settlement exposed a trade/entry surface');
assert(!result.settlementTruthLeak,'uncontacted settlement leaked true settlement/location identity');
console.log('PASS resident P0 perspective regression');
ws.close();
