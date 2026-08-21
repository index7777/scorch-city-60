/* v14.2.2 QA — X27–X30 NPC time cost / relation scale / high-risk consequences / settlement trade */
function spendSocialTimeV79(hours,label){
 const h=Math.max(.1,+hours||.5);
 if(typeof spendWorldTimeV26==='function'){
  const ok=spendWorldTimeV26(h,{label});if(!ok){toast(`${label}需要 ${h}h，但目前可用時間不足`);return false}return true
 }
 if(state.day<30){if((state.hoursLeft||0)+1e-6<h){toast(`${label}需要 ${h}h，但目前只剩 ${state.hoursLeft||0}h`);return false}state.hoursLeft=Math.max(0,state.hoursLeft-h)}
 return true
}
function npcTradePrepaidV79(){const it=typeof ensureItineraryV27==='function'?ensureItineraryV27():null;return !!(it&&it.status==='paused'&&/正在與/.test(it.lastMessage||''))}

/* X27 — first contact and direct social sessions consume actual world time. */
const _resolveNpcEncounterV79=resolveNpcEncounter;
resolveNpcEncounter=function(id,choice){
 if(['approach','observe','askRole'].includes(choice)&&!spendSocialTimeV79(.5,'NPC 接觸'))return;
 return _resolveNpcEncounterV79(id,choice)
};
const _openTradeV79=openTrade;
openTrade=function(id){
 const dlg=$('tradeDialog');if(dlg?.open)return _openTradeV79(id);
 if(!npcTradePrepaidV79()&&!spendSocialTimeV79(.5,'NPC 交涉'))return;
 const out=_openTradeV79(id);renderNpcRelationV79(id);return out
};

/* X28 — visible 0–100 relationship scale using the existing trust source of truth. */
function npcRelationScoreV79(id){const n=state.npcs?.[id];return clamp(50+(n?.trust||0)*5,0,100)}
function npcRelationTierV79(id){const s=npcRelationScoreV79(id);return s<30?'戒備':s<60?'觀望':s<80?'合作':'可靠'}
function npcRelationMilestoneV79(id){const s=npcRelationScoreV79(id);if(s<60)return `距「合作」還差 ${60-s}`;if(s<80)return `距「可靠」還差 ${80-s}`;return '已達可靠關係階段'}
function relationHtmlV79(id){const s=npcRelationScoreV79(id);return `<div class="relation-meter-v79"><div><span>關係 ${s}/100</span><b>${npcRelationTierV79(id)}</b></div><div class="relation-track-v79"><i style="width:${s}%"></i></div><small>${npcRelationMilestoneV79(id)} · 門檻：60 合作、80 可靠；交易解鎖仍需完成身份接觸。</small></div>`}
function renderNpcRelationV79(id){const c=$('tradeContent');if(!c||c.querySelector('.relation-meter-v79'))return;c.insertAdjacentHTML('afterbegin',relationHtmlV79(id))}
const _renderPersonnelV79=renderPersonnel;
renderPersonnel=function(){const out=_renderPersonnelV79();document.querySelectorAll('[data-person]').forEach(card=>{const id=card.dataset.person;if(card.querySelector('.relation-mini-v79'))return;const s=npcRelationScoreV79(id),box=document.createElement('span');box.className='relation-mini-v79';box.innerHTML=`<i style="width:${s}%"></i><small>${s}/100 · ${npcRelationTierV79(id)}</small>`;card.appendChild(box)});return out};

/* X29 — risk-4 locations now create deterministic, physical consequences after successful search. */
function ensureHighRiskEventsV79(){state.flags=state.flags||{};state.flags.highRiskEventsV79=state.flags.highRiskEventsV79||{};return state.flags.highRiskEventsV79}
function loseAccessibleSupplyV79(key,amount){let left=amount;if(typeof ensureFieldTeamV43==='function'&&ensureFieldTeamV43().active&&typeof ensureDynamicCargoV52==='function'){const c=ensureDynamicCargoV52(),have=Math.max(0,+c.resources?.[key]||0),take=Math.min(have,left);if(take>0){c.resources[key]-=take;left-=take}}if(left>0){const have=Math.max(0,+state.resources?.[key]||0),take=Math.min(have,left);state.resources[key]-=take;left-=take}return amount-left}
function applyHighRiskConsequenceV79(loc){
 if(!loc||loc.risk<4)return;const seen=ensureHighRiskEventsV79(),key=`${state.day}:${loc.id}`;if(seen[key])return;seen[key]=true;
 const code=(state.day+loc.id.split('').reduce((a,c)=>a+c.charCodeAt(0),0))%3;
 if(code===0){if(state.gear?.vehicle){state.vehicle.condition=Math.max(0,(state.vehicle.condition||100)-4);log(`${loc.name}高風險事件：破碎路面與熱脹接縫讓工程車底盤受損，車況 −4%。`,'bad')}else{state.fatigue=clamp((state.fatigue||0)+6,0,100);log(`${loc.name}高風險事件：高熱與碎石迫使隊伍繞行，疲勞 +6%。`,'bad')}}
 else if(code===1){state.fatigue=clamp((state.fatigue||0)+8,0,100);log(`${loc.name}高風險事件：短暫熱暴露與搬運擦傷拖慢隊伍，疲勞 +8%。`,'bad')}
 else{const lostWater=loseAccessibleSupplyV79('water',2),lostFood=lostWater<2?loseAccessibleSupplyV79('food',1):0;if(lostWater||lostFood)log(`${loc.name}高風險事件：撤離時一批外放補給遭他人取走，損失${lostWater?`水 ${lostWater}L`:''}${lostWater&&lostFood?'、':''}${lostFood?`食物 ${lostFood}`:''}。`,'bad');else{state.fatigue=clamp((state.fatigue||0)+5,0,100);log(`${loc.name}高風險事件：隊伍為避開不明人員活動繞行，疲勞 +5%。`,'bad')}}
 saveGame(false)
}
const _searchLocationV79=searchLocation;
searchLocation=function(loc){const before=typeof searchRecordV69==='function'?searchRecordV69(loc.id).visits:0,out=_searchLocationV79(loc),after=typeof searchRecordV69==='function'?searchRecordV69(loc.id).visits:before;if(after>before)applyHighRiskConsequenceV79(loc);return out};
const _collectStopLootV79=collectStopLootV27;
collectStopLootV27=function(loc){const before=typeof searchRecordV69==='function'?searchRecordV69(loc.id).visits:0,out=_collectStopLootV79(loc),after=typeof searchRecordV69==='function'?searchRecordV69(loc.id).visits:before;if(after>before)applyHighRiskConsequenceV79(loc);return out};

