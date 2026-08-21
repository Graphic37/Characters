// Build the affix pool the way the GAME does — base literals plus the V1
// layer's dynamic pushes — then assert the four families are complete.
// ⚠ Grepping for id:'fire%' finds nothing: the V1 layer creates them in a
// loop with id:id. A literal search reports "missing" for affixes that exist.
const fs=require('fs'), vm=require('vm');
const src=fs.readFileSync('work.html','utf8');
const R={};

// the base pools
const pa=src.indexOf('const PREFIXES='), sa=src.indexOf('const SUFFIXES=[');
const se=src.indexOf('\n];', sa)+3;
const NON_WEAPON=['helmet','body','gloves','boots','belt','ring','amulet','offhand'];
// the V1 layer's pushes
const va=src.indexOf('/* Poison is the fourth resistance family, replacing Chaos. */');
const vb=src.indexOf('function affixAllowed(af, b){');

const ARMOUR_CATS=['helmet','body','gloves','boots'];
const sb={ console, NON_WEAPON, ARMOUR_CATS, nineTiers:(a)=>a.tiers };
sb.window=sb; vm.createContext(sb);
vm.runInContext(src.slice(pa,se)+'\n'+src.slice(va,vb)+
  '\nthis.P=PREFIXES; this.S=SUFFIXES;', sb, {filename:'pool.js'});

const pre=sb.P, suf=sb.S;
const count=(pool,id)=>pool.filter(a=>a.id===id).length;
R.pieces={};
for(const [fam,res] of [['fire','fres'],['cold','cres'],['light','lres'],['pois','pres']]){
  R.pieces[fam]={ flat:count(pre,'add'+fam), pct:count(pre,fam+'%'), resist:count(suf,res) };
}
R.allExactlyOnce = Object.values(R.pieces).every(p=>p.flat===1&&p.pct===1&&p.resist===1);
R.poolSizes={ prefixes:pre.length, suffixes:suf.length };
R.slots={
  flat: [...new Set(['fire','cold','light','pois'].map(f=>JSON.stringify(pre.find(a=>a.id==='add'+f).on)))],
  pct:  [...new Set(['fire','cold','light','pois'].map(f=>JSON.stringify(pre.find(a=>a.id===f+'%').on)))],
  res:  [...new Set(['fres','cres','lres','pres'].map(r=>JSON.stringify(suf.find(a=>a.id===r).on)))]
};
R.defenceAffixes = { 'ar%':count(pre,'ar%')+count(suf,'ar%'),
                     'ev%':count(pre,'ev%')+count(suf,'ev%'),
                     'es%':count(pre,'es%')+count(suf,'es%') };
R.physical = { flat:JSON.stringify(pre.find(a=>a.id==='addphys').on),
               pct:JSON.stringify(pre.find(a=>a.id==='phys%').on),
               noResistance: !suf.find(a=>/phys/.test(a.id)) };
// % damage is locked to weapons regardless of the `on` list
R.pctLockedToWeapon = /if\(PCT_DAMAGE\.indexOf\(af\.id\)>=0\) return cat==='weapon';/.test(src);

// ---- the real fix this turn: phys% counted once, not twice --------------
{
  const a=src.indexOf('function buildStats(){'), b=src.indexOf('function stats(){');
  const code=src.slice(a,b);
  function run(mods){
    const EQ={ weapon:{ wpn:{min:40,max:60,aps:1.4,crit:5}, mods, runes:[] } };
    const s2={console, EQ, CFG:{player:{baseCrit:5,baseCritMult:150}},
      STAT_TO_FAMILY:{addphys:'phys',addfire:'fire',addcold:'cold',addlight:'light',addpois:'pois'},
      PCT_TO_FAMILY:{'phys%':'phys','fire%':'fire','cold%':'cold','light%':'light','pois%':'pois'},
      RUNE_TO_FAMILY:{phys:'phys',fire:'fire',cold:'cold',light:'light',pois:'pois'},
      SLOTS:[], DEF_CFG:{resCap:0.75}, S:{lvl:50}, charStats:null, PLAYER_STATS:{}};
    s2.window=s2; s2.window.runeTotals=null;
    vm.createContext(s2); vm.runInContext(code+'\nthis.B=buildStats;', s2, {filename:'b.js'});
    return s2.B();
  }
  R.physNotDoubled = run([{stat:'phys%', v:80}]).pct.phys;
  R.elementalCounts = run([{stat:'fire%', v:30}]).pct.fire;
}
console.log(JSON.stringify(R,null,1));
