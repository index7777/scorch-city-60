/* v14.2.2 QA — large-asset condition / derating / repairs / commissioning */
const ASSET_REPAIR_V60={
 fieldCap:70,
 stationTarget:100,
 coreMin:60,
 commissioningMin:72
};
function ensureAssetConditionV60(){
 for(const a of assetDefs){const st=state.assets?.[a.id];if(!st)continue;const q=Number(st.condition);st.condition=clamp(Number.isFinite(q)?q:100,0,100);st.repairLog=Array.isArray(st.repairLog)?st.repairLog:[]}
 return state.assets
}
function assetConditionV60(id){ensureAssetConditionV60();return clamp(+state.assets?.[id]?.condition||0,0,100)}
function assetConditionLabelV60(q){return q>=90?'良好':q>=72?'可運轉':q>=55?'降額':q>=30?'不穩定':'停機'}
function assetOutputFactorV60(id){const q=assetConditionV60(id);if(q<30)return 0;if(q<50)return .45+(q-30)/20*.27;if(q<72)return .72+(q-50)/22*.20;if(q<90)return .92+(q-72)/18*.08;return 1}
function transportedAssetV60(id){return !!state.assets?.[id]?.transported}
function installedAssetIdsV60(kind){
 if(kind==='compressor'){const n=Math.max(0,+state.installed?.compressors||0);return ['compressorA','compressorB'].filter(transportedAssetV60).slice(0,n)}
 const map={generator:'generator',chiller:'chiller',pump:'pump',inverter:'inverter',lift:'lift'},id=map[kind];return id&&state.installed?.[kind]&&transportedAssetV60(id)?[id]:[]
}
function installedAssetFactorV60(kind){const ids=installedAssetIdsV60(kind);if(!ids.length)return state.installed?.[kind]||kind==='compressor'&&state.installed?.compressors?1:0;return ids.reduce((a,id)=>a+assetOutputFactorV60(id),0)/ids.length}
function coolingTrainFactorV60(){
 if((state.base?.ventilation||0)<2)return 1;
 const factors=[];const comps=installedAssetIdsV60('compressor');if(comps.length)factors.push(comps.reduce((a,id)=>a+assetOutputFactorV60(id),0)/comps.length);if(state.installed?.pump)factors.push(installedAssetFactorV60('pump'));if(state.base?.core&&state.installed?.chiller)factors.push(installedAssetFactorV60('chiller'));
 return factors.length?clamp(Math.min(...factors),0,1):1
}

/* Generator and inverter condition now derate real grid output. */
const _centralGridBaseComponentsV60=centralGridBaseComponentsV34;
centralGridBaseComponentsV34=function(){
 const c=_centralGridBaseComponentsV60();let solarKW=c.solarKW,generatorMaxKW=c.generatorMaxKW;
 if(c.generatorInstalled)generatorMaxKW*=installedAssetFactorV60('generator');
 if(state.installed?.inverter&&solarKW>0)solarKW*=installedAssetFactorV60('inverter');
 return {...c,solarKW,generatorMaxKW,nonGeneratorKW:c.baseKW+solarKW}
};

/* Real safe population is additionally limited by the installed cooling train. */
const _centralSafeCapacityV60=centralSafeCapacityV36;
centralSafeCapacityV36=function(){const base=_centralSafeCapacityV60();if((state.base?.ventilation||0)<2)return base;return Math.floor(base*coolingTrainFactorV60())};

