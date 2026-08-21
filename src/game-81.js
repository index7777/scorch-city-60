/* v14.2.2 QA — U8-U16 + X31/X32 final UI polish / naming consistency */

/* U8 — the five Action Center steps are a progress indicator, not tabs. */
function normalizeActionStepsV81(){
 const box=$('actionSteps');if(!box)return;box.setAttribute('role','list');box.setAttribute('aria-label','行動流程進度');
 [...box.querySelectorAll('.action-step')].forEach((s,i)=>{s.setAttribute('role','listitem');s.classList.add('noninteractive-v81');s.removeAttribute('tabindex');if(s.classList.contains('active'))s.setAttribute('aria-current','step');else s.removeAttribute('aria-current')})
}
const _renderActionCenterV81=renderActionCenter;
renderActionCenter=function(){const out=_renderActionCenterV81();normalizeActionStepsV81();return out};

/* U9/U10/U11 + X31/X32 — normalize visible vocabulary without changing underlying IDs/state. */
function normalizeVisibleCopyV81(root=document.body){
 const titles=[
  ['briefDialog','每日簡報 · 風險預測'],['baseMgmtDialog','基地管理 · 工作分配'],['rationDialog','配給 · 中央站人口'],['logisticsDialog','城市物流 · 大型資產'],['inventoryDialog','庫存 · 資產總覽'],['researchDialog','研究']
 ];
 for(const [id,text] of titles){const h=$(`${id}`)?.querySelector('h2');if(h)h.textContent=text}
 const research=$('researchBtn')?.querySelector('span');if(research)research.textContent='研究';
 const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let n;while((n=walker.nextNode())){
  let s=n.nodeValue;if(!s)continue;
  if(s.includes('大型設備'))s=s.replace(/大型設備/g,'大型資產');
  if(s.includes('｜初次接觸'))s=s.replace(/｜初次接觸/g,'・初次接觸');
  if(s.trim()==='目前不願談情報')s=s.replace('目前不願談情報','離開');
  n.nodeValue=s
 }
}
const _openNpcEncounterV81=openNpcEncounter;
openNpcEncounter=function(id){const out=_openNpcEncounterV81(id);const t=$('incidentTitle');if(t)t.textContent=t.textContent.replace(/｜初次接觸/g,'・初次接觸');normalizeVisibleCopyV81($('incidentDialog')||document.body);return out};
const _openTradeV81=openTrade;
openTrade=function(id){const out=_openTradeV81(id);normalizeVisibleCopyV81($('tradeDialog')||document.body);return out};

/* U14 — full itinerary searches receive the same explicit gain feedback as quick search. */
function carriedResourceTotalV81(k){
 let n=Math.max(0,+state.resources?.[k]||0);
 try{if(typeof ensureFieldTeamV43==='function'&&ensureFieldTeamV43().active&&typeof ensureDynamicCargoV52==='function')n+=Math.max(0,+ensureDynamicCargoV52().resources?.[k]||0)}catch{}
 return n
}
const _collectStopLootV81=collectStopLootV27;
collectStopLootV27=function(loc){
 const before=Object.fromEntries(RES_ORDER.map(k=>[k,carriedResourceTotalV81(k)])),out=_collectStopLootV81(loc),gain={};
 for(const k of RES_ORDER){const d=carriedResourceTotalV81(k)-before[k];if(d>1e-6)gain[k]=Math.round(d*100)/100}
 const bits=Object.entries(gain).map(([k,v])=>`+${v} ${RES_LABELS[k]||k}`);
 if(bits.length)toast(`完整搜索完成：${bits.join(' · ')}`);
 return out
};

/* U15 — animate visible resource/endurance number changes; state values themselves remain immediate. */
window.__SCORCH_UI_NUMBERS_V81=window.__SCORCH_UI_NUMBERS_V81||{};
function tweenTextNumberV81(el,key){
 if(!el)return;const raw=el.textContent.trim(),m=raw.match(/^(-?\d+(?:\.\d+)?)(.*)$/);if(!m)return;
 const target=+m[1],suffix=m[2],store=window.__SCORCH_UI_NUMBERS_V81,prev=store[key];store[key]=target;
 if(!Number.isFinite(prev)||prev===target)return;
 const start=performance.now(),dur=320,decimals=(m[1].split('.')[1]||'').length;el.classList.add('count-changing-v81');
 const tick=now=>{const p=Math.min(1,(now-start)/dur),e=1-Math.pow(1-p,3),v=prev+(target-prev)*e;el.textContent=(decimals?Number(v).toFixed(decimals):String(Math.round(v)))+suffix;if(p<1)requestAnimationFrame(tick);else{el.textContent=m[1]+suffix;el.classList.remove('count-changing-v81')}};requestAnimationFrame(tick)
}
function animateStrategicNumbersV81(){
 const keys=Object.keys(state.resources||{});document.querySelectorAll('#resources .resource-row b').forEach((b,i)=>tweenTextNumberV81(b,`res:${keys[i]||i}`));
 tweenTextNumberV81($('daysLeft'),'hud:daysLeft');tweenTextNumberV81($('knownWater'),'hud:knownWater');tweenTextNumberV81($('knownPop'),'hud:knownPop')
}

/* Shared refresh: copy normalization and number feedback are late-bound after every render. */
const _renderV81=render;
render=function(){const out=_renderV81();normalizeVisibleCopyV81(document.body);normalizeActionStepsV81();requestAnimationFrame(animateStrategicNumbersV81);return out};

normalizeVisibleCopyV81(document.body);normalizeActionStepsV81();requestAnimationFrame(animateStrategicNumbersV81);
