// v14.4 Batch H — stepwise exploration: only current place, directly reachable roads/silhouettes, and already-known farther destinations.
(function(){
 const originalRenderMapV113=renderMap;
 const DIRS_V113=['東','東南','南','西南','西','西北','北','東北'];
 function ensureExplorationV113(s=state){
  s.explorationV113=s.explorationV113&&typeof s.explorationV113==='object'?s.explorationV113:{};
  s.explorationV113.current=s.explorationV113.current||'base';
  s.explorationV113.discovered=Array.isArray(s.explorationV113.discovered)?s.explorationV113.discovered:['base'];
  if(!s.explorationV113.discovered.includes('base'))s.explorationV113.discovered.unshift('base');
  if(!s.explorationV113.discovered.includes(s.explorationV113.current))s.explorationV113.discovered.push(s.explorationV113.current);
  return s.explorationV113;
 }
 function directionV113(a,b){
  const A=mapLoc(a),B=mapLoc(b);if(!A||!B)return '前方';
  const ang=(Math.atan2(B.y-A.y,B.x-A.x)*180/Math.PI+360)%360;
  return DIRS_V113[Math.round(ang/45)%8];
 }
 function transportModeV113(){
  if(state.gear?.vehicle)return {label:'交通工具',mult:.35};
  if(state.gear?.cart)return {label:'手推車',mult:.8};
  return {label:'徒步',mult:1};
 }
 function knownPathV113(start,target){
  const ex=ensureExplorationV113(),known=new Set(ex.discovered);known.add(start);known.add(target);
  const q=[[start]],seen=new Set([start]);
  while(q.length){const p=q.shift(),u=p[p.length-1];if(u===target)return p;for(const v of mapNeighbors(u)){if(!known.has(v)||seen.has(v))continue;seen.add(v);q.push([...p,v])}}
  return null;
 }
 function travelHoursV113(target){
  const ex=ensureExplorationV113(),path=knownPathV113(ex.current,target);if(!path)return Infinity;
  const mode=transportModeV113();return Math.max(.5,Math.round((path.length-1)*mode.mult*2)/2);
 }
 function spendTravelTimeV113(hours){
  if(state.day>=30)return true;
  if(!Number.isFinite(state.hoursLeft)||state.hoursLeft<hours)return false;
  state.hoursLeft=Math.max(0,Math.round((state.hoursLeft-hours)*10)/10);return true;
 }
 function goToV113(target){
  const ex=ensureExplorationV113(),from=ex.current;
  if(target===from)return;
  const adjacent=mapNeighbors(from).includes(target),known=ex.discovered.includes(target);
  if(!adjacent&&!known)return;
  const path=knownPathV113(from,target);if(!path)return toast('目前沒有你已走過的道路可直接抵達');
  const hours=travelHoursV113(target);if(!spendTravelTimeV113(hours))return toast(`剩餘時間不足；需要 ${hours}h`);
  for(let i=1;i<path.length;i++)verifyRoad(path[i-1],path[i],'親自走過');
  ex.current=target;if(!ex.discovered.includes(target))ex.discovered.push(target);
  state.locations[target]=state.locations[target]||{};state.locations[target].arrived=true;
  const name=mapLoc(target)?.name||'未知地點';
  log(`你抵達 ${name}。只有現在能直接看見的鄰近道路與輪廓會出現在地圖上。`,'good');
  render();
 }
 function localRoadSvgV113(current,neighbors){
  const A=mapLoc(current);if(!A)return '';
  return `<svg class="world-network step-network-v113" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${neighbors.map(id=>{const B=mapLoc(id);return B?`<line class="route" x1="${A.x}" y1="${A.y}" x2="${B.x}" y2="${B.y}"/>`:''}).join('')}</svg>`;
 }
 function renderStepwiseMapV113(){
  const map=$('map');if(!map)return;
  const ex=ensureExplorationV113(),current=ex.current,known=new Set(ex.discovered),neighbors=mapNeighbors(current),mode=transportModeV113();
  const visible=new Set([current,...neighbors,...ex.discovered]);
  const nodes=[...visible].map(id=>{
   const l=mapLoc(id);if(!l)return '';
   const isCurrent=id===current,isNeighbor=neighbors.includes(id),isKnown=known.has(id);
   if(!isCurrent&&!isNeighbor&&!isKnown)return '';
   let label='',detail='',cls='node step-node-v113';
   if(isCurrent){cls+=' base route-target';label=l.name;detail='你現在的位置';}
   else if(isKnown){const h=travelHoursV113(id);cls+=' safe';label=l.name;detail=isNeighbor?`${directionV113(current,id)}方 · 可直接前往 · ${h}h`:`已知地點 · 較遠 · ${Number.isFinite(h)?h+'h':'路線未連通'}`;}
   else {cls+=' rumor';label=`${directionV113(current,id)}方道路`;detail='遠處可見輪廓 · 抵達後才能確認';}
   const disabled=!isCurrent&&!isNeighbor&&!isKnown?'disabled':'';
   return `<button class="${cls}" data-step-go="${id}" ${disabled} style="left:${l.x}%;top:${l.y}%;transform:translate(-50%,-50%)"><span class="node-copy"><b>${label}</b><small>${detail}</small></span></button>`;
  }).join('');
  map.innerHTML=`<div class="world-transform-layer">${localRoadSvgV113(current,neighbors)}</div>${nodes}<div class="world-map-summary step-summary-v113"><b>${mapLoc(current)?.name||'目前位置'}</b><span>${mode.label} · 只顯示眼前可走的道路與已知地點</span><em>未抵達的地點不顯示名稱、資源、人物或總數</em></div>`;
  if($('mapPlannerPanel')){$('mapPlannerPanel').hidden=true;$('mapPlannerPanel').innerHTML=''}
  map.querySelectorAll('[data-step-go]').forEach(btn=>{btn.onclick=()=>{if(btn.dataset.stepGo!==current)goToV113(btn.dataset.stepGo)}});
 }
 renderMap=function(){if(state.flags?.hardFogOpeningV112){renderStepwiseMapV113();return}return originalRenderMapV113()};
 window.ensureExplorationV113=ensureExplorationV113;
 window.renderStepwiseMapV113=renderStepwiseMapV113;
 window.goToV113=goToV113;
 window.travelHoursV113=travelHoursV113;
})();
