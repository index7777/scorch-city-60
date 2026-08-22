// v14.3 Batch B — make the cooling-water reserve a real, explicit resident survival resource.
(function(){
 function residentCoolingWaterStateV98(liters=1){
  const need=Math.max(.1,Number(liters)||1),a=ensureWaterAllocationV97();
  const emergency=!!a.emergencyCoolingFromDrinking;
  const available=a.coolingPool+(emergency?a.drinkingPool:0);
  return {need,a,emergency,available,ok:available+1e-6>=need};
 }
 function useResidentCoolingWaterV98(liters=1){
  const s=residentCoolingWaterStateV98(liters),p=state.player||{};
  if(p.dead)return {ok:false,reason:'resident-dead'};
  if(!s.ok){
   const reason=s.emergency
    ?`可用降溫水不足：需要 ${s.need.toFixed(1)}L，目前只有 ${s.available.toFixed(1)}L。`
    :`降溫預留不足：需要 ${s.need.toFixed(1)}L。先分配降溫用水；若真的要動飲用水，必須明確開啟緊急挪用。`;
   if(typeof toast==='function')toast(reason);
   return {ok:false,reason:'insufficient-cooling-water',message:reason};
  }
  const result=consumeCoolingWaterV97(s.need,{allowEmergency:true,label:'緊急降溫'});
  if(!result.ok)return result;
  p.heat=clamp((Number(p.heat)||0)-28*s.need,0,100);
  p.bodyTemp=clamp((Number(p.bodyTemp)||36.5)-.45*s.need,34,43);
  if(typeof log==='function')log(`你用 ${s.need.toFixed(1)}L 水做緊急降溫；熱累積降到 ${Math.round(p.heat)}%，體溫 ${p.bodyTemp.toFixed(1)}°C。`,'good');
  if(typeof residentDeathCheckV94==='function')residentDeathCheckV94();
  if(typeof render==='function')render();
  if(typeof saveGame==='function')saveGame(false);
  return {...result,heat:p.heat,bodyTemp:p.bodyTemp};
 }
 function renderResidentCoolingWaterV98(){
  const box=document.querySelector('#residentHud .water-allocation-v97');if(!box)return;
  let row=box.querySelector('.resident-water-cooling-v98');if(!row){row=document.createElement('div');row.className='resident-water-cooling-v98';box.appendChild(row)}
  const s=residentCoolingWaterStateV98(1),p=state.player||{};
  const hot=(Number(p.heat)||0)>=15||(Number(p.bodyTemp)||36.5)>=37.5;
  const reason=s.ok?'':(s.emergency?'可用水不足':'降溫預留不足；不會自動吃飲用水');
  row.innerHTML=`<button id="residentWaterCoolingBtn" class="mini secondary" ${!s.ok||p.dead?'disabled':''}>用 1L 水緊急降溫</button><small>${hot?'目前有熱累積。':'目前熱負荷不高；你仍可手動使用。'}${reason?` · ${reason}`:''}</small>`;
  const b=row.querySelector('#residentWaterCoolingBtn');if(b&&!b.disabled)b.onclick=()=>useResidentCoolingWaterV98(1);
 }
 window.residentCoolingWaterStateV98=residentCoolingWaterStateV98;
 window.useResidentCoolingWaterV98=useResidentCoolingWaterV98;
 const originalRenderV98=render;
 render=function(){const out=originalRenderV98();renderResidentCoolingWaterV98();return out};
 renderResidentCoolingWaterV98();
})();
