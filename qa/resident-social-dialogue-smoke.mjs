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
await waitFor(()=>evaluate(`typeof ensureSocialV122==='function'&&typeof talkV122==='function'&&typeof tradeV122==='function'&&typeof setPartyV122==='function'`),30000);
let snap=await evaluate(`(()=>{const s=qaStateV84();window.state=s;applyZeroResourceOpeningV112(s);ensurePhysicalInventoryV115(s);delete s.coreNpcV121;delete s.socialV122;ensureCoreNpcStateV121(s);ensureSocialV122(s);s.explorationV113={current:'homes',discovered:['base','homes']};s.explorationV118={selected:null,explored:['base'],observed:{base:true,homes:false}};s.coreNpcV121.people['npc-xu-peizhen'].location='homes';renderMap();return {topics:Object.values(DIALOGUE_TOPICS_V122).reduce((n,a)=>n+a.length,0),panel:!!document.querySelector('.social-presence-v122'),legacy:!!document.querySelector('.npc-presence-v121'),text:document.getElementById('map')?.innerText||''};})()`);await sleep(80);
snap=await evaluate(`(()=>({topics:Object.values(DIALOGUE_TOPICS_V122).reduce((n,a)=>n+a.length,0),panel:!!document.querySelector('.social-presence-v122'),legacy:!!document.querySelector('.npc-presence-v121'),text:document.getElementById('map')?.innerText||''}))()`);
assert(snap.topics===120,'Batch 5 should author exactly 120 first-wave dialogue topics');
assert(!snap.panel&&!snap.legacy,'social framework appeared before observed encounter');
assert(!snap.text.includes('許佩真'),'unencountered NPC identity leaked');
await evaluate(`(()=>{state.explorationV118.observed.homes=true;renderMap();return true})()`);await sleep(80);
snap=await evaluate(`(()=>{const p=document.querySelector('.social-presence-v122');return {panel:!!p,legacy:!!document.querySelector('.npc-presence-v121'),text:p?.innerText||'',buttons:p?.querySelectorAll('[data-talk-v122]').length||0,barter:!!p?.querySelector('.barter-v122'),known:state.coreNpcV121.knownIds.slice()};})()`);
assert(snap.panel&&!snap.legacy,'Batch 5 social panel did not replace legacy NPC panel');
assert(snap.known.includes('npc-xu-peizhen')&&snap.text.includes('許佩真'),'observed NPC was not encounter-revealed');
assert(snap.buttons===3,'all dialogue taxonomy was exposed at first encounter');
assert(!snap.barter,'trade inventory framework appeared before player opened exchange');
const t1=await evaluate(`availableTopicsV122('npc-xu-peizhen')[0].id`);const t2=await evaluate(`availableTopicsV122('npc-xu-peizhen')[1].id`);
let talk=await evaluate(`talkV122('npc-xu-peizhen','${t1}')`);assert(talk.ok&&talk.first&&talk.trust===1,'first conversation did not advance relationship');
talk=await evaluate(`talkV122('npc-xu-peizhen','${t2}')`);assert(talk.ok&&talk.first&&talk.trust===2,'second distinct conversation did not reach familiar relationship');
snap=await evaluate(`(()=>({available:availableTopicsV122('npc-xu-peizhen').length,relation:socialNpcV122('npc-xu-peizhen').trust,party:setPartyV122('npc-xu-peizhen',true),companion:npcV121('npc-xu-peizhen').companion}))()`);
assert(snap.available===5,'conversation did not progressively unlock additional topics');
assert(snap.party.ok&&snap.companion,'familiar encountered NPC could not join party');
await evaluate(`setPartyV122('npc-xu-peizhen',false);addItemToBackpackV115(physicalItemV119('item-crackers'));`);
const before=await evaluate(`(()=>({player:state.backpack.items.map(x=>x.catalogId),npc:socialNpcV122('npc-xu-peizhen').inventory.map(x=>x.catalogId),kg:state.backpack.currentKg}))()`);
assert(before.player.includes('item-crackers')&&before.npc.includes('item-energy-bar'),'trade test inventory setup failed');
const result=await evaluate(`tradeV122('npc-xu-peizhen',socialNpcV122('npc-xu-peizhen').inventory.findIndex(x=>x.catalogId==='item-energy-bar'),state.backpack.items.findIndex(x=>x.catalogId==='item-crackers'))`);
assert(result.ok,'valid physical barter failed');
const after=await evaluate(`(()=>({player:state.backpack.items.map(x=>x.catalogId),npc:socialNpcV122('npc-xu-peizhen').inventory.map(x=>x.catalogId),kg:state.backpack.currentKg,trust:socialNpcV122('npc-xu-peizhen').trust}))()`);
assert(after.player.includes('item-energy-bar')&&!after.player.includes('item-crackers'),'barter did not exchange physical backpack items');
assert(after.npc.includes('item-crackers')&&!after.npc.includes('item-energy-bar'),'NPC barter inventory did not conserve exchanged items');
assert(after.trust===3,'successful barter did not affect relationship');
console.log('PASS resident Batch 5 dialogue relationship barter and party joining');ws.close();