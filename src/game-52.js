/* v14.2.2 QA — dynamic field cargo / staged pickup / return-load validation */
const FIELD_PASSENGER_MASS_KG_V52=75;
function ensureDynamicCargoV52(){
 const t=ensureFieldTeamV43();t.dynamicCargo=t.dynamicCargo||{schema:1,resources:{},assets:[],history:[],origin:null};t.dynamicCargo.schema=1;t.dynamicCargo.resources=t.dynamicCargo.resources||{};t.dynamicCargo.assets=Array.isArray(t.dynamicCargo.assets)?t.dynamicCargo.assets:[];t.dynamicCargo.history=Array.isArray(t.dynamicCargo.history)?t.dynamicCargo.history:[];return t.dynamicCargo
}
function dynamicResourceMassV52(resources=ensureDynamicCargoV52().resources){return Object.entries(resources).reduce((kg,[k,v])=>kg+Math.max(0,+v||0)*(RES_WEIGHT[k]||1),0)}
function dynamicAssetMassV52(ids=ensureDynamicCargoV52().assets){return ids.reduce((kg,id)=>kg+(assetDefs.find(a=>a.id===id)?.weight||0),0)}
function fixedOutboundMassV52(){return fieldSpareMassV50()+fieldToolMassV50()+fieldPortableEquipmentMassV50()}
function dynamicCargoSnapshotV52(){const c=ensureDynamicCargoV52(),capacity=fieldCargoCapacityV50(),fixed=fixedOutboundMassV52(),resources=dynamicResourceMassV52(c.resources),assets=dynamicAssetMassV52(c.assets),used=fixed+resources+assets;return {capacity,fixed,resources,assets,used,free:Math.max(0,capacity-used),ok:used<=capacity+1e-6}}
function simulatedPickupV52(rem,free){const gain={},order=RES_ORDER;for(const k of order){const av=Math.max(0,+rem?.[k]||0),w=RES_WEIGHT[k]||1;if(av<=0||free<=.05)continue;const max=Math.floor(free/w);if(max<=0)continue;const take=Math.min(av,max);if(take<=0)continue;gain[k]=take;free-=take*w}return {gain,free}}
function rescuePassengerCountV52(stop){if(stop?.action!=='rescue')return 0;try{const f=rescueFeasibilityV29(stop);return f?.ok&&f.mode==='escort'?1:0}catch{return 0}}
function dynamicCargoForecastV52(){
 const capacity=fieldCargoCapacityV50(),fixed=fixedOutboundMassV52(),rows=[],issues=[];let resources={},assets=[],used=fixed,maxUsed=used;
 if(used>capacity+1e-6)issues.push(`出發固定裝載已超重 ${(used-capacity).toFixed(1)} kg`);
 for(const stop of ensureItineraryV27().stops){const name=mapLoc(stop.location)?.name||stop.location,before=used,events=[];
  const passengers=rescuePassengerCountV52(stop);if(passengers){const transient=used+passengers*FIELD_PASSENGER_MASS_KG_V52;maxUsed=Math.max(maxUsed,transient);events.push(`救援乘員 +${passengers*FIELD_PASSENGER_MASS_KG_V52}kg`);if(transient>capacity+1e-6)issues.push(`${name}：救援乘員加入後超載 ${(transient-capacity).toFixed(1)} kg`)}
  if(stop.action==='search'){
   const sim=simulatedPickupV52(state.locations?.[stop.location]?.remaining||{},Math.max(0,capacity-used));for(const [k,v] of Object.entries(sim.gain))resources[k]=(resources[k]||0)+v;const added=dynamicResourceMassV52(sim.gain);used+=added;if(added>0)events.push(`搜索回收 +${added.toFixed(1)}kg`)
  }
  if(stop.action==='asset'){
   const a=assetAtStopV46(stop);if(a&&!assets.includes(a.id)){const st=state.assets?.[a.id],allowed=!st||st.owner==='world'||st.owner==='player';if(allowed){if(used+a.weight>capacity+1e-6)issues.push(`${name}：${a.name} ${a.weight}kg 無法裝入剩餘貨艙`);else{assets.push(a.id);used+=a.weight;events.push(`${a.name} +${a.weight}kg`)}}}
  }
  maxUsed=Math.max(maxUsed,used);rows.push({stop,name,before,after:used,events:[...events],free:Math.max(0,capacity-used)})
 }
 return {capacity,fixed,resources,assets,rows,maxUsed,endUsed:used,endFree:Math.max(0,capacity-used),issues:[...new Set(issues)],ok:issues.length===0}
}
const _fieldTeamValidationV52=fieldTeamValidationV43;
fieldTeamValidationV43=function(e){const v=_fieldTeamValidationV52(e),cargoFlow=dynamicCargoForecastV52(),issues=[...v.issues,...cargoFlow.issues];return {...v,cargoFlow,ok:issues.length===0,issues:[...new Set(issues)]}};

