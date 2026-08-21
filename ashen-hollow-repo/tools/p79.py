src = open('work.html', encoding='utf-8').read()
hits = {}
def rep(name, old, new, count=1):
    global src
    n = src.count(old)
    assert n == count, f"{name}: expected {count}, found {n}"
    src = src.replace(old, new); hits[name] = n

CSS = """
/* ---- tooltip legibility (v217) -------------------------------------------
   ⚠ WIDTH FIRST, THEN TYPE. Raising the font inside a 306px frame just makes
   every affix wrap onto two lines, which is LESS legible, not more — the panel
   gets taller and the eye does more work. The frame widens to 356px and the
   type follows it, so line counts stay the same and each line is simply
   bigger.
   The plate height is measured (`measureTipHead`), so the header follows the
   larger name automatically — nothing here needs a matching magic number. */
body[data-skin="forged"] #tipwrap .tip{ width:356px !important }
body[data-skin="forged"] #tipwrap .tip-name{ font-size:16.5px !important }
body[data-skin="forged"] #tipwrap .tip-base{ font-size:13px !important }
#tipwrap .tip .prop{ font-size:13px }
#tipwrap .tip .mod{ font-size:13px; line-height:1.5 }
#tipwrap .tip .lo{ font-size:11.5px }
#tipwrap .tip hr{ margin:7px 0 }
/* the rune grant: PoE2's light blue, and the same size as an affix so it reads
   as a property of the item rather than as a footnote */
#tipwrap .tip .runeline{
  color:#8fc7ff; font-size:13px; padding:2px 0; line-height:1.45;
}
#tipwrap .tip .runeline.empty{ color:#6a6f78; font-style:italic; font-size:12px }
#tipwrap .tip .sockpip{ width:9px; height:9px }
"""
rep('css', "\n</style>", "\n" + CSS + "\n</style>")

open('work.html','w',encoding='utf-8').write(src)
print('applied:', hits)
