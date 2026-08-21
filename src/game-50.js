/* v14.2.2 QA — physical field spares / depot custody / cargo mass / site consumption */
const FIELD_SPARE_DEFS_V50={
 repairPack:{label:'通用維修備件包',weightKg:6,build:{parts:2},desc:'緊固件、接頭、短線材與通用替換件。'},
 sealKit:{label:'密封／墊片包',weightKg:2,build:{parts:1},desc:'泵、壓縮機與冷卻接口用密封件。'},
 fuseKit:{label:'保險絲／端子包',weightKg:1,build:{parts:1},desc:'配電與電氣設備的保險絲、端子與短接件。'},
 coolantKit:{label:'冷媒維修包',weightKg:6,build:{coolant:2,parts:1},desc:'封裝冷媒、接頭與補充軟管。'}
};
const FIELD_TOOL_MASS_V50={toolkit:12,cart:18,lift:120,medkit:1.5};
const FIELD_EQUIPMENT_MASS_V50={coolpack:9,portableFan:2.5};
function ensureFieldSpareStateV50(){
 state.fieldSpares=state.fieldSpares||{schema:1,depots:{},last:null};state.fieldSpares.schema=1;state.fieldSpares.depots=state.fieldSpares.depots||{};
 const t=ensureFieldTeamV43();t.spareLoad=t.spareLoad||{};for(const id of Object.keys(FIELD_SPARE_DEFS_V50))t.spareLoad[id]=Math.max(0,Math.floor(+t.spareLoad[id]||0));
 return state.fieldSpares
}
function fieldSpareDepotV50(location=fieldTeamHomeV43()){
 ensureFieldSpareStateV50();const d=state.fieldSpares.depots[location]||(state.fieldSpares.depots[location]={});for(const id of Object.keys(FIELD_SPARE_DEFS_V50))d[id]=Math.max(0,Math.floor(+d[id]||0));return d
}
function fieldSpareLoadV50(){ensureFieldSpareStateV50();return ensureFieldTeamV43().spareLoad}
function spareCostOkV50(def){return Object.entries(def.build).every(([k,v])=>(state.resources?.[k]||0)+1e-6>=v)}
function packFieldSpareV50(id,count=1){
 const t=ensureFieldTeamV43(),def=FIELD_SPARE_DEFS_V50[id];if(!def||t.active)return toast('外勤進行中，不能重新封裝備件');count=Math.max(1,Math.floor(+count||1));
 const total={};for(const [k,v] of Object.entries(def.build))total[k]=v*count;if(!Object.entries(total).every(([k,v])=>(state.resources?.[k]||0)+1e-6>=v))return toast('中央庫存不足以封裝這批備件');
 for(const [k,v] of Object.entries(total))state.resources[k]=Math.max(0,(state.resources[k]||0)-v);fieldSpareDepotV50()[id]+=count;log(`封裝 ${def.label} ×${count}，已轉入${locationLabelV24(fieldTeamHomeV43())}備件庫。`,'good');renderMap();saveGame(false)
}
function unpackFieldSpareV50(id,count=1){
 const t=ensureFieldTeamV43(),def=FIELD_SPARE_DEFS_V50[id],d=fieldSpareDepotV50();if(!def||t.active)return toast('外勤進行中，不能拆回備件');count=Math.min(Math.max(1,Math.floor(+count||1)),d[id]||0);if(count<=0)return toast('據點沒有這種備件');
 d[id]-=count;for(const [k,v] of Object.entries(def.build))state.resources[k]=(state.resources[k]||0)+v*count;log(`拆回 ${def.label} ×${count} 至中央散裝資源。`);renderMap();saveGame(false)
}
function setFieldSpareLoadV50(id,count){
 const t=ensureFieldTeamV43(),def=FIELD_SPARE_DEFS_V50[id];if(!def||t.active)return toast('外勤開始後不能改變備件裝載');const d=fieldSpareDepotV50(),load=fieldSpareLoadV50();load[id]=clamp(Math.floor(+count||0),0,d[id]||0);renderMap();saveGame(false)
}
function fieldSpareMassV50(load=fieldSpareLoadV50()){return Object.entries(FIELD_SPARE_DEFS_V50).reduce((kg,[id,d])=>kg+(load[id]||0)*d.weightKg,0)}
function fieldToolMassV50(){const selected=new Set(ensureFieldToolCarryV47()),t=ensureFieldTeamV43();let kg=0;for(const id of selected)kg+=FIELD_TOOL_MASS_V50[id]||0;if(t.useVehicle&&selected.has('lift'))kg+=0;return kg}
function fieldPortableEquipmentMassV50(){return fieldTeamSelectedEquipmentV43().reduce((kg,e)=>kg+(FIELD_EQUIPMENT_MASS_V50[e.type]||4),0)}
function fieldCargoCapacityV50(){const t=ensureFieldTeamV43(),members=fieldTeamSizeV43();if(t.useVehicle&&state.gear?.vehicle)return Math.max(0,(ensureVehicleStateV32().capacityKg||700));const cart=ensureFieldToolCarryV47().includes('cart')&&state.gear?.cart;return members*18+(cart?80:0)}
function fieldCargoPlanV50(){const spare=fieldSpareMassV50(),tools=fieldToolMassV50(),portable=fieldPortableEquipmentMassV50(),used=spare+tools+portable,capacity=fieldCargoCapacityV50();return {spare,tools,portable,used,capacity,ok:used<=capacity+1e-6,over:Math.max(0,used-capacity)}}

