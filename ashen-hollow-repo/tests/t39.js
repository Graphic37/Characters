// BASELINE: what does the plumbing fix actually change, in real damage terms?
const fs=require('fs'), vm=require('vm');
const src=fs.readFileSync('work.html','utf8');

// the real skillDamage, with weaponAvg/gearFlat/gearMult/supportMods intact
const a=src.indexOf('  function weaponAvg(){');
const b=src.indexOf('  window.skillDamage = skillDamage;');
const code=src.slice(a,b);

function dmg(weapon, flat, pct){
  const sb={ console,
    has:()=>true,
    SKILLS:{ multishot:{n:'Multishot', cd:5} },
    SKILL_COEF:{ multishot:{coef:0.6, hits:5, tag:'ATTACK'} },
    weaponStats:()=>weapon,
    stats:()=>({ flat:flat||{}, pct:pct||{} }),
    socketsFor:()=>[],
    socketSupport:()=>null,
    gemDamageMult:()=>1 };
  sb.window=sb; vm.createContext(sb);
  vm.runInContext(code+'\nthis.D=skillDamage;', sb, {filename:'d.js'});
  return sb.D('multishot');
}
const z={phys:0,fire:0,cold:0,light:0,pois:0};
// three progression points, using REAL base weapons from the file
const EARLY = {min:11,max:22,aps:1.45,crit:5,critMult:150};   // Cinderpoint Sword lvl 9
const MID   = {min:26,max:64,aps:1.40,crit:6,critMult:150};   // Widowdraw Bow lvl 22
const LATE  = {min:62,max:96,aps:1.05,crit:5,critMult:150};   // Tollbreaker lvl 30

const rows=[];
function row(label, w, flat){
  const before = dmg(w, z).hit;            // what the game did before the fix
  const after  = dmg(w, flat).hit;
  const add = Object.values(flat).reduce((x,y)=>x+y,0);
  rows.push({ point:label, weaponAvg:(w.min+w.max)/2, flatAdded:add,
              hitBefore:before, hitAfter:after,
              pctGain:+(((after/before)-1)*100).toFixed(1) });
}
// realistic flat from ONE elemental affix at that tier (from the affix table)
row('early  1 addfire affix (3-7)',   EARLY, {...z, fire:5});
row('mid    2 elemental affixes',     MID,   {...z, fire:20, cold:20});
row('late   3 elemental affixes',     LATE,  {...z, fire:20, cold:20, light:24});
// and with runes on top, at the CURRENT rune magnitudes (T5..T1 = 4,9,17,30,52)
row('late   + 2 weapon runes T1(52)', LATE,  {...z, fire:20, cold:20, light:24, phys:104});
row('late   + 2 weapon runes T5(4)',  LATE,  {...z, fire:20, cold:20, light:24, phys:8});

console.log('=== WHAT THE gearFlat FIX TURNS ON ===');
// console.log's %-format is a Node/printf thing, NOT a JS one — it silently
// mangles the line instead of erroring. Build the string.
const pad=(v,n)=>String(v).padEnd(n), lpad=(v,n)=>String(v).padStart(n);
rows.forEach(r=>console.log('  '+pad(r.point,34)+' wpnAvg '+lpad(r.weaponAvg,5)+
  '  +'+lpad(r.flatAdded,3)+' flat   '+lpad(r.hitBefore,5)+' -> '+lpad(r.hitAfter,5)+
  ' hit  (+'+r.pctGain+'%)'));

console.log('\n=== 17-SOCKET STACKING, at CURRENT rune magnitudes ===');
const MAG={T5:4,T4:9,T3:17,T2:30,T1:52};
console.log('  weapon has 2 sockets; 15 non-weapon sockets exist');
for(const [t,v] of Object.entries(MAG)){
  const wpn=v*2;
  const after=dmg(LATE,{...z, fire:20,cold:20,light:24, phys:wpn}).hit;
  const before=dmg(LATE,{...z, fire:20,cold:20,light:24}).hit;
  console.log('  2x weapon '+t+' (+'+wpn+' flat)  '+before+' -> '+after+
    '  (+'+(((after/before)-1)*100).toFixed(1)+'%)');
}
console.log('\n  15 armour sockets of Warding at current res magnitudes:');
for(const [t,v] of Object.entries(MAG)) console.log('    all '+t+' -> +'+(v*15)+
  ' to EVERY resistance (cap is 75)');
