/* v14.2.2 QA — central storage / SOC / reserve / black-start integration */
function ensureGridStorageV35(){
 ensurePowerOpsV34();
 const cap=Math.max(0,+state.base?.storageKWh||0);
 if(!state.gridStorage){
  /* Compatibility reserve only; do not convert legacy loose batteries into stored electricity. */
  state.gridStorage={schema:1,chargeKWh:Math.min(cap,Math.max(0,cap*.20)),reservePct:20,mode:'auto',maxChargeKW:null,maxDischargeKW:null,throughputKWh:0,lastFlow:null};
 }
 state.gridStorage.schema=1;
 state.gridStorage.chargeKWh=clamp(+state.gridStorage.chargeKWh||0,0,cap);
 state.gridStorage.reservePct=clamp(+state.gridStorage.reservePct||20,0,80);
 if(!['auto','hold','emergency'].includes(state.gridStorage.mode))state.gridStorage.mode='auto';
 return state.gridStorage
}
function gridStorageCapacityV35(){ensureGridStorageV35();return Math.max(0,+state.base?.storageKWh||0)}
function gridStorageLimitsV35(){
 const s=ensureGridStorageV35(),cap=gridStorageCapacityV35();
 return {chargeKW:s.maxChargeKW||clamp(cap*.25,1,12),dischargeKW:s.maxDischargeKW||clamp(cap*.35,1,14),effCharge:.93,effDischarge:.94}
}
function gridStorageReserveKWhV35(){const s=ensureGridStorageV35();return gridStorageCapacityV35()*s.reservePct/100}
function gridStorageUsableKWhV35(){const s=ensureGridStorageV35();if(s.mode==='emergency')return s.chargeKWh;return Math.max(0,s.chargeKWh-gridStorageReserveKWhV35())}
function setGridStorageReserveV35(pct){ensureGridStorageV35().reservePct=clamp(+pct||0,0,80);openInventory();saveGame(false)}
function setGridStorageModeV35(mode){if(!['auto','hold','emergency'].includes(mode))return;ensureGridStorageV35().mode=mode;openInventory();saveGame(false)}
function storageDischargePotentialV35(hours=1){
 const s=ensureGridStorageV35(),l=gridStorageLimitsV35();if(s.mode==='hold')return 0;const usable=gridStorageUsableKWhV35();return Math.min(l.dischargeKW,usable*Math.max(.001,l.effDischarge)/Math.max(.001,hours))
}
function storageChargePotentialV35(hours=1){
 const s=ensureGridStorageV35(),l=gridStorageLimitsV35(),room=Math.max(0,gridStorageCapacityV35()-s.chargeKWh);return Math.min(l.chargeKW,room/Math.max(.001,hours*l.effCharge))
}
function gridDemandV35(){return serviceRowsV34().reduce((a,b)=>a+b.requestedKW,0)+chargingRequestKWV34('centralGrid')}

/* Storage discharges before the generator in AUTO. Generator then covers only the residual deficit. */
centralGridCapacityV34=function(demandKW=0){
 ensureGridStorageV35();const c=centralGridBaseComponentsV34(),demand=Math.max(0,+demandKW||0),storageKW=storageDischargePotentialV35(1),preGen=c.nonGeneratorKW+storageKW;
 let gen=0;const g=state.powerOps.generator;
 if(c.generatorInstalled&&(state.resources.fuel||0)>.001&&g.mode!=='off'){
  if(g.mode==='scheduled'&&g.scheduledHours>0)gen=c.generatorMaxKW;
  else if(g.mode==='auto'&&demand>preGen+.01)gen=c.generatorMaxKW;
 }
 return {...c,storageKW,generatorKW:gen,maxOutputKW:c.nonGeneratorKW+storageKW+gen}
};

function applyStorageFlowV35(plan,s,hours){
 const st=ensureGridStorageV35(),lim=gridStorageLimitsV35(),c=s.components||{},nonGen=Math.max(0,c.nonGeneratorKW||0),load=Math.max(0,plan.loadKW||0),genMax=Math.max(0,c.generatorKW||0);
 /* Dispatch order: base/solar -> storage -> generator. */
 const afterNonGen=Math.max(0,load-nonGen),storageNeedKW=Math.min(Math.max(0,c.storageKW||0),afterNonGen),storageOutKWh=Math.min(gridStorageUsableKWhV35(),storageNeedKW*hours/lim.effDischarge);
 if(storageOutKWh>0){st.chargeKWh=Math.max(0,st.chargeKWh-storageOutKWh);st.throughputKWh+=storageOutKWh}
 const afterStorage=Math.max(0,afterNonGen-storageNeedKW),genKW=Math.min(genMax,afterStorage);
 /* Surplus renewable/base power charges storage. Scheduled generator may also charge storage only after all live loads. */
 const suppliedForLoad=nonGen+storageNeedKW+genKW,surplusKW=Math.max(0,(nonGen+genMax)-suppliedForLoad),chargeInputKW=Math.min(storageChargePotentialV35(hours),surplusKW),storedKWh=Math.min(gridStorageCapacityV35()-st.chargeKWh,chargeInputKW*hours*lim.effCharge);
 if(storedKWh>0){st.chargeKWh=Math.min(gridStorageCapacityV35(),st.chargeKWh+storedKWh);st.throughputKWh+=storedKWh}
 st.lastFlow={day:state.day,phase:state.phase,hours,dischargeKW:storageNeedKW,chargeKW:chargeInputKW,storedKWh,dischargedKWh:storageOutKWh,socPct:gridStorageCapacityV35()>0?st.chargeKWh/gridStorageCapacityV35()*100:0};
 return {storageKW:storageNeedKW,genKW,chargeKW:chargeInputKW,storedKWh,dischargedKWh:storageOutKWh}
}

