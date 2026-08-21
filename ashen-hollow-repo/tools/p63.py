src = open('work.html', encoding='utf-8').read()
hits = {}
def rep(name, old, new, count=1):
    global src
    n = src.count(old)
    assert n == count, f"{name}: expected {count}, found {n}"
    src = src.replace(old, new); hits[name] = n

# ⚠ I BUILT A SECOND TOP BAR ON TOP OF AN EXISTING ONE.
# `eliteHud` already existed: fixed, top-centre, z-index 58 — a named elite
# ("Sarrus the Pale"), a health bar, affix caps and accumulated damage. My v194
# pack bar sits at top:16px z-index 40 and does the same job with worse
# information, so they overlap and fight. I never checked whether the display
# already existed; I checked whether the DATA did.
#
# Removing MINE, not his: eliteHud is older, richer (real names, damage total,
# end caps) and is the one his D3 reference actually resembles. The head plate
# from v198 stays — that answers a different question (WHICH one am I hitting)
# and sits over the enemy, not at the top.

rep('kill-tick',
"""  window.updatePackBar && window.updatePackBar();
  window.updateHeadPlate && window.updateHeadPlate();""",
"""  /* the pack bar is gone (v208) — `eliteHud` already owns the top of the
     screen and did so before I added a second one. The head plate stays. */
  window.updateHeadPlate && window.updateHeadPlate();""")

rep('kill-fn',
"""function updatePackBar(){""",
"""/* ⚠ RETIRED IN v208 — DO NOT RE-ENABLE.
   `eliteHud` (top-centre, z-index 58) already showed the engaged elite: its
   name, health, affixes and accumulated damage. This drew a second bar a few
   pixels above it with less information, and the two overlapped on screen.
   Kept as a no-op rather than deleted because `PACKBAR_RESET` and the frame
   hook are referenced elsewhere; the body is what mattered and it is gone.
   `packInfo()` survives below — it is genuinely useful and nothing else
   computes pack-wide health. */
function updatePackBar(){
  if(PACKBAR.el) PACKBAR.el.classList.remove('on');
  return;
}
function updatePackBar_retired(){""")

open('work.html','w',encoding='utf-8').write(src)
print('applied:', hits)
