// v15.0 Batch 6 — intelligence, clues, deductions and event data foundation.
(function(){
 const makeIntel=(id,category,location,sourceType,reliability,summary,staleAfterHours=48)=>({id,category,location,sourceType,reliability,summary,staleAfterHours});
 const INTELLIGENCE_V123={};
 const addIntel=(...args)=>{const r=makeIntel(...args);INTELLIGENCE_V123[r.id]=r};
 [
  ['I-R01','homes','observation','high','住宅巷口可直接通往基地附近。'],['I-R02','store','observation','high','商店正門鐵捲門受損。'],['I-R03','school','observation','high','學校側門可見但需要近距離確認。'],['I-R04','clinic','observation','high','診所入口未被大型障礙完全封死。'],['I-R05','hardware','observation','high','五金行前方通道仍可步行。'],['I-R06','warehouse','observation','high','倉庫外側可見搬運通道。'],['I-R07','fire','observation','high','消防站入口區仍可接近。'],['I-R08','subway','observation','high','地鐵入口只確認到地面層。'],['I-R09','industrial','observation','high','工業區道路有可辨識的繞行空間。'],['I-R10','coldstore','observation','high','冷藏設施外圍可抵達。'],['I-R11','research','observation','high','研究設施外門仍在。'],['I-R12','solar','observation','high','太陽能區只確認到外圍通路。']
 ].forEach(([id,loc,src,rel,sum])=>addIntel(id,'route',loc,src,rel,sum,36));
 [
  ['I-S01','homes','observation','high','住宅內發現少量可攜物資。'],['I-S02','store','observation','high','商店貨架庫存是有限的。'],['I-S03','clinic','observation','high','診所可見醫療物資不會自行補充。'],['I-S04','hardware','observation','high','五金行零件與工具為現場實物。'],['I-S05','warehouse','observation','high','倉庫箱件數量有限。'],['I-S06','store','document','medium','後場可能曾有另一批配送貨。'],['I-S07','warehouse','document','medium','一份搬運紀錄提到部分貨物已移走。'],['I-S08','clinic','testimony','medium','有人聲稱較完整的藥品曾被鎖起。'],['I-S09','homes','testimony','low','住戶提到附近可能還有飲水。'],['I-S10','industrial','observation','high','散落零件受到高熱影響。']
 ].forEach(([id,loc,src,rel,sum])=>addIntel(id,'stock',loc,src,rel,sum,24));
 [
  ['I-P01','homes','encounter','high','你在住宅區實際遇見一名倖存者。'],['I-P02','clinic','encounter','high','你在診所實際遇見一名倖存者。'],['I-P03','hardware','encounter','high','你在五金行實際遇見一名倖存者。'],['I-P04','warehouse','encounter','high','你在倉庫實際遇見一名倖存者。'],['I-P05','store','encounter','high','你在商店實際遇見一名倖存者。'],['I-P06','fire','encounter','high','你在消防站實際遇見一名倖存者。'],['I-P07','school','encounter','high','你在學校實際遇見一名倖存者。'],['I-P08','coldstore','encounter','high','你在冷藏設施實際遇見一名倖存者。'],['I-P09','research','encounter','high','你在研究設施實際遇見一名倖存者。'],['I-P10','industrial','encounter','high','你在工業區實際遇見一名倖存者。']
 ].forEach(([id,loc,src,rel,sum])=>addIntel(id,'people',loc,src,rel,sum,72));
 [
  ['I-H01','homes','observation','high','室外受日照區升溫很快。'],['I-H02','store','observation','high','金屬門表面蓄熱明顯。'],['I-H03','clinic','observation','high','部分設備已因高熱失效。'],['I-H04','hardware','observation','high','機械材料仍可能被持續高熱破壞。'],['I-H05','warehouse','observation','high','大型金屬物件在熱環境下不可徒手長時間處理。'],['I-H06','industrial','observation','high','工業設備周邊存在額外熱源。'],['I-H07','coldstore','observation','high','冷藏設施是否仍有冷卻能力需要實測。'],['I-H08','research','document','medium','舊紀錄提到熱負載曾超出設計值。'],['I-H09','solar','observation','high','曝曬設備表面溫度極高。'],['I-H10','subway','observation','high','地下入口的熱狀況不能由地面直接推定。']
 ].forEach(([id,loc,src,rel,sum])=>addIntel(id,'hazard',loc,src,rel,sum,18));
 [
  ['I-C01','industrial','document','medium','維護紀錄出現一次未解釋的負載偏差。'],['I-C02','coldstore','document','medium','冷卻服務單記載過非標準維修。'],['I-C03','warehouse','document','medium','配送清單中有一批設備零件去向不明。'],['I-C04','research','document','medium','研究紀錄出現與現場設備不一致的編號。'],['I-C05','fire','testimony','medium','一段口述提到災前曾有緊急操作演練。'],['I-C06','school','document','medium','手繪圖上標出一條維修通道。'],['I-C07','industrial','observation','high','一台設備留下非原廠改裝痕跡。'],['I-C08','research','observation','high','一組殘留感測資料仍可辨識部分趨勢。']
 ].forEach(([id,loc,src,rel,sum])=>addIntel(id,'causal',loc,src,rel,sum,0));

 const CLUES_V123={
  C01:{name:'維護數值不一致',requires:['I-C01']},
  C02:{name:'異常負載紀錄',requires:['I-H08','I-C01']},
  C03:{name:'冷卻系統服務註記',requires:['I-C02']},
  C04:{name:'中斷的配送清單',requires:['I-C03']},
  C05:{name:'非標準設備磨耗',requires:['I-H06','I-C07']},
  C06:{name:'封閉區域痕跡',requires:['I-R08','I-H10']},
  C07:{name:'操作人員口述',requires:['I-C05']},
  C08:{name:'技術筆記碎片',requires:['I-C04']},
  C09:{name:'設備編號不符',requires:['I-C04','I-C07']},
  C10:{name:'舊緊急操作程序',requires:['I-C05','I-C06']},
  C11:{name:'維修通道圖碎片',requires:['I-C06']},
  C12:{name:'殘留感測記錄',requires:['I-C08']}
 };
 const DEDUCTIONS_V123={
  'deduction-system-not-fully-dead':{name:'系統可能並未完全失效',requiresAny:[['C01','C12'],['C02','C03','C12']]},
  'deduction-required-specialist':{name:'需要特定專業人員',requiresAny:[['C03','C07'],['C08','C10']]},
  'deduction-required-component-chain':{name:'需要一組相依零件',requiresAny:[['C04','C09'],['C04','C11']]}
 };
 const EVENT_IDS_V123=[
  'jammed-door','blocked-stairwell','leaking-bottle','broken-window-heat','distant-knocking','dragging-marks','fresh-footprints','abandoned-bag','locked-backroom','tripped-breaker','burst-hose','fallen-shelf','stuck-shutter','dead-flashlight','overheated-phone','spoiled-food-cache','empty-water-case','handwritten-note','missing-key','loose-vent-cover','cracked-cooler','injured-stranger','frightened-resident','barter-note-on-door','noise-behind-wall','smoke-smell','heat-damaged-battery','medicine-cabinet-locked','abandoned-cart','collapsed-awning'
 ];
 const EVENTS_V123=Object.fromEntries(EVENT_IDS_V123.map((id,i)=>[id,{id,scope:'micro',location:['homes','store','school','clinic','hardware','warehouse','fire','subway','industrial','coldstore','research','solar'][i%12],resolved:false}]));
 function ensureKnowledgeV123(s=state){
  s.knowledgeV123=s.knowledgeV123&&typeof s.knowledgeV123==='object'?s.knowledgeV123:{};
  const k=s.knowledgeV123;
  if(!k.intelligence||typeof k.intelligence!=='object')k.intelligence={};
  if(!Array.isArray(k.clues))k.clues=[];
  if(!Array.isArray(k.deductions))k.deductions=[];
  if(!k.events||typeof k.events!=='object')k.events={};
  return k;
 }
 function learnIntelV123(id,meta={},s=state){const def=INTELLIGENCE_V123[id];if(!def)return {ok:false,reason:'unknown-intel'};const k=ensureKnowledgeV123(s);const prior=k.intelligence[id];k.intelligence[id]={id,learnedDay:Number(s.day)||1,learnedHour:Number(s.hoursLeft)||0,source:meta.source||def.sourceType,reliability:meta.reliability||def.reliability,verified:meta.verified??(def.sourceType==='observation'||def.sourceType==='encounter'),...prior,...meta};return {ok:true,record:k.intelligence[id]}}
 function knownIntelV123(id,s=state){return !!ensureKnowledgeV123(s).intelligence[id]}
 function evaluateCluesV123(s=state){const k=ensureKnowledgeV123(s);for(const [id,c] of Object.entries(CLUES_V123))if(c.requires.every(x=>knownIntelV123(x,s))&&!k.clues.includes(id))k.clues.push(id);return k.clues.slice()}
 function evaluateDeductionsV123(s=state){const k=ensureKnowledgeV123(s);evaluateCluesV123(s);for(const [id,d] of Object.entries(DEDUCTIONS_V123)){if(k.deductions.includes(id))continue;const ok=d.requiresAny.some(group=>group.every(x=>k.clues.includes(x)));if(ok)k.deductions.push(id)}return k.deductions.slice()}
 function resolveEventV123(id,outcome='resolved',s=state){if(!EVENTS_V123[id])return {ok:false,reason:'unknown-event'};const k=ensureKnowledgeV123(s);k.events[id]={id,outcome,day:Number(s.day)||1};return {ok:true,event:k.events[id]}}
 ensureKnowledgeV123(state);
 window.INTELLIGENCE_V123=INTELLIGENCE_V123;window.CLUES_V123=CLUES_V123;window.DEDUCTIONS_V123=DEDUCTIONS_V123;window.EVENTS_V123=EVENTS_V123;window.ensureKnowledgeV123=ensureKnowledgeV123;window.learnIntelV123=learnIntelV123;window.knownIntelV123=knownIntelV123;window.evaluateCluesV123=evaluateCluesV123;window.evaluateDeductionsV123=evaluateDeductionsV123;window.resolveEventV123=resolveEventV123;
})();