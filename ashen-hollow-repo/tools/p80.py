src = open('work.html', encoding='utf-8').read()
hits = {}
def rep(name, old, new, count=1):
    global src
    n = src.count(old)
    assert n == count, f"{name}: expected {count}, found {n}"
    src = src.replace(old, new); hits[name] = n

# ============================================ 1. FIVE SLOTS, ONE SOURCE
rep('max',
"""const SUPPORT_SLOTS_MAX = 3;""",
"""/* ⚠ FIVE, AND EVERYONE STARTS AT ONE. Was 3 with slot 1 free; his call is one
   free slot and four bought. That makes Garrick a real gold sink for the whole
   game rather than two purchases and done. */
const SUPPORT_SLOTS_MAX = 5;
window.SUPPORT_SLOTS_MAX = SUPPORT_SLOTS_MAX;""")

rep('costs',
"""const SUPPORT_SLOT_COST = { 2: 25000, 3: 140000 };""",
"""/* Each slot costs roughly 4-5x the last: the first upgrade is reachable in a
   session, the fifth is a genuine chase. Slot 1 is free for every skill. */
const SUPPORT_SLOT_COST = { 2: 12000, 3: 55000, 4: 240000, 5: 900000 };""")

# ⚠ the classic-script copy must not drift from the module's value
rep('classic',
"""  var SUPPORT_SLOTS = 3;""",
"""  /* ⚠ TWO CONSTANTS FOR ONE FACT. This classic block cannot see the module's
     `SUPPORT_SLOTS_MAX`, so the count was duplicated — and a duplicated
     constant is a constant that will disagree. Read the module's value through
     `window` and fall back only if it is somehow absent. */
  var SUPPORT_SLOTS = (window.SUPPORT_SLOTS_MAX || 5);""")

open('work.html','w',encoding='utf-8').write(src)
print('applied:', hits)
