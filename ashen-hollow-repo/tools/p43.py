src = open('work.html', encoding='utf-8').read()
hits = {}
def rep(name, old, new, count=1):
    global src
    n = src.count(old)
    assert n == count, f"{name}: expected {count}, found {n}"
    src = src.replace(old, new); hits[name] = n

# =============================================== 0. ONE PLACE FOR EVERY DIAL
rep('config',
"""function archetypeMaterial(kind, rarity) {""",
"""/* ===========================================================================
   READABILITY PASS (v186) — EVERY VALUE IS HERE, NOTHING IS BURIED
   ---------------------------------------------------------------------------
   The target ordering, in his words: dark environment -> readable floor ->
   readable props -> BRIGHTEST characters -> subtle rings. Today it is the
   reverse: the rings are the brightest thing on screen and the enemies are the
   darkest.

   ⚠ I CANNOT SEE THE RESULT. v169's abyss was structurally correct and
   visually wrong, and I only found out when he sent a screenshot. So every
   number below is a named dial in one block: if the scene comes out washed out
   or still too dark, ONE object changes and nothing has to be re-derived.
   Nothing here adds a light, a draw call or a per-frame cost — it is exposure,
   material constants and one geometry size.
   ========================================================================= */
const LOOK = {
  exposure:      1.18,   // multiplier on renderer.toneMappingExposure (+18%)
  ambient:       1.18,   // multiplier on the rift ambient light
  key:           1.10,   // multiplier on the single directional key light
  enemyTint:     1.30,   // enemies 30% brighter than their current tint
  enemyEmissive: 0.30,   // was 0.20 — lifts them off a dark floor
  propTop:       1.22,   // upper-facing prop/furniture surfaces
  ringOpacity:   0.60,   // 40% reduction, per his number
  ringThin:      0.55    // ring band thickness multiplier
};
window.LOOK = LOOK;
/* brighten a hex without letting any channel clip to white */
function lookBrighten(hex, mul){
  const c = new THREE.Color(hex);
  c.r = Math.min(1, c.r*mul); c.g = Math.min(1, c.g*mul); c.b = Math.min(1, c.b*mul);
  return c;
}

function archetypeMaterial(kind, rarity) {""")

# =============================================== 1. ENEMIES ARE THE BRIGHTEST
rep('enemy-mat',
"""  const m = stdMat(tex, { repeat: 2, env: 0.42, color: (A.tint[rarity] || A.tint.normal) });
  m.roughness = (A.family === 'undead') ? 0.76 : 0.88;
  m.emissive = new THREE.Color(0x0e0b09);
  m.emissiveIntensity = 0.20;""",
"""  /* ⚠ THE ENEMIES MUST BE THE BRIGHTEST THING IN THE ROOM. They were darker
     than the floor they stand on, which is what made the targeting rings the
     only readable element. Brightened at the MATERIAL, so it costs nothing —
     no extra light, and the material is already shared per archetype+rarity. */
  const baseTint = (A.tint[rarity] || A.tint.normal);
  const m = stdMat(tex, { repeat: 2, env: 0.42,
                          color: lookBrighten(baseTint, LOOK.enemyTint) });
  m.roughness = (A.family === 'undead') ? 0.76 : 0.88;
  m.emissive = new THREE.Color(0x0e0b09);
  /* a little self-lift so a mob standing in an unlit corner still reads as a
     silhouette rather than disappearing into the stone */
  m.emissiveIntensity = LOOK.enemyEmissive;""")

# =============================================== 2. SUBTLER RINGS
rep('ring-actors',
"""  const ringGeo=new THREE.RingGeometry(0.42,0.52,20);
  ringGeo.rotateX(-Math.PI/2);
  const ringMat=new THREE.MeshBasicMaterial({ color:0xffffff, transparent:true, opacity:0.48,
    depthWrite:false, blending:THREE.AdditiveBlending, toneMapped:false });""",
"""  /* thinner band and lower opacity: the ring should say WHERE something is,
     not be the thing you look at */
  const rIn=0.42, rOut=rIn+(0.52-0.42)*(window.LOOK?LOOK.ringThin:1);
  const ringGeo=new THREE.RingGeometry(rIn, rOut, 20);
  ringGeo.rotateX(-Math.PI/2);
  const ringMat=new THREE.MeshBasicMaterial({ color:0xffffff, transparent:true,
    opacity:0.48*(window.LOOK?LOOK.ringOpacity:1),
    depthWrite:false, blending:THREE.AdditiveBlending, toneMapped:false });""")

rep('ring-player',
"""  ACTORS.playerRing=new THREE.Mesh(pGeo, new THREE.MeshBasicMaterial({
    color:0xd7ab5e, transparent:true, opacity:arc?0.72:0.42, depthWrite:false,
    blending:THREE.AdditiveBlending, toneMapped:false }));""",
"""  ACTORS.playerRing=new THREE.Mesh(pGeo, new THREE.MeshBasicMaterial({
    color:0xd7ab5e, transparent:true,
    opacity:(arc?0.72:0.42)*(window.LOOK?LOOK.ringOpacity:1), depthWrite:false,
    blending:THREE.AdditiveBlending, toneMapped:false }));""")

# =============================================== 3. EXPOSURE + THE EXISTING RIG
rep('lighting',
"""  const amb=new THREE.AmbientLight(col(L.ambientColor,0x8fa2c4), L.ambient!==undefined?L.ambient:0.55);
  amb.userData.world='RIFT'; dungeonRoot.add(amb);
  const key=new THREE.DirectionalLight(col(L.keyColor,0xffd9a8), L.key!==undefined?L.key:1.35);""",
"""  /* ⚠ THE SAME RIG, TURNED UP — no new lights. One ambient + one directional
     is what a hundred enemies on screen can afford; adding point lights is the
     thing that would actually cost frames. */
  const K=(window.LOOK||{ambient:1,key:1});
  const amb=new THREE.AmbientLight(col(L.ambientColor,0x8fa2c4),
    (L.ambient!==undefined?L.ambient:0.55) * K.ambient);
  amb.userData.world='RIFT'; dungeonRoot.add(amb);
  const key=new THREE.DirectionalLight(col(L.keyColor,0xffd9a8),
    (L.key!==undefined?L.key:1.35) * K.key);""")

rep('exposure',
"""  if(L.exposure!==undefined) renderer.toneMappingExposure=L.exposure;""",
"""  /* exposure is free: it is a single uniform, not a light */
  renderer.toneMappingExposure =
    (L.exposure!==undefined ? L.exposure : renderer.toneMappingExposure) *
    ((window.LOOK&&LOOK.exposure)||1);""")

open('work.html','w',encoding='utf-8').write(src)
print('applied:', hits)
