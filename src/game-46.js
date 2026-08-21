/* v14.2.2 QA — field subtask tools / equipment contention / consumable requirements */
const FIELD_TOOL_DEFS_V46={
 toolkit:{label:'遠征工具箱',kind:'tool',throughput:1.22},
 cart:{label:'推車',kind:'handling',throughput:1.16},
 vehicle:{label:'工程車',kind:'handling',throughput:1.28},
 lift:{label:'液壓搬運平台',kind:'handling',throughput:1.38},
 medkit:{label:'現場醫療包',kind:'medical',throughput:1.22}
};
function fieldToolInventoryV46(){
 const t=ensureFieldTeamV43(),home=t.active?t.current:fieldTeamHomeV43(),out=[];
 if(state.gear?.toolkit)out.push({id:'toolkit',...FIELD_TOOL_DEFS_V46.toolkit,location:home});
 if(state.gear?.cart)out.push({id:'cart',...FIELD_TOOL_DEFS_V46.cart,location:home});
 if(t.useVehicle&&state.gear?.vehicle&&ensureVehicleStateV32().currentLocation===home)out.push({id:'vehicle',...FIELD_TOOL_DEFS_V46.vehicle,location:home});
 /* installed.lift means the recovered hydraulic platform has been integrated into the engineering vehicle handling rig. */
 if(state.installed?.lift&&t.useVehicle&&state.gear?.vehicle&&ensureVehicleStateV32().currentLocation===home)out.push({id:'lift',...FIELD_TOOL_DEFS_V46.lift,location:home,mounted:true});
 if((state.resources?.medicine||0)>=1)out.push({id:'medkit',...FIELD_TOOL_DEFS_V46.medkit,location:home,consumable:'medicine'});
 return out
}
function fieldToolByIdV46(id){return fieldToolInventoryV46().find(x=>x.id===id)||null}
function assetAtStopV46(stop){
 const found=typeof discoveredAssetsAt==='function'?discoveredAssetsAt(stop.location):[];
 if(!found?.length)return null;
 const arr=found.map(x=>typeof x==='string'?assetDefs.find(a=>a.id===x):x).filter(Boolean);
 return arr.sort((a,b)=>(+b.weight||0)-(+a.weight||0))[0]||null
}
function subtaskToolRuleV46(stop,task){
 const action=stop?.action,asset=action==='asset'?assetAtStopV46(stop):null,w=+asset?.weight||0;
 if(action==='asset'&&(task.id==='isolate'||task.id==='detach'))return {required:['toolkit'],compatible:['toolkit'],reason:'拆卸作業需要遠征工具箱'};
 if(action==='asset'&&task.id==='carry'){
  if(w>=300)return {required:['vehicle'],compatible:['vehicle','lift'],reason:`${asset?.name||'大型設備'}約 ${w}kg，必須使用工程車承載`};
  return {required:[],compatible:['cart','vehicle'],reason:''}
 }
 if(action==='asset'&&task.id==='load'){
  if(w>=500&&asset?.id!=='lift')return {required:['vehicle','lift'],compatible:['vehicle','lift'],reason:`${asset?.name||'重型設備'}約 ${w}kg，需要工程車與車載液壓搬運平台`};
  if(w>=120)return {required:['vehicle'],compatible:['vehicle','lift'],reason:`${asset?.name||'設備'}需要工程車裝載`};
  return {required:[],compatible:['cart','vehicle'],reason:''}
 }
 if(action==='search'&&task.id==='carry')return {required:[],compatible:['cart','vehicle'],reason:''};
 if(action==='rescue'&&(task.id==='triage'||task.id==='stabilize'))return {required:['medkit'],compatible:['medkit'],reason:'救援分診與穩定處置需要至少 1 份藥品組成現場醫療包'};
 if(action==='rescue'&&task.id==='extract')return {required:[],compatible:['cart','vehicle'],reason:''};
 return {required:[],compatible:[],reason:''}
}
function ensureStopToolAssignmentsV46(stop){
 if(!stop)return {};stop.toolAssignments=stop.toolAssignments||{};const defs=stopSubtaskDefsV45(stop),available=new Set(fieldToolInventoryV46().map(x=>x.id));
 const valid=new Set(defs.map(d=>d.id));for(const k of Object.keys(stop.toolAssignments))if(!valid.has(k))delete stop.toolAssignments[k];
 for(const d of defs){const rule=subtaskToolRuleV46(stop,d),cur=stop.toolAssignments[d.id];if(cur&&(!rule.compatible.includes(cur)||!available.has(cur)))delete stop.toolAssignments[d.id];if(!stop.toolAssignments[d.id]){const preferred=rule.required.find(x=>available.has(x))||rule.compatible.find(x=>available.has(x));if(preferred)stop.toolAssignments[d.id]=preferred}}
 return stop.toolAssignments
}
function subtaskToolStatusV46(stop,task){
 const rule=subtaskToolRuleV46(stop,task),assign=ensureStopToolAssignmentsV46(stop),available=new Set(fieldToolInventoryV46().map(x=>x.id)),selected=assign[task.id]||null,requiredTools=rule.required.map(fieldToolByIdV46).filter(Boolean);
 const missing=rule.required.filter(id=>!available.has(id));const selectedTool=selected?fieldToolByIdV46(selected):null;
 const toolMap=new Map(requiredTools.map(x=>[x.id,x]));if(selectedTool)toolMap.set(selectedTool.id,selectedTool);const tools=[...toolMap.values()];
 return {rule,selected,tool:selectedTool,tools,missing,ok:missing.length===0}
}
function setStopToolV46(stopIndex,taskId,toolId){
 const t=ensureFieldTeamV43(),stop=ensureItineraryV27().stops[+stopIndex];if(!stop||t.active)return toast('外勤開始後不能重排工具');const task=stopSubtaskDefsV45(stop).find(x=>x.id===taskId);if(!task)return;const rule=subtaskToolRuleV46(stop,task);
 if(toolId&&(!rule.compatible.includes(toolId)||!fieldToolByIdV46(toolId)))return toast('這件工具目前不可用於此子任務');ensureStopToolAssignmentsV46(stop);if(toolId)stop.toolAssignments[taskId]=toolId;else delete stop.toolAssignments[taskId];renderMap();saveGame(false)
}
function toolThroughputV46(tools){const arr=Array.isArray(tools)?tools:tools?[tools]:[];return arr.reduce((f,t)=>f*(t?.throughput||1),1)}

