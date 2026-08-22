// v14.3 Batch D — authoritative resident transport profile for speed, cargo, fuel and heat-protection metadata.
(function(){
 const TRANSPORT_BASE_V104={
  foot:{id:'foot',name:'徒步',speedKmh:4.5,capacityKg:18,volumeL:30,fuelPerKm:0,daylightHeatMultiplier:1},
  cart:{id:'cart',name:'手推車',speedKmh:5,capacityKg:80,volumeL:140,fuelPerKm:0,daylightHeatMultiplier:1},
  car:{id:'car',name:'汽車',speedKmh:24,capacityKg:300,volumeL:550,fuelPerKm:.12,daylightHeatMultiplier:.82},
  truck:{id:'truck',name:'卡車',speedKmh:24,capacityKg:1200,volumeL:2400,fuelPerKm:.22,daylightHeatMultiplier:.88}
 };
 function activeTransportIdV104(){
  if(state.gear?.vehicle)return state.logistics?.heavyReady?'truck':'car';
  if(state.gear?.cart)return 'cart';
  return 'foot';
 }
 function transportProfileV104(id=activeTransportIdV104()){
  const base=TRANSPORT_BASE_V104[id]||TRANSPORT_BASE_V104.foot;
  const profile={...base};
  if(id==='car')profile.capacityKg=Math.max(1,Number(state.vehicle?.capacityKg)||base.capacityKg);
  if(id==='truck')profile.capacityKg=Math.max(1200,Number(state.vehicle?.capacityKg)||0);
  profile.acAvailable=!!(state.vehicle?.acActive||state.vehicle?.hasAC);
  profile.daylightHeatMultiplier=profile.acAvailable&&['car','truck'].includes(id)?Math.min(profile.daylightHeatMultiplier,.5):profile.daylightHeatMultiplier;
  return profile;
 }
 function transportFuelForDistanceV104(distanceKm,{roundTrip=false}={}){
  const p=transportProfileV104(),km=Math.max(0,Number(distanceKm)||0)*(roundTrip?2:1);
  return p.fuelPerKm>0?Math.round(km*p.fuelPerKm*100)/100:0;
 }
 function transportCanCarryV104(weightKg=0,volumeL=0){
  const p=transportProfileV104();
  const w=Math.max(0,Number(weightKg)||0),v=Math.max(0,Number(volumeL)||0);
  return {ok:w<=p.capacityKg+1e-6&&v<=p.volumeL+1e-6,weightKg:w,volumeL:v,capacityKg:p.capacityKg,capacityL:p.volumeL,profile:p};
 }
 window.activeTransportIdV104=activeTransportIdV104;
 window.transportProfileV104=transportProfileV104;
 window.transportFuelForDistanceV104=transportFuelForDistanceV104;
 window.transportCanCarryV104=transportCanCarryV104;

 cargoCapacityKg=function(){return transportProfileV104().capacityKg};
 cargoMode=function(){const p=transportProfileV104();return `${p.name} ${p.capacityKg}kg`};
 itineraryModeV27=function(){const id=activeTransportIdV104();return id==='foot'?'foot':id==='cart'?'cart':'vehicle'};
 itinerarySpeedV27=function(){return transportProfileV104().speedKmh};
})();
