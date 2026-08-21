(()=>{
 window.__SCORCH_ENTRY_ACTIVE=true;
 const SAVE_KEYS=['scorch60_save_v14_2_2','scorch60_save_v14_2_1','scorch60_save_v14_2','scorch60_save_v14_1','scorch60_save_v14_0','scorch60_save_v13_9','scorch60_save_v13_8','scorch60_save_v13_7','scorch60_save_v13_6','scorch60_save_v13_5','scorch60_save_v13_4','scorch60_save_v13_3','scorch60_save_v13_2','scorch60_save_v13_1','scorch60_save_v13','scorch60_save_v12','scorch60_save_v11','scorch60_save_v10','scorch60_save_v9','scorch60_save_v8','scorch60_save_v7','scorch60_save_v6','scorch60_save_v5','scorch60_save_v4','scorch60_save_v3'];
 const hasValidSave=()=>SAVE_KEYS.some(key=>{try{const raw=localStorage.getItem(key);if(!raw)return false;const data=JSON.parse(raw);return !!data&&typeof data==='object'&&Number.isFinite(Number(data.day))}catch{return false}});
 const entry=document.createElement('section');
 entry.id='demoEntry';entry.className='demo-entry';entry.setAttribute('aria-label','灼城 60 Demo 入口');
 entry.innerHTML=`<div class="demo-entry__layers" aria-hidden="true"><div class="demo-entry__layer demo-entry__layer--sky"></div><div class="demo-entry__layer demo-entry__layer--city"></div><div class="demo-entry__layer demo-entry__layer--station"></div><div class="demo-entry__layer demo-entry__layer--heat"></div><div class="demo-entry__shade"></div></div><div class="demo-entry__content"><div class="demo-entry__copy"><div class="demo-entry__mark">SCORCHED CITY 60 / DEMO BUILD</div><h1>灼城 60</h1><p class="demo-entry__subtitle">Day 30 後，城市進入 100°C 永晝。你有 60 天，把有限的水、設備、人力與情報送到正確的位置。</p><div class="demo-entry__meta"><span>DEMO VERSION</span><span>v14.2.2 QA</span><span>單機瀏覽器版本</span></div></div><div class="demo-entry__menu"><div id="demoEntryStatus" class="demo-entry__status">載入遊戲資料中</div><button id="demoStart" class="primary" disabled>開始 Demo</button><button id="demoContinue" hidden disabled>繼續</button><button id="demoHowTo">遊戲玩法</button><button id="demoSettings">設定</button><div id="demoHowToPanel" class="demo-entry__panel"><h2>遊戲玩法</h2><p>目標是在極端高溫城市中活到 Day 60。</p><p>Day 30 前利用有限夜晚搜索、搬運與建立人脈；資源不會刷新。</p><p>Day 30 起城市進入 100°C 永晝，必須靠主動冷卻、物流與中央通風站維持安全區。</p><p>物資總量並非唯一問題，關鍵是把正確物資在正確時間送到正確位置。</p></div><div id="demoSettingsPanel" class="demo-entry__panel"><h2>音訊設定</h2><p>背景音樂與城市環境音播放器已接入；實際音訊檔會從 assets/audio 載入。</p><p>音訊只採用環境聲、機械 Foley 與低調 ambience，不使用電子嗶聲、街機音效或 chiptune。</p></div></div></div>`;
 document.body.prepend(entry);
 const $e=id=>document.getElementById(id),hideEntry=()=>{entry.hidden=true;document.body.classList.add('demo-entered')};
 const togglePanel=id=>{for(const panel of entry.querySelectorAll('.demo-entry__panel'))panel.classList.toggle('active',panel.id===id&&!panel.classList.contains('active'))};
 $e('demoHowTo').onclick=()=>togglePanel('demoHowToPanel');
 $e('demoSettings').onclick=()=>togglePanel('demoSettingsPanel');
 const files=Array.from({length:81},(_,i)=>`src/game-${String(i).padStart(2,'0')}.js`);
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
  const continueBtn=$e('demoContinue');
  if(canContinue){continueBtn.hidden=false;continueBtn.disabled=false}
  $e('demoEntryStatus').textContent='Demo 已就緒';
  $e('demoStart').disabled=false;
  $e('demoStart').onclick=()=>{
   window.__SCORCH_ENTRY_ACTIVE=false;
   hideEntry();
   tutorialGate=false;
   if(showTutorial&&!tutorial.open)setTimeout(()=>showTutorial(),0);
  };
  if(canContinue)continueBtn.onclick=()=>{
   window.__SCORCH_ENTRY_ACTIVE=false;
   hideEntry();
   const load=document.getElementById('loadBtn');if(load)load.click();
   setTimeout(()=>{tutorialGate=false},250);
  };
 }).catch(err=>{console.error(err);$e('demoEntryStatus').textContent='遊戲程式載入失敗，請重新整理。';const t=document.getElementById('toast');if(t){t.textContent='遊戲程式載入失敗，請重新整理。';t.classList.add('show')}})
})();