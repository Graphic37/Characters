src = open('work.html', encoding='utf-8').read()
hits = {}
def rep(name, old, new, count=1):
    global src
    n = src.count(old)
    assert n == count, f"{name}: expected {count}, found {n}"
    src = src.replace(old, new); hits[name] = n

# ============================================================ 1. THE HELPER
rep('ahfree',
"""function clearRift(){""",
"""/* ===========================================================================
   FREEING GPU BUFFERS — the piece every teardown path in this file was missing.
   Removing an Object3D from the scene graph drops the JS reference; the vertex
   buffers it uploaded stay on the GPU until dispose() is called. Every "clear"
   below removed and never disposed, so a session that repeats rifts forever
   climbed forever.

   TWO things must never be freed here:
   - SPRITES. THREE.Sprite shares ONE module-level geometry across every sprite
     in the program. Disposing it does not free "this sprite" — it evicts the
     buffer every sprite in the game draws from. `updateFX` was doing exactly
     that on every muzzle flash.
   - anything registered in AH_KEEP_GEO (shared geometry built once and reused).
   MATERIALS ARE DELIBERATELY LEFT ALONE: the sentry's iron/wood/gold and the FX
   materials are shared instances, disposing one would break every later user,
   and materials are not what renderer.info.memory counts anyway.
   ========================================================================= */
const AH_KEEP_GEO = new Set();
window.AH_KEEP_GEO = AH_KEEP_GEO;
function ahFree(root){
  if(!root) return 0;
  let n=0;
  try{
    root.traverse(o=>{
      if(!o || o.isSprite) return;                  // see above: shared geometry
      const g=o.geometry;
      if(!g || AH_KEEP_GEO.has(g)) return;
      if(g.userData && g.userData.shared) return;
      try{ g.dispose(); n++; }catch(e){}
    });
  }catch(e){}
  return n;
}
window.ahFree=ahFree;

function clearRift(){""")

# ============================================================ 2. EXIT GATE
rep('gate-cache',
"""function riftExitGate(x,z){
  const g=new THREE.Group();
  const ring=new THREE.Mesh(new THREE.TorusGeometry(1.15,.09,8,26),
    new THREE.MeshBasicMaterial({color:0x9fd8ff, transparent:true, opacity:.9,
      blending:THREE.AdditiveBlending, depthWrite:false, toneMapped:false}));
  ring.rotation.x=Math.PI/2; ring.position.y=.06; g.add(ring);
  const glow=new THREE.Mesh(new THREE.CircleGeometry(1.05,24),
    new THREE.MeshBasicMaterial({color:0x6fb3e0, transparent:true, opacity:.28,
      blending:THREE.AdditiveBlending, depthWrite:false, toneMapped:false}));
  glow.rotation.x=-Math.PI/2; glow.position.y=.05; g.add(glow);""",
"""/* The gate is IDENTICAL every run, and it was rebuilt from scratch each time —
   two geometries and two materials per rift, disposed by nothing. That is the
   +2 geometries per rift in the leak note, on its own. Built once, reused. */
const GATE_ART={};
function gateArt(){
  if(!GATE_ART.ringGeo){
    GATE_ART.ringGeo=new THREE.TorusGeometry(1.15,.09,8,26);
    GATE_ART.glowGeo=new THREE.CircleGeometry(1.05,24);
    GATE_ART.ringMat=new THREE.MeshBasicMaterial({color:0x9fd8ff, transparent:true, opacity:.9,
      blending:THREE.AdditiveBlending, depthWrite:false, toneMapped:false});
    GATE_ART.glowMat=new THREE.MeshBasicMaterial({color:0x6fb3e0, transparent:true, opacity:.28,
      blending:THREE.AdditiveBlending, depthWrite:false, toneMapped:false});
    AH_KEEP_GEO.add(GATE_ART.ringGeo); AH_KEEP_GEO.add(GATE_ART.glowGeo);
  }
  return GATE_ART;
}
function riftExitGate(x,z){
  const g=new THREE.Group();
  const A=gateArt();
  const ring=new THREE.Mesh(A.ringGeo, A.ringMat);
  ring.rotation.x=Math.PI/2; ring.position.y=.06; g.add(ring);
  const glow=new THREE.Mesh(A.glowGeo, A.glowMat);
  glow.rotation.x=-Math.PI/2; glow.position.y=.05; g.add(glow);""")

