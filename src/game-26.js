/* v14.2.2 QA — unified work time / charging / exposure clock */
const CRAFT_WORK_V26={
 cart:{hours:.75,site:'base',environment:'indoor'},
 toolkit:{hours:.5,site:'base',environment:'indoor'},
 tank:{hours:1.5,site:'base',environment:'indoor'},
 filter:{hours:2,site:'base',environment:'indoor'},
 power:{hours:2,site:'base',environment:'indoor'},
 solar:{hours:3,site:'base',environment:'outdoor',activity:'repair'},
 coolpack:{hours:2.5,site:'base',environment:'indoor'},
 coldSubway:{hours:6,site:'subway',environment:'outdoor',activity:'repair'},
 coldStore:{hours:8,site:'coldstore',environment:'outdoor',activity:'repair'},
 vent1:{hours:6,site:'vent',environment:'indoor'},
 vent2:{hours:12,site:'vent',environment:'indoor'},
 maintain:{hours:2,site:'vent',environment:'indoor'}
};
function ensureWorldClockV26(){
 state.worldClock=state.worldClock||{schema:1,day:state.day,endlessElapsed:0};
 if(state.worldClock.day!==state.day){state.worldClock.day=state.day;state.worldClock.endlessElapsed=0}
 state.worldClock.endlessElapsed=clamp(+state.worldClock.endlessElapsed||0,0,24);
 return state.worldClock;
}
function currentPeriodHoursLeftV26(){
 ensureWorldClockV26();
 return state.day>=30?Math.max(0,24-state.worldClock.endlessElapsed):Math.max(0,+state.hoursLeft||0);
}
function currentOutsideTempV26(){return state.day>=30?100:state.phase==='night'?8:dayTemp(state.day)}
function currentPeriodLabelV26(){return state.day>=30?'永晝':state.phase==='night'?'夜晚':'白天'}
function craftWorkV26(id){return CRAFT_WORK_V26[id]||{hours:1,site:'base',environment:'indoor'}}
function craftExposureCheckV26(id){
 const w=craftWorkV26(id);if(w.environment!=='outdoor')return {ok:true,budget:null,pack:null};
 const temp=currentOutsideTempV26();if(temp<=35)return {ok:true,budget:exposureBudgetV24({temp,activity:w.activity||'repair'}),pack:null};
 const pack=bestPlayerCoolingV24(),mode=pack?equipmentModeV24(pack):null,coolingKW=mode?.coolingKW||0;
 const budget=exposureBudgetV24({temp,activity:w.activity||'repair',coolingKW});
 if(!budget.sustained&&budget.minutes+1e-6<w.hours*60)return {ok:false,budget,pack,reason:`戶外熱暴露只能支撐約 ${budget.minutes} 分鐘，施工需要 ${Math.round(w.hours*60)} 分鐘`};
 if(pack&&mode){const energyNeed=mode.powerKW*w.hours;if(pack.battery.chargeKWh+1e-6<energyNeed)return {ok:false,budget,pack,reason:`製冷設備電量不足，施工約需 ${energyNeed.toFixed(2)} kWh`}}
 return {ok:true,budget,pack};
}
function spendWorldTimeV26(hours,{label='工作',coolingPack=null,coolingMode=''}={}){
 ensureWorldClockV26();hours=Math.max(0,+hours||0);if(hours<=0)return true;
 const left=currentPeriodHoursLeftV26();if(hours>left+1e-6){toast(`${currentPeriodLabelV26()}剩餘 ${left.toFixed(1)}h，不足以完成 ${hours.toFixed(1)}h 的${label}`);return false}
 processChargingV24(hours);
 if(coolingPack)drainEquipmentV24(coolingPack,hours,coolingMode||coolingPack.mode);
 if(state.day>=30)state.worldClock.endlessElapsed=clamp(state.worldClock.endlessElapsed+hours,0,24);else state.hoursLeft=Math.max(0,Math.round((state.hoursLeft-hours)*100)/100);
 log(`${label}耗時 ${hours.toFixed(hours%1?1:0)}h；${currentPeriodLabelV26()}剩餘 ${currentPeriodHoursLeftV26().toFixed(1)}h。`);
 return true;
}
function craftTimeStatusV26(c){
 const w=craftWorkV26(c.id),left=currentPeriodHoursLeftV26(),ex=craftExposureCheckV26(c.id),problems=[];
 if(w.hours>left+1e-6)problems.push(`${currentPeriodLabelV26()}剩餘時間不足：需要 ${w.hours}h，目前 ${left.toFixed(1)}h`);
 if(!ex.ok)problems.push(ex.reason);
 return {work:w,left,ex,problems};
}

const _craftStateV26=craftStateV23;
craftStateV23=function(c){
 const base=_craftStateV26(c);if(base.id!=='available')return base;
 const t=craftTimeStatusV26(c);return t.problems.length?{id:'locked',label:'目前條件未達成',reasons:t.problems}:{...base,time:t.work.hours};
};

