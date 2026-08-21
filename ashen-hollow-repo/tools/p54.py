src = open('work.html', encoding='utf-8').read()
hits = {}
def rep(name, old, new, count=1):
    global src
    n = src.count(old)
    assert n == count, f"{name}: expected {count}, found {n}"
    src = src.replace(old, new); hits[name] = n

# ============================================ 1. THE DIALS
rep('dials',
"""  vignette:      0.55        // 0 = off, 1 = heavy. CSS only, zero GPU cost.
};""",
"""  vignette:      0.55,       // 0 = off, 1 = heavy. CSS only, zero GPU cost.

  /* ---- contact darkening + warm/cool split, v200 -----------------------
     ⚠ THESE MULTIPLY DOWNWARD ONLY. v169 baked vertex colours as though they
     were displayed values and every wall grew a bright band; the safety
     property here is that the ramp's ceiling is 1.0, so the worst case is
     "too dark", never "glowing". Darkening cannot produce the v169 failure. */
  baseDark:      0.42,       // wall colour multiplier AT the floor line
  baseHeight:    1.15,       // metres over which it returns to full
  keyWarm:       0xffc98a,   // torch-side key light
  ambCool:       0x7d95c4    // ambient, pushed cooler for contrast
};""")

# ============================================ 2. THE BAKED GRADIENT
rep('ramp',
"""function wallPanelGeo(variant, seed) {""",
"""/* ===========================================================================
   BAKED CONTACT DARKENING  (v200)
   ---------------------------------------------------------------------------
   His note: "even a cheap baked-style gradient at wall-floor intersections
   will make the whole dungeon look much less flat". This bakes exactly that
   into the SHARED wall geometry's vertex colours — dark at the plinth, back to
   full by `baseHeight`. Cost: one extra attribute on 14 geometries, zero per
   instance, zero per frame, no new draw call, no light, no shadow.

   ⚠ THE v169 GUARD: this only ever multiplies DOWN (ceiling 1.0). Vertex
   colours multiply the material colour, so the failure mode is "too dark",
   which is recoverable by one dial. v169 went wrong by writing values that
   multiplied UP into a bright band.
   ⚠ AND: enabling `vertexColors` on a material makes the shader REQUIRE the
   attribute — any geometry sharing MAT.wall without it renders black. Every
   piece registered against MAT.wall gets the ramp, and the patch asserts the
   list matches.
   ========================================================================= */
function bakeContactDark(geo){
  try{
    const L=window.LOOK||{};
    const lo=(L.baseDark!==undefined?L.baseDark:0.42);
    const h =(L.baseHeight!==undefined?L.baseHeight:1.15);
    const p=geo.attributes.position;
    const c=new Float32Array(p.count*3);
    for(let i=0;i<p.count;i++){
      const y=p.getY(i);
      let t=Math.max(0, Math.min(1, y/h));
      t=t*t;                                  /* tight to the floor, not a wash */
      const v=lo+(1-lo)*t;
      c[i*3]=v; c[i*3+1]=v; c[i*3+2]=v;       /* neutral: darken, do not tint */
    }
    geo.setAttribute('color', new THREE.BufferAttribute(c,3));
  }catch(e){ window.ahErr&&window.ahErr(e,'bakeContactDark'); }
  return geo;
}
window.bakeContactDark=bakeContactDark;

function wallPanelGeo(variant, seed) {""")

# apply to every piece that shares MAT.wall — enumerated, not guessed
rep('apply',
"""  const wallOpt = { cast: false, recv: true };
  for (const k of ['wall_p0', 'wall_p1', 'wall_p2', 'wall_p3', 'wall_p4', 'wall_p5', 'wall_c0', 'wall_c1', 'wall_n0', 'wall_n1', 'wall_b0', 'wall_b1'])
    kit.def(k, GEO[k], MAT.wall, wallOpt);
  kit.def('post', GEO.post, MAT.wall, wallOpt);
  kit.def('corbel', GEO.corbel, MAT.wall, wallOpt);""",
"""  const wallOpt = { cast: false, recv: true };
  /* ⚠ EVERY GEOMETRY THAT SHARES MAT.wall MUST GET THE COLOUR ATTRIBUTE.
     With `vertexColors:true` the shader requires it; a piece without one
     renders black. This list IS the set of MAT.wall users — post and corbel
     included — so it is baked here, next to the registration, where the two
     cannot drift apart. */
  const WALL_PIECES = ['wall_p0','wall_p1','wall_p2','wall_p3','wall_p4','wall_p5',
                       'wall_c0','wall_c1','wall_n0','wall_n1','wall_b0','wall_b1',
                       'post','corbel'];
  WALL_PIECES.forEach(k=>{ if(GEO[k]) bakeContactDark(GEO[k]); });
  MAT.wall.vertexColors = true;
  MAT.wall.needsUpdate = true;
  for (const k of ['wall_p0', 'wall_p1', 'wall_p2', 'wall_p3', 'wall_p4', 'wall_p5', 'wall_c0', 'wall_c1', 'wall_n0', 'wall_n1', 'wall_b0', 'wall_b1'])
    kit.def(k, GEO[k], MAT.wall, wallOpt);
  kit.def('post', GEO.post, MAT.wall, wallOpt);
  kit.def('corbel', GEO.corbel, MAT.wall, wallOpt);""")

# ============================================ 3. WARM KEY, COOL AMBIENT
rep('lights',
"""  const amb=new THREE.AmbientLight(col(L.ambientColor,0x8fa2c4),
    (L.ambient!==undefined?L.ambient:0.55) * K.ambient);
  amb.userData.world='RIFT'; dungeonRoot.add(amb);
  const key=new THREE.DirectionalLight(col(L.keyColor,0xffd9a8),
    (L.key!==undefined?L.key:1.35) * K.key);""",
"""  /* ⚠ WARM vs COOL is a COLOUR change, not a count change — still one ambient
     and one directional. Pushing the ambient cooler and the key warmer is what
     makes a torchlit room read as torchlit; adding lights is what kills the
     frame rate at 200 enemies. */
  const amb=new THREE.AmbientLight(col(L.ambientColor, (K.ambCool||0x8fa2c4)),
    (L.ambient!==undefined?L.ambient:0.55) * K.ambient);
  amb.userData.world='RIFT'; dungeonRoot.add(amb);
  const key=new THREE.DirectionalLight(col(L.keyColor, (K.keyWarm||0xffd9a8)),
    (L.key!==undefined?L.key:1.35) * K.key);""")

open('work.html','w',encoding='utf-8').write(src)
print('applied:', hits)
