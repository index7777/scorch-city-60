/* v14.2.2 QA — B1/B2/B3 expedition start + time-feasibility blockers */
function itineraryStartStateV71(){
 const it=ensureItineraryV27(),e=itineraryEstimateV27(),issues=[];
 if(!it.stops.length)issues.push('尚未加入任何站點');
 if(!e.ok)issues.push(e.reason||'目前無法計算整段行程');
 if(e.ok&&e.buffer<0)issues.push(`時間超支 ${Math.abs(e.buffer).toFixed(2)} h，請移除站點或改用推車／工程車`);
 if(it.status==='running')issues.push('行程已在執行中');
 try{const team=fieldTeamValidationV43(e);if(e.ok&&!team.ok)issues.push(...team.issues)}catch{}
 return {it,e,issues:[...new Set(issues)],ok:issues.length===0}
}

/* B1 — disabled is visible and the reason is present in the planner, not hidden in DOM state. */
const _itineraryPlannerHtmlV71=itineraryPlannerHtmlV27;
itineraryPlannerHtmlV27=function(){
 let html=_itineraryPlannerHtmlV71(),s=itineraryStartStateV71();
 const msg=s.issues[0]||'';
 const warning=s.e?.ok&&s.e.buffer<0
  ?`<div id="itineraryStartReasonV71" class="itinerary-start-reason-v71 critical"><b>本時段無法完成</b><span>時間超支 ${Math.abs(s.e.buffer).toFixed(2)} h，請移除站點或改用推車／工程車。</span></div>`
  :(!s.ok?`<div id="itineraryStartReasonV71" class="itinerary-start-reason-v71"><b>目前不能出發</b><span>${msg}</span></div>`:'');
 html=html.replace('<div class="planner-actions">',warning+'<div class="planner-actions">');
 html=html.replace(/<button id="itineraryStart"([^>]*)>/,(_m,attrs)=>{
  const clean=attrs.replace(/\sdisabled(?:="[^"]*")?/g,'').replace(/\stitle="[^"]*"/g,'').replace(/\saria-describedby="[^"]*"/g,'');
  return `<button id="itineraryStart"${clean}${s.ok?'':' disabled'} title="${s.ok?'開始目前整段行程':String(msg).replace(/"/g,'&quot;')}"${s.ok?'':' aria-describedby="itineraryStartReasonV71"'}>`
 });
 return html
};

/* B2 — use one late, delegated capture handler so later planner re-renders cannot lose the start binding. */
if(!window.__SCORCH_ITINERARY_START_V71){
 window.__SCORCH_ITINERARY_START_V71=true;
 document.addEventListener('click',e=>{
  const b=e.target.closest?.('#itineraryStart');if(!b)return;
  e.preventDefault();e.stopImmediatePropagation();
  const s=itineraryStartStateV71();
  if(!s.ok){toast(s.issues[0]||'目前無法開始整段行程');renderMap();return}
  startOrResumeItineraryV27()
 },true)
}

/* B3 — quick search cannot remain visually actionable when the current period cannot pay its time cost. */
function quickSearchTimeStateV71(loc){
 const need=quickSearchTimeV69(loc),left=currentPeriodHoursLeftV26();
 const timeLimited=state.day<30;
 return {need,left,timeLimited,ok:!timeLimited||left+1e-6>=need}
}
const _openLocationV71=openLocation;
openLocation=function(id){
 const out=_openLocationV71(id);if(!locationKnownV68(id))return out;
 const loc=mapLoc(id),b=$('searchLoc');if(!loc||!b)return out;
 const t=quickSearchTimeStateV71(loc),cooldown=searchAvailableV69(id),ok=cooldown&&t.ok;
 b.disabled=!ok;
 if(!cooldown){b.title=`今天已搜索過，Day ${state.day+1} 可再次進入`}
 else if(!t.ok){b.title=`快速搜索需 ${t.need}h，目前只剩 ${t.left}h`}
 else b.title=`快速搜索 ${t.need}h；只回收明示資源`;
 if(!t.ok&&cooldown){
  b.textContent=`快速搜索 · 需 ${t.need}h，剩 ${t.left}h`;
  const note=document.createElement('div');note.className='quick-search-time-v71';note.innerHTML=`<b>時間不足</b><span>快速搜索需 ${t.need}h，目前只剩 ${t.left}h。</span>`;
  const actions=$('locActions');if(actions?.parentNode)actions.parentNode.insertBefore(note,actions)
 }
 return out
};

/* Defensive execution guard: keyboard/script invocation receives the same explicit reason. */
const _searchLocationV71=searchLocation;
searchLocation=function(loc){
 if(loc&&locationKnownV68(loc.id)){
  const t=quickSearchTimeStateV71(loc);if(!t.ok)return toast(`快速搜索需 ${t.need}h，目前只剩 ${t.left}h`)
 }
 return _searchLocationV71(loc)
};

renderMap();