const fs=require('fs'), vm=require('vm');
const src=fs.readFileSync('work.html','utf8');

const a=src.indexOf("const RUNLOG_KEY='ashenHollowRuns_v1';");
const b=src.indexOf("addEventListener('keydown',e=>{ if(e.key==='F4'");
const code=src.slice(a,b);

const store={};
const logs=[], warns=[], toasts=[];
let t=0;
const AUTO={ nodeAge:0, stats:{} };
const sb={
  console:{ log:m=>logs.push(m), warn:m=>warns.push(m), table:()=>{} },
  localStorage:{ getItem:k=>store[k]||null, setItem:(k,v)=>store[k]=v },
  performance:{ now:()=>t*1000 },
  Date,
  RIFT:{ tier:10 }, GR:{ active:false }, AUTO,
  MOVE:{ pinned:0 },
  toastRift:m=>toasts.push(m),
  JSON,
};
sb.window=sb; sb.window.AH_ERRS=new Map();
vm.createContext(sb);
vm.runInContext(code+'\nthis.OUT={runLogStart,runLogSample,runLogEnd,ahRuns:window.ahRuns,ahRunSummary:window.ahRunSummary,ahRunsReset:window.ahRunsReset};',
  sb, {filename:'runlog.js'});
const O=sb.OUT, R={};

// ---------- 1. a clean run says nothing out loud -------------------------
t=0; AUTO.stats={ unstuck:0, stuck:0, backtracks:0, roomChanges:5 };
O.runLogStart();
t=120; MOVE_set(0.1); for(let i=0;i<20;i++) O.runLogSample();
const clean=O.runLogEnd('Rift complete.');
R.cleanVerdict = clean.clean;
R.cleanSecs = clean.secs;
R.toastsAfterClean = toasts.length;                 // 0 — silence is the point
R.consoleSaysClean = /CLEAN/.test(logs[logs.length-1]);

function MOVE_set(v){ sb.MOVE.pinned=v; }

// ---------- 2. a stuck run is flagged and toasted ------------------------
t=200; AUTO.stats={ unstuck:2, stuck:1, backtracks:3, roomChanges:4 };
O.runLogStart();
// pinned crosses 1s twice with a real recovery between
t=210; MOVE_set(1.4); O.runLogSample(); O.runLogSample();
MOVE_set(0.05); O.runLogSample();
MOVE_set(2.2); O.runLogSample();
AUTO.nodeAge=14.5; O.runLogSample();
t=280;
const bad=O.runLogEnd('left');
R.badClean = bad.clean;                              // false
R.badFlags = bad.flags;
R.pinnedEvents = bad.pinnedEvents;                   // 2, not 4 samples
R.pinnedWorst = bad.pinnedWorst;                     // 2.2
R.nodeAgeWorst = bad.nodeAgeWorst;                   // 14.5
R.toastFired = toasts.length===1 && /flagged/i.test(toasts[0]);
R.warnFired = /FLAGGED/.test(warns[warns.length-1]);

// ---------- 3. it persists and summarises across runs --------------------
R.stored = JSON.parse(store['ashenHollowRuns_v1']).length;   // 2
R.summary = O.ahRunSummary();

// ---------- 4. closing twice cannot double-count -------------------------
const again=O.runLogEnd('left');
R.doubleCloseIsNull = again===null;
R.stillTwoStored = JSON.parse(store['ashenHollowRuns_v1']).length;

// ---------- 5. sampling with no open run is a no-op ----------------------
let threw=false;
try{ O.runLogSample(); }catch(e){ threw=true; }
R.sampleWithNoRunSafe = !threw;

// ---------- 6. the cap holds ---------------------------------------------
for(let i=0;i<60;i++){ AUTO.stats={unstuck:0,stuck:0,backtracks:0,roomChanges:1};
  O.runLogStart(); O.runLogEnd('x'); }
R.capped = JSON.parse(store['ashenHollowRuns_v1']).length;   // 50

// ---------- 7. the history verdict ---------------------------------------
logs.length=0;
O.ahRuns(5);
R.historyLine = logs[0];

console.log(JSON.stringify(R,null,1));
