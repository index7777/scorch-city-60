/* v14.2.2 QA — per-stop parallel field subtasks / explicit assignment / parallel throughput */
const FIELD_SUBTASKS_V45={
 search:[
  {id:'secure',label:'現場確認／警戒',weight:.20,role:'search',activity:'observe'},
  {id:'search',label:'搜索／判讀',weight:.52,role:'search',activity:'search',expert:'mei'},
  {id:'carry',label:'整理／裝載',weight:.28,role:'carry',activity:'carry',expert:'wu'}
 ],
 scout:[
  {id:'observe',label:'環境觀察',weight:.45,role:'search',activity:'observe'},
  {id:'verify',label:'情報核對／標記',weight:.55,role:'search',activity:'search',expert:'mei'}
 ],
 asset:[
  {id:'isolate',label:'斷電／安全確認',weight:.18,role:'repair',activity:'repair',expert:'chen'},
  {id:'detach',label:'拆卸／解鎖',weight:.38,role:'repair',activity:'repair',expert:'chen'},
  {id:'carry',label:'搬運',weight:.27,role:'carry',activity:'carry',expert:'wu'},
  {id:'load',label:'裝車／固定',weight:.17,role:'carry',activity:'carry',expert:'wu'}
 ],
 rescue:[
  {id:'triage',label:'分診／確認狀況',weight:.22,role:'medic',activity:'observe',expert:'lin'},
  {id:'stabilize',label:'穩定傷患／準備撤離',weight:.43,role:'medic',activity:'walk',expert:'lin'},
  {id:'extract',label:'搬運／上車',weight:.35,role:'carry',activity:'carry',expert:'wu'}
 ],
 npc:[{id:'contact',label:'交涉／交換',weight:1,role:'general',activity:'observe'}]
};
function rawStopActionHoursV45(stop){
 if(!stop)return 0;const row=itineraryActionsV27(stop.location).find(x=>x[0]===stop.action);return Math.max(.1,+row?.[2]||.5)
}
function stopSubtaskDefsV45(stop){return FIELD_SUBTASKS_V45[stop?.action]||[{id:'work',label:'地點作業',weight:1,role:'general',activity:'walk'}]}
function memberThroughputV45(member,task){
 let f=1,role=fieldRoleV44(member);if(role===task.role)f*=1.28;else if(role==='general')f*=.96;else if(task.role!=='general')f*=.90;
 if(task.expert===member)f*=1.38;
 if(member!=='player'){
  const fatigue=npcShiftV41(member)?.fatigue||0;f*=clamp(1-fatigue*.0032,.68,1)
 }
 return clamp(f,.55,1.9)
}
function bestMemberForSubtaskV45(task,loads={}){
 const members=fieldTeamMembersV43();let best=members[0]||'player',score=Infinity;
 for(const id of members){const tp=memberThroughputV45(id,task),s=(loads[id]||0)+(task.weight/Math.max(.01,tp));if(s<score){score=s;best=id}}
 return best
}
function ensureStopSubtasksV45(stop){
 if(!stop)return {};const defs=stopSubtaskDefsV45(stop),members=fieldTeamMembersV43();stop.subtaskAssignments=stop.subtaskAssignments||{};
 const valid=new Set(defs.map(x=>x.id));for(const k of Object.keys(stop.subtaskAssignments))if(!valid.has(k))delete stop.subtaskAssignments[k];
 const loads={};for(const d of defs){let id=stop.subtaskAssignments[d.id];if(!members.includes(id)){id=bestMemberForSubtaskV45(d,loads);stop.subtaskAssignments[d.id]=id}loads[id]=(loads[id]||0)+d.weight/memberThroughputV45(id,d)}
 return stop.subtaskAssignments
}
function stopParallelPlanV45(stop){
 const base=rawStopActionHoursV45(stop),defs=stopSubtaskDefsV45(stop),assign=ensureStopSubtasksV45(stop),members=fieldTeamMembersV43(),loads={};
 for(const id of members)loads[id]=0;
 const tasks=defs.map(d=>{const member=members.includes(assign[d.id])?assign[d.id]:'player',work=base*d.weight,tp=memberThroughputV45(member,d),hours=work/tp;loads[member]=(loads[member]||0)+hours;return {...d,member,work,tp,hours}});
 const elapsed=Math.max(.1,...Object.values(loads));return {base,tasks,loads,elapsed:Math.round(elapsed*20)/20,serial:Math.round(tasks.reduce((a,t)=>a+t.hours,0)*20)/20}
}
stopActionHoursV27=function(stop){return stopParallelPlanV45(stop).elapsed};
function setStopSubtaskAssigneeV45(stopIndex,taskId,member){
 const it=ensureItineraryV27(),stop=it.stops[+stopIndex];if(!stop||ensureFieldTeamV43().active)return toast('外勤開始後不能重排站點子任務');if(!fieldTeamMembersV43().includes(member))return;ensureStopSubtasksV45(stop);stop.subtaskAssignments[taskId]=member;renderMap();saveGame(false)
}
function resetStopSubtasksV45(stop){if(stop)delete stop.subtaskAssignments}

