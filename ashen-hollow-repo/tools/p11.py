src = open('work.html', encoding='utf-8').read()
hits = {}
def rep(name, old, new, count=1):
    global src
    n = src.count(old)
    assert n == count, f"{name}: expected {count}, found {n}"
    src = src.replace(old, new); hits[name] = n

CSS = """
/* ================= MODAL SCRIM + A CENTRED CLOSE GLYPH  (v156) ============
   The window opened straight over a fully lit town: the frame's ornament has
   real transparent gaps in it (measured — 37% of the border ring and 100% of
   the middle are alpha 0), so the world showed THROUGH the frame as well as
   around it, and a busy rooftop behind a thin gold filigree is the worst case
   for reading either one.

   Done in pure CSS with :has() rather than by hooking the open/close calls:
   `.on` is added from more than one place, and a scrim that misses a call site
   is worse than none. There is nothing to keep in sync — the scrim is a
   function of the window's own class. Chromium (this is Electron) has :has;
   anywhere it is missing the rule simply does not apply and nothing breaks.
   pointer-events:none, so it dims without ever swallowing a click. */
body:has(#ahWin.on)::before{
  content:''; position:fixed; inset:0; z-index:39; pointer-events:none;
  background:radial-gradient(ellipse at 50% 50%,
             rgba(4,5,8,.55) 0%, rgba(3,4,6,.78) 55%, rgba(2,3,4,.88) 100%);
  animation:ahScrimIn .18s ease-out;
}
@keyframes ahScrimIn{ from{ opacity:0 } to{ opacity:1 } }

/* the glyph sat high and left in its box: a 24px button with padding:0 and
   line-height:1 centres the LINE BOX, not the character. Flex centres the
   character itself, whatever the font does with it. */
#ahWin .close{
  display:flex !important; align-items:center; justify-content:center;
  font-size:15px !important; line-height:1 !important;
  width:26px !important; height:26px !important;
  padding:0 0 1px 0 !important;      /* the multiplication sign rides high */
  color:#c8bda2;
}
#ahWin .close:hover{ color:#fff0c8; }
"""
rep('scrim-css', "\n</style>", "\n" + CSS + "\n</style>")

open('work.html','w',encoding='utf-8').write(src)
print('applied:', hits)
