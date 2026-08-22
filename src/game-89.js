// v14.3 resident-perspective redesign, P1 naming pass.
// Normalize visible city-manager terminology into resident-facing language without changing mechanics.
(function(){
 const replacements=[
  ['每日簡報','你的日記'],
  ['城市動態','你聽到的與你做過的'],
  ['已知倖存人口','你認識的人'],
  ['冷源核心主線','你正在拼湊的線索'],
  ['電力管理','你的電力'],
  ['大型資產','大型物件'],
  ['大型設備','大型物件'],
  ['前期高耗','這幾天特別耗'],
  ['第一週',''],
  ['適應期',''],
  ['終局時程',''],
  ['公共庫存','你和你認識的人的庫存']
 ];
 function normalizeResidentTextNodeV89(node){
  if(!node||node.nodeType!==Node.TEXT_NODE)return;
  let text=node.nodeValue||'',next=text;
  for(const [from,to] of replacements)next=next.split(from).join(to);
  if(next!==text)node.nodeValue=next;
 }
 function normalizeResidentElementV89(root=document.body){
  if(!root)return;
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode:n=>{
   const p=n.parentElement;
   if(!p||['SCRIPT','STYLE','TEXTAREA'].includes(p.tagName))return NodeFilter.FILTER_REJECT;
   return NodeFilter.FILTER_ACCEPT;
  }});
  const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);nodes.forEach(normalizeResidentTextNodeV89);
  const brief=document.getElementById('briefDialog');if(brief){const h=brief.querySelector('h2');if(h)h.textContent='你的日記';const p=brief.querySelector('p.muted');if(p)p.textContent='整理你自己的狀態、昨天親眼做過的事、廣播與傳聞。'}
  const cityOps=document.getElementById('cityOpsDialog');if(cityOps){const h=cityOps.querySelector('h2');if(h)h.textContent='你的情報'}
  const assetDialog=document.getElementById('assetDialog')||document.getElementById('largeAssetDialog');if(assetDialog){const h=assetDialog.querySelector('h2');if(h)h.textContent='大型物件'}
 }
 const originalRenderV89=render;
 render=function(){const out=originalRenderV89();normalizeResidentElementV89();return out};
 let queued=false;
 const observer=new MutationObserver(()=>{if(queued)return;queued=true;queueMicrotask(()=>{queued=false;normalizeResidentElementV89()})});
 observer.observe(document.documentElement,{subtree:true,childList:true,characterData:true});
 setTimeout(()=>normalizeResidentElementV89(),0);
})();
