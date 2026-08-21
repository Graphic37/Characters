src = open('work.html', encoding='utf-8').read()
hits = {}
def rep(name, old, new, count=1):
    global src
    n = src.count(old)
    assert n == count, f"{name}: expected {count}, found {n}"
    src = src.replace(old, new); hits[name] = n

# ---- the box goes -----------------------------------------------------------
rep('remove-input',
"""      '<div class="spacer"></div>'+
      '<input class="srch" id="srch" placeholder="search items"/>'+
      '<button class="tbtn" id="btnSort">SORT</button>'+""",
"""      '<div class="spacer"></div>'+
      /* THE SEARCH BOX IS GONE. It was too narrow to show its own placeholder
         ("search iter"), which is a fair sign it was not earning its width:
         the bag is 10x6 and every item is visible at a glance, so a filter
         solves a problem this container does not have. The FILTER ITSELF is
         kept — `S.filter` is still honoured by drawGrid — so nothing downstream
         breaks and it can be driven from the console or given a home in a
         panel that actually needs it (the stash tabs hold 100 each). */
      '<button class="tbtn" id="btnSort">SORT</button>'+""")

# ---- keep the capability reachable, and make sure it is not left ON ---------
rep('filter-api',
"""function drawInv(){""",
"""/* The bag's search input was removed in v158; this is what remains of it, so
   the feature is not lost with the widget. Returns the current filter. */
window.setItemFilter=function(text){
  try{
    S.filter=(text||'').trim().toLowerCase();
    refreshAll();
  }catch(e){ window.ahErr&&window.ahErr(e,'setItemFilter'); }
  return S.filter;
};
/* a stale filter from a save or an earlier session would dim items with no
   visible control to clear it — exactly the kind of invisible state that reads
   as a rendering bug */
try{ S.filter=''; }catch(e){ window.ahErr&&window.ahErr(e,'clearFilterOnBoot'); }

function drawInv(){""")

open('work.html','w',encoding='utf-8').write(src)
print('applied:', hits)
