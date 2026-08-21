/* v14.2.2 QA — field tool charging sources / grid load / vehicle bus / timed technician maintenance */
EQUIPMENT_TYPES_V24.toolBattery=EQUIPMENT_TYPES_V24.toolBattery||{name:'遠征工具電池',maxUsers:0,battery:{capacityKWh:1.2,maxChargeKW:.35,maxDischargeKW:.5},modes:{},defaultMode:null};

function ensureFieldToolPowerV49(){
 ensureFieldToolRuntimeV48();ensurePowerStateV24();
 state.fieldToolPower=state.fieldToolPower||{schema:1,vehicleCharging:false,lastCharge:null};state.fieldToolPower.schema=1;
 const r=fieldToolRuntimeV48('toolkit');if(!r)return state.fieldToolPower;
 const id='fieldToolBattery_001';let e=state.equipmentInstances[id];
 if(!e)e=state.equipmentInstances[id]={instanceId:id,type:'toolBattery',owner:'player',holder:'player',location:fieldTeamHomeV43(),assignedUsers:[],condition:100,battery:r.battery,loan:null,fieldToolBattery:true};
 e.battery=r.battery;e.location=ensureFieldTeamV43().active?ensureFieldTeamV43().current:fieldTeamHomeV43();e.holder='player';e.owner='player';
 return state.fieldToolPower
}
function toolBatteryInstanceV49(){ensureFieldToolPowerV49();return state.equipmentInstances?.fieldToolBattery_001||null}
const _playerEquipmentV49=playerEquipmentV24;
playerEquipmentV24=function(type){const rows=_playerEquipmentV49(type);return type==='toolBattery'?rows:rows.filter(e=>!e.fieldToolBattery)};

function toolChargeSourceRowsV49(){
 ensureFieldToolPowerV49();const e=toolBatteryInstanceV49();if(!e)return [];
 const src=sourceStateV24(),rows=[];
 for(const id of ['heatHouse','centralGrid']){const s=src[id];if(s&&sourceCanReachEquipmentV24(s,e))rows.push({id,name:s.name,available:s.available,maxKW:Math.min(e.battery.maxChargeKW||.35,s.maxOutputKW||0),kind:'grid'})}
 const cv=coolingVehicleV32(),v=state.gear?.vehicle?ensureVehicleStateV32():null;if(cv&&v?.currentLocation===e.location&&cv.battery?.chargeKWh>.25)rows.push({id:'vehicleBus',name:'製冷工程車車載電源',available:true,maxKW:.60,kind:'vehicle'});
 return rows
}
function stopToolChargingV49(silent=false){
 ensureFieldToolPowerV49();const id='fieldToolBattery_001',had=!!chargeJobV33(id)||state.fieldToolPower.vehicleCharging;state.powerLogistics.charging=state.powerLogistics.charging.filter(q=>q.equipmentId!==id);state.fieldToolPower.vehicleCharging=false;if(had&&!silent)log('遠征工具電池已停止充電。');saveGame(false)
}
function startToolChargingV49(sourceId){
 const t=ensureFieldTeamV43();if(t.active)return toast('外勤進行中，工具電池不能留在基地充電');ensureFieldToolPowerV49();const e=toolBatteryInstanceV49();if(!e)return toast('尚未有遠征工具箱');if(e.battery.chargeKWh>=e.battery.capacityKWh-.001)return toast('工具電池已充滿');
 const s=toolChargeSourceRowsV49().find(x=>x.id===sourceId&&x.available);if(!s)return toast('這個電源目前無法接到工具電池');stopToolChargingV49(true);
 if(sourceId==='vehicleBus'){state.fieldToolPower.vehicleCharging=true;state.fieldToolPower.vehicleStartedDay=state.day;log('遠征工具電池接上製冷工程車車載電源；充電只會隨實際世界時間進行。','good')}
 else{startChargingV24(e.instanceId,sourceId);const q=chargeJobV33(e.instanceId);if(q){q.priority='low';q.targetPct=100;q.enabled=true}log('工具充電排入低優先負載；生命維持與主冷卻會先取得電力。','major')}
 renderMap();saveGame(false)
}
function processVehicleToolChargeV49(hours){
 ensureFieldToolPowerV49();if(!state.fieldToolPower.vehicleCharging||hours<=0)return;const e=toolBatteryInstanceV49(),cv=coolingVehicleV32(),v=state.gear?.vehicle?ensureVehicleStateV32():null;
 if(!e||!cv||v?.currentLocation!==e.location||ensureFieldTeamV43().active){stopToolChargingV49(true);return}
 const room=Math.max(0,e.battery.capacityKWh-e.battery.chargeKWh);if(room<=.001){stopToolChargingV49(true);return}
 const reserve=.25,available=Math.max(0,(cv.battery.chargeKWh||0)-reserve),input=Math.min(.60*hours,available,room/.90);if(input<=.001)return;
 cv.battery.chargeKWh=Math.max(0,cv.battery.chargeKWh-input);const stored=input*.90;e.battery.chargeKWh=Math.min(e.battery.capacityKWh,e.battery.chargeKWh+stored);state.fieldToolPower.lastCharge={day:state.day,source:'vehicleBus',inputKWh:input,storedKWh:stored};
 if(e.battery.chargeKWh>=e.battery.capacityKWh-.001)stopToolChargingV49(true)
}
const _processChargingV49=processChargingV24;
processChargingV24=function(hours){ensureFieldToolPowerV49();const out=_processChargingV49(hours);processVehicleToolChargeV49(Math.max(0,+hours||0));return out};

