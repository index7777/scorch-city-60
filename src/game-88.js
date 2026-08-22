// v14.3 resident-perspective redesign, P0 settlement contact gate.
// A searched/scouted place may show traces, but settlement trade and group identity require actual contact.
(function(){
 function residentSettlementContactsV88(locationId){
  const ids=Array.isArray(state.knowledge?.contacts)?state.knowledge.contacts:[];
  return ids.map(id=>({id,n:state.npcs?.[id]})).filter(x=>x.n&&x.n.alive&&x.n.location===locationId);
 }
 function settlementContactedResidentV88(s){return !!(s&&residentSettlementContactsV88(s.location).length)}
 if(typeof settlementContactedV79==='function')settlementContactedV79=settlementContactedResidentV88;

 let renderingV88=false;
 function residentSettlementLabelV88(s,knownPlace){
  const loc=typeof mapLoc==='function'?mapLoc(s.location):null;
  if(knownPlace&&loc)return `你在「${loc.name}」遇到的人們`;
  return '你接觸過的人們';
 }
 function renderResidentSettlementsV88(){
  if(renderingV88)return;
  const content=document.getElementById('settlementContent');if(!content)return;
  renderingV88=true;
  try{
   const rows=[];
   for(const [id,s] of Object.entries(state.settlements||{})){
    const searched=!!state.locations?.[s.location]?.searched;
    const scouted=!!state.knowledge?.scoutedLocations?.[s.location];
    const knownPlace=searched||scouted;
    const contacts=residentSettlementContactsV88(s.location);
    if(!knownPlace&&!contacts.length)continue;
    if(!contacts.length){
     const loc=typeof mapLoc==='function'?mapLoc(s.location):null;
     const heading=loc&&knownPlace?`你稱之為「${loc.name}」的區域`:'你偵察過的區域';
     rows.push(`<article class="resident-settlement"><h3>${heading}</h3><div class="resident-info-line"><span class="source-label observed">親眼</span><span>你到過這裡，但沒有真正接觸到任何群體。</span></div><div class="resident-info-line"><span class="source-label rumor">推測</span><span>有些痕跡像是近期有人活動；人數、身份與庫存都還不知道。</span></div></article>`);
     continue;
    }
    const highTrust=contacts.some(x=>(x.n.trust||0)>=65)||(s.trust||0)>=65;
    const label=residentSettlementLabelV88(s,knownPlace);
    let body=`<div class="resident-info-line"><span class="source-label observed">親眼</span><span>已接觸：${contacts.map(x=>x.n.name).join('、')}。</span></div>`;
    if(highTrust){
     body+=`<div class="resident-info-line"><span class="source-label rumor">對方說</span><span>對方說這裡大約有 ${Math.max(0,Math.round(s.population||0))} 人；這不是你逐一清點的數字。</span></div>`;
     body+=`<div class="resident-info-line"><span class="source-label rumor">對方說</span><span>對方提到目前大約有水 ${Math.max(0,Math.round(s.water||0))} L、食物 ${Math.max(0,Math.round(s.food||0))}；庫存仍可能變動。</span></div>`;
    }else{
     body+=`<div class="resident-info-line"><span class="source-label rumor">對方說</span><span>${contacts[0].n.name} 說附近還有其他人活動，但你沒有親自確認人數。</span></div>`;
    }
    body+=`<button type="button" class="mini secondary settlement-trade-v79" data-settlement-trade-v79="${id}">發起交易 · 0.5h</button>`;
    rows.push(`<article class="resident-settlement"><h3>${label}</h3>${body}</article>`);
   }
   content.innerHTML=rows.length?`<div class="resident-settlement-list">${rows.join('')}</div>`:'<div class="resident-unknown-note">你還沒有接觸任何群體。城市裡是否還有其他人、在哪裡、有多少人，目前都不知道。</div>';
   content.querySelectorAll('[data-settlement-trade-v79]').forEach(b=>{b.onclick=()=>openSettlementTradeV79(b.dataset.settlementTradeV79)});
  }finally{renderingV88=false}
 }

 const originalOpenSettlementsV88=openSettlements;
 openSettlements=function(){const out=originalOpenSettlementsV88();renderResidentSettlementsV88();return out};

 if(typeof openSettlementTradeV79==='function'){
  const originalSettlementTradeV88=openSettlementTradeV79;
  openSettlementTradeV79=function(id){
   const s=state.settlements?.[id];
   if(!settlementContactedResidentV88(s))return toast('你還沒有真正接觸這群人');
   const out=originalSettlementTradeV88(id);
   const label=residentSettlementLabelV88(s,!!state.locations?.[s.location]?.searched||!!state.knowledge?.scoutedLocations?.[s.location]);
   const title=document.getElementById('tradeTitle');if(title)title.textContent=`${label} · 交易`;
   const content=document.getElementById('tradeContent');
   if(content&&s?.name)content.querySelectorAll('*').forEach(el=>{if(el.children.length===0&&el.textContent.includes(s.name))el.textContent=el.textContent.replaceAll(s.name,label)});
   return out;
  };
 }

 const dialog=document.getElementById('settlementDialog');
 if(dialog){
  new MutationObserver(()=>{if(dialog.open&&!renderingV88)queueMicrotask(renderResidentSettlementsV88)}).observe(dialog,{attributes:true,attributeFilter:['open'],childList:true,subtree:true});
 }
})();