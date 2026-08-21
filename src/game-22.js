/* v14.2.2 QA — NPC Knowledge Surface Pass
   Keep map/city information consistent with what the player has actually learned. */

function npcKnowledgeDetail(id){
 const n=state.npcs?.[id];if(!n)return null;
 const k=npcKnowledge(id);if(!k.seen)return null;
 const loc=mapLoc(n.location)?.name||'未知地點';
 if(!k.nameKnown)return {title:'未確認倖存者',detail:`${loc}｜只確認有人活動，尚未建立接觸`,level:'seen'};
 if(!k.roleKnown)return {title:npcPublicName(id),detail:`${loc}｜已知道稱呼，身份與專業仍未確認`,level:'name'};
 return {title:n.name,detail:`${loc}｜${n.role}｜${npcRelationLabel(n)}`,level:'role'};
}

function npcKnowledgeRows(){
 return Object.keys(state.npcs||{}).map(id=>({id,info:npcKnowledgeDetail(id)})).filter(x=>x.info);
}

/* Map: vague activity -> known name -> confirmed profession. */
const _npcKnowledgeBaseRenderMap=renderMap;
renderMap=function(){
 _npcKnowledgeBaseRenderMap();
 for(const [id,n] of Object.entries(state.npcs||{})){
  if(!n?.alive)continue;
  const k=npcKnowledge(id),node=document.querySelector(`.node[data-id="${n.location}"]`);if(!node)continue;
  const copy=node.querySelector('.node-copy');if(!copy)continue;
  const worldPop=copy.querySelector('.world-pop');
  if(k.seen&&!k.roleKnown&&worldPop)worldPop.textContent='◉ 有倖存者活動';
  if(!k.seen)continue;
  if(!k.roleKnown){
   const marker=document.createElement('small');marker.className='npc-contact-pin';
   marker.textContent=k.nameKnown?`● ${npcPublicName(id)} · 身份未確認`:'● 已確認有人活動';
   copy.appendChild(marker);
  }
 }
};

/* Settlements / city population screen: never enumerate unknown NPC identities. */
openSettlements=function(){
 const known=npcKnowledgeRows();
 const npcHtml=known.length?known.map(({id,info})=>{const n=state.npcs[id];const status=n.alive?'仍在活動':'已失去聯絡';return `<div class="settlement"><div class="settlement-head"><h3>${info.title}</h3><b class="${n.alive?'health-good':'health-bad'}">${status}</b></div><p>${info.detail}</p></div>`}).join(''):'<p class="muted">你尚未與任何具名倖存者建立接觸。</p>';
 const sHtml=Object.values(state.settlements).map(s=>`<div class="settlement"><div class="settlement-head"><h3>${s.name}</h3><b>${s.population} 人</b></div><p>位置：${locations.find(l=>l.id===s.location)?.name||s.location}｜水 ${Math.floor(s.water)}L｜食物 ${Math.floor(s.food)}｜狀態 <span class="${healthClass(s.health)}">${s.status}</span></p><div class="progressbar ${s.health<45?'bad':s.health<75?'warn':''}"><i style="width:${clamp(s.health,0,100)}%"></i></div></div>`).join('');
 $('settlementContent').innerHTML=`<h3>已接觸／已觀察的人員</h3>${npcHtml}<h3>已知聚落</h3>${sHtml}`;
 if(!$('settlementDialog').open)$('settlementDialog').showModal();
};

/* City intel: append contact intelligence after the existing location/road intel UI is built. */
const _npcKnowledgeBaseOpenIntel=openIntel;
openIntel=function(){
 _npcKnowledgeBaseOpenIntel();
 const host=$('intelContent');if(!host)return;
 const known=npcKnowledgeRows();
 const section=document.createElement('section');section.className='npc-intel-section';
 section.innerHTML=`<h3>人員接觸情報</h3><div class="intel-list">${known.length?known.map(({info})=>`<div class="intel-row npc-intel ${info.level}"><strong>${info.title}</strong><span>${info.detail}</span></div>`).join(''):'<p class="muted">尚未取得可確認的人員接觸情報。</p>'}</div>`;
 host.appendChild(section);
};
