/* v14.2.2 QA — multidimensional safe-zone survival capacity / local supplies */
const SAFE_ZONE_LIFE_V38={
 subway:{sleep:8,sanitation:8,medicalBase:3,waterDaysTarget:2,foodDaysTarget:2},
 coldstore:{sleep:12,sanitation:10,medicalBase:2,waterDaysTarget:2,foodDaysTarget:2},
 vehicle:{sleep:2,sanitation:1,medicalBase:1,waterDaysTarget:1,foodDaysTarget:1}
};
function ensureSafeZoneLifeV38(){
 ensureSafeShelterOpsV37();
 state.safeZoneLife=state.safeZoneLife||{schema:1,zones:{},lastTickDay:state.day};
 state.safeZoneLife.schema=1;state.safeZoneLife.zones=state.safeZoneLife.zones||{};
 for(const id of Object.keys(SAFE_ZONE_LIFE_V38)){
  const z=state.safeZoneLife.zones[id]||(state.safeZoneLife.zones[id]={water:0,food:0,medicine:0,health:100,last:null});
  z.water=Math.max(0,+z.water||0);z.food=Math.max(0,+z.food||0);z.medicine=Math.max(0,+z.medicine||0);z.health=clamp(+z.health||100,0,100);
 }
 return state.safeZoneLife
}
function zoneLifeStoreV38(id){ensureSafeZoneLifeV38();return state.safeZoneLife.zones[id]}
function zoneLifeCapsV38(id){
 const x=safeZoneSnapshotV37(id),cfg=SAFE_ZONE_LIFE_V38[id],st=zoneLifeStoreV38(id),n=x?.occupants||0;
 if(!cfg||!safeZoneBuiltV37(id))return {id,occupants:n,cooling:0,water:0,food:0,medical:0,sleep:0,sanitation:0,safe:0,bottleneck:'不可用'};
 const wr=Math.max(.25,+state.ration?.water||2.5),fr=Math.max(.25,+state.ration?.food||1);
 const cooling=Math.max(0,Math.floor(x?.safe||0));
 const water=Math.max(0,Math.floor(st.water/wr));
 const food=Math.max(0,Math.floor(st.food/fr));
 const medical=Math.max(0,Math.min(cfg.sleep,cfg.medicalBase+Math.floor(st.medicine*2)));
 const sleep=cfg.sleep,sanitation=cfg.sanitation;
 const dims={cooling,water,food,medical,sleep,sanitation};
 let safe=Math.min(...Object.values(dims));if(n===0&&(st.water<=.001||st.food<=.001))safe=0;
 const labels={cooling:'冷卻',water:'水',food:'食物',medical:'醫療',sleep:'睡眠空間',sanitation:'衛生'};
 const bottleneck=Object.entries(dims).filter(([,v])=>v===safe).map(([k])=>labels[k]).join('／');
 return {id,occupants:n,...dims,safe,bottleneck,store:st,powerRatio:x?.powerRatio||0,thermalSafe:x?.safe||0};
}
function safeZoneHeadroomV37(id){const x=zoneLifeCapsV38(id);return Math.max(0,x.safe-x.occupants)}

/* V37 temporarily counted relocated generic residents against central stores. V38 gives each remote zone a physical local cache instead. */
const _dailyWaterNeedV38=dailyWaterNeed;
dailyWaterNeed=function(){const n=_dailyWaterNeedV38(),remote=safeShelterGenericPopulationV37(),dup=Math.ceil(remote*(state.ration?.water||2.5));return Math.max(1,n-dup)};
const _dailyFoodNeedV38=dailyFoodNeed;
dailyFoodNeed=function(){const n=_dailyFoodNeedV38(),remote=safeShelterGenericPopulationV37(),dup=Math.ceil(remote*(state.ration?.food||1));return Math.max(1,n-dup)};

