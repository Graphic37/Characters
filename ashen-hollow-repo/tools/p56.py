src = open('work.html', encoding='utf-8').read()
hits = {}
def rep(name, old, new, count=1):
    global src
    n = src.count(old)
    assert n == count, f"{name}: expected {count}, found {n}"
    src = src.replace(old, new); hits[name] = n

rep('fx-cache',
"""function fxRing(x,y,z,r0,r1,colour,life,thick){
  const m=new THREE.Mesh(new THREE.RingGeometry(r0*0.86, r0, 40),
    new THREE.MeshBasicMaterial({color:colour, transparent:true, opacity:.95,
      side:THREE.DoubleSide, depthWrite:false, blending:THREE.AdditiveBlending, toneMapped:false}));
  m.rotation.x=-Math.PI/2; m.position.set(x,y,z);
  /* This allocated and disposed a 40-segment RingGeometry EVERY FRAME of every
     ring. Build it once at unit size and scale the mesh instead. */
  return fxAdd(m, life, (o,k)=>{
    const r=r0+(r1-r0)*k;
    o.scale.setScalar(r/Math.max(0.001,r0));
    o.material.opacity=0.95*(1-k)*(1-k);
  });
}""",
"""/* ===========================================================================
   FX RESOURCE CACHES  (v202)
   ---------------------------------------------------------------------------
   ⚠ v151's `ahFree` carries the comment "the FX materials are shared instances,
   disposing one would break every later user". THAT WAS FALSE. Every helper
   below built a NEW material per call — and `fxSparks` built one PER SPARK, so
   a single 9-spark burst leaked nine. Nothing ever disposed them.
   His F7 readings caught it: standing in ONE rift, geometries +43 and textures
   +26 with zero rift transitions.

   Fixed at the SOURCE rather than by adding disposal. Disposal would have meant
   deciding per material whether it is shared — exactly the judgement that was
   already got wrong once, and getting it wrong the other way turns things black.
   A cache cannot make that mistake: nothing is ever freed because nothing is
   ever duplicated.

   Keyed by colour, which is the only thing that varied. Opacity and scale are
   per-mesh, not per-material... EXCEPT that these animate opacity, so a shared
   material would make every ring fade together. Hence `.clone()` of a CACHED
   material: clone shares the program and the map (no new texture, no new
   program) while giving each effect its own opacity. That is the cheap half of
   the allocation, not the expensive half.
   ========================================================================= */
const FX_MAT = { ring:new Map(), sprite:new Map() };
function fxRingMat(colour){
  let base=FX_MAT.ring.get(colour);
  if(!base){
    base=new THREE.MeshBasicMaterial({color:colour, transparent:true, opacity:.95,
      side:THREE.DoubleSide, depthWrite:false, blending:THREE.AdditiveBlending,
      toneMapped:false});
    FX_MAT.ring.set(colour, base);
  }
  return base.clone();
}
function fxSpriteMat(colour, opacity){
  let base=FX_MAT.sprite.get(colour);
  if(!base){
    base=new THREE.SpriteMaterial({map:fxDot, color:colour, transparent:true,
      depthWrite:false, blending:THREE.AdditiveBlending, toneMapped:false});
    FX_MAT.sprite.set(colour, base);
  }
  const m=base.clone();
  if(opacity!==undefined) m.opacity=opacity;
  return m;
}
/* ONE unit ring, built once and kept — every ring scales it. */
let FX_RING_GEO=null;
function fxRingGeo(){
  if(!FX_RING_GEO){
    FX_RING_GEO=new THREE.RingGeometry(0.86, 1.0, 40);
    try{ if(window.AH_KEEP_GEO) AH_KEEP_GEO.add(FX_RING_GEO); }catch(e){}
    FX_RING_GEO.userData.shared=true;
  }
  return FX_RING_GEO;
}
window.FX_MAT=FX_MAT;

function fxRing(x,y,z,r0,r1,colour,life,thick){
  const m=new THREE.Mesh(fxRingGeo(), fxRingMat(colour));
  m.rotation.x=-Math.PI/2; m.position.set(x,y,z);
  m.scale.setScalar(r0);
  return fxAdd(m, life, (o,k)=>{
    const r=r0+(r1-r0)*k;
    o.scale.setScalar(r);
    o.material.opacity=0.95*(1-k)*(1-k);
  });
}""")

