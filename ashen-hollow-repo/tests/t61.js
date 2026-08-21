// the spine: built once and validated, progress never goes backwards
const fs=require('fs'), vm=require('vm');
const src=fs.readFileSync('work.html','utf8');
const R={};
const a=src.indexOf('const SPINE_CFG = {');
const b=src.indexOf('function autoAuthoredTravel(P){');

// a map with a wall from x 20..30; rooms strung left to right
const walk=(x,z)=> !(x>=20 && x<30 && z>-100);
function world(walkFn){
  const MOVE={dvx:0,dvz:0}, AIM={until:0};
  const sb={ console, Math, MOVE, AIM,
    RIFT:{active:true, bossSpawned:false, nav:null},
    AUTO:{stats:{}, node:null, nodeSince:0},
    DEPTHS:{ walkableAt:walkFn },
    feelerAdjust:(dx,dz)=>{ const d=Math.hypot(dx,dz)||1; return [dx/d, dz/d]; },
    say:()=>{}, toast:()=>{}, navDoorNode:()=>null,
    performance:{now:()=>1000}, ahErr:()=>{} };
  sb.window=sb; sb.window.DEPTHS=sb.DEPTHS;
  sb.window.nearestStandable=(x,z,r)=>{
    for(let rr=0.5; rr<=r; rr+=0.5)
      for(let i=0;i<12;i++){
        const ang=i/12*6.283, nx=x+Math.cos(ang)*rr, nz=z+Math.sin(ang)*rr;
        if(walkFn(nx,nz)!==false) return {x:nx,z:nz};
      }
    return null;
  };
  vm.createContext(sb);
  vm.runInContext(src.slice(a,b)+
    '\nthis.B=buildSpine; this.T=spineTravel; this.S=SPINE; this.C=SPINE_CFG;',
    sb, {filename:'s.js'});
  return sb;
}
const nav=(xs)=>({ rooms:xs.map((x,i)=>({id:'r'+i, nodes:[{x, z:0}]})),
                   byId:new Map(), bossRoom:null });

// ---- 1. it builds, resamples, and VALIDATES ----------------------------
{
  const w=world(walk);
  const n=w.B(nav([0, 40]));      // a straight line THROUGH the wall at 20..30
  R.build={ points:n, total:+w.S.total.toFixed(1),
            snapped:w.S.built, dropped:w.S.rejected };
  R.everyPointWalkable = w.S.pts.every(p=>walk(p.x,p.z)!==false);
  R.hasCumulativeDistance = w.S.pts[0].d===0 && w.S.pts[w.S.pts.length-1].d>0;
}
// ---- 2. ⚠ PROGRESS NEVER GOES BACKWARDS (his safeguard) ---------------
{
  const w=world(()=>true);
  w.B(nav([0, 60]));
  const P={x:0,z:0};
  // walk forward along the line
  for(let x=0;x<=40;x+=4){ P.x=x; w.T(P); }
  const forward=w.S.prog;
  // now get dragged BACKWARDS by a fight
  P.x=12; w.T(P);
  R.progress={ afterForward:+forward.toFixed(1), afterDragBack:+w.S.prog.toFixed(1),
               neverDecreased: w.S.prog >= forward };
  // and the rejoin target must still be AHEAD of her, not behind
  R.aimsForward = w.AUTO.node.x > P.x;
}
// ---- 3. a big drag back is tolerated once, then she rejoins ahead -------
{
  const w=world(()=>true);
  w.B(nav([0, 60]));
  const P={x:0,z:0};
  for(let x=0;x<=50;x+=5){ P.x=x; w.T(P); }
  const before=w.S.prog;
  P.x=2; w.T(P);                                  // dragged 48m backwards
  R.longDrag={ progBefore:+before.toFixed(1), progAfter:+w.S.prog.toFixed(1),
               lostCount:w.AUTO.stats.spineLost||0,
               stillMonotonic: w.S.prog>=before };
}
// ---- 4. it drives MOVE and sets the state ------------------------------
{
  const w=world(()=>true);
  w.B(nav([0, 30]));
  const handled=w.T({x:0,z:0});
  R.drives={ handled, dvx:+w.MOVE.dvx.toFixed(2), dvz:+w.MOVE.dvz.toFixed(2),
             why:w.AUTO.nodeWhy, state:w.AUTO.state,
             unitVector: Math.abs(Math.hypot(w.MOVE.dvx,w.MOVE.dvz)-1)<0.01 };
}
// ---- 5. no spine -> the follower declines and the old path runs ---------
{
  const w=world(()=>true);
  R.noSpineDeclines = w.T({x:0,z:0})===false;
}
// ---- 6. the flag genuinely gates it ------------------------------------
R.hookGated = /if\(SPINE_CFG\.on && SPINE\.pts && spineTravel\(P\)\) return;/.test(src);
R.oldPathIntact = /function autoAuthoredTravel\(P\)\{[\s\S]{0,400}AUTO\.path=null;/.test(src);
R.runsTagged = /mode:\(window\.SPINE_CFG && SPINE_CFG\.on\) \? 'spine' : 'nav'/.test(src);
R.abTable = /--- A\/B by travel mode ---/.test(src);
console.log(JSON.stringify(R,null,1));
