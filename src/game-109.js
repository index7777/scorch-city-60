// v14.3 Batch E/F — formal source icons; central resident UI lifecycle owns refresh timing.
(function(){
 const SOURCE_ICON_V109={broadcast:'assets/ui/source-broadcast.svg',observed:'assets/ui/source-observed.svg',rumor:'assets/ui/source-rumor.svg'};
 function sourceTypeForMarkV109(mark){
  if(mark.classList.contains('knowledge-source-broadcast')||mark.classList.contains('broadcast'))return 'broadcast';
  if(mark.classList.contains('knowledge-source-observed')||mark.classList.contains('observed'))return 'observed';
  return 'rumor';
 }
 function ensureSourceIconStyleV109(){
  if(document.getElementById('sourceIconStyleV109'))return;
  const style=document.createElement('style');style.id='sourceIconStyleV109';
  style.textContent='.knowledge-source,.source-label{display:inline-flex;align-items:center;gap:.35rem}.knowledge-source-icon-v109{width:14px;height:14px;display:inline-block;flex:0 0 auto;object-fit:contain}';
  document.head.appendChild(style);
 }
 function decorateKnowledgeSourceIconsV109(root=document){
  ensureSourceIconStyleV109();
  root.querySelectorAll?.('.knowledge-source,.source-label').forEach(mark=>{
   const type=sourceTypeForMarkV109(mark),src=SOURCE_ICON_V109[type];
   let img=mark.querySelector(':scope > img.knowledge-source-icon-v109');
   if(!img){img=document.createElement('img');img.className='knowledge-source-icon-v109';img.alt='';img.setAttribute('aria-hidden','true');img.decoding='async';mark.prepend(img)}
   if(img.getAttribute('src')!==src)img.setAttribute('src',src);mark.dataset.sourceType=type;
  });
 }
 window.decorateKnowledgeSourceIconsV109=decorateKnowledgeSourceIconsV109;
 window.knowledgeSourceIconPathV109=type=>SOURCE_ICON_V109[type]||SOURCE_ICON_V109.rumor;
})();
