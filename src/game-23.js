/* v14.2.2 QA — systems/UX stabilization pass */
let craftFilterV23='all';

function hasReachedVentV23(){
 return !!(state?.locations?.vent?.searched||state?.base?.ventilation>0||state?.base?.core);
}

function saveGame(manual=true){
 if(!manual&&window.__SCORCH_ENTRY_ACTIVE)return;
 localStorage.setItem(SAVE_KEY,JSON.stringify(state));
 if(manual)toast('已存檔');
}

function craftDoneV23(c){
 switch(c.id){
  case 'cart': return !!state.gear.cart;
  case 'toolkit': return !!state.gear.toolkit;
  case 'tank': return !!state.gear.waterTank;
  case 'filter': return state.base.waterTreatment>=3;
  case 'power': return state.base.storageKWh>=64;
  case 'solar': return !!state.gear.solar;
  case 'coolpack': return !!state.gear.coolingPack;
  case 'coldSubway': return state.coldStations.includes('subway');
  case 'coldStore': return state.coldStations.includes('coldstore');
  case 'vent1': return state.base.ventilation>=1;
  case 'vent2': return state.base.ventilation>=2;
  default: return false;
 }
}
function craftPrereqReasonsV23(c){
 const r=[];
 if(c.id==='filter'&&!state.research.water)r.push('尚未完成「多級濾水」研究');
 if(c.id==='solar'&&!state.research.solar)r.push('尚未完成「微型太陽能電網」研究');
 if(c.id==='coolpack'&&!state.research.cooling)r.push('尚未完成「主動液冷裝備」研究');
 if((c.id==='coldSubway'||c.id==='coldStore')&&!state.research.coldStation)r.push('尚未完成「外部冷站」研究');
 if((c.id==='coldSubway'||c.id==='coldStore')&&state.day<30)r.push('需等到 Day 30 永晝後');
 if(c.id==='coldSubway'&&!state.locations.subway?.searched)r.push('尚未實際抵達地鐵維修站');
 if(c.id==='coldStore'&&!state.locations.coldstore?.searched)r.push('尚未實際抵達大型冷庫');
 if(['vent1','vent2','maintain'].includes(c.id)&&!hasReachedVentV23())r.push('尚未實際抵達中央通風站');
 if(c.id==='vent1'&&state.day<30)r.push('需等到 Day 30 永晝後');
 if(c.id==='vent2'){
  if(state.base.ventilation<1)r.push('中央站初級冷卻尚未完成');
  if(state.base.powerKW<8)r.push('中央站供電未達 8 kW');
  if(state.installed.compressors<1)r.push('尚未搬回工業壓縮機');
  if(!state.installed.pump)r.push('尚未搬回高流量消防泵');
 }
 if(c.id==='maintain'){
  if(state.day<30)r.push('Day 30 前不需要中央站維護');
  if(state.base.ventilation<=0)r.push('中央站冷卻尚未啟動');
  if(state.base.condition>=92)r.push('設備狀況良好，目前不需要維護');
 }
 return r;
}
function craftMissingMaterialsV23(c){
 return Object.entries(c.cost||{}).filter(([k,v])=>(state.resources[k]||0)<v).map(([k,v])=>`${RES_LABELS[k]||k} 缺 ${Math.ceil(v-(state.resources[k]||0))}`);
}
function craftStateV23(c){
 if(craftDoneV23(c))return {id:'completed',label:'已完成',reasons:[]};
 const reasons=craftPrereqReasonsV23(c),materials=craftMissingMaterialsV23(c);
 if(reasons.length||materials.length)return {id:'locked',label:'目前條件未達成',reasons:[...reasons,...materials]};
 return {id:'available',label:'有材料可製作',reasons:[]};
}
function openCraft(){
 const filters=[['all','全部'],['available','有材料可製作'],['locked','條件未達成'],['completed','已完成']];
 const rows=craftDefs.map(c=>({c,s:craftStateV23(c)})).filter(x=>craftFilterV23==='all'||x.s.id===craftFilterV23);
 const tabs=`<div class="craft-filters">${filters.map(([id,label])=>`<button class="${craftFilterV23===id?'active':''}" data-craft-filter="${id}">${label}</button>`).join('')}</div>`;
 const cards=rows.map(({c,s})=>{
  const req=Object.entries(c.cost||{}).map(([k,v])=>`${RES_LABELS[k]||k} ${v}（有 ${Math.floor(state.resources[k]||0)}）`).join('、')||'無材料';
  const reasons=s.reasons.length?`<ul class="craft-reasons">${s.reasons.map(x=>`<li>${x}</li>`).join('')}</ul>`:'';
  return `<div class="card craft-card craft-${s.id}"><div class="craft-card-head"><div><span class="craft-state">${s.label}</span><h3>${c.name}</h3></div></div><p>${c.desc}</p><p class="craft-cost">需求：${req}</p>${reasons}<button data-craft="${c.id}" ${s.id!=='available'?'disabled':''}>${s.id==='completed'?'已完成':s.id==='available'?'製作／施工':'條件未達成'}</button></div>`;
 }).join('')||'<p class="muted">這個分類目前沒有項目。</p>';
 $('craftList').innerHTML=tabs+`<div class="craft-card-list">${cards}</div>`;
 if(!$('craftDialog').open)$('craftDialog').showModal();
 document.querySelectorAll('[data-craft-filter]').forEach(b=>b.onclick=()=>{craftFilterV23=b.dataset.craftFilter;openCraft()});
 document.querySelectorAll('[data-craft]').forEach(b=>b.onclick=()=>craft(b.dataset.craft));
}
function craft(id){
 const c=craftDefs.find(x=>x.id===id);if(!c)return;
 const st=craftStateV23(c);if(st.id!=='available')return toast(st.reasons[0]||'目前條件未達成');
 pay(c.cost);c.effect();log(`完成工程：${c.name}`,'good');render();checkState();openCraft();
}

