// v15.6 Batch 7 — midgame testimony intelligence expansion from actual conversations.
(function(){
 const MIDGAME_INTEL_V132={
  'I-P11':{id:'I-P11',category:'people',location:'store',sourceType:'testimony',reliability:'medium',summary:'周博明提到有人會把剩餘物資集中到較好搬運的位置。',staleAfterHours:36},
  'I-P12':{id:'I-P12',category:'people',location:'clinic',sourceType:'testimony',reliability:'medium',summary:'羅曉芬提到受傷的人有時會先在診所附近停留。',staleAfterHours:24},
  'I-P13':{id:'I-P13',category:'people',location:'school',sourceType:'testimony',reliability:'medium',summary:'蔡育仁提到學校裡曾有人為了找出口來回走動。',staleAfterHours:36},
  'I-P14':{id:'I-P14',category:'people',location:'homes',sourceType:'testimony',reliability:'low',summary:'鄧慧雯說她仍在找與家人有關的目擊消息。',staleAfterHours:24},
  'I-P15':{id:'I-P15',category:'people',location:'warehouse',sourceType:'testimony',reliability:'medium',summary:'馬俊豪提到有人會在倉庫周邊尋找可搬運物資。',staleAfterHours:24},
  'I-P16':{id:'I-P16',category:'people',location:'homes',sourceType:'testimony',reliability:'medium',summary:'方莉莉提到附近有人優先保存能直接吃的食物。',staleAfterHours:24},
  'I-P17':{id:'I-P17',category:'people',location:'homes',sourceType:'testimony',reliability:'low',summary:'洪阿姨只確認自己最近在住宅區附近看過人影活動。',staleAfterHours:18},
  'I-P18':{id:'I-P18',category:'people',location:'store',sourceType:'testimony',reliability:'medium',summary:'安琪說她正在追查家人最後出現的位置。',staleAfterHours:24},
  'I-P19':{id:'I-P19',category:'people',location:'clinic',sourceType:'testimony',reliability:'medium',summary:'阿梅提到她正照顧身邊需要幫助的人。',staleAfterHours:24},
  'I-P20':{id:'I-P20',category:'people',location:'subway',sourceType:'testimony',reliability:'low',summary:'浩子轉述有人會拿不需要的東西換急用物資。',staleAfterHours:18},
  'I-S11':{id:'I-S11',category:'stock',location:'store',sourceType:'testimony',reliability:'medium',summary:'周博明說店內剩餘物資只算現場還看得到的。',staleAfterHours:18},
  'I-S12':{id:'I-S12',category:'stock',location:'clinic',sourceType:'testimony',reliability:'medium',summary:'羅曉芬說藥品能不能用，要逐件確認保存狀況。',staleAfterHours:18},
  'I-S13':{id:'I-S13',category:'stock',location:'warehouse',sourceType:'testimony',reliability:'medium',summary:'馬俊豪說部分倉庫貨物已經被搬離原位。',staleAfterHours:18},
  'I-S14':{id:'I-S14',category:'stock',location:'homes',sourceType:'testimony',reliability:'medium',summary:'方莉莉說高熱下可直接食用的東西會先被保留下來。',staleAfterHours:18},
  'I-S15':{id:'I-S15',category:'stock',location:'warehouse',sourceType:'testimony',reliability:'low',summary:'老何只願意承認自己手上確實留著少量可交換物。',staleAfterHours:12},
  'I-R13':{id:'I-R13',category:'route',location:'school',sourceType:'testimony',reliability:'medium',summary:'蔡育仁說學校內有些門平常只靠特定鑰匙通行。',staleAfterHours:48},
  'I-R14':{id:'I-R14',category:'route',location:'hardware',sourceType:'testimony',reliability:'medium',summary:'魏師傅說五金行附近的管線位置可以從現場接頭方向判斷。',staleAfterHours:48},
  'I-R15':{id:'I-R15',category:'route',location:'industrial',sourceType:'testimony',reliability:'medium',summary:'阿宇說工業區能走的路會隨熱損與障礙改變，不能只靠舊印象。',staleAfterHours:24},
  'I-R16':{id:'I-R16',category:'route',location:'subway',sourceType:'testimony',reliability:'low',summary:'浩子說地鐵入口附近有人走過，但他沒有確認更深處。',staleAfterHours:18},
  'I-R17':{id:'I-R17',category:'route',location:'warehouse',sourceType:'testimony',reliability:'medium',summary:'馬俊豪說倉庫搬運通道是否可用，要看當下堆放狀況。',staleAfterHours:24}
 };
 Object.assign(INTELLIGENCE_V123,MIDGAME_INTEL_V132);
 const RECURRING_TESTIMONY_V132={
  'npc-zhou-boming-r07':['I-P11'],'npc-luo-xiaofen-r07':['I-P12'],'npc-cai-yuren-r07':['I-P13'],'npc-deng-huiwen-r07':['I-P14'],'npc-ma-junhao-r07':['I-P15'],'npc-fang-lili-r07':['I-P16'],
  'npc-zhou-boming-r06':['I-S11'],'npc-luo-xiaofen-r06':['I-S12'],'npc-ma-junhao-r06':['I-S13'],'npc-fang-lili-r06':['I-S14'],
  'npc-cai-yuren-r03':['I-R13'],'npc-ma-junhao-r03':['I-R17']
 };
 const LOCAL_TESTIMONY_V132={
  'npc-hong-ayi-l03':['I-P17'],'npc-anqi-l02':['I-P18'],'npc-mei-l02':['I-P19'],'npc-haozi-l03':['I-P20'],
  'npc-lao-he-l02':['I-S15'],'npc-wei-shifu-l03':['I-R14'],'npc-yu-l02':['I-R15'],'npc-haozi-l02':['I-R16']
 };
 function learnMappedV132(map,people,s){let learned=0;for(const [topicId,ids] of Object.entries(map)){const npcId=topicId.replace(/-[rl]\d\d$/,'');const p=people?.[npcId];if(!p||!Array.isArray(p.talked)||!p.talked.includes(topicId))continue;for(const id of ids){if(knownIntelV123(id,s))continue;const r=learnIntelV123(id,{source:'testimony',reliability:MIDGAME_INTEL_V132[id].reliability,verified:false,topicId,npcId},s);if(r.ok)learned++}}return learned}
 function syncMidgameIntelV132(s=state){let learned=0;learned+=learnMappedV132(RECURRING_TESTIMONY_V132,typeof ensureRecurringNpcV129==='function'?ensureRecurringNpcV129(s).people:null,s);learned+=learnMappedV132(LOCAL_TESTIMONY_V132,typeof ensureLocalNpcV130==='function'?ensureLocalNpcV130(s).people:null,s);if(learned){evaluateDeductionsV123(s);if(s===state&&typeof renderKnowledgeV125==='function')queueMicrotask(renderKnowledgeV125)}return learned}
 const prevRenderMapV132=renderMap;renderMap=function(){const out=prevRenderMapV132();queueMicrotask(()=>syncMidgameIntelV132());return out};
 const prevRenderV132=render;render=function(){const out=prevRenderV132();queueMicrotask(()=>syncMidgameIntelV132());return out};
 window.MIDGAME_INTEL_V132=MIDGAME_INTEL_V132;window.RECURRING_TESTIMONY_V132=RECURRING_TESTIMONY_V132;window.LOCAL_TESTIMONY_V132=LOCAL_TESTIMONY_V132;window.syncMidgameIntelV132=syncMidgameIntelV132;
})();