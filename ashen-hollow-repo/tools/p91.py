src = open('work.html', encoding='utf-8').read()
hits = {}
def rep(name, old, new, count=1):
    global src
    n = src.count(old)
    assert n == count, f"{name}: expected {count}, found {n}"
    src = src.replace(old, new); hits[name] = n

# ============================================ 1. THE CATEGORY AXIS
rep('cats',
"""const SUPPORT_DEFS = {""",
"""/* ===========================================================================
   SUPPORT CATEGORIES  (v224)
   ---------------------------------------------------------------------------
   He is about to add many more supports, so the board needs an axis to group
   them on. `kindOf` cannot be it — it has two values and describes the MATHS
   (`more` vs `speed`), not what the gem is for; every new damage support would
   land in one bucket.

   ⚠ THE CATEGORY IS A FIELD ON THE DEF, NOT A LIST HERE. A central list would
   have to be edited every time he adds a gem, and would silently drop one that
   nobody remembered to add. A `cat` on the def means a new support classifies
   itself, and `SUPPORT_CATS` only supplies the ORDER and the LABELS.
   Anything without a `cat` falls into 'other' rather than vanishing.
   ========================================================================= */
const SUPPORT_CATS = [
  { id:'damage',   n:'Damage',        d:'Raw output' },
  { id:'speed',    n:'Speed',         d:'Attack, cast and travel rate' },
  { id:'proj',     n:'Projectiles',   d:'Extra shots, forks, chains, pierce' },
  { id:'area',     n:'Area',          d:'Radius and coverage' },
  { id:'minion',   n:'Minions',       d:'Summons and companions' },
  { id:'elemental',n:'Elemental',     d:'Fire, cold, lightning, poison' },
  { id:'defence',  n:'Defence',       d:'Survivability and mitigation' },
  { id:'utility',  n:'Utility',       d:'Everything else worth having' },
  { id:'other',    n:'Uncategorised', d:'No category set on the definition' }
];
window.SUPPORT_CATS = SUPPORT_CATS;
function supportCat(id){
  const d=(window.SUPPORT_DEFS||{})[id];
  const c=d && d.cat;
  return (c && SUPPORT_CATS.some(x=>x.id===c)) ? c : 'other';
}
window.supportCat = supportCat;

const SUPPORT_DEFS = {""")

# classify the six that exist
for sid, cat in [('s_brut','damage'), ('s_tempo','speed'), ('s_cruel','damage'),
                 ('s_chain','proj'), ('s_min','minion'), ('s_aura','area')]:
    rep('cat:'+sid,
        "%s : { id:'%s'," % (sid.ljust(6), sid) if sid in ('s_brut',) else "%s: { id:'%s'," % (sid, sid),
        ("%s : { id:'%s', cat:'%s'," % (sid.ljust(6), sid, cat)) if sid in ('s_brut',)
        else ("%s: { id:'%s', cat:'%s'," % (sid, sid, cat)))

open('work.html','w',encoding='utf-8').write(src)
print('applied:', hits)