function renderBase(){
 const reached=hasReachedVentV23();
 const rows=[
  ['已知倖存人口',totalLiving()],
  ['已知城市水源',knownCityWater()],
  ['已發現大型設備',Object.values(state.assets).filter(a=>a.discovered).length+'/'+assetDefs.length],
  ['外部冷站',state.coldStations.length+' 座'],
  ['中央通風站',reached?(state.base.core?'核心完成':state.base.ventilation?`冷卻階段 ${state.base.ventilation}`:'已抵達／未啟動'):'尚未抵達']
 ];
 $('baseStats').innerHTML=rows.map(r=>`<div class="resource-row"><span>${r[0]}</span><b>${r[1]}</b></div>`).join('');
}
function applyProgressiveUI(){
 const reveal=(id,on)=>{const el=$(id);if(!el)return;el.classList.toggle('progressive-hidden',!on);el.setAttribute('aria-hidden',on?'false':'true')};
 const reached=hasReachedVentV23();
 reveal('baseMgmtBtn',reached);
 if(!state.onboarding?.enabled){
  reveal('cityOpsBtn',true);reveal('researchBtn',true);reveal('craftBtn',true);reveal('coreProjectBtn',reached&&(state.knownCore||state.day>=40));return;
 }
 reveal('cityOpsBtn',state.expedition.count>0||state.onboarding.firstAsset);
 reveal('craftBtn',state.gear.cart||state.day>=2);
 reveal('researchBtn',state.resources.data>0||state.day>=3);
 reveal('coreProjectBtn',reached&&(state.knownCore||state.day>=40));
}
function openBaseMgmt(){
 if(!hasReachedVentV23())return toast('尚未實際抵達中央通風站，基地管理尚未解鎖');
 const pop=availableWorkers(),used=assignedWorkers();
 const jobs=[['water','水務','增加濾水／回收效率'],['cooling','冷卻','提高冷卻運轉效率並培訓空調技能'],['power','電力','增加日常儲能並培訓電力技能'],['medical','醫療','穩定人口與信任並培訓醫療技能'],['logistics','物流','整理回收零件與搬運'],['maintenance','維護','每天恢復中央站設備狀況'],['core','核心工程','投入終局工程人時；受疲勞、配給與技術能力影響']];
 const rows=jobs.map(([id,n,d])=>`<div class="choice"><h3>${n}</h3><p>${d}｜效率 ${Math.round(workEfficiency(id)*100)}%</p><div class="dialog-actions"><button data-job="${id}" data-d="-1" class="secondary">−</button><b>${state.workforce[id]||0} 人</b><button data-job="${id}" data-d="1">＋</button></div></div>`).join('');
 $('baseMgmtContent').innerHTML=`<div class="route-summary"><div><span>中央站人口</span><b>${pop}</b></div><div><span>已分配</span><b>${used}</b></div><div><span>休息／未分配</span><b>${Math.max(0,pop-used)}</b></div><div><span>平均疲勞</span><b>${Math.round(state.fatigue)}%</b></div></div><div class="card-list">${rows}</div><h3>技能傳承</h3><p>HVAC ${state.training.hvac.toFixed(1)}/5｜電力 ${state.training.electric.toFixed(1)}/5｜醫療 ${state.training.medical.toFixed(1)}/5</p><h3>基地分區</h3><div class="asset-grid"><div class="asset-box"><b>居住區</b><p>容量 ${state.zones.residential.capacity}</p></div><div class="asset-box"><b>醫療區</b><p>容量 ${state.zones.medical.capacity}</p></div><div class="asset-box"><b>工程區</b><p>容量 ${state.zones.engineering.capacity}</p></div><div class="asset-box"><b>儲藏區</b><p>容量 ${state.zones.storage.capacity}kg</p></div></div><h3>最近晨報</h3>${state.morningReports.slice().reverse().map(x=>`<div class="flow-row">${x}</div>`).join('')||'<p class="muted">Day 30 後開始產生晨報。</p>'}`;
 if(!$('baseMgmtDialog').open)$('baseMgmtDialog').showModal();
 document.querySelectorAll('[data-job]').forEach(b=>b.onclick=()=>{const k=b.dataset.job,d=+b.dataset.d,next=Math.max(0,(state.workforce[k]||0)+d),others=assignedWorkers()-(state.workforce[k]||0);if(others+next>pop)return toast('沒有足夠可用人力');state.workforce[k]=next;openBaseMgmt();render()});
}

