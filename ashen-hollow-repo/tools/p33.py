src = open('work.html', encoding='utf-8').read()
hits = {}
def rep(name, old, new, count=1):
    global src
    n = src.count(old)
    assert n == count, f"{name}: expected {count}, found {n}"
    src = src.replace(old, new); hits[name] = n

MODEL = """
/* ===========================================================================
   SUPPORT GEMS — PERMANENT TIERED ACCOUNT UNLOCKS  (v177, phase 1 of 3)
   ---------------------------------------------------------------------------
   Replaces physical support items carrying a fake `level: ri(8,18)` that
   nothing ever read. Three separate axes, never merged:

     SKILL LEVEL   Challenge Rift upgrade attempts       (unchanged)
     SUPPORT TIER  Rift drops, T5 -> T1, account-wide     (this file)
     SLOT COUNT    Gold spent with Garrick, 1 -> 3        (phase 2)

   ⚠ TIER DIRECTION: T1 is the STRONGEST, T5 the weakest — the same convention
   as item affixes. The stored number is the tier, so LOWER IS BETTER and an
   upgrade is a DECREASE. Every comparison below is written `<` for that reason;
   getting this backwards silently turns upgrades into downgrades.
   ========================================================================= */
const SUPPORT_TIERS = 5;

/* Per-tier magnitudes. The gem's IDENTITY never changes between tiers — only
   the number moves — so a build does not mutate under the player when a better
   copy drops. Index 0 is unused so TIER_VALUES[t] reads naturally as "tier t".
   TUNING DATA: change freely. */
const SUPPORT_DEFS = {
  s_brut : { id:'s_brut',  n:'Savagery',        grad:'gRed',   on:'attack,spell',
             kindOf:'more', spiritMul:1,
             more:[0, 1.34, 1.31, 1.28, 1.24, 1.20],
             text:t=>'Supported skills deal '+Math.round((SUPPORT_DEFS.s_brut.more[t]-1)*100)+
                     '% more Physical Damage but cannot deal Elemental Damage.' },
  s_tempo: { id:'s_tempo', n:'Swift Cadence',   grad:'gGreen', on:'attack,spell',
             kindOf:'speed', spiritMul:1,
             more:[0, 1.18, 1.16, 1.13, 1.10, 1.07],
             text:t=>'Supported skills have '+Math.round((SUPPORT_DEFS.s_tempo.more[t]-1)*100)+
                     '% increased Attack and Cast Speed.' },
  s_cruel: { id:'s_cruel', n:'Cruel Edge',      grad:'gRed',   on:'attack,spell',
             kindOf:'more', spiritMul:1,
             more:[0, 1.27, 1.24, 1.21, 1.18, 1.15],
             text:t=>'Supported skills deal '+Math.round((SUPPORT_DEFS.s_cruel.more[t]-1)*100)+
                     '% more Damage against enemies on Low Life.' },
  s_chain: { id:'s_chain', n:'Fork',            grad:'gBlue',  on:'attack,spell',
             kindOf:'more', spiritMul:1,
             more:[0, 1.15, 1.13, 1.11, 1.09, 1.07],
             text:t=>'Supported projectiles Fork, splitting on their first hit ('+
                     Math.round((SUPPORT_DEFS.s_chain.more[t]-1)*100)+'% more damage).' },
  s_min  : { id:'s_min',   n:'Grave Discipline', grad:'gBlue', on:'attack,spell',
             kindOf:'more', spiritMul:1.25,
             more:[0, 1.40, 1.36, 1.31, 1.26, 1.21],
             text:t=>'Supported Minions deal '+Math.round((SUPPORT_DEFS.s_min.more[t]-1)*100)+
                     '% more Damage. Reserves 25% more Spirit.' },
  s_aura : { id:'s_aura',  n:'Wider Reach',     grad:'gGold',  on:'attack,spell',
             kindOf:'more', spiritMul:1.30,
             more:[0, 1.40, 1.36, 1.31, 1.26, 1.21],
             text:t=>'Supported Auras have '+Math.round((SUPPORT_DEFS.s_aura.more[t]-1)*100)+
                     '% increased Area of Effect. Reserves 30% more Spirit.' }
};
window.SUPPORT_DEFS=SUPPORT_DEFS;

/* id -> BEST tier ever found. Absent means locked. */
const SUPPORT_UNLOCKS = {};
window.SUPPORT_UNLOCKS=SUPPORT_UNLOCKS;

/* Which tiers a rift of a given AREA LEVEL may drop. One table, one place.
   Read top-down: the first row whose `from` is <= area level wins.
   TUNING DATA — thresholds are deliberately provisional. */
const SUPPORT_TIER_TABLE = [
  { from:70, tiers:[[1,0.10],[2,0.30],[3,0.60]] },
  { from:50, tiers:[[2,0.15],[3,0.45],[4,0.40]] },
  { from:30, tiers:[[3,0.20],[4,0.50],[5,0.30]] },
  { from:12, tiers:[[4,0.30],[5,0.70]] },
  { from:0,  tiers:[[5,1.00]] }
];
window.SUPPORT_TIER_TABLE=SUPPORT_TIER_TABLE;

function supportTierForArea(areaLevel){
  const row = SUPPORT_TIER_TABLE.find(r=>areaLevel>=r.from) ||
              SUPPORT_TIER_TABLE[SUPPORT_TIER_TABLE.length-1];
  let r=Math.random(), acc=0;
  for(const [tier,p] of row.tiers){ acc+=p; if(r<=acc) return tier; }
  return row.tiers[row.tiers.length-1][0];
}
window.supportTierForArea=supportTierForArea;

/* The account's current tier for a support, or null if it is still locked. */
function supportTier(id){
  const t=SUPPORT_UNLOCKS[id];
  return (typeof t==='number') ? t : null;
}
window.supportTier=supportTier;

/* The multiplier a socketed support is worth RIGHT NOW. Every effect site goes
   through here, which is what makes an account upgrade apply to every skill
   already using the support without re-socketing anything. */
function supportMore(id){
  const d=SUPPORT_DEFS[id], t=supportTier(id);
  if(!d || !t) return 1;
  return d.more[t] || 1;
}
window.supportMore=supportMore;

/* Record a drop. Returns what happened, so the caller can decide how loudly to
   say it. ⚠ LOWER TIER NUMBER IS BETTER — a duplicate must never downgrade. */
function unlockSupport(id, tier){
  if(!SUPPORT_DEFS[id]) return { result:'unknown', id:id };
  tier = Math.max(1, Math.min(SUPPORT_TIERS, tier|0));
  const cur = supportTier(id);
  if(cur===null){
    SUPPORT_UNLOCKS[id]=tier;
    return { result:'new', id:id, tier:tier, from:null };
  }
  if(tier < cur){                       /* strictly better */
    SUPPORT_UNLOCKS[id]=tier;
    return { result:'upgrade', id:id, tier:tier, from:cur };
  }
  return { result:'duplicate', id:id, tier:tier, from:cur };
}
window.unlockSupport=unlockSupport;

/* ---- support slots per skill (Garrick sells 2 and 3 — phase 2) ---------- */
const SUPPORT_SLOTS_MAX = 3;
window.SUPPORT_SLOTS_MAX=SUPPORT_SLOTS_MAX;
function supportSlots(skillId){
  try{
    const g=(typeof gemFor==='function') ? gemFor(skillId) : null;
    if(!g) return 1;
    if(typeof g.supportSlots!=='number') g.supportSlots=1;
    return Math.max(1, Math.min(SUPPORT_SLOTS_MAX, g.supportSlots));
  }catch(e){ window.ahErr&&window.ahErr(e,'supportSlots'); return 1; }
}
window.supportSlots=supportSlots;

/* ---- reading a socket, old shape or new -------------------------------- */
/* ⚠ THE COMPATIBILITY SEAM. Sockets used to hold a physical item object; they
   now hold an ID STRING. Every reader goes through this, so the model can
   change underneath the panel, the damage maths and the save without any of
   them being rewritten in the same commit. Migration converts the objects; this
   keeps the game playable in the meantime and after a partial load. */
function socketSupport(entry){
  if(!entry) return null;
  const id = (typeof entry==='string') ? entry : (entry.baseId || entry.id);
  const d = SUPPORT_DEFS[id];
  if(!d) return null;
  const tier = supportTier(id);
  return { id:id, def:d, tier:tier, n:d.n,
           more: tier ? (d.more[tier]||1) : 1,
           kindOf: d.kindOf };
}
window.socketSupport=socketSupport;

/* ---- migration, versioned and idempotent -------------------------------- */
/* The old levels were meaningless, so they are NOT converted as though they
   carried value: everything the player owned becomes T5 unlocked. Which
   supports were socketed into which skills IS preserved. */
const SUPPORT_MIGRATION_V = 1;
function migrateSupports(){
  try{
    if(window.__supportMigration >= SUPPORT_MIGRATION_V) return null;
    let owned=0, socketed=0, removed=0;
    /* 1. every support sitting in a container becomes an unlock */
    for(const k in CONT){
      const c=CONT[k]; if(!c || !c.items) continue;
      c.items.slice().forEach(it=>{
        if(!it || it.kind!=='support') return;
        const id=it.baseId||it.id;
        if(SUPPORT_DEFS[id]){ unlockSupport(id, SUPPORT_TIERS); owned++; }
        removeItem(c, it); removed++;
      });
    }
    /* 2. sockets keep their assignment but store the ID */
    if(window.RANGER_GEMS){
      for(const sid in RANGER_GEMS){
        const st=RANGER_GEMS[sid];
        if(!st || !Array.isArray(st.sockets)) continue;
        st.sockets = st.sockets.map(s=>{
          if(!s) return null;
          const id=(typeof s==='string') ? s : (s.baseId||s.id);
          if(!SUPPORT_DEFS[id]) return null;
          unlockSupport(id, SUPPORT_TIERS); socketed++;
          return id;
        });
        if(typeof st.supportSlots!=='number') st.supportSlots=1;
      }
    }
    window.__supportMigration = SUPPORT_MIGRATION_V;
    return { owned:owned, socketed:socketed, removed:removed,
             unlocks:Object.keys(SUPPORT_UNLOCKS).length };
  }catch(e){ window.ahErr&&window.ahErr(e,'migrateSupports'); return null; }
}
window.migrateSupports=migrateSupports;
setTimeout(function(){
  const r=migrateSupports();
  if(r && (r.removed||r.socketed))
    try{ console.log('[supports] migrated: '+r.removed+' item(s) retired, '+
      r.socketed+' socket(s) converted, '+r.unlocks+' support(s) unlocked'); }
    catch(e){ window.ahErr&&window.ahErr(e,'migrateSupports:log'); }
}, 1600);
"""

