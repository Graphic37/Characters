const fs=require('fs'), vm=require('vm');
const src=fs.readFileSync('work.html','utf8');

function grab(startMark, endMark){
  const a=src.indexOf(startMark); if(a<0) throw new Error('miss '+startMark);
  const b=src.indexOf(endMark, a); if(b<0) throw new Error('miss end');
  return src.slice(a, b+endMark.length);
}

// the REAL collide(), verbatim
// stop BEFORE the window.collide alias — in a sandbox where window===globalThis
// that line rebinds the name to itself and recurses forever
const collideCode = grab('const COLLIDE_PASSES=8;', '  return [nx,nz];\n}');
// the REAL feelerAdjust(), verbatim
const feelerCode = grab('function feelerAdjust(dx,dz){', '\n  return [ux,uz];\n}');

// ---------------------------------------------------------------- the map
// a 30x30m room grid, CELL 2m. '#' = wall.  A corridor, an L bend, and a pillar.
const CELL=2, W=15, H=15;
const walk=[];
for(let j=0;j<H;j++){ walk.push([]); for(let i=0;i<W;i++) walk[j][i]=1; }
// outer wall
for(let i=0;i<W;i++){ walk[0][i]=0; walk[H-1][i]=0; }
for(let j=0;j<H;j++){ walk[j][0]=0; walk[j][W-1]=0; }
// a long wall down the middle with a doorway at j=7
for(let j=1;j<H-1;j++) if(j!==7) walk[j][7]=0;
// a free-standing pillar
walk[4][3]=0;
const walkableAt=(x,z,margin)=>{
  const m=(margin===undefined)?0.45:margin;
  const probes=[[0,0],[m,0],[-m,0],[0,m],[0,-m]];
  for(const p of probes){
    const i=Math.floor((x+p[0])/CELL), j=Math.floor((z+p[1])/CELL);
    if(i<0||j<0||i>=W||j>=H) return false;
    if(!walk[j][i]) return false;
  }
  return true;
};
// blockers: one per unwalkable cell centre, as the real pipeline produces
const blockers=[];
for(let j=0;j<H;j++) for(let i=0;i<W;i++) if(!walk[j][i])
  blockers.push({x:i*CELL+CELL/2, z:j*CELL+CELL/2, r:CELL*0.5, rift:1});

const player={ position:{x:0,z:0} };
const sb={
  console, player, ENEMIES:[], blockers,
  RIFT:{ active:true },
  AUTO:{ stats:{} },
  activeBlockers:()=>blockers,
  enemyBodyRadius:()=>0.72,
  STEER_CFG:{ feeler:2.4 },
  Math, performance:{now:()=>0},
};
sb.window=sb;
sb.window.DEPTHS={ walkableAt };
vm.createContext(sb);
vm.runInContext(collideCode+'\n'+feelerCode+'\nthis.OUT={collide,feelerAdjust};', sb, {filename:'move.js'});
const {collide, feelerAdjust}=sb.OUT;

const R={};
const at=(x,z)=>{ player.position.x=x; player.position.z=z; };
const step=(x,z,dx,dz)=>{ at(x,z); return collide(x+dx,z+dz); };

