/* v14.2.2 QA — power logistics / equipment custody foundation */
const EQUIPMENT_TYPES_V24={
 coolpack:{name:'主動製冷背包',maxUsers:1,battery:{capacityKWh:2.4,maxChargeKW:.8,maxDischargeKW:1.2},modes:{eco:{label:'ECO',powerKW:.30,coolingKW:.38},normal:{label:'NORMAL',powerKW:.55,coolingKW:.70},boost:{label:'BOOST',powerKW:.95,coolingKW:1.05}},defaultMode:'normal'},
 portableFan:{name:'便攜循環風扇',maxUsers:1,battery:{capacityKWh:.36,maxChargeKW:.12,maxDischargeKW:.10},modes:{normal:{label:'NORMAL',powerKW:.06,coolingKW:.08}},defaultMode:'normal'}
};
const POWER_SOURCE_TYPES_V24={
 heatHouse:{name:'耐熱屋低功率供電',location:'base',maxOutputKW:.25,efficiency:.88},
 generator:{name:'柴油發電機',location:'vent',maxOutputKW:8,efficiency:.90,fuelRateLph:2.2},
 solar:{name:'太陽能供電',location:'vent',maxOutputKW:6,efficiency:.92},
 centralBus:{name:'中央站電力匯流排',location:'vent',maxOutputKW:0,efficiency:.92}
};
function ensurePowerStateV24(){
 state.equipmentInstances=state.equipmentInstances||{};
 state.powerLogistics=state.powerLogistics||{schema:1,charging:[],seq:1};
 state.powerLogistics.charging=Array.isArray(state.powerLogistics.charging)?state.powerLogistics.charging:[];
 if(state.gear?.coolingPack&&!Object.values(state.equipmentInstances).some(x=>x.type==='coolpack'&&x.owner==='player')){
  const type=EQUIPMENT_TYPES_V24.coolpack,id=`coolpack_${String(state.powerLogistics.seq++).padStart(3,'0')}`;
  state.equipmentInstances[id]={instanceId:id,type:'coolpack',owner:'player',holder:'player',location:'base',assignedUsers:['player'],condition:100,mode:type.defaultMode,battery:{capacityKWh:type.battery.capacityKWh,chargeKWh:1.2,maxChargeKW:type.battery.maxChargeKW,maxDischargeKW:type.battery.maxDischargeKW},loan:null,legacyImported:true};
 }
 return state.powerLogistics;
}
function equipmentTypeV24(e){return e&&EQUIPMENT_TYPES_V24[e.type]||null}
function equipmentNameV24(e){return equipmentTypeV24(e)?.name||e?.type||'未知設備'}
function holderLabelV24(h){if(h==='player')return '你';if(state.npcs?.[h])return state.npcs[h].name;if(!h)return '無人持有';return h}
function locationLabelV24(id){return locations.find(l=>l.id===id)?.name||state.settlements?.[id]?.name||id||'未知'}
function playerEquipmentV24(type){ensurePowerStateV24();return Object.values(state.equipmentInstances).filter(e=>e.owner==='player'&&(!type||e.type===type))}
function playerHeldEquipmentV24(type){return playerEquipmentV24(type).filter(e=>e.holder==='player')}
function equipmentModeV24(e){const t=equipmentTypeV24(e);return t?.modes?.[e.mode]||t?.modes?.[t?.defaultMode]||null}
function equipmentRuntimeHoursV24(e){const m=equipmentModeV24(e);if(!m||!e?.battery?.chargeKWh)return 0;return e.battery.chargeKWh/Math.max(.001,m.powerKW)}
function setEquipmentModeV24(id,mode){const e=state.equipmentInstances?.[id],t=equipmentTypeV24(e);if(!e||!t?.modes?.[mode])return false;e.mode=mode;render();saveGame(false);return true}
function sourceStateV24(){
 ensurePowerStateV24();
 const daySolar=state.day>=30||state.phase==='day';
 const centralKnown=typeof hasReachedVentV23==='function'&&hasReachedVentV23();
 const sources={
  heatHouse:{...POWER_SOURCE_TYPES_V24.heatHouse,available:true},
  generator:{...POWER_SOURCE_TYPES_V24.generator,available:!!(centralKnown&&state.installed?.generator&&state.resources.fuel>0)},
  solar:{...POWER_SOURCE_TYPES_V24.solar,available:!!(centralKnown&&daySolar&&(state.gear?.solar||state.installed?.inverter))},
  centralBus:{...POWER_SOURCE_TYPES_V24.centralBus,maxOutputKW:Math.max(0,state.base?.powerKW||0),available:!!(centralKnown&&(state.base?.powerKW||0)>0)}
 };
 return sources;
}
function sourceCanReachEquipmentV24(source,e){return !!(source?.available&&e&&e.holder==='player'&&e.location===source.location)}
function startChargingV24(equipmentId,sourceId){
 ensurePowerStateV24();const e=state.equipmentInstances[equipmentId],s=sourceStateV24()[sourceId];
 if(!e||!s)return toast('充電設備或電源不存在');
 if(!sourceCanReachEquipmentV24(s,e))return toast('設備不在這個供電來源的位置');
 if(e.battery.chargeKWh>=e.battery.capacityKWh-.001)return toast('設備已充滿');
 state.powerLogistics.charging=state.powerLogistics.charging.filter(q=>q.equipmentId!==equipmentId);
 state.powerLogistics.charging.push({equipmentId,sourceId,startedDay:state.day});
 log(`${equipmentNameV24(e)}接上${s.name}開始充電。`,'good');openInventory();saveGame(false)
}
function stopChargingV24(equipmentId,silent=false){ensurePowerStateV24();const before=state.powerLogistics.charging.length;state.powerLogistics.charging=state.powerLogistics.charging.filter(q=>q.equipmentId!==equipmentId);if(!silent&&before!==state.powerLogistics.charging.length){log('已停止設備充電。');openInventory();saveGame(false)}}
function processChargingV24(hours){
 ensurePowerStateV24();hours=Math.max(0,+hours||0);if(hours<=0||!state.powerLogistics.charging.length)return;
 const sources=sourceStateV24();
 for(const [sourceId,qs0] of Object.entries(Object.groupBy?Object.groupBy(state.powerLogistics.charging,q=>q.sourceId):state.powerLogistics.charging.reduce((a,q)=>(a[q.sourceId]||(a[q.sourceId]=[]),a[q.sourceId].push(q),a),{}))){
  const s=sources[sourceId];if(!s?.available||s.maxOutputKW<=0)continue;
  const qs=qs0.map(q=>({q,e:state.equipmentInstances[q.equipmentId]})).filter(x=>x.e&&sourceCanReachEquipmentV24(s,x.e)&&x.e.battery.chargeKWh<x.e.battery.capacityKWh-.001);
  if(!qs.length)continue;
  const requests=qs.map(x=>Math.min(x.e.battery.maxChargeKW||.1,(x.e.battery.capacityKWh-x.e.battery.chargeKWh)/Math.max(.001,hours)));
  const requestTotal=requests.reduce((a,b)=>a+b,0),scale=requestTotal>0?Math.min(1,s.maxOutputKW/requestTotal):0;
  let sourceEnergy=0;
  qs.forEach((x,i)=>{const kw=requests[i]*scale,energy=Math.min(x.e.battery.capacityKWh-x.e.battery.chargeKWh,kw*hours*(s.efficiency||.9));x.e.battery.chargeKWh=Math.min(x.e.battery.capacityKWh,x.e.battery.chargeKWh+energy);sourceEnergy+=energy/(s.efficiency||.9)});
  if(sourceId==='generator'&&sourceEnergy>0){const loadHours=sourceEnergy/Math.max(.001,s.maxOutputKW),fuel=Math.min(state.resources.fuel,loadHours*(s.fuelRateLph||0));state.resources.fuel=Math.max(0,state.resources.fuel-fuel)}
 }
 state.powerLogistics.charging=state.powerLogistics.charging.filter(q=>{const e=state.equipmentInstances[q.equipmentId],s=sources[q.sourceId];return e&&s?.available&&sourceCanReachEquipmentV24(s,e)&&e.battery.chargeKWh<e.battery.capacityKWh-.001});
}
function drainEquipmentV24(e,hours,modeName=''){if(!e||hours<=0)return 0;const t=equipmentTypeV24(e),m=t?.modes?.[modeName||e.mode]||equipmentModeV24(e);if(!m)return 0;const need=m.powerKW*hours,used=Math.min(e.battery.chargeKWh,need);e.battery.chargeKWh=Math.max(0,e.battery.chargeKWh-used);e.condition=clamp((e.condition??100)-hours*.08,0,100);return used}
function loanEquipmentV24(equipmentId,npcId){
 ensurePowerStateV24();const e=state.equipmentInstances[equipmentId],n=state.npcs[npcId];if(!e||!n?.alive)return toast('無法借出設備');if(e.owner!=='player'||e.holder!=='player')return toast('設備目前不在你手上');
 stopChargingV24(equipmentId,true);e.holder=npcId;e.location=n.location;e.assignedUsers=[npcId];e.loan={borrower:npcId,startDay:state.day,startChargeKWh:e.battery.chargeKWh,state:'active'};log(`你把${equipmentNameV24(e)}借給${n.name}。電量與損耗會照常累積。`,'major');render();openTrade(npcId);saveGame(false)
}
function returnEquipmentV24(equipmentId,npcId){
 ensurePowerStateV24();const e=state.equipmentInstances[equipmentId],n=state.npcs[npcId];if(!e||e.owner!=='player'||e.holder!==npcId)return toast('這件設備目前不由該 NPC 持有');if(!n?.alive)return toast('NPC 已失聯，設備必須到最後已知位置回收');
 e.holder='player';e.location=n.location;e.assignedUsers=['player'];if(e.loan)e.loan={...e.loan,returnDay:state.day,endChargeKWh:e.battery.chargeKWh,state:'returned'};log(`${n.name}歸還${equipmentNameV24(e)}，剩餘 ${e.battery.chargeKWh.toFixed(2)} / ${e.battery.capacityKWh.toFixed(2)} kWh。`,'good');render();openTrade(npcId);saveGame(false)
}
function updateLoanedEquipmentV24(){
 ensurePowerStateV24();for(const e of Object.values(state.equipmentInstances)){
  if(!e.holder||e.holder==='player'||!state.npcs[e.holder])continue;const n=state.npcs[e.holder];
  e.location=n.location;if(!n.alive){e.assignedUsers=[];e.holder=null;e.loan=e.loan?{...e.loan,state:'dropped',dropDay:state.day,dropLocation:n.location}:null;log(`${equipmentNameV24(e)}留在${locationLabelV24(n.location)}，沒有自動回到你的庫存。`,'major');continue}
  const useHours=state.day>=30?4:Math.min(4,nightHours(state.day)*.55);drainEquipmentV24(e,useHours,'normal');
 }
}
function coolingNeedKWV24(temp,activity='walk',passive=.18){const activityKW={rest:.08,observe:.12,walk:.20,search:.28,repair:.34,carry:.45}[activity]??.20;return Math.max(0,(temp-35)*.011+activityKW-passive)}
function exposureBudgetV24({temp=8,activity='walk',passive=.18,coolingKW=0}={}){const need=coolingNeedKWV24(temp,activity,passive),net=Math.max(0,need-coolingKW);if(net<=.01)return {needKW:need,netKW:net,minutes:720,sustained:true};const thermalBudgetKWh=.34;return {needKW:need,netKW:net,minutes:Math.max(5,Math.round(thermalBudgetKWh/net*60)),sustained:false}}
function equipmentCoverageV24(e,userCount=1,temp=100,activity='walk'){
 const t=equipmentTypeV24(e),m=equipmentModeV24(e);if(!t||!m)return {ok:false,reason:'設備無冷卻資料'};if(userCount>t.maxUsers)return {ok:false,reason:`最多只能供 ${t.maxUsers} 人使用`};const demand=coolingNeedKWV24(temp,activity,.18)*userCount,run=equipmentRuntimeHoursV24(e);return {ok:m.coolingKW>=demand&&e.battery.chargeKWh>0,demandKW:demand,coolingKW:m.coolingKW,runtimeHours:run,maxUsers:t.maxUsers}}
