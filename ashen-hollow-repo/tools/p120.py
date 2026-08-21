src = open('work.html', encoding='utf-8').read()
hits = {}
def rep(name, old, new, count=1):
    global src
    n = src.count(old)
    assert n == count, f"{name}: expected {count}, found {n}"
    src = src.replace(old, new); hits[name] = n

rep('always',
"""    /* health bar only once it means something, exactly as before */
    /* PoE2 policy: only monsters that have actually been hit carry a bar */
    const mode=window.HPBAR_MODE;
    const hurt = e.hp < e.maxHp;
    const recent = hurt && (nowA - (e.lastHitAt||0) < window.HPBAR_LINGER);
    let wantBar = (mode==='always') ? true
                  : (mode==='off') ? (e.rarity!=='normal'||e.isBoss)
                  : (recent || e.isBoss || e.rarity==='rare');""",
"""    /* ⚠ EVERY ELITE CARRIES A BAR AT ALL TIMES (v241).
       The old rule showed one for `rarity==='rare'` and for anything hit
       recently — so a RARE elite was permanent but the three MAGIC elites in a
       warband only flickered into view for a moment after each hit, and were
       invisible at full health. Two kinds of elite behaving differently is not
       a policy, it is an accident of which field the condition happened to
       test.
       `elitePack` is the marker set at spawn for BOTH magic and rare (see the
       pack spawner), so it is the honest thing to key on — `rarity` is the
       loot-tier field and only incidentally agrees.
       NORMALS are unchanged: they still earn a bar by being hit, because a bar
       over all 200 of them is noise, not information. */
    const mode=window.HPBAR_MODE;
    const hurt = e.hp < e.maxHp;
    const recent = hurt && (nowA - (e.lastHitAt||0) < window.HPBAR_LINGER);
    const isElite = !!e.elitePack || e.isBoss || e.rarity==='rare' || e.rarity==='magic';
    let wantBar = (mode==='always') ? true
                  : (mode==='off') ? isElite
                  : (isElite || recent);""")

open('work.html','w',encoding='utf-8').write(src)
print('applied:', hits)