function criticalAssetIssuesV60(stageId){
 const issues=[],need=(id,min=ASSET_REPAIR_V60.coreMin)=>{if(transportedAssetV60(id)&&assetConditionV60(id)<min)issues.push(`${assetDefs.find(a=>a.id===id)?.name||id} 狀況 ${assetConditionV60(id).toFixed(0)}%，至少需要 ${min}%`)};
 if(['detach','loop','pressure','stability'].includes(stageId)){for(const id of installedAssetIdsV60('compressor'))need(id,stageId==='pressure'||stageId==='stability'?ASSET_REPAIR_V60.commissioningMin:ASSET_REPAIR_V60.coreMin)}
 if(['detach','lift'].includes(stageId))need('lift',ASSET_REPAIR_V60.coreMin);
 if(['power','pressure','stability'].includes(stageId)){need('generator',stageId==='pressure'||stageId==='stability'?ASSET_REPAIR_V60.commissioningMin:ASSET_REPAIR_V60.coreMin);need('inverter',stageId==='pressure'||stageId==='stability'?ASSET_REPAIR_V60.commissioningMin:ASSET_REPAIR_V60.coreMin)}
 if(['loop','pressure','stability'].includes(stageId)){need('pump',stageId==='pressure'||stageId==='stability'?ASSET_REPAIR_V60.commissioningMin:ASSET_REPAIR_V60.coreMin);need('chiller',stageId==='pressure'||stageId==='stability'?ASSET_REPAIR_V60.commissioningMin:ASSET_REPAIR_V60.coreMin)}
 return [...new Set(issues)]
}
for(const st of coreStages){const old=st.req;st.req=(()=>{const fn=old,id=st.id;return ()=>fn()&&criticalAssetIssuesV60(id).length===0})()}
const _coreReqTextV60=coreReqText;
coreReqText=function(stage){const base=_coreReqTextV60(stage),assetIssues=criticalAssetIssuesV60(stage.id);return [base,...assetIssues].filter(Boolean).join('、')};

function assetRepairCostV60(id,target=100,field=false){const q=assetConditionV60(id),gain=Math.max(0,target-q),a=assetDefs.find(x=>x.id===id),weight=a?.weight||200;const parts=Math.max(1,Math.ceil(gain/18+weight/650*(field?.6:1)));const hours=Math.max(.2,Math.round((gain/35+weight/900*(field?.35:.75))*20)/20);return {gain,parts,hours,target}}
function fieldRepairAssetV60(id){
 const t=ensureFieldTeamV43(),c=ensureDynamicCargoV52();if(!t.active||!c.assets.includes(id))return toast('現場應急修復只能處理目前外勤車上的大型設備');const q=assetConditionV60(id);if(q>=ASSET_REPAIR_V60.fieldCap)return toast(`現場應急修復最多恢復到 ${ASSET_REPAIR_V60.fieldCap}%`);const r=assetRepairCostV60(id,ASSET_REPAIR_V60.fieldCap,true);if((state.resources.parts||0)<r.parts)return toast(`現場應急修復需要 ${r.parts} 零件`);state.resources.parts-=r.parts;if(!spendWorldTimeV26(r.hours,{label:`應急修復${assetDefs.find(a=>a.id===id)?.name||id}`})){state.resources.parts+=r.parts;return}const before=q;state.assets[id].condition=clamp(q+r.gain,0,r.target);state.assets[id].repairLog.push({day:state.day,type:'field',before,after:state.assets[id].condition,parts:r.parts,hours:r.hours});log(`${assetDefs.find(a=>a.id===id)?.name||id}完成現場應急修復：${before.toFixed(0)}% → ${state.assets[id].condition.toFixed(0)}%，消耗 ${r.parts} 零件。`,'good');render();saveGame(false)
}
function stationRepairAssetV60(id){
 const t=ensureFieldTeamV43(),st=state.assets?.[id];if(t.active)return toast('外勤隊尚未返站，不能進行中央站正式整修');if(!st?.transported)return toast('大型設備必須先運回中央站');const q=assetConditionV60(id);if(q>=99.5)return toast('設備目前不需要正式整修');const r=assetRepairCostV60(id,ASSET_REPAIR_V60.stationTarget,false);if((state.resources.parts||0)<r.parts)return toast(`正式整修需要 ${r.parts} 零件`);state.resources.parts-=r.parts;if(!spendWorldTimeV26(r.hours,{label:`正式整修${assetDefs.find(a=>a.id===id)?.name||id}`})){state.resources.parts+=r.parts;return}const before=q;st.condition=100;st.repairLog.push({day:state.day,type:'station',before,after:100,parts:r.parts,hours:r.hours});log(`${assetDefs.find(a=>a.id===id)?.name||id}完成中央站正式整修：${before.toFixed(0)}% → 100%，消耗 ${r.parts} 零件。`,'good');render();saveGame(false)
}