function bestPlayerCoolingV24(){return playerHeldEquipmentV24('coolpack').filter(e=>e.battery.chargeKWh>.01).sort((a,b)=>b.battery.chargeKWh-a.battery.chargeKWh)[0]||null}

const _craftV24=craft;
craft=function(id){
 const before=!!state.gear?.coolingPack;_craftV24(id);ensurePowerStateV24();if(!before&&state.gear?.coolingPack){const e=playerHeldEquipmentV24('coolpack').slice(-1)[0];if(e){e.legacyImported=false;e.battery.chargeKWh=Math.min(e.battery.capacityKWh,.6);log('新製冷背包完成，但電池只有初始測試電量；需要安排充電。','major')}saveGame(false)}
};

const _openTradeV24=openTrade;
openTrade=function(id){
 ensurePowerStateV24();_openTradeV24(id);const n=state.npcs[id],host=$('tradeContent');if(!n||!host)return;
 const lend=playerHeldEquipmentV24('coolpack');const held=playerEquipmentV24('coolpack').filter(e=>e.holder===id);
 const rows=[...lend.map(e=>`<button data-loan-eq="${e.instanceId}" class="secondary">借出 ${equipmentNameV24(e)} · ${e.battery.chargeKWh.toFixed(1)}kWh</button>`),...held.map(e=>`<button data-return-eq="${e.instanceId}" class="secondary">取回 ${equipmentNameV24(e)} · 剩 ${e.battery.chargeKWh.toFixed(1)}kWh</button>`)].join('');
 if(rows)host.insertAdjacentHTML('beforeend',`<div class="equipment-loan-box"><h3>借用設備</h3><p class="muted">設備借出後仍屬於你，但會跟著 NPC 移動並持續耗電、耗損；歸還不會補滿。</p><div class="dialog-actions">${rows}</div></div>`);
 host.querySelectorAll('[data-loan-eq]').forEach(b=>b.onclick=()=>loanEquipmentV24(b.dataset.loanEq,id));host.querySelectorAll('[data-return-eq]').forEach(b=>b.onclick=()=>returnEquipmentV24(b.dataset.returnEq,id));
};

