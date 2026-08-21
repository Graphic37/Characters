// ⚠ HIS CATCH: two walkable endpoints do not make a walkable segment
const fs=require('fs'), vm=require('vm');
const src=fs.readFileSync('work.html','utf8');
const R={};
const a=src.indexOf('const SPINE_CFG = {');
const b=src.indexOf('function autoAuthoredTravel(P){');

// a map with a solid pillar the straight line would cross
function world(walkFn){
  const sb={ console, Math, MOVE:{dvx:0,dvz:0}, AIM:{until:0},
    RIFT:{active:true, bossSpawned:false},
    AUTO:{stats:{}, node:null, nodeSince:0},
    DEPTHS:{ walkableAt:walkFn },
    feelerAdjust:(dx,dz)=>{const d=Math.hypot(dx,dz)||1; return [dx/d,dz/d];},
    say:(m)=>{ sb.__log=m; }, toast:()=>{}, navDoorNode:()=>null,
    performance:{now:()=>1000}, ahErr:()=>{} };
  sb.window=sb; sb.window.DEPTHS=sb.DEPTHS;
  sb.window.nearestStandable=(x,z,r)=>{
    for(let rr=0.5; rr<=r; rr+=0.5)
      for(let i=0;i<16;i++){
        const ang=i/16*6.283, nx=x+Math.cos(ang)*rr, nz=z+Math.sin(ang)*rr;
        if(walkFn(nx,nz)!==false) return {x:nx,z:nz};
      }
    return null;
  };
  vm.createContext(sb);
  vm.runInContext(src.slice(a,b)+'\nthis.B=buildSpine; this.S=SPINE;', sb, {filename:'s.js'});
  return sb;
}
const nav=(xs)=>({ rooms:xs.map((x,i)=>({id:'r'+i, nodes:[{x, z:0}]})), byId:new Map(), bossRoom:null });

// ---- 1. ⚠ THE EXACT HAZARD HE NAMED ------------------------------------
// A thin wall at x 18..22 spanning z -1..1. Both room anchors (x=0 and x=40,
// z=0) are walkable; the straight line between them is NOT.
{
  const wall=(x,z)=> !(x>=18 && x<=22 && z>=-1 && z<=1);
  const w=world(wall);
  w.B(nav([0,40]));
  const pts=w.S.pts||[];
  // walk EVERY segment at fine resolution and assert none crosses the wall
  let crossings=0;
  for(let i=1;i<pts.length;i++){
    const p=pts[i-1], q=pts[i];
    const d=Math.hypot(q.x-p.x,q.z-p.z), n=Math.ceil(d/0.25);
    for(let k=1;k<n;k++){ const t=k/n;
      if(wall(p.x+(q.x-p.x)*t, p.z+(q.z-p.z)*t)===false) crossings++; }
  }
  R.thinWall={ points:pts.length, blockedSegments:w.S.blocked,
               detours:w.S.detours, cut:w.S.cut,
               segmentCrossings:crossings, log:w.__log };
  R.noSegmentCrossesAWall = crossings===0;
}
// ---- 2. a WIDE wall with no detour must CUT, not bridge ----------------
{
  const slab=(x,z)=> !(x>=15 && x<=25);      // spans all z: unroutable
  const w=world(slab);
  w.B(nav([0,40]));
  const pts=w.S.pts||[];
  let crossings=0;
  for(let i=1;i<pts.length;i++){
    const p=pts[i-1], q=pts[i];
    const d=Math.hypot(q.x-p.x,q.z-p.z), n=Math.ceil(d/0.25);
    for(let k=1;k<n;k++){ const t=k/n;
      if(slab(p.x+(q.x-p.x)*t, p.z+(q.z-p.z)*t)===false) crossings++; }
  }
  R.impassable={ cut:w.S.cut, points:pts.length,
                 lastX: pts.length?+pts[pts.length-1].x.toFixed(1):null,
                 segmentCrossings:crossings };
  R.cutsRatherThanBridges = w.S.cut===true && crossings===0;
}
// ---- 3. an open map is unaffected --------------------------------------
{
  const w=world(()=>true);
  w.B(nav([0,40]));
  R.openMap={ points:(w.S.pts||[]).length, blocked:w.S.blocked, cut:w.S.cut };
}
// ---- 4. the FX eviction path frees the material clone ------------------
{
  const fa=src.indexOf('function fxAdd(obj, life, fn){');
  const fb=src.indexOf('/* expanding shock ring');
  let freed=0, geoDisposed=0;
  const FX=[]; const FX_CAP=3;
  const mk=()=>({ isSprite:true, userData:{},
    material:{ userData:{fxClone:1}, dispose:()=>freed++ },
    geometry:{ dispose:()=>geoDisposed++ } });
  const sb={ console, FX, FX_CAP,
    riftRoot:{ add(){}, remove(){} },
    ahFree:(o)=>{ if(o.material&&o.material.userData.fxClone) o.material.dispose(); } };
  sb.window=sb; sb.window.ahFree=sb.ahFree;
  vm.createContext(sb);
  vm.runInContext(src.slice(fa,fb)+'\nthis.A=fxAdd;', sb, {filename:'f.js'});
  for(let i=0;i<10;i++) sb.A(mk(), 1, null);   // 10 effects, cap 3 -> 7 evicted
  R.eviction={ added:10, cap:FX_CAP, clonesFreed:freed,
               spriteGeometryDisposed:geoDisposed };
  R.evictionFreesClones = freed===7;
  R.evictionSkipsSpriteGeometry = geoDisposed===0;
}
// ---- 5. fxTrail is registered, not orphaned ---------------------------
R.trailRegistered = /return fxAdd\(m, life\|\|0\.35/.test(src);
// ---- 6. variance is reported --------------------------------------------
R.variance = /p90 '\+p90\.toFixed\(0\)/.test(src) && /sd '\+sd\.toFixed\(0\)/.test(src);
console.log(JSON.stringify(R,null,1));
