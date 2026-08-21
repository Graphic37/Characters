src = open('work.html', encoding='utf-8').read()
hits = {}
def rep(name, old, new, count=1):
    global src
    n = src.count(old)
    assert n == count, f"{name}: expected {count}, found {n}"
    src = src.replace(old, new); hits[name] = n

# =========================================================== 1. THE RUN LOG
rep('runlog',
"""function exitToTown(reason){""",
"""/* ===========================================================================
   THE RUN LOG — the F8 reading, taken by the game instead of by him  (v153)
   ---------------------------------------------------------------------------
   The open question was "does Auto ever get stuck on a real map", and the
   answer needed a human to press F8 at the right moment during a run. That is
   the wrong shape for an idle game: he plays it unattended, which is precisely
   when nobody is watching the diagnostic.

   Every counter this needs was ALREADY being kept and reset per run
   (`AUTO.stats`: unstuck, stuck, backtracks, runStall, runRescue, spawnFix,
   slides, escapes). Nothing read them. So the run now reads itself: a record
   is opened on entry, closed on the way back to town, judged, and kept.

   TWO deliberate choices:
   - A CLEAN RUN SAYS NOTHING. A toast after every rift is noise he would learn
     to ignore, which is how a diagnostic dies. It speaks only when a run is
     flagged, and the console keeps one line either way.
   - PERSISTED. The interesting failure is the one at 3am on run 180, long
     after the console has scrolled. Fifty runs are kept in localStorage.
   ========================================================================= */
const RUNLOG_KEY='ashenHollowRuns_v1';
const RUNLOG_MAX=50;
let RUN_OPEN=null;
function runLogLoad(){
  try{ return JSON.parse(localStorage.getItem(RUNLOG_KEY)||'[]')||[]; }
  catch(e){ window.ahErr&&window.ahErr(e,'runLogLoad'); return []; }
}
function runLogSave(list){
  try{ localStorage.setItem(RUNLOG_KEY, JSON.stringify(list.slice(-RUNLOG_MAX))); }
  catch(e){ window.ahErr&&window.ahErr(e,'runLogSave'); }
}
function caughtTotal(){
  let n=0;
  try{ if(window.AH_ERRS) window.AH_ERRS.forEach(r=>{ n+=r.n; }); }
  catch(e){ window.ahErr&&window.ahErr(e,'caughtTotal'); }
  return n;
}
function runLogStart(){
  RUN_OPEN={
    tier:RIFT.tier, greater:!!GR.active, t0:performance.now()/1000,
    errBase:caughtTotal(),
    pinnedEvents:0, pinnedWorst:0, nodeAgeWorst:0, _pinLatch:false,
    effWorst:1, samples:0
  };
}
/* one cheap sample per Auto tick: the two things no counter records */
function runLogSample(){
  const R=RUN_OPEN; if(!R) return;
  R.samples++;
  try{
    const p=(typeof MOVE!=='undefined') ? (MOVE.pinned||0) : 0;
    if(p>R.pinnedWorst) R.pinnedWorst=p;
    /* an EVENT, not a frame count: pinned crossing a second is one incident,
       and it re-arms only after she is properly moving again */
    if(p>1.0 && !R._pinLatch){ R.pinnedEvents++; R._pinLatch=true; }
    else if(p<0.2) R._pinLatch=false;
    const a=AUTO.nodeAge||0;
    if(a>R.nodeAgeWorst) R.nodeAgeWorst=a;
    const e=AUTO.stats.efficiency;
    if(e!==undefined && AUTO.stats.pathLen>1.5 && e<R.effWorst) R.effWorst=e;
  }catch(err){ window.ahErr&&window.ahErr(err,'runLogSample'); }
}
function runLogEnd(reason){
  const R=RUN_OPEN; if(!R) return null;
  RUN_OPEN=null;
  let rec=null;
  try{
    const s=AUTO.stats||{};
    rec={
      when:Date.now(), tier:R.tier, greater:R.greater,
      secs:+(performance.now()/1000 - R.t0).toFixed(1),
      reason:reason||'left',
      unstuck:s.unstuck||0, stuck:s.stuck||0, backtracks:s.backtracks||0,
      runStall:s.runStall||0, runRescue:s.runRescue||0, spawnFix:s.spawnFix||0,
      rooms:s.roomChanges||0, slides:s.slides||0, escapes:s.escapes||0,
      pinnedEvents:R.pinnedEvents, pinnedWorst:+R.pinnedWorst.toFixed(2),
      nodeAgeWorst:+R.nodeAgeWorst.toFixed(1), effWorst:+R.effWorst.toFixed(2),
      caught:caughtTotal()-R.errBase
    };
    /* THE VERDICT IS THE AGREED TARGET, written down: zero unstick events and
       zero backtracks on a real map. The rest are supporting evidence. */
    const flags=[];
    if(rec.unstuck) flags.push(rec.unstuck+' unstick');
    if(rec.backtracks) flags.push(rec.backtracks+' backtrack');
    if(rec.stuck) flags.push(rec.stuck+' stuck-recovery');
    if(rec.runStall) flags.push(rec.runStall+' run stall');
    if(rec.pinnedEvents) flags.push(rec.pinnedEvents+' pinned');
    if(rec.nodeAgeWorst>10) flags.push('node held '+rec.nodeAgeWorst+'s');
    if(rec.effWorst<0.3) flags.push('oscillated (eff '+rec.effWorst+')');
    rec.flags=flags;
    rec.clean=flags.length===0;
    const list=runLogLoad(); list.push(rec); runLogSave(list);
    const head='[run] T'+rec.tier+(rec.greater?'g':'')+'  '+rec.secs+'s  '+
               rec.rooms+' rooms  '+rec.reason;
    if(rec.clean){
      try{ console.log(head+'  — CLEAN (0 unstick, 0 backtracks)'); }
      catch(e){ window.ahErr&&window.ahErr(e,'runLogEnd:cleanlog'); }
    } else {
      try{ console.warn(head+'  — FLAGGED: '+flags.join(', ')); }
      catch(e){ window.ahErr&&window.ahErr(e,'runLogEnd:flaglog'); }
      try{ toastRift('Auto run flagged: '+flags.join(', ')); }
      catch(e){ window.ahErr&&window.ahErr(e,'runLogEnd:toast'); }
    }
  }catch(err){ window.ahErr&&window.ahErr(err,'runLogEnd'); }
  return rec;
}
window.runLogEnd=runLogEnd;
window.runLogSample=runLogSample;

/* the history, and the verdict over ALL of it — which is the actual answer to
   "does Auto get stuck", rather than one run's luck */
window.ahRuns=function(n){
  const list=runLogLoad();
  if(!list.length){ console.log('[runs] no completed runs recorded yet'); return []; }
  const show=list.slice(-(n||20));
  const clean=list.filter(r=>r.clean).length;
  console.log('[runs] '+clean+' of '+list.length+' clean ('+
    Math.round(clean/list.length*100)+'%)  —  target is 100%');
  show.forEach(r=>console.log('  T'+r.tier+(r.greater?'g':'')+'  '+String(r.secs).padStart(6)+'s  '+
    String(r.rooms).padStart(2)+' rooms  '+(r.clean?'clean':'FLAGGED: '+r.flags.join(', '))));
  const worst={};
  list.forEach(r=>(r.flags||[]).forEach(f=>{ const k=f.replace(/^\\d+\\s*/,''); worst[k]=(worst[k]||0)+1; }));
  const keys=Object.keys(worst).sort((a,b)=>worst[b]-worst[a]);
  if(keys.length) console.log('  most common flag: '+keys.map(k=>k+' x'+worst[k]).join(', '));
  try{ console.table(show); }catch(e){ window.ahErr&&window.ahErr(e,'ahRuns:table'); }
  return show;
};
window.ahRunsReset=function(){ runLogSave([]); return 'run log cleared'; };
/* one line for F8 */
window.ahRunSummary=function(){
  const list=runLogLoad();
  if(!list.length) return 'runs: none recorded yet';
  const clean=list.filter(r=>r.clean).length;
  const last=list[list.length-1];
  return 'runs: '+clean+'/'+list.length+' clean — last T'+last.tier+' '+
         (last.clean?'clean':'FLAGGED: '+last.flags.join(', '));
};
addEventListener('keydown',e=>{ if(e.key==='F4'){ e.preventDefault(); window.ahRuns(); } });

function exitToTown(reason){
  /* close the run BEFORE the state is torn down, or every counter reads zero */
  try{ runLogEnd(reason); }catch(e){ window.ahErr&&window.ahErr(e,'exitToTown:runLogEnd'); }""")

