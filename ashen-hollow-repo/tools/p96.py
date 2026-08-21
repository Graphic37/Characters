src = open('work.html', encoding='utf-8').read()
hits = {}
def rep(name, old, new, count=1):
    global src
    n = src.count(old)
    assert n == count, f"{name}: expected {count}, found {n}"
    src = src.replace(old, new); hits[name] = n

# ⚠⚠ THE GATE I ADDED IN v220 COULD NEVER PASS.
# `nearStation` is a `let` at the top level of a CLASSIC script block, which is
# SCRIPT-scoped — readable bare from other classic blocks, but NOT a property of
# window. `questAtVeyra` read `window.nearStation`, got undefined, and refused
# every accept and turn-in with 'away' — standing right next to her.
# This is the SAME trap as the v170 `COMBAT` bug, and my own memory lists it as
# a standing hazard. I wrote the gate anyway.
rep('publish',
"""  nearStation=best;
  if(!best || winOpen){ promptEl.classList.remove('on'); return; }""",
"""  nearStation=best;
  /* ⚠ PUBLISH IT. `nearStation` is a `let` at classic-script top level, which
     is SCRIPT-scoped and NOT a window property — so anything outside this
     block reading `window.nearStation` gets undefined. The v220 quest gate did
     exactly that and refused every interaction. One assignment, at the single
     place the value changes, rather than making callers guess. */
  window.nearStation=best;
  if(!best || winOpen){ promptEl.classList.remove('on'); return; }""")

# the other two exits from that function must publish too, or the value goes stale
rep('publish2',
"""    if(!riftStations.length){
      nearStation=null; promptEl.classList.remove('on'); return;
    }""",
"""    if(!riftStations.length){
      nearStation=null; window.nearStation=null;
      promptEl.classList.remove('on'); return;
    }""")

rep('publish3',
"""    nearStation=near;
    if(near){""",
"""    nearStation=near; window.nearStation=near;
    if(near){""")

# ============================================ consistent prompts
rep('mara',
"""stations.push({name:'Mara', prompt:'Trade with Mara',""",
"""stations.push({name:'Mara', prompt:'Trade',""")

open('work.html','w',encoding='utf-8').write(src)
print('applied:', hits)
