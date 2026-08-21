/* v14.2.2 QA — NPC rescue / cooling capacity / custody integration */
EQUIPMENT_TYPES_V24.coolingVehicle=EQUIPMENT_TYPES_V24.coolingVehicle||{name:'製冷工程車',maxUsers:3,battery:{capacityKWh:28,maxChargeKW:5,maxDischargeKW:6},modes:{normal:{label:'CABIN',powerKW:1.8,coolingKW:2.8},boost:{label:'BOOST',powerKW:3.2,coolingKW:4.6}},defaultMode:'normal'};

function rescueSafeDestinationV29(){return state.day>=30?(state.base?.ventilation>0?'vent':null):'base'}
function npcRescueStateV29(id){
 state.npcRescues=state.npcRescues||{};
 return state.npcRescues[id]||(state.npcRescues[id]={status:'none',rescuedDay:null,destination:null,method:null,equipmentId:null});
}
function rescueCandidateV29(locationId){
 const p=knownNpcPairV27(locationId);if(!p)return null;const [id,n]=p,r=npcRescueStateV29(id),dest=rescueSafeDestinationV29();
 if(!n.alive||r.status==='rescued'||(dest&&n.location===dest))return null;
 return {id,n,rescue:r,destination:dest};
}
function equipmentCoolingCapacityV29(e){const t=equipmentTypeV24(e),m=equipmentModeV24(e);return {users:t?.maxUsers||0,coolingKW:m?.coolingKW||0,powerKW:m?.powerKW||0,runtime:equipmentRuntimeHoursV24(e)}}
function activeRescueCoolingV29(){return playerHeldEquipmentV24().filter(e=>{const c=equipmentCoolingCapacityV29(e);return c.users>0&&c.coolingKW>0&&e.battery?.chargeKWh>.01})}
function rescueLegV29(locationId){const dest=rescueSafeDestinationV29();if(!dest)return null;const r=routeBetweenV27(locationId,dest,ensureItineraryV27().routeMode);if(!r)return null;return {route:r,hours:r.distance/itinerarySpeedV27(),destination:dest}}
function locationSafeCoolingV29(id){if(currentOutsideTempV26()<=35)return true;if(state.day>=30&&(id==='vent'&&state.base.ventilation>0||state.coldStations.includes(id)||pointInCentralCooling(id)||pointNearColdStation(id)))return true;return false}
function coolingAllocationV29(users,hours,excludeIds=[]){
 if(currentOutsideTempV26()<=35)return {ok:true,users,covered:users,assignments:[],reason:'環境不需要主動冷卻'};
 const gear=activeRescueCoolingV29().filter(e=>!excludeIds.includes(e.instanceId)).sort((a,b)=>{const A=equipmentCoolingCapacityV29(a),B=equipmentCoolingCapacityV29(b);return B.users-A.users||B.runtime-A.runtime});
 let covered=0;const assignments=[];
 for(const e of gear){const c=equipmentCoolingCapacityV29(e),energy=c.powerKW*hours;if(c.runtime+1e-6<hours||e.battery.chargeKWh+1e-6<energy)continue;assignments.push({equipment:e,users:c.users,energy});covered+=c.users;if(covered>=users)break}
 return {ok:covered>=users,users,covered,assignments,reason:covered>=users?'冷卻容量足夠':`需要同時保護 ${users} 人，目前可可靠覆蓋 ${covered} 人`};
}
function rescueFeasibilityV29(stop){
 const c=rescueCandidateV29(stop.location);if(!c)return {ok:false,kind:'none',reason:'目前沒有可撤離的已知 NPC'};
 if(!c.destination)return {ok:false,kind:'no-destination',candidate:c,reason:'100°C 永晝下尚未建立可接收人員的中央通風站安全區'};
 const leg=rescueLegV29(stop.location);if(!leg)return {ok:false,kind:'route',candidate:c,reason:'目前沒有可通往安全區的撤離路線'};
 const hot=currentOutsideTempV26()>35,escort=coolingAllocationV29(2,leg.hours),single=coolingAllocationV29(1,leg.hours);
 const mode=stop.rescueMode||'escort';
 if(!hot)return {ok:true,kind:'escort',mode:'escort',candidate:c,leg,escort,single,reason:'目前環境可雙人撤離，不需要主動冷卻'};
 if(mode==='escort')return {ok:escort.ok,kind:'escort',mode,candidate:c,leg,escort,single,reason:escort.ok?'玩家與 NPC 可同時獲得足夠冷卻':escort.reason};
 const loan=single.assignments[0];if(!loan)return {ok:false,kind:'loan',mode,candidate:c,leg,escort,single,reason:'沒有一件單人冷卻設備能讓 NPC 完成撤離'};
 const remaining=coolingAllocationV29(1,leg.hours,[loan.equipment.instanceId]),canStay=locationSafeCoolingV29(stop.location);
 if(!remaining.ok&&!canStay)return {ok:false,kind:'loan',mode,candidate:c,leg,escort,single,loan,reason:'可以把設備借給 NPC，但借出後你自己沒有足夠冷卻返程，而且目前地點不是安全冷卻區'};
 return {ok:true,kind:'loan',mode,candidate:c,leg,escort,single,loan,playerReturn:remaining,canStay,reason:canStay&&!remaining.ok?'NPC 可帶設備先撤離；你必須留在目前安全冷卻區':'NPC 可借用一套設備撤離，你仍保有自己的返程冷卻'};
}

