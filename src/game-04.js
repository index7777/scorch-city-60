function currentRiskScore(){let r=0;if(daysOfWater()<5)r+=5-daysOfWater();if(foodDays()<4)r+=4-foodDays();if(state.day>=30&&!state.gear.coolingPack&&!state.base.core)r+=4;if(overCapacity()>0)r+=Math.min(4,Math.ceil(overCapacity()/3));if(state.day>=30&&state.base.ventilation>0&&state.base.condition<65)r+=Math.ceil((65-state.base.condition)/10);if(state.fatigue>55)r+=2;if(state.pendingRequests.length)r+=1;if(coreSchedulePressure()>0)r+=Math.min(5,coreSchedulePressure());return r}
function riskLabel(){const r=currentRiskScore();return r>=10?'危急':r>=6?'高風險':r>=3?'緊張':'可控'}
function dayTemp(d){if(d<=7)return 72;if(d<=14)return 78;if(d<=21)return 84;if(d<=29)return 92;return 100}
function objective(){if(state.day<8)return '第一週：建立水、食物與搬運能力。';if(state.day<15)return '第二週：取得交通工具、濾水與穩定儲能。';if(state.day<22)return '第三週：找到冷媒與研究資料，提前解鎖主動冷卻。';if(state.day<30)return '最後幾夜：集中搬運冷卻、電池與關鍵設備。';if(state.day<38)return '永晝：撤往中央通風站，處理第一波人口與冷卻壓力。';if(state.day<45)return '擴張冷站，穩住聚落並取得冷源核心完整工程資料。';if(!state.base.core){const cp=state.coreProject;return cp.stage===0?'準備冷源核心終局工程。':`冷源核心工程：${coreDone()?'完成':coreStage().name}。`;}return '維持中央站、配給與倖存人口至 Day 60。'}
function log(msg,type=''){state.log.push({msg,type,day:state.day});if(state.log.length>150)state.log.shift();renderLog();if(type==='major'||type==='bad')playAlert(type)}
function toast(msg){const t=$('toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),1600)}
function hasCost(cost){return Object.entries(cost).every(([k,v])=>(state.resources[k]||0)>=v)}
function pay(cost){Object.entries(cost).forEach(([k,v])=>state.resources[k]-=v)}
function aliveNpcCount(){return Object.values(state.npcs).filter(n=>n.alive).length}
function npcKnown(n){return !!n&&!!state.locations[n.location]?.searched}
function knownNpcCount(){return Object.values(state.npcs).filter(n=>n.alive&&npcKnown(n)).length}
function settlementPopulation(){return Object.values(state.settlements).reduce((a,s)=>a+s.population,0)}
function knownPopulation(){return state.base.population+settlementPopulation()}
function totalLiving(){return knownPopulation()+knownNpcCount()}
function dailyWaterNeed(){let n=Math.max(1,state.base.population)*state.ration.water;n-=state.base.waterTreatment*1.5;if(state.day>=30&&state.base.ventilation===0)n+=2;if(overCapacity()>0)n+=Math.ceil(overCapacity()*.65);return Math.max(1,Math.ceil(n))}
function dailyFoodNeed(){return Math.max(1,Math.ceil(state.base.population*state.ration.food))}
function daysOfWater(){return Math.max(0,Math.floor(state.resources.water/Math.max(1,dailyWaterNeed())))}
function overCapacity(){return Math.max(0,state.base.population-state.base.ventCapacity)}
function coolingLoadPct(){if(!state.base.ventCapacity)return 0;return Math.round((state.base.population/state.base.ventCapacity)*100)}
function normalizeNeed(n){if((n.stock.water||0)<5)return '水';if((n.stock.food||0)<3)return '食物';if((n.stock.medicine||0)<1&&n.role==='醫療')return '藥品';if((n.stock.battery||0)<1&&(n.role==='研究'||n.role==='冷凍空調'))return '電池';if((n.stock.parts||0)<2&&n.role==='冷凍空調')return '零件';return n.role==='醫療'?'藥品':n.role==='冷凍空調'?'冷媒':n.role==='研究'?'電池':'食物'}

function knownCityWater(){let total=0,found=false;locations.forEach(l=>{const rec=state.intel[l.id];if(state.locations[l.id].searched||rec){total+=state.locations[l.id].remaining.water||0;found=true}});return found?Math.floor(total)+' L':'?'}
function saveGame(manual=true){localStorage.setItem(SAVE_KEY,JSON.stringify(state));if(manual)toast('已存檔')}
function mergeSave(data){const fresh=makeState();state={...fresh,...data};state.resources={...fresh.resources,...(data.resources||{})};state.base={...fresh.base,...(data.base||{})};state.ration={...fresh.ration,...(data.ration||{})};state.workforce={...fresh.workforce,...(data.workforce||{})};state.training={...fresh.training,...(data.training||{})};state.privatePool={...fresh.privatePool,...(data.privatePool||{})};state.zones={...fresh.zones,...(data.zones||{})};state.morningReports=data.morningReports||[];state.gear={...fresh.gear,...(data.gear||{})};state.research={...fresh.research,...(data.research||{})};state.flags={...fresh.flags,...(data.flags||{})};state.npcs={...fresh.npcs,...(data.npcs||{})};state.settlements={...fresh.settlements,...(data.settlements||{})};state.locations={...fresh.locations,...(data.locations||{})};state.assets={...fresh.assets,...(data.assets||{})};state.flows=data.flows||[];state.logistics={...fresh.logistics,...(data.logistics||{})};state.installed={...fresh.installed,...(data.installed||{})};state.vehicle={...fresh.vehicle,...(data.vehicle||{})};state.expedition={...fresh.expedition,...(data.expedition||{})};state.expedition.history=data.expedition?.history||[];state.coreProject={...fresh.coreProject,...(data.coreProject||{})};state.eventChains={...fresh.eventChains,...(data.eventChains||{})};for(const k of Object.keys(fresh.eventChains))state.eventChains[k]={...fresh.eventChains[k],...(state.eventChains[k]||{})};state.briefs=data.briefs||[];state.mapPlanner={...fresh.mapPlanner,...(data.mapPlanner||{})};state.mapNotes=data.mapNotes||[];state.roadWorld={...fresh.roadWorld,...(data.roadWorld||{})};state.roadIntel={...fresh.roadIntel,...(data.roadIntel||{})};state.intelSeq=data.intelSeq||1;state.onboarding={...fresh.onboarding,...(data.onboarding||{})};for(const aid of Object.keys(fresh.assets)){state.assets[aid]={...fresh.assets[aid],...(state.assets[aid]||{})}};for(const l of locations){state.locations[l.id]=state.locations[l.id]||fresh.locations[l.id];state.locations[l.id].remaining={...l.loot,...(state.locations[l.id].remaining||{})}}
 state.pendingRequests=data.pendingRequests||[];state.rumors=data.rumors||[];state.intel=data.intel||{};state.version=14.22;
}
function loadGame(){const raw=localStorage.getItem(SAVE_KEY)||OLD_KEYS.map(k=>localStorage.getItem(k)).find(Boolean);if(!raw)return toast('沒有存檔');try{mergeSave(JSON.parse(raw));log('已讀取存檔；舊版進度已遷移到 v14.2.2 QA：修復地圖渲染、道路情報函式、彈窗、音效與探索入口。','good');render()}catch(e){console.error(e);toast('存檔損壞')}}
function newGame(){if(confirm('確定重新開局？目前進度會被覆蓋。')){localStorage.removeItem(SAVE_KEY);location.reload()}}

function render(){
 $('day').textContent=state.day;$('phase').textContent=state.day>=30?'永晝':state.phase==='night'?'夜晚':'白晝';$('temp').textContent=(state.day>=30?100:(state.phase==='night'?8:dayTemp(state.day)))+'°C';$('hours').textContent=state.day>=30?'∞':state.hoursLeft+'h';$('daysLeft').textContent=daysOfWater()+' 天';$('objective').textContent=objective();
 $('researchData').textContent=state.resources.data;$('knownPop').textContent=totalLiving();$('ventCapacity').textContent=state.base.ventCapacity;$('knownWater').textContent=knownCityWater();$('knownAssets').textContent=Object.values(state.assets).filter(a=>a.discovered).length+'/'+assetDefs.length;
 renderResources();renderBase();renderMap();renderLog();renderSummary();renderV13();renderOnboarding();applyProgressiveUI();saveGame(false);
 $('restBtn').textContent=state.day>=30?'推進 1 天':state.phase==='night'?'結束夜晚':'等待至夜晚';
}
function tutorialStage(){
 if(!state.onboarding?.enabled||state.onboarding.completed)return 0;
 if(!state.onboarding.firstWater)return 1;
 if(!state.gear.cart)return 2;
 if(!state.onboarding.firstAsset)return 3;
 return 4;
}
