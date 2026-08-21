src = open('work.html', encoding='utf-8').read()
hits = {}
def rep(name, old, new, count=1):
    global src
    n = src.count(old)
    assert n == count, f"{name}: expected {count}, found {n}"
    src = src.replace(old, new); hits[name] = n

rep('effect',
"""  /* the four dedicated defensive runes are unchanged for now */
  return { kind:'flat', family:null, v:RUNE_MAG[i] };""",
"""  /* Wall / Fox / Veil: LOCAL % of the socketed item's own defence */
  const loc=RUNE_LOCAL_STAT[runeType];
  if(loc) return { kind:'localpct', family:null, stat:loc, v:RUNE_LOCAL_PCT[i] };
  /* Warding: the broad option, all four families at once */
  if(runeType==='rn_res') return { kind:'allres', family:null, v:RUNE_ALLRES[i] };
  return { kind:'flat', family:null, v:RUNE_MAG[i] };""")

# runeTotals must carry the new kinds
rep('totals',
"""        } else if(eff.kind==='res'){
          t.res4[eff.family] = (t.res4[eff.family]||0) + eff.v;
        } else if(eff.kind==='flat' && t[r.stat]!==undefined){""",
"""        } else if(eff.kind==='res'){
          t.res4[eff.family] = (t.res4[eff.family]||0) + eff.v;
        } else if(eff.kind==='allres'){
          /* ⚠ WARDING IS THE ONLY GLOBAL DEFENSIVE RUNE. It adds to every
             family, which is exactly why its per-point value is lower. */
          t.res4.fire+=eff.v; t.res4.cold+=eff.v;
          t.res4.light+=eff.v; t.res4.pois+=eff.v;
          t.res+=eff.v*4;
        } else if(eff.kind==='localpct'){
          /* ⚠ NOT ADDED HERE. A local percentage belongs to the ITEM, not to
             the character — summing it into a global bucket is precisely the
             "global percentage stackable in every ring" failure the placement
             rule exists to prevent. `itemLocalDefence` applies it per item. */
        } else if(eff.kind==='flat' && t[r.stat]!==undefined){""")

# the per-item application
rep('apply',
"""const RUNE_ZERO = () => ({phys:0,fire:0,cold:0,light:0,pois:0,ar:0,ev:0,es:0,res:0});""",
"""const RUNE_ZERO = () => ({phys:0,fire:0,cold:0,light:0,pois:0,ar:0,ev:0,es:0,res:0});

/* ===========================================================================
   LOCAL DEFENCE — the item's own armour/evasion/ES after its runes
   ---------------------------------------------------------------------------
   ⚠ ADDITIVE, NOT MULTIPLICATIVE. Three T1 Walls are +66%, not 1.22^3 = +82%.
   Additive is what makes each extra socket worth slightly less than the last,
   which is the self-dilution that keeps the offensive runes honest — and it
   is what he asked for explicitly.
   ========================================================================= */
window.itemLocalDefence=function(it){
  const base=(window.itemNativeDefence? itemNativeDefence(it) : {ar:0,ev:0,es:0});
  const out={ ar:base.ar||0, ev:base.ev||0, es:base.es||0, pct:{ar:0,ev:0,es:0} };
  try{
    (it&&it.runes||[]).forEach(r=>{
      if(!r) return;
      const eff=window.runeEffect ? runeEffect(r.runeType||r.baseId, r.tier, 'armour') : null;
      if(eff && eff.kind==='localpct' && out.pct[eff.stat]!==undefined)
        out.pct[eff.stat]+=eff.v;
    });
    ['ar','ev','es'].forEach(k=>{
      /* a percentage of nothing is nothing — the placement rule should have
         stopped this, but a legacy save may hold a rune socketed before it */
      if(out[k]) out[k]=Math.round(out[k]*(1+out.pct[k]/100));
    });
  }catch(e){ window.ahErr&&window.ahErr(e,'itemLocalDefence'); }
  return out;
};""")

open('work.html','w',encoding='utf-8').write(src)
print('applied:', hits)
