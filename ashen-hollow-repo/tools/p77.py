src = open('work.html', encoding='utf-8').read()
hits = {}
def rep(name, old, new, count=1):
    global src
    n = src.count(old)
    assert n == count, f"{name}: expected {count}, found {n}"
    src = src.replace(old, new); hits[name] = n

# 1. an ENEMY fuse must hit the PLAYER, not run areaHit against enemies
rep('fuse',
"""    const f=FUSES[i]; f.t-=dt;
    if(f.t<=0){
      areaHit(f.x,f.z,f.r, 2.2, 'explosive');""",
"""    const f=FUSES[i]; f.t-=dt;
    if(f.t<=0){
      /* ⚠ FUSES WERE THE PLAYER'S ONLY. `areaHit` damages ENEMIES, so an elite
         mortar routed through it would have healed nobody and hurt the monsters
         — a telegraph with no consequence, which is worse than none at all.
         An enemy fuse takes the mirror path through `takeHit`. */
      if(f.enemy){
        try{
          const P3=player.position;
          const d=Math.hypot(P3.x-f.x, P3.z-f.z);
          if(d <= f.r){
            /* full damage at the centre, tapering to 40% at the rim, so
               clipping the edge is meaningfully better than eating it */
            const fall=1 - 0.6*(d/f.r);
            takeHit(Math.max(1, (f.dmg||8)*2.0*fall), f.dmgType||'fire', 'attack');
          }
        }catch(e){ window.ahErr&&window.ahErr(e,'fuse:enemy'); }
      } else {
        areaHit(f.x,f.z,f.r, 2.2, 'explosive');
      }""")

# 2. remember WHICH mods an enemy rolled, as objects — the tick needs them
rep('modDefs',
"""    m.apply(e); e.mods.push(m.n);""",
"""    /* ⚠ `e.mods` held only NAMES (strings) — fine for the plate, useless for a
       tick that has to call `M.tick()`. Keep the definitions too. */
    if(m.apply) m.apply(e);
    e.mods.push(m.n);
    (e.modDefs=e.modDefs||[]).push(m);""")

# 3. Vampiric has to actually leech
rep('leech',
"""window.onPlayerHit=function(e, dmg){""",
"""window.onPlayerHit=function(e, dmg){
  /* Vampiric: heal from what it lands, capped at its own maximum */
  try{
    if(e && e.leech && !e.dead && e.hp < e.maxHp)
      e.hp = Math.min(e.maxHp, e.hp + Math.max(1, dmg*e.leech));
  }catch(err){ window.ahErr&&window.ahErr(err,'leech'); }""")

# 4. onDeath affixes (Plaguebearer's parting gift)
rep('death',
"""  if(!silent && typeof window.onEnemyKilled==='function'""",
"""  try{
    if(e && e.modDefs) e.modDefs.forEach(M=>{
      if(M.onDeath){ try{ M.onDeath(e); }catch(x){ window.ahErr&&window.ahErr(x,'affixDeath:'+M.id); } }
    });
  }catch(x){ window.ahErr&&window.ahErr(x,'affixDeath'); }
  if(!silent && typeof window.onEnemyKilled==='function'""")

open('work.html','w',encoding='utf-8').write(src)
print('applied:', hits)