function mapPlannerHtml(){
 const mp=state.mapPlanner||{};
 if(!mp.active)return '';
 const target=mapLoc(mp.target);
 if(!target)return `<div class="planner-head"><div><span>MAP ROUTE</span><b>尚未選擇目的地</b></div><button id="closePlanner" class="mini">收合</button></div><p class="muted">點選城市節點後，才會建立路線與目的地。</p>`;
 const fast=computeMapRoute(target.id,'fastest'),safe=computeMapRoute(target.id,'safe'),chosen=mp.routeMode==='safe'?safe:fast;
 const assets=discoveredAssetsAt(target.id),notes=notesAt(target.id),cold=state.coldStations.includes(target.id)?'冷站節點':pointInCentralCooling(target.id)||pointNearColdStation(target.id)?'位於冷卻覆蓋':'無人工冷卻';
 const row=(name,r,mode)=>r?`<button class="route-option ${mp.routeMode===mode?'selected':''}" data-routemode="${mode}"><span>${name}</span><b>${r.distance} km · 熱 ${routeHeatLabel(r.heat)}</b><small>${state.day>=30?`冷卻 ${r.cooling}kWh · `:''}${state.gear.vehicle?`燃料 ${r.fuel}L · `:''}${r.path.map(id=>mapLoc(id)?.name).join(' → ')}</small></button>`:'';
 return `<div class="planner-head"><div><span>MAP ROUTE</span><b>${target.name}</b></div><button id="closePlanner" class="mini">收合</button></div><div class="planner-route-list">${row('最快路線',fast,'fastest')}${row('低熱路線',safe,'safe')}</div><div class="planner-facts"><span>區域熱負荷 <b>${routeHeatLabel(Math.round(nodeHeatFactor(target.id)*70))}</b></span><span>冷卻狀態 <b>${cold}</b></span><span>已知大型資產 <b>${assets.length}</b></span><span>玩家標記 <b>${notes.length}</b></span><span>路線情報 <b>${chosen?.path?.slice(1).filter((id,i)=>roadIntelState(chosen.path[i],id)).length||0}/${Math.max(0,(chosen?.path?.length||1)-1)}</b></span></div>${assets.length?`<div class="planner-assets">${assets.map(a=>`<span>◆ ${a.name} ${a.weight}kg</span>`).join('')}</div>`:''}<div class="planner-actions"><button id="plannerExpedition">套用至外出行動</button><button id="plannerLocation" class="secondary">查看地點</button></div>`;
}
function routeSegmentsV23(path,cls,kind='plan'){
 if(!path||path.length<2)return '';
 return path.slice(1).map((id,i)=>`<line class="${cls}" data-${kind}-a="${path[i]}" data-${kind}-b="${id}" x1="0" y1="0" x2="0" y2="0"/>`).join('');
}
function routeSvg(){
 const target=state.mapPlanner?.target,active=!!(state.mapPlanner?.active&&target&&mapLoc(target));
 const fast=active?computeMapRoute(target,'fastest'):null,safe=active?computeMapRoute(target,'safe'):null,chosen=state.mapPlanner?.routeMode==='safe'?safe:fast,other=state.mapPlanner?.routeMode==='safe'?fast:safe;
 return `<svg class="world-network" viewBox="0 0 1 1" preserveAspectRatio="none" aria-hidden="true">${MAP_ROUTES.map(([a,b])=>`<line class="${routeClass(a,b)}" data-route-a="${a}" data-route-b="${b}" x1="0" y1="0" x2="0" y2="0"/>`).join('')}${state.coldStations.map(id=>`<line class="route cold-route trunk" data-route-a="${id}" data-route-b="vent" x1="0" y1="0" x2="0" y2="0"/>`).join('')}${routeSegmentsV23(other?.path,'planned-route alt-plan')}${routeSegmentsV23(chosen?.path,`planned-route selected-plan ${state.mapPlanner?.routeMode==='safe'?'safe-plan':'fast-plan'}`)}</svg>`;
}
function clampNodePositionsV23(){
 const map=$('map');if(!map)return;
 const mr=map.getBoundingClientRect();if(!mr.width||!mr.height)return;
 map.querySelectorAll('.node[data-id]').forEach(n=>{
  const loc=mapLoc(n.dataset.id);if(!loc)return;
  const w=n.offsetWidth||120,h=n.offsetHeight||60,pad=8;
  const x=clamp(mr.width*loc.x/100,w/2+pad,mr.width-w/2-pad),y=clamp(mr.height*loc.y/100,h/2+pad,mr.height-h/2-pad);
  n.style.left=x+'px';n.style.top=y+'px';
 });
}
function edgePointV23(from,to,mr){
 const fx=from.left-mr.left+from.width/2,fy=from.top-mr.top+from.height/2,tx=to.left-mr.left+to.width/2,ty=to.top-mr.top+to.height/2;
 const dx=tx-fx,dy=ty-fy,hw=Math.max(1,from.width/2),hh=Math.max(1,from.height/2);
 const sx=Math.abs(dx)>0.001?hw/Math.abs(dx):Infinity,sy=Math.abs(dy)>0.001?hh/Math.abs(dy):Infinity,t=Math.min(sx,sy);
 return {x:clamp(fx+dx*t,2,mr.width-2),y:clamp(fy+dy*t,2,mr.height-2)};
}
function syncMapNetworkGeometryV23(){
 const map=$('map'),svg=map?.querySelector('.world-network');if(!map||!svg)return;
 clampNodePositionsV23();
 const mr=map.getBoundingClientRect();if(!mr.width||!mr.height)return;
 svg.setAttribute('viewBox',`0 0 ${mr.width} ${mr.height}`);
 svg.querySelectorAll('line').forEach(line=>{
  const a=line.dataset.routeA||line.dataset.planA,b=line.dataset.routeB||line.dataset.planB;
  const A=map.querySelector(`.node[data-id="${a}"]`),B=map.querySelector(`.node[data-id="${b}"]`);
  if(!A||!B){line.style.display='none';return}
  const ar=A.getBoundingClientRect(),br=B.getBoundingClientRect(),p1=edgePointV23(ar,br,mr),p2=edgePointV23(br,ar,mr);
  const len=Math.hypot(p2.x-p1.x,p2.y-p1.y);line.style.display=len<3?'none':'';
  line.setAttribute('x1',p1.x);line.setAttribute('y1',p1.y);line.setAttribute('x2',p2.x);line.setAttribute('y2',p2.y);
 });
}
function bindMapPlanner(){
 const routeBtn=$('routePlanBtn');
 if(routeBtn){
  routeBtn.classList.toggle('active',!!state.mapPlanner?.active);
  routeBtn.onclick=()=>{state.mapPlanner.active=!state.mapPlanner.active;if(!state.mapPlanner.active)state.mapPlanner.target=null;renderMap();toast(state.mapPlanner.active?'路線規劃已開啟：請點選目的地':'路線規劃已收合')};
 }
 document.querySelectorAll('[data-mapfilter]').forEach(b=>{b.classList.toggle('active',(state.mapPlanner.filter||'all')===b.dataset.mapfilter);b.onclick=()=>{state.mapPlanner.filter=b.dataset.mapfilter;renderMap()}});
 document.querySelectorAll('[data-routemode]').forEach(b=>b.onclick=()=>{state.mapPlanner.routeMode=b.dataset.routemode;renderMap()});
 if($('closePlanner'))$('closePlanner').onclick=()=>{state.mapPlanner.active=false;state.mapPlanner.target=null;renderMap()};
 if($('plannerExpedition'))$('plannerExpedition').onclick=()=>openActionCenter(state.mapPlanner.target);
 if($('plannerLocation'))$('plannerLocation').onclick=()=>openLocation(state.mapPlanner.target);
}
function renderMap(){
 const nodes=locations.map(l=>{
  const rem=Object.values(state.locations[l.id].remaining).reduce((a,b)=>a+(typeof b==='number'?b:0),0),ratio=resourceRatio(l.id);
  let cls=l.base?'base':isSafeSearch(l)?'safe':'danger';sceneVisualStates(l.id).forEach(s=>cls+=' state-'+s);if(state.coldStations.includes(l.id))cls+=' cold';if(state.intel[l.id]&&!state.locations[l.id].searched)cls+=' rumor';if(isOccupiedMap(l.id))cls+=' map-occupied';if(isEvacuatedMap(l.id))cls+=' map-evacuated';if(ratio<.2)cls+=' map-depleted';else if(ratio<.5)cls+=' map-thinning';if(!mapFilterPass(l.id))cls+=' map-filtered';if(state.mapPlanner?.active&&state.mapPlanner.target===l.id)cls+=' route-target';
  const npc=Object.values(state.npcs).find(n=>n.alive&&n.location===l.id&&npcKnown(n)),pop=districtPopulationAt(l.id);
  const detail=state.locations[l.id].searched?(rem?`已確認剩餘：約 ${Math.floor(rem)}`:'已確認物資稀少'):(state.intel[l.id]?`情報：${state.intel[l.id].summary}`:'尚未掌握庫存');
  const history=districtHistoryTags(l.id).slice(0,1)[0],assets=discoveredAssetsAt(l.id),notes=notesAt(l.id);
  return `<button class="node ${cls} ${rem===0&&!l.special?'cleared':''}" data-id="${l.id}" style="left:${l.x}%;top:${l.y}%;transform:translate(-50%,-50%);--loot:${ratio.toFixed(2)}"><span class="node-art" style="background-image:url('${locationThumbArt(l.id)}')"></span><span class="node-copy"><b>${l.name}</b><small>${detail}</small>${pop?`<small class="world-pop">◉ ${pop} 人活動</small>`:''}${npc?`<small class="npc-pin">● ${npc.name} · ${npc.role}</small>`:''}${state.coldStations.includes(l.id)?'<small class="npc-pin">冷站運作中</small>':''}${assets.length?`<small class="asset-pin">◆ 大型資產 ${assets.length}</small>`:''}${history?`<small class="history-pin">▣ ${history}</small>`:''}${notes.length?`<small class="note-pin">標記 ${notes.length}</small>`:''}</span></button>`;
 }).join('');
 $('map').innerHTML=`<div class="world-transform-layer">${routeSvg()}${mapHalos()}</div>${nodes}<div class="world-map-summary"><b>城市轉化</b><span>${worldTransformationSummary()}</span><em>${state.day>=30?`中央冷卻覆蓋 ${Math.round(coolingReach())}%`:'自然夜間仍是主要安全窗口'}</em></div>`;
 if($('mapPlannerPanel'))$('mapPlannerPanel').innerHTML=mapPlannerHtml();
 document.querySelectorAll('.node').forEach(n=>n.onclick=()=>{if(state.mapPlanner?.active){state.mapPlanner.target=n.dataset.id;renderMap()}else openLocation(n.dataset.id)});
 bindMapPlanner();requestAnimationFrame(syncMapNetworkGeometryV23);
}

