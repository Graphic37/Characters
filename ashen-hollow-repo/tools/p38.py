src = open('work.html', encoding='utf-8').read()
hits = {}
def rep(name, old, new, count=1):
    global src
    n = src.count(old)
    assert n == count, f"{name}: expected {count}, found {n}"
    src = src.replace(old, new); hits[name] = n

# =============================================== 1. THE BAG CLOSING SKILLS
rep('bag-closes-skills',
"""  if(open && id==='invPanel'){
    /* symmetric: the bag and the skills pair take the same screen space, so
       whichever the player opens LAST is the one they wanted */
    try{ if($('#skillPanel').classList.contains('open')) togglePanel('skillPanel', false); }catch(e){ window.ahErr&&window.ahErr(e,'togglePanel:5875'); }
  }""",
"""  /* ⚠ THE BAG AND THE PAIR DO NOT COMPETE FOR SPACE — the premise was wrong.
     `#invPanel` lives in **rightDock**; char/skill/stash live in **leftDock**.
     They are on opposite edges of the screen, and `relayout()` already scales
     each dock independently. The old rule closed one to make room that was
     never being taken.
     The only case where they genuinely collide is a narrow window, and that is
     a WIDTH question, so it is asked as one — see fitsAlongside(). */""")

rep('skills-closes-bag',
"""    if(id==='skillPanel'){
      /* the bag cannot fit beside stash + skills; keep it out of the way
         rather than letting it cover them */
      try{
        const bag=$('#invPanel');
        if(bag && bag.classList.contains('open')) togglePanel('invPanel', false);
      }catch(e){ window.ahErr&&window.ahErr(e,'togglePanel:5885'); }
      /* the tab must be chosen BEFORE anything repaints the strip */""",
"""    if(id==='skillPanel'){
      /* the bag stays open unless the window genuinely cannot hold both */
      try{
        const bag=$('#invPanel');
        if(bag && bag.classList.contains('open') && !fitsAlongside())
          togglePanel('invPanel', false);
      }catch(e){ window.ahErr&&window.ahErr(e,'togglePanel:5885'); }
      /* the tab must be chosen BEFORE anything repaints the strip */""")

# =============================================== 2. ASK THE REAL QUESTION
rep('fits',
"""function scheduleFit(){""",
"""/* Can the left dock (skills + stash) and the right dock (the bag) both be on
   screen without overlapping? MEASURED, not guessed: the panels' own widths at
   the scale they will actually render, plus a gutter so the world is not
   entirely covered. Below that the bag steps aside as it used to; above it,
   which is every normal window, everything he opened stays open. */
function fitsAlongside(){
  try{
    const L=document.getElementById('leftDock'), R=document.getElementById('rightDock');
    if(!L || !R) return true;
    const sc=(el,v)=>{
      const s=parseFloat(getComputedStyle(document.documentElement).getPropertyValue(v));
      return (isFinite(s)&&s>0) ? s : 1;
    };
    /* offsetWidth is pre-transform, so multiply by the dock's own scale — the
       v137/v147 trap: a rect is scaled, offsetWidth is not, and mixing them
       silently answers the wrong question. */
    const lw=L.offsetWidth * sc(L,'--uiL');
    const rw=R.offsetWidth * sc(R,'--uiR');
    return (lw + rw + 120) <= innerWidth;
  }catch(e){ window.ahErr&&window.ahErr(e,'fitsAlongside'); return true; }
}
window.fitsAlongside=fitsAlongside;

function scheduleFit(){""")

# =============================================== 3. THE PAIR CLAMP MUST NOT
#     STARVE THE BAG. With three panels open the left dock is held at >=1 while
#     the right dock is clamped by `wide` — fine, they are independent.
rep('fit-note',
"""  const wide=vw/1520;""",
"""  /* with the bag now allowed open beside the pair, the two docks are competing
     for the same viewport — but they are still clamped INDEPENDENTLY, so the
     bag shrinking is never caused by the stash being open. */
  const wide=vw/1520;""")

open('work.html','w',encoding='utf-8').write(src)
print('applied:', hits)
