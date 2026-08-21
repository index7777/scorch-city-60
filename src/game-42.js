/* v14.2.2 QA — scheduling accounting hotfix: no duplicate service stats; continuous intel/dispatch consume duty */
useNpcDutyV41=function(id,hours,action=''){
 const p=npcShiftV41(id);hours=Math.max(0,Math.min(+hours||0,npcDutyRemainingV41(id)));if(hours<=0)return 0;
 p.workedToday+=hours;p.fatigue=clamp(p.fatigue+hours*3.2,0,100);p.last={day:state.day,task:p.task,hours,action};
 /* V40 already records medical/cooling/research/maintenance/central dispatch. These two paths otherwise have no report event. */
 if((id==='mei'&&p.task==='intel')||(id==='wu'&&p.task==='convoy'))recordNpcServiceV40(id,hours,action);
 return hours
};
const _processSourceSliceV42=processSourceSliceV34;
processSourceSliceV34=function(sourceId,hours){
 const meiIntel=sourceId==='centralGrid'&&npcExpertAtV40('mei','vent')&&npcOnDutyV41('mei','intel');
 const wuDispatch=sourceId==='centralGrid'&&npcExpertAtV40('wu','vent')&&npcOnDutyV41('wu','dispatch');
 _processSourceSliceV42(sourceId,hours);
 if(sourceId!=='centralGrid'||hours<=0)return;
 if(meiIntel)useNpcDutyV41('mei',hours,'中央情報校核');
 if(wuDispatch)useNpcDutyV41('wu',hours,'中央物流調度')
};
