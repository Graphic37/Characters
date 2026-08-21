src = open('work.html', encoding='utf-8').read()
hits = {}
def rep(name, old, new, count=1):
    global src
    n = src.count(old)
    assert n == count, f"{name}: expected {count}, found {n}"
    src = src.replace(old, new); hits[name] = n

rep('dupe',
"""    try{
      const txt = window.RUNE_STAT_TEXT ? RUNE_STAT_TEXT(it) : '';
      if(txt){
        const rows = String(txt).split('\\n').map(x=>x.trim()).filter(Boolean);""",
"""    /* ⚠ THE GRANT WAS ALREADY ON THE ITEM AS A MOD. `makeRune` stores the same
       sentence in `it.mods`, which the affix section below renders — so adding
       my own row in v243 printed it TWICE, identically. It was invisible while
       the two halves differed ("Weapon: …" vs "Armour: …" read as one wrapped
       line); the moment Wall became a single local-% line in v244 the
       duplication was plain.
       The mod IS the grant, so render from `mods` and drop the second copy —
       `RUNE_STAT_TEXT` stays for the socket rows, which need the slot-aware
       version rather than the stored one. */
    try{
      const stored=(it.mods||[]).map(m=>String(m.text||'').trim()).filter(Boolean);
      const txt = stored.length ? stored.join('\\n')
                : (window.RUNE_STAT_TEXT ? RUNE_STAT_TEXT(it) : '');
      if(txt){
        const rows = String(txt).split('\\n').map(x=>x.trim()).filter(Boolean)
          /* one line per DISTINCT grant, whatever produced it */
          .filter((v,i,a)=>a.indexOf(v)===i);""")

open('work.html','w',encoding='utf-8').write(src)
print('applied:', hits)
