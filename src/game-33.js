/* v14.2.2 QA — source load manager / charging priorities */
const CHARGE_PRIORITIES_V33={critical:{label:'緊急',weight:4},high:{label:'高',weight:3},normal:{label:'一般',weight:2},low:{label:'低',weight:1}};
function ensureLoadManagerV33(){
 ensurePowerStateV24();
 state.powerLogistics.schema=Math.max(2,state.powerLogistics.schema||1);
 for(const q of state.powerLogistics.charging){q.priority=q.priority||'normal';q.targetPct=clamp(+q.targetPct||100,10,100);q.enabled=q.enabled!==false}
 return state.powerLogistics;
}
function chargeJobV33(id){ensureLoadManagerV33();return state.powerLogistics.charging.find(q=>q.equipmentId===id)||null}
function chargeTargetKWhV33(q,e){return e?.battery?.capacityKWh*clamp((q?.targetPct||100)/100,.1,1)}
function sourceJobsV33(sourceId){ensureLoadManagerV33();return state.powerLogistics.charging.filter(q=>q.sourceId===sourceId&&q.enabled!==false).sort((a,b)=>(CHARGE_PRIORITIES_V33[b.priority]?.weight||2)-(CHARGE_PRIORITIES_V33[a.priority]?.weight||2)||(a.startedDay||0)-(b.startedDay||0))}
function sourceLoadPlanV33(sourceId){
 const s=sourceStateV24()[sourceId],jobs=sourceJobsV33(sourceId);if(!s)return {source:null,jobs:[],loadKW:0,spareKW:0};
 let spare=Math.max(0,s.available?s.maxOutputKW:0),load=0;const rows=[];
 for(const q of jobs){const e=state.equipmentInstances[q.equipmentId],target=chargeTargetKWhV33(q,e),remaining=Math.max(0,target-(e?.battery?.chargeKWh||0));let request=e?Math.min(e.battery.maxChargeKW||.1,remaining>.001?e.battery.maxChargeKW||.1:0):0;if(!sourceCanReachEquipmentV24(s,e))request=0;const allocated=Math.min(spare,request);spare=Math.max(0,spare-allocated);load+=allocated;rows.push({q,e,target,remaining,requestKW:request,allocatedKW:allocated,etaHours:allocated>0?remaining/(allocated*(s.efficiency||.9)):Infinity})}
 return {source:s,jobs:rows,loadKW:load,spareKW:spare,overloadKW:Math.max(0,jobs.reduce((n,q)=>{const e=state.equipmentInstances[q.equipmentId];return n+(e?.battery?.maxChargeKW||0)},0)-(s.available?s.maxOutputKW:0))};
}
function setChargePriorityV33(id,priority){const q=chargeJobV33(id);if(!q||!CHARGE_PRIORITIES_V33[priority])return;q.priority=priority;openInventory();saveGame(false)}
function setChargeTargetV33(id,pct){const q=chargeJobV33(id);if(!q)return;q.targetPct=clamp(+pct||100,10,100);openInventory();saveGame(false)}
function toggleChargeJobV33(id){const q=chargeJobV33(id);if(!q)return;q.enabled=q.enabled===false;openInventory();saveGame(false)}