/* Deterministic operating wear: damaged machines deteriorate faster under live load; no random failures. */
function tickAssetWearV60(hours){
 hours=Math.max(0,+hours||0);if(hours<=0||!hasReachedVentV23())return;const wear=(id,load=.01)=>{if(!transportedAssetV60(id))return;const q=assetConditionV60(id),stress=1+(1-q/100)*2.4;state.assets[id].condition=clamp(q-hours*load*stress,0,100)};
 if(state.powerOps?.lastDispatch?.generatorKW>0)wear('generator',.018);if(state.gear?.solar&&state.installed?.inverter)wear('inverter',.006);
 if((state.base?.ventilation||0)>=2){for(const id of installedAssetIdsV60('compressor'))wear(id,.014);if(state.installed?.pump)wear('pump',.012);if(state.installed?.chiller)wear('chiller',.011)}
 if(state.coreProject?.active&&['detach','lift','haul'].includes(coreStage()?.id||''))wear('lift',.009)
}
const _processSourceSliceV60=processSourceSliceV34;
processSourceSliceV34=function(sourceId,hours){const r=_processSourceSliceV60(sourceId,hours);if(sourceId==='centralGrid')tickAssetWearV60(hours);return r};

function largeAssetMaintenanceHtmlV60(){
 ensureAssetConditionV60();const t=ensureFieldTeamV43(),cargo=t.active?ensureDynamicCargoV52():null,rows=assetDefs.filter(a=>state.assets?.[a.id]?.discovered||state.assets?.[a.id]?.transported).map(a=>{const st=state.assets[a.id],q=assetConditionV60(a.id),field=!!(t.active&&cargo?.assets?.includes(a.id)&&q<ASSET_REPAIR_V60.fieldCap),station=!!(!t.active&&st.transported&&q<99.5),r=station?assetRepairCostV60(a.id):field?assetRepairCostV60(a.id,ASSET_REPAIR_V60.fieldCap,true):null;return `<div class="asset-maint-row ${q<55?'critical':q<72?'warn':''}"><div><b>${a.name}</b><small>${assetConditionLabelV60(q)} · 輸出 ${(assetOutputFactorV60(a.id)*100).toFixed(0)}% · 狀況 ${q.toFixed(0)}%</small></div><div class="asset-maint-actions">${field?`<button class="mini" data-field-asset-repair="${a.id}">應急修復 · ${r.parts} 零件 / ${r.hours.toFixed(2)}h</button>`:''}${station?`<button class="mini secondary" data-station-asset-repair="${a.id}">正式整修 · ${r.parts} 零件 / ${r.hours.toFixed(2)}h</button>`:''}${!field&&!station?'<span>—</span>':''}</div></div>`}).join('')||'<p class="muted">尚未掌握大型設備。</p>';
 return `<section class="asset-maint-card"><div class="source-load-head"><div><span>ASSET CONDITION</span><h3>大型設備檢修／驗收</h3></div><b>${assetDefs.filter(a=>state.assets?.[a.id]?.transported).length} 台已返站</b></div><p class="muted">低於 72% 會開始明顯降額；低於 60% 不能投入部分核心工程，壓力測試與 72 小時驗收要求關鍵設備至少 72%。現場應急修復最高只能恢復到 70%。</p><div class="asset-maint-list">${rows}</div></section>`
}
const _openInventoryV60=openInventory;
openInventory=function(){_openInventoryV60();const host=$('inventoryContent');if(!host)return;host.insertAdjacentHTML('beforeend',largeAssetMaintenanceHtmlV60());host.querySelectorAll('[data-field-asset-repair]').forEach(b=>b.onclick=()=>fieldRepairAssetV60(b.dataset.fieldAssetRepair));host.querySelectorAll('[data-station-asset-repair]').forEach(b=>b.onclick=()=>stationRepairAssetV60(b.dataset.stationAssetRepair))};

const _renderBaseV60=renderBase;
renderBase=function(){_renderBaseV60();const host=$('baseStats');if(!host)return;const critical=['generator','pump','chiller','compressorA','compressorB'].filter(id=>transportedAssetV60(id));if(!critical.length)return;const avg=critical.reduce((a,id)=>a+assetConditionV60(id),0)/critical.length;host.insertAdjacentHTML('beforeend',`<div class="resource-row ${avg<60?'bad':''}"><span>關鍵大型設備平均狀況</span><b>${avg.toFixed(0)}%</b></div>`)};
ensureAssetConditionV60();
