/* v14.2.2 QA — field team composition / seats / cooling / duty / expedition staffing */
function ensureFieldTeamV43(){
 state.fieldTeam=state.fieldTeam||{schema:1,npcIds:[],equipmentIds:[],useVehicle:false,active:false,current:null,startedDay:null,elapsedHours:0,last:null};
 state.fieldTeam.schema=1;
 state.fieldTeam.npcIds=Array.isArray(state.fieldTeam.npcIds)?state.fieldTeam.npcIds.filter(id=>state.npcs?.[id]):[];
 state.fieldTeam.equipmentIds=Array.isArray(state.fieldTeam.equipmentIds)?state.fieldTeam.equipmentIds.filter(id=>state.equipmentInstances?.[id]):[];
 return state.fieldTeam
}
function fieldTeamMembersV43(){const t=ensureFieldTeamV43();return ['player',...t.npcIds]}
function fieldTeamSizeV43(){return fieldTeamMembersV43().length}
function fieldTeamNpcKnownV43(id){const n=state.npcs?.[id];return !!(n?.alive&&npcKnown(n))}
function fieldTeamHomeV43(){return mapStartId()}
function fieldTeamNpcAtStartV43(id){const t=ensureFieldTeamV43(),site=npcServiceZoneV40(id);return t.active?site===t.current:site===fieldTeamHomeV43()}
function fieldTeamNpcEligibleV43(id){const n=state.npcs?.[id];if(!fieldTeamNpcKnownV43(id)||!fieldTeamNpcAtStartV43(id))return false;const p=npcShiftV41(id);return p.task!=='rest'&&npcDutyRemainingV41(id)>.24}
function fieldTeamEquipmentEligibleV43(e){const t=ensureFieldTeamV43(),home=t.active?t.current:fieldTeamHomeV43();return !!(e&&e.owner==='player'&&e.holder==='player'&&!e.loan&&e.location===home&&e.type!=='coolingVehicle')}
function fieldTeamSelectedEquipmentV43(){ensurePowerStateV24();const t=ensureFieldTeamV43();return t.equipmentIds.map(id=>state.equipmentInstances[id]).filter(Boolean)}
function fieldTeamPortableCoolingV43(requiredHours=0){
 const temp=currentOutsideTempV26(),members=fieldTeamSizeV43();if(temp<=35)return {ok:true,capacity:members,devices:[],requiredHours};
 const devices=fieldTeamSelectedEquipmentV43().filter(e=>{const c=equipmentCoverageV24(e,1,temp,'walk');return c.ok&&c.runtimeHours+1e-6>=requiredHours});
 const capacity=devices.reduce((n,e)=>n+(equipmentTypeV24(e)?.maxUsers||1),0);return {ok:capacity>=members,capacity,devices,requiredHours}
}
function fieldTeamVehicleForecastV43(e){
 const t=ensureFieldTeamV43();if(!t.useVehicle)return {useVehicle:false,ok:true};if(!state.gear?.vehicle)return {useVehicle:true,ok:false,reason:'尚未取得工程車'};
 const vehicle=ensureVehicleStateV32(),home=t.active?t.current:fieldTeamHomeV43();if(vehicle.currentLocation!==home)return {useVehicle:true,ok:false,reason:`工程車目前在${locationLabelV24(vehicle.currentLocation)}，不在隊伍所在地`};
 const users=fieldTeamSizeV43();if(users>3)return {useVehicle:true,ok:false,reason:`工程車只有 3 個可用座位；目前隊伍 ${users} 人`};
 let distance=0,travel=0;for(const leg of e?.legs||[]){distance+=leg.route?.distance||0;travel+=leg.travel||0}
 const hot=currentOutsideTempV26()>35,cv=coolingVehicleV32(),cabin=!!(hot&&cv&&users<=vehicleCabinCapacityV32()&&vehicleCabinCanCoverV32(users,travel)),cost=vehicleDriveCostV32(distance,travel,{users,cooling:cabin});
 if((state.resources.fuel||0)+1e-6<cost.fuelL)return {useVehicle:true,ok:false,reason:`整段行程約需 ${cost.fuelL.toFixed(1)} L 柴油`,distance,travel,cost,cabin};
 if(cv&&cv.battery.chargeKWh+1e-6<cost.totalKWh)return {useVehicle:true,ok:false,reason:`整段行程車載用電約需 ${cost.totalKWh.toFixed(2)} kWh`,distance,travel,cost,cabin};
 return {useVehicle:true,ok:true,distance,travel,cost,cabin,vehicle:cv}
}
function fieldTeamValidationV43(e){
 const t=ensureFieldTeamV43(),issues=[],members=fieldTeamSizeV43();
 for(const id of t.npcIds){const n=state.npcs?.[id];if(!n?.alive)issues.push(`${n?.name||id}無法出勤`);else if(!fieldTeamNpcKnownV43(id))issues.push('隊伍包含尚未確認身份的人員');else if(!fieldTeamNpcAtStartV43(id))issues.push(`${n.name}不在隊伍所在地`);else if(npcShiftV41(id).task==='rest')issues.push(`${n.name}今日排休整，不能同時出外勤`);else if(e?.total&&npcDutyRemainingV41(id)+1e-6<e.total)issues.push(`${n.name}剩餘專業工時 ${npcDutyRemainingV41(id).toFixed(1)}h，小於行程 ${e.total.toFixed(1)}h`)}
 const vf=fieldTeamVehicleForecastV43(e);if(!vf.ok)issues.push(vf.reason);
 const hot=currentOutsideTempV26()>35,actionHours=Math.max(0,+e?.actions||0),travelHours=Math.max(0,+e?.travel||0),portableHours=hot?(vf.useVehicle&&vf.cabin?actionHours:actionHours+travelHours):0;
 const pc=fieldTeamPortableCoolingV43(portableHours);if(portableHours>0&&!pc.ok)issues.push(`外勤需要同時保護 ${members} 人；目前選定個人冷卻設備只能可靠支援 ${pc.capacity} 人約 ${portableHours.toFixed(1)}h`);
 for(const eq of fieldTeamSelectedEquipmentV43())if(!fieldTeamEquipmentEligibleV43(eq))issues.push(`${equipmentNameV24(eq)}目前不在隊伍所在地或不可用`);
 return {ok:!issues.length,issues,vehicle:vf,portable:pc,members,portableHours}
}
function setFieldTeamVehicleV43(on){const t=ensureFieldTeamV43();if(t.active)return toast('外勤已開始，不能中途更換交通工具');t.useVehicle=!!on;renderMap();saveGame(false)}
function toggleFieldTeamNpcV43(id){const t=ensureFieldTeamV43();if(t.active)return toast('外勤已開始，不能中途更換隊員');if(t.npcIds.includes(id))t.npcIds=t.npcIds.filter(x=>x!==id);else if(fieldTeamNpcEligibleV43(id))t.npcIds.push(id);else return toast('此 NPC 目前無法從隊伍起點出勤');renderMap();saveGame(false)}
function toggleFieldTeamEquipmentV43(id){const t=ensureFieldTeamV43();if(t.active)return toast('外勤已開始，不能中途更換設備');if(t.equipmentIds.includes(id))t.equipmentIds=t.equipmentIds.filter(x=>x!==id);else{const e=state.equipmentInstances?.[id];if(!fieldTeamEquipmentEligibleV43(e))return toast('這件設備目前不在隊伍起點');t.equipmentIds.push(id)}renderMap();saveGame(false)}
function fieldTeamSkillTextV43(){const ids=ensureFieldTeamV43().npcIds,out=[];if(ids.includes('lin'))out.push('林醫師：救援／急救');if(ids.includes('chen'))out.push('陳技師：設備與冷卻診斷');if(ids.includes('mei'))out.push('美玲：偵察／資料判讀');if(ids.includes('wu'))out.push('吳先生：裝卸／接駁協調');return out.join(' · ')||'無額外專業技能'}
function fieldTeamHtmlV43(baseEstimate){
 const t=ensureFieldTeamV43(),locked=t.active,npcs=Object.keys(NPC_SHIFT_TASKS_V41).filter(fieldTeamNpcKnownV43),eq=playerEquipmentV24().filter(e=>e.type!=='coolingVehicle'&&(fieldTeamEquipmentEligibleV43(e)||t.equipmentIds.includes(e.instanceId))),v=fieldTeamValidationV43(baseEstimate);
 const npcRows=npcs.map(id=>{const n=state.npcs[id],sel=t.npcIds.includes(id),eligible=fieldTeamNpcEligibleV43(id)||sel;return `<label class="field-team-choice ${eligible?'':'disabled'}"><input type="checkbox" data-field-npc="${id}" ${sel?'checked':''} ${locked||!eligible?'disabled':''}><span><b>${n.name}</b><small>${n.role} · ${npcDutyRemainingV41(id).toFixed(1)}h 可用 · ${locationLabelV24(npcServiceZoneV40(id))}</small></span></label>`}).join('')||'<p class="muted">目前沒有已知且可從隊伍起點出勤的 NPC。</p>';
 const eqRows=eq.map(e=>{const sel=t.equipmentIds.includes(e.instanceId),type=equipmentTypeV24(e),m=equipmentModeV24(e);return `<label class="field-team-choice"><input type="checkbox" data-field-eq="${e.instanceId}" ${sel?'checked':''} ${locked?'disabled':''}><span><b>${equipmentNameV24(e)}</b><small>${e.battery?`${e.battery.chargeKWh.toFixed(2)} / ${e.battery.capacityKWh.toFixed(2)} kWh · `:''}${type?.maxUsers||1} 人 · ${m?.label||e.mode||'—'}</small></span></label>`}).join('')||'<p class="muted">隊伍起點沒有可攜行設備。</p>';
 const issue=v.issues.length?`<div class="field-team-issues">${v.issues.map(x=>`<p>${x}</p>`).join('')}</div>`:'<div class="action-ready">隊伍編成可執行目前行程。</div>';
 return `<section class="field-team-panel ${v.ok?'ready':'blocked'}"><div class="source-load-head"><div><span>FIELD TEAM</span><h3>外勤隊伍編成</h3></div><b>${v.members} 人</b></div><div class="field-team-grid"><div><h4>人員</h4><label class="field-team-choice fixed"><input type="checkbox" checked disabled><span><b>玩家</b><small>固定隊員</small></span></label>${npcRows}</div><div><h4>交通／設備</h4><label class="field-team-choice"><input type="checkbox" id="fieldUseVehicle" ${t.useVehicle?'checked':''} ${locked?'disabled':''}><span><b>工程車</b><small>${state.gear?.vehicle?`目前：${locationLabelV24(ensureVehicleStateV32().currentLocation)}`:'尚未取得'} · 3 席</small></span></label>${eqRows}</div></div><div class="field-team-summary"><span>技能 <b>${fieldTeamSkillTextV43()}</b></span><span>交通冷卻 <b>${v.vehicle?.useVehicle?(v.vehicle.cabin?'車艙主動冷卻':'需個人冷卻'):'步行／推車'}</b></span><span>個人冷卻 <b>${v.portable?.capacity||0} 人</b></span></div>${issue}${locked?'<p class="muted">外勤已開始：隊員與設備鎖定；暫停重規劃時仍保留目前編成與所在地。</p>':''}</section>`
}

