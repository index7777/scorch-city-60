/* v14.2.2 QA — repair decision tree / repair quality / deterministic recurrence */
const REPAIR_STRATEGIES_V65={
 patch:{label:'臨時壓制',field:true,station:true,timeFactor:.58,costFactor:.55,conditionGain:.05,severityRemain:.48,recurrenceHours:18,recurrenceFactor:1.45,minConfidence:.78,desc:'最快、最省料；先壓下症狀以利撤回，但實際運轉後最容易復發。'},
 standard:{label:'標準修復',field:true,station:true,timeFactor:1,costFactor:1,conditionGain:.10,severityRemain:0,recurrenceHours:72,recurrenceFactor:1,minConfidence:.78,desc:'完整處理已確認故障；耗材與工時中等，復發風險正常。'},
 replace:{label:'完整更換',field:false,station:true,timeFactor:1.7,costFactor:1.75,conditionGain:.18,severityRemain:0,recurrenceHours:180,recurrenceFactor:.45,minConfidence:.86,desc:'更換關鍵件並重新調整；只能返站施工，成本高但最能降低復發。'}
};
function ensureRepairDecisionStateV65(){
 ensureAssetFaultsV62();
 for(const a of assetDefs){const fs=state.assets?.[a.id]?.faultState;if(!fs)continue;for(const f of Object.values(fs.faults||{})){f.repairHistory=Array.isArray(f.repairHistory)?f.repairHistory:[];f.recurrence=f.recurrence||null}}
 return state.assets
}
function repairStrategyResourcesV65(assetId,faultId,mode,kind){
 const d=ASSET_FAULT_DEFS_V62[faultId],fault=assetFaultStateV62(assetId)?.faults?.[faultId],s=REPAIR_STRATEGIES_V65[mode];if(!d||!fault||!s)return null;
 if(kind==='field'){
  const spares={};for(const [k,n] of Object.entries(d.spares||{}))spares[k]=Math.max(1,Math.ceil(n*s.costFactor));
  if(mode==='standard'&&fault.severity>=65)spares.repairPack=Math.max(spares.repairPack||0,1);
  return {spares,resources:{}}
 }
 const baseParts=Math.max(1,Math.ceil(d.stationParts*Math.max(.55,fault.severity/55))),resources={parts:Math.max(1,Math.ceil(baseParts*s.costFactor))};
 if(faultId==='refrigerantLoss')resources.coolant=mode==='patch'?1:mode==='standard'?2:4;
 if(faultId==='fuelDelivery'&&mode!=='patch')resources.filters=mode==='replace'?2:1;
 return {spares:{},resources}
}
function repairStrategyPlanV65(assetId,faultId,mode,kind){
 ensureRepairDecisionStateV65();const fault=assetFaultStateV62(assetId)?.faults?.[faultId],d=ASSET_FAULT_DEFS_V62[faultId],s=REPAIR_STRATEGIES_V65[mode],place=assetRepairSiteV62(assetId);if(!fault?.active||!d||!s||!place||place.kind!==kind)return null;
 if(kind==='field'&&(!s.field||!d.field))return null;if(kind==='station'&&!s.station)return null;
 const ev=faultEvidenceV63(assetId,faultId),withChen=chenMaintenanceAvailableV62(place.site),severityFactor=.72+.58*clamp(fault.severity/100,0,1),hours=Math.round(d.baseHours*severityFactor*s.timeFactor*(withChen ? .62 : 1)*20)/20,res=repairStrategyResourcesV65(assetId,faultId,mode,kind),toolkitKWh=kind==='field' ? .18*hours : 0,toolkitWear=kind==='field' ? 1.4*hours : 0;
 return {assetId,faultId,mode,kind,fault,d,s,place,ev,withChen,hours,spares:res?.spares||{},resources:res?.resources||{},toolkitKWh,toolkitWear}
}
function repairResourceTextV65(plan){const rows=[];for(const [k,n] of Object.entries(plan?.spares||{}))rows.push(`${FIELD_SPARE_DEFS_V50[k]?.label||k} ×${n}`);for(const [k,n] of Object.entries(plan?.resources||{}))rows.push(`${RES_LABELS[k]||k} ${n}`);if(plan?.toolkitKWh)rows.push(`工具電 ${plan.toolkitKWh.toFixed(2)} kWh`);return rows.join('、')||'無額外耗材'}
function repairPlanIssuesV65(plan){
 if(!plan)return ['此維修方案目前不可用'];const issues=[];
 if(plan.ev.confidence+1e-6<plan.s.minConfidence)issues.push(`診斷信心 ${Math.round(plan.ev.confidence*100)}%，${plan.s.label}至少需要 ${Math.round(plan.s.minConfidence*100)}%`);
 if(plan.kind==='field'){
  if(!ensureFieldToolCarryV47().includes('toolkit'))issues.push('現場維修需要攜帶遠征工具箱');
  const kit=fieldToolRuntimeV48('toolkit');if((kit?.condition||0)<10)issues.push('遠征工具箱耐久低於 10%');if((kit?.battery?.chargeKWh||0)+1e-6<plan.toolkitKWh)issues.push(`遠征工具電池不足，需要 ${plan.toolkitKWh.toFixed(2)} kWh`);
  const load=fieldSpareLoadV50();for(const [k,n] of Object.entries(plan.spares))if((load[k]||0)<n)issues.push(`缺少${FIELD_SPARE_DEFS_V50[k]?.label||k} ×${n}`)
 }else for(const [k,n] of Object.entries(plan.resources))if((state.resources?.[k]||0)+1e-6<n)issues.push(`${RES_LABELS[k]||k}不足，需要 ${n}`);
 if(plan.withChen&&npcDutyRemainingV41('chen')+1e-6<plan.hours)issues.push(`陳技師只剩 ${npcDutyRemainingV41('chen').toFixed(1)}h，維修需要 ${plan.hours.toFixed(2)}h`);
 return [...new Set(issues)]
}
function consumeRepairResourcesV65(plan){
 if(plan.kind==='field'){
  const load=fieldSpareLoadV50();for(const [k,n] of Object.entries(plan.spares))load[k]=Math.max(0,(load[k]||0)-n);
  const kit=fieldToolRuntimeV48('toolkit');if(kit){kit.battery.chargeKWh=Math.max(0,(kit.battery.chargeKWh||0)-plan.toolkitKWh);kit.condition=clamp((kit.condition??100)-plan.toolkitWear,0,100)}
 }else for(const [k,n] of Object.entries(plan.resources))state.resources[k]=Math.max(0,(state.resources[k]||0)-n)
}
function executeRepairStrategyV65(assetId,faultId,mode,kind){
 const p=repairStrategyPlanV65(assetId,faultId,mode,kind),issues=repairPlanIssuesV65(p);if(issues.length)return toast(issues[0]);
 if(!spendWorldTimeV26(p.hours,{label:`${p.s.label}：${p.d.label}`}))return;
 consumeRepairResourcesV65(p);if(p.withChen)useNpcDutyV41('chen',p.hours,`${p.s.label}：${p.d.label}`);
 const beforeSeverity=p.fault.severity,beforeCondition=assetConditionV60(assetId),remain=mode==='patch'?Math.max(10,beforeSeverity*p.s.severityRemain):0;
 p.fault.severity=clamp(remain,0,100);p.fault.active=false;
 const conditionGain=Math.max(2,Math.min(18,beforeSeverity*p.s.conditionGain));state.assets[assetId].condition=clamp(beforeCondition+conditionGain,0,100);
 p.fault.recurrence={mode,exposure:0,threshold:p.s.recurrenceHours,multiplier:p.s.recurrenceFactor,lastRepairDay:state.day,residualSeverity:p.fault.severity};
 p.fault.repairHistory.push({day:state.day,mode,kind,beforeSeverity,afterSeverity:p.fault.severity,beforeCondition,afterCondition:state.assets[assetId].condition,hours:p.hours,resources:{...p.resources},spares:{...p.spares},toolkitKWh:p.toolkitKWh,toolkitWear:p.toolkitWear,withChen:p.withChen});
 state.assets[assetId].repairLog.push({day:state.day,type:`strategy-${mode}-${kind}`,faultId,beforeSeverity,afterSeverity:p.fault.severity,hours:p.hours,resources:{...p.resources},spares:{...p.spares},toolkitKWh:p.toolkitKWh});
 const fs=assetFaultStateV62(assetId);fs.diagnosed=fs.diagnosed.filter(x=>x!==faultId);
 log(`${assetDefs.find(a=>a.id===assetId)?.name||assetId}：${p.d.label}採用「${p.s.label}」；目前故障已退出活動狀態，設備狀況 ${beforeCondition.toFixed(0)}% → ${state.assets[assetId].condition.toFixed(0)}%。${mode==='patch'?'此處理保留較高復發風險。':''}`,'good');
 saveGame(false);if(typeof refreshInventoryV64==='function')refreshInventoryV64();else{render();openInventory()}
}
/* Existing repair buttons become safe defaults instead of bypassing the decision tree. */
repairAssetFaultV62=function(assetId,faultId,kind='station'){return executeRepairStrategyV65(assetId,faultId,kind==='field'?'patch':'standard',kind)};
function assetOperatingLoadV65(id){
 if(id==='generator')return (state.powerOps?.lastDispatch?.generatorKW||0)>0?1:0;
 if(id==='inverter')return state.gear?.solar&&hasReachedVentV23()?0.55:0;
 if(['compressorA','compressorB','pump','chiller'].includes(id))return (state.base?.ventilation||0)>=2 ? .82 : 0;
 if(id==='lift'&&state.coreProject?.active&&['detach','lift','haul'].includes(coreStage()?.id||''))return .75;
 return 0
}
function tickRepairRecurrenceV65(hours){
 ensureRepairDecisionStateV65();hours=Math.max(0,+hours||0);if(hours<=0)return;
 for(const a of assetDefs){const load=assetOperatingLoadV65(a.id);if(load<=0)continue;const fs=state.assets?.[a.id]?.faultState;if(!fs)continue;for(const f of Object.values(fs.faults||{})){const r=f.recurrence;if(!r||f.active)continue;const conditionStress=1+(100-assetConditionV60(a.id))/85;r.exposure=(r.exposure||0)+hours*load*conditionStress*(r.multiplier||1);if(r.exposure+1e-6<(r.threshold||72))continue;
   f.active=true;f.severity=r.mode==='replace'?Math.max(10,r.residualSeverity||0):r.mode==='standard'?Math.max(18,r.residualSeverity||0):Math.max(28,r.residualSeverity||0);f.source='recurrence';f.createdDay=state.day;r.exposure=0;r.lastRecurrenceDay=state.day;fs.diagnosed=fs.diagnosed.filter(x=>x!==f.id);if(fs.evidence?.[f.id]){fs.evidence[f.id].confidence=Math.min(fs.evidence[f.id].confidence||0,.44);fs.evidence[f.id].severityMin=0;fs.evidence[f.id].severityMax=100}log(`${a.name}再次出現未確認異常；先前「${REPAIR_STRATEGIES_V65[r.mode]?.label||r.mode}」的復發累積已超過門檻，需要重新量測。`,'major')}}
}
const _tickAssetWearV65=tickAssetWearV60;
tickAssetWearV60=function(hours){const out=_tickAssetWearV65(hours);tickRepairRecurrenceV65(hours);return out};
function repairDecisionHtmlV65(){
 ensureRepairDecisionStateV65();const cards=[];
 for(const a of assetDefs){const active=activeAssetFaultsV62(a.id);if(!active.length)continue;const place=assetRepairSiteV62(a.id);if(!place)continue;for(const f of active){const d=ASSET_FAULT_DEFS_V62[f.id],ev=faultEvidenceV63(a.id,f.id);if(ev.confidence<.48)continue;const buttons=Object.entries(REPAIR_STRATEGIES_V65).map(([mode,s])=>{const p=repairStrategyPlanV65(a.id,f.id,mode,place.kind);if(!p)return '';const issues=repairPlanIssuesV65(p),risk=mode==='patch'?'高':mode==='standard'?'中':'低';return `<button class="repair-option ${mode}" data-repair-strategy="${mode}" data-repair-asset="${a.id}" data-repair-fault="${f.id}" data-repair-kind="${place.kind}" ${issues.length?'disabled':''}><b>${s.label}</b><span>${p.hours.toFixed(2)}h · ${repairResourceTextV65(p)}</span><small>復發風險 ${risk} · ${issues[0]||s.desc}</small></button>`}).join('');cards.push(`<article class="repair-decision-card"><div class="asset-fault-head"><div><span>REPAIR DECISION</span><h4>${a.name} · ${d.label}</h4></div><b>信心 ${Math.round(ev.confidence*100)}%</b></div><p class="muted">目前嚴重度 ${f.severity.toFixed(0)}%。維修方式會改變耗材、停機時間、恢復程度與之後的確定性復發門檻。</p><div class="repair-option-grid">${buttons}</div></article>`)}
 return `<section class="repair-decision-panel"><div class="source-load-head"><div><span>MAINTENANCE STRATEGY</span><h3>故障維修決策</h3></div></div><p class="muted">臨時壓制適合外勤撤回；標準修復平衡成本與可靠度；完整更換只能在中央站進行，成本最高但復發累積最慢。復發採實際運轉時數與設備狀況決定，不使用隨機故障。</p><div class="repair-decision-list">${cards.join('')||'<p class="muted">目前沒有已具備足夠診斷證據、且可在所在地處理的活動故障。</p>'}</div></section>`
}
const _openInventoryV65=openInventory;
openInventory=function(){_openInventoryV65();const host=$('inventoryContent');if(!host)return;host.insertAdjacentHTML('beforeend',repairDecisionHtmlV65());host.querySelectorAll('[data-repair-strategy]').forEach(b=>b.onclick=()=>executeRepairStrategyV65(b.dataset.repairAsset,b.dataset.repairFault,b.dataset.repairStrategy,b.dataset.repairKind))};
ensureRepairDecisionStateV65();