const _openInventoryV24=openInventory;
openInventory=function(){
 ensurePowerStateV24();_openInventoryV24();const host=$('inventoryContent');if(!host)return;const sources=sourceStateV24();
 const sourceHtml=Object.entries(sources).map(([id,s])=>`<div class="power-source ${s.available?'available':''}"><b>${s.name}</b><span>${s.maxOutputKW.toFixed(2)} kW</span><small>${locationLabelV24(s.location)} · ${s.available?'可用':'目前不可用'}${id==='generator'?` · 燃料 ${Math.floor(state.resources.fuel)}L`:''}</small></div>`).join('');
 const eq=playerEquipmentV24();const eqHtml=eq.length?eq.map(e=>{const t=equipmentTypeV24(e),m=equipmentModeV24(e),q=state.powerLogistics.charging.find(x=>x.equipmentId===e.instanceId),eligible=Object.entries(sources).filter(([,s])=>sourceCanReachEquipmentV24(s,e));return `<div class="equipment-instance"><div><span class="equipment-id">${e.instanceId}</span><h3>${equipmentNameV24(e)}</h3><p>持有人：<b>${holderLabelV24(e.holder)}</b>｜位置：${locationLabelV24(e.location)}｜可供 ${t?.maxUsers||1} 人</p></div><div class="equipment-energy"><b>${e.battery.chargeKWh.toFixed(2)} / ${e.battery.capacityKWh.toFixed(2)} kWh</b><span>${m?.label||e.mode} · 約 ${equipmentRuntimeHoursV24(e).toFixed(1)}h</span><small>狀況 ${Math.round(e.condition??100)}%</small></div><div class="equipment-actions">${q?`<span class="charge-state">充電中 · ${sources[q.sourceId]?.name||q.sourceId}</span><button data-stop-charge="${e.instanceId}" class="mini secondary">停止</button>`:eligible.map(([sid,s])=>`<button data-start-charge="${e.instanceId}" data-source="${sid}" class="mini secondary">接 ${s.name}</button>`).join('')||'<span class="muted">目前沒有可接入的電源</span>'}</div></div>`}).join(''):'<p class="muted">目前沒有可管理的獨立用電設備。</p>';
 host.insertAdjacentHTML('beforeend',`<h3>電力來源</h3><div class="power-source-grid">${sourceHtml}</div><h3>設備電量／持有狀態</h3><div class="equipment-instance-list">${eqHtml}</div><p class="muted">此區已改為實體設備資料：借用、歸還、充電都保留同一件設備的真實電量與狀況。</p>`);
 host.querySelectorAll('[data-start-charge]').forEach(b=>b.onclick=()=>startChargingV24(b.dataset.startCharge,b.dataset.source));host.querySelectorAll('[data-stop-charge]').forEach(b=>b.onclick=()=>stopChargingV24(b.dataset.stopCharge));
};

