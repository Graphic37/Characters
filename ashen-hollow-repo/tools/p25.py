src = open('work.html', encoding='utf-8').read()
hits = {}
def rep(name, old, new, count=1):
    global src
    n = src.count(old)
    assert n == count, f"{name}: expected {count}, found {n}"
    src = src.replace(old, new); hits[name] = n

rep('haze-module',
"""function buildDungeonTail(""",
"""/* ===========================================================================
   ABYSS HAZE + VOID COLOUR
   The skirts and silhouettes are built inside DEPTHS (they are per-cell and
   belong to the kit). These two pieces are per-DUNGEON, so they live here:
   a pair of slow-drifting haze planes under the floor, and the void colour
   itself. Two meshes, no lights, no shadows, no collision.
   ========================================================================= */
const ABYSS = { hazes:[], on:false, tex:null };
function abyssHazeTex(){
  if(ABYSS.tex) return ABYSS.tex;            /* built once, kept for the page */
  const c=document.createElement('canvas'); c.width=c.height=256;
  const g=c.getContext('2d');
  /* a few soft blobs, so the drift reads as moving mist rather than a
     rotating disc — one texture, reused by both planes */
  g.clearRect(0,0,256,256);
  for(let i=0;i<26;i++){
    const x=Math.random()*256, y=Math.random()*256, r=18+Math.random()*54;
    const rg=g.createRadialGradient(x,y,0,x,y,r);
    rg.addColorStop(0,'rgba(150,175,205,0.13)');
    rg.addColorStop(1,'rgba(150,175,205,0)');
    g.fillStyle=rg; g.beginPath(); g.arc(x,y,r,0,6.283); g.fill();
  }
  const t=new THREE.CanvasTexture(c);
  t.wrapS=t.wrapT=THREE.RepeatWrapping;
  ABYSS.tex=t; return t;
}
function buildAbyssHaze(root, bounds){
  clearAbyssHaze();
  if(!root || !bounds) return 0;
  const w=Math.max(40,(bounds.maxX-bounds.minX)+60);
  const d=Math.max(40,(bounds.maxZ-bounds.minZ)+60);
  const cx=(bounds.minX+bounds.maxX)/2, cz=(bounds.minZ+bounds.maxZ)/2;
  const geo=new THREE.PlaneGeometry(w,d);
  geo.rotateX(-Math.PI/2);
  /* TWO layers drifting in opposite directions: one plane reads as a texture
     sliding, two read as depth. depthWrite off so they never occlude anything,
     and additive would glow — this must stay a haze, not a light. */
  const specs=[{y:-2.6, op:0.30, rep:2.2, spd: 0.010},
               {y:-6.2, op:0.22, rep:1.4, spd:-0.006}];
  for(const s of specs){
    const tex=abyssHazeTex().clone();
    tex.needsUpdate=true;
    tex.wrapS=tex.wrapT=THREE.RepeatWrapping;
    tex.repeat.set(s.rep,s.rep);
    const mat=new THREE.MeshBasicMaterial({ map:tex, transparent:true,
      opacity:s.op, depthWrite:false, color:0x8fa6c4, fog:true });
    const m=new THREE.Mesh(geo, mat);
    m.position.set(cx, s.y, cz);
    m.renderOrder=-1;
    m.userData.world='RIFT'; m.userData.abyss=1; m.userData.spd=s.spd;
    root.add(m); ABYSS.hazes.push(m);
  }
  ABYSS.on=true;
  return ABYSS.hazes.length;
}
function clearAbyssHaze(){
  for(const m of ABYSS.hazes){
    if(m.parent) m.parent.remove(m);
    try{ if(m.geometry) m.geometry.dispose(); }catch(e){ window.ahErr&&window.ahErr(e,'clearAbyssHaze:geo'); }
    try{ if(m.material){ if(m.material.map) m.material.map.dispose(); m.material.dispose(); } }
    catch(e){ window.ahErr&&window.ahErr(e,'clearAbyssHaze:mat'); }
  }
  ABYSS.hazes.length=0; ABYSS.on=false;
}
/* the drift. Offsetting a texture costs nothing; moving geometry would not. */
function abyssTick(dt){
  if(!ABYSS.on) return;
  for(const m of ABYSS.hazes){
    const t=m.material && m.material.map; if(!t) continue;
    t.offset.x += m.userData.spd*dt;
    t.offset.y += m.userData.spd*dt*0.6;
  }
}
window.buildAbyssHaze=buildAbyssHaze;
window.clearAbyssHaze=clearAbyssHaze;
window.abyssTick=abyssTick;

function buildDungeonTail(""")

# drive the drift from the existing per-frame hook
rep('haze-tick',
"""  window.autoTick && window.autoTick(dt);""",
"""  window.autoTick && window.autoTick(dt);
  window.abyssTick && window.abyssTick(dt);""")

# build it once the dungeon's bounds are known, and free it with the rift
rep('haze-build',
"""  riftExitGate(exitAt.x, exitAt.z);
  placeDungeonDecor(d);""",
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
  placeDungeonDecor(d);""")

rep('haze-clear',
"""function clearRift(){""",
"""function clearRift(){
  try{ if(window.clearAbyssHaze) clearAbyssHaze(); }catch(e){ window.ahErr&&window.ahErr(e,'clearRift:abyss'); }""")

open('work.html','w',encoding='utf-8').write(src)
print('applied:', hits)
