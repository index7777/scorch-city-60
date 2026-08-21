/* v14.2.2 QA — rescue travel accounting correction */
const _stopActionHoursV30=stopActionHoursV27;
stopActionHoursV27=function(stop){
 if(stop?.action!=='rescue')return _stopActionHoursV30(stop);
 const base=.75,f=rescueFeasibilityV29(stop);
 return base+(f?.mode==='escort'&&f?.leg?f.leg.hours:0);
};

const _executeNpcRescueV30=executeNpcRescueV29;
executeNpcRescueV29=function(stop){
 const f=rescueFeasibilityV29(stop);if(!f.ok){pauseItineraryV27(f.reason);return false}const {candidate:c,leg}=f;if(!c||!leg)return false;
 if(f.mode==='escort'){
  const assignments=f.escort.assignments||[];
  /* Escort travel is player time. Charging elsewhere continues while this leg happens. */
  processChargingV24(leg.hours);
  consumeRescueAssignmentsV29(assignments,leg.hours);
  if(state.day>=30)state.worldClock.endlessElapsed=clamp(state.worldClock.endlessElapsed+leg.hours,0,24);else state.hoursLeft=Math.max(0,Math.round((state.hoursLeft-leg.hours)*100)/100);
  completeNpcRescueV29(c.id,c.destination,'escort');
  ensureItineraryV27().current=c.destination;
  log(`雙人撤離段耗時 ${leg.hours.toFixed(1)}h；你與${state.npcs[c.id].name}一同抵達${locationLabelV24(c.destination)}。`,'major');
  return true
 }
 return _executeNpcRescueV30(stop)
};

/* Runner spends only the on-site rescue preparation before executeNpcRescueV29 handles escort travel. */
runItineraryStepV27=function(){
 const it=ensureItineraryV27(),home=mapStartId();if(it.status!=='running')return;
 if(it.index>=it.stops.length){const r=routeBetweenV27(it.current,home,it.routeMode);if(!r)return pauseItineraryV27('返程道路無法通行');const bad=itineraryUnknownBlockV27(r);if(bad){verifyRoad(bad[0],bad[1],'行程途中親眼確認');return pauseItineraryV27(`${roadName(roadKey(bad[0],bad[1]))}實際封閉，已重新標記；請重新計算返程。`)}const h=r.distance/itinerarySpeedV27(),pack=currentOutsideTempV26()>35?bestPlayerCoolingV24():null;if(!spendWorldTimeV26(h,{label:`返回${locationLabelV24(home)}`,coolingPack:pack}))return pauseItineraryV27('返程時間或熱防護不足');it.current=home;it.status='complete';log(`本時段排定行程完成，已返回${locationLabelV24(home)}。`,'major');render();renderMap();saveGame(false);return}
 const stop=it.stops[it.index],loc=mapLoc(stop.location),r=routeBetweenV27(it.current,stop.location,it.routeMode);if(!r)return pauseItineraryV27(`無法前往 ${loc?.name||stop.location}`);const bad=itineraryUnknownBlockV27(r);if(bad){verifyRoad(bad[0],bad[1],'行程途中親眼確認');return pauseItineraryV27(`${roadName(roadKey(bad[0],bad[1]))}與舊情報不符，實際已封閉。路線已停止，請重算。`)}
 const travel=r.distance/itinerarySpeedV27(),action=stop.action==='rescue'?.75:stopActionHoursV27(stop),pack=currentOutsideTempV26()>35?bestPlayerCoolingV24():null;if(!spendWorldTimeV26(travel+action,{label:`前往${loc.name}並執行行動`,coolingPack:pack}))return pauseItineraryV27('剩餘時間或熱防護不足');it.current=stop.location;it.index++;
 if(stop.action==='search')collectStopLootV27(loc);else if(stop.action==='scout'){state.intel[loc.id]={day:state.day,verifiedDay:state.day,summary:summarizeRemaining(state.locations[loc.id].remaining),source:'行程偵察',confidence:100};log(`你重新確認了${loc.name}的現況。`)}else if(stop.action==='asset'){discoverAssetsAt(loc.id);log(`你在${loc.name}完成大型設備盤點；實際搬運仍受載重與所有權限制。`)}else if(stop.action==='rescue'){if(!executeNpcRescueV29(stop))return}
 const encounterLoc=it.current, pair=npcEncounterAt(encounterLoc);if(pair){const [nid]=pair;if(!npcKnowledge(nid).tradeUnlocked){pauseItineraryV27(`${locationLabelV24(encounterLoc)}出現未完成的倖存者接觸事件`);setTimeout(()=>openNpcEncounter(nid),0);return}if(stop.action==='npc'){pauseItineraryV27(`正在與${npcPublicName(nid)}互動；完成後可繼續剩餘行程`);setTimeout(()=>openTrade(nid),0);return}}
 render();renderMap();saveGame(false);setTimeout(runItineraryStepV27,0)
};
