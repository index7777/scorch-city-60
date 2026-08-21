function pickExpeditionIncident(trip){
 const {locId,mode,assetId,estimate:e}=trip,loc=locations.find(l=>l.id===locId),n=state.expedition.count;
 const rp=e.routePath||[];for(let i=1;i<rp.length;i++){const a=rp[i-1],b=rp[i],world=roadWorldState(a,b),known=roadIntelState(a,b);if(world.status==='blocked'&&(!known||known.status!=='blocked'||roadIntelConfidence(known)<70)){trip.blockedEdge=[a,b];return 'roadIntel'}}
 if(state.day>=30&&!state.base.core&&(loc.risk>=3||assetId)&&n%3===0)return 'heat';
 if(mode==='vehicle'&&state.vehicle.condition<78&&n%2===0)return 'vehicle';
 if(assetId){const st=state.assets[assetId];if(st&&st.owner==='world'&&state.day>=12&&n%4===1)return 'npcAsset'}
 if(state.day<30&&state.hoursLeft-e.total<.8&&n%2===1)return 'time';
 if(loc.risk>=4&&n%5===2)return 'route';
 return null;
}
function openExpeditionIncident(){
 const p=state.expedition.pending;if(!p)return;const loc=locations.find(l=>l.id===p.locId),a=p.assetId?assetDefs.find(x=>x.id===p.assetId):null;let title='',body='',buttons='';
 if(p.incident==='heat'){title='路面熱負荷超出預估';body=`前往${loc.name}途中，曝曬區比情報顯示更熱。繼續原路會增加冷卻與時間消耗。`;buttons=`<button data-choice="push">硬撐通過</button><button data-choice="detour" class="secondary">繞行陰影路線</button><button data-choice="retreat" class="danger">立即撤退</button>`}
 if(p.incident==='vehicle'){title='工程車狀況異常';body=`冷卻風扇與傳動系統出現異常聲。目前車況 ${Math.round(state.vehicle.condition)}%。`;buttons=`<button data-choice="repair">停車檢修</button><button data-choice="push" class="secondary">繼續行駛</button><button data-choice="retreat" class="danger">撤回基地</button>`}
 if(p.incident==='npcAsset'){title='其他倖存者也到了';body=`一個聚落小隊正在準備搬走${a?a.name:'大型設備'}。沒有戰鬥，但你必須決定物資控制權。`;buttons=`<button data-choice="trade">提出交換</button><button data-choice="intercept" class="secondary">直接截胡</button><button data-choice="ignore" class="secondary">放棄設備，只搜物資</button><button data-choice="retreat" class="danger">撤退</button>`}
 if(p.incident==='time'){title='撤離窗口正在關閉';body=`到達${loc.name}後，你發現實際搜索比預估慢。若繼續完整搜索，返程會非常接近日出。`;buttons=`<button data-choice="rush">快速搜索後撤離</button><button data-choice="push" class="secondary">照原計畫完成</button><button data-choice="retreat" class="danger">立即撤退</button>`}
 if(p.incident==='roadIntel'){const [a,b]=p.blockedEdge||[];title='道路情報已失真';body=`你抵達${roadName(roadKey(a,b))}時才發現道路已經封閉。地圖上的舊情報沒有反映這個變化。`;buttons=`<button data-choice="detour">重新規劃繞路</button><button data-choice="clear" class="secondary">現場清障</button><button data-choice="retreat" class="danger">立即撤退</button>`}
 if(p.incident==='route'){title='主要路線無法直接通行';body=`通往${loc.name}的道路出現高溫變形與阻塞。你可以繞路，也可以縮短本次目標。`;buttons=`<button data-choice="detour">繞路完成遠征</button><button data-choice="light">放棄重貨，只拿小型物資</button><button data-choice="retreat" class="danger">撤退</button>`}
 $('incidentTitle').textContent=title;$('incidentBody').textContent=body;$('incidentChoices').innerHTML=buttons;$('incidentDialog').showModal();
 $('incidentChoices').querySelectorAll('button').forEach(b=>b.onclick=()=>resolveExpeditionIncident(b.dataset.choice));
}
function resolveExpeditionIncident(choice){
 const p=state.expedition.pending;if(!p)return;$('incidentDialog').close();let m={time:0,battery:0,fuel:0,cargoFactor:1,vehicleDamage:0,skipAsset:false};
 if(choice==='retreat'){return retreatExpedition(p)}
 if(p.incident==='roadIntel'){const [a,b]=p.blockedEdge||[];verifyRoad(a,b,'親眼確認');if(choice==='detour'){m.time=.8;m.fuel=p.mode==='vehicle'?2:0;log(`你確認${roadName(roadKey(a,b))}已封閉，改走替代路線。`,'major')}if(choice==='clear'){if(state.resources.parts<4)return toast('現場清障至少需要 4 零件'),openExpeditionIncident();state.resources.parts-=4;state.roadWorld[roadKey(a,b)]={status:'open',changedDay:state.day};state.roadIntel[roadKey(a,b)]={status:'repaired',source:'你親自清障',day:state.day,verifiedDay:state.day,confidence:100};m.time=1.2;log(`你清除了${roadName(roadKey(a,b))}的阻塞，消耗 4 零件。`,'good')}}
 if(p.incident==='heat'){
  if(choice==='push'){m.time=.3;m.battery=2;m.vehicleDamage=p.mode==='vehicle'?5:0;log('你選擇穿越高熱路段，冷卻負荷明顯上升。','bad')}
  if(choice==='detour'){m.time=.8;m.fuel=p.mode==='vehicle'?2:0;log('你改走較長的陰影路線，保住了冷卻餘裕。')}
 }
 if(p.incident==='vehicle'){
  if(choice==='repair'){if(state.resources.parts>=2){state.resources.parts-=2;state.vehicle.condition=Math.min(100,state.vehicle.condition+12);m.time=.7;log('你在路邊完成臨時檢修，消耗 2 零件。','good')}else{m.time=1;m.vehicleDamage=8;log('缺少零件，只能做最低限度處理。','bad')}}
  if(choice==='push'){m.vehicleDamage=18;m.time=.2;log('你忽略異常繼續行駛，車況受到明顯損耗。','bad')}
 }
 if(p.incident==='npcAsset'){
  const st=state.assets[p.assetId];
  if(choice==='trade'){if(state.resources.water>=8&&state.resources.food>=4){state.resources.water-=8;state.resources.food-=4;state.base.trust+=2;m.time=.5;log('你用 8L 水與 4 食物換得大型設備優先權。','good')}else{return toast('交換至少需要 8L 水與 4 食物'),openExpeditionIncident()}}
  if(choice==='intercept'){state.base.trust-=5;state.logistics.intercepts++;Object.values(state.npcs).forEach(n=>n.trust-=1);m.time=.3;log('你直接控制了設備。沒有人受傷，但其他倖存者記住了這件事。','bad')}
  if(choice==='ignore'){m.skipAsset=true;m.cargoFactor=1.1;st.owner=Object.keys(state.settlements)[state.expedition.count%Object.keys(state.settlements).length]||'world';log(`${assetDefs.find(a=>a.id===p.assetId).name}被其他倖存者搬走；你改為搜索小型物資。`,'bad')}
 }
 if(p.incident==='time'){
  if(choice==='rush'){m.time=-.4;m.cargoFactor=.55;m.skipAsset=true;log('你縮短搜索，只拿最優先的物資後立刻撤離。')}
  if(choice==='push'){m.time=.5;m.cargoFactor=1.05;log('你堅持完成原計畫，返程時間變得非常緊張。','bad')}
 }
 if(p.incident==='route'){
  if(choice==='detour'){m.time=1.1;m.fuel=p.mode==='vehicle'?2:0;log('你繞過阻塞路段，付出了額外時間。')}
  if(choice==='light'){m.time=-.2;m.cargoFactor=.65;m.skipAsset=true;log('你放棄重貨，以較輕的載重完成這趟遠征。')}
 }
 state.expedition.pending=null;finalizeExpedition(p,m);
}
function snapshotExpeditionState(){
 return {resources:{...state.resources},vehicle:state.vehicle.condition,assets:Object.fromEntries(Object.entries(state.assets).map(([k,v])=>[k,{...v}])),intel:{...state.intel}};
}
function resourceDelta(before,after){const out={};for(const k of RES_ORDER){const d=Math.round(((after[k]||0)-(before[k]||0))*10)/10;if(Math.abs(d)>.001)out[k]=d}return out}
function expeditionWorldChanges(before,locId){
 const out=[];
 for(const a of assetDefs){const b=before.assets?.[a.id],n=state.assets?.[a.id];if(!b||!n)continue;if(!b.discovered&&n.discovered)out.push(`發現 ${a.name}`);if(!b.transported&&n.transported)out.push(`${a.name} 已運回中央站`);if(b.owner!==n.owner&&n.owner!=='world')out.push(`${a.name} 所有權 → ${ownerLabel(n.owner)}`)}
 if(!before.intel?.[locId]&&state.intel?.[locId])out.push('建立該區最新實地情報');
 const settlement=Object.values(state.settlements||{}).find(s=>s.location===locId);if(settlement)out.push(`${settlement.name}：${settlement.population} 人`);
 return [...new Set(out)].slice(0,7);
}
