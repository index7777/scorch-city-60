/* v14.2.2 QA — cooling vehicle / mobile power / passenger capacity integration */
const COOLING_VEHICLE_CRAFT_V32={
 id:'coolVehicle',name:'工程車製冷改裝',cost:{battery:8,parts:12,coolant:6},
 cond:()=>!!state.gear.vehicle&&!!state.research.cooling&&!state.vehicle?.coolingRetrofit,
 effect:()=>{state.vehicle=state.vehicle||{};state.vehicle.coolingRetrofit=true;ensureCoolingVehicleV32(true)},
 desc:'把消防工程車改造成 3 人車載主動冷卻平台。保留柴油行駛，新增 28 kWh 製冷電池、車內冷卻與停車供冷。'
};
if(!craftDefs.some(c=>c.id==='coolVehicle'))craftDefs.push(COOLING_VEHICLE_CRAFT_V32);
CRAFT_WORK_V26.coolVehicle={hours:4,site:'fire',environment:'outdoor',activity:'repair'};

function ensureVehicleStateV32(){
 state.vehicle=state.vehicle||{capacityKg:700,condition:100};
 if(state.gear?.vehicle&&!state.vehicle.currentLocation)state.vehicle.currentLocation=state.expedition?.last?.location||'fire';
 state.vehicle.currentLocation=state.vehicle.currentLocation||'fire';
 state.vehicle.coolingRetrofit=!!state.vehicle.coolingRetrofit;
 return state.vehicle;
}
function ensureCoolingVehicleV32(force=false){
 ensurePowerStateV24();const v=ensureVehicleStateV32();
 if(!(v.coolingRetrofit||force))return null;
 let e=Object.values(state.equipmentInstances).find(x=>x.type==='coolingVehicle'&&x.owner==='player');
 if(!e){
  const t=EQUIPMENT_TYPES_V24.coolingVehicle,id=`coolingVehicle_${String(state.powerLogistics.seq++).padStart(3,'0')}`;
  e=state.equipmentInstances[id]={instanceId:id,type:'coolingVehicle',owner:'player',holder:'player',location:v.currentLocation,assignedUsers:['player'],condition:v.condition??100,mode:t.defaultMode,battery:{capacityKWh:t.battery.capacityKWh,chargeKWh:force?1.5:Math.min(6,t.battery.capacityKWh),maxChargeKW:t.battery.maxChargeKW,maxDischargeKW:t.battery.maxDischargeKW},loan:null,vehicle:true};
 }
 e.location=v.currentLocation;e.holder='player';e.condition=Math.min(e.condition??100,v.condition??100);return e;
}
function coolingVehicleV32(){return ensureCoolingVehicleV32(false)}
function vehicleAtV32(id){return !!(state.gear?.vehicle&&ensureVehicleStateV32().currentLocation===id)}
function moveVehicleV32(id){if(!state.gear?.vehicle)return;ensureVehicleStateV32().currentLocation=id;const e=coolingVehicleV32();if(e)e.location=id}
function vehicleCabinCapacityV32(){return coolingVehicleV32()?3:0}
function vehicleCabinCanCoverV32(users,hours){
 const e=coolingVehicleV32();if(!e||users>vehicleCabinCapacityV32())return false;const m=equipmentModeV24(e);if(!m)return false;
 const aux=Math.max(0,users?0.06:0),need=m.powerKW*Math.max(0,hours)+aux;return e.battery.chargeKWh+1e-6>=need;
}
function vehicleDriveCostV32(distance,hours,{users=1,cooling=false}={}){
 distance=Math.max(0,+distance||0);hours=Math.max(0,+hours||0);const e=coolingVehicleV32(),m=e?equipmentModeV24(e):null;
 return {fuelL:distance*.22,auxKWh:e?distance*.06:0,coolingKWh:e&&cooling?(m?.powerKW||0)*hours:0,totalKWh:e?distance*.06+(cooling?(m?.powerKW||0)*hours:0):0,users};
}
function consumeVehicleDriveV32(distance,hours,{users=1,useCabinCooling=false}={}){
 if(!state.gear?.vehicle)return {ok:true,fuelL:0,totalKWh:0};const c=vehicleDriveCostV32(distance,hours,{users,cooling:useCabinCooling}),e=coolingVehicleV32();
 if((state.resources.fuel||0)+1e-6<c.fuelL)return {ok:false,reason:`工程車燃料不足：本段需要 ${c.fuelL.toFixed(1)}L`};
 if(e&&e.battery.chargeKWh+1e-6<c.totalKWh)return {ok:false,reason:`製冷車電量不足：本段需要 ${c.totalKWh.toFixed(2)}kWh`};
 state.resources.fuel=Math.max(0,(state.resources.fuel||0)-c.fuelL);
 if(e){e.battery.chargeKWh=Math.max(0,e.battery.chargeKWh-c.totalKWh);e.condition=clamp((e.condition??100)-distance*.015-hours*.08,0,100);state.vehicle.condition=Math.min(state.vehicle.condition??100,e.condition)}
 return {ok:true,...c};
}
function vehicleDriveFeasibilityV32(distance,hours,{users=1}={}){
 if(!state.gear?.vehicle)return {ok:true,useCabinCooling:false};const hot=currentOutsideTempV26()>35,e=coolingVehicleV32(),canCabin=!!(hot&&e&&users<=3&&vehicleCabinCanCoverV32(users,hours));const c=vehicleDriveCostV32(distance,hours,{users,cooling:canCabin});
 if((state.resources.fuel||0)+1e-6<c.fuelL)return {ok:false,reason:`工程車燃料不足：至少需要 ${c.fuelL.toFixed(1)}L`,cost:c};
 if(e&&e.battery.chargeKWh+1e-6<c.totalKWh)return {ok:false,reason:`製冷車電量不足：至少需要 ${c.totalKWh.toFixed(2)}kWh`,cost:c};
 return {ok:true,useCabinCooling:canCabin,cost:c};
}
function runVehicleStationaryCoolingV32(hours=1){
 const e=coolingVehicleV32();if(!e)return toast('工程車尚未完成製冷改裝');hours=Math.max(.25,+hours||1);const m=equipmentModeV24(e),need=(m?.powerKW||0)*hours;
 if(e.battery.chargeKWh+1e-6<need)return toast(`車載電池不足，停車供冷 ${hours}h 需要 ${need.toFixed(2)} kWh`);
 if(!spendWorldTimeV26(hours,{label:`製冷工程車停車供冷 ${hours}h`}))return;e.battery.chargeKWh=Math.max(0,e.battery.chargeKWh-need);e.condition=clamp((e.condition??100)-hours*.1,0,100);log(`製冷工程車在${locationLabelV24(e.location)}停車供冷 ${hours}h，最多可同時容納 3 人；耗電 ${need.toFixed(2)} kWh。`,'major');render();openInventory();saveGame(false)
}

