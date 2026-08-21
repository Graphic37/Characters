import re

src = open('work.html', encoding='utf-8').read()

# ---------------------------------------------------------------- 1. THE REPORTER
REPORTER = """<script>
/* ===========================================================================
   ahErr — WHAT THE EMPTY CATCH BLOCKS SAY NOW  (v152)
   ---------------------------------------------------------------------------
   This file had 174 `catch(e){}` blocks. They are not a mistake: a single
   throw inside the frame loop kills the render, and most of these guards wrap
   an optional call that is genuinely allowed to fail. The mistake was that
   they were SILENT — several bugs this week (the stale nav node, the socket
   drop, the module-scope guards) threw into one of these and looked like
   "nothing happened" instead of an error.

   So none of them are removed. Every one now reports through here, and the
   design constraints are what make that safe:

   1. DEDUPED BY SITE. Some of these sit inside the per-frame loop. Logging
      each occurrence would flood the console at 60fps and hide the very thing
      you are looking for. The FIRST hit at a site logs with its stack; after
      that the site is only counted.
   2. NEVER THROWS. A reporter that can fail is worse than no reporter — it
      would break the guard it is reporting from. Everything here is wrapped.
   3. THE COUNTS ARE THE PRODUCT. One-off "this optional thing was missing" is
      noise; the same site firing 40,000 times in a run is a real bug, and only
      a counter can tell those apart. `ahErrors()` prints the table, sorted by
      how often each site fired, and F8 includes a summary.

   AH_LOUD = true rethrows instead of swallowing — for when you want the real
   stack in the debugger rather than a caught summary.
   ========================================================================= */
window.AH_ERRS = new Map();
window.AH_LOUD = false;
window.AH_ERR_SILENCE = 0;      /* set to a timestamp to mute logging until then */
function ahErr(e, tag){
  try{
    tag = tag || '?';
    let rec = window.AH_ERRS.get(tag);
    if(!rec){
      rec = { tag: tag, n: 0, msg: '', stack: '', firstAt: 0 };
      window.AH_ERRS.set(tag, rec);
    }
    rec.n++;
    if(rec.n === 1){
      rec.msg = (e && e.message) ? e.message : String(e);
      rec.stack = (e && e.stack) ? String(e.stack).split('\\n').slice(0,4).join(' | ') : '';
      try{ rec.firstAt = performance.now()/1000; }catch(_){ }
      if(!window.AH_ERR_SILENCE || Date.now() > window.AH_ERR_SILENCE)
        try{ console.warn('[caught] ' + tag + ' — ' + rec.msg + (rec.stack ? '\\n          ' + rec.stack : '')); }catch(_){ }
    }
    if(window.AH_LOUD) throw e;
  }catch(inner){
    if(window.AH_LOUD) throw inner;       /* only ever escapes on purpose */
  }
}
window.ahErr = ahErr;

/* the table. Sorted by count, because a site that fired once is a footnote and
   a site that fired ten thousand times is the bug. */
window.ahErrors = function(){
  const rows = Array.from(window.AH_ERRS.values()).sort((a,b)=>b.n-a.n);
  if(!rows.length){ console.log('[caught] nothing has thrown into a guard'); return []; }
  const total = rows.reduce((a,r)=>a+r.n,0);
  console.log('[caught] ' + rows.length + ' site(s), ' + total + ' occurrence(s)');
  rows.forEach(r=>console.log('  ' + String(r.n).padStart(7) + '  ' + r.tag + '  — ' + r.msg));
  try{ console.table(rows.map(r=>({ count:r.n, site:r.tag, message:r.msg, first:r.stack }))); }catch(e){}
  return rows;
};
window.ahErrorsReset = function(){ window.AH_ERRS.clear(); return 'cleared'; };
/* one line for the F8 report */
window.ahErrSummary = function(){
  const rows = Array.from(window.AH_ERRS.values()).sort((a,b)=>b.n-a.n);
  if(!rows.length) return 'caught errors: none';
  const total = rows.reduce((a,r)=>a+r.n,0);
  const top = rows.slice(0,3).map(r=>r.tag+' x'+r.n+' ('+r.msg+')').join('; ');
  return 'caught errors: ' + total + ' across ' + rows.length + ' site(s) — worst: ' + top;
};
addEventListener('keydown', e=>{ if(e.key==='F6'){ e.preventDefault(); window.ahErrors(); } });
</script>
"""

# ---------------------------------------------------------------- 2. TAG EVERY SITE
# a readable tag: the nearest enclosing named function, plus a unique number, so
# two guards in the same function are still distinguishable.
FUNC = re.compile(
    r'function\s+([A-Za-z_$][\w$]*)\s*\(|'                 # function foo(
    r'([A-Za-z_$][\w$]*)\s*[:=]\s*(?:async\s*)?function|'  # foo: function / foo = function
    r'([A-Za-z_$][\w$]*)\s*\([^)]*\)\s*\{|'                # method foo(...) {
    r'([A-Za-z_$][\w$]*)\s*=\s*\([^)]*\)\s*=>')            # foo = (...) =>

def enclosing(pos):
    best = '?'
    for m in FUNC.finditer(src, 0, pos):
        name = m.group(1) or m.group(2) or m.group(3) or m.group(4)
        if name and name not in ('if','for','while','switch','catch','function','return','typeof','new'):
            best = name
    return best

EMPTY = re.compile(r'catch\s*\(\s*([A-Za-z_$][\w$]*)\s*\)\s*\{\s*\}')

out = []
last = 0
n = 0
tags = []
for m in EMPTY.finditer(src):
    n += 1
    var = m.group(1)
    fn = enclosing(m.start())
    line = src.count('\n', 0, m.start()) + 1
    tag = f'{fn}:{line}'
    tags.append(tag)
    out.append(src[last:m.start()])
    # ⚠ window.ahErr, NOT bare ahErr. A guard exists so its caller cannot break;
    # a bare identifier would throw ReferenceError if the reporter were ever
    # absent (load order, a block injected into another document, the reporter
    # stripped) — turning every silent guard into a hard failure, which is
    # strictly worse than what we started with. A property access cannot throw,
    # so the worst case degrades back to the old silent behaviour.
    out.append("catch(%s){ window.ahErr&&window.ahErr(%s,'%s'); }" % (var, var, tag))
    last = m.end()
out.append(src[last:])
src = ''.join(out)

# ⚠ THE REPORTER GOES IN LAST. Inserting it first meant the rewrite pass found
# ahErr's OWN internal guards and turned them into calls to ahErr — a reporter
# that reports into itself, one bad throw away from infinite recursion.
i = src.index('<script')
src = src[:i] + REPORTER + src[i:]

open('work.html', 'w', encoding='utf-8').write(src)

from collections import Counter
dupes = [t for t, c in Counter(tags).items() if c > 1]
print('rewritten:', n)
print('duplicate tags:', len(dupes))
print('sample tags:', tags[:8])
print('unknown-function tags:', sum(1 for t in tags if t.startswith('?:')))
