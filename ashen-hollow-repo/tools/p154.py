src = open('work.html', encoding='utf-8').read()
hits = {}
def rep(name, old, new, count=1):
    global src
    n = src.count(old)
    assert n == count, f"{name}: expected {count}, found {n}"
    src = src.replace(old, new); hits[name] = n

# ============================================ DUMP LEAVES THE STRIP FOR GOOD
# ⚠ v236 already migrated its contents and made it visible only while it still
# held something. He wants it gone from the design entirely. The migration
# stays — it is what guarantees nothing is stranded — but the tab can no longer
# appear at all, and anything still in it is force-moved on load.
rep('unlock',
"""  /* the retired tab shows ONLY while it still holds something */
  if(id===STASH_LEGACY){
    try{ const c=CONT[id]; return !!(c && c.items && c.items.length); }catch(e){ return false; }
  }""",
"""  /* ⚠ THE RETIRED TAB NEVER SHOWS. v236 kept it visible while it still held
     something, which was right THEN — the items had nowhere guaranteed to go.
     The migration below has since had every load to empty it, and he wants it
     out of the design, so the answer is now simply no. `migrateDumpTab` is
     kept and still runs: it is what makes this safe rather than lossy, and if
     anything is ever left it is reported to the console instead of resurrecting
     a tab he has told me twice to remove. */
  if(id===STASH_LEGACY) return false;""")

# the migration must now be able to force items out even when tabs are full
rep('force',
"""    const left=src.items.length;""",
"""    /* ⚠ LAST RESORT: THE BAG. With DUMP no longer showing, an item that fits
       nowhere in the stash would be invisible AND unreachable — strictly worse
       than the crate it came from. The inventory is always reachable, so it is
       the final destination before giving up. */
    if(src.items.length){
      const bag=CONT.inv;
      for(let i=src.items.length-1;i>=0;i--){
        if(bag && addItem(bag, src.items[i])!==false){ src.items.splice(i,1); moved++; }
      }
    }
    const left=src.items.length;""")

rep('report',
"""      if(left)  toast(left+' item'+(left>1?'s':'')+' left in Dump \\u2014 free some space');""",
"""      if(left){
        toast(left+' item'+(left>1?'s':'')+' could not be moved \\u2014 free space and reload');
        try{ console.warn('[stash] '+left+' item(s) still in the retired Dump tab; '+
                          'they are safe in the save but not visible. Free stash or '+
                          'bag space and reload.'); }catch(e){}
      }""")

open('work.html','w',encoding='utf-8').write(src)
print('applied:', hits)
