// v14.3 Batch C — make active cooling protection depend on the tool's real battery.
(function(){
 function residentCoolingEquipmentV102(){
  if(typeof ensurePowerStateV24==='function')ensurePowerStateV24();
  if(typeof bestPlayerCoolingV24==='function')return bestPlayerCoolingV24();
  return Object.values(state.equipmentInstances||{}).find(e=>e?.type==='coolpack'&&e.owner==='player'&&e.holder==='player'&&(Number(e.battery?.chargeKWh)||0)>.001)||null;
 }
 function residentCoolingRuntimeV102(e){
  if(!e)return 0;
  if(typeof equipmentRuntimeHoursV24==='function')return Math.max(0,Number(equipmentRuntimeHoursV24(e))||0);
  const draw=Math.max(.001,Number(typeof equipmentModeV24==='function'?equipmentModeV24(e)?.powerKW:0)||.55);
  return Math.max(0,Number(e.battery?.chargeKWh)||0)/draw;
 }
 function drainResidentCoolingV102(e,hours){
  if(!e||!(hours>0))return 0;
  if(typeof drainEquipmentV24==='function')return drainEquipmentV24(e,hours,e.mode||'normal');
  const draw=Math.max(.001,Number(typeof equipmentModeV24==='function'?equipmentModeV24(e)?.powerKW:0)||.55);
  const need=draw*hours,used=Math.min(Math.max(0,Number(e.battery?.chargeKWh)||0),need);
  if(e.battery)e.battery.chargeKWh=Math.max(0,(Number(e.battery.chargeKWh)||0)-used);
  return used;
 }
 window.residentCoolingEquipmentV102=residentCoolingEquipmentV102;
 window.residentCoolingRuntimeV102=residentCoolingRuntimeV102;

 const originalApplyResidentSurvivalHoursV102=applyResidentSurvivalHoursV94;
 applyResidentSurvivalHoursV94=function(hours,extra={}){
  const h=Math.max(0,Number(hours)||0);
  if(!h)return originalApplyResidentSurvivalHoursV102(hours,extra);
  const wantsCooling=extra.coolingPack??!!state.gear?.coolingPack;
  if(!wantsCooling)return originalApplyResidentSurvivalHoursV102(h,{...extra,coolingPack:false});
  const equipment=residentCoolingEquipmentV102();
  const runtime=Math.min(h,residentCoolingRuntimeV102(equipment));
  if(runtime<=1e-6){
   if(typeof log==='function'&&state.gear?.coolingPack)log('主動製冷背包沒有可用電量，這段外勤無法提供主動降溫。','bad');
   return originalApplyResidentSurvivalHoursV102(h,{...extra,coolingPack:false});
  }
  const first=originalApplyResidentSurvivalHoursV102(runtime,{...extra,coolingPack:true});
  drainResidentCoolingV102(equipment,runtime);
  if(runtime+1e-6<h&&!state.player?.dead){
   if(typeof log==='function')log('主動製冷背包在外勤途中耗盡電量，剩餘時間失去主動降溫。','bad');
   return originalApplyResidentSurvivalHoursV102(h-runtime,{...extra,coolingPack:false});
  }
  return first;
 };
 window.applyResidentSurvivalHoursV94=applyResidentSurvivalHoursV94;
})();
