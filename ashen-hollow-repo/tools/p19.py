src = open('work.html', encoding='utf-8').read()
hits = {}
def rep(name, old, new, count=1):
    global src
    n = src.count(old)
    assert n == count, f"{name}: expected {count}, found {n}"
    src = src.replace(old, new); hits[name] = n

# ================================================= 1. THE SHOUT FIRES ON ATTEMPTS
# It sat ABOVE every failure check: no target, out of range, no line of sight —
# all `return false` AFTER the name had already been announced. Auto retries its
# priority list every tick, so a skill that is merely out of range shouted over
# and over while never casting once. Moved below the gates, next to sk.fire().
rep('shout-move',
"""  /* one call site, so a new skill cannot silently forget to announce itself.
     The basic filler stays quiet — shouting it every 0.4s would be noise. */
  if(id!=='basic' && window.castShout && sk.n) castShout(sk.n, id);
  const tgt = (forced && !forced.dead) ? forced : pickTarget(skillRange(id));""",
"""  const tgt = (forced && !forced.dead) ? forced : pickTarget(skillRange(id));""")

rep('shout-place',
"""  sk.fire(tgt);
  if(typeof plantFor==='function') plantFor(id);""",
"""  /* ANNOUNCE ONLY A CAST THAT ACTUALLY HAPPENS. This used to sit above the
     target / range / line-of-sight checks, every one of which returns false —
     and Auto re-tries its whole priority list every tick, so an out-of-range
     skill shouted its name repeatedly without ever firing. One call site, below
     every gate, immediately before the effect. The basic filler stays quiet:
     shouting it every 0.4s would be noise. */
  if(id!=='basic' && window.castShout && sk.n) castShout(sk.n, id);
  sk.fire(tgt);
  if(typeof plantFor==='function') plantFor(id);""")

# the Ultimate announced itself twice: once through useSkill, once by hand
rep('shout-dupe',
"""      if(window.castShout) castShout('Vengeance Storm','vengeance');""",
"""      /* useSkill already announces every non-basic cast, so shouting here put
         "Vengeance Storm!" on screen twice for one cast. */""")

# and a channel re-casting every few frames should not stack its own name
rep('shout-debounce',
"""    window.castShout=function(name, id){
      if(!name) return;
      try{ if(!AH_WORLD || !AH_WORLD.player) return; }catch(e){ return; }""",
"""    var LAST_SHOUT={};
    window.castShout=function(name, id){
      if(!name) return;
      try{ if(!AH_WORLD || !AH_WORLD.player) return; }catch(e){ return; }
      /* a channelled skill re-casts every few frames; without this its name
         stacks four deep and reads as the duplicate it effectively is */
      var nw=performance.now();
      if(LAST_SHOUT[id] && nw-LAST_SHOUT[id] < 700) return;
      LAST_SHOUT[id]=nw;""")

# ================================================= 2. THE ENERGY SHIELD CLIP
# ⚠ inset() percentages resolve against the ELEMENT'S OWN BOX, not the parent.
# The bar was sized to (life+es)% of the orb and then clipped `bottom: lifePct%`
# — which is lifePct% OF THAT BAR, not of the orb. With life at 10% and shield
# at 40% the bar is 50% tall and the clip lands at 5% of the orb, so the shield
# painted over the life and up the orb: "coming from the top".
rep('es-clip',
"""  { const el=$('#esFill');
    if(el){
      el.style.height=(lifePct+esPct).toFixed(1)+'%';   /* stacked above life */
      el.style.opacity = esNow>0 ? '1' : '0';
      /* clip so the shield only paints its own band, not over the life */
      el.style.clipPath = 'inset('+(esPct>0 ? 0 : 100)+'% 0 '+lifePct.toFixed(1)+'% 0)';
    } }""",
"""  { const el=$('#esFill');
    if(el){
      /* FULL HEIGHT, then clipped — so both inset percentages are percentages
         of the ORB. Sizing the bar to (life+es)% and clipping by lifePct% meant
         the clip was a fraction of the BAR, and the shield crept up over the
         life whenever life was low. */
      el.style.height='100%';
      el.style.opacity = esNow>0 ? '1' : '0';
      const top = Math.max(0, 100 - (lifePct+esPct));
      el.style.clipPath = 'inset('+top.toFixed(1)+'% 0 '+lifePct.toFixed(1)+'% 0)';
    } }""")

# ================================================= 3. LABELLED GLOBE READOUTS
rep('readouts',
"""  $('#hpNum').innerHTML = hp + (esNow>0 ? '<small>+'+Math.round(esNow)+' ES</small>' : '');
  $('#enNum').textContent=mp;""",
"""  /* HIS LAYOUT: a label and a current/max pair per line, so the shield reads as
     its own pool instead of a "+96 ES" tacked onto the life number — and it is
     visible at 0/0 rather than vanishing, which is what tells you the stat
     exists at all before you have any. */
  const rd = (lbl,cur,max) => '<span class="orbRow"><i>'+lbl+'</i><b>'+
             Math.round(cur)+'/'+Math.round(max)+'</b></span>';
  $('#hpNum').innerHTML = rd('Life', st.life*S.life, lifeMax) + rd('Shield', esNow, esMax);
  $('#enNum').innerHTML = rd('Mana', st.mana*S.mana, st.mana);""")

CSS = """
/* ---- globe readouts (v164) ----------------------------------------------
   A label with a current/max pair per line. The shield keeps its line at 0/0:
   a stat that disappears when empty cannot teach you that it exists. */
.orb-num{ line-height:1.15 }
.orbRow{ display:flex; align-items:baseline; justify-content:space-between;
  gap:10px; white-space:nowrap }
.orbRow i{ font:600 10px var(--f-disp,Georgia); font-style:normal;
  letter-spacing:.10em; color:#b9ae91; text-shadow:0 1px 2px #000 }
.orbRow b{ font:700 12px "Trebuchet MS",sans-serif; color:#f3e7c6;
  text-shadow:0 1px 2px #000, 0 0 8px rgba(0,0,0,.8) }
.orbwrap.hp .orbRow:nth-child(2) i{ color:#9fd2f0 }
.orbwrap.hp .orbRow:nth-child(2) b{ color:#cfeaff }
.orbwrap.mp .orbRow i{ color:#9db6d8 }
"""
rep('readout-css', "\n</style>", "\n" + CSS + "\n</style>")

open('work.html','w',encoding='utf-8').write(src)
print('applied:', hits)