const _itineraryActionsV29=itineraryActionsV27;
itineraryActionsV27=function(id){const out=_itineraryActionsV29(id);if(rescueCandidateV29(id))out.push(['rescue','救援／撤離 NPC',.75]);return out};

const _itineraryEstimateBaseV29=itineraryEstimateV27;
itineraryEstimateV27=function(){
 const it=ensureItineraryV27(),speed=itinerarySpeedV27(),home=mapStartId();let from=home,travel=0,actions=0,legs=[],rescueIssues=[];
 for(const stop of it.stops){const r=routeBetweenV27(from,stop.location,it.routeMode);if(!r)return {ok:false,reason:`${mapLoc(from)?.name||from} 無法前往 ${mapLoc(stop.location)?.name||stop.location}`};const th=r.distance/speed,ah=stopActionHoursV27(stop);travel+=th;actions+=ah;legs.push({from,to:stop.location,route:r,travel:th,action:ah});if(stop.action==='rescue'){const f=rescueFeasibilityV29(stop);if(!f.ok)rescueIssues.push({stop,f})}from=stop.location}
 if(it.stops.length){const r=routeBetweenV27(from,home,it.routeMode);if(!r)return {ok:false,reason:'目前道路情報下無法規劃返程'};const th=r.distance/speed;travel+=th;legs.push({from,to:home,route:r,travel:th,action:0})}
 const total=Math.round((travel+actions)*100)/100,left=currentPeriodHoursLeftV26();return {ok:!rescueIssues.length,total,travel:Math.round(travel*100)/100,actions:Math.round(actions*100)/100,left,buffer:Math.round((left-total)*100)/100,legs,mode:itineraryModeV27(),rescueIssues,reason:rescueIssues[0]?.f?.reason||''};
};

function rescuePlannerHtmlV29(){
 const it=ensureItineraryV27(),rows=it.stops.map((s,i)=>{if(s.action!=='rescue')return '';const f=rescueFeasibilityV29(s),c=f.candidate;if(!c)return `<div class="rescue-check bad"><b>第 ${i+1} 站救援</b><span>${f.reason}</span></div>`;const packs=activeRescueCoolingV29().map(e=>`${equipmentNameV24(e)} ${e.instanceId} · ${e.battery.chargeKWh.toFixed(2)}kWh · ${equipmentTypeV24(e)?.maxUsers||1}人`).join('；')||'無';return `<div class="rescue-check ${f.ok?'ok':'bad'}"><div><span>第 ${i+1} 站 NPC 救援</span><b>${npcPublicName(c.id)} → ${locationLabelV24(c.destination||'')}</b></div><div class="rescue-modes"><label><input type="radio" name="rescueMode${i}" data-rescue-mode="${i}" value="escort" ${(s.rescueMode||'escort')==='escort'?'checked':''}> 同行撤離（同時保護 2 人）</label><label><input type="radio" name="rescueMode${i}" data-rescue-mode="${i}" value="loan" ${s.rescueMode==='loan'?'checked':''}> 先借設備給 NPC 自行撤離</label></div><p class="${f.ok?'action-ready':'action-warning'}">${f.reason}</p><small>目前可調度冷卻：${packs}</small>${f.leg?`<small>撤離段約 ${f.leg.hours.toFixed(1)}h · ${f.leg.route.distance.toFixed(1)}km</small>`:''}</div>`}).join('');return rows?`<section class="rescue-planner"><h3>NPC 撤離檢查</h3>${rows}</section>`:'';
}
const _itineraryPlannerHtmlV29=itineraryPlannerHtmlV27;
itineraryPlannerHtmlV27=function(){let html=_itineraryPlannerHtmlV29();const extra=rescuePlannerHtmlV29();if(extra)html=html.replace('<div class="planner-actions">',extra+'<div class="planner-actions">');return html};
const _bindItineraryV29=bindItineraryPlannerV27;
bindItineraryPlannerV27=function(){_bindItineraryV29();document.querySelectorAll('[data-rescue-mode]').forEach(x=>x.onchange=()=>{const s=ensureItineraryV27().stops[+x.dataset.rescueMode];if(s){s.rescueMode=x.value;renderMap();saveGame(false)}})};

