src = open('work.html', encoding='utf-8').read()
hits = {}
def rep(name, old, new, count=1):
    global src
    n = src.count(old)
    assert n == count, f"{name}: expected {count}, found {n}"
    src = src.replace(old, new); hits[name] = n

rep('navmesh',
"""    /* resample to a fixed step so "progress" is a real distance */
    const pts=[];""",
"""    /* ⚠⚠ USE THE NAVMESH BETWEEN ANCHORS, NOT A STRAIGHT LINE.
       His first real map exposed this immediately: 44 points, 93m, **119
       snapped, 17 dropped, 5 blocked segments, SPINE CUT SHORT** on a 14-room
       dungeon. A straight line between two room centres crosses walls almost
       every time once a map has more than a corridor's worth of structure, and
       the segment validator then spent its whole budget rescuing a route that
       should never have been proposed.

       The map ALREADY SHIPS a validated walkable graph — this one had 716
       points and 1379 links — and I was ignoring it and drawing chords through
       the geometry instead. `navPath` returns a walkable polyline between two
       points; using it means the spine inherits the navmesh's correctness at
       BUILD time and still costs nothing at run time.
       The straight line survives only as a fallback for maps with no mesh. */
    const legPath=(a,b)=>{
      try{
        if(window.navPath){
          const p=navPath(a.x, a.z, b.x, b.z);
          if(p && p.length) return p;
        }
      }catch(e){ window.ahErr&&window.ahErr(e,'buildSpine:navPath'); }
      return null;
    };

    /* resample to a fixed step so "progress" is a real distance */
    const pts=[];""")

rep('resample',
"""    for(let i=0;i<anchors.length-1;i++){
      const a=anchors[i], b=anchors[i+1];
      const dist=Math.hypot(b.x-a.x, b.z-a.z);
      const n=Math.max(1, Math.round(dist/SPINE_CFG.step));
      for(let k=0;k<n;k++){
        const t=k/n;
        push(a.x+(b.x-a.x)*t, a.z+(b.z-a.z)*t);
      }
    }""",
"""    for(let i=0;i<anchors.length-1;i++){
      const a=anchors[i], b=anchors[i+1];
      /* the navmesh route for this leg, or the chord if the map has no mesh */
      const leg=legPath(a,b);
      const way = leg ? [a].concat(leg) : [a,b];
      if(leg) SPINE.legs++; else SPINE.chords++;
      for(let w=0;w<way.length-1;w++){
        const p=way[w], q=way[w+1];
        const dist=Math.hypot(q.x-p.x, q.z-p.z);
        const n=Math.max(1, Math.round(dist/SPINE_CFG.step));
        for(let k=0;k<n;k++){
          const t=k/n;
          push(p.x+(q.x-p.x)*t, p.z+(q.z-p.z)*t);
        }
      }
    }""")

rep('counters',
"""const SPINE = { pts:null, total:0, prog:0, built:0, rejected:0,
                blocked:0, detours:0, cut:false, map:null };""",
"""const SPINE = { pts:null, total:0, prog:0, built:0, rejected:0,
                blocked:0, detours:0, cut:false, map:null,
                legs:0, chords:0 };""")

rep('reset',
"""  SPINE.blocked=0; SPINE.detours=0; SPINE.cut=false;""",
"""  SPINE.blocked=0; SPINE.detours=0; SPINE.cut=false;
  SPINE.legs=0; SPINE.chords=0;""")

rep('log',
"""    try{ say('[spine] '+pts.length+' points, '+d.toFixed(0)+'m, '+
             SPINE.built+' snapped, '+SPINE.rejected+' dropped, '+
             SPINE.blocked+' blocked segments ('+SPINE.detours+' detoured)'+
             (SPINE.cut?' — SPINE CUT SHORT':'')); }catch(e){}""",
"""    try{ say('[spine] '+pts.length+' points, '+d.toFixed(0)+'m  |  '+
             SPINE.legs+' legs via navmesh, '+SPINE.chords+' straight  |  '+
             SPINE.built+' snapped, '+SPINE.rejected+' dropped, '+
             SPINE.blocked+' blocked ('+SPINE.detours+' detoured)'+
             (SPINE.cut?'  ⚠ CUT SHORT':'')); }catch(e){}""")

# ============================================ leak attribution
rep('leak',
"""window.ahLeak=function(){""",
"""/* ===========================================================================
   ⚠ LEAK ATTRIBUTION — because two rounds of fixes have not stopped it
   ---------------------------------------------------------------------------
   His reading: +41 geometries and +35 textures inside ONE rift, while the
   child count DROPPED from 209 to 171. So the growth is not "more objects on
   screen" — something is allocating and abandoning. I have guessed twice
   (v202 FX materials, v205 eviction) and both were real leaks that were not
   THIS leak.
   So stop guessing: walk the live scene and report WHAT the geometries and
   textures are attached to, by owner. The next F7 names the culprit instead of
   me reading code and hoping.
   ========================================================================= */
function leakCensus(){
  const byGeo={}, byTex={}, seenG=new Set(), seenT=new Set();
  const name=(o)=>{
    let n=o.name||'';
    if(!n && o.userData){ n=o.userData.kind||o.userData.role||o.userData.world||''; }
    if(!n) n=o.type||'?';
    if(o.isSprite) n='Sprite:'+n;
    return n;
  };
  const note=(bag,k)=>{ bag[k]=(bag[k]||0)+1; };
  try{
    scene.traverse(o=>{
      if(o.geometry && !seenG.has(o.geometry.uuid)){
        seenG.add(o.geometry.uuid); note(byGeo, name(o));
      }
      const mats=o.material ? (Array.isArray(o.material)?o.material:[o.material]) : [];
      mats.forEach(m=>{
        ['map','normalMap','alphaMap','emissiveMap','roughnessMap','aoMap']
          .forEach(slot=>{
            const t=m&&m[slot];
            if(t && t.uuid && !seenT.has(t.uuid)){ seenT.add(t.uuid); note(byTex, name(o)+'.'+slot); }
          });
      });
    });
  }catch(e){ window.ahErr&&window.ahErr(e,'leakCensus'); }
  const top=(bag,n)=>Object.keys(bag).sort((a,b)=>bag[b]-bag[a]).slice(0,n)
    .map(k=>k+' x'+bag[k]);
  return { geometries:seenG.size, textures:seenT.size,
           topGeo:top(byGeo,8), topTex:top(byTex,8) };
}
window.leakCensus=leakCensus;

window.ahLeak=function(){""")

rep('leak-print',
"""  try{ console.log(L.join(' ')); }catch(e){ window.ahErr&&window.ahErr(e,'ahLeak:print'); }""",
"""  try{ console.log(L.join(' ')); }catch(e){ window.ahErr&&window.ahErr(e,'ahLeak:print'); }
  /* ⚠ the attribution — which OWNERS hold the live geometry and textures.
     `renderer.info` counts them; this says whose they are. */
  try{
    const c=leakCensus();
    console.log('[leak] live in scene: '+c.geometries+' geometries, '+
                c.textures+' textures');
    console.log('[leak]   geometry owners: '+c.topGeo.join(', '));
    console.log('[leak]   texture owners:  '+c.topTex.join(', '));
  }catch(e){ window.ahErr&&window.ahErr(e,'ahLeak:census'); }""")

open('work.html','w',encoding='utf-8').write(src)
print('applied:', hits)
