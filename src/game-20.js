/* v14.2.2 QA — NPC Encounter Pass
   Player knowledge is separate from NPC world state.
   A survivor can exist at a location without the player knowing who they are. */

const NPC_FIRST_LABEL={lin:'林',chen:'陳',mei:'美玲',wu:'吳先生'};

function npcIdOf(n){return Object.keys(state.npcs||{}).find(id=>state.npcs[id]===n)||''}
function npcKnowledge(id){
 state.npcKnowledge=state.npcKnowledge||{};
 if(!state.npcKnowledge[id])state.npcKnowledge[id]={seen:false,nameKnown:false,roleKnown:false,tradeUnlocked:false,metDay:null};
 return state.npcKnowledge[id];
}
function npcKnown(n){const id=npcIdOf(n);return !!id&&!!npcKnowledge(id).roleKnown}
function npcEncounterAt(locationId){return Object.entries(state.npcs||{}).find(([,n])=>n.alive&&n.location===locationId)||null}
function npcPublicName(id){const n=state.npcs[id],k=npcKnowledge(id);if(k.roleKnown)return n.name;if(k.nameKnown)return NPC_FIRST_LABEL[id]||'倖存者';return '陌生倖存者'}
function npcPublicRole(id){return npcKnowledge(id).roleKnown?(state.npcs[id]?.role||'未知'):'身份未知'}

function openNpcEncounter(id){
 const n=state.npcs[id];if(!n||!n.alive)return;
 const k=npcKnowledge(id),dlg=$('incidentDialog');if(!dlg)return;
 let title='',body='',buttons='';
 if(!k.seen){
  title='你不是一個人';
  body='搜索途中，你聽見附近傳來移動與整理物品的聲音。有人正在這個地點活動，但你還不知道對方是誰。';
  buttons='<button data-npc-choice="approach">接近並表明來意</button><button data-npc-choice="observe" class="secondary">先觀察</button><button data-npc-choice="leave" class="secondary">不打擾，離開</button>';
 }else if(!k.nameKnown){
  title='附近有人活動';
  body='你已確認這裡有一名倖存者。對方仍保持距離，沒有主動說明身份。';
  buttons='<button data-npc-choice="approach">主動交談</button><button data-npc-choice="leave" class="secondary">暫時離開</button>';
 }else if(!k.roleKnown){
  title=`${npcPublicName(id)}｜初次接觸`;
  body=`對方只告訴你可以稱呼他為「${npcPublicName(id)}」。你還不知道他原本做什麼，也不知道他願不願意交換物資。`;
  buttons='<button data-npc-choice="askRole">繼續交談</button><button data-npc-choice="leave" class="secondary">先保持距離</button>';
 }else{
  title=`${n.name}｜${n.role}`;
  body='你已經確認對方的身份。接下來可以談物資、情報或其他合作。';
  buttons='<button data-npc-choice="trade">談交換與情報</button><button data-npc-choice="leave" class="secondary">離開</button>';
 }
 $('incidentTitle').textContent=title;$('incidentBody').textContent=body;$('incidentChoices').innerHTML=buttons;
 if(!dlg.open)dlg.showModal();
 $('incidentChoices').querySelectorAll('[data-npc-choice]').forEach(b=>b.onclick=()=>resolveNpcEncounter(id,b.dataset.npcChoice));
}

function resolveNpcEncounter(id,choice){
 const n=state.npcs[id],k=npcKnowledge(id),dlg=$('incidentDialog');if(!n)return;
 if(choice==='leave'){k.seen=true;if(dlg?.open)dlg.close();render();saveGame(false);return}
 if(choice==='observe'){k.seen=true;k.metDay=k.metDay||state.day;log(`你在${mapLoc(n.location)?.name||'該區'}確認有人活動，但沒有主動接觸。`);if(dlg?.open)dlg.close();render();saveGame(false);return}
 if(choice==='approach'){k.seen=true;k.nameKnown=true;k.metDay=k.metDay||state.day;openNpcEncounter(id);saveGame(false);return}
 if(choice==='askRole'){
  k.seen=true;k.nameKnown=true;k.roleKnown=true;k.tradeUnlocked=true;k.metDay=k.metDay||state.day;
  log(`你認識了${n.name}，並確認其專業是${n.role}。`,'good');
  openNpcEncounter(id);render();saveGame(false);return;
 }
 if(choice==='trade'){if(dlg?.open)dlg.close();openTrade(id)}
}

