/* v14.2.2 QA — multi-stop period itinerary planner */
function ensureItineraryV27(){
 state.itinerary=state.itinerary||{schema:1,stops:[],routeMode:'fastest',status:'planning',index:0,current:'base',lastMessage:''};
 state.itinerary.stops=Array.isArray(state.itinerary.stops)?state.itinerary.stops:[];
 return state.itinerary;
}
function routeBetweenV27(start,target,mode='fastest'){
 if(!mapLoc(start)||!mapLoc(target))return null;if(start===target)return {path:[start],distance:0,heat:0};
 const dist={},prev={},todo=new Set(locations.map(l=>l.id));locations.forEach(l=>dist[l.id]=Infinity);dist[start]=0;
 while(todo.size){let u=null,best=Infinity;for(const id of todo){if(dist[id]<best){best=dist[id];u=id}}if(u===null||best===Infinity)break;todo.delete(u);if(u===target)break;
  for(const v of mapNeighbors(u)){if(!todo.has(v)||roadKnownBlocked(u,v))continue;const km=edgeKm(u,v),heat=(nodeHeatFactor(u)+nodeHeatFactor(v))/2,rumor=roadRumorPenalty(u,v),w=(mode==='safe'?km*(1+heat*.95):km)*rumor,alt=dist[u]+w;if(alt<dist[v]){dist[v]=alt;prev[v]=u}}
 }
 if(!Number.isFinite(dist[target]))return null;const path=[];let cur=target;while(cur){path.unshift(cur);if(cur===start)break;cur=prev[cur]}if(path[0]!==start)return null;
 let distance=0,heatSum=0;for(let i=1;i<path.length;i++){const km=edgeKm(path[i-1],path[i]);distance+=km;heatSum+=km*(nodeHeatFactor(path[i-1])+nodeHeatFactor(path[i]))/2}
 return {path,distance:Math.round(distance*10)/10,heat:distance?Math.round(heatSum/distance*100):0};
}
function itineraryModeV27(){return availableTransportModes().slice(-1)[0]?.[0]||'foot'}
function itinerarySpeedV27(){const m=itineraryModeV27();return m==='vehicle'?24:m==='cart'?5:4.5}
function knownNpcPairV27(id){const p=npcEncounterAt(id);if(!p)return null;return npcKnowledge(p[0]).roleKnown?p:null}
function itineraryActionsV27(id){const out=[['search','搜索',timeCostFor(mapLoc(id))],['scout','偵察／確認情報',.5]];const p=knownNpcPairV27(id);if(p)out.push(['npc',`與${npcPublicName(p[0])}互動`,.5]);if(discoveredAssetsAt(id).length)out.push(['asset','處理大型設備',1.25]);return out}
function stopActionHoursV27(stop){return itineraryActionsV27(stop.location).find(x=>x[0]===stop.action)?.[2]??.5}
function itineraryEstimateV27(){
 const it=ensureItineraryV27(),speed=itinerarySpeedV27();let from='base',travel=0,actions=0,legs=[];
 for(const stop of it.stops){const r=routeBetweenV27(from,stop.location,it.routeMode);if(!r)return {ok:false,reason:`${mapLoc(from)?.name||from} 無法前往 ${mapLoc(stop.location)?.name||stop.location}`};const th=r.distance/speed,ah=stopActionHoursV27(stop);travel+=th;actions+=ah;legs.push({from,to:stop.location,route:r,travel:th,action:ah});from=stop.location}
 if(it.stops.length){const r=routeBetweenV27(from,'base',it.routeMode);if(!r)return {ok:false,reason:'目前道路情報下無法規劃返程'};const th=r.distance/speed;travel+=th;legs.push({from,to:'base',route:r,travel:th,action:0})}
 const total=Math.round((travel+actions)*100)/100,left=currentPeriodHoursLeftV26();return {ok:true,total,travel:Math.round(travel*100)/100,actions:Math.round(actions*100)/100,left,buffer:Math.round((left-total)*100)/100,legs,mode:itineraryModeV27()};
}
function addItineraryStopV27(id){const it=ensureItineraryV27();if(!mapLoc(id)||id==='base')return;it.stops.push({id:`stop_${Date.now()}_${it.stops.length}`,location:id,action:'search'});it.status='planning';state.mapPlanner.active=true;state.mapPlanner.target=id;renderMap();saveGame(false)}
function moveItineraryStopV27(i,d){const it=ensureItineraryV27(),j=i+d;if(j<0||j>=it.stops.length)return;[it.stops[i],it.stops[j]]=[it.stops[j],it.stops[i]];renderMap();saveGame(false)}
function removeItineraryStopV27(i){ensureItineraryV27().stops.splice(i,1);renderMap();saveGame(false)}
function clearItineraryV27(){const it=ensureItineraryV27();it.stops=[];it.status='planning';it.index=0;it.current='base';renderMap();saveGame(false)}
function itineraryPathSegmentsV27(){const e=itineraryEstimateV27();if(!e.ok)return '';return e.legs.flatMap(l=>(l.route.path||[]).slice(1).map((id,i)=>`<line class="planned-route selected-plan itinerary-plan" data-plan-a="${l.route.path[i]}" data-plan-b="${id}" x1="0" y1="0" x2="0" y2="0"/>`)).join('')}
const _routeSvgV27=routeSvg;
routeSvg=function(){const base=_routeSvgV27();if(!ensureItineraryV27().stops.length)return base;return base.replace('</svg>',itineraryPathSegmentsV27()+'</svg>')};
function itineraryPlannerHtmlV27(){
 const it=ensureItineraryV27(),e=itineraryEstimateV27();
 const rows=it.stops.map((s,i)=>{const l=mapLoc(s.location),opts=itineraryActionsV27(s.location);return `<div class="itinerary-stop"><div class="itinerary-order">${i+1}</div><div class="itinerary-stop-main"><b>${l?.name||s.location}</b><select data-it-action="${i}">${opts.map(o=>`<option value="${o[0]}" ${s.action===o[0]?'selected':''}>${o[1]} · ${o[2]}h</option>`).join('')}</select></div><div class="itinerary-stop-tools"><button class="mini secondary" data-it-up="${i}" ${i===0?'disabled':''}>上移</button><button class="mini secondary" data-it-down="${i}" ${i===it.stops.length-1?'disabled':''}>下移</button><button class="mini secondary" data-it-del="${i}">移除</button></div></div>`}).join('')||'<p class="muted">點選地圖節點，把今晚要去的地點依序加入行程。</p>';
 const summary=e.ok?`<div class="itinerary-summary"><span>移動 <b>${e.travel}h</b></span><span>地點行動 <b>${e.actions}h</b></span><span>總計 <b>${e.total}h</b></span><span class="${e.buffer<0?'bad':''}">緩衝 <b>${e.buffer}h</b></span></div>`:`<div class="action-warning">${e.reason}</div>`;
 const status=it.status==='paused'?`<div class="action-warning">行程暫停：${it.lastMessage||'等待玩家處理事件'}</div>`:it.status==='complete'?'<div class="action-ready">本時段排定行程已完成並返回耐熱屋。</div>':'';
 return `<div class="planner-head"><div><span>PERIOD ROUTE</span><b>${currentPeriodLabelV26()}行程規劃</b></div><button id="closePlanner" class="mini">收合</button></div><p class="muted">路線規劃代表整個時段怎麼走。已知 NPC 可排互動；未知人物不會預先洩漏，到站後才觸發接觸。</p><div class="itinerary-stops">${rows}</div>${summary}${status}<div class="itinerary-route-mode"><button data-it-mode="fastest" class="mini ${it.routeMode==='fastest'?'active':''}">最快</button><button data-it-mode="safe" class="mini ${it.routeMode==='safe'?'active':''}">低熱</button></div><div class="planner-actions"><button id="itineraryStart" ${!it.stops.length||!e.ok||e.buffer<0||it.status==='running'?'disabled':''}>${it.status==='paused'?'繼續行程':'開始整段行程'}</button><button id="itineraryClear" class="secondary" ${!it.stops.length?'disabled':''}>清空</button></div>`;
}
mapPlannerHtml=function(){return state.mapPlanner?.active?itineraryPlannerHtmlV27():''};
function bindItineraryPlannerV27(){
 document.querySelectorAll('[data-it-action]').forEach(x=>x.onchange=()=>{ensureItineraryV27().stops[+x.dataset.itAction].action=x.value;renderMap();saveGame(false)});
 document.querySelectorAll('[data-it-up]').forEach(x=>x.onclick=()=>moveItineraryStopV27(+x.dataset.itUp,-1));document.querySelectorAll('[data-it-down]').forEach(x=>x.onclick=()=>moveItineraryStopV27(+x.dataset.itDown,1));document.querySelectorAll('[data-it-del]').forEach(x=>x.onclick=()=>removeItineraryStopV27(+x.dataset.itDel));document.querySelectorAll('[data-it-mode]').forEach(x=>x.onclick=()=>{ensureItineraryV27().routeMode=x.dataset.itMode;state.mapPlanner.routeMode=x.dataset.itMode;renderMap();saveGame(false)});
 if($('itineraryClear'))$('itineraryClear').onclick=clearItineraryV27;if($('itineraryStart'))$('itineraryStart').onclick=startOrResumeItineraryV27;
}
const _bindMapPlannerV27=bindMapPlanner;
bindMapPlanner=function(){_bindMapPlannerV27();bindItineraryPlannerV27()};
const _renderMapV27=renderMap;
renderMap=function(){_renderMapV27();document.querySelectorAll('.node').forEach(n=>n.onclick=()=>{if(state.mapPlanner?.active)addItineraryStopV27(n.dataset.id);else openLocation(n.dataset.id)});requestAnimationFrame(syncMapNetworkGeometryV23)};
function itineraryUnknownBlockV27(route){for(let i=1;i<(route?.path?.length||0);i++){const a=route.path[i-1],b=route.path[i],w=roadWorldState(a,b),k=roadIntelState(a,b);if(w.status==='blocked'&&(!k||k.status!=='blocked'||roadIntelConfidence(k)<70))return [a,b]}return null}
function collectStopLootV27(loc){let cap=cargoCapacityKg(),used=0,gain={},rem=state.locations[loc.id].remaining;for(const k of RES_ORDER){const av=rem[k]||0;if(av<=0||cap-used<=.05)continue;const w=RES_WEIGHT[k]||1,max=Math.floor((cap-used)/w);if(max<=0)continue;const take=Math.min(av,max);rem[k]-=take;state.resources[k]+=take;gain[k]=take;used+=take*w}state.locations[loc.id].searched=true;state.intel[loc.id]={day:state.day,verifiedDay:state.day,summary:summarizeRemaining(rem),source:'行程實地搜索',confidence:100};discoverAssetsAt(loc.id);tutorialWaterGain(gain);log(`${loc.name}行程搜索：${Object.entries(gain).map(([k,v])=>`${RES_LABELS[k]||k}+${v}`).join('、')||'沒有實質收穫'}。`,'good')}
function pauseItineraryV27(message){const it=ensureItineraryV27();it.status='paused';it.lastMessage=message;renderMap();saveGame(false)}
function startOrResumeItineraryV27(){const it=ensureItineraryV27(),e=itineraryEstimateV27();if(!e.ok||e.buffer<0)return toast(e.reason||'本時段時間不足');if(it.status!=='paused'){it.index=0;it.current='base'}it.status='running';it.lastMessage='';runItineraryStepV27()}
function runItineraryStepV27(){
 const it=ensureItineraryV27();if(it.status!=='running')return;
 if(it.index>=it.stops.length){const r=routeBetweenV27(it.current,'base',it.routeMode);if(!r)return pauseItineraryV27('返程道路無法通行');const bad=itineraryUnknownBlockV27(r);if(bad){verifyRoad(bad[0],bad[1],'行程途中親眼確認');return pauseItineraryV27(`${roadName(roadKey(bad[0],bad[1]))}實際封閉，已重新標記；請重新計算返程。`)}const h=r.distance/itinerarySpeedV27();const pack=currentOutsideTempV26()>35?bestPlayerCoolingV24():null;if(!spendWorldTimeV26(h,{label:'返回耐熱屋',coolingPack:pack}))return pauseItineraryV27('返程時間不足');it.current='base';it.status='complete';log('本時段排定行程完成，已返回耐熱屋。','major');render();renderMap();saveGame(false);return}
 const stop=it.stops[it.index],loc=mapLoc(stop.location),r=routeBetweenV27(it.current,stop.location,it.routeMode);if(!r)return pauseItineraryV27(`無法前往 ${loc?.name||stop.location}`);const bad=itineraryUnknownBlockV27(r);if(bad){verifyRoad(bad[0],bad[1],'行程途中親眼確認');return pauseItineraryV27(`${roadName(roadKey(bad[0],bad[1]))}與舊情報不符，實際已封閉。路線已停止，請重算。`)}
 const travel=r.distance/itinerarySpeedV27(),action=stopActionHoursV27(stop),pack=currentOutsideTempV26()>35?bestPlayerCoolingV24():null;if(!spendWorldTimeV26(travel+action,{label:`前往${loc.name}並執行行動`,coolingPack:pack}))return pauseItineraryV27('剩餘時間或熱防護不足');it.current=stop.location;it.index++;
 if(stop.action==='search')collectStopLootV27(loc);else if(stop.action==='scout'){state.intel[loc.id]={day:state.day,verifiedDay:state.day,summary:summarizeRemaining(state.locations[loc.id].remaining),source:'行程偵察',confidence:100};log(`你重新確認了${loc.name}的現況。`)}else if(stop.action==='asset'){discoverAssetsAt(loc.id);log(`你在${loc.name}完成大型設備盤點；實際搬運仍受載重與所有權限制。`)}
 const pair=npcEncounterAt(loc.id);if(pair){const [nid]=pair;if(!npcKnowledge(nid).tradeUnlocked){pauseItineraryV27(`${loc.name}出現未完成的倖存者接觸事件`);setTimeout(()=>openNpcEncounter(nid),0);return}if(stop.action==='npc'){pauseItineraryV27(`正在與${npcPublicName(nid)}互動；完成後可繼續剩餘行程`);setTimeout(()=>openTrade(nid),0);return}}
 render();renderMap();saveGame(false);setTimeout(runItineraryStepV27,0)
}
/* The map itself is the operation entry. Remove the redundant Action Center button. */
if($('actionCenterBtn'))$('actionCenterBtn').classList.add('progressive-hidden');
const _openLocationV27=openLocation;
openLocation=function(id){_openLocationV27(id);if($('planLoc')){$('planLoc').textContent='加入本時段行程';$('planLoc').onclick=()=>{$('locationDialog').close();state.mapPlanner.active=true;addItineraryStopV27(id)}}};
ensureItineraryV27();