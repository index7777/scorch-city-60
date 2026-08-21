/* v14.2.2 QA — named NPC daily scheduling / finite duty hours / fatigue */
const NPC_SHIFT_TASKS_V41={
 lin:{medical:{label:'醫療值班',service:'medical'},rest:{label:'休整',service:'rest'}},
 chen:{cooling:{label:'主冷卻監控',service:'cooling'},maintenance:{label:'設備維修',service:'maintenance'},rest:{label:'休整',service:'rest'}},
 mei:{research:{label:'研究分析',service:'research'},intel:{label:'情報校核',service:'intel'},rest:{label:'休整',service:'rest'}},
 wu:{dispatch:{label:'物流調度',service:'dispatch'},convoy:{label:'跟車／接駁',service:'convoy'},rest:{label:'休整',service:'rest'}}
};
const NPC_SHIFT_DEFAULT_V41={lin:'medical',chen:'cooling',mei:'research',wu:'dispatch'};
function ensureNpcShiftsV41(){
 ensureNpcServicesV40();
 state.npcShifts=state.npcShifts||{schema:1,day:state.day,people:{}};state.npcShifts.schema=1;state.npcShifts.people=state.npcShifts.people||{};
 for(const id of Object.keys(NPC_SHIFT_TASKS_V41)){
  const p=state.npcShifts.people[id]||(state.npcShifts.people[id]={task:NPC_SHIFT_DEFAULT_V41[id],fatigue:0,workedToday:0,last:null});
  p.fatigue=clamp(+p.fatigue||0,0,100);p.workedToday=Math.max(0,+p.workedToday||0);if(!NPC_SHIFT_TASKS_V41[id][p.task])p.task=NPC_SHIFT_DEFAULT_V41[id]
 }
 if(state.npcShifts.day!==state.day){
  const elapsed=Math.max(1,state.day-(state.npcShifts.day||state.day));
  for(const [id,p] of Object.entries(state.npcShifts.people)){
   if(p.task==='rest')p.fatigue=clamp(p.fatigue-26*elapsed,0,100);else p.fatigue=clamp(p.fatigue-10*elapsed,0,100);
   p.workedToday=0;p.last=null
  }
  state.npcShifts.day=state.day
 }
 return state.npcShifts
}
function npcShiftV41(id){ensureNpcShiftsV41();return state.npcShifts.people[id]}
function npcMaxDutyHoursV41(id){const p=npcShiftV41(id),n=state.npcs?.[id];if(!n?.alive)return 0;const fatiguePenalty=p.fatigue>=80?3:p.fatigue>=60?2:p.fatigue>=35?1:0;return Math.max(3,8-fatiguePenalty)}
function npcDutyRemainingV41(id){const p=npcShiftV41(id);return Math.max(0,npcMaxDutyHoursV41(id)-p.workedToday)}
function npcTaskV41(id){return npcShiftV41(id)?.task||'rest'}
function npcTaskAllowsV41(id,service){const t=npcTaskV41(id);if(id==='lin')return t==='medical'&&service==='medical';if(id==='chen')return (t==='cooling'&&service==='cooling')||(t==='maintenance'&&service==='maintenance');if(id==='mei')return (t==='research'&&service==='research')||(t==='intel'&&service==='intel');if(id==='wu')return (t==='dispatch'&&service==='dispatch')||(t==='convoy'&&service==='convoy');return false}
function npcOnDutyV41(id,service){const n=state.npcs?.[id];return !!(n?.alive&&npcTaskAllowsV41(id,service)&&npcDutyRemainingV41(id)>.001)}
function useNpcDutyV41(id,hours,action=''){
 const p=npcShiftV41(id);hours=Math.max(0,Math.min(+hours||0,npcDutyRemainingV41(id)));if(hours<=0)return 0;p.workedToday+=hours;p.fatigue=clamp(p.fatigue+hours*3.2,0,100);p.last={day:state.day,task:p.task,hours,action};recordNpcServiceV40(id,hours,action);return hours
}
function setNpcShiftV41(id,task){
 const n=state.npcs?.[id],p=npcShiftV41(id);if(!n?.alive||!NPC_SHIFT_TASKS_V41[id]?.[task])return;if(p.workedToday>.001)return toast('此人今日已開始工作，明日才能改排主任務');p.task=task;log(`${n.name}今日主任務調整為：${NPC_SHIFT_TASKS_V41[id][task].label}。`,'good');openInventory();saveGame(false)
}