startChargingV24=function(equipmentId,sourceId){
 ensureLoadManagerV33();const e=state.equipmentInstances[equipmentId],s=sourceStateV24()[sourceId];if(!e||!s)return toast('充電設備或電源不存在');if(!sourceCanReachEquipmentV24(s,e))return toast('設備不在這個供電來源的位置');if(e.battery.chargeKWh>=e.battery.capacityKWh-.001)return toast('設備已充滿');
 const old=chargeJobV33(equipmentId),priority=old?.priority||'normal',targetPct=old?.targetPct||100;state.powerLogistics.charging=state.powerLogistics.charging.filter(q=>q.equipmentId!==equipmentId);state.powerLogistics.charging.push({equipmentId,sourceId,startedDay:state.day,priority,targetPct,enabled:true});log(`${equipmentNameV24(e)}接上${s.name}；充電優先級：${CHARGE_PRIORITIES_V33[priority].label}。`,'good');openInventory();saveGame(false)
};
processChargingV24=function(hours){
 ensureLoadManagerV33();hours=Math.max(0,+hours||0);if(hours<=0)return;const sources=sourceStateV24();
 for(const sourceId of Object.keys(sources)){
  const s=sources[sourceId];if(!s?.available||s.maxOutputKW<=0)continue;const plan=sourceLoadPlanV33(sourceId);let fuelEnergyLimit=Infinity;
  if(sourceId==='generator'){const fuel=state.resources.fuel||0,fuelEnergyLimit=s.fuelRateLph>0?fuel/s.fuelRateLph*s.maxOutputKW:Infinity}
  let deliveredInput=0;
  for(const row of plan.jobs){const {q,e}=row;if(!e||q.enabled===false||row.allocatedKW<=0)continue;const target=chargeTargetKWhV33(q,e),room=Math.max(0,target-e.battery.chargeKWh);if(room<=.001)continue;let inputKWh=row.allocatedKW*hours;if(sourceId==='generator')inputKWh=Math.min(inputKWh,Math.max(0,fuelEnergyLimit-deliveredInput));const stored=Math.min(room,inputKWh*(s.efficiency||.9));e.battery.chargeKWh=Math.min(e.battery.capacityKWh,e.battery.chargeKWh+stored);deliveredInput+=stored/(s.efficiency||.9);if(sourceId==='generator'&&deliveredInput>=fuelEnergyLimit-.001)break
  }
  if(sourceId==='generator'&&deliveredInput>0){const runtimeAtRated=deliveredInput/Math.max(.001,s.maxOutputKW),fuel=runtimeAtRated*(s.fuelRateLph||0);state.resources.fuel=Math.max(0,(state.resources.fuel||0)-fuel)}
 }
 state.powerLogistics.charging=state.powerLogistics.charging.filter(q=>{const e=state.equipmentInstances[q.equipmentId],s=sources[q.sourceId];if(!e||!s)return false;if(!sourceCanReachEquipmentV24(s,e))return false;return e.battery.chargeKWh<chargeTargetKWhV33(q,e)-.001});
};
function loadManagerHtmlV33(){
 ensureLoadManagerV33();const sources=sourceStateV24();return Object.entries(sources).map(([sid,s])=>{const p=sourceLoadPlanV33(sid),pct=s.maxOutputKW>0?Math.round(p.loadKW/s.maxOutputKW*100):0,rows=p.jobs.map(r=>{const e=r.e;if(!e)return'';const q=r.q,eta=Number.isFinite(r.etaHours)?`${r.etaHours.toFixed(1)}h`:'等待';return `<div class="load-job ${r.allocatedKW>0?'active':'waiting'}"><div><b>${equipmentNameV24(e)}</b><small>${e.instanceId} · ${e.battery.chargeKWh.toFixed(2)} / ${e.battery.capacityKWh.toFixed(2)} kWh</small></div><div class="load-job-controls"><select data-charge-priority="${e.instanceId}">${Object.entries(CHARGE_PRIORITIES_V33).map(([k,v])=>`<option value="${k}" ${q.priority===k?'selected':''}>${v.label}</option>`).join('')}</select><select data-charge-target="${e.instanceId}">${[50,75,90,100].map(v=>`<option value="${v}" ${q.targetPct===v?'selected':''}>充到 ${v}%</option>`).join('')}</select><button class="mini secondary" data-charge-toggle="${e.instanceId}">${q.enabled===false?'恢復':'暫停'}</button></div><span>${r.allocatedKW.toFixed(2)} kW · ETA ${eta}</span></div>`}).join('')||'<p class="muted">目前沒有排入這個電源的充電設備。</p>';return `<section class="source-load-card ${s.available?'available':'offline'}"><div class="source-load-head"><div><span>POWER BUS</span><h3>${s.name}</h3></div><b>${p.loadKW.toFixed(2)} / ${s.maxOutputKW.toFixed(2)} kW</b></div><div class="load-meter"><i style="width:${clamp(pct,0,100)}%"></i></div><div class="source-load-meta"><span>負載 ${pct}%</span><span>餘裕 ${p.spareKW.toFixed(2)} kW</span><span>${s.available?'在線':'不可用'}</span></div>${p.overloadKW>0?`<p class="action-warning">排程需求超過電源能力 ${p.overloadKW.toFixed(2)} kW；低優先設備會等待。</p>`:''}<div class="load-jobs">${rows}</div></section>`}).join('')
}
const _openInventoryV33=openInventory;
openInventory=function(){_openInventoryV33();const host=$('inventoryContent');if(!host)return;host.insertAdjacentHTML('beforeend',`<h3>供電負載排程</h3><p class="muted">同一電源不再平均分配。高優先設備先取得可用 kW；達到目標電量後自動退出排程。</p><div class="source-load-list">${loadManagerHtmlV33()}</div>`);host.querySelectorAll('[data-charge-priority]').forEach(x=>x.onchange=()=>setChargePriorityV33(x.dataset.chargePriority,x.value));host.querySelectorAll('[data-charge-target]').forEach(x=>x.onchange=()=>setChargeTargetV33(x.dataset.chargeTarget,+x.value));host.querySelectorAll('[data-charge-toggle]').forEach(x=>x.onclick=()=>toggleChargeJobV33(x.dataset.chargeToggle))};
ensureLoadManagerV33();
