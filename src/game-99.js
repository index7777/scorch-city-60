// v14.3 Batch B — make dangerous drinking/cooling allocation explicit before it becomes lethal.
(function(){
 function drinkingReserveRiskV99(){
  const a=ensureWaterAllocationV97();
  const need=typeof dailyWaterNeed==='function'?Math.max(1,Number(dailyWaterNeed())||1):Math.max(1,Number(state.ration?.water)||2.5);
  const days=a.drinkingPool/need;
  const level=days<1?'critical':days<2?'danger':days<3?'warning':'ok';
  const message=level==='critical'
   ?`飲用池不足 1 天：目前 ${a.drinkingPool.toFixed(1)}L，每日約需 ${need.toFixed(1)}L。再把水轉去降溫可能直接造成斷水。`
   :level==='danger'
    ?`飲用池只剩約 ${days.toFixed(1)} 天。若繼續增加降溫預留，下一次配給會很危險。`
    :level==='warning'
     ?`飲用池約可支撐 ${days.toFixed(1)} 天；建議保留至少 3 天飲水。`
     :`飲用池約可支撐 ${days.toFixed(1)} 天。`;
  return {need,days,level,message};
 }
 function renderWaterAllocationRiskV99(){
  const box=document.querySelector('#residentHud .water-allocation-v97');if(!box)return;
  let risk=box.querySelector('.water-allocation-risk-v99');if(!risk){risk=document.createElement('div');risk.className='water-allocation-risk-v99';box.prepend(risk)}
  const s=drinkingReserveRiskV99();
  risk.classList.toggle('bad-text',s.level==='critical'||s.level==='danger');
  risk.textContent=s.message;
 }
 function decorateWaterAllocationDialogV99(){
  const d=document.getElementById('waterAllocationDialog');if(!d?.open)return;
  const host=d.querySelector('#waterAllocationContent');if(!host)return;
  let risk=host.querySelector('.water-allocation-dialog-risk-v99');if(!risk){risk=document.createElement('p');risk.className='water-allocation-dialog-risk-v99';const actions=host.querySelector('.dialog-actions');host.insertBefore(risk,actions||null)}
  const input=host.querySelector('#waterCoolingReserveInput');
  const total=Math.max(0,Number(state.resources?.water)||0),proposed=clamp(Number(input?.value)||0,0,total);
  const need=typeof dailyWaterNeed==='function'?Math.max(1,Number(dailyWaterNeed())||1):Math.max(1,Number(state.ration?.water)||2.5);
  const drinking=Math.max(0,total-proposed),days=drinking/need;
  risk.classList.toggle('bad-text',days<2);
  risk.textContent=days<1
   ?`危險分配：套用後飲用池只剩 ${drinking.toFixed(1)}L，不足 1 天需求。`
   :days<2
    ?`高風險分配：套用後飲用池約只剩 ${days.toFixed(1)} 天。`
    :`套用後飲用池約可支撐 ${days.toFixed(1)} 天。`;
  if(input&&!input.dataset.v99Bound){input.dataset.v99Bound='1';input.addEventListener('input',decorateWaterAllocationDialogV99)}
 }
 window.drinkingReserveRiskV99=drinkingReserveRiskV99;
 const originalOpenWaterAllocationV99=openWaterAllocationV97;
 openWaterAllocationV97=function(){const out=originalOpenWaterAllocationV99();decorateWaterAllocationDialogV99();return out};
 const originalRenderV99=render;
 render=function(){const out=originalRenderV99();renderWaterAllocationRiskV99();decorateWaterAllocationDialogV99();return out};
 renderWaterAllocationRiskV99();
})();
