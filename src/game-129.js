// v15.3 Batch 7 — recurring mid-depth NPCs with encounter-gated dialogue and autonomy.
(function(){
 const RECURRING_NPCS_V129={
  'npc-zhou-boming':{name:'周博明',role:'店主',skill:'barter',home:'store',route:['store','warehouse','homes'],priority:'守住剩下的貨'},
  'npc-luo-xiaofen':{name:'羅曉芬',role:'藥局助理',skill:'medical-stock',home:'clinic',route:['clinic','store','homes'],priority:'確認還能用的藥品'},
  'npc-cai-yuren':{name:'蔡育仁',role:'學校工友',skill:'access',home:'school',route:['school','hardware','homes'],priority:'確認建物與鑰匙'},
  'npc-deng-huiwen':{name:'鄧慧雯',role:'辦公室職員',skill:'search',home:'homes',route:['homes','store','school'],priority:'找家人'},
  'npc-ma-junhao':{name:'馬俊豪',role:'倉庫理貨員',skill:'handling',home:'warehouse',route:['warehouse','hardware','industrial'],priority:'確認可搬運物資'},
  'npc-fang-lili':{name:'方莉莉',role:'廚師',skill:'food',home:'homes',route:['homes','store','warehouse'],priority:'保存能吃的食物'}
 };
 const TOPICS_V129=[
  ['status','現在狀況'],['work','你的工作'],['place','這裡'],['needs','目前需要'],['plan','接下來打算'],['supplies','手上的物資'],['recent','最近遇到什麼'],['trust','怎麼合作']
 ];
 function makeRecurringNpcV129(id,d){return {id,name:d.name,role:d.role,skill:d.skill,location:d.home,route:[...d.route],routeIndex:0,priority:d.priority,alive:true,encountered:false,energy:100,autonomyHours:0,trust:0,talked:[],lastBody:''}}
 function ensureRecurringNpcV129(s=state){
  s.recurringNpcV129=s.recurringNpcV129&&typeof s.recurringNpcV129==='object'?s.recurringNpcV129:{};
  const rs=s.recurringNpcV129;
  rs.people=rs.people&&typeof rs.people==='object'?rs.people:{};
  rs.knownIds=Array.isArray(rs.knownIds)?rs.knownIds:[];
  for(const [id,d] of Object.entries(RECURRING_NPCS_V129))if(!rs.people[id])rs.people[id]=makeRecurringNpcV129(id,d);
  return rs;
 }
 function recurringNpcV129(id,s=state){return ensureRecurringNpcV129(s).people[id]||null}
 function currentLocV129(s=state){return s.explorationV113?.current||(typeof ensureExplorationV113==='function'?ensureExplorationV113(s).current:'base')}
 function observedV129(loc,s=state){return s.explorationV118?.observed?.[loc]===true}
 function presentRecurringV129(loc=currentLocV129(),s=state){return Object.values(ensureRecurringNpcV129(s).people).filter(n=>n.alive&&n.location===loc)}
 function encounterRecurringV129(id,s=state){const n=recurringNpcV129(id,s);if(!n||!n.alive)return null;n.encountered=true;const rs=ensureRecurringNpcV129(s);if(!rs.knownIds.includes(id))rs.knownIds.push(id);return n}
 function canTalkRecurringV129(id,s=state){const n=recurringNpcV129(id,s),loc=currentLocV129(s);return !!(n&&n.alive&&n.encountered&&n.location===loc&&observedV129(loc,s))}
 function topicBodyV129(n,kind){
  const loc=typeof mapLoc==='function'?mapLoc(n.location)?.name:'';
  const bodies={
   status:`${n.name}目前還能行動，最在意的是「${n.priority}」。`,
   work:`「我是${n.role}。碰到我熟悉的事情，我會說我確定知道的部分。」`,
   place:loc?`「${loc}眼前能確認的就這些，其他地方我不替你下結論。」`:'「沒有親眼確認的地方，我不亂說。」',
   needs:`「我現在先處理${n.priority}。缺什麼，要看到實物才算數。」`,
   plan:`「下一步還是先${n.priority}，情況變了再改。」`,
   supplies:'「物資只算手上真的有的；聽說哪裡有，不代表現在還在。」',
   recent:'「最近的事情我只講自己看到的，轉述的我會另外說明。」',
   trust:'「合作先看你實際怎麼做。我不會因為一句話就把東西或命交出去。」'
  };
  return bodies[kind]||'「先把眼前能確認的事處理好。」';
 }
 function topicsForV129(id){const n=RECURRING_NPCS_V129[id];return n?TOPICS_V129.map(([kind,label],i)=>({id:`${id}-r${String(i+1).padStart(2,'0')}`,kind,label})):[]}
 function availableRecurringTopicsV129(id,s=state){const n=recurringNpcV129(id,s),all=topicsForV129(id);if(!n)return[];return all.slice(0,Math.min(all.length,3+n.talked.length))}
 function talkRecurringV129(id,topicId,s=state){
  if(!canTalkRecurringV129(id,s))return {ok:false,reason:'對方現在不在這裡'};
  const n=recurringNpcV129(id,s),topic=topicsForV129(id).find(t=>t.id===topicId);if(!topic||!availableRecurringTopicsV129(id,s).some(t=>t.id===topicId))return {ok:false,reason:'現在還談不到這件事'};
  const first=!n.talked.includes(topicId);if(first){n.talked.push(topicId);n.trust=Math.min(6,n.trust+1)}n.lastBody=topicBodyV129(n,topic.kind);return {ok:true,first,body:n.lastBody,trust:n.trust};
 }
 function advanceRecurringNpcAutonomyV129(hours=1,s=state){const h=Math.max(0,Number(hours)||0),rs=ensureRecurringNpcV129(s);for(const n of Object.values(rs.people)){if(!n.alive)continue;n.autonomyHours+=h;n.energy=Math.max(0,n.energy-h*1.5);while(n.autonomyHours>=8){n.autonomyHours-=8;n.routeIndex=(n.routeIndex+1)%n.route.length;n.location=n.route[n.routeIndex]}}return rs}
 function renderRecurringNpcV129(){
  if(!state.flags?.hardFogOpeningV112)return;const map=document.getElementById('map');if(!map)return;map.querySelector('.recurring-presence-v129')?.remove();const loc=currentLocV129();if(!observedV129(loc))return;const present=presentRecurringV129(loc);if(!present.length)return;for(const n of present)encounterRecurringV129(n.id);
  const panel=document.createElement('section');panel.className='recurring-presence-v129';panel.setAttribute('aria-label','你在這裡遇見的人');
  for(const n of present){const card=document.createElement('article');card.className='recurring-card-v129';card.dataset.recurringNpcV129=n.id;const head=document.createElement('header');const who=document.createElement('div');const b=document.createElement('b');b.textContent=n.name;const small=document.createElement('small');small.textContent=`${n.role} · ${n.trust>=4?'信任':n.trust>=2?'熟悉':'陌生'}`;who.append(b,small);head.appendChild(who);card.appendChild(head);if(n.lastBody){const p=document.createElement('p');p.className='recurring-last-v129';p.textContent=n.lastBody;card.appendChild(p)}const topics=document.createElement('div');topics.className='recurring-topics-v129';for(const t of availableRecurringTopicsV129(n.id)){const btn=document.createElement('button');btn.type='button';btn.textContent=t.label;btn.dataset.talkRecurringV129=`${n.id}|${t.id}`;topics.appendChild(btn)}card.appendChild(topics);panel.appendChild(card)}
  panel.querySelectorAll('[data-talk-recurring-v129]').forEach(btn=>btn.onclick=()=>{const [id,tid]=btn.dataset.talkRecurringV129.split('|'),r=talkRecurringV129(id,tid);if(!r.ok){if(typeof toast==='function')toast(r.reason);return}renderMap()});map.appendChild(panel)
 }
 function stylesV129(){if(document.getElementById('recurringNpcStylesV129'))return;const st=document.createElement('style');st.id='recurringNpcStylesV129';st.textContent='.recurring-presence-v129{position:absolute;left:18px;bottom:18px;z-index:14;width:min(360px,43%);max-height:calc(100% - 36px);overflow:auto;display:grid;gap:8px;padding:11px;border:1px solid rgba(190,205,185,.2);border-radius:11px;background:rgba(13,18,15,.95)}.recurring-card-v129{display:grid;gap:8px;padding:10px;border:1px solid rgba(190,205,185,.13);border-radius:9px}.recurring-card-v129 header>div{display:grid}.recurring-card-v129 small{opacity:.7;font-size:.76rem}.recurring-last-v129{margin:0;font-size:.82rem;line-height:1.45}.recurring-topics-v129{display:flex;flex-wrap:wrap;gap:6px}.recurring-topics-v129 button{font-size:.76rem}@media(max-width:900px){.recurring-presence-v129{position:relative;left:auto;bottom:auto;width:auto;max-height:none;margin:12px}}';document.head.appendChild(st)}
 const prevMakeStateV129=makeState;makeState=function(){const s=prevMakeStateV129();ensureRecurringNpcV129(s);return s};ensureRecurringNpcV129(state);
 const prevRenderMapV129=renderMap;renderMap=function(){const out=prevRenderMapV129();stylesV129();queueMicrotask(renderRecurringNpcV129);return out};
 const prevRenderV129=render;render=function(){const out=prevRenderV129();stylesV129();queueMicrotask(renderRecurringNpcV129);return out};
 if(typeof window.advanceNpcAutonomyV121==='function'){const prevAdvanceCoreV129=window.advanceNpcAutonomyV121;window.advanceNpcAutonomyV121=function(hours=1,s=state){const out=prevAdvanceCoreV129(hours,s);advanceRecurringNpcAutonomyV129(hours,s);return out}}
 stylesV129();window.RECURRING_NPCS_V129=RECURRING_NPCS_V129;window.ensureRecurringNpcV129=ensureRecurringNpcV129;window.recurringNpcV129=recurringNpcV129;window.presentRecurringV129=presentRecurringV129;window.encounterRecurringV129=encounterRecurringV129;window.canTalkRecurringV129=canTalkRecurringV129;window.availableRecurringTopicsV129=availableRecurringTopicsV129;window.talkRecurringV129=talkRecurringV129;window.advanceRecurringNpcAutonomyV129=advanceRecurringNpcAutonomyV129;window.renderRecurringNpcV129=renderRecurringNpcV129;
})();