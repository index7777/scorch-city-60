// v14.4 Batch G — hard-fog opening: zero starting resources, personal shelter/backpack only, no future-system UI leaks.
(function(){
 const OPENING_RESOURCE_KEYS_V112=['water','food','battery','medicine','fuel','parts','coolant','filters','data'];
 function ensureOpeningPhysicalStateV112(s=state){
  s.backpack=s.backpack&&typeof s.backpack==='object'?s.backpack:{};
  s.backpack.capacityKg=50;
  s.backpack.singleItemLimitKg=20;
  s.backpack.currentKg=Math.max(0,Number(s.backpack.currentKg)||0);
  s.backpack.items=Array.isArray(s.backpack.items)?s.backpack.items:[];
  s.shelterStorage=s.shelterStorage&&typeof s.shelterStorage==='object'?s.shelterStorage:{};
  s.shelterStorage.capacityKg=200;
  s.shelterStorage.currentKg=Math.max(0,Number(s.shelterStorage.currentKg)||0);
  s.shelterStorage.items=Array.isArray(s.shelterStorage.items)?s.shelterStorage.items:[];
  s.shelterPower=s.shelterPower&&typeof s.shelterPower==='object'?s.shelterPower:{};
  s.shelterPower.outlets=1;
  s.shelterPower.chargeableTypes=['powerBank','portableFanBattery'];
  s.shelterPower.knownSlowCharge=true;
  return s;
 }
 function applyZeroResourceOpeningV112(s=state){
  s.resources=s.resources||{};
  for(const key of OPENING_RESOURCE_KEYS_V112)s.resources[key]=0;
  s.privatePool=s.privatePool&&typeof s.privatePool==='object'?s.privatePool:{};
  for(const key of ['water','food','battery'])s.privatePool[key]=0;
  if(s.electricity&&typeof s.electricity==='object')s.electricity.batteryKWh=0;
  ensureOpeningPhysicalStateV112(s);
  s.flags=s.flags||{};
  s.flags.hardFogOpeningV112=true;
  return s;
 }
 function renderOpeningShelterV112(){
  const resources=document.getElementById('resources');
  const resourceSection=resources?.closest('section');
  if(resourceSection){
   const h=resourceSection.querySelector('.section-head h2');if(h)h.textContent='你的背包';
   const inventoryBtn=document.getElementById('inventoryBtn');if(inventoryBtn)inventoryBtn.hidden=true;
   const b=ensureOpeningPhysicalStateV112().backpack;
   resources.innerHTML=`<div class="card hard-fog-backpack-v112"><b>背包 ${b.currentKg.toFixed(1)} / ${b.capacityKg} kg</b><small>單件超過 ${b.singleItemLimitKg} kg 的物品不能放入背包。</small><p class="muted">目前是空的。</p></div>`;
  }
  const base=document.getElementById('baseStats');
  const baseSection=base?.closest('section');
  if(baseSection){
   const h=baseSection.querySelector('.section-head h2');if(h)h.textContent='耐熱屋狀態';
   const tag=baseSection.querySelector('.section-tag');if(tag)tag.textContent='PERSONAL SHELTER';
   const s=ensureOpeningPhysicalStateV112();
   base.innerHTML=`<div class="card hard-fog-shelter-v112"><b>儲放空間 ${s.shelterStorage.currentKg.toFixed(1)} / ${s.shelterStorage.capacityKg} kg</b><small>可以把帶回來的東西放在這裡。</small></div><div class="card hard-fog-power-v112"><b>充電插座 ${s.shelterPower.outlets} 個</b><small>耐熱屋可以緩慢充電；目前只知道可替行動電源或移動風扇電池充電。</small></div>`;
  }
 }
 function hideFutureUiV112(){
  const hide=sel=>document.querySelectorAll(sel).forEach(el=>{el.hidden=true;el.setAttribute('aria-hidden','true')});
  hide('.bottom-strip');
  hide('.map-tools');
  hide('#mapPlannerPanel');
  hide('.city-header .legend');
  hide('#actionCenterBtn,#baseMgmtBtn,#cityOpsBtn,#researchBtn,#craftBtn,#briefBtn,#coreProjectBtn,#electricityBtn,#vehicleBtn');
  const deck=document.querySelector('.command-deck');if(deck)deck.hidden=true;
  const days=document.getElementById('daysLeft')?.closest('.stat');if(days)days.hidden=true;
  const cityTitle=document.querySelector('.city-header h2');if(cityTitle)cityTitle.textContent='耐熱屋周邊';
  const objectiveEl=document.getElementById('objective');if(objectiveEl)objectiveEl.textContent='先看看耐熱屋周圍能直接前往的方向。';
  const rightTitle=document.querySelector('.right-panel .section-head h2');if(rightTitle)rightTitle.textContent='你看到與聽到的事';
 }
 function rewriteBroadcastOnlyCopyV112(){
  const entry=document.getElementById('demoEntry');
  const subtitle=entry?.querySelector('.demo-entry__subtitle');
  if(subtitle)subtitle.textContent='世界廣播公布了完整災害時程。除此之外，沒有提供任何世界資訊。';
  const how=entry?.querySelector('#demoHowToPanel');
  if(how)how.innerHTML='<h2>世界廣播</h2><p>Day 1–7：夜晚 8 小時，白晝最高 72°C。</p><p>Day 8–14：夜晚 6 小時，白晝最高 78°C。</p><p>Day 15–21：夜晚 4 小時，白晝最高 84°C。</p><p>Day 22–29：夜晚 2 小時，白晝最高 92°C。</p><p>Day 30 起：夜晚完全消失，白晝最高 100°C。</p>';
  const tut=document.getElementById('tutorialDialog');
  if(tut){
   const kicker=tut.querySelector('.tutorial-kicker');if(kicker)kicker.textContent='WORLD BROADCAST';
   const h=tut.querySelector('h2');if(h)h.textContent='災害時程';
   const p=tut.querySelector(':scope .dialog-body>p');if(p)p.innerHTML='Day 1–7：夜晚 8 小時，白晝最高 72°C。<br>Day 8–14：夜晚 6 小時，白晝最高 78°C。<br>Day 15–21：夜晚 4 小時，白晝最高 84°C。<br>Day 22–29：夜晚 2 小時，白晝最高 92°C。<br>Day 30 起：夜晚完全消失，白晝最高 100°C。';
   const seq=tut.querySelector('.tutorial-sequence');if(seq)seq.remove();
  }
 }
 function renderHardFogOpeningV112(){renderOpeningShelterV112();hideFutureUiV112();rewriteBroadcastOnlyCopyV112()}
 window.ensureOpeningPhysicalStateV112=ensureOpeningPhysicalStateV112;
 window.applyZeroResourceOpeningV112=applyZeroResourceOpeningV112;
 window.renderHardFogOpeningV112=renderHardFogOpeningV112;
 const originalMakeStateV112=makeState;
 makeState=function(){const s=originalMakeStateV112();ensureOpeningPhysicalStateV112(s);return s};
 const start=document.getElementById('demoStart');
 if(start&&!start.dataset.hardFogBoundV112){
  start.dataset.hardFogBoundV112='1';
  start.addEventListener('click',()=>{applyZeroResourceOpeningV112(state);render();queueMicrotask(renderHardFogOpeningV112)},true);
 }
 const originalRenderV112=render;
 render=function(){const out=originalRenderV112();if(state.flags?.hardFogOpeningV112)queueMicrotask(renderHardFogOpeningV112);return out};
 rewriteBroadcastOnlyCopyV112();
})();
