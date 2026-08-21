// ⚠ THE EIGHT REGRESSIONS HE ASKED FOR, one block each, named as he named them.
const fs=require('fs'), vm=require('vm');
const src=fs.readFileSync('work.html','utf8');
const code=src.replace(/\/\*[\s\S]*?\*\//g,'');
const R={};
const T=1787356800;                        // 2026-08-21 00:00 UTC

function world(){
  const a=src.indexOf('const ContractClock = (function(){');
  const b=src.indexOf('const QUEST_DEFS = [');
  const store={};
  const sb={ console, Math, JSON, isFinite, Number, String, Array, Object,
    performance:{now:()=>0}, setInterval:()=>1,
    localStorage:{ getItem:(k)=>store[k]||null, setItem:(k,v)=>{store[k]=v;},
                   removeItem:(k)=>{delete store[k];} },
    navigator:{userAgent:'t'},
    S:{lvl:40, bestRiftTier:30, bestChallengeTier:18},
    RIFT:{tier:1}, toast:()=>{},
    grantCurrency:(id,n)=>{ sb.__paid.push([id,n]); },
    ahErr:(e,w)=>sb.__err.push(w) };
  sb.__err=[]; sb.__paid=[]; sb.__store=store; sb.window=sb;
  vm.createContext(sb);
  vm.runInContext(src.slice(a,b), sb, {filename:'c.js'});
  // ⚠ v267: the DEV BUILD auto-enables the synthetic clock at boot, so a fresh
  // sandbox arrives already trusted. That is the build flag, not a change to
  // the production rule — clear it to test the offline path this suite is for.
  sb.ContractClock && sb.ContractClock.__devClear();
  return sb;
}
function ready(t){ const w=world(); w.ContractClock.__devSet(t||T); w.contractsRefresh(); return w; }
function acceptThree(w){
  const o=w.contractCurrentOffers('daily');
  o.slice(0,3).forEach(x=>w.contractToggleSelect('daily',x.id));
  w.contractAcceptSelected('daily');
  return o;
}
const coins=(w)=>w.__paid.reduce((a,p)=>a+p[1],0);

// ---- 1. offer target and reward stay FROZEN --------------------------
{
  const w=ready();
  acceptThree(w);
  const snapshot=w.CONTRACTS.daily.map(c=>
    c.offer.id+'|'+c.offer.target+'|'+c.offer.reward.coin+'|'+c.offer.diffName+'|'+(c.offer.tier||0));
  // (a) progression improves
  w.S.bestRiftTier=90; w.S.bestChallengeTier=80;
  const afterProg=w.CONTRACTS.daily.map(c=>
    c.offer.id+'|'+c.offer.target+'|'+c.offer.reward.coin+'|'+c.offer.diffName+'|'+(c.offer.tier||0));
  // (b) ⚠ THE DEFINITION TABLE IS RETUNED UNDER HIM
  w.CONTRACT_FAMILIES.forEach(f=>{ const old=f.scale; f.scale=(d,s)=>old(d,s)*10; });
  w.CONTRACT_REWARDS.daily.coin=[99,99,99];
  const afterRetune=w.CONTRACTS.daily.map(c=>
    c.offer.id+'|'+c.offer.target+'|'+c.offer.reward.coin+'|'+c.offer.diffName+'|'+(c.offer.tier||0));
  // (c) and after a reload
  w.contractsSave();
  const w2=world(); w2.__store[w.CONTRACT_SAVE_KEY]=w.__store[w.CONTRACT_SAVE_KEY];
  w2.contractsLoad();
  const afterReload=w2.CONTRACTS.daily.map(c=>
    c.offer.id+'|'+c.offer.target+'|'+c.offer.reward.coin+'|'+c.offer.diffName+'|'+(c.offer.tier||0));
  R.t1={ base:snapshot.slice(0,2), afterReload:afterReload.slice(0,2) };
  R.frozenAcrossEverything =
       JSON.stringify(snapshot)===JSON.stringify(afterProg)
    && JSON.stringify(snapshot)===JSON.stringify(afterRetune)
    && JSON.stringify(snapshot)===JSON.stringify(afterReload);
}
// ---- 2. COMPLETE reward survives reset AND reload --------------------
{
  const w=ready();
  acceptThree(w);
  const c=w.CONTRACTS.daily[0];
  w.contractNote(c.offer.ev, c.offer.target, {tier:99});
  R.t2={ state:c.state, coin:c.offer.reward.coin };
  w.ContractClock.__devSet(T+86400);                 // reset
  R.t2.pendingAfterReset=(w.CONTRACTS.pending||[]).length;
  w.contractsSave();
  const w2=world(); w2.__store[w.CONTRACT_SAVE_KEY]=w.__store[w.CONTRACT_SAVE_KEY];
  w2.contractsLoad();
  R.t2.pendingAfterReload=(w2.CONTRACTS.pending||[]).length;
  R.t2.rewardIntact=(w2.CONTRACTS.pending[0]||{}).reward;
  R.completeSurvivesResetAndReload =
    R.t2.state==='COMPLETE' && R.t2.pendingAfterReset===1
    && R.t2.pendingAfterReload===1
    && R.t2.rewardIntact && R.t2.rewardIntact.coin===R.t2.coin;
}
// ---- 3. ⚠ PENDING CLAIMS EXACTLY ONCE --------------------------------
{
  const w=ready();
  acceptThree(w);
  const c=w.CONTRACTS.daily[0];
  w.contractNote(c.offer.ev, c.offer.target, {tier:99});
  w.ContractClock.__devSet(T+86400);
  const expect=(w.CONTRACTS.pending[0]||{}).reward.coin;
  const a=w.contractClaimPending();
  const b=w.contractClaimPending();          // double-click
  const cc=w.contractClaimPending();         // board reopened
  R.t3={ first:a, second:b.why, third:cc.why, paid:w.__paid.slice(), total:coins(w) };
  R.pendingPaysOnce = a.ok===true && b.ok===false && cc.ok===false
                   && w.__paid.length===1 && R.t3.total===expect;
  // and a direct claim is idempotent too
  const w2=ready();
  acceptThree(w2);
  const c2=w2.CONTRACTS.daily[0];
  w2.contractNote(c2.offer.ev, c2.offer.target, {tier:99});
  const x=w2.contractClaim('daily', c2.offer.id);
  const y=w2.contractClaim('daily', c2.offer.id);
  R.t3.direct={ first:x.ok, second:y.why, paid:w2.__paid.length };
  R.directClaimOnce = x.ok===true && y.ok===false && w2.__paid.length===1;
  // chapter claim as well
  const w3=world();
  ['kill','riftDone','elitePack','support','rune'].forEach((e,i)=>
    w3.journeyNote(e, [400,5,10,1,1][i]));
  const j1=w3.journeyClaim(), j2=w3.journeyClaim();
  R.t3.chapter={ first:j1.ok, second:j2.ok, paid:w3.__paid.length };
  R.chapterClaimOnce = j1.ok===true && j2.ok===false && w3.__paid.length===1;
}
// ---- 4. a character wipe clears/reconciles the contract save ---------
{
  const w=ready();
  acceptThree(w);
  w.journeyNote('kill', 100);
  w.contractsSave();
  R.t4={ before:!!w.__store[w.CONTRACT_SAVE_KEY], daily:w.CONTRACTS.daily.length };
  w.contractsWipe();
  R.t4.keyAfter=!!w.__store[w.CONTRACT_SAVE_KEY];
  R.t4.dailyAfter=w.CONTRACTS.daily.length;
  R.t4.journeyAfter=w.journeyProgress('c1_kill');
  R.t4.pendingAfter=(w.CONTRACTS.pending||[]).length;
  R.wipeClearsContracts = R.t4.before===true && R.t4.keyAfter===false
    && R.t4.dailyAfter===0 && R.t4.journeyAfter===0;
  // the real wipe path and the ?reset list both know the key
  R.t4.wireup = {
    wipeSaveCalls:/if\(window\.contractsWipe\) contractsWipe\(\)/.test(code),
    resetListHasKey:/'ashenHollowLightingLab_v1','ashenContracts_v1'/.test(code),
    oneKeyConstant:(code.match(/localStorage\.(setItem|getItem)\(CONTRACT_SAVE_KEY/g)||[]).length===2
  };
  R.wipeWiredUp = Object.values(R.t4.wireup).every(Boolean);
}
// ---- 5. five missed Daily periods generate only the current day ------
{
  const w=ready();
  acceptThree(w);
  const p0=w.CONTRACTS.dailyPeriod;
  w.ContractClock.__devSet(T+86400*5);
  R.t5={ period:w.CONTRACTS.dailyPeriod, expected:w.dailyPeriodId(T+86400*5),
         jump:w.CONTRACTS.dailyPeriod-p0,
         daily:w.CONTRACTS.daily.length,
         offers:w.contractCurrentOffers('daily').length,
         pending:(w.CONTRACTS.pending||[]).length };
  R.noBacklog = R.t5.period===R.t5.expected && R.t5.jump===5
             && R.t5.daily===0 && R.t5.offers===5 && R.t5.pending===0;
}
// ---- 6. ⚠ NO TRUSTED TIME: nothing selects, accepts, progresses ------
{
  const w=ready();                 // build state WITH time...
  acceptThree(w);
  const c=w.CONTRACTS.daily[0];
  const p0=w.CONTRACTS.dailyPeriod, prog0=c.progress;
  w.ContractClock.__devClear();    // ...then lose the clock
  const off=w.contractCurrentOffers('daily');
  const selr=w.contractToggleSelect('daily','anything');
  const accr=w.contractAcceptSelected('daily');
  w.contractNote(c.offer.ev, 50, {tier:99});
  const refr=w.contractsRefresh();
  R.t6={ offers:off.length, select:selr.why, accept:accr.why,
         progressMoved:c.progress-prog0, refresh:refr.why,
         periodUnchanged:w.CONTRACTS.dailyPeriod===p0,
         stillAccepted:w.CONTRACTS.daily.length };
  R.untrustedFreezesEverything =
       R.t6.offers===0 && R.t6.select==='no-trusted-time'
    && R.t6.accept==='no-trusted-time' && R.t6.progressMoved===0
    && R.t6.refresh==='no-trusted-time' && R.t6.periodUnchanged===true
    && R.t6.stillAccepted===3;         /* not expired either */
}
// ---- 7. the Journey continues without trusted time -------------------
{
  const w=world();                 // never given a clock at all
  R.t7={ trusted:w.ContractClock.isTrusted() };
  w.journeyNote('kill', 400); w.journeyNote('riftDone', 5);
  w.journeyNote('elitePack', 10); w.journeyNote('support', 1); w.journeyNote('rune', 1);
  R.t7.state=w.journeyState(0);
  const cl=w.journeyClaim();
  R.t7.claim=cl.ok; R.t7.chapter=w.CONTRACTS.journey.chapter;
  R.t7.paid=coins(w);
  R.journeyIgnoresClock = R.t7.trusted===false && R.t7.state==='COMPLETE'
    && cl.ok===true && R.t7.chapter===1 && R.t7.paid>0;
}
// ---- 8. all three progress together; completion opens nothing --------
{
  const w=ready();
  const offers=acceptThree(w);
  const rejected=offers.slice(3);
  // drive every accepted contract's own event
  w.CONTRACTS.daily.forEach(c=>w.contractNote(c.offer.ev, 1, {tier:99}));
  R.t8={ progress:w.CONTRACTS.daily.map(c=>c.progress),
         advanced:w.CONTRACTS.daily.filter(c=>c.progress>0).length };
  // complete one outright
  const c0=w.CONTRACTS.daily[0];
  w.contractNote(c0.offer.ev, c0.offer.target, {tier:99});
  R.t8.states=w.CONTRACTS.daily.map(c=>c.state);
  // ⚠ the rejected two must remain untakeable
  R.t8.selectRejected=w.contractToggleSelect('daily', rejected[0].id).why;
  R.t8.acceptAgain=w.contractAcceptSelected('daily').why;
  R.t8.count=w.CONTRACTS.daily.length;
  R.simultaneousAndSealed =
       R.t8.advanced===3
    && R.t8.states[0]==='COMPLETE'
    && R.t8.selectRejected==='locked' && R.t8.acceptAgain==='locked'
    && R.t8.count===3;
}
R.PASS = R.frozenAcrossEverything && R.completeSurvivesResetAndReload
      && R.pendingPaysOnce && R.directClaimOnce && R.chapterClaimOnce
      && R.wipeClearsContracts && R.wipeWiredUp && R.noBacklog
      && R.untrustedFreezesEverything && R.journeyIgnoresClock
      && R.simultaneousAndSealed;
console.log(JSON.stringify(R,null,1));
if(!R.PASS) process.exit(1);
