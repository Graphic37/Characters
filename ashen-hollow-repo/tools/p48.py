src = open('work.html', encoding='utf-8').read()
hits = {}
def rep(name, old, new, count=1):
    global src
    n = src.count(old)
    assert n == count, f"{name}: expected {count}, found {n}"
    src = src.replace(old, new); hits[name] = n

# ===================================================== 1. THE DIALS
rep('dials',
"""  ringOpacity:   0.60,   // 40% reduction, per his number
  ringThin:      0.55    // ring band thickness multiplier
};""",
"""  ringOpacity:   0.60,   // 40% reduction, per his number
  ringThin:      0.55,   // ring band thickness multiplier

  /* ---- the void, v192 --------------------------------------------------
     ⚠ THESE ARE LINEAR VALUES. v169 died because 0.30 was written as though it
     were a displayed brightness — the renderer converts material colour from
     linear to sRGB, which roughly DOUBLES perceived midtones, so 0.30 landed
     near 0.58 and read as light grey. Anything meant to look "almost black"
     belongs in the 0.02-0.06 range, which is where these sit.
     0x080b11 = (0.031, 0.043, 0.067) linear. Dark blue-grey, not black. */
  voidColor:     0x080b11,   // the abyss beyond the room
  voidFog:       0x070a0f,   // fog tint, a shade darker than the backdrop
  backdropY:     -26,        // how far below the floor the plane sits
  vignette:      0.55        // 0 = off, 1 = heavy. CSS only, zero GPU cost.
};""")

# ===================================================== 2. THE BACKDROP
rep('backdrop',
"""function buildDungeonTail(""",
"""/* ===========================================================================
   THE ABYSS BACKDROP  (v192)
   ---------------------------------------------------------------------------
   ⚠ HISTORY: v169 attempted this with wall skirts, silhouettes and haze, and
   was reverted (v174) — the vertex-colour ramp was written in displayed rather
   than linear values and every wall grew a white/red band. THIS PASS
   DELIBERATELY DOES NOT REBUILD ANY OF THAT. No skirts, no silhouettes, no
   per-wall geometry. Just three things that cannot be got wrong that way:

     1. ONE plane far below the floor, so a gap reads as depth rather than as
        a hole in the page. Unlit, fogged, one draw call, no shadows.
     2. The rift's fog and clear colour moved off near-black onto the same
        dark blue-grey, so the plane and the horizon agree.
     3. A CSS vignette on top of the canvas — zero GPU cost, no draw call, and
        it does the "rooms fall off into shadow" job better than geometry.

   If this still looks wrong, every value is in LOOK and one object changes.
   ========================================================================= */
const VOID = { plane:null };
function buildVoidBackdrop(root, bounds){
  clearVoidBackdrop();
  if(!root || !bounds) return 0;
  try{
    const L=window.LOOK||{};
    /* generous overscan: the camera can see well past the room bounds, and a
       backdrop with a visible edge is worse than no backdrop */
    const w=Math.max(200,(bounds.maxX-bounds.minX)+320);
    const d=Math.max(200,(bounds.maxZ-bounds.minZ)+320);
    const cx=(bounds.minX+bounds.maxX)/2, cz=(bounds.minZ+bounds.maxZ)/2;
    const geo=new THREE.PlaneGeometry(w,d);
    geo.rotateX(-Math.PI/2);
    const mat=new THREE.MeshBasicMaterial({
      color:(L.voidColor!==undefined?L.voidColor:0x080b11),
      fog:true, depthWrite:false, toneMapped:true });
    const m=new THREE.Mesh(geo, mat);
    m.position.set(cx, (L.backdropY!==undefined?L.backdropY:-26), cz);
    m.renderOrder=-2;                 /* behind everything, including the haze */
    m.frustumCulled=false;
    m.userData.world='RIFT';
    root.add(m);
    VOID.plane=m;
    return 1;
  }catch(e){ window.ahErr&&window.ahErr(e,'buildVoidBackdrop'); return 0; }
}
function clearVoidBackdrop(){
  const m=VOID.plane; if(!m) return;
  try{
    if(m.parent) m.parent.remove(m);
    if(m.geometry) m.geometry.dispose();
    if(m.material) m.material.dispose();
  }catch(e){ window.ahErr&&window.ahErr(e,'clearVoidBackdrop'); }
  VOID.plane=null;
}
window.buildVoidBackdrop=buildVoidBackdrop;
window.clearVoidBackdrop=clearVoidBackdrop;

function buildDungeonTail(""")

rep('hook',
"""  riftExitGate(exitAt.x, exitAt.z);
  placeDungeonDecor(d);""",
"""  riftExitGate(exitAt.x, exitAt.z);
  /* the void gets a floor and a colour. The lighting preset still wins if the
     dungeon declares one — this only replaces RAW BLACK. */
  try{
    const LT=(d && d.lighting) || {};
    const L=window.LOOK||{};
    if(LT.fogColor===undefined){
      const vc=(L.voidColor!==undefined?L.voidColor:0x080b11);
      const vf=(L.voidFog!==undefined?L.voidFog:0x070a0f);
      if(scene.background && scene.background.isColor) scene.background.setHex(vc);
      if(scene.fog) scene.fog.color.setHex(vf);
    }
    buildVoidBackdrop(dungeonRoot, bounds);
    if(window.setVignette) setVignette(true);
  }catch(e){ window.ahErr&&window.ahErr(e,'buildDungeonTail:void'); }
  placeDungeonDecor(d);""")

rep('clear',
"""function clearRift(){""",
"""function clearRift(){
  try{ if(window.clearVoidBackdrop) clearVoidBackdrop(); }catch(e){ window.ahErr&&window.ahErr(e,'clearRift:void'); }
  try{ if(window.setVignette) setVignette(false); }catch(e){ window.ahErr&&window.ahErr(e,'clearRift:vig'); }""")

# ===================================================== 3. THE VIGNETTE
rep('vignette-js',
"""window.buildVoidBackdrop=buildVoidBackdrop;""",
"""/* The edge falloff. A DOM overlay rather than a post-process: it costs the GPU
   nothing, adds no draw call to the scene, cannot interact with the fog, and
   is one property to animate. `pointer-events:none` so it never eats a click. */
function setVignette(on){
  try{
    let el=document.getElementById('ahVig');
    if(!el){
      el=document.createElement('div');
      el.id='ahVig';
      document.body.appendChild(el);
    }
    const L=window.LOOK||{};
    el.style.setProperty('--vigA', String(L.vignette!==undefined?L.vignette:0.55));
    el.classList.toggle('on', !!on);
  }catch(e){ window.ahErr&&window.ahErr(e,'setVignette'); }
}
window.setVignette=setVignette;

window.buildVoidBackdrop=buildVoidBackdrop;""")

CSS = """
/* ---- the rift vignette (v192) --------------------------------------------
   Sits directly above the canvas (z-index 1) and below every UI surface, so it
   darkens the WORLD and never the HUD. Zero GPU cost — no render target, no
   post-processing pass, nothing added to the scene graph. */
#ahVig{
  position:fixed; inset:0; z-index:1; pointer-events:none;
  opacity:0; transition:opacity .45s ease;
  background:radial-gradient(ellipse 78% 72% at 50% 46%,
    rgba(0,0,0,0) 38%,
    rgba(4,6,10,calc(var(--vigA,.55) * .55)) 74%,
    rgba(2,4,7,var(--vigA,.55)) 100%);
}
#ahVig.on{ opacity:1 }
"""
rep('vignette-css', "\n</style>", "\n" + CSS + "\n</style>")

open('work.html','w',encoding='utf-8').write(src)
print('applied:', hits)
