/* v14.2.2 QA — X28/X29 hardening + X27–X32 readback coverage */

/* X28 — expose the actual trust-backed unlock thresholds instead of generic tier copy. */
function npcRelationUnlocksV84(id){
 const s=npcRelationScoreV79(id),n=state.npcs?.[id],trust=n?.trust||0,rows=[
  {score:55,label:'情報交換',unlocked:trust>=1,detail:'可使用「詢問／交換情報」'},
  {score:65,label:'擴充交易條件',unlocked:trust>=3,detail:'交易時最多顯示 2 組條件，並透露更多庫存狀況'},
  {score:85,label:'精確庫存',unlocked:trust>=7,detail:'對方願意公開已確認物資數量'}
 ];
 return {score:s,rows}
}
relationHtmlV79=function(id){
 const s=npcRelationScoreV79(id),u=npcRelationUnlocksV84(id),k=typeof npcKnowledge==='function'?npcKnowledge(id):null;
 const rows=u.rows.map(x=>`<span>${x.unlocked?'已解鎖':`${x.score}/100`} · ${x.label}：${x.detail}</span>`).join('');
 return `<div class="relation-meter-v79"><div><span>好感度 ${s}/100</span><b>${npcRelationTierV79(id)}</b></div><div class="relation-track-v79"><i style="width:${s}%"></i></div><small>${npcRelationMilestoneV79(id)}</small><small>${rows}</small><small>${k?.tradeUnlocked?'交易入口已解鎖':'交易入口需先完成身份接觸；好感度不會跳過身份確認。'}</small></div>`
};

