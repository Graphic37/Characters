const fs=require('fs'), vm=require('vm');
const src=fs.readFileSync('work.html','utf8');

// the reporter, verbatim from the shipped file
const a=src.indexOf('window.AH_ERRS = new Map();');
const b=src.indexOf("addEventListener('keydown', e=>{ if(e.key==='F6'");
const code=src.slice(a,b);

const warns=[], logs=[];
const sb={
  console:{ warn:m=>warns.push(m), log:m=>logs.push(m), table:()=>{} },
  performance:{ now:()=>1234 }, Date,
};
sb.window=sb; vm.createContext(sb);
vm.runInContext(code+'\nthis.OUT={ahErr,ahErrors:window.ahErrors,ahErrSummary:window.ahErrSummary,ahErrorsReset:window.ahErrorsReset};',
  sb, {filename:'ahErr.js'});
const O=sb.OUT, R={};

// 1. a hot site logs ONCE and counts every time
for(let i=0;i<40000;i++) O.ahErr(new Error('boom'), 'frameLoop:9999');
R.warnsAfter40kHits = warns.length;                       // 1
R.countRecorded = sb.AH_ERRS.get('frameLoop:9999').n;     // 40000

// 2. distinct sites are distinct rows
O.ahErr(new Error('missing thing'), 'tryInteract:501');
O.ahErr(new Error('missing thing'), 'tryInteract:501');
O.ahErr(new Error('other'), 'drawStash:88');
R.sites = sb.AH_ERRS.size;                                // 3
R.warnsTotal = warns.length;                              // 3 — one per site

// 3. it never throws, whatever it is handed
let threw=false;
try{
  O.ahErr(null, 'nullCase');
  O.ahErr(undefined, undefined);
  O.ahErr({ get message(){ throw new Error('nasty getter'); } }, 'nastyGetter');
  const circular={}; circular.self=circular;
  O.ahErr(circular, 'circular');
}catch(e){ threw=true; R.threwWith=e.message; }
R.neverThrows = !threw;

// 4. the summary line names the worst offender
R.summary = O.ahErrSummary();

// 5. AH_LOUD rethrows on purpose
sb.AH_LOUD = true;
let loud=false;
try{ O.ahErr(new Error('should escape'), 'loudCase'); }catch(e){ loud = (e.message==='should escape'); }
R.loudRethrows = loud;
sb.AH_LOUD = false;

// 6. reset clears
O.ahErrorsReset();
R.afterReset = sb.AH_ERRS.size;
R.summaryAfterReset = O.ahErrSummary();

// 7. the first warning carries the message and a stack line
R.firstWarnHasMessage = /boom/.test(warns[0]);
R.firstWarnHasStack = /Error/.test(warns[0]) && warns[0].includes('|');
R.firstWarnHasTag = warns[0].includes('frameLoop:9999');

console.log(JSON.stringify(R,null,1));
