function mapPlannerHtml(){
 const mp=state.mapPlanner||{},target=mapLoc(mp.target)||mapLoc('industrial'),fast=computeMapRoute(target.id,'fastest'),safe=computeMapRoute(target.id,'safe'),chosen=mp.routeMode==='safe'?safe:fast;
 const assets=discoveredAssetsAt(target.id),notes=notesAt(target.id);const cold=state.coldStations.includes(target.id)?'冷站節點':pointInCentralCooling(target.id)||pointNearColdStation(target.id)?'位於冷卻覆蓋':'無人工冷卻';
 const row=(name,r,mode)=>r?`<button class="route-option ${mp.routeMode===mode?'selected':''}" data-routemode="${mode}"><span>${name}</span><b>${r.distance} km · 熱 ${routeHeatLabel(r.heat)}</b><small>${state.day>=30?`冷卻 ${r.cooling}kWh · `:''}${state.gear.vehicle?`燃料 ${r.fuel}L · `:''}${r.path.map(id=>mapLoc(id)?.name).join(' → ')}</small></button>`:'';
 return `<div class="planner-head"><div><span>MAP ROUTE</span><b>${target.name}</b></div><button id="closePlanner" class="mini">${mp.active?'收合':'展開'}</button></div>${mp.active?`<div class="planner-route-list">${row('最快路線',fast,'fastest')}${row('低熱路線',safe,'safe')}</div><div class="planner-facts"><span>區域熱負荷 <b>${routeHeatLabel(Math.round(nodeHeatFactor(target.id)*70))}</b></span><span>冷卻狀態 <b>${cold}</b></span><span>已知大型資產 <b>${assets.length}</b></span><span>玩家標記 <b>${notes.length}</b></span><span>路線情報 <b>${chosen?.path?.slice(1).filter((id,i)=>roadIntelState(chosen.path[i],id)).length||0}/${Math.max(0,(chosen?.path?.length||1)-1)}</b></span></div>${assets.length?`<div class="planner-assets">${assets.map(a=>`<span>◆ ${a.name} ${a.weight}kg</span>`).join('')}</div>`:''}<div class="planner-actions"><button id="plannerExpedition">套用至遠征</button><button id="plannerLocation" class="secondary">查看地點</button></div>`:'<p class="muted">展開後點選城市節點即可比較路線。</p>'}`;
}
function bindMapPlanner(){
 if($('routePlanBtn'))$('routePlanBtn').onclick=()=>{state.mapPlanner.active=!state.mapPlanner.active;renderMap();toast(state.mapPlanner.active?'路線規劃已開啟：點地圖節點選擇目的地':'路線規劃已收合：點地圖節點可查看地點')};
 document.querySelectorAll('[data-mapfilter]').forEach(b=>{b.classList.toggle('active',(state.mapPlanner.filter||'all')===b.dataset.mapfilter);b.onclick=()=>{state.mapPlanner.filter=b.dataset.mapfilter;renderMap()}});
 document.querySelectorAll('[data-routemode]').forEach(b=>b.onclick=()=>{state.mapPlanner.routeMode=b.dataset.routemode;renderMap()});
 if($('closePlanner'))$('closePlanner').onclick=()=>{state.mapPlanner.active=!state.mapPlanner.active;renderMap()};
 if($('plannerExpedition'))$('plannerExpedition').onclick=()=>openActionCenter(state.mapPlanner.target);
 if($('plannerLocation'))$('plannerLocation').onclick=()=>openLocation(state.mapPlanner.target);
}
function renderMap(){
 const nodes=locations.map(l=>{
  const rem=Object.values(state.locations[l.id].remaining).reduce((a,b)=>a+(typeof b==='number'?b:0),0),ratio=resourceRatio(l.id);
  let cls=l.base?'base':isSafeSearch(l)?'safe':'danger';sceneVisualStates(l.id).forEach(s=>cls+=' state-'+s);if(state.coldStations.includes(l.id))cls+=' cold';if(state.intel[l.id]&&!state.locations[l.id].searched)cls+=' rumor';if(isOccupiedMap(l.id))cls+=' map-occupied';if(isEvacuatedMap(l.id))cls+=' map-evacuated';if(ratio<.2)cls+=' map-depleted';else if(ratio<.5)cls+=' map-thinning';if(!mapFilterPass(l.id))cls+=' map-filtered';if(state.mapPlanner?.active&&state.mapPlanner.target===l.id)cls+=' route-target';
  const npc=Object.values(state.npcs).find(n=>n.alive&&n.location===l.id),pop=districtPopulationAt(l.id);
  let detail=state.locations[l.id].searched?(rem?`已確認剩餘：約 ${Math.floor(rem)}`:'已確認物資稀少'):(state.intel[l.id]?`情報：${state.intel[l.id].summary}`:'尚未掌握庫存');
  const history=districtHistoryTags(l.id).slice(0,1)[0],assets=discoveredAssetsAt(l.id),notes=notesAt(l.id);
  return `<button class="node ${cls} ${rem===0&&!l.special?'cleared':''}" data-id="${l.id}" style="left:${l.x}%;top:${l.y}%;transform:translate(-50%,-50%);--loot:${ratio.toFixed(2)}"><span class="node-art" style="background-image:url('${locationThumbArt(l.id)}')"></span><span class="node-copy"><b>${l.name}</b><small>${detail}</small>${pop?`<small class="world-pop">◉ ${pop} 人活動</small>`:''}${npc?`<small class="npc-pin">● ${npc.name} · ${npc.role}</small>`:''}${state.coldStations.includes(l.id)?'<small class="npc-pin">❄ 冷站運作中</small>':''}${assets.length?`<small class="asset-pin">◆ 大型資產 ${assets.length}</small>`:''}${history?`<small class="history-pin">▣ ${history}</small>`:''}${notes.length?`<small class="note-pin">✎ ${notes.length} 個標記</small>`:''}</span></button>`
 }).join('');
 $('map').innerHTML=`<div class="world-transform-layer">${routeSvg()}${mapHalos()}</div>${nodes}<div class="world-map-summary"><b>城市轉化</b><span>${worldTransformationSummary()}</span><em>${state.day>=30?`中央冷卻覆蓋 ${Math.round(coolingReach())}%`:'自然夜間仍是主要安全窗口'}</em></div>`;
 if($('mapPlannerPanel'))$('mapPlannerPanel').innerHTML=mapPlannerHtml();
 document.querySelectorAll('.node').forEach(n=>n.onclick=()=>{if(state.mapPlanner?.active){state.mapPlanner.target=n.dataset.id;renderMap()}else openLocation(n.dataset.id)});
 bindMapPlanner();
}

