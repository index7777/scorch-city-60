// v14.3 resident-perspective redesign, P0 knowledge provenance slice.
// No formal icons are embedded here. Source marks are text-only until generated art assets are added.
(function(){
 const SOURCE={broadcast:'廣播',observed:'親眼',rumor:'傳聞'};
 const BROADCAST_RULES=[
  {key:'broadcast-d1',day:1,text:'Day 1–7：夜晚 8 小時，白晝最高 72°C。'},
  {key:'broadcast-d8',day:1,text:'Day 8–14：夜晚 6 小時，白晝最高 78°C。'},
  {key:'broadcast-d15',day:1,text:'Day 15–21：夜晚 4 小時，白晝最高 84°C。'},
  {key:'broadcast-d22',day:1,text:'Day 22–29：夜晚 2 小時，白晝最高 92°C。'},
  {key:'broadcast-d30',day:1,text:'Day 30 起：夜晚消失，城市進入 100°C 永晝。'},
  {key:'broadcast-d60',day:1,text:'廣播反覆提到 Day 60 是期限，但沒有提供完整解法。'}
 ];

 function ensureKnowledgeLedger(){
  state.knowledge=state.knowledge||{};
  if(!Array.isArray(state.knowledge.entries))state.knowledge.entries=[];
  if(!state.knowledge.observedLocations||typeof state.knowledge.observedLocations!=='object')state.knowledge.observedLocations={base:{day:1,method:'起點'}};
  if(!Array.isArray(state.knowledge.contacts))state.knowledge.contacts=[];
  for(const row of BROADCAST_RULES)addKnowledge({...row,type:'broadcast',source:'世界廣播',confidence:100});
 }

 function confidenceValue(v,fallback=60){
  const n=Number(v);
  if(Number.isFinite(n))return Math.max(0,Math.min(100,Math.round(n<=1?n*100:n)));
  return fallback;
 }

 function addKnowledge(entry){
  if(!state.knowledge)state.knowledge={entries:[]};
  if(!Array.isArray(state.knowledge.entries))state.knowledge.entries=[];
  const normalized={
   key:String(entry.key||`${entry.type||'rumor'}-${Date.now()}-${Math.random()}`),
   type:entry.type==='broadcast'||entry.type==='observed'?'broadcast'===entry.type?'broadcast':'observed':'rumor',
   text:String(entry.text||''),
   source:String(entry.source||'來源不明'),
   confidence:confidenceValue(entry.confidence,entry.type==='observed'||entry.type==='broadcast'?100:60),
   day:Number(entry.day||state.day||1),
   locationId:entry.locationId||null,
   npcId:entry.npcId||null
  };
  const old=state.knowledge.entries.find(x=>x.key===normalized.key);
  if(old){Object.assign(old,normalized);return old}
  state.knowledge.entries.push(normalized);
  if(state.knowledge.entries.length>180)state.knowledge.entries.splice(0,state.knowledge.entries.length-180);
  return normalized;
 }

 function markObservedLocation(id,method='偵察'){
  ensureKnowledgeLedger();
  const loc=locations.find(x=>x.id===id);if(!loc)return;
  if(!state.knowledge.observedLocations[id])state.knowledge.observedLocations[id]={day:state.day,method};
  if(id==='base')return;
  addKnowledge({key:`observed-location-${id}`,type:'observed',source:'你親眼看到',confidence:100,day:state.knowledge.observedLocations[id].day,locationId:id,text:`你把這個地方暫時稱為「${loc.name}」。`});
 }

 function syncObservedWorld(){
  ensureKnowledgeLedger();
  markObservedLocation('base','起點');
  for(const loc of locations){
   if(loc.id==='base')continue;
   if(state.locations?.[loc.id]?.searched)markObservedLocation(loc.id,'親自搜索');
  }
  for(const id of state.knowledge.contacts||[]){
   const npc=state.npcs?.[id];if(!npc)continue;
   addKnowledge({key:`contact-${id}`,type:'observed',source:'你親自接觸',confidence:100,npcId:id,locationId:npc.location,text:`你已經親自接觸過 ${npc.name}。`});
  }
 }

 function syncKnownIntel(){
  ensureKnowledgeLedger();
  for(const [id,rec] of Object.entries(state.intel||{})){
   if(!rec)continue;
   const loc=locations.find(x=>x.id===id);
   const src=rec.source||rec.from||rec.reporter||'他人說法';
   const conf=confidenceValue(rec.confidence??rec.reliability,60);
   addKnowledge({key:`intel-${id}-${String(src)}`,type:'rumor',source:String(src),confidence:conf,day:rec.day||rec.heardDay||state.day,locationId:id,text:loc?`你聽到一則關於「${loc.name}」方向的消息；細節仍需親自確認。`:'你聽到一則尚未能定位的城市消息。'});
  }
 }

 function sourceMark(type){return `<span class="knowledge-source knowledge-source-${type}">${SOURCE[type]||SOURCE.rumor}</span>`}
 function confidenceText(entry){
  if(entry.type==='broadcast')return '公開廣播';
  if(entry.type==='observed')return '已確認';
  const n=confidenceValue(entry.confidence,60);
  return n>=80?`可信度高 · ${n}%`:n>=55?`可信度中 · ${n}%`:`可信度低 · ${n}%`;
 }
 function locationLabel(id){
  if(!id)return '';
  const loc=locations.find(x=>x.id===id);if(!loc)return '';
  const seen=id==='base'||state.knowledge?.observedLocations?.[id]||state.locations?.[id]?.searched;
  return seen?loc.name:'未知區域';
 }

 function renderKnowledgeLedger(){
  ensureKnowledgeLedger();syncObservedWorld();syncKnownIntel();
  const root=document.getElementById('intelContent');if(!root)return;
  const entries=[...state.knowledge.entries].sort((a,b)=>b.day-a.day||({observed:3,rumor:2,broadcast:1}[b.type]-({observed:3,rumor:2,broadcast:1}[a.type])));
  const groups=[
   ['observed','你親眼確認的'],
   ['rumor','你聽到的'],
   ['broadcast','廣播已知']
  ];
  root.innerHTML=`<div class="knowledge-ledger">${groups.map(([type,title])=>{
   const rows=entries.filter(x=>x.type===type);
   return `<section class="knowledge-group"><h3>${title}</h3>${rows.length?rows.map(e=>`<article class="knowledge-row"><div class="knowledge-row-head">${sourceMark(e.type)}<b>${locationLabel(e.locationId)||e.source}</b></div><p>${e.text}</p><div class="knowledge-meta"><span>來源：${e.source}</span><span>${confidenceText(e)}</span><span>Day ${e.day}</span></div></article>`).join(''):'<p class="muted">目前沒有這類資訊。</p>'}</section>`;
  }).join('')}</div>`;
 }

 function enforceUnknownDialog(){
  const d=document.getElementById('locationDialog');if(!d?.open)return;
  const title=document.getElementById('locTitle');if(!title)return;
  const text=title.textContent||'';
  const loc=locations.find(l=>text.includes(l.name));
  if(!loc||loc.id==='base')return;
  const known=!!state.knowledge?.observedLocations?.[loc.id]||!!state.locations?.[loc.id]?.searched;
  if(known){markObservedLocation(loc.id);return}
  title.textContent='未知區域';
  const desc=document.getElementById('locDesc');if(desc)desc.textContent='你還沒有親自偵察這裡。從遠處只能確認有建物或道路輪廓，裡面有什麼仍然未知。';
  const meta=document.getElementById('locMeta');if(meta)meta.innerHTML='<div><span>資訊來源</span><b>尚未偵察</b></div><div><span>可信度</span><b>未知</b></div>';
  const stock=document.getElementById('locStock');if(stock)stock.innerHTML='<div class="resident-unknown-note">物資、人口、人物與大型物件都尚未確認。</div>';
 }

 function watchResidentKnowledgeDialogs(){
  const intel=document.getElementById('intelDialog');
  if(intel&&!intel.dataset.knowledgeLedgerBound){
   intel.dataset.knowledgeLedgerBound='1';
   new MutationObserver(()=>{if(intel.open)setTimeout(renderKnowledgeLedger,0)}).observe(intel,{attributes:true,attributeFilter:['open']});
  }
  const loc=document.getElementById('locationDialog');
  if(loc&&!loc.dataset.knowledgeGuardBound){
   loc.dataset.knowledgeGuardBound='1';
   new MutationObserver(()=>{if(loc.open)setTimeout(enforceUnknownDialog,0)}).observe(loc,{attributes:true,attributeFilter:['open']});
  }
 }

 document.addEventListener('click',e=>{
  const intelBtn=e.target.closest('#cityIntel');
  if(intelBtn)setTimeout(renderKnowledgeLedger,0);
 },true);

 const residentKnowledgeOriginalRender=render;
 render=function(){
  residentKnowledgeOriginalRender();
  ensureKnowledgeLedger();
  syncObservedWorld();
  syncKnownIntel();
  watchResidentKnowledgeDialogs();
  if(document.getElementById('intelDialog')?.open)renderKnowledgeLedger();
  if(document.getElementById('locationDialog')?.open)enforceUnknownDialog();
 };

 setTimeout(()=>{ensureKnowledgeLedger();syncObservedWorld();syncKnownIntel();watchResidentKnowledgeDialogs();if(typeof saveGame==='function')saveGame(false)},0);
})();