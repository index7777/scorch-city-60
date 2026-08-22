// v15.2 Batch 7 — encounter-gated community requests with physical contributions.
(function(){
 const COMMUNITY_REQUESTS_V128={
  'npc-xu-peizhen':{itemId:'item-crackers',title:'補一份能直接吃的食物',body:'許佩真說這裡有人需要一份不用加熱就能吃的東西。'},
  'npc-lin-yuxuan':{itemId:'item-adhesive-bandage',title:'補一份簡單包紮用品',body:'林雨璇說她想留一份能立刻處理小傷口的包紮用品。'},
  'npc-chen-guowei':{itemId:'item-fuse-pack',title:'補一組保險絲',body:'陳國威說手邊若有一組保險絲，他能先留著應付下一次實際碰到的電路問題。'},
  'npc-he-xinyi':{itemId:'item-water-small-sealed',title:'補一瓶密封飲水',body:'何欣怡說她想先留下一瓶確定密封、可以直接帶走的水。'},
  'npc-wang-kai':{itemId:'item-energy-bar',title:'補一份高熱量即食物',body:'王凱說長距離移動前，一份不用處理就能吃的高熱量食物很有用。'}
 };
 function ensureCommunityV128(s=state){
  s.communityV128=s.communityV128&&typeof s.communityV128==='object'?s.communityV128:{};
  const c=s.communityV128;
  if(!c.completed||typeof c.completed!=='object')c.completed={};
  if(!Array.isArray(c.contributions))c.contributions=[];
  return c;
 }
 function requestKnownV128(id,s=state){
  const def=COMMUNITY_REQUESTS_V128[id];if(!def)return false;
  const p=typeof socialNpcV122==='function'?socialNpcV122(id,s):null;
  return !!(p&&Array.isArray(p.talked)&&p.talked.includes(`${id}-t04`));
 }
 function visibleCommunityRequestV128(id,s=state){
  const def=COMMUNITY_REQUESTS_V128[id],c=ensureCommunityV128(s);if(!def||c.completed[id])return null;
  if(!requestKnownV128(id,s))return null;
  if(typeof canSocializeV122!=='function'||!canSocializeV122(id,s))return null;
  return {id,...def};
 }
 function findBackpackItemV128(itemId,s=state){
  if(typeof ensurePhysicalInventoryV115==='function')ensurePhysicalInventoryV115(s);
  const index=(s.backpack?.items||[]).findIndex(x=>x?.catalogId===itemId);
  return index>=0?{index,item:s.backpack.items[index]}:null;
 }
 function contributeCommunityRequestV128(id,s=state){
  const req=visibleCommunityRequestV128(id,s);if(!req)return {ok:false,reason:'這個需求現在不在你可處理的範圍'};
  const held=findBackpackItemV128(req.itemId,s);if(!held)return {ok:false,reason:'你的背包裡沒有對方要的那件物品'};
  const p=typeof socialNpcV122==='function'?socialNpcV122(id,s):null;if(!p)return {ok:false,reason:'對方現在不在這裡'};
  const [given]=s.backpack.items.splice(held.index,1);if(!Array.isArray(p.inventory))p.inventory=[];p.inventory.push({...given});
  if(typeof recalcPhysicalWeightsV115==='function')recalcPhysicalWeightsV115(s);if(typeof syncLegacyWaterV115==='function')syncLegacyWaterV115(s);
  p.trust=Math.min(6,(Number(p.trust)||0)+1);const c=ensureCommunityV128(s);c.completed[id]={day:Number(s.day)||1,itemId:req.itemId};c.contributions.push({npcId:id,itemId:req.itemId,day:Number(s.day)||1});
  return {ok:true,item:given,npcId:id,trust:p.trust};
 }
 function renderCommunityRequestsV128(){
  if(!state.flags?.hardFogOpeningV112)return;const map=document.getElementById('map');if(!map)return;map.querySelectorAll('.community-request-v128').forEach(el=>el.remove());
  if(typeof renderSocialV122==='function')renderSocialV122();
  for(const id of Object.keys(COMMUNITY_REQUESTS_V128)){
   const req=visibleCommunityRequestV128(id);if(!req)continue;const card=map.querySelector(`.social-card-v122[data-social-npc-v122="${id}"]`);
   const box=document.createElement('section');box.className='community-request-v128';box.dataset.communityNpcV128=id;box.setAttribute('aria-label','對方提出的需求');
   const title=document.createElement('b');title.textContent=req.title;const body=document.createElement('p');body.textContent=req.body;box.append(title,body);
   const held=findBackpackItemV128(req.itemId);const btn=document.createElement('button');btn.type='button';btn.textContent=held?'交給對方':'背包裡沒有對應物品';btn.disabled=!held;btn.onclick=()=>{const r=contributeCommunityRequestV128(id);if(!r.ok){if(typeof toast==='function')toast(r.reason);return}const n=typeof npcV121==='function'?npcV121(id):null;if(typeof log==='function')log(`你把${r.item.name||r.item.catalogId}交給${n?.name||'對方'}。`,'good');render()};box.appendChild(btn);
   (card||map).appendChild(box);
  }
 }
 function installCommunityStylesV128(){if(document.getElementById('communityStylesV128'))return;const st=document.createElement('style');st.id='communityStylesV128';st.textContent='.community-request-v128{display:grid;gap:6px;padding:8px;border:1px solid rgba(210,195,155,.16);border-radius:8px;background:rgba(210,195,155,.04)}#map>.community-request-v128{position:absolute;right:18px;bottom:18px;z-index:14;width:min(330px,40%);background:rgba(18,17,13,.95)}.community-request-v128 p{margin:0;font-size:.8rem;line-height:1.42}.community-request-v128 button{justify-self:start;font-size:.76rem}@media(max-width:900px){#map>.community-request-v128{position:relative;right:auto;bottom:auto;width:auto;margin:12px}}';document.head.appendChild(st)}
 const prevMakeStateV128=makeState;makeState=function(){const s=prevMakeStateV128();ensureCommunityV128(s);return s};ensureCommunityV128(state);
 const prevRenderMapV128=renderMap;renderMap=function(){const out=prevRenderMapV128();installCommunityStylesV128();queueMicrotask(renderCommunityRequestsV128);return out};
 const prevRenderV128=render;render=function(){const out=prevRenderV128();installCommunityStylesV128();queueMicrotask(renderCommunityRequestsV128);return out};
 installCommunityStylesV128();window.COMMUNITY_REQUESTS_V128=COMMUNITY_REQUESTS_V128;window.ensureCommunityV128=ensureCommunityV128;window.requestKnownV128=requestKnownV128;window.visibleCommunityRequestV128=visibleCommunityRequestV128;window.contributeCommunityRequestV128=contributeCommunityRequestV128;window.renderCommunityRequestsV128=renderCommunityRequestsV128;
})();