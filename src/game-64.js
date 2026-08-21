/* v14.2.2 QA — diagnostic instrument battery / calibration / accuracy drift */
const DIAGNOSTIC_RUNTIME_DEFS_V64={
 pressureGauge:{label:'壓力表組',capacityKWh:.18,startKWh:.14,basicKWh:.010,deepKWh:.022,calHours:.30,cellTopupKWh:.08},
 multimeter:{label:'工業電表',capacityKWh:.14,startKWh:.11,basicKWh:.008,deepKWh:.018,calHours:.25,cellTopupKWh:.07},
 tempProbe:{label:'溫度探棒',capacityKWh:.10,startKWh:.08,basicKWh:.006,deepKWh:.014,calHours:.20,cellTopupKWh:.05}
};
function ensureDiagnosticRuntimeV64(){
 ensureDiagnosticToolsV63();state.diagnosticRuntime=state.diagnosticRuntime||{schema:1,tools:{}};state.diagnosticRuntime.schema=1;state.diagnosticRuntime.tools=state.diagnosticRuntime.tools||{};
 for(const [id,d] of Object.entries(DIAGNOSTIC_RUNTIME_DEFS_V64)){
  if(!state.diagnosticTools?.[id])continue;const r=state.diagnosticRuntime.tools[id]||(state.diagnosticRuntime.tools[id]={batteryKWh:d.startKWh,calibration:96,lastCalDay:state.day,condition:100,uses:0});
  r.batteryKWh=clamp(Number.isFinite(+r.batteryKWh)?+r.batteryKWh:d.startKWh,0,d.capacityKWh);r.calibration=clamp(Number.isFinite(+r.calibration)?+r.calibration:96,0,100);r.condition=clamp(Number.isFinite(+r.condition)?+r.condition:100,0,100);r.uses=Math.max(0,Math.floor(+r.uses||0));if(!Number.isFinite(+r.lastCalDay))r.lastCalDay=state.day
 }
 return state.diagnosticRuntime
}
function diagnosticRuntimeV64(id){return ensureDiagnosticRuntimeV64().tools[id]||null}
function diagnosticCalibrationV64(id){const r=diagnosticRuntimeV64(id);if(!r)return 0;const age=Math.max(0,state.day-(r.lastCalDay||state.day));return clamp(r.calibration-age*.65,0,100)}
function diagnosticBatteryPctV64(id){const r=diagnosticRuntimeV64(id),d=DIAGNOSTIC_RUNTIME_DEFS_V64[id];return r&&d?clamp(r.batteryKWh/Math.max(.001,d.capacityKWh)*100,0,100):0}
function diagnosticAccuracyV64(id){const r=diagnosticRuntimeV64(id);if(!r)return 0;const cal=diagnosticCalibrationV64(id)/100,batt=diagnosticBatteryPctV64(id)/100,cond=(r.condition??100)/100,battFactor=batt>=.35 ? 1 : batt>=.15 ? .84 : batt>=.05 ? .62 : .25;return clamp(cal*battFactor*(.72+.28*cond),.12,1)}
function diagnosticAccuracyLabelV64(q){return q>=.92?'校準良好':q>=.78?'可用':q>=.58?'偏差偏大':'不可靠'}
const _diagnosticToolAvailableV64=diagnosticToolAvailableV63;
diagnosticToolAvailableV63=function(id,place){if(!_diagnosticToolAvailableV64(id,place))return false;const r=diagnosticRuntimeV64(id),d=DIAGNOSTIC_RUNTIME_DEFS_V64[id];return !!(r&&d&&r.condition>=20&&r.batteryKWh>=Math.min(d.basicKWh,.004))};
function diagnosticMeasurementQualityV64(id,depth='basic'){const r=diagnosticRuntimeV64(id),d=DIAGNOSTIC_RUNTIME_DEFS_V64[id];if(!r||!d)return 0;const need=depth==='deep'?d.deepKWh:d.basicKWh,energy=clamp(r.batteryKWh/Math.max(.001,need),0,1);return clamp(diagnosticAccuracyV64(id)*(.72+.28*energy),0,1)}
function consumeDiagnosticRunV64(toolIds,depth='basic'){
 for(const id of toolIds){const r=diagnosticRuntimeV64(id),d=DIAGNOSTIC_RUNTIME_DEFS_V64[id];if(!r||!d)continue;const use=depth==='deep'?d.deepKWh:d.basicKWh;r.batteryKWh=Math.max(0,r.batteryKWh-use);r.calibration=clamp(r.calibration-(depth==='deep'?2.8:1.25),0,100);r.condition=clamp(r.condition-(depth==='deep' ? .18 : .08),0,100);r.uses++}
}
function refreshInventoryV64(){const dlg=$('inventoryDialog');if(dlg?.open)dlg.close();openInventory()}
function refillDiagnosticBatteryV64(id){
 const t=ensureFieldTeamV43(),r=diagnosticRuntimeV64(id),d=DIAGNOSTIC_RUNTIME_DEFS_V64[id];if(!r||!d)return toast('尚未擁有這件量測儀表');if(t.active)return toast('外勤進行中，不能更換儀表電池');const room=Math.max(0,d.capacityKWh-r.batteryKWh);if(room<.002)return toast('儀表電池已充足');const move=Math.min(room,d.cellTopupKWh,state.resources?.battery||0);if(move<=.001)return toast('中央庫存沒有可用電池電量');state.resources.battery=Math.max(0,(state.resources.battery||0)-move);r.batteryKWh=Math.min(d.capacityKWh,r.batteryKWh+move);log(`${d.label}更換／補充儀表電池 ${move.toFixed(2)} kWh。`,'good');saveGame(false);refreshInventoryV64()
}
function calibrationSiteV64(){const t=ensureFieldTeamV43();if(t.active)return null;const site=fieldTeamHomeV43();return ['base','vent'].includes(site)?site:null}
function calibrationPlanV64(id){const d=DIAGNOSTIC_RUNTIME_DEFS_V64[id],site=calibrationSiteV64();if(!d||!site)return null;const chen=chenMaintenanceAvailableV62(site),hours=Math.round(d.calHours*(chen ? .65 : 1)*20)/20;return {site,chen,hours}}
function calibrateDiagnosticToolV64(id){
 const r=diagnosticRuntimeV64(id),d=DIAGNOSTIC_RUNTIME_DEFS_V64[id],p=calibrationPlanV64(id);if(!r||!d)return toast('尚未擁有這件量測儀表');if(!p)return toast('必須回到耐熱屋或中央通風站的已知參考點才能校準');if(p.chen&&npcDutyRemainingV41('chen')+1e-6<p.hours)return toast('陳技師今日剩餘工時不足');if(!spendWorldTimeV26(p.hours,{label:`校準${d.label}`}))return;const before=diagnosticCalibrationV64(id);r.calibration=100;r.lastCalDay=state.day;r.condition=Math.min(100,r.condition+.8);if(p.chen)useNpcDutyV41('chen',p.hours,`量測儀表校準：${d.label}`);log(`${d.label}完成參考點校準：${before.toFixed(0)}% → 100%。`,'good');saveGame(false);refreshInventoryV64()
}

