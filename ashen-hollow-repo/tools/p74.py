src = open('work.html', encoding='utf-8').read()
hits = {}
def rep(name, old, new, count=1):
    global src
    n = src.count(old)
    assert n == count, f"{name}: expected {count}, found {n}"
    src = src.replace(old, new); hits[name] = n

# ================================================= 1. TANKIER, AND SCALING
rep('tank',
"""  bossHpMult: 9.0,""",
"""  /* ⚠ 9.0 WAS FLAT, AND FLAT IS THE BUG. Monster HP here is LINEAR
     (`34 + 11*level`) while player power is MULTIPLICATIVE through affix
     tiers, gem levels and rune percentages — so a constant multiplier means
     the boss gets RELATIVELY weaker every tier, which is the opposite of a
     difficulty curve.
     D3's rift guardian and PoE's map boss are both worth many whites in
     time-to-kill; 9x meant roughly nine mob-kills of damage. This grows the
     multiplier with tier so the ratio holds and then widens:
        tier   1 -> 16.6x   (747 hp)
        tier  30 -> 24.4x   (8,881)
        tier 100 -> 38.0x   (43,092)
     Tuning data: `bossHpMult` is now a FUNCTION of tier. */
  bossHpMult: t => +(16 + 22*Math.pow(Math.min(t||1,100)/100, 0.8)).toFixed(2),""")

open('work.html','w',encoding='utf-8').write(src)
print('applied:', hits)
