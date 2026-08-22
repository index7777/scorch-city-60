// v14.3 resident-perspective redesign, P1 large-object panel.
// Surface only large objects the resident has actually discovered, without leaking hidden world inventory.
(function(){
 function locationKnownV92(id){
  if(!id)return true;
  if(id==='base')return true;
  const loc=state.locations?.[id];
  if(loc?.searched||loc?.scouted)return true;
  if(state.knowledge?.observedLocations?.[id])return true;
  return false;
 }
 function locationLabelV92(id){
  if(!id)return '位置未記錄';
  if(!locationKnownV92(id))return '未知區域';
  const loc=state.locations?.[id];
  return loc?.name?`你稱之為「${loc.name}」的地方`:(id==='base'?'你的耐熱屋':'已知位置');
 }
 function discoveredV92(item,locId){
  if(!item||typeof item!=='object')return false;
  if(item.discovered||item.known||item.found||item.seen||item.located||item.recovered||item.broughtHome||item.owned||item.atBase)return true;
  const loc=state.locations?.[locId];
  return !!(loc?.searched&&locationKnownV92(locId));
 }
 function normalizeLargeObjectV92(id,item,locId){
  item=item&&typeof item==='object'?item:{};
  const brought=!!(item.broughtHome||item.recovered||item.owned||item.atBase||item.location==='base'||locId==='base');
  const weight=Number(item.weightKg??item.weight??item.massKg);
  const fuel=Number(item.fuelCost??item.fuelNeeded??item.fuel);
  return {
   id:String(id||item.id||'large-object'),
   name:String(item.name||item.label||item.title||item.type||'大型物件'),
   locId:item.locationId||item.location||locId||'',
   transport:String(item.transportNeed||item.transport||item.requiredVehicle||item.vehicle||'需要能搬運大型物件的載具'),
   weight:Number.isFinite(weight)&&weight>0?`${Math.round(weight)} kg`:'尚未估清楚',
   fuel:Number.isFinite(fuel)&&fuel>0?`${fuel.toFixed(1)} 單位`:(brought?'—':'尚未估清楚'),
   risk:String(item.takeRisk||item.claimRisk||item.riskNote||(brought?'已帶回，不再暴露在外':'留在外面越久，越可能被別人先搬走')),
   brought
  };
 }
 function collectLargeObjectsV92(){
  const out=[],seen=new Set();
  const add=(id,item,locId)=>{
   if(!item||typeof item!=='object'||!discoveredV92(item,locId))return;
   const row=normalizeLargeObjectV92(id,item,locId);
   const key=`${row.id}|${row.locId}`;if(seen.has(key))return;seen.add(key);out.push(row);
  };
  const pools=[state.largeAssets,state.largeObjects,state.assets,state.logistics?.assets];
  for(const pool of pools){
   if(Array.isArray(pool))pool.forEach((item,i)=>add(item?.id||i,item,item?.locationId||item?.location));
   else if(pool&&typeof pool==='object')for(const [id,item] of Object.entries(pool))add(id,item,item?.locationId||item?.location);
  }
  for(const [locId,loc] of Object.entries(state.locations||{})){
   for(const key of ['largeAssets','largeObjects','assets']){
    const pool=loc?.[key];
    if(Array.isArray(pool))pool.forEach((item,i)=>add(item?.id||`${locId}-${i}`,item,locId));
    else if(pool&&typeof pool==='object')for(const [id,item] of Object.entries(pool))add(id,item,locId);
   }
  }
  return out;
 }
 function largeObjectRowsV92(rows){
  if(!rows.length)return '<div class="muted">你還沒有親眼確認任何大型物件。先偵察並完整搜尋地點，找到的東西才會列在這裡。</div>';
  return rows.map(row=>`<div class="card"><b>${row.name}</b><div class="muted">${locationLabelV92(row.locId)}</div><div>搬運需求：${row.transport}</div><div>估計重量：${row.weight}</div><div>預估燃料：${row.fuel}</div><div>被別人先搬走的風險：${row.risk}</div><div><b>${row.brought?'已帶回':'仍在外面'}</b></div></div>`).join('');
 }
 function renderLargeObjectsV92(){
  const content=document.getElementById('logisticsContent');if(!content)return;
  let panel=document.getElementById('residentLargeObjectsV92');
  if(!panel){panel=document.createElement('section');panel.id='residentLargeObjectsV92';content.prepend(panel)}
  const rows=collectLargeObjectsV92(),brought=rows.filter(x=>x.brought).length;
  panel.innerHTML=`<h3>大型物件清單</h3><div class="meta-grid"><div><span>已發現</span><b>${rows.length}</b></div><div><span>已帶回</span><b>${brought}</b></div><div><span>你目前能合理估計的總數</span><b>${rows.length?`至少 ${rows.length}`:'未知'}</b></div></div><p class="muted">這裡只列你已經確認過的東西，不會替你揭露城市裡還沒找到的物件。</p><div class="card-list">${largeObjectRowsV92(rows)}</div><div class="card"><b>中期搬運目標：卡車</b><div class="muted">有些物件靠徒步、手推車或一般車輛搬不動。找到能承受大型載重的卡車，會明顯改變你能帶回家的東西。</div></div>`;
  const dlg=document.getElementById('logisticsDialog');const h=dlg?.querySelector('h2');if(h&&h.textContent!=='大型物件')h.textContent='大型物件';
  const p=dlg?.querySelector('p.muted');if(p&&p.textContent!=='只整理你已經發現的大型物件、搬運需求與暴露在外的風險。')p.textContent='只整理你已經發現的大型物件、搬運需求與暴露在外的風險。';
 }
 function installLargeObjectsV92(){
  const btn=document.getElementById('cityLogistics');
  if(btn&&!btn.dataset.boundV92){btn.dataset.boundV92='1';btn.addEventListener('click',()=>setTimeout(renderLargeObjectsV92,0))}
  const dlg=document.getElementById('logisticsDialog');
  if(dlg&&!dlg.dataset.boundV92){dlg.dataset.boundV92='1';dlg.addEventListener('toggle',()=>{if(dlg.open)renderLargeObjectsV92()})}
 }
 const originalRenderV92=render;
 render=function(){const out=originalRenderV92();installLargeObjectsV92();if(document.getElementById('logisticsDialog')?.open)renderLargeObjectsV92();return out};
 installLargeObjectsV92();
})();
