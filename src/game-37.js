/* v14.2.2 QA — safe-zone population redistribution / external shelter capacity */
const SAFE_ZONE_DEFS_V37={
 subway:{name:'地鐵冷站',location:'subway',nominal:10,standbyKW:.55,perPersonKW:.10},
 coldstore:{name:'冷庫冷站',location:'coldstore',nominal:14,standbyKW:.7,perPersonKW:.11},
 vehicle:{name:'製冷工程車臨時安置',location:null,nominal:2,standbyKW:0,perPersonKW:0,mobile:true}
};
function ensureSafeShelterOpsV37(){
 state.safeShelterOps=state.safeShelterOps||{schema:1,zones:{},npcAssignments:{},metrics:{},lastWarningDay:{},inTransit:false};
 state.safeShelterOps.schema=1;state.safeShelterOps.zones=state.safeShelterOps.zones||{};state.safeShelterOps.npcAssignments=state.safeShelterOps.npcAssignments||{};state.safeShelterOps.metrics=state.safeShelterOps.metrics||{};state.safeShelterOps.lastWarningDay=state.safeShelterOps.lastWarningDay||{};
 for(const id of Object.keys(SAFE_ZONE_DEFS_V37)){
  state.safeShelterOps.zones[id]=state.safeShelterOps.zones[id]||{population:0};
  state.safeShelterOps.zones[id].population=Math.max(0,Math.floor(+state.safeShelterOps.zones[id].population||0));
  state.safeShelterOps.metrics[id]=state.safeShelterOps.metrics[id]||{thermalStress:0,last:null};
 }
 return state.safeShelterOps
}
function safeZoneBuiltV37(id){if(id==='vehicle')return !!coolingVehicleV32();return state.coldStations?.includes(id)}
function safeZoneLocationV37(id){if(id==='vehicle')return ensureVehicleStateV32().currentLocation||'vent';return SAFE_ZONE_DEFS_V37[id]?.location||id}
function safeZoneAssignedNpcIdsV37(id){ensureSafeShelterOpsV37();return Object.entries(state.safeShelterOps.npcAssignments).filter(([nid,z])=>z===id&&state.npcs?.[nid]?.alive).map(([nid])=>nid)}
function safeZoneOccupantsV37(id){ensureSafeShelterOpsV37();return (state.safeShelterOps.zones[id]?.population||0)+safeZoneAssignedNpcIdsV37(id).length}
function safeShelterGenericPopulationV37(){ensureSafeShelterOpsV37();return Object.values(state.safeShelterOps.zones).reduce((a,z)=>a+(z.population||0),0)}
function coldStationDemandV37(){
 ensureSafeShelterOpsV37();let total=0;
 for(const id of ['subway','coldstore'])if(safeZoneBuiltV37(id)){const d=SAFE_ZONE_DEFS_V37[id],n=safeZoneOccupantsV37(id);total+=d.standbyKW+d.perPersonKW*n}
 return Math.max(0,total)
}
GRID_SERVICE_DEFS_V34.coldStations.req=()=>coldStationDemandV37();
function coldStationAllocationsV37(){
 ensureSafeShelterOpsV37();let allocated=0;
 try{const p=sourceLoadPlanV33('centralGrid'),r=p?.services?.find(x=>x.id==='coldStations');allocated=Math.max(0,+r?.allocatedKW||0)}catch{}
 const zones=['subway','coldstore'].filter(safeZoneBuiltV37).map(id=>{const d=SAFE_ZONE_DEFS_V37[id],occupants=safeZoneOccupantsV37(id),requested=d.standbyKW+d.perPersonKW*occupants;return {id,d,occupants,requestedKW:requested,allocatedKW:0}}).sort((a,b)=>(b.occupants>0)-(a.occupants>0)||b.occupants-a.occupants);
 let spare=allocated;for(const z of zones){z.allocatedKW=Math.min(z.requestedKW,spare);spare=Math.max(0,spare-z.allocatedKW);z.powerRatio=z.requestedKW>0?clamp(z.allocatedKW/z.requestedKW,0,1):0;z.safe=Math.floor(z.d.nominal*Math.pow(z.powerRatio,.82));if(z.allocatedKW>0)z.safe=Math.max(1,z.safe)}
 return zones
}
function vehicleShelterSnapshotV37(){
 const d=SAFE_ZONE_DEFS_V37.vehicle,e=coolingVehicleV32(),occupants=safeZoneOccupantsV37('vehicle');if(!e)return {id:'vehicle',d,occupants,safe:0,powerRatio:0,runtime:0};
 const mode=equipmentModeV24(e),runtime=equipmentRuntimeHoursV24(e),ratio=mode?.powerKW>0?clamp(runtime/1,0,1):0,safe=Math.floor(d.nominal*ratio);
 return {id:'vehicle',d,occupants,safe,nominal:d.nominal,powerRatio:ratio,runtime,e,location:safeZoneLocationV37('vehicle')}
}
function safeZoneSnapshotV37(id){
 if(id==='vehicle')return vehicleShelterSnapshotV37();const row=coldStationAllocationsV37().find(x=>x.id===id),d=SAFE_ZONE_DEFS_V37[id],occupants=safeZoneOccupantsV37(id);return row||{id,d,occupants,safe:0,requestedKW:0,allocatedKW:0,powerRatio:0}
}
function safeZoneHeadroomV37(id){const x=safeZoneSnapshotV37(id);return Math.max(0,(x.safe||0)-(x.occupants||0))}

