/* v14.2.2 QA — physical field-spare conservation for large-asset repairs */
function fieldRepairSpareNeedsV61(id){
 const a=assetDefs.find(x=>x.id===id),q=assetConditionV60(id),gain=Math.max(0,ASSET_REPAIR_V60.fieldCap-q),need={repairPack:Math.max(1,Math.ceil(gain/28))};
 if(['compressor','chiller','pump'].includes(a?.effect))need.sealKit=1;
 if(['power','inverter'].includes(a?.effect)||id==='generator')need.fuseKit=1;
 return need
}
function fieldRepairSpareTextV61(id){return Object.entries(fieldRepairSpareNeedsV61(id)).map(([k,n])=>`${FIELD_SPARE_DEFS_V50[k]?.label||k} ×${n}`).join('、')}
function fieldRepairSpareOkV61(id){const load=fieldSpareLoadV50(),need=fieldRepairSpareNeedsV61(id);return Object.entries(need).every(([k,n])=>(load[k]||0)>=n)}
function consumeFieldRepairSparesV61(id){const load=fieldSpareLoadV50(),need=fieldRepairSpareNeedsV61(id);for(const [k,n] of Object.entries(need))load[k]=Math.max(0,(load[k]||0)-n);return need}
fieldRepairAssetV60=function(id){
 const t=ensureFieldTeamV43(),c=ensureDynamicCargoV52();if(!t.active||!c.assets.includes(id))return toast('現場應急修復只能處理目前外勤車上的大型設備');const q=assetConditionV60(id);if(q>=ASSET_REPAIR_V60.fieldCap)return toast(`現場應急修復最多恢復到 ${ASSET_REPAIR_V60.fieldCap}%`);if(!fieldRepairSpareOkV61(id))return toast(`隊伍缺少應急修復備件：${fieldRepairSpareTextV61(id)}`);const r=assetRepairCostV60(id,ASSET_REPAIR_V60.fieldCap,true);if(!spendWorldTimeV26(r.hours,{label:`應急修復${assetDefs.find(a=>a.id===id)?.name||id}`}))return;const before=q,used=consumeFieldRepairSparesV61(id);state.assets[id].condition=clamp(q+r.gain,0,r.target);state.assets[id].repairLog.push({day:state.day,type:'field',before,after:state.assets[id].condition,spares:used,hours:r.hours});log(`${assetDefs.find(a=>a.id===id)?.name||id}完成現場應急修復：${before.toFixed(0)}% → ${state.assets[id].condition.toFixed(0)}%；耗用 ${fieldRepairSpareTextV61(id)}。`,'good');render();saveGame(false)
};

/* Ventilation expansion cannot commission a severely damaged compressor or circulation pump. */
const _vent2DefV61=craftDefs.find(x=>x.id==='vent2');
if(_vent2DefV61){const old=_vent2DefV61.cond;_vent2DefV61.cond=()=>{if(!old())return false;const comps=installedAssetIdsV60('compressor');if(!comps.length||comps.some(id=>assetConditionV60(id)<55))return false;if(state.installed?.pump&&assetConditionV60('pump')<55)return false;return true}}

largeAssetMaintenanceHtmlV60=function(){
 ensureAssetConditionV60();const t=ensureFieldTeamV43(),cargo=t.active?ensureDynamicCargoV52():null,rows=assetDefs.filter(a=>state.assets?.[a.id]?.discovered||state.assets?.[a.id]?.transported).map(a=>{const st=state.assets[a.id],q=assetConditionV60(a.id),field=!!(t.active&&cargo?.assets?.includes(a.id)&&q<ASSET_REPAIR_V60.fieldCap),station=!!(!t.active&&st.transported&&q<99.5),r=station?assetRepairCostV60(a.id):field?assetRepairCostV60(a.id,ASSET_REPAIR_V60.fieldCap,true):null,spareOk=field?fieldRepairSpareOkV61(a.id):true;return `<div class="asset-maint-row ${q<55?'critical':q<72?'warn':''}"><div><b>${a.name}</b><small>${assetConditionLabelV60(q)} · 輸出 ${(assetOutputFactorV60(a.id)*100).toFixed(0)}% · 狀況 ${q.toFixed(0)}%</small></div><div class="asset-maint-actions">${field?`<button class="mini" data-field-asset-repair="${a.id}" ${spareOk?'': 'disabled'}>應急修復 · ${r.hours.toFixed(2)}h · ${fieldRepairSpareTextV61(a.id)}</button>`:''}${station?`<button class="mini secondary" data-station-asset-repair="${a.id}">正式整修 · ${r.parts} 零件 / ${r.hours.toFixed(2)}h</button>`:''}${!field&&!station?'<span>—</span>':''}</div></div>`}).join('')||'<p class="muted">尚未掌握大型設備。</p>';
 return `<section class="asset-maint-card"><div class="source-load-head"><div><span>ASSET CONDITION</span><h3>大型設備檢修／驗收</h3></div><b>${assetDefs.filter(a=>state.assets?.[a.id]?.transported).length} 台已返站</b></div><p class="muted">低於 72% 會開始明顯降額；低於 60% 不能投入部分核心工程，壓力測試與 72 小時驗收要求關鍵設備至少 72%。現場應急修復最高恢復到 70%，且只消耗隊伍實際攜帶的外勤備件。</p><div class="asset-maint-list">${rows}</div></section>`
};