function maybeEncounterNpc(locationId){const pair=npcEncounterAt(locationId);if(!pair)return false;const [id]=pair;if(npcKnowledge(id).tradeUnlocked)return false;openNpcEncounter(id);return true}

function openLocation(id){
 preloadScene(id);const loc=locations.find(x=>x.id===id),lc=state.locations[id];
 $('locTitle').textContent=loc.name;
 $('locDesc').innerHTML=`<div class="location-hero"><div class="location-scene${sceneClass(id)}"><img class="scene-base" src="${locationArt(id)}" alt="${loc.name}" decoding="async">${sceneOverlayHtml(id)}${districtHistoryHtml(id)}<span class="scene-quality">${sceneBadge(id)} · ${sceneMode().toUpperCase()}</span></div><div class="location-hero-copy"><p>${loc.desc}</p><div class="tag-row">${locationTags(id).map(t=>`<span class="tag">${t}</span>`).join('')}</div>${sceneStatusHtml(id)}</div></div>`;
 const intel=intelLabel(id);
 $('locMeta').innerHTML=`<div class="meta"><span>搜索耗時</span>${timeCostFor(loc)} 小時</div><div class="meta"><span>單趟載重</span>${cargoCapacityKg()} kg</div><div class="meta"><span>車輛燃料</span>${state.gear.vehicle?travelFuelCost(loc)+' L':'—'}</div><div class="meta"><span>永晝耗電</span>${state.day>=30?coolingCost(loc)+' kWh':'—'}</div><div class="meta"><span>情報</span>${intel||'無'}</div>`;
 $('locStock').innerHTML=lc.searched?stockChips(lc.remaining):(state.intel[id]?`<span class="muted">${state.intel[id].summary}；實際數量仍需搜索確認。</span>`:'<span class="muted">尚未掌握這裡的庫存。</span>');
 const npc=npcEncounterAt(id);let a=[];
 if(id!=='base'){a.push('<button id="searchLoc">快速搜索</button>');a.push('<button id="planLoc" class="secondary">規劃遠征</button>')}
 if(npc){const [nid]=npc,k=npcKnowledge(nid);if(k.tradeUnlocked)a.push(`<button id="tradeLoc" class="secondary">與${npcPublicName(nid)}交談／交易</button>`);else if(k.seen)a.push(`<button id="meetLoc" class="secondary">接觸${k.nameKnown?npcPublicName(nid):'附近的倖存者'}</button>`)}
 if(loc.special==='vent')a.push('<button id="openCraftFromLoc" class="secondary">中央站工程</button>');
 $('locActions').innerHTML=a.join('');$('locationDialog').showModal();
 if($('searchLoc'))$('searchLoc').onclick=()=>searchLocation(loc);
 if($('planLoc'))$('planLoc').onclick=()=>{$('locationDialog').close();openActionCenter(id)};
 if($('tradeLoc'))$('tradeLoc').onclick=()=>openTrade(npc[0]);
 if($('meetLoc'))$('meetLoc').onclick=()=>{$('locationDialog').close();openNpcEncounter(npc[0])};
 if($('openCraftFromLoc'))$('openCraftFromLoc').onclick=()=>{$('locationDialog').close();openCraft()};
}

