// progress orbs: elites drop them, they feed the bar, and nothing double-pays
const fs=require('fs'), vm=require('vm');
const src=fs.readFileSync('work.html','utf8');
const code=src.replace(/\/\*[\s\S]*?\*\//g,'');
const R={};

function orbWorld(grActive){
  const a=src.indexOf('const ORBS=[];');
  const b=src.indexOf('function clearGround(){');
  const removed=[];
  const sb={ console, Math,
    GR:{active:grActive},
    RIFT:{active:true, progress:0, target:100, bossSpawned:false},
    AH_WORLD:{ player:{position:{x:0, z:0}} },
    riftRoot:{ add:()=>{}, remove:(m)=>removed.push(m) },
    scene:{ remove:()=>{} },
    groundAt:()=>0,
    lootSpot:(x,z)=>[x,z],
    THREE:{ SphereGeometry:function(){}, MeshBasicMaterial:function(o){this.o=o;},
            Mesh:function(g,m){ this.geometry=g; this.material=m;
              this.userData={}; this.scale={setScalar(){}};
              this.position={x:0,y:0,z:0,set(x,y,z){this.x=x;this.y=y;this.z=z;}}; } },
    ahErr:()=>{} };
  sb.window=sb; vm.createContext(sb);
  vm.runInContext(src.slice(a,b)+
    '\nthis.DROP=window.dropProgressOrbs; this.TICK=window.tickOrbs;'+
    // ⚠ `removed` is a harness variable, not a sandbox one — it is captured by
    // the stub closure, so it must be read from OUT here, not inside.
    '\nthis.ORBS=ORBS; this.CFG=ORB_CFG; this.RIFT=RIFT;',
    sb, {filename:'o.js'});
  sb.removed=removed;
  return sb;
}

// ---- 1. counts: yellow drops 3, blue drops 1 --------------------------
{
  const w=orbWorld(true);
  R.counts = { rare:w.DROP(10,10,'rare'), magic:w.DROP(20,20,'magic') };
  R.orbsAlive = w.ORBS.length;
  R.d3Counts = R.counts.rare===3 && R.counts.magic===1 && R.orbsAlive===4;
  R.colours = { rare:w.CFG.rare.colour.toString(16), magic:w.CFG.magic.colour.toString(16) };
}
// ---- 2. ⚠ GREATER RIFTS ONLY -----------------------------------------
{
  const w=orbWorld(false);
  R.nephalem = { dropped:w.DROP(0,0,'rare'), orbs:w.ORBS.length };
  R.gatedToGR = R.nephalem.dropped===0 && R.nephalem.orbs===0;
}
// ---- 3. walking near collects, and the bar moves ----------------------
{
  const w=orbWorld(true);
  w.DROP(0.2, 0.2, 'rare');            // three, right on top of the player
  const before=w.RIFT.progress;
  for(let i=0;i<80;i++) w.TICK(0.05);  // 4 seconds
  R.collect = { before, after:w.RIFT.progress, left:w.ORBS.length,
                perOrb:w.CFG.rare.value };
  R.magnetWorks = R.collect.after===before+3*w.CFG.rare.value && R.collect.left===0;
}
// ---- 4. an orb far away is NOT collected ------------------------------
{
  const w=orbWorld(true);
  w.DROP(50, 50, 'magic');
  for(let i=0;i<20;i++) w.TICK(0.05);
  R.far = { progress:w.RIFT.progress, left:w.ORBS.length };
  R.onlyNearby = R.far.progress===0 && R.far.left===1;
}
// ---- 5. ⚠ AN UNREACHABLE ORB SELF-AWARDS RATHER THAN COSTING THE RUN --
{
  const w=orbWorld(true);
  w.DROP(50, 50, 'rare');
  for(let i=0;i<(w.CFG.life+2)/0.5;i++) w.TICK(0.5);
  R.expiry = { progress:w.RIFT.progress, left:w.ORBS.length };
  R.expiresIntoTheBar = R.expiry.progress===3*w.CFG.rare.value && R.expiry.left===0;
}
// ---- 6. ⚠ THE KILL MUST NOT PAY TWICE --------------------------------
{
  R.kill = {
    dropsFirst:/dropped=dropProgressOrbs\(e\.g\.position\.x, e\.g\.position\.z, eliteKind\)/.test(code),
    onlyPaysIfNoDrop:/if\(!dropped\) RIFT\.progress \+= e\.rarity==='rare'\?4/.test(code),
    normalsUnchanged:/: 1;/.test(code)
  };
  R.noDoublePay = R.kill.dropsFirst && R.kill.onlyPaysIfNoDrop;
  // a rare in a GR: 3 orbs x2 = 6 via orbs, 0 on death
  R.rareValueViaOrbs = 3*2;
  R.rareValueOnDeath = 4;
}
// ---- 7. wired, not merely defined -------------------------------------
R.wiring = {
  ticked:/window\.tickOrbs && window\.tickOrbs\(dt\)/.test(code),
  clearedWithGround:/window\.clearGround=function\(\)\{ try\{ _cg\(\); \} finally \{ try\{ clearOrbs\(\)/.test(code),
  autoSeeksThem:/autoSetPath\(\{x:owant\.g\.position\.x, z:owant\.g\.position\.z, kind:'orb'\}/.test(code),
  autoBeforeBagGate:code.indexOf("kind:'orb'") < code.indexOf('GROUND.bagFull>performance.now()'),
  barReacts:/window\.riftProgressChanged=function/.test(code),
  notInGROUND:!/GROUND\.push\(\{g:m, value/.test(code)
};
R.wiredUp = Object.values(R.wiring).every(Boolean);
R.PASS = R.d3Counts && R.gatedToGR && R.magnetWorks && R.onlyNearby
      && R.expiresIntoTheBar && R.noDoublePay && R.wiredUp;
console.log(JSON.stringify(R,null,1));
if(!R.PASS) process.exit(1);