/* Replace V45's person-only parallel plan with a small job-shop schedule: person and every unique physical tool are exclusive resources. */
stopParallelPlanV45=function(stop){
 const base=rawStopActionHoursV45(stop),defs=stopSubtaskDefsV45(stop),assign=ensureStopSubtasksV45(stop),members=fieldTeamMembersV43(),memberReady={},toolReady={},issues=[];
 for(const id of members)memberReady[id]=0;
 const tasks=[];
 for(const d of defs){
  const member=members.includes(assign[d.id])?assign[d.id]:'player',ts=subtaskToolStatusV46(stop,d),tools=ts.tools,tp=memberThroughputV45(member,d)*toolThroughputV46(tools),work=base*d.weight,hours=work/Math.max(.01,tp);
  if(!ts.ok)issues.push(ts.rule.reason||`${d.label}缺少必要工具`);
  const resourceReady=tools.reduce((m,t)=>Math.max(m,toolReady[t.id]||0),0),start=Math.max(memberReady[member]||0,resourceReady),end=start+hours;memberReady[member]=end;for(const tool of tools)toolReady[tool.id]=end;
  tasks.push({...d,member,toolId:ts.selected,tool:ts.tool,tools,work,tp,hours,start,end,toolRule:ts.rule,toolOk:ts.ok})
 }
 const elapsed=Math.max(.1,...Object.values(memberReady),...Object.values(toolReady));return {base,tasks,loads:memberReady,toolLoads:toolReady,elapsed:Math.round(elapsed*20)/20,serial:Math.round(tasks.reduce((a,t)=>a+t.hours,0)*20)/20,issues:[...new Set(issues)],ok:issues.length===0}
};

const _fieldTeamValidationV46=fieldTeamValidationV43;
fieldTeamValidationV43=function(e){
 const v=_fieldTeamValidationV46(e),issues=[...v.issues],it=ensureItineraryV27();for(const stop of it.stops){const p=stopParallelPlanV45(stop);for(const x of p.issues)issues.push(`${mapLoc(stop.location)?.name||stop.location}：${x}`)}
 const rescueCount=it.stops.filter(s=>s.action==='rescue').length;if(rescueCount>(state.resources?.medicine||0))issues.push(`目前排定 ${rescueCount} 次救援，但只有 ${Math.floor(state.resources?.medicine||0)} 份藥品可組成現場醫療包`);
 return {...v,ok:issues.length===0,issues:[...new Set(issues)]}
};