function searchLocation(loc){
 if(!isSafeSearch(loc))return toast(state.day<30?'白晝無法安全搜索':'永晝中缺少主動冷卻');
 const tc=timeCostFor(loc);if(state.day<30&&state.hoursLeft<tc)return toast('剩餘時間不足');
 const cc=state.day>=30?coolingCost(loc):0,fc=travelFuelCost(loc);
 if(state.gear.vehicle&&state.resources.fuel<fc)return toast('車輛燃料不足');
 if(state.day>=30&&state.resources.battery<cc)return toast('冷卻與交通電力不足');
 if(state.day<30)state.hoursLeft-=tc;else state.resources.battery-=cc;if(state.gear.vehicle)state.resources.fuel-=fc;
 let cap=cargoCapacityKg(),used=0,gain={},rem=state.locations[loc.id].remaining;
 for(const k of RES_ORDER){const av=rem[k]||0;if(av<=0||cap-used<=.05)continue;const w=RES_WEIGHT[k]||1;const maxByWeight=Math.floor((cap-used)/w);if(maxByWeight<=0)continue;const take=Math.min(av,maxByWeight);rem[k]-=take;state.resources[k]+=take;gain[k]=take;used+=take*w}
 tutorialWaterGain(gain);state.locations[loc.id].searched=true;state.intel[loc.id]={day:state.day,verifiedDay:state.day,summary:summarizeRemaining(rem),source:'親自搜索',confidence:100};
 discoverAssetsAt(loc.id);
 if(loc.special==='cart'&&!state.gear.cart){state.gear.cart=true;log('你在五金行整理出一台可用推車，單趟載重提升到 80kg。','good')}
 if(loc.special==='vehicle'&&!state.gear.vehicle&&state.resources.fuel>=2){state.gear.vehicle=true;state.resources.fuel-=2;log('你在消防站整理出一台可用工程車，單趟載重提升到 700kg。','good')}
 if(loc.special==='coreInfo'&&!state.knownCore&&state.resources.data>=4){state.knownCore=true;log('研究資料確認：冷源核心仍在地下熱工實驗艙。','major')}
 if(loc.special==='solar'&&state.resources.data>=2)log('你取得太陽能場的逆變與配電資料。','good');
 log(`${loc.name} 搜索：${Object.entries(gain).map(([k,v])=>`${RES_LABELS[k]||k}+${v}`).join('、')||'沒有實質收穫'}｜裝載 ${Math.round(used)} / ${cap} kg`);
 $('locationDialog').close();render();checkState();saveGame(false);setTimeout(()=>maybeEncounterNpc(loc.id),0);
}

/* Guard the existing trade economy so it can only be entered after a real encounter. */
const _npcEncounterBaseOpenTrade=openTrade;
openTrade=function(id){if(!npcKnowledge(id).tradeUnlocked)return openNpcEncounter(id);return _npcEncounterBaseOpenTrade(id)};

/* Expeditions use a result screen. When the player returns from a location with an unknown NPC,
   queue the encounter for the moment the report is closed. */
const _npcEncounterBaseShowResult=showExpeditionResult;
showExpeditionResult=function(result){
 _npcEncounterBaseShowResult(result);
 if(result?.retreated)return;
 const pair=npcEncounterAt(result.location);if(!pair)return;const [id]=pair;if(npcKnowledge(id).tradeUnlocked)return;
 const dlg=$('expeditionResultDialog');if(!dlg)return;
 const onClose=()=>{dlg.removeEventListener('close',onClose);setTimeout(()=>maybeEncounterNpc(result.location),0)};
 dlg.addEventListener('close',onClose,{once:true});
};

/* Remove authored descriptions that gave away NPC identity before the player met them. */
const _clinicLoc=locations.find(l=>l.id==='clinic');if(_clinicLoc)_clinicLoc.desc='醫療用品集中處。建物內可能仍有人活動，但目前身份不明。';
const _fireLoc=locations.find(l=>l.id==='fire');if(_fireLoc)_fireLoc.desc='工程車、水泵、燃料與耐熱工具集中處。現場可能仍有倖存者活動。';