/* X29 — four deterministic consequence classes with real state impact. */
function ensureHighRiskInjuriesV84(){state.flags=state.flags||{};state.flags.highRiskInjuriesV84=state.flags.highRiskInjuriesV84||{};return state.flags.highRiskInjuriesV84}
function highRiskInjuredV84(id){const r=ensureHighRiskInjuriesV84()[id];return !!(r&&r.untilDay>=state.day)}
function highRiskVictimV84(){
 try{const t=typeof ensureFieldTeamV43==='function'?ensureFieldTeamV43():null;if(t?.active&&t.npcIds?.length)return t.npcIds[0]}catch{}
 return 'player'
}
function applyHighRiskInjuryV84(loc){
 const victim=highRiskVictimV84(),inj=ensureHighRiskInjuriesV84();
 if(victim==='player'){
  state.fatigue=clamp((state.fatigue||0)+12,0,100);const med=(state.resources.medicine||0)>0?1:0;if(med)state.resources.medicine-=1;
  inj.player={day:state.day,untilDay:state.day,label:`${loc.name}搜索擦傷／熱傷`};
  log(`${loc.name}高風險事件：你在撤離時受傷，疲勞 +12%${med?'，並消耗 1 醫療用品':'；目前沒有醫療用品可處置'}。`,'bad');return
 }
 const n=state.npcs?.[victim],p=typeof npcShiftV41==='function'?npcShiftV41(victim):null;
 if(p){p.fatigue=clamp((p.fatigue||0)+18,0,100);p.workedToday=Math.min(npcMaxDutyHoursV41(victim),Math.max(p.workedToday||0,npcMaxDutyHoursV41(victim)))}
 inj[victim]={day:state.day,untilDay:state.day+1,label:`${loc.name}外勤受傷`};
 log(`${loc.name}高風險事件：${n?.name||'一名隊員'}受傷，今天剩餘專業工時歸零，至少休整到 Day ${state.day+1}。`,'bad')
}
function forceHighRiskOverrunV84(loc,hours=.5){
 const h=Math.max(.1,+hours||.5),left=typeof currentPeriodHoursLeftV26==='function'?currentPeriodHoursLeftV26():Math.max(0,+state.hoursLeft||0),spend=Math.min(h,left);
 if(spend>0){
  if(typeof processChargingV24==='function')processChargingV24(spend);
  if(state.day>=30&&typeof ensureWorldClockV26==='function'){const c=ensureWorldClockV26();c.endlessElapsed=clamp(c.endlessElapsed+spend,0,24)}else state.hoursLeft=Math.max(0,Math.round(((state.hoursLeft||0)-spend)*100)/100)
 }
 log(`${loc.name}高風險事件：封鎖與繞路造成時間超支 +${h.toFixed(1)}h${spend<h?'；本時段可用時間已耗盡':''}。`,'bad')
}
applyHighRiskConsequenceV79=function(loc){
 if(!loc||loc.risk<4)return false;const seen=ensureHighRiskEventsV79(),key=`${state.day}:${loc.id}`;if(seen[key])return false;seen[key]=true;
 const code=(state.day+loc.id.split('').reduce((a,c)=>a+c.charCodeAt(0),0))%4;
 if(code===0){
  if(state.gear?.vehicle){const cur=Number.isFinite(+state.vehicle?.condition)?+state.vehicle.condition:100;state.vehicle.condition=Math.max(0,cur-6);log(`${loc.name}高風險事件：破碎路面與熱脹接縫造成裝備損壞，工程車車況 −6%。`,'bad')}
  else{state.fatigue=clamp((state.fatigue||0)+8,0,100);log(`${loc.name}高風險事件：缺乏工程車保護，攜行裝備被迫棄置部分防護，疲勞 +8%。`,'bad')}
 }else if(code===1)applyHighRiskInjuryV84(loc);
 else if(code===2)forceHighRiskOverrunV84(loc,.5);
 else{
  const lostWater=loseAccessibleSupplyV79('water',2),lostFood=lostWater<2?loseAccessibleSupplyV79('food',1):0;
  if(lostWater||lostFood)log(`${loc.name}高風險事件：撤離時遭人趁亂搶走外放補給，損失${lostWater?`水 ${lostWater}L`:''}${lostWater&&lostFood?'、':''}${lostFood?`食物 ${lostFood}`:''}。`,'bad');
  else{state.fatigue=clamp((state.fatigue||0)+6,0,100);log(`${loc.name}高風險事件：不明人員試圖攔截隊伍；因沒有可搶補給，改以繞路撤離，疲勞 +6%。`,'bad')}
 }
 saveGame(false);return true
};

/* Injured NPCs cannot be scheduled back into the field until the recovery day passes. */
const _fieldTeamNpcEligibleV84=fieldTeamNpcEligibleV43;
fieldTeamNpcEligibleV43=function(id){if(highRiskInjuredV84(id))return false;return _fieldTeamNpcEligibleV84(id)};
const _fieldTeamValidationV84=fieldTeamValidationV43;
fieldTeamValidationV43=function(e){
 const v=_fieldTeamValidationV84(e),extra=[];for(const id of ensureFieldTeamV43().npcIds)if(highRiskInjuredV84(id))extra.push(`${state.npcs?.[id]?.name||id}仍在處理外勤傷勢，Day ${ensureHighRiskInjuriesV84()[id].untilDay+1} 前不可再次出勤`);
 const issues=[...new Set([...v.issues,...extra])];return {...v,ok:issues.length===0,issues}
};

/* Keep personnel readback explicit when a high-risk injury is active. */
const _renderPersonnelV84=renderPersonnel;
renderPersonnel=function(){const out=_renderPersonnelV84();document.querySelectorAll('[data-person]').forEach(card=>{const id=card.dataset.person,r=ensureHighRiskInjuriesV84()[id];if(!r||!highRiskInjuredV84(id)||card.querySelector('.high-risk-injury-v84'))return;const n=document.createElement('small');n.className='high-risk-injury-v84';n.textContent=`外勤傷勢：${r.label} · 暫停出勤至 Day ${r.untilDay+1}`;card.appendChild(n)});return out};

renderPersonnel();