function toolOptionsV46(stop,task,selected){
 const rule=subtaskToolRuleV46(stop,task),available=fieldToolInventoryV46().filter(x=>rule.compatible.includes(x.id));const optional=!rule.required.length;let out=optional?`<option value="" ${!selected?'selected':''}>徒手／不使用</option>`:'';
 out+=available.map(x=>`<option value="${x.id}" ${selected===x.id?'selected':''}>${x.label}</option>`).join('');return out||'<option value="">無可用工具</option>'
}
function subtaskPlannerHtmlV46(){
 const it=ensureItineraryV27(),locked=ensureFieldTeamV43().active,members=fieldTeamMembersV43();if(!it.stops.length)return '';
 const rows=it.stops.map((stop,i)=>{const p=stopParallelPlanV45(stop),name=mapLoc(stop.location)?.name||stop.location,memberOpts=id=>members.map(m=>`<option value="${m}" ${m===id?'selected':''}>${fieldMemberNameV44(m)} · ${FIELD_ROLE_DEFS_V44[fieldRoleV44(m)]?.label||'通用'}</option>`).join('');const tasks=p.tasks.map(t=>{const toolText=t.tools.length?t.tools.map(x=>x.label).join(' + '):(t.toolRule.required.length?'缺工具':'徒手');return `<div class="parallel-task ${t.toolOk?'':'tool-missing'}"><div><b>${t.label}</b><small>${t.work.toFixed(2)} 人時 · throughput ${t.tp.toFixed(2)}× · ${t.start.toFixed(2)}–${t.end.toFixed(2)}h</small></div><select data-subtask-stop="${i}" data-subtask-id="${t.id}" ${locked?'disabled':''}>${memberOpts(t.member)}</select><select data-subtool-stop="${i}" data-subtool-id="${t.id}" ${locked?'disabled':''}>${toolOptionsV46(stop,t,t.toolId)}</select><span>${toolText}</span></div>`}).join('');const load=Object.entries(p.loads).filter(([,h])=>h>0).map(([m,h])=>`${fieldMemberNameV44(m)} 到 ${h.toFixed(2)}h`).join(' · '),toolLoad=Object.entries(p.toolLoads).filter(([,h])=>h>0).map(([id,h])=>`${FIELD_TOOL_DEFS_V46[id]?.label||id} 到 ${h.toFixed(2)}h`).join(' · ');return `<article class="parallel-stop ${p.ok?'':'blocked'}"><div class="parallel-stop-head"><div><span>STOP ${i+1}</span><h4>${name}</h4></div><b>並行 ${p.elapsed.toFixed(2)}h</b></div><div class="parallel-task-list">${tasks}</div>${p.issues.length?`<div class="field-team-issues">${p.issues.map(x=>`<p>${x}</p>`).join('')}</div>`:''}<p class="muted">人員資源：${load||'—'}${toolLoad?` · 工具資源：${toolLoad}`:''}。同一人或任一共用實體工具的工作會自動序列化。</p></article>`}).join('');return `<section class="parallel-work-panel"><div class="source-load-head"><div><span>PARALLEL WORK / TOOL LOCK</span><h3>站點子任務與工具排程</h3></div></div><p class="muted">子任務同時占用「主責人員」與所有必要實體工具。兩項工作即使由不同人負責，只要共用任一件工具，就不能同時進行。</p><div class="parallel-stop-list">${rows}</div></section>`
}
const _itineraryPlannerHtmlV46=itineraryPlannerHtmlV27;
itineraryPlannerHtmlV27=function(){let html=_itineraryPlannerHtmlV46();const oldStart=html.indexOf('<section class="parallel-work-panel">');if(oldStart>=0){const oldEnd=html.indexOf('</section>',oldStart);if(oldEnd>=0)html=html.slice(0,oldStart)+html.slice(oldEnd+10)}const extra=subtaskPlannerHtmlV46();return extra?html.replace('<div class="planner-actions">',extra+'<div class="planner-actions">'):html};
const _bindItineraryPlannerV46=bindItineraryPlannerV27;
bindItineraryPlannerV27=function(){_bindItineraryPlannerV46();document.querySelectorAll('[data-subtool-stop]').forEach(s=>s.onchange=()=>setStopToolV46(s.dataset.subtoolStop,s.dataset.subtoolId,s.value))};

/* Medical supplies are consumed once when a rescue action actually completes, never during planning. */
const _executeNpcRescueV46=executeNpcRescueV29;
executeNpcRescueV29=function(stop){
 const p=stopParallelPlanV45(stop);if(!p.ok){pauseItineraryV27(p.issues[0]||'救援缺少必要工具／耗材');return false}if((state.resources.medicine||0)<1){pauseItineraryV27('現場醫療包已無藥品，無法完成傷患穩定');return false}
 const ok=_executeNpcRescueV46(stop);if(ok){state.resources.medicine=Math.max(0,(state.resources.medicine||0)-1);log('救援處置消耗 1 份藥品／醫療耗材。','major')}return ok
};

for(const stop of ensureItineraryV27().stops)ensureStopToolAssignmentsV46(stop);