/* Gate V40 expertise through the daily assignment. Site/location rules from V40 remain intact. */
const _npcExpertAtV41=npcExpertAtV40;
npcExpertAtV40=function(id,site){
 if(!_npcExpertAtV41(id,site))return false;
 if(id==='lin')return npcOnDutyV41(id,'medical');
 if(id==='chen')return npcOnDutyV41(id,'cooling');
 if(id==='mei')return npcOnDutyV41(id,'research')||npcOnDutyV41(id,'intel');
 if(id==='wu')return npcOnDutyV41(id,'dispatch')||npcOnDutyV41(id,'convoy');
 return true
};

/* Services that have distinct assignments must not borrow a different shift type. */
const _linAtMedicalSiteV41=linAtMedicalSiteV39;
linAtMedicalSiteV39=function(id){return _linAtMedicalSiteV41(id)&&npcOnDutyV41('lin','medical')};
const _chenCoolingFactorV41=chenCoolingFactorV40;
chenCoolingFactorV40=function(site){if(!npcOnDutyV41('chen','cooling'))return 1;return _chenCoolingFactorV41(site)};
const _researchThroughputV41=researchThroughputV40;
researchThroughputV40=function(){if(!npcOnDutyV41('mei','research')){const saved=npcShiftV41('mei').task;npcShiftV41('mei').task='rest';const v=_researchThroughputV41();npcShiftV41('mei').task=saved;return v}return _researchThroughputV41()};
const _roadIntelConfidenceV41=roadIntelConfidence;
roadIntelConfidence=function(i){
 if(!npcOnDutyV41('mei','intel')){const saved=npcShiftV41('mei').task;npcShiftV41('mei').task='rest';const v=_roadIntelConfidenceV41(i);npcShiftV41('mei').task=saved;return v}
 return _roadIntelConfidenceV41(i)
};
const _wuLogisticsFactorV41=wuLogisticsFactorV40;
wuLogisticsFactorV40=function(site='vent'){if(!(npcOnDutyV41('wu','dispatch')||npcOnDutyV41('wu','convoy')))return 1;return _wuLogisticsFactorV41(site)};

/* Explicit actions consume that specialist's finite duty time. */
const _doResearchV41=doResearch;
doResearch=function(id){
 const r=researchDefs.find(x=>x.id===id);if(!r)return;const h=researchHoursV40(r),usingMei=npcExpertAtV40('mei','vent')&&npcOnDutyV41('mei','research');if(usingMei&&npcDutyRemainingV41('mei')+1e-6<h)return toast(`美玲今日只剩 ${npcDutyRemainingV41('mei').toFixed(1)}h 可工作，無法完成這項研究`);
 const before=!!state.research[id],res=_doResearchV41(id);if(!before&&state.research[id]&&usingMei)useNpcDutyV41('mei',h,`研究：${r.name}`);return res
};
const _craftV41=craft;
craft=function(id){
 const usingChen=id==='maintain'&&npcExpertAtV40('chen','vent')&&npcOnDutyV41('chen','maintenance'),h=craftWorkV26?.(id)?.hours||0;if(usingChen&&npcDutyRemainingV41('chen')+1e-6<h)return toast(`陳技師今日只剩 ${npcDutyRemainingV41('chen').toFixed(1)}h，無法參與完整維護`);
 const res=_craftV41(id);if(usingChen&&h>0)useNpcDutyV41('chen',h,'中央站預防維護');return res
};

