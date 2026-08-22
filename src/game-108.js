// v14.3 Batch E — foreground explanations for disabled actions, with a concrete recovery hint.
(function(){
 function disabledActionHintV108(reason=''){
  const r=String(reason||'').trim();
  if(/燃料/.test(r))return '下一步：先補充燃料，再重新評估這個行動。';
  if(/電池|電力|kWh|冷卻/.test(r))return '下一步：先補充或充電，再重新評估這個行動。';
  if(/飲水|水不足|攜帶水/.test(r))return '下一步：先補足可飲用水，再重新評估這個行動。';
  if(/食物/.test(r))return '下一步：先補足食物，再重新評估這個行動。';
  if(/資料/.test(r))return '下一步：先取得研究資料，再回來研究。';
  if(/材料|零件|濾芯|冷媒/.test(r))return '下一步：先搜尋、交易或回收所缺材料。';
  if(/載重|重量|體積|工程車|推車|車輛/.test(r))return '下一步：換用更高容量的運輸方式，或減少裝載。';
  if(/時間|白晝|夜晚/.test(r))return '下一步：等安全窗口，或縮短這次行動。';
  if(/容量|人口/.test(r))return '下一步：先擴充容量或降低目前負載。';
  if(/前置條件|條件未達成/.test(r))return '下一步：先完成這項行動要求的前置條件。';
  return '下一步：先處理上方顯示的缺口，再重新嘗試。';
 }
 function reasonForDisabledButtonV108(button){
  if(!button)return '';
  const explicit=button.dataset?.disabledReason||button.getAttribute?.('aria-description');if(explicit)return explicit;
  const card=button.closest?.('.card,.choice,.request,.asset-row,.action-pane,.trade-actions,.dialog-actions')||button.parentElement;
  const status=card?.querySelector?.('.status,.action-warning,.expedition-warning,.haul-estimate-v106 .action-warning');
  if(status?.textContent?.trim())return status.textContent.trim();
  if(button.dataset?.research){
   const cardText=card?.textContent||'';
   if(/資料不足/.test(cardText))return '研究資料不足';
   if(/前置條件不足/.test(cardText))return '前置條件不足';
  }
  if(button.dataset?.craft){
   const cardText=card?.textContent||'';
   if(/材料不足/.test(cardText))return '施工材料不足';
   if(/條件未達成/.test(cardText))return '施工前置條件未達成';
  }
  if(button.dataset?.moveasset)return '目前運輸條件不足';
  return '目前條件不足';
 }
 function decorateDisabledActionsV108(root=document){
  if(!root?.querySelectorAll)return 0;
  let count=0;
  for(const button of root.querySelectorAll('button:disabled')){
   if(button.closest?.('#demoEntry'))continue;
   const reason=reasonForDisabledButtonV108(button),hint=disabledActionHintV108(reason);
   let note=button.nextElementSibling;
   if(!note||!note.classList?.contains('disabled-reason-v108')){
    note=document.createElement('div');note.className='disabled-reason-v108';button.insertAdjacentElement('afterend',note);
   }
   note.innerHTML=`<strong>目前無法執行：${reason}</strong><span>${hint}</span>`;
   button.setAttribute('aria-describedby',note.id||(note.id=`disabled-reason-v108-${++decorateDisabledActionsV108.seq}`));
   count++;
  }
  return count;
 }
 decorateDisabledActionsV108.seq=0;
 window.disabledActionHintV108=disabledActionHintV108;
 window.decorateDisabledActionsV108=decorateDisabledActionsV108;
 const style=document.createElement('style');style.id='disabled-reason-style-v108';style.textContent='.disabled-reason-v108{margin:.4rem 0 .7rem;padding:.5rem .65rem;border-left:3px solid currentColor;font-size:.78rem;line-height:1.35}.disabled-reason-v108 strong,.disabled-reason-v108 span{display:block}.disabled-reason-v108 strong{font-weight:700}.disabled-reason-v108 span{margin-top:.18rem}';document.head.appendChild(style);
 const wrap=name=>{const original=window[name];if(typeof original!=='function')return;window[name]=function(...args){const out=original.apply(this,args);queueMicrotask(()=>decorateDisabledActionsV108(document));return out}};
 ['openResearch','openCraft','openRation','openLogistics','openExpedition','renderActionCenter'].forEach(wrap);
 const originalRenderV108=render;
 render=function(){const out=originalRenderV108();queueMicrotask(()=>decorateDisabledActionsV108(document));return out};
 queueMicrotask(()=>decorateDisabledActionsV108(document));
})();
