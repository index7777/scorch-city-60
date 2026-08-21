/* v14.2.2 QA — X9–X15 rule clarity / direct decision paths */
function ensureClarityV77(){state.flags=state.flags||{};state.flags.clarityV77=state.flags.clarityV77||{assetRuleSeen:false};return state.flags.clarityV77}

/* X9 — direct power-management entry without duplicating the existing grid state. */
function openPowerManagementV77(){openInventory();setTimeout(()=>{const card=document.querySelector('#inventoryDialog .grid-dispatch-card');if(card){card.scrollIntoView({block:'start',behavior:'smooth'});card.classList.add('focus-v77');setTimeout(()=>card.classList.remove('focus-v77'),1200)}},0)}
function installPowerEntryV77(){
 if($('powerMgmtBtnV77'))return;
 const deck=document.querySelector('.command-deck');if(!deck)return;
 const b=document.createElement('button');b.id='powerMgmtBtnV77';b.className='command-card';b.innerHTML='<span>電力管理</span><small>儲能、負載、發電機排程</small>';b.onclick=openPowerManagementV77;
 const base=$('baseMgmtBtn');if(base)base.insertAdjacentElement('afterend',b);else deck.appendChild(b)
}

/* X10 — current HUD semantics are explained in-place. */
function installHudTooltipsV77(){
 const defs={
  day:'目前遊戲日。Day 30 起進入 100°C 永晝；Day 60 結算。',
  phase:'目前時段。Day 1–29 的夜晚是主要低溫外勤窗口；白晝仍可做安全區內工程。',
  temp:'目前外部環境溫度。是否能外出取決於實際溫度、主動冷卻、活動強度與暴露時間。',
  hours:'本時段可支配時間。遠征、搜索、施工、診斷與維修都會消耗這個時間預算。',
  daysLeft:'以目前公共庫存與每日耗水量估算的基地飲水續航，不代表城市所有已知水源都已搬回。'
 };
 for(const [id,text] of Object.entries(defs)){const el=$(id),stat=el?.closest('.stat');if(!stat)continue;stat.dataset.tooltipV77=text;stat.tabIndex=0;stat.setAttribute('aria-label',`${stat.querySelector('span')?.textContent||id}：${text}`)}
}

/* X11 — discovering a large asset explains discovery / ownership / transport exactly once per save. */
function ensureAssetRuleDialogV77(){let d=$('assetRuleDialogV77');if(d)return d;d=document.createElement('dialog');d.id='assetRuleDialogV77';d.innerHTML='<div class="dialog-body asset-rule-v77"><h2>發現大型資產</h2><p id="assetRuleTextV77"></p><div class="asset-rule-steps-v77"><div><b>1. 發現</b><span>只代表你知道它在哪裡。</span></div><div><b>2. 取得控制權</b><span>現場可能有 NPC 或聚落持有。</span></div><div><b>3. 實體搬運</b><span>重量、體積、固定點與回程空間都必須成立。</span></div></div><div class="dialog-actions"><button id="assetRuleCloseV77">知道了</button></div></div>';document.body.appendChild(d);d.querySelector('#assetRuleCloseV77').onclick=()=>d.close();return d}
const _discoverAssetsAtV77=discoverAssetsAt;
discoverAssetsAt=function(id){const before=new Set(assetDefs.filter(a=>state.assets?.[a.id]?.discovered).map(a=>a.id)),out=_discoverAssetsAtV77(id),found=assetDefs.filter(a=>state.assets?.[a.id]?.discovered&&!before.has(a.id));const f=ensureClarityV77();if(found.length&&!f.assetRuleSeen){f.assetRuleSeen=true;const d=ensureAssetRuleDialogV77(),p=$('assetRuleTextV77');if(p)p.textContent=`你在${mapLoc(id)?.name||'現場'}發現：${found.map(a=>a.name).join('、')}。找到它不代表已經擁有，也不代表已經運回基地。`;if(!d.open)d.showModal();saveGame(false)}return out};

/* X12 — public-pool accounting is explicit on resources and endurance. */
function annotateResourcesV77(){
 document.querySelectorAll('#resources .resource-row').forEach(r=>{r.title='搜索或外勤返站後，小型物資會進入可直接調度的公共庫存；基地續航與多數工程成本都從這裡計算。'});
 const d=$('daysLeft')?.closest('.stat');if(d)d.dataset.tooltipV77='基地續航以公共庫存中的水與每日需求計算。城市裡「已知但尚未搬回」的水不會自動算進續航。'
}

/* X13 — construction site text has a concrete meaning. */
function annotateCraftRulesV77(){
 document.querySelectorAll('#craftDialog .craft-time-v26').forEach(p=>{const t=p.textContent||'';if(t.includes('安全區內工作'))p.title='安全區內工作：不計戶外熱暴露，但仍會消耗標示工時。末尾地點是施工位置限制；例如「耐熱屋」表示必須人在耐熱屋／基地才能做。';else if(t.includes('戶外施工'))p.title='戶外施工：標示工時會同時計入熱暴露；高溫時需主動冷卻與足夠電量。'});
}
const _openCraftV77=openCraft;
openCraft=function(){const out=_openCraftV77();annotateCraftRulesV77();return out};

/* X14 — keep the quick/planned distinction visible at the decision point. */
function annotateSearchChoiceV77(){
 const quick=$('searchLoc'),plan=$('planLoc');
 if(quick)quick.title=(quick.title?quick.title+'；':'')+'快速搜索：單點、較快，只回收明示標籤資源；同一地點當天搜索後會鎖定。';
 if(plan)plan.title='完整行程：可排多站、人員、工具與路線；完整搜索能取得未標示物資、情報與大型資產線索。'
}
const _openLocationV77=openLocation;
openLocation=function(id){const out=_openLocationV77(id);if(locationKnownV68(id))annotateSearchChoiceV77();return out};

/* X15 — map filters explain what they hide, and never imply unknown truth. */
function installMapFilterTooltipsV77(){
 const defs={all:'顯示所有目前地圖節點。未知節點仍保持未知。',resources:'只篩選已知且仍有可回收資源的地點；未知節點不會因真實庫存被偷偷隱藏。',assets:'只篩選已發現的大型資產位置；未發現資產不會洩漏。',cold:'顯示中央冷卻覆蓋、外部冷站與相關節點。',people:'顯示已知有人口或已接觸聚落的地點。',notes:'只顯示你自己建立過地圖標記的地點。'};
 document.querySelectorAll('[data-mapfilter]').forEach(b=>{b.title=defs[b.dataset.mapfilter]||'地圖篩選';b.setAttribute('aria-label',`${b.textContent.trim()}：${b.title}`)});
 const route=$('routePlanBtn');if(route)route.title='路線規劃：建立多站行程、比較路線並安排人員與裝載；不是單點快速搜索。'
}

const _renderV77=render;
render=function(){const out=_renderV77();installPowerEntryV77();installHudTooltipsV77();annotateResourcesV77();installMapFilterTooltipsV77();return out};
ensureClarityV77();installPowerEntryV77();installHudTooltipsV77();annotateResourcesV77();installMapFilterTooltipsV77();