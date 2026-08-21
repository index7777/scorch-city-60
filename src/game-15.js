function finalizeExpedition(p,m){
 const before=snapshotExpeditionState();
 const loc=locations.find(l=>l.id===p.locId),e=p.estimate,mode=p.mode,useToolkit=p.useToolkit,priority=p.priority;const total=Math.max(.2,Math.round((e.total+m.time)*10)/10),batteryNeed=Math.max(0,e.batteryNeed+m.battery),fuelNeed=Math.max(0,e.fuelNeed+m.fuel);
 if(state.day<30&&state.hoursLeft<total){log('額外延誤使返程跨入白晝，你被迫提早撤回，這趟沒有完整回收物資。','bad');return retreatExpedition({...p,estimate:{...e,total}})}
 if(state.day>=30&&state.resources.battery<batteryNeed){log('途中冷卻能源不足，你只能中止遠征。','bad');return retreatExpedition(p)}
 if(mode==='vehicle'&&state.resources.fuel<fuelNeed){log('額外燃料需求超出儲備，你只能撤回。','bad');return retreatExpedition(p)}
 if(state.day<30)state.hoursLeft=Math.max(0,Math.round((state.hoursLeft-total)*10)/10);state.resources.water=Math.max(0,state.resources.water-e.waterNeed);if(state.day>=30)state.resources.battery=Math.max(0,state.resources.battery-batteryNeed);if(mode==='vehicle'){state.resources.fuel=Math.max(0,state.resources.fuel-fuelNeed);state.vehicle.condition=clamp(state.vehicle.condition-m.vehicleDamage,0,100)}
 discoverAssetsAt(loc.id);let cap=e.returnCap,used=0,gain={},rem=state.locations[loc.id].remaining;cap*=m.cargoFactor;const order=[priority,...RES_ORDER.filter(k=>k!==priority)];for(const k of order){const av=rem[k]||0;if(av<=0||cap-used<=.05)continue;const w=RES_WEIGHT[k]||1;let max=Math.floor((cap-used)/w);if(max<=0)continue;let take=Math.min(av,max);if(useToolkit&&k==='parts')take=Math.min(av,Math.ceil(take*1.15));rem[k]-=take;state.resources[k]+=take;gain[k]=(gain[k]||0)+take;used+=take*w}
 let moved='',movedAsset='';if(e.asset&&!m.skipAsset){const st=state.assets[e.asset.id];if(!st.transported&&st.owner!=='player'){st.owner='world'}if(!st.transported&&st.owner==='world'){st.discovered=true;st.transported=true;st.location='vent';st.owner='player';state.logistics.moved++;applyAssetEffect(e.asset);movedAsset=e.asset.name;moved=`，並帶回${e.asset.name}`}}
 const traveled=e.routePath||[];for(let i=1;i<traveled.length;i++)verifyRoad(traveled[i-1],traveled[i],'遠征通行');
 tutorialWaterGain(gain);state.locations[loc.id].searched=true;state.intel[loc.id]={day:state.day,verifiedDay:state.day,summary:summarizeRemaining(rem),source:'遠征搜索',confidence:100};if(loc.special==='cart'&&!state.gear.cart){state.gear.cart=true;log('你在五金行取得一台可用推車。','good')}if(loc.special==='vehicle'&&!state.gear.vehicle&&state.resources.fuel>=2){state.gear.vehicle=true;state.resources.fuel-=2;log('陳技師協助修復工程車。','good')}if(loc.special==='coreInfo'&&!state.knownCore&&state.resources.data>=4){state.knownCore=true;log('研究資料確認冷源核心的位置。','major')}
 state.expedition.count++;state.expedition.last={day:state.day,location:loc.id,mode,time:total,cargo:Math.round(used),priority};state.expedition.pending=null;log(`遠征完成：${loc.name}｜${mode==='vehicle'?'工程車':mode==='cart'?'推車':'徒手'}｜回收 ${Math.round(used)}kg${moved}。${Object.keys(gain).length?' '+Object.entries(gain).map(([k,v])=>`${RES_LABELS[k]||k}+${v}`).join('、'):''}`,'good');render();checkState();const result={day:state.day,location:loc.id,mode,routeMode:state.mapPlanner?.routeMode||'fastest',retreated:false,cargo:Math.round(used),gain,movedAsset,estimatedTime:e.total,actualTime:total,estimatedBattery:e.batteryNeed||0,actualBattery:batteryNeed,estimatedFuel:e.fuelNeed||0,actualFuel:fuelNeed,waterUsed:e.waterNeed,vehicleDelta:Math.round((state.vehicle.condition-before.vehicle)*10)/10,resourceDelta:resourceDelta(before.resources,state.resources),worldChanges:expeditionWorldChanges(before,loc.id),notes:[m.time>0?`途中事件使行程增加 ${Math.round(m.time*10)/10}h`:'行程時間符合預估',m.battery>0?`事件額外消耗 ${m.battery}kWh 冷卻能源`:'冷卻能源沒有額外超支',m.fuel>0?`事件額外消耗 ${m.fuel}L 燃料`:'燃料沒有額外超支',m.vehicleDamage>0?`工程車狀況下降 ${m.vehicleDamage}%`:'主要運輸裝備無額外損傷'].filter(Boolean)};showExpeditionResult(result);saveGame(false)
}

