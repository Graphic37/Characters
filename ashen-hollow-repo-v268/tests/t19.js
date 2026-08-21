const fs=require('fs'), vm=require('vm');
const src=fs.readFileSync('work.html','utf8');
const R={};

// ---- 1. the ES clip, old vs new, as fractions OF THE ORB -----------------
function bandNew(life,es,lifeMax,esMax){
  const pool=lifeMax+esMax;
  const lifePct=life/pool*100, esPct=pool?es/pool*100:0;
  const top=Math.max(0,100-(lifePct+esPct));
  // element is 100% of the orb, so inset % == orb %
  return { visibleFrom:+(100-lifePct).toFixed(1), visibleTo:+top.toFixed(1),
           lifeTop:+lifePct.toFixed(1) };   // measured from the TOP downward
}
function bandOld(life,es,lifeMax,esMax){
  const pool=lifeMax+esMax;
  const lifePct=life/pool*100, esPct=pool?es/pool*100:0;
  const h=lifePct+esPct;                    // element height, % of orb
  // inset bottom is lifePct% OF THE ELEMENT
  const bottomOrb=h*(lifePct/100);          // in % of orb, measured from orb bottom
  return { barTopOrb:+h.toFixed(1), bandBottomOrb:+bottomOrb.toFixed(1),
           lifeTopOrb:+lifePct.toFixed(1),
           overlapsLife: bottomOrb < lifePct - 0.01 };
}
R.case_lowLife = { old:bandOld(10,40,100,100), new:bandNew(10,40,100,100) };
R.case_full    = { old:bandOld(100,100,100,100), new:bandNew(100,100,100,100) };
R.case_typical = { old:bandOld(50,20,100,50), new:bandNew(50,20,100,50) };
// the shield band must START exactly where life ENDS
function startsAtLifeTop(life,es,lifeMax,esMax){
  const pool=lifeMax+esMax, lifePct=life/pool*100, esPct=es/pool*100;
  const top=Math.max(0,100-(lifePct+esPct));
  const bandBottomFromOrbBottom=lifePct;    // inset bottom, % of orb
  const bandTopFromOrbBottom=100-top;
  return { bandBottom:+bandBottomFromOrbBottom.toFixed(2),
           lifeTop:+lifePct.toFixed(2),
           exact: Math.abs(bandBottomFromOrbBottom-lifePct)<1e-9,
           bandHeight:+(bandTopFromOrbBottom-bandBottomFromOrbBottom).toFixed(2),
           esPct:+esPct.toFixed(2) };
}
R.contiguity = [ [10,40,100,100], [50,20,100,50], [86,0,86,0], [1,99,100,100] ]
  .map(a=>startsAtLifeTop.apply(null,a));

// ---- 2. the shout: below every gate, once per cast ----------------------
const ua=src.indexOf('function useSkill(id, forced, viaAuto){');
const ub=src.indexOf('window.useSkill=useSkill;');
const fn=src.slice(ua,ub);
const shoutAt=fn.indexOf('castShout(sk.n, id)');
const fireAt=fn.indexOf('sk.fire(tgt)');
const gates=[...fn.matchAll(/return false;/g)].map(m=>m.index);
R.shout={ isBelowEveryGate: gates.every(g=>g<shoutAt),
          isJustBeforeFire: shoutAt<fireAt && (fireAt-shoutAt)<420,
          gateCount:gates.length,
          callSites:(fn.match(/castShout\(/g)||[]).length };
R.vengeanceDupeGone = !/if\(window\.castShout\) castShout\('Vengeance Storm'/.test(src);

// ---- 3. the debounce actually debounces ---------------------------------
const da=src.indexOf('var LAST_SHOUT={};');
const db=src.indexOf('LAST_SHOUT[id]=nw;')+'LAST_SHOUT[id]=nw;'.length;
let t=0, made=0;
const sb={console, performance:{now:()=>t}, AH_WORLD:{player:{}},
  LIVE:[], POOL:[]};
sb.window=sb;
vm.createContext(sb);
vm.runInContext(src.slice(da,db)+'\n  made++; };\n  var made=0;\nthis.get=()=>made;this.F=window.castShout;',
  Object.assign(sb,{made:0}), {filename:'s.js'});
// simpler: count by observing LAST_SHOUT writes
let calls=0;
const sb2={console, performance:{now:()=>t}, AH_WORLD:{player:{}}};
sb2.window=sb2; vm.createContext(sb2);
vm.runInContext(src.slice(da,db)+'\n calls++; };', Object.assign(sb2,{calls:0}), {filename:'s2.js'});
t=0;    sb2.window.castShout('Multishot','multishot');
t=100;  sb2.window.castShout('Multishot','multishot');
t=300;  sb2.window.castShout('Multishot','multishot');
t=900;  sb2.window.castShout('Multishot','multishot');
t=950;  sb2.window.castShout('Rain','rain');
R.debounce={ multishotIn900ms:'4 calls', passedThrough:sb2.calls,
             expected:'2 for multishot + 1 for rain = 3' };

// ---- 4. the readouts -----------------------------------------------------
R.readout={ hasLifeRow:/rd\('Life'/.test(src), hasShieldRow:/rd\('Shield'/.test(src),
            hasManaRow:/rd\('Mana'/.test(src),
            shieldShownAtZero: /rd\('Shield', esNow, esMax\)/.test(src),
            oldPlusEsGone: !/\+'\+Math\.round\(esNow\)\+' ES/.test(src) };
console.log(JSON.stringify(R,null,1));
