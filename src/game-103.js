// v14.3 Batch C — prevent the 0.25 kW shelter source from being counted twice when equipment is charging.
(function(){
 function shelterChargeSnapshotV103(){
  if(typeof ensurePowerStateV24==='function')ensurePowerStateV24();
  const ids=(state.powerLogistics?.charging||[]).filter(q=>q.sourceId==='heatHouse').map(q=>q.equipmentId);
  const charges={};
  for(const id of ids)charges[id]=Math.max(0,Number(state.equipmentInstances?.[id]?.battery?.chargeKWh)||0);
  return {ids,charges,bank:Math.max(0,Number(ensureResidentElectricityV100().batteryKWh)||0)};
 }
 function reconcileShelterOutputV103(before){
  const e=ensureResidentElectricityV100();
  const bankAfter=Math.max(0,Number(e.batteryKWh)||0),bankGain=Math.max(0,bankAfter-before.bank);
  if(bankGain<=1e-9||!before.ids.length)return {equipmentStored:0,sourceInput:0,bankAdjusted:0};
  let stored=0;
  for(const id of before.ids){
   const prev=Math.max(0,Number(before.charges[id])||0),now=Math.max(0,Number(state.equipmentInstances?.[id]?.battery?.chargeKWh)||0);
   if(now>prev)stored+=now-prev;
  }
  if(stored<=1e-9)return {equipmentStored:0,sourceInput:0,bankAdjusted:0};
  const efficiency=Math.max(.01,Number(typeof sourceStateV24==='function'?sourceStateV24().heatHouse?.efficiency:POWER_SOURCE_TYPES_V24?.heatHouse?.efficiency)||.88);
  const sourceInput=stored/efficiency,adjust=Math.min(bankGain,sourceInput);
  if(adjust>0)e.batteryKWh=Math.max(0,bankAfter-adjust);
  return {equipmentStored:stored,sourceInput,bankAdjusted:adjust};
 }
 window.shelterChargeSnapshotV103=shelterChargeSnapshotV103;
 window.reconcileShelterOutputV103=reconcileShelterOutputV103;

 const originalSpendWorldTimeV103=spendWorldTimeV26;
 spendWorldTimeV26=function(hours,opts={}){
  const before=shelterChargeSnapshotV103();
  const out=originalSpendWorldTimeV103(hours,opts);
  if(out)reconcileShelterOutputV103(before);
  return out;
 };

 const originalAdvanceV103=advance;
 advance=function(){
  const before=shelterChargeSnapshotV103();
  const out=originalAdvanceV103();
  reconcileShelterOutputV103(before);
  return out;
 };
})();
