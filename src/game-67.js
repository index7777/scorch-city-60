/* v14.2.2 QA — mainline visibility / onboarding phase 2 / daily brief entry */
function ensureMainlineVisibilityV67(){
 state.flags=state.flags||{};
 state.flags.mainlineV67=state.flags.mainlineV67||{briefSeenDay:0,pendingBriefDay:0};
 state.onboarding=state.onboarding||{};
 state.onboarding.orientationV67=state.onboarding.orientationV67||{brief:false,inventory:false,core:false,status:false};
 return state.flags.mainlineV67
}
function endlessCountdownV67(){return state.day<30?Math.max(0,30-state.day):0}
function coreProgressV67(){return clamp(Math.floor(state.coreProject?.stage||0),0,10)}
function mainlineRiskTextV67(){const b=buildBrief();return `風險 ${b.risk} · 水 ${b.water} 天 · 食物 ${b.food} 天`}
function installMainlineHudV67(){
 if($('mainlineHudV67'))return $('mainlineHudV67');
 const rail=document.createElement('section');rail.id='mainlineHudV67';rail.className='mainline-hud-v67';rail.setAttribute('aria-label','主線與每日決策摘要');
 rail.innerHTML=`<button type="button" data-mainline-open="brief"><span>今日簡報</span><b id="mainlineBriefV67">—</b><small id="mainlineRiskV67">—</small></button><button type="button" data-mainline-open="countdown"><span>永晝倒數</span><b id="mainlineCountdownV67">—</b><small>Day 30 起 100°C 永晝</small></button><button type="button" data-mainline-open="core"><span>冷源核心主線</span><b id="mainlineCoreV67">0 / 10</b><small>中央站最終修復工程</small></button><button type="button" data-mainline-open="inventory"><span>隨身／物流規則</span><b>徒手 18 kg</b><small>大型資產必須實體搬運</small></button>`;
 const crisis=$('crisisRail');if(crisis?.parentNode)crisis.insertAdjacentElement('afterend',rail);else document.querySelector('.topbar')?.insertAdjacentElement('afterend',rail);
 rail.querySelectorAll('[data-mainline-open]').forEach(b=>b.onclick=()=>{
  const k=b.dataset.mainlineOpen;
  if(k==='brief')openBrief();
  else if(k==='core')openCoreProject();
  else if(k==='inventory')openInventory();
  else toast(state.day<30?`距離 Day 30 永晝還有 ${endlessCountdownV67()} 天`:'Day 30 永晝已開始：戶外行動必須依賴主動冷卻與安全區');
 });
 return rail
}
function renderMainlineHudV67(){
 const f=ensureMainlineVisibilityV67();installMainlineHudV67();
 const left=endlessCountdownV67(),stage=coreProgressV67();
 if($('mainlineCountdownV67'))$('mainlineCountdownV67').textContent=state.day<30?`${left} 天`:'永晝中';
 if($('mainlineCoreV67'))$('mainlineCoreV67').textContent=state.base?.core?'10 / 10 完成':`${stage} / 10`;
 if($('mainlineBriefV67'))$('mainlineBriefV67').textContent=f.briefSeenDay===state.day?'今日已讀':'今日未讀';
 if($('mainlineRiskV67'))$('mainlineRiskV67').textContent=mainlineRiskTextV67();
 const rail=$('mainlineHudV67');if(rail)rail.classList.toggle('endless',state.day>=30)
}

/* Tutorial phase 2: logistics basics first, then explicitly reveal the 60-day mainline. */
tutorialStage=function(){
 if(!state.onboarding?.enabled||state.onboarding.completed)return 0;
 if(!state.onboarding.firstWater)return 1;
 if(!state.gear.cart)return 2;
 if(!state.onboarding.firstAsset)return 3;
 if(!state.onboarding.mainlineReviewedV67)return 4;
 return 5
};
tutorialCopy=function(){
 const st=tutorialStage();
 if(st===1)return {k:'STEP 1 / 4',title:'先把水帶回來',text:'夜晚只有 8 小時。先完成第一趟補水，但記住：這只是 60 天計畫的第一步。',cta:'規劃便利商店遠征',target:'store'};
 if(st===2)return {k:'STEP 2 / 4',title:'理解隨身空間與載重',text:'徒手只有 18kg。取得推車後可提升到 80kg；小型庫存與大型資產會走不同的物流規則。',cta:'前往五金行',target:'hardware'};
 if(st===3)return {k:'STEP 3 / 4',title:'理解「找到 ≠ 擁有」',text:'去社區中心發現大型水桶。大型資產必須實際搬運；發現、取得所有權、運回基地是三件不同的事。',cta:'前往社區中心',target:'school'};
 if(st===4)return {k:'STEP 4 / 4',title:'看懂真正主線：Day 30 與冷源核心',text:'Day 30 起城市進入 100°C 永晝。你要在 60 天內建立中央安全區，找到冷源核心並完成 10 階段修復；每日簡報會告訴你哪個系統最先失控。',cta:'查看主線與策略面板',target:'__mainline__'};
 return {k:'導覽完成',title:'你已掌握第一個生存循環與主線',text:'之後每一天都同時處理短期生存與長期工程：資源、NPC、研究、公共庫存與中央站都會影響 Day 60 結局。',cta:'完成導覽',target:''}
};
renderOnboarding=function(){
 const box=$('onboardingRail');if(!box)return;
 if(!state.onboarding?.enabled){box.hidden=true;return}
 box.hidden=false;const c=tutorialCopy();$('tutorialKicker').textContent=c.k;$('tutorialTitle').textContent=c.title;$('tutorialText').textContent=c.text;$('tutorialCta').textContent=c.cta;$('tutorialCta').dataset.target=c.target||'';
 if(tutorialStage()===5&&!state.onboarding.completed){state.onboarding.completed=true;log('開局導覽完成：短期生存、Day 30 永晝與冷源核心主線已解鎖。','good')}
};