/* Estimate uses the same parallel action time, including rescue preparation. */
itineraryEstimateV27=function(){
 const it=ensureItineraryV27(),speed=itinerarySpeedV27(),home=mapStartId();let from=home,travel=0,actions=0,legs=[],rescueIssues=[];
 for(const stop of it.stops){
  const r=routeBetweenV27(from,stop.location,it.routeMode);if(!r)return {ok:false,reason:`${mapLoc(from)?.name||from} 無法前往 ${mapLoc(stop.location)?.name||stop.location}`};
  const th=r.distance/speed,ah=stopActionHoursV27(stop);travel+=th;actions+=ah;legs.push({from,to:stop.location,route:r,travel:th,action:ah,kind:'travel'});from=stop.location;
  if(stop.action==='rescue'){
   const f=rescueFeasibilityV29(stop);if(!f.ok)rescueIssues.push({stop,f});
   if(f.ok&&f.mode==='escort'&&f.leg){travel+=f.leg.hours;legs.push({from,to:f.candidate.destination,route:f.leg.route,travel:f.leg.hours,action:0,kind:'rescue'});from=f.candidate.destination}
  }
 }
 if(it.stops.length&&from!==home){const r=routeBetweenV27(from,home,it.routeMode);if(!r)return {ok:false,reason:'目前道路情報下無法規劃返程'};const th=r.distance/speed;travel+=th;legs.push({from,to:home,route:r,travel:th,action:0,kind:'return'})}
 const total=Math.round((travel+actions)*100)/100,left=currentPeriodHoursLeftV26();return {ok:!rescueIssues.length,total,travel:Math.round(travel*100)/100,actions:Math.round(actions*100)/100,left,buffer:Math.round((left-total)*100)/100,legs,mode:itineraryModeV27(),rescueIssues,reason:rescueIssues[0]?.f?.reason||''}
};

