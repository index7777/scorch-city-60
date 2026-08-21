/* v14.2.2 QA — power-coupled central-station safe population capacity */
function ensureCentralSafetyV36(){
 state.centralSafety=state.centralSafety||{schema:1,overloadPersonHours:0,thermalStress:0,evacuationPressure:0,last:null,lastWarningDay:0};
 state.centralSafety.schema=1;
 state.centralSafety.overloadPersonHours=Math.max(0,+state.centralSafety.overloadPersonHours||0);
 state.centralSafety.thermalStress=clamp(+state.centralSafety.thermalStress||0,0,100);
 state.centralSafety.evacuationPressure=clamp(+state.centralSafety.evacuationPressure||0,0,100);
 return state.centralSafety
}
function centralNominalCapacityV36(){
 if(state.base?.core)return 140;
 if((state.base?.ventilation||0)>=2)return 45;
 if((state.base?.ventilation||0)>=1)return 12;
 return 0
}
function centralOccupantsV36(){
 const base=Math.max(0,+state.base?.population||0);
 const npcs=Object.values(state.npcs||{}).filter(n=>n.alive&&n.location==='vent').length;
 const settlements=Object.values(state.settlements||{}).filter(s=>s.location==='vent').reduce((a,s)=>a+Math.max(0,+s.population||0),0);
 return base+npcs+settlements
}
function ventilationPowerV36(){
 if((state.base?.ventilation||0)<=0)return {requestedKW:0,allocatedKW:0,ratio:0};
 let plan=null;
 try{plan=sourceLoadPlanV33('centralGrid')}catch{}
 const row=plan?.services?.find(x=>x.id==='ventilation');
 const requested=Math.max(0,+row?.requestedKW||+GRID_SERVICE_DEFS_V34.ventilation.req()||0),allocated=Math.max(0,+row?.allocatedKW||0);
 return {requestedKW:requested,allocatedKW:allocated,ratio:requested>0?clamp(allocated/requested,0,1):0}
}
function centralSafeCapacityV36(){
 const nominal=centralNominalCapacityV36();if(!nominal)return 0;
 const p=ventilationPowerV36(),condition=clamp((state.base?.condition??100)/100,.25,1),powerFactor=p.ratio<=0?0:Math.pow(p.ratio,.82);
 const conditionFactor=.55+.45*condition;
 let safe=Math.floor(nominal*powerFactor*conditionFactor);
 if(p.allocatedKW>0)safe=Math.max(1,safe);
 return clamp(safe,0,nominal)
}
function centralSafetySnapshotV36(){
 const s=ensureCentralSafetyV36(),occupants=centralOccupantsV36(),safe=centralSafeCapacityV36(),nominal=centralNominalCapacityV36(),power=ventilationPowerV36(),over=Math.max(0,occupants-safe);
 const ratio=safe>0?occupants/safe:(occupants>0?Infinity:0);
 const status=over<=0?(power.ratio>=.95?'stable':'derated'):ratio<=1.15?'strained':ratio<=1.4?'overloaded':'critical';
 return {occupants,safe,nominal,power,over,ratio,status,thermalStress:s.thermalStress,evacuationPressure:s.evacuationPressure}
}
function centralSafetyLabelV36(st){return ({stable:'穩定',derated:'降載運轉',strained:'接近上限',overloaded:'超額人口',critical:'危急'}[st]||st)}
function tickCentralSafetyV36(hours){
 hours=Math.max(0,+hours||0);if(hours<=0||state.day<30||(state.base?.ventilation||0)<=0)return;
 const s=ensureCentralSafetyV36(),x=centralSafetySnapshotV36();
 if(x.over>0){
  s.overloadPersonHours+=x.over*hours;
  const severity=x.safe>0?x.over/Math.max(1,x.safe):1;
  s.thermalStress=clamp(s.thermalStress+hours*(1.4+severity*4.2),0,100);
  s.evacuationPressure=clamp(s.evacuationPressure+hours*(.8+severity*3.4),0,100);
  state.base.condition=clamp((state.base.condition??100)-hours*(.08+severity*.22),0,100);
 }else{
  s.thermalStress=clamp(s.thermalStress-hours*1.25,0,100);
  s.evacuationPressure=clamp(s.evacuationPressure-hours*.7,0,100);
 }
 s.last={day:state.day,phase:state.phase,hours,occupants:x.occupants,safe:x.safe,nominal:x.nominal,powerRatio:x.power.ratio,status:x.status};
 if(x.over>0&&state.day!==s.lastWarningDay){
  s.lastWarningDay=state.day;
  log(`中央站目前 ${x.occupants} 人，但依實際主冷卻供電只能安全維持約 ${x.safe} 人；撤離壓力正在上升。`,'major');
 }
}
const _processSourceSliceV36=processSourceSliceV34;
processSourceSliceV34=function(sourceId,hours){_processSourceSliceV36(sourceId,hours);if(sourceId==='centralGrid')tickCentralSafetyV36(hours)};

