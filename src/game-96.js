// v14.3 Batch A — connect multi-stop itinerary travel/action time to resident survival exposure.
(function(){
 function markItineraryFieldV96(active){
  state.fieldOperation=state.fieldOperation&&typeof state.fieldOperation==='object'?state.fieldOperation:{};
  const prev={active:state.fieldOperation.active,inProgress:state.fieldOperation.inProgress,source:state.fieldOperation.source};
  state.fieldOperation.active=!!active;
  state.fieldOperation.inProgress=!!active;
  state.fieldOperation.source=active?'itinerary':prev.source;
  return ()=>{
   if(prev.active===undefined)delete state.fieldOperation.active;else state.fieldOperation.active=prev.active;
   if(prev.inProgress===undefined)delete state.fieldOperation.inProgress;else state.fieldOperation.inProgress=prev.inProgress;
   if(prev.source===undefined)delete state.fieldOperation.source;else state.fieldOperation.source=prev.source;
  };
 }
 function applyEndlessItineraryExposureV96(hours){
  if(!(hours>0)||typeof applyResidentSurvivalHoursV94!=='function')return;
  applyResidentSurvivalHoursV94(hours,{
   outside:true,
   ambientTemp:100,
   coolingPack:!!state.gear?.coolingPack,
   vehicleAc:!!(state.vehicle?.acActive||state.vehicle?.hasAC)
  });
  if(typeof residentDeathCheckV94==='function')residentDeathCheckV94();
 }
 window.applyResidentItineraryExposureV96=applyEndlessItineraryExposureV96;

 const originalRunItineraryStepV96=runItineraryStepV27;
 runItineraryStepV27=function(){
  const beforeDay=state.day;
  const beforeEndless=Number(state.worldClock?.endlessElapsed)||0;
  const restore=markItineraryFieldV96(true);
  let out;
  try{out=originalRunItineraryStepV96()}finally{
   if(beforeDay>=30){
    const afterEndless=Number(state.worldClock?.endlessElapsed)||0;
    const elapsed=Math.max(0,afterEndless-beforeEndless);
    if(elapsed>0)applyEndlessItineraryExposureV96(elapsed);
   }
   restore();
  }
  return out;
 };
})();
