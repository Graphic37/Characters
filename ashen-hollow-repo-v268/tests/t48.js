// SHIPPED rune curves — regression against the locked numbers
const fs=require('fs'), vm=require('vm');
const src=fs.readFileSync('work.html','utf8');
const R={};
const a=src.indexOf('const RUNE_ELEM_PCT');
const b=src.indexOf('window.runeEffect=runeEffect;');
const sb={console}; sb.window=sb; vm.createContext(sb);
// v244: runeEffect also resolves the local-% defensive runes
  const PRE='const RUNE_LOCAL_STAT={rn_arm:"ar",rn_eva:"ev",rn_es:"es"};'+
    'const RUNE_LOCAL_PCT=[0,6,9,13,17,22];const RUNE_ALLRES=[0,1,2,3,4,5];\n';
  vm.runInContext(PRE+'const RUNE_MAG=[0,4,9,17,30,52];\n'+src.slice(a,b)+
  '\nthis.F=runeEffect; this.E=RUNE_ELEM_PCT; this.I=RUNE_IRON_PCT; this.S=RUNE_ELEM_RES;', sb, {filename:'c.js'});

// ---- 1. the LOCKED numbers, by tier (not by array index) ---------------
const byTier=(fn)=>[5,4,3,2,1].map(fn);
R.elemWeapon = byTier(t=>sb.F('rn_fire',t,'weapon').v);
R.ironWeapon = byTier(t=>sb.F('rn_phys',t,'weapon').v);
R.elemArmour = byTier(t=>sb.F('rn_fire',t,'armour').v);
R.locked = { elem:JSON.stringify(R.elemWeapon)===JSON.stringify([6,10,14,19,25]),
             iron:JSON.stringify(R.ironWeapon)===JSON.stringify([5,8,12,16,21]) };
R.ironBelowElem = R.ironWeapon.every((v,i)=>v < R.elemWeapon[i]);

// ---- 2. ⚠ the indexing trap: T1 must be STRONGEST ---------------------
R.tierDirection = { T5:sb.F('rn_fire',5,'weapon').v, T1:sb.F('rn_fire',1,'weapon').v,
                    strongestIsT1: sb.F('rn_fire',1,'weapon').v > sb.F('rn_fire',5,'weapon').v };

// ---- 3. the slot decides the effect ------------------------------------
R.slotRules = {
  fireInWeapon: sb.F('rn_fire',1,'weapon'),
  fireInArmour: sb.F('rn_fire',1,'armour'),
  ironInWeapon: sb.F('rn_phys',1,'weapon'),
  ironInArmour: sb.F('rn_phys',1,'armour'),
  wallAnywhere: sb.F('rn_arm',1,'armour') };
R.ironIsWeaponOnly = R.slotRules.ironInArmour.kind==='none' && R.slotRules.ironInArmour.v===0;
R.wallUnchanged = R.slotRules.wallAnywhere.kind==='flat' && R.slotRules.wallAnywhere.v===52;
R.familiesMapped = ['rn_fire','rn_cold','rn_lght','rn_pois'].map(id=>sb.F(id,1,'armour').family);

// ---- 4. end to end through the REAL stat system -------------------------
{
  const ba=src.indexOf('function buildStats(){'), bb=src.indexOf('function stats(){');
  const ea=src.indexOf('function expectedHitParts(){');
  const rdEnd=src.indexOf('return { amount:Math.max(1,Math.round(total))');
  const eb=src.indexOf('\n}', rdEnd)+2;
  const ta=src.indexOf('const RUNE_ZERO = ()');
  const tb=src.indexOf('/* the magnitude table and a printable line');
  function run(weaponRunes, armourRunes, mods){
    const EQ={ weapon:{ wpn:{min:62,max:96,aps:1.05,crit:5}, mods:mods||[], runes:weaponRunes||[] },
               helmet:{ mods:[], runes:armourRunes||[] } };
    const sb2={console, EQ, CFG:{player:{baseCrit:5,baseCritMult:150}},
      STAT_TO_FAMILY:{addphys:'phys',addfire:'fire',addcold:'cold',addlight:'light',addpois:'pois'},
      PCT_TO_FAMILY:{'phys%':'phys','fire%':'fire','cold%':'cold','light%':'light','pois%':'pois'},
      RUNE_TO_FAMILY:{phys:'phys',fire:'fire',cold:'cold',light:'light',pois:'pois'},
      SLOTS:[], DEF_CFG:{resCap:0.75}, S:{lvl:50}, charStats:null, PLAYER_STATS:{dirty:true},
      RUNE_MAG:[0,4,9,17,30,52]};
    sb2.window=sb2;
    vm.createContext(sb2);
    vm.runInContext('const RUNE_MAG=[0,4,9,17,30,52];\n'+src.slice(a,b)+
      '\nwindow.runeEffect=runeEffect;\n'+src.slice(ta,tb)+'\n'+
      src.slice(ba,bb)+'\nfunction stats(){ return buildStats(); }\n'+src.slice(ea,eb)+
      '\nthis.S=buildStats(); this.E=expectedHit();', sb2, {filename:'f.js'});
    return { st:sb2.S, hit:sb2.E };
  }
  const rune=(type,tier)=>({runeType:type, tier, stat:'fire', v:0});
  const FIRE=[{stat:'addfire',a:34,b:38},{stat:'addfire',a:24,b:49},
              {stat:'fire%',v:58},{stat:'fire%',v:43}];
  const base=run([],[],FIRE);
  const two=run([rune('rn_fire',1), rune('rn_fire',1)],[],FIRE);
  R.endToEnd = { basePct:base.st.pct.fire, withTwoT1:two.st.pct.fire,
    addedPct:two.st.pct.fire-base.st.pct.fire,
    hitBefore:+base.hit.toFixed(0), hitAfter:+two.hit.toFixed(0),
    wholeHitGain:+(((two.hit/base.hit)-1)*100).toFixed(1) };
  // armour side
  const armour=run([], [rune('rn_fire',1), rune('rn_cold',1)], []);
  R.armourSide = { fireRes:armour.st.res.fire, coldRes:armour.st.res.cold,
                   lightRes:armour.st.res.light };
  // Iron in armour must do NOTHING
  const ironArm=run([], [{runeType:'rn_phys', tier:1, stat:'phys', v:0}], []);
  R.ironInArmourDoesNothing = ironArm.st.pct.phys===0 &&
    ironArm.st.res.fire===0 && ironArm.st.ar===0;
}
console.log(JSON.stringify(R,null,1));
