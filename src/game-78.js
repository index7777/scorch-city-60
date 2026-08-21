/* v14.2.2 QA — X16–X22 decision-path continuity */
const RESEARCH_SOURCE_HINT_V78={
 water:'常見來源：診所、住宅區與水務／消防設施的設備文件。',
 cooling:'常見來源：工業區、大型冷庫與冷凍空調專業 NPC。',
 solar:'常見來源：太陽能場、研究園區與工業配電設備。',
 coldStation:'常見來源：研究園區、地鐵維修站與大型冷庫的熱工資料。',
 core:'常見來源：研究園區與中央通風站；需先確認冷源核心位置。'
};
const CRAFT_CATEGORY_V78={
 cart:'物流',toolkit:'物流',tank:'水務',filter:'水務',power:'電力',solar:'電力',coolpack:'冷卻',coldSubway:'冷卻',coldStore:'冷卻',vent1:'中央站',vent2:'中央站',maintain:'維護',coolingVehicle:'物流'
};
const CRAFT_PREREQ_V78={
 filter:()=>['完成研究「多級濾水」','濾水模組未達上限'],
 solar:()=>['完成研究「微型太陽能電網」','尚未建立太陽能陣列'],
 coolpack:()=>['完成研究「主動液冷裝備」','尚未製作主動冷卻背包'],
 coldSubway:()=>['Day 30 之後','完成研究「外部冷站」','地鐵冷站尚未建立'],
 coldStore:()=>['Day 30 之後','完成研究「外部冷站」','冷庫冷站尚未建立'],
 vent1:()=>['Day 30 之後','中央站初級冷卻尚未啟動'],
 vent2:()=>['中央站初級冷卻已啟動','中央供電至少 8 kW','至少運回並安裝 1 台工業壓縮機','已運回並安裝高流量消防泵'],
 maintain:()=>['Day 30 之後','中央站已啟動','中央站設備狀況低於 92%']
};
function openDecisionTargetV78(kind){
 closeDialogById('briefDialog');
 if(kind==='resources'){state.mapPlanner=state.mapPlanner||{};state.mapPlanner.filter='resources';state.mapPlanner.active=true;renderMap();toast('已切到資源／行程規劃：選擇地點後安排搜索')}
 else if(kind==='craft')openCraft();
 else if(kind==='power'){if(typeof openPowerManagementV77==='function')openPowerManagementV77();else openInventory()}
 else if(kind==='base')openBaseMgmt();
 else if(kind==='core')openCoreProject();
 else if(kind==='city')openCityOps();
}
function briefTargetV78(text){const s=String(text||'');if(/核心|終局|Day 60/.test(s))return 'core';if(/疲勞|人力|工作分配/.test(s))return 'base';if(/供電|儲能|發電|電網/.test(s))return 'power';if(/冷站|中央站|維護|擴容|冷卻/.test(s))return 'craft';if(/人口|遷入|聚落/.test(s))return 'city';return 'resources'}

/* X16 — every briefing recommendation gets a direct action path. */
function annotateBriefActionsV78(){
 document.querySelectorAll('#briefContent .choice').forEach(card=>{if(card.querySelector('[data-brief-jump-v78]'))return;const text=card.textContent||'',kind=briefTargetV78(text),b=document.createElement('button');b.type='button';b.className='mini secondary brief-jump-v78';b.dataset.briefJumpV78=kind;b.textContent=kind==='core'?'前往核心工程':kind==='base'?'前往人力分配':kind==='power'?'前往電力管理':kind==='craft'?'前往相關工程':kind==='city'?'前往城市作業':'前往資源／行程';b.onclick=()=>openDecisionTargetV78(kind);card.appendChild(b)})
}
const _openBriefV78=openBrief;
openBrief=function(){const out=_openBriefV78();annotateBriefActionsV78();return out};

/* X17 — research cards explicitly state where the data normally comes from. */
function annotateResearchSourcesV78(){
 document.querySelectorAll('#researchList [data-research]').forEach(btn=>{const card=btn.closest('.card'),id=btn.dataset.research;if(!card||card.querySelector('.research-source-v78'))return;const p=document.createElement('p');p.className='research-source-v78';p.textContent=RESEARCH_SOURCE_HINT_V78[id]||'研究資料主要來自實地搜索、設備文件與已接觸專業 NPC。';card.insertBefore(p,btn)})
}
const _openResearchV78=openResearch;
openResearch=function(){const out=_openResearchV78();annotateResearchSourcesV78();return out};

