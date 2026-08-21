src = open('work.html', encoding='utf-8').read()
hits = {}
def rep(name, old, new, count=1):
    global src
    n = src.count(old)
    assert n == count, f"{name}: expected {count}, found {n}"
    src = src.replace(old, new); hits[name] = n

# ===================================================================
# ⚠⚠ REMOVING THE RIGHT-SIDE MINIMAP I BUILT IN v220.
# He inspected v247 himself and was right: `#miniWrap` is not dead CSS, it is
# an actively maintained system — created by `mmapEl()`, baked by
# `mmapBuild()`, ticked by `updateMinimap()` from the frame loop, and the Rift
# HUD was pushed to top:186px specifically to make room for it.
# My repeated answer, "there is only one map", counted map SYSTEMS in the source
# and never answered the question he actually asked: is the box on the right
# mine? It is. Counting the thing I built and calling the count reassuring is
# not an investigation.
# ===================================================================

# 1. the entire JS block
a = src.index('/* ===========================================================================\n   MINIMAP  (v220)')
b = src.index('function questEl(){')
removed_js = b - a
src = src[:a] + (
"/* The right-side minimap that lived here (v220-v242) is GONE (v254).\n"
"   He asked for it removed, not hidden: the element, its canvas, the bake, the\n"
"   frame-loop tick and the Rift HUD offset that existed only to clear it have\n"
"   all been deleted. The top-left map he actually uses is untouched — nothing\n"
"   in this block ever drew it. */\n\n") + src[b:]

# 2. the bake hook at dungeon build
rep('hook',
"""  /* bake the minimap once, AFTER RIFT.nav is set — it reads the nav mesh */
  try{ if(window.mmapBuild) mmapBuild(); }
  catch(e){ window.ahErr&&window.ahErr(e,'mmapBuild:hook'); }""", "")

# 3. the frame-loop tick
rep('tick',
"""  window.updateMinimap && window.updateMinimap();
""", "")

# 4. the Rift HUD offset that existed only for the map
rep('rifthud',
"""/* ⚠ MOVED DOWN FOR THE MINIMAP (v221). This was `top:18px` — the same corner
   the minimap now occupies — so the progress bar drew straight over it. The
   map is 158px tall at top:16, so the bar starts below that. */
riftBar.style.cssText='position:fixed;right:18px;top:186px;z-index:59;'+""",
"""/* ⚠ BACK TO top:18px (v254). It was pushed to 186 in v221 solely to clear the
   right-side minimap; that minimap is gone, so the offset would leave a hole
   where nothing sits. */
riftBar.style.cssText='position:fixed;right:18px;top:18px;z-index:59;'+""")

# 5. the quest board sat under the map; it now sits under the rift bar
rep('quest',
"""#questBoard{
  position:fixed; right:16px; top:250px; z-index:37; pointer-events:none;""",
"""#questBoard{
  /* under the Rift HUD, which starts at 18px and runs ~80px tall */
  position:fixed; right:16px; top:112px; z-index:37; pointer-events:none;""")

open('work.html','w',encoding='utf-8').write(src)
print('removed %d bytes of minimap JS' % removed_js)
print('applied:', hits)