const _craftDoneV32=craftDoneV23;
craftDoneV23=function(c){if(c.id==='coolVehicle')return !!state.vehicle?.coolingRetrofit;return _craftDoneV32(c)};
const _craftPrereqV32=craftPrereqReasonsV23;
craftPrereqReasonsV23=function(c){const r=_craftPrereqV32(c);if(c.id==='coolVehicle'){if(!state.gear?.vehicle)r.push('尚未取得消防站工程車');if(!state.research?.cooling)r.push('尚未完成「主動液冷裝備」研究')}return [...new Set(r)]};
const _craftWorkV32=craftWorkV26;
craftWorkV26=function(id){if(id==='coolVehicle'){const v=ensureVehicleStateV32();return {hours:4,site:v.currentLocation||'fire',environment:'outdoor',activity:'repair'}}return _craftWorkV32(id)};

/* Correct route estimates after an escort rescue: player and vehicle continue from the rescue destination. */
itineraryEstimateV27=function(){
 const it=ensureItineraryV27(),speed=itinerarySpeedV27(),home=mapStartId();let from=home,travel=0,actions=0,legs=[],rescueIssues=[];
 for(const stop of it.stops){
  const r=routeBetweenV27(from,stop.location,it.routeMode);if(!r)return {ok:false,reason:`${mapLoc(from)?.name||from} 無法前往 ${mapLoc(stop.location)?.name||stop.location}`};
  const th=r.distance/speed;travel+=th;legs.push({from,to:stop.location,route:r,travel:th,action:0,kind:'travel'});from=stop.location;
  if(stop.action==='rescue'){
   const f=rescueFeasibilityV29(stop);if(!f.ok)rescueIssues.push({stop,f});actions+=.75;
   if(f.ok&&f.mode==='escort'&&f.leg){travel+=f.leg.hours;legs.push({from,to:f.candidate.destination,route:f.leg.route,travel:f.leg.hours,action:.75,kind:'rescue'});from=f.candidate.destination}else legs[legs.length-1].action=.75;
  }else{const ah=stopActionHoursV27(stop);actions+=ah;legs[legs.length-1].action=ah}
 }
 if(it.stops.length&&from!==home){const r=routeBetweenV27(from,home,it.routeMode);if(!r)return {ok:false,reason:'目前道路情報下無法規劃返程'};const th=r.distance/speed;travel+=th;legs.push({from,to:home,route:r,travel:th,action:0,kind:'return'})}
 const total=Math.round((travel+actions)*100)/100,left=currentPeriodHoursLeftV26();return {ok:!rescueIssues.length,total,travel:Math.round(travel*100)/100,actions:Math.round(actions*100)/100,left,buffer:Math.round((left-total)*100)/100,legs,mode:itineraryModeV27(),rescueIssues,reason:rescueIssues[0]?.f?.reason||''};
};
function itineraryVehicleForecastV32(){
 const e=itineraryEstimateV27();if(!e.ok||!state.gear?.vehicle)return null;let distance=0,hours=0,coolingHours=0;for(const leg of e.legs){distance+=leg.route?.distance||0;hours+=leg.travel||0;if(currentOutsideTempV26()>35)coolingHours+=leg.travel||0}
 const cv=coolingVehicleV32(),cooling=!!cv,cost=vehicleDriveCostV32(distance,hours,{users:1,cooling});return {distance,hours,coolingHours,cost,vehicle:cv,okFuel:(state.resources.fuel||0)+1e-6>=cost.fuelL,okBattery:!cv||cv.battery.chargeKWh+1e-6>=cost.totalKWh};
}
const _plannerHtmlV32=itineraryPlannerHtmlV27;
itineraryPlannerHtmlV27=function(){let html=_plannerHtmlV32();const f=itineraryVehicleForecastV32();if(!f)return html;const cv=f.vehicle,box=`<section class="vehicle-route-check ${f.okFuel&&f.okBattery?'ok':'bad'}"><h3>工程車供需</h3><div class="vehicle-route-grid"><span>路段 <b>${f.distance.toFixed(1)} km</b></span><span>柴油 <b>${f.cost.fuelL.toFixed(1)} L</b></span><span>車載用電 <b>${cv?f.cost.totalKWh.toFixed(2)+' kWh':'未改裝'}</b></span><span>乘員冷卻 <b>${cv?'最多 3 人':'無'}</b></span></div>${!f.okFuel?'<p class="action-warning">工程車燃料不足，不能完成目前排定路線。</p>':''}${!f.okBattery?'<p class="action-warning">車載製冷電池不足，需充電或改用個人冷卻設備。</p>':''}</section>`;return html.replace('<div class="planner-actions">',box+'<div class="planner-actions">')};