function subtaskPlannerHtmlV45(){
 const it=ensureItineraryV27(),locked=ensureFieldTeamV43().active,members=fieldTeamMembersV43();if(!it.stops.length)return '';
 const rows=it.stops.map((stop,i)=>{const p=stopParallelPlanV45(stop),name=mapLoc(stop.location)?.name||stop.location,opts=id=>members.map(m=>`<option value="${m}" ${m===id?'selected':''}>${fieldMemberNameV44(m)} · ${FIELD_ROLE_DEFS_V44[fieldRoleV44(m)]?.label||'通用'}</option>`).join('');const tasks=p.tasks.map(t=>`<div class="parallel-task"><div><b>${t.label}</b><small>${t.work.toFixed(2)} 人時 · throughput ${t.tp.toFixed(2)}×</small></div><select data-subtask-stop="${i}" data-subtask-id="${t.id}" ${locked?'disabled':''}>${opts(t.member)}</select><span>${t.hours.toFixed(2)}h</span></div>`).join('');const load=Object.entries(p.loads).filter(([,h])=>h>0).map(([m,h])=>`${fieldMemberNameV44(m)} ${h.toFixed(2)}h`).join(' · ');return `<article class="parallel-stop"><div class="parallel-stop-head"><div><span>STOP ${i+1}</span><h4>${name}</h4></div><b>並行 ${p.elapsed.toFixed(2)}h</b></div><div class="parallel-task-list">${tasks}</div><p class="muted">人員負載：${load||'—'} · 若全序列執行約 ${p.serial.toFixed(2)}h；站點完成時間取最慢人員工作鏈。</p></article>`}).join('');return `<section class="parallel-work-panel"><div class="source-load-head"><div><span>PARALLEL WORK</span><h3>站點子任務分工</h3></div></div><p class="muted">同一名隊員可連續負責多項子任務；不同隊員可同時工作。每項子任務只能指定一名主責，總耗時由各人工作鏈中的最大值決定。</p><div class="parallel-stop-list">${rows}</div></section>`
}
const _itineraryPlannerHtmlV45=itineraryPlannerHtmlV27;
itineraryPlannerHtmlV27=function(){let html=_itineraryPlannerHtmlV45(),extra=subtaskPlannerHtmlV45();return extra?html.replace('<div class="planner-actions">',extra+'<div class="planner-actions">'):html};
const _bindItineraryPlannerV45=bindItineraryPlannerV27;
bindItineraryPlannerV27=function(){
 _bindItineraryPlannerV45();
 document.querySelectorAll('[data-subtask-stop]').forEach(s=>s.onchange=()=>setStopSubtaskAssigneeV45(s.dataset.subtaskStop,s.dataset.subtaskId,s.value));
 document.querySelectorAll('[data-it-action]').forEach(s=>s.addEventListener('change',()=>{const stop=ensureItineraryV27().stops[+s.dataset.itAction];resetStopSubtasksV45(stop);setTimeout(()=>{renderMap();saveGame(false)},0)}))
};

/* V32 hard-coded rescue preparation to .75h during execution. Substitute the parallel plan there while preserving V43's field-team wrapper. */
const _runItineraryStepV45=runItineraryStepV27;
runItineraryStepV27=function(){
 const originalSpend=spendWorldTimeV26;
 spendWorldTimeV26=function(hours,opts={}){const it=ensureItineraryV27(),stop=it.stops[it.index],isAction=!!(stop&&stop.action==='rescue'&&String(opts?.label||'').includes('：'));return originalSpend(isAction?stopActionHoursV27(stop):hours,opts)};
 try{return _runItineraryStepV45()}finally{spendWorldTimeV26=originalSpend}
};

/* During station work, everyone remains unavailable for elapsed time, but only assigned workers take full task fatigue. */
const _useFieldTeamDutyV45=useFieldTeamDutyV43;
useFieldTeamDutyV43=function(hours,label='外勤'){
 const t=ensureFieldTeamV43(),it=ensureItineraryV27(),stop=it.stops[it.index],isAction=!!(t.active&&stop&&String(label).includes('：'));
 if(!isAction)return _useFieldTeamDutyV45(hours,label);
 const actual=stop.action==='rescue'?stopActionHoursV27(stop):hours,p=stopParallelPlanV45(stop),assigned={};for(const task of p.tasks){assigned[task.member]=assigned[task.member]||[];assigned[task.member].push(task)}
 for(const id of t.npcIds){const shift=npcShiftV41(id),used=Math.max(0,Math.min(actual,npcDutyRemainingV41(id)));if(used<=0)continue;const tasks=assigned[id]||[],activeHours=tasks.reduce((a,x)=>a+x.hours,0),share=clamp(activeHours/Math.max(.01,actual),0,1),activityFactor=tasks.length?Math.max(...tasks.map(x=>({observe:.72,walk:.90,search:1.02,repair:1.22,carry:1.34}[x.activity]||1))):.55;const fm=.55*(1-share)+activityFactor*share;shift.workedToday+=used;shift.fatigue=clamp(shift.fatigue+used*3.2*fm,0,100);shift.last={day:state.day,task:shift.task,hours:used,action:`${label} · ${tasks.map(x=>x.label).join('／')||'待命'}`};recordNpcServiceV40(id,used,shift.last.action)}
 t.elapsedHours+=actual
};

for(const stop of ensureItineraryV27().stops)ensureStopSubtasksV45(stop);