const _centralOccupantsV37=centralOccupantsV36;
centralOccupantsV36=function(){
 ensureSafeShelterOpsV37();const base=Math.max(0,+state.base?.population||0);
 const npcs=Object.entries(state.npcs||{}).filter(([id,n])=>n.alive&&n.location==='vent'&&!state.safeShelterOps.npcAssignments[id]).length;
 const settlements=Object.values(state.settlements||{}).filter(s=>s.location==='vent'&&!s.safeShelter).reduce((a,s)=>a+Math.max(0,+s.population||0),0);return base+npcs+settlements
};
const _settlementPopulationV37=settlementPopulation;
settlementPopulation=function(){return _settlementPopulationV37()+safeShelterGenericPopulationV37()};
const _districtPopulationAtV37=districtPopulationAt;
districtPopulationAt=function(id){let n=_districtPopulationAtV37(id);for(const zid of Object.keys(SAFE_ZONE_DEFS_V37)){if(safeZoneBuiltV37(zid)&&safeZoneLocationV37(zid)===id)n+=state.safeShelterOps?.zones?.[zid]?.population||0}return n};
const _dailyWaterNeedV37=dailyWaterNeed;
dailyWaterNeed=function(){return _dailyWaterNeedV37()+Math.ceil(safeShelterGenericPopulationV37()*(state.ration?.water||2.5))};
const _dailyFoodNeedV37=dailyFoodNeed;
dailyFoodNeed=function(){return _dailyFoodNeedV37()+Math.ceil(safeShelterGenericPopulationV37()*(state.ration?.food||1))};

