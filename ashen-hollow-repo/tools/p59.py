src = open('work.html', encoding='utf-8').read()
hits = {}
def rep(name, old, new, count=1):
    global src
    n = src.count(old)
    assert n == count, f"{name}: expected {count}, found {n}"
    src = src.replace(old, new); hits[name] = n

# ============================================ 1. HIS CATCH: THE EVICTION PATH
# ⚠ `fxAdd`'s CAP eviction disposed GEOMETRY ONLY. Under load — which is exactly
# when the cap is hit — every evicted effect leaked its material clone. His
# tension was real: caching the bases fixed creation, not lifecycle.
rep('evict',
"""function fxAdd(obj, life, fn){
  if(FX.length>=FX_CAP){
    const old=FX.shift();
    if(old){ riftRoot.remove(old.o); if(old.o.geometry) old.o.geometry.dispose(); }
  }""",
"""function fxAdd(obj, life, fn){
  if(FX.length>=FX_CAP){
    const old=FX.shift();
    /* ⚠ THIS DISPOSED GEOMETRY ONLY AND LEAKED THE MATERIAL CLONE — and it is
       the path taken UNDER LOAD, when the cap is hit, which is precisely when
       a leak matters. It also disposed sprite geometry, which is SHARED
       (v151). `ahFree` knows both rules, so the eviction path uses the same
       function as the expiry path instead of a second hand-written one. */
    if(old){
      riftRoot.remove(old.o);
      if(window.ahFree) ahFree(old.o);
      else if(old.o.geometry && !old.o.isSprite) old.o.geometry.dispose();
    }
  }""")

# fxTrail hands back a sprite nobody owns — make that impossible rather than
# leaving a factory that leaks if it is ever called
rep('trail',
"""function fxTrail(target, colour, width){
  const m=new THREE.Sprite(fxSpriteMat(colour, .55));
  m.scale.set(width||0.5, width||0.5, 1);
  return m;
}""",
"""/* ⚠ NO CALLERS TODAY, AND IT WAS BUILT TO LEAK: it returned a sprite carrying
   a material clone without registering it with FX, so nothing would ever have
   freed it. Routed through fxAdd so the lifecycle owns it the moment it exists;
   a future caller cannot reintroduce the leak by forgetting to. */
function fxTrail(target, colour, width, life){
  const m=new THREE.Sprite(fxSpriteMat(colour, .55));
  m.scale.set(width||0.5, width||0.5, 1);
  if(target && target.position) m.position.copy(target.position);
  return fxAdd(m, life||0.35, (o,k)=>{
    if(target && target.position && !target.dead) o.position.copy(target.position);
    o.material.opacity=0.55*(1-k);
  });
}""")

