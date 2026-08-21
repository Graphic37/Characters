src = open('work.html', encoding='utf-8').read()
hits = {}
def rep(name, old, new, count=1):
    global src
    n = src.count(old)
    assert n == count, f"{name}: expected {count}, found {n}"
    src = src.replace(old, new); hits[name] = n

# ============================================ 1. ONE FORMULA, SHARED
rep('expected',
"""function rollDamage(mult, targetLevel){""",
"""/* ===========================================================================
   THE EXPECTED VALUE OF ONE HIT — the same formula rollDamage() rolls.
   ---------------------------------------------------------------------------
   ⚠ THE PANEL AND COMBAT USED DIFFERENT MATHS. `skillDamage()` computed
   `weaponAvg() + gearFlat()` all times `gearMult()`, while the real hit is
   per-family: each family's flat is scaled by ITS OWN % and then summed. Those
   two are not the same expression and cannot be made to agree by tuning — a
   `% fire` roll multiplies only fire in combat but multiplied EVERYTHING in
   the panel. Since rune values are about to be chosen from measurements, the
   estimate has to BE the formula, not resemble it.

   Returns the mean of rollDamage()'s `total` before accuracy and crit, so the
   panel can apply crit as an expected value the way a character sheet does.
   ========================================================================= */
function expectedHitParts(){
  const st=stats();
  const mid=k=>{ const r=st.range[k]; return (r.lo+r.hi)/2; };
  return {
    phys: ((st.min+st.max)/2 + mid('phys')) * (1+st.pct.phys/100),
    fire: mid('fire')  * (1+st.pct.fire/100),
    cold: mid('cold')  * (1+st.pct.cold/100),
    light:mid('light') * (1+st.pct.light/100),
    pois: mid('pois')  * (1+st.pct.pois/100)
  };
}
function expectedHit(){
  const p=expectedHitParts();
  let t=0; for(const k in p) t+=p[k];
  return t;
}
window.expectedHitParts=expectedHitParts;
window.expectedHit=expectedHit;

function rollDamage(mult, targetLevel){""")

# ============================================ 2. THE PANEL USES IT
rep('panel',
"""    var perHit = (w.avg + gearFlat()) * C.coef * gem * sup.more * gearMult();""",
"""    /* ⚠ ONE MODEL. This was `(weaponAvg + gearFlat) * coef * gem * supports *
       gearMult` — a different expression from the one combat evaluates, which
       is why a `% fire` roll moved this number more than it moved a real hit.
       `expectedHit()` IS rollDamage()'s formula, so the panel and the game can
       no longer disagree; the skill-side multipliers still apply on top. */
    var base = (window.expectedHit ? expectedHit()
                                   : (w.avg + gearFlat()) * gearMult());
    var perHit = base * C.coef * gem * sup.more;""")

# gearFlat/gearMult are now unused by the headline; keep them for the drawer but
# say so, rather than leaving two live models side by side
rep('drawer-note',
"""  function gearMult(){""",
"""  /* ⚠ gearMult()/gearFlat() NO LONGER FEED THE HEADLINE — expectedHit() does.
     They survive only so the breakdown drawer can still show the player where
     the number came from. Do not reintroduce them into the damage line: that
     is precisely the divergence v189 removed. */
  function gearMult(){""")

# the breakdown must report the model that is actually used
rep('breakdown',
"""             /* the inputs, so the drawer can show its working rather than
                recomputing them and drifting from the number above it */
             weaponAvg:w.avg, gearFlat:gearFlat(), coef:C.coef,
             gearMult:gearMult(), critAvg:critAvg, rate:rate,
             crit:w.crit, critMult:w.cm };""",
"""             /* the inputs, so the drawer can show its working rather than
                recomputing them and drifting from the number above it */
             weaponAvg:w.avg, gearFlat:gearFlat(), coef:C.coef,
             gearMult:gearMult(), critAvg:critAvg, rate:rate,
             crit:w.crit, critMult:w.cm,
             /* the real base and its per-family split, so the drawer explains
                the number the game will actually deal */
             base:(window.expectedHit?expectedHit():0),
             parts:(window.expectedHitParts?expectedHitParts():null) };""")

rep('drawer-rows',
"""          row('Weapon average', n(D.weaponAvg,1)) +
          row('Flat from gear', '+'+n(D.gearFlat,0)) +
          row('Base per hit', n(base,1)) +""",
"""          row('Base per hit', n(D.base,1), fam(D.parts)) +""")

rep('drawer-fam',
"""      var row = function(k,v,note){""",
"""      /* the per-family split is the whole point of the model: it shows WHY a
         % fire rune is worth what it is worth on THIS build */
      var fam = function(p){
        if(!p) return '';
        var t=0; for(var k in p) t+=p[k];
        if(t<=0) return '';
        return Object.keys(p).filter(function(k){ return p[k]>0.05; })
          .map(function(k){ return k+' '+Math.round(p[k]/t*100)+'%'; }).join('  ');
      };
      var row = function(k,v,note){""")

rep('drawer-base',
"""      var base = (D.weaponAvg||0) + (D.gearFlat||0);
      var sups""",
"""      var sups""")

open('work.html','w',encoding='utf-8').write(src)
print('applied:', hits)