function openActionCenter(prefill=''){
 const tutorialTarget=tutorialStage()===1?'store':tutorialStage()===2?'hardware':tutorialStage()===3?'school':'';
 const plannerTarget=state.mapPlanner?.active?state.mapPlanner?.target:'';
 const target=prefill||tutorialTarget||plannerTarget||'homes';
 actionFlow={step:1,target,mode:availableTransportModes().slice(-1)[0][0],water:Math.min(state.resources.water,state.day>=30?4:2),battery:Math.min(state.resources.battery,state.day>=30?8:2),priority:'water',assetId:'',toolkit:!!state.gear.toolkit,routeMode:state.mapPlanner?.routeMode||'fastest'};
 state.mapPlanner.target=target;state.mapPlanner.routeMode=actionFlow.routeMode;renderActionCenter();
 if(!$('actionCenterDialog').open)$('actionCenterDialog').showModal();
}
const renderActionCenterCoreV23=renderActionCenter;
renderActionCenter=function(){
 renderActionCenterCoreV23();
 const c=$('actionCenterContent');if(c&&!c.querySelector('.field-ops-purpose'))c.insertAdjacentHTML('afterbegin','<div class="field-ops-purpose"><b>外出行動中心</b><span>只負責「去哪裡、走哪條路、帶什麼、是否出發」。基地、人員、科技與工程分開管理。</span></div>');
};

