// v14.9 Batch 5 — encounter-gated dialogue, relationships, barter and party joining.
(function(){
 const TOPIC_KINDS_V122=[
  ['status','現在狀況'],['work','你的工作'],['place','這裡'],['needs','目前需要'],['plan','接下來打算'],['broadcast','世界廣播'],['rest','休息'],['travel','一起行動'],['supplies','手上的物資'],['skill','你會做什麼'],['trust','彼此怎麼合作'],['recent','最近遇到什麼']
 ];
 const TRADE_START_V122={
  'npc-lin-yuxuan':['item-gauze-roll','item-antiseptic-solution'],
  'npc-chen-guowei':['item-fuse-pack','item-usb-cable'],
  'npc-wu-jianming':['item-adjustable-wrench','item-bearing'],
  'npc-he-xinyi':['item-crackers','item-water-small-sealed'],
  'npc-zhang-zihao':['item-crowbar','item-instant-cold-pack'],
  'npc-liu-yating':['item-small-coolant-bottle','item-hose-short'],
  'npc-huang-shengjie':['item-fastener-box','item-sheet-metal'],
  'npc-xu-peizhen':['item-energy-bar','item-adhesive-bandage'],
  'npc-wang-kai':['item-water-large-sealed','item-glucose-gel'],
  'npc-gao-ruoxi':['item-9v-battery','item-damaged-phone']
 };
 function topicBodyV122(n,kind){
  const loc=typeof mapLoc==='function'?mapLoc(n.location)?.name:'';
  const bodies={
   status:`${n.name}看起來還能行動。眼下最在意的是「${n.priority}」。`,
   work:`「我是${n.role}。真正碰到我熟悉的東西，我可以判斷得比較快。」`,
   place:loc?`「我只敢說眼前看得到的。${loc}這裡還得一樣一樣確認。」`:'「我只敢說眼前看得到的，其他地方我不亂猜。」',
   needs:'「先把能確定的需求處理掉。沒有看到的東西，不要當成一定存在。」',
   plan:`「我現在的打算還是${n.priority}。如果情況變了，我會改。」`,
   broadcast:'「廣播的高溫時程我也聽到了。除此之外，我沒有比你多一份完整答案。」',
   rest:`「體力不是無限的。硬撐只會讓下一次判斷更差。」`,
   travel:'「要一起走可以，但我得知道你不是只把人當工具。」',
   supplies:'「物資先看實物。誰手上有什麼，交換時再攤開來講。」',
   skill:`「我最有把握的是${n.role}相關的事。超出這個範圍，我不會裝懂。」`,
   trust:'「合作要靠做過的事，不是靠一句保證。你怎麼處理風險，我會記得。」',
   recent:'「最近的事我只說自己親眼確認的；傳聞我會另外講清楚。」'
  };
  return bodies[kind]||'「先把眼前能確認的事處理好。」';
 }
 function buildTopicsV122(){const out={};for(const [id,d] of Object.entries(CORE_NPCS_V121||{})){out[id]=TOPIC_KINDS_V122.map(([kind,label],i)=>({id:`${id}-t${String(i+1).padStart(2,'0')}`,kind,label,body:topicBodyV122({id,name:d.name,role:d.role,priority:d.priority,location:d.home},kind)}))}return out}
 const DIALOGUE_TOPICS_V122=buildTopicsV122();
 function cloneNpcTradeV122(id){return (TRADE_START_V122[id]||[]).map(x=>typeof physicalItemV119==='function'?physicalItemV119(x):null).filter(Boolean)}
 function ensureSocialV122(s=state){
  if(typeof ensureCoreNpcStateV121==='function')ensureCoreNpcStateV121(s);
  s.socialV122=s.socialV122&&typeof s.socialV122==='object'?s.socialV122:{};
  const social=s.socialV122;
  social.people=social.people&&typeof social.people==='object'?social.people:{};
  for(const id of Object.keys(CORE_NPCS_V121||{}))if(!social.people[id])social.people[id]={trust:0,talked:[],tradeOpen:false,selectedOffer:-1,inventory:cloneNpcTradeV122(id)};
  return social;
 }
 function socialNpcV122(id,s=state){return ensureSocialV122(s).people[id]||null}
 function relationLabelV122(id,s=state){const p=socialNpcV122(id,s);return p.trust>=4?'信任':p.trust>=2?'熟悉':'陌生'}
 function availableTopicsV122(id,s=state){const p=socialNpcV122(id,s),all=DIALOGUE_TOPICS_V122[id]||[];const count=Math.min(all.length,3+p.talked.length);return all.slice(0,count)}
 function canSocializeV122(id,s=state){const n=typeof npcV121==='function'?npcV121(id,s):null;const here=typeof currentLocV121==='function'?currentLocV121():ensureExplorationV113().current;return !!(n&&n.alive&&n.encountered&&n.location===here&&s.explorationV118?.observed?.[here]===true)}
 function talkV122(id,topicId,s=state){
  if(!canSocializeV122(id,s))return {ok:false,reason:'對方現在不在這裡'};
  const p=socialNpcV122(id,s),topic=(DIALOGUE_TOPICS_V122[id]||[]).find(t=>t.id===topicId);if(!topic||!availableTopicsV122(id,s).some(t=>t.id===topicId))return {ok:false,reason:'現在還談不到這件事'};
  const first=!p.talked.includes(topicId);if(first){p.talked.push(topicId);p.trust=Math.min(6,p.trust+1)}
  return {ok:true,first,body:topicBodyV122(npcV121(id,s),topic.kind),trust:p.trust};
 }
 function setPartyV122(id,on=true,s=state){
  if(!canSocializeV122(id,s))return {ok:false,reason:'對方現在不在這裡'};
  const p=socialNpcV122(id,s);if(on&&p.trust<2)return {ok:false,reason:'你們還不夠熟悉'};
  return typeof setCompanionV121==='function'?setCompanionV121(id,on,s):{ok:false,reason:'同行系統不可用'};
 }
 function backpackTradeItemsV122(s=state){if(typeof ensurePhysicalInventoryV115==='function')ensurePhysicalInventoryV115(s);return (s.backpack?.items||[]).map((item,index)=>({item,index})).filter(x=>x.item&&x.item.catalogId)}
 function tradeV122(id,offerIndex,playerIndex,s=state){
  if(!canSocializeV122(id,s))return {ok:false,reason:'對方現在不在這裡'};
  const p=socialNpcV122(id,s),offer=p.inventory?.[offerIndex],player=s.backpack?.items?.[playerIndex];if(!offer||!player||!player.catalogId)return {ok:false,reason:'交換物已經改變'};
  const check=typeof backpackAdmissionV115==='function'?backpackAdmissionV115(offer,s):{ok:true};
  const incoming=typeof itemWeightKgV115==='function'?itemWeightKgV115(offer):Number(offer.weightKg)||0,outgoing=typeof itemWeightKgV115==='function'?itemWeightKgV115(player):Number(player.weightKg)||0;
  if(!check.ok&&s.backpack.currentKg-outgoing+incoming>s.backpack.capacityKg+1e-9)return {ok:false,reason:check.reason||'背包放不下'};
  p.inventory.splice(offerIndex,1);s.backpack.items.splice(playerIndex,1);p.inventory.push({...player});s.backpack.items.push({...offer});
  if(typeof recalcPhysicalWeightsV115==='function')recalcPhysicalWeightsV115(s);if(typeof syncLegacyWaterV115==='function')syncLegacyWaterV115(s);p.trust=Math.min(6,p.trust+1);return {ok:true,received:offer.name,given:player.name,trust:p.trust};
 }
 function itemNameV122(item){return item?.name||itemDefV119?.(item?.catalogId)?.name||'物品'}
 function removeLegacyNpcPanelV122(){document.querySelectorAll('.npc-presence-v121').forEach(el=>el.remove())}
 function socialCardV122(n){
  const p=socialNpcV122(n.id),topics=availableTopicsV122(n.id),tradeItems=backpackTradeItemsV122(),last=p.lastBody||'';
  const topicHtml=topics.map(t=>`<button type="button" data-talk-v122="${n.id}|${t.id}">${t.label}</button>`).join('');
  const offerHtml=p.tradeOpen?`<div class="barter-v122"><small>${p.inventory.length?'對方攤出的物品':'對方目前沒有拿出可交換的物品'}</small>${p.inventory.map((o,oi)=>`<div class="barter-offer-v122"><b>${itemNameV122(o)}</b>${tradeItems.length?`<div>${tradeItems.map(x=>`<button type="button" data-trade-v122="${n.id}|${oi}|${x.index}">用 ${itemNameV122(x.item)} 交換</button>`).join('')}</div>`:'<em>你的背包沒有可拿來交換的物品</em>'}</div>`).join('')}</div>`:'';
  const party=n.companion?`<button type="button" data-party-v122="${n.id}|0">停止同行</button>`:`<button type="button" data-party-v122="${n.id}|1" ${p.trust<2?'disabled':''}>一起行動</button>`;
  return `<article class="social-card-v122" data-social-npc-v122="${n.id}"><header><div><b>${n.name}</b><small>${n.role} · ${relationLabelV122(n.id)}</small></div>${party}</header>${last?`<p class="social-last-v122">${last}</p>`:''}<div class="topics-v122">${topicHtml}</div><button type="button" class="trade-toggle-v122" data-trade-toggle-v122="${n.id}">${p.tradeOpen?'收起交換':'交換物資'}</button>${offerHtml}</article>`;
 }
 function renderSocialV122(){
  if(!state.flags?.hardFogOpeningV112)return;const map=document.getElementById('map');if(!map)return;removeLegacyNpcPanelV122();map.querySelector('.social-presence-v122')?.remove();
  const here=typeof currentLocV121==='function'?currentLocV121():ensureExplorationV113().current;if(state.explorationV118?.observed?.[here]!==true)return;
  const present=typeof presentNpcsV121==='function'?presentNpcsV121(here):[];if(!present.length)return;for(const n of present)if(!n.encountered&&typeof encounterNpcV121==='function')encounterNpcV121(n.id);
  const panel=document.createElement('section');panel.className='social-presence-v122';panel.setAttribute('aria-label','你在這裡遇見的人');panel.innerHTML=present.map(socialCardV122).join('');map.appendChild(panel);
  panel.querySelectorAll('[data-talk-v122]').forEach(btn=>btn.onclick=()=>{const [id,tid]=btn.dataset.talkV122.split('|'),r=talkV122(id,tid);if(!r.ok){toast(r.reason);return}socialNpcV122(id).lastBody=r.body;renderMap()});
  panel.querySelectorAll('[data-party-v122]').forEach(btn=>btn.onclick=()=>{const [id,on]=btn.dataset.partyV122.split('|'),r=setPartyV122(id,on==='1');if(!r.ok){toast(r.reason);return}renderMap()});
  panel.querySelectorAll('[data-trade-toggle-v122]').forEach(btn=>btn.onclick=()=>{const p=socialNpcV122(btn.dataset.tradeToggleV122);p.tradeOpen=!p.tradeOpen;renderMap()});
  panel.querySelectorAll('[data-trade-v122]').forEach(btn=>btn.onclick=()=>{const [id,oi,pi]=btn.dataset.tradeV122.split('|'),r=tradeV122(id,Number(oi),Number(pi));if(!r.ok){toast(r.reason);return}log(`你用${r.given}向${npcV121(id).name}換得${r.received}。`,'good');render()});
 }
 function installSocialStylesV122(){if(document.getElementById('socialStylesV122'))return;const st=document.createElement('style');st.id='socialStylesV122';st.textContent=`.social-presence-v122{position:absolute;right:18px;top:18px;z-index:14;width:min(390px,46%);max-height:calc(100% - 36px);overflow:auto;display:grid;gap:9px;padding:12px;border:1px solid rgba(180,210,210,.24);border-radius:12px;background:rgba(10,18,20,.96);backdrop-filter:blur(12px)}.social-card-v122{display:grid;gap:9px;padding:11px;border:1px solid rgba(180,210,210,.14);border-radius:9px}.social-card-v122 header{display:flex;justify-content:space-between;gap:10px;align-items:center}.social-card-v122 header>div{display:grid}.social-card-v122 small,.social-card-v122 em{opacity:.7;font-size:.76rem;font-style:normal}.topics-v122{display:flex;flex-wrap:wrap;gap:6px}.topics-v122 button{font-size:.78rem}.social-last-v122{margin:0;padding:8px;border-left:2px solid rgba(180,210,210,.32);font-size:.84rem;line-height:1.45}.trade-toggle-v122{justify-self:start}.barter-v122{display:grid;gap:7px;padding-top:4px}.barter-offer-v122{display:grid;gap:5px;padding:8px;border:1px solid rgba(180,210,210,.12);border-radius:8px}.barter-offer-v122>div{display:flex;flex-wrap:wrap;gap:5px}.barter-offer-v122 button{font-size:.74rem}@media(max-width:900px){.social-presence-v122{position:relative;right:auto;top:auto;width:auto;max-height:none;margin:12px}}`;document.head.appendChild(st)}
 const prevMakeStateV122=makeState;makeState=function(){const s=prevMakeStateV122();ensureSocialV122(s);return s};ensureSocialV122(state);
 const prevRenderMapV122=renderMap;renderMap=function(){const out=prevRenderMapV122();installSocialStylesV122();queueMicrotask(renderSocialV122);return out};
 const prevRenderV122=render;render=function(){const out=prevRenderV122();installSocialStylesV122();queueMicrotask(renderSocialV122);return out};
 installSocialStylesV122();
 window.TOPIC_KINDS_V122=TOPIC_KINDS_V122;window.DIALOGUE_TOPICS_V122=DIALOGUE_TOPICS_V122;window.ensureSocialV122=ensureSocialV122;window.socialNpcV122=socialNpcV122;window.availableTopicsV122=availableTopicsV122;window.talkV122=talkV122;window.setPartyV122=setPartyV122;window.tradeV122=tradeV122;window.renderSocialV122=renderSocialV122;
})();