/* The selected vehicle controls itinerary transport instead of merely owning a vehicle globally. */
const _itineraryModeV43=itineraryModeV27;
itineraryModeV27=function(){const t=ensureFieldTeamV43();if(t.useVehicle&&state.gear?.vehicle)return 'vehicle';if(state.gear?.cart)return 'cart';return 'foot'};

/* Field specialists reduce only actions they are physically present for. */
const _stopActionHoursV43=stopActionHoursV27;
stopActionHoursV27=function(stop){let h=_stopActionHoursV43(stop),ids=ensureFieldTeamV43().npcIds;if(stop.action==='scout'&&ids.includes('mei'))h*=.72;if(stop.action==='asset'&&ids.includes('chen'))h*=.78;if(stop.action==='search'&&ids.includes('wu'))h*=.90;return Math.max(.2,Math.round(h*20)/20)};

/* Keep team members from becoming accidental encounter targets while travelling together. */
const _npcEncounterAtV43=npcEncounterAt;
npcEncounterAt=function(locationId){const t=ensureFieldTeamV43(),skip=new Set(t.active?t.npcIds:[]);return Object.entries(state.npcs||{}).find(([id,n])=>n.alive&&n.location===locationId&&!skip.has(id))||null};

/* A specialist in the field cannot simultaneously provide stationary service. */
const _npcExpertAtV43=npcExpertAtV40;
npcExpertAtV40=function(id,site){const t=ensureFieldTeamV43();if(t.active&&t.npcIds.includes(id))return false;return _npcExpertAtV43(id,site)};

