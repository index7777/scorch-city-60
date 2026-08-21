/* v14.2.2 QA — field role assignment / role-specific workload, heat and action throughput */
const FIELD_ROLE_DEFS_V44={
 general:{label:'通用',fatigue:1.00,activity:'walk'},
 driver:{label:'駕駛',fatigue:.78,activity:'observe'},
 search:{label:'搜索／偵察',fatigue:1.02,activity:'search'},
 carry:{label:'搬運／裝卸',fatigue:1.34,activity:'carry'},
 repair:{label:'維修／工程',fatigue:1.22,activity:'repair'},
 medic:{label:'醫療／救援',fatigue:.94,activity:'walk'}
};
const FIELD_ROLE_DEFAULT_V44={player:'general',lin:'medic',chen:'repair',mei:'search',wu:'carry'};
function ensureFieldRolesV44(){
 const t=ensureFieldTeamV43();t.roles=t.roles||{};
 const members=fieldTeamMembersV43();
 for(const id of members)if(!FIELD_ROLE_DEFS_V44[t.roles[id]])t.roles[id]=FIELD_ROLE_DEFAULT_V44[id]||'general';
 for(const id of Object.keys(t.roles))if(!members.includes(id))delete t.roles[id];
 return t.roles
}
function fieldRoleV44(id){return ensureFieldRolesV44()[id]||'general'}
function setFieldRoleV44(id,role){
 const t=ensureFieldTeamV43();if(t.active)return toast('外勤已開始，不能中途更換職責');if(!fieldTeamMembersV43().includes(id)||!FIELD_ROLE_DEFS_V44[role])return;
 t.roles[id]=role;renderMap();saveGame(false)
}
function fieldRoleMembersV44(role){return fieldTeamMembersV43().filter(id=>fieldRoleV44(id)===role)}
function fieldMemberNameV44(id){return id==='player'?'玩家':state.npcs?.[id]?.name||id}
function fieldRoleExpertFactorV44(role){
 const members=fieldRoleMembersV44(role);let f=1;
 if(role==='search'&&members.includes('mei'))f*=.72;
 if(role==='repair'&&members.includes('chen'))f*=.74;
 if(role==='carry'&&members.includes('wu'))f*=.82;
 if(role==='medic'&&members.includes('lin'))f*=.70;
 return f
}
function fieldActionRoleFactorV44(action){
 let f=1;
 if(action==='search'){
  if(fieldRoleMembersV44('search').length)f*=.86*fieldRoleExpertFactorV44('search');
  if(fieldRoleMembersV44('carry').length)f*=.93*fieldRoleExpertFactorV44('carry');
 }else if(action==='scout'){
  if(fieldRoleMembersV44('search').length)f*=.78*fieldRoleExpertFactorV44('search');
 }else if(action==='asset'){
  if(fieldRoleMembersV44('repair').length)f*=.82*fieldRoleExpertFactorV44('repair');
  if(fieldRoleMembersV44('carry').length)f*=.90*fieldRoleExpertFactorV44('carry');
 }else if(action==='rescue'){
  if(fieldRoleMembersV44('medic').length)f*=.80*fieldRoleExpertFactorV44('medic');
  if(fieldRoleMembersV44('carry').length)f*=.94*fieldRoleExpertFactorV44('carry');
 }
 return clamp(f,.42,1)
}
const _stopActionHoursV44=stopActionHoursV27;
stopActionHoursV27=function(stop){
 const base=_stopActionHoursV44(stop);const f=fieldActionRoleFactorV44(stop.action);return Math.max(.15,Math.round(base*f*20)/20)
};

function fieldCoolingDemandV44(){
 const temp=currentOutsideTempV26(),rows=fieldTeamMembersV43().map(id=>{const role=fieldRoleV44(id),activity=FIELD_ROLE_DEFS_V44[role]?.activity||'walk',need=coolingNeedKWV24(temp,activity,.18);return {id,role,activity,needKW:need}});
 return {temp,rows,totalKW:rows.reduce((a,r)=>a+r.needKW,0)}
}
fieldTeamPortableCoolingV43=function(requiredHours=0){
 const d=fieldCoolingDemandV44(),members=fieldTeamSizeV43();if(d.temp<=35)return {ok:true,capacity:members,devices:[],requiredHours,demandKW:0,outputKW:0,roles:d.rows};
 const devices=fieldTeamSelectedEquipmentV43().filter(e=>equipmentRuntimeHoursV24(e)+1e-6>=requiredHours);
 const slots=devices.reduce((n,e)=>n+(equipmentTypeV24(e)?.maxUsers||1),0),output=devices.reduce((n,e)=>n+(equipmentModeV24(e)?.coolingKW||0),0);
 const ok=slots>=members&&output+1e-6>=d.totalKW;
 return {ok,capacity:Math.min(slots,members),slots,devices,requiredHours,demandKW:d.totalKW,outputKW:output,roles:d.rows}
};

