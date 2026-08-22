// v15.0 Batch 6 — source-driven intelligence discovery; no knowledge/clue UI.
(function(){
 const OBSERVED_INTEL_V124={
  homes:['I-R01','I-H01'],store:['I-R02','I-H02'],school:['I-R03'],clinic:['I-R04','I-H03'],hardware:['I-R05','I-H04'],warehouse:['I-R06','I-H05'],fire:['I-R07'],subway:['I-R08','I-H10'],industrial:['I-R09','I-H06'],coldstore:['I-R10','I-H07'],research:['I-R11'],solar:['I-R12','I-H09']
 };
 const STOCK_INTEL_V124={homes:'I-S01',store:'I-S02',clinic:'I-S03',hardware:'I-S04',warehouse:'I-S05'};
 const PEOPLE_INTEL_V124={homes:'I-P01',clinic:'I-P02',hardware:'I-P03',warehouse:'I-P04',store:'I-P05',fire:'I-P06',school:'I-P07',coldstore:'I-P08',research:'I-P09',industrial:'I-P10'};
 const TESTIMONY_V124={
  'npc-xu-peizhen':{'supplies':{id:'I-S09',reliability:'low'}},
  'npc-lin-yuxuan':{'supplies':{id:'I-S08',reliability:'medium'}}
 };
 const DOCUMENTS_V124={
  store:[{id:'store-delivery-note',name:'送貨便條',intel:'I-S06'}],
  warehouse:[{id:'warehouse-move-log',name:'搬運紀錄',intel:'I-S07'}],
  industrial:[{id:'industrial-maintenance-log',name:'維護紀錄',intel:'I-C01'}],
  coldstore:[{id:'coldstore-service-slip',name:'冷卻服務單',intel:'I-C02'}],
  research:[{id:'research-old-record',name:'舊研究紀錄',intel:'I-H08'},{id:'research-number-sheet',name:'設備編號紀錄',intel:'I-C04'}],
  school:[{id:'school-service-sketch',name:'手繪維修圖',intel:'I-C06'}]
 };
 function ensureDiscoveryV124(s=state){
  if(typeof ensureKnowledgeV123==='function')ensureKnowledgeV123(s);
  s.discoveryV124=s.discoveryV124&&typeof s.discoveryV124==='object'?s.discoveryV124:{};
  if(!s.discoveryV124.documents||typeof s.discoveryV124.documents!=='object')s.discoveryV124.documents={};
  return s.discoveryV124;
 }
 function learnV124(id,meta,s=state){if(!id||typeof learnIntelV123!=='function')return false;const before=typeof knownIntelV123==='function'&&knownIntelV123(id,s);const r=learnIntelV123(id,meta,s);return !!(r.ok&&!before)}
 function currentV124(){return typeof ensureExplorationV113==='function'?ensureExplorationV113().current:'base'}
 function observedV124(loc=currentV124(),s=state){return s.explorationV118?.observed?.[loc]===true}
 function syncObservedV124(s=state){
  const loc=currentV124();if(!observedV124(loc,s))return 0;let learned=0;
  for(const id of OBSERVED_INTEL_V124[loc]||[])if(learnV124(id,{source:'observation',verified:true},s))learned++;
  const searched=(s.sceneInteractionsV119?.locations?.[loc]||[]).some(o=>o?.searched===true);
  if(searched&&STOCK_INTEL_V124[loc]&&learnV124(STOCK_INTEL_V124[loc],{source:'observation',verified:true},s))learned++;
  const hasEncounter=(Object.values(s.coreNpcV121?.people||{})).some(n=>n?.alive&&n.encountered&&n.location===loc);
  if(hasEncounter&&PEOPLE_INTEL_V124[loc]&&learnV124(PEOPLE_INTEL_V124[loc],{source:'encounter',verified:true},s))learned++;
  return learned;
 }
 function syncTestimonyV124(s=state){
  let learned=0;for(const [npcId,kinds] of Object.entries(TESTIMONY_V124)){
   const p=s.socialV122?.people?.[npcId];if(!p||!Array.isArray(p.talked))continue;
   for(const [kind,def] of Object.entries(kinds)){
    const topics=(window.DIALOGUE_TOPICS_V122?.[npcId]||[]);const topic=topics.find(t=>t.kind===kind);if(topic&&p.talked.includes(topic.id)&&learnV124(def.id,{source:'testimony',reliability:def.reliability,verified:false,npcId},s))learned++;
   }
  }return learned;
 }
 function syncDiscoveryV124(s=state){const n=syncObservedV124(s)+syncTestimonyV124(s);if(n&&typeof evaluateDeductionsV123==='function')evaluateDeductionsV123(s);return n}
 function docStateV124(id,s=state){const d=ensureDiscoveryV124(s);if(!d.documents[id])d.documents[id]={read:false};return d.documents[id]}
 function findDocV124(id){for(const [location,list] of Object.entries(DOCUMENTS_V124)){const doc=list.find(x=>x.id===id);if(doc)return {...doc,location}}return null}
 function spendDocumentTimeV124(h=.25){if(state.day>=30)return true;if(!Number.isFinite(state.hoursLeft)||state.hoursLeft+1e-9<h){toast(`目前沒有足夠時間；需要 ${h}h`);return false}state.hoursLeft=Math.max(0,Math.round((state.hoursLeft-h)*100)/100);return true}
 function inspectDocumentV124(id){
  const doc=findDocV124(id);if(!doc||doc.location!==currentV124()||!observedV124(doc.location))return {ok:false,reason:'你現在看不到這份文件'};
  const ds=docStateV124(id);if(ds.read)return {ok:true,already:true};if(!spendDocumentTimeV124(.25))return {ok:false,reason:'時間不足'};
  ds.read=true;learnV124(doc.intel,{source:'document',reliability:INTELLIGENCE_V123?.[doc.intel]?.reliability||'medium',verified:false,documentId:id});if(typeof evaluateDeductionsV123==='function')evaluateDeductionsV123();log(`你讀過了${doc.name}。`,'good');render();return {ok:true,intel:doc.intel};
 }
 function renderDocumentsV124(){
  if(!state.flags?.hardFogOpeningV112)return;const map=document.getElementById('map');if(!map)return;map.querySelector('.documents-v124')?.remove();const loc=currentV124();if(!observedV124(loc))return;const docs=DOCUMENTS_V124[loc]||[];if(!docs.length)return;
  const p=document.createElement('section');p.className='documents-v124';p.setAttribute('aria-label','現場文件');p.innerHTML=`<div class="documents-head-v124"><b>現場文件</b></div>${docs.map(d=>{const read=docStateV124(d.id).read;return `<article class="document-v124 ${read?'read':''}"><div><b>${d.name}</b><small>${read?'已讀':'你在現場看見的文件'}</small></div>${read?'':`<button type="button" data-doc-v124="${d.id}">查看 · 0.25h</button>`}</article>`}).join('')}`;map.appendChild(p);p.querySelectorAll('[data-doc-v124]').forEach(b=>b.onclick=()=>inspectDocumentV124(b.dataset.docV124));
 }
 function installStylesV124(){if(document.getElementById('batch6SourceStylesV124'))return;const st=document.createElement('style');st.id='batch6SourceStylesV124';st.textContent=`.documents-v124{position:absolute;left:18px;top:18px;z-index:13;width:min(300px,36%);display:grid;gap:7px;padding:10px;border:1px solid rgba(180,210,210,.2);border-radius:11px;background:rgba(10,18,20,.94)}.documents-head-v124{font-size:.78rem;opacity:.76}.document-v124{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px;border:1px solid rgba(180,210,210,.12);border-radius:8px}.document-v124>div{display:grid;gap:2px}.document-v124 small{opacity:.68;font-size:.74rem}.document-v124.read{opacity:.62}@media(max-width:900px){.documents-v124{position:relative;left:auto;top:auto;width:auto;margin:12px}}`;document.head.appendChild(st)}
 const prevRenderMapV124=renderMap;renderMap=function(){const out=prevRenderMapV124();installStylesV124();queueMicrotask(()=>{syncDiscoveryV124();renderDocumentsV124()});return out};
 const prevRenderV124=render;render=function(){const out=prevRenderV124();installStylesV124();queueMicrotask(()=>{syncDiscoveryV124();renderDocumentsV124()});return out};
 ensureDiscoveryV124();installStylesV124();
 window.OBSERVED_INTEL_V124=OBSERVED_INTEL_V124;window.DOCUMENTS_V124=DOCUMENTS_V124;window.ensureDiscoveryV124=ensureDiscoveryV124;window.syncDiscoveryV124=syncDiscoveryV124;window.inspectDocumentV124=inspectDocumentV124;window.renderDocumentsV124=renderDocumentsV124;
})();