function activateFieldTeamV43(e){
 const t=ensureFieldTeamV43(),v=fieldTeamValidationV43(e);if(!v.ok)return {ok:false,reason:v.issues[0]};const home=fieldTeamHomeV43();t.active=true;t.current=home;t.startedDay=state.day;t.elapsedHours=0;t.last={startDay:state.day,home};
 const users=fieldTeamMembersV43();let ui=0;for(const eq of fieldTeamSelectedEquipmentV43()){stopChargingV24(eq.instanceId,true);eq.location=home;const cap=equipmentTypeV24(eq)?.maxUsers||1;eq.assignedUsers=users.slice(ui,ui+cap);ui+=cap}
 for(const id of t.npcIds)state.npcs[id].location=home;return {ok:true}
}
function syncFieldTeamLocationV43(){const t=ensureFieldTeamV43();if(!t.active)return;const loc=ensureItineraryV27().current||t.current||fieldTeamHomeV43();t.current=loc;for(const id of t.npcIds)if(state.npcs?.[id]?.alive)state.npcs[id].location=loc;for(const eq of fieldTeamSelectedEquipmentV43())eq.location=loc}
function useFieldTeamDutyV43(hours,label='外勤'){const t=ensureFieldTeamV43();if(!t.active||hours<=0)return;for(const id of t.npcIds)useNpcDutyV41(id,hours,label);t.elapsedHours+=hours}
function drainFieldTeamCoolingV43(hours){
 if(hours<=0||currentOutsideTempV26()<=35)return;const users=fieldTeamSizeV43(),devices=fieldTeamPortableCoolingV43(hours).devices;let left=users;for(const e of devices){if(left<=0)break;const cap=Math.min(left,equipmentTypeV24(e)?.maxUsers||1);drainEquipmentV24(e,hours,e.mode);left-=cap}
}
function finishFieldTeamV43(){
 const t=ensureFieldTeamV43();if(!t.active)return;const home=fieldTeamHomeV43();for(const id of t.npcIds)if(state.npcs?.[id]?.alive)state.npcs[id].location=home;for(const eq of fieldTeamSelectedEquipmentV43()){eq.location=home;eq.assignedUsers=['player']}t.active=false;t.current=home;t.last={...(t.last||{}),endDay:state.day,hours:t.elapsedHours};saveGame(false)
}

