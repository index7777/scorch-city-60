/* v14.2.2 QA — X23–X26 early pacing / risk inertia / search cooldown + revisit yield */
function ensurePacingV69(){
 state.searchPacingV69=state.searchPacingV69||{schema:1,locations:{}};
 state.searchPacingV69.schema=1;
 state.searchPacingV69.locations=state.searchPacingV69.locations||{};
 state.flags=state.flags||{};
 state.flags.riskTrendV69=state.flags.riskTrendV69||{display:null,lastDecayDay:null};
 return state.searchPacingV69
}
function searchRecordV69(id){
 const p=ensurePacingV69();
 p.locations[id]=p.locations[id]||{visits:0,quick:0,full:0,lastSearchDay:0};
 return p.locations[id]
}
function searchAvailableV69(id){return (searchRecordV69(id).lastSearchDay||0)<state.day}
function searchVisitLabelV69(id){const r=searchRecordV69(id);return r.visits===0?'首次回收':r.visits===1?'第 2 次回收':`第 ${r.visits+1} 次回收`}
function searchRecoveryFactorV69(id,mode='full'){
 const n=searchRecordV69(id).visits;
 const table=mode==='quick'?[.56,.28,.14,.08]:[.74,.40,.22,.12];
 const revisit=table[Math.min(n,table.length-1)];
 const early=state.day<=3 ? .82 : state.day<=7 ? .90 : state.day<=10 ? .96 : 1;
 return Math.max(.05,Math.min(1,revisit*early))
}
function searchBudgetKgV69(mode='full'){
 if(state.day<=3)return mode==='quick'?10:18;
 if(state.day<=7)return mode==='quick'?12:22;
 if(state.day<=10)return mode==='quick'?14:26;
 return mode==='quick'?18:42
}
function recoveryPoolV69(id,mode='full'){
 const rem=state.locations?.[id]?.remaining||{},keys=mode==='quick'?publicLootKeysV68(id):RES_ORDER;
 const factor=searchRecoveryFactorV69(id,mode),budget=searchBudgetKgV69(mode),pool={};let used=0;
 for(const k of keys){
  const av=Math.max(0,+rem[k]||0),w=RES_WEIGHT[k]||1;
  if(av<=0||used>=budget-.01)continue;
  const byShare=Math.max(1,Math.floor(av*factor)),byBudget=Math.floor((budget-used)/w),take=Math.min(av,byShare,byBudget);
  if(take<=0)continue;pool[k]=take;used+=take*w
 }
 return {pool,factor,budget,kg:used}
}
function markSearchV69(id,mode){const r=searchRecordV69(id);r.visits++;r[mode]=(r[mode]||0)+1;r.lastSearchDay=state.day;saveGame(false);return r}
function quickSearchTimeV69(loc){return Math.max(.5,Math.round(timeCostFor(loc)*.65*20)/20)}

/* One physical search per location per day; duplicate search stops are invalid before departure. */
function searchPlanIssuesV69(){
 const it=ensureItineraryV27(),issues=[],seen=new Set(),start=(it.status==='paused'||it.status==='running')?it.index:0;
 for(let i=start;i<it.stops.length;i++){
  const s=it.stops[i];if(s.action!=='search')continue;const name=mapLoc(s.location)?.name||s.location;
  if(!searchAvailableV69(s.location))issues.push(`${name}今天已搜索過，必須隔夜後才能再次進入搜索`);
  if(seen.has(s.location))issues.push(`${name}在同一天只能安排一次搜索`);
  seen.add(s.location)
 }
 return [...new Set(issues)]
}
const _itineraryActionsV69=itineraryActionsV27;
itineraryActionsV27=function(id){const out=_itineraryActionsV69(id);return searchAvailableV69(id)?out:out.filter(x=>x[0]!=='search')};
const _fieldTeamValidationV69=fieldTeamValidationV43;
fieldTeamValidationV43=function(e){const v=_fieldTeamValidationV69(e),issues=[...v.issues,...searchPlanIssuesV69()];return {...v,ok:issues.length===0,issues:[...new Set(issues)]}};
const _startOrResumeItineraryV69=startOrResumeItineraryV27;
startOrResumeItineraryV27=function(){const issues=searchPlanIssuesV69();if(issues.length)return toast(issues[0]);return _startOrResumeItineraryV69()};
const _runItineraryStepV69=runItineraryStepV27;
runItineraryStepV27=function(){
 const it=ensureItineraryV27(),stop=it.stops[it.index];
 if(it.status==='running'&&stop?.action==='search'&&!searchAvailableV69(stop.location))return pauseItineraryV27(`${mapLoc(stop.location)?.name||stop.location}今天已搜索過；隔夜後才能再次搜索`);
 return _runItineraryStepV69()
};