function ensureOrientationDialogV67(){
 let dlg=$('mainlineOrientationV67');if(dlg)return dlg;
 dlg=document.createElement('dialog');dlg.id='mainlineOrientationV67';dlg.innerHTML=`<div class="dialog-body wide mainline-orientation-v67"><span class="tutorial-kicker">STRATEGIC ORIENTATION</span><h2>你不是只在搜刮物資：你有 60 天修復城市</h2><div id="orientationStatusV67"></div><div class="orientation-grid-v67"><button data-orient-v67="brief"><b>1. 每日簡報</b><span>看風險、事件鏈與今天最該處理的系統。</span></button><button data-orient-v67="inventory"><b>2. 資產總覽</b><span>分清小型庫存、隨身載重與必須實體搬運的大型資產。</span></button><button data-orient-v67="core"><b>3. 冷源核心工程</b><span>確認最終主線是 10 階段工程，而不是單純活到 Day 60。</span></button></div><div class="dialog-actions"><button id="finishOrientationV67" disabled>完成主線導覽</button></div></div>`;
 document.body.appendChild(dlg);return dlg
}
function orientationStateV67(){ensureMainlineVisibilityV67();return state.onboarding.orientationV67}
function renderOrientationV67(){
 const dlg=ensureOrientationDialogV67(),o=orientationStateV67();o.status=true;
 const status=$('orientationStatusV67');if(status)status.innerHTML=`<div class="orientation-summary-v67"><div><span>灼城狀態</span><b>${mainlineRiskTextV67()}</b></div><div><span>${state.day<30?'距離永晝':'目前時代'}</span><b>${state.day<30?endlessCountdownV67()+' 天':'100°C 永晝'}</b></div><div><span>冷源核心工程</span><b>${coreProgressV67()} / 10</b></div></div><p class="muted">Day 1–29 利用夜晚建立物流、NPC、研究與設備基礎；Day 30 後靠主動冷卻與中央站維持安全區；Day 60 前完成冷源核心修復。</p>`;
 dlg.querySelectorAll('[data-orient-v67]').forEach(b=>{const k=b.dataset.orientV67;b.classList.toggle('done',!!o[k]);b.onclick=()=>visitOrientationPanelV67(k)});
 const done=o.brief&&o.inventory&&o.core;const finish=$('finishOrientationV67');if(finish){finish.disabled=!done;finish.onclick=()=>{if(!done)return;state.onboarding.mainlineReviewedV67=true;state.onboarding.completed=true;state.onboarding.enabled=false;dlg.close();render();saveGame(false);toast('主線導覽完成：每日簡報與主線 HUD 會持續保留')}}
}
function openOrientationV67(){renderOrientationV67();const dlg=ensureOrientationDialogV67();if(!dlg.open)dlg.showModal()}
function visitOrientationPanelV67(kind){
 const dlg=ensureOrientationDialogV67(),o=orientationStateV67();o[kind]=true;dlg.close();
 let target=null;if(kind==='brief'){target=$('briefDialog');openBrief()}else if(kind==='inventory'){target=$('inventoryDialog');openInventory()}else if(kind==='core'){target=$('coreProjectDialog');openCoreProject()}
 if(target)target.addEventListener('close',()=>{if(!state.onboarding.mainlineReviewedV67)setTimeout(openOrientationV67,0)},{once:true});saveGame(false)
}
if($('tutorialCta'))$('tutorialCta').onclick=()=>{const st=tutorialStage(),t=$('tutorialCta').dataset.target;if(st===4||t==='__mainline__')return openOrientationV67();if(!t){state.onboarding.enabled=false;state.onboarding.completed=true;render();saveGame(false);return}openActionCenter(t)};

/* Opening the briefing manually counts as today's briefing. */
const _openBriefV67=openBrief;
openBrief=function(){const f=ensureMainlineVisibilityV67();f.briefSeenDay=state.day;f.pendingBriefDay=0;const out=_openBriefV67();renderMainlineHudV67();saveGame(false);return out};
function noOpenDialogV67(){return !document.querySelector('dialog[open]')}
function queueDailyBriefV67(day){const f=ensureMainlineVisibilityV67();if(f.briefSeenDay===day)return;f.pendingBriefDay=day;setTimeout(tryPendingDailyBriefV67,80)}
function tryPendingDailyBriefV67(){
 const f=ensureMainlineVisibilityV67();if(!f.pendingBriefDay||f.pendingBriefDay!==state.day||f.briefSeenDay===state.day)return;
 if(window.__SCORCH_ENTRY_ACTIVE||!noOpenDialogV67())return;
 if(state.onboarding?.enabled&&!state.onboarding.completed)return;
 openBrief()
}
const _advanceV67=advance;
advance=function(){const before=state.day,out=_advanceV67();if(state.day!==before)queueDailyBriefV67(state.day);return out};
document.addEventListener('close',()=>{const f=ensureMainlineVisibilityV67();if(f.pendingBriefDay===state.day)setTimeout(tryPendingDailyBriefV67,30)},true);

const _renderV67=render;
render=function(){const out=_renderV67();renderMainlineHudV67();return out};
ensureMainlineVisibilityV67();installMainlineHudV67();renderMainlineHudV67();
