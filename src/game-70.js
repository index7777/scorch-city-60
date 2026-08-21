/* v14.2.2 QA — X23–X26 pacing corrections after readback */

/* Existing saves may already have searched locations but no pacing record. Treat those as prior visits so migration cannot restore first-pass yield. */
const _searchRecordV70=searchRecordV69;
searchRecordV69=function(id){
 const r=_searchRecordV70(id),legacy=!!state.locations?.[id]?.searched;
 if(legacy&&(r.visits||0)===0&&(r.quick||0)===0&&(r.full||0)===0&&(r.lastSearchDay||0)===0){r.visits=1;r.full=1;r.migratedLegacy=true}
 return r
};

/* Early-game survival has handling / evaporation / spoilage overhead. This raises Day 1–7 burn without changing later balance. */
const _dailyWaterNeedV70=dailyWaterNeed;
dailyWaterNeed=function(){
 const base=_dailyWaterNeedV70();
 const overhead=state.day<=3?2:state.day<=7?1:0;
 return Math.max(1,base+overhead)
};
const _dailyFoodNeedV70=dailyFoodNeed;
dailyFoodNeed=function(){
 const base=_dailyFoodNeedV70();
 const overhead=state.day<=7?1:0;
 return Math.max(1,base+overhead)
};

/* First full search gets normal efficiency but is still bounded by the early kg budget. Revisits decay sharply. */
searchRecoveryFactorV69=function(id,mode='full'){
 const n=searchRecordV69(id).visits;
 const table=mode==='quick'?[.65,.32,.16,.08]:[1,.45,.22,.10];
 return table[Math.min(n,table.length-1)]
};

/* Quick search may only touch labelled small resources. Cart / vehicle / core / solar special discoveries require full planned search. */
const _applySearchSpecialV70=applySearchSpecialV68;
applySearchSpecialV68=function(loc,full){if(!full)return;return _applySearchSpecialV70(loc,true)};

/* Risk may rise immediately, but downward movement is consumed only once when a new day is entered. Same-day recovery cannot cross a risk band instantly. */
syncRiskTrendV69=function(){
 ensurePacingV69();
 const f=state.flags.riskTrendV69,raw=Math.max(0,_rawRiskScoreV69());
 if(f.display===null||!Number.isFinite(f.display)){f.display=raw;f.lastDecayDay=state.day;return f.display}
 const newDay=f.lastDecayDay!==state.day;
 if(raw>f.display)f.display=raw;
 else if(newDay&&raw<f.display)f.display=Math.max(raw,f.display-1);
 if(newDay)f.lastDecayDay=state.day;
 return f.display
};

/* Make the actual early pressure explicit in strategy UI rather than hiding the higher burn inside arithmetic. */
function earlyDemandTextV70(){
 if(state.day<=3)return `前期高耗：每日額外 +2L 水、+1 食物（搬運損耗／高溫保存）`;
 if(state.day<=7)return `前期高耗：每日額外 +1L 水、+1 食物`;
 return ''
}
const _renderMainlineHudV70=renderMainlineHudV67;
renderMainlineHudV67=function(){
 const out=_renderMainlineHudV70();
 const rail=$('mainlineHudV67'),txt=earlyDemandTextV70();
 if(rail){let note=rail.querySelector('.early-demand-v70');if(txt&&!note){note=document.createElement('div');note.className='early-demand-v70';rail.appendChild(note)}if(note){note.textContent=txt;note.hidden=!txt}}
 return out
};

ensurePacingV69();syncRiskTrendV69();render();