// the spine must follow the WALKABLE GRAPH, not straight lines
const fs=require('fs'), vm=require('vm');
const src=fs.readFileSync('work.html','utf8');
const R={};
const a=src.indexOf('const SPINE_CFG = {');
const b=src.indexOf('function autoAuthoredTravel(P){');

/* A U-shaped map: rooms at the two tips of the U, solid stone between them.
   A straight line tip-to-tip crosses the whole block; the only real route is
   around the bottom. This is his Sunken Cisterns in miniature. */
const walk=(x,z)=>{
  if(x>=8 && x<=22 && z>=8) return false;   // the block between the arms
  return true;
};
const corridor=[];                          // the U route, as the nav mesh has it
for(let z=20;z>=2;z-=2) corridor.push({x:5,z});
for(let x=5;x<=25;x+=2) corridor.push({x,z:2});
for(let z=2;z<=20;z+=2) corridor.push({x:25,z});

function world(useMesh){
  const sb={ console, Math,
    RIFT:{active:true, bossSpawned:false},
    AUTO:{stats:{}, node:null, nodeSince:0},
    MOVE:{dvx:0,dvz:0}, AIM:{until:0},
    DEPTHS:{ walkableAt:walk },
    feelerAdjust:(dx,dz)=>{const d=Math.hypot(dx,dz)||1;return [dx/d,dz/d];},
    say:(m)=>{sb.__log=m;}, toast:()=>{}, navDoorNode:()=>null,
    performance:{now:()=>1000}, ahErr:()=>{} };
  if(useMesh){
    sb.navPath=(x0,z0,x1,z1)=>{
      // return the corridor slice between the two ends, in order
      const near=(x,z)=>corridor.reduce((best,p,i)=>{
        const d=Math.hypot(p.x-x,p.z-z);
        return d<best.d?{i,d}:best;},{i:0,d:1e9}).i;
      const i=near(x0,z0), j=near(x1,z1);
      const slice = i<=j ? corridor.slice(i,j+1) : corridor.slice(j,i+1).reverse();
      return slice.length?slice:null;
    };
  }
  sb.window=sb; sb.window.DEPTHS=sb.DEPTHS;
  sb.window.nearestStandable=(x,z,r)=>{
    for(let rr=0.5; rr<=r; rr+=0.5)
      for(let i=0;i<16;i++){
        const ang=i/16*6.283, nx=x+Math.cos(ang)*rr, nz=z+Math.sin(ang)*rr;
        if(walk(nx,nz)!==false) return {x:nx,z:nz};
      }
    return null;
  };
  vm.createContext(sb);
  vm.runInContext(src.slice(a,b)+'\nthis.B=buildSpine; this.S=SPINE; this.T=spineTravel;',
    sb, {filename:'s.js'});
  return sb;
}
const nav={ rooms:[{id:'r0',nodes:[{x:5,z:20}]},{id:'r1',nodes:[{x:25,z:20}]}],
            byId:new Map(), bossRoom:null };

// ---- WITHOUT the mesh: the old behaviour, for the record ----------------
{
  const w=world(false);
  w.B(nav,'straight');
  R.straightLine = { points:(w.S.pts||[]).length, snapped:w.S.built,
                     dropped:w.S.rejected, blocked:w.S.blocked, cut:w.S.cut,
                     noMeshLegs:w.S.noMesh };
}
// ---- WITH the mesh: the fix --------------------------------------------
{
  const w=world(true);
  w.B(nav,'mesh');
  const pts=w.S.pts||[];
  let crossings=0;
  for(let i=1;i<pts.length;i++){
    const p=pts[i-1], q=pts[i];
    const d=Math.hypot(q.x-p.x,q.z-p.z), n=Math.ceil(d/0.25);
    for(let k=1;k<n;k++){ const t=k/n;
      if(walk(p.x+(q.x-p.x)*t, p.z+(q.z-p.z)*t)===false) crossings++; }
  }
  R.viaMesh = { points:pts.length, snapped:w.S.built, dropped:w.S.rejected,
                blocked:w.S.blocked, cut:w.S.cut, noMeshLegs:w.S.noMesh,
                segmentCrossings:crossings, log:w.__log };
  R.meshRouteIsClean = w.S.built===0 && w.S.blocked===0 && !w.S.cut && crossings===0;
  R.goesAroundNotThrough = pts.some(p=>p.z<6);   // it dipped to the bottom arm
}
// ---- a CUT spine hands back instead of stranding her -------------------
{
  const w=world(true);
  w.B(nav,'mesh');
  w.S.cut=true;                       // force the cut case
  w.S.prog=w.S.total;                 // she has reached the end
  const handled=w.T({x:25,z:20});
  R.cutHandsBack = { handled, handedOff:w.S.handedOff,
                     counter:w.AUTO.stats.spineHandoff };
}
// ---- an UNCUT spine still drives normally ------------------------------
{
  const w=world(true);
  w.B(nav,'mesh');
  R.uncutStillDrives = w.T({x:5,z:20})===true;
}
console.log(JSON.stringify(R,null,1));
