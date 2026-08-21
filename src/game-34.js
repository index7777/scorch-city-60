/* v14.2.2 QA — central grid dispatch / source scheduling / continuous service loads */
const GRID_SERVICE_DEFS_V34={
 lifeSupport:{name:'中央站基礎維生',priority:'critical',locked:true,req:()=>hasReachedVentV23()?.35:0},
 ventilation:{name:'中央站通風／主冷卻',priority:'critical',locked:true,req:()=>state.base?.ventilation>0?(state.base.core?7.5:state.base.ventilation>=2?6:2.6):0},
 water:{name:'水處理／回收',priority:'high',req:()=>Math.max(0,(state.base?.waterTreatment||0)*.45)},
 pump:{name:'冷卻循環泵',priority:'high',req:()=>state.installed?.pump?1.1:0},
 coldStations:{name:'外部冷站供電',priority:'high',req:()=>Math.max(0,(state.coldStations?.length||0)*1.4)},
 coreWork:{name:'核心工程施工電力',priority:'normal',req:()=>state.coreProject?.active?1.8:0}
};
function ensurePowerOpsV34(){
 ensureLoadManagerV33();
 state.powerOps=state.powerOps||{schema:1,generator:{mode:'auto',scheduledHours:0},services:{},lastDispatch:null,brownoutHours:0};
 state.powerOps.generator=state.powerOps.generator||{mode:'auto',scheduledHours:0};
 for(const [id,d] of Object.entries(GRID_SERVICE_DEFS_V34))if(!state.powerOps.services[id])state.powerOps.services[id]={enabled:true,priority:d.priority};
 for(const q of state.powerLogistics.charging)if(['generator','solar','centralBus'].includes(q.sourceId))q.sourceId='centralGrid';
 return state.powerOps
}
function serviceRowsV34(){
 ensurePowerOpsV34();return Object.entries(GRID_SERVICE_DEFS_V34).map(([id,d])=>{const cfg=state.powerOps.services[id]||{},requested=Math.max(0,+d.req()||0),enabled=d.locked?requested>0:cfg.enabled!==false&&requested>0;return {id,name:d.name,priority:cfg.priority||d.priority,locked:!!d.locked,requestedKW:enabled?requested:0,availableKW:requested,enabled}}).filter(x=>x.availableKW>0)
}
function setServiceEnabledV34(id,on){const d=GRID_SERVICE_DEFS_V34[id];if(!d||d.locked)return;ensurePowerOpsV34();state.powerOps.services[id].enabled=!!on;openInventory();saveGame(false)}
function setServicePriorityV34(id,p){const d=GRID_SERVICE_DEFS_V34[id];if(!d||d.locked||!CHARGE_PRIORITIES_V33[p])return;ensurePowerOpsV34();state.powerOps.services[id].priority=p;openInventory();saveGame(false)}
function setGeneratorModeV34(mode,hours=0){ensurePowerOpsV34();const g=state.powerOps.generator;if(!['off','auto','scheduled'].includes(mode))return;g.mode=mode;g.scheduledHours=mode==='scheduled'?Math.max(.25,+hours||2):0;log(mode==='off'?'發電機排程：關閉':mode==='auto'?'發電機排程：自動補足電網缺口':`發電機排程：連續運轉 ${g.scheduledHours}h`);openInventory();saveGame(false)}
function centralGridBaseComponentsV34(){
 ensurePowerOpsV34();const reached=hasReachedVentV23(),solarOnline=!!(reached&&state.gear?.solar&&(state.day>=30||state.phase==='day'));
 const solarKW=solarOnline?8:0,baseKW=reached?Math.max(0,(state.base?.powerKW||0)-(state.gear?.solar?8:0)):0;
 return {reached,baseKW,solarKW,nonGeneratorKW:baseKW+solarKW,generatorInstalled:!!(reached&&state.installed?.generator),generatorMaxKW:8}
}
function chargingRequestKWV34(sourceId='centralGrid'){
 return sourceJobsV33(sourceId).reduce((sum,q)=>{const e=state.equipmentInstances[q.equipmentId],target=chargeTargetKWhV33(q,e),remaining=Math.max(0,target-(e?.battery?.chargeKWh||0));if(!e||!q.enabled||remaining<=.001)return sum;return sum+Math.min(e.battery.maxChargeKW||.1,e.battery.maxChargeKW||.1)},0)
}
function generatorAvailableV34(demandKW=0){
 ensurePowerOpsV34();const c=centralGridBaseComponentsV34(),g=state.powerOps.generator;if(!c.generatorInstalled||(state.resources.fuel||0)<=.001||g.mode==='off')return false;if(g.mode==='scheduled')return g.scheduledHours>0;if(g.mode==='auto')return demandKW>c.nonGeneratorKW+.01;return false
}
function centralGridCapacityV34(demandKW=0){const c=centralGridBaseComponentsV34(),gen=generatorAvailableV34(demandKW)?c.generatorMaxKW:0;return {...c,generatorKW:gen,maxOutputKW:c.nonGeneratorKW+gen}}
const _sourceStateV34=sourceStateV24;
sourceStateV24=function(){
 ensurePowerOpsV34();const legacy=_sourceStateV34(),services=serviceRowsV34(),serviceDemand=services.reduce((a,b)=>a+b.requestedKW,0),chargeDemand=chargingRequestKWV34('centralGrid'),c=centralGridCapacityV34(serviceDemand+chargeDemand);
 return {heatHouse:legacy.heatHouse,centralGrid:{name:'中央站共用電力匯流排',location:'vent',maxOutputKW:c.maxOutputKW,efficiency:.92,available:c.reached&&c.maxOutputKW>0,components:c}}
};
function dispatchServicesV34(capacityKW){
 const rows=serviceRowsV34().sort((a,b)=>(CHARGE_PRIORITIES_V33[b.priority]?.weight||2)-(CHARGE_PRIORITIES_V33[a.priority]?.weight||2));let spare=Math.max(0,capacityKW),load=0;
 for(const r of rows){r.allocatedKW=Math.min(spare,r.requestedKW);r.ok=r.allocatedKW+1e-6>=r.requestedKW;spare=Math.max(0,spare-r.allocatedKW);load+=r.allocatedKW}
 return {rows,loadKW:load,spareKW:spare,requestedKW:rows.reduce((a,b)=>a+b.requestedKW,0)}
}
sourceLoadPlanV33=function(sourceId){
 ensurePowerOpsV34();const sources=sourceStateV24(),s=sources[sourceId],jobs=sourceJobsV33(sourceId);if(!s)return {source:null,jobs:[],loadKW:0,spareKW:0,serviceLoadKW:0};
 const servicePlan=sourceId==='centralGrid'?dispatchServicesV34(s.maxOutputKW):{rows:[],loadKW:0,spareKW:s.available?s.maxOutputKW:0,requestedKW:0};let spare=servicePlan.spareKW,chargeLoad=0;const rows=[];
 for(const q of jobs){const e=state.equipmentInstances[q.equipmentId],target=chargeTargetKWhV33(q,e),remaining=Math.max(0,target-(e?.battery?.chargeKWh||0));let request=e?Math.min(e.battery.maxChargeKW||.1,remaining>.001?e.battery.maxChargeKW||.1:0):0;if(!sourceCanReachEquipmentV24(s,e))request=0;const allocated=Math.min(spare,request);spare=Math.max(0,spare-allocated);chargeLoad+=allocated;rows.push({q,e,target,remaining,requestKW:request,allocatedKW:allocated,etaHours:allocated>0?remaining/(allocated*(s.efficiency||.9)):Infinity})}
 return {source:s,jobs:rows,services:servicePlan.rows,serviceLoadKW:servicePlan.loadKW,serviceRequestedKW:servicePlan.requestedKW,chargeLoadKW:chargeLoad,loadKW:servicePlan.loadKW+chargeLoad,spareKW:spare,overloadKW:Math.max(0,servicePlan.requestedKW+rows.reduce((a,b)=>a+b.requestKW,0)-(s.available?s.maxOutputKW:0))}
};
function processSourceSliceV34(sourceId,hours){
 const sources=sourceStateV24(),s=sources[sourceId];if(!s?.available||hours<=0)return;const plan=sourceLoadPlanV33(sourceId);let inputKWh=0;
 for(const row of plan.jobs){const {q,e}=row;if(!e||q.enabled===false||row.allocatedKW<=0)continue;const target=chargeTargetKWhV33(q,e),room=Math.max(0,target-e.battery.chargeKWh);if(room<=.001)continue;const input=row.allocatedKW*hours,stored=Math.min(room,input*(s.efficiency||.9));e.battery.chargeKWh=Math.min(e.battery.capacityKWh,e.battery.chargeKWh+stored);inputKWh+=stored/(s.efficiency||.9)}
 if(sourceId==='centralGrid'){
  const c=s.components||centralGridCapacityV34(plan.loadKW),nonGen=Math.max(0,c.nonGeneratorKW||0),genKW=Math.max(0,Math.min(c.generatorKW||0,plan.loadKW-nonGen));
  if(genKW>0){const fuel=(genKW/Math.max(.001,c.generatorMaxKW||8))*(POWER_SOURCE_TYPES_V24.generator.fuelRateLph||2.2)*hours;state.resources.fuel=Math.max(0,(state.resources.fuel||0)-fuel)}
  const vent=plan.services?.find(x=>x.id==='ventilation');if(vent&&!vent.ok){state.powerOps.brownoutHours=(state.powerOps.brownoutHours||0)+hours;state.base.condition=clamp((state.base.condition??100)-hours*.18,0,100)}
  state.powerOps.lastDispatch={day:state.day,phase:state.phase,hours,capacityKW:s.maxOutputKW,loadKW:plan.loadKW,serviceLoadKW:plan.serviceLoadKW,chargeLoadKW:plan.chargeLoadKW,services:plan.services.map(x=>({id:x.id,requestedKW:x.requestedKW,allocatedKW:x.allocatedKW,ok:x.ok}))};
 }
}
processChargingV24=function(hours){
 ensurePowerOpsV34();hours=Math.max(0,+hours||0);if(hours<=0)return;let left=hours;
 while(left>1e-6){const g=state.powerOps.generator,step=Math.min(left,g.mode==='scheduled'&&g.scheduledHours>0?Math.min(1,g.scheduledHours):1);processSourceSliceV34('heatHouse',step);processSourceSliceV34('centralGrid',step);if(g.mode==='scheduled'&&g.scheduledHours>0){g.scheduledHours=Math.max(0,g.scheduledHours-step);if(g.scheduledHours<=.001)g.mode='off'}left-=step}
 const sources=sourceStateV24();state.powerLogistics.charging=state.powerLogistics.charging.filter(q=>{const e=state.equipmentInstances[q.equipmentId],s=sources[q.sourceId];if(!e||!s||!sourceCanReachEquipmentV24(s,e))return false;return e.battery.chargeKWh<chargeTargetKWhV33(q,e)-.001})
};
function powerDispatchHtmlV34(){
 ensurePowerOpsV34();const s=sourceStateV24().centralGrid,plan=sourceLoadPlanV33('centralGrid'),c=s?.components||centralGridBaseComponentsV34(),g=state.powerOps.generator;
 const services=plan.services.map(r=>`<div class="grid-service ${r.ok?'ok':'brownout'}"><div><b>${r.name}</b><small>${CHARGE_PRIORITIES_V33[r.priority]?.label||r.priority}${r.locked?' · 安全關鍵負載':''}</small></div><span>${r.allocatedKW.toFixed(2)} / ${r.requestedKW.toFixed(2)} kW</span>${r.locked?'':`<div class="grid-service-actions"><button class="mini secondary" data-service-toggle="${r.id}">${r.enabled?'暫停':'啟用'}</button><select data-service-priority="${r.id}">${Object.entries(CHARGE_PRIORITIES_V33).map(([k,v])=>`<option value="${k}" ${r.priority===k?'selected':''}>${v.label}</option>`).join('')}</select></div>`}</div>`).join('')||'<p class="muted">目前中央站沒有持續用電負載。</p>';
 const genStatus=!c.generatorInstalled?'尚未接入':g.mode==='off'?'關閉':g.mode==='auto'?'自動':`排程中 ${g.scheduledHours.toFixed(1)}h`;
 return `<section class="grid-dispatch-card"><div class="source-load-head"><div><span>GRID DISPATCH</span><h3>中央站供電調度</h3></div><b>${plan.loadKW.toFixed(2)} / ${(s?.maxOutputKW||0).toFixed(2)} kW</b></div><div class="grid-source-strip"><span>基礎電源 <b>${c.baseKW.toFixed(1)} kW</b></span><span>太陽能 <b>${c.solarKW.toFixed(1)} kW</b></span><span>發電機 <b>${c.generatorKW?.toFixed(1)||'0.0'} kW</b></span><span>燃料 <b>${(state.resources.fuel||0).toFixed(1)} L</b></span></div><div class="generator-controls"><span>發電機：<b>${genStatus}</b></span><button class="mini secondary" data-gen-mode="auto">自動</button><button class="mini secondary" data-gen-hours="2">開 2h</button><button class="mini secondary" data-gen-hours="6">開 6h</button><button class="mini secondary" data-gen-mode="off">關閉</button></div><p class="muted">安全關鍵負載先吃電；剩餘功率才分給充電排程。可暫停水處理、循環泵、外部冷站或核心施工，換取更多充電功率。</p><div class="grid-service-list">${services}</div>${plan.overloadKW>0?`<p class="action-warning">目前需求超出可供電能力 ${plan.overloadKW.toFixed(2)} kW；低優先負載會限電或等待。</p>`:''}${state.powerOps.brownoutHours>0?`<p class="action-warning">累積主冷卻供電不足 ${state.powerOps.brownoutHours.toFixed(1)}h；中央站設備狀況會持續下降。</p>`:''}</section>`
}
const _openInventoryV34=openInventory;
openInventory=function(){_openInventoryV34();const host=$('inventoryContent');if(!host)return;host.insertAdjacentHTML('beforeend',powerDispatchHtmlV34());host.querySelectorAll('[data-service-toggle]').forEach(b=>b.onclick=()=>{const id=b.dataset.serviceToggle;setServiceEnabledV34(id,!(state.powerOps.services[id]?.enabled!==false))});host.querySelectorAll('[data-service-priority]').forEach(s=>s.onchange=()=>setServicePriorityV34(s.dataset.servicePriority,s.value));host.querySelectorAll('[data-gen-mode]').forEach(b=>b.onclick=()=>setGeneratorModeV34(b.dataset.genMode));host.querySelectorAll('[data-gen-hours]').forEach(b=>b.onclick=()=>setGeneratorModeV34('scheduled',+b.dataset.genHours))};
ensurePowerOpsV34();
