src = open('work.html', encoding='utf-8').read()
hits = {}
def rep(name, old, new, count=1):
    global src
    n = src.count(old)
    assert n == count, f"{name}: expected {count}, found {n}"
    src = src.replace(old, new); hits[name] = n

# fire the report where oscillation is DETECTED, not where it is displayed
rep('trigger',
"""      AUTO.stats.pathLen = +path.toFixed(1);
      AUTO.stats.netMove = +net.toFixed(1);
      AUTO.stats.efficiency = path>0.5 ? +(net/path).toFixed(2) : 1;
    }
  }""",
"""      AUTO.stats.pathLen = +path.toFixed(1);
      AUTO.stats.netMove = +net.toFixed(1);
      AUTO.stats.efficiency = path>0.5 ? +(net/path).toFixed(2) : 1;
      /* ⚠ REPORT WHERE IT IS DETECTED, NOT WHERE IT IS DISPLAYED. F8 showed
         "<-- OSCILLATING" only if he happened to press F8 during it; by the
         time he pasted a log the window that caused it was long gone. The
         recorder dumps the preceding 12s the moment the condition is true.
         `walked > 4m` excludes standing still, which is a STALL and has its
         own report — a stagger is specifically motion without progress. */
      if(AUTO.stats.efficiency < 0.3 && path > 4 && window.stagReport)
        stagReport('oscillating (eff '+AUTO.stats.efficiency+')');
    }
  }""")

open('work.html','w',encoding='utf-8').write(src)
print('applied:', hits)
