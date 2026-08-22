// v15.1 Batch 7 — discovery-gated community barter station foundation.
(function(){
 const BARTER_LOCATION_V127='warehouse';
 const BARTER_SEED_V127=['item-energy-bar','item-adhesive-bandage','item-crackers','item-water-small-sealed','item-glucose-gel','item-fuse-pack'];
 function cloneBarterSeedV127(){return BARTER_SEED_V127.map(id=>typeof physicalItemV119==='function'?physicalItemV119(id):null).filter(Boolean)}
 function ensureBarterStationV127(s=state){
  s.barterStationV127=s.barterStationV127&&typeof s.barterStationV127==='object'?s.barterStationV127:{};
  const b=s.barterStationV127;
  if(!Array.isArray(b.inventory))b.inventory=cloneBarterSeedV127();
  if(!Array.isArray(b.exchanges))b.exchanges=[];
  if(typeof b.known!=='boolean')b.known=false;
  return b;
 }
 function tradeLeadCountV127(s=state){
  const social=typeof ensureSocialV122==='function'?ensureSocialV122(s):s.socialV122;
  if(!social?.people)return 0;
  let count=0;
  for(const p of Object.values(social.people))if(Array.isArray(p?.talked)&&p.talked.some(id=>/-t09$/.test(id)))count++;
  return count;
 }
 function updateBarterKnowledgeV127(s=state){const b=ensureBarterStationV127(s);if(tradeLeadCountV127(s)>=2)b.known=true;return b.known}
 function canSeeBarterStationV127(s=state){
  if(!s.flags?.hardFogOpeningV112)return false;
  if(!updateBarterKnowledgeV127(s))return false;
  const loc=s.explorationV113?.current;
  return loc===BARTER_LOCATION_V127&&s.explorationV118?.observed?.[loc]===true;
 }
 function backpackItemsV127(s=state){if(typeof ensurePhysicalInventoryV115==='function')ensurePhysicalInventoryV115(s);return (s.backpack?.items||[]).map((item,index)=>({item,index})).filter(x=>x.item&&x.item.catalogId)}
 function exchangeAtBarterV127(stationIndex,playerIndex,s=state){
  if(!canSeeBarterStationV127(s))return {ok:false,reason:'交換桌現在不在你可操作的範圍'};
  const b=ensureBarterStationV127(s),offer=b.inventory?.[stationIndex],given=s.backpack?.items?.[playerIndex];
  if(!offer||!given||!given.catalogId)return {ok:false,reason:'交換物已經改變'};
  const incoming=typeof itemWeightKgV115==='function'?itemWeightKgV115(offer):Number(offer.weightKg)||0;
  const outgoing=typeof itemWeightKgV115==='function'?itemWeightKgV115(given):Number(given.weightKg)||0;
  const current=Number(s.backpack?.currentKg)||0,capacity=Number(s.backpack?.capacityKg)||50;
  if(incoming>20+1e-9)return {ok:false,reason:'這件物品不能放進背包'};
  if(current-outgoing+incoming>capacity+1e-9)return {ok:false,reason:'背包放不下'};
  b.inventory.splice(stationIndex,1);s.backpack.items.splice(playerIndex,1);b.inventory.push({...given});s.backpack.items.push({...offer});
  if(typeof recalcPhysicalWeightsV115==='function')recalcPhysicalWeightsV115(s);if(typeof syncLegacyWaterV115==='function')syncLegacyWaterV115(s);
  b.exchanges.push({day:Number(s.day)||1,given:given.catalogId,received:offer.catalogId});
  return {ok:true,given:given.name||given.catalogId,received:offer.name||offer.catalogId};
 }
 function renderBarterStationV127(){
  if(!state.flags?.hardFogOpeningV112)return;const map=document.getElementById('map');if(!map)return;map.querySelector('.barter-station-v127')?.remove();if(!canSeeBarterStationV127())return;
  const b=ensureBarterStationV127(),mine=backpackItemsV127();const panel=document.createElement('section');panel.className='barter-station-v127';panel.setAttribute('aria-label','現場交換桌');
  const h=document.createElement('header');h.innerHTML='<b>現場交換桌</b><small>桌上的東西都是實物；拿走一件，就留下你的一件。</small>';panel.appendChild(h);
  if(!b.inventory.length){const empty=document.createElement('p');empty.textContent='桌上目前沒有可交換的物品。';panel.appendChild(empty)}
  for(const [oi,offer] of b.inventory.entries()){
   const row=document.createElement('div');row.className='barter-row-v127';const name=document.createElement('b');name.textContent=offer.name||offer.catalogId;row.appendChild(name);
   if(mine.length){const choices=document.createElement('div');for(const x of mine){const btn=document.createElement('button');btn.type='button';btn.textContent=`用 ${x.item.name||x.item.catalogId} 交換`;btn.onclick=()=>{const r=exchangeAtBarterV127(oi,x.index);if(!r.ok){if(typeof toast==='function')toast(r.reason);return}if(typeof log==='function')log(`你在交換桌留下${r.given}，拿走${r.received}。`,'good');render()};choices.appendChild(btn)}row.appendChild(choices)}else{const em=document.createElement('em');em.textContent='你的背包沒有可留下的物品';row.appendChild(em)}panel.appendChild(row)
  }
  map.appendChild(panel);
 }
 function installBarterStylesV127(){if(document.getElementById('barterStylesV127'))return;const st=document.createElement('style');st.id='barterStylesV127';st.textContent='.barter-station-v127{position:absolute;left:18px;bottom:18px;z-index:14;width:min(360px,42%);max-height:48%;overflow:auto;display:grid;gap:8px;padding:11px;border:1px solid rgba(190,210,190,.2);border-radius:11px;background:rgba(12,18,14,.96)}.barter-station-v127 header{display:grid;gap:3px}.barter-station-v127 small,.barter-station-v127 em{opacity:.72;font-size:.76rem;font-style:normal}.barter-row-v127{display:grid;gap:5px;padding:8px;border:1px solid rgba(190,210,190,.12);border-radius:8px}.barter-row-v127>div{display:flex;flex-wrap:wrap;gap:5px}.barter-row-v127 button{font-size:.74rem}@media(max-width:900px){.barter-station-v127{position:relative;left:auto;bottom:auto;width:auto;max-height:none;margin:12px}}';document.head.appendChild(st)}
 const prevMakeStateV127=makeState;makeState=function(){const s=prevMakeStateV127();ensureBarterStationV127(s);return s};ensureBarterStationV127(state);
 const prevRenderMapV127=renderMap;renderMap=function(){const out=prevRenderMapV127();installBarterStylesV127();queueMicrotask(renderBarterStationV127);return out};
 const prevRenderV127=render;render=function(){const out=prevRenderV127();installBarterStylesV127();queueMicrotask(renderBarterStationV127);return out};
 installBarterStylesV127();window.BARTER_LOCATION_V127=BARTER_LOCATION_V127;window.ensureBarterStationV127=ensureBarterStationV127;window.tradeLeadCountV127=tradeLeadCountV127;window.updateBarterKnowledgeV127=updateBarterKnowledgeV127;window.canSeeBarterStationV127=canSeeBarterStationV127;window.exchangeAtBarterV127=exchangeAtBarterV127;window.renderBarterStationV127=renderBarterStationV127;
})();