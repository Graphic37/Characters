src = open('work.html', encoding='utf-8').read()
hits = {}
def rep(name, old, new, count=1):
    global src
    n = src.count(old)
    assert n == count, f"{name}: expected {count}, found {n}"
    src = src.replace(old, new); hits[name] = n

rep('sentry',
"""      const count = skillParams('sentry').count;
      const P=player.position;
      for(let i=0;i<count;i++){
        const a=(i-(count-1)/2)*1.3;
        spawnSentry(P.x+Math.cos(a)*1.4, P.z+Math.sin(a)*1.4, 14);
      }""",
"""      /* ⚠ THIS PLANTED AT A FIXED OFFSET WITH NO WALKABILITY CHECK. Standing
         with your back to a wall put a turret inside the stone: it still costs
         mana and a cooldown, still counts against the cap, and shoots nothing
         a player can see. `nearestStandable` already exists for exactly this
         (v179) — the sentry just never asked.
         Ordered fallbacks so a turret lands SOMEWHERE sensible rather than
         being skipped: the intended spot, then the nearest standable ground to
         it, then the caster's own feet, which are walkable by definition
         because she is standing on them. */
      const count = skillParams('sentry').count;
      const P=player.position;
      const solid=(x,z)=>{
        try{ return !!(window.DEPTHS && DEPTHS.walkableAt &&
                       DEPTHS.walkableAt(x,z)===false); }catch(e){ return false; }
      };
      for(let i=0;i<count;i++){
        const a=(i-(count-1)/2)*1.3;
        let sx=P.x+Math.cos(a)*1.4, sz=P.z+Math.sin(a)*1.4;
        if(solid(sx,sz)){
          const fix=window.nearestStandable ? nearestStandable(sx,sz,3.2) : null;
          if(fix && !solid(fix.x,fix.z)){ sx=fix.x; sz=fix.z; }
          else { sx=P.x; sz=P.z; }
          if(window.AUTO && AUTO.stats)
            AUTO.stats.sentryMoved=(AUTO.stats.sentryMoved||0)+1;
        }
        spawnSentry(sx, sz, 14);
      }""")

open('work.html','w',encoding='utf-8').write(src)
print('applied:', hits)