rep('model', "/* ---- 11. loot filter hooks", MODEL + "\n/* ---- 11. loot filter hooks")

# ---------------------------------------------------- effect sites read tiers
rep('effect-1',
"""  g.sockets.forEach(s=>{ if(s&&s.more) d*=s.more; });""",
"""  /* through socketSupport(), so an account tier upgrade reaches every skill
     already using the support with no re-socketing */
  g.sockets.forEach(s=>{
    const sup = window.socketSupport ? socketSupport(s) : (s && s.more ? {more:s.more} : null);
    if(sup && sup.more) d*=sup.more;
  });""")

rep('effect-2',
"""      var s = socks[i];
      if(!s) continue;
      var nm = s.n || s.baseName || s.name || 'Support';
      names.push(nm);
      if(typeof s.more !== 'number') continue;
      /* Swift Cadence's `more` is ATTACK SPEED, not damage. Counting it as
         damage would overstate the per-hit number; it belongs on the rate. */
      if(/cadence|swift/i.test(nm)) speed *= s.more;
      else more *= s.more;""",
"""      var raw = socks[i];
      if(!raw) continue;
      var s = window.socketSupport ? socketSupport(raw) : null;
      if(!s) { if(typeof raw==='object'){ s={ n:raw.n||raw.baseName||raw.name, more:raw.more,
               kindOf:/cadence|swift/i.test(raw.baseName||raw.name||'')?'speed':'more' }; }
               else continue; }
      var nm = s.n || 'Support';
      names.push(nm + (s.tier ? ' T'+s.tier : ''));
      if(typeof s.more !== 'number') continue;
      /* Swift Cadence's `more` is ATTACK SPEED, not damage. Counting it as
         damage would overstate the per-hit number; it belongs on the rate.
         The DEF now says which it is, rather than a regex on the name. */
      if(s.kindOf==='speed') speed *= s.more;
      else more *= s.more;""")

