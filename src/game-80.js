/* v14.2.2 QA — X29 high-risk consequence conservation/readback fix */
applyHighRiskConsequenceV79=function(loc){
 if(!loc||loc.risk<4)return false;const seen=ensureHighRiskEventsV79(),key=`${state.day}:${loc.id}`;if(seen[key])return false;seen[key]=true;
 const code=(state.day+loc.id.split('').reduce((a,c)=>a+c.charCodeAt(0),0))%3;
 if(code===0){
  if(state.gear?.vehicle){const cur=Number.isFinite(+state.vehicle?.condition)?+state.vehicle.condition:100;state.vehicle.condition=Math.max(0,cur-4);log(`${loc.name}高風險事件：破碎路面與熱脹接縫讓工程車底盤受損，車況 −4%。`,'bad')}
  else{state.fatigue=clamp((state.fatigue||0)+6,0,100);log(`${loc.name}高風險事件：高熱與碎石迫使隊伍繞行，疲勞 +6%。`,'bad')}
 }else if(code===1){state.fatigue=clamp((state.fatigue||0)+8,0,100);log(`${loc.name}高風險事件：短暫熱暴露與搬運擦傷拖慢隊伍，疲勞 +8%。`,'bad')}
 else{
  const lostWater=loseAccessibleSupplyV79('water',2),lostFood=lostWater<2?loseAccessibleSupplyV79('food',1):0;
  if(lostWater||lostFood)log(`${loc.name}高風險事件：撤離時一批外放補給遭他人取走，損失${lostWater?`水 ${lostWater}L`:''}${lostWater&&lostFood?'、':''}${lostFood?`食物 ${lostFood}`:''}。`,'bad');
  else{state.fatigue=clamp((state.fatigue||0)+5,0,100);log(`${loc.name}高風險事件：隊伍為避開不明人員活動繞行，疲勞 +5%。`,'bad')}
 }
 saveGame(false);return true
};
const _searchLocationV80=searchLocation;
searchLocation=function(loc){const before=typeof searchRecordV69==='function'?searchRecordV69(loc.id).visits:0,out=_searchLocationV80(loc),after=typeof searchRecordV69==='function'?searchRecordV69(loc.id).visits:before;if(after>before&&loc.risk>=4)render();return out};