/* Replace V63 evidence gain with quality-weighted measurements. */
diagnoseAssetV63=function(id,depth='basic'){
 const st=state.assets?.[id],plan=diagnosisPlanV63(id,depth);if(!st||!plan)return toast('設備必須在外勤貨艙或已運回中央站才能診斷');if(plan.place.kind==='field'&&!ensureFieldToolCarryV47().includes('toolkit'))return toast('現場診斷需要攜帶遠征工具箱');if(plan.chen&&npcDutyRemainingV41('chen')+1e-6<plan.hours)return toast('陳技師今日剩餘工時不足');
 const toolQual=Object.fromEntries(plan.tools.map(t=>[t,diagnosticMeasurementQualityV64(t,depth)]));if(!spendWorldTimeV26(plan.hours,{label:`${plan.deep?'深入量測':'快速檢查'}${assetDefs.find(a=>a.id===id)?.name||id}`}))return;
 const fs=ensureDiagnosticEvidenceV63(id),active=activeAssetFaultsV62(id);let confirmed=0;
 for(const f of active){
  const req=FAULT_MEASUREMENTS_V63[f.id]||[],qualities=req.map(x=>toolQual[x]||0),coverage=req.length?qualities.reduce((a,b)=>a+b,0)/req.length:1,matched=qualities.filter(x=>x>0).length,old=faultEvidenceV63(id,f.id);
  let gain=.16+(plan.deep ? .14 : 0)+(plan.chen ? .14 : 0)+coverage*.38;if(req.length&&!matched)gain-=.10;
  const evidenceCap=req.length?(coverage<.10?(plan.chen ? .76 : .70):coverage<.55?(plan.chen ? .84 : .79):coverage<.80 ? .90 : .97):.97,confidence=clamp(Math.min(evidenceCap,Math.max(old.confidence,0)+gain),0,.97),qualityPenalty=req.length?(1-coverage)*18:0,spread=Math.max(6,44-confidence*34+qualityPenalty),center=f.severity;
  fs.evidence[f.id]={confidence,severityMin:clamp(center-spread,0,100),severityMax:clamp(center+spread,0,100),runs:(old.runs||0)+1,tools:[...new Set([...(old.tools||[]),...plan.tools])],lastDay:state.day,measurementQuality:coverage};if(confidence>=.78){if(!fs.diagnosed.includes(f.id))fs.diagnosed.push(f.id);confirmed++}
 }
 consumeDiagnosticRunV64(plan.tools,depth);fs.diagnosisRuns.push({day:state.day,site:plan.place.site,depth,tools:plan.tools,toolQuality:toolQual,withChen:plan.chen,hours:plan.hours});fs.lastDiagnosis={day:state.day,site:plan.place.site,hours:plan.hours,withChen:plan.chen,depth,tools:plan.tools,toolQuality:toolQual};if(plan.chen)useNpcDutyV41('chen',plan.hours,`${plan.deep?'深入量測':'快速檢查'}：${assetDefs.find(a=>a.id===id)?.name||id}`);log(`${assetDefs.find(a=>a.id===id)?.name||id}完成${plan.deep?'深入量測':'快速檢查'}：${confirmed} 項故障達精準維修門檻；儀表低電量或失準會降低證據品質。`,confirmed?'major':'');render();saveGame(false)
};
function diagnosticToolSummaryV63(place){return Object.entries(DIAGNOSTIC_TOOL_DEFS_V63).map(([id,d])=>{if(!ensureDiagnosticToolsV63()[id])return `${d.label} 未製作`;const present=diagnosticToolAvailableV63(id,place),acc=Math.round(diagnosticAccuracyV64(id)*100),bat=Math.round(diagnosticBatteryPctV64(id));return `${d.label}${present?' 可用':' 不在場／不可用'} · 電 ${bat}% · 精度 ${acc}%`}).join(' · ')}
function diagnosticRuntimeHtmlV64(){
 ensureDiagnosticRuntimeV64();const t=ensureFieldTeamV43(),site=calibrationSiteV64(),rows=Object.entries(DIAGNOSTIC_TOOL_DEFS_V63).filter(([id])=>ensureDiagnosticToolsV63()[id]).map(([id,d])=>{const r=diagnosticRuntimeV64(id),def=DIAGNOSTIC_RUNTIME_DEFS_V64[id],bat=diagnosticBatteryPctV64(id),cal=diagnosticCalibrationV64(id),acc=diagnosticAccuracyV64(id),warn=acc<.78?'warn':'',cp=calibrationPlanV64(id);return `<div class="diag-runtime-row ${warn}"><div><b>${d.label}</b><small>${diagnosticAccuracyLabelV64(acc)} · 精度 ${Math.round(acc*100)}% · 校準 ${cal.toFixed(0)}%</small></div><div class="diag-runtime-values"><span>電池 ${r.batteryKWh.toFixed(2)} / ${def.capacityKWh.toFixed(2)} kWh</span><span>使用 ${r.uses} 次</span></div><div class="diag-runtime-actions"><button class="mini secondary" data-diag-refill="${id}" ${t.active||bat>=98?'disabled':''}>補充電池</button><button class="mini secondary" data-diag-calibrate="${id}" ${!site?'disabled':''}>重新校準 · ${(cp?.hours??def.calHours).toFixed(2)}h</button></div></div>`}).join('')||'<p class="muted">尚未製作量測儀表。</p>';return `<section class="diag-runtime-panel"><div class="source-load-head"><div><span>INSTRUMENT QUALITY</span><h3>量測儀表狀態</h3></div></div><p class="muted">低電量、校準漂移與儀表狀況會直接降低量測品質並放大故障嚴重度區間。校準只能在耐熱屋／中央通風站的已知參考點進行；外勤現場不能免費校正。</p><div class="diag-runtime-list">${rows}</div></section>`}
const _openInventoryV64=openInventory;
openInventory=function(){_openInventoryV64();const host=$('inventoryContent');if(!host)return;host.insertAdjacentHTML('beforeend',diagnosticRuntimeHtmlV64());host.querySelectorAll('[data-diag-refill]').forEach(b=>b.onclick=()=>refillDiagnosticBatteryV64(b.dataset.diagRefill));host.querySelectorAll('[data-diag-calibrate]').forEach(b=>b.onclick=()=>calibrateDiagnosticToolV64(b.dataset.diagCalibrate))};
ensureDiagnosticRuntimeV64();
