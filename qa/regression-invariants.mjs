import fs from 'node:fs';

const read = p => fs.readFileSync(p, 'utf8');
const modules = fs.readdirSync('src').filter(n => /^game-\d{2}\.js$/.test(n)).sort();
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

// B9–B11 — one canonical risk vocabulary/source.
expect('B9-B11 canonical risk bands', hasAll('riskBandV73','平靜','警戒','緊張','危險','崩潰'));
expect('B11 brief uses canonical riskLabel', /整體風險：\$\{riskLabel\(\)\}/.test(src));

for (const name of pass) console.log(`PASS ${name}`);
if (failures.length) {
  for (const msg of failures) console.error(`FAIL ${msg}`);
  console.error(`\n${failures.length} regression invariant(s) failed.`);
  process.exit(1);
}
console.log(`\nOK: ${pass.length} player-feedback regression invariants passed across ${modules.length} game modules.`);
