src = open('work.html', encoding='utf-8').read()
hits = {}
def rep(name, old, new, count=1):
    global src
    n = src.count(old)
    assert n == count, f"{name}: expected {count}, found {n}"
    src = src.replace(old, new); hits[name] = n

rep('recorder',
"""/* ---- the state machine -------------------------------------------------- */
function autoTick(dt){""",
"""/* ===========================================================================
   THE STAGGER RECORDER  —  automatic, and `ahStagger()`
   ---------------------------------------------------------------------------
   What we HAD: F8 is an instantaneous snapshot, and the run log gives a verdict
   at the end ("4583 stuck-recoveries, eff 0.05"). Both tell you THAT she
   staggered. Neither tells you WHERE, or between WHICH TWO POINTS, or what she
   was trying to reach at the time — so every diagnosis so far has been me
   reading code and guessing which branch produced it.

   This keeps a small ring of the last ~12 seconds of Auto decisions and, the
   moment the oscillation detector fires, dumps that window ONCE for that spot.
   The dump answers the actual question: the two positions she alternated
   between, the two targets she alternated between, and the `why` that issued
   them.

   ⚠ CHEAP AND SELF-LIMITING: 5Hz into a fixed 60-slot ring (no allocation
   after the first fill), and each distinct spot reports once — a stagger that
   lasts four minutes must not produce four minutes of console spam, which is
   what made the earlier logs unreadable.
   ========================================================================= */
const STAG = { ring:new Array(60), n:0, at:0, seen:new Set(), reports:[] };
function stagSample(P){
  try{
    const now=performance.now()/1000;
    if(now-STAG.at < 0.2) return;          /* 5Hz */
    STAG.at=now;
    const i=STAG.n++ % STAG.ring.length;
    const nd=AUTO.node;
    STAG.ring[i]={ t:+now.toFixed(2),
      x:+P.x.toFixed(1), z:+P.z.toFixed(1),
      nx:nd?+nd.x.toFixed(1):null, nz:nd?+nd.z.toFixed(1):null,
      why:AUTO.nodeWhy||'', state:AUTO.state||'', room:AUTO.roomId||'',
      goal:AUTO.goalId||'' };
  }catch(e){ window.ahErr&&window.ahErr(e,'stagSample'); }
}
/* the ring in chronological order */
function stagWindow(){
  const r=STAG.ring, n=Math.min(STAG.n, r.length);
  const out=[];
  for(let k=0;k<n;k++){
    const v=r[(STAG.n-n+k) % r.length];
    if(v) out.push(v);
  }
  return out;
}
function stagReport(reason){
  try{
    const w=stagWindow();
    if(w.length<6) return;
    const last=w[w.length-1];
    /* one report per SPOT, not per frame — 4m rounding keeps a wobble from
       registering as a new location every step */
    const key=Math.round(last.x/4)+','+Math.round(last.z/4)+'|'+(last.room||'');
    if(STAG.seen.has(key)) return;
    STAG.seen.add(key);

    /* what did she alternate BETWEEN? the two most common positions and the
       two most common targets in the window — that pair IS the stagger */
    const tally=(f)=>{
      const m=new Map();
      w.forEach(v=>{ const k=f(v); if(k!==null) m.set(k,(m.get(k)||0)+1); });
      return [...m.entries()].sort((a,b)=>b[1]-a[1]).slice(0,3);
    };
    const spots=tally(v=>v.x+','+v.z);
    const targets=tally(v=>v.nx===null?null:(v.nx+','+v.nz));
    const whys=tally(v=>v.why||null);
    const span=(w[w.length-1].t-w[0].t).toFixed(1);
    const net=Math.hypot(w[w.length-1].x-w[0].x, w[w.length-1].z-w[0].z).toFixed(1);
    let path=0;
    for(let i=1;i<w.length;i++) path+=Math.hypot(w[i].x-w[i-1].x, w[i].z-w[i-1].z);

    const rec={ reason:reason, map:(window.SPINE&&SPINE.map)||null,
      room:last.room, goal:last.goal, state:last.state,
      seconds:+span, walked:+path.toFixed(1), net:+net,
      spots:spots, targets:targets, whys:whys, window:w };
    STAG.reports.push(rec);
    if(STAG.reports.length>12) STAG.reports.shift();

    try{
      console.warn('[stagger] '+reason+'  room '+last.room+' -> goal '+last.goal+
        '  |  walked '+path.toFixed(1)+'m, net '+net+'m over '+span+'s');
      console.warn('   alternated between positions: '+
        spots.map(s=>s[0]+' x'+s[1]).join('   '));
      console.warn('   aiming at: '+
        (targets.length?targets.map(s=>s[0]+' x'+s[1]).join('   '):'no node'));
      console.warn('   issued by: '+
        (whys.length?whys.map(s=>s[0]+' x'+s[1]).join('   '):'-')+
        '   —  ahStagger() for the full window');
    }catch(e){}
  }catch(e){ window.ahErr&&window.ahErr(e,'stagReport'); }
}
window.ahStagger=function(i){
  if(!STAG.reports.length){ console.log('[stagger] nothing recorded — she has not staggered'); return []; }
  const r=(i===undefined) ? STAG.reports[STAG.reports.length-1] : STAG.reports[i];
  console.log('[stagger] report '+(i===undefined?STAG.reports.length-1:i)+
              ' of '+STAG.reports.length+':', r.reason,
              '| map', r.map, '| room', r.room, '-> goal', r.goal);
  try{ console.table(r.window); }catch(e){}
  return r;
};
window.ahStaggers=function(){
  console.log('[stagger] '+STAG.reports.length+' distinct spot(s) recorded');
  STAG.reports.forEach((r,i)=>console.log('  ['+i+'] '+r.reason+'  room '+r.room+
    '  walked '+r.walked+'m net '+r.net+'m  '+
    'aiming '+(r.targets[0]?r.targets[0][0]:'-')+'  ('+(r.whys[0]?r.whys[0][0]:'-')+')'));
  return STAG.reports;
};
window.ahStaggerReset=function(){ STAG.seen.clear(); STAG.reports.length=0; return 'cleared'; };

/* ---- the state machine -------------------------------------------------- */
function autoTick(dt){""")

# sample every tick, and fire the report where oscillation is already computed
rep('sample',
"""  if(now < AUTO.suspendUntil) return;               // manual takeover
  const P=player.position;""",
"""  if(now < AUTO.suspendUntil) return;               // manual takeover
  const P=player.position;
  stagSample(P);""")

open('work.html','w',encoding='utf-8').write(src)
print('applied:', hits)