function zoneSupplyTripV38(zoneId){
 const d=SAFE_ZONE_DEFS_V37[zoneId],v=ensureVehicleStateV32(),e=coolingVehicleV32();if(!d||d.mobile)return {ok:false,reason:'此安置點不支援外站補給'};if(!safeZoneBuiltV37(zoneId))return {ok:false,reason:'安全區尚未建成'};if(!e)return {ok:false,reason:'需要製冷工程車運送外站補給'};if(v.currentLocation!=='vent')return {ok:false,reason:'製冷工程車必須先回中央通風站裝載補給'};
 const r=routeBetweenV27('vent',d.location,ensureItineraryV27().routeMode);if(!r)return {ok:false,reason:'目前沒有可用補給路線'};const h=r.distance/24,hot=currentOutsideTempV26()>35,c1=vehicleDriveCostV32(r.distance,h,{users:1,cooling:hot}),c2=vehicleDriveCostV32(r.distance,h,{users:1,cooling:hot}),fuel=c1.fuelL+c2.fuelL,kWh=c1.totalKWh+c2.totalKWh,time=h*2+.35;
 if((state.resources.fuel||0)+1e-6<fuel)return {ok:false,reason:`補給往返需要 ${fuel.toFixed(1)} L 柴油`};if(e.battery.chargeKWh+1e-6<kWh)return {ok:false,reason:`補給往返需要 ${kWh.toFixed(2)} kWh 車載電量`};if(currentPeriodHoursLeftV26()+1e-6<time)return {ok:false,reason:`本時段時間不足；補給往返約 ${time.toFixed(1)}h`};return {ok:true,zoneId,r,h,fuel,kWh,time,e}
}
function deliverZoneSuppliesV38(zoneId,kind='standard'){
 ensureSafeZoneLifeV38();const p=zoneSupplyTripV38(zoneId);if(!p.ok)return toast(p.reason);
 const packs={standard:{water:20,food:8,medicine:1},water:{water:30,food:0,medicine:0},food:{water:5,food:14,medicine:0},medical:{water:5,food:4,medicine:3}},load=packs[kind]||packs.standard;
 const missing=Object.entries(load).filter(([k,v])=>(state.resources[k]||0)<v);if(missing.length)return toast(`${RES_LABELS[missing[0][0]]||missing[0][0]}不足，補給需要 ${missing[0][1]}`);
 stopChargingV24(p.e.instanceId,true);state.safeShelterOps.inTransit=true;const ok=spendWorldTimeV26(p.time,{label:`${SAFE_ZONE_DEFS_V37[zoneId].name}補給往返`});state.safeShelterOps.inTransit=false;if(!ok)return false;
 state.resources.fuel=Math.max(0,(state.resources.fuel||0)-p.fuel);p.e.battery.chargeKWh=Math.max(0,p.e.battery.chargeKWh-p.kWh);p.e.condition=clamp((p.e.condition??100)-p.r.distance*.03-p.time*.05,0,100);state.vehicle.condition=Math.min(state.vehicle.condition??100,p.e.condition);
 const z=zoneLifeStoreV38(zoneId);for(const [k,v] of Object.entries(load)){state.resources[k]-=v;z[k]+=v}
 log(`${SAFE_ZONE_DEFS_V37[zoneId].name}收到補給：${Object.entries(load).filter(([,v])=>v>0).map(([k,v])=>`${RES_LABELS[k]||k} ${v}`).join('、')}。往返耗時 ${p.time.toFixed(1)}h。`,'major');render();refreshPopulationUiV37();saveGame(false);return true
}
function provisionVehicleShelterV38(kind='standard'){
 const e=coolingVehicleV32();if(!e||ensureVehicleStateV32().currentLocation!=='vent')return toast('製冷工程車必須停在中央通風站才能裝載生活補給');const packs={standard:{water:6,food:3,medicine:1},water:{water:10,food:0,medicine:0},food:{water:2,food:6,medicine:0},medical:{water:2,food:2,medicine:2}},load=packs[kind]||packs.standard,st=zoneLifeStoreV38('vehicle');const missing=Object.entries(load).find(([k,v])=>(state.resources[k]||0)<v);if(missing)return toast(`${RES_LABELS[missing[0]]||missing[0]}不足`);if(!spendWorldTimeV26(.25,{label:'製冷工程車生活補給裝載'}))return;for(const [k,v] of Object.entries(load)){state.resources[k]-=v;st[k]+=v}log('製冷工程車已補充臨時安置用水、食物與醫療物資。');render();refreshPopulationUiV37();saveGame(false)
}
function consumeSafeZoneLifeV38(hours){
 hours=Math.max(0,+hours||0);if(hours<=0||state.day<30)return;ensureSafeZoneLifeV38();
 for(const id of Object.keys(SAFE_ZONE_LIFE_V38)){
  if(!safeZoneBuiltV37(id))continue;const st=zoneLifeStoreV38(id),n=safeZoneOccupantsV37(id);if(n<=0)continue;
  const waterNeed=n*(state.ration?.water||2.5)*hours/24,foodNeed=n*(state.ration?.food||1)*hours/24;
  const waterRatio=waterNeed>0?Math.min(1,st.water/waterNeed):1,foodRatio=foodNeed>0?Math.min(1,st.food/foodNeed):1;
  st.water=Math.max(0,st.water-waterNeed);st.food=Math.max(0,st.food-foodNeed);
  const cap=zoneLifeCapsV38(id),deficit=Math.max(0,n-cap.safe),stress=(1-Math.min(waterRatio,foodRatio))*5+deficit/Math.max(1,n)*3;
  st.health=clamp(st.health-hours*stress*.18+(deficit===0&&waterRatio>=1&&foodRatio>=1?hours*.05:0),0,100);
  if(st.health<45&&st.medicine>=.05){const use=Math.min(st.medicine,hours*n*.006);st.medicine-=use;st.health=clamp(st.health+use*3,0,100)}
  st.last={day:state.day,hours,occupants:n,waterNeed,foodNeed,safe:cap.safe,bottleneck:cap.bottleneck};
 }
}
const _processSourceSliceV38=processSourceSliceV34;
processSourceSliceV34=function(sourceId,hours){_processSourceSliceV38(sourceId,hours);if(sourceId==='centralGrid')consumeSafeZoneLifeV38(hours)};

