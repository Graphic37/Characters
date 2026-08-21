src = open('work.html', encoding='utf-8').read()
hits = {}
def rep(name, old, new, count=1):
    global src
    n = src.count(old)
    assert n == count, f"{name}: expected {count}, found {n}"
    src = src.replace(old, new); hits[name] = n

rep('elite-glow',
"""  e.g=enemyMesh(rarity, rarity==='rare'?1.35:rarity==='magic'?1.12:1, kind);""",
"""  e.g=enemyMesh(rarity, rarity==='rare'?1.35:rarity==='magic'?1.12:1, kind);
  /* ELITES HAVE TO BE VISIBLE IN THE WORLD, NOT ONLY IN THE HEALTH BAR.
     A ground disc rather than an outline or an emissive tint, because:
     - the camera is top-down, so the floor is the surface with the most
       screen area per enemy and the least chance of being hidden behind him;
     - the enemy MATERIALS ARE SHARED across every mob of an archetype, so
       tinting one would tint them all;
     - it costs one mesh with SHARED geometry and a SHARED material per rarity,
       and it inherits the enemy's transform for free.
     Blue = magic, gold = rare, matching the health-bar colours already used. */
  if(rarity==='magic' || rarity==='rare') attachEliteGlow(e, rarity);""")

rep('glow-impl',
"""function ri2(a,b){ return a+Math.floor(Math.random()*(b-a+1)); }""",
"""/* ---- the elite marker --------------------------------------------------- */
/* ⚠ SHARED geometry and material, built once. Per-enemy copies would be a leak
   of exactly the shape v151 spent a version cleaning up, and there can be a
   hundred-odd enemies alive at once. Registered in AH_KEEP_GEO so no teardown
   sweep can dispose the one copy everybody draws from. */
let ELITE_ART=null;
function eliteArt(){
  if(ELITE_ART) return ELITE_ART;
  const geo=new THREE.CircleGeometry(1, 22);
  geo.rotateX(-Math.PI/2);
  const mk=(hex)=>new THREE.MeshBasicMaterial({
    color:hex, transparent:true, opacity:0.30,
    blending:THREE.AdditiveBlending, depthWrite:false, toneMapped:false, fog:true });
  ELITE_ART={ geo:geo, magic:mk(0x5a8cff), rare:mk(0xe8b552) };
  try{ if(window.AH_KEEP_GEO) AH_KEEP_GEO.add(geo); }
  catch(e){ window.ahErr&&window.ahErr(e,'eliteArt:keep'); }
  return ELITE_ART;
}
function attachEliteGlow(e, rarity){
  try{
    const A=eliteArt();
    const m=new THREE.Mesh(A.geo, rarity==='rare' ? A.rare : A.magic);
    /* just clear of the floor, or it z-fights the tiles */
    m.position.y=0.06;
    const s=rarity==='rare' ? 1.15 : 0.85;
    m.scale.set(s,s,s);
    m.renderOrder=-1;                 /* under the FX, over the floor */
    m.userData.eliteGlow=1;
    m.userData.world='RIFT';
    e.g.add(m);                       /* a CHILD, so it follows him for free */
    e.glow=m;
    e.glowBase=s;
  }catch(err){ window.ahErr&&window.ahErr(err,'attachEliteGlow'); }
}
/* a slow breath, so an elite reads as alive rather than as a decal. One sine
   per elite per frame — no allocation, no material churn. */
function tickEliteGlow(dt){
  if(!ENEMIES || !ENEMIES.length) return;
  const t=performance.now()/1000;
  for(let i=0;i<ENEMIES.length;i++){
    const e=ENEMIES[i];
    if(!e || !e.glow || e.dead) continue;
    const k=e.glowBase*(1+Math.sin(t*1.7+i)*0.07);
    e.glow.scale.set(k,k,k);
  }
}
window.tickEliteGlow=tickEliteGlow;
window.attachEliteGlow=attachEliteGlow;

function ri2(a,b){ return a+Math.floor(Math.random()*(b-a+1)); }""")

rep('glow-tick',
"""  window.autoTick && window.autoTick(dt);""",
"""  window.autoTick && window.autoTick(dt);
  window.tickEliteGlow && window.tickEliteGlow(dt);""")

# the glow must die with its owner, and must NOT take the shared geometry with it
rep('glow-death',
"""function disposeEnemy(e){
  if(!e) return;
  e.dead=true;
  riftRoot.remove(e.g); scene.remove(e.g);""",
"""function disposeEnemy(e){
  if(!e) return;
  e.dead=true;
  /* detach the marker but DISPOSE NOTHING — its geometry and material are the
     shared pair every other elite is drawing from */
  if(e.glow){ if(e.glow.parent) e.glow.parent.remove(e.glow); e.glow=null; }
  riftRoot.remove(e.g); scene.remove(e.g);""")

rep('glow-kill',
"""function killEnemy(e, silent){
  if(!e || e.dead) return;
  e.dead=true;""",
"""function killEnemy(e, silent){
  if(!e || e.dead) return;
  e.dead=true;
  /* a corpse keeps its mesh for the death animation, but an elite marker under
     a dead body still reads as a live elite */
  if(e.glow){ if(e.glow.parent) e.glow.parent.remove(e.glow); e.glow=null; }""")

open('work.html','w',encoding='utf-8').write(src)
print('applied:', hits)
