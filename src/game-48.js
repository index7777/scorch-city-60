/* v14.2.2 QA — field tool runtime / durability / tool battery / hydraulic power budget */
function ensureFieldToolRuntimeV48(){
 state.fieldToolRuntime=state.fieldToolRuntime||{schema:1};
 const r=state.fieldToolRuntime;r.schema=1;
 if(state.gear?.toolkit&&!r.toolkit)r.toolkit={condition:100,battery:{capacityKWh:1.2,chargeKWh:.6,maxChargeKW:.35},migrated:true};
 if(state.gear?.cart&&!r.cart)r.cart={condition:100};
 if(state.installed?.lift&&!r.lift)r.lift={condition:100};
 return r
}
function fieldToolRuntimeV48(id){return ensureFieldToolRuntimeV48()[id]||null}
function toolBatteryV48(){return fieldToolRuntimeV48('toolkit')?.battery||null}
function toolConditionV48(id){if(id==='vehicle')return clamp(ensureVehicleStateV32().condition??100,0,100);if(id==='lift'||id==='toolkit'||id==='cart')return clamp(fieldToolRuntimeV48(id)?.condition??100,0,100);return 100}
function toolConditionFactorV48(id){const c=toolConditionV48(id);return clamp(.55+c*.0045,.55,1)}
function fieldToolUseForTaskV48(stop,task){
 const tools=task.tools||[],out={toolkitKWh:0,toolkitWear:0,cartWear:0,liftKWh:0,liftWear:0,vehicleWear:0,medicine:0};
 const h=Math.max(0,+task.hours||0),ids=new Set(tools.map(x=>x.id));
 if(ids.has('toolkit')){out.toolkitKWh+=(task.id==='detach'?.32:.14)*h;out.toolkitWear+=(task.activity==='repair'?2.4:1.2)*h}
 if(ids.has('cart'))out.cartWear+=(task.activity==='carry'?2.0:.8)*h;
 if(ids.has('vehicle'))out.vehicleWear+=(task.activity==='carry'?1.0:.35)*h;
 if(ids.has('lift')){out.liftKWh+=1.25*h;out.liftWear+=2.1*h;out.vehicleWear+=.45*h}
 return out
}
function addToolUseV48(a,b){for(const k of Object.keys(a))a[k]=(a[k]||0)+(b[k]||0);return a}
function stopToolUseV48(stop){const p=stopParallelPlanV45(stop),u={toolkitKWh:0,toolkitWear:0,cartWear:0,liftKWh:0,liftWear:0,vehicleWear:0,medicine:stop.action==='rescue'?1:0};for(const t of p.tasks)addToolUseV48(u,fieldToolUseForTaskV48(stop,t));return u}
function vehicleRouteEnergyReserveV48(e){
 const t=ensureFieldTeamV43();if(!t.useVehicle||!state.gear?.vehicle)return 0;e=e||itineraryEstimateV27();let distance=0,travel=0;for(const leg of e?.legs||[]){distance+=leg.route?.distance||0;travel+=leg.travel||0}const users=fieldTeamSizeV43(),hot=currentOutsideTempV26()>35,cv=coolingVehicleV32(),cabin=!!(hot&&cv&&users<=vehicleCabinCapacityV32()&&vehicleCabinCanCoverV32(users,travel));return vehicleDriveCostV32(distance,travel,{users,cooling:cabin}).totalKWh||0
}
function fieldToolBudgetV48(e){
 const r=ensureFieldToolRuntimeV48(),cv=coolingVehicleV32(),driveReserve=vehicleRouteEnergyReserveV48(e),budget={toolkitKWh:r.toolkit?.battery?.chargeKWh||0,toolkitCondition:r.toolkit?.condition??0,cartCondition:r.cart?.condition??0,liftCondition:r.lift?.condition??0,vehicleCondition:state.gear?.vehicle?(ensureVehicleStateV32().condition??0):0,vehicleKWh:(cv?.battery?.chargeKWh||0)-driveReserve,medicine:state.resources?.medicine||0},rows=[],issues=[];
 if(budget.vehicleKWh<-.001)issues.push('工程車行駛／車艙冷卻已超出目前車載電量');
 for(const stop of ensureItineraryV27().stops){const use=stopToolUseV48(stop),before={...budget};budget.toolkitKWh-=use.toolkitKWh;budget.toolkitCondition-=use.toolkitWear;budget.cartCondition-=use.cartWear;budget.liftCondition-=use.liftWear;budget.vehicleCondition-=use.vehicleWear;budget.vehicleKWh-=use.liftKWh;budget.medicine-=use.medicine;const name=mapLoc(stop.location)?.name||stop.location;
  if(budget.toolkitKWh<-.001)issues.push(`${name}：遠征工具電池不足`);if(budget.toolkitCondition<10)issues.push(`${name}：遠征工具箱耐久不足`);if(budget.cartCondition<10)issues.push(`${name}：推車狀況不足`);if(budget.liftCondition<10)issues.push(`${name}：液壓搬運平台狀況不足`);if(budget.vehicleCondition<15)issues.push(`${name}：工程車狀況不足`);if(budget.vehicleKWh<-.001)issues.push(`${name}：車載電池不足以同時支撐行駛與液壓平台`);if(budget.medicine<-.001)issues.push(`${name}：醫療耗材不足`);rows.push({stop,use,before,after:{...budget}})
 }
 return {driveReserve,start:{toolkitKWh:r.toolkit?.battery?.chargeKWh||0,toolkitCondition:r.toolkit?.condition??0,cartCondition:r.cart?.condition??0,liftCondition:r.lift?.condition??0,vehicleCondition:state.gear?.vehicle?(ensureVehicleStateV32().condition??0):0,vehicleKWh:cv?.battery?.chargeKWh||0,medicine:state.resources?.medicine||0},end:budget,rows,issues:[...new Set(issues)],ok:issues.length===0}
}
function toolAvailabilityIssueV48(id){
 if(id==='toolkit'){const r=fieldToolRuntimeV48('toolkit');if((r?.condition||0)<10)return '遠征工具箱耐久低於 10%';if((r?.battery?.chargeKWh||0)<.02)return '遠征工具電池已耗盡'}
 if(id==='cart'&&toolConditionV48('cart')<10)return '推車狀況低於 10%';
 if(id==='vehicle'&&toolConditionV48('vehicle')<15)return '工程車狀況低於 15%';
 if(id==='lift'){if(toolConditionV48('lift')<10)return '液壓搬運平台狀況低於 10%';const cv=coolingVehicleV32();if(!cv)return '液壓平台需要製冷工程車的車載電力匯流排';if((cv.battery?.chargeKWh||0)<.05)return '車載電池已無法驅動液壓平台'}
 return ''
}
const _fieldToolInventoryV48=fieldToolInventoryV46;
fieldToolInventoryV46=function(){ensureFieldToolRuntimeV48();return _fieldToolInventoryV48().filter(x=>!toolAvailabilityIssueV48(x.id)).map(x=>({...x,throughput:(x.throughput||1)*toolConditionFactorV48(x.id)}))};
const _fieldTeamValidationV48=fieldTeamValidationV43;
fieldTeamValidationV43=function(e){const v=_fieldTeamValidationV48(e),b=fieldToolBudgetV48(e),issues=[...v.issues,...b.issues];return {...v,toolBudget:b,ok:issues.length===0,issues:[...new Set(issues)]}};
function consumeStopToolUseV48(stop){
 if(!stop||stop._toolUseConsumedV48)return;const r=ensureFieldToolRuntimeV48(),u=stopToolUseV48(stop),cv=coolingVehicleV32();
 if(r.toolkit){r.toolkit.condition=clamp(r.toolkit.condition-u.toolkitWear,0,100);r.toolkit.battery.chargeKWh=Math.max(0,r.toolkit.battery.chargeKWh-u.toolkitKWh)}if(r.cart)r.cart.condition=clamp(r.cart.condition-u.cartWear,0,100);if(r.lift)r.lift.condition=clamp(r.lift.condition-u.liftWear,0,100);
 if(state.gear?.vehicle){const v=ensureVehicleStateV32();v.condition=clamp((v.condition??100)-u.vehicleWear,0,100);if(cv){cv.condition=Math.min(cv.condition??100,v.condition);cv.battery.chargeKWh=Math.max(0,(cv.battery.chargeKWh||0)-u.liftKWh)}}
 stop._toolUseConsumedV48={day:state.day,use:u};if(u.toolkitKWh||u.liftKWh||u.toolkitWear||u.cartWear||u.liftWear||u.vehicleWear)log(`外勤工具耗用：${u.toolkitKWh?`工具電池 ${u.toolkitKWh.toFixed(2)}kWh；`:''}${u.liftKWh?`液壓平台車載電 ${u.liftKWh.toFixed(2)}kWh；`:''}${u.toolkitWear?`工具箱耐久 -${u.toolkitWear.toFixed(1)}%；`:''}${u.liftWear?`液壓平台耐久 -${u.liftWear.toFixed(1)}%；`:''}`,'')
}
const _runItineraryStepV48=runItineraryStepV27;
runItineraryStepV27=function(){const it=ensureItineraryV27(),before=it.index,stop=it.stops[before],out=_runItineraryStepV48();if(stop&&it.index>before)consumeStopToolUseV48(stop);return out};
function reloadToolBatteryV48(){const t=ensureFieldTeamV43();if(t.active)return toast('外勤進行中，不能更換工具電池');const b=toolBatteryV48();if(!b)return toast('尚未有遠征工具箱');const gap=Math.max(0,b.capacityKWh-b.chargeKWh);if(gap<.01)return toast('工具電池已滿');const available=Math.max(0,state.resources?.battery||0),move=Math.min(gap,.6,available);if(move<=0)return toast('沒有可用電池電量');state.resources.battery=Math.max(0,available-move);b.chargeKWh=Math.min(b.capacityKWh,b.chargeKWh+move);log(`更換／補充工具電池 ${move.toFixed(2)} kWh。`,'good');renderMap();saveGame(false)}
function serviceFieldToolsV48(){const t=ensureFieldTeamV43();if(t.active)return toast('外勤進行中，不能保養工具');const r=ensureFieldToolRuntimeV48(),need=((r.toolkit&&r.toolkit.condition<85)?1:0)+((r.cart&&r.cart.condition<85)?1:0)+((r.lift&&r.lift.condition<85)?2:0);if(!need)return toast('攜行工具目前不需要保養');if((state.resources.parts||0)<need)return toast(`保養需要零件 ${need}`);state.resources.parts-=need;if(r.toolkit)r.toolkit.condition=Math.min(100,r.toolkit.condition+28);if(r.cart)r.cart.condition=Math.min(100,r.cart.condition+24);if(r.lift)r.lift.condition=Math.min(100,r.lift.condition+20);log(`完成外勤工具保養，消耗零件 ${need}。`,'good');renderMap();saveGame(false)}
function fieldToolRuntimeHtmlV48(){
 const r=ensureFieldToolRuntimeV48(),b=fieldToolBudgetV48(),cv=coolingVehicleV32(),rows=[];
 if(r.toolkit)rows.push(`<div class="tool-runtime-row"><div><b>遠征工具箱</b><small>耐久 ${r.toolkit.condition.toFixed(0)}%</small></div><span>工具電池 ${r.toolkit.battery.chargeKWh.toFixed(2)} / ${r.toolkit.battery.capacityKWh.toFixed(2)} kWh</span></div>`);if(r.cart)rows.push(`<div class="tool-runtime-row"><div><b>推車</b><small>耐久 ${r.cart.condition.toFixed(0)}%</small></div><span>機械式搬運</span></div>`);if(r.lift)rows.push(`<div class="tool-runtime-row"><div><b>液壓搬運平台</b><small>耐久 ${r.lift.condition.toFixed(0)}%</small></div><span>車載電 ${cv?(cv.battery.chargeKWh||0).toFixed(2)+' kWh':'不可用'}</span></div>`);if(state.gear?.vehicle)rows.push(`<div class="tool-runtime-row"><div><b>工程車</b><small>車況 ${ensureVehicleStateV32().condition.toFixed(0)}%</small></div><span>行駛預留 ${b.driveReserve.toFixed(2)} kWh</span></div>`);
 const issues=b.issues.length?`<div class="field-team-issues">${b.issues.map(x=>`<p>${x}</p>`).join('')}</div>`:'<div class="action-ready">目前整段行程的工具耐久／電量預算可成立。</div>';return `<div class="tool-runtime-box"><div class="field-role-head"><div><span>TOOL RUNTIME</span><h4>工具壽命與能源</h4></div><b>${b.ok?'預算成立':'資源不足'}</b></div><div class="tool-runtime-list">${rows.join('')||'<p class="muted">目前沒有可追蹤的外勤工具。</p>'}</div>${issues}<div class="dialog-actions"><button id="reloadToolBattery" class="secondary">補充工具電池</button><button id="serviceFieldTools" class="secondary">保養外勤工具</button></div></div>`
}
const _subtaskPlannerHtmlV48=subtaskPlannerHtmlV46;
subtaskPlannerHtmlV46=function(){const html=_subtaskPlannerHtmlV48(),box=fieldToolRuntimeHtmlV48();return html.replace('<div class="parallel-stop-list">',box+'<div class="parallel-stop-list">')};
const _bindItineraryPlannerV48=bindItineraryPlannerV27;
bindItineraryPlannerV27=function(){_bindItineraryPlannerV48();if($('reloadToolBattery'))$('reloadToolBattery').onclick=reloadToolBatteryV48;if($('serviceFieldTools'))$('serviceFieldTools').onclick=serviceFieldToolsV48};
ensureFieldToolRuntimeV48();