/* Forecast uses the same reduced recovery pool as actual execution. */
function withRecoveryPoolsV69(fn){
 const it=ensureItineraryV27(),backups=new Map(),seen=new Set();
 try{
  for(const s of it.stops){
   if(s.action!=='search'||backups.has(s.location))continue;
   const rec=state.locations?.[s.location];if(!rec)continue;
   backups.set(s.location,rec.remaining);
   if(!searchAvailableV69(s.location)||seen.has(s.location))rec.remaining={};
   else rec.remaining={...recoveryPoolV69(s.location,'full').pool};
   seen.add(s.location)
  }
  return fn()
 }finally{for(const [id,rem] of backups)state.locations[id].remaining=rem}
}
const _simulateCargoLayoutV69=simulateCargoLayoutV56;
simulateCargoLayoutV56=function(){return withRecoveryPoolsV69(()=>_simulateCargoLayoutV69())};

/* Full itinerary search recovers a bounded share and records revisit depletion. */
const _collectStopLootV69=collectStopLootV27;
collectStopLootV27=function(loc){
 if(!searchAvailableV69(loc.id)){log(`${loc.name}今天已搜索過，沒有再次進入搜索。`,'major');return}
 const original={...state.locations[loc.id].remaining},limited=recoveryPoolV69(loc.id,'full');
 state.locations[loc.id].remaining={...limited.pool};
 let out;
 try{out=_collectStopLootV69(loc)}finally{
  const after=state.locations[loc.id].remaining||{},restored={...original};
  for(const [k,v] of Object.entries(limited.pool)){const taken=Math.max(0,v-(after[k]||0));restored[k]=Math.max(0,(original[k]||0)-taken)}
  state.locations[loc.id].remaining=restored
 }
 markSearchV69(loc.id,'full');
 state.locations[loc.id].searched=true;
 state.intel[loc.id]={day:state.day,verifiedDay:state.day,summary:summarizeRemaining(state.locations[loc.id].remaining),source:'完整行程搜索',confidence:100};
 const r=searchRecordV69(loc.id);
 if(r.visits>1)log(`${loc.name}複訪回收效率下降：本次最多處理約 ${Math.round(limited.factor*100)}% 可見剩餘物資，未回收物資仍留在現場。`,'major');
 syncRiskTrendV69();return out
};

/* Quick search is faster, but only touches public tags and has a tighter recovery budget. */
searchLocation=function(loc){
 if(!locationKnownV68(loc.id))return toast('尚未偵察：先確認地點後才能快速搜索');
 if(!searchAvailableV69(loc.id))return toast(`${loc.name}今天已搜索過；隔夜後才能再次進入`);
 if(!isSafeSearch(loc))return toast(state.day<30?'白晝無法安全搜索':'永晝中缺少主動冷卻');
 const tc=quickSearchTimeV69(loc);if(state.day<30&&state.hoursLeft+1e-6<tc)return toast(`快速搜索需 ${tc}h，目前只剩 ${state.hoursLeft}h`);
 const cc=state.day>=30?coolingCost(loc):0,fc=travelFuelCost(loc);
 if(state.gear.vehicle&&state.resources.fuel<fc)return toast('車輛燃料不足');
 if(state.day>=30&&state.resources.battery<cc)return toast('冷卻與交通電力不足');
 if(state.day<30)state.hoursLeft=Math.max(0,state.hoursLeft-tc);else state.resources.battery=Math.max(0,state.resources.battery-cc);
 if(state.gear.vehicle)state.resources.fuel=Math.max(0,state.resources.fuel-fc);
 const lim=recoveryPoolV69(loc.id,'quick'),gain={};let used=0;
 for(const [k,want] of Object.entries(lim.pool)){
  const w=RES_WEIGHT[k]||1,max=Math.floor((cargoCapacityKg()-used)/w),take=Math.min(want,Math.max(0,max));if(take<=0)continue;
  state.locations[loc.id].remaining[k]=Math.max(0,(state.locations[loc.id].remaining[k]||0)-take);state.resources[k]=(state.resources[k]||0)+take;gain[k]=take;used+=take*w
 }
 markSearchV69(loc.id,'quick');
 state.locations[loc.id].searched=true;
 state.intel[loc.id]={day:state.day,verifiedDay:state.day,summary:`快速搜索已處理「${publicLootLabelV68(loc.id)}」標籤區域；隱藏物資與未檢區域仍需完整行程。`,source:'快速搜索',confidence:88};
 tutorialWaterGain(gain);applySearchSpecialV68(loc,false);syncRiskTrendV69();
 log(`${loc.name}快速搜索：${Object.entries(gain).map(([k,v])=>`${RES_LABELS[k]||k}+${v}`).join('、')||'明示資源沒有實質收穫'}｜${tc}h｜本日此地搜索已結束。`,'good');
 toast(`快速搜索完成：${Object.entries(gain).map(([k,v])=>`+${v} ${RES_LABELS[k]||k}`).join(' · ')||'沒有明示資源'}；明天才能再次搜索`);
 $('locationDialog')?.close();render();checkState();saveGame(false)
};

