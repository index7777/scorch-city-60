function renderV13(){
 setBodyState();const score=currentRiskScore();const level=score>=9?'極高':score>=6?'高':score>=3?'警戒':'低';
 if($('riskLevel'))$('riskLevel').textContent=`整體風險：${level}`;
 const chips=[];if(daysOfWater()<5)chips.push(['供水',daysOfWater()<=2]);if(state.day>=30&&coolingLoadPct()>90)chips.push(['冷卻負荷',coolingLoadPct()>105]);if(overCapacity()>0)chips.push([`超載 ${overCapacity()} 人`,true]);if(state.base.condition<70&&state.day>=30)chips.push([`設備 ${Math.round(state.base.condition)}%`,state.base.condition<50]);if(state.day>=45&&!state.base.core)chips.push([`核心 ${state.coreProject.stage}/10`,coreSchedulePressure()>=2]);if(!chips.length)chips.push(['系統暫時穩定',false]);
 if($('crisisItems'))$('crisisItems').innerHTML=chips.map(([t,b])=>`<span class="crisis-chip ${b?'bad':''}">${t}</span>`).join('');
 if($('envReadout'))$('envReadout').textContent=state.day>=30?'100°C 永晝／主動冷卻必要':state.phase==='night'?'夜間低溫窗口／適合遠征':'致命白晝／建議留在安全區';
 if($('heatIndex'))$('heatIndex').textContent=(state.day>=30?100:(state.phase==='night'?8:dayTemp(state.day)))+'°C';
}
function showDayTransition(kicker,title,text){if(!$('dayTransition'))return;$('transitionKicker').textContent=kicker;$('transitionTitle').textContent=title;$('transitionText').textContent=text;$('dayTransition').classList.add('show');$('dayTransition').setAttribute('aria-hidden','false');playAlert('major')}
function closeDayTransition(){if(!$('dayTransition'))return;$('dayTransition').classList.remove('show');$('dayTransition').setAttribute('aria-hidden','true')}
function playAlert(type='major'){if(!audioEnabled)return;try{audioCtx=audioCtx||new (window.AudioContext||window.webkitAudioContext)();const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type=type==='bad'?'sawtooth':'sine';o.frequency.setValueAtTime(type==='bad'?160:420,audioCtx.currentTime);o.frequency.exponentialRampToValueAtTime(type==='bad'?95:260,audioCtx.currentTime+.22);g.gain.setValueAtTime(.0001,audioCtx.currentTime);g.gain.exponentialRampToValueAtTime(.055,audioCtx.currentTime+.018);g.gain.exponentialRampToValueAtTime(.0001,audioCtx.currentTime+.28);o.connect(g);g.connect(audioCtx.destination);o.start();o.stop(audioCtx.currentTime+.3)}catch(e){}}
async function toggleAudio(){
 audioEnabled=!audioEnabled;
 const btn=$('soundBtn');
 if(btn){btn.textContent=audioEnabled?'音效 ON':'音效 OFF';btn.setAttribute('aria-pressed',audioEnabled?'true':'false');btn.classList.toggle('active',audioEnabled)}
 if(audioEnabled){
  try{
   audioCtx=audioCtx||new (window.AudioContext||window.webkitAudioContext)();
   if(audioCtx.state==='suspended')await audioCtx.resume();
   playAlert('major');
   toast('警報音效已開啟');
  }catch(e){console.warn('Audio unavailable',e);audioEnabled=false;if(btn){btn.textContent='音效 OFF';btn.setAttribute('aria-pressed','false');btn.classList.remove('active')}toast('瀏覽器目前無法啟用音效')}
 }else{toast('警報音效已關閉')}
}

function bindClick(id,handler){const el=$(id);if(!el){console.warn(`[UI] missing #${id}`);return false}el.addEventListener('click',handler);return true}
function closeDialogById(id){const dlg=$(id);if(dlg&&typeof dlg.close==='function'&&dlg.open)dlg.close()}
function installGlobalUiHandlers(){
 // Generic close handler means one missing control can never prevent later bindings.
 document.addEventListener('click',e=>{
  const closeBtn=e.target.closest('[data-close-dialog]');
  if(closeBtn){e.preventDefault();e.stopPropagation();closeDialogById(closeBtn.dataset.closeDialog);return}
 });
 // Clicking the backdrop itself closes ordinary dialogs, not clicks inside the card.
 document.querySelectorAll('dialog').forEach(dlg=>dlg.addEventListener('click',e=>{if(e.target===dlg)dlg.close()}));
 bindClick('soundBtn',toggleAudio);
 const btn=$('soundBtn');if(btn){btn.textContent=audioEnabled?'音效 ON':'音效 OFF';btn.setAttribute('aria-pressed',audioEnabled?'true':'false')}
}

