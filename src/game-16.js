function transportAsset(id){
 const a=assetDefs.find(x=>x.id===id),st=state.assets[id];if(!a||!st||!st.discovered||st.transported)return;
 if(st.owner!=='world'&&st.owner!=='player')return toast('這件設備目前由其他倖存者控制，先交換或截胡');
 if(!canTransportAsset(a))return toast(a.weight>cargoCapacityKg()?`載重不足：需要 ${a.weight}kg，現在只有 ${cargoCapacityKg()}kg`:transportRequirement(a));
 const tc=transportTime(a),bc=state.day>=30?transportBatteryCost(a):0,fc=state.gear.vehicle?Math.max(1,Math.ceil(a.weight/450)):0;
 if(state.day<30){if(state.phase!=='night')return toast('白晝無法安全搬運');if(state.hoursLeft<tc)return toast('夜晚剩餘時間不足');state.hoursLeft-=tc}
 else{if(!state.gear.coolingPack&&!state.base.core)return toast('永晝搬運需要主動冷卻');if(state.resources.battery<bc)return toast('搬運所需電力不足');state.resources.battery-=bc}
 if(fc&&state.resources.fuel<fc)return toast('工程車燃料不足');if(fc)state.resources.fuel-=fc;
 st.transported=true;st.location='vent';st.owner='player';state.logistics.moved++;applyAssetEffect(a);log(`已將${a.name}搬回中央站／基地。`,'good');render();openLogistics();
}
function openLogistics(){
 const discovered=assetDefs.filter(a=>state.assets[a.id].discovered||state.assets[a.id].transported);
 const assetHtml=discovered.length?discovered.map(a=>{const st=state.assets[a.id],loc=locations.find(l=>l.id===st.location),ready=st.transported||canTransportAsset(a),claimed=st.owner==='world'||st.owner==='player';const control=!st.transported&&!claimed?`<div class="dialog-actions"><button data-buyasset="${a.id}">交換取得</button><button data-stealasset="${a.id}" class="secondary">直接截胡</button></div>`:'';return `<div class="asset-row ${st.transported?'asset-home':'asset-discovered'}">${equipmentArt(a.id)?`<div class="asset-art"><img src="${equipmentArt(a.id)}" alt="${a.name}" loading="lazy"></div>`:''}<div><h3>${a.name}</h3><p>${a.desc}</p><p class="muted">所有權：${ownerLabel(st.owner)}</p></div><div><span class="tag">${a.weight} kg</span><p>${transportRequirement(a)}</p></div><div><span class="asset-state">${st.transported?'已搬回':(loc?.name||'未知位置')}</span><p>${state.day>=30&&!st.transported?'永晝耗電 '+transportBatteryCost(a)+' kWh':'搬運 '+transportTime(a)+'h'}</p></div><div>${st.transported?'<b class="health-good">已安裝／入庫</b>':control||`<button data-moveasset="${a.id}" ${!ready?'disabled':''}>安排搬運</button>`}</div></div>`}).join(''):'<p class="muted">尚未發現大型資產。搜索工業區、消防站、物流倉、冷庫與太陽能場。</p>';
 const flows=state.flows.slice(-10).reverse().map(f=>`<div class="flow-row">Day ${f.day}｜${f.from} → ${f.to}：${RES_LABELS[f.resource]||f.resource} ${f.amount}</div>`).join('')||'<p class="muted">尚無已知聚落間物流。</p>';
 $('logisticsContent').innerHTML=`<div class="logistics-hero"><img src="assets/equipment/heavy_vehicle.webp" alt="重載工程車"><div><span>目前物流平台</span><b>${cargoMode()}</b><small>大型設備必須實體搬運；重載能力會直接限制可回收資產。</small></div></div><div class="route-summary"><div><span>單趟物流</span><b>${cargoMode()}</b></div><div><span>搬回大型資產</span><b>${state.logistics.moved}/${assetDefs.length}</b></div><div><span>核心重運能力</span><b>${state.logistics.heavyReady?'就緒':'未就緒'}</b></div></div><h3>大型資產</h3><div class="logistics-list">${assetHtml}</div><h3>最近城市資源流</h3>${flows}`;
 if(!$('logisticsDialog').open)$('logisticsDialog').showModal();document.querySelectorAll('[data-moveasset]').forEach(b=>b.onclick=()=>transportAsset(b.dataset.moveasset));document.querySelectorAll('[data-buyasset]').forEach(b=>b.onclick=()=>negotiateAsset(b.dataset.buyasset));document.querySelectorAll('[data-stealasset]').forEach(b=>b.onclick=()=>interceptAsset(b.dataset.stealasset));
}
function recordFlow(from,to,resource,amount){state.flows.push({day:state.day,from,to,resource,amount});if(state.flows.length>60)state.flows.shift()}
function settlementTradeTick(){
 const ss=Object.values(state.settlements).filter(x=>x.population>0);if(ss.length<2||state.day%2!==1)return;
 for(const needy of ss){
  const waterNeed=needy.water<needy.population*2.2, foodNeed=needy.food<needy.population*1.5;if(!waterNeed&&!foodNeed)continue;
  const resource=waterNeed?'water':'food';const donor=ss.filter(x=>x.id!==needy.id).sort((a,b)=>(resource==='water'?b.water-a.water:b.food-a.food))[0];if(!donor)continue;
  const surplus=resource==='water'?donor.water-donor.population*5:donor.food-donor.population*3;if(surplus<=4)continue;
  const amount=Math.min(resource==='water'?8:5,Math.floor(surplus));if(resource==='water'){donor.water-=amount;needy.water+=amount}else{donor.food-=amount;needy.food+=amount}
  donor.trust=(donor.trust||0)+.2;needy.trust=(needy.trust||0)+.2;recordFlow(donor.name,needy.name,resource,amount);if(Math.random()<.45)log(`${donor.name}向${needy.name}轉移了${RES_LABELS[resource]} ${amount}。`,'good');
 }
}

