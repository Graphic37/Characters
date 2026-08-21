src = open('work.html', encoding='utf-8').read()
hits = {}
def rep(name, old, new, count=1):
    global src
    n = src.count(old)
    assert n == count, f"{name}: expected {count}, found {n}"
    src = src.replace(old, new); hits[name] = n

rep('rune-art-table',
"""window.CURRENCY_ART = CURRENCY_ART;
window.CURRENCY_ART_BASE = CURRENCY_ART_BASE;""",
"""window.CURRENCY_ART = CURRENCY_ART;
window.CURRENCY_ART_BASE = CURRENCY_ART_BASE;

/* Rune artwork, same repo and the same by-id convention as the currency icons.
   ONE image per TYPE, not per tier: a rune's tier is already stated by which
   column it sits in on the board and by the "(T3)" in its name, so 45 files
   would be 36 files of duplicated work for information the UI already carries.
   Every entry is optional — a missing file falls through to the procedural
   gem below, so they can be added one at a time. */
const RUNE_ART = {};
['rn_phys','rn_fire','rn_cold','rn_lght','rn_pois','rn_arm','rn_eva','rn_es','rn_res']
  .forEach(id => { RUNE_ART[id] = CURRENCY_ART_BASE + id + '.png'; });
window.RUNE_ART = RUNE_ART;""")

rep('rune-art-branch',
"""  /* real gear art first; everything below is the existing fallback chain */
  if(window.GEAR_ART_ON!==false){""",
"""  /* runes, before the gameicons branch for the same reason as currency */
  if(it && it.kind==='rune' && window.RUNE_ART_ON!==false){
    const src = RUNE_ART[it.runeType || it.baseId];
    if(src) return '<img src="'+src+'" alt="" draggable="false" '+
      'style="width:100%;height:100%;object-fit:contain;pointer-events:none">';
  }
  /* real gear art first; everything below is the existing fallback chain */
  if(window.GEAR_ART_ON!==false){""")

open('work.html','w',encoding='utf-8').write(src)
print('applied:', hits)
