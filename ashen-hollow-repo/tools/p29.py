src = open('work.html', encoding='utf-8').read()
hits = {}
def rep(name, old, new, count=1):
    global src
    n = src.count(old)
    assert n == count, f"{name}: expected {count}, found {n}"
    src = src.replace(old, new); hits[name] = n

rep('es-bottom',
"""  const lifeMax = st.life || 1;
  const pool = lifeMax + esMax;
  const lifePct = (st.life*S.life) / pool * 100;
  const esPct   = pool ? (esNow / pool * 100) : 0;
  $('#hpFill').style.height=lifePct.toFixed(1)+'%';
  { const el=$('#esFill');
    if(el){
      /* FULL HEIGHT, then clipped — so both inset percentages are percentages
         of the ORB. Sizing the bar to (life+es)% and clipping by lifePct% meant
         the clip was a fraction of the BAR, and the shield crept up over the
         life whenever life was low. */
      el.style.height='100%';
      el.style.opacity = esNow>0 ? '1' : '0';
      const top = Math.max(0, 100 - (lifePct+esPct));
      el.style.clipPath = 'inset('+top.toFixed(1)+'% 0 '+lifePct.toFixed(1)+'% 0)';
    } }""",
"""  /* ⚠ HE ASKED FOR THIS TWICE AND I BUILT THE OTHER THING TWICE.
     v141 stacked the shield as a band ABOVE the life and v164 only corrected
     WHERE that band landed — both kept it at the top, which is the D3/PoE
     convention but is not what he asked for. He asked for the shield to fill
     from the BOTTOM, like health. So:
       LIFE  = its own fraction of its own max, from the bottom.
       SHIELD = its own fraction of its own max, from the bottom, drawn over the
                life as a translucent layer so both levels stay readable.
     Neither is expressed against a combined pool any more, which also means a
     full shield can no longer look like it is overflowing the orb. */
  const lifeMax = st.life || 1;
  const lifePct = Math.max(0, Math.min(100, S.life * 100));
  const esPct   = esMax ? Math.max(0, Math.min(100, esNow / esMax * 100)) : 0;
  $('#hpFill').style.height=lifePct.toFixed(1)+'%';
  { const el=$('#esFill');
    if(el){
      /* anchored at the bottom by its CSS (`bottom:0`), so height alone puts
         the level where it belongs — no clip, nothing to get the reference box
         wrong a third time */
      el.style.clipPath='none';
      el.style.height=esPct.toFixed(1)+'%';
      el.style.opacity = esNow>0 ? '1' : '0';
    } }""")

CSS = """
/* ---- the shield fills from the bottom, over the life (v173) --------------
   It sits ON the life rather than above it, so it has to be translucent or it
   would simply hide the health level it is protecting. The bright top edge is
   what makes its own level readable through the overlap. */
.orb-fill.es{
  background:linear-gradient(180deg,
      rgba(200,240,255,.52), rgba(90,175,230,.34) 60%, rgba(60,140,205,.30)) !important;
  box-shadow:inset 0 2px 0 rgba(235,250,255,.85),
             inset 0 0 14px rgba(150,215,255,.30),
             0 0 10px rgba(140,210,255,.28) !important;
  mix-blend-mode:screen;
}
"""
rep('es-css', "\n</style>", "\n" + CSS + "\n</style>")

open('work.html','w',encoding='utf-8').write(src)
print('applied:', hits)
