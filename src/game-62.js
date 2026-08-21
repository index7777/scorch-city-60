/* v14.2.2 QA — diagnosable large-asset fault modes / targeted repair */
const ASSET_FAULT_DEFS_V62={
 sealLeak:{label:'密封洩漏',outputPenalty:.16,field:true,spares:{sealKit:1},stationParts:2,baseHours:.55,desc:'軸封／法蘭滲漏使壓力與循環效率下降。'},
 bearingWear:{label:'軸承磨耗',outputPenalty:.14,field:false,spares:{repairPack:1},stationParts:3,baseHours:.9,desc:'旋轉件阻力與振動上升，需要拆檢與重新校正。'},
 refrigerantLoss:{label:'冷媒不足',outputPenalty:.22,field:true,spares:{coolantKit:1,sealKit:1},stationParts:2,baseHours:.7,desc:'冷媒量不足，冷卻輸出與高溫穩定度下降。'},
 terminalOverheat:{label:'端子過熱',outputPenalty:.18,field:true,spares:{fuseKit:1},stationParts:2,baseHours:.45,desc:'高電流端子氧化／鬆動，造成壓降與熱點。'},
 insulationAging:{label:'絕緣劣化',outputPenalty:.20,field:false,spares:{fuseKit:1,repairPack:1},stationParts:3,baseHours:.8,desc:'高溫使絕緣性能下降，必須停機檢查與重作端接。'},
 hydraulicLeak:{label:'液壓洩漏',outputPenalty:.24,field:true,spares:{sealKit:1,repairPack:1},stationParts:3,baseHours:.7,desc:'液壓迴路失壓，吊裝／搬運能力下降。'},
 impellerWear:{label:'葉輪／泵體磨耗',outputPenalty:.18,field:false,spares:{repairPack:1,sealKit:1},stationParts:3,baseHours:.85,desc:'泵送效率下降並伴隨振動。'},
 fuelDelivery:{label:'燃油供應異常',outputPenalty:.15,field:true,spares:{repairPack:1},stationParts:2,baseHours:.5,desc:'濾路／接頭阻力使發電機負載能力下降。'}
};
const ASSET_FAULT_SEQUENCE_V62={
 compressorA:['sealLeak','bearingWear','refrigerantLoss'],compressorB:['sealLeak','bearingWear','refrigerantLoss'],
 chiller:['refrigerantLoss','sealLeak','bearingWear'],pump:['sealLeak','impellerWear','bearingWear'],
 generator:['terminalOverheat','fuelDelivery','bearingWear'],inverter:['terminalOverheat','insulationAging'],lift:['hydraulicLeak','bearingWear']
};
const ASSET_FAULT_THRESHOLDS_V62=[84,64,44];
function ensureAssetFaultsV62(){
 ensureAssetConditionV60();
 for(const a of assetDefs){
  const st=state.assets?.[a.id];if(!st)continue;
  st.faultState=st.faultState||{schema:1,watermark:100,faults:{},diagnosed:[],lastDiagnosis:null};
  const fs=st.faultState;fs.schema=1;fs.faults=fs.faults||{};fs.diagnosed=Array.isArray(fs.diagnosed)?fs.diagnosed:[];
  const q=assetConditionV60(a.id),previous=Number.isFinite(+fs.watermark)?+fs.watermark:100,seq=ASSET_FAULT_SEQUENCE_V62[a.id]||[];
  for(let i=0;i<Math.min(seq.length,ASSET_FAULT_THRESHOLDS_V62.length);i++){
   const th=ASSET_FAULT_THRESHOLDS_V62[i],id=seq[i];
   if(q<=th&&previous>th&&!fs.faults[id])fs.faults[id]={id,severity:clamp(18+(th-q)*1.05,18,88),active:true,createdDay:state.day,source:'condition'};
   else if(q<=th&&fs.faults[id]?.active)fs.faults[id].severity=Math.max(fs.faults[id].severity,clamp(18+(th-q)*1.05,18,88));
  }
  fs.watermark=Math.min(previous,q)
 }
 return state.assets
}
function assetFaultStateV62(id){ensureAssetFaultsV62();return state.assets?.[id]?.faultState||null}
function activeAssetFaultsV62(id){const fs=assetFaultStateV62(id);return fs?Object.values(fs.faults).filter(f=>f.active):[]}
function diagnosedAssetFaultsV62(id){const fs=assetFaultStateV62(id),known=new Set(fs?.diagnosed||[]);return activeAssetFaultsV62(id).filter(f=>known.has(f.id))}
function assetFaultOutputFactorV62(id){let f=1;for(const fault of activeAssetFaultsV62(id)){const d=ASSET_FAULT_DEFS_V62[fault.id];if(!d)continue;f*=1-d.outputPenalty*clamp(fault.severity/100,.15,1)}return clamp(f,.25,1)}
const _assetOutputFactorV62=assetOutputFactorV60;
assetOutputFactorV60=function(id){return clamp(_assetOutputFactorV62(id)*assetFaultOutputFactorV62(id),0,1)};

