// v14.3 resident-perspective redesign, P1 resident journal.
// Reframe the daily brief around the player's own condition, actions and sourced information.
(function(){
 function journalPlayerStatusV90(){
  const p=state.player||{};
  const rows=[
   ['水分',Math.round(Number(p.hydration??100))+'%'],
   ['飽足',Math.round(Number(p.satiety??100))+'%'],
   ['體力',Math.round(Number(p.stamina??100))+'%'],
   ['健康',Math.round(Number(p.health??100))+'%'],
   ['體溫',Number(p.bodyTemp??36.5).toFixed(1)+'°C']
  ];
  return rows.map(([k,v])=>`<div><b>${k}</b> ${v}</div>`).join('');
 }
 function journalBroadcastV90(){
  const day=Number(state.day||1);
  const night=typeof nightHours==='function'?nightHours(day):'?';
  const temp=typeof dayTemp==='function'?dayTemp(day):'?';
  return `<div><b>廣播回顧</b></div><div>Day ${day}：今晚可活動時間約 ${night} 小時；白晝最高溫約 ${temp}°C。</div><div>廣播仍反覆提到 Day 30 起將沒有夜晚，以及 Day 60 這個期限。</div>`;
 }
 function journalEarlyWarningV90(){
  const day=Number(state.day||1);
  if(day>3||typeof chainLevel!=='function')return '';
  const waterLevel=Number(chainLevel('water')||0);
  if(waterLevel<1)return '';
  return '<div class="resident-info-line"><span class="source-label observed">親眼</span><span><b>前兆：</b>你開始注意到取水與補水比預期更吃力。現在還不足以判斷整座城市發生了什麼，但這值得記下來。</span></div>';
 }
 function journalPersonalEventsV90(){
  const logs=[];
  const candidates=[state.log,state.logs,state.history,state.journal,state.events];
  for(const src of candidates){
   if(!Array.isArray(src))continue;
   for(const item of src.slice(-8)){
    const text=typeof item==='string'?item:(item?.text||item?.message||item?.summary||'');
    if(text&&typeof text==='string')logs.push(text);
   }
   if(logs.length)break;
  }
  if(!logs.length)return '<div class="muted">你沒有留下足夠清楚的昨日紀錄。</div>';
  return logs.slice(-5).map(x=>`<div>${String(x)}</div>`).join('');
 }
 function journalHeardV90(){
  const entries=Array.isArray(state.knowledge?.entries)?state.knowledge.entries:[];
  const heard=entries.filter(e=>e&&e.type!=='observed').slice(-5);
  if(!heard.length)return '<div class="muted">今天沒有新的可靠廣播或傳聞紀錄。</div>';
  return heard.map(e=>`<div>${e.text||''}<div class="muted">來源：${e.source||'未知'} · 可信度 ${Number(e.confidence??0)}% · Day ${e.day||state.day||1}</div></div>`).join('');
 }
 function journalFeelingV90(){
  const p=state.player||{};
  const h=Number(p.hydration??100),s=Number(p.satiety??100),st=Number(p.stamina??100),hp=Number(p.health??100),bt=Number(p.bodyTemp??36.5);
  if(bt>=39||h<35||hp<40)return '身體狀況正在逼你縮小計畫；今天最重要的是先讓自己撐住。';
  if(st<35||s<35)return '你感到疲憊，下一次外出最好保留更多返程餘裕。';
  return '目前還撐得住，但這座城市沒有替你保證明天。';
 }
 function renderResidentJournalV90(){
  const dlg=document.getElementById('briefDialog'),content=document.getElementById('briefContent');
  if(!dlg||!content)return;
  const h=dlg.querySelector('h2');if(h&&h.textContent!=='你的日記 + 廣播回顧')h.textContent='你的日記 + 廣播回顧';
  content.innerHTML=`<section class="resident-journal"><h3>你現在的狀態</h3>${journalPlayerStatusV90()}<h3>昨天與最近做過的事</h3>${journalPersonalEventsV90()}${journalEarlyWarningV90()}<h3>你聽到的</h3>${journalHeardV90()}<h3>廣播回顧</h3>${journalBroadcastV90()}<h3>你的感覺</h3><div>${journalFeelingV90()}</div></section>`;
 }
 if(typeof openBrief==='function'){
  const originalOpenBriefV90=openBrief;
  openBrief=function(){const out=originalOpenBriefV90();renderResidentJournalV90();return out};
 }
})();
