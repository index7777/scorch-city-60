function pointInCentralCooling(id){if(state.day<30||coolingReach()<=0)return false;const A=mapLoc(id),V=mapLoc('vent');return !!A&&Math.hypot(A.x-V.x,A.y-V.y)<=coolingReach()}
function pointNearColdStation(id){const A=mapLoc(id);if(!A)return false;return state.coldStations.some(cid=>{const C=mapLoc(cid);return C&&Math.hypot(A.x-C.x,A.y-C.y)<=12})}
function nodeHeatFactor(id){const l=mapLoc(id);if(!l)return 1;if(state.day<30&&state.phase==='night')return .12;let h=.55+(l.risk||0)*.28;if(id==='subway')h-=.35;if(pointInCentralCooling(id))h-=.5;if(pointNearColdStation(id))h-=.48;if(state.coldStations.includes(id))h-=.35;return clamp(h,.08,1.75)}
function computeMapRoute(target,mode='fastest'){
 const start=mapStartId();if(!mapLoc(target)||!mapLoc(start))return null;if(target===start)return {path:[start],distance:0,heat:0,cooling:0,fuel:0};
 const dist={},prev={},unvisited=new Set(locations.map(l=>l.id));locations.forEach(l=>dist[l.id]=Infinity);dist[start]=0;
 while(unvisited.size){let u=null,best=Infinity;for(const id of unvisited){if(dist[id]<best){best=dist[id];u=id}}if(u===null||best===Infinity)break;unvisited.delete(u);if(u===target)break;for(const v of mapNeighbors(u)){if(!unvisited.has(v))continue;if(roadKnownBlocked(u,v))continue;const km=edgeKm(u,v),heat=(nodeHeatFactor(u)+nodeHeatFactor(v))/2,rumor=roadRumorPenalty(u,v);const w=(mode==='safe'?km*(1+heat*.95):km)*rumor;const alt=dist[u]+w;if(alt<dist[v]){dist[v]=alt;prev[v]=u}}}
 if(!Number.isFinite(dist[target]))return null;const path=[];let cur=target;while(cur){path.unshift(cur);if(cur===start)break;cur=prev[cur]}if(path[0]!==start)return null;
 let distance=0,heatSum=0;for(let i=1;i<path.length;i++){const km=edgeKm(path[i-1],path[i]);distance+=km;heatSum+=km*(nodeHeatFactor(path[i-1])+nodeHeatFactor(path[i]))/2}
 const heat=distance?heatSum/distance:0;const cooling=state.day>=30?Math.max(1,Math.ceil(heatSum*2.4)):0;const fuel=state.gear.vehicle?Math.max(1,Math.ceil(distance*.55)):0;return {path,distance:Math.round(distance*10)/10,heat:Math.round(heat*100),cooling,fuel};
}
function routePoints(path){return (path||[]).map(id=>{const l=mapLoc(id);return l?`${l.x},${l.y}`:''}).filter(Boolean).join(' ')}
function routeHeatLabel(v){return v<=35?'低':v<=70?'中':v<=105?'高':'極高'}
function discoveredAssetsAt(id){return assetDefs.filter(a=>{const st=state.assets[a.id];return st&&st.discovered&&!st.transported&&st.location===id})}
function mapFilterPass(id){const f=state.mapPlanner?.filter||'all';if(f==='all')return true;if(f==='resources')return resourceRatio(id)>.12&&Object.keys(mapLoc(id)?.loot||{}).length>0;if(f==='assets')return discoveredAssetsAt(id).length>0;if(f==='cold')return state.coldStations.includes(id)||id==='vent'&&state.base.ventilation>0||pointInCentralCooling(id);if(f==='people')return districtPopulationAt(id)>0;if(f==='notes')return notesAt(id).length>0;return true}

