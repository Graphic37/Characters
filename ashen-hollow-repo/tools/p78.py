src = open('work.html', encoding='utf-8').read()
hits = {}
def rep(name, old, new, count=1):
    global src
    n = src.count(old)
    assert n == count, f"{name}: expected {count}, found {n}"
    src = src.replace(old, new); hits[name] = n

# ============================================ 1. DROP MY OWN NOISE LINE
rep('nosockets',
"""    /* SOCKETS WERE INVISIBLE ON THE ITEM ITSELF. The count lived only in the
       vendor panel, and a socketed rune appeared nowhere at all, so there was
       no way to tell a fully-runed item from a bare one. */
    const scap=it.socketCount||0;
    if(!scap){
      b+='<hr><div class="prop lo">No sockets <span class="lo">'+
         '&mdash; a Socket Orb adds one (max '+(it.socketCapNormal||1)+')</span></div>';
    }
    if(scap){""",
"""    /* ⚠ "No sockets — a Socket Orb adds one (max 2)" WAS MINE (v172) and it is
       gone. I added it because "no sockets" and "empty sockets" looked
       identical, but the fix for an ambiguity is not a sentence on every
       socketless item in the game — an absent Sockets row already says it, and
       he knows what a Socket Orb does. Tooltip lines are expensive: every one
       is read past to reach the affixes. */
    const scap=it.socketCount||0;
    if(scap){""")

# ============================================ 2. THE RUNE LINE, PoE2 STYLE
rep('runeline',
"""      for(let i=0;i<scap;i++){
        const r=rs[i];
        b+= r ? ('<div class="runeline">'+r.name+' \\u2014 '+
                 (window.RUNE_STAT_TEXT? window.RUNE_STAT_TEXT(r) : ('+'+r.v))+'</div>')
              : '<div class="runeline empty">Empty socket</div>';
      }""",
"""      /* ⚠ SHOW ONLY THE HALF THAT APPLIES TO *THIS* ITEM. A rune grants a
         weapon effect OR an armour effect depending on where it sits (v191),
         and printing both meant a helmet's tooltip explained a weapon bonus it
         could not possibly give — three wrapped lines per socket, twice.
         PoE2 prints one short line: the stat the item actually grants. The
         slot is already known here, so the tooltip can simply not mention the
         irrelevant half. */
      const slotKind = (it.cat==='weapon') ? 'weapon' : 'armour';
      for(let i=0;i<scap;i++){
        const r=rs[i];
        if(!r){ b+='<div class="runeline empty">Empty socket</div>'; continue; }
        let line='';
        try{
          const eff = window.runeEffect
            ? runeEffect(r.runeType||r.baseId, r.tier, slotKind) : null;
          if(eff && eff.kind==='pct')      line=eff.v+'% increased '+FAM_NAME(eff.family)+' Damage';
          else if(eff && eff.kind==='res') line='+'+eff.v+'% to '+FAM_NAME(eff.family)+' Resistance';
          else if(eff && eff.kind==='flat')line=RUNE_FLAT_TEXT(r, eff.v);
          else if(eff && eff.kind==='none')line='No effect in this item';
        }catch(e){ window.ahErr&&window.ahErr(e,'tip:rune'); }
        if(!line) line=(window.RUNE_STAT_TEXT? RUNE_STAT_TEXT(r) : ('+'+r.v));
        b+='<div class="runeline">'+line+'</div>';
      }""")

# the two little name helpers the block above needs
rep('names',
"""function tipHTML(it, cmp, vs){""",
"""/* family id -> the word a player reads */
function FAM_NAME(f){
  return f==='phys' ? 'Physical' : f==='fire' ? 'Fire' : f==='cold' ? 'Cold'
       : f==='light' ? 'Lightning' : f==='pois' ? 'Poison' : '';
}
/* the four defensive runes are magnitude-based and slot-agnostic */
function RUNE_FLAT_TEXT(r, v){
  const s=r.stat;
  return s==='ar'  ? '+'+v+' to Armour'
       : s==='ev'  ? '+'+v+' to Evasion'
       : s==='es'  ? '+'+v+' to Energy Shield'
       : s==='res' ? '+'+v+'% to all Resistances'
       : '+'+v;
}

function tipHTML(it, cmp, vs){""")

open('work.html','w',encoding='utf-8').write(src)
print('applied:', hits)
