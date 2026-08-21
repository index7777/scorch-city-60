function showExpeditionResult(result){
 state.expedition.lastResult=result;state.expedition.history=state.expedition.history||[];state.expedition.history.unshift(result);state.expedition.history=state.expedition.history.slice(0,20);
 const loc=locations.find(l=>l.id===result.location),modeName=result.mode==='vehicle'?'工程車':result.mode==='cart'?'推車':'徒手';
 const deltaHtml=Object.entries(result.resourceDelta||{}).filter(([,v])=>v!==0).map(([k,v])=>`<div class="result-resource ${v>0?'gain':'loss'}"><span>${RES_LABELS[k]||k}</span><b>${v>0?'+':''}${v}</b></div>`).join('')||'<div class="result-empty">沒有物資變化</div>';
 const gains=Object.entries(result.gain||{}).map(([k,v])=>`<span class="result-chip gain">${RES_LABELS[k]||k} +${v}</span>`).join('')||'<span class="result-chip muted">沒有帶回小型物資</span>';
 const changes=(result.worldChanges||[]).map(x=>`<li>${x}</li>`).join('')||'<li>沒有新的城市狀態變化</li>';
 const notes=(result.notes||[]).map(x=>`<li>${x}</li>`).join('')||'<li>行程符合原定計畫</li>';
 const outcome=result.retreated?'撤退完成':'遠征完成';
 const tone=result.retreated?'retreat':'success';
 $('resultTitle').textContent=`${outcome} · ${loc?.name||'未知區域'}`;
 $('resultKicker').textContent=result.retreated?'TACTICAL WITHDRAWAL':'EXPEDITION REPORT';
 $('resultBody').innerHTML=`<div class="result-hero ${tone}"><div><span>${result.retreated?'保住人員與主要裝備':'物資已回到基地庫存'}</span><h3>${loc?.name||''}</h3><p>${modeName} · ${result.routeMode==='safe'?'低熱路線':'最快路線'} · Day ${result.day}</p></div><div class="result-score"><b>${result.cargo||0}</b><span>kg 回收</span></div></div>
 <div class="result-compare"><div><span>預估時間</span><b>${result.estimatedTime}h</b></div><div><span>實際時間</span><b class="${result.actualTime>result.estimatedTime?'warn':''}">${result.actualTime}h</b></div><div><span>預估冷卻</span><b>${result.estimatedBattery||0} kWh</b></div><div><span>實際冷卻</span><b>${result.actualBattery||0} kWh</b></div><div><span>預估燃料</span><b>${result.estimatedFuel||0} L</b></div><div><span>實際燃料</span><b>${result.actualFuel||0} L</b></div></div>
 <div class="result-grid"><section><h3>帶回物資</h3><div class="result-chips">${gains}${result.movedAsset?`<span class="result-chip asset">◆ ${result.movedAsset}</span>`:''}</div><h3>基地庫存淨變化</h3><div class="result-resource-grid">${deltaHtml}</div></section><section><h3>行動代價</h3><div class="result-costs"><div><span>飲水</span><b>-${result.waterUsed||0} L</b></div><div><span>電池</span><b>-${result.actualBattery||0} kWh</b></div><div><span>燃料</span><b>-${result.actualFuel||0} L</b></div><div><span>車況</span><b>${result.vehicleDelta?`${result.vehicleDelta}%`:'0%'}</b></div></div><h3>途中紀錄</h3><ul class="result-list">${notes}</ul></section></div>
 <div class="result-world"><h3>城市狀態更新</h3><ul class="result-list">${changes}</ul></div>`;
 if(!$('expeditionResultDialog').open)$('expeditionResultDialog').showModal();
}
function retreatExpedition(p){
 const before=snapshotExpeditionState(),e=p.estimate,mode=p.mode;let t=Math.max(.3,Math.round(e.total*.38*10)/10);const waterUsed=Math.max(.2,Math.round(e.waterNeed*.35*10)/10),batteryUsed=state.day>=30?Math.max(1,Math.ceil(e.batteryNeed*.35)):0,fuelUsed=mode==='vehicle'?Math.max(1,Math.ceil(e.fuelNeed*.4)):0;
 if(state.day<30)state.hoursLeft=Math.max(0,Math.round((state.hoursLeft-t)*10)/10);state.resources.water=Math.max(0,state.resources.water-waterUsed);if(state.day>=30)state.resources.battery=Math.max(0,state.resources.battery-batteryUsed);if(mode==='vehicle')state.resources.fuel=Math.max(0,state.resources.fuel-fuelUsed);state.expedition.count++;state.expedition.retreats++;state.expedition.last={day:state.day,location:p.locId,mode,time:t,cargo:0,priority:p.priority,retreated:true};state.expedition.pending=null;log(`你中止了前往${locations.find(l=>l.id===p.locId).name}的遠征。沒有帶回物資，但保住了人員與主要裝備。`,'major');render();checkState();
 const result={day:state.day,location:p.locId,mode,routeMode:state.mapPlanner?.routeMode||'fastest',retreated:true,cargo:0,gain:{},movedAsset:'',estimatedTime:e.total,actualTime:t,estimatedBattery:e.batteryNeed||0,actualBattery:batteryUsed,estimatedFuel:e.fuelNeed||0,actualFuel:fuelUsed,waterUsed,vehicleDelta:0,resourceDelta:resourceDelta(before.resources,state.resources),worldChanges:expeditionWorldChanges(before,p.locId),notes:['你主動中止行程，避免把局面推進到不可逆失敗。','未回收小型物資或大型設備。']};showExpeditionResult(result);saveGame(false)
}
