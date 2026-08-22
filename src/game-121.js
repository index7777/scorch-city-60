// v14.8 Batch 4 — first 10 core NPCs, encounter-gated presence, autonomy and companion follow.
(function(){
 const CORE_NPCS_V121={
  'npc-lin-yuxuan':{name:'林雨璇',role:'急救護理師',skill:'medical',home:'clinic',route:['clinic','homes','school'],priority:'照顧傷者'},
  'npc-chen-guowei':{name:'陳國威',role:'電工',skill:'electrical',home:'industrial',route:['industrial','hardware','warehouse'],priority:'確認可用電力'},
  'npc-wu-jianming':{name:'吳建明',role:'機修技師',skill:'mechanical',home:'hardware',route:['hardware','warehouse','industrial'],priority:'尋找可修設備'},
  'npc-he-xinyi':{name:'何欣怡',role:'物流文員',skill:'logistics',home:'warehouse',route:['warehouse','store','homes'],priority:'盤點物資'},
  'npc-zhang-zihao':{name:'張子豪',role:'消防員',skill:'rescue',home:'fire',route:['fire','homes','school'],priority:'搜索受困者'},
  'npc-liu-yating':{name:'劉雅婷',role:'冷凍技師',skill:'cooling',home:'coldstore',route:['coldstore','industrial','warehouse'],priority:'確認冷卻設備'},
  'npc-huang-shengjie':{name:'黃勝傑',role:'土木工程師',skill:'structural',home:'school',route:['school','homes','hardware'],priority:'確認結構通道'},
  'npc-xu-peizhen':{name:'許佩真',role:'社區工作者',skill:'social',home:'homes',route:['homes','school','store'],priority:'尋找居民'},
  'npc-wang-kai':{name:'王凱',role:'外送司機',skill:'routing',home:'store',route:['store','homes','warehouse'],priority:'確認道路'},
  'npc-gao-ruoxi':{name:'高若曦',role:'研究助理',skill:'analysis',home:'research',route:['research','industrial','clinic'],priority:'保全紀錄'}
 };
 function makeNpcV121(id,d){return {id,name:d.name,role:d.role,skill:d.skill,location:d.home,route:[...d.route],routeIndex:0,priority:d.priority,alive:true,encountered:false,companion:false,energy:100,autonomyHours:0}}
 function ensureCoreNpcStateV121(s=state){
  s.coreNpcV121=s.coreNpcV121&&typeof s.coreNpcV121==='object'?s.coreNpcV121:{};
  if(!s.coreNpcV121.people||typeof s.coreNpcV121.people!=='object')s.coreNpcV121.people=Object.fromEntries(Object.entries(CORE_NPCS_V121).map(([id,d])=>[id,makeNpcV121(id,d)]));
  if(!Array.isArray(s.coreNpcV121.knownIds))s.coreNpcV121.knownIds=[];
  return s.coreNpcV121;
 }
 function npcV121(id,s=state){return ensureCoreNpcStateV121(s).people[id]||null}
 function encounterNpcV121(id,s=state){const n=npcV121(id,s);if(!n||!n.alive)return null;n.encountered=true;const ns=ensureCoreNpcStateV121(s);if(!ns.knownIds.includes(id))ns.knownIds.push(id);return n}
 function observedHereV121(location,s=state){return s.explorationV118?.observed?.[location]===true}
 function currentLocV121(){return typeof ensureExplorationV113==='function'?ensureExplorationV113().current:'base'}
 function presentNpcsV121(location=currentLocV121(),s=state){return Object.values(ensureCoreNpcStateV121(s).people).filter(n=>n.alive&&n.location===location)}
 function knownNpcV121(id,s=state){return ensureCoreNpcStateV121(s).knownIds.includes(id)}
 function setCompanionV121(id,on=true,s=state){
  const n=npcV121(id,s);if(!n||!n.alive||!n.encountered)return {ok:false,reason:'尚未遇見這個人'};
  if(on&&n.location!==currentLocV121())return {ok:false,reason:'對方不在這裡'};
  n.companion=!!on;return {ok:true,companion:n.companion};
 }
 function advanceNpcAutonomyV121(hours=1,s=state){
  const h=Math.max(0,Number(hours)||0),ns=ensureCoreNpcStateV121(s);
  for(const n of Object.values(ns.people)){
   if(!n.alive||n.companion)continue;
   n.autonomyHours+=h;n.energy=Math.max(0,n.energy-h*2);
   while(n.autonomyHours>=6){n.autonomyHours-=6;n.routeIndex=(n.routeIndex+1)%n.route.length;n.location=n.route[n.routeIndex]}
  }
  return ns;
 }
 function syncCompanionsV121(location,s=state){for(const n of Object.values(ensureCoreNpcStateV121(s).people))if(n.alive&&n.companion)n.location=location}
 function renderNpcPresenceV121(){
  if(!state.flags?.hardFogOpeningV112)return;const map=document.getElementById('map');if(!map)return;map.querySelector('.npc-presence-v121')?.remove();
  const location=currentLocV121();if(!observedHereV121(location))return;const present=presentNpcsV121(location);if(!present.length)return;
  for(const n of present)encounterNpcV121(n.id);
  const panel=document.createElement('section');panel.className='npc-presence-v121';panel.setAttribute('aria-label','你在這裡遇見的人');
  panel.innerHTML=`<div class="npc-presence-head-v121"><b>這裡有人</b></div>${present.map(n=>`<article class="npc-card-v121" data-npc-v121="${n.id}"><div><b>${n.name}</b><small>${n.role}</small><span>${n.priority}</span></div><button type="button" data-companion-v121="${n.id}">${n.companion?'停止同行':'一起行動'}</button></article>`).join('')}`;
  panel.querySelectorAll('[data-companion-v121]').forEach(btn=>btn.onclick=()=>{const n=npcV121(btn.dataset.companionV121);const r=setCompanionV121(n.id,!n.companion);if(!r.ok){toast(r.reason);return}renderMap()});map.appendChild(panel);
 }
 const prevRenderMapV121=renderMap;renderMap=function(){const out=prevRenderMapV121();queueMicrotask(renderNpcPresenceV121);return out};
 if(typeof goToV113==='function'){const prevGoToV121=goToV113;goToV113=function(target){const out=prevGoToV121(target);syncCompanionsV121(target);return out}}
 function installNpcStylesV121(){if(document.getElementById('npcStylesV121'))return;const s=document.createElement('style');s.id='npcStylesV121';s.textContent=`.npc-presence-v121{position:absolute;right:18px;top:18px;z-index:13;width:min(310px,42%);display:grid;gap:8px;padding:12px;border:1px solid rgba(180,210,210,.24);border-radius:12px;background:rgba(10,18,20,.94);backdrop-filter:blur(12px)}.npc-presence-head-v121{font-size:.78rem;opacity:.74}.npc-card-v121{display:flex;justify-content:space-between;gap:10px;align-items:center;padding:10px;border:1px solid rgba(180,210,210,.14);border-radius:9px}.npc-card-v121>div{display:grid;gap:2px}.npc-card-v121 small,.npc-card-v121 span{opacity:.7;font-size:.76rem}.npc-card-v121 button{white-space:nowrap}`;document.head.appendChild(s)}
 const prevRenderV121=render;render=function(){const out=prevRenderV121();installNpcStylesV121();return out};
 ensureCoreNpcStateV121(state);installNpcStylesV121();
 window.CORE_NPCS_V121=CORE_NPCS_V121;window.ensureCoreNpcStateV121=ensureCoreNpcStateV121;window.npcV121=npcV121;window.encounterNpcV121=encounterNpcV121;window.presentNpcsV121=presentNpcsV121;window.knownNpcV121=knownNpcV121;window.setCompanionV121=setCompanionV121;window.advanceNpcAutonomyV121=advanceNpcAutonomyV121;window.syncCompanionsV121=syncCompanionsV121;window.renderNpcPresenceV121=renderNpcPresenceV121;
})();