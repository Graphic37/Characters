// TEST CLOCK — a dev switch, not a hole in the trusted-time rule
const fs=require('fs'), vm=require('vm');
const src=fs.readFileSync('work.html','utf8');
const code=src.replace(/\/\*[\s\S]*?\*\//g,'');
const R={};

function world(){
  const a=src.indexOf('const ContractClock = (function(){');
  const b=src.indexOf('const QUEST_DEFS = [');
  const store={};
  let perf=0;
  const sb={ console:{log:()=>{},warn:()=>{},table:()=>{}}, Math, JSON,
    isFinite, Number, String, Array, Object, Date,
    performance:{now:()=>perf}, setInterval:()=>1,
    localStorage:{ getItem:(k)=>store[k]||null, setItem:(k,v)=>{store[k]=v;},
                   removeItem:(k)=>{delete store[k];} },
    navigator:{userAgent:'t'},
    S:{lvl:40, bestRiftTier:30, bestChallengeTier:18},
    RIFT:{tier:1}, toast:()=>{},
    grantCurrency:(id,n)=>sb.__paid.push([id,n]),
    document:{ getElementById:()=>null },
    ahErr:(e,w)=>sb.__err.push(w) };
  sb.__err=[]; sb.__paid=[]; sb.__store=store; sb.window=sb;
  sb.__setPerf=(v)=>{ perf=v; };
  vm.createContext(sb);
  vm.runInContext(src.slice(a,b), sb, {filename:'c.js'});
  // ⚠ v267: the DEV BUILD auto-enables the synthetic clock at boot, so a fresh
  // sandbox arrives already trusted. That is the build flag, not a change to
  // the production rule — clear it to test the offline path this suite is for.
  sb.ContractClock && sb.ContractClock.__devClear();
  return sb;
}

// ---- 1. ⚠ PRODUCTION RULE UNCHANGED ----------------------------------
{
  const w=world();
  R.production={ before:w.ContractClock.nowTrusted(),
                 source:w.ContractClock.source(),
                 offers:w.contractCurrentOffers('daily').length,
                 select:w.contractToggleSelect('daily','x').why };
  R.stillNullOffline = R.production.before===null && R.production.offers===0
    && R.production.select==='no-trusted-time';
  // ⚠ AND THE MOCK NEVER READS THE SYSTEM CLOCK
  const clock=src.slice(src.indexOf('const ContractClock'),
                        src.indexOf('window.ahContractAdvanceDay'));
  const bare=clock.replace(/\/\*[\s\S]*?\*\//g,'');
  R.noSystemClock = !/Date\.now\(\)/.test(bare)
    && !/new Date\(\)/.test(bare)
    && /const CONTRACT_TEST_EPOCH = \d+/.test(code);
  R.fixedEpoch = /CONTRACT_TEST_EPOCH = 1787356800/.test(code);
}
// ---- 2. turning it on makes Daily/Weekly behave normally --------------
{
  const w=world();
  const s=w.ahContractTestOnline(true);
  R.on={ status:s.testClock, source:s.source, utc:s.utc,
         daily:w.contractCurrentOffers('daily').length,
         weekly:w.contractCurrentOffers('weekly').length,
         dailyPeriod:s.dailyPeriod };
  // the whole normal flow works
  const o=w.contractCurrentOffers('daily');
  o.slice(0,3).forEach(x=>w.contractToggleSelect('daily',x.id));
  const acc=w.contractAcceptSelected('daily');
  R.on.accepted=acc.ok;
  R.behavesNormally = R.on.status===true && R.on.source==='dev'
    && R.on.daily===5 && R.on.weekly===3 && acc.ok===true;
}
// ---- 3. ⚠ TIME TRAVEL: accept, complete, advance a day, verify -------
{
  const w=world();
  w.ahContractTestOnline(true);
  const o=w.contractCurrentOffers('daily');
  o.slice(0,3).forEach(x=>w.contractToggleSelect('daily',x.id));
  w.contractAcceptSelected('daily');
  const c=w.CONTRACTS.daily[0];
  w.contractNote(c.offer.ev, c.offer.target, {tier:99});   // complete one
  const beforePeriod=w.CONTRACTS.dailyPeriod;
  const st=w.ahContractAdvanceDay();
  R.travel={ before:beforePeriod, after:st.dailyPeriod,
             accepted:st.acceptedDaily, pending:st.pending,
             offset:st.offsetSeconds,
             freshOffers:w.contractCurrentOffers('daily').length };
  R.dayTravelWorks = R.travel.after===R.travel.before+1
    && R.travel.accepted===0            /* expired */
    && R.travel.pending===1             /* the completed one survived */
    && R.travel.offset===86400
    && R.travel.freshOffers===5;
}
// ---- 4. ⚠ MONDAY WEEKLY ROLLOVER under the synthetic clock -----------
{
  const w=world();
  w.ahContractTestOnline(true);
  const w0=w.CONTRACTS.weeklyPeriod;
  const wo=w.contractCurrentOffers('weekly');
  w.contractToggleSelect('weekly', wo[0].id);
  w.contractAcceptSelected('weekly');
  R.weekly={ start:w0, acceptedBefore:w.CONTRACTS.weekly.length };
  // a day at a time until the week id moves — it must land on a Monday
  let steps=0, boundaryUtcDay=null;
  while(steps<9){
    w.ahContractAdvanceDay(); steps++;
    if(w.CONTRACTS.weeklyPeriod!==w0){
      boundaryUtcDay=new Date(w.ContractClock.nowTrusted()*1000).getUTCDay();
      break;
    }
  }
  R.weekly.stepsToRollover=steps;
  R.weekly.boundaryUtcDay=boundaryUtcDay;
  R.weekly.acceptedAfter=w.CONTRACTS.weekly.length;
  R.mondayRollover = boundaryUtcDay===1 && R.weekly.acceptedAfter===0;
  // and the week helper jumps a whole week in one call
  const w2=world(); w2.ahContractTestOnline(true);
  const p0=w2.CONTRACTS.weeklyPeriod;
  const s2=w2.ahContractAdvanceWeek();
  R.weekly.oneCall={ from:p0, to:s2.weeklyPeriod, offset:s2.offsetSeconds };
  R.weekHelperWorks = s2.weeklyPeriod===p0+1 && s2.offsetSeconds===604800;
}
// ---- 5. countdowns come from the synthetic clock ---------------------
{
  const w=world();
  w.ahContractTestOnline(true);
  const a=w.ahContractTestStatus();
  w.ahContractAdvance(3600);
  const b=w.ahContractTestStatus();
  R.countdown={ dailyBefore:a.dailyResetsIn, dailyAfter:b.dailyResetsIn,
                weeklyBefore:a.weeklyResetsIn, weeklyAfter:b.weeklyResetsIn };
  R.countdownsTick = R.countdown.dailyAfter===R.countdown.dailyBefore-3600
                  && R.countdown.weeklyAfter===R.countdown.weeklyBefore-3600;
}
// ---- 6. ⚠ OFF RETURNS TO REAL BEHAVIOUR IMMEDIATELY ------------------
{
  const w=world();
  w.ahContractTestOnline(true);
  w.ahContractAdvanceDay();
  const before=w.ContractClock.nowTrusted();
  w.ahContractTestOnline(false);
  R.off={ now:w.ContractClock.nowTrusted(), source:w.ContractClock.source(),
          offers:w.contractCurrentOffers('daily').length,
          select:w.contractToggleSelect('daily','x').why,
          refresh:w.contractsRefresh().why,
          hadTime:before!==null };
  R.offIsImmediate = R.off.now===null && R.off.source===null
    && R.off.offers===0 && R.off.select==='no-trusted-time'
    && R.off.refresh==='no-trusted-time';
  // ⚠ advancing is refused when off, and cannot nudge a steam clock
  R.off.advanceWhenOff=w.ahContractAdvance(86400);
  w.ContractClock.setTrusted(1787356800,'steam');
  const steamBefore=w.ContractClock.nowTrusted();
  const nudged=w.ContractClock.__advance(86400);
  R.off.steamNudge={ allowed:nudged, moved:w.ContractClock.nowTrusted()-steamBefore };
  R.cannotNudgeSteam = R.off.advanceWhenOff===null
    && nudged===false && R.off.steamNudge.moved===0;
}
// ---- 7. ⚠ NOT PERSISTED ACROSS A RESTART -----------------------------
{
  const w=world();
  w.ahContractTestOnline(true);
  const o=w.contractCurrentOffers('daily');
  o.slice(0,3).forEach(x=>w.contractToggleSelect('daily',x.id));
  w.contractAcceptSelected('daily');
  w.contractsSave();
  const raw=w.__store[w.CONTRACT_SAVE_KEY];
  R.persist={ savedKeys:Object.keys(w.__store),
              saveMentionsClock:/testClock|devClock|CONTRACT_TEST_EPOCH|offset/i.test(raw) };
  // a "restart": brand new world, same storage
  const w2=world(); w2.__store[w2.CONTRACT_SAVE_KEY]=raw;
  w2.contractsLoad();
  R.persist.afterRestart={ source:w2.ContractClock.source(),
                           now:w2.ContractClock.nowTrusted(),
                           contractsLoaded:w2.CONTRACTS.daily.length };
  // ⚠ the switch is OFF, but the contract SAVE survived
  R.switchNotPersisted = R.persist.afterRestart.source===null
    && R.persist.afterRestart.now===null
    && R.persist.saveMentionsClock===false
    && R.persist.afterRestart.contractsLoaded===3;
}
// ---- 8. the UI marks it, and never says ONLINE ----------------------
R.ui={
  badgeSaysTest:/'<span class="cbTestTag">TEST CLOCK<\/span>'/.test(code),
  bannerSaysSimulated:/SIMULATED TIME &mdash; not Steam server time/.test(code),
  neverSaysOnline:!/>ONLINE</.test(code),
  disableButton:/data-testoff="1"/.test(code),
  devBar:/function buildClockBar\(\)/.test(code),
  devBarWired:/try\{ buildClockBar\(\); \}catch/.test(code),
  // ⚠ v267: the bar became ONE toggle, so it calls
  // `ahContractTestOnline(source!=='dev')` rather than a literal `true`.
  // What matters is that it still routes through the public helper.
  barUsesSameApi:/ahContractTestOnline\(ContractClock\.source\(\)!=='dev'\)/.test(
    code.slice(code.indexOf('function buildClockBar'), code.indexOf('function updateClockBar')))
};
R.uiMarked = Object.values(R.ui).every(Boolean);
// ---- 9. one API downstream — no separate test logic ------------------
{
  const body=code.slice(code.indexOf('function contractsRefresh'),
                        code.indexOf('function contractsSave'));
  R.oneApi = !/testClock|TEST_EPOCH|__devSet|__advance/.test(body)
          && /ContractClock\.nowTrusted\(\)/.test(body);
}
R.PASS = R.stillNullOffline && R.noSystemClock && R.fixedEpoch
      && R.behavesNormally && R.dayTravelWorks && R.mondayRollover
      && R.weekHelperWorks && R.countdownsTick && R.offIsImmediate
      && R.cannotNudgeSteam && R.switchNotPersisted && R.uiMarked && R.oneApi;
console.log(JSON.stringify(R,null,1));
if(!R.PASS) process.exit(1);
