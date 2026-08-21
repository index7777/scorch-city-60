/* v14.2.2 QA — integration stabilization: idempotent location modal overlays */
function clearLocationTransientV82(){
 const dlg=$('locationDialog');if(!dlg)return;
 dlg.querySelectorAll('.search-mode-note-v68,.search-pacing-v69,.quick-search-time-v71').forEach(n=>n.remove())
}

/*
 Late QA layers append explanatory blocks next to #locStock/#locActions. The base
 modal only rewrites those fixed containers, so without cleanup the appended
 siblings accumulate across repeated opens and can even survive when switching
 from a known location to an unknown fog-of-war node.
*/
const _openLocationV82=openLocation;
openLocation=function(id){
 clearLocationTransientV82();
 const out=_openLocationV82(id);
 const dlg=$('locationDialog');if(!dlg)return out;
 /* Defensive de-duplication in case a nested legacy wrapper appended twice. */
 for(const sel of ['.search-mode-note-v68','.search-pacing-v69','.quick-search-time-v71']){
  const nodes=[...dlg.querySelectorAll(sel)];nodes.slice(1).forEach(n=>n.remove())
 }
 /* Unknown nodes must never inherit known-location search affordances. */
 if(typeof locationKnownV68==='function'&&!locationKnownV68(id)){
  dlg.querySelectorAll('.search-mode-note-v68,.search-pacing-v69,.quick-search-time-v71').forEach(n=>n.remove());
  const search=$('searchLoc'),plan=$('planLoc'),trade=$('tradeLoc'),craft=$('openCraftFromLoc');
  [search,plan,trade,craft].forEach(n=>n?.remove())
 }
 return out
};

/* Closing also clears transient blocks so the next open always starts clean. */
const locDlgV82=$('locationDialog');
if(locDlgV82&&!locDlgV82.dataset.transientCleanupV82){
 locDlgV82.dataset.transientCleanupV82='1';
 locDlgV82.addEventListener('close',clearLocationTransientV82)
}
