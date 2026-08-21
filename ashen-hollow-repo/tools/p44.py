src = open('work.html', encoding='utf-8').read()
hits = {}
def rep(name, old, new, count=1):
    global src
    n = src.count(old)
    assert n == count, f"{name}: expected {count}, found {n}"
    src = src.replace(old, new); hits[name] = n

# ================================================= 1. THE MISSING PREFIXES
# addpois — Poison had a family in the stat model, a monster modifier that deals
# it, and NO WAY TO GET IT. Calibrated between addcold (3-6 -> 21-44) and
# addfire (3-7 -> 24-49), the same four tiers and the same ilvl gates.
rep('prefixes',
""" /* RETIRED: Spirit. V1 is Mana-based (spec 12) and nothing reads it. */""",
""" /* ⚠ POISON IS A FULL FAMILY NOW (V1 decision). It was mapped in
    STAT_TO_FAMILY, dealt by the Venomous monster modifier, and obtainable from
    nothing — the only family with no flat affix. Same tiers, same ilvl gates
    and the same slot list as its three siblings, so the four are symmetric. */
 {id:'addpois', stat:'addpois', on:['weapon','ring','amulet','gloves'], pair:1,
  txt:(a,b)=>'Adds '+a+' to '+b+' Poison Damage',
  tiers:[[1,3,6,'Tainted'],[18,7,15,'Septic'],[36,13,28,'Virulent'],[54,21,44,'Pestilent']]},
 /* ---- % increased elemental damage ------------------------------------
    ⚠ ALL FOUR WERE ABSENT. `PCT_TO_FAMILY` mapped five families and
    `gearMult()` summed five, but only `phys%` existed in the pool — so the
    elemental families had flat damage with no multiplier to scale it, and
    flattened out as weapons grew. Values sit BELOW phys% on purpose: physical
    is the native weapon damage and its multiplier is weapon-local, while these
    roll on jewellery too and stack across slots. */
 {id:'fire%', stat:'fire%', on:['weapon','ring','amulet'],
  txt:v=>v+'% increased Fire Damage',
  tiers:[[1,10,19,'Smouldering'],[16,20,29,'Blazing'],[34,30,42,'Infernal'],[52,43,58,'Cataclysmic']]},
 {id:'cold%', stat:'cold%', on:['weapon','ring','amulet'],
  txt:v=>v+'% increased Cold Damage',
  tiers:[[1,10,19,'Cooling'],[16,20,29,'Rimed'],[34,30,42,'Hoarfrost'],[52,43,58,'Absolute']]},
 {id:'light%', stat:'light%', on:['weapon','ring','amulet'],
  txt:v=>v+'% increased Lightning Damage',
  tiers:[[1,10,19,'Humming'],[16,20,29,'Arcing'],[34,30,42,'Thundering'],[52,43,58,'Cataclysmic']]},
 {id:'pois%', stat:'pois%', on:['weapon','ring','amulet'],
  txt:v=>v+'% increased Poison Damage',
  tiers:[[1,10,19,'Foul'],[16,20,29,'Noxious'],[34,30,42,'Venomous'],[52,43,58,'Plaguebound']]},
 /* RETIRED: Spirit. V1 is Mana-based (spec 12) and nothing reads it. */""")

# ================================================= 2. THE MISSING SUFFIX
rep('pres',
""" {id:'lres', stat:'lres', on:NON_WEAPON, txt:v=>'+'+v+'% to Lightning Resistance',
  tiers:[[1,8,15,'the Squall'],[18,16,25,'the Storm'],[36,26,35,'the Tempest'],[54,36,45,'the Sky']]""",
""" {id:'lres', stat:'lres', on:NON_WEAPON, txt:v=>'+'+v+'% to Lightning Resistance',
  tiers:[[1,8,15,'the Squall'],[18,16,25,'the Storm'],[36,26,35,'the Tempest'],[54,36,45,'the Sky']]},
 /* ⚠ POISON RESISTANCE HAD NO SOURCE. `charStats` read `pres`, `takeHit`
    applied it, and the Venomous monster modifier deals poison damage — but
    nothing on any item could produce it, so it was an unresistable damage type.
    Identical tiers to its three siblings. */
 {id:'pres', stat:'pres', on:NON_WEAPON, txt:v=>'+'+v+'% to Poison Resistance',
  tiers:[[1,8,15,'the Fen'],[18,16,25,'the Blight'],[36,26,35,'the Miasma'],[54,36,45,'the Plague']]""")

# ================================================= 3. THE phys% DOUBLE COUNT
# ⚠ FOUND WHILE WIRING THE ELEMENTAL %. `weaponStats()` already applies phys%
# to the weapon's min/max, AND buildStats put it into st.pct, which gearMult
# multiplies again — the same affix counted twice, exactly the shape of the
# addphys problem in v184. Elemental % has no such owner, so it belongs here.
rep('pct',
"""        if(PCT_TO_FAMILY[id]!==undefined){
          if(slot==='weapon') st.pct[PCT_TO_FAMILY[id]]+=v;    // weapon-local only
          return;
        }""",
"""        if(PCT_TO_FAMILY[id]!==undefined){
          const fam=PCT_TO_FAMILY[id];
          /* ⚠ phys% IS WEAPON-LOCAL AND weaponStats HAS ALREADY APPLIED IT to
             min/max. Adding it here too means gearMult multiplies the same
             affix a second time — the same double-count addphys had. The
             elemental families have no such owner, and unlike phys% they roll
             on jewellery, so they are summed from EVERY slot. */
          if(id!=='phys%') st.pct[fam]+=v;
          return;
        }""")

open('work.html','w',encoding='utf-8').write(src)
print('applied:', hits)
