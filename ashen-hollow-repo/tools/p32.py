src = open('work.html', encoding='utf-8').read()
hits = {}
def rep(name, old, new, count=1):
    global src
    n = src.count(old)
    assert n == count, f"{name}: expected {count}, found {n}"
    src = src.replace(old, new); hits[name] = n

# ============================================== 1. ELITES COME FROM PACKS ONLY
# ⚠ Rarity was rolled PER ENEMY at 62/28/10, so every spawn path in the file
# could produce a lone magic mob — 36 scattered magics on a 130-enemy floor.
# The base roll is now normal-only; rarity is decided by the PACK spawner, so
# "elite" and "pack" cannot come apart.
rep('base-normal',
"""    rarity:{ normal:{w:62,hp:1.0,dmg:1.0,mods:0},
             magic :{w:28,hp:2.1,dmg:1.25,mods:1},
             rare  :{w:10, hp:4.4,dmg:1.55,mods:[2,4]} }""",
"""    /* ⚠ THE BASE ROLL IS NORMAL-ONLY (w:100/0/0). Elites are placed by
       spawnEliteGroup(), never rolled per enemy — otherwise the top-up and
       emergency spawn paths would keep scattering lone magic mobs and an
       "elite" would stop meaning "a pack".
       Rare is stronger than it was: it is now a single enemy with an escort of
       normals rather than the leader of three magics. */
    rarity:{ normal:{w:100,hp:1.0,dmg:1.0,mods:0},
             magic :{w:0, hp:2.1,dmg:1.25,mods:1},
             rare  :{w:0, hp:6.0,dmg:1.85,mods:[2,4]} }""")

# ============================================== 2. THE PACK SPAWNER
rep('elite-cfg',
"""function ri2(a,b){ return a+Math.floor(Math.random()*(b-a+1)); }""",
"""/* ---- elite packs --------------------------------------------------------
   Traditional ARPG shape:
     MAGIC = a pack of THREE magic enemies, no leader — the group IS the elite.
     RARE  = ONE much stronger enemy with ordinary monsters around it.
   Chances are per SPAWN SLOT, and a pack consumes the slots it fills, so a
   room's population does not inflate when one rolls. Tuning data — change
   freely; these give roughly 4-5 magic packs and 2-3 rares on a 130-enemy
   floor, which is the density that keeps a glow meaning something. */
const ELITE_CFG = {
  magicChance: 0.035,
  rareChance : 0.020,
  magicPack  : 3,
  rareEscort : [2, 4],
  spread     : 2.2        // metres between pack members
};
window.ELITE_CFG=ELITE_CFG;

/* Places a group at a spot and returns how many enemies it actually spawned,
   so the caller can charge them against its own budget. */
function spawnEliteGroup(sx, sz, lvl, spotFn){
  const put=(x,z,rarity,kind)=>{
    const s = spotFn ? spotFn(x, z, sx, sz) : [x, z];
    return spawnEnemy(s[0], s[1], lvl, rarity, kind);
  };
  const roll=Math.random();
  const ring=(i,total,rad)=>{
    const a=(i/total)*6.283 + Math.random()*0.5;
    return [sx+Math.cos(a)*rad, sz+Math.sin(a)*rad];
  };

  if(roll < ELITE_CFG.rareChance){
    /* ONE rare, then ordinary monsters around it. The escort is deliberately
       NOT magic: three elites guarding a fourth reads as elite soup, and it
       was what made the old mix 47% elite. */
    const boss=put(sx, sz, 'rare');
    if(boss) boss.elitePack='rare';
    let n=1;
    const esc=ri2(ELITE_CFG.rareEscort[0], ELITE_CFG.rareEscort[1]);
    for(let i=0;i<esc;i++){
      const p=ring(i, esc, ELITE_CFG.spread + Math.random()*1.4);
      const m=put(p[0], p[1], 'normal', boss?boss.kind:null);
      if(m){ m.eliteMinion=true; n++; }
    }
    return n;
  }

  if(roll < ELITE_CFG.rareChance + ELITE_CFG.magicChance){
    /* THREE magics, equals. Same archetype so they read as one warband. */
    let kind=null, n=0;
    for(let i=0;i<ELITE_CFG.magicPack;i++){
      const p = i===0 ? [sx,sz] : ring(i, ELITE_CFG.magicPack, ELITE_CFG.spread);
      const e=put(p[0], p[1], 'magic', kind);
      if(e){ if(!kind) kind=e.kind; e.elitePack='magic'; n++; }
    }
    return n || 1;
  }

  return put(sx, sz, 'normal') ? 1 : 0;
}
window.spawnEliteGroup=spawnEliteGroup;

function ri2(a,b){ return a+Math.floor(Math.random()*(b-a+1)); }""")

# ============================================== 3. THE ROOM LOOP USES IT
rep('room-loop',
"""      for(let k=0;k<n;k++){
        const p=spots[k%spots.length];
        const ang=Math.random()*6.283, rad=Math.random()*3.4;      // tight cluster
        const s=enemySpawnSpot(p.x+Math.cos(ang)*rad, p.z+Math.sin(ang)*rad, p.x, p.z);
        const e=spawnEnemy(s[0], s[1], lvl);
        spawned++;
        /* AN ELITE IS A PACK. A lone rare is just a skeleton with more HP; a
           rare with a retinue is an encounter. */
        if(e && e.rarity==='rare'){
          const minions=3;
          for(let mIdx=0;mIdx<minions;mIdx++){
            const ma=Math.random()*6.283, mr=1.4+Math.random()*1.8;
            const ms=enemySpawnSpot(s[0]+Math.cos(ma)*mr, s[1]+Math.sin(ma)*mr, s[0], s[1]);
            /* a retinue, not four more elites: D3's rare pack is one rare and
               three weaker minions. Forcing them all magic pushed the mix to
               47% magic, which reads as elite soup. */
            const mn=spawnEnemy(ms[0], ms[1], lvl, mIdx===0?'magic':'normal', e.kind);
            if(mn) mn.eliteMinion=true;
            spawned++;
          }
        }
      }""",
"""      /* COUNT ENEMIES, NOT ITERATIONS. A pack fills several of the room's
         slots at once; charging it one slot would inflate the floor every time
         an elite rolled. `guard` stops a spot that keeps failing validation
         from looping forever. */
      let made=0, guard=0;
      while(made<n && guard++ < n*4){
        const p=spots[made%spots.length];
        const ang=Math.random()*6.283, rad=Math.random()*3.4;      // tight cluster
        const s=enemySpawnSpot(p.x+Math.cos(ang)*rad, p.z+Math.sin(ang)*rad, p.x, p.z);
        const got=spawnEliteGroup(s[0], s[1], lvl, enemySpawnSpot);
        made+=got; spawned+=got;
        if(!got) break;
      }""")

open('work.html','w',encoding='utf-8').write(src)
print('applied:', hits)
