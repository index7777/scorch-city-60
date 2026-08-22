// v15.0 Batch 6 — local event presentation gated by actual location observation.
(function(){
 const EVENT_COPY_V126={
  'jammed-door':['卡住的門','一扇門被熱脹變形卡死，現場留下可以處理的阻礙。'],
  'blocked-stairwell':['受阻樓梯','樓梯間被倒落物堵住，只能在現場判斷能否清開。'],
  'leaking-bottle':['漏水容器','地上有一個正在滲漏的容器，水痕仍是新的。'],
  'broken-window-heat':['破窗熱流','破窗把外部熱流直接帶進室內。'],
  'distant-knocking':['遠處敲擊聲','你在附近聽見斷續敲擊聲，來源尚未確認。'],
  'dragging-marks':['拖行痕跡','地面留下近期拖行過重物的痕跡。'],
  'fresh-footprints':['新腳印','灰塵上有還很清楚的腳印。'],
  'abandoned-bag':['遺留背包','角落有一只被丟下的背包，內容仍未知。'],
  'locked-backroom':['上鎖後室','一扇後室門仍鎖著，門後情況未知。'],
  'tripped-breaker':['跳脫開關','你看見一個已跳脫的開關，但沒有足夠資訊判斷原因。'],
  'burst-hose':['破裂軟管','一段軟管已破裂，周圍留有乾掉的水痕。'],
  'fallen-shelf':['倒塌貨架','貨架倒在通道上，遮住了後方區域。'],
  'stuck-shutter':['卡死鐵捲門','鐵捲門受熱變形，現在無法正常升起。'],
  'dead-flashlight':['失效手電筒','地上有一支沒有反應的手電筒。'],
  'overheated-phone':['過熱手機','一支手機因高熱關機，螢幕沒有反應。'],
  'spoiled-food-cache':['變質食物','一批食物已明顯受熱變質。'],
  'empty-water-case':['空水箱','只剩空瓶與紙箱，沒有可直接取用的水。'],
  'handwritten-note':['手寫便條','現場留有一張手寫便條，內容需要近看。'],
  'missing-key':['缺少鑰匙','鎖具仍在，但附近找不到對應鑰匙。'],
  'loose-vent-cover':['鬆脫護蓋','一塊通風護蓋已鬆脫，後方狀況未知。'],
  'cracked-cooler':['裂開保冷箱','保冷箱外殼已裂開，是否還有內容物未知。'],
  'injured-stranger':['受傷陌生人','你看見一名受傷的人，但還沒有更多資訊。'],
  'frightened-resident':['驚慌住戶','一名住戶保持距離觀察你，沒有主動靠近。'],
  'barter-note-on-door':['門上交換便條','門上貼著一張交換物資的便條。'],
  'noise-behind-wall':['牆後聲響','牆後傳來短暫聲響，來源不明。'],
  'smoke-smell':['煙味','空氣中有淡淡煙味，現場還看不到明火。'],
  'heat-damaged-battery':['熱損電池','一顆電池外殼有明顯熱損痕跡。'],
  'medicine-cabinet-locked':['上鎖藥櫃','藥櫃仍鎖著，裡面是否有藥品未知。'],
  'abandoned-cart':['遺棄推車','一台推車被留在通道邊。'],
  'collapsed-awning':['倒塌遮棚','遮棚倒下壓住一段通路。']
 };
 function localEventsStateV126(s=state){s.localEventsV126=s.localEventsV126&&typeof s.localEventsV126==='object'?s.localEventsV126:{};if(!s.localEventsV126.discovered||typeof s.localEventsV126.discovered!=='object')s.localEventsV126.discovered={};return s.localEventsV126}
 function currentObservedLocationV126(s=state){const loc=s.explorationV113?.current;if(!loc)return null;return s.explorationV118?.observed?.[loc]?loc:null}
 function discoverLocalEventV126(s=state){const loc=currentObservedLocationV126(s);if(!loc)return null;const le=localEventsStateV126(s);if(le.discovered[loc])return le.discovered[loc];const k=typeof ensureKnowledgeV123==='function'?ensureKnowledgeV123(s):null;if(!k)return null;const def=Object.values(EVENTS_V123||{}).find(e=>e.location===loc&&!k.events?.[e.id]);if(!def)return null;le.discovered[loc]=def.id;return def.id}
 function visibleLocalEventV126(s=state){const loc=currentObservedLocationV126(s);if(!loc)return null;const id=discoverLocalEventV126(s);if(!id)return null;const k=ensureKnowledgeV123(s);if(k.events?.[id])return null;const def=EVENTS_V123?.[id],copy=EVENT_COPY_V126[id];return def&&copy?{id,location:loc,title:copy[0],body:copy[1]}:null}
 function resolveLocalEventV126(id,outcome='handled',s=state){const current=visibleLocalEventV126(s);if(!current||current.id!==id)return {ok:false,reason:'event-not-visible'};const result=resolveEventV123(id,outcome,s);if(result.ok&&typeof render==='function')render();return result}
 function renderLocalEventV126(){if(!state.flags?.hardFogOpeningV112)return;const map=document.getElementById('map');if(!map)return;map.querySelector('.local-event-v126')?.remove();const event=visibleLocalEventV126();if(!event)return;const p=document.createElement('section');p.className='local-event-v126';p.setAttribute('aria-label','現場狀況');const title=document.createElement('b');title.textContent=event.title;const body=document.createElement('p');body.textContent=event.body;const actions=document.createElement('div');actions.className='local-event-actions-v126';const handle=document.createElement('button');handle.type='button';handle.textContent='處理';handle.onclick=()=>resolveLocalEventV126(event.id,'handled');const leave=document.createElement('button');leave.type='button';leave.textContent='先不處理';leave.onclick=()=>resolveLocalEventV126(event.id,'left');actions.append(handle,leave);p.append(title,body,actions);map.appendChild(p)}
 function stylesV126(){if(document.getElementById('localEventStylesV126'))return;const st=document.createElement('style');st.id='localEventStylesV126';st.textContent='.local-event-v126{position:absolute;right:18px;bottom:18px;z-index:14;width:min(330px,40%);display:grid;gap:7px;padding:11px;border:1px solid rgba(210,205,180,.2);border-radius:11px;background:rgba(18,17,13,.95)}.local-event-v126 p{margin:0;font-size:.82rem;line-height:1.45}.local-event-actions-v126{display:flex;gap:7px}.local-event-actions-v126 button{flex:1}@media(max-width:900px){.local-event-v126{position:relative;right:auto;bottom:auto;width:auto;margin:12px}}';document.head.appendChild(st)}
 const prevRenderMapV126=renderMap;renderMap=function(){const out=prevRenderMapV126();stylesV126();queueMicrotask(renderLocalEventV126);return out};
 const prevRenderV126=render;render=function(){const out=prevRenderV126();stylesV126();queueMicrotask(renderLocalEventV126);return out};
 stylesV126();window.EVENT_COPY_V126=EVENT_COPY_V126;window.localEventsStateV126=localEventsStateV126;window.discoverLocalEventV126=discoverLocalEventV126;window.visibleLocalEventV126=visibleLocalEventV126;window.resolveLocalEventV126=resolveLocalEventV126;window.renderLocalEventV126=renderLocalEventV126;
})();