function assetRepairSiteV62(id){const t=ensureFieldTeamV43(),cargo=t.active?ensureDynamicCargoV52():null;if(t.active&&cargo?.assets?.includes(id))return {kind:'field',site:t.current||ensureItineraryV27().current};if(state.assets?.[id]?.transported)return {kind:'station',site:'vent'};return null}
function chenMaintenanceAvailableV62(site){const t=ensureFieldTeamV43();if(t.active)return t.npcIds.includes('chen')&&state.npcs?.chen?.alive&&npcOnDutyV41('chen','maintenance')&&npcDutyRemainingV41('chen')>.01;return state.npcs?.chen?.alive&&npcKnown(state.npcs.chen)&&npcServiceZoneV40('chen')===site&&npcOnDutyV41('chen','maintenance')&&npcDutyRemainingV41('chen')>.01}
function diagnosisHoursV62(id,site){const a=assetDefs.find(x=>x.id===id),base=.32+Math.min(.5,(a?.weight||200)/1200*.45),chen=chenMaintenanceAvailableV62(site);return Math.round(base*(chen?.58:1)*20)/20}
function diagnoseAssetV62(id){
 const st=state.assets?.[id],place=assetRepairSiteV62(id);if(!st||!place)return toast('設備必須在外勤隊伍貨艙或已運回中央站才能診斷');
 const h=diagnosisHoursV62(id,place.site),withChen=chenMaintenanceAvailableV62(place.site);if(withChen&&npcDutyRemainingV41('chen')+1e-6<h)return toast('陳技師今日剩餘工時不足');if(place.kind==='field'&&!ensureFieldToolCarryV47().includes('toolkit'))return toast('現場診斷需要攜帶遠征工具箱');
 if(!spendWorldTimeV26(h,{label:`診斷${assetDefs.find(a=>a.id===id)?.name||id}`}))return;
 const fs=assetFaultStateV62(id);fs.diagnosed=[...new Set([...fs.diagnosed,...activeAssetFaultsV62(id).map(f=>f.id)])];fs.lastDiagnosis={day:state.day,site:place.site,hours:h,withChen};if(withChen)useNpcDutyV41('chen',h,`設備診斷：${assetDefs.find(a=>a.id===id)?.name||id}`);
 log(`${assetDefs.find(a=>a.id===id)?.name||id}完成故障診斷：${fs.diagnosed.length?diagnosedAssetFaultsV62(id).map(f=>ASSET_FAULT_DEFS_V62[f.id]?.label||f.id).join('、'):'未發現明確故障模式'}。`,'major');render();saveGame(false)
}
function faultRepairPlanV62(assetId,faultId,kind){const fault=assetFaultStateV62(assetId)?.faults?.[faultId],d=ASSET_FAULT_DEFS_V62[faultId];if(!fault?.active||!d)return null;const withChen=chenMaintenanceAvailableV62(kind==='field'?(ensureFieldTeamV43().current||ensureItineraryV27().current):'vent'),hours=Math.round(d.baseHours*(.7+.55*fault.severity/100)*(withChen?.62:1)*20)/20;return {fault,d,withChen,hours,spares:{...d.spares},parts:Math.max(1,Math.ceil(d.stationParts*fault.severity/55))}}
function faultSpareOkV62(plan){const load=fieldSpareLoadV50();return Object.entries(plan.spares||{}).every(([k,n])=>(load[k]||0)>=n)}
function faultSpareTextV62(plan){return Object.entries(plan?.spares||{}).map(([k,n])=>`${FIELD_SPARE_DEFS_V50[k]?.label||k} ×${n}`).join('、')}
function repairAssetFaultV62(assetId,faultId,kind='station'){
 const place=assetRepairSiteV62(assetId),fs=assetFaultStateV62(assetId);if(!place||place.kind!==kind)return toast(kind==='field'?'設備不在目前外勤貨艙':'設備尚未返中央站');if(!fs?.diagnosed?.includes(faultId))return toast('必須先完成故障診斷');
 const p=faultRepairPlanV62(assetId,faultId,kind);if(!p)return toast('這項故障已解除');if(kind==='field'&&!p.d.field)return toast('這項故障不能靠現場應急處理，必須返站整修');if(kind==='field'&&!faultSpareOkV62(p))return toast(`缺少現場備件：${faultSpareTextV62(p)}`);if(kind==='station'&&(state.resources.parts||0)<p.parts)return toast(`中央站零件不足，需要 ${p.parts}`);if(p.withChen&&npcDutyRemainingV41('chen')+1e-6<p.hours)return toast('陳技師今日剩餘工時不足');
 if(!spendWorldTimeV26(p.hours,{label:`修復${p.d.label}`}))return;
 if(kind==='field'){const load=fieldSpareLoadV50();for(const [k,n] of Object.entries(p.spares))load[k]=Math.max(0,(load[k]||0)-n)}else state.resources.parts=Math.max(0,(state.resources.parts||0)-p.parts);if(p.withChen)useNpcDutyV41('chen',p.hours,`故障修復：${p.d.label}`);
 const before=p.fault.severity;if(kind==='field'){p.fault.severity=Math.max(0,p.fault.severity-45);if(p.fault.severity<=8)p.fault.active=false}else{p.fault.severity=0;p.fault.active=false}
 const gain=kind==='field'?Math.min(9,Math.max(3,before*.10)):Math.min(16,Math.max(5,before*.16));state.assets[assetId].condition=clamp(assetConditionV60(assetId)+gain,0,100);state.assets[assetId].repairLog.push({day:state.day,type:`fault-${kind}`,faultId,beforeSeverity:before,afterSeverity:p.fault.severity,hours:p.hours,parts:kind==='station'?p.parts:0,spares:kind==='field'?p.spares:null});
 log(`${assetDefs.find(a=>a.id===assetId)?.name||assetId}：${p.d.label}${p.fault.active?'已應急壓制':'已排除'}，設備狀況回升至 ${assetConditionV60(assetId).toFixed(0)}%。`,'good');render();saveGame(false)
}

