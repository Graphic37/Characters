// DEFENSIVE CEILING: 15 non-weapon sockets, not 2. Measure before locking.
const fs=require('fs'), vm=require('vm');
const src=fs.readFileSync('work.html','utf8');
const a=src.indexOf('const RUNE_ELEM_PCT');
const b=src.indexOf('window.runeEffect=runeEffect;');
const sb={console}; sb.window=sb; vm.createContext(sb);
vm.runInContext('const RUNE_MAG=[0,4,9,17,30,52];\n'+src.slice(a,b)+
  '\nthis.F=runeEffect; this.RES=RUNE_ELEM_RES;', sb, {filename:'c.js'});

// the real socket caps
const CAP={weapon:2, body:3, helmet:2, gloves:2, boots:2, offhand:2,
           amulet:1, ring:1, ring2:1, belt:1};
const NONWEAPON = Object.entries(CAP).filter(([k])=>k!=='weapon')
  .reduce((n,[,v])=>n+v,0);
const pad=(s,n)=>String(s).padEnd(n), lp=(s,n)=>String(s).padStart(n);
console.log('socket caps: weapon '+CAP.weapon+', non-weapon '+NONWEAPON+
            ', total '+(CAP.weapon+NONWEAPON));
console.log('resistance cap is 75%. An affix gives 8-15 (T-weakest) to 36-45 (T-best).\n');

console.log('=== ALL '+NONWEAPON+' armour sockets, ONE family (worst case) ===');
console.log('  '+pad('tier',6)+lp('per rune',10)+lp('x'+NONWEAPON,8)+lp('vs 75 cap',12));
[5,4,3,2,1].forEach(t=>{
  const v=sb.F('rn_fire',t,'armour').v, tot=v*NONWEAPON;
  console.log('  '+pad('T'+t,6)+lp(v+'%',10)+lp(tot+'%',8)+
    lp(tot>=75?'CAPPED x'+(tot/75).toFixed(1):(tot+'/75'),12));
});

console.log('\n=== a REALISTIC spread: 4 sockets per family (16 across four) ===');
[5,3,1].forEach(t=>{
  const v=sb.F('rn_fire',t,'armour').v;
  console.log('  all T'+t+': 4 sockets x '+v+'% = +'+(v*4)+'% to EACH of the four families');
});

console.log('\n=== what the player can already get from AFFIXES ===');
console.log('  one best-tier resist suffix = 36-45%. Two = capped.');
console.log('  so a rune should be a TOP-UP, not a replacement.');

console.log('\n=== how many sockets to cap ONE family from runes alone ===');
[5,4,3,2,1].forEach(t=>{
  const v=sb.F('rn_fire',t,'armour').v;
  console.log('  T'+t+' ('+v+'%): '+Math.ceil(75/v)+' sockets'+
    (Math.ceil(75/v)<=NONWEAPON?'  <-- REACHABLE':'  (more than exist)'));
});
