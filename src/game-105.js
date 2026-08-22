// v14.3 Batch D — make expedition planning/execution consume the authoritative transport profile.
(function(){
 const ASSET_VOLUME_L_V105={generator:650,ibc:1150,compressorA:900,compressorB:850,chiller:1500,pump:260,inverter:380,lift:1300,drum200:240,fireTank:1700};
 function transportProfileForModeV105(mode){
  const id=mode==='vehicle'?(state.logistics?.heavyReady?'truck':'car'):mode==='cart'?'cart':'foot';
  return transportProfileV104(id);
 }
 function assetVolumeV105(asset){return asset?Math.max(0,Number(asset.volumeL??ASSET_VOLUME_L_V105[asset.id]??asset.weight*1.8)||0):0}
 function expeditionSupplyVolumeV105(water,battery,useToolkit){
  return Math.round((Math.max(0,Number(water)||0)+Math.max(0,Number(battery)||0)*1.2+(useToolkit?18:0))*10)/10;
 }
 window.transportProfileForModeV105=transportProfileForModeV105;
 window.assetVolumeV105=assetVolumeV105;
 window.expeditionSupplyVolumeV105=expeditionSupplyVolumeV105;

 transportCapacityFor=function(mode){return transportProfileForModeV105(mode).capacityKg};
 availableTransportModes=function(){
  const out=[['foot','徒手',transportProfileV104('foot').capacityKg]];
  if(state.gear?.cart)out.push(['cart','推車',transportProfileV104('cart').capacityKg]);
  if(state.gear?.vehicle){const p=transportProfileForModeV105('vehicle');out.push(['vehicle',p.id==='truck'?'工程車＋液壓平台':'工程車',p.capacityKg])}
  return out;
 };

 expeditionEstimate=function(loc,mode,water,battery,useToolkit,assetId){
  const route=computeMapRoute(loc.id,state.mapPlanner?.routeMode||'fastest'),dist=route?.distance??routeDistanceKm(loc),p=transportProfileForModeV105(mode);
  const travel=dist*2/Math.max(.1,p.speedKmh),toolBonus=useToolkit&&state.gear.toolkit?.45:0;
  const search=Math.max(.5,timeCostFor(loc)-toolBonus),asset=assetId?assetDefs.find(a=>a.id===assetId):null;
  const handling=asset?(p.id==='truck'?1:asset.need==='vehicle'?1.25:.6):0,total=Math.round((travel+search+handling)*10)/10;
  const heatFactor=Math.max(.35,Number(p.daylightHeatMultiplier)||1);
  const waterNeed=Math.round(Math.max(.5,(total*.28+loc.risk*.12)*heatFactor)*10)/10;
  const routeCooling=route?.cooling??coolingCost(loc),batteryNeed=state.day>=30?Math.max(1,Math.ceil((routeCooling*.72+total*.45+(asset?asset.weight/400:0))*heatFactor)):0;
  const fuelNeed=p.fuelPerKm>0?Math.max(.1,Math.round((dist*2*p.fuelPerKm+(asset?asset.weight/2500:0))*100)/100):0;
  const supplyWeight=Math.round((water+(battery*.8)+(useToolkit?6:0))*10)/10,assetWeight=asset?asset.weight:0;
  const supplyVolume=expeditionSupplyVolumeV105(water,battery,useToolkit),assetVolume=assetVolumeV105(asset);
  const returnCap=Math.max(0,Math.round((p.capacityKg-supplyWeight-assetWeight)*10)/10),returnVolume=Math.max(0,Math.round((p.volumeL-supplyVolume-assetVolume)*10)/10);
  const carry=transportCanCarryV104.call(null,supplyWeight+assetWeight,supplyVolume+assetVolume);
  // transportCanCarryV104 uses active transport; replace the decision with the selected planning profile.
  carry.ok=supplyWeight+assetWeight<=p.capacityKg+1e-6&&supplyVolume+assetVolume<=p.volumeL+1e-6;
  carry.capacityKg=p.capacityKg;carry.capacityL=p.volumeL;carry.profile=p;
  return {dist,cap:p.capacityKg,capacityL:p.volumeL,total,waterNeed,batteryNeed,fuelNeed,supplyWeight,supplyVolume,asset,assetWeight,assetVolume,returnCap,returnVolume,route,routePath:route?.path||[],transport:p,carry};
 };

 const originalActionIssuesV105=actionIssues;
 actionIssues=function(loc,e){
  const issues=originalActionIssuesV105(loc,e).filter(x=>x!=='補給＋大型設備已超過載重');
  if(e.carry&&!e.carry.ok){
   if(e.supplyWeight+e.assetWeight>e.cap+1e-6)issues.push(`重量超過${e.transport.name}上限 ${e.cap}kg`);
   if(e.supplyVolume+e.assetVolume>e.capacityL+1e-6)issues.push(`體積超過${e.transport.name}上限 ${e.capacityL}L`);
  }
  return [...new Set(issues)];
 };
})();
