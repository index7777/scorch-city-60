const $=id=>document.getElementById(id);
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const SAVE_KEY='scorch60_save_v14_2_2', OLD_KEYS=['scorch60_save_v14_2_1','scorch60_save_v14_2','scorch60_save_v14_1','scorch60_save_v14_0','scorch60_save_v13_9','scorch60_save_v13_8','scorch60_save_v13_7','scorch60_save_v13_6','scorch60_save_v13_5','scorch60_save_v13_4','scorch60_save_v13_3','scorch60_save_v13_2','scorch60_save_v13_1','scorch60_save_v13','scorch60_save_v12','scorch60_save_v11','scorch60_save_v10','scorch60_save_v9','scorch60_save_v8','scorch60_save_v7','scorch60_save_v6','scorch60_save_v5','scorch60_save_v4','scorch60_save_v3'];
const RES_LABELS={water:'水 L',food:'食物',battery:'電池 kWh',medicine:'藥品',fuel:'燃料 L',parts:'零件',coolant:'冷媒',filters:'濾芯',data:'研究資料'};
const RES_ORDER=['water','food','battery','medicine','fuel','parts','coolant','filters','data'];
const RES_WEIGHT={water:1,food:.5,battery:.8,medicine:.2,fuel:.8,parts:1.2,coolant:1,filters:.4,data:.1};

const locations=[
 {id:'base',name:'耐熱屋',x:8,y:74,desc:'Day 30 前的固定安全屋，只提供基本生存溫度與低功率照明。',risk:0,base:true,loot:{}},
 {id:'homes',name:'住宅區',x:22,y:55,desc:'分散的瓶裝水、食物與家用電池。',risk:1,loot:{water:32,food:22,battery:5,medicine:2,parts:4}},
 {id:'store',name:'便利商店',x:39,y:73,desc:'早期食物與飲用水來源，會被其他倖存者快速搜刮。',risk:1,loot:{water:22,food:36,battery:3,medicine:1}},
 {id:'school',name:'社區中心',x:50,y:84,desc:'有小型儲水與較多人口，是第一個自然形成的聚落。',risk:1,loot:{water:28,food:24,medicine:2,filters:1}},
 {id:'clinic',name:'診所',x:65,y:68,desc:'醫療用品集中處，林醫師在這裡。',risk:2,npc:'lin',loot:{water:9,food:7,medicine:16,battery:2,filters:2,data:1}},
 {id:'hardware',name:'五金行',x:51,y:43,desc:'推車、零件、濾芯與工程工具。',risk:2,loot:{parts:18,battery:5,fuel:2,filters:3},special:'cart'},
 {id:'warehouse',name:'物流倉',x:75,y:43,desc:'大量物資與桶裝水，但需要更好的運輸能力。',risk:3,npc:'wu',loot:{water:86,food:62,fuel:15,parts:10,battery:5}},
 {id:'fire',name:'消防站',x:85,y:72,desc:'工程車、水泵、燃料與耐熱工具。陳技師在這裡。',risk:3,npc:'chen',loot:{water:64,fuel:22,parts:18,battery:7,filters:2},special:'vehicle'},
 {id:'subway',name:'地鐵維修站',x:29,y:35,desc:'Day 30 後仍相對涼爽，可改造成外部冷站。',risk:2,loot:{parts:10,battery:7,water:14,filters:1},special:'coldSite'},
 {id:'industrial',name:'工業區',x:35,y:17,desc:'大型壓縮機、冷媒與工業零件；白晝熱負荷極高。',risk:4,loot:{parts:31,coolant:20,battery:6,data:2},special:'cooling'},
 {id:'coldstore',name:'大型冷庫',x:52,y:22,desc:'可回收冷凝設備、冷媒與高效率隔熱材料。',risk:4,loot:{food:20,parts:20,coolant:14,battery:4,data:1},special:'coldSite'},
 {id:'research',name:'研究園區',x:67,y:14,desc:'永晝、熱工設備與冷源核心的重要技術資料。',risk:4,npc:'mei',loot:{parts:8,battery:5,medicine:2,data:8},special:'coreInfo'},
 {id:'solar',name:'太陽能場',x:83,y:34,desc:'大量光電模組與逆變設備，永晝後是穩定能源來源。',risk:4,loot:{parts:14,battery:9,data:2},special:'solar'},
 {id:'vent',name:'中央通風站',x:90,y:13,desc:'城市唯一能長期維持大規模生存環境的設施。',risk:4,loot:{parts:8,battery:5},special:'vent'}
];



