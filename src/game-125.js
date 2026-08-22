// v15.0 Batch 6 — player knowledge presentation, created only from actually learned records.
(function(){
 function knowledgeV125(s=state){return typeof ensureKnowledgeV123==='function'?ensureKnowledgeV123(s):null}
 function sourceLabelV125(r){const m={observation:'親眼確認',encounter:'親自遇見',document:'文件',testimony:'口述'};return m[r?.source]||'來源已記錄'}
 function reliabilityLabelV125(r){if(r?.verified)return '已確認';const m={high:'可信度高',medium:'仍待核對',low:'可信度低'};return m[r?.reliability]||'仍待核對'}
 function knownEntriesV125(s=state){const k=knowledgeV125(s);if(!k)return[];return Object.keys(k.intelligence||{}).map(id=>({id,record:k.intelligence[id],def:INTELLIGENCE_V123?.[id]})).filter(x=>x.def)}
 function renderKnowledgeV125(){
  if(!state.flags?.hardFogOpeningV112)return;const map=document.getElementById('map');if(!map)return;map.querySelector('.knowledge-v125')?.remove();
  const entries=knownEntriesV125();if(!entries.length)return;
  if(typeof evaluateDeductionsV123==='function')evaluateDeductionsV123();const k=knowledgeV125();
  const intel=entries.map(x=>`<article class="knowledge-item-v125"><p>${x.def.summary}</p><small>${sourceLabelV125(x.record)} · ${reliabilityLabelV125(x.record)}</small></article>`).join('');
  const clues=(k.clues||[]).map(id=>CLUES_V123?.[id]).filter(Boolean);const deductions=(k.deductions||[]).map(id=>DEDUCTIONS_V123?.[id]).filter(Boolean);
  const clueHtml=clues.length?`<section class="knowledge-clues-v125"><b>你已經能確定的線索</b>${clues.map(c=>`<p>${c.name}</p>`).join('')}</section>`:'';
  const deductionHtml=deductions.length?`<section class="knowledge-deductions-v125"><b>你目前能做出的推論</b>${deductions.map(d=>`<p>${d.name}</p>`).join('')}</section>`:'';
  const p=document.createElement('section');p.className='knowledge-v125';p.setAttribute('aria-label','你記下的事');p.innerHTML=`<header><b>你記下的事</b></header><div class="knowledge-list-v125">${intel}</div>${clueHtml}${deductionHtml}`;map.appendChild(p);
 }
 function stylesV125(){if(document.getElementById('knowledgeStylesV125'))return;const st=document.createElement('style');st.id='knowledgeStylesV125';st.textContent=`.knowledge-v125{position:absolute;left:18px;bottom:18px;z-index:13;width:min(360px,42%);max-height:45%;overflow:auto;display:grid;gap:9px;padding:11px;border:1px solid rgba(180,210,210,.2);border-radius:11px;background:rgba(10,18,20,.95)}.knowledge-v125 header{font-size:.78rem;opacity:.8}.knowledge-list-v125{display:grid;gap:6px}.knowledge-item-v125{padding:8px;border:1px solid rgba(180,210,210,.1);border-radius:8px}.knowledge-item-v125 p,.knowledge-clues-v125 p,.knowledge-deductions-v125 p{margin:0}.knowledge-item-v125 small{opacity:.66;font-size:.72rem}.knowledge-clues-v125,.knowledge-deductions-v125{display:grid;gap:5px;padding-top:7px;border-top:1px solid rgba(180,210,210,.12)}.knowledge-clues-v125 b,.knowledge-deductions-v125 b{font-size:.76rem;opacity:.78}.knowledge-clues-v125 p,.knowledge-deductions-v125 p{font-size:.82rem}@media(max-width:900px){.knowledge-v125{position:relative;left:auto;bottom:auto;width:auto;max-height:none;margin:12px}}`;document.head.appendChild(st)}
 const prevRenderMapV125=renderMap;renderMap=function(){const out=prevRenderMapV125();stylesV125();queueMicrotask(renderKnowledgeV125);return out};
 const prevRenderV125=render;render=function(){const out=prevRenderV125();stylesV125();queueMicrotask(renderKnowledgeV125);return out};
 stylesV125();window.knownEntriesV125=knownEntriesV125;window.renderKnowledgeV125=renderKnowledgeV125;
})();