// the full deadlock case end to end: feeler -> movement gate -> collide
const fs=require('fs'), vm=require('vm');
const src=fs.readFileSync('work.html','utf8');
function grab(a,b){ const i=src.indexOf(a); const j=src.indexOf(b,i); return src.slice(i,j+b.length); }
const collideCode=grab('const COLLIDE_PASSES=8;','  return [nx,nz];\n}');
const feelerCode=grab('function feelerAdjust(dx,dz){','\n  return [ux,uz];\n}');

const CELL=2,W=15,H=15,walk=[];
for(let j=0;j<H;j++){walk.push([]);for(let i=0;i<W;i++)walk[j][i]=1;}
for(let i=0;i<W;i++){walk[0][i]=0;walk[H-1][i]=0;}
for(let j=0;j<H;j++){walk[j][0]=0;walk[j][W-1]=0;}
walk[4][3]=0;                                     // the pillar she is stuck in
const walkableAt=(x,z,m0)=>{const m=(m0===undefined)?0.45:m0;
  for(const p of [[0,0],[m,0],[-m,0],[0,m],[0,-m]]){
    const i=Math.floor((x+p[0])/CELL),j=Math.floor((z+p[1])/CELL);
    if(i<0||j<0||i>=W||j>=H||!walk[j][i]) return false;} return true;};
const blockers=[];
for(let j=0;j<H;j++)for(let i=0;i<W;i++) if(!walk[j][i])
  blockers.push({x:i*CELL+1,z:j*CELL+1,r:1,rift:1});
const player={position:{x:7,z:9}};
const sb={console,player,ENEMIES:[],blockers,RIFT:{active:true},AUTO:{stats:{}},
  activeBlockers:()=>blockers,enemyBodyRadius:()=>0.72,STEER_CFG:{feeler:2.4},Math};
sb.window=sb; sb.window.DEPTHS={walkableAt};
vm.createContext(sb);
vm.runInContext(collideCode+'\n'+feelerCode+'\nthis.OUT={collide,feelerAdjust};',sb,{filename:'m.js'});
const {collide,feelerAdjust}=sb.OUT;

// the REAL loop shape: Auto steers -> desired velocity -> only if non-zero does
// the movement block call collide()
function sim(){
  let x=7,z=9,frames=0,zeroVel=0;
  for(let k=0;k<120;k++){
    player.position.x=x; player.position.z=z;
    const [dvx,dvz]=feelerAdjust(0,-1);            // Auto wants to head -z
    const len=Math.hypot(dvx,dvz);
    if(len<=0.001){ zeroVel++; frames++; continue; }  // movement block skips collide
    const sp=0.18;
    const [nx,nz]=collide(x+dvx/len*sp, z+dvz/len*sp);
    x=nx; z=nz; frames++;
    if(walkableAt(x,z)!==false) return {escaped:true,frames,zeroVel,x:+x.toFixed(2),z:+z.toFixed(2)};
  }
  return {escaped:false,frames:120,zeroVel,x:+x.toFixed(2),z:+z.toFixed(2)};
}
console.log('spawned inside a pillar, Auto driving:', JSON.stringify(sim()));
