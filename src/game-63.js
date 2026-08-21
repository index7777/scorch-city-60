/* v14.2.2 QA — diagnostic uncertainty / physical measurement tools / evidence confidence */
Object.assign(FIELD_TOOL_DEFS_V46,{
 pressureGauge:{label:'壓力表組',kind:'diagnostic',throughput:1.08},
 multimeter:{label:'工業電表',kind:'diagnostic',throughput:1.08},
 tempProbe:{label:'溫度探棒',kind:'diagnostic',throughput:1.06}
});
Object.assign(FIELD_TOOL_MASS_V50,{pressureGauge:2.4,multimeter:1.1,tempProbe:.8});
Object.assign(CRAFT_WORK_V26,{
 pressureGauge:{hours:.75,site:'base',environment:'indoor'},
 multimeter:{hours:.65,site:'base',environment:'indoor'},
 tempProbe:{hours:.50,site:'base',environment:'indoor'}
});
const DIAGNOSTIC_TOOL_DEFS_V63={
 pressureGauge:{label:'壓力表組',cost:{parts:2},desc:'量測冷媒、液壓、泵送與燃油供應壓力。'},
 multimeter:{label:'工業電表',cost:{parts:2,battery:1},desc:'量測電壓、壓降、端子與絕緣異常。'},
 tempProbe:{label:'溫度探棒',cost:{parts:2,battery:1},desc:'量測軸承、端子、冷媒管路與泵體溫度。'}
};
const FAULT_MEASUREMENTS_V63={
 sealLeak:['pressureGauge','tempProbe'],bearingWear:['tempProbe'],refrigerantLoss:['pressureGauge','tempProbe'],terminalOverheat:['multimeter','tempProbe'],insulationAging:['multimeter'],hydraulicLeak:['pressureGauge'],impellerWear:['pressureGauge','tempProbe'],fuelDelivery:['pressureGauge']
};
function ensureDiagnosticToolsV63(){state.diagnosticTools=state.diagnosticTools||{};for(const id of Object.keys(DIAGNOSTIC_TOOL_DEFS_V63))state.diagnosticTools[id]=!!state.diagnosticTools[id];return state.diagnosticTools}
for(const [id,d] of Object.entries(DIAGNOSTIC_TOOL_DEFS_V63))if(!craftDefs.some(x=>x.id===id))craftDefs.push({id,name:d.label,cost:d.cost,cond:()=>!ensureDiagnosticToolsV63()[id],effect:()=>{ensureDiagnosticToolsV63()[id]=true},desc:d.desc});
const _fieldToolOwnedV63=fieldToolOwnedV47;
fieldToolOwnedV47=function(){const out=_fieldToolOwnedV63(),owned=ensureDiagnosticToolsV63();for(const [id,d] of Object.entries(DIAGNOSTIC_TOOL_DEFS_V63))if(owned[id])out.push({id,...FIELD_TOOL_DEFS_V46[id]});return out};
function diagnosticToolAvailableV63(id,place){if(!ensureDiagnosticToolsV63()[id])return false;if(place?.kind==='field')return ensureFieldToolCarryV47().includes(id);return place?.kind==='station'}
function measurementSetV63(place){return Object.keys(DIAGNOSTIC_TOOL_DEFS_V63).filter(id=>diagnosticToolAvailableV63(id,place))}
function ensureDiagnosticEvidenceV63(id){const fs=assetFaultStateV62(id);fs.evidence=fs.evidence||{};fs.diagnosisRuns=Array.isArray(fs.diagnosisRuns)?fs.diagnosisRuns:[];return fs}
function faultEvidenceV63(assetId,faultId){const fs=ensureDiagnosticEvidenceV63(assetId);return fs.evidence[faultId]||{confidence:0,severityMin:0,severityMax:100,runs:0,tools:[]}}
function confidenceLabelV63(c){return c>=.86?'已確認':c>=.68?'高度疑似':c>=.48?'疑似':'線索不足'}
function diagnosisPlanV63(assetId,depth='basic'){
 const place=assetRepairSiteV62(assetId);if(!place)return null;const tools=measurementSetV63(place),chen=chenMaintenanceAvailableV62(place.site),deep=depth==='deep',base=diagnosisHoursV62(assetId,place.site),hours=Math.round(base*(deep?1.85:1)*20)/20;
 return {place,tools,chen,deep,hours}
}
function diagnoseAssetV63(id,depth='basic'){
 const st=state.assets?.[id],plan=diagnosisPlanV63(id,depth);if(!st||!plan)return toast('設備必須在外勤貨艙或已運回中央站才能診斷');if(plan.place.kind==='field'&&!ensureFieldToolCarryV47().includes('toolkit'))return toast('現場診斷需要攜帶遠征工具箱');if(plan.chen&&npcDutyRemainingV41('chen')+1e-6<plan.hours)return toast('陳技師今日剩餘工時不足');
 if(!spendWorldTimeV26(plan.hours,{label:`${plan.deep?'深入量測':'快速檢查'}${assetDefs.find(a=>a.id===id)?.name||id}`}))return;
 const fs=ensureDiagnosticEvidenceV63(id),active=activeAssetFaultsV62(id),toolSet=new Set(plan.tools);let confirmed=0;
 for(const f of active){
  const req=FAULT_MEASUREMENTS_V63[f.id]||[],matched=req.filter(x=>toolSet.has(x)).length,coverage=req.length?matched/req.length:1,old=faultEvidenceV63(id,f.id);
  let gain=.20+(plan.deep ? .16 : 0)+(plan.chen ? .16 : 0)+coverage*.34;
  if(req.length&&!matched)gain-=.10;
  const evidenceCap=req.length?(coverage<=0?(plan.chen ? .76 : .72):coverage<1?(plan.chen ? .90 : .86):.97):.97;
  const confidence=clamp(Math.min(evidenceCap,Math.max(old.confidence,0)+gain),0,.97),spread=Math.max(6,42-confidence*34),center=f.severity;
  fs.evidence[f.id]={confidence,severityMin:clamp(center-spread,0,100),severityMax:clamp(center+spread,0,100),runs:(old.runs||0)+1,tools:[...new Set([...(old.tools||[]),...plan.tools])],lastDay:state.day};
  if(confidence>=.78){if(!fs.diagnosed.includes(f.id))fs.diagnosed.push(f.id);confirmed++}
 }
 fs.diagnosisRuns.push({day:state.day,site:plan.place.site,depth,tools:plan.tools,withChen:plan.chen,hours:plan.hours});fs.lastDiagnosis={day:state.day,site:plan.place.site,hours:plan.hours,withChen:plan.chen,depth,tools:plan.tools};if(plan.chen)useNpcDutyV41('chen',plan.hours,`${plan.deep?'深入量測':'快速檢查'}：${assetDefs.find(a=>a.id===id)?.name||id}`);
 const msg=active.length?`${assetDefs.find(a=>a.id===id)?.name||id}完成${plan.deep?'深入量測':'快速檢查'}：${confirmed} 項故障已達可精準維修信心，其餘仍保留不確定性。`:`${assetDefs.find(a=>a.id===id)?.name||id}目前未發現明確故障模式。`;log(msg,confirmed?'major':'');render();saveGame(false)
}
/* Precision repair requires evidence confidence, not merely one-click diagnosis. */
const _repairAssetFaultV63=repairAssetFaultV62;
repairAssetFaultV62=function(assetId,faultId,kind='station'){const ev=faultEvidenceV63(assetId,faultId);if(ev.confidence<.78)return toast(`診斷信心只有 ${Math.round(ev.confidence*100)}%，需要更多量測才能精準維修`);return _repairAssetFaultV63(assetId,faultId,kind)};
function diagnosticToolSummaryV63(place){const have=measurementSetV63(place);return Object.entries(DIAGNOSTIC_TOOL_DEFS_V63).map(([id,d])=>`${d.label}${have.includes(id)?' 可用':' 不在場'}`).join(' · ')}
assetFaultHtmlV62=function(){
 ensureAssetFaultsV62();const rows=assetDefs.filter(a=>state.assets?.[a.id]?.discovered||state.assets?.[a.id]?.transported).map(a=>{const fs=ensureDiagnosticEvidenceV63(a.id),active=activeAssetFaultsV62(a.id),place=assetRepairSiteV62(a.id),tools=place?diagnosticToolSummaryV63(place):'設備目前不可診斷';let inner='';if(!active.length)inner='<small>目前未偵測到由設備狀況導出的明確故障模式。</small>';else inner=active.map(f=>{const d=ASSET_FAULT_DEFS_V62[f.id],ev=faultEvidenceV63(a.id,f.id),confirmed=ev.confidence>=.78,req=(FAULT_MEASUREMENTS_V63[f.id]||[]).map(id=>DIAGNOSTIC_TOOL_DEFS_V63[id]?.label||id).join(' + ')||'一般檢查';if(ev.confidence<=.01)return `<div class="asset-fault-line unknown"><div><b>未診斷異常</b><small>建議量測：${req}</small></div><b>線索不足</b></div>`;const sev=confirmed?`${f.severity.toFixed(0)}%`:`${ev.severityMin.toFixed(0)}–${ev.severityMax.toFixed(0)}%`,p=place?faultRepairPlanV62(a.id,f.id,place.kind):null,canRepair=confirmed&&p,action=canRepair?(place.kind==='station'?`<button class="mini secondary" data-fault-repair="${a.id}" data-fault-id="${f.id}" data-fault-kind="station">正式修復 · ${p.parts} 零件 / ${p.hours.toFixed(2)}h</button>`:p.d.field?`<button class="mini" data-fault-repair="${a.id}" data-fault-id="${f.id}" data-fault-kind="field" ${faultSpareOkV62(p)?'':'disabled'}>應急處理 · ${p.hours.toFixed(2)}h</button>`:'<span class="fault-return">需返站整修</span>'):'<span class="fault-return">量測不足</span>';return `<div class="asset-fault-line ${confirmed?'confirmed':'uncertain'}"><div><b>${confidenceLabelV63(ev.confidence)} · ${confirmed?d.label:'疑似 '+d.label}</b><small>信心 ${Math.round(ev.confidence*100)}% · 嚴重度 ${sev} · 建議量測：${req}</small></div>${action}</div>`}).join('');const diag=place&&active.length?`<div class="diagnostic-actions"><button class="mini secondary" data-asset-measure="${a.id}" data-depth="basic">快速檢查 · ${diagnosisPlanV63(a.id,'basic').hours.toFixed(2)}h</button><button class="mini" data-asset-measure="${a.id}" data-depth="deep">深入量測 · ${diagnosisPlanV63(a.id,'deep').hours.toFixed(2)}h</button></div>`:'';return `<article class="asset-fault-card ${active.length?'has-fault':''}"><div class="asset-fault-head"><div><span>DIAGNOSTICS</span><h4>${a.name}</h4></div><b>輸出 ${(assetOutputFactorV60(a.id)*100).toFixed(0)}%</b></div><p class="diagnostic-tool-state">${tools}</p>${inner}${diag}</article>`}).join('');return `<section class="asset-fault-panel"><div class="source-load-head"><div><span>FAULT DIAGNOSTICS</span><h3>大型設備故障診斷</h3></div></div><p class="muted">快速檢查只建立初步證據；深入量測、正確儀表與陳技師會提高信心並縮小嚴重度區間。沒有對應量測工具時，信心會封頂在精準維修門檻以下。診斷信心至少 78% 才能精準維修。</p><div class="asset-fault-list">${rows||'<p class="muted">尚未掌握大型設備。</p>'}</div></section>`
};
const _openInventoryV63=openInventory;
openInventory=function(){_openInventoryV63();const host=$('inventoryContent');if(!host)return;host.querySelectorAll('[data-asset-measure]').forEach(b=>b.onclick=()=>diagnoseAssetV63(b.dataset.assetMeasure,b.dataset.depth||'basic'))};
ensureDiagnosticToolsV63();
