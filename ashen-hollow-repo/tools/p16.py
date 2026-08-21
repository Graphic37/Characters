src = open('work.html', encoding='utf-8').read()
hits = {}
def rep(name, old, new, count=1):
    global src
    n = src.count(old)
    assert n == count, f"{name}: expected {count}, found {n}"
    src = src.replace(old, new); hits[name] = n

rep('pair-unit',
"""  /* THE TOGGLE WAS ASYMMETRIC. Opening Skills also opens the stash on the GEMS
     tab (supports are useless unless you can see what they modify), but closing
     Skills left that stash behind — so a second press did not return you to the
     world, it left one orphaned panel that then rendered small because
     `pairOpen` had cleared. Press K twice and you are back where you started. */
  if(!open && id==='skillPanel' && window.__skillsOpenedStash){
    window.__skillsOpenedStash = false;
    try{
      const sp=$('#stashPanel');
      if(sp && sp.classList.contains('open')) togglePanel('stashPanel', false);
    }catch(e){ window.ahErr&&window.ahErr(e,'togglePanel:pairClose'); }
  }
  /* he closed the stash himself: skills no longer owns it */
  if(!open && id==='stashPanel') window.__skillsOpenedStash = false;""",
"""  /* THE PAIR IS ONE THING, SO IT CLOSES AS ONE THING.
     Opening Skills also opens the stash on the GEMS tab (supports are useless
     unless you can see what they modify) — but closing either half used to
     leave the other behind, and a lone half renders TINY because `pairOpen`
     has cleared and with it the dock's size clamp. That is what he saw both
     times: skills alone after closing the stash, and a stash alone after
     closing skills.
     v157 tried to be clever about WHO opened the stash and kept it open if he
     had. That still leaves a half-size panel on screen, which is the actual
     complaint — so the rule is now flat and predictable: while both are open,
     closing either closes both. Opening the stash on its own with B is
     untouched; only the PAIR behaves as a unit.
     The re-entrancy guard matters: closing one calls back into here to close
     the other, which would call back again. */
  if(!open && !window.__pairClosing && (id==='skillPanel' || id==='stashPanel')){
    const other = id==='skillPanel' ? 'stashPanel' : 'skillPanel';
    try{
      const op=$('#'+other);
      if(op && op.classList.contains('open')){
        window.__pairClosing = true;
        togglePanel(other, false);
      }
    }catch(e){ window.ahErr&&window.ahErr(e,'togglePanel:pairClose'); }
    finally{ window.__pairClosing = false; }
  }""")

# the flag set on open is no longer read anywhere; drop it rather than leave a
# variable that looks meaningful and is not
rep('drop-flag',
"""        if(sp && !sp.classList.contains('open')){
          /* remember that WE opened it, so closing skills can put it away
             again. If he opened the stash himself first, this stays false and
             his stash is left alone — the panel he asked for outlives the one
             that borrowed it. */
          window.__skillsOpenedStash = true;
          togglePanel('stashPanel', true);
        }""",
"""        if(sp && !sp.classList.contains('open')) togglePanel('stashPanel', true);""")

open('work.html','w',encoding='utf-8').write(src)
print('applied:', hits)
