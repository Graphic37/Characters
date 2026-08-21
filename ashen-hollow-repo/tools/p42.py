src = open('work.html', encoding='utf-8').read()
hits = {}
def rep(name, old, new, count=1):
    global src
    n = src.count(old)
    assert n == count, f"{name}: expected {count}, found {n}"
    src = src.replace(old, new); hits[name] = n

# ================================================= 1. SNAP ONCE, THEN REMEMBER
# ⚠ v179 CONVERTED A HARD STALL INTO A BUSY LOOP. The door node for r0->r1 is
# permanently inside geometry, so it was re-snapped on EVERY tick: 33,001 snaps
# against 33,042 repaths in his run. The snap was right; doing it forever was
# not. Correct it once and keep the answer.
rep('snap-cache',
"""function autoSetNode(nd, why){
  if(!nd) return;""",
"""/* A node that needed correcting keeps its correction. Keyed by the node's own
   identity where it has one (nav nodes are shared objects), else by rounded
   position, so a door that is permanently badly placed is fixed once for the
   whole run instead of once per frame. */
const SNAP_CACHE = new Map();
function snapKey(nd){
  return (nd && nd.id) ? ('id:'+nd.id)
       : ('p:'+Math.round(nd.x*4)+','+Math.round(nd.z*4));
}
window.SNAP_CACHE=SNAP_CACHE;

function autoSetNode(nd, why){
  if(!nd) return;""")

rep('snap-body',
"""      if(DEPTHS.walkableAt(nd.x, nd.z)===false){
        const fix=nearestStandable(nd.x, nd.z, 7);
        if(fix){
          AUTO.stats.nodeSnapped=(AUTO.stats.nodeSnapped||0)+1;
          nd={ x:fix.x, z:fix.z, id:nd.id, room:nd.room };
          why=(why||'')+'-snapped';
        } else {""",
"""      if(DEPTHS.walkableAt(nd.x, nd.z)===false){
        const key=snapKey(nd);
        let fix=SNAP_CACHE.get(key);
        if(fix===undefined){
          fix=nearestStandable(nd.x, nd.z, 7);
          SNAP_CACHE.set(key, fix||null);      /* null is an answer too */
          AUTO.stats.nodeSnapped=(AUTO.stats.nodeSnapped||0)+1;
        }
        if(fix){
          nd={ x:fix.x, z:fix.z, id:nd.id, room:nd.room };
          why=(why||'')+'-snapped';
          /* ⚠ A DESTINATION HE IS ALREADY STANDING ON IS NOT A DESTINATION.
             The snap can land beside him — his run had dist 0.4 against an
             arrival radius of 1.5, so he "arrived" instantly, the state machine
             re-issued the same goal, and nothing ever moved. Refuse it and let
             the caller choose something else. */
          const P0=player.position;
          if(Math.hypot(nd.x-P0.x, nd.z-P0.z) < (AUTO_CFG.arriveAt||1.5)){
            AUTO.stats.nodeUseless=(AUTO.stats.nodeUseless||0)+1;
            return;
          }
        } else {""")

# ================================================= 2. NO REPATH WITHOUT CHANGE
rep('path-noop',
"""function autoSetPath(dest, why){
  if(!dest) return;
  AUTO.stats.pathSet=(AUTO.stats.pathSet||0)+1;""",
"""function autoSetPath(dest, why){
  if(!dest) return;
  /* ⚠ THE REPATH STORM. Several branches call this EVERY TICK with the same
     destination — the crossing branch is unconditional. Recomputing a route to
     a place we are already routed to costs a full navPath per frame and, when
     the destination is bad, produces the 33,000 repaths in his report.
     If the destination has not moved and a node is still live, leave it alone. */
  if(AUTO.node && AUTO.pathDest &&
     Math.abs(AUTO.pathDest.x-dest.x) < 0.05 &&
     Math.abs(AUTO.pathDest.z-dest.z) < 0.05 &&
     AUTO.pathWhy===why){
    AUTO.stats.pathKept=(AUTO.stats.pathKept||0)+1;
    return;
  }
  AUTO.pathDest={ x:dest.x, z:dest.z };
  AUTO.stats.pathSet=(AUTO.stats.pathSet||0)+1;""")

# a node that is cleared must release the held destination, or nothing re-paths
rep('path-clear',
"""  AUTO.node=nd;
  AUTO.nodeSince=performance.now()/1000;""",
"""  AUTO.node=nd;
  AUTO.nodeSince=performance.now()/1000;
  AUTO.nodeSetAt={ x:nd.x, z:nd.z };""")

rep('path-release',
"""function autoDist(a,b){ return Math.hypot(a.x-b.x, a.z-b.z); }""",
"""/* Clearing the node must also clear the remembered destination, or the guard
   above would refuse to ever path again. One helper, so the two cannot drift. */
function autoClearNode(){
  AUTO.node=null; AUTO.pathDest=null; AUTO.path=null; AUTO.pathWhy=null;
}
window.autoClearNode=autoClearNode;

function autoDist(a,b){ return Math.hypot(a.x-b.x, a.z-b.z); }""")

# ================================================= 3. GIVE UP ON A BAD CROSSING
rep('crossing-giveup',
"""    } else {
      const tgtRoom=nav.byId.get(AUTO.crossing.to);
      const entry=navDoorNode(nav, AUTO.crossing.to, cur.id) ||
                  (tgtRoom&&tgtRoom.nodes[0]);""",
"""    } else {
      /* ⚠ IF THE DOOR CANNOT BE STOOD ON, THE CROSSING CANNOT BE MADE. Snapping
         proved the target is inside geometry; retrying it for the full crossing
         window just burns the clock. Avoid the room for 30s and let the goal
         picker send her somewhere she can actually reach — the same treatment
         the stalemate watchdog already applies. */
      const tgtRoom=nav.byId.get(AUTO.crossing.to);
      let entry=navDoorNode(nav, AUTO.crossing.to, cur.id) ||
                (tgtRoom&&tgtRoom.nodes[0]);
      if(entry && window.SNAP_CACHE && SNAP_CACHE.get(snapKey(entry))===null){
        if(tgtRoom) tgtRoom.autoAvoidUntil=nowC+30;
        AUTO.stats.crossingAbandoned=(AUTO.stats.crossingAbandoned||0)+1;
        AUTO.crossing=null;
        entry=null;
      }""")

# the cache must not outlive the map it describes
rep('cache-clear',
"""function clearRift(){""",
"""function clearRift(){
  /* node corrections describe THIS layout only */
  try{ if(window.SNAP_CACHE) SNAP_CACHE.clear(); }catch(e){ window.ahErr&&window.ahErr(e,'clearRift:snapCache'); }""")

rep('status2',
"""      L.push('  node fixes: snapped='+(AUTO.stats.nodeSnapped||0)+""",
"""      L.push('  paths: set='+(AUTO.stats.pathSet||0)+'  kept='+(AUTO.stats.pathKept||0)+
             '  useless nodes='+(AUTO.stats.nodeUseless||0)+
             '  crossings abandoned='+(AUTO.stats.crossingAbandoned||0));
      L.push('  node fixes: snapped='+(AUTO.stats.nodeSnapped||0)+""")

open('work.html','w',encoding='utf-8').write(src)
print('applied:', hits)
