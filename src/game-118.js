// v14.5 Batch 2 — exploration selection/confirmation, discovery-gated art, legacy leak scrub.
(function(){
 const byId=id=>document.getElementById(id);
 const prevRenderMapV118=renderMap;
 const prevRenderV118=render;
 const ART_V118={
  base:'base',homes:'homes',store:'store',school:'school',clinic:'clinic',hardware:'hardware',warehouse:'warehouse',fire:'fire',subway:'subway',industrial:'industrial',coldstore:'coldstore',research:'research',solar:'solar',vent:'vent'
 };
 const DIRS_V118=['東','東南','南','西南','西','西北','北','東北'];
 function ensureV118(s=state){
  s.explorationV118=s.explorationV118&&typeof s.explorationV118==='object'?s.explorationV118:{};
  const ex=s.explorationV118;
  ex.selected=typeof ex.selected==='string'?ex.selected:null;
  ex.explored=Array.isArray(ex.explored)?ex.explored:['base'];
  ex.observed=ex.observed&&typeof ex.observed==='object'?ex.observed:{base:true};
  if(!ex.explored.includes('base'))ex.explored.unshift('base');
  if(ex.observed.base!==true)ex.observed.base=true;
  return ex;
 }
 function directionV118(a,b){
  const A=mapLoc(a),B=mapLoc(b);if(!A||!B)return '前方';
  const ang=(Math.atan2(B.y-A.y,B.x-A.x)*180/Math.PI+360)%360;
  return DIRS_V118[Math.round(ang/45)%8];
 }
 function artKeyV118(id){
  if(ART_V118[id])return ART_V118[id];
  const low=String(id||'').toLowerCase();
  for(const key of Object.keys(ART_V118))if(low===key||low.startsWith(key+'-')||low.startsWith(key+'_'))return ART_V118[key];
  return null;
 }
 function artV118(id){const key=artKeyV118(id);return key?`assets/districts/thumbnails/${key}.webp`:''}
 function modeV118(){
  if(state.gear?.vehicle)return '交通工具';
  if(state.gear?.cart)return '手推車';
  return '徒步';
 }
 function pathHoursV118(id){
  try{return typeof travelHoursV113==='function'?travelHoursV113(id):1}catch{return 1}
 }
 function spendExploreHourV118(){
  if(state.day>=30)return true;
  if(!Number.isFinite(state.hoursLeft)||state.hoursLeft<1){toast('目前沒有足夠時間探索');return false}
  state.hoursLeft=Math.max(0,Math.round((state.hoursLeft-1)*10)/10);return true;
 }
 function exploreCurrentV118(){
  const base=typeof ensureExplorationV113==='function'?ensureExplorationV113():{current:'base',discovered:['base']};
  const ex=ensureV118();
  if(!spendExploreHourV118())return;
  ex.observed[base.current]=true;
  if(!ex.explored.includes(base.current))ex.explored.push(base.current);
  log(`你仔細查看了 ${mapLoc(base.current)?.name||'這個地方'} 的周圍。`,'good');
  render();
 }
 function confirmTravelV118(target){
  const ex=ensureV118();ex.selected=null;
  if(typeof goToV113==='function')goToV113(target);
 }
 function nodeV118(id,current,known,neighbors,observed){
  const l=mapLoc(id);if(!l)return '';
  const isCurrent=id===current,isKnown=known.has(id),isNeighbor=neighbors.includes(id),canSeeNeighbor=observed&&isNeighbor;
  if(!isCurrent&&!isKnown&&!canSeeNeighbor)return '';
  let cls='node step-node-v118',label='',detail='',image='';
  if(isCurrent){cls+=' base route-target';label=l.name;detail='你現在的位置';image=artV118(id)}
  else if(isKnown){cls+=' safe';label=l.name;detail=isNeighbor?`${directionV118(current,id)}方 · 已走過`:'已知地點';image=artV118(id)}
  else {cls+=' rumor';label=`${directionV118(current,id)}方`;detail='遠處可見輪廓'}
  const imageHtml=image?`<img class="step-art-v118" src="${image}" alt="" draggable="false">`:`<span class="step-silhouette-v118" aria-hidden="true"></span>`;
  return `<button class="${cls}" data-select-v118="${id}" style="left:${l.x}%;top:${l.y}%;transform:translate(-50%,-50%)">${imageHtml}<span class="node-copy"><b>${label}</b><small>${detail}</small></span></button>`;
 }
 function renderSelectionV118(map,current,selected,known,neighbors){
  let panel=map.querySelector('.step-selection-v118');if(!selected){if(panel)panel.remove();return}
  const l=mapLoc(selected),isKnown=known.has(selected),isNeighbor=neighbors.includes(selected),h=pathHoursV118(selected);
  if(!l||(!isKnown&&!isNeighbor)){if(panel)panel.remove();return}
  if(!panel){panel=document.createElement('div');panel.className='step-selection-v118';map.appendChild(panel)}
  const title=isKnown?l.name:`${directionV118(current,selected)}方道路`;
  const descriptor=isKnown?'已知地點':'目前只能確認道路與遠處輪廓';
  panel.innerHTML=`<div><b>${title}</b><span>${descriptor}</span><small>${modeV118()} · 預計 ${Number.isFinite(h)?h:'—'}h</small></div><div class="step-selection-actions-v118"><button type="button" data-cancel-v118>取消</button><button type="button" class="primary" data-go-v118="${selected}" ${Number.isFinite(h)?'':'disabled'}>前往</button></div>`;
  panel.querySelector('[data-cancel-v118]').onclick=()=>{ensureV118().selected=null;renderMap()};
  const go=panel.querySelector('[data-go-v118]');if(go)go.onclick=()=>confirmTravelV118(selected);
 }
 function renderExploreV118(map,current,observed){
  let box=map.querySelector('.step-explore-v118');if(box)box.remove();
  if(observed)return;
  box=document.createElement('div');box.className='step-explore-v118';
  box.innerHTML=`<div><b>${mapLoc(current)?.name||'目前位置'}</b><span>你剛抵達，周圍還沒有仔細查看。</span></div><button type="button" data-explore-v118>探索 · 1h</button>`;
  box.querySelector('[data-explore-v118]').onclick=exploreCurrentV118;map.appendChild(box);
 }
 function renderMapV118(){
  const map=byId('map');if(!map)return;
  const base=typeof ensureExplorationV113==='function'?ensureExplorationV113():{current:'base',discovered:['base']};
  const ex=ensureV118(),current=base.current,known=new Set(base.discovered||['base']),observed=ex.observed[current]===true;
  const neighbors=mapNeighbors(current);
  const visible=new Set([current,...known,...(observed?neighbors:[])]);
  const lines=observed?neighbors.map(id=>{const A=mapLoc(current),B=mapLoc(id);return A&&B?`<line class="route" x1="${A.x}" y1="${A.y}" x2="${B.x}" y2="${B.y}"/>`:''}).join(''):'';
  map.innerHTML=`<div class="world-transform-layer"><svg class="world-network step-network-v118" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${lines}</svg></div>${[...visible].map(id=>nodeV118(id,current,known,neighbors,observed)).join('')}<div class="world-map-summary step-summary-v118"><b>${mapLoc(current)?.name||'目前位置'}</b><span>${modeV118()}</span></div>`;
  map.querySelectorAll('[data-select-v118]').forEach(btn=>{btn.onclick=()=>{const id=btn.dataset.selectV118;if(id===current)return;ensureV118().selected=id;renderMap()}});
  renderExploreV118(map,current,observed);
  renderSelectionV118(map,current,ex.selected,known,neighbors);
 }
 function hideNodeV118(el){if(el){el.hidden=true;el.setAttribute('aria-hidden','true')}}
 function scrubLegacyLeaksV118(){
  const day=byId('day');if(day)day.textContent=`Day ${state.day}`;
  const daysLeft=byId('daysLeft');if(daysLeft)hideNodeV118(daysLeft.closest('.stat')||daysLeft);
  ['mapTools','mapPlannerPanel','coreProjectBtn','coreProjectDialog','actionCenterBtn','actionCenterDialog'].forEach(id=>hideNodeV118(byId(id)));
  document.querySelectorAll('.legend,.bottom-strip').forEach(hideNodeV118);
  document.querySelectorAll('.section-tag').forEach(el=>{if(/CENTRAL STATION|中央站/i.test(el.textContent||''))hideNodeV118(el)});
  const forbidden=/永晝倒數|LIVE STATE|終局\s*Day\s*60|Day\s*60\s*前|\b0\s*\/\s*10\b|飲用池|中央站超載|冷站情報/i;
  document.querySelectorAll('.stat,.command-card,.summary-card,.status-card,.metric-card,.info-card,.event-card,.bottom-strip>div').forEach(el=>{if(forbidden.test(el.textContent||''))hideNodeV118(el)});
 }
 function installStylesV118(){
  if(byId('batch2StylesV118'))return;const s=document.createElement('style');s.id='batch2StylesV118';s.textContent=`
   .step-node-v118{min-width:108px;overflow:visible}.step-art-v118{display:block;width:92px;height:72px;object-fit:contain;margin:0 auto 4px;filter:drop-shadow(0 6px 12px rgba(0,0,0,.35))}.step-silhouette-v118{display:block;width:56px;height:30px;margin:0 auto 6px;border:1px solid rgba(215,229,230,.28);background:linear-gradient(180deg,rgba(215,229,230,.12),rgba(215,229,230,.03));clip-path:polygon(8% 100%,8% 45%,22% 45%,22% 22%,44% 22%,44% 40%,62% 40%,62% 12%,82% 12%,82% 55%,94% 55%,94% 100%)}
   .step-selection-v118,.step-explore-v118{position:absolute;left:18px;right:18px;bottom:18px;z-index:12;display:flex;align-items:center;justify-content:space-between;gap:16px;padding:14px 16px;border:1px solid rgba(180,210,210,.28);background:rgba(10,18,20,.94);backdrop-filter:blur(12px);border-radius:12px}.step-selection-v118>div:first-child,.step-explore-v118>div:first-child{display:grid;gap:3px}.step-selection-v118 span,.step-explore-v118 span,.step-selection-v118 small{opacity:.72}.step-selection-actions-v118{display:flex;gap:8px}.step-selection-actions-v118 button,.step-explore-v118 button{min-width:96px}.step-network-v118{pointer-events:none}
   .city-wrap .legend[aria-hidden="true"],#mapTools[aria-hidden="true"],.bottom-strip[aria-hidden="true"]{display:none!important}
  `;document.head.appendChild(s);
 }
 renderMap=function(){if(state.flags?.hardFogOpeningV112){renderMapV118();return}return prevRenderMapV118()};
 render=function(){const out=prevRenderV118();installStylesV118();scrubLegacyLeaksV118();return out};
 installStylesV118();scrubLegacyLeaksV118();
 window.renderMapV118=renderMapV118;
 window.scrubLegacyLeaksV118=scrubLegacyLeaksV118;
})();