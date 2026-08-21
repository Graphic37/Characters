src = open('work.html', encoding='utf-8').read()
hits = {}
def rep(name, old, new, count=1):
    global src
    n = src.count(old)
    assert n == count, f"{name}: expected {count}, found {n}"
    src = src.replace(old, new); hits[name] = n

# ===================================================== 1. THE CURVES
rep('curves',
"""const RUNE_MAG=[0,4,9,17,30,52];      // index by tier 5..1 -> magnitude""",
"""const RUNE_MAG=[0,4,9,17,30,52];      // index by tier 5..1 -> magnitude
                                      // (still used by Wall/Fox/Veil/Warding)

/* ===========================================================================
   RUNE CURVES — LOCKED 2026-08-19, MEASURED NOT GUESSED
   ---------------------------------------------------------------------------
   ⚠ INDEXING: these arrays are read as `[6 - tier]`, matching RUNE_MAG. Tier 5
   is the WEAKEST and tier 1 the strongest, so index 1 = T5 and index 5 = T1.
   Writing them in tier order would silently invert every rune.

   A rune's effect now depends on WHERE IT SITS:
     weapon socket  -> % increased damage of its family
     armour socket  -> the matching resistance
   Iron is deliberately WEAPON-ONLY: physical's defensive counterpart is Armour,
   and Rune of the Wall already owns that. Inventing a second effect for
   symmetry would just make another generic defensive rune.

   Why % and not flat: the rune should AMPLIFY a build the player assembled,
   not be an independent damage package. Measured on real `rollDamage()` builds
   with two weapon sockets — 0% with no matching gear, ~10% for a generalist,
   ~16% fully committed. Rune % is ADDITIVE with affix %, so it dilutes as the
   player stacks more, which caps the endgame ceiling by itself.
   ========================================================================= */
const RUNE_ELEM_PCT = [0, 6, 10, 14, 19, 25];   // Cinders/Frost/Storms/Blight
const RUNE_IRON_PCT = [0, 5,  8, 12, 16, 21];   // Iron — lower: physical is the
                                                // whole hit, so the same % is
                                                // worth roughly 1.5x as much
/* Armour side. ⚠ PROVISIONAL — the ceiling here is 15 non-weapon sockets, not
   2, so these are set from that measurement and re-checked whenever the socket
   count changes. See the note in the audit: socket COUNT, not per-rune value,
   is what breaks defensive stacking. */
const RUNE_ELEM_RES = [0, 3,  5,  7,  9, 12];

const RUNE_FAMILY = { rn_phys:'phys', rn_fire:'fire', rn_cold:'cold',
                      rn_lght:'light', rn_pois:'pois' };
window.RUNE_ELEM_PCT=RUNE_ELEM_PCT;
window.RUNE_IRON_PCT=RUNE_IRON_PCT;
window.RUNE_ELEM_RES=RUNE_ELEM_RES;
window.RUNE_FAMILY=RUNE_FAMILY;

/* What one rune is worth in a given slot kind. ONE function, so the tooltip,
   the board and the stat maths can never disagree about a rune's value. */
function runeEffect(runeType, tier, slotKind){
  const fam=RUNE_FAMILY[runeType];
  const i=6-Math.max(1,Math.min(5,tier|0));
  if(fam){
    if(slotKind==='weapon'){
      const v = (fam==='phys') ? RUNE_IRON_PCT[i] : RUNE_ELEM_PCT[i];
      return { kind:'pct', family:fam, v:v };
    }
    /* Iron has no armour side, by design */
    if(fam==='phys') return { kind:'none', family:fam, v:0 };
    return { kind:'res', family:fam, v:RUNE_ELEM_RES[i] };
  }
  /* the four dedicated defensive runes are unchanged for now */
  return { kind:'flat', family:null, v:RUNE_MAG[i] };
}
window.runeEffect=runeEffect;""")

