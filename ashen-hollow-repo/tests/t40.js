// the repath storm must not be possible any more
const fs=require('fs'), vm=require('vm');
const src=fs.readFileSync('work.html','utf8');
const R={};

// ---- autoSetNode: snap ONCE, reject a useless destination ---------------
const a=src.indexOf('const SNAP_CACHE = new Map();');
const b=src.indexOf('/* Clearing the node must also clear');
const nsA=src.indexOf('function nearestStandable(x, z, maxR){');
const code=src.slice(nsA, src.indexOf('window.nearestStandable=nearestStandable;'))+
           '\n'+src.slice(a,b);

function world(walkFn, playerAt){
  const sb={ console, Math,
    RIFT:{active:true}, DEPTHS:{ walkableAt:walkFn },
    AUTO:{ stats:{}, node:null }, AUTO_CFG:{ arriveAt:1.5 },
    player:{ position:{x:playerAt[0], z:playerAt[1]} },
    AH_WORLD:{ setMoveTarget:()=>{} },
    performance:{now:()=>1000} };
  sb.window=sb; sb.window.DEPTHS=sb.DEPTHS; sb.window.RIFT=sb.RIFT;
  vm.createContext(sb);
  vm.runInContext(code+'\nthis.S=autoSetNode; this.C=SNAP_CACHE; this.A=AUTO;', sb, {filename:'n.js'});
  return sb;
}
// a wall from x 20..30; the player stands at x 19
const wall=(x,z)=> !(x>=20 && x<30);
{
  const w=world(wall, [19,50]);
  // the SAME bad door node, ticked 500 times — his crossing branch
  let snapsSeen=[];
  for(let i=0;i<500;i++){
    w.A.node=null;
    w.S({x:25, z:50, id:'door_r0_r1'}, 'crossing');
    snapsSeen.push(w.A.stats.nodeSnapped||0);
  }
  R.snapOnce = { ticks:500, snapsPerformed:w.A.stats.nodeSnapped,
                 cacheEntries:w.C.size,
                 storedOnce: w.A.stats.nodeSnapped===1 };
}
// a snap that lands ON the player is refused, not committed
{
  const w=world((x,z)=> !(x>=20&&x<30), [19.6,50]);
  w.S({x:20.2, z:50, id:'d1'}, 'crossing');
  R.uselessRefused = { committed: !!w.A.node, counter: w.A.stats.nodeUseless };
}
// a snap that lands usefully far IS committed
{
  const w=world((x,z)=> !(x>=20&&x<30), [5,50]);
  w.S({x:25, z:50, id:'d2'}, 'crossing');
  R.usefulCommitted = { committed: !!w.A.node, why: w.A.nodeWhy,
                        dist: w.A.node ? +Math.hypot(w.A.node.x-5, w.A.node.z-50).toFixed(1) : null };
}
// nowhere legal -> cached as null so it is not retried either
{
  const w=world(()=>false, [5,50]);
  for(let i=0;i<200;i++){ w.A.node=null; w.S({x:25,z:50,id:'d3'}, 'crossing'); }
  R.hopelessCachedOnce = { snaps:w.A.stats.nodeSnapped, rejects:w.A.stats.nodeRejected,
                           cached:w.C.get('id:d3') };
}

// ---- autoSetPath: no recompute without a change -------------------------
{
  const pa=src.indexOf('function autoSetPath(dest, why){');
  const pb=src.indexOf('window.autoSetPath=');
  let navCalls=0;
  const sb={ console,
    AUTO:{ stats:{}, node:{x:1,z:1}, pathDest:null, pathWhy:null, path:null },
    RIFT:{ nav:{ mesh:true } },
    player:{position:{x:0,z:0}},
    navPath:()=>{ navCalls++; return [{x:9,z:9}]; },
    autoSetNode:(nd,why)=>{ sb.AUTO.node=nd; sb.AUTO.nodeWhy=why; } };
  sb.window=sb; vm.createContext(sb);
  vm.runInContext(src.slice(pa,pb)+'\nthis.P=autoSetPath; this.A=AUTO;', sb, {filename:'p.js'});
  const dest={x:50,z:50};
  for(let i=0;i<500;i++) sb.P(dest,'crossing');       // the unconditional branch
  R.pathStorm = { ticks:500, navPathCalls:navCalls,
                  set:sb.A.stats.pathSet, kept:sb.A.stats.pathKept };
  // a genuinely NEW destination must still recompute
  sb.P({x:80,z:80},'crossing');
  R.newDestRepaths = navCalls;
  // and a different reason must too
  sb.P({x:80,z:80},'to-doorway');
  R.newWhyRepaths = navCalls;
}
console.log(JSON.stringify(R,null,1));