/* X30 — contacted settlements get a direct finite-stock 1:1 trade entry. */
function settlementContactedV79(s){return !!(s&&state.locations?.[s.location]?.searched)}
function settlementOffersV79(s){const out=[];if((s.food||0)>=2)out.push({label:'4L 水換 2 食物',give:{water:4},take:{food:2}});if((s.water||0)>=6)out.push({label:'3 食物換 6L 水',give:{food:3},take:{water:6}});return out}
function settlementHasV79(s,obj){return Object.entries(obj).every(([k,v])=>(s[k]||0)>=v)}
function applySettlementTradeV79(s,o){if(!canGive(o.give)||!settlementHasV79(s,o.take))return toast('交易條件不足');Object.entries(o.give).forEach(([k,v])=>{state.resources[k]-=v;s[k]=(s[k]||0)+v});Object.entries(o.take).forEach(([k,v])=>{s[k]-=v;state.resources[k]=(state.resources[k]||0)+v});s.trust=(s.trust||0)+1;log(`與${s.name}完成交易：${o.label}。`,'good');$('tradeDialog')?.close();render();saveGame(false)}
function openSettlementTradeV79(id){
 const s=state.settlements?.[id];if(!s)return;if(!settlementContactedV79(s))return toast('尚未實際接觸這個聚落');if(!spendSocialTimeV79(.5,'聚落交易交涉'))return;
 const offers=settlementOffersV79(s),dlg=$('tradeDialog');$('tradeTitle').textContent=`${s.name} · 聚落交易`;$('tradeContent').innerHTML=`<p>聚落庫存是實體有限庫存。交易會直接改變雙方的水與食物。</p><div class="trade-grid"><div class="trade-side"><h3>${s.name}</h3><div class="trade-item"><span>水 L</span><b>${Math.floor(s.water||0)}</b></div><div class="trade-item"><span>食物</span><b>${Math.floor(s.food||0)}</b></div><div class="trade-item"><span>關係</span><b>${Math.floor(s.trust||0)}</b></div></div><div class="trade-side"><h3>你的庫存</h3><div class="trade-item"><span>水 L</span><b>${Math.floor(state.resources.water||0)}</b></div><div class="trade-item"><span>食物</span><b>${Math.floor(state.resources.food||0)}</b></div></div></div><div class="trade-actions">${offers.map((o,i)=>`<button data-settlement-offer-v79="${i}">${o.label}</button>`).join('')||'<span class="muted">目前沒有可成立的有限庫存交換。</span>'}<button id="leaveSettlementTradeV79" class="secondary">離開</button></div>`;if(dlg&&!dlg.open)dlg.showModal();document.querySelectorAll('[data-settlement-offer-v79]').forEach(b=>b.onclick=()=>applySettlementTradeV79(s,offers[+b.dataset.settlementOfferV79]));if($('leaveSettlementTradeV79'))$('leaveSettlementTradeV79').onclick=()=>dlg?.close()
}
const _openSettlementsV79=openSettlements;
openSettlements=function(){const out=_openSettlementsV79(),rows=[...document.querySelectorAll('#settlementContent .settlement')],ids=Object.keys(state.settlements||{}),offset=Math.max(0,rows.length-ids.length);ids.forEach((id,i)=>{const s=state.settlements[id],row=rows[offset+i];if(!row||row.querySelector('[data-settlement-trade-v79]'))return;const b=document.createElement('button');b.type='button';b.className='mini secondary settlement-trade-v79';b.dataset.settlementTradeV79=id;b.textContent=settlementContactedV79(s)?'發起交易 · 0.5h':'尚未接觸';b.disabled=!settlementContactedV79(s);b.title=settlementContactedV79(s)?'使用聚落有限水／食物庫存進行 1:1 交換':'先實際搜索並接觸此聚落所在地';b.onclick=()=>openSettlementTradeV79(id);row.appendChild(b)});return out};

renderPersonnel();