/* Vehicle is a real moving asset. Travel consumes diesel; hot travel can use the cabin instead of draining a backpack. */
runItineraryStepV27=function(){
 const it=ensureItineraryV27(),home=mapStartId();if(it.status!=='running')return;
 if(it.index>=it.stops.length){
  const r=routeBetweenV27(it.current,home,it.routeMode);if(!r)return pauseItineraryV27('返程道路無法通行');const bad=itineraryUnknownBlockV27(r);if(bad){verifyRoad(bad[0],bad[1],'行程途中親眼確認');return pauseItineraryV27(`${roadName(roadKey(bad[0],bad[1]))}實際封閉，已重新標記；請重新計算返程。`)}
  const h=r.distance/itinerarySpeedV27(),vf=vehicleDriveFeasibilityV32(r.distance,h,{users:1});if(!vf.ok)return pauseItineraryV27(vf.reason);const pack=currentOutsideTempV26()>35&&!vf.useCabinCooling?bestPlayerCoolingV24():null;
  if(!spendWorldTimeV26(h,{label:`返回${locationLabelV24(home)}`,coolingPack:pack}))return pauseItineraryV27('返程時間或熱防護不足');const spent=consumeVehicleDriveV32(r.distance,h,{users:1,useCabinCooling:vf.useCabinCooling});if(!spent.ok)return pauseItineraryV27(spent.reason);moveVehicleV32(home);it.current=home;it.status='complete';log(`本時段排定行程完成，已返回${locationLabelV24(home)}。`,'major');render();renderMap();saveGame(false);return
 }
 const stop=it.stops[it.index],loc=mapLoc(stop.location),r=routeBetweenV27(it.current,stop.location,it.routeMode);if(!r)return pauseItineraryV27(`無法前往 ${loc?.name||stop.location}`);const bad=itineraryUnknownBlockV27(r);if(bad){verifyRoad(bad[0],bad[1],'行程途中親眼確認');return pauseItineraryV27(`${roadName(roadKey(bad[0],bad[1]))}與舊情報不符，實際已封閉。路線已停止，請重算。`)}
 const travel=r.distance/itinerarySpeedV27(),vf=vehicleDriveFeasibilityV32(r.distance,travel,{users:1});if(!vf.ok)return pauseItineraryV27(vf.reason);const travelPack=currentOutsideTempV26()>35&&!vf.useCabinCooling?bestPlayerCoolingV24():null;
 if(!spendWorldTimeV26(travel,{label:`前往${loc.name}`,coolingPack:travelPack}))return pauseItineraryV27('移動時間或熱防護不足');const drive=consumeVehicleDriveV32(r.distance,travel,{users:1,useCabinCooling:vf.useCabinCooling});if(!drive.ok)return pauseItineraryV27(drive.reason);moveVehicleV32(stop.location);it.current=stop.location;
 const action=stop.action==='rescue'?.75:stopActionHoursV27(stop),actionPack=currentOutsideTempV26()>35?bestPlayerCoolingV24():null;if(!spendWorldTimeV26(action,{label:`${loc.name}：${itineraryActionsV27(loc.id).find(x=>x[0]===stop.action)?.[1]||'地點行動'}`,coolingPack:actionPack}))return pauseItineraryV27('地點行動時間或熱防護不足');it.index++;
 if(stop.action==='search')collectStopLootV27(loc);else if(stop.action==='scout'){state.intel[loc.id]={day:state.day,verifiedDay:state.day,summary:summarizeRemaining(state.locations[loc.id].remaining),source:'行程偵察',confidence:100};log(`你重新確認了${loc.name}的現況。`)}else if(stop.action==='asset'){discoverAssetsAt(loc.id);log(`你在${loc.name}完成大型設備盤點；實際搬運仍受載重與所有權限制。`)}else if(stop.action==='rescue'){if(!executeNpcRescueV29(stop))return;moveVehicleV32(it.current)}
 const encounterLoc=it.current,pair=npcEncounterAt(encounterLoc);if(pair){const [nid]=pair;if(!npcKnowledge(nid).tradeUnlocked){pauseItineraryV27(`${locationLabelV24(encounterLoc)}出現未完成的倖存者接觸事件`);setTimeout(()=>openNpcEncounter(nid),0);return}if(stop.action==='npc'){pauseItineraryV27(`正在與${npcPublicName(nid)}互動；完成後可繼續剩餘行程`);setTimeout(()=>openTrade(nid),0);return}}
 render();renderMap();saveGame(false);setTimeout(runItineraryStepV27,0)
};

