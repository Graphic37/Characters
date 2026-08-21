src = open('work.html', encoding='utf-8').read()
hits = {}
def rep(name, old, new, count=1):
    global src
    n = src.count(old)
    assert n == count, f"{name}: expected {count}, found {n}"
    src = src.replace(old, new); hits[name] = n

rep('killtarget',
"""  killTarget: t => Math.round(14 + t*0.9)""",
"""  /* ===================================================================
     CHALLENGE PACING — DESIGNED AROUND THE 5:00 TIMER (v210)
     -------------------------------------------------------------------
     ⚠ `14 + t*0.9` was inherited from the 15-minute timer and never moved
     when v166 cut it to 5:00. At tier 100 it demanded 104 kills in 300s —
     **one kill every 2.9 seconds, sustained for five minutes**, which is
     not a difficulty curve, it is a wall.

     THE PACE IS THE DESIGN; THE COUNT IS ARITHMETIC. Pick the
     seconds-per-kill a tier should demand, then divide the timer by it.
     That way the number can never drift out of the timer's reach again,
     and every tier states a pace a human can read.

     12s per kill at tier 1 -> 4.0s at tier 100, eased so the early tiers
     stay gentle and the top stays demanding but achievable:
        tier   1  ->  25 kills  (12.0s each)
        tier  25  ->  34 kills  ( 8.8s each)
        tier  50  ->  43 kills  ( 7.0s each)
        tier 100  ->  75 kills  ( 4.0s each)   was 104 at 2.9s
     ⚠ If the timer changes again, CHANGE ONLY `challengePace`. The target
     follows automatically — that coupling is the whole point. */
  challengePace: t => {
    const k=Math.max(0, Math.min(1, (t-1)/99));
    return 12.0 + (4.0-12.0)*Math.pow(k, 0.65);   // seconds per kill
  },
  killTarget: t => {
    const secs=(window.GR_CFG && GR_CFG.timerSeconds) || 300;
    return Math.max(12, Math.round(secs / RIFT_CFG.challengePace(t)));
  }""")

open('work.html','w',encoding='utf-8').write(src)
print('applied:', hits)
