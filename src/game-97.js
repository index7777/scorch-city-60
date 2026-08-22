// v14.3 Batch B — player-controlled drinking/cooling water allocation.
(function(){
 function ensureWaterAllocationV97(){
  state.resources=state.resources||{};
  const total=Math.max(0,Number(state.resources.water)||0);
  const prev=state.waterAllocation&&typeof state.waterAllocation==='object'?state.waterAllocation:{};
  const cooling=clamp(Number(prev.coolingPool)||0,0,total);
  state.waterAllocation={
   schema:1,
   drinkingPool:Math.max(0,total-cooling),
   coolingPool:cooling,
   emergencyCoolingFromDrinking:!!prev.emergencyCoolingFromDrinking
  };
  return state.waterAllocation;
 }
 function setCoolingWaterReserveV97(liters){
  const a=ensureWaterAllocationV97(),total=Math.max(0,Number(state.resources.water)||0);
  a.coolingPool=clamp(Number(liters)||0,0,total);
  a.drinkingPool=Math.max(0,total-a.coolingPool);
  if(typeof saveGame==='function')saveGame(false);
  return a;
 }
 function consumeCoolingWaterV97(liters,{allowEmergency=false,label='降溫'}={}){
  const need=Math.max(0,Number(liters)||0),a=ensureWaterAllocationV97();
  if(need<=0)return {ok:true,used:0,coolingUsed:0,drinkingUsed:0,shortfall:0};
  const emergency=!!(allowEmergency&&a.emergencyCoolingFromDrinking);
  const available=a.coolingPool+(emergency?a.drinkingPool:0);
  if(available+1e-6<need)return {ok:false,used:0,coolingUsed:0,drinkingUsed:0,shortfall:need-available};
  const coolingUsed=Math.min(a.coolingPool,need),drinkingUsed=need-coolingUsed;
  state.resources.water=Math.max(0,(Number(state.resources.water)||0)-need);
  a.coolingPool=Math.max(0,a.coolingPool-coolingUsed);
  a.drinkingPool=Math.max(0,(Number(state.resources.water)||0)-a.coolingPool);
  if(drinkingUsed>0&&typeof log==='function')log(`${label}緊急挪用飲用水 ${drinkingUsed.toFixed(1)}L。`,'bad');
  if(typeof saveGame==='function')saveGame(false);
  return {ok:true,used:need,coolingUsed,drinkingUsed,shortfall:0};
 }
 function waterAllocationSummaryV97(){
  const a=ensureWaterAllocationV97();
  return `飲用 ${a.drinkingPool.toFixed(1)}L · 降溫預留 ${a.coolingPool.toFixed(1)}L`;
 }
 function ensureWaterAllocationDialogV97(){
  let d=document.getElementById('waterAllocationDialog');if(d)return d;
  d=document.createElement('dialog');d.id='waterAllocationDialog';
  d.innerHTML='<div class="dialog-body"><h2>水的用途</h2><p class="muted">你只有一批實際的水。分到降溫預留後，日常飲用不會自動吃掉這部分；除非你明確允許緊急挪用飲用水。</p><div id="waterAllocationContent"></div><div class="dialog-actions"><button id="waterAllocationClose" class="secondary">關閉</button></div></div>';
  document.body.appendChild(d);d.querySelector('#waterAllocationClose').onclick=()=>d.close();return d;
 }
 function openWaterAllocationV97(){
  const d=ensureWaterAllocationDialogV97(),a=ensureWaterAllocationV97(),total=Math.max(0,Number(state.resources.water)||0),host=d.querySelector('#waterAllocationContent');
  host.innerHTML=`<div class="summary-card"><b>目前總水量 ${total.toFixed(1)}L</b><p>${waterAllocationSummaryV97()}</p></div><label>降溫預留（L）<input id="waterCoolingReserveInput" type="number" min="0" max="${total}" step="0.5" value="${a.coolingPool.toFixed(1)}"></label><label><input id="waterEmergencyCoolingInput" type="checkbox" ${a.emergencyCoolingFromDrinking?'checked':''}> 降溫不足時，允許緊急挪用飲用水</label><div class="dialog-actions"><button id="waterAllocationApply">套用分配</button></div>`;
  host.querySelector('#waterAllocationApply').onclick=()=>{const v=Number(host.querySelector('#waterCoolingReserveInput').value)||0;setCoolingWaterReserveV97(v);state.waterAllocation.emergencyCoolingFromDrinking=!!host.querySelector('#waterEmergencyCoolingInput').checked;if(typeof saveGame==='function')saveGame(false);if(typeof render==='function')render();openWaterAllocationV97()};
  if(!d.open)d.showModal();
 }
 function renderWaterAllocationControlV97(){
  const card=document.querySelector('#residentHud .player-card');if(!card)return;
  let box=card.querySelector('.water-allocation-v97');if(!box){box=document.createElement('div');box.className='water-allocation-v97';card.appendChild(box)}
  box.innerHTML=`<span>${waterAllocationSummaryV97()}</span> <button id="waterAllocationBtn" class="mini secondary">分配水用途</button>`;
  const b=box.querySelector('#waterAllocationBtn');if(b)b.onclick=openWaterAllocationV97;
 }
 window.ensureWaterAllocationV97=ensureWaterAllocationV97;
 window.setCoolingWaterReserveV97=setCoolingWaterReserveV97;
 window.consumeCoolingWaterV97=consumeCoolingWaterV97;
 window.openWaterAllocationV97=openWaterAllocationV97;

 const originalMakeStateV97=makeState;
 makeState=function(){const s=originalMakeStateV97();const total=Math.max(0,Number(s.resources?.water)||0);s.waterAllocation={schema:1,drinkingPool:total,coolingPool:0,emergencyCoolingFromDrinking:false};return s};
 const originalMergeSaveV97=mergeSave;
 mergeSave=function(data){const out=originalMergeSaveV97(data);ensureWaterAllocationV97();return out};
 if(typeof consumeDaily==='function'){
  const originalConsumeDailyV97=consumeDaily;
  consumeDaily=function(...args){
   const a=ensureWaterAllocationV97(),reserve=a.coolingPool;
   state.resources.water=a.drinkingPool;
   let out;
   try{out=originalConsumeDailyV97(...args)}finally{
    state.resources.water=Math.max(0,Number(state.resources.water)||0)+reserve;
    ensureWaterAllocationV97();
   }
   return out;
  };
 }
 const originalRenderV97=render;
 render=function(){ensureWaterAllocationV97();const out=originalRenderV97();renderWaterAllocationControlV97();return out};
 ensureWaterAllocationV97();renderWaterAllocationControlV97();
})();
