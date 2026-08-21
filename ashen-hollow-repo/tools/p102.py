src = open('work.html', encoding='utf-8').read()
hits = {}
def rep(name, old, new, count=1):
    global src
    n = src.count(old)
    assert n == count, f"{name}: expected {count}, found {n}"
    src = src.replace(old, new); hits[name] = n

# ============================================ 1. GARRICK IS ONE THING
rep('tabbar',
"""function garTabBar(active){
  return '<div class="gartabs">'+""",
"""/* ⚠ RETIRED IN v231 — GARRICK IS THE SUPPORT-SLOT SMITH AND NOTHING ELSE.
   A tab bar over a single screen is furniture: it costs vertical space, it
   implies choices that are not there, and it was the last thing making this
   panel read as a workshop menu rather than an upgrade board.
   Returns '' rather than being deleted so `craftPanel`, which prepends it,
   keeps working without a second edit — see the note where salvage and craft
   moved to. */
function garTabBar(active){ return ''; }
function garTabBar_retired(active){
  return '<div class="gartabs">'+""")

# the router no longer needs a tab concept
rep('router',
"""window.garrickPanel=function(tab){
  if(tab) GAR.tab=tab;
  const body =
    GAR.tab==='salvage' ? garSalvageBody() :
    GAR.tab==='slots'   ? garSlotsBody()   : null;

  if(GAR.tab==='craft'){
    craftPanel();          /* it renders its own tab bar and wires everything */
    garWireTabs();
    return;
  }""",
"""window.garrickPanel=function(tab){
  /* ⚠ GARRICK ONLY EVER OPENS SUPPORT SLOTS NOW. The `tab` argument is kept in
     the signature because several call sites pass 'salvage' or 'craft' from
     before the split; honouring them would reopen the screens he just asked to
     have removed from here, so they are routed to their new homes instead of
     being silently ignored. */
  if(tab==='craft'){ if(window.craftPanel) craftPanel(); return; }
  if(tab==='salvage'){ if(window.salvagePanel) salvagePanel(); return; }
  GAR.tab='slots';
  const body = garSlotsBody();""")

open('work.html','w',encoding='utf-8').write(src)
print('applied:', hits)