function toolMaintenancePlanV49(){
 const r=ensureFieldToolRuntimeV48(),jobs=[];
 if(r.toolkit&&r.toolkit.condition<85)jobs.push({id:'toolkit',label:'遠征工具箱',hours:.75,parts:1,restore:28});
 if(r.cart&&r.cart.condition<85)jobs.push({id:'cart',label:'推車',hours:.50,parts:1,restore:24});
 if(r.lift&&r.lift.condition<85)jobs.push({id:'lift',label:'液壓搬運平台',hours:1.25,parts:2,restore:20});
 return {jobs,hours:jobs.reduce((a,b)=>a+b.hours,0),parts:jobs.reduce((a,b)=>a+b.parts,0)}
}
function chenCanServiceToolsV49(hours){
 const site=fieldTeamHomeV43(),n=state.npcs?.chen,known=!!(n?.alive&&npcKnown(n)),same=npcServiceZoneV40('chen')===site,onDuty=npcOnDutyV41('chen','maintenance'),left=npcDutyRemainingV41('chen');
 if(!known)return {ok:false,reason:'尚未建立可調度的專業技師人力'};if(!same)return {ok:false,reason:`陳技師目前不在${locationLabelV24(site)}`};if(!onDuty)return {ok:false,reason:'陳技師今日沒有排「設備維修」'};if(left+1e-6<hours)return {ok:false,reason:`陳技師只剩 ${left.toFixed(1)}h 工時，保養需要 ${hours.toFixed(1)}h`};return {ok:true,left,site}
}
serviceFieldToolsV48=function(){
 const t=ensureFieldTeamV43();if(t.active)return toast('外勤進行中，不能保養工具');const p=toolMaintenancePlanV49();if(!p.jobs.length)return toast('外勤工具目前不需要保養');if((state.resources.parts||0)<p.parts)return toast(`保養需要零件 ${p.parts}`);const chen=chenCanServiceToolsV49(p.hours);if(!chen.ok)return toast(chen.reason);
 stopToolChargingV49(true);if(!spendWorldTimeV26(p.hours,{label:'外勤工具保養'}))return toast('目前時段不足以完成工具保養');state.resources.parts=Math.max(0,state.resources.parts-p.parts);const r=ensureFieldToolRuntimeV48();for(const j of p.jobs){if(r[j.id])r[j.id].condition=Math.min(100,(r[j.id].condition||0)+j.restore)}useNpcDutyV41('chen',p.hours,'外勤工具保養');log(`陳技師完成外勤工具保養：${p.jobs.map(x=>x.label).join('、')}；耗時 ${p.hours.toFixed(1)}h，零件 ${p.parts}。`,'good');renderMap();saveGame(false)
};
reloadToolBatteryV48=function(){const rows=toolChargeSourceRowsV49();if(!rows.length)return toast('目前沒有能接到工具電池的實體電源');startToolChargingV49(rows[0].id)};

function fieldToolChargeHtmlV49(){
 const e=toolBatteryInstanceV49();if(!e)return '';
 const q=chargeJobV33(e.instanceId),vehicle=ensureFieldToolPowerV49().vehicleCharging,rows=toolChargeSourceRowsV49();const active=vehicle?'vehicleBus':q?.sourceId||'',status=vehicle?'車載電源充電中':q?`${sourceStateV24()[q.sourceId]?.name||q.sourceId}排程中`:'未充電';
 const buttons=rows.map(s=>`<button class="secondary" data-tool-charge-source="${s.id}" ${active===s.id?'disabled':''}>${s.name} · ${s.maxKW.toFixed(2)} kW</button>`).join('')||'<span class="muted">目前位置沒有可接入電源。</span>';
 return `<div class="tool-charge-box"><div class="field-role-head"><div><span>TOOL CHARGING</span><h4>工具電池充電</h4></div><b>${e.battery.chargeKWh.toFixed(2)} / ${e.battery.capacityKWh.toFixed(2)} kWh</b></div><p class="muted">狀態：${status}。中央站／耐熱屋充電使用既有負載排程；工具預設低優先，不會越過生命維持與主冷卻。</p><div class="tool-charge-actions">${buttons}<button class="secondary" data-tool-charge-stop ${active?'':'disabled'}>停止充電</button></div></div>`
}
const _subtaskPlannerHtmlV49=subtaskPlannerHtmlV46;
subtaskPlannerHtmlV46=function(){const html=_subtaskPlannerHtmlV49(),box=fieldToolChargeHtmlV49();return html.replace('<div class="parallel-stop-list">',box+'<div class="parallel-stop-list">')};
const _bindItineraryPlannerV49=bindItineraryPlannerV27;
bindItineraryPlannerV27=function(){_bindItineraryPlannerV49();document.querySelectorAll('[data-tool-charge-source]').forEach(b=>b.onclick=()=>startToolChargingV49(b.dataset.toolChargeSource));document.querySelectorAll('[data-tool-charge-stop]').forEach(b=>b.onclick=()=>stopToolChargingV49())};

ensureFieldToolPowerV49();