function shuttlePlanV37(zoneId,count,direction='out'){
 count=Math.max(1,Math.min(2,Math.floor(+count||1)));const d=SAFE_ZONE_DEFS_V37[zoneId];if(!d||d.mobile||!safeZoneBuiltV37(zoneId))return {ok:false,reason:'目標安全區不可用'};
 const v=ensureVehicleStateV32(),e=coolingVehicleV32();if(!e)return {ok:false,reason:'需要已完成製冷改裝的工程車'};if(v.currentLocation!=='vent')return {ok:false,reason:'製冷工程車目前不在中央通風站'};
 const route=routeBetweenV27('vent',d.location,ensureItineraryV27().routeMode);if(!route)return {ok:false,reason:'目前沒有可用的接駁路線'};const h=route.distance/24,hot=currentOutsideTempV26()>35;
 const outUsers=direction==='out'?1+count:1,backUsers=direction==='in'?1+count:1;
 if(outUsers>3||backUsers>3)return {ok:false,reason:'製冷工程車同時最多保護 3 人（含駕駛）'};
 const c1=vehicleDriveCostV32(route.distance,h,{users:outUsers,cooling:hot}),c2=vehicleDriveCostV32(route.distance,h,{users:backUsers,cooling:hot}),fuel=c1.fuelL+c2.fuelL,kWh=c1.totalKWh+c2.totalKWh,time=h*2+.25;
 if((state.resources.fuel||0)+1e-6<fuel)return {ok:false,reason:`接駁需要 ${fuel.toFixed(1)} L 柴油`};if(e.battery.chargeKWh+1e-6<kWh)return {ok:false,reason:`接駁需要 ${kWh.toFixed(2)} kWh 車載製冷電量`};if(currentPeriodHoursLeftV26()+1e-6<time)return {ok:false,reason:`本時段剩餘時間不足；接駁約需 ${time.toFixed(1)}h`};return {ok:true,zoneId,count,direction,route,h,time,fuel,kWh,e}
}
function applyShuttleVehicleCostV37(p){
 state.resources.fuel=Math.max(0,(state.resources.fuel||0)-p.fuel);p.e.battery.chargeKWh=Math.max(0,p.e.battery.chargeKWh-p.kWh);p.e.condition=clamp((p.e.condition??100)-p.route.distance*.03-p.time*.06,0,100);state.vehicle.condition=Math.min(state.vehicle.condition??100,p.e.condition)
}
function executeShuttleV37(zoneId,count,direction='out'){
 const p=shuttlePlanV37(zoneId,count,direction);if(!p.ok)return toast(p.reason);const zone=ensureSafeShelterOpsV37().zones[zoneId];
 if(direction==='out'){const movable=Math.max(0,(state.base.population||0)-1);if(movable<p.count)return toast('中央站沒有足夠可轉移的一般居民（玩家不列入轉移）');if(safeZoneHeadroomV37(zoneId)<p.count)return toast('目標安全區目前沒有足夠安全容量')}
 else if((zone.population||0)<p.count)return toast('該安全區沒有足夠居民可接回');
 stopChargingV24(p.e.instanceId,true);state.safeShelterOps.inTransit=true;const ok=spendWorldTimeV26(p.time,{label:`${SAFE_ZONE_DEFS_V37[zoneId].name}人口接駁`});state.safeShelterOps.inTransit=false;if(!ok)return false;
 applyShuttleVehicleCostV37(p);
 if(direction==='out'){state.base.population-=p.count;zone.population+=p.count}else{zone.population-=p.count;state.base.population+=p.count}
 log(`${p.count} 人${direction==='out'?'由中央站轉移至':'由外部安全區接回'}${SAFE_ZONE_DEFS_V37[zoneId].name}；接駁往返耗時 ${p.time.toFixed(1)}h、柴油 ${p.fuel.toFixed(1)}L、車載電量 ${p.kWh.toFixed(2)}kWh。`,'major');render();refreshPopulationUiV37();saveGame(false);return true
}
function moveVehicleShelterResidentsV37(count,direction='out'){
 ensureSafeShelterOpsV37();count=Math.max(1,Math.min(2,Math.floor(+count||1)));const v=ensureVehicleStateV32(),e=coolingVehicleV32(),z=state.safeShelterOps.zones.vehicle;if(!e)return toast('工程車尚未完成製冷改裝');if(v.currentLocation!=='vent')return toast('製冷工程車必須停在中央通風站才能安置／接回居民');
 if(direction==='out'){if(Math.max(0,(state.base.population||0)-1)<count)return toast('中央站沒有足夠可轉移的一般居民');if(safeZoneHeadroomV37('vehicle')<count)return toast('車內目前沒有足夠安全容量')}else if(z.population<count)return toast('車內沒有足夠居民可接回');
 if(!spendWorldTimeV26(.25,{label:'製冷工程車人員安置'}))return;if(direction==='out'){state.base.population-=count;z.population+=count}else{z.population-=count;state.base.population+=count}log(`${count} 人${direction==='out'?'暫時安置到製冷工程車':'由製冷工程車返回中央站'}。車內有人時會持續消耗車載製冷電量。`,'major');render();refreshPopulationUiV37();saveGame(false)
}
function assignNpcToSafeZoneV37(npcId,zoneId){
 const n=state.npcs?.[npcId];if(!n?.alive||n.location!=='vent')return toast('該 NPC 目前不在中央通風站');if(!safeZoneBuiltV37(zoneId))return toast('目標安全區不可用');if(safeZoneHeadroomV37(zoneId)<1)return toast('目標安全區沒有足夠安全容量');
 if(zoneId==='vehicle'){const v=ensureVehicleStateV32();if(v.currentLocation!=='vent')return toast('製冷工程車目前不在中央站');if(!spendWorldTimeV26(.25,{label:`安置${n.name}`}))return;n.location=safeZoneLocationV37('vehicle');state.safeShelterOps.npcAssignments[npcId]='vehicle'}
 else{const p=shuttlePlanV37(zoneId,1,'out');if(!p.ok)return toast(p.reason);stopChargingV24(p.e.instanceId,true);state.safeShelterOps.inTransit=true;const ok=spendWorldTimeV26(p.time,{label:`接駁${n.name}至${SAFE_ZONE_DEFS_V37[zoneId].name}`});state.safeShelterOps.inTransit=false;if(!ok)return;applyShuttleVehicleCostV37(p);n.location=safeZoneLocationV37(zoneId);state.safeShelterOps.npcAssignments[npcId]=zoneId}
 log(`${n.name}已重新分配至${SAFE_ZONE_DEFS_V37[zoneId].name}。`,'major');render();refreshPopulationUiV37();saveGame(false)
}
function recallNpcFromSafeZoneV37(npcId){
 ensureSafeShelterOpsV37();const zoneId=state.safeShelterOps.npcAssignments[npcId],n=state.npcs?.[npcId];if(!zoneId||!n?.alive)return;const d=SAFE_ZONE_DEFS_V37[zoneId];if(zoneId==='vehicle'){if(ensureVehicleStateV32().currentLocation!=='vent')return toast('製冷工程車不在中央站，無法讓乘員下車返回');if(!spendWorldTimeV26(.25,{label:`接回${n.name}`}))return;n.location='vent'}else{const p=shuttlePlanV37(zoneId,1,'in');if(!p.ok)return toast(p.reason);stopChargingV24(p.e.instanceId,true);state.safeShelterOps.inTransit=true;const ok=spendWorldTimeV26(p.time,{label:`接回${n.name}`});state.safeShelterOps.inTransit=false;if(!ok)return;applyShuttleVehicleCostV37(p);n.location='vent'}delete state.safeShelterOps.npcAssignments[npcId];log(`${n.name}已返回中央通風站。`,'major');render();refreshPopulationUiV37();saveGame(false)
}