function lifeDimV38(label,val,n){return `<span class="life-dim ${val<n?'bad':''}">${label} <b>${val}</b></span>`}
function safeZoneLifeHtmlV38(){
 ensureSafeZoneLifeV38();const rows=Object.keys(SAFE_ZONE_LIFE_V38).filter(safeZoneBuiltV37).map(id=>{const c=zoneLifeCapsV38(id),d=SAFE_ZONE_DEFS_V37[id],st=c.store,head=Math.max(0,c.safe-c.occupants);return `<article class="zone-life-card ${c.occupants>c.safe?'critical':''}"><div class="zone-life-head"><div><span>SAFE ZONE</span><h4>${d.name}</h4></div><b>${c.occupants} / ${c.safe} 人</b></div><div class="life-dims">${lifeDimV38('冷卻',c.cooling,c.occupants)}${lifeDimV38('水',c.water,c.occupants)}${lifeDimV38('食物',c.food,c.occupants)}${lifeDimV38('醫療',c.medical,c.occupants)}${lifeDimV38('睡眠',c.sleep,c.occupants)}${lifeDimV38('衛生',c.sanitation,c.occupants)}</div><div class="zone-stock"><span>水 <b>${st.water.toFixed(1)}L</b></span><span>食物 <b>${st.food.toFixed(1)}</b></span><span>藥品 <b>${st.medicine.toFixed(1)}</b></span><span>健康 <b>${st.health.toFixed(0)}%</b></span></div><p class="${c.occupants>c.safe?'action-warning':'muted'}">目前瓶頸：${c.bottleneck} · 可再接收 ${head} 人。安全容量取所有生存條件中的最低值。</p>${id==='vehicle'?`<div class="zone-supply-actions"><button class="mini secondary" data-vehicle-provision="standard">裝載標準補給</button><button class="mini secondary" data-vehicle-provision="water">補水</button></div>`:`<div class="zone-supply-actions"><button class="mini secondary" data-zone-supply="${id}" data-supply-kind="standard">標準補給</button><button class="mini secondary" data-zone-supply="${id}" data-supply-kind="water">補水</button><button class="mini secondary" data-zone-supply="${id}" data-supply-kind="food">補食物</button><button class="mini secondary" data-zone-supply="${id}" data-supply-kind="medical">醫療補給</button></div>`}</article>`}).join('');return rows?`<section class="safe-zone-life-panel"><div class="source-load-head"><div><span>LIFE SUPPORT</span><h3>安全區多維生存容量</h3></div></div><p class="muted">冷卻足夠不代表能住人。水、食物、醫療、睡眠空間或衛生任一項不足，都會降低真正安全容量。</p><div class="zone-life-list">${rows}</div></section>`:''
}
const _openInventoryV38=openInventory;
openInventory=function(){_openInventoryV38();const host=$('inventoryContent');if(!host)return;host.insertAdjacentHTML('beforeend',safeZoneLifeHtmlV38());host.querySelectorAll('[data-zone-supply]').forEach(b=>b.onclick=()=>deliverZoneSuppliesV38(b.dataset.zoneSupply,b.dataset.supplyKind));host.querySelectorAll('[data-vehicle-provision]').forEach(b=>b.onclick=()=>provisionVehicleShelterV38(b.dataset.vehicleProvision))};

/* Population moves must pass the multidimensional headroom check. */
const _executeShuttleV38=executeShuttleV37;
executeShuttleV37=function(zoneId,count,direction='out'){if(direction==='out'&&safeZoneHeadroomV37(zoneId)<Math.max(1,+count||1))return toast(`${SAFE_ZONE_DEFS_V37[zoneId]?.name||zoneId}的水／食物／醫療／冷卻等綜合容量不足`);return _executeShuttleV38(zoneId,count,direction)};
const _assignNpcV38=assignNpcToSafeZoneV37;
assignNpcToSafeZoneV37=function(npcId,zoneId){if(safeZoneHeadroomV37(zoneId)<1)return toast(`${SAFE_ZONE_DEFS_V37[zoneId]?.name||zoneId}目前沒有完整的一人份生存容量`);return _assignNpcV38(npcId,zoneId)};

ensureSafeZoneLifeV38();
