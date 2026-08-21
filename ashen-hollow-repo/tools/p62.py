src = open('work.html', encoding='utf-8').read()
hits = {}
def rep(name, old, new, count=1):
    global src
    n = src.count(old)
    assert n == count, f"{name}: expected {count}, found {n}"
    src = src.replace(old, new); hits[name] = n

rep('navpath',
"""    for(let i=0;i<anchors.length-1;i++){
      const a=anchors[i], b=anchors[i+1];
      const dist=Math.hypot(b.x-a.x, b.z-a.z);
      const n=Math.max(1, Math.round(dist/SPINE_CFG.step));
      for(let k=0;k<n;k++){
        const t=k/n;
        push(a.x+(b.x-a.x)*t, a.z+(b.z-a.z)*t);
      }
    }
    push(anchors[anchors.length-1].x, anchors[anchors.length-1].z);
    if(pts.length<2) return 0;""",
"""    /* THE ROOT ERROR, AND HIS LOG EXPOSED IT: I INTERPOLATED STRAIGHT LINES
       BETWEEN ROOM CENTRES. Rooms connect through corridors, not through the
       stone between them, so on a 14-room map most interpolated points landed
       inside geometry: "119 snapped, 17 dropped, 5 blocked segments, SPINE CUT
       SHORT". The snapping and the segment checks were doing heroic work on a
       route that was already wrong before either of them ran.

       The map ships a walkable graph -- 716 points, 1379 links -- and navPath
       walks it. Following THAT between anchors gives a line walkable BY
       CONSTRUCTION, which is the entire premise of the spine. The straight-line
       fill survives only as a fallback for a map with no mesh. */
    const legPoints=(a,b)=>{
      let route=null;
      try{ if(typeof navPath==='function') route=navPath(a.x,a.z,b.x,b.z); }
      catch(e){ window.ahErr&&window.ahErr(e,'buildSpine:navPath'); }
      if(route && route.length) return [a].concat(route);
      SPINE.noMesh++;
      return [a,b];
    };
    const emitLeg=(leg)=>{
      for(let i=0;i<leg.length-1;i++){
        const p=leg[i], q=leg[i+1];
        const d=Math.hypot(q.x-p.x, q.z-p.z);
        const n=Math.max(1, Math.round(d/SPINE_CFG.step));
        for(let k=0;k<n;k++){
          const t=k/n;
          push(p.x+(q.x-p.x)*t, p.z+(q.z-p.z)*t);
        }
      }
    };
    for(let i=0;i<anchors.length-1;i++) emitLeg(legPoints(anchors[i], anchors[i+1]));
    push(anchors[anchors.length-1].x, anchors[anchors.length-1].z);
    if(pts.length<2) return 0;""")

rep('counter',
"""                blocked:0, detours:0, cut:false, map:null };""",
"""                blocked:0, detours:0, cut:false, map:null, noMesh:0,
                handedOff:false };""")

rep('reset',
"""  SPINE.blocked=0; SPINE.detours=0; SPINE.cut=false;""",
"""  SPINE.blocked=0; SPINE.detours=0; SPINE.cut=false; SPINE.noMesh=0;
  SPINE.handedOff=false;""")

rep('fallback',
"""function spineTravel(P){
  const pts=SPINE.pts;
  if(!pts || !pts.length) return false;""",
"""function spineTravel(P){
  const pts=SPINE.pts;
  if(!pts || !pts.length) return false;
  /* A CUT SPINE STOPS IN THE MIDDLE OF THE MAP. Following it to the end and
     then standing there is exactly the stall he hit on his first run. Once she
     reaches the end of a cut spine, hand back to the old pathfinder for the
     rest of the run rather than pretending the route is complete. */
  if(SPINE.cut && SPINE.prog >= SPINE.total - SPINE_CFG.arrive*2){
    if(!SPINE.handedOff){
      SPINE.handedOff=true;
      AUTO.stats.spineHandoff=(AUTO.stats.spineHandoff||0)+1;
      try{ say('[spine] end of a cut spine -- handing back to nav'); }catch(e){}
    }
    return false;
  }""")

open('work.html','w',encoding='utf-8').write(src)
print('applied:', hits)
