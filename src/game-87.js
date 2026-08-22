// v14.3 resident-perspective redesign, P0 scout-only discovery slice.
// Scouting reveals identity/public tags only. It never grants loot, search rewards, large assets, NPC identity, or settlement counts.
(function(){
 function ensureScoutState(){
  state.knowledge=state.knowledge||{};
  if(!state.knowledge.observedLocations||typeof state.knowledge.observedLocations!=='object')state.knowledge.observedLocations={};
  if(!state.knowledge.scoutedLocations||typeof state.knowledge.scoutedLocations!=='object')state.knowledge.scoutedLocations={};
  state.knowledge.scoutedLocations.base=state.knowledge.scoutedLocations.base||{day:1,method:'起點'};
  state.knowledge.observedLocations.base=state.knowledge.observedLocations.base||{day:1,method:'起點'};
  // Existing full searches are stronger than scouting and migrate forward automatically.
  for(const loc of locations){
   if(loc.id!=='base'&&state.locations?.[loc.id]?.searched&&!state.knowledge.scoutedLocations[loc.id]){
    state.knowledge.scoutedLocations[loc.id]={day:state.day,method:'既有搜索紀錄'};
    state.knowledge.observedLocations[loc.id]=state.knowledge.observedLocations[loc.id]||{day:state.day,method:'既有搜索紀錄'};
   }
  }
 }
 function isScouted(id){ensureScoutState();return id==='base'||!!state.knowledge.scoutedLocations[id]||!!state.locations?.[id]?.searched}
 function addScoutKnowledge(id){
  ensureScoutState();
  const loc=mapLoc(id);if(!loc)return;
  state.knowledge.entries=Array.isArray(state.knowledge.entries)?state.knowledge.entries:[];
  const key=`scout-${id}`;
  const text=`你親自偵察後，把這個地方暫時稱為「${loc.name}」。外觀可辨識的公開特徵：${locationTags(id).slice(0,3).join('、')||'沒有明顯標誌'}。`;
  const row={key,type:'observed',text,source:'你親眼偵察',confidence:100,day:state.day,locationId:id,npcId:null};
  const old=state.knowledge.entries.find(x=>x.key===key);if(old)Object.assign(old,row);else state.knowledge.entries.push(row);
 }
 function canScoutNow(){return state.day>=30||state.phase==='night'}
 function scoutTimeCost(loc){return Math.max(1,Math.min(2,timeCostFor(loc)-1))}
 function performScout(id){
  const loc=mapLoc(id);if(!loc||id==='base'||isScouted(id))return;
  if(!canScoutNow())return toast('白晝高熱下無法進行一般偵察');
  const tc=scoutTimeCost(loc);
  if(state.day<30&&state.hoursLeft<tc)return toast(`偵察至少需要 ${tc} 小時，剩餘時間不足`);
  if(state.day>=30&&!state.gear.coolingPack&&!state.base.core)return toast('永晝中缺少可用的主動冷卻，無法安全偵察');
  if(state.day<30)state.hoursLeft-=tc;
  else{
   const cc=Math.max(1,Math.ceil(coolingCost(loc)*.5));
   if(state.resources.battery<cc)return toast(`偵察需要約 ${cc} kWh 冷卻電力`);
   state.resources.battery-=cc;
  }
  state.knowledge.scoutedLocations[id]={day:state.day,method:'親自偵察'};
  state.knowledge.observedLocations[id]={day:state.day,method:'親自偵察'};
  addScoutKnowledge(id);
  log(`你完成一趟偵察，只確認了「${loc.name}」的身份與外觀線索；沒有搜索物資，也沒有取得大型物件或人物資訊。`,'good');
  document.getElementById('locationDialog')?.close();
  render();saveGame(false);
 }

 const scoutOriginalOpenLocation=openLocation;
 openLocation=function(id){
  ensureScoutState();
  const loc=mapLoc(id);if(!loc)return;
  if(id!=='base'&&!isScouted(id)){
   $('locTitle').textContent='未知區域';
   $('locDesc').innerHTML='<div class="resident-unknown-note"><b>尚未偵察</b><p>從遠處只能辨認建物或道路輪廓。你不知道它的名稱、庫存、人物、人口或是否有大型物件。</p></div>';
   $('locMeta').innerHTML=`<div class="meta"><span>行動</span>偵察</div><div class="meta"><span>預估耗時</span>${scoutTimeCost(loc)} 小時</div><div class="meta"><span>結果</span>只確認地點身份與公開特徵</div>`;
   $('locStock').innerHTML='<div class="resident-unknown-note">偵察不等於搜索，不會取得物資或獎勵。</div>';
   $('locActions').innerHTML='<button id="residentScoutBtn">安排偵察</button><button id="residentScoutCancel" class="secondary">先不去</button>';
   $('locationDialog').showModal();
   $('residentScoutBtn').onclick=()=>performScout(id);
   $('residentScoutCancel').onclick=()=>$('locationDialog').close();
   return;
  }
  if(id!=='base'&&!state.locations[id]?.searched){
   preloadScene(id);
   $('locTitle').textContent=`你稱之為「${loc.name}」的地方`;
   $('locDesc').innerHTML=`<div class="location-hero"><div class="location-scene"><img class="scene-base" src="${locationThumbArt(id)}" alt="" decoding="async"></div><div class="location-hero-copy"><p>你已親自偵察過這裡，但還沒有深入搜索。</p><div class="tag-row">${locationTags(id).slice(0,3).map(t=>`<span class="tag">${t}</span>`).join('')}</div></div></div>`;
   $('locMeta').innerHTML=`<div class="meta"><span>資訊來源</span>親眼偵察</div><div class="meta"><span>可信度</span>已確認</div><div class="meta"><span>搜索耗時</span>${timeCostFor(loc)} 小時</div><div class="meta"><span>單趟載重</span>${cargoCapacityKg()} kg</div>`;
   $('locStock').innerHTML='<div class="resident-unknown-note">庫存數量、人物、人口與大型物件仍未確認；需要快速搜索或完整行程。</div>';
   $('locActions').innerHTML='<button id="searchLoc">快速搜索</button><button id="planLoc" class="secondary">加入完整行程</button>';
   $('locationDialog').showModal();
   $('searchLoc').onclick=()=>searchLocation(loc);
   $('planLoc').onclick=()=>{$('locationDialog').close();openActionCenter(id)};
   return;
  }
  scoutOriginalOpenLocation(id);
  if(id!=='base')$('locTitle').textContent=`你稱之為「${loc.name}」的地方`;
 };

 const scoutOriginalRenderMap=renderMap;
 renderMap=function(){
  ensureScoutState();
  scoutOriginalRenderMap();
  document.querySelectorAll('.node').forEach(node=>{
   const id=node.dataset.id;if(!id||id==='base'||isScouted(id))return;
   const copy=node.querySelector('.node-copy');if(copy){copy.innerHTML='<b>未知區域</b><small>尚未偵察</small>'}
   const art=node.querySelector('.node-art');if(art){art.style.backgroundImage='none';art.classList.add('resident-unknown-art')}
   node.classList.remove('rumor','map-occupied','map-evacuated','map-depleted','map-thinning','cold');
   node.classList.add('resident-unknown-node');
  });
  document.querySelector('.world-map-summary')?.classList.add('resident-hidden');
  // Population glows are world truth and must not be visible before the related location is scouted.
  document.querySelectorAll('.settlement-glow').forEach(el=>el.classList.add('resident-hidden'));
  document.querySelectorAll('.node').forEach(n=>n.onclick=()=>{
   if(state.mapPlanner?.active){state.mapPlanner.target=n.dataset.id;renderMap()}
   else openLocation(n.dataset.id);
  });
 };

 function enforceScoutedActionTargets(){
  const root=document.getElementById('actionCenterContent');if(!root)return;
  root.querySelectorAll('select').forEach(sel=>Array.from(sel.options).forEach(opt=>{
   const loc=mapLoc(opt.value);if(loc&&loc.id!=='base'&&!isScouted(loc.id))opt.remove();
  }));
  root.querySelectorAll('[data-location],[data-target]').forEach(el=>{
   const id=el.dataset.location||el.dataset.target,loc=mapLoc(id);
   if(loc&&loc.id!=='base'&&!isScouted(id))el.classList.add('resident-hidden');
  });
 }
 const action=document.getElementById('actionCenterDialog');
 if(action)new MutationObserver(()=>{if(action.open)setTimeout(enforceScoutedActionTargets,0)}).observe(action,{attributes:true,attributeFilter:['open']});

 const scoutOriginalRender=render;
 render=function(){ensureScoutState();scoutOriginalRender();renderMap();if(action?.open)enforceScoutedActionTargets()};
 setTimeout(()=>{ensureScoutState();renderMap();saveGame(false)},0);
})();