# ============================================ 2. HIS CATCH: SEGMENT VALIDATION
rep('segments',
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
    if(pts.length<2) return 0;

    /* ⚠⚠ HIS CATCH, AND IT IS THE ONE THAT MATTERED: TWO WALKABLE ENDPOINTS DO
       NOT MAKE A WALKABLE SEGMENT. Validating points alone was not enough, and
       my own "hopeless points drop and the line bridges the gap" was the
       hazard in plain sight — dropping a point widens its neighbours' gap and
       the straight line between them can cross the very wall the point was
       dropped for. That would have rebuilt, by construction, exactly the
       wall-crossing path the spine exists to eliminate.

       So every SEGMENT is walked at 0.5m and checked. A blocked segment is
       first re-routed by inserting a detour point beside the midpoint; if no
       detour is standable the segment is CUT and the spine ends there, because
       a short honest spine is safer than a long one with a wall in it. */
    const solid=(x,z)=>{
      try{ return !!(window.DEPTHS && DEPTHS.walkableAt &&
                     DEPTHS.walkableAt(x,z)===false); }catch(e){ return false; }
    };
    const segClear=(a,b)=>{
      const d=Math.hypot(b.x-a.x, b.z-a.z);
      const n=Math.max(1, Math.ceil(d/0.5));
      for(let k=1;k<n;k++){
        const t=k/n;
        if(solid(a.x+(b.x-a.x)*t, a.z+(b.z-a.z)*t)) return false;
      }
      return true;
    };
    const clean=[pts[0]];
    for(let i=1;i<pts.length;i++){
      const a=clean[clean.length-1], b=pts[i];
      if(segClear(a,b)){ clean.push(b); continue; }
      SPINE.blocked++;
      /* try a detour beside the midpoint — perpendicular offsets, nearest first */
      const mx=(a.x+b.x)/2, mz=(a.z+b.z)/2;
      const dx=b.x-a.x, dz=b.z-a.z, len=Math.hypot(dx,dz)||1;
      const px=-dz/len, pz=dx/len;
      let fixed=null;
      for(let off=1.5; off<=6 && !fixed; off+=1.5){
        for(const s of [1,-1]){
          const cx=mx+px*off*s, cz=mz+pz*off*s;
          if(solid(cx,cz)) continue;
          if(segClear(a,{x:cx,z:cz}) && segClear({x:cx,z:cz}, b)){
            fixed={x:cx, z:cz}; break;
          }
        }
      }
      if(fixed){ clean.push(fixed); clean.push(b); SPINE.detours++; }
      else {
        /* ⚠ CUT, DO NOT BRIDGE. Everything past an unroutable segment is
           unreachable along this line, and pretending otherwise is what the
           old pathfinder did. */
        SPINE.cut=true;
        break;
      }
    }
    pts.length=0; Array.prototype.push.apply(pts, clean);
    if(pts.length<2) return 0;""")

rep('counters',
"""const SPINE = { pts:null, total:0, prog:0, built:0, rejected:0 };""",
"""const SPINE = { pts:null, total:0, prog:0, built:0, rejected:0,
                blocked:0, detours:0, cut:false };""")

rep('reset',
"""  SPINE.pts=null; SPINE.total=0; SPINE.prog=0; SPINE.built=0; SPINE.rejected=0;""",
"""  SPINE.pts=null; SPINE.total=0; SPINE.prog=0; SPINE.built=0; SPINE.rejected=0;
  SPINE.blocked=0; SPINE.detours=0; SPINE.cut=false;""")

rep('log',
"""    try{ say('[spine] '+pts.length+' points, '+d.toFixed(0)+'m, '+
             SPINE.built+' snapped, '+SPINE.rejected+' dropped'); }catch(e){}""",
"""    try{ say('[spine] '+pts.length+' points, '+d.toFixed(0)+'m, '+
             SPINE.built+' snapped, '+SPINE.rejected+' dropped, '+
             SPINE.blocked+' blocked segments ('+SPINE.detours+' detoured)'+
             (SPINE.cut?' — SPINE CUT SHORT':'')); }catch(e){}""")

# ============================================ 3. VARIANCE IN THE A/B
rep('variance',
"""      const pct=Math.round(b.clean/b.n*100);
      console.log('   '+m.padEnd(6)+' '+String(b.n).padStart(3)+' runs  '+
        String(pct).padStart(3)+'% clean  avg '+(b.secs/b.n).toFixed(0)+'s  '+
        'unstuck '+b.unstuck+'  backtracks '+b.back+'  stalls '+b.stall+
        (m==='spine'?('  lost '+b.lost):'')+
        (b.n<10?'   (too few runs to trust)':''));""",
"""      const pct=Math.round(b.clean/b.n*100);
      /* ⚠ VARIANCE, NOT JUST THE MEAN — his point, and the right one for a
         5-minute Challenge timer: 180s average with an occasional 290 is worse
         than a reliable 200. p90 and max are what a timer actually cares
         about. */
      const ts=b.times.slice().sort((x,y)=>x-y);
      const p90=ts.length?ts[Math.min(ts.length-1, Math.floor(ts.length*0.9))]:0;
      const mean=b.secs/b.n;
      const sd=ts.length>1
        ? Math.sqrt(ts.reduce((s,t)=>s+(t-mean)*(t-mean),0)/(ts.length-1)) : 0;
      console.log('   '+m.padEnd(6)+' '+String(b.n).padStart(3)+' runs  '+
        String(pct).padStart(3)+'% clean  avg '+mean.toFixed(0)+'s'+
        '  p90 '+p90.toFixed(0)+'s  max '+(ts[ts.length-1]||0).toFixed(0)+'s'+
        '  sd '+sd.toFixed(0)+'s  '+
        'unstuck '+b.unstuck+'  backtracks '+b.back+'  stalls '+b.stall+
        (m==='spine'?('  lost '+b.lost):'')+
        (b.n<10?'   (too few runs to trust)':''));""")

rep('times',
"""    const b=byMode[m]||(byMode[m]={n:0,clean:0,secs:0,unstuck:0,back:0,stall:0,lost:0});
    b.n++; if(r.clean) b.clean++;""",
"""    const b=byMode[m]||(byMode[m]={n:0,clean:0,secs:0,unstuck:0,back:0,stall:0,lost:0,times:[]});
    b.n++; if(r.clean) b.clean++;
    b.times.push(r.secs||0);""")

open('work.html','w',encoding='utf-8').write(src)
print('applied:', hits)