// ============ 1. THE BUG THAT STARTED IT: a diagonal into a wall ==========
// stand just left of the middle wall (wall spans x 14..16), push up-right
{
  at(13.0, 9.0);
  const [nx,nz]=collide(13.0+0.35, 9.0-0.35);      // diagonal into the wall
  const movedZ=Math.abs(nz-9.0), movedX=Math.abs(nx-13.0);
  R.diagonalIntoWall = { movedAlongWall:+movedZ.toFixed(3), pushedIntoWall:+movedX.toFixed(3),
                         frozen: (movedZ<0.001 && movedX<0.001) };
}
// ============ 2. a HEAD-ON push into a wall must not move him through =====
{
  at(13.0, 9.0);
  const [nx,nz]=collide(13.0+0.4, 9.0);
  R.headOnIntoWall = { legal: walkableAt(nx,nz)!==false, dx:+(nx-13.0).toFixed(3) };
}
// ============ 3. sliding along a wall for 60 steps ========================
{
  at(13.0, 3.0);
  let x=13.0, z=3.0, frozen=0, travelled=0;
  for(let k=0;k<60;k++){
    at(x,z);
    const [nx,nz]=collide(x+0.20, z+0.20);          // constantly into the wall, moving +z
    const d=Math.hypot(nx-x, nz-z);
    if(d<0.001) frozen++;
    travelled+=d;
    x=nx; z=nz;
  }
  R.slideAlongWall = { frozenFrames:frozen, travelled:+travelled.toFixed(2),
                       endLegal: walkableAt(x,z)!==false };
}
// ============ 4. THE OLD BEHAVIOUR, for comparison =======================
// reproduce the pre-v149 branch: illegal -> return the current position
{
  let x=13.0, z=3.0, frozen=0, travelled=0;
  const oldCollide=(nx,nz,px,pz)=>{
    // (the physics push is the same; only the final guard differed)
    if(walkableAt(nx,nz)===false){
      if(walkableAt(nx,nz)===true) return [nx,nz];
      return [px,pz];                                // <- the freeze
    }
    return [nx,nz];
  };
  for(let k=0;k<60;k++){
    const [nx,nz]=oldCollide(x+0.20, z+0.20, x, z);
    const d=Math.hypot(nx-x, nz-z);
    if(d<0.001) frozen++;
    travelled+=d;
    x=nx; z=nz;
  }
  R.slideAlongWall_OLD = { frozenFrames:frozen, travelled:+travelled.toFixed(2) };
}
// ============ 5. standing INSIDE geometry: does she walk out? ============
{
  at(15.0, 9.0);                                     // dead centre of a wall cell
  let x=15.0, z=9.0, steps=0;
  while(steps<40 && walkableAt(x,z)===false){
    const [nx,nz]=collide(x+0.1, z);                 // any request at all
    if(Math.hypot(nx-x,nz-z)<0.0001) break;
    x=nx; z=nz; at(x,z); steps++;
  }
  R.escapeFromInsideWall = { escaped: walkableAt(x,z)!==false, steps,
                             perStep: steps? +(Math.hypot(x-15.0,z-9.0)/steps).toFixed(3):0 };
}
// ============ 6. the doorway: can she get through it? ====================
{
  let x=12.0, z=15.0, stuck=0;                       // left of the wall, level with the gap
  for(let k=0;k<80;k++){
    at(x,z);
    const [nx,nz]=collide(x+0.25, z);                // push straight at the doorway
    if(Math.hypot(nx-x,nz-z)<0.001) stuck++;
    x=nx; z=nz;
  }
  R.throughDoorway = { crossed: x>16, endX:+x.toFixed(2), stuckFrames:stuck };
}
// ============ 7. feelerAdjust steers AROUND the pillar ===================
{
  at(7.0, 12.0);                                     // pillar cell is i=3,j=4 -> x 6..8, z 8..10
  const [ax,az]=feelerAdjust(0,-1);                  // approaching it head on, from open floor
  R.feelerAvoidsPillar = { desired:'0,-1', chose:[+ax.toFixed(2),+az.toFixed(2)],
                           deflected: !(Math.abs(ax)<0.01 && az<-0.99) ,
                           notZero: !(ax===0 && az===0) };
}
// ============ 8. feelerAdjust in the open leaves the heading alone =======
{
  at(21.0, 21.0);
  const [ax,az]=feelerAdjust(1,0);
  R.feelerOpenGround = [+ax.toFixed(2), +az.toFixed(2)];
}
// ============ 9. boxed in on all sides: never returns 0,0 unless truly ===
{
  at(15.0, 9.0);                                     // inside the wall
  const [ax,az]=feelerAdjust(1,0);
  R.feelerWhenBoxedIn = { chose:[+ax.toFixed(2),+az.toFixed(2)] };
}
// ============ 10. stat counters actually fire ============================
R.counters = { slides:sb.AUTO.stats.slides||0, escapes:sb.AUTO.stats.escapes||0 };

console.log(JSON.stringify(R,null,1));
