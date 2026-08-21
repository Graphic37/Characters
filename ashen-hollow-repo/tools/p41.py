src = open('work.html', encoding='utf-8').read()
hits = {}
def rep(name, old, new, count=1):
    global src
    n = src.count(old)
    assert n == count, f"{name}: expected {count}, found {n}"
    src = src.replace(old, new); hits[name] = n

# ===================================================== 1. SLOT-AWARE RUNES
rep('rune-totals',
"""/* what the equipped runes are worth, summed across every slot */
window.runeTotals=function(){
  const t={phys:0,fire:0,cold:0,light:0,pois:0,ar:0,ev:0,es:0,res:0};
  try{
    for(const k in EQ){
      const it=EQ[k]; if(!it||!it.runes) continue;
      it.runes.forEach(r=>{ if(r && t[r.stat]!==undefined) t[r.stat]+=r.v||0; });
    }
  }catch(e){ window.ahErr&&window.ahErr(e,'runeTotals:20617'); }
  return t;
};""",
"""/* ===========================================================================
   WHAT THE EQUIPPED RUNES ARE WORTH — SPLIT BY WHERE THEY SIT
   ---------------------------------------------------------------------------
   The design rule is "weapon socket = offensive effect, armour socket =
   defensive effect", and that cannot be expressed at all while the totals are
   summed blind across every slot. So the split is produced here, at the only
   place that knows which item a rune came out of.

   The flat aggregate is KEPT alongside it: several callers still want "all
   runes", and removing it in the same change that adds the split would be two
   edits pretending to be one.
   ========================================================================= */
const RUNE_ZERO = () => ({phys:0,fire:0,cold:0,light:0,pois:0,ar:0,ev:0,es:0,res:0});
window.runeTotals=function(){
  const t=RUNE_ZERO();
  t.weapon=RUNE_ZERO();
  t.armour=RUNE_ZERO();
  try{
    for(const k in EQ){
      const it=EQ[k]; if(!it||!it.runes) continue;
      /* `weapon` is the only offensive slot; everything else worn is armour for
         this purpose, including rings, amulet and offhand. */
      const bucket = (k==='weapon') ? t.weapon : t.armour;
      it.runes.forEach(r=>{
        if(!r || t[r.stat]===undefined) return;
        const v=r.v||0;
        t[r.stat]+=v;            /* the blind aggregate, unchanged */
        bucket[r.stat]+=v;       /* and where it actually sits */
      });
    }
  }catch(e){ window.ahErr&&window.ahErr(e,'runeTotals:20617'); }
  return t;
};""")

# ===================================================== 2. THE FLAT CONTAINER
rep('flat-build',
"""    pct:{phys:0,fire:0,cold:0,light:0,pois:0},""",
"""    pct:{phys:0,fire:0,cold:0,light:0,pois:0},
    /* ⚠ `flat` IS NOT "ALL FLAT ADDED DAMAGE". It is specifically the flat
       damage that `weaponAvg()` does NOT already include, because skillDamage
       adds the two together. weaponStats() folds the weapon's own `addphys`
       into min/max (it is `local:1, on:['weapon']`), so counting it here too
       would double it. Everything else — elemental added from any slot, and
       ALL rune damage including physical — is invisible to weaponStats and
       belongs here. */
    flat:{phys:0,fire:0,cold:0,light:0,pois:0},""")

rep('flat-affix',
"""        if(STAT_TO_FAMILY[id]!==undefined && m.a!==undefined){
          const f=STAT_TO_FAMILY[id]; st.range[f].lo+=m.a; st.range[f].hi+=m.b; return;
        }""",
"""        if(STAT_TO_FAMILY[id]!==undefined && m.a!==undefined){
          const f=STAT_TO_FAMILY[id];
          st.range[f].lo+=m.a; st.range[f].hi+=m.b;
          /* addphys is weapon-LOCAL and weaponStats has already applied it to
             min/max; adding it again here would double the affix. */
          if(id!=='addphys') st.flat[f] += (m.a+m.b)/2;
          return;
        }""")

rep('flat-rune',
"""      for(const k in RUNE_TO_FAMILY){
        st.range[k].lo+=rt[k]||0; st.range[k].hi+=rt[k]||0;
      }""",
"""      /* ⚠ WEAPON SOCKETS ONLY for the offensive side — the design rule. A
         damage rune sitting in armour contributes nothing to damage; its
         defensive counterpart is not designed yet, so for now it is simply
         inert and that is deliberate rather than an oversight.
         Runes are invisible to weaponStats, so ALL of this is new to the
         calculation — physical included. */
      const rw = rt.weapon || rt;
      for(const k in RUNE_TO_FAMILY){
        const v = rw[k]||0;
        st.range[k].lo+=v; st.range[k].hi+=v;
        st.flat[k] += v;
      }""")

# defensive rune stats come from ARMOUR sockets
rep('flat-def',
"""      st.ar+=rt.ar||0; st.ev+=rt.ev||0; st.es+=rt.es||0;
      ['fire','cold','light','pois'].forEach(k=>st.res[k]+=rt.res||0);""",
"""      /* the defensive side is the mirror: armour sockets, not the weapon */
      const ra = rt.armour || rt;
      st.ar+=ra.ar||0; st.ev+=ra.ev||0; st.es+=ra.es||0;
      ['fire','cold','light','pois'].forEach(k=>st.res[k]+=ra.res||0);""")

rep('collect-def',
"""    if(window.runeTotals){
      const rt=window.runeTotals();
      add('ar_flat',rt.ar); add('ev_flat',rt.ev); add('esflat',rt.es);
      ['fres','cres','lres','pres'].forEach(k=>add(k, rt.res));
    }""",
"""    if(window.runeTotals){
      const rt=window.runeTotals();
      /* armour sockets only — the same rule the damage side follows */
      const ra=rt.armour||rt;
      add('ar_flat',ra.ar); add('ev_flat',ra.ev); add('esflat',ra.es);
      ['fres','cres','lres','pres'].forEach(k=>add(k, ra.res));
    }""")

# the error-path fallback must carry the same shape or gearFlat silently zeroes
rep('fallback',
"""             flat:{phys:0,fire:0,cold:0,light:0,pois:0}, pct:{phys:0,fire:0,cold:0,light:0,pois:0},""",
"""             flat:{phys:0,fire:0,cold:0,light:0,pois:0}, pct:{phys:0,fire:0,cold:0,light:0,pois:0},   /* shape must match buildStats */""")

open('work.html','w',encoding='utf-8').write(src)
print('applied:', hits)
