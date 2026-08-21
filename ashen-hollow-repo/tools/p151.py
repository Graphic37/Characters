src = open('work.html', encoding='utf-8').read()
hits = {}
def rep(name, old, new, count=1):
    global src
    n = src.count(old)
    assert n == count, f"{name}: expected {count}, found {n}"
    src = src.replace(old, new); hits[name] = n

rep('ns',
"""const err=document.getElementById('err');""",
"""/* ===========================================================================
   AH — ONE NAMESPACE FOR CROSS-BLOCK HELPERS
   ---------------------------------------------------------------------------
   ⚠ THE `window.X` / bare-`const X` ROULETTE HAS COST ELEVEN BUGS. A classic
   block's top-level `const` is script-scoped, a module's is private, and a
   `window.X` assignment is global — three rules that look identical at the
   call site and fail differently. v257 lost a click handler to it (`fmtShort`
   from a classic block), v227 lost a quest gate (`nearStation`), v170 lost
   combat (`COMBAT`).
   NEW SHARED HELPERS GO HERE. `AH.fn(...)` is unambiguous from any block, and
   `AH.need('fn')` fails LOUDLY at wire-up time instead of silently at the
   first click — which is the difference between a caught mistake and a black
   screen. Existing globals are left alone; this is for what comes next.
   ========================================================================= */
window.AH = window.AH || {};
AH.def = function(name, fn){
  if(AH[name] && AH[name]!==fn)
    try{ console.warn('[AH] "'+name+'" redefined — two owners for one helper'); }catch(e){}
  AH[name]=fn; return fn;
};
AH.need = function(name){
  const f=AH[name];
  if(typeof f!=='function')
    throw new Error('AH.'+name+' is not available here — was it defined in a '+
                    'block that has not run, or never registered?');
  return f;
};
AH.has = (name)=>typeof AH[name]==='function';

const err=document.getElementById('err');""")

open('work.html','w',encoding='utf-8').write(src)
print('applied:', hits)
