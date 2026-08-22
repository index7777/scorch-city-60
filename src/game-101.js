// v14.3 Batch C — chargeable tool batteries, runtime and no-power operation failures.
(function(){
 function ensureResidentToolV101(id,spec={}){
  const e=ensureResidentElectricityV100();
  const prev=e.tools[id]&&typeof e.tools[id]==='object'?e.tools[id]:{};
  const capacity=Math.max(.01,Number(spec.capacityKWh??prev.capacityKWh??1)||1);
  const charge=clamp(Number(spec.chargeKWh??prev.chargeKWh??0)||0,0,capacity);
  const draw=Math.max(0,Number(spec.drawKW??spec.powerKW??prev.drawKW??prev.powerKW??0)||0);
  const maxCharge=Math.max(.01,Number(spec.maxChargeKW??prev.maxChargeKW??Math.min(.25,capacity))||.25);
  e.tools[id]={...prev,...spec,id,name:String(spec.name??prev.name??id),capacityKWh:capacity,chargeKWh:charge,drawKW:draw,maxChargeKW:maxCharge};
  return e.tools[id];
 }
 function residentToolRuntimeV101(id){
  const t=ensureResidentElectricityV100().tools?.[id];if(!t)return 0;
  const draw=Math.max(0,Number(t.drawKW??t.powerKW)||0);
  return draw>0?Math.max(0,Number(t.chargeKWh)||0)/draw:Infinity;
 }
 function chargeResidentToolV101(id,hours=1){
  const t=ensureResidentElectricityV100().tools?.[id];
  if(!t)return {ok:false,reason:'unknown-tool',message:'未登記的電動工具'};
  const h=Math.max(0,Number(hours)||0),capacity=Math.max(.01,Number(t.capacityKWh)||1),before=clamp(Number(t.chargeKWh)||0,0,capacity);
  const room=Math.max(0,capacity-before),transfer=Math.min(room,Math.max(.01,Number(t.maxChargeKW)||.25)*h);
  if(transfer<=1e-6)return {ok:true,stored:0,used:0,chargeKWh:before,full:true};
  const available=residentEnergyAvailableV100();
  if(available<=1e-6){const message=`${t.name||id}無法充電：你的電池沒有可用電力。`;if(typeof toast==='function')toast(message);return {ok:false,reason:'no-energy',message,stored:0,used:0,chargeKWh:before}}
  const used=Math.min(transfer,available),r=consumeResidentEnergyV100(used,{label:`替${t.name||id}充電`,silent:true});
  if(!r.ok)return {...r,stored:0,chargeKWh:before};
  t.chargeKWh=clamp(before+used,0,capacity);t.charging=used>0;t.lastChargeHours=h;t.lastChargeKWh=used;
  return {ok:true,stored:used,used,chargeKWh:t.chargeKWh,full:t.chargeKWh>=capacity-1e-6};
 }
 function useResidentToolV101(id,hours=1){
  const t=ensureResidentElectricityV100().tools?.[id];
  if(!t)return {ok:false,reason:'unknown-tool',message:'未登記的電動工具'};
  const h=Math.max(0,Number(hours)||0),draw=Math.max(0,Number(t.drawKW??t.powerKW)||0),need=draw*h,charge=Math.max(0,Number(t.chargeKWh)||0);
  if(charge+1e-6<need){
   const message=`${t.name||id}需要 ${need.toFixed(2)} kWh，但工具電池只有 ${charge.toFixed(2)} kWh。`;
   t.powered=false;if(typeof toast==='function')toast(message);
   return {ok:false,reason:'tool-battery-empty',message,used:0,remaining:charge,shortfall:need-charge};
  }
  t.chargeKWh=Math.max(0,charge-need);t.powered=true;t.charging=false;t.lastUseHours=h;t.lastEnergyKWh=need;
  return {ok:true,used:need,remaining:t.chargeKWh,runtimeHours:residentToolRuntimeV101(id)};
 }
 function renderResidentToolPowerV101(){
  const host=document.getElementById('electricityContent');if(!host)return;
  let box=host.querySelector('.resident-tool-power-v101');if(!box){box=document.createElement('section');box.className='resident-tool-power-v101';host.appendChild(box)}
  const tools=Object.values(ensureResidentElectricityV100().tools||{});
  box.innerHTML=`<h3>工具電池</h3>${tools.length?tools.map(t=>{const run=residentToolRuntimeV101(t.id);return `<div class="card"><b>${t.name||t.id}</b><div>工具電池 ${(Number(t.chargeKWh)||0).toFixed(2)} / ${(Number(t.capacityKWh)||0).toFixed(2)} kWh</div><div class="muted">耗電 ${(Number(t.drawKW)||0).toFixed(2)} kW · 可用 ${Number.isFinite(run)?run.toFixed(1)+'h':'—'} · 最大充電 ${(Number(t.maxChargeKW)||0).toFixed(2)} kW</div></div>`}).join(''):'<div class="muted">目前沒有可充電工具。</div>'}`;
 }
 window.ensureResidentToolV101=ensureResidentToolV101;
 window.residentToolRuntimeV101=residentToolRuntimeV101;
 window.chargeResidentToolV101=chargeResidentToolV101;
 window.useResidentToolV101=useResidentToolV101;
 const originalRenderV101=render;
 render=function(){const out=originalRenderV101();if(document.getElementById('electricityDialog')?.open)renderResidentToolPowerV101();return out};
})();
