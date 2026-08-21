src = open('work.html', encoding='utf-8').read()
hits = {}
def rep(name, old, new, count=1):
    global src
    n = src.count(old)
    assert n == count, f"{name}: expected {count}, found {n}"
    src = src.replace(old, new); hits[name] = n

rep('gate',
"""  if(!rune || rune.kind!=='rune') return {ok:false, why:'That is not a rune.'};""",
"""  if(!rune || rune.kind!=='rune') return {ok:false, why:'That is not a rune.'};
  /* ⚠ REFUSE, DO NOT ACCEPT-AND-DO-NOTHING. Socketing consumes the rune and
     the socket; letting Wall into a pure Evasion base would burn both for zero
     effect with nothing on screen to explain it (the same reason v194 made
     Iron refuse armour rather than sit there inert). */
  try{
    const fit=window.runeFitsItem? runeFitsItem(rune.runeType, item) : {ok:true};
    if(!fit.ok) return {ok:false, why:fit.why};
  }catch(e){ window.ahErr&&window.ahErr(e,'socketRune:fit'); }""")

# ============================================ THE ALT OVERFLOW
CSS = """
/* ---- the tooltip must never run off the screen (v244) --------------------
   ⚠ HOLDING ALT ADDS THE ROLL RANGES, which can double the panel's height —
   and a tooltip anchored near the bottom of the screen then extends past it
   with no way to read the end. Capping the height and letting the BODY scroll
   keeps the frame intact and the content reachable; the header stays put so
   the item name is always visible.
   `85vh` rather than `100vh` so it still reads as a floating panel. */
#tipwrap .tip{ max-height:85vh; display:flex; flex-direction:column }
#tipwrap .tip .tip-head{ flex:none }
#tipwrap .tip .tip-body{ overflow-y:auto; overscroll-behavior:contain; min-height:0 }
/* a thin scrollbar, so the panel does not gain a chunky OS-grey bar */
#tipwrap .tip .tip-body::-webkit-scrollbar{ width:6px }
#tipwrap .tip .tip-body::-webkit-scrollbar-thumb{
  background:#4a4335; border-radius:3px;
}
#tipwrap .tip .tip-body::-webkit-scrollbar-track{ background:transparent }
"""
rep('css', "\n</style>", "\n" + CSS + "\n</style>")

open('work.html','w',encoding='utf-8').write(src)
print('applied:', hits)
