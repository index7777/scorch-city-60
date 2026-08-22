// v14.3 resident-perspective redesign, P0 slice.
// Formal source icons/art are intentionally deferred to generated assets; this slice uses text source labels only.
(function(){
 const RESIDENT_DEFAULT_PLAYER={hydration:100,satiety:100,stamina:100,health:100,bodyTemp:36.5,heat:0};
 const RESIDENT_BROADCAST=[
  {day:1,label:'現在',hours:8,temp:72},
  {day:8,label:'D8',hours:6,temp:78},
  {day:15,label:'D15',hours:4,temp:84},
  {day:22,label:'D22',hours:2,temp:92},
  {day:30,label:'D30',hours:0,temp:100}
 ];
 const sourceTag=(type,label)=>`<span class="source-label ${type}">${label}</span>`;

 function ensureResidentState(){
  state.player={...RESIDENT_DEFAULT_PLAYER,...(state.player||{})};
  state.knowledge={contacts:[],heardSettlements:[],rumors:[],...(state.knowledge||{})};
  if(!Array.isArray(state.knowledge.contacts))state.knowledge.contacts=[];
  if(!state.residentClock)state.residentClock={day:state.day,phase:state.phase,hoursLeft:state.hoursLeft};
 }
 ensureResidentState();

 const __residentOriginalMakeState=makeState;
 makeState=function(){
  const s=__residentOriginalMakeState();
  s.player={...RESIDENT_DEFAULT_PLAYER};
  s.knowledge={contacts:[],heardSettlements:[],rumors:[]};
  s.residentClock={day:s.day,phase:s.phase,hoursLeft:s.hoursLeft};
  return s;
 };
 const __residentOriginalMergeSave=mergeSave;
 mergeSave=function(data){__residentOriginalMergeSave(data);ensureResidentState()};

 objective=function(){
  if(state.day<30){
   if(state.player.hydration<45)return '你需要補水。先從自己真正知道的地方找線索。';
   if(state.player.satiety<40)return '食物開始成為問題。今晚要決定值得冒險的方向。';
   if(state.day>=22)return '夜晚只剩很短的活動窗口。把真正重要的東西帶回來。';
   if(state.day>=15)return '可活動的夜晚正在縮短。你需要更好的搬運與降溫方法。';
   if(state.day>=8)return '廣播說夜晚已經縮短。先確保自己還有水、食物與返程餘裕。';
   return '你不熟悉這座城市。先從能親眼確認的事開始。';
  }
  if(!state.knownCore)return '永晝已經開始。你只能依靠自己找到的設備、人與線索繼續活下去。';
  if(!state.base.core)return '你已經拼到一部分可能的活路，但還不知道它是否真的可行。';
  return '你已經找到一條活路。接下來要維持它到 Day 60。';
 };

 function residentMetabolism(){
  ensureResidentState();
  const c=state.residentClock,p=state.player;
  if(state.day>c.day){
   const days=Math.max(1,state.day-c.day);
   p.hydration=clamp(p.hydration-days*(state.ration.water>=2.5?14:20),0,100);
   p.satiety=clamp(p.satiety-days*(state.ration.food>=1?12:18),0,100);
   p.stamina=clamp(p.stamina+days*18,0,100);
  }else if(state.day===c.day&&state.phase===c.phase&&Number.isFinite(c.hoursLeft)&&Number.isFinite(state.hoursLeft)&&state.hoursLeft<c.hoursLeft){
   const elapsed=Math.max(0,c.hoursLeft-state.hoursLeft);
   p.hydration=clamp(p.hydration-elapsed*1.8,0,100);
   p.satiety=clamp(p.satiety-elapsed*.7,0,100);
   p.stamina=clamp(p.stamina-elapsed*3.5,0,100);
  }
  if(p.hydration<20)p.health=clamp(p.health-2,0,100);
  if(p.satiety<15)p.health=clamp(p.health-1,0,100);
  if(p.health<1)p.health=0;
  c.day=state.day;c.phase=state.phase;c.hoursLeft=state.hoursLeft;
 }

 function residentContacts(){
  ensureResidentState();
  return state.knowledge.contacts.map(id=>({id,n:state.npcs[id]})).filter(x=>x.n&&x.n.alive);
 }
 function residentContactAt(location){return residentContacts().filter(x=>x.n.location===location)}
 function rememberContact(id){
  ensureResidentState();
  if(!state.knowledge.contacts.includes(id)){
   state.knowledge.contacts.push(id);
   log(`你第一次真正接觸到 ${state.npcs[id]?.name||'一名倖存者'}。這個人現在屬於你親自認識的資訊。`,'good');
  }
 }
 function residentPlaceName(id){
  const l=locations.find(x=>x.id===id);
  if(!l)return '未知區域';
  if(id==='base')return '耐熱屋';
  if(!state.locations[id]?.searched)return '未知區域';
  return `你稱之為「${l.name}」的地方`;
 }
 function indoorTempText(){
  if(state.day<30)return '8°C';
  return state.base.ventilation>0?'有冷卻':'高熱';
 }
 function externalTempText(){return `${dayTemp(state.day)}°C`}
 function nextBroadcast(){return RESIDENT_BROADCAST.find(x=>x.day>state.day)||null}

 function meter(label,value,cls){
  const v=Math.round(clamp(value,0,100));
  return `<div class="resident-meter ${cls}"><span>${label}</span><i style="--pct:${v}%"></i><b>${v}%</b></div>`;
 }
 function ensureResidentHud(){
  if(document.getElementById('residentHud'))return;
  const link=document.createElement('link');link.rel='stylesheet';link.href='resident-redesign.css';link.id='residentRedesignStyles';document.head.appendChild(link);
  const hud=document.createElement('section');hud.id='residentHud';hud.className='resident-hud';
  const anchor=document.getElementById('onboardingRail');
  (anchor?.parentNode||document.getElementById('app')).insertBefore(hud,anchor||document.querySelector('main'));
 }
 function renderResidentHud(){
  ensureResidentHud();ensureResidentState();
  const p=state.player,next=nextBroadcast(),contacts=residentContacts();
  const active=RESIDENT_BROADCAST.filter(x=>x.day<=state.day).at(-1)||RESIDENT_BROADCAST[0];
  const timeline=RESIDENT_BROADCAST.slice(1).map(x=>`<div class="broadcast-step ${active.day===x.day?'active':''}"><b>${x.label}</b><span>${x.hours?x.hours+'h':'永晝'} / ${x.temp}°C</span></div>`).join('');
  document.getElementById('residentHud').innerHTML=`
   <article class="resident-card player-card"><h3>${sourceTag('observed','親眼')}你自己的狀態</h3><div class="resident-status-grid">${meter('水分',p.hydration,'hydration')}${meter('飽足',p.satiety,'satiety')}${meter('體力',p.stamina,'stamina')}${meter('健康',p.health,'health')}</div><div class="resident-bodytemp">體溫 <b>${Number(p.bodyTemp||36.5).toFixed(1)}°C</b>${p.heat>0?` · 熱累積 ${Math.round(p.heat)}%`:''}</div></article>
   <article class="resident-card broadcast-card"><h3>${sourceTag('broadcast','廣播')}節奏預告</h3><div class="big-line">Day ${state.day} / 60</div><div id="residentNextPhase" class="small-line">${next?`下一次變化：Day ${next.day}，夜晚 ${next.hours?next.hours+'h':'消失'}，白晝 ${next.temp}°C`:'已進入永晝'}</div><div class="broadcast-timeline">${timeline}</div></article>
   <article class="resident-card shelter-card"><h3>${sourceTag('observed','親眼')}你的耐熱屋</h3><div class="big-line">屋內 ${indoorTempText()} / 外部白晝 ${externalTempText()}</div><div class="small-line">位置：起點<br>你只會在這裡看到自己能直接確認的庫存與設備。</div></article>
   <article class="resident-card people-card"><h3>${sourceTag('observed','親眼')}你認識的人</h3><div class="big-line">具名 ${contacts.length} 人</div><div class="small-line">${contacts.length?contacts.map(x=>x.n.name).join('、'):'目前沒有親自接觸的具名人物。'}<br>${sourceTag('rumor','傳聞')}城裡可能還有人，但數量未知。</div></article>`;
 }

 function rewriteStaticResidentLanguage(){
  const statGrid=document.querySelector('.status-grid');
  if(statGrid){
   const stats=statGrid.querySelectorAll('.stat');
   if(stats[0]){stats[0].querySelector('span').textContent='天數';stats[0].querySelector('b').textContent=`${state.day} / 60`}
   if(stats[2]){stats[2].classList.add('resident-environment');stats[2].querySelector('span').textContent='屋內 / 外部';stats[2].querySelector('b').textContent=`${indoorTempText()} / ${externalTempText()}`}
   if(stats[4])stats[4].classList.add('resident-hidden');
  }
  const risk=document.getElementById('riskLevel');if(risk)risk.textContent=risk.textContent.replace('整體風險','你目前的風險');
  const leftHeads=document.querySelectorAll('.left-panel .section-head');
  if(leftHeads[1]){const h=leftHeads[1].querySelector('h2');if(h)h.textContent='耐熱屋狀態';const tag=leftHeads[1].querySelector('.section-tag');if(tag)tag.textContent='PERSONAL SHELTER'}
  const cityTitle=document.querySelector('.city-header h2');if(cityTitle)cityTitle.textContent='你眼前的城市';
  const coreBtn=document.getElementById('coreProjectBtn');
  if(coreBtn){coreBtn.classList.toggle('resident-locked',!state.knownCore);if(state.knownCore){coreBtn.querySelector('span').textContent='線索';coreBtn.querySelector('small').textContent='你正在拼湊的可能活路'}}
  const baseBtn=document.getElementById('baseMgmtBtn');if(baseBtn){baseBtn.querySelector('span').textContent=state.day>=30&&state.knownCore?'安全區':'耐熱屋';baseBtn.querySelector('small').textContent='你的人力、配給與設備'}
  const cityBtn=document.getElementById('cityOpsBtn');if(cityBtn){cityBtn.querySelector('span').textContent='情報';cityBtn.querySelector('small').textContent='你看過、聽過與標記的事'}
  const briefBtn=document.getElementById('briefBtn');if(briefBtn){briefBtn.querySelector('span').textContent='日記';briefBtn.querySelector('small').textContent='你昨天看到與聽到的事'}
  const bottom=document.querySelectorAll('.bottom-strip>div');
  if(bottom[1]){bottom[1].querySelector('span').textContent='你認識的人';bottom[1].querySelector('b').textContent=String(residentContacts().length)}
  if(bottom[2])bottom[2].classList.toggle('resident-hidden',!state.knownCore);
  if(bottom[4])bottom[4].querySelector('span').textContent='已發現大型物件';
  const rightTitle=document.querySelector('.right-panel .section-head h2');if(rightTitle)rightTitle.textContent='你聽到的與你做過的';
  document.querySelectorAll('#baseStats>*').forEach(el=>{const t=el.textContent||'';el.classList.toggle('resident-hidden',!state.knownCore&&/中央站|冷源核心|通風容量/.test(t))});
  document.querySelectorAll('button,.card,.summary-card').forEach(el=>{if((el.textContent||'').includes('城市轉化'))el.classList.add('resident-hidden')});
  const cityOps=document.getElementById('cityOpsDialog');if(cityOps){const h=cityOps.querySelector('h2');if(h)h.textContent='你的情報';const p=cityOps.querySelector('p.muted');if(p)p.textContent='只整理你親眼確認、從他人聽到或自己做過的事。';const btns=cityOps.querySelectorAll('.city-hub-actions button');if(btns[0]){btns[0].querySelector('b').textContent='你知道的地點';btns[0].querySelector('small').textContent='觀察、傳聞、道路與標記'}if(btns[1]){btns[1].querySelector('b').textContent='你遇到的人';btns[1].querySelector('small').textContent='只顯示已接觸或有痕跡的群體'}if(btns[2]){btns[2].querySelector('b').textContent='大型物件';btns[2].querySelector('small').textContent='你實際發現過的重型物件'}}
  const brief=document.getElementById('briefDialog');if(brief){const h=brief.querySelector('h2');if(h)h.textContent='你的日記';const p=brief.querySelector('p.muted');if(p)p.textContent='整理你自己的狀態、昨天親眼做過的事、廣播與傳聞。'}
  const coreDialog=document.getElementById('coreProjectDialog');if(coreDialog){const h=coreDialog.querySelector('h2');if(h)h.textContent='你正在拼湊的線索';if(!state.knownCore&&coreDialog.open)coreDialog.close()}
 }

 function rewriteTutorial(){
  const d=document.getElementById('tutorialDialog');if(!d)return;
  const kicker=d.querySelector('.tutorial-kicker');if(kicker)kicker.textContent='WORLD BROADCAST';
  const h=d.querySelector('h2');if(h)h.textContent='你在耐熱屋醒來';
  const p=d.querySelector(':scope .dialog-body>p');if(p)p.innerHTML='你不熟悉這座城市。世界廣播只反覆說明災害節奏：未來 60 天夜晚會逐段縮短，Day 30 起不再有夜晚；白晝最高溫會從 72°C 升到 100°C。<br><br>廣播沒說解方在哪，也沒說城裡還有多少人。你要自己想辦法。';
  const seq=d.querySelector('.tutorial-sequence');if(seq)seq.innerHTML='<div><span>先確認自己有多少水、食物與可用時間。</span></div><div><span>地圖上的未知區域不會替你揭露答案；只有偵察與接觸會增加你真正知道的資訊。</span></div>';
  const start=document.getElementById('tutorialStart');if(start)start.textContent='開始';
  const restart=document.getElementById('tutorialRestart');if(restart)restart.textContent='重看廣播';
  const rules=document.getElementById('tutorialRules');if(rules)rules.textContent='廣播規則';
  const help=document.querySelector('#helpDialog .rules');if(help)help.innerHTML='<li>廣播已知：Day 1–7 夜晚 8h、Day 8–14 6h、Day 15–21 4h、Day 22–29 2h、Day 30 起永晝。</li><li>廣播已知：白晝最高溫依序為 72°C、78°C、84°C、92°C，Day 30 起 100°C。</li><li>你只會看到自己庫存、親眼偵察到的內容、已接觸人物，以及有來源標記的傳聞。</li><li>未知地點不會顯示真實名稱、庫存、人物或大型物件。</li><li>所有城市物資有限；你必須自行判斷值得探索、搬運與交換的方向。</li><li>Day 60 是廣播反覆提到的期限，但廣播沒有提供完整解法。</li>';
 }

 function rewriteOnboardingRail(){
  const rail=document.getElementById('onboardingRail');if(!rail||rail.hidden)return;
  const kicker=document.getElementById('tutorialKicker'),title=document.getElementById('tutorialTitle'),text=document.getElementById('tutorialText'),cta=document.getElementById('tutorialCta');
  if(kicker){kicker.textContent='目前的需要';kicker.classList.add('resident-kicker')}
  if(state.player.hydration<55){if(title)title.textContent='你需要找水';if(text)text.textContent='先找你能安全確認的水源，不必照著固定地點走。'}
  else if(!state.gear.cart){if(title)title.textContent='你一次搬不了多少';if(text)text.textContent='留意城市裡能修復或利用的搬運工具。'}
  else{if(title)title.textContent='夜晚正在縮短';if(text)text.textContent='把下一趟行程留給你真正需要的東西。'}
  if(cta){cta.textContent='查看地圖';if(!cta.dataset.residentBound){cta.dataset.residentBound='1';cta.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();document.querySelector('.map-shell')?.scrollIntoView({behavior:'smooth',block:'center'})},true)}}
 }

 function filterActionTargets(){
  const root=document.getElementById('actionCenterContent');if(!root)return;
  root.querySelectorAll('select').forEach(sel=>{
   Array.from(sel.options).forEach(opt=>{
    const l=locations.find(x=>x.id===opt.value);
    if(l&&l.id!=='base'&&!state.locations[l.id]?.searched)opt.remove();
   });
  });
  root.querySelectorAll('[data-location],[data-target]').forEach(el=>{
   const id=el.dataset.location||el.dataset.target,l=locations.find(x=>x.id===id);
   if(l&&l.id!=='base'&&!state.locations[id]?.searched)el.classList.add('resident-hidden');
  });
  if(!root.querySelector('.resident-scout-note'))root.insertAdjacentHTML('afterbegin','<div class="resident-scout-note">一般目標只列你已偵察過的地方。要去未知區域，請從地圖上的未知區域發起偵察。</div>');
 }

 function rewriteLocationDialog(){
  const d=document.getElementById('locationDialog');if(!d?.open)return;
  const title=document.getElementById('locTitle');if(!title)return;
  let raw=title.textContent.replace(/^你稱之為「|」的地方$/g,'');
  const known=locations.find(l=>l.name===raw||raw.includes(l.name));
  if(known&&known.id!=='base'&&state.locations[known.id]?.searched)title.textContent=residentPlaceName(known.id);
 }

 function renderResidentSettlements(){
  ensureResidentState();
  const content=document.getElementById('settlementContent');if(!content)return;
  const visible=[];
  for(const s of Object.values(state.settlements||{})){
   const searched=!!state.locations[s.location]?.searched,contacts=residentContactAt(s.location);
   if(!searched&&!contacts.length)continue;
   const l=locations.find(x=>x.id===s.location),name=l?`你稱之為「${l.name}」的區域`:'你探索過的區域';
   const highTrust=contacts.some(x=>(x.n.trust||0)>=65)||(s.trust||0)>=65;
   let body='';
   if(!contacts.length){
    body+=`<div class="resident-info-line">${sourceTag('observed','親眼')}<span>你偵察過這裡，但沒有真正接觸到任何人。</span></div>`;
    body+=`<div class="resident-info-line">${sourceTag('rumor','推測')}<span>有些物資像被人動過；這只能證明最近可能有人活動。</span></div>`;
   }else{
    body+=`<div class="resident-info-line">${sourceTag('observed','親眼')}<span>已接觸：${contacts.map(x=>x.n.name).join('、')}。</span></div>`;
    if(highTrust){
     body+=`<div class="resident-info-line">${sourceTag('rumor','對方說')}<span>這裡大約有 ${s.population} 人；這個數字來自你已建立信任的人，不是你逐一清點的結果。</span></div>`;
     body+=`<div class="resident-info-line">${sourceTag('rumor','對方說')}<span>他們提到目前大約有水 ${Math.round(s.water||0)} L、食物 ${Math.round(s.food||0)}；庫存仍可能變動。</span></div>`;
    }else{
     body+=`<div class="resident-info-line">${sourceTag('rumor','傳聞')}<span>${contacts[0].n.name} 說附近還有其他人活動，但你沒有親自確認人數。</span></div>`;
     const mood=(s.water||0)<12?'水快不夠了':(s.food||0)<10?'食物開始吃緊':'目前還撐得住';
     body+=`<div class="resident-info-line">${sourceTag('rumor','對方描述')}<span>「${mood}。」</span></div>`;
    }
   }
   visible.push(`<article class="resident-settlement"><h3>${name}</h3>${body}</article>`);
  }
  content.innerHTML=visible.length?`<div class="resident-settlement-list">${visible.join('')}</div>`:`<div class="resident-unknown-note">你還沒有接觸任何群體。城市裡是否還有其他人、在哪裡、有多少人，目前都不知道。</div>`;
  const d=document.getElementById('settlementDialog');if(d&&!d.open)d.showModal();
 }

 function observeContactsAndDialogs(){
  const trade=document.getElementById('tradeDialog');
  if(trade&&!trade.dataset.residentObserved){
   trade.dataset.residentObserved='1';
   new MutationObserver(()=>{if(!trade.open)return;const text=document.getElementById('tradeTitle')?.textContent||trade.textContent||'';for(const [id,n] of Object.entries(state.npcs||{})){if(text.includes(n.name)){rememberContact(id);renderResidentHud();break}}}).observe(trade,{attributes:true,attributeFilter:['open']});
  }
  const settlement=document.getElementById('settlementDialog');
  if(settlement&&!settlement.dataset.residentObserved){settlement.dataset.residentObserved='1';new MutationObserver(()=>{if(settlement.open)renderResidentSettlements()}).observe(settlement,{attributes:true,attributeFilter:['open']})}
  const action=document.getElementById('actionCenterDialog');
  if(action&&!action.dataset.residentObserved){action.dataset.residentObserved='1';new MutationObserver(()=>{if(action.open)setTimeout(filterActionTargets,0)}).observe(action,{attributes:true,attributeFilter:['open']})}
  const location=document.getElementById('locationDialog');
  if(location&&!location.dataset.residentObserved){location.dataset.residentObserved='1';new MutationObserver(()=>{if(location.open)setTimeout(rewriteLocationDialog,0)}).observe(location,{attributes:true,attributeFilter:['open']})}
 }

 document.addEventListener('click',e=>{
  if(e.target.closest('#citySettlements')){e.preventDefault();e.stopImmediatePropagation();renderResidentSettlements()}
 },true);

 const __residentOriginalRender=render;
 render=function(){
  residentMetabolism();
  __residentOriginalRender();
  renderResidentHud();
  rewriteStaticResidentLanguage();
  rewriteTutorial();
  rewriteOnboardingRail();
  if(document.getElementById('actionCenterDialog')?.open)filterActionTargets();
  if(document.getElementById('locationDialog')?.open)rewriteLocationDialog();
  observeContactsAndDialogs();
 };

 function residentInitialRefresh(){
  ensureResidentState();renderResidentHud();rewriteStaticResidentLanguage();rewriteTutorial();rewriteOnboardingRail();observeContactsAndDialogs();
  if(typeof saveGame==='function')saveGame(false);
 }
 setTimeout(residentInitialRefresh,0);
})();