function advance(){if(state.gameOver)return;if(state.day<30){if(state.phase==='night'){state.phase='day';state.hoursLeft=24-nightHours(state.day);log('夜晚結束，城市重新進入致命白晝。');render();return}consumeDaily();state.day++;state.phase='night';state.hoursLeft=nightHours(state.day);dynamicEvents()}else{consumeDaily();state.day++;dynamicEvents()}checkState();render()}
function emergencyRecovery(){if(state.resources.water<0){let need=Math.ceil(-state.resources.water)+1;if(state.privatePool.water>0){const take=Math.min(need,state.privatePool.water);state.privatePool.water-=take;state.resources.water+=take;log(`公共水箱見底，居民緊急釋出 ${take}L 私人存水。`,'major')}if(state.resources.water<0){const donor=Object.values(state.settlements).filter(x=>x.population>0&&x.trust>0&&x.water>12).sort((a,b)=>b.trust-a.trust)[0];if(donor){const take=Math.min(Math.ceil(-state.resources.water)+2,8,donor.water-8);if(take>0){donor.water-=take;state.resources.water+=take;donor.trust-=1;log(`${donor.name}緊急送來 ${take}L 水；這是一次性人情，不是穩定供水。`,'major')}}}}}
function checkState(){emergencyRecovery();if(state.resources.water<0||state.resources.food<0){state.gameOver=true;log('基地生存資源耗盡，且沒有任何可立即調度的替代來源。','bad');toast('生存失敗')}if(state.day>60&&!state.gameOver){state.gameOver=true;const total=totalLiving();if(state.base.core&&state.base.condition>=40){log(`Day 60：中央通風站完整重啟。已知存活人口 ${total}，中央站狀況 ${Math.round(state.base.condition)}%。`,'major');toast('城市重啟結局')}else if(state.base.ventilation){log(`Day 60：你建立了局部避難系統。已知存活人口 ${total}。`,'major');toast('避難所結局')}else{log(`Day 60：你撐過永晝，但中央站沒有形成穩定系統。`,'major');toast('個人生還結局')}}}

installGlobalUiHandlers();
bindClick('restBtn',advance);bindClick('craftBtn',openCraft);bindClick('actionCenterBtn',()=>openActionCenter());bindClick('researchBtn',openResearch);bindClick('inventoryBtn',openInventory);bindClick('baseMgmtBtn',openBaseMgmt);bindClick('briefBtn',openBrief);bindClick('coreProjectBtn',openCoreProject);bindClick('cityOpsBtn',()=>openCityOps());bindClick('saveBtn',()=>saveGame(true));bindClick('loadBtn',loadGame);bindClick('newBtn',newGame);bindClick('helpBtn',()=>{if($('tutorialDialog'))$('tutorialDialog').showModal();else if($('helpDialog'))$('helpDialog').showModal()});bindClick('clearLogBtn',()=>{state.log=[];renderLog()});
bindClick('transitionClose',closeDayTransition);
bindClick('cityIntel',()=>{closeDialogById('cityOpsDialog');openIntel()});
bindClick('citySettlements',()=>{closeDialogById('cityOpsDialog');openSettlements()});
bindClick('cityLogistics',()=>{closeDialogById('cityOpsDialog');openLogistics()});
if($('tutorialCta'))$('tutorialCta').onclick=()=>{const t=$('tutorialCta').dataset.target;if(!t){state.onboarding.enabled=false;render();return}openActionCenter(t)};if($('tutorialStart'))$('tutorialStart').onclick=startOnboarding;if($('tutorialSkip'))$('tutorialSkip').onclick=skipOnboarding;if($('tutorialRestart'))$('tutorialRestart').onclick=reopenOnboarding;if($('tutorialRules'))$('tutorialRules').onclick=()=>{$('tutorialDialog').close();$('helpDialog').showModal()};
log('你在耐熱屋醒來。屋內安全，但沒有任何水或食物補給。','major');log('v14.2.2 QA：修復地圖渲染、道路情報函式、彈窗、音效與探索入口。','good');render();if(state.onboarding.enabled&&!state.onboarding.introSeen&&$('tutorialDialog'))setTimeout(()=>$('tutorialDialog').showModal(),120);
