/* v14.2.2 QA — itinerary recovery / delay / cut-stop handling */
function itineraryRemainingEstimateV28(){
 const it=ensureItineraryV27(),speed=itinerarySpeedV27(),left=currentPeriodHoursLeftV26();
 let from=it.current||'base',travel=0,actions=0;const rows=[];
 for(let i=it.index;i<it.stops.length;i++){
  const stop=it.stops[i],r=routeBetweenV27(from,stop.location,it.routeMode);
  if(!r)return {ok:false,left,reason:`${mapLoc(from)?.name||from} 無法前往 ${mapLoc(stop.location)?.name||stop.location}`,rows};
  const th=r.distance/speed,ah=stopActionHoursV27(stop);travel+=th;actions+=ah;from=stop.location;
  const back=routeBetweenV27(from,'base',it.routeMode),returnHours=back?back.distance/speed:Infinity;
  const keepThrough=Math.round((travel+actions+returnHours)*100)/100;
  rows.push({index:i,stop,travelHours:th,actionHours:ah,keepThrough,canKeep:Number.isFinite(keepThrough)&&keepThrough<=left+1e-6});
 }
 const back=routeBetweenV27(from,'base',it.routeMode);if(!back&&it.index<it.stops.length)return {ok:false,left,reason:'剩餘行程完成後無法規劃返程',rows};
 const returnHours=back?back.distance/speed:0,total=Math.round((travel+actions+returnHours)*100)/100;
 return {ok:true,left,total,buffer:Math.round((left-total)*100)/100,travel:Math.round(travel*100)/100,actions:Math.round(actions*100)/100,returnHours:Math.round(returnHours*100)/100,rows};
}
function itineraryRecoveryStatusV28(){
 const it=ensureItineraryV27(),e=itineraryRemainingEstimateV28();
 if(!e.ok)return {severity:'blocked',...e};
 if(e.total<=e.left+1e-6)return {severity:'safe',...e};
 const lastKeep=[...e.rows].reverse().find(x=>x.canKeep);
 return {severity:'overrun',...e,lastKeepIndex:lastKeep?.index??null};
}
function removeRemainingStopV28(index){
 const it=ensureItineraryV27();if(index<it.index||index>=it.stops.length)return;
 it.stops.splice(index,1);it.lastMessage='已調整剩餘行程，正在重新計算。';it.status='paused';render();renderMap();saveGame(false)
}
function trimItineraryAfterV28(index){
 const it=ensureItineraryV27();if(index==null){it.stops=it.stops.slice(0,it.index)}else it.stops=it.stops.slice(0,index+1);
 it.lastMessage='已刪除來不及完成的後續站點。';it.status='paused';render();renderMap();saveGame(false)
}
function returnNowItineraryV28(){
 const it=ensureItineraryV27(),r=routeBetweenV27(it.current||'base','base',it.routeMode);if(!r)return toast('目前道路狀態無法安全規劃返程');
 const h=r.distance/itinerarySpeedV27(),pack=currentOutsideTempV26()>35?bestPlayerCoolingV24():null;
 if(!spendWorldTimeV26(h,{label:'中止行程並返回耐熱屋',coolingPack:pack}))return toast('剩餘時間或熱防護不足以返程');
 it.stops=it.stops.slice(0,it.index);it.current='base';it.status='complete';it.lastMessage='行程已提前中止並返回耐熱屋。';log('你取消了剩餘行程，優先返回耐熱屋。','major');render();renderMap();saveGame(false)
}
function applyItineraryDelayV28(hours,reason='突發事件'){
 const it=ensureItineraryV27();hours=Math.max(0,+hours||0);if(hours<=0)return true;
 const pack=currentOutsideTempV26()>35?bestPlayerCoolingV24():null;
 if(!spendWorldTimeV26(hours,{label:`事件延誤：${reason}`,coolingPack:pack})){
  pauseItineraryV27(`${reason}造成延誤，但目前熱防護或剩餘時間不足`);return false
 }
 it.status='paused';it.lastMessage=`${reason}造成 ${hours.toFixed(hours%1?1:0)}h 延誤；剩餘行程已重新計算。`;render();renderMap();saveGame(false);return true
}
function itineraryRecoveryHtmlV28(){
 const it=ensureItineraryV27();if(it.status!=='paused')return '';
 const s=itineraryRecoveryStatusV28(),where=locationLabelV24(it.current||'base');
 const head=`<div class="itinerary-recovery ${s.severity}"><div class="recovery-head"><span>行程重算</span><b>目前位置：${where}</b></div>`;
 if(!s.ok)return `${head}<div class="action-warning">${s.reason}</div><div class="planner-actions"><button id="itReturnNow">立即返程</button></div></div>`;
 const rows=s.rows.map(x=>{const l=mapLoc(x.stop.location),a=itineraryActionsV27(x.stop.location).find(v=>v[0]===x.stop.action);return `<div class="recovery-stop ${x.canKeep?'can-keep':'will-miss'}"><span>${x.index+1}</span><div><b>${l?.name||x.stop.location}</b><small>${a?.[1]||x.stop.action} · 若保留到此站並返程，共需 ${x.keepThrough.toFixed(1)}h</small></div><em>${x.canKeep?'可完成':'來不及'}</em><button class="mini secondary" data-recovery-drop="${x.index}">砍掉</button></div>`}).join('')||'<p class="muted">沒有剩餘站點，只需要規劃返程。</p>';
 const summary=s.severity==='safe'?`<div class="action-ready">事件後仍可完成剩餘行程。需要 ${s.total.toFixed(1)}h，緩衝 ${s.buffer.toFixed(1)}h。</div>`:`<div class="action-warning">剩餘 ${s.left.toFixed(1)}h，但原剩餘行程需要 ${s.total.toFixed(1)}h。至少超出 ${Math.abs(s.buffer).toFixed(1)}h。</div>`;
 const trim=s.severity==='overrun'?`<button id="itTrimFeasible" class="secondary">只保留能完成的站</button>`:'';
 return `${head}${summary}<div class="recovery-stop-list">${rows}</div><div class="planner-actions"><button id="itRecoveryContinue" ${s.severity==='overrun'?'disabled':''}>照新計畫繼續</button>${trim}<button id="itReturnNow" class="secondary">立即返程</button></div></div>`
}
const _plannerHtmlV28=itineraryPlannerHtmlV27;
itineraryPlannerHtmlV27=function(){const html=_plannerHtmlV28();return html.replace('</div>',`</div>${itineraryRecoveryHtmlV28()}`)};
const _bindItineraryV28=bindItineraryPlannerV27;
bindItineraryPlannerV27=function(){
 _bindItineraryV28();
 document.querySelectorAll('[data-recovery-drop]').forEach(b=>b.onclick=()=>removeRemainingStopV28(+b.dataset.recoveryDrop));
 if($('itTrimFeasible'))$('itTrimFeasible').onclick=()=>{const s=itineraryRecoveryStatusV28();trimItineraryAfterV28(s.lastKeepIndex)};
 if($('itReturnNow'))$('itReturnNow').onclick=returnNowItineraryV28;
 if($('itRecoveryContinue'))$('itRecoveryContinue').onclick=()=>{const s=itineraryRecoveryStatusV28();if(!s.ok||s.severity==='overrun')return toast('剩餘行程仍超出可用時間');startOrResumeItineraryV27()};
};
const _pauseItineraryV28=pauseItineraryV27;
pauseItineraryV27=function(message){_pauseItineraryV28(message);const s=itineraryRecoveryStatusV28();if(s.ok&&s.severity==='overrun')log(`行程受影響：剩餘 ${s.left.toFixed(1)}h，但後續含返程需要 ${s.total.toFixed(1)}h。請刪減站點。`,'major')};