function loanEquipmentForRescueV29(e,npcId){const n=state.npcs[npcId];if(!e||!n||e.holder!=='player')return false;stopChargingV24(e.instanceId,true);e.holder=npcId;e.location=n.location;e.assignedUsers=[npcId];e.loan={borrower:npcId,startDay:state.day,startChargeKWh:e.battery.chargeKWh,state:'active',purpose:'rescue'};return true}
function consumeRescueAssignmentsV29(assignments,hours){for(const a of assignments||[])drainEquipmentV24(a.equipment,hours,a.equipment.mode)}
function completeNpcRescueV29(id,destination,method,equipmentId=null){const n=state.npcs[id],r=npcRescueStateV29(id);if(!n)return;n.location=destination;r.status='rescued';r.rescuedDay=state.day;r.destination=destination;r.method=method;r.equipmentId=equipmentId;if(method==='escort'){for(const e of playerEquipmentV24())if(e.holder===id&&e.loan?.purpose==='rescue'){e.holder='player';e.location=destination;e.assignedUsers=['player'];e.loan={...e.loan,state:'returned',returnDay:state.day,endChargeKWh:e.battery.chargeKWh}}}log(`${n.name}已撤離至${locationLabelV24(destination)}。`,'major')}
function executeNpcRescueV29(stop){
 const f=rescueFeasibilityV29(stop);if(!f.ok){pauseItineraryV27(f.reason);return false}const {candidate:c,leg}=f;if(!c||!leg)return false;
 if(f.mode==='escort'){
  consumeRescueAssignmentsV29(f.escort.assignments,leg.hours);completeNpcRescueV29(c.id,c.destination,'escort');return true
 }
 const e=f.loan?.equipment;if(!e||!loanEquipmentForRescueV29(e,c.id)){pauseItineraryV27('無法把指定冷卻設備交給 NPC');return false}
 drainEquipmentV24(e,leg.hours,e.mode);completeNpcRescueV29(c.id,c.destination,'loan',e.instanceId);e.location=c.destination;
 log(`${equipmentNameV24(e)}仍由${state.npcs[c.id].name}持有，剩餘 ${e.battery.chargeKWh.toFixed(2)} kWh；之後必須實際取回。`,'major');return true
}

