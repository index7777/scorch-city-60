/* v14.2.2 QA — power logistics timing/fuel correction */
processChargingV24=function(hours){
 ensurePowerStateV24();hours=Math.max(0,+hours||0);if(hours<=0||!state.powerLogistics.charging.length)return;
 const sources=sourceStateV24();
 const grouped=state.powerLogistics.charging.reduce((a,q)=>(a[q.sourceId]||(a[q.sourceId]=[]),a[q.sourceId].push(q),a),{});
 for(const [sourceId,qs0] of Object.entries(grouped)){
  const s=sources[sourceId];if(!s?.available||s.maxOutputKW<=0)continue;
  const qs=qs0.map(q=>({q,e:state.equipmentInstances[q.equipmentId]})).filter(x=>x.e&&sourceCanReachEquipmentV24(s,x.e)&&x.e.battery.chargeKWh<x.e.battery.capacityKWh-.001);
  if(!qs.length)continue;
  const requests=qs.map(x=>Math.min(x.e.battery.maxChargeKW||.1,(x.e.battery.capacityKWh-x.e.battery.chargeKWh)/Math.max(.001,hours)));
  const requestedKW=requests.reduce((a,b)=>a+b,0);if(requestedKW<=0)continue;
  let sourceLimitKW=s.maxOutputKW;
  if(sourceId==='generator'){
   const fuelHours=(state.resources.fuel||0)/Math.max(.001,s.fuelRateLph||0);
   const fuelEnergyKWh=fuelHours*s.maxOutputKW;
   sourceLimitKW=Math.min(sourceLimitKW,fuelEnergyKWh/Math.max(.001,hours));
  }
  const scale=Math.min(1,sourceLimitKW/requestedKW);let sourceEnergyKWh=0;
  qs.forEach((x,i)=>{
   const inputKW=requests[i]*scale;
   const stored=Math.min(x.e.battery.capacityKWh-x.e.battery.chargeKWh,inputKW*hours*(s.efficiency||.9));
   x.e.battery.chargeKWh=Math.min(x.e.battery.capacityKWh,x.e.battery.chargeKWh+stored);
   sourceEnergyKWh+=stored/Math.max(.01,s.efficiency||.9);
  });
  if(sourceId==='generator'&&sourceEnergyKWh>0){
   const equivalentFullLoadHours=sourceEnergyKWh/Math.max(.001,s.maxOutputKW);
   state.resources.fuel=Math.max(0,state.resources.fuel-equivalentFullLoadHours*(s.fuelRateLph||0));
  }
 }
 state.powerLogistics.charging=state.powerLogistics.charging.filter(q=>{const e=state.equipmentInstances[q.equipmentId],s=sources[q.sourceId];return e&&s?.available&&sourceCanReachEquipmentV24(s,e)&&e.battery.chargeKWh<e.battery.capacityKWh-.001});
};

advance=function(){
 if(state.gameOver)return;
 const elapsed=state.day>=30?24:Math.max(0,state.hoursLeft||0);
 processChargingV24(elapsed);
 if(state.day<30){
  if(state.phase==='night'){state.phase='day';state.hoursLeft=24-nightHours(state.day);log('夜晚結束，城市重新進入致命白晝。');render();saveGame(false);return}
  consumeDaily();state.day++;state.phase='night';state.hoursLeft=nightHours(state.day);dynamicEvents();
 }else{consumeDaily();state.day++;dynamicEvents()}
 checkState();render();ensurePowerStateV24();saveGame(false);
};
