src = open('work.html', encoding='utf-8').read()
hits = {}
def rep(name, old, new, count=1):
    global src
    n = src.count(old)
    assert n == count, f"{name}: expected {count}, found {n}"
    src = src.replace(old, new); hits[name] = n

rep('spawn',
"""    maxHp:(CFG.enemy.hpBase+CFG.enemy.hpPerLevel*level)*R.hp,
    dmg:(CFG.enemy.dmgBase+CFG.enemy.dmgPerLevel*level)*R.dmg,
    speed:CFG.enemy.speed, cd:Math.random()*CFG.enemy.attackCd, dead:false,""",
"""    maxHp:enemyHpAt(level)*R.hp,
    dmg:enemyDmgAt(level)*R.dmg,
    speed:CFG.enemy.speed,
    cd:Math.random()*CFG.enemy.attackCd*enemyCadenceAt(level), dead:false,""")

rep('fns',
"""const R=CFG.enemy.rarity[rarity];""",
"""const R=CFG.enemy.rarity[rarity];""")

# the three curve functions, next to CFG so they are found with it
rep('curves',
"""window.CFG=CFG;""",
"""window.CFG=CFG;

/* ===========================================================================
   ENEMY SCALING  (2026-08-21)
   ---------------------------------------------------------------------------
   One place, so a tier's threat can be reasoned about and re-tuned without
   hunting call sites. `level` is the rift tier.
   ⚠ THESE ARE THE ONLY THINGS THAT SHOULD SCALE WITH TIER. Tuning the player
   downward to make tiers feel dangerous would break every build he has already
   earned — his explicit instruction, and the right one.
   ========================================================================= */
function enemyDmgAt(level){
  const L=Math.max(1, level||1);
  return CFG.enemy.dmgBase + CFG.enemy.dmgPerLevel * Math.pow(L, CFG.enemy.dmgExp);
}
function enemyHpAt(level){
  const L=Math.max(1, level||1);
  return CFG.enemy.hpBase + CFG.enemy.hpPerLevel * Math.pow(L, CFG.enemy.hpExp);
}
/* cadence multiplier: 1.0 early, easing to `cadenceFloor` by T100 */
function enemyCadenceAt(level){
  const L=Math.max(1, Math.min(100, level||1));
  const k=(L-1)/99;
  return 1 - (1-CFG.enemy.cadenceFloor)*k;
}
window.enemyDmgAt=enemyDmgAt;
window.enemyHpAt=enemyHpAt;
window.enemyCadenceAt=enemyCadenceAt;""")

open('work.html','w',encoding='utf-8').write(src)
print('applied:', hits)
