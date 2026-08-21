src = open('work.html', encoding='utf-8').read()
hits = {}
def rep(name, old, new, count=1):
    global src
    n = src.count(old)
    assert n == count, f"{name}: expected {count}, found {n}"
    src = src.replace(old, new); hits[name] = n

# ============================================ 1. THE CURVES
rep('cfg',
"""    hpBase:34, hpPerLevel:11, dmgBase:6, dmgPerLevel:1.7, speed:2.4,""",
"""    /* ===================================================================
       ⚠⚠ ENEMY SCALING WAS LINEAR AND THE PLAYER IS NOT (2026-08-21).
       `6 + 1.7*level` meant a T100 normal hit for 176 raw. Measured against a
       mid-game benchmark (1020 life, 1900 armour) that is **5.5% of the pool —
       29 seconds for one monster to kill him.**
       And ARMOUR COMPOUNDS IT: reduction is `ar/(ar + 5*hit)`, so a defence
       that grows with gear while hits grow linearly means mitigation RISES
       with tier. The player was pulling away from the curve twice over.
       Curve solved backwards from the targets, not guessed:
         T35 should cost a mid character ~10% of life per normal hit -> raw 254
         T100 should nearly one-shot him (~75%)                      -> raw 1044
       Fitting `6 + a*t^p` through both gives a=1.96, p=1.362.
       ⚠ HP grows too, but GENTLER (^1.25) — it is coupled to the v210
       Challenge pacing, where T100 already demands a kill every 4.0s. Damage
       is what makes a tier dangerous; HP only makes it long.
       =================================================================== */
    hpBase:34, hpPerLevel:11, hpExp:1.25,
    dmgBase:6, dmgPerLevel:1.96, dmgExp:1.362, speed:2.4,
    /* modest aggression at depth: cadence tightens toward 78% by T100, so a
       high tier presses rather than merely hitting harder */
    cadenceFloor:0.78,""")

open('work.html','w',encoding='utf-8').write(src)
print('applied:', hits)
