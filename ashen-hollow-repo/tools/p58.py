src = open('work.html', encoding='utf-8').read()
hits = {}
def rep(name, old, new, count=1):
    global src
    n = src.count(old)
    assert n == count, f"{name}: expected {count}, found {n}"
    src = src.replace(old, new); hits[name] = n

rep('module',
"""function autoAuthoredTravel(P){""",
"""/* ===========================================================================
   THE SPINE FOLLOWER  (v204) — parallel travel mode, behind a flag
   ---------------------------------------------------------------------------
   His proposal, and the reason for it: every navigation bug of the last dozen
   versions has been a RUNTIME pathfinding failure — a door node inside a wall,
   a snap that became a busy loop, a crossing that could not be made. A spine is
   verified ONCE, when the map is built, and thereafter a point on it is
   walkable by construction. There is nothing left to fail at runtime.

   The existing pathfinder is untouched: `SPINE_CFG.on = false` restores it
   exactly. This is an A/B, not a replacement.

   ⚠ HIS SAFEGUARD, AND IT IS THE IMPORTANT ONE: rejoining at the NEAREST point
   would occasionally put her BEHIND where she was after a fight that drifted
   backwards, producing small permanent backtracks. So the spine carries a
   cumulative distance and she rejoins at the nearest point AT OR AHEAD of her
   recorded progress (minus a small tolerance for genuine retreats). Progress
   only moves forward.
   ========================================================================= */
const SPINE_CFG = {
  on: true,           // ahSpine(false) reverts to the old pathfinder
  step: 2.2,          // metres between generated spine points
  lookahead: 3.2,     // how far along the spine she aims
  arrive: 1.6,        // counts as reached
  leash: 14,          // may leave the spine this far for combat/loot
  backTolerance: 3.0  // how far behind her progress a rejoin may land
};
window.SPINE_CFG = SPINE_CFG;
const SPINE = { pts:null, total:0, prog:0, built:0, rejected:0 };
window.SPINE = SPINE;

/* Build a polyline through the room sequence and VALIDATE EVERY POINT ONCE.
   Anything unwalkable is snapped here, at build time, where a failure costs a
   log line instead of a stalled run. */
function buildSpine(nav){
  SPINE.pts=null; SPINE.total=0; SPINE.prog=0; SPINE.built=0; SPINE.rejected=0;
  try{
    if(!nav || !nav.rooms || !nav.rooms.length) return 0;
    /* the room ORDER is the route: entry first, boss last. navRoute already
       knows the graph order; fall back to declaration order. */
    let rooms=nav.rooms;
    try{
      if(typeof navRoute==='function' && nav.bossRoom){
        const r=navRoute(nav, nav.rooms[0], nav.bossRoom);
        if(r && r.length>1) rooms=r;
      }
    }catch(e){ window.ahErr&&window.ahErr(e,'buildSpine:route'); }

    /* one anchor per room, plus the doorway between consecutive rooms so the
       line goes THROUGH thresholds rather than across walls */
    const anchors=[];
    for(let i=0;i<rooms.length;i++){
      const r=rooms[i];
      const n=(r.nodes&&r.nodes[0])||null;
      if(n) anchors.push({x:n.x, z:n.z});
      if(i+1<rooms.length){
        let d=null;
        try{ d=navDoorNode(nav, rooms[i+1].id, r.id); }catch(e){}
        if(d) anchors.push({x:d.x, z:d.z});
      }
    }
    if(anchors.length<2) return 0;

    /* resample to a fixed step so "progress" is a real distance */
    const pts=[];
    const push=(x,z)=>{
      let p={x:x, z:z};
      try{
        if(window.DEPTHS && DEPTHS.walkableAt && DEPTHS.walkableAt(x,z)===false){
          const fix=window.nearestStandable ? nearestStandable(x,z,7) : null;
          if(fix){ p={x:fix.x, z:fix.z}; SPINE.built++; }
          else { SPINE.rejected++; return; }   /* drop it; the line bridges the gap */
        }
      }catch(e){ window.ahErr&&window.ahErr(e,'buildSpine:validate'); }
      pts.push(p);
    };
    for(let i=0;i<anchors.length-1;i++){
      const a=anchors[i], b=anchors[i+1];
      const dist=Math.hypot(b.x-a.x, b.z-a.z);
      const n=Math.max(1, Math.round(dist/SPINE_CFG.step));
      for(let k=0;k<n;k++){
        const t=k/n;
        push(a.x+(b.x-a.x)*t, a.z+(b.z-a.z)*t);
      }
    }
    push(anchors[anchors.length-1].x, anchors[anchors.length-1].z);
    if(pts.length<2) return 0;

    /* cumulative distance — this is what "progress" means */
    let d=0; pts[0].d=0;
    for(let i=1;i<pts.length;i++){
      d+=Math.hypot(pts[i].x-pts[i-1].x, pts[i].z-pts[i-1].z);
      pts[i].d=d;
    }
    SPINE.pts=pts; SPINE.total=d;
    try{ say('[spine] '+pts.length+' points, '+d.toFixed(0)+'m, '+
             SPINE.built+' snapped, '+SPINE.rejected+' dropped'); }catch(e){}
    return pts.length;
  }catch(e){ window.ahErr&&window.ahErr(e,'buildSpine'); return 0; }
}
window.buildSpine=buildSpine;

/* Nearest spine point AT OR AHEAD of current progress. Falls back to the
   global nearest only when nothing ahead is within the leash — which happens
   when she has been dragged a long way backwards. */
function spineRejoin(P){
  const pts=SPINE.pts; if(!pts) return -1;
  const floor=SPINE.prog - SPINE_CFG.backTolerance;
  let best=-1, bestD=Infinity;
  for(let i=0;i<pts.length;i++){
    if(pts[i].d < floor) continue;
    const d=Math.hypot(pts[i].x-P.x, pts[i].z-P.z);
    if(d<bestD){ bestD=d; best=i; }
  }
  if(best>=0 && bestD<=SPINE_CFG.leash*1.6) return best;
  /* genuinely lost: take the nearest point anywhere, and let progress reset to
     it rather than pretending she is further along than she is */
  best=-1; bestD=Infinity;
  for(let i=0;i<pts.length;i++){
    const d=Math.hypot(pts[i].x-P.x, pts[i].z-P.z);
    if(d<bestD){ bestD=d; best=i; }
  }
  if(best>=0) AUTO.stats.spineLost=(AUTO.stats.spineLost||0)+1;
  return best;
}

/* Drive one tick along the spine. Returns true if it handled travel. */
function spineTravel(P){
  const pts=SPINE.pts;
  if(!pts || !pts.length) return false;
  const i=spineRejoin(P);
  if(i<0) return false;
  /* progress NEVER goes backwards */
  if(pts[i].d > SPINE.prog) SPINE.prog = pts[i].d;

  /* aim a little way further along than the rejoin point, so she cuts corners
     smoothly instead of stepping to each sample in turn */
  let j=i;
  while(j+1<pts.length && pts[j].d < SPINE.prog + SPINE_CFG.lookahead) j++;
  const tgt=pts[j];

  const dist=Math.hypot(tgt.x-P.x, tgt.z-P.z);
  if(dist < SPINE_CFG.arrive && j+1<pts.length){
    SPINE.prog = pts[j].d;
    AUTO.stats.spineSteps=(AUTO.stats.spineSteps||0)+1;
  }
  AUTO.state = RIFT.bossSpawned ? 'EXIT' : 'NEXT_ROOM';
  AUTO.nodeWhy='spine';
  AUTO.node={ x:tgt.x, z:tgt.z };
  AUTO.nodeSince=AUTO.nodeSince||performance.now()/1000;
  const [vx,vz]=feelerAdjust(tgt.x-P.x, tgt.z-P.z);
  MOVE.dvx=vx; MOVE.dvz=vz;
  AIM.until=0;
  return true;
}
window.spineTravel=spineTravel;
window.ahSpine=function(on){
  SPINE_CFG.on = (on===undefined) ? !SPINE_CFG.on : !!on;
  try{ toast('Spine travel '+(SPINE_CFG.on?'ON':'OFF (old pathfinder)')); }catch(e){}
  return SPINE_CFG.on;
};

function autoAuthoredTravel(P){
  /* ⚠ THE ONLY HOOK. Every travel decision passes through here, so the two
     modes swap cleanly and the old machinery below is left completely intact
     for the A/B. */
  if(SPINE_CFG.on && SPINE.pts && spineTravel(P)) return;""")