const AUDIO_TRACKS_V23={
 music:'assets/audio/music/scorched-city-theme.ogg',
 night:'assets/audio/ambience/city-night.ogg',
 day:'assets/audio/ambience/city-day-heat.ogg',
 endless:'assets/audio/ambience/city-endless-industrial.ogg'
};
const audioLayersV23={music:null,ambience:null};
let audioMissingNoticeV23=false;
function audioModeV23(){return state.day>=30?'endless':state.phase==='night'?'night':'day'}
async function audioExistsV23(src){try{const r=await fetch(src,{method:'HEAD',cache:'no-store'});return r.ok}catch{return false}}
async function ensureAudioV23(kind,src,volume){
 let a=audioLayersV23[kind];if(!a){a=new Audio();a.loop=true;a.preload='none';a.volume=volume;audioLayersV23[kind]=a}
 if(a.dataset.src!==src){a.pause();a.src=src;a.dataset.src=src}
 if(!(await audioExistsV23(src)))return false;
 try{await a.play();return true}catch{return false}
}
async function syncAmbientAudioV23(){
 if(!audioEnabled){Object.values(audioLayersV23).forEach(a=>a?.pause());return false}
 const okMusic=await ensureAudioV23('music',AUDIO_TRACKS_V23.music,.18);
 const okAmb=await ensureAudioV23('ambience',AUDIO_TRACKS_V23[audioModeV23()],.34);
 if(!okMusic&&!okAmb&&!audioMissingNoticeV23){audioMissingNoticeV23=true;toast('音訊播放系統已接入；目前 assets/audio 尚缺實際音訊檔')}
 return okMusic||okAmb;
}
function playAlert(){/* 禁止電子合成提示音；實體 Foley 素材到位後再接入。 */}
async function toggleAudio(){
 audioEnabled=!audioEnabled;const btn=$('soundBtn');
 if(btn){btn.textContent=audioEnabled?'環境音 ON':'環境音 OFF';btn.setAttribute('aria-pressed',audioEnabled?'true':'false');btn.classList.toggle('active',audioEnabled)}
 if(audioEnabled){const ok=await syncAmbientAudioV23();if(ok)toast('背景音樂／環境音已開啟')}else{await syncAmbientAudioV23();toast('背景音樂／環境音已關閉')}
}
const renderV13CoreV23=renderV13;
renderV13=function(){renderV13CoreV23();if(audioEnabled)syncAmbientAudioV23()};