# ---------------------------------------------------- supports drop in rifts
rep('support-drop',
"""  /* RUNES HAD NO SOURCE. makeRune existed and nothing in the game ever called""",
"""  /* SUPPORTS HAD NO SOURCE EITHER — `makeSupport` was called twice at world
     seed and never again, so four of the six were unobtainable. They drop as
     permanent unlocks now, with the AREA LEVEL deciding which tiers are on the
     table (SUPPORT_TIER_TABLE). Elites carry the good odds, as with runes. */
  try{
    const sc = e.isBoss?0.55 : e.rarity==='rare'?0.18 : e.rarity==='magic'?0.06 : 0.012;
    if(Math.random()<sc && window.unlockSupport && window.SUPPORT_DEFS){
      const ids=Object.keys(SUPPORT_DEFS);
      const id=ids[Math.floor(Math.random()*ids.length)];
      const area=(window.RIFT_CFG && RIFT.tier) ? RIFT_CFG.areaLevel(RIFT.tier) : 1;
      const r=unlockSupport(id, supportTierForArea(area));
      const nm=SUPPORT_DEFS[id].n;
      if(r.result==='new')
        try{ toastRift('NEW SUPPORT — '+nm+' T'+r.tier); }catch(x){}
      else if(r.result==='upgrade')
        try{ toastRift('SUPPORT UPGRADED — '+nm+' T'+r.from+' \\u2192 T'+r.tier); }catch(x){}
      /* a duplicate says nothing for now; the salvage economy is TBD */
    }
  }catch(x){ window.ahErr&&window.ahErr(x,'supportDrop'); }

  /* RUNES HAD NO SOURCE. makeRune existed and nothing in the game ever called""")

