# ⚠ SECOND TIME THIS SESSION: p149 asserted on a stale anchor and aborted
# BEFORE its write(), silently discarding the two hunks that had matched.
# A patch script that raises is ALL-OR-NOTHING — check the file, not the log.
src = open('work.html', encoding='utf-8').read()
hits = {}
def rep(name, old, new, count=1):
    global src
    n = src.count(old)
    assert n == count, f"{name}: expected {count}, found {n}"
    src = src.replace(old, new); hits[name] = n

rep('loud',
"""  if(__booted){
    /* runtime: report it, keep playing */
    try{ window.ahErr && window.ahErr(e.error||new Error(msg), 'uncaught'); }catch(x){}
    try{ console.warn('[uncaught] '+msg); }catch(x){}
    try{ if(window.toast) toast('Something went wrong — press F6 for details'); }catch(x){}
    return;
  }""",
"""  if(__booted){
    /* ⚠ ALIVE IS NOT THE SAME AS SILENT. Surviving the error is for the
       player; keeping the whole error is for me. The REAL Error object goes to
       ahErr so F6 holds the genuine stack, and the SOURCE — file, line, column
       — is named too, because "something threw somewhere" is the report that
       cost four rounds on the minimap. */
    const where=(e && e.filename)
      ? (String(e.filename).replace(/.*\\//,'')+':'+(e.lineno||'?')+':'+(e.colno||'?'))
      : 'unknown';
    const real=(e && e.error) || new Error(msg);
    try{ window.ahErr && window.ahErr(real, 'uncaught @ '+where); }catch(x){}
    try{ console.error('[uncaught] '+where+' — '+msg, (real && real.stack) || ''); }catch(x){}
    try{ if(window.toast) toast('Error at '+where+' — press F6'); }catch(x){}
    return;
  }""")

rep('persist',
"""    S.stashOrder=order;
    refreshStashTabs();
    return order;""",
"""    S.stashOrder=order;
    /* the order is his organisation and belongs in the save the moment he sets
       it — a reorder lost to a crash is a small betrayal */
    try{ if(window.saveGame) saveGame(); }catch(e){}
    refreshStashTabs();
    return order;""")

open('work.html','w',encoding='utf-8').write(src)
print('applied:', hits)
