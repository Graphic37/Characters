// the vault sits at the door HE measured, and does not fight Veyra
const fs=require('fs'), vm=require('vm');
const src=fs.readFileSync('work.html','utf8');
const code=src.replace(/\/\*[\s\S]*?\*\//g,'');
const R={};

// ---- 1. the default now IS his measurement ---------------------------
{
  const m=/const VAULT_ANCHOR = \{ x:(-?[\d.]+), z:(-?[\d.]+), r:([\d.]+) \}/.exec(code);
  R.anchor={ x:+m[1], z:+m[2], r:+m[3] };
  const i=src.indexOf('const DEFAULT_TOWN_LAYOUT=');
  const blob=src.slice(i+'const DEFAULT_TOWN_LAYOUT='.length);
  let d=0,end=0;
  for(let k=0;k<blob.length;k++){ const c=blob[k];
    if(c==='{')d++; else if(c==='}'){d--; if(!d){end=k+1;break;}} }
  const lay=JSON.parse(blob.slice(0,end));
  const row=lay.placed.find(p=>p.prefab==='vault_door');
  R.layoutRow={ x:row.p[0], z:row.p[2] };
  // ⚠ THE CONSTANT AND THE LAYOUT ROW MUST AGREE — the station takes its
  // POSITION from the row and its RADIUS from the constant, so a mismatch
  // would put the circle in one place and the prompt in another.
  R.constantMatchesLayout = R.anchor.x===R.layoutRow.x && R.anchor.z===R.layoutRow.z;
  R.isHisMeasurement = R.anchor.x===-7.74 && R.anchor.z===-1.68;
  R.notMyOldGuess = !(R.anchor.x===-4 && R.anchor.z===2);
}
// ---- 2. ⚠ IT MUST NOT STEAL VEYRA'S PROMPT ---------------------------
{
  // run the REAL proximity picker over the two real stations
  const a=src.indexOf('let best=null, bestD=1e9;');
  const b=src.indexOf('  nearStation=best;');
  const loop=src.slice(a,b);
  const stations=[
    { name:'Stash', pos:{x:-7.74, z:-1.68}, r:R.anchor.r },
    { name:'Veyra', pos:{x:-7.42, z:-4.61}, r:3.2 }
  ];
  function pick(x,z){
    const sb={ console, Math, stations, player:{position:{x,z}} };
    sb.window=sb; vm.createContext(sb);
    vm.runInContext(loop+'\nthis.B=best;', sb, {filename:'p.js'});
    return sb.B && sb.B.name;
  }
  R.picks = {
    atTheDoor:     pick(-7.74, -1.68),
    justOutsideDoor:pick(-7.74, -0.60),
    atVeyra:       pick(-7.42, -4.61),
    approachingVeyra:pick(-7.50, -3.90),
    midway:        pick(-7.58, -3.15)
  };
  R.doorReachable  = R.picks.atTheDoor==='Stash';
  R.veyraReachable = R.picks.atVeyra==='Veyra' && R.picks.approachingVeyra==='Veyra';
  R.bothUsable = R.doorReachable && R.veyraReachable;
  // the tightened radius is what buys this
  R.radiusTightened = R.anchor.r <= 2.4;
}
// ---- 3. a saved override still wins ----------------------------------
R.override = {
  setterExists:/window\.ahSetVault=function/.test(code),
  appliedAtBuild:/vaultApplySaved\(stations\[stations\.length-1\]\)/.test(code),
  resetExists:/window\.ahVaultReset=function/.test(code)
};
R.overrideIntact = Object.values(R.override).every(Boolean);
R.PASS = R.constantMatchesLayout && R.isHisMeasurement && R.bothUsable
      && R.overrideIntact;
console.log(JSON.stringify(R,null,1));
if(!R.PASS) process.exit(1);
