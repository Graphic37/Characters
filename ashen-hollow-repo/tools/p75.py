src = open('work.html', encoding='utf-8').read()
hits = {}
def rep(name, old, new, count=1):
    global src
    n = src.count(old)
    assert n == count, f"{name}: expected {count}, found {n}"
    src = src.replace(old, new); hits[name] = n

rep('mods',
"""const MOB_MODS=[
  {id:'swift',   n:'Swift',        apply:e=>{ e.speed*=1.45; }},
  {id:'hardy',   n:'Hardened',     apply:e=>{ e.maxHp*=1.5; e.hp=e.maxHp; }},
  {id:'burning', n:'Ember-touched',apply:e=>{ e.dmgType='fire'; e.dmg*=1.2; }},
  {id:'frozen',  n:'Frost-clad',   apply:e=>{ e.dmgType='cold'; e.slowOnHit=1; }},
  {id:'charged', n:'Storm-charged',apply:e=>{ e.dmgType='light'; e.dmg*=1.25; }},
  {id:'venom',   n:'Venomous',     apply:e=>{ e.dmgType='pois'; e.dot=1; }},
  {id:'brutal',  n:'Brutal',       apply:e=>{ e.dmg*=1.6; }},
  {id:'warded',  n:'Warded',       apply:e=>{ e.resist=0.25; }}
];""",
"""/* ===========================================================================
   ELITE AFFIXES THAT DO SOMETHING  (v216)
   ---------------------------------------------------------------------------
   The eight originals were all PASSIVE STAT TWEAKS — "1.45x speed", "1.6x
   damage". Nothing to react to, nothing to move out of, no reason a Venomous
   pack plays differently from a Brutal one. His D3 list is the opposite: every
   entry is a THING THAT HAPPENS on a timer, telegraphed, that you dodge.

   ⚠ BUILT ON THE MECHANISMS THAT ALREADY EXIST, deliberately: `FUSES` already
   does "telegraph now, explode later with `areaHit`", `FIELDS` already does
   "a patch of ground that does something while you stand in it", and
   `spawnEnemy` already spawns. Inventing a parallel telegraph system for this
   would be the big-bang rewrite his standing rule forbids — and the fuse
   telegraph is the same one the player's own explosive arrow uses, so it is
   already something he reads as "get out of the circle".

   The passive eight are KEPT: a mix of stat mods and active ones is what makes
   a pack roll feel different each time. Actives are marked `active:1` so the
   spawner can guarantee an elite gets at least one.
   ========================================================================= */
const MOB_MODS=[
  /* ---- the originals: passive, cheap, still useful ---------------------- */
  {id:'swift',   n:'Swift',        apply:e=>{ e.speed*=1.45; }},
  {id:'hardy',   n:'Hardened',     apply:e=>{ e.maxHp*=1.5; e.hp=e.maxHp; }},
  {id:'burning', n:'Ember-touched',apply:e=>{ e.dmgType='fire'; e.dmg*=1.2; }},
  {id:'frozen',  n:'Frost-clad',   apply:e=>{ e.dmgType='cold'; e.slowOnHit=1; }},
  {id:'charged', n:'Storm-charged',apply:e=>{ e.dmgType='light'; e.dmg*=1.25; }},
  {id:'venom',   n:'Venomous',     apply:e=>{ e.dmgType='pois'; e.dot=1; }},
  {id:'brutal',  n:'Brutal',       apply:e=>{ e.dmg*=1.6; }},
  {id:'warded',  n:'Warded',       apply:e=>{ e.resist=0.25; }},

  /* ---- MORTAR (fire). Four shells rain around the player, telegraphed.
     The signature "keep moving" affix, and the clearest to read. */
  {id:'mortar', n:'Mortar', active:1, cd:3.4,
   apply:e=>{ e.affixCd=e.affixCd||{}; },
   tick:(e,P)=>{
     for(let i=0;i<4;i++){
       const a=Math.random()*6.283, r=Math.random()*5.5;
       affixFuse(P.x+Math.cos(a)*r, P.z+Math.sin(a)*r, 2.4, 1.5, e, 'fire');
     }
   }},

  /* ---- FROZEN (cold). Three orbs that sit, then burst. Punishes standing
     still in melee, which is exactly what Auto tends to do. */
  {id:'frostorb', n:'Frozen', active:1, cd:8,
   tick:(e,P)=>{
     for(let i=0;i<3;i++){
       const a=(i/3)*6.283+Math.random(), r=1.6+Math.random()*1.8;
       affixFuse(P.x+Math.cos(a)*r, P.z+Math.sin(a)*r, 2.2, 3.0, e, 'cold');
     }
   }},

  /* ---- PLAGUEBEARER (poison). A pool under itself, and one on death — so
     killing it is not automatically safe. */
  {id:'plague', n:'Plaguebearer', active:1, cd:5.5,
   tick:(e)=>{ affixPool(e.g.position.x, e.g.position.z, 2.6, 6, 'pois'); },
   onDeath:(e)=>{ affixPool(e.g.position.x, e.g.position.z, 3.2, 8, 'pois'); }},

  /* ---- TELEPORTER (lightning). Closes distance and lands hard. Gives
     ranged builds something to answer; a bow player can no longer simply
     hold the far wall. */
  {id:'teleport', n:'Teleporter', active:1, cd:9,
   tick:(e,P)=>{
     const a=Math.random()*6.283, r=2.2;
     const nx=P.x+Math.cos(a)*r, nz=P.z+Math.sin(a)*r;
     const fix=(window.nearestStandable && window.DEPTHS &&
                DEPTHS.walkableAt && DEPTHS.walkableAt(nx,nz)===false)
       ? nearestStandable(nx,nz,4) : {x:nx,z:nz};
     if(!fix) return;                       /* nowhere legal: stay put */
     if(typeof fxFlash==='function') fxFlash(e.g.position.x,1.0,e.g.position.z,1.6,0x9ad0ff,0.2);
     e.g.position.set(fix.x, e.g.position.y, fix.z);
     if(e.home){ e.home.x=fix.x; e.home.z=fix.z; }
     affixFuse(fix.x, fix.z, 2.2, 0.45, e, 'light');
     if(typeof fxRing==='function') fxRing(fix.x,0.06,fix.z, 0.3, 2.2, 0x9ad0ff, 0.4, 0.2);
   }},

  /* ---- SUMMONER. Reinforcements, capped so it cannot run away with the
     enemy count on a 200-mob floor. */
  {id:'summoner', n:'Summoner', active:1, cd:14,
   tick:(e)=>{
     if(!window.spawnEnemy || !window.ENEMIES) return;
     if(ENEMIES.length > 260) return;              /* the floor is full */
     e.spawned=e.spawned||0;
     if(e.spawned>=6) return;                      /* his cap, per elite */
     for(let i=0;i<2;i++){
       const a=Math.random()*6.283, r=1.8+Math.random();
       const m=spawnEnemy(e.g.position.x+Math.cos(a)*r,
                          e.g.position.z+Math.sin(a)*r,
                          Math.max(1,(e.level||1)));
       if(m){ e.spawned++; m.summoned=1; }
     }
     if(typeof fxRing==='function')
       fxRing(e.g.position.x,0.06,e.g.position.z, 0.3, 2.6, 0xc79bff, 0.4, 0.2);
   }},

  /* ---- VAMPIRIC. Heals from its own hits, so ignoring it costs you the
     fight rather than just time. Capped at its own max. */
  {id:'vampiric', n:'Vampiric', active:1,
   apply:e=>{ e.leech=0.35; }}
];
window.MOB_MODS=MOB_MODS;""")

open('work.html','w',encoding='utf-8').write(src)
print('applied:', hits)
