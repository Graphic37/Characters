src = open('work.html', encoding='utf-8').read()
hits = {}
def rep(name, old, new, count=1):
    global src
    n = src.count(old)
    assert n == count, f"{name}: expected {count}, found {n}"
    src = src.replace(old, new); hits[name] = n

# ⚠ THE SPAWN WAS NEVER THE ONLY WAY IN.
# v179 validated spawn POSITIONS, and his dump still shows "1 enemies outside
# the walls" with `spawns rejected=0`. Enemy movement — both the leash return
# and the chase — writes `e.g.position.set(...)` with NO walk-grid check, so a
# mob that spawned legally can walk into geometry afterwards.
# v170 then marks it ignored FOREVER (`autoIgnoreUntil = now + 1e9`), which
# stops it pinning the goal but also means its kill credit is gone for good.
# At `progress 19/209` with 226 alive, enough of those and the rift cannot be
# completed at all.
# So: rescue them, don't just ignore them.

rep('rescue',
"""function enemyLost(e, now){""",
"""/* ===========================================================================
   ENEMY RESCUE SWEEP
   ---------------------------------------------------------------------------
   ⚠ COST FIRST: 226 enemies x a 5-probe `walkableAt` every frame is ~1100
   probes a frame, which is not affordable. This walks a SLICE per frame in
   round-robin, so the whole population is checked every ~20 frames (a third of
   a second) for about 60 probes a frame — the same trick the loot scanner uses.
   ========================================================================= */
const ERESCUE = { i:0, perFrame:12 };
function rescueStuckEnemies(){
  try{
    if(!window.RIFT || !RIFT.active) return;
    if(!window.ENEMIES || !ENEMIES.length) return;
    if(!window.DEPTHS || !DEPTHS.walkableAt || !window.nearestStandable) return;
    const n=ENEMIES.length;
    const count=Math.min(ERESCUE.perFrame, n);
    for(let k=0;k<count;k++){
      ERESCUE.i = (ERESCUE.i+1) % n;
      const e=ENEMIES[ERESCUE.i];
      if(!e || e.dead || !e.g) continue;
      const p=e.g.position;
      if(DEPTHS.walkableAt(p.x, p.z)!==false) continue;
      const fix=nearestStandable(p.x, p.z, 6);
      if(!fix) continue;                     /* genuinely walled in: leave it */
      p.set(fix.x, (typeof groundAt==='function'?groundAt(fix.x,fix.z):p.y), fix.z);
      /* ⚠ CLEAR THE PERMANENT IGNORE. enemyLost() sets autoIgnoreUntil to
         now+1e9 for an in-wall mob. Rescuing the body without clearing the flag
         would leave a reachable enemy that Auto refuses to look at forever —
         the progress would still never be earned. */
      e.autoIgnoreUntil=0;
      e.lostInWall=false;
      e.noLosSince=0;
      /* it walked there once; re-anchor the leash so it does not immediately
         walk back into the same wall */
      if(e.home){ e.home.x=fix.x; e.home.z=fix.z; }
      if(window.AUTO && AUTO.stats)
        AUTO.stats.enemyRescued=(AUTO.stats.enemyRescued||0)+1;
    }
  }catch(err){ window.ahErr&&window.ahErr(err,'rescueStuckEnemies'); }
}
window.rescueStuckEnemies=rescueStuckEnemies;

function enemyLost(e, now){""")

rep('tick',
"""  window.updatePackBar && window.updatePackBar();""",
"""  window.updatePackBar && window.updatePackBar();
  window.rescueStuckEnemies && window.rescueStuckEnemies();""")

# report it, so the next dump says whether this is happening constantly
rep('status',
"""      L.push('  node fixes: snapped='+(AUTO.stats.nodeSnapped||0)+""",
"""      L.push('  enemies rescued from walls='+(AUTO.stats.enemyRescued||0));
      L.push('  node fixes: snapped='+(AUTO.stats.nodeSnapped||0)+""")

open('work.html','w',encoding='utf-8').write(src)
print('applied:', hits)
