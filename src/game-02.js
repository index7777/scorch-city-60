function makeState(){
 const s={
  version:14.22,day:1,phase:'night',hoursLeft:8,gameOver:false,
  resources:{water:12,food:12,battery:4,medicine:2,fuel:8,parts:4,coolant:0,filters:0,data:0},
  base:{population:1,trust:0,powerKW:0,storageKWh:4,coolingCapacity:0,ventilation:0,ventCapacity:0,core:false,waterTreatment:0,condition:100},
  ration:{water:2.5,food:1.0,intake:'review'},
  workforce:{water:0,cooling:0,power:0,medical:0,logistics:0,maintenance:0,core:0,rest:1},
  fatigue:0,training:{hvac:0,electric:0,medical:0},privatePool:{water:0,food:0,battery:0},morningReports:[],
  zones:{residential:{level:1,capacity:12},medical:{level:0,capacity:4},engineering:{level:0,capacity:6},storage:{level:0,capacity:200}},
  gear:{cart:false,vehicle:false,coolingPack:false,waterTank:false,solar:false,toolkit:false},
  research:{water:false,cooling:false,solar:false,coldStation:false,core:false},
  knownCore:false,coldStations:[],pendingRequests:[],rumors:[],intel:{},
  npcs:{
   lin:{name:'林醫師',role:'醫療',trust:0,alive:true,location:'clinic',stock:{water:8,food:4,medicine:6,battery:1,parts:0,coolant:0},need:'水',group:'clinic'},
   chen:{name:'陳技師',role:'冷凍空調',trust:0,alive:true,location:'fire',stock:{water:10,food:6,medicine:1,battery:2,parts:5,coolant:2},need:'藥品',group:'fire'},
   mei:{name:'美玲',role:'研究',trust:0,alive:true,location:'research',stock:{water:6,food:8,medicine:1,battery:0,parts:1,coolant:0},need:'電池',group:null},
   wu:{name:'吳先生',role:'物流',trust:0,alive:true,location:'warehouse',stock:{water:12,food:10,medicine:0,battery:1,parts:2,coolant:0},need:'藥品',group:null}
  },
  settlements:{
   clinic:{id:'clinic',name:'診所避難點',location:'clinic',population:4,water:30,food:20,trust:0,health:100,status:'stable'},
   fire:{id:'fire',name:'消防工程組',location:'fire',population:5,water:38,food:26,trust:0,health:100,status:'stable'},
   school:{id:'school',name:'社區避難點',location:'school',population:8,water:58,food:46,trust:0,health:100,status:'stable'}
  },
  locations:{},log:[],flags:{lastMigration:0,lastRumor:0,v13Day30Seen:false},
  assets:{},flows:[],logistics:{moved:0,capacity:'徒手',heavyReady:false,npcMoved:0,intercepts:0},installed:{compressors:0,chiller:false,pump:false,generator:false,inverter:false,lift:false},vehicle:{capacityKg:700,condition:100},expedition:{last:null,count:0,pending:null,retreats:0,incidents:0,history:[],lastResult:null},coreProject:{stage:0,active:false,progress:0,paid:false,completed:[],stability:0,lastWorkDay:0},eventChains:{water:{level:0},grid:{level:0},migration:{level:0},core:{level:0}},briefs:[],mapPlanner:{active:false,target:'store',routeMode:'fastest',filter:'all'},mapNotes:[],roadWorld:{},roadIntel:{},intelSeq:1,onboarding:{enabled:true,introSeen:false,firstWater:false,firstAsset:false,completed:false}
 };
 locations.forEach(l=>s.locations[l.id]={remaining:{...l.loot},searched:false});
 assetDefs.forEach(a=>s.assets[a.id]={location:a.location,discovered:false,transported:false,owner:'world'});
 return s;
}
let state=makeState();