processSourceSliceV34=function(sourceId,hours){
 const sources=sourceStateV24(),s=sources[sourceId];if(!s?.available||hours<=0)return;const plan=sourceLoadPlanV33(sourceId);
 for(const row of plan.jobs){const {q,e}=row;if(!e||q.enabled===false||row.allocatedKW<=0)continue;const target=chargeTargetKWhV33(q,e),room=Math.max(0,target-e.battery.chargeKWh);if(room<=.001)continue;const input=row.allocatedKW*hours,stored=Math.min(room,input*(s.efficiency||.9));e.battery.chargeKWh=Math.min(e.battery.capacityKWh,e.battery.chargeKWh+stored)}
 if(sourceId==='centralGrid'){
  const flow=applyStorageFlowV35(plan,s,hours),c=s.components||centralGridCapacityV34(plan.loadKW);
  if(flow.genKW>0){const fuel=(flow.genKW/Math.max(.001,c.generatorMaxKW||8))*(POWER_SOURCE_TYPES_V24.generator.fuelRateLph||2.2)*hours;state.resources.fuel=Math.max(0,(state.resources.fuel||0)-fuel)}
  const vent=plan.services?.find(x=>x.id==='ventilation');if(vent&&!vent.ok){state.powerOps.brownoutHours=(state.powerOps.brownoutHours||0)+hours;state.base.condition=clamp((state.base.condition??100)-hours*.18,0,100)}
  state.powerOps.lastDispatch={day:state.day,phase:state.phase,hours,capacityKW:s.maxOutputKW,loadKW:plan.loadKW,serviceLoadKW:plan.serviceLoadKW,chargeLoadKW:plan.chargeLoadKW,storageKW:flow.storageKW,storageChargeKW:flow.chargeKW,generatorKW:flow.genKW,services:plan.services.map(x=>({id:x.id,requestedKW:x.requestedKW,allocatedKW:x.allocatedKW,ok:x.ok}))};
 }
};

function storageRuntimeV35(){
 const crit=serviceRowsV34().filter(x=>x.locked).reduce((a,b)=>a+b.requestedKW,0),usable=gridStorageUsableKWhV35(),l=gridStorageLimitsV35();if(crit<=.001)return Infinity;const kw=Math.min(crit,l.dischargeKW);return kw>0?usable*l.effDischarge/kw:0
}
function gridStorageHtmlV35(){
 const s=ensureGridStorageV35(),cap=gridStorageCapacityV35(),lim=gridStorageLimitsV35(),soc=cap>0?s.chargeKWh/cap*100:0,res=gridStorageReserveKWhV35(),runtime=storageRuntimeV35(),flow=s.lastFlow;
 return `<section class="grid-storage-card"><div class="source-load-head"><div><span>ENERGY STORAGE</span><h3>中央站儲能</h3></div><b>${s.chargeKWh.toFixed(1)} / ${cap.toFixed(1)} kWh</b></div><div class="storage-soc"><i style="width:${clamp(soc,0,100)}%"></i><span>SOC ${soc.toFixed(0)}%</span></div><div class="grid-source-strip"><span>充電上限 <b>${lim.chargeKW.toFixed(1)} kW</b></span><span>放電上限 <b>${lim.dischargeKW.toFixed(1)} kW</b></span><span>備援保留 <b>${res.toFixed(1)} kWh</b></span><span>關鍵負載備援 <b>${Number.isFinite(runtime)?runtime.toFixed(1)+'h':'—'}</b></span></div><div class="storage-controls"><label>備援保留 <select id="storageReserve">${[0,10,20,30,40,50].map(v=>`<option value="${v}" ${s.reservePct===v?'selected':''}>${v}%</option>`).join('')}</select></label><button class="mini ${s.mode==='auto'?'active':''}" data-storage-mode="auto">自動</button><button class="mini ${s.mode==='hold'?'active':''}" data-storage-mode="hold">保留不放電</button><button class="mini ${s.mode==='emergency'?'active':''}" data-storage-mode="emergency">緊急動用全部</button></div><p class="muted">調度順序：基礎／太陽能 → 儲能 → 發電機。多餘供電才回充儲能；「保留不放電」可保住黑啟動電量，「緊急」會突破備援保留。</p>${flow?`<div class="storage-flow"><span>最近充電 <b>${flow.chargeKW.toFixed(2)} kW</b></span><span>最近放電 <b>${flow.dischargeKW.toFixed(2)} kW</b></span></div>`:''}</section>`
}
const _openInventoryV35=openInventory;
openInventory=function(){_openInventoryV35();const host=$('inventoryContent');if(!host)return;host.insertAdjacentHTML('beforeend',gridStorageHtmlV35());if($('storageReserve'))$('storageReserve').onchange=e=>setGridStorageReserveV35(+e.target.value);host.querySelectorAll('[data-storage-mode]').forEach(b=>b.onclick=()=>setGridStorageModeV35(b.dataset.storageMode))};

/* Keep capacity upgrades and SOC coherent after crafting storage modules. */
const _craftV35=craft;
craft=function(id){const before=gridStorageCapacityV35();_craftV35(id);if(id==='power'){ensureGridStorageV35();const after=gridStorageCapacityV35();if(after>before)log(`中央儲能容量增加至 ${after.toFixed(0)} kWh；新增容量目前是空的，需要實際充電。`,'major')}saveGame(false)};

ensureGridStorageV35();