(function installV23Ui(){
 if(state.mapPlanner){state.mapPlanner.active=false;if((state.expedition?.count||0)===0)state.mapPlanner.target=null}
 const baseBox=$('baseStats')?.closest('section');
 if(baseBox){
  const h=baseBox.querySelector('.section-head h2');if(h)h.textContent='灼城狀態';
  const tag=baseBox.querySelector('.section-tag');if(tag)tag.textContent='CITY STATUS';
  if(!$('cityStatusToggle')){const b=document.createElement('button');b.id='cityStatusToggle';b.className='mini';b.textContent='展開';b.setAttribute('aria-expanded','false');baseBox.querySelector('.section-head')?.appendChild(b)}
  $('baseStats').hidden=true;
  $('cityStatusToggle').onclick=()=>{const open=$('baseStats').hidden;$('baseStats').hidden=!open;$('cityStatusToggle').textContent=open?'收合':'展開';$('cityStatusToggle').setAttribute('aria-expanded',open?'true':'false')};
 }
 const topLife=document.querySelector('.status-grid .stat.critical span');if(topLife)topLife.textContent='生存續航';
 const actionBtn=$('actionCenterBtn');if(actionBtn)actionBtn.innerHTML='<span>外出行動</span><small>目的地 → 路線 → 裝載 → 出發</small>';
 const actionDlg=$('actionCenterDialog');if(actionDlg){const h=actionDlg.querySelector('.action-title h2');if(h)h.textContent='外出行動中心';const p=actionDlg.querySelector('.dialog-body>p.muted');if(p)p.textContent='規劃一次實際外出：選目的地、判讀情報、比較路線、配置裝載，最後決定是否出發。'}
 const routeBtn=$('routePlanBtn');if(routeBtn)routeBtn.classList.remove('active');
 const sound=$('soundBtn');if(sound){sound.textContent='環境音 OFF';sound.title='切換背景音樂與城市環境音'}
 window.addEventListener('resize',()=>requestAnimationFrame(syncMapNetworkGeometryV23),{passive:true});
 render();
})();
