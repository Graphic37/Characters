src = open('work.html', encoding='utf-8').read()
hits = {}
def rep(name, old, new, count=1):
    global src
    n = src.count(old)
    assert n == count, f"{name}: expected {count}, found {n}"
    src = src.replace(old, new); hits[name] = n

# ============================================ 1. THE NAME, ONCE
rep('dupe',
"""  if(it.rarity!=='normal' && it.baseName!==it.name && it.kind!=='currency')
    head+='<div class="tip-base">'+it.baseName+'</div>';""",
"""  /* ⚠ A RUNE'S NAME IS ITS BASE NAME PLUS A TIER. "Rune of Cinders (T5)" and
     "Rune of Cinders" are DIFFERENT STRINGS, so the inequality guard passed and
     the tooltip printed the name twice — once with the tier, once without. The
     tier already appears in the header AND on its own Tier row below, so the
     base line carries nothing at all here.
     Compare on the part that is actually the base: if the name merely adds a
     suffix to it, there is no second name to show. */
  const baseIsRedundant = it.baseName && it.name &&
    (it.name===it.baseName || it.name.indexOf(it.baseName)===0);
  if(it.rarity!=='normal' && !baseIsRedundant && it.kind!=='currency')
    head+='<div class="tip-base">'+it.baseName+'</div>';""")

# ============================================ 2. WEAPON FIRST, ONE PER LINE
rep('lines',
"""  if(it.kind==='rune'){
    b+='<hr><div class="prop">Tier: <b>T'+it.tier+'</b>'+
       (it.tier>1?'<span class="lo"> \\u00b7 five fuse into T'+(it.tier-1)+'</span>':
                  '<span class="lo"> \\u00b7 highest tier</span>')+'</div>';
  }""",
"""  if(it.kind==='rune'){
    b+='<hr><div class="prop">Tier: <b>T'+it.tier+'</b>'+
       (it.tier>1?'<span class="lo"> \\u00b7 five fuse into T'+(it.tier-1)+'</span>':
                  '<span class="lo"> \\u00b7 highest tier</span>')+'</div>';
    /* ⚠ ONE GRANT PER LINE, WEAPON FIRST. The text already carried a `\\n`
       between the two halves — HTML collapses it, so both ran together as
       "Weapon: 6% increased Fire Damage Armour: +3% to Fire Resistance", which
       reads as one broken sentence. PoE2 puts each grant on its own row with
       the weapon line above the armour line, because a player is choosing
       between two slots and wants to compare them, not parse them. */
    try{
      const txt = window.RUNE_STAT_TEXT ? RUNE_STAT_TEXT(it) : '';
      if(txt){
        const rows = String(txt).split('\\n').map(x=>x.trim()).filter(Boolean);
        /* weapon before armour whatever order the definition wrote them in */
        rows.sort((x,y)=>{
          const rank=(v)=>/^weapon/i.test(v)?0:/^armour|^armor/i.test(v)?1:2;
          return rank(x)-rank(y);
        });
        b+='<hr>';
        rows.forEach(r=>{ b+='<div class="runeline">'+r+'</div>'; });
      }
    }catch(e){ window.ahErr&&window.ahErr(e,'tip:runeItem'); }
  }""")

open('work.html','w',encoding='utf-8').write(src)
print('applied:', hits)