/* Location/planner UI exposes cooldown and revisit efficiency before commitment. */
const _openLocationV69=openLocation;
openLocation=function(id){
 const out=_openLocationV69(id);if(!locationKnownV68(id))return out;
 const loc=mapLoc(id),ready=searchAvailableV69(id),q=quickSearchTimeV69(loc),note=document.createElement('div');
 note.className=`search-pacing-v69 ${ready?'':'locked'}`;
 note.innerHTML=`<b>${searchVisitLabelV69(id)}</b><span>${ready?`快速搜索 ${q}h · 完整行程回收效率約 ${Math.round(searchRecoveryFactorV69(id,'full')*100)}%`:`今日已搜索 · Day ${state.day+1} 才能再次搜索`}</span><small>複訪不會刷新物資；只是從同一批有限庫存中以更低效率繼續整理。</small>`;
 const actions=$('locActions');if(actions?.parentNode)actions.parentNode.insertBefore(note,actions);
 if($('searchLoc')){$('searchLoc').disabled=!ready;$('searchLoc').title=ready?`快速搜索 ${q}h；只回收明示資源`:`今天已搜索過，Day ${state.day+1} 可再進入`;$('searchLoc').textContent=ready?`快速搜索 · ${q}h · ${publicLootLabelV68(id)}`:'快速搜索 · 明日可再進'}
 return out
};
const _itineraryPlannerHtmlV69=itineraryPlannerHtmlV27;
itineraryPlannerHtmlV27=function(){
 const html=_itineraryPlannerHtmlV69(),issues=searchPlanIssuesV69(),searches=ensureItineraryV27().stops.filter(s=>s.action==='search');
 const info=searches.length?`<div class="search-plan-v69 ${issues.length?'blocked':''}"><b>搜索節奏</b><span>${searches.map(s=>`${mapLoc(s.location)?.name||s.location}：${searchAvailableV69(s.location)?Math.round(searchRecoveryFactorV69(s.location,'full')*100)+'% 回收效率':'今日鎖定'}`).join(' · ')}</span>${issues.length?`<small>${issues.join('；')}</small>`:'<small>同一地點每天只能搜索一次；複訪回收效率會遞減。</small>'}</div>`:'';
 return html.replace('<div class="planner-actions">',info+'<div class="planner-actions">')
};

/* X23: risk rises promptly, but only decays at most one score point per new day. */
const _rawRiskScoreV69=currentRiskScore;
function syncRiskTrendV69(){
 ensurePacingV69();const f=state.flags.riskTrendV69,raw=Math.max(0,_rawRiskScoreV69());
 if(f.display===null||!Number.isFinite(f.display)){f.display=raw;f.lastDecayDay=state.day;return f.display}
 if(raw>f.display){f.display=raw;return f.display}
 if(raw<f.display&&f.lastDecayDay!==state.day){f.display=Math.max(raw,f.display-1);f.lastDecayDay=state.day}
 return f.display
}
currentRiskScore=function(){return syncRiskTrendV69()};

/* X24: Day 1–3 visibly contain a precursor before hard shortages arrive. */
const _chainLevelV69=chainLevel;
chainLevel=function(name){const v=_chainLevelV69(name);return state.day<=3&&name==='water'?Math.max(1,v):v};
function emitEarlyPressureV69(){
 state.flags=state.flags||{};
 if(state.day<=3&&!state.flags.earlyPressureV69){state.flags.earlyPressureV69=true;log('城市短波出現供水前兆：附近避難者開始統計飲水並交換空桶位置。還不是危機，但水的競爭已經開始。','major');saveGame(false)}
}
const _advanceV69=advance;
advance=function(){const out=_advanceV69();syncRiskTrendV69();emitEarlyPressureV69();return out};

ensurePacingV69();syncRiskTrendV69();emitEarlyPressureV69();render();