function tickSafeSheltersV37(hours){
 hours=Math.max(0,+hours||0);if(hours<=0||state.day<30)return;ensureSafeShelterOpsV37();
 if(!state.safeShelterOps.inTransit){const vz=state.safeShelterOps.zones.vehicle;if(safeZoneOccupantsV37('vehicle')>0){const e=coolingVehicleV32();if(e)drainEquipmentV24(e,hours,e.mode)}}
 const ids=['subway','coldstore','vehicle'];for(const id of ids){if(!safeZoneBuiltV37(id))continue;const x=safeZoneSnapshotV37(id),m=state.safeShelterOps.metrics[id],over=Math.max(0,x.occupants-x.safe);if(over>0)m.thermalStress=clamp(m.thermalStress+hours*(2+over*1.1),0,100);else m.thermalStress=clamp(m.thermalStress-hours*1.1,0,100);m.last={day:state.day,hours,occupants:x.occupants,safe:x.safe};if(over>0&&state.safeShelterOps.lastWarningDay[id]!==state.day){state.safeShelterOps.lastWarningDay[id]=state.day;log(`${SAFE_ZONE_DEFS_V37[id].name}目前 ${x.occupants} 人、即時安全容量 ${x.safe} 人；外部安置點出現熱壓力。`,'major')}}
}
const _processSourceSliceV37=processSourceSliceV34;
processSourceSliceV34=function(sourceId,hours){_processSourceSliceV37(sourceId,hours);if(sourceId==='centralGrid')tickSafeSheltersV37(hours)};

