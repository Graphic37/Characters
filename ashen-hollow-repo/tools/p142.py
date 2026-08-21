src = open('work.html', encoding='utf-8').read()
hits = {}
def rep(name, old, new, count=1):
    global src
    n = src.count(old)
    assert n == count, f"{name}: expected {count}, found {n}"
    src = src.replace(old, new); hits[name] = n

# ============================================ EVASION vs ATTACKER LEVEL
rep('evade',
"""  if(hitKind==='attack'){
    const chance=Math.min(DEF_CFG.evasionCap, d.ev/(d.ev + DEF_CFG.evasionK*Math.max(1,S.lvl||1)));
    if(Math.random()<chance){ floatMiss(); return {evaded:true, dealt:0}; }
  }""",
"""  if(hitKind==='attack'){
    /* ⚠ EVASION IGNORED WHO WAS SWINGING. The denominator used the PLAYER's
       level, so a T100 monster was exactly as easy to dodge as a T1 one — the
       stat never degraded with depth, which is half of why high tiers felt
       safe. PoE keys evasion against the ATTACKER's level, and so does this:
       a deeper monster is harder to avoid. Falls back to the player's level
       when a source does not name one, so nothing gets more evadable. */
    const atkLvl=Math.max(1, srcLevel || S.lvl || 1);
    const chance=Math.min(DEF_CFG.evasionCap,
      d.ev/(d.ev + DEF_CFG.evasionK*atkLvl));
    if(Math.random()<chance){ floatMiss(); return {evaded:true, dealt:0}; }
  }""")

rep('sig',
"""function takeHit(raw, type, hitKind){""",
"""function takeHit(raw, type, hitKind, srcLevel){""")

# the enemy path must pass the attacker's level
rep('pass',
"""  const type=(e && e.dmgType) ? e.dmgType : 'phys';
  const r=takeHit(dmg, type, 'attack');""",
"""  const type=(e && e.dmgType) ? e.dmgType : 'phys';
  const r=takeHit(dmg, type, 'attack', e && e.level);""")

# ============================================ CADENCE PER SWING
rep('cadence',
"""      e.cd=(e.cadence || (window.DEPTHS&&DEPTHS.legionnaireDef?DEPTHS.legionnaireDef().cadence:1.6))
           - a.windup - a.active - a.recovery;""",
"""      /* deeper monsters press harder, not just hit harder */
      const cadMul=(window.enemyCadenceAt? enemyCadenceAt(e.level) : 1);
      e.cd=(e.cadence || (window.DEPTHS&&DEPTHS.legionnaireDef?DEPTHS.legionnaireDef().cadence:1.6))
             * cadMul
           - a.windup - a.active - a.recovery;""")

open('work.html','w',encoding='utf-8').write(src)
print('applied:', hits)
