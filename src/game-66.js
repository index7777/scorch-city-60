/* v14.2.2 QA — real maintenance isolation / live outage windows / redundancy preview */
function ensureMaintenanceIsolationV66(){
 state.maintenanceIsolation=state.maintenanceIsolation||{schema:1,assets:{},lastWindow:null};
 state.maintenanceIsolation.schema=1;state.maintenanceIsolation.assets=state.maintenanceIsolation.assets||{};return state.maintenanceIsolation
}
function assetMaintenanceIsolatedV66(id){return !!ensureMaintenanceIsolationV66().assets?.[id]?.active}
function installedCriticalAssetV66(id){
 if(id==='generator')return installedAssetIdsV60('generator').includes(id);
 if(id==='inverter')return installedAssetIdsV60('inverter').includes(id);
 if(id==='pump')return installedAssetIdsV60('pump').includes(id);
 if(id==='chiller')return installedAssetIdsV60('chiller').includes(id);
 if(id==='compressorA'||id==='compressorB')return installedAssetIdsV60('compressor').includes(id);
 if(id==='lift')return installedAssetIdsV60('lift').includes(id);
 return false
}
const _assetOutputFactorV66=assetOutputFactorV60;
assetOutputFactorV60=function(id){if(assetMaintenanceIsolatedV66(id))return 0;return _assetOutputFactorV66(id)};
function maintenanceSnapshotV66(){
 const c=centralGridBaseComponentsV34(),safe=centralSafeCapacityV36(),pop=typeof centralOccupantsV36==='function'?centralOccupantsV36():state.base?.population||0,storage=state.base?.storageKWh||0;
 return {safe,pop,baseKW:c.baseKW||0,solarKW:c.solarKW||0,generatorMaxKW:c.generatorMaxKW||0,nonGeneratorKW:c.nonGeneratorKW||0,storageKWh:storage}
}
function maintenanceImpactV66(assetId){
 const before=maintenanceSnapshotV66();if(!installedCriticalAssetV66(assetId))return {online:false,before,after:before,issues:[],severity:'none'};
 const iso=ensureMaintenanceIsolationV66(),old=iso.assets[assetId];iso.assets[assetId]={active:true,preview:true};let after;
 try{after=maintenanceSnapshotV66()}finally{if(old)iso.assets[assetId]=old;else delete iso.assets[assetId]}
 const issues=[];
 if(after.safe<before.safe)issues.push(`中央安全容量 ${before.safe} → ${after.safe} 人`);
 if(after.safe<after.pop)issues.push(`維修期間安全容量低於目前中央站 ${after.pop} 人`);
 const beforeSupply=(before.nonGeneratorKW||0)+(before.generatorMaxKW||0),afterSupply=(after.nonGeneratorKW||0)+(after.generatorMaxKW||0);
 if(afterSupply+1e-6<beforeSupply)issues.push(`可用發電上限 ${beforeSupply.toFixed(1)} → ${afterSupply.toFixed(1)} kW`);
 if(afterSupply<=0&&after.storageKWh<=.01)issues.push('維修期間沒有可用發電來源或中央儲能');
 const severe=after.safe<after.pop||afterSupply<=0&&after.storageKWh<=.01;return {online:true,before,after,issues,severity:severe?'critical':issues.length?'warn':'ok'}
}
function beginMaintenanceIsolationV66(assetId,label,hours){
 const iso=ensureMaintenanceIsolationV66();if(iso.assets[assetId]?.active)return false;iso.assets[assetId]={active:true,label,hours,startDay:state.day,startClock:state.worldClock?.endlessElapsed??state.hoursLeft??0};
 log(`${assetDefs.find(a=>a.id===assetId)?.name||assetId}已隔離停機，維修期間不再提供供電／冷卻輸出。`,'major');return true
}
function endMaintenanceIsolationV66(assetId,completed=true){
 const iso=ensureMaintenanceIsolationV66(),rec=iso.assets[assetId];if(!rec)return;delete iso.assets[assetId];iso.lastWindow={assetId,label:rec.label,hours:rec.hours,day:state.day,completed};log(`${assetDefs.find(a=>a.id===assetId)?.name||assetId}${completed?'完成維修並解除隔離':'維修未完成，已解除隔離'}。`,completed?'good':'')
}
function repairIsolationTextV66(assetId){const impact=maintenanceImpactV66(assetId);if(!impact.online)return '此設備目前未接入中央運轉鏈，維修不造成在線服務停機。';if(!impact.issues.length)return '可隔離維修：目前冗餘可維持既有安全容量與供電上限。';return impact.issues.join(' · ')}

