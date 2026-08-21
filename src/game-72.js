/* v14.2.2 QA — X23-X26 search pacing accounting fixes */

/*
 Legacy migration must happen only when a pacing record is first created.
 A new full search sets location.searched=true before markSearchV69() runs; re-checking
 searched on every read would therefore misclassify that first search as a legacy visit.
*/
searchRecordV69=function(id){
 const p=ensurePacingV69();
 if(!p.locations[id]){
  const legacy=!!state.locations?.[id]?.searched;
  p.locations[id]={visits:legacy?1:0,quick:0,full:legacy?1:0,lastSearchDay:0,migratedLegacy:legacy}
 }
 const r=p.locations[id];
 if(!Number.isFinite(r.visits))r.visits=0;
 if(!Number.isFinite(r.quick))r.quick=0;
 if(!Number.isFinite(r.full))r.full=0;
 if(!Number.isFinite(r.lastSearchDay))r.lastSearchDay=0;
 return r
};

/* Starting carry is only 18kg; the tutorial supply point must expose water before food. */
if(PUBLIC_LOOT_V68?.store)PUBLIC_LOOT_V68.store=['water','food'];

/* Rebuild any currently visible location/planner labels with the corrected visit state. */
render();
