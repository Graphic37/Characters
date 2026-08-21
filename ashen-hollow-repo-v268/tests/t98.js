// the elite bar must sit ABOVE the head — measured, not guessed
const fs=require('fs'), vm=require('vm');
const src=fs.readFileSync('work.html','utf8');
const code=src.replace(/\/\*[\s\S]*?\*\//g,'');
const R={};
const a=src.indexOf('function enemyHeadY(e){');
const b=src.indexOf('function updateHeadPlate(){');

function world(){
  const sb={ console, Math, isFinite,
    THREE:{ Box3:function(){
      this.setFromObject=(g)=>{
        const h=g.__modelTop;
        this.isEmpty=()=>h===undefined;
        this.max={y:h===undefined?NaN:h};
        return this;
      };
    }, Vector3:function(){} },
    ahErr:()=>{} };
  sb.window=sb; vm.createContext(sb);
  vm.runInContext(src.slice(a,b)+'\nthis.H=enemyHeadY;', sb, {filename:'h.js'});
  return sb;
}
const mob=(top, y, r, sc)=>({ bodyRadius:r, g:{ __modelTop:top, position:{y},
  scale:{x:sc}, updateMatrixWorld(){} } });

// ---- 1. it returns the MEASURED top, not a radius multiple -------------
{
  const w=world();
  const cases=[
    ['legionnaire', 1.81, 0, 0.42, 1.00],
    ['archer',      1.58, 0, 0.38, 0.97],
    ['brute',       2.28, 0, 0.50, 1.06],
    ['boss',        4.58, 0, 0.75, 1.42]
  ];
  R.measured = cases.map(([n,top,y,r,sc])=>{
    const h=w.H(mob(top,y,r,sc));
    const old=r*2.4;
    return { mob:n, modelTop:top, measured:+h.toFixed(2),
             oldLift:+old.toFixed(2),
             oldPctOfBody:Math.round(100*old/top),
             newPctOfBody:Math.round(100*h/top) };
  });
  R.abovePreviously = R.measured.every(m=>m.oldPctOfBody<70);   // chest or lower
  R.nowAtTheTop = R.measured.every(m=>m.newPctOfBody>=99);
}
// ---- 2. it accounts for the enemy standing off the ground --------------
{
  const w=world();
  const onLedge=w.H(mob(3.9, 2.0, 0.42, 1));   // model top 3.9 with feet at 2.0
  R.localHeight = { value:+onLedge.toFixed(2), correct:Math.abs(onLedge-1.9)<0.01 };
}
// ---- 3. ⚠ IT CACHES, BUT NEVER CACHES A GUESS -------------------------
{
  const w=world();
  const notReady=mob(undefined, 0, 0.42, 1);   // model still streaming
  const first=w.H(notReady);
  R.streaming = { fallback:+first.toFixed(2), cached:notReady.__headY };
  R.doesNotCacheAGuess = notReady.__headY===undefined;
  // once the model arrives, the real value is taken and cached
  notReady.g.__modelTop=1.81;
  const second=w.H(notReady);
  R.streaming.afterLoad=+second.toFixed(2);
  R.recoversAfterLoad = Math.abs(second-1.81)<0.01 && notReady.__headY!==undefined;
  // and a measured value is only measured once
  let calls=0;
  const m=mob(1.81,0,0.42,1);
  m.g.updateMatrixWorld=()=>{ calls++; };
  w.H(m); w.H(m); w.H(m);
  R.measuresOnce = calls===1;
}
// ---- 4. both readouts use it, at the same height ----------------------
R.shared = {
  plateUsesIt:/p\.y \+ enemyHeadY\(e\) \+ 0\.35/.test(code),
  instancedUsesIt:/enemyHeadY\(e\) : 2\.05\*sc\) \+ 0\.35/.test(code),
  oldRadiusLiftGone:!/bodyRadius\?e\.bodyRadius\*2\.4:2\.2/.test(code)
};
R.bothAgree = Object.values(R.shared).every(Boolean);
// ---- 5. never below a floor, so a tiny model still reads --------------
{
  const w=world();
  R.floor = +w.H(mob(0.2, 0, 0.1, 0.5)).toFixed(2);
  R.hasFloor = R.floor>=0.8;
}
console.log(JSON.stringify(R,null,1));
