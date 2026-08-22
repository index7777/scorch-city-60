const CDP='http://127.0.0.1:9222';
const APP='http://127.0.0.1:4173/';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function assert(ok,msg){if(!ok)throw new Error(msg)}
async function waitFor(fn,timeout=20000,step=100){const end=Date.now()+timeout;while(Date.now()<end){try{const v=await fn();if(v)return v}catch{}await sleep(step)}throw new Error('timeout')}
const target=await waitFor(async()=>{const r=await fetch(`${CDP}/json/list`);if(!r.ok)return null;const list=await r.json();return list.find(x=>x.type==='page'&&x.url.startsWith(APP))||list.find(x=>x.type==='page')});
assert(target?.webSocketDebuggerUrl,'no Chrome page target');
const ws=new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true})});
let seq=0;const pending=new Map();
ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id&&pending.has(m.id)){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(new Error(m.error.message)):p.resolve(m.result)}});
function send(method,params={}){return new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}))})}
async function evaluate(expression){const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw new Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text||'evaluate exception');return r.result?.value}
await send('Runtime.enable');
await waitFor(()=>evaluate(`typeof qaStateV84==='function' && typeof decorateKnowledgeSourceIconsV109==='function' && window.__SCORCH_ENTRY_ACTIVE===false`),30000);
const result=await evaluate(`(async()=>{
 window.state=qaStateV84();
 state.intel=state.intel||{};state.intel.homes={day:1,summary:'街區可能有飲水',source:'街角傳聞',confidence:62};
 render();
 const btn=document.getElementById('cityIntel');if(btn)btn.click();
 await new Promise(r=>setTimeout(r,120));
 decorateKnowledgeSourceIconsV109(document.getElementById('intelContent')||document);
 await new Promise(r=>setTimeout(r,80));
 const pick=type=>{const mark=document.querySelector('.knowledge-source-'+type);const img=mark?.querySelector('img.knowledge-source-icon-v109');return {text:mark?.textContent||'',src:img?.getAttribute('src')||'',loaded:!!img?.complete&&img.naturalWidth>0,type:mark?.dataset.sourceType||''}};
 const out={broadcast:pick('broadcast'),observed:pick('observed'),rumor:pick('rumor')};
 document.getElementById('intelDialog')?.close();
 return out;
})()`);
for(const type of ['broadcast','observed','rumor']){
 const row=result[type];assert(row.type===type,`${type} source mark was not classified`);assert(row.src===`assets/ui/source-${type}.svg`,`${type} source icon path mismatch`);assert(row.loaded,`${type} source icon asset did not load`);
}
assert(result.broadcast.text.includes('廣播')&&result.observed.text.includes('親眼')&&result.rumor.text.includes('傳聞'),'source text labels were lost while adding icons');
console.log('PASS resident formal knowledge source icons regression');
ws.close();
