/* v14.2.2 QA — NPC professional service throughput / location-bound expertise */
const NPC_SERVICE_V40={
 lin:{label:'醫療服務',site:'medical',summary:'臨床處置、分診、醫療耗材效率'},
 chen:{label:'冷卻／維修服務',site:'cooling',summary:'HVAC 診斷、冷卻效率、設備維護'},
 mei:{label:'研究／情報服務',site:'research',summary:'資料分析、研究工時、情報整理'},
 wu:{label:'物流／調度服務',site:'logistics',summary:'接駁規劃、裝卸協調、補給週轉'}
};
function ensureNpcServicesV40(){
 state.npcServices=state.npcServices||{schema:1,stats:{},last:null};state.npcServices.schema=1;state.npcServices.stats=state.npcServices.stats||{};
 for(const id of Object.keys(NPC_SERVICE_V40))state.npcServices.stats[id]=state.npcServices.stats[id]||{hours:0,actions:0,last:null};
 return state.npcServices
}
function npcServiceZoneV40(id){
 const n=state.npcs?.[id];if(!n?.alive)return null;
 const assigned=state.safeShelterOps?.npcAssignments?.[id];if(assigned)return assigned;
 if(n.location==='vent')return 'vent';
 for(const zid of ['subway','coldstore','vehicle'])if(safeZoneBuiltV37?.(zid)&&safeZoneLocationV37?.(zid)===n.location)return zid;
 return n.location||null
}
function npcExpertAtV40(id,site){return npcServiceZoneV40(id)===site}
function expertTrustFactorV40(id){const n=state.npcs?.[id];return n?.alive?clamp(.88+(+n.trust||0)*.015,.8,1.18):0}
function recordNpcServiceV40(id,hours=0,action=''){
 const s=ensureNpcServicesV40().stats[id];if(!s)return;s.hours+=Math.max(0,+hours||0);s.actions+=(action?1:0);s.last={day:state.day,site:npcServiceZoneV40(id),action};
}

/* Chen: expertise improves usable cooling output, but never creates power or exceeds nominal design capacity. */
function chenCoolingFactorV40(site){
 if(!npcExpertAtV40('chen',site))return 1;
 const t=expertTrustFactorV40('chen'),training=Math.max(0,+state.training?.hvac||0);return clamp(1.10*t+training*.012,1.05,1.22)
}
const _centralSafeCapacityV40=centralSafeCapacityV36;
centralSafeCapacityV36=function(){const base=_centralSafeCapacityV40();if(base<=0)return base;return Math.min(centralNominalCapacityV36(),Math.floor(base*chenCoolingFactorV40('vent')))};
const _safeZoneSnapshotV40=safeZoneSnapshotV37;
safeZoneSnapshotV37=function(id){
 const x=_safeZoneSnapshotV40(id);if(!x||!['subway','coldstore'].includes(id)||!npcExpertAtV40('chen',id))return x;
 const nominal=x.d?.nominal||x.nominal||x.safe||0,boosted=Math.min(nominal,Math.floor((x.safe||0)*chenCoolingFactorV40(id)));return {...x,safe:boosted,expert:'chen'}
};

/* Chen also improves completed preventive maintenance when physically at the central station. */
const _craftV40=craft;
craft=function(id){
 const before=+state.base?.condition||0,res=_craftV40(id);
 if(id==='maintain'&&npcExpertAtV40('chen','vent')){const gain=Math.max(0,(+state.base?.condition||0)-before),bonus=Math.min(8,Math.max(3,gain*.28));state.base.condition=clamp((state.base.condition||0)+bonus,0,100);recordNpcServiceV40('chen',craftWorkV26?.('maintain')?.hours||2,'中央站預防維護');log(`陳技師在中央站參與診斷與校正，維護額外恢復 ${bonus.toFixed(0)}% 設備狀況。`,'good');render()}
 return res
};

/* Mei: research is no longer instantaneous. Data cost stays unchanged; expertise reduces analysis time. */
function researchThroughputV40(){
 const mei=npcExpertAtV40('mei','vent')?1:0,trust=mei?expertTrustFactorV40('mei'):1,training=Math.max(0,+state.training?.electric||0)+Math.max(0,+state.training?.hvac||0);
 return clamp(1+mei*.85*trust+training*.025,1,2.35)
}
function researchHoursV40(r){return Math.max(.5,Math.round(((1.2+(+r?.cost||1)*.55)/researchThroughputV40())*4)/4)}
openResearch=function(){
 const tp=researchThroughputV40();$('researchList').innerHTML=researchDefs.map(r=>{const done=state.research[r.id],can=r.req(),enough=state.resources.data>=r.cost,h=researchHoursV40(r),timeOk=currentPeriodHoursLeftV26()>=h;return `<div class="card"><h3>${r.name}</h3><p>${r.desc}</p><p>需要研究資料：${r.cost}（持有 ${state.resources.data}）</p><p>分析工時：${h.toFixed(h%1?2:0)}h · 研究 throughput ${tp.toFixed(2)}×${npcExpertAtV40('mei','vent')?' · 美玲在中央站':''}</p><p class="status">${done?'已完成':!can?'前置條件不足':!enough?'資料不足':!timeOk?'本時段時間不足':'可研究'}</p><button data-research="${r.id}" ${done||!can||!enough||!timeOk?'disabled':''}>${done?'已完成':'研究'}</button></div>`}).join('');$('researchDialog').showModal();document.querySelectorAll('[data-research]').forEach(b=>b.onclick=()=>doResearch(b.dataset.research))
};
doResearch=function(id){
 const r=researchDefs.find(x=>x.id===id);if(!r||state.research[id]||!r.req()||state.resources.data<r.cost)return;const h=researchHoursV40(r);if(currentPeriodHoursLeftV26()+1e-6<h)return toast(`本時段剩餘時間不足，研究需要 ${h}h`);if(!spendWorldTimeV26(h,{label:`研究分析：${r.name}`}))return;state.resources.data-=r.cost;state.research[id]=true;if(npcExpertAtV40('mei','vent'))recordNpcServiceV40('mei',h,`研究：${r.name}`);log(`研究完成：${r.name}（分析 ${h}h）`,'major');$('researchDialog').close();render();saveGame(false)
};