/* Station repairs are now real outage windows. Field repairs remain physically offline cargo work. */
executeRepairStrategyV65=function(assetId,faultId,mode,kind){
 const p=repairStrategyPlanV65(assetId,faultId,mode,kind),issues=repairPlanIssuesV65(p);if(issues.length)return toast(issues[0]);
 const online=kind==='station'&&installedCriticalAssetV66(assetId),impact=online?maintenanceImpactV66(assetId):null;
 if(online&&!beginMaintenanceIsolationV66(assetId,`${p.s.label}：${p.d.label}`,p.hours))return toast('設備已在維修隔離中');
 let spent=false;
 try{spent=spendWorldTimeV26(p.hours,{label:`${p.s.label}：${p.d.label}`})}finally{if(!spent&&online)endMaintenanceIsolationV66(assetId,false)}
 if(!spent)return;
 consumeRepairResourcesV65(p);if(p.withChen)useNpcDutyV41('chen',p.hours,`${p.s.label}：${p.d.label}`);
 const beforeSeverity=p.fault.severity,beforeCondition=assetConditionV60(assetId),remain=mode==='patch'?Math.max(10,beforeSeverity*p.s.severityRemain):0;
 p.fault.severity=clamp(remain,0,100);p.fault.active=false;
 const conditionGain=Math.max(2,Math.min(18,beforeSeverity*p.s.conditionGain));state.assets[assetId].condition=clamp(beforeCondition+conditionGain,0,100);
 p.fault.recurrence={mode,exposure:0,threshold:p.s.recurrenceHours,multiplier:p.s.recurrenceFactor,lastRepairDay:state.day,residualSeverity:p.fault.severity};
 p.fault.repairHistory.push({day:state.day,mode,kind,beforeSeverity,afterSeverity:p.fault.severity,beforeCondition,afterCondition:state.assets[assetId].condition,hours:p.hours,resources:{...p.resources},spares:{...p.spares},toolkitKWh:p.toolkitKWh,toolkitWear:p.toolkitWear,withChen:p.withChen,maintenanceIsolation:online,impact});
 state.assets[assetId].repairLog.push({day:state.day,type:`strategy-${mode}-${kind}`,faultId,beforeSeverity,afterSeverity:p.fault.severity,hours:p.hours,resources:{...p.resources},spares:{...p.spares},toolkitKWh:p.toolkitKWh,maintenanceIsolation:online});
 const fs=assetFaultStateV62(assetId);fs.diagnosed=fs.diagnosed.filter(x=>x!==faultId);if(online)endMaintenanceIsolationV66(assetId,true);
 log(`${assetDefs.find(a=>a.id===assetId)?.name||assetId}：${p.d.label}採用「${p.s.label}」；設備狀況 ${beforeCondition.toFixed(0)}% → ${state.assets[assetId].condition.toFixed(0)}%。${online?'維修窗口內設備已真實停機。':''}`,'good');
 saveGame(false);if(typeof refreshInventoryV64==='function')refreshInventoryV64();else{render();openInventory()}
};

/* Broad station overhaul uses the same isolation semantics. */
const _stationRepairAssetV66=stationRepairAssetV60;
stationRepairAssetV60=function(id){
 const active=typeof activeAssetFaultsV62==='function'?activeAssetFaultsV62(id):[];if(active.length)return _stationRepairAssetV66(id);
 const t=ensureFieldTeamV43(),st=state.assets?.[id];if(t.active)return toast('外勤隊尚未返站，不能進行中央站正式整修');if(!st?.transported)return toast('大型設備必須先運回中央站');const q=assetConditionV60(id);if(q>=99.5)return toast('設備目前不需要正式整修');const r=assetRepairCostV60(id,ASSET_REPAIR_V60.stationTarget,false);if((state.resources.parts||0)<r.parts)return toast(`正式整修需要 ${r.parts} 零件`);
 const online=installedCriticalAssetV66(id);if(online&&!beginMaintenanceIsolationV66(id,'中央站正式整修',r.hours))return toast('設備已在維修隔離中');let spent=false;try{spent=spendWorldTimeV26(r.hours,{label:`正式整修${assetDefs.find(a=>a.id===id)?.name||id}`})}finally{if(!spent&&online)endMaintenanceIsolationV66(id,false)}if(!spent)return;
 state.resources.parts=Math.max(0,state.resources.parts-r.parts);const before=q;st.condition=100;st.repairLog.push({day:state.day,type:'station',before,after:100,parts:r.parts,hours:r.hours,maintenanceIsolation:online});if(online)endMaintenanceIsolationV66(id,true);log(`${assetDefs.find(a=>a.id===id)?.name||id}完成中央站正式整修：${before.toFixed(0)}% → 100%，消耗 ${r.parts} 零件。${online?'維修期間已從運轉鏈隔離。':''}`,'good');render();saveGame(false)
};

const _repairDecisionHtmlV66=repairDecisionHtmlV65;
repairDecisionHtmlV65=function(){let html=_repairDecisionHtmlV66();html=html.replace(/<article class="repair-decision-card">/g,'<article class="repair-decision-card maintenance-window-card">');return html};
const _openInventoryV66=openInventory;
openInventory=function(){
 _openInventoryV66();const host=$('inventoryContent');if(!host)return;
 host.querySelectorAll('[data-repair-strategy]').forEach(b=>{const assetId=b.dataset.repairAsset,kind=b.dataset.repairKind;if(kind!=='station')return;const impact=maintenanceImpactV66(assetId),small=b.querySelector('small');if(small&&impact.online){small.insertAdjacentHTML('beforeend',`<em class="maintenance-impact ${impact.severity}">${repairIsolationTextV66(assetId)}</em>`)}if(impact.severity==='critical')b.classList.add('maintenance-critical')})
};
ensureMaintenanceIsolationV66();
