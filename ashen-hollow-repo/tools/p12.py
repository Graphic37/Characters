src = open('work.html', encoding='utf-8').read()
hits = {}
def rep(name, old, new, count=1):
    global src
    n = src.count(old)
    assert n == count, f"{name}: expected {count}, found {n}"
    src = src.replace(old, new); hits[name] = n

# ---- remember whether SKILLS is the reason the stash is open ---------------
rep('flag',
"""        stashTab='st2';
        const sp=$('#stashPanel');
        if(sp && !sp.classList.contains('open')) togglePanel('stashPanel', true);
        else drawStash();""",
"""        stashTab='st2';
        const sp=$('#stashPanel');
        if(sp && !sp.classList.contains('open')){
          /* remember that WE opened it, so closing skills can put it away
             again. If he opened the stash himself first, this stays false and
             his stash is left alone — the panel he asked for outlives the one
             that borrowed it. */
          window.__skillsOpenedStash = true;
          togglePanel('stashPanel', true);
        }
        else drawStash();""")

# ---- and close it again on the way out ------------------------------------
rep('close-pair',
"""  p.classList.toggle('open',open);
  scheduleFit();
  refreshMenu();""",
"""  p.classList.toggle('open',open);
  /* THE TOGGLE WAS ASYMMETRIC. Opening Skills also opens the stash on the GEMS
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
  if(!open && id==='stashPanel') window.__skillsOpenedStash = false;
  scheduleFit();
  refreshMenu();""")

open('work.html','w',encoding='utf-8').write(src)
print('applied:', hits)
