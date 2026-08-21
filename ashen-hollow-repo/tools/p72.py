src = open('work.html', encoding='utf-8').read()
hits = {}
def rep(name, old, new, count=1):
    global src
    n = src.count(old)
    assert n == count, f"{name}: expected {count}, found {n}"
    src = src.replace(old, new); hits[name] = n

rep('floor',
"""  if(document.body.classList.contains('pairOpen')) fitL = Math.max(1, Math.min(fitL, 1.25));""",
"""  if(document.body.classList.contains('pairOpen')) fitL = Math.max(1, Math.min(fitL, 1.25));
  /* ⚠ THE STASH ALONE WAS SMALLER THAN THE STASH BESIDE SKILLS — backwards,
     and my own doing. The v135 clamp above only fires for `pairOpen`, so the
     PAIR got a floor of 1.0 while the stash on its own fell straight through
     to `dockFit`, which divides the viewport by the panel's height and happily
     returns 0.7 on a short window. Opening a SECOND panel therefore made the
     first one bigger, which is exactly what he noticed.
     The floor belongs to the PANEL, not to the combination: a stash grid at
     0.7 scale is unreadable whether or not skills happens to be open beside
     it. Same clamp, same reason, applied whenever the stash is up. */
  else if(document.getElementById('stashPanel') &&
          document.getElementById('stashPanel').classList.contains('open'))
    fitL = Math.max(1, Math.min(fitL, 1.25));""")

open('work.html','w',encoding='utf-8').write(src)
print('applied:', hits)
