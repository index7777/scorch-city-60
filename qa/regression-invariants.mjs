import fs from 'node:fs';

const read = p => fs.readFileSync(p, 'utf8');
const modules = fs.readdirSync('src').filter(n => /^game-\d{2,}\.js$/.test(n)).sort((a,b)=>Number(a.match(/\d+/)[0])-Number(b.match(/\d+/)[0]));
const src = modules.map(n => read(`src/${n}`)).join('\n');
const failures = [];
const pass = [];

function expect(name, ok, detail='') {
  if (ok) pass.push(name);
  else failures.push(`${name}${detail ? ` — ${detail}` : ''}`);
}
function hasAll(...parts) { return parts.every(x => src.includes(x)); }

// B1 — disabled itinerary start must expose an explicit reason, including negative buffer.
expect('B1 itinerary disabled reason', hasAll('itineraryStartReasonV71','時間超支','aria-describedby="itineraryStartReasonV71"'));
expect('B1 disabled button state', /id="itineraryStart"[\s\S]{0,240}disabled/.test(src));

// B2 — late delegated capture handler survives planner re-renders.
expect('B2 itinerary delegated click handler', /document\.addEventListener\('click',[\s\S]{0,700}#itineraryStart[\s\S]{0,700},true\)/.test(src));
expect('B2 start handler calls itinerary runner', hasAll('itineraryStartStateV71','startOrResumeItineraryV27()'));

// B3 — quick search is disabled and execution-guarded when period time is insufficient.
expect('B3 quick-search time state', hasAll('quickSearchTimeStateV71','b.disabled=!ok','快速搜索需'));
expect('B3 script/keyboard execution guard', /searchLocation=function\(loc\)[\s\S]{0,500}quickSearchTimeStateV71\(loc\)[\s\S]{0,500}return toast/.test(src));

// B4 — a deferred brief must not reopen merely because another modal closes.
expect('B4 daily brief deferred guard', hasAll('ensureBriefQueueV73','if(q.deferred)return','do not reopen after trade/encounter closes'));

// B6 — unknown locations reveal only scout affordance; later cleanup strips leaked controls.
expect('B6 fog unknown node presentation', hasAll('? 未知區域','派人偵察 · 0.5h','偵察後才會解鎖'));
expect('B6 unknown itinerary action is scout-only', /if\(!locationKnownV68\(id\)\)return \[\['scout'/.test(src));
expect('B6 modal leak cleanup', hasAll('clearLocationTransientV82','Unknown nodes must never inherit known-location search affordances'));

// X26 — quick search is intentionally narrower than full planned search.
expect('X26 public quick-search loot table', hasAll('PUBLIC_LOOT_V68','publicLootKeysV68'));
expect('X26 quick/full differentiated recovery', hasAll("recoveryPoolV69(loc.id,'quick')","recoveryPoolV69(loc.id,'full')"));
expect('X26 special progression requires full search', hasAll('applySearchSpecialV68=function(loc,full){if(!full)return'));

// X25 — same-location daily cooldown + steep revisit decay + early burn.
expect('X25 same-day search lock', hasAll('searchAvailableV69','lastSearchDay','今天已搜索過'));
expect('X25 revisit decay', /mode==='quick'\?\[\.65,\.32,\.16,\.08\]:\[1,\.45,\.22,\.10\]/.test(src));
expect('X25 early water/food overhead', hasAll('前期高耗：每日額外 +2L 水、+1 食物','dailyWaterNeed=function()','dailyFoodNeed=function()'));

// X23 — risk can worsen immediately but same-day recovery cannot spend a decay token.
expect('X23 day-locked risk inertia', hasAll('syncRiskTrendV83','lastSyncDay','Within one day, worsening conditions may raise risk immediately'));
expect('X23 one-step daily recovery', /f\.display=Math\.max\(raw,f\.display-1\)/.test(src));

// X24 — Day 1–3 visibly expose at least a precursor.
expect('X24 early pressure precursor', hasAll('城市短波出現供水前兆','state.day<=3'));

// X27 — every direct NPC social session spends world time.
expect('X27 NPC contact time', hasAll("spendSocialTimeV79(.5,'NPC 接觸')","spendSocialTimeV79(.5,'NPC 交涉')"));
expect('X27 settlement negotiation time', hasAll("spendSocialTimeV79(.5,'聚落交易交涉')"));

// X28 — visible 0–100 relationship meter exposes actual unlock thresholds.
expect('X28 visible relation meter', hasAll('好感度 ${s}/100','relation-track-v79'));
expect('X28 actual unlock thresholds', hasAll("{score:55,label:'情報交換'","{score:65,label:'擴充交易條件'","{score:85,label:'精確庫存'"));

// X29 — high-risk searches have four physical consequence classes.
expect('X29 high-risk consequence classes', hasAll('裝備損壞','受傷','時間超支','搶走外放補給'));
expect('X29 injury blocks field deployment', hasAll('highRiskInjuredV84','fieldTeamNpcEligibleV43=function(id)','不可再次出勤'));

// X30 — contacted settlements expose a direct bilateral trade entry.
expect('X30 settlement trade entry', hasAll('發起交易 · 0.5h','openSettlementTradeV79','聚落庫存是實體有限庫存'));

// X31/X32 — canonical visible naming.
expect('X31 research naming unified', hasAll("['researchDialog','研究']","research.textContent='研究'"));
expect('X32 large asset naming unified', hasAll("replace(/大型設備/g,'大型資產')","城市物流 · 大型資產"));

// B9–B11 — one canonical risk vocabulary/source.
expect('B9-B11 canonical risk bands', hasAll('riskBandV73','平靜','警戒','緊張','危險','崩潰'));
expect('B11 brief uses canonical riskLabel', /整體風險：\$\{riskLabel\(\)\}/.test(src));

// B118 — current hard-fog exploration must select first, confirm travel second, then explore after arrival.
expect('B118 selection does not auto-travel', hasAll('data-select-v118','ensureV118().selected=id;renderMap()','data-go-v118'));
expect('B118 confirmed travel is explicit', hasAll('confirmTravelV118','goToV113(target)','>前往</button>'));
expect('B118 arrival exploration is separate', hasAll('exploreCurrentV118','data-explore-v118','探索 · 1h','ex.observed[base.current]=true'));
expect('B118 unknown neighbors stay anonymous', hasAll("label=`${directionV118(current,id)}方`","detail='遠處可見輪廓'","目前只能確認道路與遠處輪廓"));
expect('B118 discovered art uses existing thumbnails', hasAll('assets/districts/thumbnails/${key}.webp','base:\'base\'','store:\'store\'','vent:\'vent\''));
expect('B118 legacy route/endgame surfaces are suppressed', hasAll("'mapTools'","'mapPlannerPanel'","'coreProjectBtn'","'coreProjectDialog'","'actionCenterBtn'","'actionCenterDialog'"));
expect('B118 HUD current day has no denominator', hasAll("day.textContent=`Day ${state.day}`"));

for (const name of pass) console.log(`PASS ${name}`);
if (failures.length) {
  for (const msg of failures) console.error(`FAIL ${msg}`);
  console.error(`\n${failures.length} regression invariant(s) failed.`);
  process.exit(1);
}
console.log(`\nOK: ${pass.length} player-feedback regression invariants passed across ${modules.length} game modules.`);