const assetDefs=[
 {id:'generator',name:'柴油發電機',location:'fire',weight:310,need:'vehicle',desc:'可提供中央站穩定備援電力。',effect:'power'},
 {id:'ibc',name:'IBC 1000L 儲水箱',location:'warehouse',weight:95,need:'vehicle',desc:'大型儲水設備，可提升基地物流與配給穩定性。',effect:'water'},
 {id:'compressorA',name:'工業壓縮機 A',location:'industrial',weight:420,need:'vehicle',desc:'中央站擴容與核心工程的關鍵設備。',effect:'compressor'},
 {id:'compressorB',name:'工業壓縮機 B',location:'industrial',weight:390,need:'vehicle',desc:'第二台高溫工業壓縮機，可增加冷卻冗餘。',effect:'compressor'},
 {id:'chiller',name:'商用冰水機',location:'coldstore',weight:680,need:'vehicle',desc:'完整搬回後可大幅增加中央站前期冷卻能力。',effect:'chiller'},
 {id:'pump',name:'高流量消防泵',location:'fire',weight:145,need:'cart',desc:'可支援水處理與中央站冷卻循環。',effect:'pump'},
 {id:'inverter',name:'工業逆變器組',location:'solar',weight:180,need:'vehicle',desc:'讓太陽能場能有效接入中央站微型電網。',effect:'inverter'},
 {id:'lift',name:'液壓搬運平台',location:'warehouse',weight:520,need:'vehicle',desc:'冷源核心運輸前必備的重型物流設備。',effect:'lift'},
 {id:'drum200',name:'200L 大型水桶',location:'school',weight:215,need:'vehicle',desc:'裝滿的飲用水桶，必須實體運回；帶回後增加 200L 水。',effect:'drum'},
 {id:'fireTank',name:'消防儲水槽',location:'fire',weight:760,need:'vehicle',desc:'含大量非飲用水，可經水處理轉成基地可用水。',effect:'fireTank'}
];

const PORTRAIT_ART={
 lin:'assets/portraits/lin.webp',
 chen:'assets/portraits/chen.webp',
 mei:'assets/portraits/mei.webp',
 wu:'assets/portraits/wu.webp'
};

const DISTRICT_ART={
 base:'assets/districts/thumbnails/base.webp',
 homes:'assets/districts/thumbnails/homes.webp',
 store:'assets/districts/thumbnails/store.webp',
 school:'assets/districts/thumbnails/school.webp',
 clinic:'assets/districts/thumbnails/clinic.webp',
 hardware:'assets/districts/thumbnails/hardware.webp',
 warehouse:'assets/districts/thumbnails/warehouse.webp',
 fire:'assets/districts/thumbnails/fire.webp',
 subway:'assets/districts/thumbnails/subway.webp',
 industrial:'assets/districts/thumbnails/industrial.webp',
 coldstore:'assets/districts/thumbnails/coldstore.webp',
 research:'assets/districts/thumbnails/research.webp',
 solar:'assets/districts/thumbnails/solar.webp',
 vent:'assets/districts/thumbnails/vent.webp'
};
// v13.4: remaining districts also receive 2560×1440 master scenes; map thumbnails stay lightweight while location/expedition panels lazy-load 2K art.
const DISTRICT_MASTER={
 clinic:{night:'assets/districts/master/clinic_night.webp',day:'assets/districts/master/clinic_day.webp',endless:'assets/districts/master/clinic_endless.webp'},
 warehouse:{night:'assets/districts/master/warehouse_night.webp',day:'assets/districts/master/warehouse_day.webp',endless:'assets/districts/master/warehouse_endless.webp'},
 coldstore:{night:'assets/districts/master/warehouse_night.webp',day:'assets/districts/master/warehouse_day.webp',endless:'assets/districts/master/warehouse_endless.webp'},
 industrial:{night:'assets/districts/master/industrial_night.webp',day:'assets/districts/master/industrial_day.webp',endless:'assets/districts/master/industrial_endless.webp'},
 research:{night:'assets/districts/master/research_night.webp',day:'assets/districts/master/research_day.webp',endless:'assets/districts/master/research_endless.webp'},
 homes:{night:'assets/districts/master/homes_night.webp',day:'assets/districts/master/homes_day.webp',endless:'assets/districts/master/homes_endless.webp'},
 store:{night:'assets/districts/master/commercial_night.webp',day:'assets/districts/master/commercial_day.webp',endless:'assets/districts/master/commercial_endless.webp'},
 hardware:{night:'assets/districts/master/commercial_night.webp',day:'assets/districts/master/commercial_day.webp',endless:'assets/districts/master/commercial_endless.webp'},
 school:{night:'assets/districts/master/park_night.webp',day:'assets/districts/master/park_day.webp',endless:'assets/districts/master/park_endless.webp'},
 fire:{night:'assets/districts/master/waterworks_night.webp',day:'assets/districts/master/waterworks_day.webp',endless:'assets/districts/master/waterworks_endless.webp'},
 subway:{night:'assets/districts/master/highway_night.webp',day:'assets/districts/master/highway_day.webp',endless:'assets/districts/master/highway_endless.webp'},
 solar:{night:'assets/districts/master/power_night.webp',day:'assets/districts/master/power_day.webp',endless:'assets/districts/master/power_endless.webp'},
 base:{night:'assets/backgrounds/central_vent_night.webp',day:'assets/backgrounds/central_vent_day.webp',endless:'assets/backgrounds/central_vent_endless.webp'},
 vent:{night:'assets/backgrounds/central_vent_night.webp',day:'assets/backgrounds/central_vent_day.webp',endless:'assets/backgrounds/central_vent_endless.webp'}
};
