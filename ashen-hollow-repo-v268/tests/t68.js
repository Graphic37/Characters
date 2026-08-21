// the stagger recorder must answer WHERE and BETWEEN WHAT, once per spot
const fs=require('fs'), vm=require('vm');
const src=fs.readFileSync('work.html','utf8');
const R={};
const a=src.indexOf('const STAG = { ring:new Array(60)');
const b=src.indexOf('/* ---- the state machine ---');

function world(){
  const warns=[];
  let t=0;
  const sb={ console,
    // v263: the contract system installs a 30s period check at load
    setInterval:()=>1, console:{ log:()=>{}, warn:(...x)=>warns.push(x.join(' ')), table:()=>{} },
    performance:{now:()=>t*1000},
    AUTO:{ node:null, nodeWhy:'', state:'', roomId:'', goalId:'' },
    SPINE:{ map:'Sunken Cisterns' },
    Math, ahErr:()=>{} };
  sb.window=sb; sb.window.SPINE=sb.SPINE;
  vm.createContext(sb);
  vm.runInContext(src.slice(a,b)+
    '\nthis.S=stagSample; this.R=stagReport; this.G=STAG;'+
    '\nthis.List=window.ahStaggers; this.One=window.ahStagger;'+
    '\nthis.Reset=window.ahStaggerReset;', sb, {filename:'g.js'});
  sb.__t=(v)=>{t=v;};
  sb.__warns=warns;
  return sb;
}
// simulate a real stagger: bouncing between two spots, aiming at two nodes
// ⚠ each call must start LATER than the previous one, or the 5Hz throttle
// silently drops every sample and the "second spot" never enters the ring.
// The first version of this helper hardcoded t=100 for both batches, so the
// failure it reported was mine, not the recorder's.
let STAG_T = 100;
function stagger(w, spotA, spotB, nodeA, nodeB, why, secs){
  const base = STAG_T; STAG_T += secs + 10;
  for(let i=0;i<secs*5;i++){
    w.__t(base + i*0.2);
    const even=i%2===0;
    w.AUTO.node = even ? {x:nodeA[0], z:nodeA[1]} : {x:nodeB[0], z:nodeB[1]};
    w.AUTO.nodeWhy = why;
    w.AUTO.state='NEXT_ROOM'; w.AUTO.roomId='r3'; w.AUTO.goalId='r5';
    w.S({ x: even?spotA[0]:spotB[0], z: even?spotA[1]:spotB[1] });
  }
}
// ---- 1. it names the two positions and the two targets ------------------
{
  const w=world();
  stagger(w, [10,20],[13,20], [25,20],[9,20], 'crossing-direct', 8);
  w.R('oscillating (eff 0.05)');
  R.warned = w.__warns.length;
  R.text = w.__warns;
  const rec=w.G.reports[0];
  R.identifies = { room:rec.room, goal:rec.goal, map:rec.map,
    spots:rec.spots.map(s=>s[0]), targets:rec.targets.map(s=>s[0]),
    whys:rec.whys.map(s=>s[0]), walked:rec.walked, net:rec.net };
  R.namesBothPositions = rec.spots.length>=2;
  R.namesBothTargets = rec.targets.length>=2;
  R.namesTheWhy = rec.whys[0][0]==='crossing-direct';
  R.walkedFarNetZero = rec.walked > 10 && rec.net < 4;
}
// ---- 2. ⚠ ONE REPORT PER SPOT — not per frame --------------------------
{
  const w=world();
  stagger(w, [10,20],[13,20], [25,20],[9,20], 'crossing', 8);
  for(let k=0;k<50;k++) w.R('oscillating');     // fires every tick in reality
  R.reportsForOneSpot = w.G.reports.length;
  R.onceOnly = w.G.reports.length===1;
  // a DIFFERENT spot does report
  stagger(w, [90,90],[93,90], [70,90],[95,90], 'sweep', 8);
  w.R('oscillating');
  R.afterSecondSpot = w.G.reports.length;
  R.newSpotReports = w.G.reports.length===2;
}
// ---- 3. the ring is fixed-size and does not grow -----------------------
{
  const w=world();
  for(let i=0;i<5000;i++){ w.__t(i*0.2); w.S({x:i%50, z:0}); }
  R.ring = { slots:w.G.ring.length, samplesTaken:w.G.n };
  R.ringFixed = w.G.ring.length===60;
}
// ---- 4. 5Hz throttle -----------------------------------------------------
{
  const w=world();
  w.__t(10); w.S({x:0,z:0});
  const after1=w.G.n;
  w.__t(10.05); w.S({x:1,z:0});    // 50ms later — must be ignored
  const after2=w.G.n;
  w.__t(10.30); w.S({x:2,z:0});    // 300ms — accepted
  R.throttle={ after1, after2, after3:w.G.n, ignoresFastCalls:after1===after2 };
}
// ---- 5. too short a window is not reported -----------------------------
{
  const w=world();
  w.__t(1); w.S({x:0,z:0}); w.__t(1.3); w.S({x:1,z:0});
  w.R('oscillating');
  R.shortWindowIgnored = w.G.reports.length===0;
}
console.log(JSON.stringify(R,null,1));
