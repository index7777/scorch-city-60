/* v14.2.2 QA — field spare accounting corrections */
fieldCargoCapacityV50=function(){
 const t=ensureFieldTeamV43(),members=fieldTeamSizeV43();
 if(t.useVehicle&&state.gear?.vehicle)return Math.max(0,state.logistics?.heavyReady?1200:(ensureVehicleStateV32().capacityKg||700));
 const cart=ensureFieldToolCarryV47().includes('cart')&&state.gear?.cart;return cart?80+Math.max(0,members-1)*18:members*18
};
unpackFieldSpareV50=function(id,count=1){
 const t=ensureFieldTeamV43(),def=FIELD_SPARE_DEFS_V50[id],d=fieldSpareDepotV50();if(!def||t.active)return toast('外勤進行中，不能拆回備件');count=Math.min(Math.max(1,Math.floor(+count||1)),d[id]||0);if(count<=0)return toast('據點沒有這種備件');
 d[id]-=count;const load=fieldSpareLoadV50();load[id]=Math.min(load[id]||0,d[id]||0);for(const [k,v] of Object.entries(def.build))state.resources[k]=(state.resources[k]||0)+v*count;log(`拆回 ${def.label} ×${count} 至中央散裝資源。`);renderMap();saveGame(false)
};
