src = open('work.html', encoding='utf-8').read()
hits = {}
def rep(name, old, new, count=1):
    global src
    n = src.count(old)
    assert n == count, f"{name}: expected {count}, found {n}"
    src = src.replace(old, new); hits[name] = n

rep('split',
"""      const stored=(it.mods||[]).map(m=>String(m.text||'').trim()).filter(Boolean);
      const txt = stored.length ? stored.join('\\n')
                : (window.RUNE_STAT_TEXT ? RUNE_STAT_TEXT(it) : '');
      if(txt){
        const rows = String(txt).split('\\n').map(x=>x.trim()).filter(Boolean)
          /* one line per DISTINCT grant, whatever produced it */
          .filter((v,i,a)=>a.indexOf(v)===i);""",
"""      /* ⚠ `RUNE_STAT_TEXT` REPLACES THE NEWLINE WITH ` \\u00b7 ` — it exists for
         the one-line socket rows, so by the time it returns, the boundary the
         split needs is gone and the two halves render as one merged sentence.
         Take the raw definition text instead, which still carries the `\\n`,
         and fall back through `RUNE_STAT_TEXT` only if there is nothing else.
         Split on the newline OR the middot, so either form yields two rows. */
      const stored=(it.mods||[]).map(m=>String(m.text||'').trim()).filter(Boolean);
      let txt = stored.join('\\n');
      if(!txt){
        try{
          const def=(window.RUNE_TYPES||[]).filter(x=>x.id===(it.runeType||it.baseId))[0];
          if(def) txt = def.flatByMag ? def.txt(it.v) : def.txt(it.tier);
        }catch(e){}
      }
      if(!txt && window.RUNE_STAT_TEXT) txt = RUNE_STAT_TEXT(it);
      if(txt){
        const rows = String(txt).split(/\\n|\\s\\u00b7\\s/).map(x=>x.trim()).filter(Boolean)
          /* one line per DISTINCT grant, whatever produced it */
          .filter((v,i,a)=>a.indexOf(v)===i);""")

open('work.html','w',encoding='utf-8').write(src)
print('applied:', hits)