/* Rescue destination must have real-time cooling headroom, not just a built station flag. */
const _rescueFeasibilityV36=rescueFeasibilityV29;
rescueFeasibilityV29=function(stop){
 const f=_rescueFeasibilityV36(stop);if(!f?.candidate||f.destination!=='vent'||state.day<30)return f;
 const x=centralSafetySnapshotV36();
 if(x.safe<x.occupants+1)return {...f,ok:false,kind:'capacity',reason:`中央通風站目前安全容量 ${x.safe} 人，現有 ${x.occupants} 人；主冷卻供電不足以再接收 1 人`};
 return f
};

/* Core stability now requires actual powered cooling capacity, not only nominal ventCapacity. */
const _coolingLoadPctV36=coolingLoadPct;
coolingLoadPct=function(){
 if(state.day>=30&&state.base?.ventilation>0){const x=centralSafetySnapshotV36();if(x.safe<=0)return x.occupants>0?999:0;return Math.round(x.occupants/x.safe*100)}
 return _coolingLoadPctV36()
};
const _overCapacityV36=overCapacity;
overCapacity=function(){if(state.day>=30&&state.base?.ventilation>0){const x=centralSafetySnapshotV36();return Math.max(0,x.occupants-x.safe)}return _overCapacityV36()};

function centralSafetyHtmlV36(){
 if((state.base?.ventilation||0)<=0)return '';
 const x=centralSafetySnapshotV36(),s=ensureCentralSafetyV36(),pct=x.nominal>0?x.safe/x.nominal*100:0,pwr=Math.round(x.power.ratio*100);
 const headroom=Math.max(0,x.safe-x.occupants),critical=s.thermalStress>=70||x.status==='critical';
 return `<section class="central-safety-card ${critical?'critical':x.over>0?'overloaded':'stable'}"><div class="source-load-head"><div><span>HABITABILITY</span><h3>中央站即時安全容量</h3></div><b>${x.occupants} / ${x.safe} 人</b></div><div class="capacity-meter"><i style="width:${clamp(pct,0,100)}%"></i></div><div class="grid-source-strip"><span>設計容量 <b>${x.nominal} 人</b></span><span>主冷卻供電 <b>${x.power.allocatedKW.toFixed(2)} / ${x.power.requestedKW.toFixed(2)} kW</b></span><span>供電率 <b>${pwr}%</b></span><span>可再接收 <b>${headroom} 人</b></span></div><div class="safety-state"><b>${centralSafetyLabelV36(x.status)}</b><span>熱壓力 ${s.thermalStress.toFixed(0)}%</span><span>撤離壓力 ${s.evacuationPressure.toFixed(0)}%</span></div>${x.over>0?`<p class="action-warning">目前超出安全容量 ${x.over} 人。這不是床位問題，而是主冷卻實際得到的電力不足；持續欠冷卻會增加熱壓力並降低設備狀況。</p>`:'<p class="muted">安全容量依主冷卻實際分配功率與中央站設備狀況即時計算，不等同於名目設計容量。</p>'}</section>`
}
const _openInventoryV36=openInventory;
openInventory=function(){_openInventoryV36();const host=$('inventoryContent');if(host)host.insertAdjacentHTML('beforeend',centralSafetyHtmlV36())};

const _renderBaseV36=renderBase;
renderBase=function(){_renderBaseV36();const host=$('baseStats');if(!host||(state.base?.ventilation||0)<=0)return;const x=centralSafetySnapshotV36();host.insertAdjacentHTML('beforeend',`<div class="resource-row ${x.over>0?'bad':''}"><span>即時安全人口</span><b>${x.occupants} / ${x.safe}</b></div><div class="resource-row"><span>主冷卻供電率</span><b>${Math.round(x.power.ratio*100)}%</b></div>`)};

ensureCentralSafetyV36();