/* X18/X19 — engineering categories + explicit prerequisite accounting. */
function craftMissingV78(id){
 const c=craftDefs.find(x=>x.id===id);if(!c)return [];
 const out=[];for(const [k,v] of Object.entries(c.cost||{})){const have=Math.floor(state.resources?.[k]||0);if(have<v)out.push(`${RES_LABELS[k]||k} ${have}/${v}`)}
 if(!c.cond()&&CRAFT_PREREQ_V78[id])out.push(...CRAFT_PREREQ_V78[id]());
 else if(!c.cond()&&!out.length)out.push('仍有工程前置條件未達成');
 return [...new Set(out)]
}
function applyCraftFilterV78(category='all'){
 document.querySelectorAll('#craftList .card').forEach(card=>{const id=card.querySelector('[data-craft]')?.dataset.craft,cat=CRAFT_CATEGORY_V78[id]||'其他';card.hidden=category!=='all'&&cat!==category});
 document.querySelectorAll('[data-craft-filter-v78]').forEach(b=>b.classList.toggle('active',b.dataset.craftFilterV78===category))
}
function annotateCraftV78(){
 const list=$('craftList');if(!list)return;
 if(!$('craftFiltersV78')){const cats=['all',...new Set(craftDefs.map(c=>CRAFT_CATEGORY_V78[c.id]||'其他'))],bar=document.createElement('div');bar.id='craftFiltersV78';bar.className='craft-filters-v78';bar.innerHTML=cats.map(c=>`<button type="button" class="mini ${c==='all'?'active':''}" data-craft-filter-v78="${c}">${c==='all'?'全部':c}</button>`).join('');list.parentNode.insertBefore(bar,list);bar.querySelectorAll('[data-craft-filter-v78]').forEach(b=>b.onclick=()=>applyCraftFilterV78(b.dataset.craftFilterV78))}
 document.querySelectorAll('#craftList [data-craft]').forEach(btn=>{const id=btn.dataset.craft,card=btn.closest('.card');if(!card)return;let tag=card.querySelector('.craft-category-v78');if(!tag){tag=document.createElement('span');tag.className='craft-category-v78';card.insertBefore(tag,card.firstChild)}tag.textContent=CRAFT_CATEGORY_V78[id]||'其他';let req=card.querySelector('.craft-prereq-v78');if(!req){req=document.createElement('div');req.className='craft-prereq-v78';card.insertBefore(req,btn)}const missing=craftMissingV78(id);req.innerHTML=missing.length?`<b>目前缺少／前置</b><span>${missing.join(' · ')}</span>`:'<b>前置條件</b><span>已滿足</span>'});
}
const _openCraftV78=openCraft;
openCraft=function(){const out=_openCraftV78();annotateCraftV78();return out};

/* X20 — relationship deltas are visible before NPC trade/social choices. */
function annotateTradeRelationsV78(){
 document.querySelectorAll('#tradeContent [data-offer]').forEach(b=>{if(!b.dataset.relV78){b.dataset.relV78='1';b.insertAdjacentHTML('beforeend',' <small class="relation-preview-v78">關係 +2</small>')}});
 const defs={helpNpc:'關係 +3',askIntel:'關係 +1',robNpc:'關係 −8'};for(const [id,label] of Object.entries(defs)){const b=$(id);if(b&&!b.dataset.relV78){b.dataset.relV78='1';b.insertAdjacentHTML('beforeend',` <small class="relation-preview-v78">${label}</small>`)}}
}
const _openTradeV78=openTrade;
openTrade=function(id){const out=_openTradeV78(id);annotateTradeRelationsV78();return out};

/* X21 — first-contact choices state what they actually change. */
const NPC_CHOICE_HINT_V78={approach:'進一步確認身份；不會直接取得物資',observe:'只確認有人活動；不解鎖交易',leave:'結束接觸；不推進身份確認',askRole:'確認專業並解鎖交易／情報入口',trade:'進入既有 1:1 交易與情報介面'};
function annotateNpcChoicesV78(){document.querySelectorAll('#incidentChoices [data-npc-choice]').forEach(b=>{if(b.querySelector('.npc-choice-hint-v78'))return;const s=document.createElement('small');s.className='npc-choice-hint-v78';s.textContent=NPC_CHOICE_HINT_V78[b.dataset.npcChoice]||'結果依目前關係與世界狀態決定';b.appendChild(s)})}
const _openNpcEncounterV78=openNpcEncounter;
openNpcEncounter=function(id){const out=_openNpcEncounterV78(id);annotateNpcChoicesV78();return out};

/* X22 — daylight tells the player what is blocked and what still works. */
function renderDaylightHintV78(){
 let h=$('daylightHintV78');if(!h){h=document.createElement('div');h.id='daylightHintV78';h.className='daylight-hint-v78';const shell=document.querySelector('.map-shell');if(shell)shell.insertAdjacentElement('beforebegin',h)}
 if(!h)return;const show=state.day<30&&state.phase==='day';h.hidden=!show;if(show)h.innerHTML='<b>白晝快速搜索目前不可用</b><span>安全區內工程仍可進行。研究「主動液冷裝備」並使用完整行程／暴露檢查，可為高溫外勤準備有限的主動冷卻能力；真正能否出發仍以當下溫度、冷卻電量與返程時間判定。</span>'
}
const _renderV78=render;
render=function(){const out=_renderV78();renderDaylightHintV78();return out};

renderDaylightHintV78();