/* v14.2.2 QA — medical throughput / clinician / equipment / power / consumables */
const MEDICAL_SITE_V39={
 vent:{name:'中央站醫療區',equipmentSlots:()=>Math.max(1,state.zones?.medical?.capacity||4),basePatientsPerDay:3,powerKW:.18},
 subway:{name:'地鐵冷站醫療點',equipmentSlots:()=>2,basePatientsPerDay:1.4,powerKW:.10},
 coldstore:{name:'冷庫冷站醫療點',equipmentSlots:()=>2,basePatientsPerDay:1.2,powerKW:.10},
 vehicle:{name:'製冷工程車急救位',equipmentSlots:()=>1,basePatientsPerDay:.7,powerKW:.06}
};
function ensureMedicalOpsV39(){
 ensureSafeZoneLifeV38();
 state.medicalOps=state.medicalOps||{schema:1,sites:{},treated:0,lastTickDay:state.day};
 state.medicalOps.schema=1;state.medicalOps.sites=state.medicalOps.sites||{};
 for(const id of Object.keys(MEDICAL_SITE_V39)){
  const s=state.medicalOps.sites[id]||(state.medicalOps.sites[id]={treatedToday:0,last:null});
  s.treatedToday=Math.max(0,+s.treatedToday||0);
 }
 if(state.medicalOps.lastTickDay!==state.day){for(const s of Object.values(state.medicalOps.sites))s.treatedToday=0;state.medicalOps.lastTickDay=state.day}
 return state.medicalOps
}
function medicalSiteBuiltV39(id){if(id==='vent')return (state.base?.ventilation||0)>0;return safeZoneBuiltV37(id)}
function medicalSiteLocationV39(id){return id==='vent'?'vent':safeZoneLocationV37(id)}
function linAtMedicalSiteV39(id){
 const n=state.npcs?.lin;if(!n?.alive)return false;
 const assigned=state.safeShelterOps?.npcAssignments?.lin;
 if(id==='vent')return n.location==='vent'&&!assigned;
 if(assigned)return assigned===id;
 return n.location===medicalSiteLocationV39(id)
}
function cliniciansV39(id){
 let skill=0,people=0;
 if(linAtMedicalSiteV39(id)){people+=1;skill+=2.4}
 if(id==='vent'){
  const workers=Math.max(0,+state.workforce?.medical||0),training=Math.max(0,+state.training?.medical||0);
  people+=workers;skill+=workers*(.65+training*.07);
 }
 return {people,skill}
}
function centralMedicalPowerV39(){
 let plan=null;try{plan=sourceLoadPlanV33('centralGrid')}catch{}
 const row=plan?.services?.find(x=>x.id==='medicalCare');
 const req=Math.max(0,+row?.requestedKW||0),alloc=Math.max(0,+row?.allocatedKW||0);
 return {requestedKW:req,allocatedKW:alloc,ratio:req>0?clamp(alloc/req,0,1):1}
}
function medicalPowerV39(id){
 if(id==='vent')return centralMedicalPowerV39();
 const x=safeZoneSnapshotV37(id),ratio=clamp(+x?.powerRatio||0,0,1),req=MEDICAL_SITE_V39[id]?.powerKW||0;
 if(id==='vehicle'){
  const e=coolingVehicleV32();const active=!!(e&&e.battery?.chargeKWh>.01);return {requestedKW:req,allocatedKW:active?req:0,ratio:active?1:0}
 }
 return {requestedKW:req,allocatedKW:req*ratio,ratio}
}
function medicalConsumablesV39(id){
 if(id==='vent')return {medicine:Math.max(0,+state.resources?.medicine||0),source:'中央庫存'};
 const st=zoneLifeStoreV38(id);return {medicine:Math.max(0,+st?.medicine||0),source:'當地庫存'}
}
function medicalOccupantsV39(id){return id==='vent'?centralOccupantsV36():safeZoneOccupantsV37(id)}
function medicalHealthV39(id){if(id==='vent')return clamp(100-(ensureCentralSafetyV36().thermalStress||0)*.45,0,100);return clamp(zoneLifeStoreV38(id)?.health??100,0,100)}
function medicalDemandV39(id){
 const n=medicalOccupantsV39(id),health=medicalHealthV39(id),stress=Math.max(0,(80-health)/20),thermal=id==='vent'?(ensureCentralSafetyV36().thermalStress||0)/100:(state.safeShelterOps?.metrics?.[id]?.thermalStress||0)/100;
 return Math.max(0,n*(.05+.11*stress+.08*thermal))
}
function medicalCapabilityV39(id){
 ensureMedicalOpsV39();const def=MEDICAL_SITE_V39[id];if(!def||!medicalSiteBuiltV39(id))return {id,capacity:0,throughput:0,reason:'醫療點不可用'};
 const clinicians=cliniciansV39(id),slots=Math.max(0,+def.equipmentSlots()||0),power=medicalPowerV39(id),cons=medicalConsumablesV39(id),occupants=medicalOccupantsV39(id),health=medicalHealthV39(id),demand=medicalDemandV39(id);
 const clinicianFactor=clinicians.skill>0?clinicians.skill:0.22;
 const equipmentFactor=Math.max(.25,slots);
 const powerFactor=.25+.75*power.ratio;
 const medicineFactor=cons.medicine<=0?.22:clamp(.35+cons.medicine*.22,.35,1.35);
 const throughput=def.basePatientsPerDay*clinicianFactor*Math.min(1.8,equipmentFactor)*powerFactor*medicineFactor;
 const level=linAtMedicalSiteV39(id)&&power.ratio>=.75&&cons.medicine>=1?'完整臨床':clinicians.people>0&&cons.medicine>.2?'基礎醫療':'急救／支持';
 const capacity=Math.max(0,Math.floor(throughput/.16));
 return {id,name:def.name,capacity,throughput,clinicians,slots,power,consumables:cons,occupants,health,demand,level,doctor:linAtMedicalSiteV39(id)}
}
/* Medical service on the central bus competes with pumps, shelters and charging. */
GRID_SERVICE_DEFS_V34.medicalCare=GRID_SERVICE_DEFS_V34.medicalCare||{name:'中央站醫療設備',priority:'high',req:()=>{
 if((state.base?.ventilation||0)<=0)return 0;const n=centralOccupantsV36(),workers=Math.max(0,+state.workforce?.medical||0),doctor=linAtMedicalSiteV39('vent')?1:0;return n>0?Math.min(1.6,.12+n*.018+workers*.05+doctor*.12):0
}};
ensurePowerOpsV34();if(!state.powerOps.services.medicalCare)state.powerOps.services.medicalCare={enabled:true,priority:'high'};