/* Mei at the central station slows intelligence decay through active cross-checking; never reveals unknown truth. */
const _roadIntelConfidenceV40=roadIntelConfidence;
roadIntelConfidence=function(i){const base=_roadIntelConfidenceV40(i);if(!i||!npcExpertAtV40('mei','vent'))return base;const age=roadIntelAge(i);return clamp(base+Math.min(18,age*3),10,100)};

/* Wu: logistics expertise reduces handling/dispatch time, not physical vehicle capacity. */
function wuLogisticsFactorV40(site='vent'){
 if(!npcExpertAtV40('wu',site))return 1;const t=expertTrustFactorV40('wu');return clamp(.86/t,.72,.92)
}
const _shuttlePlanV40=shuttlePlanV37;
shuttlePlanV37=function(zoneId,count,direction='out'){
 const p=_shuttlePlanV40(zoneId,count,direction);if(!p?.ok)return p;const f=wuLogisticsFactorV40('vent');if(f>=.999)return p;const old=p.time;p.time=Math.max(p.h*2+.12,p.time*f);p.logisticsSavedHours=Math.max(0,old-p.time);return p
};
const _zoneSupplyTripV40=zoneSupplyTripV38;
zoneSupplyTripV38=function(zoneId){
 const p=_zoneSupplyTripV40(zoneId);if(!p?.ok)return p;const f=wuLogisticsFactorV40('vent');if(f>=.999)return p;const old=p.time;p.time=Math.max(p.h*2+.18,p.time*f);p.logisticsSavedHours=Math.max(0,old-p.time);return p
};

/* Count expert service hours whenever central power advances. This is reporting only, not an extra hidden multiplier. */
const _processSourceSliceV40=processSourceSliceV34;
processSourceSliceV34=function(sourceId,hours){
 _processSourceSliceV40(sourceId,hours);if(sourceId!=='centralGrid'||hours<=0)return;
 if(npcExpertAtV40('chen','vent')&&(state.base?.ventilation||0)>0)recordNpcServiceV40('chen',hours,'冷卻監控');
 if(npcExpertAtV40('lin','vent')&&centralOccupantsV36()>0)recordNpcServiceV40('lin',hours,'醫療值班');
 if(npcExpertAtV40('wu','vent'))recordNpcServiceV40('wu',hours,'物流調度')
};

function npcServiceSummaryV40(){
 ensureNpcServicesV40();const rows=Object.keys(NPC_SERVICE_V40).map(id=>{const n=state.npcs?.[id],def=NPC_SERVICE_V40[id],site=npcServiceZoneV40(id),known=n&&npcKnown(n),status=!n?.alive?'死亡':!known?'未掌握位置':locationLabelV24?.(site)||site||'未知';let metric='';
  if(id==='lin'&&known){const m=['vent','subway','coldstore','vehicle'].includes(site)&&medicalSiteBuiltV39(site)?medicalCapabilityV39(site):null;metric=m?`${m.throughput.toFixed(1)} 人次/日`:'未在醫療節點'}
  if(id==='chen'&&known)metric=`冷卻效率 ${Math.round((chenCoolingFactorV40(site)-1)*100)}% 加成`;
  if(id==='mei'&&known)metric=site==='vent'?`研究 ${researchThroughputV40().toFixed(2)}×`:'未接入中央分析站';
  if(id==='wu'&&known)metric=site==='vent'?`接駁工時 ×${wuLogisticsFactorV40('vent').toFixed(2)}`:'未接入中央調度';
  return `<article class="npc-service-card ${known&&n?.alive?'active':'inactive'}"><div><span>${def.label}</span><h4>${known?n.name:'未知專業人員'}</h4></div><b>${status}</b><p>${def.summary}</p>${known?`<small>${metric}</small>`:''}</article>`}).join('');return `<section class="npc-service-panel"><div class="source-load-head"><div><span>PROFESSIONAL NETWORK</span><h3>專業人力節點</h3></div></div><p class="muted">專業加成只在 NPC 實際所在的服務節點生效；未知 NPC 不會在此洩漏身份或位置。</p><div class="npc-service-list">${rows}</div></section>`
}
const _openInventoryV40=openInventory;
openInventory=function(){_openInventoryV40();const host=$('inventoryContent');if(host)host.insertAdjacentHTML('beforeend',npcServiceSummaryV40())};

ensureNpcServicesV40();