const researchDefs=[
 {id:'water',name:'多級濾水',cost:2,req:()=>true,desc:'解鎖高效率濾水模組，降低每日飲水壓力。'},
 {id:'cooling',name:'主動液冷裝備',cost:4,req:()=>state.resources.coolant>=2,desc:'解鎖主動冷卻背包。需先實際取得冷媒。'},
 {id:'solar',name:'微型太陽能電網',cost:3,req:()=>state.resources.battery>=2,desc:'解鎖太陽能陣列與更高儲能能力。'},
 {id:'coldStation',name:'外部冷站',cost:5,req:()=>state.research.cooling&&state.research.solar,desc:'解鎖地鐵／冷庫冷站工程，擴大永晝活動範圍。'},
 {id:'core',name:'冷源核心工程',cost:6,req:()=>state.knownCore,desc:'解讀核心搬運與中央站整合資料，為最終工程做準備。'}
];
const craftDefs=[
 {id:'cart',name:'簡易推車',cost:{parts:4},cond:()=>!state.gear.cart,effect:()=>state.gear.cart=true,desc:'搜尋攜回上限提高。'},
 {id:'toolkit',name:'遠征工具箱',cost:{parts:3},cond:()=>!state.gear.toolkit,effect:()=>state.gear.toolkit=true,desc:'遠征可攜帶工具箱，縮短搜索時間並提高零件回收效率。'},
 {id:'tank',name:'200L 儲水架',cost:{parts:5},cond:()=>!state.gear.waterTank,effect:()=>state.gear.waterTank=true,desc:'提高基地儲水與配給穩定性。'},
 {id:'filter',name:'濾水模組',cost:{parts:6,filters:2,battery:2},cond:()=>state.research.water&&state.base.waterTreatment<3,effect:()=>state.base.waterTreatment++,desc:'降低每日飲水淨消耗。最多三組。'},
 {id:'power',name:'基地儲能模組',cost:{battery:4,parts:6},cond:()=>state.base.storageKWh<64,effect:()=>{state.base.storageKWh+=12;state.base.powerKW+=2;},desc:'增加儲能與基礎供電。'},
 {id:'solar',name:'太陽能陣列',cost:{battery:4,parts:10},cond:()=>state.research.solar&&!state.gear.solar,effect:()=>{state.gear.solar=true;state.base.powerKW+=8;state.base.storageKWh+=20;},desc:'永晝後提供最穩定的持續能源。'},
 {id:'coolpack',name:'主動冷卻背包',cost:{battery:5,parts:8,coolant:4},cond:()=>state.research.cooling&&!state.gear.coolingPack,effect:()=>state.gear.coolingPack=true,desc:'Day 30 後外出搜索的最低條件。'},
 {id:'coldSubway',name:'地鐵冷站',cost:{battery:8,parts:10,coolant:5},cond:()=>state.day>=30&&state.research.coldStation&&!state.coldStations.includes('subway'),effect:()=>state.coldStations.push('subway'),desc:'在西側建立永晝中繼點，降低附近搜索耗電。'},
 {id:'coldStore',name:'冷庫冷站',cost:{battery:10,parts:12,coolant:6},cond:()=>state.day>=30&&state.research.coldStation&&!state.coldStations.includes('coldstore'),effect:()=>state.coldStations.push('coldstore'),desc:'建立北區冷站，支援研究園區與工業區。'},
 {id:'vent1',name:'中央站初級冷卻',cost:{battery:10,parts:14,coolant:7},cond:()=>state.day>=30&&state.base.ventilation===0,effect:()=>{state.base.ventilation=1;state.base.coolingCapacity=18;state.base.ventCapacity=12;state.base.population=Math.max(state.base.population,1);},desc:'讓中央站成為真正的安全基地。'},
 {id:'vent2',name:'中央站擴容',cost:{battery:14,parts:20,coolant:12},cond:()=>state.base.ventilation===1&&state.base.powerKW>=8&&state.installed.compressors>=1&&state.installed.pump,effect:()=>{state.base.ventilation=2;state.base.coolingCapacity=55;state.base.ventCapacity=45;},desc:'擴大人口容量並提供外部冷站補給。需搬回至少 1 台工業壓縮機與高流量消防泵。'},
 {id:'maintain',name:'中央站預防維護',cost:{parts:5,battery:2},cond:()=>state.day>=30&&state.base.ventilation>0&&state.base.condition<92,effect:()=>state.base.condition=Math.min(100,state.base.condition+22),desc:'修復泵浦、配電與風道狀況，降低後續故障壓力。'}
];


