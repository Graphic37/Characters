src = open('work.html', encoding='utf-8').read()
hits = {}
def rep(name, old, new, count=1):
    global src
    n = src.count(old)
    assert n == count, f"{name}: expected {count}, found {n}"
    src = src.replace(old, new); hits[name] = n

# ============================================ 1. NOTHING ELSE ON GARRICK
# ⚠ HE HAS SAID THIS TWICE AND I HEDGED BOTH TIMES — first by "rehoming"
# salvage and craft to Mara, then by leaving router aliases that still open
# them. "Nothing else available here" means the doors go, not that they move.
rep('router',
"""  /* ⚠ GARRICK ONLY EVER OPENS SUPPORT SLOTS NOW. The `tab` argument is kept in
     the signature because several call sites pass 'salvage' or 'craft' from
     before the split; honouring them would reopen the screens he just asked to
     have removed from here, so they are routed to their new homes instead of
     being silently ignored. */
  if(tab==='craft'){ if(window.craftPanel) craftPanel(); return; }
  if(tab==='salvage'){ if(window.salvagePanel) salvagePanel(); return; }
  GAR.tab='slots';""",
"""  /* ⚠ GARRICK OPENS ONE SCREEN. The `tab` argument survives only because old
     call sites still pass one; it is now ignored outright rather than routed
     anywhere, because every other destination has been removed. */
  GAR.tab='slots';""")

# salvage off Mara entirely
rep('mara',
"""    /* ⚠ CRAFT REMOVED FROM HERE (v232). Crafting is done with the bench and
       the inventory open TOGETHER — an orb on the cursor, an item in the bag —
       so a standalone bench panel behind a vendor button is a worse version of
       a flow that already works. `craftPanel` itself is untouched and still
       reachable from the currency board; only this shortcut is gone.
       Salvage stays for now: marked-sell replaces it, and it should not be
       removed until that is the better route. */
    {id:'vSalv', label:'Salvage', onClick:()=>salvagePanel()}""",
"""    /* ⚠ SALVAGE AND CRAFT ARE BOTH GONE FROM THE TOWN PANELS (v233).
       Marked-sell in the stash replaced salvage — right-click, S, confirm —
       and crafting is done with the bench and inventory open together, an orb
       on the cursor and an item in the bag. Keeping vestigial buttons to a
       worse version of each flow was me hedging, twice. `craftPanel` and
       `garSalvageBody` still exist and are still reachable from the currency
       board; nothing in the town menus points at them. */""")

rep('salvpanel',
"""function salvagePanel(){
  stationPanel('Mara \\u00b7 Salvage', garSalvageBody(), [
    {id:'svBack', label:'Back to Mara', onClick:()=>vendorPanel()}
  ]);
}
window.salvagePanel=salvagePanel;
""", "")

open('work.html','w',encoding='utf-8').write(src)
print('applied:', hits)
