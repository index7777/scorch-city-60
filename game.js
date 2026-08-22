(()=>{
 window.__SCORCH_ENTRY_ACTIVE=true;
 window.__SCORCH_BOOT_ERROR='';
 const SAVE_KEYS=['scorch60_save_v14_2_2','scorch60_save_v14_2_1','scorch60_save_v14_2','scorch60_save_v14_1','scorch60_save_v14_0','scorch60_save_v13_9','scorch60_save_v13_8','scorch60_save_v13_7','scorch60_save_v13_6','scorch60_save_v13_5','scorch60_save_v13_4','scorch60_save_v13_3','scorch60_save_v13_2','scorch60_save_v13_1','scorch60_save_v13','scorch60_save_v12','scorch60_save_v11','scorch60_save_v10','scorch60_save_v9','scorch60_save_v8','scorch60_save_v7','scorch60_save_v6','scorch60_save_v5','scorch60_save_v4','scorch60_save_v3'];
 const hasValidSave=()=>SAVE_KEYS.some(key=>{try{const raw=localStorage.getItem(key);if(!raw)return false;const data=JSON.parse(raw);return !!data&&typeof data==='object'&&Number.isFinite(Number(data.day))}catch{return false}});
 const entry=document.createElement('section');
 entry.id='demoEntry';entry.className='demo-entry';entry.setAttribute('aria-label','灼城 60 Demo 入口');
 entry.innerHTML=`<div class="demo-entry__layers" aria-hidden="true"><div class="demo-entry__layer demo-entry__layer--sky"></div><div class="demo-entry__layer demo-entry__layer--city"></div><div class="demo-entry__layer demo-entry__layer--station"></div><div class="demo-entry__layer demo-entry__layer--heat"></div><div class="demo-entry__shade"></div></div><div class="demo-entry__content"><div class="demo-entry__copy"><div class="demo-entry__mark">SCORCHED CITY 60 / DEMO BUILD</div><h1>灼城 60</h1><p class="demo-entry__subtitle">世界廣播公布了完整災害時程。除此之外，沒有提供任何世界資訊。</p><div class="demo-entry__meta"><span>DEMO VERSION</span><span>v14.2.2 QA</span><span>單機瀏覽器版本</span></div></div><div class="demo-entry__menu"><div id="demoEntryStatus" class="demo-entry__status">載入遊戲資料中</div><button id="demoStart" class="primary" disabled>開始 Demo</button><button id="demoContinue" disabled>繼續（無存檔）</button><button id="demoHowTo">世界廣播</button><button id="demoSettings">設定</button><div id="demoHowToPanel" class="demo-entry__panel"><h2>世界廣播</h2><p>Day 1–7：夜晚 8 小時，白晝最高 72°C。</p><p>Day 8–14：夜晚 6 小時，白晝最高 78°C。</p><p>Day 15–21：夜晚 4 小時，白晝最高 84°C。</p><p>Day 22–29：夜晚 2 小時，白晝最高 92°C。</p><p>Day 30 起：夜晚完全消失，白晝最高 100°C。</p></div><div id="demoSettingsPanel" class="demo-entry__panel"><h2>音訊設定</h2><p>背景音樂與城市環境音播放器已接入；實際音訊檔會從 assets/audio 載入。</p><p>音訊只採用環境聲、機械 Foley 與低調 ambience，不使用電子嗶聲、街機音效或 chiptune。</p></div></div></div>`;
 document.body.prepend(entry);
 const $e=id=>document.getElementById(id),hideEntry=()=>{entry.hidden=true;document.body.classList.add('demo-entered')};
 const togglePanel=id=>{for(const panel of entry.querySelectorAll('.demo-entry__panel'))panel.classList.toggle('active',panel.id===id&&!panel.classList.contains('active'))};
 $e('demoHowTo').onclick=()=>togglePanel('demoHowToPanel');$e('demoSettings').onclick=()=>togglePanel('demoSettingsPanel');
 const files=Array.from({length:128},(_,i)=>`src/game-${String(i).padStart(2,'0')}.js`);
 Promise.all(files.map(src=>fetch(src).then(r=>{if(!r.ok)throw new Error(`Failed to load ${src}: ${r.status}`);return r.text()}))).then(parts=>{
  (0,eval)(parts.join('\n'));
  const tutorial=document.getElementById('tutorialDialog');
  let tutorialGate=true,showTutorial=null;
  if(tutorial&&typeof tutorial.showModal==='function'){
   showTutorial=tutorial.showModal.bind(tutorial);
   tutorial.showModal=(...args)=>{if(!tutorialGate&&!tutorial.open)return showTutorial(...args)};
   if(tutorial.open)tutorial.close();
  }
  const canContinue=hasValidSave();
  const continueBtn=$e('demoContinue');continueBtn.hidden=false;continueBtn.disabled=!canContinue;continueBtn.textContent=canContinue?'繼續':'繼續（無存檔）';
  $e('demoEntryStatus').textContent='Demo 已就緒';$e('demoStart').disabled=false;
  $e('demoStart').onclick=()=>{window.__SCORCH_ENTRY_ACTIVE=false;hideEntry();tutorialGate=false;if(showTutorial&&!tutorial.open)setTimeout(()=>showTutorial(),0)};
  if(canContinue)continueBtn.onclick=()=>{window.__SCORCH_ENTRY_ACTIVE=false;hideEntry();const load=document.getElementById('loadBtn');if(load)load.click();setTimeout(()=>{tutorialGate=false},250)};
 }).catch(err=>{window.__SCORCH_BOOT_ERROR=String(err?.stack||err);console.error(err);$e('demoEntryStatus').textContent='遊戲程式載入失敗，請重新整理。';const t=document.getElementById('toast');if(t){t.textContent='遊戲程式載入失敗，請重新整理。';t.classList.add('show')}})
})();