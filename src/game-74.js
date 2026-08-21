/* v14.2.2 QA — B7/B12-B16 remaining bug-surface cleanup */
function ensureBugCleanupV74(){
 state.flags=state.flags||{};
 state.flags.discoveryNoticeV74=state.flags.discoveryNoticeV74||{};
 return state.flags.discoveryNoticeV74
}

/* B7 — newly identified locations stay on the map and receive an explicit discovery notification. */
const _runItineraryStepV74=runItineraryStepV27;
runItineraryStepV27=function(){
 const it=ensureItineraryV27(),before=it.index,stop=it.stops[before],wasKnown=stop?locationKnownV68(stop.location):true;
 if(stop?.action==='scout'&&!wasKnown)ensureFogV68().firstScoutNotice=true; /* suppress the older one-shot generic toast */
 const out=_runItineraryStepV74();
 if(stop?.action==='scout'&&!wasKnown&&it.index>before&&locationKnownV68(stop.location)){
  const notices=ensureBugCleanupV74(),id=stop.location,loc=mapLoc(id);
  if(!notices[id]){
   notices[id]=state.day;
   log(`發現新地點：${loc?.name||id}。位置與公開資訊已加入城市地圖。`,'major');
   toast(`發現新地點：${loc?.name||id}`);
   saveGame(false)
  }
 }
 return out
};

/* B12 — one canonical wait label. */
function normalizeWaitLabelV74(){
 const b=$('restBtn');if(!b)return;
 if(state.day>=30)b.textContent='推進 1 天';
 else if(state.phase==='night')b.textContent='結束夜晚';
 else b.textContent='等待至夜晚'
}

/* B13 — city-transformation summary belongs to the city header, never on top of map nodes. */
function relocateWorldSummaryV74(){
 const mapSummary=$('map')?.querySelector('.world-map-summary');if(!mapSummary)return;
 const header=document.querySelector('.city-header');if(!header)return;
 header.querySelectorAll('.world-map-summary').forEach(x=>x.remove());
 mapSummary.classList.add('world-map-summary-v74');
 header.appendChild(mapSummary)
}
const _renderMapV74=renderMap;
renderMap=function(){const out=_renderMapV74();relocateWorldSummaryV74();return out};

/* B14 — remove placeholder-like empty visual grids from the legacy Action Center. */
const _renderActionCenterV74=renderActionCenter;
renderActionCenter=function(){
 const out=_renderActionCenterV74();
 const root=$('actionCenterContent');if(!root)return out;
 root.querySelectorAll('.action-pane').forEach(p=>{
  const h=p.querySelector('h3');if(!h)return;
  if(h.textContent.trim()==='路線地圖')h.textContent='路線摘要';
  if(h.textContent.trim()==='目前判讀'){
   h.textContent='地點判讀';
   const visual=p.querySelector('.location-scene');
   if(visual)visual.hidden=true
  }
 });
 return out
};

/* B15 — visible zeroes must never render as negative zero. */
function normalizeNegativeZeroTextV74(root=document){
 const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let node;
 while((node=walker.nextNode())){
  const s=node.nodeValue;if(!s||!s.includes('-0'))continue;
  node.nodeValue=s
   .replace(/-0(?:\.0+)?(?=\s*kWh\b)/g,'0')
   .replace(/-0(?:\.0+)?(?=\s*L\b)/g,'0')
   .replace(/-0\.0+(?=\s|$|[)｜·,，])/g,'0')
 }
}

/* B16 — the Vent location links to the global workbench, so label it honestly. */
const _openLocationV74=openLocation;
openLocation=function(id){
 const out=_openLocationV74(id);
 if(id==='vent'&&locationKnownV68(id)&&$('openCraftFromLoc')){
  $('openCraftFromLoc').textContent='開啟工程工作台';
  $('openCraftFromLoc').title='開啟全域製作／工程工作台；不是中央通風站專屬工程'
 }
 return out
};

const _renderV74=render;
render=function(){const out=_renderV74();normalizeWaitLabelV74();relocateWorldSummaryV74();normalizeNegativeZeroTextV74(document.body);return out};

ensureBugCleanupV74();normalizeWaitLabelV74();relocateWorldSummaryV74();normalizeNegativeZeroTextV74(document.body);
