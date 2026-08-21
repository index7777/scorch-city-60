/* v14.2.2 QA — B4/B8/B9-B11 consistency stabilization */

/* B4: a deferred daily brief must never pop merely because an unrelated modal (trade, encounter, etc.) closed. */
function ensureBriefQueueV73(){
 const f=ensureMainlineVisibilityV67();
 f.autoBriefV73=f.autoBriefV73||{day:0,deferred:false,attempted:false};
 return f.autoBriefV73
}
queueDailyBriefV67=function(day){
 const f=ensureMainlineVisibilityV67(),q=ensureBriefQueueV73();
 if(f.briefSeenDay===day)return;
 f.pendingBriefDay=day;q.day=day;q.deferred=false;q.attempted=false;
 setTimeout(tryPendingDailyBriefV67,80)
};
tryPendingDailyBriefV67=function(){
 const f=ensureMainlineVisibilityV67(),q=ensureBriefQueueV73();
 if(!f.pendingBriefDay||f.pendingBriefDay!==state.day||f.briefSeenDay===state.day)return;
 if(q.day!==state.day){q.day=state.day;q.deferred=false;q.attempted=false}
 if(q.deferred)return; /* keep HUD unread; do not reopen after trade/encounter closes */
 if(window.__SCORCH_ENTRY_ACTIVE)return;
 if(state.onboarding?.enabled&&!state.onboarding.completed)return;
 if(!noOpenDialogV67()){q.deferred=true;q.attempted=true;renderMainlineHudV67();saveGame(false);return}
 q.attempted=true;openBrief()
};

/* B8: encounter context and displayed NPC location must resolve from the same world-state location. */
function npcWorldLocationV73(id){return state.npcs?.[id]?.location||null}
function npcWorldLocationLabelV73(id){const loc=npcWorldLocationV73(id);return mapLoc(loc)?.name||loc||'未知'}
const _maybeEncounterNpcV73=maybeEncounterNpc;
maybeEncounterNpc=function(locationId){
 const pair=npcEncounterAt(locationId);if(!pair)return false;
 const [id]=pair,n=state.npcs[id];if(!n?.alive||n.location!==locationId)return false;
 state.flags=state.flags||{};state.flags.npcEncounterContextV73={id,location:locationId,day:state.day};
 return _maybeEncounterNpcV73(locationId)
};
const _openNpcEncounterV73=openNpcEncounter;
openNpcEncounter=function(id){
 const n=state.npcs?.[id];if(!n?.alive)return;
 const ctx=state.flags?.npcEncounterContextV73;
 if(ctx?.id===id&&ctx.location!==n.location){
  state.flags.npcEncounterContextV73={id,location:n.location,day:state.day};
  toast(`${npcPublicName(id)}目前位於${npcWorldLocationLabelV73(id)}；已更新接觸位置`)
 }
 const out=_openNpcEncounterV73(id);
 const dlg=$('incidentDialog');
 if(dlg?.open&&npcKnowledge(id).nameKnown){
  const body=$('incidentBody');if(body&&!body.querySelector?.('.npc-location-v73')){
   const line=document.createElement('span');line.className='npc-location-v73';line.textContent=`目前位置：${npcWorldLocationLabelV73(id)}`;body.appendChild(document.createElement('br'));body.appendChild(line)
  }
 }
 return out
};

/* B9/B10/B11: one vocabulary and one risk source of truth everywhere. */
function riskBandV73(score=currentRiskScore()){
 const s=Math.max(0,+score||0);
 if(s>=10)return {id:'collapse',label:'崩潰'};
 if(s>=7)return {id:'danger',label:'危險'};
 if(s>=4)return {id:'tense',label:'緊張'};
 if(s>=2)return {id:'alert',label:'警戒'};
 return {id:'calm',label:'平靜'}
}
riskLabel=function(){return riskBandV73(currentRiskScore()).label};

function canonicalKnownWaterV73(){return knownCityWater()}
function canonicalKnownAssetsV73(){return `${Object.values(state.assets||{}).filter(a=>a.discovered).length}/${assetDefs.length}`}
function normalizeHudTermsV73(){
 const water=$('knownWater'),assets=$('knownAssets');
 if(water){water.textContent=canonicalKnownWaterV73();const label=water.parentElement?.querySelector('span');if(label)label.textContent='已知可用水'}
 if(assets){assets.textContent=canonicalKnownAssetsV73();const label=assets.parentElement?.querySelector('span');if(label)label.textContent='已發現大型資產'}
 const risk=$('riskLevel');if(risk){const b=riskBandV73(currentRiskScore());risk.textContent=`整體風險：${b.label}`;risk.dataset.riskBand=b.id}
}
const _renderV13V73=renderV13;
renderV13=function(){const out=_renderV13V73();normalizeHudTermsV73();return out};
const _renderSummaryV73=renderSummary;
renderSummary=function(){const out=_renderSummaryV73();const box=$('eventSummary');if(box){const b=riskBandV73(currentRiskScore());box.dataset.riskBand=b.id}return out};
const _openBriefV73=openBrief;
openBrief=function(){const out=_openBriefV73();const banner=$('briefContent')?.querySelector('.project-banner b');if(banner&&banner.textContent.startsWith('整體風險：'))banner.textContent=`整體風險：${riskLabel()}`;return out};

/* Keep personnel cards on current NPC world location as well. */
const _renderPersonnelV73=renderPersonnel;
renderPersonnel=function(){const out=_renderPersonnelV73();document.querySelectorAll('[data-person]').forEach(card=>{const id=card.dataset.person,n=state.npcs?.[id];if(!n)return;const lines=card.querySelectorAll('small');if(lines.length)lines[lines.length-1].textContent=n.alive?npcWorldLocationLabelV73(id):'死亡'});return out};

ensureBriefQueueV73();normalizeHudTermsV73();render();