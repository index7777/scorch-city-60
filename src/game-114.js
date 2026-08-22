// v14.4 Batch I — hidden world population: 50 total people including the player; unknown deaths stay silent until encountered.
(function(){
 const WORLD_TOTAL_V114=50;
 const WORLD_LOCATIONS_V114=['homes','store','school','clinic','hardware','warehouse','fire','subway','industrial','coldstore','research','solar','vent'];
 function seedHiddenPeopleV114(){
  const people=[{id:'person-00',player:true,alive:true,location:'base',discovered:true,discoveredAs:'self'}];
  for(let i=1;i<WORLD_TOTAL_V114;i++)people.push({id:`person-${String(i).padStart(2,'0')}`,player:false,alive:true,location:WORLD_LOCATIONS_V114[(i-1)%WORLD_LOCATIONS_V114.length],discovered:false,discoveredAs:null});
  return people;
 }
 function ensureHiddenPopulationV114(s=state){
  s.hiddenPopulationV114=s.hiddenPopulationV114&&typeof s.hiddenPopulationV114==='object'?s.hiddenPopulationV114:{};
  const hp=s.hiddenPopulationV114;
  hp.total=WORLD_TOTAL_V114;
  hp.people=Array.isArray(hp.people)&&hp.people.length===WORLD_TOTAL_V114?hp.people:seedHiddenPeopleV114();
  hp.knownIds=Array.isArray(hp.knownIds)?hp.knownIds:['person-00'];
  if(!hp.knownIds.includes('person-00'))hp.knownIds.unshift('person-00');
  hp.corpseSeenIds=Array.isArray(hp.corpseSeenIds)?hp.corpseSeenIds:[];
  return hp;
 }
 function hiddenPersonV114(id,s=state){return ensureHiddenPopulationV114(s).people.find(p=>p.id===id)||null}
 function knownWorldPeopleV114(s=state){const hp=ensureHiddenPopulationV114(s),known=new Set(hp.knownIds);return hp.people.filter(p=>known.has(p.id))}
 function killHiddenPersonV114(id,cause='unknown',s=state){
  const hp=ensureHiddenPopulationV114(s),p=hp.people.find(x=>x.id===id);if(!p||p.player||!p.alive)return false;
  p.alive=false;p.cause=cause;p.diedDay=Number(s.day)||1;
  // Deliberately no log/toast here. An undiscovered death is not player knowledge.
  return true;
 }
 function revealPeopleAtV114(locationId,s=state){
  const hp=ensureHiddenPopulationV114(s),newLiving=[],newCorpses=[];
  for(const p of hp.people){
   if(p.player||p.location!==locationId||hp.knownIds.includes(p.id))continue;
   hp.knownIds.push(p.id);p.discovered=true;
   if(p.alive){p.discoveredAs='alive';newLiving.push(p.id)}
   else {p.discoveredAs='corpse';hp.corpseSeenIds.push(p.id);newCorpses.push(p.id)}
  }
  return {living:newLiving,corpses:newCorpses};
 }
 function revealArrivalPopulationV114(locationId){
  const found=revealPeopleAtV114(locationId,state);
  if(found.living.length)log(`你在這裡遇到 ${found.living.length} 名倖存者。`,'');
  if(found.corpses.length)log(`你在這裡發現 ${found.corpses.length} 具遺體。`,'bad');
  return found;
 }
 const originalGoToV114=window.goToV113;
 if(typeof originalGoToV114==='function')window.goToV113=function(target){
  const before=ensureExplorationV113(state).current;
  const out=originalGoToV114(target);
  const after=ensureExplorationV113(state).current;
  if(after!==before&&after===target)revealArrivalPopulationV114(after);
  return out;
 };
 const originalMakeStateV114=makeState;
 makeState=function(){const s=originalMakeStateV114();ensureHiddenPopulationV114(s);return s};
 ensureHiddenPopulationV114(state);
 window.WORLD_TOTAL_V114=WORLD_TOTAL_V114;
 window.ensureHiddenPopulationV114=ensureHiddenPopulationV114;
 window.hiddenPersonV114=hiddenPersonV114;
 window.knownWorldPeopleV114=knownWorldPeopleV114;
 window.killHiddenPersonV114=killHiddenPersonV114;
 window.revealPeopleAtV114=revealPeopleAtV114;
})();