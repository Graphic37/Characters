// no node may sit in a wall; the snap must be the NEAREST legal point
const fs=require('fs'), vm=require('vm');
const src=fs.readFileSync('work.html','utf8');
const R={};
const a=src.indexOf('function nearestStandable(x, z, maxR){');
const b=src.indexOf('function autoDist(a,b){');
const code=src.slice(a,b);

// a 30x30m map: open floor with a solid block from x 10..20, z 10..20
const CELL=2;
const walk=(x,z)=> !(x>=10&&x<20&&z>=10&&z<20) && x>0 && z>0 && x<40 && z<40;
const sb={ console, Math,
  RIFT:{active:true},
  DEPTHS:{ walkableAt:(x,z)=> walk(x,z) ? true : false },
  AUTO:{ stats:{}, node:null },
  AH_WORLD:{ setMoveTarget:()=>{} },
  performance:{now:()=>1000} };
sb.window=sb; sb.window.DEPTHS=sb.DEPTHS; sb.window.RIFT=sb.RIFT;
vm.createContext(sb);
vm.runInContext(code+'\nthis.N=nearestStandable; this.S=autoSetNode;', sb, {filename:'n.js'});

// 1. a legal point is returned untouched
R.legalUntouched = JSON.stringify(sb.N(5,5,7))==='{"x":5,"z":5}';

// 2. a point INSIDE the block snaps out, and to the NEAREST edge
const deep=sb.N(15,15,12);            // dead centre of a 10m block
const nearEdge=sb.N(10.4,15,7);       // just inside the left face
R.snap={ centre:deep && {x:+deep.x.toFixed(1), z:+deep.z.toFixed(1)},
         centreIsLegal: deep ? walk(deep.x,deep.z) : false,
         nearEdge: nearEdge && {x:+nearEdge.x.toFixed(2), z:+nearEdge.z.toFixed(2)},
         nearEdgeMovedLittle: nearEdge ? Math.hypot(nearEdge.x-10.4, nearEdge.z-15) < 1.0 : false };

// 3. nothing legal within range -> null, and the node is REJECTED not committed
sb.DEPTHS.walkableAt=()=>false;
R.nothingLegal = sb.N(15,15,7)===null;
sb.AUTO.node=null; sb.AUTO.stats={};
sb.S({x:15,z:15}, 'to-doorway');
R.rejected={ nodeStillNull: sb.AUTO.node===null, counter: sb.AUTO.stats.nodeRejected };

// 4. an illegal node is snapped and TAGGED, never committed as-is
sb.DEPTHS.walkableAt=(x,z)=> walk(x,z) ? true : false;
sb.AUTO.node=null; sb.AUTO.stats={};
sb.S({x:15,z:15, id:'d7', room:'r5'}, 'to-doorway');
R.snapped={ committed: !!sb.AUTO.node,
            isLegal: sb.AUTO.node ? walk(sb.AUTO.node.x, sb.AUTO.node.z) : false,
            why: sb.AUTO.nodeWhy,
            keptId: sb.AUTO.node && sb.AUTO.node.id, keptRoom: sb.AUTO.node && sb.AUTO.node.room,
            counter: sb.AUTO.stats.nodeSnapped };

// 5. a legal node passes through with its why unchanged
sb.AUTO.node=null; sb.AUTO.stats={};
sb.S({x:5,z:5}, 'waypoint');
R.legalNode={ why: sb.AUTO.nodeWhy, snapCounter: sb.AUTO.stats.nodeSnapped||0 };

// 6. the spawn guard
R.spawnGuards = /VALIDATE THE SPAWN POINT/.test(src)
             && /if\(fix\)\{ x=fix\.x; z=fix\.z; \}/.test(src)
             && /return null;\s*\/\* better one fewer enemy than one in a wall/.test(src);
console.log(JSON.stringify(R,null,1));
