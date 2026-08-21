/* v14.2.2 QA — B6 fog of war + X26 quick-search / planned-expedition differentiation */
const PUBLIC_LOOT_V68={
 homes:['water','food'],store:['food','water'],school:['water','food'],clinic:['medicine','water'],hardware:['parts','filters'],warehouse:['water','food'],fire:['fuel','parts'],subway:['parts','battery'],industrial:['parts','coolant'],coldstore:['food','coolant'],research:['battery','data'],solar:['battery','parts'],vent:['parts','battery']
};
function ensureFogV68(){state.flags=state.flags||{};state.flags.fogV68=state.flags.fogV68||{schema:1,firstScoutNotice:false};return state.flags.fogV68}
function locationKnownV68(id){if(id==='base')return true;return !!state.locations?.[id]?.searched||!!state.intel?.[id]}
function directionFromBaseV68(id){const a=mapLoc('base'),b=mapLoc(id);if(!a||!b)return '未知方位';const dx=b.x-a.x,dy=b.y-a.y,ang=Math.atan2(dy,dx)*180/Math.PI;const dirs=['東','東南','南','西南','西','西北','北','東北'];const i=Math.round(((ang+360)%360)/45)%8;return `${dirs[i]}側 · 約 ${Math.max(1,Math.round(Math.hypot(dx,dy)*.04))} km`}
function publicLootKeysV68(id){return PUBLIC_LOOT_V68[id]||[]}
function publicLootLabelV68(id){const keys=publicLootKeysV68(id);return keys.length?keys.map(k=>RES_LABELS[k]||k).join(' · '):'用途待確認'}
function fogLocationLabelV68(id){return locationKnownV68(id)?(mapLoc(id)?.name||id):'? 未知區域'}
function fogLocationDescV68(id){return locationKnownV68(id)?(mapLoc(id)?.desc||''):`只知道這個方向存在可抵達的城市節點。先派人偵察，才能確認名稱、用途與資源標籤。`}

/* Unknown nodes expose only position and a scout action. */
const _openLocationV68=openLocation;
openLocation=function(id){
 if(locationKnownV68(id))return _openLocationV68(id);
 const loc=mapLoc(id);if(!loc)return;
 $('locTitle').textContent='? 未知區域';
 $('locDesc').innerHTML=`<div class="fog-location-v68"><div class="fog-scene-v68">?</div><div><b>${directionFromBaseV68(id)}</b><p>${fogLocationDescV68(id)}</p></div></div>`;
 $('locMeta').innerHTML=`<div class="meta"><span>方位</span>${directionFromBaseV68(id)}</div><div class="meta"><span>名稱</span>未確認</div><div class="meta"><span>資源</span>未確認</div><div class="meta"><span>大型資產</span>未確認</div>`;
 $('locStock').innerHTML='<span class="muted">偵察後才會解鎖地點名稱、用途與可見資源標籤。</span>';
 $('locActions').innerHTML='<button id="scoutUnknownV68">派人偵察 · 0.5h</button>';
 if(!$('locationDialog').open)$('locationDialog').showModal();
 $('scoutUnknownV68').onclick=()=>{$('locationDialog').close();state.mapPlanner.active=true;addItineraryStopV27(id,'scout');toast('已加入偵察行程：完成後才會揭露地點資訊')}
};

/* New unknown stops default to scouting; known locations retain normal search default. */
addItineraryStopV27=function(id,forcedAction=''){
 const it=ensureItineraryV27();if(!mapLoc(id)||id==='base')return;
 const action=forcedAction||(locationKnownV68(id)?'search':'scout');
 it.stops.push({id:`stop_${Date.now()}_${it.stops.length}`,location:id,action});it.status='planning';state.mapPlanner.active=true;state.mapPlanner.target=id;renderMap();saveGame(false)
};
const _itineraryActionsV68=itineraryActionsV27;
itineraryActionsV27=function(id){if(!locationKnownV68(id))return [['scout','偵察未知區域',.5]];return _itineraryActionsV68(id)};

/* Post-process map/planner presentation so world truth never leaks through labels or thumbnails. */
function applyFogPresentationV68(){
 document.querySelectorAll('.node[data-id]').forEach(n=>{const id=n.dataset.id;if(locationKnownV68(id)){n.classList.remove('fog-unknown-v68');return}n.classList.add('fog-unknown-v68');const art=n.querySelector('.node-art'),copy=n.querySelector('.node-copy');if(art){art.style.backgroundImage='none';art.textContent='?'}if(copy)copy.innerHTML=`<b>? 未知區域</b><small>${directionFromBaseV68(id)}</small><small>點擊後只能安排偵察</small>`});
 const it=ensureItineraryV27();document.querySelectorAll('.itinerary-stop').forEach((row,i)=>{const stop=it.stops[i];if(!stop||locationKnownV68(stop.location))return;const b=row.querySelector('.itinerary-stop-main > b');if(b)b.textContent=`? 未知區域 · ${directionFromBaseV68(stop.location)}`});
}
const _renderMapV68=renderMap;
renderMap=function(){const out=_renderMapV68();applyFogPresentationV68();return out};