/* Replace V38's static medical dimension with actual service capacity. */
const _zoneLifeCapsV39=zoneLifeCapsV38;
zoneLifeCapsV38=function(id){
 const c=_zoneLifeCapsV39(id);if(!c||!SAFE_ZONE_LIFE_V38[id])return c;
 const med=medicalCapabilityV39(id),dims={cooling:c.cooling,water:c.water,food:c.food,medical:med.capacity,sleep:c.sleep,sanitation:c.sanitation};
 const safe=Math.min(...Object.values(dims)),labels={cooling:'冷卻',water:'水',food:'食物',medical:'醫療',sleep:'睡眠空間',sanitation:'衛生'};
 const bottleneck=Object.entries(dims).filter(([,v])=>v===safe).map(([k])=>labels[k]).join('／');return {...c,medical:med.capacity,safe,bottleneck,medicalDetail:med}
};

function consumeMedicalCareV39(hours){
 hours=Math.max(0,+hours||0);if(hours<=0||state.day<30)return;ensureMedicalOpsV39();
 for(const id of Object.keys(MEDICAL_SITE_V39)){
  if(!medicalSiteBuiltV39(id))continue;const m=medicalCapabilityV39(id),site=state.medicalOps.sites[id],possible=m.throughput*hours/24,need=m.demand*hours/24,treated=Math.min(possible,need),medUse=treated*(m.level==='完整臨床'?.10:.06);
  if(id==='vent')state.resources.medicine=Math.max(0,(state.resources.medicine||0)-Math.min(state.resources.medicine||0,medUse));else{const st=zoneLifeStoreV38(id);st.medicine=Math.max(0,(st.medicine||0)-Math.min(st.medicine||0,medUse))}
  site.treatedToday+=treated;state.medicalOps.treated+=treated;
  if(id!=='vent'){
   const st=zoneLifeStoreV38(id),coverage=need>0?clamp(treated/need,0,1):1;
   st.health=clamp(st.health+treated*.22-hours*(1-coverage)*.08,0,100)
  }else if(need>possible+.001){ensureCentralSafetyV36().evacuationPressure=clamp(ensureCentralSafetyV36().evacuationPressure+hours*.03,0,100)}
  site.last={day:state.day,hours,throughput:m.throughput,demand:m.demand,treated,level:m.level,powerRatio:m.power.ratio,doctor:m.doctor}
 }
}
const _processSourceSliceV39=processSourceSliceV34;
processSourceSliceV34=function(sourceId,hours){_processSourceSliceV39(sourceId,hours);if(sourceId==='centralGrid')consumeMedicalCareV39(hours)};

function medicalOpsHtmlV39(){
 ensureMedicalOpsV39();const rows=Object.keys(MEDICAL_SITE_V39).filter(medicalSiteBuiltV39).map(id=>{const m=medicalCapabilityV39(id),load=m.demand,cover=load>0?Math.min(999,m.throughput/load*100):100;return `<article class="medical-site-card ${cover<70?'critical':cover<100?'strained':'stable'}"><div class="medical-site-head"><div><span>MEDICAL SERVICE</span><h4>${m.name}</h4></div><b>${m.level}</b></div><div class="medical-grid"><span>醫療人員 <b>${m.clinicians.people}${m.doctor?' · 林醫師在場':''}</b></span><span>設備服務位 <b>${m.slots}</b></span><span>設備供電 <b>${Math.round(m.power.ratio*100)}%</b></span><span>藥品 <b>${m.consumables.medicine.toFixed(1)}</b></span><span>處置能力 <b>${m.throughput.toFixed(1)} 人次/日</b></span><span>估計需求 <b>${m.demand.toFixed(1)} 人次/日</b></span></div><p class="${cover<100?'action-warning':'muted'}">需求覆蓋 ${Math.round(cover)}%。${m.doctor?'有醫師可做完整臨床處置；':'沒有醫師時以急救與支持性照護為主；'}設備、供電或耗材不足都會降低 throughput。</p></article>`}).join('');return rows?`<section class="medical-ops-panel"><div class="source-load-head"><div><span>CARE NETWORK</span><h3>醫療服務能力</h3></div></div><p class="muted">醫療不是固定人口上限。實際能力由人員技能、設備服務位、電力、藥品與當地病患需求共同決定。</p><div class="medical-site-list">${rows}</div></section>`:''
}
const _openInventoryV39=openInventory;
openInventory=function(){_openInventoryV39();const host=$('inventoryContent');if(host)host.insertAdjacentHTML('beforeend',medicalOpsHtmlV39())};

ensureMedicalOpsV39();
