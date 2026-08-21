src = open('work.html', encoding='utf-8').read()
hits = {}
def rep(name, old, new, count=1):
    global src
    n = src.count(old)
    assert n == count, f"{name}: expected {count}, found {n}"
    src = src.replace(old, new); hits[name] = n

# ============================================ POOLS SCALE WITH THEIR CASTER
rep('pool',
"""function affixPool(x, z, r, secs, type){
  try{
    if(!window.FIELDS) return;
    FIELDS.push({ x:x, z:z, r:r, t:secs, marker:1, hostile:1,
                  dmgType:type||'pois', dps:0 });""",
"""function affixPool(x, z, r, secs, type, src){
  try{
    if(!window.FIELDS) return;
    /* ⚠ THE POOL WAS A FLAT 14 DPS AT EVERY TIER. `tickDps||14` meant a
       Plaguebearer at T100 dealt exactly what it dealt at T1 — a hazard the
       player outgrew within an hour and then walked through forever.
       A pool is the elite's damage spread over time, so price it FROM the
       caster: ~40% of one hit per second. That scales with the tier curve for
       free and can never drift from it. */
    const dps = src && src.dmg ? Math.max(2, src.dmg*0.40) : 14;
    FIELDS.push({ x:x, z:z, r:r, t:secs, marker:1, hostile:1,
                  dmgType:type||'pois', dps:0, tickDps:dps });""")

rep('call1',
"""   tick:(e)=>{ affixPool(e.g.position.x, e.g.position.z, 2.6, 6, 'pois'); },
   onDeath:(e)=>{ affixPool(e.g.position.x, e.g.position.z, 3.2, 8, 'pois'); }},""",
"""   tick:(e)=>{ affixPool(e.g.position.x, e.g.position.z, 2.6, 6, 'pois', e); },
   onDeath:(e)=>{ affixPool(e.g.position.x, e.g.position.z, 3.2, 8, 'pois', e); }},""")

# the hostile field must pass the attacker level too
rep('field',
"""        if(Math.hypot(P2.x-f.x, P2.z-f.z) <= f.r)
          takeHit(Math.max(1,(f.tickDps||14)*dt), f.dmgType||'pois', 'dot');""",
"""        if(Math.hypot(P2.x-f.x, P2.z-f.z) <= f.r)
          takeHit(Math.max(1,(f.tickDps||14)*dt), f.dmgType||'pois', 'dot', f.level);""")

# and record the level on the field so it can
rep('lvl',
"""                  dmgType:type||'pois', dps:0, tickDps:dps });""",
"""                  dmgType:type||'pois', dps:0, tickDps:dps,
                  level:(src && src.level)||0 });""")

# ============================================ FUSES already scale (f.dmg = e.dmg)
rep('fuse',
"""            takeHit(Math.max(1, (f.dmg||8)*2.0*fall), f.dmgType||'fire', 'attack');""",
"""            /* the telegraph is the price of ignoring it: a mortar or an orb
               that lands is worth more than a swing, which is what makes
               moving out of it the correct play rather than a nicety */
            takeHit(Math.max(1, (f.dmg||8)*2.0*fall), f.dmgType||'fire',
                    'attack', f.level);""")

rep('fusepush',
"""    FUSES.push({ x:x, z:z, r:r, t:delay, enemy:1, dmgType:type||'fire',
                 dmg:(src&&src.dmg)||8 });""",
"""    FUSES.push({ x:x, z:z, r:r, t:delay, enemy:1, dmgType:type||'fire',
                 dmg:(src&&src.dmg)||8, level:(src&&src.level)||0 });""")

open('work.html','w',encoding='utf-8').write(src)
print('applied:', hits)
