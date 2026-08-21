src = open('work.html', encoding='utf-8').read()
hits = {}
def rep(name, old, new, count=1):
    global src
    n = src.count(old)
    assert n == count, f"{name}: expected {count}, found {n}"
    src = src.replace(old, new); hits[name] = n

# ⚠ DUMP LEAVES THE DESIGN, BUT ONLY AFTER ITS CONTENTS ARE SOMEWHERE ELSE.
rep('order',
"""/* the order extras unlock in — DUMP first, it is the most useful */
const STASH_EXTRA_ORDER = ['st3','st5','st6','st7','st8','st9','st10','st11'];""",
"""/* ⚠ DUMP IS NO LONGER PART OF THE DESIGN (v236). It is not in the purchase
   order and cannot be bought — it exists only as a legacy container that the
   migration below empties. The purchasable tabs are the seven generic ones. */
const STASH_EXTRA_ORDER = ['st5','st6','st7','st8','st9','st10','st11'];
const STASH_LEGACY = 'st3';""")

rep('migrate',
"""function stashBuyTab(){""",
"""/* ===========================================================================
   DUMP MIGRATION  (v236)
   ---------------------------------------------------------------------------
   ⚠ MOVE FIRST, RETIRE SECOND, AND NEVER THE OTHER WAY. His save has seven
   items in DUMP. Retiring the tab without relocating them would leave them in
   the save file and off the screen — so this runs once, moves everything it
   can into real storage, and **leaves DUMP visible if even one item could not
   be placed**. A stash that is briefly ugly beats a stash that quietly ate
   seven items.

   Counted in and out: if the numbers do not match, nothing is removed and the
   tab stays. The migration only marks itself done when the container is empty.
   ========================================================================= */
function migrateDumpTab(){
  try{
    const src=CONT && CONT[STASH_LEGACY];
    if(!src || !src.items || !src.items.length){
      if(S) S.dumpMigrated=1;
      return { moved:0, left:0, done:true };
    }
    const before=src.items.length;
    /* the real destinations, in the order a player would expect: the item's
       own home board first, then GEAR, then any tab actually unlocked */
    const targets=['st0'].concat(
      STASH_EXTRA_ORDER.filter(id=>stashTabUnlocked(id)));
    let moved=0;
    for(let i=src.items.length-1;i>=0;i--){
      const it=src.items[i];
      let home=null;
      try{ home=stashTabFor(it); }catch(e){}
      const order=[home].concat(targets)
        .filter(Boolean).filter((v,k,a)=>a.indexOf(v)===k)
        .filter(id=>id!==STASH_LEGACY);
      for(const id of order){
        const c=CONT[id];
        if(!c) continue;
        if(addItem(c,it)!==false){ src.items.splice(i,1); moved++; break; }
      }
    }
    const left=src.items.length;
    if(before!==moved+left){
      /* ⚠ arithmetic guard: if these disagree an item went missing somewhere
         in the move, so refuse to mark the migration done and say so loudly */
      try{ console.warn('[stash] dump migration count mismatch — tab kept'); }catch(e){}
      return { moved:moved, left:left, done:false };
    }
    if(!left && S) S.dumpMigrated=1;
    try{
      if(moved) toast(moved+' item'+(moved>1?'s':'')+' moved out of the old Dump tab');
      if(left)  toast(left+' item'+(left>1?'s':'')+' left in Dump \\u2014 free some space');
    }catch(e){}
    return { moved:moved, left:left, done:!left };
  }catch(e){ window.ahErr&&window.ahErr(e,'migrateDumpTab'); return {moved:0,left:-1,done:false}; }
}
window.migrateDumpTab=migrateDumpTab;

function stashBuyTab(){""")

# unlock rule: DUMP is only ever visible while it still holds something
rep('unlocked',
"""function stashTabUnlocked(id){
  if(STASH_BASE.indexOf(id)>=0) return true;
  const i=STASH_EXTRA_ORDER.indexOf(id);
  if(i<0) return false;
  if(i < stashBought()) return true;
  /* grandfathered: it holds something, so it must stay reachable */
  try{ const c=CONT[id]; if(c && c.items && c.items.length) return true; }catch(e){}
  return false;
}""",
"""function stashTabUnlocked(id){
  if(STASH_BASE.indexOf(id)>=0) return true;
  /* the retired tab shows ONLY while it still holds something */
  if(id===STASH_LEGACY){
    try{ const c=CONT[id]; return !!(c && c.items && c.items.length); }catch(e){ return false; }
  }
  const i=STASH_EXTRA_ORDER.indexOf(id);
  if(i<0) return false;
  if(i < stashBought()) return true;
  /* grandfathered: it holds something, so it must stay reachable */
  try{ const c=CONT[id]; if(c && c.items && c.items.length) return true; }catch(e){}
  return false;
}""")

# purchased tabs get a real name, not "TAB 6"
rep('names',
"""  STASH_TABS.push({ id, n: f? f.n : 'TAB '+(i+1),""",
"""  /* ⚠ "TAB 6" named a slot, not a thing. Purchased tabs are numbered by the
     order they are BOUGHT, so the first one a player owns is STASH 1 whichever
     container id backs it. Right-click still renames. */
  STASH_TABS.push({ id, n: f? f.n : 'STASH '+(i-4),""")

open('work.html','w',encoding='utf-8').write(src)
print('applied:', hits)
