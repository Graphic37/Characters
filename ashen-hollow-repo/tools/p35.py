src = open('work.html', encoding='utf-8').read()
hits = {}
def rep(name, old, new, count=1):
    global src
    n = src.count(old)
    assert n == count, f"{name}: expected {count}, found {n}"
    src = src.replace(old, new); hits[name] = n

# ===================================================== 1. SNAP EVERY NODE
# His report: state NEXT_ROOM, why "to-doorway-direct", node IN WALL, age 2.6s,
# dist 7.1, stuck=640, repaths=2431, efficiency 0.11. The DESTINATION itself was
# unwalkable, so arrival was impossible and every fix layered above it — the
# slide, the feelers, the sweep commitment — was working perfectly on a target
# that could never be reached.
rep('snap-node',
"""function autoSetNode(nd, why){
  if(!nd) return;
  AUTO.node=nd;""",
"""/* The nearest point she can actually stand on. Spiral outward in rings rather
   than scanning a box, so the first hit is genuinely the closest and a node
   only a few centimetres inside a jamb barely moves. */
function nearestStandable(x, z, maxR){
  try{
    if(!window.DEPTHS || !DEPTHS.walkableAt) return null;
    if(DEPTHS.walkableAt(x,z)!==false) return { x:x, z:z };
    const R=maxR||7;
    for(let r=0.5; r<=R; r+=0.5){
      const steps=Math.max(8, Math.round(r*8));
      for(let i=0;i<steps;i++){
        const a=(i/steps)*6.283;
        const nx=x+Math.cos(a)*r, nz=z+Math.sin(a)*r;
        if(DEPTHS.walkableAt(nx,nz)!==false) return { x:nx, z:nz };
      }
    }
  }catch(e){ window.ahErr&&window.ahErr(e,'nearestStandable'); }
  return null;
}
window.nearestStandable=nearestStandable;

function autoSetNode(nd, why){
  if(!nd) return;
  /* ⚠ ONE CHOKE POINT FOR EVERY DESTINATION. Waypoints, sweeps, doorways and
     the direct fallback all arrive here, so validating once covers every path
     Auto can ever take — including any added later. A node inside geometry can
     never be arrived at: she walks into the wall, `stuck` climbs, the path is
     recomputed, and the new path ends at the same illegal point. That is his
     2431 repaths and 640 stuck events. */
  if(window.RIFT && RIFT.active && window.DEPTHS && DEPTHS.walkableAt){
    try{
      if(DEPTHS.walkableAt(nd.x, nd.z)===false){
        const fix=nearestStandable(nd.x, nd.z, 7);
        if(fix){
          AUTO.stats.nodeSnapped=(AUTO.stats.nodeSnapped||0)+1;
          nd={ x:fix.x, z:fix.z, id:nd.id, room:nd.room };
          why=(why||'')+'-snapped';
        } else {
          /* nowhere legal within 7m: refusing is better than committing to a
             target that guarantees a stall */
          AUTO.stats.nodeRejected=(AUTO.stats.nodeRejected||0)+1;
          return;
        }
      }
    }catch(e){ window.ahErr&&window.ahErr(e,'autoSetNode:snap'); }
  }
  AUTO.node=nd;""")

# ===================================================== 2. NO ENEMY IN A WALL
# "5 enemies outside the walls" — v170 stopped them PINNING the goal, but the
# spawn itself was never fixed, so every floor still buries a few mobs in
# geometry where they cannot be reached, shot, or counted.
rep('snap-spawn',
"""function spawnEnemy(x, z, level, forceRarity, forceKind){""",
"""function spawnEnemy(x, z, level, forceRarity, forceKind){
  /* ⚠ VALIDATE THE SPAWN POINT. v170 made an enemy in a wall stop holding the
     room; this stops it happening. An unreachable mob is dead weight either
     way — it cannot fight, cannot be killed, and inflates the alive count. */
  if(window.RIFT && RIFT.active && window.nearestStandable){
    const fix=nearestStandable(x, z, 6);
    if(fix){ x=fix.x; z=fix.z; }
    else if(window.DEPTHS && DEPTHS.walkableAt && DEPTHS.walkableAt(x,z)===false){
      if(window.AUTO && AUTO.stats) AUTO.stats.spawnRejected=(AUTO.stats.spawnRejected||0)+1;
      return null;                 /* better one fewer enemy than one in a wall */
    }
  }""")

# ===================================================== 3. REPORT THE NEW COUNTERS
rep('status',
"""      L.push('  stats stuck='+AUTO.stats.stuck+' retarget='+AUTO.stats.retarget+""",
"""      L.push('  node fixes: snapped='+(AUTO.stats.nodeSnapped||0)+
             '  rejected='+(AUTO.stats.nodeRejected||0)+
             '  spawns rejected='+(AUTO.stats.spawnRejected||0));
      L.push('  stats stuck='+AUTO.stats.stuck+' retarget='+AUTO.stats.retarget+""")

open('work.html','w',encoding='utf-8').write(src)
print('applied:', hits)
