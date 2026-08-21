src = open('work.html', encoding='utf-8').read()
hits = {}
def rep(name, old, new, count=1):
    global src
    n = src.count(old)
    assert n == count, f"{name}: expected {count}, found {n}"
    src = src.replace(old, new); hits[name] = n

rep('measure',
"""function updateHeadPlate(){""",
"""/* ⚠ THE PLATE SAT AT CHEST HEIGHT BECAUSE `bodyRadius` IS HORIZONTAL.
   The lift was `bodyRadius * 2.4` — a collision RADIUS, which says nothing
   about how tall a model is, and it ignored `g.scale` entirely. Measured
   against the archetypes that ship: the plate landed at **53-61% of body
   height** on every normal enemy and **39%** on a boss. That is the chest.

   The model knows its own height, so ask it: one `Box3` per enemy, cached on
   the record. Enemies do not change size after spawn, so this is a single
   measurement each, not per frame — and a measured top beats any ratio I could
   invent, especially across archetypes whose scales run 0.92 to 1.42. */
function enemyHeadY(e){
  try{
    if(typeof e.__headY === 'number') return e.__headY;
    if(!e.g) return 2.2;
    e.g.updateMatrixWorld(true);
    const box=new THREE.Box3().setFromObject(e.g);
    if(box.isEmpty() || !isFinite(box.max.y)){
      /* no geometry yet (a model still streaming): DO NOT cache a guess, or
         the plate is stuck low for this enemy's whole life */
      const sc=(e.g.scale && e.g.scale.x) || 1;
      return ((e.bodyRadius||0.42) * 4.3 * sc);
    }
    /* local height above the group's own origin, so it survives the enemy
       walking around without re-measuring */
    e.__headY = Math.max(0.8, box.max.y - e.g.position.y);
    return e.__headY;
  }catch(err){ window.ahErr&&window.ahErr(err,'enemyHeadY'); return 2.2; }
}
window.enemyHeadY=enemyHeadY;

function updateHeadPlate(){""")

rep('use',
"""    const v=new THREE.Vector3(p.x, p.y+(e.bodyRadius?e.bodyRadius*2.4:2.2), p.z);""",
"""    /* the measured top of the model, plus a small gap so the plate floats
       clear of the head rather than resting on it */
    const v=new THREE.Vector3(p.x, p.y + enemyHeadY(e) + 0.35, p.z);""")

open('work.html','w',encoding='utf-8').write(src)
print('applied:', hits)
