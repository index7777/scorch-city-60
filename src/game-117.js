// v14.4 Batch L — cumulative heat-limit damage: cooling pauses exposure; later heat resumes from the stored exposure.
(function(){
 const HEAT_LIMITS_V117={
  battery:{id:'battery',label:'電池',hours:2},
  food:{id:'food',label:'食物',hours:6},
  electronicParts:{id:'electronicParts',label:'電子零件',hours:10},
  water:{id:'water',label:'水',hours:18},
  vehicle:{id:'vehicle',label:'汽車',hours:30},
  mechanicalParts:{id:'mechanicalParts',label:'機械零件',hours:36},
  medicine:{id:'medicine',label:'藥品',hours:42},
  largeMachinery:{id:'largeMachinery',label:'大型機械',hours:48}
 };
 const RESOURCE_HEAT_CLASS_V117={battery:'battery',food:'food',water:'water',parts:'mechanicalParts',medicine:'medicine'};
 function roundHeatV117(n){return Math.round((Number(n)||0)*1000)/1000}
 function ensureHeatStateV117(s=state){
  s.heatExposureV117=s.heatExposureV117&&typeof s.heatExposureV117==='object'?s.heatExposureV117:{};
  const h=s.heatExposureV117;h.holders=h.holders&&typeof h.holders==='object'?h.holders:{};h.cooling=h.cooling&&typeof h.cooling==='object'?h.cooling:{};h.destroyed=Array.isArray(h.destroyed)?h.destroyed:[];return h;
 }
 function heatLimitForV117(heatClass){return HEAT_LIMITS_V117[heatClass]?.hours??Infinity}
 function holderExposureV117(holderId,heatClass,s=state){const h=ensureHeatStateV117(s);h.holders[holderId]=h.holders[holderId]||{};return Math.max(0,Number(h.holders[holderId][heatClass])||0)}
 function setHolderExposureV117(holderId,heatClass,hours,s=state){const h=ensureHeatStateV117(s);h.holders[holderId]=h.holders[holderId]||{};h.holders[holderId][heatClass]=roundHeatV117(Math.max(0,Number(hours)||0));return h.holders[holderId][heatClass]}
 function setHolderCoolingV117(holderId,cooled=true,s=state){ensureHeatStateV117(s).cooling[holderId]=!!cooled;return !!cooled}
 function holderCooledV117(holderId,s=state){return !!ensureHeatStateV117(s).cooling[holderId]}
 function destroyResourceAtHolderV117(holderId,key,s=state){
  let qty=0;const zero=(obj,prop)=>{if(!obj)return;qty+=Math.max(0,Number(obj[prop])||0);obj[prop]=0};
  if(holderId==='player'){
   if(key==='water'&&s.flags?.hardFogOpeningV112){
    if(Array.isArray(s.backpack?.items)){for(const item of s.backpack.items)if(item?.kind==='waterBottle'){qty+=Math.max(0,Number(item.liters)||0);item.liters=0;item.weightKg=0}s.backpack.items=s.backpack.items.filter(x=>x?.kind!=='waterBottle');}
    if(Array.isArray(s.shelterStorage?.items)){for(const item of s.shelterStorage.items)if(item?.kind==='waterBottle'){qty+=Math.max(0,Number(item.liters)||0);item.liters=0;item.weightKg=0}s.shelterStorage.items=s.shelterStorage.items.filter(x=>x?.kind!=='waterBottle');}
    if(typeof recalcPhysicalWeightsV115==='function')recalcPhysicalWeightsV115(s);if(s.resources)s.resources.water=0;if(s.privatePool)s.privatePool.water=0;
   }else zero(s.resources,key);
  }else if(holderId.startsWith('location:'))zero(s.locations?.[holderId.slice(9)]?.remaining,key);
  else if(holderId.startsWith('npc:'))zero(s.npcs?.[holderId.slice(4)]?.stock,key);
  else if(holderId.startsWith('settlement:'))zero(s.settlements?.[holderId.slice(11)],key);
  return roundHeatV117(qty);
 }
 function resourceHoldersV117(s=state){
  const out=[['player',s.resources||{}]];
  for(const [id,loc] of Object.entries(s.locations||{}))out.push([`location:${id}`,loc?.remaining||{}]);
  for(const [id,npc] of Object.entries(s.npcs||{}))out.push([`npc:${id}`,npc?.stock||{}]);
  for(const [id,st] of Object.entries(s.settlements||{}))out.push([`settlement:${id}`,st||{}]);
  return out;
 }
 function applyPhysicalItemHeatV117(hours,holderId,s=state){
  const containers=holderId==='player'?[s.backpack?.items,s.shelterStorage?.items]:[];const destroyed=[];
  for(const items of containers){if(!Array.isArray(items))continue;for(const item of items){const cls=item?.heatClass;if(!cls||!HEAT_LIMITS_V117[cls]||item.heatDestroyed)continue;item.heatLimit=heatLimitForV117(cls);if(holderCooledV117(holderId,s))continue;item.heatExposureHours=roundHeatV117((Number(item.heatExposureHours)||0)+hours);if(item.heatExposureHours+1e-9>=item.heatLimit){item.heatDestroyed=true;destroyed.push(item.name||item.id||cls)}}}
  return destroyed;
 }
 function breakLargeMachineryV117(hours,s=state){
  const h=ensureHeatStateV117(s),broken=[];
  for(const [id,st] of Object.entries(s.assets||{})){if(st?.heatDestroyed)continue;const holder=st.transported?'player':`location:${st.location||'unknown'}`;if(holderCooledV117(holder,s))continue;const key=`asset:${id}`,next=roundHeatV117(holderExposureV117(key,'largeMachinery',s)+hours);setHolderExposureV117(key,'largeMachinery',next,s);if(next+1e-9>=HEAT_LIMITS_V117.largeMachinery.hours){st.heatDestroyed=true;st.transported=false;broken.push(id);setHolderExposureV117(key,'largeMachinery',0,s);h.destroyed.push({type:'largeMachinery',id,hours:next,day:Number(s.day)||30})}}
  return broken;
 }
 function breakVehicleV117(hours,s=state){
  if(!s.gear?.vehicle||s.vehicle?.heatDestroyed||holderCooledV117('vehicle',s))return false;const next=roundHeatV117(holderExposureV117('vehicle','vehicle',s)+hours);setHolderExposureV117('vehicle','vehicle',next,s);if(next+1e-9<HEAT_LIMITS_V117.vehicle.hours)return false;s.vehicle=s.vehicle||{};s.vehicle.heatDestroyed=true;s.vehicle.condition=0;s.gear.vehicle=false;ensureHeatStateV117(s).destroyed.push({type:'vehicle',hours:next,day:Number(s.day)||30});setHolderExposureV117('vehicle','vehicle',0,s);return true;
 }
 function applyHeatExposureV117(hours,{cooled=false,scope='world'}={},s=state){
  hours=Math.max(0,Number(hours)||0);const result={hours,destroyed:[],paused:false};if(hours<=0||Number(s.day)<30)return result;
  if(cooled){result.paused=true;return result}
  const h=ensureHeatStateV117(s),holders=resourceHoldersV117(s);
  for(const [holderId,bag] of holders){if(holderCooledV117(holderId,s))continue;if(scope==='player'&&holderId!=='player')continue;for(const [key,heatClass] of Object.entries(RESOURCE_HEAT_CLASS_V117)){const qty=Math.max(0,Number(bag?.[key])||0);if(qty<=0){setHolderExposureV117(holderId,heatClass,0,s);continue}const next=roundHeatV117(holderExposureV117(holderId,heatClass,s)+hours);setHolderExposureV117(holderId,heatClass,next,s);if(next+1e-9>=heatLimitForV117(heatClass)){const lost=destroyResourceAtHolderV117(holderId,key,s);if(lost>0){result.destroyed.push({holderId,key,heatClass,qty:lost});h.destroyed.push({holderId,key,heatClass,qty:lost,hours:next,day:Number(s.day)||30})}setHolderExposureV117(holderId,heatClass,0,s)}}}
  if(scope!=='player'){const broken=breakLargeMachineryV117(hours,s);for(const id of broken)result.destroyed.push({holderId:`asset:${id}`,heatClass:'largeMachinery',qty:1})}
  if(scope==='world'||scope==='player'){if(breakVehicleV117(hours,s))result.destroyed.push({holderId:'vehicle',heatClass:'vehicle',qty:1});applyPhysicalItemHeatV117(hours,'player',s)}
  if(typeof syncFiniteStockV116==='function')syncFiniteStockV116(s);return result;
 }
 function heatExposureAuditV117(s=state){const h=ensureHeatStateV117(s);return {limits:Object.fromEntries(Object.entries(HEAT_LIMITS_V117).map(([k,v])=>[k,v.hours])),holders:JSON.parse(JSON.stringify(h.holders)),cooling:{...h.cooling},destroyed:[...h.destroyed]}}
 const originalMakeStateV117=makeState;makeState=function(){const s=originalMakeStateV117();ensureHeatStateV117(s);return s};ensureHeatStateV117(state);
 window.HEAT_LIMITS_V117=HEAT_LIMITS_V117;window.RESOURCE_HEAT_CLASS_V117=RESOURCE_HEAT_CLASS_V117;window.ensureHeatStateV117=ensureHeatStateV117;window.heatLimitForV117=heatLimitForV117;window.holderExposureV117=holderExposureV117;window.setHolderCoolingV117=setHolderCoolingV117;window.applyHeatExposureV117=applyHeatExposureV117;window.heatExposureAuditV117=heatExposureAuditV117;
})();