/* Scout intel reveals identity and public resource labels, but not exact stock or hidden loot. */
const _summarizeRemainingV68=summarizeRemaining;
function scoutSummaryV68(id){return `已確認地點用途；可見資源標籤：${publicLootLabelV68(id)}。實際數量與其他隱藏物資仍需搜索。`}
function normalizeScoutIntelV68(){const it=ensureItineraryV27();for(const stop of it.stops){if(stop.action!=='scout')continue;const rec=state.intel?.[stop.location];if(rec&&rec.source==='行程偵察')rec.summary=scoutSummaryV68(stop.location)}}
const _runItineraryStepV68=runItineraryStepV27;
runItineraryStepV27=function(){const it=ensureItineraryV27(),before=it.index,stop=it.stops[before],wasKnown=stop?locationKnownV68(stop.location):true,out=_runItineraryStepV68();if(stop&&stop.action==='scout'&&!wasKnown&&it.index>before){const rec=state.intel?.[stop.location];if(rec){rec.summary=scoutSummaryV68(stop.location);rec.confidence=82;rec.source='行程偵察'}const f=ensureFogV68();if(!f.firstScoutNotice){f.firstScoutNotice=true;toast(`偵察完成：已確認「${mapLoc(stop.location)?.name||'新地點'}」，搜索與其他操作已解鎖`)}saveGame(false)}normalizeScoutIntelV68();return out};

/* Quick search only recovers resources visibly tagged for that location. Hidden loot stays for full itinerary search. */
function quickSearchGainV68(loc,cap){const rem=state.locations[loc.id].remaining,gain={};let used=0;for(const k of publicLootKeysV68(loc.id)){const av=Math.max(0,+rem[k]||0),w=RES_WEIGHT[k]||1;if(av<=0||cap-used<=.05)continue;const max=Math.floor((cap-used)/w);if(max<=0)continue;const take=Math.min(av,max);if(take<=0)continue;rem[k]-=take;state.resources[k]=(state.resources[k]||0)+take;gain[k]=take;used+=take*w}return {gain,used}}
searchLocation=function(loc){
 if(!locationKnownV68(loc.id))return toast('尚未偵察：先確認地點後才能快速搜索');
 if(!isSafeSearch(loc))return toast(state.day<30?'白晝無法安全搜索':'永晝中缺少主動冷卻');
 const tc=timeCostFor(loc);if(state.day<30&&state.hoursLeft<tc)return toast(`快速搜索需要 ${tc}h，目前只剩 ${state.hoursLeft}h`);
 const cc=state.day>=30?coolingCost(loc):0,fc=travelFuelCost(loc);if(state.gear.vehicle&&state.resources.fuel<fc)return toast('車輛燃料不足');if(state.day>=30&&state.resources.battery<cc)return toast('冷卻與交通電力不足');
 if(state.day<30)state.hoursLeft=Math.max(0,state.hoursLeft-tc);else state.resources.battery=Math.max(0,state.resources.battery-cc);if(state.gear.vehicle)state.resources.fuel=Math.max(0,state.resources.fuel-fc);
 const {gain,used}=quickSearchGainV68(loc,cargoCapacityKg());const rem=state.locations[loc.id].remaining;state.locations[loc.id].searched=true;state.intel[loc.id]={day:state.day,verifiedDay:state.day,summary:`快速搜索已確認標籤資源；其他區域仍可能藏有未回收物資。${_summarizeRemainingV68(rem)}`,source:'快速搜索',confidence:88};tutorialWaterGain(gain);
 log(`${loc.name}快速搜索：${Object.entries(gain).map(([k,v])=>`${RES_LABELS[k]||k}+${v}`).join('、')||'明示資源沒有實質收穫'}｜只搜索「${publicLootLabelV68(loc.id)}」標籤範圍。`,'good');
 toast(`快速搜索完成：${Object.entries(gain).map(([k,v])=>`+${v} ${RES_LABELS[k]||k}`).join(' · ')||'沒有明示資源'}；完整行程可搜索隱藏物資`);$('locationDialog')?.close();render();checkState();saveGame(false)
};

/* Known-location modal explicitly explains quick vs planned search. */
const _openLocationKnownV68=_openLocationV68;
_openLocationV68_placeholder=0;
const _openLocationAfterFogV68=openLocation;
openLocation=function(id){
 if(!locationKnownV68(id))return _openLocationAfterFogV68(id);
 _openLocationKnownV68(id);const loc=mapLoc(id);
 const stock=$('locStock');if(stock)stock.insertAdjacentHTML('afterend',`<div class="search-mode-note-v68"><b>快速搜索</b><span>只回收明示標籤：${publicLootLabelV68(id)}</span><b>完整行程</b><span>可搜索整個地點，包含未標示物資、情報與大型資產線索。</span></div>`);
 if($('searchLoc')){$('searchLoc').textContent=`快速搜索 · ${publicLootLabelV68(id)}`;$('searchLoc').onclick=()=>searchLocation(loc)}
};

/* Tutorial no longer leaks an unknown store name before scouting. */
const _tutorialCopyV68=tutorialCopy;
tutorialCopy=function(){const st=tutorialStage();if(st===1&&!locationKnownV68('store'))return {k:'STEP 1 / 4',title:'先確認附近的補給點',text:'地圖不會直接告訴你每個節點是什麼。先偵察東側約 1 km 的未知區域；確認後再安排補水。',cta:'偵察東側未知區域',target:'store'};return _tutorialCopyV68()};
const _openActionCenterV68=openActionCenter;
openActionCenter=function(prefill=''){if(prefill&&!locationKnownV68(prefill)){state.mapPlanner.active=true;addItineraryStopV27(prefill,'scout');return}return _openActionCenterV68(prefill)};

ensureFogV68();renderMap();