(()=>{
 const entry=document.createElement('section');
 entry.id='demoEntry';entry.className='demo-entry';entry.setAttribute('aria-label','灼城 60 Demo 入口');
 entry.innerHTML=`<div class="demo-entry__layers" aria-hidden="true"><div class="demo-entry__layer demo-entry__layer--sky"></div><div class="demo-entry__layer demo-entry__layer--city"></div><div class="demo-entry__layer demo-entry__layer--station"></div><div class="demo-entry__layer demo-entry__layer--heat"></div><div class="demo-entry__shade"></div></div><div class="demo-entry__content"><div class="demo-entry__copy"><div class="demo-entry__mark">SCORCHED CITY 60 / DEMO BUILD</div><h1>灼城 60</h1><p class="demo-entry__subtitle">Day 30 後，城市進入 100°C 永晝。你有 60 天，把有限的水、設備、人力與情報送到正確的位置。</p><div class="demo-entry__meta"><span>DEMO VERSION</span><span>v14.2.2 QA</span><span>單機瀏覽器版本</span></div></div><div class="demo-entry__menu"><div id="demoEntryStatus" class="demo-entry__status">載入遊戲資料中</div><button id="demoStart" class="primary" disabled>開始 Demo</button><button id="demoContinue" disabled>繼續</button><button id="demoSettings">設定</button><button id="demoCredits">製作名單 / 授權</button><div id="demoSettingsPanel" class="demo-entry__panel"><h2>音訊設定</h2><p>Demo 入口目前不播放音樂或 UI 提示音。</p><p>正式音訊只採用環境聲、機械 Foley 與低調 ambience，不使用電子嗶聲、街機音效或 chiptune。</p></div><div id="demoCreditsPanel" class="demo-entry__panel"><h2>Demo 與素材授權</h2><p>第三方素材尚未直接放入入口背景。背景、建築層、熱浪層與 UI 均維持可獨立替換的結構。</p><p>外部素材候選與授權紀錄：assets/licenses/ASSET_SHORTLIST.md</p></div></div></div>`;
 document.body.prepend(entry);
 const $e=id=>document.getElementById(id),hideEntry=()=>{entry.hidden=true;document.body.classList.add('demo-entered')};
 const togglePanel=id=>{for(const panel of entry.querySelectorAll('.demo-entry__panel'))panel.classList.toggle('active',panel.id===id&&!panel.classList.contains('active'))};
 $e('demoSettings').onclick=()=>togglePanel('demoSettingsPanel');
 $e('demoCredits').onclick=()=>togglePanel('demoCreditsPanel');
 const files=Array.from({length:23},(_,i)=>`src/game-${String(i).padStart(2,'0')}.js`);
 Promise.all(files.map(src=>fetch(src).then(r=>{if(!r.ok)throw new Error(`Failed to load ${src}: ${r.status}`);return r.text()}))).then(parts=>{
  (0,eval)(parts.join('\n'));
  const tutorial=document.getElementById('tutorialDialog');
  let tutorialGate=true,showTutorial=null;
  if(tutorial&&typeof tutorial.showModal==='function'){
   showTutorial=tutorial.showModal.bind(tutorial);
   tutorial.showModal=(...args)=>{if(!tutorialGate&&!tutorial.open)return showTutorial(...args)};
   if(tutorial.open)tutorial.close();
  }
  $e('demoEntryStatus').textContent='Demo 已就緒';
  $e('demoStart').disabled=false;$e('demoContinue').disabled=false;
  $e('demoStart').onclick=()=>{
   hideEntry();
   tutorialGate=false;
   if(showTutorial&&!tutorial.open)setTimeout(()=>showTutorial(),0);
  };
  $e('demoContinue').onclick=()=>{
   hideEntry();
   const load=document.getElementById('loadBtn');if(load)load.click();
   setTimeout(()=>{tutorialGate=false},250);
  };
 }).catch(err=>{console.error(err);$e('demoEntryStatus').textContent='遊戲程式載入失敗，請重新整理。';const t=document.getElementById('toast');if(t){t.textContent='遊戲程式載入失敗，請重新整理。';t.classList.add('show')}})
})();