# =========================================================== 2. OPEN THE RECORD
rep('runlog-start',
"""    AUTO.stats.unstuck=0; AUTO.stats.collidePasses=0;
  }""",
"""    AUTO.stats.unstuck=0; AUTO.stats.collidePasses=0;
    AUTO.stats.stuck=0; AUTO.stats.runStall=0; AUTO.stats.runRescue=0;
    AUTO.stats.slides=0; AUTO.stats.escapes=0; AUTO.stats.spawnFix=0;
    /* a run left open (a reload mid-rift) must not be attributed to this one */
    try{ runLogEnd('abandoned'); }catch(e){ window.ahErr&&window.ahErr(e,'enterRift:runLogEnd'); }
    try{ runLogStart(); }catch(e){ window.ahErr&&window.ahErr(e,'enterRift:runLogStart'); }
  }""")

# =========================================================== 3. SAMPLE IT
rep('runlog-sample',
"""  AUTO.lastPos={x:P.x, z:P.z};""",
"""  AUTO.lastPos={x:P.x, z:P.z};
  if(window.runLogSample) window.runLogSample();""")

# =========================================================== 4. F8 CARRIES IT
rep('f8-runs',
"""  try{ if(window.ahErrSummary) L.push(window.ahErrSummary()); }""",
"""  try{ if(window.ahRunSummary) L.push(window.ahRunSummary()); }
  catch(e){ window.ahErr&&window.ahErr(e,'ahStatus:runSummary'); }
  try{ if(window.ahErrSummary) L.push(window.ahErrSummary()); }""")

# =========================================================== 5. HELP ROW
rep('help-row',
"""          row('Caught-error table', K('F6'));""",
"""          row('Caught-error table', K('F6'));
          row('Auto run history', K('F4'));""")

open('work.html','w',encoding='utf-8').write(src)
print('applied:', hits)
