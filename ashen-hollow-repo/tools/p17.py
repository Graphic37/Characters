src = open('work.html', encoding='utf-8').read()
hits = {}
def rep(name, old, new, count=1):
    global src
    n = src.count(old)
    assert n == count, f"{name}: expected {count}, found {n}"
    src = src.replace(old, new); hits[name] = n

# ============================================ 1. RIGHT-CLICK IN THE WORLD
# THE ONE HE REPORTED. v139 removed the left-click cast and wrote "left click no
# longer casts" directly above this line — while the right-click cast sat on the
# next line untouched. RMB fired LOADOUT.actives[1], which is Multishot.
rep('rmb',
"""  if(e.button===0){ pickTarget(); }
  else if(e.button===2){ const id=LOADOUT.actives[1]; if(id) useSkill(id); }""",
"""  if(e.button===0){ pickTarget(); }
  /* RIGHT CLICK NO LONGER CASTS EITHER. Auto does the casting — a manual path
     lets him out-damage his own build and makes every Auto measurement a lie,
     because the run log cannot tell his casts from the AI's. */""")

# ============================================ 2. THE TRAY AND THE 1/2/3 KEYS
# The tray became a readout in v139. These two callers of fireSkill() kept it a
# control: clicking a slot, and the number keys.
rep('fireskill',
"""function fireSkill(i){
  /* combat owns the tray now; the old demo cooldown would fight it */
  if(window.LOADOUT && window.useSkill){
    const id=window.LOADOUT.actives[i];
    if(id) window.useSkill(id);
    return;
  }""",
"""let _autoHinted=false;
function fireSkill(i){
  /* THE TRAY IS A READOUT, NOT A CONTROL (v139) — but its click handler and the
     1/2/3 keys still called through to useSkill, so two of the four "removed"
     cast paths were live. Kept as a function because both callers still exist
     and a missing one would throw inside a guard; it just no longer casts.
     One hint, once, because a control that silently does nothing reads as
     broken — and this one is deliberate. */
  if(window.LOADOUT && window.useSkill){
    if(!_autoHinted){
      _autoHinted=true;
      try{ toast('Skills are cast automatically — the tray is a readout.'); }
      catch(e){ window.ahErr&&window.ahErr(e,'fireSkill:hint'); }
    }
    return;
  }""")

# ============================================ 3. AND A FULL HEAL ON CLICK
# Clicking either globe set S.life = 1 / S.mana = 1. That is a prototype refill
# from the original UI kit, shipped: click the red orb, full health.
rep('orbs',
"""    const orb=closest('.orbwrap');
    if(orb){ if(orb.classList.contains('hp')) S.life=1; else S.mana=1; drawHUD(); return; }""",
"""    const orb=closest('.orbwrap');
    if(orb){
      /* ⚠ THIS WAS A FREE FULL HEAL. Clicking the globe set life (or mana) to
         1.0 — a refill from the original UI-kit demo that was never taken out.
         Debug builds keep it; the shipped game does not. */
      if(window.AH_DEBUG){ if(orb.classList.contains('hp')) S.life=1; else S.mana=1; drawHUD(); }
      return;
    }""")

open('work.html','w',encoding='utf-8').write(src)
print('applied:', hits)
