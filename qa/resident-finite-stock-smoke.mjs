const CDP='http://127.0.0.1:9222',APP='http://127.0.0.1:4173/';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));function assert(ok,msg){if(!ok)throw new Error(msg)}async function waitFor(fn,timeout=20000,step=100){const end=Date.now()+timeout;while(Date.now()<end){try{const v=await fn();if(v)return v}catch{}await sleep(step)}throw new Error('timeout')}
const target=await waitFor(async()=>{const r=await fetch(`${CDP}/json/list`);if(!r.ok)return null;const list=await r.json();return list.find(x=>x.type==='page'&&x.url.startsWith(APP))||list.find(x=>x.type==='page')});assert(target?.webSocketDebuggerUrl,'no Chrome page target');const ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true})});let seq=0;const pending=new Map();ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id&&pending.has(m.id)){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(new Error(m.error.message)):p.resolve(m.result)}});function send(method,params={}){return new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}))})}async function evaluate(expression){const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw new Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text||'evaluate exception');return r.result?.value}
await send('Runtime.enable');await waitFor(()=>evaluate(`typeof enforceNoRespawnV116==='function'&&typeof syncFiniteStockV116==='function'&&document.getElementById('demoStart')&&!document.getElementById('demoStart').disabled`),30000);
await evaluate(`document.getElementById('demoStart').click()`);await waitFor(()=>evaluate(`window.__SCORCH_ENTRY_ACTIVE===false`));
const result=await evaluate(`(()=>{
 state.day=5;state.phase='night';state.locations.store.remaining.water=3;state.locations.store.remaining.food=2;
 const npcId=Object.keys(state.npcs)[0],settlementId=Object.keys(state.settlements)[0],npc=state.npcs[npcId],settlement=state.settlements[settlementId];
 npc.stock.water=5;settlement.water=10;syncFiniteStockV116(state);
 state.locations.store.remaining.water=0;syncFiniteStockV116(state);
 const depleted=state.locations.store.remaining.water===0;
 state.day=6;state.locations.store.remaining.water=3;render();
 const blocked=state.locations.store.remaining.water===0&&finiteStockAuditV116(state).blockedRespawns>=1;
 const beforeTotal=captureFiniteStockV116(state).totals.water;
 settlement.water-=2;npc.stock.water+=2;syncFiniteStockV116(state);
 const afterTransfer=captureFiniteStockV116(state).totals.water;
 const conserved=Math.abs(beforeTotal-afterTransfer)<.001;
 state.day=7;render();
 const transferSurvives=npc.stock.water===7&&settlement.water===8;
 state.locations.store.remaining.food=0;syncFiniteStockV116(state);const saved=JSON.parse(JSON.stringify(state));mergeSave(saved);
 const exhaustedAfterLoad=state.locations.store.remaining.food===0;
 const text=document.body?.innerText||'';
 return {depleted,blocked,conserved,transferSurvives,exhaustedAfterLoad,noMetaLeak:!text.includes('FINITE_KEYS_V116')&&!text.includes('finite stock')};
})()`);
assert(result.depleted,'source did not deplete');assert(result.blocked,'next-day source respawn was not blocked');assert(result.conserved,'holder-to-holder transfer changed total stock');assert(result.transferSurvives,'legitimate transferred stock was clamped');assert(result.exhaustedAfterLoad,'exhausted source respawned after save merge');assert(result.noMetaLeak,'finite-stock implementation leaked into player UI');
console.log('PASS resident finite world stock regression');ws.close();