rep('flash',
"""  const m=new THREE.Sprite(new THREE.SpriteMaterial({map:fxDot, color:colour,
    transparent:true, depthWrite:false, blending:THREE.AdditiveBlending, toneMapped:false}));
  m.position.set(x,y,z); m.scale.setScalar(size);""",
"""  const m=new THREE.Sprite(fxSpriteMat(colour));
  m.position.set(x,y,z); m.scale.setScalar(size);""")

rep('sparks',
"""    const s=new THREE.Sprite(new THREE.SpriteMaterial({map:fxDot, color:colour,
      transparent:true, depthWrite:false, blending:THREE.AdditiveBlending, toneMapped:false}));
    s.scale.setScalar(0.18+Math.random()*0.16);""",
"""    /* ⚠ THIS WAS ONE NEW MATERIAL PER SPARK — the worst of the four. */
    const s=new THREE.Sprite(fxSpriteMat(colour));
    s.scale.setScalar(0.18+Math.random()*0.16);""")

rep('trail',
"""  const m=new THREE.Sprite(new THREE.SpriteMaterial({map:fxDot, color:colour,
    transparent:true, opacity:.55, depthWrite:false, blending:THREE.AdditiveBlending, toneMapped:false}));
  m.scale.set(width||0.5, width||0.5, 1);""",
"""  const m=new THREE.Sprite(fxSpriteMat(colour, .55));
  m.scale.set(width||0.5, width||0.5, 1);""")

# and now materials CAN be disposed safely: a clone is per-effect by construction
rep('free-mats',
"""function ahFree(root){
  if(!root) return 0;
  let n=0;
  try{
    root.traverse(o=>{
      if(!o || o.isSprite) return;                  // see above: shared geometry
      const g=o.geometry;
      if(!g || AH_KEEP_GEO.has(g)) return;
      if(g.userData && g.userData.shared) return;
      try{ g.dispose(); n++; }catch(e){ window.ahErr&&window.ahErr(e,'ahFree:12276'); }
    });
  }catch(e){ window.ahErr&&window.ahErr(e,'ahFree:12278'); }
  return n;
}""",
"""function ahFree(root){
  if(!root) return 0;
  let n=0;
  try{
    root.traverse(o=>{
      if(!o) return;
      /* ⚠ MATERIALS ARE NOW SAFE TO FREE — but ONLY the clones. v151 refused to
         touch materials because it could not tell a shared one from a per-effect
         one. Since v202 every FX material is a `.clone()` of a cached base, and
         a clone is per-effect BY CONSTRUCTION. The base stays in FX_MAT and is
         never traversed, so it can never be disposed by accident.
         Sprites keep their shared geometry (v151) but their material is a clone
         like any other, so it is freed here. */
      const mt=o.material;
      if(mt && !Array.isArray(mt) && mt.userData && mt.userData.fxClone){
        try{ mt.dispose(); }catch(e){ window.ahErr&&window.ahErr(e,'ahFree:mat'); }
      }
      if(o.isSprite) return;                        // see above: shared geometry
      const g=o.geometry;
      if(!g || AH_KEEP_GEO.has(g)) return;
      if(g.userData && g.userData.shared) return;
      try{ g.dispose(); n++; }catch(e){ window.ahErr&&window.ahErr(e,'ahFree:12276'); }
    });
  }catch(e){ window.ahErr&&window.ahErr(e,'ahFree:12278'); }
  return n;
}""")

# mark the clones so ahFree can recognise them
rep('mark1',
"""    FX_MAT.ring.set(colour, base);
  }
  return base.clone();""",
"""    FX_MAT.ring.set(colour, base);
  }
  const c=base.clone(); c.userData.fxClone=1; return c;""")
rep('mark2',
"""  const m=base.clone();
  if(opacity!==undefined) m.opacity=opacity;
  return m;""",
"""  const m=base.clone();
  m.userData.fxClone=1;
  if(opacity!==undefined) m.opacity=opacity;
  return m;""")

open('work.html','w',encoding='utf-8').write(src)
print('applied:', hits)