const _activateFieldTeamV52=activateFieldTeamV43;
activateFieldTeamV43=function(e){const v=fieldTeamValidationV43(e);if(!v.ok)return {ok:false,reason:v.issues[0]};const r=_activateFieldTeamV52(e);if(r?.ok){const c=ensureDynamicCargoV52();c.resources={};c.assets=[];c.history=[];c.origin=fieldTeamHomeV43()}return r};

collectStopLootV27=function(loc){
 const t=ensureFieldTeamV43(),c=ensureDynamicCargoV52();if(!t.active){let cap=cargoCapacityKg(),used=0,gain={},rem=state.locations[loc.id].remaining;for(const k of RES_ORDER){const av=rem[k]||0;if(av<=0||cap-used<=.05)continue;const w=RES_WEIGHT[k]||1,max=Math.floor((cap-used)/w);if(max<=0)continue;const take=Math.min(av,max);rem[k]-=take;state.resources[k]+=take;gain[k]=take;used+=take*w}state.locations[loc.id].searched=true;state.intel[loc.id]={day:state.day,verifiedDay:state.day,summary:summarizeRemaining(rem),source:'行程實地搜索',confidence:100};discoverAssetsAt(loc.id);tutorialWaterGain(gain);log(`${loc.name}行程搜索：${Object.entries(gain).map(([k,v])=>`${RES_LABELS[k]||k}+${v}`).join('、')||'沒有實質收穫'}。`,'good');return}
 const snap=dynamicCargoSnapshotV52(),rem=state.locations[loc.id].remaining,sim=simulatedPickupV52(rem,snap.free),gain=sim.gain;for(const [k,v] of Object.entries(gain)){rem[k]-=v;c.resources[k]=(c.resources[k]||0)+v}state.locations[loc.id].searched=true;state.intel[loc.id]={day:state.day,verifiedDay:state.day,summary:summarizeRemaining(rem),source:'行程實地搜索',confidence:100};discoverAssetsAt(loc.id);tutorialWaterGain(gain);const kg=dynamicResourceMassV52(gain),after=dynamicCargoSnapshotV52();c.history.push({day:state.day,location:loc.id,type:'search',kg,gain:{...gain},usedKg:after.used});log(`${loc.name}行程搜索：${Object.entries(gain).map(([k,v])=>`${RES_LABELS[k]||k}+${v}`).join('、')||'貨艙已滿或沒有實質收穫'}｜貨艙 ${after.used.toFixed(1)} / ${after.capacity.toFixed(1)} kg。`,'good')
};
function loadAssetIntoDynamicCargoV52(stop){
 const t=ensureFieldTeamV43();if(!t.active||stop?.action!=='asset'||stop._dynamicAssetLoadedV52)return true;const a=assetAtStopV46(stop);if(!a)return true;const st=state.assets?.[a.id];if(st&&st.owner!=='world'&&st.owner!=='player')return false;const c=ensureDynamicCargoV52(),snap=dynamicCargoSnapshotV52();if(c.assets.includes(a.id))return true;if(snap.free+1e-6<a.weight){pauseItineraryV27(`${a.name}需要 ${a.weight}kg，但目前只剩 ${snap.free.toFixed(1)}kg 貨艙`);return false}c.assets.push(a.id);if(st){st.inTransit=true;st.location=ensureItineraryV27().current||stop.location}stop._dynamicAssetLoadedV52=true;const after=dynamicCargoSnapshotV52();c.history.push({day:state.day,location:stop.location,type:'asset',assetId:a.id,kg:a.weight,usedKg:after.used});log(`${a.name}已固定進外勤貨艙；目前 ${after.used.toFixed(1)} / ${after.capacity.toFixed(1)} kg。`,'major');return true
}
const _runItineraryStepV52=runItineraryStepV27;
runItineraryStepV27=function(){const it=ensureItineraryV27(),before=it.index,stop=it.stops[before],out=_runItineraryStepV52();if(stop&&it.index>before&&stop.action==='asset')loadAssetIntoDynamicCargoV52(stop);return out};

