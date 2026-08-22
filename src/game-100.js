// v14.3 Batch C — authoritative resident electricity bank and common tool-energy API.
(function(){
 function ensureResidentElectricityV100(){
  const e=typeof ensureElectricityStateV91==='function'?ensureElectricityStateV91():(state.electricity=state.electricity||{});
  e.batteryKWh=Math.max(0,Number(e.batteryKWh)||0);
  e.shelterOutputKW=Math.max(0,Number(e.shelterOutputKW)||.25);
  e.capacityKWh=Math.max(e.batteryKWh,Number(e.capacityKWh)||4);
  e.tools=e.tools&&typeof e.tools==='object'?e.tools:{};
  return e;
 }
 function residentEnergyAvailableV100(){return ensureResidentElectricityV100().batteryKWh}
 function addResidentEnergyV100(kwh,{label='耐熱屋充電'}={}){
  const e=ensureResidentElectricityV100(),amount=Math.max(0,Number(kwh)||0),before=e.batteryKWh;
  e.batteryKWh=Math.min(e.capacityKWh,e.batteryKWh+amount);
  const stored=e.batteryKWh-before;
  if(stored>0&&typeof log==='function')log(`${label} +${stored.toFixed(2)} kWh。`);
  return stored;
 }
 function consumeResidentEnergyV100(kwh,{label='電動工具',silent=false}={}){
  const e=ensureResidentElectricityV100(),need=Math.max(0,Number(kwh)||0);
  if(need<=0)return {ok:true,used:0,remaining:e.batteryKWh};
  if(e.batteryKWh+1e-6<need){
   const message=`${label}需要 ${need.toFixed(2)} kWh，但你的電池只有 ${e.batteryKWh.toFixed(2)} kWh。`;
   if(!silent&&typeof toast==='function')toast(message);
   return {ok:false,used:0,remaining:e.batteryKWh,shortfall:need-e.batteryKWh,message};
  }
  e.batteryKWh=Math.max(0,e.batteryKWh-need);
  return {ok:true,used:need,remaining:e.batteryKWh,shortfall:0};
 }
 function toolEnergyUseV100(id,hours=1,{label=''}={}){
  const e=ensureResidentElectricityV100(),t=e.tools?.[id];
  if(!t)return {ok:false,reason:'unknown-tool',message:'未登記的電動工具'};
  const draw=Math.max(0,Number(t.drawKW??t.powerKW)||0),h=Math.max(0,Number(hours)||0),need=draw*h;
  const result=consumeResidentEnergyV100(need,{label:label||t.name||id});
  if(result.ok){t.lastUseHours=h;t.lastEnergyKWh=need;t.powered=true}else t.powered=false;
  return {...result,tool:id,hours:h,drawKW:draw};
 }
 function shelterChargeResidentEnergyV100(hours){
  const e=ensureResidentElectricityV100(),h=Math.max(0,Number(hours)||0);
  if(h<=0)return 0;
  return addResidentEnergyV100(e.shelterOutputKW*h,{label:'耐熱屋低功率供電'});
 }
 window.ensureResidentElectricityV100=ensureResidentElectricityV100;
 window.residentEnergyAvailableV100=residentEnergyAvailableV100;
 window.addResidentEnergyV100=addResidentEnergyV100;
 window.consumeResidentEnergyV100=consumeResidentEnergyV100;
 window.toolEnergyUseV100=toolEnergyUseV100;
 window.shelterChargeResidentEnergyV100=shelterChargeResidentEnergyV100;

 const originalSpendWorldTimeV100=spendWorldTimeV26;
 spendWorldTimeV26=function(hours,opts={}){
  const before=Number(currentPeriodHoursLeftV26())||0;
  const out=originalSpendWorldTimeV100(hours,opts);
  if(out){
   const after=Number(currentPeriodHoursLeftV26())||0,elapsed=Math.max(0,before-after);
   const field=state.fieldOperation||{},outside=!!(field.active||field.inProgress||state.itinerary?.status==='running'||state.expedition?.active||state.expedition?.inProgress);
   if(elapsed>0&&!outside)shelterChargeResidentEnergyV100(elapsed);
  }
  return out;
 };

 const originalAdvanceV100=advance;
 advance=function(){
  const beforeDay=state.day,beforePhase=state.phase,beforeLeft=Number(currentPeriodHoursLeftV26?.())||0;
  const out=originalAdvanceV100();
  let elapsed=0;
  if(beforeDay>=30)elapsed=Math.max(0,24-(Number(state.worldClock?.endlessElapsed)||0));
  else if(beforePhase==='night'||beforePhase==='day')elapsed=Math.max(0,beforeLeft);
  if(elapsed>0)shelterChargeResidentEnergyV100(elapsed);
  return out;
 };

 ensureResidentElectricityV100();
})();