# ===================================================== 2. THE TOOLTIP TEXT
rep('types',
""" {id:'rn_phys', n:'Rune of Iron',    stat:'phys',  txt:v=>'+'+v+' to Physical Damage'},
 {id:'rn_fire', n:'Rune of Cinders', stat:'fire',  txt:v=>'+'+v+' to Fire Damage'},
 {id:'rn_cold', n:'Rune of Frost',   stat:'cold',  txt:v=>'+'+v+' to Cold Damage'},
 {id:'rn_lght', n:'Rune of Storms',  stat:'light', txt:v=>'+'+v+' to Lightning Damage'},
 {id:'rn_pois', n:'Rune of Blight',  stat:'pois',  txt:v=>'+'+v+' to Poison Damage'},""",
""" /* ⚠ `txt` now takes the TIER, not a magnitude, because a rune's value depends
    on which slot it ends up in and a single number cannot say both halves. */
 {id:'rn_phys', n:'Rune of Iron',    stat:'phys',  weaponOnly:1,
  txt:t=>'Weapon: '+RUNE_IRON_PCT[6-t]+'% increased Physical Damage'},
 {id:'rn_fire', n:'Rune of Cinders', stat:'fire',
  txt:t=>'Weapon: '+RUNE_ELEM_PCT[6-t]+'% increased Fire Damage\\nArmour: +'+
         RUNE_ELEM_RES[6-t]+'% to Fire Resistance'},
 {id:'rn_cold', n:'Rune of Frost',   stat:'cold',
  txt:t=>'Weapon: '+RUNE_ELEM_PCT[6-t]+'% increased Cold Damage\\nArmour: +'+
         RUNE_ELEM_RES[6-t]+'% to Cold Resistance'},
 {id:'rn_lght', n:'Rune of Storms',  stat:'light',
  txt:t=>'Weapon: '+RUNE_ELEM_PCT[6-t]+'% increased Lightning Damage\\nArmour: +'+
         RUNE_ELEM_RES[6-t]+'% to Lightning Resistance'},
 {id:'rn_pois', n:'Rune of Blight',  stat:'pois',
  txt:t=>'Weapon: '+RUNE_ELEM_PCT[6-t]+'% increased Poison Damage\\nArmour: +'+
         RUNE_ELEM_RES[6-t]+'% to Poison Resistance'},""")

# the four defensive runes still take a magnitude — keep them on that signature
rep('def-types',
""" {id:'rn_arm',  n:'Rune of the Wall',stat:'ar',    txt:v=>'+'+v+' to Armour'},
 {id:'rn_eva',  n:'Rune of the Fox', stat:'ev',    txt:v=>'+'+v+' to Evasion'},
 {id:'rn_es',   n:'Rune of the Veil',stat:'es',    txt:v=>'+'+v+' to Energy Shield'},
 {id:'rn_res',  n:'Rune of Warding', stat:'res',   txt:v=>'+'+v+'% to all Resistances'}""",
""" /* these four are magnitude-based and slot-agnostic; unchanged this pass */
 {id:'rn_arm',  n:'Rune of the Wall',stat:'ar',  flatByMag:1, txt:v=>'+'+v+' to Armour'},
 {id:'rn_eva',  n:'Rune of the Fox', stat:'ev',  flatByMag:1, txt:v=>'+'+v+' to Evasion'},
 {id:'rn_es',   n:'Rune of the Veil',stat:'es',  flatByMag:1, txt:v=>'+'+v+' to Energy Shield'},
 {id:'rn_res',  n:'Rune of Warding', stat:'res', flatByMag:1, txt:v=>'+'+v+'% to all Resistances'}""")

rep('make',
"""  const v=RUNE_MAG[6-tier];
  return {uid:UID++, kind:'rune', baseId:t.id, runeType:t.id, tier:tier,
          name:t.n+' (T'+tier+')', baseName:t.n, w:1,h:1, ico:'gem',
          rarity:'gem', stat:t.stat, v:v, mods:[{text:t.txt(v)}], qty:1, max:20};""",
"""  const v=RUNE_MAG[6-tier];
  /* `v` is kept for the defensive runes and for anything legacy that reads it;
     the family runes derive their value from the slot via runeEffect(). */
  const line = t.flatByMag ? t.txt(v) : t.txt(tier);
  return {uid:UID++, kind:'rune', baseId:t.id, runeType:t.id, tier:tier,
          name:t.n+' (T'+tier+')', baseName:t.n, w:1,h:1, ico:'gem',
          rarity:'gem', stat:t.stat, v:v, mods:[{text:line}], qty:1, max:20};""")