const _npcDailyV24=npcDaily;
npcDaily=function(){_npcDailyV24();updateLoanedEquipmentV24()};

const _showExpeditionResultV24=showExpeditionResult;
showExpeditionResult=function(result){
 ensurePowerStateV24();if(result&&!result._powerProcessed){result._powerProcessed=true;processChargingV24(result.actualTime||0);if(state.day>=30&&!result.retreated){const pack=bestPlayerCoolingV24();if(pack){const hours=result.actualTime||0,used=drainEquipmentV24(pack,hours,'normal');result.notes=result.notes||[];result.notes.push(`製冷背包實際耗電 ${used.toFixed(2)} kWh，剩餘 ${pack.battery.chargeKWh.toFixed(2)} kWh`)}}}
 _showExpeditionResultV24(result)
};

const _advanceV24=advance;
advance=function(){const elapsed=state.day>=30?24:Math.max(0,state.hoursLeft||0);_advanceV24();processChargingV24(elapsed);ensurePowerStateV24();saveGame(false)};

const _actionIssuesV24=actionIssues;
actionIssues=function(loc,e){
 let issues=_actionIssuesV24(loc,e).filter(x=>x!=='永晝缺少主動冷卻');if(state.day>=30){const pack=bestPlayerCoolingV24();if(!pack)issues.push('你手上沒有可用的主動製冷設備');else{const coverage=equipmentCoverageV24(pack,1,100,'walk');const needed=(equipmentModeV24(pack)?.powerKW||0)*(e.total||0);if(!coverage.ok)issues.push('目前製冷模式不足以穩定抵銷 100°C 行動熱負荷');if(pack.battery.chargeKWh+1e-6<needed)issues.push(`製冷背包電量不足，本次約需 ${needed.toFixed(1)}kWh`)}}return [...new Set(issues)]
};

ensurePowerStateV24();
