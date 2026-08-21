// % ELEMENTAL RUNES, measured against REAL rollDamage builds, 2 weapon sockets
const fs=require('fs'), vm=require('vm');
const src=fs.readFileSync('work.html','utf8');
const ba=src.indexOf('function buildStats(){'), bb=src.indexOf('function stats(){');
const ea=src.indexOf('function expectedHitParts(){');
const rdEnd=src.indexOf('return { amount:Math.max(1,Math.round(total))');
const eb=src.indexOf('\n}', rdEnd)+2;

function E(weapon, mods){
  const EQ={ weapon:{ wpn:weapon, mods, runes:[] } };
  const sb={console, EQ, CFG:{player:{baseCrit:5,baseCritMult:150}},
    STAT_TO_FAMILY:{addphys:'phys',addfire:'fire',addcold:'cold',addlight:'light',addpois:'pois'},
    PCT_TO_FAMILY:{'phys%':'phys','fire%':'fire','cold%':'cold','light%':'light','pois%':'pois'},
    RUNE_TO_FAMILY:{phys:'phys',fire:'fire',cold:'cold',light:'light',pois:'pois'},
    SLOTS:[], DEF_CFG:{resCap:0.75}, S:{lvl:50}, charStats:null, PLAYER_STATS:{dirty:true}};
  sb.window=sb; sb.window.runeTotals=null;
  vm.createContext(sb);
  vm.runInContext(src.slice(ba,bb)+'\nfunction stats(){ return buildStats(); }\n'+
    src.slice(ea,eb)+'\nthis.E=expectedHit; this.P=expectedHitParts;', sb, {filename:'e.js'});
  return { hit:sb.E(), parts:sb.P() };
}
const W={ early:{min:11,max:22,aps:1.45,crit:5},
          mid:  {min:26,max:64,aps:1.40,crit:6},
          late: {min:62,max:96,aps:1.05,crit:5} };
// realistic builds at each point, using affix tiers available then
const BUILDS = {
  'early / no elemental':      [W.early, []],
  'early / 1 fire affix':      [W.early, [{stat:'addfire',a:3,b:7}]],
  'mid / 2 elemental':         [W.mid, [{stat:'addfire',a:8,b:17},{stat:'addcold',a:7,b:15}]],
  'mid / fire-focused':        [W.mid, [{stat:'addfire',a:8,b:17},{stat:'addfire',a:8,b:17},{stat:'fire%',v:40}]],
  'late / 3 elemental':        [W.late, [{stat:'addfire',a:34,b:38},{stat:'addcold',a:30,b:34},{stat:'addlight',a:24,b:44}]],
  'late / FIRE BUILD':         [W.late, [{stat:'addfire',a:34,b:38},{stat:'addfire',a:24,b:49},
                                         {stat:'fire%',v:58},{stat:'fire%',v:43}]],
  'late / pure physical':      [W.late, [{stat:'addphys',a:15,b:31},{stat:'phys%',v:110}]],
};
const pad=(s,n)=>String(s).padEnd(n), lp=(s,n)=>String(s).padStart(n);

console.log('=== fire share of the hit, per build ===');
for(const [name,[w,mods]] of Object.entries(BUILDS)){
  const r=E(w,mods); const t=r.hit;
  console.log('  '+pad(name,24)+' hit '+lp(t.toFixed(0),5)+
    '   fire '+lp((r.parts.fire/t*100).toFixed(1),5)+'%');
}
console.log('\n=== TWO weapon sockets of % fire, total gain on the whole hit ===');
console.log('  '+pad('build',24)+['T5','T4','T3','T2','T1'].map(x=>lp(x,8)).join(''));
const CAND=[6,10,14,19,25];      // HIS curve, T5..T1, per elemental rune
const IRON=[5,8,12,16,21];       // his lower Iron curve
for(const [name,[w,mods]] of Object.entries(BUILDS)){
  const base=E(w,mods).hit;
  const row=CAND.map(p=>{
    const withRunes=E(w, mods.concat([{stat:'fire%',v:p*2}])).hit;   // 2 sockets
    return lp((((withRunes/base)-1)*100).toFixed(1)+'%',8);
  }).join('');
  console.log('  '+pad(name,24)+row);
}
console.log('\n  (candidate per-rune values T5..T1 = '+CAND.join(' / ')+'%)');
console.log('\n=== IRON on its own lower curve ('+IRON.join('/')+'%), 2 sockets ===');
console.log('  '+pad('build',24)+['T5','T4','T3','T2','T1'].map(x=>lp(x,8)).join(''));
for(const nm of ['late / pure physical','late / 3 elemental','mid / 2 elemental']){
  const [w,mods]=BUILDS[nm]; const base=E(w,mods).hit;
  const row=IRON.map(p=>lp((((E(w,mods.concat([{stat:'phys%',v:p*2}])).hit/base)-1)*100).toFixed(1)+'%',8)).join('');
  console.log('  '+pad(nm,24)+row);
}
console.log('\n=== ONE rune vs TWO at T1 (does the second socket feel worth it?) ===');
for(const nm of ['late / FIRE BUILD','late / 3 elemental']){
  const [w,mods]=BUILDS[nm]; const base=E(w,mods).hit;
  const one=(((E(w,mods.concat([{stat:'fire%',v:25}])).hit/base)-1)*100).toFixed(1);
  const two=(((E(w,mods.concat([{stat:'fire%',v:50}])).hit/base)-1)*100).toFixed(1);
  console.log('  '+pad(nm,24)+' one T1 +'+one+'%   two T1 +'+two+'%');
}
console.log('\n=== the tier chase: step size between adjacent tiers (FIRE BUILD) ===');
{
  const [w,mods]=BUILDS['late / FIRE BUILD']; const base=E(w,mods).hit;
  const g=CAND.map(p=>((E(w,mods.concat([{stat:'fire%',v:p*2}])).hit/base)-1)*100);
  ['T5','T4','T3','T2','T1'].forEach((t,i)=>{
    const step=i? (g[i]-g[i-1]).toFixed(1) : g[0].toFixed(1);
    console.log('  '+t+'  total +'+g[i].toFixed(1)+'%   (step +'+step+')');
  });
}
