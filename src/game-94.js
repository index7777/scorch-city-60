// v14.3 Batch A — resident survival core: heat/body temperature and explicit death causes.
(function(){
 function ensureResidentSurvivalV94(){
  state.player=state.player||{hydration:100,satiety:100,stamina:100,health:100,bodyTemp:36.5,heat:0};
  const p=state.player;
  for(const [k,v] of Object.entries({hydration:100,satiety:100,stamina:100,health:100,bodyTemp:36.5,heat:0}))if(!Number.isFinite(Number(p[k])))p[k]=v;
  state.residentSurvivalClock=state.residentSurvivalClock||{day:state.day,phase:state.phase,hoursLeft:state.hoursLeft};
  return p;
 }
 function residentSurvivalContextV94(extra={}){
  const expedition=state.expedition||{};
  const field=state.fieldOperation||state.field||{};
  const outside=extra.outside??!!(expedition.active||expedition.current||expedition.inProgress||field.active||field.inProgress);
  const ambient=Number(extra.ambientTemp??(state.day>=30?100:(state.phase==='night'?8:dayTemp(state.day))));
  const coolingPack=extra.coolingPack??!!state.gear?.coolingPack;
  const vehicleAc=extra.vehicleAc??!!(state.vehicle?.acActive||state.vehicle?.hasAC||expedition.vehicleAC);
  const shelter=extra.shelter??!outside;
  return {outside,ambient,coolingPack,vehicleAc,shelter};
 }
 function residentDeathCheckV94(){
  const p=ensureResidentSurvivalV94();
  let reason='';
  if(p.hydration<=0)reason='脫水';
  else if(p.satiety<=0)reason='飢餓';
  else if(p.health<=0)reason='傷勢／衰竭';
  else if(p.bodyTemp>42)reason='致命高體溫';
  if(reason&&!p.dead){p.dead=true;p.deathReason=reason;if(typeof log==='function')log(`你因${reason}死亡。`,'bad')}
  return reason;
 }
 function applyResidentSurvivalHoursV94(hours,extra={}){
  const p=ensureResidentSurvivalV94(),h=Math.max(0,Number(hours)||0);if(!h||p.dead)return p;
  const c=residentSurvivalContextV94(extra);
  if(c.shelter){
   p.heat=clamp(p.heat-h*18,0,100);
   const target=36.7,delta=target-p.bodyTemp;p.bodyTemp=clamp(p.bodyTemp+Math.sign(delta)*Math.min(Math.abs(delta),h*.7),34,43);
  }else{
   const stress=clamp((c.ambient-38)/62,0,1);
   let protection=1;if(c.coolingPack)protection*=.58;if(c.vehicleAc)protection*=.45;
   const heatGain=h*(8+26*stress)*protection;
   p.heat=clamp(p.heat+heatGain,0,100);
   p.bodyTemp=clamp(p.bodyTemp+heatGain*.035,34,43);
   p.hydration=clamp(p.hydration-h*(.8+1.8*stress)*protection,0,100);
   if(p.bodyTemp>=40.5)p.health=clamp(p.health-h*(4+(p.bodyTemp-40.5)*6),0,100);
   if(p.heat>=85)p.stamina=clamp(p.stamina-h*8,0,100);
  }
  residentDeathCheckV94();return p;
 }
 function syncResidentSurvivalV94(){
  const p=ensureResidentSurvivalV94(),c=state.residentSurvivalClock;
  if(p.dead){residentDeathCheckV94();return}
  if(c.day===state.day&&c.phase===state.phase&&Number.isFinite(Number(c.hoursLeft))&&Number.isFinite(Number(state.hoursLeft))&&state.hoursLeft<c.hoursLeft){
   applyResidentSurvivalHoursV94(c.hoursLeft-state.hoursLeft);
  }
  residentDeathCheckV94();c.day=state.day;c.phase=state.phase;c.hoursLeft=state.hoursLeft;
 }
 window.residentSurvivalContextV94=residentSurvivalContextV94;
 window.applyResidentSurvivalHoursV94=applyResidentSurvivalHoursV94;
 window.residentDeathCheckV94=residentDeathCheckV94;
 const originalRenderV94=render;
 render=function(){syncResidentSurvivalV94();const out=originalRenderV94();const p=state.player;if(p?.dead){const risk=document.getElementById('riskLevel');if(risk)risk.textContent=`你已死亡：${p.deathReason||'未知原因'}`;const rest=document.getElementById('restBtn');if(rest)rest.disabled=true}return out};
 ensureResidentSurvivalV94();
})();
