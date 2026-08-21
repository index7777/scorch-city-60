/* v14.2.2 QA — explicit field-tool carry custody / no owned-tool teleport */
function fieldToolOwnedV47(){
 const out=[];if(state.gear?.toolkit)out.push({id:'toolkit',...FIELD_TOOL_DEFS_V46.toolkit});if(state.gear?.cart)out.push({id:'cart',...FIELD_TOOL_DEFS_V46.cart});if(state.installed?.lift)out.push({id:'lift',...FIELD_TOOL_DEFS_V46.lift,mounted:true});if((state.resources?.medicine||0)>=1)out.push({id:'medkit',...FIELD_TOOL_DEFS_V46.medkit,consumable:'medicine'});return out
}
function ensureFieldToolCarryV47(){
 const t=ensureFieldTeamV43(),owned=fieldToolOwnedV47().map(x=>x.id);if(!Array.isArray(t.toolIds)){t.toolIds=[...owned];t.toolCarryMigrated=true}
 t.toolIds=t.toolIds.filter(id=>owned.includes(id));return t.toolIds
}
function toggleFieldToolCarryV47(id){
 const t=ensureFieldTeamV43();if(t.active)return toast('外勤已開始，不能中途增減攜行工具');const owned=fieldToolOwnedV47();if(!owned.some(x=>x.id===id))return toast('目前沒有這件可攜工具');ensureFieldToolCarryV47();if(t.toolIds.includes(id))t.toolIds=t.toolIds.filter(x=>x!==id);else t.toolIds.push(id);for(const stop of ensureItineraryV27().stops)ensureStopToolAssignmentsV46(stop);renderMap();saveGame(false)
}
fieldToolInventoryV46=function(){
 const t=ensureFieldTeamV43(),home=t.active?t.current:fieldTeamHomeV43(),selected=new Set(ensureFieldToolCarryV47()),out=[];
 for(const tool of fieldToolOwnedV47())if(selected.has(tool.id)){
  if(tool.id==='lift'&&!(t.useVehicle&&state.gear?.vehicle&&ensureVehicleStateV32().currentLocation===home))continue;
  out.push({...tool,location:home})
 }
 if(t.useVehicle&&state.gear?.vehicle&&ensureVehicleStateV32().currentLocation===home)out.push({id:'vehicle',...FIELD_TOOL_DEFS_V46.vehicle,location:home});return out
};
function fieldToolCarryHtmlV47(){
 const t=ensureFieldTeamV43(),selected=new Set(ensureFieldToolCarryV47()),owned=fieldToolOwnedV47(),locked=t.active;
 const rows=owned.map(x=>{const need=x.id==='lift'?' · 需工程車':x.id==='medkit'?` · 藥品 ${Math.floor(state.resources?.medicine||0)} 份`:'';return `<label class="field-tool-carry"><input type="checkbox" data-field-tool-carry="${x.id}" ${selected.has(x.id)?'checked':''} ${locked?'disabled':''}><span><b>${x.label}</b><small>${x.kind==='handling'?'搬運設備':x.kind==='medical'?'醫療耗材包':'作業工具'}${need}</small></span></label>`}).join('')||'<p class="muted">目前沒有額外可攜工具。</p>';
 return `<div class="field-tool-carry-box"><div class="field-role-head"><div><span>TOOL CUSTODY</span><h4>出發攜行工具</h4></div><b>${selected.size} 件</b></div><p class="muted">只有出發前勾選的工具會跟隊移動；未攜行的工具留在隊伍起點。工程車由交通選項控制。</p><div class="field-tool-carry-list">${rows}</div></div>`
}
const _subtaskPlannerHtmlV47=subtaskPlannerHtmlV46;
subtaskPlannerHtmlV46=function(){const html=_subtaskPlannerHtmlV47(),box=fieldToolCarryHtmlV47();return html.replace('<div class="parallel-stop-list">',box+'<div class="parallel-stop-list">')};
const _bindItineraryPlannerV47=bindItineraryPlannerV27;
bindItineraryPlannerV27=function(){_bindItineraryPlannerV47();document.querySelectorAll('[data-field-tool-carry]').forEach(x=>x.onchange=()=>toggleFieldToolCarryV47(x.dataset.fieldToolCarry))};

/* Re-check current-stop tools before travelling there, so interruptions or consumed supplies cannot leave a stale feasible plan. */
const _runItineraryStepV47=runItineraryStepV27;
runItineraryStepV27=function(){const it=ensureItineraryV27(),stop=it.stops[it.index];if(it.status==='running'&&stop){const p=stopParallelPlanV45(stop);if(!p.ok)return pauseItineraryV27(p.issues[0]||'目前外勤工具不足，請調整行程')}return _runItineraryStepV47()};
ensureFieldToolCarryV47();