function unloadDynamicCargoV52(home){const c=ensureDynamicCargoV52(),gain={...c.resources},assets=[...c.assets];for(const [k,v] of Object.entries(gain))state.resources[k]=(state.resources[k]||0)+v;for(const id of assets){const st=state.assets?.[id];if(st){st.inTransit=false;st.transported=true;st.owner='player';st.location=home}}if(Object.keys(gain).length||assets.length)log(`外勤卸貨完成：${Object.entries(gain).map(([k,v])=>`${RES_LABELS[k]||k}+${v}`).join('、')||'無小型物資'}${assets.length?`；大型資產 ${assets.map(id=>assetDefs.find(a=>a.id===id)?.name||id).join('、')}`:''}。`,'good');c.resources={};c.assets=[];c.history=[];c.origin=null}
const _finishFieldTeamV52=finishFieldTeamV43;
finishFieldTeamV43=function(){const t=ensureFieldTeamV43(),was=t.active,home=t.spareOrigin||t.dynamicCargo?.origin||fieldTeamHomeV43();_finishFieldTeamV52();if(was)unloadDynamicCargoV52(home)};

function dynamicCargoHtmlV52(){const t=ensureFieldTeamV43(),active=t.active,s=active?dynamicCargoSnapshotV52():dynamicCargoForecastV52();const rows=active?(ensureDynamicCargoV52().history||[]).slice(-5).map(r=>`<div class="dynamic-cargo-row"><b>${mapLoc(r.location)?.name||r.location}</b><span>${r.type==='asset'?`${assetDefs.find(a=>a.id===r.assetId)?.name||r.assetId} ${r.kg.toFixed(0)}kg`:`回收 ${r.kg.toFixed(1)}kg`}</span><small>累積 ${r.usedKg.toFixed(1)}kg</small></div>`).join(''):(s.rows||[]).map((r,i)=>`<div class="dynamic-cargo-row"><b>${i+1}. ${r.name}</b><span>${r.events.join(' · ')||'無新增貨物'}</span><small>${r.after.toFixed(1)} / ${s.capacity.toFixed(1)}kg · 剩 ${r.free.toFixed(1)}kg</small></div>`).join('');const used=active?s.used:s.maxUsed,free=active?s.free:Math.max(0,s.capacity-s.endUsed);return `<div class="dynamic-cargo-box ${s.ok===false?'blocked':''}"><div class="field-role-head"><div><span>DYNAMIC CARGO</span><h4>沿途貨艙</h4></div><b>${used.toFixed(1)} / ${s.capacity.toFixed(1)} kg</b></div><p class="muted">貨艙會隨每一站實際變化；搜索物資、大型設備與暫時救援乘員都會影響後續可用空間。</p><div class="dynamic-cargo-strip"><span>固定裝載 <b>${s.fixed.toFixed(1)}kg</b></span><span>${active?'目前剩餘':'預估返程剩餘'} <b>${free.toFixed(1)}kg</b></span></div><div class="dynamic-cargo-list">${rows||'<p class="muted">目前沒有貨艙事件。</p>'}</div>${s.issues?.length?`<div class="field-team-issues">${s.issues.map(x=>`<p>${x}</p>`).join('')}</div>`:''}</div>`}
const _subtaskPlannerHtmlV52=subtaskPlannerHtmlV46;
subtaskPlannerHtmlV46=function(){const html=_subtaskPlannerHtmlV52(),box=dynamicCargoHtmlV52();return html.replace('<div class="parallel-stop-list">',box+'<div class="parallel-stop-list">')};
ensureDynamicCargoV52();
