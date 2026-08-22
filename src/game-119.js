// v14.6 Batch 3 — first-wave physical items and discovery-gated scene interactions.
(function(){
 const ITEMS_V119={
  'item-water-small-sealed':{name:'小瓶水',category:'water',weightKg:.5,use:'drink',waterSize:'small'},
  'item-water-large-sealed':{name:'大瓶水',category:'water',weightKg:1,use:'drink',waterSize:'large'},
  'item-water-small-open':{name:'開封小瓶水',category:'water',weightKg:.5,use:'drink',waterSize:'small'},
  'item-water-large-open':{name:'開封大瓶水',category:'water',weightKg:1,use:'drink',waterSize:'large'},
  'item-folding-cup':{name:'折疊杯',category:'water-tool',weightKg:.08,use:'measure'},
  'item-steel-flask':{name:'鋼製水壺',category:'water-tool',weightKg:.35,use:'carry-water'},
  'item-plastic-jug-5l':{name:'5L 塑膠水桶',category:'water-tool',weightKg:.45,use:'carry-water'},
  'item-water-can-10l':{name:'10L 水桶',category:'water-tool',weightKg:.9,use:'carry-water'},
  'item-hose-short':{name:'短水管',category:'water-tool',weightKg:.5,use:'transfer-water'},
  'item-hand-pump':{name:'手動泵',category:'water-tool',weightKg:2.4,use:'transfer-water'},
  'item-canned-beans':{name:'豆類罐頭',category:'food',weightKg:.42,use:'eat'},
  'item-canned-fish':{name:'魚罐頭',category:'food',weightKg:.2,use:'eat'},
  'item-canned-meat':{name:'肉罐頭',category:'food',weightKg:.34,use:'eat'},
  'item-crackers':{name:'蘇打餅乾',category:'food',weightKg:.18,use:'eat'},
  'item-rice-bag':{name:'米袋',category:'food',weightKg:2,use:'cook'},
  'item-instant-noodles':{name:'即食麵',category:'food',weightKg:.12,use:'cook'},
  'item-energy-bar':{name:'能量棒',category:'food',weightKg:.06,use:'eat'},
  'item-dried-fruit':{name:'果乾',category:'food',weightKg:.15,use:'eat'},
  'item-nuts':{name:'堅果',category:'food',weightKg:.2,use:'eat'},
  'item-powdered-milk':{name:'奶粉',category:'food',weightKg:.45,use:'mix'},
  'item-electrolyte-powder':{name:'電解質粉',category:'food',weightKg:.05,use:'mix'},
  'item-canned-fruit':{name:'水果罐頭',category:'food',weightKg:.42,use:'eat'},
  'item-retort-meal':{name:'調理包',category:'food',weightKg:.28,use:'eat'},
  'item-glucose-gel':{name:'葡萄糖凝膠',category:'food',weightKg:.04,use:'eat'},
  'item-salt-pack':{name:'鹽包',category:'food',weightKg:.1,use:'cook'},
  'item-spoiled-food-sample':{name:'腐敗食物樣本',category:'special',weightKg:.12,use:'inspect'},
  'item-gauze-roll':{name:'紗布卷',category:'medical',weightKg:.05,use:'treat'},
  'item-adhesive-bandage':{name:'OK 繃',category:'medical',weightKg:.02,use:'treat'},
  'item-antiseptic-solution':{name:'消毒液',category:'medical',weightKg:.25,use:'treat'},
  'item-elastic-bandage':{name:'彈性繃帶',category:'medical',weightKg:.09,use:'treat'},
  'item-sterile-dressing':{name:'無菌敷料',category:'medical',weightKg:.08,use:'treat'},
  'item-suture-kit':{name:'縫合包',category:'medical',weightKg:.18,use:'treat-skilled'},
  'item-painkiller':{name:'止痛藥',category:'medical',weightKg:.04,use:'treat'},
  'item-fever-reducer':{name:'退燒藥',category:'medical',weightKg:.04,use:'treat'},
  'item-oral-rehydration-salts':{name:'口服補液鹽',category:'medical',weightKg:.03,use:'mix'},
  'item-burn-gel':{name:'燒燙傷凝膠',category:'medical',weightKg:.12,use:'treat'},
  'item-instant-cold-pack':{name:'即冷冰袋',category:'medical',weightKg:.3,use:'cool'},
  'item-prescription-medicine-pack':{name:'處方藥包',category:'medical',weightKg:.1,use:'npc-specific'},
  'item-small-power-bank':{name:'小型行動電源',category:'battery',weightKg:.22,use:'charge'},
  'item-large-power-bank':{name:'大型行動電源',category:'battery',weightKg:.48,use:'charge'},
  'item-portable-fan-battery':{name:'攜帶風扇電池',category:'battery',weightKg:.32,use:'charge'},
  'item-aa-battery-pair':{name:'AA 電池一對',category:'battery',weightKg:.05,use:'power-device'},
  'item-aaa-battery-pair':{name:'AAA 電池一對',category:'battery',weightKg:.03,use:'power-device'},
  'item-9v-battery':{name:'9V 電池',category:'battery',weightKg:.05,use:'power-device'},
  'item-usb-cable':{name:'USB 線',category:'power-part',weightKg:.04,use:'connect-power'},
  'item-dc-adapter-lead':{name:'DC 轉接線',category:'power-part',weightKg:.12,use:'connect-power'},
  'item-fuse-pack':{name:'保險絲包',category:'power-part',weightKg:.08,use:'repair-power'},
  'item-extension-cord':{name:'延長線',category:'power-part',weightKg:1.1,use:'route-power'},
  'item-apartment-keyring':{name:'住宅鑰匙串',category:'key',weightKg:.08,use:'unlock'},
  'item-store-backroom-key':{name:'便利店後場鑰匙',category:'key',weightKg:.03,use:'unlock'},
  'item-clinic-cabinet-key':{name:'診所藥櫃鑰匙',category:'key',weightKg:.02,use:'unlock'},
  'item-crowbar':{name:'撬棍',category:'tool',weightKg:1.6,use:'pry'},
  'item-adjustable-wrench':{name:'活動扳手',category:'tool',weightKg:.45,use:'mechanical'},
  'item-insulated-pliers':{name:'絕緣鉗',category:'tool',weightKg:.32,use:'electrical'}
 };
 const SCENES_V119={
  homes:[
   {id:'homes-drawer',name:'玄關抽屜',kind:'container',items:['item-apartment-keyring','item-crackers']},
   {id:'homes-cabinet',name:'上鎖的壁櫃',kind:'container',keyId:'item-apartment-keyring',items:['item-water-small-sealed','item-energy-bar','item-gauze-roll']}
  ],
  store:[
   {id:'store-counter',name:'收銀台下方',kind:'container',items:['item-store-backroom-key','item-aa-battery-pair','item-glucose-gel']},
   {id:'store-shelf',name:'倒下的貨架',kind:'container',items:['item-water-large-sealed','item-canned-beans','item-canned-fish','item-crackers','item-electrolyte-powder']},
   {id:'store-backroom',name:'後場門',kind:'container',keyId:'item-store-backroom-key',items:['item-large-power-bank','item-extension-cord','item-retort-meal','item-dried-fruit']}
  ],
  clinic:[
   {id:'clinic-desk',name:'接待桌抽屜',kind:'container',items:['item-clinic-cabinet-key','item-adhesive-bandage','item-antiseptic-solution']},
   {id:'clinic-cabinet',name:'藥櫃',kind:'container',keyId:'item-clinic-cabinet-key',items:['item-sterile-dressing','item-painkiller','item-burn-gel','item-oral-rehydration-salts','item-prescription-medicine-pack']}
  ],
  hardware:[
   {id:'hardware-toolbox',name:'工具箱',kind:'container',items:['item-crowbar','item-adjustable-wrench','item-insulated-pliers','item-fuse-pack']},
   {id:'hardware-water-shelf',name:'水電材料架',kind:'container',items:['item-hose-short','item-hand-pump','item-steel-flask']}
  ],
  warehouse:[
   {id:'warehouse-crate-a',name:'封箱 A',kind:'container',items:['item-rice-bag','item-canned-meat','item-nuts','item-powdered-milk']},
   {id:'warehouse-crate-b',name:'封箱 B',kind:'container',items:['item-small-power-bank','item-portable-fan-battery','item-aaa-battery-pair','item-9v-battery','item-usb-cable','item-dc-adapter-lead']}
  ]
 };
 function cloneBlueprintV119(){const out={};for(const [loc,objects] of Object.entries(SCENES_V119))out[loc]=objects.map(o=>({...o,items:[...(o.items||[])],searched:false,unlocked:!o.keyId}));return out}
 function ensureSceneStateV119(s=state){s.sceneInteractionsV119=s.sceneInteractionsV119&&typeof s.sceneInteractionsV119==='object'?s.sceneInteractionsV119:{};if(!s.sceneInteractionsV119.locations)s.sceneInteractionsV119.locations=cloneBlueprintV119();return s.sceneInteractionsV119}
 function itemDefV119(id){return ITEMS_V119[id]||null}
 function inventoryHasV119(id,s=state){if(typeof ensurePhysicalInventoryV115==='function')ensurePhysicalInventoryV115(s);return [...(s.backpack?.items||[]),...(s.shelterStorage?.items||[])].some(x=>x?.catalogId===id)}
 function physicalItemV119(id){const d=itemDefV119(id);if(!d)return null;if(d.waterSize&&typeof normalizeWaterBottleV115==='function'){const w=normalizeWaterBottleV115(d.waterSize);return {...w,catalogId:id,name:d.name}}return {catalogId:id,id,name:d.name,category:d.category,use:d.use,weightKg:d.weightKg}}
 function spendSceneTimeV119(hours){if(state.day>=30)return true;const h=Math.max(0,Number(hours)||0);if(!Number.isFinite(state.hoursLeft)||state.hoursLeft+1e-9<h){toast(`目前沒有足夠時間；需要 ${h}h`);return false}state.hoursLeft=Math.max(0,Math.round((state.hoursLeft-h)*10)/10);return true}
 function sceneObjectV119(location,id,s=state){return ensureSceneStateV119(s).locations?.[location]?.find(x=>x.id===id)||null}
 function searchObjectV119(location,id){const o=sceneObjectV119(location,id);if(!o||o.searched)return;if(o.keyId&&!o.unlocked){toast('目前打不開');return}if(!spendSceneTimeV119(.5))return;o.searched=true;log(`你查看了${o.name}。`,'good');render()}
 function unlockObjectV119(location,id){const o=sceneObjectV119(location,id);if(!o||!o.keyId||o.unlocked)return;if(!inventoryHasV119(o.keyId)){toast('你沒有能打開它的鑰匙');return}o.unlocked=true;log(`你打開了${o.name}。`,'good');render()}
 function takeSceneItemV119(location,objectId,itemId){const o=sceneObjectV119(location,objectId),idx=o?.items?.indexOf(itemId)??-1;if(!o||!o.searched||idx<0)return false;const item=physicalItemV119(itemId);if(!item)return false;const result=typeof addItemToBackpackV115==='function'?addItemToBackpackV115(item):{ok:false,reason:'背包系統不可用'};if(!result.ok){toast(result.reason||'無法放入背包');return false}o.items.splice(idx,1);log(`你拿走了${item.name}。`,'good');render();return true}
 function currentSceneLocationV119(){return typeof ensureExplorationV113==='function'?ensureExplorationV113().current:'base'}
 function currentObservedV119(id){const ex=state.explorationV118;return ex?.observed?.[id]===true}
 function objectHtmlV119(location,o){
  if(o.keyId&&!o.unlocked)return `<article class="scene-object-v119"><div><b>${o.name}</b><small>上鎖</small></div><button data-unlock-v119="${o.id}">嘗試打開</button></article>`;
  if(!o.searched)return `<article class="scene-object-v119"><div><b>${o.name}</b><small>尚未查看</small></div><button data-search-v119="${o.id}">查看 · 0.5h</button></article>`;
  if(!o.items.length)return `<article class="scene-object-v119 exhausted"><div><b>${o.name}</b><small>已查看 · 沒有可拿的東西</small></div></article>`;
  return `<article class="scene-object-v119"><div><b>${o.name}</b><small>你已經看過裡面</small></div><div class="scene-found-v119">${o.items.map(id=>{const d=itemDefV119(id);return d?`<button data-take-v119="${o.id}|${id}"><span>${d.name}</span><small>${d.weightKg.toFixed(2).replace(/0+$/,'').replace(/\.$/,'')} kg</small></button>`:''}).join('')}</div></article>`;
 }
 function renderScenePanelV119(){
  if(!state.flags?.hardFogOpeningV112)return;const map=document.getElementById('map');if(!map)return;map.querySelector('.scene-panel-v119')?.remove();const location=currentSceneLocationV119();if(!currentObservedV119(location))return;const objects=ensureSceneStateV119().locations?.[location]||[];if(!objects.length)return;
  const panel=document.createElement('section');panel.className='scene-panel-v119';panel.setAttribute('aria-label','目前地點可互動物件');panel.innerHTML=`<div class="scene-head-v119"><b>這裡</b><small>${mapLoc(location)?.name||''}</small></div><div class="scene-list-v119">${objects.map(o=>objectHtmlV119(location,o)).join('')}</div>`;map.appendChild(panel);
  panel.querySelectorAll('[data-search-v119]').forEach(b=>b.onclick=()=>searchObjectV119(location,b.dataset.searchV119));
  panel.querySelectorAll('[data-unlock-v119]').forEach(b=>b.onclick=()=>unlockObjectV119(location,b.dataset.unlockV119));
  panel.querySelectorAll('[data-take-v119]').forEach(b=>b.onclick=()=>{const [oid,iid]=b.dataset.takeV119.split('|');takeSceneItemV119(location,oid,iid)});
 }
 function installStylesV119(){if(document.getElementById('batch3StylesV119'))return;const s=document.createElement('style');s.id='batch3StylesV119';s.textContent=`
  .scene-panel-v119{position:absolute;top:64px;right:18px;z-index:11;width:min(330px,38%);max-height:calc(100% - 154px);overflow:auto;padding:12px;border:1px solid rgba(180,210,210,.22);border-radius:12px;background:rgba(9,16,18,.94);backdrop-filter:blur(10px)}.scene-head-v119{display:flex;justify-content:space-between;gap:10px;align-items:baseline;margin-bottom:8px}.scene-head-v119 small,.scene-object-v119 small{opacity:.67}.scene-list-v119{display:grid;gap:8px}.scene-object-v119{display:grid;gap:8px;padding:10px;border:1px solid rgba(180,210,210,.14);border-radius:9px;background:rgba(255,255,255,.025)}.scene-object-v119>div:first-child{display:grid;gap:2px}.scene-object-v119>button{justify-self:start}.scene-found-v119{display:grid;grid-template-columns:1fr 1fr;gap:6px}.scene-found-v119 button{display:flex;justify-content:space-between;gap:8px;text-align:left}.scene-found-v119 button small{white-space:nowrap}.scene-object-v119.exhausted{opacity:.62}@media(max-width:900px){.scene-panel-v119{position:relative;top:auto;right:auto;width:auto;max-height:none;margin:12px}}
 `;document.head.appendChild(s)}
 const prevMakeStateV119=makeState;makeState=function(){const s=prevMakeStateV119();ensureSceneStateV119(s);return s};ensureSceneStateV119(state);
 const prevRenderMapV119=renderMap;renderMap=function(){const out=prevRenderMapV119();installStylesV119();queueMicrotask(renderScenePanelV119);return out};
 const prevRenderV119=render;render=function(){const out=prevRenderV119();installStylesV119();queueMicrotask(renderScenePanelV119);return out};
 installStylesV119();
 window.ITEMS_V119=ITEMS_V119;window.ensureSceneStateV119=ensureSceneStateV119;window.itemDefV119=itemDefV119;window.physicalItemV119=physicalItemV119;window.inventoryHasV119=inventoryHasV119;window.searchObjectV119=searchObjectV119;window.unlockObjectV119=unlockObjectV119;window.takeSceneItemV119=takeSceneItemV119;window.renderScenePanelV119=renderScenePanelV119;
})();