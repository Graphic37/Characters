src = open('work.html', encoding='utf-8').read()
hits = {}
def rep(name, old, new, count=1):
    global src
    n = src.count(old)
    assert n == count, f"{name}: expected {count}, found {n}"
    src = src.replace(old, new); hits[name] = n

# ============================================ 1. THE X ONTO THE FRAME
CSS = """
/* ---- the station close button, on the frame (v230) -----------------------
   ⚠ `position:absolute` inside #ahWin resolves against the PADDING box, which
   sits inside a 34px border-image frame — so `right:12px; top:12px` put the X
   34px in from the visible corner and it read as floating low inside the
   panel. Negative offsets pull it back onto the frame band itself, centred on
   the 34px width, which is where the frame art has a corner to hold it. */
body[data-skin="forged"] #ahWin > button.close{
  right:-24px !important; top:-24px !important;
  width:30px !important; height:30px !important;
  font-size:15px !important; line-height:26px !important;
  z-index:3;
  color:#d8cbb0;
  border:1px solid #6b5a33;
  background:linear-gradient(180deg,#241d10,#12100a);
  box-shadow:0 2px 8px rgba(0,0,0,.75);
}
body[data-skin="forged"] #ahWin > button.close:hover{
  border-color:#c8a24a; color:#f5e8c8;
  background:linear-gradient(180deg,#3a2f18,#1c170d);
}
"""
rep('css', "\n</style>", "\n" + CSS + "\n</style>")

# ============================================ 2. DROP THE DEAD TAB
rep('tabs',
"""    [['salvage','SALVAGE'],['craft','CRAFT'],['repair','REPAIR'],['slots','SUPPORT SLOTS']].map(([id,label])=>""",
"""    /* ⚠ REPAIR REMOVED — its own body said "V1 has no durability, so nothing
       to repair". A tab that opens onto a paragraph explaining it does nothing
       is worse than no tab: it costs a click to learn there was nothing there.
       Salvage and Craft are kept because they are real screens and this panel
       is their only route now that Veyra took the contracts. */
    [['salvage','SALVAGE'],['craft','CRAFT'],['slots','SUPPORT SLOTS']].map(([id,label])=>""")

# the router must not be able to reach it either
rep('router',
"""    GAR.tab==='salvage' ? garSalvageBody() :
    GAR.tab==='repair'  ? garRepairBody()  :
    GAR.tab==='slots'   ? garSlotsBody()   : null;""",
"""    GAR.tab==='salvage' ? garSalvageBody() :
    GAR.tab==='slots'   ? garSlotsBody()   : null;""")

# ============================================ 3. ONE CLOSE, NOT TWO
rep('close',
"""  stationPanel('Garrick · Workshop', garTabBar(GAR.tab)+body, [
    {id:'garClose', label:'Close', onClick:()=>closeWin()}
  ]);""",
"""  /* ⚠ ONE CLOSE CONTROL. The frame's X already closes the panel, so a full
     width CLOSE button underneath was a second control for the same job —
     and on the Support Slots tab it competed with Purchase, which should be
     the only thing worth pressing down there. */
  stationPanel('Garrick · Workshop', garTabBar(GAR.tab)+body, []);""")

open('work.html','w',encoding='utf-8').write(src)
print('applied:', hits)
