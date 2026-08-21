/* v14.2.2 QA — X23 risk-inertia day-lock regression fix */
/*
 game-69 only stamped lastDecayDay when a decline actually happened. If a new day
 began with unchanged raw risk, the stamp stayed on yesterday; a later same-day
 search could then spend that day's decay allowance immediately. Stamp every day
 transition, whether or not the raw score changed, so player actions cannot cause
 a same-day risk downgrade.
*/
function syncRiskTrendV83(){
 ensurePacingV69();
 const f=state.flags.riskTrendV69,raw=Math.max(0,_rawRiskScoreV69());
 if(f.display===null||!Number.isFinite(f.display)){
  f.display=raw;f.lastDecayDay=state.day;f.lastSyncDay=state.day;return f.display
 }
 const newDay=f.lastSyncDay!==state.day;
 if(newDay){
  if(raw>f.display)f.display=raw;
  else if(raw<f.display)f.display=Math.max(raw,f.display-1);
  f.lastDecayDay=state.day;
  f.lastSyncDay=state.day;
  return f.display
 }
 /* Within one day, worsening conditions may raise risk immediately; improvement waits for next day. */
 if(raw>f.display)f.display=raw;
 return f.display
}
syncRiskTrendV69=syncRiskTrendV83;
currentRiskScore=function(){return syncRiskTrendV83()};
/* Migrate an existing save without granting a same-day decay token. */
ensurePacingV69();
if(state.flags.riskTrendV69.lastSyncDay==null)state.flags.riskTrendV69.lastSyncDay=state.day;
syncRiskTrendV83();
if(typeof renderV13==='function')renderV13();
if(typeof renderSummary==='function')renderSummary();
if(typeof renderMainlineHudV67==='function')renderMainlineHudV67();
saveGame(false);
