/* v14.2.2 QA — cargo stow execution accounting corrections */
function actualCargoHandlingHoursV57(stop){
 if(!stop)return 0;const loads=actualZoneLoadsV56(),snap=dynamicCargoSnapshotV52();let h=actualCargoAccessHoursV56(stop);
 if(stop.action==='search'){
  let kg=0,freeKg=snap.free,freeL=snap.freeVolumeL;const shadow=JSON.parse(JSON.stringify(loads));
  for(const k of RES_ORDER){const av=Math.max(0,+state.locations?.[stop.location]?.remaining?.[k]||0);if(av<=0||freeKg<=.05||freeL<=.05)continue;const w=RES_WEIGHT[k]||1,v=FIELD_RESOURCE_VOLUME_L_V54[k]||Math.max(.1,w*1.15),globalMax=Math.max(0,Math.floor(Math.min(freeKg/w,freeL/v)));if(globalMax<=0)continue;const p=packResourceIntoZonesV56(shadow,k,Math.min(av,globalMax));if(p.packed){const add=p.packed*w,vol=p.packed*v;kg+=add;freeKg-=add;freeL-=vol}}
  if(kg>0)h+=.05+Math.min(.28,kg/500*.22)
 }
 if(stop.action==='asset'){
  const a=assetAtStopV46(stop);if(a){const c=ensureActualZoneStateV56();if(!c.assets.includes(a.id))h+=.06+Math.min(.28,a.weight/900*.24)}
 }
 return Math.max(0,h)
}
cargoExtraHoursV56=function(stop){if(!stop)return 0;if(ensureFieldTeamV43().active)return actualCargoHandlingHoursV57(stop);const row=simulateCargoLayoutV56().rows.find(r=>r.stop===stop);return Math.max(0,+row?.handlingHours||0)};

/* Planning fuel now reflects the heaviest / most imbalanced planned return load instead of assuming an empty truck. */
vehicleDriveCostV32=function(distance,hours,opts={}){
 const c=_vehicleDriveCostV56(distance,hours,opts),t=ensureFieldTeamV43();if(!(t.useVehicle&&state.gear?.vehicle))return c;
 let loadRatio=0,offset=0;
 if(t.active){const snap=dynamicCargoSnapshotV52();loadRatio=clamp(snap.used/Math.max(1,snap.capacity),0,1);offset=snap.balance?.offset||0}
 else{const sim=simulateCargoLayoutV56();loadRatio=clamp(sim.maxUsed/Math.max(1,sim.capacity),0,1);offset=Math.max(sim.balance?.offset||0,...(sim.rows||[]).map(r=>r.balance?.offset||0))}
 const factor=1+loadRatio*.055+offset*.16;return {...c,fuelL:c.fuelL*factor,cargoFactor:factor}
};