# ---------------------------------------------------- save the three axes
rep('save',
"""      gems:JSON.parse(JSON.stringify(RANGER_GEMS)),""",
"""      gems:JSON.parse(JSON.stringify(RANGER_GEMS)),
      /* the three axes, stored separately and never merged. `gems` already
         carries level, sockets (IDs) and supportSlots per skill; this adds the
         account-wide tier table. */
      supportUnlocks: Object.assign({}, window.SUPPORT_UNLOCKS||{}),
      supportMigration: window.__supportMigration||0,""")

rep('load',
"""    if(d.gems){ for(const k in RANGER_GEMS) delete RANGER_GEMS[k];
                for(const k in d.gems) RANGER_GEMS[k]=d.gems[k]; }""",
"""    if(d.gems){ for(const k in RANGER_GEMS) delete RANGER_GEMS[k];
                for(const k in d.gems) RANGER_GEMS[k]=d.gems[k]; }
    if(d.supportUnlocks && window.SUPPORT_UNLOCKS){
      for(const k in SUPPORT_UNLOCKS) delete SUPPORT_UNLOCKS[k];
      for(const k in d.supportUnlocks) SUPPORT_UNLOCKS[k]=d.supportUnlocks[k];
    }
    if(d.supportMigration) window.__supportMigration=d.supportMigration;""")

# the seed no longer hands out physical supports
rep('seed',
"""  addItem(CONT.inv, makeSupport('s_cruel'));
  addItem(CONT.inv, makeSupport('s_chain'));""",
"""  /* supports are account unlocks now, not items — a new character starts with
     NONE and finds them in Rifts, which is the whole point of the system */""")

open('work.html','w',encoding='utf-8').write(src)
print('applied:', hits)