const _openCraftV26=openCraft;
openCraft=function(){
 _openCraftV26();
 document.querySelectorAll('[data-craft]').forEach(b=>{const c=craftDefs.find(x=>x.id===b.dataset.craft);if(!c)return;const card=b.closest('.craft-card'),w=craftWorkV26(c.id);if(card&&!card.querySelector('.craft-time-v26')){const p=document.createElement('p');p.className='craft-cost craft-time-v26';p.textContent=`工時：${w.hours}h · ${w.environment==='outdoor'?'戶外施工／計算熱暴露':'安全區內工作'} · ${locationLabelV24(w.site)}`;card.insertBefore(p,b)}});
};

const _craftV26=craft;
craft=function(id){
 const c=craftDefs.find(x=>x.id===id);if(!c)return;const st=craftStateV23(c);if(st.id!=='available')return toast(st.reasons?.[0]||'目前條件未達成');
 const t=craftTimeStatusV26(c);if(t.problems.length)return toast(t.problems[0]);
 const pack=t.ex?.pack||null,mode=pack?.mode||'';
 _craftV26(id);
 if(!spendWorldTimeV26(t.work.hours,{label:`製作／工程：${c.name}`,coolingPack:t.work.environment==='outdoor'?pack:null,coolingMode:mode}))return;
 ensurePowerStateV24();saveGame(false);render();openCraft();
};

const _actionIssuesV26=actionIssues;
actionIssues=function(loc,e){
 let issues=_actionIssuesV26(loc,e).filter(x=>x!=='目前是白晝');
 if(state.day<30&&state.phase==='day'){
  const temp=dayTemp(state.day),pack=bestPlayerCoolingV24(),mode=pack?equipmentModeV24(pack):null;
  const budget=exposureBudgetV24({temp,activity:'walk',coolingKW:mode?.coolingKW||0});
  if(!budget.sustained&&budget.minutes+1e-6<(e.total||0)*60)issues.push(`白天 ${temp}°C：目前熱防護約只能支撐 ${budget.minutes} 分鐘，行程預估 ${Math.round((e.total||0)*60)} 分鐘`);
  if(pack&&mode){const need=mode.powerKW*(e.total||0);if(pack.battery.chargeKWh+1e-6<need)issues.push(`製冷設備電量不足，白天行程約需 ${need.toFixed(2)} kWh`)}
 }
 if((e.total||0)>currentPeriodHoursLeftV26()+1e-6)issues.push(`${currentPeriodLabelV26()}剩餘時間不足`);
 return [...new Set(issues)];
};

const _showExpeditionResultV26=showExpeditionResult;
showExpeditionResult=function(result){
 ensureWorldClockV26();
 if(result&&!result._v26ClockProcessed){
  result._v26ClockProcessed=true;
  const h=Math.max(0,+result.actualTime||0);
  if(state.day>=30)state.worldClock.endlessElapsed=clamp(state.worldClock.endlessElapsed+h,0,24);
  if(state.day<30&&state.phase==='day'&&!result.retreated){
   const pack=bestPlayerCoolingV24(),mode=pack?equipmentModeV24(pack):null;
   if(pack&&mode&&!result._v26DayCooling){const used=drainEquipmentV24(pack,h,'');result._v26DayCooling=true;result.notes=result.notes||[];result.notes.push(`白天熱防護耗電 ${used.toFixed(2)} kWh，剩餘 ${pack.battery.chargeKWh.toFixed(2)} kWh`)}
  }
 }
 _showExpeditionResultV26(result);
};

advance=function(){
 if(state.gameOver)return;ensureWorldClockV26();
 if(state.day<30){
  const elapsed=Math.max(0,+state.hoursLeft||0);processChargingV24(elapsed);
  if(state.phase==='night'){
   state.phase='day';state.hoursLeft=24-nightHours(state.day);log('夜晚結束，城市重新進入致命白晝。');render();saveGame(false);return;
  }
  consumeDaily();state.day++;state.phase='night';state.hoursLeft=nightHours(state.day);state.worldClock.day=state.day;state.worldClock.endlessElapsed=0;dynamicEvents();checkState();render();saveGame(false);return;
 }
 const remaining=Math.max(0,24-state.worldClock.endlessElapsed);processChargingV24(remaining);consumeDaily();state.day++;state.worldClock.day=state.day;state.worldClock.endlessElapsed=0;dynamicEvents();checkState();render();saveGame(false);
};

const _renderV26=render;
render=function(){ensureWorldClockV26();_renderV26();if($('hours'))$('hours').textContent=state.day>=30?`${currentPeriodHoursLeftV26().toFixed(1)}h`:$('hours').textContent};

ensureWorldClockV26();