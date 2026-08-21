// the between-runs loop must complete NO MATTER WHAT the walk does
const fs=require('fs'), vm=require('vm');
const src=fs.readFileSync('work.html','utf8');
const R={};
const a=src.indexOf('const AUTO_TOWN = { walk:true');
const b=src.indexOf('window.autoNextRun=autoNextRun;');

function run(walkBehaviour){
  const log=[]; const timers=[];
  const sb={ console, AUTO:{stats:{}},
    depositAll:()=>log.push('bank'),
    toast:(m)=>log.push('toast:'+m),
    enterRift:()=>log.push('descend'),
    setTimeout:(fn,ms)=>{ timers.push({fn,ms}); return timers.length; },
    autoWalkToStation:(name, then)=>{
      log.push('walk:'+name);
      walkBehaviour(name, then, log);
    },
    autoWalkToPoint:()=>{}, heroPos:()=>({x:0,z:0}), TOWN_CENTRE:{x:0,z:0},
    ahErr:()=>{} };
  sb.window=sb; vm.createContext(sb);
  vm.runInContext(src.slice(a,b)+'\nthis.N=autoNextRun; this.T=AUTO_TOWN;', sb, {filename:'n.js'});
  sb.N(7);
  // fire every timer that was scheduled, in order, including ones added later
  for(let i=0;i<timers.length && i<20;i++) timers[i].fn();
  return { log, timerCount:timers.length };
}
// ---- 1. the walk SUCCEEDS -----------------------------------------------
R.walkWorks = run((n,then)=>then(true));
// ---- 2. the walk FAILS (calls back false) -------------------------------
R.walkFails = run((n,then)=>then(false));
// ---- 3. ⚠ THE WALK NEVER CALLS BACK AT ALL — the real stall -------------
R.walkNeverReturns = run(()=>{ /* silence */ });
// ---- 4. the walk THROWS --------------------------------------------------
R.walkThrows = run(()=>{ throw new Error('snagged on a crate'); });

const banked=(r)=>r.log.filter(x=>x==='bank').length;
const descended=(r)=>r.log.filter(x=>x==='descend').length;
R.summary = {
  walkWorks:        { bank:banked(R.walkWorks),        descend:descended(R.walkWorks) },
  walkFails:        { bank:banked(R.walkFails),        descend:descended(R.walkFails) },
  walkNeverReturns: { bank:banked(R.walkNeverReturns), descend:descended(R.walkNeverReturns) },
  walkThrows:       { bank:banked(R.walkThrows),       descend:descended(R.walkThrows) }
};
R.alwaysCompletes = Object.values(R.summary).every(s=>s.bank===1 && s.descend===1);
R.neverDoubles    = Object.values(R.summary).every(s=>s.bank<=1 && s.descend<=1);

// ---- 5. the stroll can be turned off entirely ---------------------------
{
  const log=[]; const timers=[];
  const sb={ console, AUTO:{stats:{}}, depositAll:()=>log.push('bank'),
    toast:()=>{}, enterRift:()=>log.push('descend'),
    setTimeout:(fn)=>{ timers.push(fn); }, autoWalkToStation:()=>log.push('WALKED'),
    ahErr:()=>{} };
  sb.window=sb; vm.createContext(sb);
  vm.runInContext(src.slice(a,b)+'\nthis.N=autoNextRun; this.T=AUTO_TOWN;', sb, {filename:'o.js'});
  sb.T.walk=false;
  sb.N(7);
  for(let i=0;i<timers.length && i<20;i++) timers[i]();
  R.walkOff = { log, noWalk:!log.includes('WALKED'),
                stillBanks:log.includes('bank'), stillDescends:log.includes('descend') };
}
// ---- 6. the retry ladder is GONE, not merely bypassed -------------------
R.ladderDeleted = { gateRetry:!/gateRetry/.test(src), viaCentre:!/viaCentre/.test(src),
                    gateWalkFailed:!/gateWalkFailed/.test(src) };
console.log(JSON.stringify(R.summary,null,1));
console.log('always completes:', R.alwaysCompletes, '| never doubles:', R.neverDoubles);
console.log('walk off:', R.walkOff);
console.log('retry ladder deleted:', R.ladderDeleted);