/* Escort rescue uses the same moving vehicle ledger; the v30 handler still owns time and cooling assignment drain. */
const _executeNpcRescueV32=executeNpcRescueV29;
executeNpcRescueV29=function(stop){
 const f=rescueFeasibilityV29(stop);if(!f.ok)return _executeNpcRescueV32(stop);
 if(f.mode==='escort'&&state.gear?.vehicle&&f.leg){const vf=vehicleDriveFeasibilityV32(f.leg.route.distance,f.leg.hours,{users:2});if(!vf.ok){pauseItineraryV27(vf.reason);return false}const motion=vehicleDriveCostV32(f.leg.route.distance,f.leg.hours,{users:2,cooling:false});if((state.resources.fuel||0)+1e-6<motion.fuelL){pauseItineraryV27('工程車燃料不足以完成雙人撤離');return false}state.resources.fuel=Math.max(0,state.resources.fuel-motion.fuelL);const cv=coolingVehicleV32();if(cv){const aux=Math.min(cv.battery.chargeKWh,motion.auxKWh);cv.battery.chargeKWh=Math.max(0,cv.battery.chargeKWh-aux)}const ok=_executeNpcRescueV32(stop);if(ok)moveVehicleV32(ensureItineraryV27().current);return ok}
 return _executeNpcRescueV32(stop)
};