const _fieldTeamValidationV44=fieldTeamValidationV43;
fieldTeamValidationV43=function(e){
 const v=_fieldTeamValidationV44(e),t=ensureFieldTeamV43(),issues=[...v.issues];ensureFieldRolesV44();
 if(t.useVehicle){const drivers=fieldRoleMembersV44('driver');if(drivers.length!==1)issues.push(drivers.length?'工程車只能指定 1 名駕駛':'使用工程車時必須指定 1 名駕駛')}
 const driver=fieldRoleMembersV44('driver')[0];if(driver&&driver!=='player'){
  if(!t.npcIds.includes(driver))issues.push('指定駕駛不在外勤隊伍中');
  else if(npcDutyRemainingV41(driver)<Math.max(.25,+e?.travel||0))issues.push(`${fieldMemberNameV44(driver)}剩餘工時不足以負責整段駕駛`)
 }
 if(currentOutsideTempV26()>35&&v.portableHours>0){const pc=fieldTeamPortableCoolingV43(v.portableHours);if(!pc.ok)issues.push(`依實際職責熱負荷，隊伍約需 ${pc.demandKW.toFixed(2)} kW 冷卻；已選設備只有 ${pc.outputKW.toFixed(2)} kW`) }
 return {...v,ok:!issues.length,issues:[...new Set(issues)],portable:fieldTeamPortableCoolingV43(v.portableHours)}
};

/* Role-specific duty: everyone remains unavailable for the elapsed field time, but fatigue depends on assigned workload. */
useFieldTeamDutyV43=function(hours,label='外勤'){
 const t=ensureFieldTeamV43();if(!t.active||hours<=0)return;ensureFieldRolesV44();
 for(const id of t.npcIds){
  const p=npcShiftV41(id),used=Math.max(0,Math.min(hours,npcDutyRemainingV41(id)));if(used<=0)continue;
  const role=fieldRoleV44(id),fm=FIELD_ROLE_DEFS_V44[role]?.fatigue||1;
  p.workedToday+=used;p.fatigue=clamp(p.fatigue+used*3.2*fm,0,100);p.last={day:state.day,task:p.task,hours:used,action:`${label} · ${FIELD_ROLE_DEFS_V44[role]?.label||role}`};
  recordNpcServiceV40(id,used,`${label} · ${FIELD_ROLE_DEFS_V44[role]?.label||role}`)
 }
 t.elapsedHours+=hours
};

/* Driver and specialist roles are locked with the team once the expedition starts. */
const _activateFieldTeamV44=activateFieldTeamV43;
activateFieldTeamV43=function(e){ensureFieldRolesV44();return _activateFieldTeamV44(e)};

const _toggleFieldTeamNpcV44=toggleFieldTeamNpcV43;
toggleFieldTeamNpcV43=function(id){const r=_toggleFieldTeamNpcV44(id);ensureFieldRolesV44();return r};
const _setFieldTeamVehicleV44=setFieldTeamVehicleV43;
setFieldTeamVehicleV43=function(on){const t=ensureFieldTeamV43();const r=_setFieldTeamVehicleV44(on);if(!t.active&&on&&!fieldRoleMembersV44('driver').length)t.roles.player='driver';return r};

function fieldRolesHtmlV44(){
 const t=ensureFieldTeamV43(),locked=t.active;ensureFieldRolesV44();
 const rows=fieldTeamMembersV43().map(id=>{const name=fieldMemberNameV44(id),role=fieldRoleV44(id),opts=Object.entries(FIELD_ROLE_DEFS_V44).map(([k,d])=>`<option value="${k}" ${role===k?'selected':''}>${d.label}</option>`).join('');const meta=id==='player'?'固定隊員':`${state.npcs?.[id]?.role||''} · ${npcDutyRemainingV41(id).toFixed(1)}h 可用`;return `<label class="field-role-row"><span><b>${name}</b><small>${meta}</small></span><select data-field-role="${id}" ${locked?'disabled':''}>${opts}</select></label>`}).join('');
 const c=fieldCoolingDemandV44();return `<div class="field-role-box"><div class="field-role-head"><div><span>ROLE ASSIGNMENT</span><h4>外勤個別職責</h4></div><b>${c.totalKW.toFixed(2)} kW 熱負荷</b></div><p class="muted">職責會改變站點工時、疲勞與高溫冷卻需求。使用工程車時必須且只能有一名駕駛。</p><div class="field-role-list">${rows}</div></div>`
}
const _fieldTeamHtmlV44=fieldTeamHtmlV43;
fieldTeamHtmlV43=function(baseEstimate){const html=_fieldTeamHtmlV44(baseEstimate),box=fieldRolesHtmlV44();return html.replace('</section>',box+'</section>')};
const _bindItineraryPlannerV44=bindItineraryPlannerV27;
bindItineraryPlannerV27=function(){_bindItineraryPlannerV44();document.querySelectorAll('[data-field-role]').forEach(s=>s.onchange=()=>setFieldRoleV44(s.dataset.fieldRole,s.value))};

ensureFieldRolesV44();
