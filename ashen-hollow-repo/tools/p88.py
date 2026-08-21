src = open('work.html', encoding='utf-8').read()
hits = {}
def rep(name, old, new, count=1):
    global src
    n = src.count(old)
    assert n == count, f"{name}: expected {count}, found {n}"
    src = src.replace(old, new); hits[name] = n

rep('minimap',
"""function questEl(){""",
"""/* ===========================================================================
   MINIMAP  (v220)
   ---------------------------------------------------------------------------
   Top-right, with the quest tracker beneath it — his PoE2 reference.

   ⚠ THE FLOOR IS DRAWN ONCE PER DUNGEON, NOT PER FRAME. Sampling the walk grid
   across a whole map every frame would be thousands of probes a frame, which
   is the cost class that killed things earlier in this project. The static
   layer is baked to an offscreen canvas when the rift is built; the per-frame
   pass only blits that and draws a handful of dots.
   ⚠ AND IT IS THROTTLED to 10Hz — a minimap that updates at 144Hz tells the
   player nothing a 10Hz one does not.
   ========================================================================= */
const MMAP = { el:null, ctx:null, base:null, baseCtx:null, bounds:null,
               at:0, size:158, built:false };
function mmapEl(){
  if(MMAP.el && MMAP.el.parentNode) return MMAP.el;
  const wrap=document.createElement('div');
  wrap.id='miniWrap';
  const c=document.createElement('canvas');
  c.id='miniMap'; c.width=MMAP.size; c.height=MMAP.size;
  wrap.appendChild(c);
  document.body.appendChild(wrap);
  MMAP.el=wrap; MMAP.ctx=c.getContext('2d');
  return wrap;
}
/* bake the walkable floor once, when the map is known */
window.mmapBuild=function(bounds){
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
};
function mmapProject(x,z){
  const b=MMAP.bounds;
  return [ ((x-b.minX)/b.span)*MMAP.size, ((z-b.minZ)/b.span)*MMAP.size ];
}
window.updateMinimap=function(){
  try{
    const now=performance.now();
    if(now-MMAP.at < 100) return;           /* 10Hz */
    MMAP.at=now;
    const live = !!(window.RIFT && RIFT.active && MMAP.built && MMAP.bounds);
    const wrap=mmapEl();
    wrap.classList.toggle('on', live);
    if(!live) return;
    const g=MMAP.ctx, S=MMAP.size;
    g.clearRect(0,0,S,S);
    g.drawImage(MMAP.base, 0,0, S,S);
    /* enemies, then loot, then the player LAST so he is never painted over */
    try{
      if(window.ENEMIES){
        for(let i=0;i<ENEMIES.length;i++){
          const e=ENEMIES[i];
          if(!e || e.dead || !e.g) continue;
          const [px,py]=mmapProject(e.g.position.x, e.g.position.z);
          if(px<0||py<0||px>S||py>S) continue;
          g.fillStyle = e.isBoss ? '#ff5a4a'
                      : e.elitePack==='rare' ? '#f2c53d'
                      : e.elitePack==='magic' ? '#4d8dff' : 'rgba(220,90,80,0.75)';
          const r = e.isBoss?3.2 : e.elitePack?2.4 : 1.4;
          g.beginPath(); g.arc(px,py,r,0,6.283); g.fill();
        }
      }
    }catch(e){}
    try{
      if(window.GROUND) for(let i=0;i<GROUND.length;i++){
        const l=GROUND[i]; if(!l||!l.g) continue;
        const [px,py]=mmapProject(l.g.position.x, l.g.position.z);
        g.fillStyle='#8fe06a';
        g.fillRect(px-1.2,py-1.2,2.4,2.4);
      }
    }catch(e){}
    try{
      const P=player.position;
      const [px,py]=mmapProject(P.x,P.z);
      g.strokeStyle='#fff'; g.lineWidth=1.6;
      g.beginPath(); g.arc(px,py,3.4,0,6.283); g.stroke();
      g.fillStyle='#fff'; g.beginPath(); g.arc(px,py,1.5,0,6.283); g.fill();
    }catch(e){}
  }catch(e){ window.ahErr&&window.ahErr(e,'updateMinimap'); }
};

function questEl(){""")

rep('build-hook',
"""  try{ if(window.buildSpine) buildSpine(nav, (d&&d.name)||'unnamed'); }
  catch(e){ window.ahErr&&window.ahErr(e,'buildSpine:hook'); }""",
"""  try{ if(window.buildSpine) buildSpine(nav, (d&&d.name)||'unnamed'); }
  catch(e){ window.ahErr&&window.ahErr(e,'buildSpine:hook'); }
  /* bake the minimap floor from the same bounds, once */
  try{ if(window.mmapBuild) mmapBuild(bounds); }
  catch(e){ window.ahErr&&window.ahErr(e,'mmapBuild:hook'); }""")

rep('tick',
"""  window.updateNpcPlates && window.updateNpcPlates();""",
"""  window.updateNpcPlates && window.updateNpcPlates();
  window.updateMinimap && window.updateMinimap();""")

# the quest board moves under the minimap
rep('boardpos',
"""#questBoard{
  position:fixed; left:14px; top:64px; z-index:37; pointer-events:none;
  min-width:210px; max-width:280px;
  opacity:0; transition:opacity .3s ease;
}""",
"""/* ⚠ TOP-RIGHT, UNDER THE MINIMAP — his PoE2 reference. `top` is computed from
   the map's own size so the two cannot overlap if either changes. */
#questBoard{
  position:fixed; right:16px; top:196px; z-index:37; pointer-events:none;
  min-width:210px; max-width:290px; text-align:right;
  opacity:0; transition:opacity .3s ease;
}
#questBoard .qLine, #questBoard .qTrack, #questBoard .qFoot{ margin-left:0; margin-right:0 }
#questBoard .qTrack{ margin-top:6px }""")

CSS = """
/* ---- minimap (v220) ------------------------------------------------------ */
#miniWrap{
  position:fixed; right:16px; top:16px; z-index:37; pointer-events:none;
  width:158px; height:158px;
  opacity:0; transition:opacity .3s ease;
  border:1px solid rgba(70,78,92,.85);
  background:rgba(6,8,11,.72);
  box-shadow:0 3px 14px rgba(0,0,0,.65), inset 0 0 0 1px rgba(0,0,0,.7);
}
#miniWrap.on{ opacity:1 }
#miniMap{ display:block; width:158px; height:158px; image-rendering:auto }
"""
rep('css', "\n</style>", "\n" + CSS + "\n</style>")

open('work.html','w',encoding='utf-8').write(src)
print('applied:', hits)