function assetSpareNeedsV50(stop){
 if(stop?.action!=='asset')return {};const a=assetAtStopV46(stop);if(!a)return {};const out={};
 if(['compressor','chiller','pump'].includes(a.effect))out.sealKit=1;
 if(['compressor','chiller'].includes(a.effect))out.coolantKit=1;
 if(['power','inverter'].includes(a.effect)||a.id==='generator')out.fuseKit=1;
 if((+a.weight||0)>=300)out.repairPack=1;
 return out
}
function stopSpareNeedsV50(stop){const out=assetSpareNeedsV50(stop);return out}
function itinerarySpareBudgetV50(){
 const left={...fieldSpareLoadV50()},rows=[],issues=[];for(const stop of ensureItineraryV27().stops){const need=stopSpareNeedsV50(stop),before={...left};for(const [id,n] of Object.entries(need)){left[id]=(left[id]||0)-n;if(left[id]<0)issues.push(`${mapLoc(stop.location)?.name||stop.location}：缺少${FIELD_SPARE_DEFS_V50[id].label}`)}rows.push({stop,need,before,after:{...left}})}return {start:{...fieldSpareLoadV50()},end:left,rows,issues:[...new Set(issues)],ok:issues.length===0}
}
const _fieldTeamValidationV50=fieldTeamValidationV43;
fieldTeamValidationV43=function(e){const v=_fieldTeamValidationV50(e),cargo=fieldCargoPlanV50(),spares=itinerarySpareBudgetV50(),issues=[...v.issues,...spares.issues];if(!cargo.ok)issues.push(`外勤載重超出 ${cargo.over.toFixed(1)} kg（${cargo.used.toFixed(1)} / ${cargo.capacity.toFixed(1)} kg）`);return {...v,cargo,spares,ok:issues.length===0,issues:[...new Set(issues)]}};

function commitFieldSpareLoadV50(){
 const t=ensureFieldTeamV43(),d=fieldSpareDepotV50(),load=fieldSpareLoadV50();if(t._sparesCommittedV50)return true;for(const id of Object.keys(FIELD_SPARE_DEFS_V50))if((load[id]||0)>(d[id]||0))return false;for(const id of Object.keys(FIELD_SPARE_DEFS_V50))d[id]-=load[id]||0;t._sparesCommittedV50=true;t.spareOrigin=fieldTeamHomeV43();return true
}
const _activateFieldTeamV50=activateFieldTeamV43;
activateFieldTeamV43=function(e){const v=fieldTeamValidationV43(e);if(!v.ok)return {ok:false,reason:v.issues[0]};if(!commitFieldSpareLoadV50())return {ok:false,reason:'據點備件庫存已改變，請重新確認裝載'};const r=_activateFieldTeamV50(e);if(!r?.ok){const t=ensureFieldTeamV43(),d=fieldSpareDepotV50(t.spareOrigin||fieldTeamHomeV43());for(const id of Object.keys(FIELD_SPARE_DEFS_V50))d[id]+=(t.spareLoad[id]||0);t._sparesCommittedV50=false}return r};
function consumeStopSparesV50(stop){if(!stop||stop._sparesConsumedV50)return;const need=stopSpareNeedsV50(stop),load=fieldSpareLoadV50();for(const [id,n] of Object.entries(need))load[id]=Math.max(0,(load[id]||0)-n);if(Object.keys(need).length){stop._sparesConsumedV50={day:state.day,need};log(`現場耗用：${Object.entries(need).map(([id,n])=>`${FIELD_SPARE_DEFS_V50[id].label} ×${n}`).join('、')}。`,'major')}}
const _runItineraryStepV50=runItineraryStepV27;
runItineraryStepV27=function(){const it=ensureItineraryV27(),before=it.index,stop=it.stops[before],out=_runItineraryStepV50();if(stop&&it.index>before)consumeStopSparesV50(stop);return out};
const _finishFieldTeamV50=finishFieldTeamV43;
finishFieldTeamV43=function(){const t=ensureFieldTeamV43(),load={...fieldSpareLoadV50()},origin=t.spareOrigin||fieldTeamHomeV43(),was=t.active;_finishFieldTeamV50();if(was&&t._sparesCommittedV50){const d=fieldSpareDepotV50(origin);for(const id of Object.keys(FIELD_SPARE_DEFS_V50))d[id]+=(load[id]||0);for(const id of Object.keys(FIELD_SPARE_DEFS_V50))t.spareLoad[id]=0;t._sparesCommittedV50=false;t.spareOrigin=null;state.fieldSpares.last={day:state.day,returnedTo:origin};saveGame(false)}};