/* Shuttle and supply trips consume Wu's duty only when his assigned logistics service actually reduced handling time. */
const _executeShuttleV41=executeShuttleV37;
executeShuttleV37=function(zoneId,count,direction='out'){
 const p=shuttlePlanV37(zoneId,count,direction),usingWu=!!(p?.ok&&p.logisticsSavedHours>0&&(npcOnDutyV41('wu','dispatch')||npcOnDutyV41('wu','convoy'))),duty=usingWu?Math.max(.25,Math.min(p.time,npcDutyRemainingV41('wu'))):0;if(usingWu&&duty+.001<Math.min(.5,p.time))return toast('吳先生今日剩餘工時不足，請改用一般接駁流程或明日再排');
 const beforePop=state.base.population,res=_executeShuttleV41(zoneId,count,direction);if(usingWu&&state.base.population!==beforePop)useNpcDutyV41('wu',duty,`${SAFE_ZONE_DEFS_V37[zoneId]?.name||zoneId}人口接駁`);return res
};
const _deliverZoneSuppliesV41=deliverZoneSuppliesV38;
deliverZoneSuppliesV38=function(zoneId,kind='standard'){
 const p=zoneSupplyTripV38(zoneId),usingWu=!!(p?.ok&&p.logisticsSavedHours>0&&(npcOnDutyV41('wu','dispatch')||npcOnDutyV41('wu','convoy'))),duty=usingWu?Math.max(.25,Math.min(p.time,npcDutyRemainingV41('wu'))):0;const before=zoneLifeStoreV38(zoneId)?.water||0,res=_deliverZoneSuppliesV41(zoneId,kind);if(usingWu&&(zoneLifeStoreV38(zoneId)?.water||0)!==before)useNpcDutyV41('wu',duty,`${SAFE_ZONE_DEFS_V37[zoneId]?.name||zoneId}補給`);return res
};

/* Continuous medical/cooling shifts consume time as the world clock advances. */
const _processSourceSliceV41=processSourceSliceV34;
processSourceSliceV34=function(sourceId,hours){
 const linActive=sourceId==='centralGrid'&&npcExpertAtV40('lin','vent')&&centralOccupantsV36()>0;
 const chenActive=sourceId==='centralGrid'&&npcExpertAtV40('chen','vent')&&(state.base?.ventilation||0)>0;
 _processSourceSliceV41(sourceId,hours);
 if(sourceId!=='centralGrid'||hours<=0)return;
 if(linActive)useNpcDutyV41('lin',hours,'中央站醫療值班');
 if(chenActive)useNpcDutyV41('chen',hours,'中央站主冷卻監控')
};

function npcShiftHtmlV41(){
 ensureNpcShiftsV41();const rows=Object.keys(NPC_SHIFT_TASKS_V41).map(id=>{const n=state.npcs?.[id],known=n&&npcKnown(n),p=npcShiftV41(id),max=npcMaxDutyHoursV41(id),left=npcDutyRemainingV41(id);if(!known)return `<article class="npc-shift-card inactive"><div><span>SHIFT</span><h4>未知專業人員</h4></div><b>尚未掌握</b><p>取得身份與位置後才能排班。</p></article>`;const opts=Object.entries(NPC_SHIFT_TASKS_V41[id]).map(([k,v])=>`<option value="${k}" ${p.task===k?'selected':''}>${v.label}</option>`).join('');return `<article class="npc-shift-card ${p.fatigue>=70?'strained':'active'}"><div class="npc-shift-head"><div><span>SHIFT</span><h4>${n.name} · ${n.role}</h4></div><b>${left.toFixed(1)} / ${max.toFixed(1)}h 可用</b></div><div class="npc-shift-grid"><label>今日主任務<select data-npc-shift="${id}" ${p.workedToday>.001?'disabled':''}>${opts}</select></label><span>已工作 <b>${p.workedToday.toFixed(1)}h</b></span><span>疲勞 <b>${p.fatigue.toFixed(0)}%</b></span><span>位置 <b>${locationLabelV24?.(npcServiceZoneV40(id))||npcServiceZoneV40(id)||'未知'}</b></span></div><p class="muted">${p.last?`最近：${p.last.action||NPC_SHIFT_TASKS_V41[id][p.task]?.label}。`:'今日尚未開始工作。'}主任務開始後當日鎖定；休整可更快降低疲勞。</p></article>`}).join('');return `<section class="npc-shift-panel"><div class="source-load-head"><div><span>PERSONNEL SCHEDULING</span><h3>專業人員排班</h3></div></div><p class="muted">每人每天只有有限專業工時。主任務互斥：同一人不能同時值班、維修、研究與跟車；高疲勞會縮短次日可用工時。</p><div class="npc-shift-list">${rows}</div></section>`
}
const _openInventoryV41=openInventory;
openInventory=function(){_openInventoryV41();const host=$('inventoryContent');if(!host)return;host.insertAdjacentHTML('beforeend',npcShiftHtmlV41());host.querySelectorAll('[data-npc-shift]').forEach(s=>s.onchange=()=>setNpcShiftV41(s.dataset.npcShift,s.value))};

ensureNpcShiftsV41();