function districtPopulationAt(id){
 let n=Object.values(state.settlements||{}).filter(s=>s.location===id).reduce((a,s)=>a+(s.population||0),0);
 if(id==='vent'||id==='base')n+=state.base.population||0;
 n+=Object.values(state.npcs||{}).filter(x=>x.alive&&x.location===id).length;
 return n;
}
function resourceRatio(id){
 const loc=mapLoc(id),rem=state.locations[id]?.remaining||{};
 const total=Object.values(loc?.loot||{}).reduce((a,b)=>a+(+b||0),0);
 if(!total)return 1;
 return clamp(Object.values(rem).reduce((a,b)=>a+(+b||0),0)/total,0,1);
}
function isEvacuatedMap(id){const s=Object.values(state.settlements||{}).find(x=>x.location===id);return !!s&&s.population<=0}
function isOccupiedMap(id){return districtPopulationAt(id)>0&&!isEvacuatedMap(id)}
function coolingReach(){
 if(state.base.core)return 34;
 let r=0;
 if(state.base.ventilation>=1)r=10;
 if(state.base.ventilation>=2)r=17;
 r+=Math.min(10,(state.coreProject?.stage||0)*1.15);
 return clamp(r,0,30);
}
function routeClass(a,b){
 const ri=roadIntelState(a,b);if(ri?.status==='blocked')return `route intel-blocked ${roadIntelConfidence(ri)<45?'stale-road':''}`;if(ri?.status==='danger')return 'route intel-danger';if(ri?.status==='repaired')return 'route intel-repaired';
 const ac=state.coldStations.includes(a)||a==='vent'&&state.base.ventilation>0;
 const bc=state.coldStations.includes(b)||b==='vent'&&state.base.ventilation>0;
 if(state.day>=30&&(ac||bc))return 'route cold-route';
 if(isEvacuatedMap(a)||isEvacuatedMap(b))return 'route evacuated-route';
 if(isOccupiedMap(a)||isOccupiedMap(b))return 'route occupied-route';
 return 'route';
}
function routeSvg(){
 const target=state.mapPlanner?.target,active=state.mapPlanner?.active&&target&&mapLoc(target);
 const fast=active?computeMapRoute(target,'fastest'):null,safe=active?computeMapRoute(target,'safe'):null,chosen=state.mapPlanner?.routeMode==='safe'?safe:fast,other=state.mapPlanner?.routeMode==='safe'?fast:safe;
 return `<svg class="world-network" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${MAP_ROUTES.map(([a,b])=>{const A=mapLoc(a),B=mapLoc(b);if(!A||!B)return'';return `<line class="${routeClass(a,b)}" x1="${A.x}" y1="${A.y}" x2="${B.x}" y2="${B.y}"/>`}).join('')}${state.coldStations.map(id=>{const A=mapLoc(id),B=mapLoc('vent');if(!A||!B)return'';return `<line class="route cold-route trunk" x1="${A.x}" y1="${A.y}" x2="${B.x}" y2="${B.y}"/>`}).join('')}${other&&other.path.length>1?`<polyline class="planned-route alt-plan" points="${routePoints(other.path)}"/>`:''}${chosen&&chosen.path.length>1?`<polyline class="planned-route selected-plan ${state.mapPlanner.routeMode==='safe'?'safe-plan':'fast-plan'}" points="${routePoints(chosen.path)}"/>`:''}</svg>`}
function mapHalos(){
 let html='';
 const vent=mapLoc('vent'),reach=coolingReach();
 if(state.day>=30&&reach>0)html+=`<span class="coverage central-coverage" style="left:${vent.x}%;top:${vent.y}%;--reach:${reach}%"></span>`;
 state.coldStations.forEach(id=>{const l=mapLoc(id);if(l)html+=`<span class="coverage cold-coverage" style="left:${l.x}%;top:${l.y}%"></span>`});
 Object.values(state.settlements||{}).forEach(s=>{const l=mapLoc(s.location);if(!l)return;html+=`<span class="settlement-glow ${s.population>0?'alive':'empty'}" style="left:${l.x}%;top:${l.y}%;--pop:${clamp((s.population||0)/12,.25,1)}"></span>`});
 return html;
}
function worldTransformationSummary(){
 const occupied=locations.filter(l=>isOccupiedMap(l.id)).length;
 const evacuated=locations.filter(l=>isEvacuatedMap(l.id)).length;
 const depleted=locations.filter(l=>resourceRatio(l.id)<.2&&Object.keys(l.loot||{}).length).length;
 const cold=state.coldStations.length+(state.base.ventilation>0?1:0);
 return `聚居 ${occupied} 區 · 撤離 ${evacuated} 區 · 低資源 ${depleted} 區 · 冷卻節點 ${cold}`;
}
function notesAt(id){return (state.mapNotes||[]).filter(n=>n.location===id)}
function noteTypeLabel(t){return ({water:'水源',asset:'設備',danger:'危險',route:'路線',todo:'待辦'}[t]||'筆記')}
function intelQualityLabel(i){if(!i)return '無';const c=roadIntelConfidence(i);return c>=80?'高':c>=55?'中':'低'}
