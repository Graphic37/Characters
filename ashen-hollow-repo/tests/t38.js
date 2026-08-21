// PLUMBING: does flat damage from gear and runes reach real skill damage?
const fs=require('fs'), vm=require('vm');
const src=fs.readFileSync('work.html','utf8');
const R={};

// ---------- the real runeTotals, slot-aware ------------------------------
{
  const a=src.indexOf('const RUNE_ZERO = ()');
  const b=src.indexOf('/* the magnitude table and a printable line');
  const EQ={};
  const sb={console, EQ}; sb.window=sb; vm.createContext(sb);
  vm.runInContext(src.slice(a,b)+'\nthis.F=window.runeTotals;', sb, {filename:'r.js'});
  const rune=(stat,v)=>({stat,v});
  EQ.weapon={runes:[rune('fire',30), rune('phys',17)]};
  EQ.helmet={runes:[rune('ar',52), rune('fire',9)]};
  EQ.ring1 ={runes:[rune('res',30)]};
  const t=sb.F();
  R.slotAware={
    aggregateFire:t.fire, weaponFire:t.weapon.fire, armourFire:t.armour.fire,
    weaponPhys:t.weapon.phys, armourAr:t.armour.ar, weaponAr:t.weapon.ar,
    ringCountsAsArmour:t.armour.res===30,
    aggregateStillWorks:t.fire===39 && t.ar===52 };
}

// ---------- buildStats: flat container + no double count ----------------
{
  const a=src.indexOf('function buildStats(){');
  const b=src.indexOf('function stats(){');
  const code=src.slice(a,b);
  function run(mods, runes){
    const EQ={ weapon:{ wpn:{min:40,max:60,aps:1.4,crit:5}, mods:mods||[], runes:(runes&&runes.weapon)||[] },
               helmet:{ mods:[], runes:(runes&&runes.helmet)||[] } };
    const sb={console, EQ,
      CFG:{player:{baseCrit:5, baseCritMult:150}},
      STAT_TO_FAMILY:{addphys:'phys',addfire:'fire',addcold:'cold',addlight:'light',addpois:'pois'},
      PCT_TO_FAMILY:{'phys%':'phys','fire%':'fire'},
      RUNE_TO_FAMILY:{phys:'phys',fire:'fire',cold:'cold',light:'light',pois:'pois'},
      SLOTS:[], DEF_CFG:{resCap:0.75}, S:{lvl:50},
      charStats:null, PLAYER_STATS:{} };
    sb.window=sb;
    sb.window.runeTotals=()=>{
      const z=()=>({phys:0,fire:0,cold:0,light:0,pois:0,ar:0,ev:0,es:0,res:0});
      const t=z(); t.weapon=z(); t.armour=z();
      for(const k in EQ) (EQ[k].runes||[]).forEach(r=>{
        const bkt = k==='weapon'?t.weapon:t.armour;
        t[r.stat]+=r.v; bkt[r.stat]+=r.v; });
      return t;
    };
    vm.createContext(sb);
    vm.runInContext(code+'\nthis.B=buildStats;', sb, {filename:'b.js'});
    return sb.B();
  }
  const base = run([], null);
  R.baseline = { flat: base.flat, hasFlatKey: !!base.flat };

  // addphys is weapon-local and already inside weaponAvg -> must NOT appear
  const phys = run([{stat:'addphys', a:10, b:20}], null);
  R.addphysExcluded = { flatPhys: phys.flat.phys, rangeLo: phys.range.phys.lo };

  // elemental added IS invisible to weaponAvg -> must appear
  const fire = run([{stat:'addfire', a:10, b:20}], null);
  R.addfireIncluded = { flatFire: fire.flat.fire, expected:15 };

  // runes: weapon socket counts, armour socket does not (for damage)
  const rw = run([], {weapon:[{stat:'fire',v:30}]});
  const ra = run([], {helmet:[{stat:'fire',v:30}]});
  R.runeSlotRule = { weaponSocketFire: rw.flat.fire, armourSocketFire: ra.flat.fire };

  // a PHYSICAL rune must count (weaponStats never saw it)
  const rp = run([], {weapon:[{stat:'phys',v:17}]});
  R.runePhysCounts = rp.flat.phys;

  // all five families
  const all = run([], {weapon:[{stat:'phys',v:1},{stat:'fire',v:2},{stat:'cold',v:4},
                               {stat:'light',v:8},{stat:'pois',v:16}]});
  R.allFiveFamilies = all.flat;
}

// ---------- gearFlat now returns something ------------------------------
{
  const a=src.indexOf('  function gearFlat(){');
  const b=src.indexOf('  function skillDamage(id){');
  const sb={console, stats:()=>({flat:{phys:1,fire:2,cold:4,light:8,pois:16}})};
  sb.window=sb; vm.createContext(sb);
  vm.runInContext(src.slice(a,b)+'\nthis.F=gearFlat;', sb, {filename:'gf.js'});
  R.gearFlatReadsIt = sb.F();          // 31
  const sb2={console, stats:()=>({})}; sb2.window=sb2; vm.createContext(sb2);
  vm.runInContext(src.slice(a,b)+'\nthis.F=gearFlat;', sb2, {filename:'gf2.js'});
  R.gearFlatMissingSafe = sb2.F();     // 0, no throw
}

// ---------- poison: mapped by the stat model, absent from the affix pool -
{
  const a=src.indexOf('const PREFIXES='), b=src.indexOf('const SUFFIXES=[');
  const pool=src.slice(a,b);
  R.poisonAudit = {
    mappedInStatModel: /addpois:'pois'/.test(src),
    familyInFlat: /pois:0/.test(src),
    affixExists: pool.includes("{id:'addpois'"),
    onlySourceIsRunes: !pool.includes("{id:'addpois'") };
}
console.log(JSON.stringify(R,null,1));
