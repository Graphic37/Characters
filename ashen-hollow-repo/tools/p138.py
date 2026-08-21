src = open('work.html', encoding='utf-8').read()
hits = {}
def rep(name, old, new, count=1):
    global src
    n = src.count(old)
    assert n == count, f"{name}: expected {count}, found {n}"
    src = src.replace(old, new); hits[name] = n

# ============================================ ONE PREDICATE
rep('pred',
"""function attachEliteGlow(e, rarity){""",
"""/* ⚠ THE RING AND THE BAR ASKED DIFFERENT QUESTIONS. The marker was attached on
   `rarity==='magic'||'rare'`; the health bar (v241) keyed on `elitePack`. Those
   are different fields, so an enemy could carry one and not the other — a blue
   ring with no bar reads as "this one is special but I cannot see its health",
   which is exactly what he spotted.
   ONE predicate, used by both. `elitePack` is the spawn marker and `rarity` is
   the loot tier; an enemy is an elite if EITHER says so, and both readouts now
   agree by construction rather than by two lists happening to match. */
function isEliteEnemy(e){
  if(!e) return false;
  return !!e.elitePack || e.isBoss ||
         e.rarity==='rare' || e.rarity==='magic';
}
window.isEliteEnemy=isEliteEnemy;

function attachEliteGlow(e, rarity){""")

rep('attach',
"""  if(rarity==='magic' || rarity==='rare') attachEliteGlow(e, rarity);""",
"""  /* the same predicate the health bar uses, so the two can never disagree */
  if(isEliteEnemy(e)) attachEliteGlow(e, (e.elitePack==='rare'||rarity==='rare') ? 'rare' : 'magic');""")

rep('bar',
"""    const isElite = !!e.elitePack || e.isBoss || e.rarity==='rare' || e.rarity==='magic';""",
"""    const isElite = window.isEliteEnemy ? isEliteEnemy(e)
                  : (!!e.elitePack || e.isBoss || e.rarity==='rare' || e.rarity==='magic');""")

open('work.html','w',encoding='utf-8').write(src)
print('applied:', hits)
