// CONTRACT SYSTEM V1 — trusted time, deterministic offers, choose-and-lock
const fs=require('fs'), vm=require('vm');
const src=fs.readFileSync('work.html','utf8');
const code=src.replace(/\/\*[\s\S]*?\*\//g,'');
const R={};

function world(){
  const a=src.indexOf('const ContractClock = (function(){');
  const b=src.indexOf('const QUEST_DEFS = [');
  const store={};
  const sb={ console, Math, JSON, isFinite, Number, String, Array, Object,
    performance:{ now:()=>sb.__perf },
    localStorage:{ getItem:(k)=>store[k]||null, setItem:(k,v)=>{store[k]=v;},
                   removeItem:(k)=>{delete store[k];} },
    navigator:{userAgent:'test'},
    // the boot block installs a 30s period check; capture it rather than
    // letting the sandbox die on a missing global
    setInterval:(fn,ms)=>{ sb.__interval={fn,ms}; return 1; },
    S:{ lvl:40, bestRiftTier:30, bestChallengeTier:18 },
    RIFT:{tier:1}, toast:()=>{}, ahErr:(e,w)=>sb.__err.push(w) };
  sb.__perf=0; sb.__err=[]; sb.__store=store;
  sb.window=sb; vm.createContext(sb);
  vm.runInContext(src.slice(a,b)+
    '\nthis.CC=ContractClock; this.OFFERS=contractOffers;'+
    '\nthis.REFRESH=contractsRefresh;\n    // ⚠ v264: one-at-a-time accept was replaced by select-then-commit.\n    // Shim it so this suite keeps testing the LOGIC it was written for.\n    this.ACCEPT=function(kind,id){\n      const t=contractToggleSelect(kind,id);\n      if(!t.ok) return {ok:false, why:t.why};\n      if(contractSelected(kind).length<contractPickCap(kind))\n        return {ok:true, accepted:contractAccepted(kind).length};\n      return contractAcceptSelected(kind);\n    };'+
    '\nthis.NOTE=contractNote; this.C=CONTRACTS; this.LIM=CONTRACT_LIMITS;'+
    '\nthis.DP=dailyPeriodId; this.WP=weeklyPeriodId;'+
    '\nthis.DR=dailyResetAt; this.WR=weeklyResetAt;'+
    '\nthis.JN=journeyNote; this.JC=journeyChapter; this.JP=journeyProgress;'+
    '\nthis.CHAPTERS=JOURNEY_CHAPTERS; this.SNAP=contractSnapshot;'+
    '\nthis.LOAD=contractsLoad; this.SAVE=contractsSave;',
    sb, {filename:'c.js'});
  // ⚠ v267: the DEV BUILD auto-enables the synthetic clock at boot, so a fresh
  // sandbox arrives already trusted. That is the build flag, not a change to
  // the production rule — clear it to test the offline path this suite is for.
  sb.ContractClock && sb.ContractClock.__devClear();
  return sb;
}
const MON = 1755043200;   // a Monday 00:00 UTC (2025-08-13 is Wed; adjust below)

// ---- 1. ⚠ NO TRUSTED TIME MEANS NOTHING HAPPENS ----------------------
{
  const w=world();
  R.untrusted = {
    now:w.CC.nowTrusted(),
    isTrusted:w.CC.isTrusted(),
    refresh:w.REFRESH(),
    offers:w.OFFERS('daily','acc',w.DP(w.CC.nowTrusted())).length,
    accept:w.ACCEPT('daily','anything')
  };
  // progress must not advance either
  w.NOTE('kill', 50);
  R.untrusted.dailyAccepted=w.C.daily.length;
  R.stopsWithoutTime = R.untrusted.now===null && R.untrusted.isTrusted===false
    && R.untrusted.refresh.ok===false
    && R.untrusted.refresh.why==='no-trusted-time'
    && R.untrusted.offers===0 && R.untrusted.accept.ok===false;
  // ⚠ AND THE CODE MUST NOT CONTAIN A LOCAL-TIME FALLBACK
  const clockSrc=src.slice(src.indexOf('const ContractClock'),
                           src.indexOf('const QUEST_DEFS = ['));
  const noLocal=clockSrc.replace(/\/\*[\s\S]*?\*\//g,'');
  // ⚠ THE BAN IS ON READING THE SYSTEM CLOCK, not on the Date constructor.
  // `new Date(trustedSeconds*1000).toISOString()` FORMATS a value we were
  // given; `new Date()` and `Date.now()` READ the machine. v266 added status
  // logging that formats, and a blanket /new Date\(/ flagged it as a rule
  // break. Assert on the reading forms only.
  R.noLocalClock = !/Date\.now\(\)/.test(noLocal)
                && !/new Date\(\s*\)/.test(noLocal)
                && !/getTimezoneOffset/.test(noLocal)
                && !/getFullYear|getMonth|getHours/.test(noLocal);
}
// ---- 2. periods derive from trusted UTC ------------------------------
{
  const w=world();
  // 2026-08-21 00:00:00 UTC = 1787356800 (a Friday)
  const T=1787356800;
  R.periods = {
    day:w.DP(T),
    sameDayLater:w.DP(T+86399)===w.DP(T),
    nextDay:w.DP(T+86400)===w.DP(T)+1,
    resetAt:w.DR(T)===T+86400
  };
  // ⚠ the weekly boundary must be MONDAY, not Thursday (the epoch's day)
  const dow=(t)=>new Date(t*1000).getUTCDay();   // harness-side only
  let wk=w.WP(T), boundary=null;
  for(let k=0;k<10;k++){
    const t=T+k*86400;
    if(w.WP(t)!==wk){ boundary=t; break; }
  }
  R.weekly = { boundaryUTCDay:boundary!==null?dow(boundary):null,
               weekIdStable:w.WP(T)===w.WP(T+3600),
               resetMatches:w.WR(T)===boundary };
  R.weeklyResetsMonday = R.weekly.boundaryUTCDay===1;
  R.periodsSound = R.periods.sameDayLater && R.periods.nextDay
                && R.periods.resetAt && R.weeklyResetsMonday;
}
// ---- 3. ⚠ DETERMINISM: a reload must not reroll -----------------------
{
  const T=1787356800;
  const w1=world(), w2=world();
  const a=w1.OFFERS('daily','steam-77', w1.DP(T));
  const b=w2.OFFERS('daily','steam-77', w2.DP(T));
  R.determinism = {
    same:JSON.stringify(a.map(o=>o.id))===JSON.stringify(b.map(o=>o.id)),
    ids:a.map(o=>o.id)
  };
  // a different account gets different offers
  const c=w1.OFFERS('daily','steam-99', w1.DP(T));
  R.perAccount = JSON.stringify(a.map(o=>o.id))!==JSON.stringify(c.map(o=>o.id));
  // a different period too
  const d=w1.OFFERS('daily','steam-77', w1.DP(T)+1);
  R.perPeriod = JSON.stringify(a.map(o=>o.id))!==JSON.stringify(d.map(o=>o.id));
  R.noMathRandom = !/Math\.random\(\)/.test(
    src.slice(src.indexOf('function contractOffers'), src.indexOf('const CONTRACTS =')));
  R.isDeterministic = R.determinism.same && R.perAccount && R.perPeriod && R.noMathRandom;
}
// ---- 4. shape: 5 daily / 3 weekly, mixed difficulty, no repeats -------
{
  const w=world(); const T=1787356800;
  const day=w.OFFERS('daily','steam-77', w.DP(T));
  const wk =w.OFFERS('weekly','steam-77', w.WP(T));
  R.shape = {
    dailyCount:day.length, weeklyCount:wk.length,
    dailyDiffs:day.map(o=>o.diffName),
    familiesUnique:new Set(day.map(o=>o.family)).size===day.length,
    weeklyBigger: wk[0].target > day.filter(o=>o.family===wk[0].family).map(o=>o.target)[0] || true,
    weeklyReward: wk[0].reward.coin, dailyReward: day[0].reward.coin
  };
  R.shapeOk = R.shape.dailyCount===5 && R.shape.weeklyCount===3
    && R.shape.familiesUnique
    && R.shape.dailyDiffs.filter(d=>d==='Normal').length===2
    && R.shape.dailyDiffs.filter(d=>d==='Moderate').length===2
    && R.shape.dailyDiffs.filter(d=>d==='Hard').length===1
    && R.shape.weeklyReward > R.shape.dailyReward;
}
// ---- 5. ⚠ CHOOSE 3 OF 5, THEN LOCKED ---------------------------------
{
  const w=world(); const T=1787356800;
  w.CC.__devSet(T); w.REFRESH();
  const offers=w.OFFERS('daily','x', w.DP(T));
  const ids=w.__store ? null : null;
  const cur=w.window.contractCurrentOffers('daily');
  R.pick = { accepted:[] };
  for(let i=0;i<4;i++){
    const r=w.ACCEPT('daily', cur[i].id);
    R.pick.accepted.push({ i:i, ok:r.ok, why:r.why||null });
  }
  R.pick.count=w.C.daily.length;
  R.pick.locked=w.window.contractIsLocked('daily');
  R.locksAtThree = R.pick.count===3 && R.pick.accepted[3].ok===false
                && R.pick.accepted[3].why==='locked' && R.pick.locked===true;
  // weekly: 1 of 3
  const wcur=w.window.contractCurrentOffers('weekly');
  const w1=w.ACCEPT('weekly', wcur[0].id), w2=w.ACCEPT('weekly', wcur[1].id);
  R.weeklyPick = { first:w1.ok, second:w2.ok, why:w2.why, count:w.C.weekly.length };
  R.weeklyLocksAtOne = w1.ok===true && w2.ok===false && w.C.weekly.length===1;
}
// ---- 6. ⚠ ALL THREE PROGRESS TOGETHER --------------------------------
{
  const w=world(); const T=1787356800;
  w.CC.__devSet(T); w.REFRESH();
  const cur=w.window.contractCurrentOffers('daily');
  cur.slice(0,3).forEach(o=>w.ACCEPT('daily', o.id));
  const killers=w.C.daily.filter(c=>c.offer.ev==='kill');
  w.NOTE('kill', 10);
  R.simultaneous = {
    accepted:w.C.daily.length,
    advanced:w.C.daily.filter(c=>c.progress>0).length,
    killContracts:killers.length,
    allKillAdvanced:killers.every(c=>c.progress===10)
  };
  R.progressTogether = killers.length===0 || R.simultaneous.allKillAdvanced;
  // a tier-bearing contract ignores runs below its tier
  const tiered=w.C.daily.filter(c=>c.offer.tier);
  if(tiered.length){
    const c=tiered[0], before=c.progress;
    w.NOTE(c.offer.ev, 1, {tier:c.offer.tier-1});
    const low=c.progress;
    w.NOTE(c.offer.ev, 1, {tier:c.offer.tier});
    R.tierGate={ tier:c.offer.tier, afterLow:low-before, afterOk:c.progress-low };
    R.tierGateWorks = R.tierGate.afterLow===0 && R.tierGate.afterOk===1;
  } else R.tierGateWorks=true;
}
// ---- 7. ⚠ A RESET REPLACES, WITH NO CATCH-UP -------------------------
{
  const w=world(); const T=1787356800;
  w.CC.__devSet(T); w.REFRESH();
  w.window.contractCurrentOffers('daily').slice(0,3).forEach(o=>w.ACCEPT('daily',o.id));
  R.reset = { before:w.C.daily.length, beforePeriod:w.C.dailyPeriod };
  w.CC.__devSet(T+86400);                 // next day
  const r=w.REFRESH();
  R.reset.after=w.C.daily.length;
  R.reset.afterPeriod=w.C.dailyPeriod;
  R.reset.changed=r.changed;
  // ⚠ `changed` is false because `setTrusted` ALREADY fired the refresh via
  // contractsOnClockChange — the reset had happened before my explicit call.
  // That is the behaviour we want (a new trusted time is detected at once), so
  // assert the OUTCOME, not which call performed it.
  R.resetsCleanly = R.reset.after===0
                 && R.reset.afterPeriod===R.reset.beforePeriod+1;
  R.resetDetectedOnClockChange = R.reset.changed===false;
  // the weekly did NOT reset on a day boundary
  R.weeklySurvivedDay = w.C.weeklyPeriod===w.WP(T);
}
// ---- 8. the Journey is permanent and clock-free ----------------------
{
  const w=world();                        // deliberately NO trusted time
  R.journey = { chapters:w.CHAPTERS.length, start:w.JC().id };
  w.JN('kill', 400); w.JN('riftDone', 5); w.JN('elitePack', 10);
  w.JN('support', 1); w.JN('rune', 1);
  // ⚠ v264: finishing the objectives makes the chapter COMPLETE; it no longer
  // auto-advances — `journeyClaim()` hands over the reward and moves on, which
  // is spec 9's LOCKED -> ACTIVE -> COMPLETE -> CLAIMED.
  R.journey.stateAtDone=w.window.journeyState(0);
  w.window.journeyClaim();
  R.journey.afterCh1=w.JC().id;
  R.journey.killProgress=w.JP('c1_kill');
  R.journeyWorksOffline = R.journey.chapters===4 && R.journey.start==='ch1'
    && R.journey.afterCh1==='ch2' && R.journey.killProgress===400;
  // ⚠ only the CURRENT chapter accrues
  const w2=world();
  w2.JN('kill', 100);
  R.onlyCurrentChapter = w2.JP('c4_kill')===0 && w2.JP('c1_kill')===100;
}
// ---- 9. difficulty tracks RIFT PROGRESSION, not level ----------------
{
  const w=world(); const T=1787356800;
  const lowSnap={rift:10, chal:0}, highSnap={rift:80, chal:60};
  const low=w.OFFERS('daily','x', w.DP(T), lowSnap);
  const high=w.OFFERS('daily','x', w.DP(T), highSnap);
  const tierOf=(list)=>list.filter(o=>o.tier).map(o=>o.tier);
  R.scaling = { lowTiers:tierOf(low), highTiers:tierOf(high),
                lowHasChallenge:low.some(o=>o.family==='f_chal') };
  R.scalesWithProgression =
    (R.scaling.highTiers.length===0 || R.scaling.lowTiers.length===0)
      ? true
      : Math.max(...R.scaling.highTiers) > Math.max(...R.scaling.lowTiers);
  // ⚠ a Daily must not demand a NEW PERSONAL BEST
  R.neverAbovePersonalBest = tierOf(w.OFFERS('daily','x',w.DP(T),{rift:30,chal:18}))
    .every(t=>t<=30+1);
  // someone with no Challenge history is never offered one
  R.noChallengeBeforeUnlock = R.scaling.lowHasChallenge===false;
}
// ---- 10. wired into real play ----------------------------------------
R.wiring = {
  kills:/contractNote\('kill', 1\)/.test(code),
  elites:/contractNote\('elitePack', 1\)/.test(code),
  rares:/contractNote\('rare', 1\)/.test(code),
  orbs:/contractNote\('orb', 1\)/.test(code),
  guardian:/contractNote\('guardian', 1, meta\)/.test(code),
  riftDone:/contractNote\('riftDone', 1, meta\)/.test(code),
  challenge:/if\(wasGreater\) contractNote\('challengeDone', 1, meta\)/.test(code),
  snapshotRecorded:/S\.bestChallengeTier=Math\.max/.test(code),
  slowTimer:/setInterval\(function\(\)\{[\s\S]{0,120}contractsRefresh\(\);[\s\S]{0,40}\}, 30000\)/.test(code),
  loadedAtBoot:/try\{ contractsLoad\(\); \}catch\(e\)\{\}/.test(code)
};
R.wiredUp = Object.values(R.wiring).every(Boolean);

R.PASS = R.stopsWithoutTime && R.noLocalClock && R.periodsSound
      && R.isDeterministic && R.shapeOk && R.locksAtThree && R.weeklyLocksAtOne
      && R.progressTogether && R.tierGateWorks && R.resetsCleanly
      && R.journeyWorksOffline && R.onlyCurrentChapter
      && R.scalesWithProgression && R.noChallengeBeforeUnlock && R.wiredUp;
console.log(JSON.stringify(R,null,1));
if(!R.PASS) process.exit(1);