function fieldSpareHtmlV50(){
 const t=ensureFieldTeamV43(),d=fieldSpareDepotV50(),load=fieldSpareLoadV50(),cargo=fieldCargoPlanV50(),budget=itinerarySpareBudgetV50(),locked=t.active;
 const rows=Object.entries(FIELD_SPARE_DEFS_V50).map(([id,def])=>`<div class="field-spare-row"><div><b>${def.label}</b><small>${def.weightKg} kg／包 · 據點 ${d[id]||0} · 已裝 ${load[id]||0}</small></div><div class="field-spare-controls"><button class="mini secondary" data-spare-pack="${id}" ${locked?'disabled':''}>封裝 +1</button><button class="mini secondary" data-spare-unpack="${id}" ${locked||!(d[id]>0)?'disabled':''}>拆回 -1</button><input type="number" min="0" max="${d[id]||0}" value="${load[id]||0}" data-spare-load="${id}" ${locked?'disabled':''}></div></div>`).join('');
 const issues=budget.issues.length?`<div class="field-team-issues">${budget.issues.map(x=>`<p>${x}</p>`).join('')}</div>`:'<div class="action-ready">目前排定站點的備件數量足夠。</div>';
 return `<div class="field-spare-box"><div class="field-role-head"><div><span>FIELD SPARES / CARGO</span><h4>外勤備件與載重</h4></div><b>${cargo.used.toFixed(1)} / ${cargo.capacity.toFixed(1)} kg</b></div><p class="muted">中央散裝零件必須先封裝成外勤備件，再裝入隊伍。出發後備件跟隊移動，現場耗用後不會自動從中央站補充。</p><div class="field-spare-list">${rows}</div><div class="field-spare-mass"><span>備件 <b>${cargo.spare.toFixed(1)} kg</b></span><span>工具 <b>${cargo.tools.toFixed(1)} kg</b></span><span>可攜設備 <b>${cargo.portable.toFixed(1)} kg</b></span></div>${!cargo.ok?`<p class="action-warning">超載 ${cargo.over.toFixed(1)} kg；必須減少備件／工具／設備或改用工程車。</p>`:''}${issues}</div>`
}
const _subtaskPlannerHtmlV50=subtaskPlannerHtmlV46;
subtaskPlannerHtmlV46=function(){const html=_subtaskPlannerHtmlV50(),box=fieldSpareHtmlV50();return html.replace('<div class="parallel-stop-list">',box+'<div class="parallel-stop-list">')};
const _bindItineraryPlannerV50=bindItineraryPlannerV27;
bindItineraryPlannerV27=function(){_bindItineraryPlannerV50();document.querySelectorAll('[data-spare-pack]').forEach(b=>b.onclick=()=>packFieldSpareV50(b.dataset.sparePack));document.querySelectorAll('[data-spare-unpack]').forEach(b=>b.onclick=()=>unpackFieldSpareV50(b.dataset.spareUnpack));document.querySelectorAll('[data-spare-load]').forEach(x=>x.onchange=()=>setFieldSpareLoadV50(x.dataset.spareLoad,+x.value))};
ensureFieldSpareStateV50();