# ===================================================== 3. AGGREGATION
rep('totals',
"""      const bucket = (k==='weapon') ? t.weapon : t.armour;
      it.runes.forEach(r=>{
        if(!r || t[r.stat]===undefined) return;
        const v=r.v||0;
        t[r.stat]+=v;            /* the blind aggregate, unchanged */
        bucket[r.stat]+=v;       /* and where it actually sits */
      });""",
"""      const isWeapon = (k==='weapon');
      const bucket = isWeapon ? t.weapon : t.armour;
      it.runes.forEach(r=>{
        if(!r) return;
        /* ⚠ THE VALUE COMES FROM THE SLOT, NOT FROM THE ITEM. A stored `v` was
           fixed at creation and cannot express "25% in a weapon, 12% resistance
           in armour". runeEffect() is the single source. */
        const eff = window.runeEffect
          ? runeEffect(r.runeType||r.baseId, r.tier, isWeapon?'weapon':'armour')
          : { kind:'flat', family:null, v:r.v||0 };
        if(eff.kind==='pct'){
          t.pct[eff.family] = (t.pct[eff.family]||0) + eff.v;
        } else if(eff.kind==='res'){
          t.res4[eff.family] = (t.res4[eff.family]||0) + eff.v;
        } else if(eff.kind==='flat' && t[r.stat]!==undefined){
          t[r.stat]+=eff.v;
          bucket[r.stat]+=eff.v;
        }
      });""")

rep('zero',
"""const RUNE_ZERO = () => ({phys:0,fire:0,cold:0,light:0,pois:0,ar:0,ev:0,es:0,res:0});
window.runeTotals=function(){
  const t=RUNE_ZERO();
  t.weapon=RUNE_ZERO();
  t.armour=RUNE_ZERO();""",
"""const RUNE_ZERO = () => ({phys:0,fire:0,cold:0,light:0,pois:0,ar:0,ev:0,es:0,res:0});
window.runeTotals=function(){
  const t=RUNE_ZERO();
  t.weapon=RUNE_ZERO();
  t.armour=RUNE_ZERO();
  /* the two new outputs: % damage from weapon sockets, per-family resistance
     from armour sockets. Kept separate from the flat aggregate so a caller
     cannot accidentally add a percentage to a flat total. */
  t.pct ={phys:0,fire:0,cold:0,light:0,pois:0};
  t.res4={fire:0,cold:0,light:0,pois:0};""")

# ===================================================== 4. THE STAT SYSTEMS
rep('buildstats',
"""      const rw = rt.weapon || rt;
      for(const k in RUNE_TO_FAMILY){
        const v = rw[k]||0;
        st.range[k].lo+=v; st.range[k].hi+=v;
        st.flat[k] += v;
      }""",
"""      /* flat family damage from runes (none today — the family runes are % —
         but the path stays so a future flat rune needs no plumbing) */
      const rw = rt.weapon || rt;
      for(const k in RUNE_TO_FAMILY){
        const v = rw[k]||0;
        if(!v) continue;
        st.range[k].lo+=v; st.range[k].hi+=v;
        st.flat[k] += v;
      }
      /* ⚠ % FROM WEAPON SOCKETS GOES WHERE AFFIX % GOES, so it is additive with
         it — which is exactly the self-limiting behaviour that was measured. */
      if(rt.pct) for(const k in rt.pct) st.pct[k] += rt.pct[k]||0;""")

rep('buildstats-res',
"""      const ra = rt.armour || rt;
      st.ar+=ra.ar||0; st.ev+=ra.ev||0; st.es+=ra.es||0;
      ['fire','cold','light','pois'].forEach(k=>st.res[k]+=ra.res||0);""",
"""      const ra = rt.armour || rt;
      st.ar+=ra.ar||0; st.ev+=ra.ev||0; st.es+=ra.es||0;
      /* Warding is all-families; Cinders/Frost/Storms/Blight are per-family */
      ['fire','cold','light','pois'].forEach(k=>{
        st.res[k] += (ra.res||0) + ((rt.res4 && rt.res4[k])||0);
      });""")

rep('collectmods',
"""      const ra=rt.armour||rt;
      add('ar_flat',ra.ar); add('ev_flat',ra.ev); add('esflat',ra.es);
      ['fres','cres','lres','pres'].forEach(k=>add(k, ra.res));""",
"""      const ra=rt.armour||rt;
      add('ar_flat',ra.ar); add('ev_flat',ra.ev); add('esflat',ra.es);
      ['fres','cres','lres','pres'].forEach(k=>add(k, ra.res));
      /* the per-family half, mapped onto the sheet's resistance keys */
      if(rt.res4){
        add('fres', rt.res4.fire); add('cres', rt.res4.cold);
        add('lres', rt.res4.light); add('pres', rt.res4.pois);
      }""")

open('work.html','w',encoding='utf-8').write(src)
print('applied:', hits)
