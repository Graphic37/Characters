const fs = require('fs'), vm = require('vm');
const src = fs.readFileSync('work.html','utf8');

function slice(startMark, endMark, name){
  const a = src.indexOf(startMark);
  if (a < 0) throw new Error('missing start: ' + name);
  const b = src.indexOf(endMark, a);
  if (b < 0) throw new Error('missing end: ' + name);
  return src.slice(a, b + endMark.length);
}

// the real rune module, verbatim from the shipped file
const a0 = src.indexOf("/* ---- 10. runes: T5 -> T1");
const b0 = src.indexOf("/* the magnitude table and a printable line");
const runeCode = src.slice(a0, b0);
// the real applyCurrency, verbatim
const applyCode = slice("window.applyCurrency = function(target, info){", "\n};\n", 'applyCurrency');

// ---- stubs: the smallest world these functions actually touch -------------
const CONT = { inv:{id:'inv', items:[]}, st4:{id:'st4', items:[]} };
const EQ = {};
const toasts = [];
const sandbox = {
  console, CONT, EQ, UID: 1,
  S: { useItem: null },
  clamp: (v,a,b)=>Math.max(a,Math.min(b,v)),
  pick: a=>a[0],
  toast: m=>toasts.push(m),
  refreshAll: ()=>{},
  flashItem: ()=>{},
  recalcItem: ()=>{},
  itemArt: ()=>'<svg/>',
  CUR: { style:{}, innerHTML:'' },
  findContainerOf: it => { for (const k in CONT) if (CONT[k].items.indexOf(it)>=0) return CONT[k]; return null; },
  removeItem: (c,it) => { const i=c.items.indexOf(it); if(i>=0) c.items.splice(i,1); },
  addItem: (c,it) => { c.items.push(it); return true; },
  CURRENCY: [],
  markStatsDirty: ()=>{},
};
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(runeCode, sandbox, {filename:'runes.js'});
vm.runInContext(applyCode, sandbox, {filename:'apply.js'});

const R = {};
const rune = sandbox.makeRune('rn_fire', 5);
R.rune = rune.name + ' v=' + rune.v + ' kind=' + rune.kind;

// ---------- 1. socket a rune into a 2-socket item -------------------------
const gear = { uid:99, kind:'gear', name:'Test Helm', cat:'helmet',
               socketCount:2, runes:[null,null] };
CONT.inv.items.push(gear, rune);
sandbox.S.useItem = rune;
sandbox.applyCurrency(gear, {redraw:()=>{}});
R.socket0 = JSON.stringify(gear.runes[0]);
R.runeGone = CONT.inv.items.indexOf(rune) < 0;
R.armCleared = sandbox.S.useItem === null;
R.toast1 = toasts[toasts.length-1];

// ---------- 2. runeTotals sees it once equipped ---------------------------
R.totalsUnequipped = sandbox.runeTotals().fire;
EQ.helmet = gear;
R.totalsEquipped = sandbox.runeTotals().fire;

// ---------- 3. second rune goes in the SECOND socket, not the first -------
const r2 = sandbox.makeRune('rn_arm', 5);
CONT.inv.items.push(r2);
sandbox.S.useItem = r2;
sandbox.applyCurrency(gear, {redraw:()=>{}});
R.socket1 = JSON.stringify(gear.runes[1]);
R.bothFilled = !!(gear.runes[0] && gear.runes[1]);
R.totalsBoth = JSON.stringify({fire:sandbox.runeTotals().fire, ar:sandbox.runeTotals().ar});

// ---------- 4. a full item refuses, and does NOT eat the rune -------------
const r3 = sandbox.makeRune('rn_cold', 5);
CONT.inv.items.push(r3);
sandbox.S.useItem = r3;
sandbox.applyCurrency(gear, {redraw:()=>{}});
R.refusedFull = toasts[toasts.length-1];
R.r3Survived = CONT.inv.items.indexOf(r3) >= 0;

// ---------- 5. an item with no sockets refuses ---------------------------
const bare = { uid:100, kind:'gear', name:'Bare Boots', cat:'boots', socketCount:0, runes:[] };
sandbox.applyCurrency(bare, {redraw:()=>{}});
R.refusedNoSocket = toasts[toasts.length-1];
R.r3StillSurvived = CONT.inv.items.indexOf(r3) >= 0;

// ---------- 6. a rune on a non-gear target refuses -----------------------
sandbox.applyCurrency({kind:'currency', name:'orb'}, {redraw:()=>{}});
R.refusedNonGear = toasts[toasts.length-1];
sandbox.S.useItem = null;

// ---------- 7. five of a tier fuse ---------------------------------------
CONT.st4.items.length = 0;
for (let i=0;i<5;i++) sandbox.addItem(CONT.st4, sandbox.makeRune('rn_cold',5));
sandbox.combineRunes(CONT.st4);
R.afterFuse = CONT.st4.items.map(i=>i.runeType+'T'+i.tier).join(',');
// twenty-five T5 should cascade to one T3
CONT.st4.items.length = 0;
for (let i=0;i<25;i++) sandbox.addItem(CONT.st4, sandbox.makeRune('rn_es',5));
sandbox.combineRunes(CONT.st4);
R.cascade = CONT.st4.items.map(i=>'T'+i.tier).sort().join(',');

// ---------- 8. tier magnitudes ------------------------------------------
R.magnitudes = [5,4,3,2,1].map(t=>'T'+t+'='+sandbox.makeRune('rn_phys',t).v).join(' ');

console.log(JSON.stringify(R, null, 1));
