src = open('work.html', encoding='utf-8').read()
hits = {}
def rep(name, old, new, count=1):
    global src
    n = src.count(old)
    assert n == count, f"{name}: expected {count}, found {n}"
    src = src.replace(old, new); hits[name] = n

# ===================================================== 1. COMBAT IS NOT DEFINED
# ⚠ THE ERROR REPORTER'S FIRST REAL CATCH. `const COMBAT` is declared at the top
# level of the MODULE block; drawHUD lives in a CLASSIC block. Classic scripts
# share a script scope with each other, but a module's top level is private, so
# bare COMBAT is a ReferenceError there — every single time drawHUD runs.
# Consequence: esNow/esMax were pinned at 0, so the energy shield has NEVER
# rendered on the globe and the readout always said "Shield 0/0". The v164 clip
# fix was correct and invisible, because it was clipping a zero.
rep('combat-scope',
"""  try{ esNow = COMBAT.es||0; esMax = COMBAT.maxEs||0; }catch(e){ window.ahErr&&window.ahErr(e,'drawHUD:5199'); }""",
"""  /* window.COMBAT, not bare COMBAT: it is declared inside the MODULE block and
     a module's top level is NOT part of the scope classic scripts share. */
  try{ const C=window.COMBAT||{}; esNow = C.es||0; esMax = C.maxEs||0; }
  catch(e){ window.ahErr&&window.ahErr(e,'drawHUD:esRead'); }""")

# ===================================================== 2. THE SWEEP RE-ROLLED
# `cur.nodes[1 + random]` was evaluated EVERY time the node cleared, so she
# walked to node A, arrived, drew node B, walked back, drew A again. That is his
# 10.8m walked for 0.9m of progress. A sweep destination has to be committed to.
rep('sweep-commit',
"""    AUTO.state='TRAVEL';
    cur.cleared=true;
    const alt=cur.nodes[1+Math.floor(Math.random()*Math.max(1,cur.nodes.length-1))]||cur.nodes[0];
    autoSetPath(alt,'sweep');
    return;""",
"""    AUTO.state='TRAVEL';
    cur.cleared=true;
    /* ⚠ COMMIT THE SWEEP. This drew a FRESH RANDOM node every time the previous
       one cleared, so she ping-ponged between two nodes of the same room —
       measured in his run as 10.8m walked for 0.9m of net progress, efficiency
       0.09, with 315 repaths. Hold one destination until she arrives or six
       seconds pass, and rotate through the nodes in order rather than by dice,
       so a sweep actually covers the room instead of revisiting one corner. */
    const nowS2=performance.now()/1000;
    const held=AUTO.sweep;
    if(held && held.room===cur.id && nowS2<held.until &&
       autoDist(P, held.at) >= AUTO_CFG.arriveAt){
      if(!AUTO.node) autoSetPath(held.at,'sweep');
      return;
    }
    const list=(cur.nodes && cur.nodes.length) ? cur.nodes : [cur.nodes[0]];
    const idx=((AUTO.sweepIdx|0)+1) % list.length;
    AUTO.sweepIdx=idx;
    const alt=list[idx]||cur.nodes[0];
    AUTO.sweep={ room:cur.id, at:alt, until:nowS2+6 };
    autoSetPath(alt,'sweep');
    return;""")

# ===================================================== 3. AN ENEMY IN A WALL
# It cannot be shot (no line of sight) so it is never targeted, but it is still
# COUNTED in its room — so autoGoalRoom kept returning "this room", the sweep
# ran forever and the run never moved on. His report: "1 enemies outside the
# walls", nearest mob IN WALL, sameRoom=true, atk=none.
rep('lost-enemies',
"""function autoRoomEnemyCounts(){
  const m=new Map();
  const nowR=performance.now()/1000;
  if(RIFT.nav) RIFT.nav.rooms.forEach(r=>{ if(r.autoAvoidUntil && r.autoAvoidUntil<nowR) r.autoAvoidUntil=0; });
  for(const e of ENEMIES){
    if(e.dead) continue;
    const r=navRoomAt(e.g.position.x, e.g.position.z);
    if(r) m.set(r.id,(m.get(r.id)||0)+1);
  }
  return m;
}""",
"""/* An enemy standing inside the geometry can never be reached or shot, and an
   enemy nobody has had line of sight to for a long time is the same problem
   wearing a different hat. Either way it must stop COUNTING, or the room it is
   in stays the goal forever and Auto sweeps it until the timer runs out. */
function enemyLost(e, now){
  if(e.autoIgnoreUntil > now) return true;
  try{
    if(window.DEPTHS && DEPTHS.walkableAt &&
       DEPTHS.walkableAt(e.g.position.x, e.g.position.z)===false){
      /* inside the walls: unkillable by definition, not merely awkward */
      e.autoIgnoreUntil=now+1e9;
      e.lostInWall=true;
      return true;
    }
  }catch(err){ window.ahErr&&window.ahErr(err,'enemyLost'); }
  return false;
}
window.enemyLost=enemyLost;

function autoRoomEnemyCounts(){
  const m=new Map();
  const nowR=performance.now()/1000;
  if(RIFT.nav) RIFT.nav.rooms.forEach(r=>{ if(r.autoAvoidUntil && r.autoAvoidUntil<nowR) r.autoAvoidUntil=0; });
  for(const e of ENEMIES){
    if(e.dead) continue;
    if(enemyLost(e, nowR)) continue;        /* unreachable: not a reason to stay */
    const r=navRoomAt(e.g.position.x, e.g.position.z);
    if(r) m.set(r.id,(m.get(r.id)||0)+1);
  }
  return m;
}""")

# an enemy with no line of sight for 9s in the goal room is treated the same way
rep('no-los-timeout',
"""      /* no line of sight, no engagement -- committing to a target behind a wall
         is what left him standing still waiting to fire through it */
      if(typeof clearLine==='function' && !clearLine(P.x,P.z,e.g.position.x,e.g.position.z)) continue;""",
"""      /* no line of sight, no engagement -- committing to a target behind a wall
         is what left him standing still waiting to fire through it */
      if(typeof clearLine==='function' && !clearLine(P.x,P.z,e.g.position.x,e.g.position.z)){
        /* ...but a skipped enemy still COUNTS toward its room, so one that is
           never visible pins the goal here forever. Nine seconds of no line of
           sight while standing in its own room and it is set aside. */
        const nowL2=performance.now()/1000;
        if(navRoomAt(e.g.position.x,e.g.position.z)===cur){
          if(!e.noLosSince) e.noLosSince=nowL2;
          else if(nowL2-e.noLosSince > 9){
            e.autoIgnoreUntil=nowL2+25; e.noLosSince=0;
            AUTO.stats.lostSkipped=(AUTO.stats.lostSkipped||0)+1;
          }
        }
        continue;
      }
      e.noLosSince=0;""")

open('work.html','w',encoding='utf-8').write(src)
print('applied:', hits)
