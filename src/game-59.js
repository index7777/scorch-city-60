/* v14.2.2 QA — cargo securing durability conservation / deterministic cleanup */
const _ensureCargoSecureV59=ensureCargoSecureV58;
ensureCargoSecureV58=function(){
 const s=_ensureCargoSecureV59(),v=ensureVehicleStateV32(),rig=v.cargoRig;
 if(rig){
  const q=Number(rig.strapCondition);rig.strapCondition=clamp(Number.isFinite(q)?q:100,0,100);
  const x=Number(rig.shockExposure);rig.shockExposure=Math.max(0,Number.isFinite(x)?x:0)
 }
 return s
};
/* All cargo shifts are chosen by deterministicShiftZoneV58; no random branch participates in shock resolution. */
shiftedZoneV58=function(zone){return deterministicShiftZoneV58(zone,0)};
