// v14.3 resident-perspective redesign, P1 personal electricity panel.
// Electricity is presented as the resident's own tool-energy budget, not a city-wide commodity.
(function(){
 function ensureElectricityStateV91(){
  state.electricity=state.electricity&&typeof state.electricity==='object'?state.electricity:{};
  if(!Number.isFinite(Number(state.electricity.batteryKWh)))state.electricity.batteryKWh=2;
  if(!Number.isFinite(Number(state.electricity.shelterOutputKW)))state.electricity.shelterOutputKW=.25;
  if(!state.electricity.tools||typeof state.electricity.tools!=='object')state.electricity.tools={};
  return state.electricity;
 }
 function electricityToolRowsV91(){
  const e=ensureElectricityStateV91();
  const rows=Object.entries(e.tools||{}).map(([id,t])=>{
   t=t&&typeof t==='object'?t:{};
   const name=String(t.name||id||'未命名工具');
   const charge=Math.max(0,Math.min(100,Number(t.charge??0)));
   const draw=Math.max(0,Number(t.drawKW??t.powerKW??0));
   const runtime=draw>0?((e.batteryKWh*(charge/100))/draw):null;
   const runtimeText=Number.isFinite(Number(t.runtimeHours))?`${Number(t.runtimeHours).toFixed(1)}h`:(runtime!==null?`${runtime.toFixed(1)}h`:'—');
   const charging=t.charging?'充電中':'未充電';
   const need=draw>0?`${draw.toFixed(2)} kW`:'未記錄';
   return `<div class="card"><b>${name}</b><div class="muted">電量 ${Math.round(charge)}% · 預估可用 ${runtimeText}</div><div>狀態：${charging}</div><div>運轉需求：${need}</div></div>`;
  });
  return rows.length?rows.join(''):'<div class="muted">你目前沒有登記需要充電的工具。找到或製作電動工具後，會在這裡追蹤它自己的電量與運轉需求。</div>';
 }
 function renderElectricityV91(){
  const content=document.getElementById('electricityContent');if(!content)return;
  const e=ensureElectricityStateV91();
  const battery=Math.max(0,Number(e.batteryKWh||0));
  const output=Math.max(0,Number(e.shelterOutputKW||0));
  content.innerHTML=`<section><h3>你的電池</h3><div class="meta-grid"><div><span>目前儲能</span><b>${battery.toFixed(2)} kWh</b></div><div><span>耐熱屋輸出</span><b>${output.toFixed(2)} kW</b></div></div><p class="muted">電力只代表你能拿來充工具、驅動設備的能量；它不是城市公共庫存，也不代表外面的電網仍可用。</p><h3>需要電的工具</h3><div class="card-list">${electricityToolRowsV91()}</div></section>`;
 }
 function installElectricityUiV91(){
  const deck=document.querySelector('.command-deck');
  if(deck&&!document.getElementById('electricityBtn')){
   const btn=document.createElement('button');btn.id='electricityBtn';btn.className='command-card';btn.innerHTML='<span>你的電力</span><small>電池、充電與工具運轉</small>';deck.appendChild(btn);
  }
  if(!document.getElementById('electricityDialog')){
   const dlg=document.createElement('dialog');dlg.id='electricityDialog';dlg.innerHTML='<div class="dialog-body wide"><button type="button" class="close" data-close-dialog="electricityDialog" aria-label="關閉">×</button><h2>你的電力</h2><div id="electricityContent"></div></div>';document.body.appendChild(dlg);
  }
  const btn=document.getElementById('electricityBtn'),dlg=document.getElementById('electricityDialog');
  if(btn&&!btn.dataset.boundV91){btn.dataset.boundV91='1';btn.addEventListener('click',()=>{renderElectricityV91();if(dlg&&!dlg.open)dlg.showModal()})}
  const close=dlg?.querySelector('[data-close-dialog="electricityDialog"]');if(close&&!close.dataset.boundV91){close.dataset.boundV91='1';close.addEventListener('click',()=>dlg.close())}
 }
 const originalRenderV91=render;
 render=function(){const out=originalRenderV91();ensureElectricityStateV91();installElectricityUiV91();if(document.getElementById('electricityDialog')?.open)renderElectricityV91();return out};
 ensureElectricityStateV91();installElectricityUiV91();
})();
