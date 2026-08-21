src = open('work.html', encoding='utf-8').read()
hits = {}
def rep(name, old, new, count=1):
    global src
    n = src.count(old)
    assert n == count, f"{name}: expected {count}, found {n}"
    src = src.replace(old, new); hits[name] = n

rep('wire',
"""    if(md.unique && /increased Armour/.test(md.text)) arP+=md.v;
  });""",
"""    if(md.unique && /increased Armour/.test(md.text)) arP+=md.v;
  });
  /* ⚠⚠ THE v244 DEFENSIVE RUNES DID NOTHING IN PLAY. I built
     `itemLocalDefence()`, exported it, and tested it — and never called it from
     anywhere. `pieceDefence` is the ONE place an equipped item's defence
     reaches the character, so the runes have to land HERE.
     Added into the SAME percentage accumulator the local affixes use, which is
     what "additive with other local % defence" actually means — a separate
     multiply afterwards would have been the multiplicative version he ruled
     out. Three T1 Walls plus a 20% local affix is +86%, not 1.66 x 1.20. */
  try{
    (it.runes||[]).forEach(r=>{
      if(!r || !window.runeEffect) return;
      const eff=runeEffect(r.runeType||r.baseId, r.tier, 'armour');
      if(!eff || eff.kind!=='localpct') return;
      if(eff.stat==='ar') arP+=eff.v;
      else if(eff.stat==='ev') evP+=eff.v;
      else if(eff.stat==='es') esP+=eff.v;
    });
  }catch(e){ window.ahErr&&window.ahErr(e,'pieceDefence:runes'); }""")

open('work.html','w',encoding='utf-8').write(src)
print('applied:', hits)