function renderPersonnel(){
 if(!$('personnelStrip'))return;
 const order=['chen','lin','wu','mei'];
 $('personnelStrip').innerHTML=order.map(id=>{
   const n=state.npcs[id],loc=locations.find(l=>l.id===n.location)?.name||'未知';
   const trust=n.trust>=6?'可靠':n.trust>=2?'合作':n.trust<=-4?'戒備':'中立';
   return `<button class="person-card ${n.alive?'':'dead'}" data-person="${id}">
      <img src="${PORTRAIT_ART[id]}" alt="${n.name}" loading="lazy">
      <span class="person-copy"><b>${n.name}</b><small>${n.role}｜${trust}</small><small>${n.alive?loc:'死亡'}</small></span>
   </button>`;
 }).join('');
 document.querySelectorAll('[data-person]').forEach(b=>b.onclick=()=>openTrade(b.dataset.person));
}

function renderLog(){$('log').innerHTML=state.log.slice().reverse().map(e=>`<div class="log-entry ${e.type}">Day ${e.day}｜${e.msg}</div>`).join('')}
function renderSummary(){let msg=[`風險 ${riskLabel()}｜${phaseBand().name}`];if(daysOfWater()<3)msg.push('飲水不足');if(state.day>=30&&!state.gear.coolingPack&&!state.base.core)msg.push('沒有主動冷卻');if(overCapacity()>0)msg.push(`中央站超載 ${overCapacity()} 人`);if(state.day>=30&&state.base.ventilation>0&&state.base.condition<55)msg.push('中央站設備狀況惡化');if(state.coldStations.length===0&&state.day>=35)msg.push('尚未建立外部冷站');if(state.pendingRequests.length)msg.push(`${state.pendingRequests.length} 筆遷入申請`);if(state.day>=50&&!state.base.core)msg.push(`核心工程 ${state.coreProject.stage}/10`);$('eventSummary').innerHTML=msg.length?`目前壓力：<b>${msg.join('、')}</b>`:'目前沒有立即性危機。'}
function stockChips(obj){return Object.entries(obj).filter(([,v])=>v>0).map(([k,v])=>`<span class="chip">${RES_LABELS[k]||k} ${Math.floor(v)}</span>`).join('')||'<span class="muted">已知物資很少</span>'}

