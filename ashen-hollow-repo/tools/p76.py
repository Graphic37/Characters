src = open('work.html', encoding='utf-8').read()
hits = {}
def rep(name, old, new, count=1):
    global src
    n = src.count(old)
    assert n == count, f"{name}: expected {count}, found {n}"
    src = src.replace(old, new); hits[name] = n

rep('helpers',
"""  /* ground fields */
  for(let i=FIELDS.length-1;i>=0;i--){""",
"""  /* ---- ELITE AFFIX TICK (v216) ------------------------------------------
     ⚠ THROTTLED AND RANGE-GATED. This runs over ENEMIES, which his logs show
     reaching 271 — so it only considers elites, only within 30m of the player,
     and each affix carries its own cooldown. An affix that fires off-screen
     costs frames and teaches the player nothing. */
  if(window.ENEMIES && window.player && RIFT.active){
    const Pp=player.position, nowAf=performance.now()/1000;
    for(let i=0;i<ENEMIES.length;i++){
      const e=ENEMIES[i];
      if(!e || e.dead || !e.g || !e.modDefs || !e.modDefs.length) continue;
      const dx=e.g.position.x-Pp.x, dz=e.g.position.z-Pp.z;
      if(dx*dx+dz*dz > 900) continue;             /* 30m */
      e.affixCd=e.affixCd||{};
      for(let k=0;k<e.modDefs.length;k++){
        const M=e.modDefs[k];
        if(!M.tick || !M.cd) continue;
        if(nowAf < (e.affixCd[M.id]||0)) continue;
        /* first fire is staggered so a pack of three does not volley in unison */
        e.affixCd[M.id]=nowAf+M.cd*(0.85+Math.random()*0.3);
        try{ M.tick(e, Pp); }catch(err){ window.ahErr&&window.ahErr(err,'affix:'+M.id); }
      }
    }
  }
  /* ground fields */
  for(let i=FIELDS.length-1;i>=0;i--){""")

# the three primitives the affixes call
rep('prims',
"""const MOB_MODS=[""",
"""/* ---- affix primitives ---------------------------------------------------
   Thin wrappers over the systems that already exist, so an affix is a few
   lines and cannot invent its own damage path. */
function affixFuse(x, z, r, delay, src, type){
  try{
    if(!window.FUSES) return;
    FUSES.push({ x:x, z:z, r:r, t:delay, enemy:1, dmgType:type||'fire',
                 dmg:(src&&src.dmg)||8 });
    /* the telegraph is the whole point: a ring that grows to the blast radius
       over exactly the fuse time, so the player learns the timing once and it
       is true everywhere */
    if(typeof fxRing==='function') fxRing(x, 0.06, z, 0.25, r, 0xff9a4a, delay, 0.22);
  }catch(e){ window.ahErr&&window.ahErr(e,'affixFuse'); }
}
function affixPool(x, z, r, secs, type){
  try{
    if(!window.FIELDS) return;
    FIELDS.push({ x:x, z:z, r:r, t:secs, marker:1, hostile:1,
                  dmgType:type||'pois', dps:0 });
    if(typeof fxRing==='function') fxRing(x, 0.05, z, r*0.4, r, 0x8fd66a, 0.5, 0.25);
  }catch(e){ window.ahErr&&window.ahErr(e,'affixPool'); }
}
window.affixFuse=affixFuse;
window.affixPool=affixPool;

const MOB_MODS=[""")

# hostile fields must hurt the PLAYER — the existing loop only hurts enemies
rep('hostile',
"""    if(!f.marker){
      enemiesNear(f.x,f.z,f.r).forEach(e=>{
        e.slowT=0.4; e.slowMul=f.slow||0.6;
        if(f.dps){ const d=Math.max(1,Math.round(f.dps*dt)); damageEnemy(e,d,false); }
      });
    }""",
"""    if(f.hostile){
      /* ⚠ THE EXISTING FIELD LOOP ONLY EVER HURT ENEMIES — it was built for the
         player's own caltrops. A monster pool needs the mirror, and it must go
         through `takeHit` so armour, resistances and the shield all apply
         exactly as they do to any other source. */
      try{
        const P2=player.position;
        if(Math.hypot(P2.x-f.x, P2.z-f.z) <= f.r)
          takeHit(Math.max(1,(f.tickDps||14)*dt), f.dmgType||'pois', 'dot');
      }catch(e){ window.ahErr&&window.ahErr(e,'field:hostile'); }
    } else if(!f.marker){
      enemiesNear(f.x,f.z,f.r).forEach(e=>{
        e.slowT=0.4; e.slowMul=f.slow||0.6;
        if(f.dps){ const d=Math.max(1,Math.round(f.dps*dt)); damageEnemy(e,d,false); }
      });
    }""")

open('work.html','w',encoding='utf-8').write(src)
print('applied:', hits)
