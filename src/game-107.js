// v14.3 Batch D/F — vehicle panel reads from the authoritative transport model; central lifecycle owns refresh timing.
(function(){
 function ownedTransportStateV107(){
  const ids=new Set(['foot']);
  if(state.gear?.cart||state.cart===true||state.hasCart===true)ids.add('cart');
  if(state.gear?.vehicle||state.car===true||state.hasCar===true||state.truck===true||state.hasTruck===true)ids.add(state.logistics?.heavyReady?'truck':'car');
  return ids;
 }
 function transportPanelCardV107(id,owned){
  const p=transportProfileV104(id),fuel=Math.max(0,Number(state.resources?.fuel)||0);
  const fuelText=p.fuelPerKm>0?`${p.fuelPerKm.toFixed(2)} L/km · 庫存 ${fuel.toFixed(1)}L`:'不需要';
  const acText=['car','truck'].includes(id)?(p.acAvailable?'可用':'不可用'):'無';
  const daylight=`${Math.round((Number(p.daylightHeatMultiplier)||1)*100)}% 熱負荷`;
  return `<div class="card"><b>${p.name}</b><div>${owned?'目前可用':'尚未取得'}</div><div class="meta-grid"><div><span>速度</span><b>${p.speedKmh.toFixed(1)} km/h</b></div><div><span>重量上限</span><b>${p.capacityKg} kg</b></div><div><span>容積上限</span><b>${p.volumeL} L</b></div><div><span>燃料</span><b>${fuelText}</b></div><div><span>冷氣</span><b>${acText}</b></div><div><span>白晝熱負荷</span><b>${daylight}</b></div></div></div>`;
 }
 function renderAuthoritativeVehiclePanelV107(){
  const host=document.getElementById('vehicleContent');if(!host)return;
  const owned=ownedTransportStateV107(),active=typeof activeTransportIdV104==='function'?activeTransportIdV104():'foot';
  host.innerHTML=`<section><p class="muted">速度、重量、容積、燃料與白晝熱負荷都直接使用目前遠征／搬運的權威運輸模型。</p><div class="summary-card"><b>目前採用：${transportProfileV104(active).name}</b><p>遠征估算與大型設備搬運會使用同一份數值。</p></div><div class="card-list">${['foot','cart','car','truck'].map(id=>transportPanelCardV107(id,owned.has(id))).join('')}</div></section>`;
 }
 function bindAuthoritativeVehiclePanelV107(){
  const btn=document.getElementById('vehicleBtn');
  if(btn&&!btn.dataset.boundV107){btn.dataset.boundV107='1';btn.addEventListener('click',()=>setTimeout(renderAuthoritativeVehiclePanelV107,0))}
 }
 window.renderAuthoritativeVehiclePanelV107=renderAuthoritativeVehiclePanelV107;
 window.bindAuthoritativeVehiclePanelV107=bindAuthoritativeVehiclePanelV107;
 bindAuthoritativeVehiclePanelV107();
})();
