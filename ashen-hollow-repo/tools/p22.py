src = open('work.html', encoding='utf-8').read()
hits = {}
def rep(name, old, new, count=1):
    global src
    n = src.count(old)
    assert n == count, f"{name}: expected {count}, found {n}"
    src = src.replace(old, new); hits[name] = n

rep('rune-art-names',
"""/* Rune artwork, same repo and the same by-id convention as the currency icons.
   ONE image per TYPE, not per tier: a rune's tier is already stated by which
   column it sits in on the board and by the "(T3)" in its name, so 45 files
   would be 36 files of duplicated work for information the UI already carries.
   Every entry is optional — a missing file falls through to the procedural
   gem below, so they can be added one at a time. */
const RUNE_ART = {};
['rn_phys','rn_fire','rn_cold','rn_lght','rn_pois','rn_arm','rn_eva','rn_es','rn_res']
  .forEach(id => { RUNE_ART[id] = CURRENCY_ART_BASE + id + '.png'; });
window.RUNE_ART = RUNE_ART;""",
"""/* Rune artwork. ONE image per TYPE, not per tier: a rune's tier is already
   stated by which column it sits in on the board and by the "(T3)" in its name.
   Mapped EXPLICITLY to the filenames he uploaded rather than renaming his
   files — the glyph names are what the art actually depicts, and a rename is
   one more chance for a typo nobody notices until an icon is missing.
   Every entry is optional; a missing file falls through to the procedural gem
   below, so they can be added one at a time. */
const RUNE_ART_FILE = {
  rn_phys:'01_arrow',            // Rune of Iron — physical
  rn_fire:'02_flame',            // Rune of Cinders
  rn_cold:'03_snowflake',        // Rune of Frost
  rn_lght:'04_lightning',        // Rune of Storms
  rn_pois:'05_droplet',          // Rune of Blight
  rn_arm :'06_shield',           // Rune of the Wall — armour
  rn_eva :'07_double_chevron',   // Rune of the Fox — evasion
  rn_es  :'08_barrier_outline',  // Rune of the Veil — energy shield
  rn_res :'09_circle_spokes'     // Rune of Warding — resistances
};
const RUNE_ART = {};
Object.keys(RUNE_ART_FILE).forEach(id => {
  RUNE_ART[id] = CURRENCY_ART_BASE + RUNE_ART_FILE[id] + '.png';
});
window.RUNE_ART = RUNE_ART;
window.RUNE_ART_FILE = RUNE_ART_FILE;""")

open('work.html','w',encoding='utf-8').write(src)
print('applied:', hits)
