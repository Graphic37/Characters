# ⚠ p148 asserted on a stale anchor and died BEFORE its write(), so the save,
# load and purchase hunks it reported were never applied. I then read the
# report rather than the file. Verify the file, not the script's output.
src = open('work.html', encoding='utf-8').read()
hits = {}
def rep(name, old, new, count=1):
    global src
    n = src.count(old)
    assert n == count, f"{name}: expected {count}, found {n}"
    src = src.replace(old, new); hits[name] = n

rep('save',
"""      char:{ lvl:S.lvl, xp:S.xp },""",
"""      /* ⚠⚠ GOLD WAS NEVER SAVED. The character started from a hardcoded
         `gold:13897101`, so every purchase REFUNDED ITSELF on reload and every
         sale evaporated. Saved with the tab state it pays for, so the two can
         never disagree.
         ⚠ SAVE_VERSION IS NOT BUMPED: `loadGame` rejects any save whose
         version differs, so bumping would DELETE every existing character to
         add a field. New keys read as undefined in an old save and fall back. */
      char:{ lvl:S.lvl, xp:S.xp, gold:S.gold },
      stash:{ bought:S.stashBought||0,
              names:Object.assign({}, S.stashNames||{}),
              order:(S.stashOrder||[]).slice() },""")

rep('load',
"""    if(d.char){ if(d.char.lvl) S.lvl=d.char.lvl; if(d.char.xp!==undefined) S.xp=d.char.xp; }""",
"""    if(d.char){ if(d.char.lvl) S.lvl=d.char.lvl; if(d.char.xp!==undefined) S.xp=d.char.xp;
                /* an old save has no gold field — keep what he has rather than
                   zeroing him out */
                if(typeof d.char.gold==='number') S.gold=d.char.gold; }
    if(d.stash){
      if(typeof d.stash.bought==='number') S.stashBought=d.stash.bought;
      if(d.stash.names) S.stashNames=Object.assign({}, d.stash.names);
      if(Array.isArray(d.stash.order)) S.stashOrder=d.stash.order.slice();
    }""")

rep('buy',
"""  S.gold-=cost;
  S.stashBought=n+1;
  try{ refreshStashTabs(); refreshAll(); }catch(e){}
  toast('Stash tab unlocked');
  return {ok:true, cost:cost, now:S.stashBought};""",
"""  /* ⚠ DEDUCT AND UNLOCK TOGETHER, THEN SAVE BEFORE ANYTHING CAN THROW. Gold
     leaving without the tab arriving (or the reverse) is the worst outcome
     here, and a redraw is exactly the kind of thing that throws — so the state
     change and its persistence complete first, and the redraw is last and
     cannot undo them. */
  const before={ gold:S.gold, bought:S.stashBought||0 };
  try{
    S.gold-=cost;
    S.stashBought=n+1;
    if(window.saveGame) saveGame();
  }catch(e){
    S.gold=before.gold; S.stashBought=before.bought;   /* nothing partial */
    window.ahErr&&window.ahErr(e,'stashBuyTab');
    toast('Purchase failed \\u2014 nothing was charged');
    return {ok:false, why:'error'};
  }
  try{ refreshStashTabs(); refreshAll(); }
  catch(e){ window.ahErr&&window.ahErr(e,'stashBuyTab:redraw'); }
  toast('Stash tab unlocked');
  return {ok:true, cost:cost, now:S.stashBought};""")

open('work.html','w',encoding='utf-8').write(src)
print('applied:', hits)
