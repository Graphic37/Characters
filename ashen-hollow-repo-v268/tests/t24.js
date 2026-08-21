const fs=require('fs'), vm=require('vm');
const src=fs.readFileSync('work.html','utf8');
const R={};

// ---- 1. drawHUD reads window.COMBAT, and a module const is NOT shared -----
R.combatFixed = /const C=window\.COMBAT\|\|\{\}; esNow = C\.es/.test(src);
R.bareCombatGone = !/esNow = COMBAT\.es/.test(src);
// prove the original failure mode: a module-scoped const is invisible to a
// classic script, which is why the catch fired 5 times in his run
{
  const sb={console}; sb.window=sb; vm.createContext(sb);
  vm.runInContext('const COMBAT={es:96,maxEs:96}; this.window.COMBAT=COMBAT;', sb);
  let bare=null, viaWin=null;
  try{ vm.runInContext('bareRead = (typeof COMBAT!=="undefined")', sb); bare=sb.bareRead; }catch(e){ bare='threw'; }
  viaWin = sb.window.COMBAT.es;
  R.proof={ viaWindow:viaWin };
}

// ---- 2. the sweep now commits --------------------------------------------
const sa=src.indexOf("    AUTO.state='TRAVEL';\n    cur.cleared=true;");
const sbnd=src.indexOf("autoSetPath(alt,'sweep');", sa);
const sweep=src.slice(sa, sbnd+40);
R.sweep={ holdsDestination:/AUTO\.sweep=\{ room:cur\.id/.test(sweep),
          reusesHeld:/if\(held && held\.room===cur\.id/.test(sweep),
          rotatesNotRandom:/sweepIdx\|0\)\+1\) % list\.length/.test(sweep),
          randomGone:!/Math\.random\(\)/.test(sweep) };

// simulate the OLD vs NEW node choice over 20 clears of a 3-node room
function oldPick(nodes){ return 1+Math.floor(Math.random()*Math.max(1,nodes.length-1)); }
const nodes=[0,1,2];
let oldSeq=[], newSeq=[], idx=0;
for(let k=0;k<12;k++){ oldSeq.push(oldPick(nodes)); idx=(idx+1)%nodes.length; newSeq.push(idx); }
const revisits=(seq)=>seq.filter((v,i)=>i>0&&v===seq[i-1]).length;
R.sweepSequence={ oldImmediateRepeats:revisits(oldSeq), newImmediateRepeats:revisits(newSeq),
                  oldCoversNode0: oldSeq.includes(0), newCoversAll:new Set(newSeq).size===3 };

// ---- 3. an in-wall enemy stops counting ----------------------------------
const ea=src.indexOf('function enemyLost(e, now){');
const eb=src.indexOf('function autoRoomEnemyCounts(){');
const ec=src.indexOf('  return m;\n}', eb)+13;
const code=src.slice(ea, ec);
function run(walkable, ignoreUntil){
  const enemies=[
    {dead:false, g:{position:{x:10,z:10}}, autoIgnoreUntil:0},           // fine
    {dead:false, g:{position:{x:20,z:20}}, autoIgnoreUntil:ignoreUntil}, // ignored
    {dead:false, g:{position:{x:30,z:30}}, autoIgnoreUntil:0},           // in wall
    {dead:true,  g:{position:{x:40,z:40}}, autoIgnoreUntil:0},
  ];
  const sb={console, ENEMIES:enemies, performance:{now:()=>100000},
    RIFT:{nav:{rooms:[]}},
    navRoomAt:(x,z)=>({id:'r10'}),
    DEPTHS:{ walkableAt:(x,z)=> walkable(x,z) }};
  sb.window=sb; sb.window.DEPTHS=sb.DEPTHS;
  vm.createContext(sb);
  vm.runInContext(code+'\nthis.C=autoRoomEnemyCounts; this.L=enemyLost;', sb, {filename:'e.js'});
  const m=sb.C();
  return { counted:m.get('r10')||0, inWallFlagged:!!enemies[2].lostInWall };
}
R.enemyCounts = run((x,z)=> !(x===30), 200000);   // the x=30 one is inside a wall
R.expected = 'counted 1 of 4: one alive+reachable, one ignored, one in wall, one dead';
R.allCountedWhenAllFine = run(()=>true, 0).counted;   // 3 alive, none lost
console.log(JSON.stringify(R,null,1));
