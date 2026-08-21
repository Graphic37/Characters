// enemies that walk into geometry must be rescued, cheaply
const fs=require('fs'), vm=require('vm');
const src=fs.readFileSync('work.html','utf8');
const R={};
const na=src.indexOf('function nearestStandable(x, z, maxR){');
const nb=src.indexOf('window.nearestStandable=nearestStandable;');
const a=src.indexOf('const ERESCUE = { i:0, perFrame:12 };');
const b=src.indexOf('function enemyLost(e, now){');

// a wall from x 20..30
const walk=(x,z)=> !(x>=20 && x<30);
function world(enemies){
  let probes=0;
  const sb={ console, Math, ENEMIES:enemies, RIFT:{active:true},
    DEPTHS:{ walkableAt:(x,z)=>{ probes++; return walk(x,z); } },
    AUTO:{stats:{}}, groundAt:()=>0 };
  sb.window=sb; sb.window.DEPTHS=sb.DEPTHS; sb.window.RIFT=sb.RIFT;
  vm.createContext(sb);
  vm.runInContext(src.slice(na,nb)+'\nwindow.nearestStandable=nearestStandable;\n'+
    src.slice(a,b)+'\nthis.R=rescueStuckEnemies; this.E=ERESCUE;', sb, {filename:'r.js'});
  sb.__probes=()=>probes;
  return sb;
}
const mob=(x,z,extra)=>Object.assign({dead:false, autoIgnoreUntil:0,
  g:{position:{x,z,y:0,set(a,b,c){this.x=a;this.y=b;this.z=c;}}},
  home:{x,z}}, extra||{});

// ---- 1. a mob inside the wall is moved out, and un-ignored -------------
{
  const stuck=mob(25,50,{autoIgnoreUntil:1e12, lostInWall:true, noLosSince:99});
  const fine =mob(5,50);
  const w=world([stuck,fine]);
  for(let i=0;i<10;i++) w.R();            // enough passes to reach both
  R.rescued = { movedTo:{x:+stuck.g.position.x.toFixed(1), z:+stuck.g.position.z.toFixed(1)},
    nowWalkable: walk(stuck.g.position.x, stuck.g.position.z),
    ignoreCleared: stuck.autoIgnoreUntil===0,
    flagCleared: stuck.lostInWall===false,
    losReset: stuck.noLosSince===0,
    leashReanchored: stuck.home.x!==25,
    count: w.AUTO.stats.enemyRescued };
  R.healthyUntouched = fine.g.position.x===5 && fine.home.x===5;
}
// ---- 2. ⚠ COST: a slice per frame, not the whole population ------------
{
  const many=[]; for(let i=0;i<226;i++) many.push(mob(i%40, 50));
  const w=world(many);
  w.R();
  R.cost = { enemies:226, probesInOneFrame:w.__probes(),
             perFrame:w.E.perFrame,
             framesForFullSweep:Math.ceil(226/w.E.perFrame) };
  R.affordable = w.__probes() < 100;
}
// ---- 3. round-robin actually covers everyone --------------------------
{
  const many=[]; for(let i=0;i<30;i++) many.push(mob(25, 50));   // ALL in the wall
  const w=world(many);
  for(let f=0;f<Math.ceil(30/12);f++) w.R();
  R.coverage = { rescued:w.AUTO.stats.enemyRescued, of:30,
                 allOut: many.every(m=>walk(m.g.position.x, m.g.position.z)) };
}
// ---- 4. a hopeless mob (nothing legal nearby) is left alone, not looped -
{
  const sb={ console, Math, ENEMIES:[mob(25,50)], RIFT:{active:true},
    DEPTHS:{ walkableAt:()=>false }, AUTO:{stats:{}}, groundAt:()=>0 };
  sb.window=sb; sb.window.DEPTHS=sb.DEPTHS; sb.window.RIFT=sb.RIFT;
  vm.createContext(sb);
  vm.runInContext(src.slice(na,nb)+'\nwindow.nearestStandable=nearestStandable;\n'+
    src.slice(a,b)+'\nthis.R=rescueStuckEnemies;', sb, {filename:'h.js'});
  let threw=false; try{ for(let i=0;i<5;i++) sb.R(); }catch(e){ threw=true; }
  R.hopelessSafe = { threw, rescued:sb.AUTO.stats.enemyRescued||0 };
}
// ---- 5. inert outside a rift ------------------------------------------
{
  const m=mob(25,50);
  const sb=world([m]); sb.RIFT.active=false; sb.window.RIFT=sb.RIFT;
  sb.R();
  R.inertOutsideRift = m.g.position.x===25;
}
console.log(JSON.stringify(R,null,1));
