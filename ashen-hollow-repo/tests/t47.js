// WHY does Iron give more on a mid build than on a committed physical one?
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
    src.slice(ea,eb)+'\nthis.E=expectedHit;', sb, {filename:'e.js'});
  return sb.E();
}
const LATE={min:62,max:96,aps:1.05,crit:5};
console.log('=== rune % is ADDITIVE with affix %, so it DIMINISHES as you stack ===');
console.log('   (weapon 62-96, one addfire 34-38, varying existing fire%)');
const pad=(s,n)=>String(s).padEnd(n), lp=(s,n)=>String(s).padStart(n);
console.log('  '+pad('existing fire% on gear',24)+lp('base hit',9)+lp('+2x T1 (50%)',14));
[0,25,50,100,150,200].forEach(existing=>{
  const mods=[{stat:'addfire',a:34,b:38}];
  if(existing) mods.push({stat:'fire%', v:existing});
  const base=E(LATE,mods);
  const withR=E(LATE, mods.concat([{stat:'fire%', v:50}]));
  console.log('  '+pad(existing+'%',24)+lp(base.toFixed(0),9)+
    lp('+'+(((withR/base)-1)*100).toFixed(1)+'%',14));
});
console.log('\n  -> the rune is worth MOST to a player with flat damage but little %,');
console.log('     and LEAST to one already stacked with %. Self-limiting.');
console.log('\n=== the same effect on IRON ===');
console.log('  '+pad('existing phys% on gear',24)+lp('base hit',9)+lp('+2x T1 (42%)',14));
[0,50,110,200].forEach(existing=>{
  const mods=[{stat:'addphys',a:15,b:31}];
  if(existing) mods.push({stat:'phys%', v:existing});
  const base=E(LATE,mods);
  const withR=E(LATE, mods.concat([{stat:'phys%', v:42}]));
  console.log('  '+pad(existing+'%',24)+lp(base.toFixed(0),9)+
    lp('+'+(((withR/base)-1)*100).toFixed(1)+'%',14));
});