# build the spine when the dungeon's nav is built
rep('build-hook',
"""  const nav=navFromAuthored(d, floorPts);
  RIFT.nav=nav;""",
"""  const nav=navFromAuthored(d, floorPts);
  RIFT.nav=nav;
  /* validated once, here, where a bad point costs a log line and not a run */
  try{ if(window.buildSpine) buildSpine(nav); }catch(e){ window.ahErr&&window.ahErr(e,'buildSpine:hook'); }""")

rep('clear',
"""function clearRift(){""",
"""function clearRift(){
  try{ if(window.SPINE){ SPINE.pts=null; SPINE.prog=0; SPINE.total=0; } }catch(e){}""")

# ---- the A/B instrumentation: tag every run with the mode that produced it
rep('runlog',
"""      L.push('  town: auto-walk='""",
"""      L.push('  spine: '+(SPINE_CFG.on?'ON':'off')+
             (SPINE.pts ? ('  '+SPINE.pts.length+' pts, '+SPINE.total.toFixed(0)+'m'+
               '  progress '+SPINE.prog.toFixed(0)+'m ('+
               (SPINE.total?Math.round(SPINE.prog/SPINE.total*100):0)+'%)'+
               '  steps='+(AUTO.stats.spineSteps||0)+'  lost='+(AUTO.stats.spineLost||0))
              : '  (no spine built)'));
      L.push('  town: auto-walk='""")

open('work.html','w',encoding='utf-8').write(src)
print('applied:', hits)
