// v14.3 resident-perspective redesign, P1 vehicle panel.
// Present mobility as the resident's own available transport and practical limits without changing expedition mechanics.
(function(){
 const VEHICLE_CATALOG_V93=[
  {id:'foot',name:'徒步',speed:'慢',load:'低',daylight:'很低',ac:'無',fuel:'不需要',hint:'一直可用'},
  {id:'cart',name:'手推車',speed:'慢',load:'中',daylight:'很低',ac:'無',fuel:'不需要',hint:'留意可推行的載具、倉儲工具或可修復的小型搬運設備'},
  {id:'car',name:'汽車',speed:'快',load:'中',daylight:'中',ac:'視車況',fuel:'需要',hint:'留意道路旁、停車區與有維修能力的地點'},
  {id:'truck',name:'卡車',speed:'中',load:'高',daylight:'中',ac:'視車況',fuel:'高',hint:'留意工業、物流與大型倉儲相關地點'}
 ];
 function ownedVehicleIdsV93(){
  const owned=new Set(['foot']);
  const candidates=[state.vehicles,state.vehicle,state.transport,state.transports];
  for(const src of candidates){
   if(!src)continue;
   if(typeof src==='string')owned.add(src);
   if(Array.isArray(src))for(const v of src){if(typeof v==='string')owned.add(v);else if(v&&typeof v==='object'&&(v.owned!==false))owned.add(String(v.id||v.type||v.name||''))}
   if(src&&typeof src==='object'&&!Array.isArray(src))for(const [k,v] of Object.entries(src)){if(v===true||(v&&typeof v==='object'&&v.owned!==false))owned.add(String(v?.id||v?.type||k))}
  }
  if(state.cart===true||state.hasCart===true)owned.add('cart');
  if(state.car===true||state.hasCar===true)owned.add('car');
  if(state.truck===true||state.hasTruck===true)owned.add('truck');
  return owned;
 }
 function vehicleFuelTextV93(v,owned){
  if(!owned||v.id==='foot'||v.id==='cart')return v.fuel;
  const fuel=Number(state.resources?.fuel??state.inventory?.fuel??state.fuel);
  return Number.isFinite(fuel)?`${v.fuel} · 你目前記錄 ${fuel.toFixed(1)}`:v.fuel;
 }
 function renderVehiclePanelV93(){
  const content=document.getElementById('vehicleContent');if(!content)return;
  const owned=ownedVehicleIdsV93();
  content.innerHTML=`<section><p class="muted">這裡只整理你自己能使用，或已經知道該怎麼尋找的移動方式。速度、載重與耐白晝能力是出發前要權衡的條件。</p><div class="card-list">${VEHICLE_CATALOG_V93.map(v=>{
   const have=owned.has(v.id)||owned.has(v.name);
   return `<div class="card"><b>${v.name}</b><div>${have?'目前可用':'尚未取得'}</div><div class="meta-grid"><div><span>速度</span><b>${v.speed}</b></div><div><span>載重</span><b>${v.load}</b></div><div><span>白晝耐受</span><b>${v.daylight}</b></div><div><span>冷氣</span><b>${v.ac}</b></div><div><span>燃料</span><b>${vehicleFuelTextV93(v,have)}</b></div></div>${have?'':'<div class="muted">尋找方法：'+v.hint+'</div>'}</div>`;
  }).join('')}</div><p class="muted">這個面板目前只整理已知運輸條件，不會替你標出尚未偵察的車輛位置，也不會直接解鎖任何載具。</p></section>`;
 }
 function installVehicleUiV93(){
  const deck=document.querySelector('.command-deck');
  if(deck&&!document.getElementById('vehicleBtn')){
   const btn=document.createElement('button');btn.id='vehicleBtn';btn.className='command-card';btn.innerHTML='<span>你的載具</span><small>速度、載重、冷氣與燃料</small>';deck.appendChild(btn);
  }
  if(!document.getElementById('vehicleDialog')){
   const dlg=document.createElement('dialog');dlg.id='vehicleDialog';dlg.innerHTML='<div class="dialog-body wide"><button type="button" class="close" data-close-dialog="vehicleDialog" aria-label="關閉">×</button><h2>你的載具</h2><div id="vehicleContent"></div></div>';document.body.appendChild(dlg);
  }
  const btn=document.getElementById('vehicleBtn'),dlg=document.getElementById('vehicleDialog');
  if(btn&&!btn.dataset.boundV93){btn.dataset.boundV93='1';btn.addEventListener('click',()=>{renderVehiclePanelV93();if(dlg&&!dlg.open)dlg.showModal()})}
  const close=dlg?.querySelector('[data-close-dialog="vehicleDialog"]');if(close&&!close.dataset.boundV93){close.dataset.boundV93='1';close.addEventListener('click',()=>dlg.close())}
 }
 const originalRenderV93=render;
 render=function(){const out=originalRenderV93();installVehicleUiV93();if(document.getElementById('vehicleDialog')?.open)renderVehiclePanelV93();return out};
 installVehicleUiV93();
})();
