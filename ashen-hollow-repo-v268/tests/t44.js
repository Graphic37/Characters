// THE PREREQUISITE: does the panel's estimate match what rollDamage deals?
const fs=require('fs'), vm=require('vm');
const src=fs.readFileSync('work.html','utf8');
const R={};

// build a real `stats()` from buildStats, then run BOTH the real rollDamage
// and the real expectedHit against it.
const ba=src.indexOf('function buildStats(){'), bb=src.indexOf('function stats(){');
const ea=src.indexOf('function expectedHitParts(){');
const rdEnd=src.indexOf('return { amount:Math.max(1,Math.round(total))');
const eb=src.indexOf('\n}', rdEnd)+2;

function world(weapon, mods, runesWeapon){
  const EQ={ weapon:{ wpn:weapon, mods:mods||[], runes:runesWeapon||[] } };
  const sb={console, EQ, CFG:{player:{baseCrit:5,baseCritMult:150}},
    STAT_TO_FAMILY:{addphys:'phys',addfire:'fire',addcold:'cold',addlight:'light',addpois:'pois'},
    PCT_TO_FAMILY:{'phys%':'phys','fire%':'fire','cold%':'cold','light%':'light','pois%':'pois'},
    RUNE_TO_FAMILY:{phys:'phys',fire:'fire',cold:'cold',light:'light',pois:'pois'},
    SLOTS:[], DEF_CFG:{resCap:0.75}, S:{lvl:50}, charStats:null,
    PLAYER_STATS:{dirty:true} };
  sb.window=sb;
  sb.window.runeTotals=()=>{ const z=()=>({phys:0,fire:0,cold:0,light:0,pois:0,ar:0,ev:0,es:0,res:0});
    const t=z(); t.weapon=z(); t.armour=z();
    (runesWeapon||[]).forEach(r=>{ t[r.stat]+=r.v; t.weapon[r.stat]+=r.v; }); return t; };
  vm.createContext(sb);
  vm.runInContext(src.slice(ba,bb)+'\nfunction stats(){ return buildStats(); }\n'+
                  src.slice(ea,eb)+'\nthis.E=expectedHit; this.P=expectedHitParts; this.R=rollDamage;',
                  sb, {filename:'d.js'});
  return sb;
}
const LATE={min:62,max:96,aps:1.05,crit:5};
const ELEM=[{stat:'addfire',a:34,b:38},{stat:'addcold',a:30,b:34},{stat:'addlight',a:24,b:44}];

// ---- 1. expectedHit == the MEAN of many rollDamage rolls ----------------
{
  const w=world(LATE, ELEM);
  const N=200000; let sum=0, hits=0;
  for(let i=0;i<N;i++){
    const r=w.R(1, 1);
    if(r.miss) continue;
    // strip crit so we compare the same quantity expectedHit returns
    let t=0; for(const k in r.parts) t+=r.parts[k];
    sum+=t; hits++;
  }
  const mean=sum/hits, exp=w.E();
  R.matchesRollDamage = { expected:+exp.toFixed(2), rolledMean:+mean.toFixed(2),
    errorPct:+((Math.abs(mean-exp)/exp)*100).toFixed(3),
    agree: Math.abs(mean-exp)/exp < 0.01 };
}
// ---- 2. a % fire roll must move BOTH by the same proportion -------------
{
  const a=world(LATE, ELEM), b=world(LATE, ELEM.concat([{stat:'fire%', v:50}]));
  R.percentFireEffect = { before:+a.E().toFixed(1), after:+b.E().toFixed(1),
    gainPct:+(((b.E()/a.E())-1)*100).toFixed(2) };
  // the OLD panel model would have multiplied everything by 1.50
  const oldGain = 50;   // gearMult applied the whole 50% to the whole hit
  R.oldPanelWouldHaveSaid = oldGain+'%';
  R.divergenceRemoved = R.percentFireEffect.gainPct < 20;
}
console.log(JSON.stringify(R,null,1));
