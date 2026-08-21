// AUDIT: how does elemental damage actually scale in REAL combat?
const fs=require('fs'), vm=require('vm');
const src=fs.readFileSync('work.html','utf8');

// the real rollDamage + buildStats
const ba=src.indexOf('function buildStats(){'), bb=src.indexOf('function stats(){');
const ra=src.indexOf('function rollDamage(mult, targetLevel){');
const rb=src.indexOf('\n}', src.indexOf('return {amount', ra))+2;

function build(weapon, mods, runesWeapon){
  const EQ={ weapon:{ wpn:weapon, mods:mods||[], runes:(runesWeapon||[]) } };
  const sb={console, EQ, CFG:{player:{baseCrit:5,baseCritMult:150}},
    STAT_TO_FAMILY:{addphys:'phys',addfire:'fire',addcold:'cold',addlight:'light',addpois:'pois'},
    PCT_TO_FAMILY:{'phys%':'phys','fire%':'fire','cold%':'cold','light%':'light','pois%':'pois'},
    RUNE_TO_FAMILY:{phys:'phys',fire:'fire',cold:'cold',light:'light',pois:'pois'},
    SLOTS:[], DEF_CFG:{resCap:0.75}, S:{lvl:50}, charStats:null, PLAYER_STATS:{}};
  sb.window=sb;
  sb.window.runeTotals=()=>{ const z=()=>({phys:0,fire:0,cold:0,light:0,pois:0,ar:0,ev:0,es:0,res:0});
    const t=z(); t.weapon=z(); t.armour=z();
    (runesWeapon||[]).forEach(r=>{ t[r.stat]+=r.v; t.weapon[r.stat]+=r.v; }); return t; };
  vm.createContext(sb); vm.runInContext(src.slice(ba,bb)+'\nthis.B=buildStats;', sb, {filename:'b.js'});
  return sb.B();
}
// expected-value version of rollDamage, so the numbers are stable
function expected(st, mult){
  const mid=k=>(st.range[k].lo+st.range[k].hi)/2;
  return { phys:((st.min+st.max)/2 + mid('phys'))*(1+st.pct.phys/100),
           fire:mid('fire')*(1+st.pct.fire/100),
           cold:mid('cold')*(1+st.pct.cold/100),
           light:mid('light')*(1+st.pct.light/100),
           pois:mid('pois')*(1+st.pct.pois/100) };
}
const tot=p=>Object.values(p).reduce((a,b)=>a+b,0);
const W={ early:{min:11,max:22,aps:1.45,crit:5},
          mid:  {min:26,max:64,aps:1.40,crit:6},
          late: {min:62,max:96,aps:1.05,crit:5} };

console.log('=== A. FLAT elemental as weapon damage grows ===');
console.log('   (one addfire affix at the tier available then)');
[['early',W.early,5],['mid',W.mid,20],['late',W.late,36]].forEach(([n,w,f])=>{
  const base=expected(build(w,[]),1), withF=expected(build(w,[{stat:'addfire',a:f-2,b:f+2}]),1);
  console.log('   '+n.padEnd(6)+' weapon avg '+((w.min+w.max)/2).toFixed(0).padStart(3)+
    '  +'+String(f).padStart(2)+' fire  = '+tot(base).toFixed(1).padStart(6)+' -> '+
    tot(withF).toFixed(1).padStart(6)+'  (+'+(((tot(withF)/tot(base))-1)*100).toFixed(1)+'%)');
});

console.log('\n=== B. a FLAT rune (current magnitudes) as the weapon grows ===');
[['early',W.early],['mid',W.mid],['late',W.late]].forEach(([n,w])=>{
  const base=tot(expected(build(w,[]),1));
  const line=[4,9,17,30,52].map(v=>{
    const r=tot(expected(build(w,[],[{stat:'fire',v}]),1));
    return (((r/base)-1)*100).toFixed(1)+'%';
  });
  console.log('   '+n.padEnd(6)+' T5..T1 flat fire rune -> '+line.join('  '));
});

console.log('\n=== C. a % rune, with and without elemental base to scale ===');
[['no elemental base', []],
 ['1 addfire affix',  [{stat:'addfire',a:34,b:38}]],
 ['3 elemental affixes',[{stat:'addfire',a:34,b:38},{stat:'addcold',a:30,b:34},{stat:'addlight',a:24,b:44}]]
].forEach(([label,mods])=>{
  const base=tot(expected(build(W.late,mods),1));
  const line=[6,9,12,15,18].map(p=>{
    const st=build(W.late,mods); st.pct.fire+=p;
    return (((tot(expected(st,1))/base)-1)*100).toFixed(1)+'%';
  });
  console.log('   '+label.padEnd(20)+' +6..18% fire -> '+line.join('  '));
});

console.log('\n=== D. what fraction of a late-game hit is elemental at all? ===');
const mods=[{stat:'addfire',a:34,b:38},{stat:'addcold',a:30,b:34},{stat:'addlight',a:24,b:44}];
const p=expected(build(W.late,mods),1);
const T=tot(p);
Object.entries(p).forEach(([k,v])=>console.log('   '+k.padEnd(6)+(v/T*100).toFixed(1)+'%'));