/* Replaces the v27 runner so rescue is an actual itinerary action and home follows mapStartId(). */
runItineraryStepV27=function(){
 const it=ensureItineraryV27(),home=mapStartId();if(it.status!=='running')return;
 if(it.index>=it.stops.length){const r=routeBetweenV27(it.current,home,it.routeMode);if(!r)return pauseItineraryV27('返程道路無法通行');const bad=itineraryUnknownBlockV27(r);if(bad){verifyRoad(bad[0],bad[1],'行程途中親眼確認');return pauseItineraryV27(`${roadName(roadKey(bad[0],bad[1]))}實際封閉，已重新標記；請重新計算返程。`)}const h=r.distance/itinerarySpeedV27(),pack=currentOutsideTempV26()>35?bestPlayerCoolingV24():null;if(!spendWorldTimeV26(h,{label:`返回${locationLabelV24(home)}`,coolingPack:pack}))return pauseItineraryV27('返程時間或熱防護不足');it.current=home;it.status='complete';log(`本時段排定行程完成，已返回${locationLabelV24(home)}。`,'major');render();renderMap();saveGame(false);return}
 const stop=it.stops[it.index],loc=mapLoc(stop.location),r=routeBetweenV27(it.current,stop.location,it.routeMode);if(!r)return pauseItineraryV27(`無法前往 ${loc?.name||stop.location}`);const bad=itineraryUnknownBlockV27(r);if(bad){verifyRoad(bad[0],bad[1],'行程途中親眼確認');return pauseItineraryV27(`${roadName(roadKey(bad[0],bad[1]))}與舊情報不符，實際已封閉。路線已停止，請重算。`)}
 const travel=r.distance/itinerarySpeedV27(),action=stopActionHoursV27(stop),pack=currentOutsideTempV26()>35?bestPlayerCoolingV24():null;if(!spendWorldTimeV26(travel+action,{label:`前往${loc.name}並執行行動`,coolingPack:pack}))return pauseItineraryV27('剩餘時間或熱防護不足');it.current=stop.location;it.index++;
 if(stop.action==='search')collectStopLootV27(loc);else if(stop.action==='scout'){state.intel[loc.id]={day:state.day,verifiedDay:state.day,summary:summarizeRemaining(state.locations[loc.id].remaining),source:'行程偵察',confidence:100};log(`你重新確認了${loc.name}的現況。`)}else if(stop.action==='asset'){discoverAssetsAt(loc.id);log(`你在${loc.name}完成大型設備盤點；實際搬運仍受載重與所有權限制。`)}else if(stop.action==='rescue'){if(!executeNpcRescueV29(stop))return}
 const pair=npcEncounterAt(loc.id);if(pair){const [nid]=pair;if(!npcKnowledge(nid).tradeUnlocked){pauseItineraryV27(`${loc.name}出現未完成的倖存者接觸事件`);setTimeout(()=>openNpcEncounter(nid),0);return}if(stop.action==='npc'){pauseItineraryV27(`正在與${npcPublicName(nid)}互動；完成後可繼續剩餘行程`);setTimeout(()=>openTrade(nid),0);return}}
 render();renderMap();saveGame(false);setTimeout(runItineraryStepV27,0)
};

/* Recovery calculations use the real current safe hub instead of always assuming the starter house. */
itineraryRemainingEstimateV28=function(){
 const it=ensureItineraryV27(),speed=itinerarySpeedV27(),left=currentPeriodHoursLeftV26(),home=mapStartId();let from=it.current||home,travel=0,actions=0;const rows=[];
 for(let i=it.index;i<it.stops.length;i++){const stop=it.stops[i],r=routeBetweenV27(from,stop.location,it.routeMode);if(!r)return {ok:false,left,reason:`${mapLoc(from)?.name||from} 無法前往 ${mapLoc(stop.location)?.name||stop.location}`,rows};const th=r.distance/speed,ah=stopActionHoursV27(stop);travel+=th;actions+=ah;from=stop.location;const back=routeBetweenV27(from,home,it.routeMode),returnHours=back?back.distance/speed:Infinity,keepThrough=Math.round((travel+actions+returnHours)*100)/100;rows.push({index:i,stop,travelHours:th,actionHours:ah,keepThrough,canKeep:Number.isFinite(keepThrough)&&keepThrough<=left+1e-6})}
 const back=routeBetweenV27(from,home,it.routeMode);if(!back&&it.index<it.stops.length)return {ok:false,left,reason:'剩餘行程完成後無法規劃返程',rows};const returnHours=back?back.distance/speed:0,total=Math.round((travel+actions+returnHours)*100)/100;return {ok:true,left,total,buffer:Math.round((left-total)*100)/100,travel:Math.round(travel*100)/100,actions:Math.round(actions*100)/100,returnHours:Math.round(returnHours*100)/100,rows};
};
returnNowItineraryV28=function(){const it=ensureItineraryV27(),home=mapStartId(),r=routeBetweenV27(it.current||home,home,it.routeMode);if(!r)return toast('目前道路狀態無法安全規劃返程');const h=r.distance/itinerarySpeedV27(),pack=currentOutsideTempV26()>35?bestPlayerCoolingV24():null;if(!spendWorldTimeV26(h,{label:`中止行程並返回${locationLabelV24(home)}`,coolingPack:pack}))return toast('剩餘時間或熱防護不足以返程');it.stops=it.stops.slice(0,it.index);it.current=home;it.status='complete';it.lastMessage=`行程已提前中止並返回${locationLabelV24(home)}。`;log(it.lastMessage,'major');render();renderMap();saveGame(false)};

const _startItineraryV29=startOrResumeItineraryV27;
startOrResumeItineraryV27=function(){const it=ensureItineraryV27(),e=itineraryEstimateV27();if(!e.ok)return toast(e.reason||'救援或路線條件未達成');if(e.buffer<0)return toast('本時段時間不足');if(it.status!=='paused'){it.index=0;it.current=mapStartId()}it.status='running';it.lastMessage='';runItineraryStepV27()};

ensureItineraryV27();
