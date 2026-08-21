src = open('work.html', encoding='utf-8').read()
hits = {}
def rep(name, old, new, count=1):
    global src
    n = src.count(old)
    assert n == count, f"{name}: expected {count}, found {n}"
    src = src.replace(old, new); hits[name] = n

# ============================================ 1. THE COLLISION I CAUSED
# ⚠ `#riftHud` has sat at right:18 top:18 all along — I put the minimap at
# right:16 top:16 without checking what was already in that corner. Fifth time
# in this project I have built into occupied space.
rep('rifthud',
"""riftBar.style.cssText='position:fixed;right:18px;top:18px;z-index:59;'+""",
"""/* ⚠ MOVED DOWN FOR THE MINIMAP (v221). This was `top:18px` — the same corner
   the minimap now occupies — so the progress bar drew straight over it. The
   map is 158px tall at top:16, so the bar starts below that. */
riftBar.style.cssText='position:fixed;right:18px;top:186px;z-index:59;'+""")

# quests move below the bar, not below the map
rep('questpos',
"""#questBoard{
  position:fixed; right:16px; top:196px; z-index:37; pointer-events:none;""",
"""#questBoard{
  position:fixed; right:16px; top:250px; z-index:37; pointer-events:none;""")

# ============================================ 2. DRAW FROM THE NAV MESH
rep('bake',
"""window.mmapBuild=function(bounds){
  try{
    MMAP.built=false;
    if(!bounds || !window.DEPTHS || !DEPTHS.walkableAt) return;
    const N=128;
    if(!MMAP.base){
      MMAP.base=document.createElement('canvas');
      MMAP.base.width=MMAP.base.height=N;
      MMAP.baseCtx=MMAP.base.getContext('2d');
    }
    const g=MMAP.baseCtx;
    g.clearRect(0,0,N,N);
    const w=bounds.maxX-bounds.minX, d=bounds.maxZ-bounds.minZ;
    const span=Math.max(w,d)||1;
    MMAP.bounds={ minX:bounds.minX, minZ:bounds.minZ, span:span, N:N };
    g.fillStyle='rgba(150,168,196,0.34)';
    for(let iy=0;iy<N;iy++){
      for(let ix=0;ix<N;ix++){
        const wx=bounds.minX + (ix/N)*span;
        const wz=bounds.minZ + (iy/N)*span;
        if(DEPTHS.walkableAt(wx,wz)!==false) g.fillRect(ix,iy,1,1);
      }
    }
    MMAP.built=true;
  }catch(e){ window.ahErr&&window.ahErr(e,'mmapBuild'); }
};""",
"""/* ⚠ DRAWN FROM THE NAV MESH, NOT THE WALK GRID.
   The grid version came out blank, and rather than guess again: `walkableAt`
   can return **null** for "outside the known grid", and it is not necessarily
   populated at the moment the dungeon finishes building. The nav mesh IS
   populated by then — his own console prints "nav mesh: 716 points, 1379
   links" on the line above — every point in it is walkable BY CONSTRUCTION,
   and it is already the thing Auto trusts to path with.
   So the map shows exactly where the character can actually go, which is the
   only thing a minimap is for.
   Bounds come from the POINTS too, not from the passed geometry bounds: the
   walkable area is smaller than the model's extents, and fitting to the mesh
   means the map fills its box instead of sitting in one corner of it. */
window.mmapBuild=function(){
  try{
    MMAP.built=false;
    const mesh = window.RIFT && RIFT.nav && RIFT.nav.mesh;
    const pts = mesh && mesh.pts;
    if(!pts || pts.length<8){ say('[minimap] no nav mesh — not drawn'); return; }
    const N=128;
    if(!MMAP.base){
      MMAP.base=document.createElement('canvas');
      MMAP.base.width=MMAP.base.height=N;
      MMAP.baseCtx=MMAP.base.getContext('2d');
    }
    let minX=1e9,maxX=-1e9,minZ=1e9,maxZ=-1e9;
    for(let i=0;i<pts.length;i++){
      const p=pts[i];
      if(p.x<minX)minX=p.x; if(p.x>maxX)maxX=p.x;
      if(p.z<minZ)minZ=p.z; if(p.z>maxZ)maxZ=p.z;
    }
    const pad=3;
    minX-=pad; maxX+=pad; minZ-=pad; maxZ+=pad;
    const span=Math.max(maxX-minX, maxZ-minZ)||1;
    /* centre the shorter axis so the map is not jammed against an edge */
    MMAP.bounds={ minX:minX-(span-(maxX-minX))/2,
                  minZ:minZ-(span-(maxZ-minZ))/2, span:span, N:N };
    const g=MMAP.baseCtx;
    g.clearRect(0,0,N,N);
    g.fillStyle='rgba(150,168,196,0.40)';
    const b=MMAP.bounds, r=Math.max(1.5, N/span*2.2);
    for(let i=0;i<pts.length;i++){
      const p=pts[i];
      const ix=((p.x-b.minX)/span)*N, iy=((p.z-b.minZ)/span)*N;
      g.beginPath(); g.arc(ix,iy,r,0,6.283); g.fill();
    }
    MMAP.built=true;
    say('[minimap] '+pts.length+' nav points over '+span.toFixed(0)+'m');
  }catch(e){ window.ahErr&&window.ahErr(e,'mmapBuild'); }
};""")

rep('hook',
"""  /* bake the minimap floor from the same bounds, once */
  try{ if(window.mmapBuild) mmapBuild(bounds); }
  catch(e){ window.ahErr&&window.ahErr(e,'mmapBuild:hook'); }""",
"""  /* bake the minimap once, AFTER RIFT.nav is set — it reads the nav mesh */
  try{ if(window.mmapBuild) mmapBuild(); }
  catch(e){ window.ahErr&&window.ahErr(e,'mmapBuild:hook'); }""")

open('work.html','w',encoding='utf-8').write(src)
print('applied:', hits)
