// v14.4 Batch J — physical backpack water: 50kg total, 20kg/item, two bottle sizes, liters equal carried water mass.
(function(){
 const WATER_BOTTLES_V115={
  small:{id:'water-small',name:'小瓶水',capacityL:.5,fullWeightKg:.5},
  large:{id:'water-large',name:'大瓶水',capacityL:1,fullWeightKg:1}
 };
 function ensurePhysicalInventoryV115(s=state){
  if(typeof ensureOpeningPhysicalStateV112==='function')ensureOpeningPhysicalStateV112(s);
  s.backpack=s.backpack&&typeof s.backpack==='object'?s.backpack:{};
  s.backpack.capacityKg=50;s.backpack.singleItemLimitKg=20;
  s.backpack.items=Array.isArray(s.backpack.items)?s.backpack.items:[];
  s.shelterStorage=s.shelterStorage&&typeof s.shelterStorage==='object'?s.shelterStorage:{};
  s.shelterStorage.capacityKg=200;s.shelterStorage.items=Array.isArray(s.shelterStorage.items)?s.shelterStorage.items:[];
  recalcPhysicalWeightsV115(s);
  return s;
 }
 function itemWeightKgV115(item){
  if(!item||typeof item!=='object')return 0;
  if(item.kind==='waterBottle')return Math.max(0,Number(item.liters)||0);
  return Math.max(0,Number(item.weightKg)||0);
 }
 function containerWeightV115(items){return Math.round((items||[]).reduce((sum,item)=>sum+itemWeightKgV115(item),0)*1000)/1000}
 function recalcPhysicalWeightsV115(s=state){
  if(!s.backpack||!s.shelterStorage)return s;
  s.backpack.currentKg=containerWeightV115(s.backpack.items);
  s.shelterStorage.currentKg=containerWeightV115(s.shelterStorage.items);
  return s;
 }
 function normalizeWaterBottleV115(size='small',liters=null){
  const def=WATER_BOTTLES_V115[size];if(!def)return null;
  const amount=liters==null?def.capacityL:Math.max(0,Math.min(def.capacityL,Number(liters)||0));
  return {kind:'waterBottle',size,id:def.id,name:def.name,capacityL:def.capacityL,liters:amount,weightKg:amount};
 }
 function backpackAdmissionV115(item,s=state){
  ensurePhysicalInventoryV115(s);const kg=itemWeightKgV115(item);
  if(kg>s.backpack.singleItemLimitKg)return {ok:false,reason:`單件 ${kg} kg，超過背包單件 ${s.backpack.singleItemLimitKg} kg 上限`};
  if(s.backpack.currentKg+kg>s.backpack.capacityKg+1e-9)return {ok:false,reason:`背包剩餘 ${Math.max(0,s.backpack.capacityKg-s.backpack.currentKg).toFixed(1)} kg`};
  return {ok:true,reason:''};
 }
 function addItemToBackpackV115(item,s=state){
  const check=backpackAdmissionV115(item,s);if(!check.ok)return check;
  s.backpack.items.push({...item});recalcPhysicalWeightsV115(s);syncLegacyWaterV115(s);return {ok:true,reason:'',currentKg:s.backpack.currentKg};
 }
 function addWaterBottleV115(size='small',s=state){const bottle=normalizeWaterBottleV115(size);if(!bottle)return {ok:false,reason:'未知水瓶規格'};return addItemToBackpackV115(bottle,s)}
 function backpackWaterLitersV115(s=state){ensurePhysicalInventoryV115(s);return Math.round(s.backpack.items.filter(x=>x?.kind==='waterBottle').reduce((n,x)=>n+(Number(x.liters)||0),0)*1000)/1000}
 function shelterWaterLitersV115(s=state){ensurePhysicalInventoryV115(s);return Math.round(s.shelterStorage.items.filter(x=>x?.kind==='waterBottle').reduce((n,x)=>n+(Number(x.liters)||0),0)*1000)/1000}
 function physicalWaterLitersV115(s=state){return Math.round((backpackWaterLitersV115(s)+shelterWaterLitersV115(s))*1000)/1000}
 function syncLegacyWaterV115(s=state){if(s.flags?.hardFogOpeningV112){s.resources=s.resources||{};s.resources.water=physicalWaterLitersV115(s);s.privatePool=s.privatePool||{};s.privatePool.water=s.resources.water}return s.resources?.water||0}
 function consumeBackpackWaterV115(liters,s=state){
  ensurePhysicalInventoryV115(s);let need=Math.max(0,Number(liters)||0),available=backpackWaterLitersV115(s);if(available+1e-9<need)return {ok:false,consumedL:0,reason:`背包只有 ${available.toFixed(1)} L`};
  const wanted=need;
  for(const item of s.backpack.items){if(need<=1e-9)break;if(item?.kind!=='waterBottle')continue;const take=Math.min(need,Number(item.liters)||0);item.liters=Math.round((item.liters-take)*1000)/1000;item.weightKg=item.liters;need-=take}
  s.backpack.items=s.backpack.items.filter(item=>item?.kind!=='waterBottle'||(Number(item.liters)||0)>1e-9);
  recalcPhysicalWeightsV115(s);syncLegacyWaterV115(s);return {ok:true,consumedL:wanted,remainingL:backpackWaterLitersV115(s),currentKg:s.backpack.currentKg};
 }
 function renderPhysicalBackpackV115(){
  if(!state.flags?.hardFogOpeningV112)return;ensurePhysicalInventoryV115(state);
  const host=document.getElementById('resources');if(!host)return;
  const b=state.backpack,water=backpackWaterLitersV115(state),items=b.items.filter(Boolean);
  let detail='<p class="muted">目前是空的。</p>';
  if(items.length){const rows=[];const small=items.filter(x=>x.kind==='waterBottle'&&x.size==='small'&&x.liters>0),large=items.filter(x=>x.kind==='waterBottle'&&x.size==='large'&&x.liters>0),other=items.filter(x=>x.kind!=='waterBottle');if(small.length)rows.push(`<div class="resource-row"><span>小瓶水</span><b>${small.length} 瓶 · ${small.reduce((n,x)=>n+x.liters,0).toFixed(1)} L</b></div>`);if(large.length)rows.push(`<div class="resource-row"><span>大瓶水</span><b>${large.length} 瓶 · ${large.reduce((n,x)=>n+x.liters,0).toFixed(1)} L</b></div>`);for(const item of other)rows.push(`<div class="resource-row"><span>${item.name||'物品'}</span><b>${itemWeightKgV115(item).toFixed(1)} kg</b></div>`);detail=rows.join('')}
  host.innerHTML=`<div class="card hard-fog-backpack-v112 hard-fog-backpack-v115"><b>背包 ${b.currentKg.toFixed(1)} / ${b.capacityKg} kg</b><small>單件超過 ${b.singleItemLimitKg} kg 的物品不能放入背包。</small>${water>0?`<small>飲用水 ${water.toFixed(1)} L；水量減少時，背包重量同步下降。</small>`:''}${detail}</div>`;
 }
 const originalMakeStateV115=makeState;makeState=function(){const s=originalMakeStateV115();ensurePhysicalInventoryV115(s);return s};
 ensurePhysicalInventoryV115(state);
 const originalRenderV115=render;render=function(){const out=originalRenderV115();if(state.flags?.hardFogOpeningV112)queueMicrotask(renderPhysicalBackpackV115);return out};
 window.WATER_BOTTLES_V115=WATER_BOTTLES_V115;
 window.ensurePhysicalInventoryV115=ensurePhysicalInventoryV115;
 window.itemWeightKgV115=itemWeightKgV115;
 window.recalcPhysicalWeightsV115=recalcPhysicalWeightsV115;
 window.normalizeWaterBottleV115=normalizeWaterBottleV115;
 window.backpackAdmissionV115=backpackAdmissionV115;
 window.addItemToBackpackV115=addItemToBackpackV115;
 window.addWaterBottleV115=addWaterBottleV115;
 window.backpackWaterLitersV115=backpackWaterLitersV115;
 window.physicalWaterLitersV115=physicalWaterLitersV115;
 window.consumeBackpackWaterV115=consumeBackpackWaterV115;
 window.syncLegacyWaterV115=syncLegacyWaterV115;
})();
