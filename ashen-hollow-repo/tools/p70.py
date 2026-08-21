src = open('work.html', encoding='utf-8').read()
hits = {}
def rep(name, old, new, count=1):
    global src
    n = src.count(old)
    assert n == count, f"{name}: expected {count}, found {n}"
    src = src.replace(old, new); hits[name] = n

# ============================================ 1. SHADER PRE-WARM
rep('warm',
"""  riftExitGate(exitAt.x, exitAt.z);""",
"""  /* ⚠ THE REAL DUNGEON-START STUTTER IS SHADER COMPILATION, NOT LOADING.
     The procedural textures are already baked on idle (`DEPTHS.ensureAssets`
     via requestIdleCallback). What is NOT prepared is the GLSL: a material
     compiles its program the first frame it is actually drawn, so a fresh
     dungeon compiles dozens of programs spread across the first seconds of
     play — which is exactly the hitching he describes, and matches his log
     climbing `programs 71 -> 85`.
     `renderer.compile()` walks the scene and compiles everything up front, so
     the cost lands HERE, during the load, instead of in the first fight. */
  try{
    if(renderer && renderer.compile){
      const t0=performance.now();
      renderer.compile(scene, camera);
      const ms=performance.now()-t0;
      say('[warm] shaders compiled in '+ms.toFixed(0)+'ms — '+
          ((renderer.info.programs&&renderer.info.programs.length)||0)+' programs');
    }
  }catch(e){ window.ahErr&&window.ahErr(e,'warmShaders'); }
  riftExitGate(exitAt.x, exitAt.z);""")

# ============================================ 2. REMOTE IMAGE PRELOAD
rep('preload',
"""window.RUNE_ART=RUNE_ART;
window.RUNE_ART_FILE=RUNE_ART_FILE;""",
"""window.RUNE_ART=RUNE_ART;
window.RUNE_ART_FILE=RUNE_ART_FILE;

/* ===========================================================================
   IMAGE PRELOAD
   ---------------------------------------------------------------------------
   The currency, rune and gear art are remote PNGs referenced by <img> in the
   UI, so each one downloads the first time its panel opens — the icon pops in
   late and the panel reflows around it. Warming them into the browser cache at
   boot means every later use is a cache hit.

   ⚠ DELIBERATELY AFTER FIRST PAINT AND ONE AT A TIME. Firing thirty parallel
   requests during startup competes with the things needed to render the first
   frame, which would trade a late icon for a slow launch. `decode()` also
   forces the DECODE, not just the download — an image that is downloaded but
   undecoded still hitches on first draw.
   ========================================================================= */
function preloadArt(){
  const urls=[];
  try{
    for(const k in CURRENCY_ART) urls.push(CURRENCY_ART[k]);
    for(const k in RUNE_ART) urls.push(RUNE_ART[k]);
    if(window.GEAR_ART) for(const k in GEAR_ART){
      const v=GEAR_ART[k];
      if(typeof v==='string') urls.push(v);
    }
  }catch(e){ window.ahErr&&window.ahErr(e,'preloadArt:collect'); }
  const seen={}, list=urls.filter(u=>u && !seen[u] && (seen[u]=1));
  let i=0, ok=0, fail=0;
  const next=()=>{
    if(i>=list.length){
      try{ console.log('[preload] art warmed: '+ok+' cached, '+fail+' missing'); }catch(e){}
      return;
    }
    const url=list[i++];
    const img=new Image();
    img.crossOrigin='anonymous';
    const done=(good)=>{ good?ok++:fail++; setTimeout(next, 30); };
    img.onload=()=>{
      /* decode as well as download — an undecoded image still hitches */
      if(img.decode) img.decode().then(()=>done(true), ()=>done(true));
      else done(true);
    };
    img.onerror=()=>done(false);
    img.src=url;
  };
  next();
}
window.preloadArt=preloadArt;
/* after first paint, never during it */
if(typeof window!=='undefined'){
  if(window.requestIdleCallback) requestIdleCallback(()=>preloadArt(), {timeout:6000});
  else setTimeout(preloadArt, 3000);
}""")

open('work.html','w',encoding='utf-8').write(src)
print('applied:', hits)
