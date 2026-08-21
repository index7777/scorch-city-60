/* v14.2.2 QA — cargo securing durability conservation / deterministic cleanup */
ensureCargoSecureV58=function(){
 const t=ensureFieldTeamV43(),v=ensureVehicleStateV32();
 t.cargoSecure=t.cargoSecure||{schema:1,assetModes:{},assetQuality:{},pendingRefix:null,history:[]};
 t.cargoSecure.schema=1;t.cargoSecure.assetModes=t.cargoSecure.assetModes||{};t.cargoSecure.assetQuality=t.cargoSecure.assetQuality||{};t.cargoSecure.history=Array.isArray(t.cargoSecure.history)?t.cargoSecure.history:[];
 v.cargoRig=v.cargoRig||{schema:1,strapSets:state.logistics?.heavyReady?6:4,strapCondition:100,shockExposure:0,lastShock:null};
 const rig=v.cargoRig;rig.schema=1;rig.strapSets=Math.max(state.logistics?.heavyReady?6:4,Math.floor(Number.isFinite(Number(rig.strapSets))?Number(rig.strapSets):0));
 const q=Number(rig.strapCondition);rig.strapCondition=clamp(Number.isFinite(q)?q:100,0,100);const x=Number(rig.shockExposure);rig.shockExposure=Math.max(0,Number.isFinite(x)?x:0);
 return t.cargoSecure
};
/* All cargo shifts are chosen deterministically; no random branch participates in shock resolution. */
shiftedZoneV58=function(zone){return deterministicShiftZoneV58(zone,0)};
