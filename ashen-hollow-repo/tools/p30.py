src = open('work.html', encoding='utf-8').read()
hits = {}
def rep(name, old, new, count=1):
    global src
    n = src.count(old)
    assert n == count, f"{name}: expected {count}, found {n}"
    src = src.replace(old, new); hits[name] = n

def cut(name, start_mark, end_mark, keep=''):
    """remove everything from start_mark through end_mark inclusive"""
    global src
    a = src.find(start_mark)
    assert a >= 0, name + ': start not found'
    b = src.find(end_mark, a)
    assert b >= 0, name + ': end not found'
    src = src[:a] + keep + src[b+len(end_mark):]
    hits[name] = 1

# ================================================= 1. the kit definitions
cut('defs',
"""
  /* ---- THE ABYSS ---------------------------------------------------------""",
"""  kit.def('abyssArch', GEO.abyssArch, MAT.abyss, { cast: false, recv: false });""")

# ================================================= 2. the geometry
cut('geo',
"""
  /* the skirt: the outside face of a wall, continuing down into the dark.""",
"""  GEO.abyssArch = shadeDown(new THREE.TorusGeometry(3.4, 0.42, 4, 10, Math.PI), 0.15, 0.02);""")

# ================================================= 3. shadeDown itself
cut('shade',
"""/* Bake a top-to-bottom brightness ramp into vertex colours. An unlit material""",
"""function jitterVerts(geo, amp, seed) {""",
keep="function jitterVerts(geo, amp, seed) {")

# ================================================= 4. the material
cut('mat',
"""  /* unlit and fogged: the scene fog is what makes distant abyss geometry
     dissolve, and skipping the lighting model is most of the saving */
  MAT.abyss = new THREE.MeshBasicMaterial({ vertexColors: true, fog: true });
""", """  MAT.abyss = new THREE.MeshBasicMaterial({ vertexColors: true, fog: true });
""")

# ================================================= 5. the build pass
rep('build-call',
"""    this.buildCorridorDressing();
    this.buildAbyss();
    this.kit.commit(this.group);""",
"""    this.buildCorridorDressing();
    this.kit.commit(this.group);""")

cut('buildAbyss',
"""  /* ------------------------------- the abyss ------------------------------""",
"""  /* --------------------------- doorway frames ----------------------------- */""",
keep="""  /* --------------------------- doorway frames ----------------------------- */""")

# ================================================= 6. the light-position record
cut('notelight',
"""  noteLight(x, z) {""",
"""  addSconce(wx, wz, dir) {""",
keep="""  addSconce(wx, wz, dir) {""")

rep('notelight2',
"""  addSconce(wx, wz, dir) {
    this.noteLight(wx, wz);""",
"""  addSconce(wx, wz, dir) {""")

rep('notelight3',
"""  addBrazier(wx, wz, scale = 1) {
    this.noteLight(wx, wz);""",
"""  addBrazier(wx, wz, scale = 1) {""")

# ================================================= 7. the haze module
cut('haze-module',
"""/* ===========================================================================
   ABYSS HAZE + VOID COLOUR""",
"""function buildDungeonTail(""",
keep="""function buildDungeonTail(""")

rep('haze-tick',
"""  window.autoTick && window.autoTick(dt);
  window.abyssTick && window.abyssTick(dt);""",
"""  window.autoTick && window.autoTick(dt);""")

# ================================================= 8. the build/clear hooks
rep('haze-build',
"""  riftExitGate(exitAt.x, exitAt.z);
  /* ⚠ NOT pure black. A flat #000 gap reads as an unfinished background; a
     near-black BLUE still holds information in the shadows, which is what
     makes the skirts and silhouettes legible at all. */
  try{
    const L=(d && d.lighting) || {};
    if(L.fogColor===undefined){
      if(scene.background && scene.background.isColor) scene.background.setHex(0x05080b);
      if(scene.fog) scene.fog.color.setHex(0x05080b);
    }
    buildAbyssHaze(dungeonRoot, bounds);
  }catch(e){ window.ahErr&&window.ahErr(e,'buildDungeonTail:abyss'); }
  placeDungeonDecor(d);""",
"""  riftExitGate(exitAt.x, exitAt.z);
  placeDungeonDecor(d);""")

rep('haze-clear',
"""function clearRift(){
  try{ if(window.clearAbyssHaze) clearAbyssHaze(); }catch(e){ window.ahErr&&window.ahErr(e,'clearRift:abyss'); }""",
"""function clearRift(){""")

open('work.html','w',encoding='utf-8').write(src)
print('applied:', hits)
