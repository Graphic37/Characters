src = open('work.html', encoding='utf-8').read()
hits = {}
def rep(name, old, new, count=1):
    global src
    n = src.count(old)
    assert n == count, f"{name}: expected {count}, found {n}"
    src = src.replace(old, new); hits[name] = n

rep('dedupe',
"""      const wantBar = (mode==='always') ? true
                  : (mode==='off') ? (e.rarity!=='normal'||e.isBoss)
                  : (recent || e.isBoss || e.rarity==='rare');""",
"""      let wantBar = (mode==='always') ? true
                  : (mode==='off') ? (e.rarity!=='normal'||e.isBoss)
                  : (recent || e.isBoss || e.rarity==='rare');
      /* ⚠ THE HEAD PLATE ALREADY SHOWS THIS ENEMY'S HEALTH. v198 put a named
         plate with its own bar over the elite being fought; the instanced bar
         then drew a second, smaller bar a few pixels above it — two readouts
         of one number, stacked. Suppress the instanced one for exactly the
         enemy the plate is describing.
         Scoped to that ONE enemy on purpose: every other elite on screen still
         needs its bar, because the plate only ever describes one of them. */
      try{
        if(wantBar && window.HEADPLATE_OWNER && HEADPLATE_OWNER()===e) wantBar=false;
      }catch(err){ window.ahErr&&window.ahErr(err,'actorsTick:plateDedupe'); }""")

# expose who the plate currently owns — the plate module holds it privately
rep('owner',
"""window.updateHeadPlate=updateHeadPlate;""",
"""window.updateHeadPlate=updateHeadPlate;
/* who the head plate is currently describing, or null. Read by the instanced
   health-bar pass so the two never draw the same enemy's health twice. */
window.HEADPLATE_OWNER=function(){
  return (HEADPLATE.e && !HEADPLATE.e.dead &&
          performance.now()/1000 <= HEADPLATE.until) ? HEADPLATE.e : null;
};""")

open('work.html','w',encoding='utf-8').write(src)
print('applied:', hits)
