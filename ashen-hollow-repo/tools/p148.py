src = open('work.html', encoding='utf-8').read()
hits = {}
def rep(name, old, new, count=1):
    global src
    n = src.count(old)
    assert n == count, f"{name}: expected {count}, found {n}"
    src = src.replace(old, new); hits[name] = n

# ============================================ 1. THE SAVE
rep('save',
"""      char:{ lvl:S.lvl, xp:S.xp },""",
"""      /* ⚠⚠ GOLD WAS NEVER SAVED. The character started from a hardcoded
         `gold:13897101`, so every purchase REFUNDED ITSELF on reload and every
         sale evaporated. Buying a stash tab, paying Garrick, selling a bag of
         loot — none of it survived. Saved with the tab state it pays for, so
         the two can never disagree.
         ⚠ SAVE_VERSION IS NOT BUMPED. `loadGame` rejects any save whose
         version differs, so bumping would DELETE every existing character to
         add a field. New keys simply read as undefined in an old save and fall
         back to the defaults below. */
      char:{ lvl:S.lvl, xp:S.xp, gold:S.gold },
      stash:{ bought:S.stashBought||0,
              names:Object.assign({}, S.stashNames||{}),
              order:(S.stashOrder||[]).slice() },""")

rep('load',
"""    if(d.char){ if(d.char.lvl) S.lvl=d.char.lvl; if(d.char.xp!==undefined) S.xp=d.char.xp; }""",
"""    if(d.char){ if(d.char.lvl) S.lvl=d.char.lvl; if(d.char.xp!==undefined) S.xp=d.char.xp;
                /* an old save has no gold field — keep what the character
                   already has rather than zeroing him out */
                if(typeof d.char.gold==='number') S.gold=d.char.gold; }
    if(d.stash){
      if(typeof d.stash.bought==='number') S.stashBought=d.stash.bought;
      if(d.stash.names) S.stashNames=Object.assign({}, d.stash.names);
      if(Array.isArray(d.stash.order)) S.stashOrder=d.stash.order.slice();
    }""")

# ============================================ 2. THE PURCHASE IS TRANSACTIONAL
rep('buy',
"""  S.gold-=cost;
  S.stashBought=n+1;
  try{ refreshStashTabs(); refreshAll(); }catch(e){}
  toast('Stash tab unlocked');
  return {ok:true, cost:cost, now:S.stashBought};""",
"""  /* ⚠ DEDUCT AND UNLOCK TOGETHER, THEN SAVE BEFORE ANYTHING CAN THROW.
     Gold leaving without the tab arriving (or the reverse) is the worst
     outcome here, and a redraw is exactly the kind of thing that throws — so
     the state change and its persistence both complete first, and the redraw
     is the last step and cannot undo them. */
  const before={ gold:S.gold, bought:S.stashBought||0 };
  try{
    S.gold-=cost;
    S.stashBought=n+1;
    if(window.saveGame) saveGame();
  }catch(e){
    /* nothing partial survives a failure */
    S.gold=before.gold; S.stashBought=before.bought;
    window.ahErr&&window.ahErr(e,'stashBuyTab');
    toast('Purchase failed — nothing was charged');
    return {ok:false, why:'error'};
  }
  try{ refreshStashTabs(); refreshAll(); }
  catch(e){ window.ahErr&&window.ahErr(e,'stashBuyTab:redraw'); }
  toast('Stash tab unlocked');
  return {ok:true, cost:cost, now:S.stashBought};""")

# ============================================ 3. OVERFLOW FOLLOWS HIS ORDER
rep('overflow',
"""  for(const k in CONT) if(/^st\\d+$/.test(k) && !BOARD[k] && k!=='st3' && k!=='st0'
      && (!window.stashTabUnlocked || stashTabUnlocked(k))) player.push(k);
  
  player.sort((a,b)=>(+a.slice(2))-(+b.slice(2)));""",
"""  for(const k in CONT) if(/^st\\d+$/.test(k) && !BOARD[k] && k!=='st3' && k!=='st0'
      && (!window.stashTabUnlocked || stashTabUnlocked(k))) player.push(k);

  /* ⚠ OVERFLOW FOLLOWS THE PLAYER'S TAB ORDER, NOT THE ID NUMBER. Sorting by
     `st5, st6, st7...` meant dragging a tab to the front changed where it
     APPEARED and nothing about where loot went — the reorder would have been
     decoration. The strip order is the priority order, which is the only
     reading that makes dragging worth doing.
     ⚠ REORDERING MOVES NO ITEMS. This changes the SEARCH ORDER for new
     deposits only; every container keeps exactly what it held. */
  try{
    if(window.stashTabOrder){
      const pref=stashTabOrder();
      player.sort((a,b)=>{
        const ia=pref.indexOf(a), ib=pref.indexOf(b);
        return (ia<0?1e9:ia) - (ib<0?1e9:ib);
      });
    } else player.sort((a,b)=>(+a.slice(2))-(+b.slice(2)));
  }catch(e){ player.sort((a,b)=>(+a.slice(2))-(+b.slice(2))); }""")

rep('export',
"""window.stashMoveTab=stashMoveTab;""",
"""window.stashMoveTab=stashMoveTab;
window.stashTabOrder=stashTabOrder;""")

open('work.html','w',encoding='utf-8').write(src)
print('applied:', hits)