/* Vehicle feasibility/consumption must use actual occupants while a field team is active. */
const _vehicleDriveFeasibilityV43=vehicleDriveFeasibilityV32;
vehicleDriveFeasibilityV32=function(distance,hours,opts={}){const t=ensureFieldTeamV43();return _vehicleDriveFeasibilityV43(distance,hours,{...opts,users:t.active&&t.useVehicle?fieldTeamSizeV43():(opts.users||1)})};
const _consumeVehicleDriveV43=consumeVehicleDriveV32;
consumeVehicleDriveV32=function(distance,hours,opts={}){const t=ensureFieldTeamV43();return _consumeVehicleDriveV43(distance,hours,{...opts,users:t.active&&t.useVehicle?fieldTeamSizeV43():(opts.users||1)})};

const _itineraryPlannerHtmlV43=itineraryPlannerHtmlV27;
itineraryPlannerHtmlV27=function(){const baseEstimate=itineraryEstimateV27(),html=_itineraryPlannerHtmlV43();return html.replace('<div class="planner-actions">',fieldTeamHtmlV43(baseEstimate)+'<div class="planner-actions">')};
const _bindItineraryPlannerV43=bindItineraryPlannerV27;
bindItineraryPlannerV27=function(){_bindItineraryPlannerV43();const v=$('fieldUseVehicle');if(v)v.onchange=()=>setFieldTeamVehicleV43(v.checked);document.querySelectorAll('[data-field-npc]').forEach(x=>x.onchange=()=>toggleFieldTeamNpcV43(x.dataset.fieldNpc));document.querySelectorAll('[data-field-eq]').forEach(x=>x.onchange=()=>toggleFieldTeamEquipmentV43(x.dataset.fieldEq))};

const _startOrResumeV43=startOrResumeItineraryV27;
startOrResumeItineraryV27=function(){const it=ensureItineraryV27(),e=itineraryEstimateV27(),t=ensureFieldTeamV43();if(!t.active){const a=activateFieldTeamV43(e);if(!a.ok)return toast(a.reason)}const v=fieldTeamValidationV43(e);if(!v.ok){if(!it.status||it.status==='planning')t.active=false;return toast(v.issues[0])}return _startOrResumeV43()};

/* Consume all accompanying NPC duty and all selected personal cooling on the same world-time slices used by itinerary execution. */
const _runItineraryStepV43=runItineraryStepV27;
runItineraryStepV27=function(){
 const t=ensureFieldTeamV43();if(!t.active)return _runItineraryStepV43();const originalSpend=spendWorldTimeV26;
 spendWorldTimeV26=function(hours,opts={}){const portable=!!opts?.coolingPack,clean={...opts,coolingPack:null};const ok=originalSpend(hours,clean);if(ok){useFieldTeamDutyV43(hours,opts?.label||'外勤');if(portable)drainFieldTeamCoolingV43(hours)}return ok};
 try{return _runItineraryStepV43()}finally{spendWorldTimeV26=originalSpend;syncFieldTeamLocationV43();if(ensureItineraryV27().status==='complete')finishFieldTeamV43()}
};

const _clearItineraryV43=clearItineraryV27;
clearItineraryV27=function(){if(ensureFieldTeamV43().active)return toast('外勤隊伍仍在外面；請先完成返程，不能直接清空造成隊員瞬移');return _clearItineraryV43()};

ensureFieldTeamV43();
