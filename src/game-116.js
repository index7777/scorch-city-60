// v14.4 Batch K — finite world stock: supplies may move, be consumed, or break, but never respawn from nothing.
(function(){
 const FINITE_KEYS_V116=['water','food','battery','medicine','fuel','parts','coolant','filters','data'];
 const ASSET_EMBEDDED_V116={water:40,drum:200,fireTank:120};
 function playerQtyV116(key,s=state){
  if(key==='water'&&s.flags?.hardFogOpeningV112&&typeof physicalWaterLitersV115==='function')return Math.max(0,Number(physicalWaterLitersV115(s))||0);
  return Math.max(0,Number(s.resources?.[key])||0);
 }
 function finiteHolderSnapshotV116(s=state){
  const holders={};
  const put=(id,key,value)=>{value=Math.max(0,Number(value)||0);if(!holders[id])holders[id]={};holders[id][key]=value};
  for(const key of FINITE_KEYS_V116)put('player',key,playerQtyV116(key,s));
  for(const [id,loc] of Object.entries(s.locations||{}))for(const key of FINITE_KEYS_V116)put(`location:${id}`,key,loc?.remaining?.[key]||0);
  for(const [id,npc] of Object.entries(s.npcs||{}))for(const key of FINITE_KEYS_V116)put(`npc:${id}`,key,npc?.stock?.[key]||0);
  for(const [id,settlement] of Object.entries(s.settlements||{})){put(`settlement:${id}`,'water',settlement?.water||0);put(`settlement:${id}`,'food',settlement?.food||0)}
  for(const [id,assetState] of Object.entries(s.assets||{})){
   if(assetState?.transported)continue;
   const def=typeof assetDefs!=='undefined'?assetDefs.find(a=>a.id===id):null;
   const qty=def?ASSET_EMBEDDED_V116[def.effect]:0;if(qty)put(`asset:${id}`,'water',qty);
  }
  return holders;
 }
 function totalsFromHoldersV116(holders){const totals={};for(const key of FINITE_KEYS_V116)totals[key]=0;for(const bag of Object.values(holders||{}))for(const [key,value] of Object.entries(bag||{}))totals[key]=(totals[key]||0)+(Number(value)||0);for(const key of Object.keys(totals))totals[key]=Math.round(totals[key]*1000)/1000;return totals}
 function captureFiniteStockV116(s=state){const holders=finiteHolderSnapshotV116(s);return {holders,totals:totalsFromHoldersV116(holders)}}
 function ensureFiniteStockV116(s=state){
  s.finiteStockV116=s.finiteStockV116&&typeof s.finiteStockV116==='object'?s.finiteStockV116:{};
  const f=s.finiteStockV116;if(!Number.isFinite(Number(f.lastDay)))f.lastDay=Number(s.day)||1;
  if(!f.snapshot||!f.snapshot.holders)f.snapshot=captureFiniteStockV116(s);
  f.blockedRespawns=Math.max(0,Number(f.blockedRespawns)||0);f.lastViolation=f.lastViolation||null;return f;
 }
 function reduceHolderV116(holderId,key,amount,s=state){
  let left=Math.max(0,Number(amount)||0);if(left<=1e-9)return 0;
  const take=(obj,prop)=>{if(!obj)return;const have=Math.max(0,Number(obj[prop])||0),cut=Math.min(have,left);obj[prop]=Math.max(0,Math.round((have-cut)*1000)/1000);left-=cut};
  if(holderId==='player'){
   if(key==='water'&&s.flags?.hardFogOpeningV112&&typeof consumeBackpackWaterV115==='function'){
    const backpack=Math.max(0,Number(typeof backpackWaterLitersV115==='function'?backpackWaterLitersV115(s):0)||0),cut=Math.min(backpack,left);if(cut>0){consumeBackpackWaterV115(cut,s);left-=cut}
    if(left>1e-9&&s.resources)take(s.resources,key);
   }else if(s.resources)take(s.resources,key);
  }else if(holderId.startsWith('location:')){const id=holderId.slice(9);take(s.locations?.[id]?.remaining,key)}
  else if(holderId.startsWith('npc:')){const id=holderId.slice(4);take(s.npcs?.[id]?.stock,key)}
  else if(holderId.startsWith('settlement:')){const id=holderId.slice(11);take(s.settlements?.[id],key)}
  return Math.max(0,amount-left);
 }
 function enforceNoRespawnV116(s=state){
  const f=ensureFiniteStockV116(s),day=Number(s.day)||1,current=captureFiniteStockV116(s);
  if(day===Number(f.lastDay)){f.snapshot=current;return {ok:true,blocked:{}}}
  const previous=f.snapshot||captureFiniteStockV116(s),blocked={};
  for(const key of FINITE_KEYS_V116){
   let excess=Math.max(0,(current.totals[key]||0)-(previous.totals?.[key]||0));if(excess<=1e-6)continue;
   const positive=[];for(const [holderId,bag] of Object.entries(current.holders)){const now=bag?.[key]||0,before=previous.holders?.[holderId]?.[key]||0,delta=now-before;if(delta>1e-6)positive.push([holderId,delta])}
   for(const [holderId,delta] of positive){if(excess<=1e-6)break;const removed=reduceHolderV116(holderId,key,Math.min(delta,excess),s);excess=Math.max(0,excess-removed)}
   if(excess>1e-6)reduceHolderV116('player',key,excess,s);
   blocked[key]=Math.round(((current.totals[key]||0)-(previous.totals?.[key]||0))*1000)/1000;
  }
  if(Object.keys(blocked).length){f.blockedRespawns+=1;f.lastViolation={day,blocked};}
  f.lastDay=day;f.snapshot=captureFiniteStockV116(s);return {ok:!Object.keys(blocked).length,blocked};
 }
 function syncFiniteStockV116(s=state){const f=ensureFiniteStockV116(s);f.lastDay=Number(s.day)||1;f.snapshot=captureFiniteStockV116(s);return f.snapshot}
 function finiteStockAuditV116(s=state){const f=ensureFiniteStockV116(s),now=captureFiniteStockV116(s),delta={};for(const key of FINITE_KEYS_V116)delta[key]=Math.round(((now.totals[key]||0)-(f.snapshot?.totals?.[key]||0))*1000)/1000;return {day:Number(s.day)||1,lastDay:Number(f.lastDay)||1,totals:now.totals,delta,blockedRespawns:f.blockedRespawns,lastViolation:f.lastViolation}}
 const originalMakeStateV116=makeState;makeState=function(){const s=originalMakeStateV116();ensureFiniteStockV116(s);return s};
 if(typeof mergeSave==='function'){const originalMergeSaveV116=mergeSave;mergeSave=function(data){const out=originalMergeSaveV116(data);ensureFiniteStockV116(state);syncFiniteStockV116(state);return out}}
 ensureFiniteStockV116(state);
 const originalRenderV116=render;render=function(){enforceNoRespawnV116(state);return originalRenderV116()};
 window.FINITE_KEYS_V116=FINITE_KEYS_V116;
 window.ensureFiniteStockV116=ensureFiniteStockV116;
 window.captureFiniteStockV116=captureFiniteStockV116;
 window.syncFiniteStockV116=syncFiniteStockV116;
 window.enforceNoRespawnV116=enforceNoRespawnV116;
 window.finiteStockAuditV116=finiteStockAuditV116;
})();
