src = open('work.html', encoding='utf-8').read()
hits = {}
def rep(name, old, new, count=1):
    global src
    n = src.count(old)
    assert n == count, f"{name}: expected {count}, found {n}"
    src = src.replace(old, new); hits[name] = n

# name the map at the call site — buildSpine cannot see `d`
rep('hook',
"""  try{ if(window.buildSpine) buildSpine(nav); }catch(e){ window.ahErr&&window.ahErr(e,'buildSpine:hook'); }""",
"""  try{ if(window.buildSpine) buildSpine(nav, (d&&d.name)||'unnamed'); }
  catch(e){ window.ahErr&&window.ahErr(e,'buildSpine:hook'); }""")

rep('sig',
"""function buildSpine(nav){""",
"""/* ===========================================================================
   PER-MAP SPINE HEALTH  (v206)
   ---------------------------------------------------------------------------
   His point, and it is the right instinct: if ONE map repeatedly needs cuts,
   the ROUTE is wrong, not Auto. Without attributing cuts to a map name that
   distinction is invisible — every stall just looks like another Auto bug, and
   I would go on patching the follower for a problem in the dungeon.

   Persisted, because the interesting map is the one that fails on run 30 and
   not on run 1. Keyed by name, so a map that is fine 40 times and cut twice
   reads differently from one cut every time.
   ========================================================================= */
const SPINE_MAPS_KEY='ashenSpineMaps_v1';
function spineMapsLoad(){
  try{ return JSON.parse(localStorage.getItem(SPINE_MAPS_KEY)||'{}')||{}; }
  catch(e){ return {}; }
}
function spineMapsSave(m){
  try{ localStorage.setItem(SPINE_MAPS_KEY, JSON.stringify(m)); }
  catch(e){ window.ahErr&&window.ahErr(e,'spineMapsSave'); }
}
function spineNoteMap(name){
  try{
    const m=spineMapsLoad();
    const r=m[name]||(m[name]={builds:0, blocked:0, detours:0, cuts:0,
                               pts:0, metres:0, snapped:0, dropped:0});
    r.builds++;
    r.blocked+=SPINE.blocked; r.detours+=SPINE.detours;
    if(SPINE.cut) r.cuts++;
    r.snapped+=SPINE.built; r.dropped+=SPINE.rejected;
    r.pts=(SPINE.pts||[]).length; r.metres=Math.round(SPINE.total);
    spineMapsSave(m);
  }catch(e){ window.ahErr&&window.ahErr(e,'spineNoteMap'); }
}
/* the table: worst offenders first, because that is the only ordering that
   answers "which map should I look at" */
window.ahSpineMaps=function(){
  const m=spineMapsLoad();
  const keys=Object.keys(m);
  if(!keys.length){ console.log('[spine] no maps recorded yet'); return {}; }
  keys.sort((a,b)=>{
    const A=m[a], B=m[b];
    return (B.cuts/B.builds)-(A.cuts/A.builds) || (B.blocked/B.builds)-(A.blocked/A.builds);
  });
  console.log('[spine] route health per map — CUTS are the ones to investigate');
  keys.forEach(k=>{
    const r=m[k];
    const cutPct=Math.round(r.cuts/r.builds*100);
    console.log('  '+k.padEnd(30)+
      String(r.builds).padStart(3)+' builds  '+
      'cut '+String(r.cuts).padStart(3)+' ('+String(cutPct).padStart(3)+'%)  '+
      'blocked/build '+(r.blocked/r.builds).toFixed(1)+'  '+
      'detours/build '+(r.detours/r.builds).toFixed(1)+'  '+
      r.pts+' pts / '+r.metres+'m'+
      (cutPct>=25 ? '   <-- THE ROUTE, NOT AUTO' : ''));
  });
  try{ console.table(m); }catch(e){}
  return m;
};
window.ahSpineMapsReset=function(){ spineMapsSave({}); return 'spine map log cleared'; };

function buildSpine(nav, mapName){""")

rep('note',
"""    try{ say('[spine] '+pts.length+' points, '+d.toFixed(0)+'m, '+
             SPINE.built+' snapped, '+SPINE.rejected+' dropped, '+
             SPINE.blocked+' blocked segments ('+SPINE.detours+' detoured)'+
             (SPINE.cut?' — SPINE CUT SHORT':'')); }catch(e){}
    return pts.length;""",
"""    SPINE.map=mapName||'unnamed';
    try{ say('[spine] '+pts.length+' points, '+d.toFixed(0)+'m, '+
             SPINE.built+' snapped, '+SPINE.rejected+' dropped, '+
             SPINE.blocked+' blocked segments ('+SPINE.detours+' detoured)'+
             (SPINE.cut?' — SPINE CUT SHORT':'')); }catch(e){}
    spineNoteMap(SPINE.map);
    return pts.length;""")

# a cut spine is a property of the RUN too — it explains a bad completion time
rep('run',
"""      spineLost:(AUTO.stats&&AUTO.stats.spineLost)||0,""",
"""      spineLost:(AUTO.stats&&AUTO.stats.spineLost)||0,
      /* a cut spine explains a slow or incomplete run; without it on the record
         the A/B would blame the follower for a bad route */
      spineCut:!!(window.SPINE && SPINE.cut),
      spineDetours:(window.SPINE && SPINE.detours)||0,
      map:(window.SPINE && SPINE.map)||null,""")

# and surface it where he is already looking
rep('f8',
"""      L.push('  spine: '+(SPINE_CFG.on?'ON':'off')+""",
"""      if(SPINE_CFG.on && SPINE.pts)
        L.push('  spine route: '+(SPINE.map||'?')+
               '  blocked='+SPINE.blocked+'  detours='+SPINE.detours+
               (SPINE.cut?'  ⚠ CUT SHORT — the route, not Auto':''));
      L.push('  spine: '+(SPINE_CFG.on?'ON':'off')+""")

rep('field',
"""const SPINE = { pts:null, total:0, prog:0, built:0, rejected:0,
                blocked:0, detours:0, cut:false };""",
"""const SPINE = { pts:null, total:0, prog:0, built:0, rejected:0,
                blocked:0, detours:0, cut:false, map:null };""")

open('work.html','w',encoding='utf-8').write(src)
print('applied:', hits)
