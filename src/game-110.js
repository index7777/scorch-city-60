// v14.3 Batch F — canonical resident read models + one final UI refresh boundary.
(function(){
 function residentWaterReadV110(){
  const a=typeof ensureWaterAllocationV97==='function'?ensureWaterAllocationV97():{drinkingPool:Math.max(0,Number(state.resources?.water)||0),coolingPool:0,emergencyCoolingFromDrinking:false};
  const need=Math.max(1,typeof dailyWaterNeed==='function'?Number(dailyWaterNeed())||1:1);
  return {totalL:Math.max(0,Number(state.resources?.water)||0),drinkingL:Math.max(0,Number(a.drinkingPool)||0),coolingL:Math.max(0,Number(a.coolingPool)||0),emergency:!!a.emergencyCoolingFromDrinking,drinkingDays:Math.max(0,(Number(a.drinkingPool)||0)/need),dailyNeedL:need};
 }
 function residentElectricityReadV110(){
  const e=typeof ensureResidentElectricityV100==='function'?ensureResidentElectricityV100():(state.electricity||{});
  const tools=Object.entries(e.tools||{}).map(([id,t])=>{t=t||{};const charge=Math.max(0,Number(t.chargeKWh)||0),capacity=Math.max(0,Number(t.capacityKWh)||0),draw=Math.max(0,Number(t.drawKW)||0);return {id,name:String(t.name||id),chargeKWh:charge,capacityKWh:capacity,drawKW:draw,maxChargeKW:Math.max(0,Number(t.maxChargeKW)||0),runtimeHours:draw>0?charge/draw:null}});
  let cooling=null;
  if(typeof residentCoolingEquipmentV102==='function'){
   const c=residentCoolingEquipmentV102();if(c){const charge=Math.max(0,Number(c.battery?.chargeKWh)||0),capacity=Math.max(0,Number(c.battery?.capacityKWh)||0);cooling={id:c.id||'coolpack',name:c.name||'主動製冷背包',chargeKWh:charge,capacityKWh:capacity,runtimeHours:typeof residentCoolingRuntimeV102==='function'?residentCoolingRuntimeV102(c):null}}
  }
  return {bankKWh:Math.max(0,Number(e.batteryKWh)||0),bankCapacityKWh:Math.max(0,Number(e.capacityKWh)||0),shelterOutputKW:Math.max(0,Number(e.shelterOutputKW)||0),tools,cooling};
 }
 function residentTransportReadV110(){
  const id=typeof activeTransportIdV104==='function'?activeTransportIdV104():'foot',p=typeof transportProfileV104==='function'?transportProfileV104(id):{id,name:'徒手',speedKmh:0,capacityKg:0,volumeL:0,fuelPerKm:0,acAvailable:false,daylightHeatMultiplier:1};
  return {...p,fuelL:Math.max(0,Number(state.resources?.fuel)||0)};
 }
 function residentKnowledgeReadV110(){
  const k=state.knowledge||{},entries=Array.isArray(k.entries)?k.entries:[];
  return {broadcast:entries.filter(x=>x.type==='broadcast').length,observed:entries.filter(x=>x.type==='observed').length,rumor:entries.filter(x=>x.type==='rumor').length,contacts:Array.isArray(k.contacts)?k.contacts.length:0};
 }
 function residentReadModelV110(){return {day:Number(state.day)||1,phase:state.phase,player:{...(state.player||{})},water:residentWaterReadV110(),electricity:residentElectricityReadV110(),transport:residentTransportReadV110(),knowledge:residentKnowledgeReadV110()}}
 function renderAuthoritativeElectricityV110(){
  const host=document.getElementById('electricityContent');if(!host)return;
  const e=residentElectricityReadV110(),toolRows=e.tools.map(t=>`<div class="card"><b>${t.name}</b><div class="muted">工具電池 ${t.chargeKWh.toFixed(2)} / ${t.capacityKWh.toFixed(2)} kWh · 可用 ${Number.isFinite(t.runtimeHours)?t.runtimeHours.toFixed(1)+'h':'—'}</div><div>運轉 ${t.drawKW.toFixed(2)} kW · 最大充電 ${t.maxChargeKW.toFixed(2)} kW</div></div>`).join('')||'<div class="muted">目前沒有登記需要充電的工具。</div>';
  const cooling=e.cooling?`<div class="card"><b>${e.cooling.name}</b><div class="muted">實際裝備電池 ${e.cooling.chargeKWh.toFixed(2)} / ${e.cooling.capacityKWh.toFixed(2)} kWh · 可用 ${Number.isFinite(e.cooling.runtimeHours)?e.cooling.runtimeHours.toFixed(1)+'h':'—'}</div></div>`:'';
  host.innerHTML=`<section><h3>你的電池</h3><div class="meta-grid"><div><span>目前儲能</span><b>${e.bankKWh.toFixed(2)} kWh</b></div><div><span>耐熱屋輸出</span><b>${e.shelterOutputKW.toFixed(2)} kW</b></div></div><p class="muted">工具電池、製冷背包與居民儲能分開計算；這裡只讀取實際權威電量。</p><h3>需要電的工具</h3><div class="card-list">${toolRows}${cooling}</div></section>`;
 }
 function renderResidentWaterTruthV110(){
  const card=document.querySelector('#residentHud .player-card');if(!card)return;const w=residentWaterReadV110();
  let box=card.querySelector('.water-truth-v110');if(!box){box=document.createElement('div');box.className='water-truth-v110';card.appendChild(box)}
  box.innerHTML=`<small>飲用水可撐約 <b>${w.drinkingDays.toFixed(1)} 天</b> · 飲用 ${w.drinkingL.toFixed(1)}L · 降溫預留 ${w.coolingL.toFixed(1)}L</small>`;
 }
 function residentUiRefreshV110(){
  renderResidentWaterTruthV110();
  if(document.getElementById('electricityDialog')?.open)renderAuthoritativeElectricityV110();
  if(document.getElementById('vehicleDialog')?.open&&typeof renderAuthoritativeVehiclePanelV107==='function')renderAuthoritativeVehiclePanelV107();
  if(typeof decorateDisabledActionsV108==='function')decorateDisabledActionsV108(document);
  if(typeof decorateKnowledgeSourceIconsV109==='function')decorateKnowledgeSourceIconsV109(document);
 }
 window.ResidentSystemsV110={read:residentReadModelV110,water:residentWaterReadV110,electricity:residentElectricityReadV110,transport:residentTransportReadV110,knowledge:residentKnowledgeReadV110,refresh:residentUiRefreshV110};
 window.residentReadModelV110=residentReadModelV110;
 window.renderAuthoritativeElectricityV110=renderAuthoritativeElectricityV110;
 window.residentUiRefreshV110=residentUiRefreshV110;
 const originalRenderV110=render;
 render=function(){const out=originalRenderV110();queueMicrotask(residentUiRefreshV110);return out};
 document.addEventListener('click',()=>queueMicrotask(residentUiRefreshV110),true);
 queueMicrotask(residentUiRefreshV110);
})();