const _openInventoryV32=openInventory;
openInventory=function(){
 _openInventoryV32();const host=$('inventoryContent'),v=ensureVehicleStateV32();if(!host||!state.gear?.vehicle)return;const e=coolingVehicleV32(),m=e?equipmentModeV24(e):null;
 const panel=`<section class="vehicle-power-panel"><div class="vehicle-power-head"><div><span>MOBILE POWER</span><h3>工程車能源／製冷</h3></div><b>${locationLabelV24(v.currentLocation)}</b></div><div class="vehicle-route-grid"><span>柴油 <b>${(state.resources.fuel||0).toFixed(1)} L</b></span><span>載重 <b>${cargoCapacityKg()} kg</b></span><span>乘員冷卻 <b>${e?'3 人':'未改裝'}</b></span><span>車況 <b>${Math.round(v.condition??100)}%</b></span>${e?`<span>車載電池 <b>${e.battery.chargeKWh.toFixed(2)} / ${e.battery.capacityKWh.toFixed(0)} kWh</b></span><span>模式 <b>${m?.label||e.mode}</b></span>`:''}</div>${e?`<div class="equipment-actions"><button data-vehicle-mode="normal" class="mini ${e.mode==='normal'?'active':''}">CABIN</button><button data-vehicle-mode="boost" class="mini ${e.mode==='boost'?'active':''}">BOOST</button><button id="vehicleCool1h" class="mini secondary">停車供冷 1h</button><button id="vehicleCool3h" class="mini secondary">停車供冷 3h</button></div><p class="muted">行駛消耗柴油；高溫時車艙製冷另外消耗車載電池。充電仍受所在地電源輸出與車載最大充電功率限制。</p>`:'<p class="muted">目前只有普通工程車。完成「工程車製冷改裝」後，才有 28 kWh 車載製冷電池與 3 人冷卻容量。</p>'}</section>`;
 host.insertAdjacentHTML('beforeend',panel);host.querySelectorAll('[data-vehicle-mode]').forEach(b=>b.onclick=()=>{setEquipmentModeV24(e.instanceId,b.dataset.vehicleMode);openInventory()});if($('vehicleCool1h'))$('vehicleCool1h').onclick=()=>runVehicleStationaryCoolingV32(1);if($('vehicleCool3h'))$('vehicleCool3h').onclick=()=>runVehicleStationaryCoolingV32(3)
};

ensureVehicleStateV32();if(state.vehicle.coolingRetrofit)ensureCoolingVehicleV32(false);
