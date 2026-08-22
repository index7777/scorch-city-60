// v14.3 Batch D — authoritative large-object hauling: capacity, crew, fuel, time and Day 30 cooling.
(function(){
 function haulTransportProfileV106(asset){
  const active=typeof activeTransportIdV104==='function'?activeTransportIdV104():'foot';
  return transportProfileV104(active);
 }
 function haulRouteV106(asset){
  const st=state.assets?.[asset?.id];if(!asset||!st)return null;
  const from=state.day>=30&&state.base?.ventilation>0?'vent':'base',to=st.location;
  if(!to||to===from)return {path:[from],distance:0,heat:0};
  return typeof routeBetweenV27==='function'?routeBetweenV27(from,to,state.mapPlanner?.routeMode||'fastest'):null;
 }
 function haulCrewRequiredV106(asset,profile){
  const w=Math.max(0,Number(asset?.weight)||0);
  if(profile.id==='truck')return 1;
  if(profile.id==='car')return Math.max(1,Math.ceil(w/400));
  if(profile.id==='cart')return Math.max(1,Math.ceil(w/100));
  return Math.max(1,Math.ceil(w/40));
 }
 function haulEstimateV106(asset){
  const p=haulTransportProfileV106(asset),route=haulRouteV106(asset),weight=Math.max(0,Number(asset?.weight)||0),volume=typeof assetVolumeV105==='function'?assetVolumeV105(asset):Math.round(weight*1.8);
  const crewRequired=haulCrewRequiredV106(asset,p),crewAvailable=Math.max(1,Number(state.base?.population)||1),distance=route?Math.max(0,Number(route.distance)||0):Infinity;
  const travel=Number.isFinite(distance)?distance*2/Math.max(.1,p.speedKmh):Infinity;
  const handling=Math.max(.5,Math.round((.45+weight/(p.id==='truck'?900:p.id==='car'?650:p.id==='cart'?220:90))*10)/10);
  const totalHours=Number.isFinite(travel)?Math.round((travel+handling)*10)/10:Infinity;
  const fuelL=p.fuelPerKm>0&&Number.isFinite(distance)?Math.round((distance*2*p.fuelPerKm+weight/2500)*100)/100:0;
  const heatFactor=Math.max(.35,Number(p.daylightHeatMultiplier)||1);
  const coolingKWh=state.day>=30&&!state.base?.core&&Number.isFinite(totalHours)?Math.max(1,Math.ceil((totalHours*.55+weight/500)*heatFactor)):0;
  const issues=[];
  if(!route)issues.push('目前道路情報下沒有可行搬運路線');
  if(asset?.need==='vehicle'&&!['car','truck'].includes(p.id))issues.push('此設備需要車輛');
  if(asset?.need==='cart'&&p.id==='foot')issues.push('此設備至少需要推車');
  if(weight>p.capacityKg+1e-6)issues.push(`重量超過${p.name}上限 ${p.capacityKg}kg`);
  if(volume>p.volumeL+1e-6)issues.push(`體積超過${p.name}上限 ${p.volumeL}L`);
  if(crewAvailable<crewRequired)issues.push(`搬運至少需要 ${crewRequired} 人，目前只有 ${crewAvailable} 人可用`);
  return {ok:issues.length===0,issues,transport:p,route,distance,weightKg:weight,volumeL:volume,crewRequired,crewAvailable,totalHours,fuelL,coolingKWh};
 }
 window.haulEstimateV106=haulEstimateV106;

 canTransportAsset=function(a){return haulEstimateV106(a).ok};
 transportTime=function(a){return haulEstimateV106(a).totalHours};
 transportBatteryCost=function(a){return haulEstimateV106(a).coolingKWh};
 transportRequirement=function(a){
  const e=haulEstimateV106(a),own=state.assets[a.id]?.owner,o=own&&own!=='world'&&own!=='player'?`｜目前由 ${ownerLabel(own)} 控制`:'';
  return `${e.transport.name}｜${e.weightKg}kg / ${e.volumeL}L｜${e.crewRequired} 人${o}`;
 };
 transportAsset=function(id){
  const a=assetDefs.find(x=>x.id===id),st=state.assets[id];if(!a||!st||!st.discovered||st.transported)return;
  if(st.owner!=='world'&&st.owner!=='player')return toast('這件設備目前由其他倖存者控制，先交換或截胡');
  const e=haulEstimateV106(a);if(!e.ok)return toast(e.issues[0]);
  if(state.day<30){if(state.phase!=='night')return toast('白晝無法安全搬運');if(state.hoursLeft+1e-6<e.totalHours)return toast(`夜晚剩餘時間不足，需要 ${e.totalHours}h`)}
  else{if(!state.gear?.coolingPack&&!state.base?.core)return toast('永晝搬運需要主動冷卻');if((Number(state.resources?.battery)||0)+1e-6<e.coolingKWh)return toast(`搬運所需電力不足，需要 ${e.coolingKWh}kWh`)}
  if((Number(state.resources?.fuel)||0)+1e-6<e.fuelL)return toast(`燃料不足，需要 ${e.fuelL.toFixed(2)}L`);
  if(state.day<30)state.hoursLeft=Math.max(0,Math.round((state.hoursLeft-e.totalHours)*10)/10);else state.resources.battery=Math.max(0,(Number(state.resources.battery)||0)-e.coolingKWh);
  if(e.fuelL>0)state.resources.fuel=Math.max(0,(Number(state.resources.fuel)||0)-e.fuelL);
  st.transported=true;st.location='vent';st.owner='player';state.logistics.moved++;applyAssetEffect(a);
  log(`已將${a.name}搬回中央站／基地：${e.transport.name}、${e.crewRequired} 人、${e.totalHours}h${e.fuelL?`、燃料 ${e.fuelL.toFixed(2)}L`:''}${e.coolingKWh?`、冷卻 ${e.coolingKWh}kWh`:''}。`,'good');
  render();openLogistics();saveGame(false);
 };

 const originalOpenLogisticsV106=openLogistics;
 openLogistics=function(){
  originalOpenLogisticsV106();
  const discovered=assetDefs.filter(a=>state.assets[a.id].discovered||state.assets[a.id].transported),rows=[...document.querySelectorAll('#logisticsContent .asset-row')];
  rows.forEach((row,i)=>{const a=discovered[i],st=a&&state.assets[a.id];if(!a||!st||st.transported)return;const e=haulEstimateV106(a);let box=row.querySelector('.haul-estimate-v106');if(!box){box=document.createElement('div');box.className='haul-estimate-v106';row.appendChild(box)}box.innerHTML=`<small>${e.transport.name} · 容積 ${e.volumeL}/${e.transport.volumeL}L · 人力 ${e.crewRequired}/${e.crewAvailable} · ${Number.isFinite(e.totalHours)?e.totalHours+'h':'無路線'}${e.fuelL?` · 燃料 ${e.fuelL.toFixed(2)}L`:''}${e.coolingKWh?` · 冷卻 ${e.coolingKWh}kWh`:''}</small>${e.issues.length?`<div class="action-warning">${e.issues.join('；')}</div>`:''}`});
 };
})();