# ============================================================ 3. clearRift frees
rep('clearrift-free',
"""  if(typeof FIELDS!=='undefined'){ FIELDS.slice().forEach(f=>{ if(f.g) riftRoot.remove(f.g); }); FIELDS.length=0; }""",
"""  if(typeof FIELDS!=='undefined'){ FIELDS.slice().forEach(f=>{ if(f.g){ ahFree(f.g); riftRoot.remove(f.g); } }); FIELDS.length=0; }""")

# BOTH sites: clearRift, and the authored-entry swap that throws away the
# temporary procedural floor the moment the real map streams in — that one runs
# on EVERY authored rift and freed nothing.
rep('clearrift-group',
"""if(RIFT.group){ riftRoot.remove(RIFT.group); RIFT.group=null; }""",
"""if(RIFT.group){ ahFree(RIFT.group); riftRoot.remove(RIFT.group); RIFT.group=null; }""", 2)

rep('clearrift-tail',
"""  /* whatever is left under riftRoot goes with it */
  while(riftRoot.children.length) riftRoot.remove(riftRoot.children[0]);""",
"""  /* whatever is left under riftRoot goes with it — and its buffers go too.
     dungeonRoot is EXEMPT: it is re-parented on the next build and DEPTHS owns
     its disposal through teardown(), which knows what is shared. */
  while(riftRoot.children.length){
    const c=riftRoot.children[0];
    if(c!==(typeof dungeonRoot!=='undefined'?dungeonRoot:null)) ahFree(c);
    riftRoot.remove(c);
  }""")

# ============================================================ 4. SENTRIES
rep('sentry-expire',
"""      fxRing(s.x,0.05,s.z,1.4,0.2,0xc9e88a,0.35,0.16);      // and it leaves with weight
      riftRoot.remove(s.g); SENTRIES.splice(i,1); continue;""",
"""      fxRing(s.x,0.05,s.z,1.4,0.2,0xc9e88a,0.35,0.16);      // and it leaves with weight
      /* ~16 fresh geometries are built per turret (legs, feet, collar, cradle,
         rail, limbs, tips, string, core). Nothing freed them, and Sentry is on
         a 2-charge 8s cooldown — an unattended run casts it dozens of times. */
      if(window.ahFree) window.ahFree(s.g);
      riftRoot.remove(s.g); SENTRIES.splice(i,1); continue;""")

rep('sentry-trim',
"""      while(SENTRIES.length > count*2) { const old=SENTRIES.shift(); riftRoot.remove(old.g); }""",
"""      while(SENTRIES.length > count*2) { const old=SENTRIES.shift();
        if(window.ahFree) window.ahFree(old.g);
        riftRoot.remove(old.g); }""")

rep('sentry-clear',
"""function clearSentries(){ SENTRIES.slice().forEach(s=>{ riftRoot.remove(s.g); }); SENTRIES.length=0; }""",
"""function clearSentries(){
  SENTRIES.slice().forEach(s=>{ if(window.ahFree) window.ahFree(s.g); riftRoot.remove(s.g); });
  SENTRIES.length=0;
}""")

# ============================================================ 5. FIELDS + FX
rep('fields-expire',
"""    if(f.t<=0){ if(f.g) riftRoot.remove(f.g); FIELDS.splice(i,1); }""",
"""    if(f.t<=0){ if(f.g){ if(window.ahFree) window.ahFree(f.g); riftRoot.remove(f.g); } FIELDS.splice(i,1); }""")

rep('fx-update',
"""    if(f.t>=f.life){
      riftRoot.remove(f.o);
      if(f.o.geometry) f.o.geometry.dispose();
      FX.splice(i,1);
    }""",
"""    if(f.t>=f.life){
      riftRoot.remove(f.o);
      /* ⚠ THIS USED TO DISPOSE SPRITE GEOMETRY. THREE.Sprite shares ONE global
         geometry, so every muzzle flash was evicting the buffer that every
         sprite in the game draws from — churn, not a leak, but never intended.
         ahFree() knows to skip sprites and shared geometry. */
      if(window.ahFree) window.ahFree(f.o);
      else if(f.o.geometry && !f.o.isSprite) f.o.geometry.dispose();
      FX.splice(i,1);
    }""")