const _moveVehicleV37=moveVehicleV32;
moveVehicleV32=function(id){_moveVehicleV37(id);ensureSafeShelterOpsV37();for(const nid of safeZoneAssignedNpcIdsV37('vehicle'))if(state.npcs?.[nid])state.npcs[nid].location=id};
const _vehicleDriveFeasibilityV37=vehicleDriveFeasibilityV32;
vehicleDriveFeasibilityV32=function(distance,hours,{users=1}={}){const shelter=safeZoneOccupantsV37('vehicle');return _vehicleDriveFeasibilityV37(distance,hours,{users:Math.max(users,1+shelter)})};
const _startOrResumeItineraryV37=startOrResumeItineraryV27;
startOrResumeItineraryV27=function(){if(safeZoneOccupantsV37('vehicle')>0)return toast('製冷工程車目前作為臨時安置點使用；請先把車內人員轉移到固定安全區或中央站');return _startOrResumeItineraryV37()};

function safeZoneCardHtmlV37(id){
 const x=safeZoneSnapshotV37(id),d=SAFE_ZONE_DEFS_V37[id],m=ensureSafeShelterOpsV37().metrics[id],head=Math.max(0,x.safe-x.occupants),generic=state.safeShelterOps.zones[id].population,npcs=safeZoneAssignedNpcIdsV37(id);
 const power=id==='vehicle'?`車載續航 ${Number.isFinite(x.runtime)?x.runtime.toFixed(1)+'h':'—'}`:`供電 ${(x.allocatedKW||0).toFixed(2)} / ${(x.requestedKW||0).toFixed(2)} kW`;
 const actions=id==='vehicle'?`<button class="mini" data-shelter-send="vehicle" data-count="1">安置 1 人</button><button class="mini" data-shelter-send="vehicle" data-count="2">安置 2 人</button><button class="mini secondary" data-shelter-return="vehicle" data-count="1">接回 1 人</button>`:`<button class="mini" data-shelter-send="${id}" data-count="1">轉移 1 人</button><button class="mini" data-shelter-send="${id}" data-count="2">轉移 2 人</button><button class="mini secondary" data-shelter-return="${id}" data-count="1">接回 1 人</button>`;
 return `<article class="safe-zone-card ${x.occupants>x.safe?'over':'ok'}"><div class="source-load-head"><div><span>SAFE ZONE</span><h3>${d.name}</h3></div><b>${x.occupants} / ${x.safe} 人</b></div><div class="safe-zone-meta"><span>名目容量 <b>${d.nominal}</b></span><span>${power}</span><span>一般居民 <b>${generic}</b></span><span>可再接收 <b>${head}</b></span></div><div class="safe-zone-actions">${actions}</div>${npcs.length?`<small>已安置 NPC：${npcs.map(id=>npcPublicName(id)).join('、')}</small>`:''}${m.thermalStress>0?`<small class="${m.thermalStress>=60?'bad-text':''}">熱壓力 ${m.thermalStress.toFixed(0)}%</small>`:''}</article>`
}
function populationRedistributionHtmlV37(){
 ensureSafeShelterOpsV37();const central=centralSafetySnapshotV36(),zones=Object.keys(SAFE_ZONE_DEFS_V37).filter(safeZoneBuiltV37),ventNpcs=Object.entries(state.npcs||{}).filter(([id,n])=>n.alive&&n.location==='vent'&&!state.safeShelterOps.npcAssignments[id]);
 const zoneOptions=zones.map(id=>`<option value="${id}">${SAFE_ZONE_DEFS_V37[id].name}（餘裕 ${safeZoneHeadroomV37(id)}）</option>`).join('');
 const npcRows=ventNpcs.map(([id,n])=>`<div class="npc-redistribute"><span><b>${npcPublicName(id)}</b><small>目前：中央通風站</small></span><select data-npc-destination="${id}">${zoneOptions}</select><button class="mini" data-npc-send="${id}" ${!zoneOptions?'disabled':''}>轉移</button></div>`).join('');
 const assigned=Object.keys(state.safeShelterOps.npcAssignments).filter(id=>state.npcs?.[id]?.alive).map(id=>`<div class="npc-redistribute"><span><b>${npcPublicName(id)}</b><small>${SAFE_ZONE_DEFS_V37[state.safeShelterOps.npcAssignments[id]]?.name||'外部安全區'}</small></span><button class="mini secondary" data-npc-recall="${id}">接回中央站</button></div>`).join('');
 return `<section class="population-redistribution"><div class="source-load-head"><div><span>POPULATION DISTRIBUTION</span><h3>安全區人口調度</h3></div><b>中央 ${central.occupants} / ${central.safe}</b></div><p class="muted">固定冷站受中央匯流排實際供電限制；製冷工程車最多暫時安置 2 人並持續消耗車載電池。一般居民轉移會使用製冷車往返接駁，因此會消耗世界時間、柴油與車載電量。</p><div class="safe-zone-grid">${zones.map(safeZoneCardHtmlV37).join('')||'<p class="muted">目前沒有其他可用安全區。</p>'}</div>${ventNpcs.length||assigned?`<h4>已知 NPC 安置</h4><div class="npc-redistribute-list">${npcRows}${assigned}</div>`:''}</section>`
}
function bindPopulationRedistributionV37(host=document){
 host.querySelectorAll('[data-shelter-send]').forEach(b=>b.onclick=()=>{const id=b.dataset.shelterSend,c=+b.dataset.count;if(id==='vehicle')moveVehicleShelterResidentsV37(c,'out');else executeShuttleV37(id,c,'out')});
 host.querySelectorAll('[data-shelter-return]').forEach(b=>b.onclick=()=>{const id=b.dataset.shelterReturn,c=+b.dataset.count;if(id==='vehicle')moveVehicleShelterResidentsV37(c,'in');else executeShuttleV37(id,c,'in')});
 host.querySelectorAll('[data-npc-send]').forEach(b=>b.onclick=()=>{const id=b.dataset.npcSend,sel=host.querySelector(`[data-npc-destination="${id}"]`);if(sel?.value)assignNpcToSafeZoneV37(id,sel.value)});host.querySelectorAll('[data-npc-recall]').forEach(b=>b.onclick=()=>recallNpcFromSafeZoneV37(b.dataset.npcRecall))
}
function refreshPopulationUiV37(){if($('baseMgmtDialog')?.open)openBaseMgmt();else if($('inventoryDialog')?.open)openInventory()}
const _openBaseMgmtV37=openBaseMgmt;
openBaseMgmt=function(){_openBaseMgmtV37();const host=$('baseMgmtContent');if(host){host.insertAdjacentHTML('beforeend',populationRedistributionHtmlV37());bindPopulationRedistributionV37(host)}};
const _openInventoryV37=openInventory;
openInventory=function(){_openInventoryV37();const host=$('inventoryContent');if(host){host.insertAdjacentHTML('beforeend',populationRedistributionHtmlV37());bindPopulationRedistributionV37(host)}};
ensureSafeShelterOpsV37();
