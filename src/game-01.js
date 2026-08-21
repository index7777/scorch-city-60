const DISTRICT_TAGS={
 homes:['低風險','飲水','食物'],store:['中風險','食物','電池'],school:['低風險','人口','水'],clinic:['中風險','醫療','情報'],
 hardware:['中風險','零件','工具'],warehouse:['高價值','大量物資','大型資產'],fire:['高價值','工程車','水泵'],subway:['永晝節點','地下','冷站'],
 industrial:['極高風險','壓縮機','冷媒'],coldstore:['高風險','冷卻設備','食物'],research:['高價值','科技','核心情報'],solar:['高風險','電力','逆變器'],vent:['終局','中央站','工程']
};
function sceneMode(){return state?.day>=30?'endless':state?.phase==='night'?'night':'day'}
function locationThumbArt(id){return DISTRICT_ART[id]||DISTRICT_ART.homes}
function locationArt(id){const m=DISTRICT_MASTER[id];return m?.[sceneMode()]||locationThumbArt(id)}
function preloadScene(id){const src=locationArt(id);if(!src)return;const im=new Image();im.decoding='async';im.src=src}
function locationTags(id){return DISTRICT_TAGS[id]||['未知','待探索']}
function remainingLootScore(id){const rem=state.locations[id]?.remaining||{};return Object.values(rem).reduce((a,b)=>a+(+b||0),0)}
function sceneStatusTags(id){
 const tags=[];
 const locState=state.locations[id];
 if(locState?.searched) tags.push(remainingLootScore(id)<=6?'已搜空':'已搜索');
 const settlement=Object.values(state.settlements||{}).find(s=>s.location===id);
 if(settlement){
   if(settlement.population>0) tags.push(`聚落 ${settlement.population}人`);
   else tags.push('已撤離');
 }
 if(id==='vent'&&state.base.population>0) tags.push(`中央站 ${state.base.population}人`);
 if(state.day>=30&&state.coldStations?.includes(id)) tags.push('冷站');
 const assetCount=assetDefs.filter(a=>{const st=state.assets[a.id];return st&&st.location===id&&!st.transported}).length;
 if(assetCount) tags.push(`大型資產 ${assetCount}`);
 if(state.intel[id]&&!locState?.searched) tags.push('有情報');
 districtHistoryTags(id).forEach(t=>tags.push(t));
 return tags.slice(0,5);
}
function sceneBadge(id){return DISTRICT_MASTER[id]?'2K MASTER':'DISTRICT ART'}
function sceneStatusHtml(id){const tags=sceneStatusTags(id);return tags.length?`<div class="tag-row scene-status">${tags.map(t=>`<span class="tag status-tag">${t}</span>`).join('')}</div>`:''}
const STATE_OVERLAYS={scavenged:'assets/overlays/state_scavenged.webp',occupied:'assets/overlays/state_occupied.webp',evacuated:'assets/overlays/state_evacuated.webp',coldstation:'assets/overlays/state_coldstation.webp'};
function sceneVisualStates(id){
 const out=[]; const locState=state.locations[id]; const settlement=Object.values(state.settlements||{}).find(s=>s.location===id);
 if(locState?.searched) out.push('scavenged');
 if(settlement){if(settlement.population>0) out.push('occupied'); else out.push('evacuated')}
 if(id==='vent'&&state.base.population>2) out.push('occupied');
 if(state.coldStations?.includes(id)) out.push('coldstation');
 return [...new Set(out)];
}
function sceneOverlayHtml(id){return sceneVisualStates(id).map(s=>`<img class="scene-state-overlay state-${s}" src="${STATE_OVERLAYS[s]}" alt="" aria-hidden="true" decoding="async">`).join('')}
function sceneClass(id){const states=sceneVisualStates(id);return states.length?' has-'+states.join(' has-'):''}
const DISTRICT_HISTORY_OVERLAYS={
 industrial_removed:'assets/overlays/district/industrial_removed.webp',
 warehouse_depleted:'assets/overlays/district/warehouse_depleted.webp',
 clinic_blackout:'assets/overlays/district/clinic_blackout.webp',
 vent_crowded:'assets/overlays/district/vent_crowded.webp',
 vent_coreworks:'assets/overlays/district/vent_coreworks.webp'
};
function locationLootRatio(id){
 const loc=locations.find(l=>l.id===id), rem=state.locations[id]?.remaining||{};
 const total=Object.values(loc?.loot||{}).reduce((a,b)=>a+(+b||0),0); if(!total)return 1;
 return clamp(Object.values(rem).reduce((a,b)=>a+(+b||0),0)/total,0,1);
}
function districtHistoryStates(id){
 const out=[];
 if(id==='industrial'){
   const removed=['compressorA','compressorB'].filter(a=>state.assets[a]?.transported||state.assets[a]?.location!==id).length;
   if(removed>0) out.push({key:'industrial_removed',level:removed/2,label:removed===2?'壓縮機基座已清空':'大型設備已搬離'});
 }
 if(id==='warehouse'||id==='coldstore'){
   const ratio=locationLootRatio(id); if(ratio<.55) out.push({key:'warehouse_depleted',level:clamp((.55-ratio)/.45+.35,.35,1),label:ratio<.18?'貨架幾乎清空':'庫存明顯下降'});
 }
 if(id==='clinic'){
   const blackout=(state.day>=30&&state.base.powerKW<8)||(state.resources.battery<=2&&state.day>8);
   if(blackout) out.push({key:'clinic_blackout',level:.92,label:'備援照明'});
 }
 if(id==='vent'||id==='base'){
   if(state.base.population>=12) out.push({key:'vent_crowded',level:clamp((state.base.population-8)/28,.25,1),label:`臨時床位 ${state.base.population}人`});
   if((state.coreProject?.stage||0)>=3) out.push({key:'vent_coreworks',level:clamp((state.coreProject.stage||0)/10,.3,1),label:`核心施工 ${state.coreProject.stage}/10`});
 }
 return out;
}
function districtHistoryHtml(id){return districtHistoryStates(id).map(s=>`<img class="scene-history-overlay history-${s.key}" src="${DISTRICT_HISTORY_OVERLAYS[s.key]}" alt="" aria-hidden="true" decoding="async" style="--history-opacity:${s.level}">`).join('')}
function districtHistoryTags(id){return districtHistoryStates(id).map(s=>s.label)}

const EQUIPMENT_ART={
 compressorA:'assets/equipment/compressorA.webp',
 compressorB:'assets/equipment/compressorB.webp',
 generator:'assets/equipment/generator.webp',
 chiller:'assets/equipment/chiller.webp',
 pump:'assets/equipment/pump.webp',
 inverter:'assets/equipment/inverter.webp',
 lift:'assets/equipment/lift.webp'
};
function equipmentArt(id){return EQUIPMENT_ART[id]||''}