rep('fx-clear',
"""window.clearFX=function(){ FX.slice().forEach(f=>riftRoot.remove(f.o)); FX.length=0; };""",
"""/* leaving a rift mid-fight left every live effect's geometry on the GPU */
window.clearFX=function(){
  FX.slice().forEach(f=>{ if(window.ahFree) window.ahFree(f.o); riftRoot.remove(f.o); });
  FX.length=0;
};""")

# ============================================================ 6. alphaTex CACHE
rep('alphatex',
"""function alphaTex(canvas, repeat = 1) {
  const t = new THREE.CanvasTexture(canvas);
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  t.repeat.set(repeat, repeat);
  return t;""",
"""/* THIS WAS A FACTORY, NOT A CACHE. Every call made a fresh CanvasTexture over
   the SAME source canvas, and the shader materials that hold them in uniforms
   are not freed by disposing the material. makeFlames() and each particle
   system call it once per build, which is the ~2.5 textures per rift in the
   leak note. The canvases are shared and immutable, so one texture per
   (canvas, repeat) pair serves every build for the life of the page. */
const ALPHA_TEX_CACHE = new Map();
function alphaTex(canvas, repeat = 1) {
  let byRepeat = ALPHA_TEX_CACHE.get(canvas);
  if (!byRepeat) { byRepeat = new Map(); ALPHA_TEX_CACHE.set(canvas, byRepeat); }
  const hit = byRepeat.get(repeat);
  if (hit) return hit;
  const t = new THREE.CanvasTexture(canvas);
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  t.repeat.set(repeat, repeat);
  byRepeat.set(repeat, t);
  return t;""")

# ============================================================ 7. THE PROBE
rep('ahleak',
"""/* Proof, not assurance: after leaving a Rift this must be all zeros. */""",
"""/* ===========================================================================
   F7 — GPU RESOURCE READING. renderer.info.memory is the only honest count of
   what is actually resident, and it cannot be measured from a headless harness,
   so this is the reading he takes himself: F7 in town, run some rifts, F7 again.
   The delta per rift is the number that matters, not the absolute.
   ========================================================================= */
window.ahLeak=function(tag){
  const m=(renderer && renderer.info && renderer.info.memory) || {geometries:0, textures:0};
  const now={ geometries:m.geometries, textures:m.textures,
              programs:(renderer.info.programs?renderer.info.programs.length:0),
              calls:renderer.info.render.calls,
              riftRuns:(RIFT.runs||0),
              riftRootChildren:riftRoot.children.length,
              fx:(window.FX?FX.length:0),
              sentries:(window.SENTRIES?SENTRIES.length:0),
              fields:(window.FIELDS?FIELDS.length:0) };
  const b=window.__ahLeakBase;
  const lines=['[leak] '+(tag||'')+'  geometries '+now.geometries+'  textures '+now.textures+
               '  programs '+now.programs+'  rifts '+now.riftRuns];
  if(b){
    const dR=Math.max(1, now.riftRuns-b.riftRuns);
    lines.push('        since baseline: '+(now.geometries-b.geometries)+' geometries, '+
      (now.textures-b.textures)+' textures over '+(now.riftRuns-b.riftRuns)+' rift(s)');
    if(now.riftRuns>b.riftRuns)
      lines.push('        PER RIFT: '+((now.geometries-b.geometries)/dR).toFixed(2)+' geometries, '+
        ((now.textures-b.textures)/dR).toFixed(2)+' textures  <- this is the number that matters');
  } else {
    window.__ahLeakBase=now;
    lines.push('        baseline set — press F7 again after a few rifts');
  }
  lines.push('        live: '+now.riftRootChildren+' rift children, '+now.fx+' fx, '+
             now.sentries+' sentries, '+now.fields+' fields');
  const out=lines.join('\\n');
  console.log(out);
  try{ toast('Leak reading in the console (F7)'); }catch(e){}
  return now;
};
window.ahLeakReset=function(){ window.__ahLeakBase=null; return window.ahLeak('reset'); };
addEventListener('keydown',e=>{ if(e.key==='F7'){ e.preventDefault(); window.ahLeak('F7'); } });

/* Proof, not assurance: after leaving a Rift this must be all zeros. */""")

open('work.html','w',encoding='utf-8').write(src)
print('applied:', hits)
