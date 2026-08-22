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
await waitFor(()=>evaluate(`typeof qaStateV84==='function' && typeof decorateDisabledActionsV108==='function' && typeof openResearch==='function' && window.__SCORCH_ENTRY_ACTIVE===false`),30000);
const result=await evaluate(`(()=>{
 window.state=qaStateV84();state.resources.data=0;state.research={};
 openResearch();decorateDisabledActionsV108(document.getElementById('researchDialog'));
 const buttons=[...document.querySelectorAll('#researchDialog button:disabled')];
 const notes=buttons.map(b=>b.nextElementSibling).filter(n=>n&&n.classList.contains('disabled-reason-v108'));
 const text=notes.map(n=>n.textContent).join('｜');
 const described=buttons.every(b=>b.getAttribute('aria-describedby')&&document.getElementById(b.getAttribute('aria-describedby')));
 document.getElementById('researchDialog')?.close();
 return {disabled:buttons.length,notes:notes.length,text,described};
})()`);
assert(result.disabled>0,'fixture did not expose a disabled research action');
assert(result.notes===result.disabled,'disabled actions do not all have foreground reasons');
assert(result.text.includes('目前無法執行'),'foreground warning label missing');
assert(result.text.includes('下一步'),'recovery hint missing from disabled action warning');
assert(result.described,'disabled action warning is not linked for accessibility');
console.log('PASS resident disabled-action foreground warning regression');
ws.close();