const _stationRepairAssetV62=stationRepairAssetV60;
stationRepairAssetV60=function(id){const active=activeAssetFaultsV62(id);if(active.length){const known=new Set(assetFaultStateV62(id)?.diagnosed||[]);return toast(active.some(f=>!known.has(f.id))?'設備仍有未診斷異常，先執行診斷':`先排除已診斷故障：${active.map(f=>ASSET_FAULT_DEFS_V62[f.id]?.label||f.id).join('、')}`)}return _stationRepairAssetV62(id)};

function assetFaultHtmlV62(){
 ensureAssetFaultsV62();const rows=assetDefs.filter(a=>state.assets?.[a.id]?.discovered||state.assets?.[a.id]?.transported).map(a=>{const fs=assetFaultStateV62(a.id),active=activeAssetFaultsV62(a.id),known=new Set(fs.diagnosed||[]),place=assetRepairSiteV62(a.id),diag=!!place;let inner='';
  if(!active.length)inner='<small>目前未偵測到由設備狀況導出的明確故障模式。</small>';
  else inner=active.map(f=>{const d=ASSET_FAULT_DEFS_V62[f.id],isKnown=known.has(f.id);if(!isKnown)return `<div class="asset-fault-line unknown"><span>未診斷異常</span><b>需要檢查</b></div>`;const p=place?faultRepairPlanV62(a.id,f.id,place.kind):null,canField=place?.kind==='field'&&d.field,action=place?.kind==='station'?`<button class="mini secondary" data-fault-repair="${a.id}" data-fault-id="${f.id}" data-fault-kind="station">正式修復 · ${p.parts} 零件 / ${p.hours.toFixed(2)}h</button>`:canField?`<button class="mini" data-fault-repair="${a.id}" data-fault-id="${f.id}" data-fault-kind="field" ${faultSpareOkV62(p)?'':'disabled'}>應急處理 · ${p.hours.toFixed(2)}h</button>`:'<span class="fault-return">需返站整修</span>';return `<div class="asset-fault-line"><div><b>${d.label}</b><small>嚴重度 ${f.severity.toFixed(0)}% · ${d.desc}</small></div>${action}</div>`}).join('');
  return `<article class="asset-fault-card ${active.length?'has-fault':''}"><div class="asset-fault-head"><div><span>DIAGNOSTICS</span><h4>${a.name}</h4></div><b>輸出 ${(assetOutputFactorV60(a.id)*100).toFixed(0)}%</b></div>${inner}${diag&&active.some(f=>!known.has(f.id))?`<button class="mini secondary" data-asset-diagnose="${a.id}">執行診斷 · ${diagnosisHoursV62(a.id,place.site).toFixed(2)}h</button>`:''}</article>`
 }).join('');
 return `<section class="asset-fault-panel"><div class="source-load-head"><div><span>FAULT DIAGNOSTICS</span><h3>大型設備故障診斷</h3></div></div><p class="muted">condition 下降只代表整體劣化；診斷後才知道是哪個故障模式。故障會額外降低實際輸出，且不同故障需要不同備件與整修方式。</p><div class="asset-fault-list">${rows||'<p class="muted">尚未掌握大型設備。</p>'}</div></section>`
}
const _openInventoryV62=openInventory;
openInventory=function(){_openInventoryV62();const host=$('inventoryContent');if(!host)return;host.insertAdjacentHTML('beforeend',assetFaultHtmlV62());host.querySelectorAll('[data-asset-diagnose]').forEach(b=>b.onclick=()=>diagnoseAssetV62(b.dataset.assetDiagnose));host.querySelectorAll('[data-fault-repair]').forEach(b=>b.onclick=()=>repairAssetFaultV62(b.dataset.faultRepair,b.dataset.faultId,b.dataset.faultKind))};
ensureAssetFaultsV62();
