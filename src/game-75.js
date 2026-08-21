/* v14.2.2 QA — X23–X26 final pacing sync: refresh visible risk immediately on day rollover */
const _advanceV75=advance;
advance=function(){
 const beforeDay=state.day;
 const out=_advanceV75();
 if(state.day!==beforeDay){
  syncRiskTrendV69();
  if(typeof renderV13==='function')renderV13();
  if(typeof renderSummary==='function')renderSummary();
  if(typeof renderMainlineHudV67==='function')renderMainlineHudV67();
  saveGame(false)
 }
 return out
};
