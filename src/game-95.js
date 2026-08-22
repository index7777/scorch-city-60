// v14.3 Batch A — connect real field actions to the resident survival clock.
(function(){
 function markFieldActiveV95(active){
  state.fieldOperation=state.fieldOperation&&typeof state.fieldOperation==='object'?state.fieldOperation:{};
  const prev={active:state.fieldOperation.active,inProgress:state.fieldOperation.inProgress};
  state.fieldOperation.active=!!active;
  state.fieldOperation.inProgress=!!active;
  return ()=>{
   if(prev.active===undefined)delete state.fieldOperation.active;else state.fieldOperation.active=prev.active;
   if(prev.inProgress===undefined)delete state.fieldOperation.inProgress;else state.fieldOperation.inProgress=prev.inProgress;
  };
 }
 function successfulQuickSearchV95(loc,fromLogIndex){
  return (state.log||[]).slice(fromLogIndex).some(e=>String(e?.msg||'').startsWith(`${loc.name} 搜索：`));
 }
 function applyEndlessFieldExposureV95(hours){
  if(typeof applyResidentSurvivalHoursV94!=='function')return;
  applyResidentSurvivalHoursV94(hours,{outside:true,ambientTemp:100,coolingPack:!!state.gear?.coolingPack,vehicleAc:!!(state.vehicle?.acActive||state.vehicle?.hasAC)});
  if(typeof residentDeathCheckV94==='function')residentDeathCheckV94();
 }
 window.applyResidentFieldExposureV95=function(hours,extra={}){
  if(typeof applyResidentSurvivalHoursV94!=='function')return state.player;
  return applyResidentSurvivalHoursV94(hours,{outside:true,...extra});
 };

 const originalSearchLocationV95=searchLocation;
 searchLocation=function(loc){
  const beforeDay=state.day,beforeHours=Number(state.hoursLeft),beforeLog=(state.log||[]).length;
  const estimatedHours=typeof timeCostFor==='function'?Math.max(0,Number(timeCostFor(loc))||0):0;
  const restore=markFieldActiveV95(true);
  let out;
  try{out=originalSearchLocationV95(loc)}finally{restore()}
  const success=successfulQuickSearchV95(loc,beforeLog);
  if(success&&beforeDay>=30&&estimatedHours>0){
   applyEndlessFieldExposureV95(estimatedHours);
   if(typeof render==='function')render();
  }else if(success&&beforeDay<30&&Number.isFinite(beforeHours)&&Number.isFinite(Number(state.hoursLeft))&&beforeHours>Number(state.hoursLeft)){
   // The original action called render while fieldOperation was active, so game-94
   // consumed the exact elapsed hours as outdoor exposure. No second charge here.
  }
  return out;
 };
})();
