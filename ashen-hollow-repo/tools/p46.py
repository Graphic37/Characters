src = open('work.html', encoding='utf-8').read()
hits = {}
def rep(name, old, new, count=1):
    global src
    n = src.count(old)
    assert n == count, f"{name}: expected {count}, found {n}"
    src = src.replace(old, new); hits[name] = n

# ⚠ WHY THE TITLE SITS HIGH AND CLIPPED
# The name plate is drawn in the frame's BORDER area, so it cannot grow with its
# content — `measureTipHead()` measures the head and tells the border how tall to
# be. That part works. What does not: `.tip-head` centres its text over the WHOLE
# band, and the band's top ~10px is the plate's ornamental lip. Centring over the
# lip pushes the title up into it, which is exactly what he screenshotted on a
# two-line header ("Rune of Frost (T5)" over "RUNE OF FROST").
# Two changes, both small: a taller floor so short headers are not cramped, and
# top padding so the text is centred over the READABLE part of the plate rather
# than over the decoration above it.

rep('css',
"""body[data-skin="forged"] #tipwrap .tip-head{
  margin:calc(0px - var(--tipHead,46px)) -2px 0; min-height:var(--tipHead,46px);
  padding:8px 9px 7px;
  border:0; background:none; overflow:visible;
  display:flex; flex-direction:column; justify-content:center;
}""",
"""body[data-skin="forged"] #tipwrap .tip-head{
  margin:calc(0px - var(--tipHead,54px)) -2px 0; min-height:var(--tipHead,54px);
  /* ⚠ the extra TOP padding is the fix, not the height. The band's first ~6px
     are the plate's ornamental lip; centring the text over the full band put
     the title under it. Padding pushes the centring box below the decoration. */
  padding:15px 9px 7px;
  border:0; background:none; overflow:visible;
  display:flex; flex-direction:column; justify-content:center;
}""")

# the fallbacks must agree with the new floor, or a tooltip that renders before
# measureTipHead runs gets the old cramped band for one frame
for old, new, n in [
  ("border-width:var(--tipHead,46px) 9px 9px 9px;",
   "border-width:var(--tipHead,54px) 9px 9px 9px;", 1),
  ("9px 9px 9px / var(--tipHead,46px) 9px 9px 9px / 0 stretch;",
   "9px 9px 9px / var(--tipHead,54px) 9px 9px 9px / 0 stretch;", 1),
  ("top:calc(-15px - var(--tipHead,46px));",
   "top:calc(-15px - var(--tipHead,54px));", 1),
]:
    rep('fallback:'+old[:28], old, new, n)

# and the measurement itself: a taller floor plus more slack for the descenders
rep('measure',
"""    tip.style.setProperty('--tipHead','0px');     // or min-height inflates it
    const h=hd.scrollHeight;
    tip.style.setProperty('--tipHead', Math.max(46, Math.ceil(h)+12)+'px');""",
"""    tip.style.setProperty('--tipHead','0px');     // or min-height inflates it
    const h=hd.scrollHeight;
    /* floor 46 -> 54 and slack 12 -> 16: the old figures left a two-line header
       (name over base name) touching the plate's top edge, and a display font's
       ascenders need more room than its line-height reports. */
    tip.style.setProperty('--tipHead', Math.max(54, Math.ceil(h)+16)+'px');""")

open('work.html','w',encoding='utf-8').write(src)
print('applied:', hits)
