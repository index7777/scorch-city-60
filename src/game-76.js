/* v14.2.2 QA — U1-U7 P1 visual / information architecture consolidation */
const RESOURCE_ICON_PATH_V76={
 water:'M8 1C6 4 3 7 3 10a5 5 0 0 0 10 0C13 7 10 4 8 1Z',
 food:'M3 3h10v3H3zM4 7h8l-1 6H5z',
 battery:'M3 3h9v10H3zM12 6h2v4h-2zM5 5h5v6H5z',
 medicine:'M6 2h4v4h4v4h-4v4H6v-4H2V6h4z',
 fuel:'M4 2h7v12H4zM6 4h3v3H6zM11 5l2 2v5',
 parts:'M6 2h4l1 3 3 1v4l-3 1-1 3H6l-1-3-3-1V6l3-1zM8 6a2 2 0 1 0 0 4 2 2 0 0 0 0-4',
 coolant:'M8 2v12M3 5l10 6M13 5 3 11',
 filters:'M2 3h12L9 8v5l-2 1V8z',
 data:'M3 2h10v12H3zM5 5h6M5 8h6M5 11h4'
};
function iconSvgV76(key,cls=''){const p=RESOURCE_ICON_PATH_V76[key]||'M3 3h10v10H3z';return `<svg class="ui-icon-v76 ${cls}" viewBox="0 0 16 16" aria-hidden="true"><path d="${p}"/></svg>`}

/* U1 — resources use non-emoji vector icons and zero stock recedes visually. */
renderResources=function(){
 $('resources').innerHTML=Object.entries(state.resources).map(([k,v])=>{let cls='';if((k==='water'&&daysOfWater()<3)||(k==='food'&&v<dailyFoodNeed()*2))cls='bad';if((+v||0)<=0)cls+=(cls?' ':'')+'zero';return `<div class="resource-row resource-row-v76 ${cls}"><span>${iconSvgV76(k)}<em>${RES_LABELS[k]||k}</em></span><b>${Math.max(0,Math.floor(+v||0))}</b></div>`}).join('')
};

/* U2/U3 — move the existing five strategic stats into the left rail; do not duplicate state. */
function installInfoArchitectureV76(){
 const left=document.querySelector('.left-panel'),bottom=document.querySelector('.bottom-strip');if(!left||!bottom)return;
 if(!bottom.classList.contains('strategy-summary-v76')){
  const wrap=document.createElement('section');wrap.className='strategy-section-v76';wrap.innerHTML='<div class="section-head"><h2>策略摘要</h2><span class="section-tag">LIVE STATE</span></div>';
  left.insertBefore(wrap,left.querySelector('.left-utility'));wrap.appendChild(bottom);bottom.classList.add('strategy-summary-v76')
 }
 if(!document.querySelector('.timeline-strip-v76')){
  const mapShell=document.querySelector('.map-shell');if(mapShell){const t=document.createElement('div');t.className='timeline-strip-v76';t.innerHTML='<div><span>目前</span><b id="timelineNowV76">Day 1</b></div><i></i><div class="milestone"><span>臨界點</span><b>Day 30 · 100°C 永晝</b></div><i></i><div class="milestone"><span>終局</span><b>Day 60</b></div>';mapShell.insertAdjacentElement('afterend',t)}
 }
}
function renderTimelineV76(){if($('timelineNowV76'))$('timelineNowV76').textContent=`Day ${state.day} · ${state.day>=30?'永晝':state.phase==='night'?'夜晚':'白晝'}`;const t=document.querySelector('.timeline-strip-v76');if(t)t.style.setProperty('--day-progress',`${clamp((state.day-1)/59*100,0,100)}%`)}

/* U4 — the same dash no longer means two different things. */
const _openInventoryV76=openInventory;
openInventory=function(){const out=_openInventoryV76();document.querySelectorAll('#inventoryDialog .trade-item b').forEach(x=>{if(x.textContent.trim()==='—')x.textContent='未取得'});return out};
const _openLocationV76=openLocation;
openLocation=function(id){const out=_openLocationV76(id);document.querySelectorAll('#locationDialog .meta').forEach(x=>{const nodes=[...x.childNodes].filter(n=>n.nodeType===Node.TEXT_NODE);for(const n of nodes)if(n.textContent.trim()==='—')n.textContent='不適用'});return out};

/* U6 — one-shot completed engineering is separated from actionable work. */
function craftCompletedV76(id){return ({cart:!!state.gear?.cart,toolkit:!!state.gear?.toolkit,tank:!!state.gear?.waterTank,solar:!!state.gear?.solar,coolpack:!!state.gear?.coolingPack,coldSubway:state.coldStations?.includes('subway'),coldStore:state.coldStations?.includes('coldstore'),vent1:(state.base?.ventilation||0)>=1,vent2:(state.base?.ventilation||0)>=2}[id])===true}
const _openCraftV76=openCraft;
openCraft=function(){
 const out=_openCraftV76(),list=$('craftList');if(!list)return out;
 const cards=[...list.querySelectorAll('.card')],done=[];for(const card of cards){const btn=card.querySelector('[data-craft]'),id=btn?.dataset.craft;if(!id||!craftCompletedV76(id))continue;done.push(card);const status=card.querySelector('.status');if(status)status.textContent='已完成';if(btn){btn.textContent='已完成';btn.disabled=true}}
 if(done.length){const details=document.createElement('details');details.className='craft-complete-v76';details.innerHTML=`<summary>已完成工程 <b>${done.length}</b></summary><div class="card-list craft-complete-list-v76"></div>`;const box=details.querySelector('.card-list');done.forEach(c=>box.appendChild(c));list.appendChild(details)}return out
};

/* U7 — top HUD gets distinct semantic icons/classes instead of five identical numeric blocks. */
function installHudSemanticsV76(){
 const defs={day:['day','day'],phase:['phase','phase'],temp:['temp','temp'],hours:['hours','time'],daysLeft:['daysLeft','supply']};
 for(const [id,[,kind]] of Object.entries(defs)){const b=$(id),stat=b?.closest('.stat'),label=stat?.querySelector('span');if(!stat||!label)continue;stat.classList.add('hud-'+kind+'-v76');if(!label.querySelector('.ui-icon-v76')){const key=kind==='temp'?'coolant':kind==='time'?'battery':kind==='supply'?'water':kind==='day'?'data':'filters';label.insertAdjacentHTML('afterbegin',iconSvgV76(key,'hud-icon-v76'))}}
}

/* U5 + shared refresh. */
const _renderV76=render;
render=function(){const out=_renderV76();installInfoArchitectureV76();installHudSemanticsV76();renderTimelineV76();return out};
installInfoArchitectureV76();installHudSemanticsV76();renderResources();renderTimelineV76();