function addRumor(n,loc){const summary=summarizeRemaining(state.locations[loc.id].remaining);const existing=state.rumors.find(r=>r.location===loc.id&&state.day-r.day<3);if(existing){existing.day=state.day;existing.summary=summary;existing.source=n.name;return}state.rumors.push({location:loc.id,day:state.day,summary,source:n.name,shared:false});if(state.rumors.length>30)state.rumors.shift()}
function npcSearch(){const active=Object.values(state.npcs).filter(n=>n.alive),band=phaseBand();for(const n of active){let candidates=locations.filter(l=>l.id!=='base'&&Object.values(state.locations[l.id].remaining).some(v=>v>0));if(!candidates.length)continue;candidates.sort((a,b)=>a.risk-b.risk);let pool=candidates.slice(0,Math.min(state.day<15?5:8,candidates.length));let loc=pool[Math.floor(Math.random()*pool.length)];const rem=state.locations[loc.id].remaining;n.need=normalizeNeed(n);const needKey={水:'water',食物:'food',藥品:'medicine',電池:'battery',零件:'parts',冷媒:'coolant'}[n.need];let target=(rem[needKey]||0)>0?needKey:(rem.parts?'parts':rem.water?'water':'food');let baseTake=2+Math.floor(Math.random()*3),take=Math.min(rem[target]||0,Math.max(1,Math.floor(baseTake*band.take)));if(take<=0)continue;rem[target]-=take;n.stock[target]=(n.stock[target]||0)+take;n.location=loc.id;addRumor(n,loc);if(Math.random()<.34)log(`${n.name}前往${loc.name}，帶走了${RES_LABELS[target]||target}。`)}}
function settlementTick(){Object.values(state.settlements).forEach(s=>{if(s.population<=0)return;s.water=Math.max(0,s.water-s.population*1.45);s.food=Math.max(0,s.food-s.population*.78);const waterDays=s.water/Math.max(1,s.population*1.45);if(waterDays<.5){s.health-=10;s.status='危急缺水'}else if(waterDays<1.5){s.health-=4;s.status='缺水'}else{s.health=Math.min(100,s.health+1);s.status='穩定'}
 if(s.water===0&&s.population>0&&state.day>18){if(state.base.trust>3&&state.resources.water>=8){state.resources.water-=8;s.water+=8;s.trust++;log(`${s.name}缺水，向你的基地換到 8L 緊急供水。`,'good')}else if(s.health<35&&Math.random()<.32){s.population--;s.health=Math.min(60,s.health+8);log(`${s.name}因長期缺水失去一名倖存者。`,'bad')}}
 if(state.day>=24&&waterDays<1&&state.day-state.flags.lastMigration>2)considerMigration(s)
 });}
function requestExists(settlement){return state.pendingRequests.some(r=>r.settlement===settlement.id)}
