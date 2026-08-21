/* v14.2.2 QA — rescue loan safe-zone consumption correction */
updateLoanedEquipmentV24=function(){
 ensurePowerStateV24();
 for(const e of Object.values(state.equipmentInstances)){
  if(!e.holder||e.holder==='player'||!state.npcs[e.holder])continue;
  const n=state.npcs[e.holder];e.location=n.location;
  if(!n.alive){e.assignedUsers=[];e.holder=null;e.loan=e.loan?{...e.loan,state:'dropped',dropDay:state.day,dropLocation:n.location}:null;log(`${equipmentNameV24(e)}留在${locationLabelV24(n.location)}，沒有自動回到你的庫存。`,'major');continue}
  const rescue=npcRescueStateV29(e.holder),safe=rescue?.status==='rescued'&&locationSafeCoolingV29(n.location);
  if(safe)continue;
  const useHours=state.day>=30?4:Math.min(4,nightHours(state.day)*.55);drainEquipmentV24(e,useHours,'normal');
 }
};