function discoverAssetsAt(locationId){
 let found=[];
 assetDefs.forEach(a=>{const st=state.assets[a.id];if(st.location===locationId&&!st.discovered&&!st.transported){st.discovered=true;st.owner=st.owner||'world';found.push(a.name)}});
 if(found.length){tutorialAssetSeen(found);log(`發現大型資產：${found.join('、')}。找到不等於搬回基地。`,'major')}
}
function transportRequirement(a){const own=state.assets[a.id]?.owner;const o=own&&own!=='world'&&own!=='player'?`｜目前由 ${ownerLabel(own)} 控制`:'';return (a.need==='vehicle'?'需要車輛':a.need==='cart'?'推車或車輛':'可徒手')+o}
function canTransportAsset(a){if(a.weight>cargoCapacityKg())return false;if(a.need==='vehicle')return state.gear.vehicle;if(a.need==='cart')return state.gear.cart||state.gear.vehicle;return true}
function ownerLabel(o){if(o==='world')return '無主';if(o==='player')return '你';if(state.npcs[o])return state.npcs[o].name;if(state.settlements[o])return state.settlements[o].name;return o}
function transportTime(a){let t=a.need==='vehicle'?2:1;if(state.gear.vehicle)t=Math.max(1,t-1);return t}
function transportBatteryCost(a){let c=Math.max(2,Math.ceil(a.weight/180));if(state.gear.vehicle)c=Math.max(1,c-1);return c}
function applyAssetEffect(a){
 if(a.effect==='power'){state.installed.generator=true;state.base.powerKW+=5;state.base.storageKWh+=6}
 if(a.effect==='water'){state.gear.waterTank=true;state.resources.water+=40}
 if(a.effect==='compressor'){state.installed.compressors+=1;state.base.coolingCapacity+=8}
 if(a.effect==='chiller'){state.installed.chiller=true;state.base.coolingCapacity+=18}
 if(a.effect==='pump'){state.installed.pump=true;state.base.waterTreatment+=1}
 if(a.effect==='inverter'){state.installed.inverter=true;state.base.powerKW+=6;state.base.storageKWh+=14}
 if(a.effect==='lift'){state.installed.lift=true;state.logistics.heavyReady=true;state.vehicle.capacityKg=1200}
 if(a.effect==='drum'){state.resources.water+=200}
 if(a.effect==='fireTank'){state.resources.water+=120;state.base.waterTreatment+=1}
}
function negotiateAsset(id){
 const a=assetDefs.find(x=>x.id===id),st=state.assets[id];if(!a||!st||st.owner==='world'||st.owner==='player')return;
 const costWater=Math.max(4,Math.ceil(a.weight/100)*2),costFood=Math.max(2,Math.ceil(a.weight/250));
 if(state.resources.water<costWater||state.resources.food<costFood)return toast(`交換需要水 ${costWater}L、食物 ${costFood}`);
 state.resources.water-=costWater;state.resources.food-=costFood;const old=st.owner;st.owner='player';
 if(state.npcs[old])state.npcs[old].trust+=2;if(state.settlements[old])state.settlements[old].trust+=1;
 log(`你用水 ${costWater}L、食物 ${costFood} 與${ownerLabel(old)}交換${a.name}的所有權。`,'good');render();openLogistics();
}
function interceptAsset(id){
 const a=assetDefs.find(x=>x.id===id),st=state.assets[id];if(!a||!st||st.owner==='world'||st.owner==='player')return;
 const old=st.owner;st.owner='player';state.logistics.intercepts++;
 if(state.npcs[old])state.npcs[old].trust-=4;if(state.settlements[old])state.settlements[old].trust-=3;state.base.trust-=1;
 log(`你直接截胡了${ownerLabel(old)}控制的${a.name}。沒有戰鬥，但合作關係明顯惡化。`,'bad');render();openLogistics();
}
