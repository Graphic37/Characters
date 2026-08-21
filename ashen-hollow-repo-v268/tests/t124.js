// CONTRACT SYSTEM — the tail: states, selection, rewards, reset, save, UI
const fs=require('fs'), vm=require('vm');
const {JSDOM}=require('jsdom');
const src=fs.readFileSync('work.html','utf8');
const code=src.replace(/\/\*[\s\S]*?\*\//g,'');
const R={};
const T=1787356800;                       // 2026-08-21 00:00 UTC

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
  vm.runInContext(src.slice(a,b)+'\nthis.W=this;', sb, {filename:'c.js'});
  return sb;
}
function ready(){ const w=world(); w.ContractClock.__devSet(T); w.contractsRefresh(); return w; }

// ---- 9. selection then acceptance ------------------------------------
{
  const w=ready();
  const offers=w.contractCurrentOffers('daily');
  R.sel={ offers:offers.length };
  R.sel.canAcceptAt0=w.contractCanAccept('daily');
  w.contractToggleSelect('daily', offers[0].id);
  w.contractToggleSelect('daily', offers[1].id);
  R.sel.canAcceptAt2=w.contractCanAccept('daily');
  w.contractToggleSelect('daily', offers[2].id);
  R.sel.canAcceptAt3=w.contractCanAccept('daily');
  // ⚠ deselect is free before acceptance
  w.contractToggleSelect('daily', offers[2].id);
  R.sel.afterDeselect=w.contractSelected('daily').length;
  // a fourth selection is refused
  w.contractToggleSelect('daily', offers[2].id);
  const fourth=w.contractToggleSelect('daily', offers[3].id);
  R.sel.fourth=fourth.why;
  const acc=w.contractAcceptSelected('daily');
  R.sel.accepted=acc.ok; R.sel.locked=w.contractIsLocked('daily');
  R.sel.states=w.CONTRACTS.daily.map(c=>c.state);
  R.selectionFlow = R.sel.canAcceptAt0===false && R.sel.canAcceptAt2===false
    && R.sel.canAcceptAt3===true && R.sel.afterDeselect===2
    && R.sel.fourth==='full' && R.sel.accepted===true && R.sel.locked===true
    && R.sel.states.every(s=>s==='ACCEPTED');
  // ⚠ completing one does NOT open a fourth slot
  const c=w.CONTRACTS.daily[0];
  w.contractNote(c.offer.ev, c.offer.target, {tier:99});
  R.sel.afterComplete=w.CONTRACTS.daily[0].state;
  R.sel.stillLocked=w.contractIsLocked('daily');
  R.noFourthSlot = R.sel.afterComplete==='COMPLETE' && R.sel.stillLocked===true;
}
// ---- 10. ⚠ REQUIREMENTS FREEZE FOR THE PERIOD ------------------------
{
  const w=ready();
  const before=w.contractCurrentOffers('daily').map(o=>o.target+':'+(o.tier||0));
  // he clears T50 mid-period
  w.S.bestRiftTier=50; w.S.bestChallengeTier=45;
  const after=w.contractCurrentOffers('daily').map(o=>o.target+':'+(o.tier||0));
  R.freeze={ before:before.slice(0,3), after:after.slice(0,3) };
  R.requirementsFrozen = JSON.stringify(before)===JSON.stringify(after);
  // ⚠ but TOMORROW scales up
  w.ContractClock.__devSet(T+86400);
  const tomorrow=w.contractCurrentOffers('daily').map(o=>o.tier).filter(Boolean);
  const yest=before.map(x=>+x.split(':')[1]).filter(Boolean);
  R.tomorrowScales = tomorrow.length===0 || yest.length===0
                  || Math.max(...tomorrow) > Math.max(...yest);
}
// ---- 11. reset expires progress but NOT earned rewards ---------------
{
  const w=ready();
  const offers=w.contractCurrentOffers('daily');
  offers.slice(0,3).forEach(o=>w.contractToggleSelect('daily',o.id));
  w.contractAcceptSelected('daily');
  const c0=w.CONTRACTS.daily[0], c1=w.CONTRACTS.daily[1];
  w.contractNote(c0.offer.ev, c0.offer.target, {tier:99});     // complete
  w.contractNote(c1.offer.ev, 1, {tier:99});                   // partial
  R.reset={ completeBefore:c0.state, partialBefore:c1.progress };
  w.ContractClock.__devSet(T+86400);
  R.reset.dailyAfter=w.CONTRACTS.daily.length;
  R.reset.pending=(w.CONTRACTS.pending||[]).length;
  R.reset.pendingCoin=(w.CONTRACTS.pending[0]||{}).reward;
  R.rewardsSurviveReset = R.reset.dailyAfter===0 && R.reset.pending===1;
  R.incompleteLost = R.reset.dailyAfter===0;
  // and the pending queue pays out
  const paid=w.contractClaimPending();
  R.reset.paid=paid; R.reset.wallet=w.__paid.slice();
  R.pendingPays = paid.ok===true && w.__paid.length===1
               && w.__paid[0][0]==='cu_vault';
  // no catch-up: a 5-day gap still makes exactly one period
  const w2=ready();
  w2.ContractClock.__devSet(T+86400*5);
  R.noCatchUp = w2.CONTRACTS.daily.length===0
             && w2.CONTRACTS.dailyPeriod===w2.dailyPeriodId(T+86400*5);
}
// ---- 12. rewards: centralised, hierarchical --------------------------
{
  const w=world();
  const RW=w.CONTRACT_REWARDS;
  R.rewards={ placeholder:RW.__placeholder,
    daily:RW.daily.coin, weekly:RW.weekly.coin, chapter:RW.chapter.coin };
  R.hierarchy = Math.max(...RW.daily.coin) < Math.min(...RW.weekly.coin)
             && Math.max(...RW.weekly.coin) <= Math.max(...RW.chapter.coin);
  R.harderPaysMore = RW.daily.coin[2] > RW.daily.coin[0];
  R.rewardsCentral = /const CONTRACT_REWARDS = \{/.test(code)
    && R.rewards.placeholder===true;
}
// ---- 10/save. round trip -------------------------------------------
{
  const w=ready();
  const offers=w.contractCurrentOffers('daily');
  offers.slice(0,3).forEach(o=>w.contractToggleSelect('daily',o.id));
  w.contractAcceptSelected('daily');
  // ⚠ progress CAPS at the target — noting 3 against a target-1 contract
  // stores 1, which is correct. Record what we expect rather than assuming.
  const c0=w.CONTRACTS.daily[0];
  w.contractNote(c0.offer.ev, 3, {tier:99});
  const expectProgress=Math.min(3, c0.offer.target);
  w.journeyNote('kill', 50);
  w.contractsSave();
  const raw=w.__store['ashenContracts_v1'];
  const parsed=JSON.parse(raw);
  R.save={ keys:Object.keys(parsed).sort(), v:parsed.v };
  const need=['v','dailyPeriod','weeklyPeriod','offersDaily','offersWeekly',
              'selDaily','selWeekly','daily','weekly','journey','pending',
              'snapDaily','snapWeekly'];
  R.saveComplete = need.every(k=>k in parsed);
  // reload into a fresh world
  const w2=world(); w2.__store['ashenContracts_v1']=raw;
  const ok=w2.contractsLoad();
  R.reload={ ok:ok, daily:w2.CONTRACTS.daily.length,
             progress:w2.CONTRACTS.daily[0]&&w2.CONTRACTS.daily[0].progress,
             snap:w2.CONTRACTS.snapDaily, journeyKill:w2.journeyProgress('c1_kill') };
  R.reload.expected=expectProgress;
  R.savesRoundTrip = ok && R.reload.daily===3 && R.reload.progress===expectProgress
                  && !!R.reload.snap && R.reload.journeyKill===50;
  // ⚠ character save untouched — its own key
  R.separateKey = Object.keys(w.__store).indexOf('ashenContracts_v1')>=0
    && !/SAVE_KEY/.test(code.slice(code.indexOf('function contractsSave'),
                                   code.indexOf('function contractsLoad')));
}
// ---- journey states + claim -----------------------------------------
{
  const w=world();
  R.journey={ start:w.journeyState(0), next:w.journeyState(1) };
  const ch=w.JOURNEY_CHAPTERS ? null : null;
  w.journeyNote('kill',400); w.journeyNote('riftDone',5);
  w.journeyNote('elitePack',10); w.journeyNote('support',1); w.journeyNote('rune',1);
  R.journey.afterAll=w.journeyState(0);
  R.journey.chapterStill=w.CONTRACTS.journey.chapter;
  const cl=w.journeyClaim();
  R.journey.claim=cl.ok; R.journey.chapterAfter=w.CONTRACTS.journey.chapter;
  R.journey.paid=w.__paid.length;
  R.journeyStates = R.journey.start==='ACTIVE' && R.journey.next==='LOCKED'
    && R.journey.afterAll==='COMPLETE' && R.journey.chapterStill===0
    && cl.ok===true && R.journey.chapterAfter===1 && R.journey.paid===1;
}
// ---- 13/14/15. the UI --------------------------------------------------
R.ui = {
  threeTabs:/tab\('journey','JOURNEY'\)\+tab\('daily','DAILY'\)/.test(code),
  chooseCopy:/'Choose 1 of 3'\s*:\s*'Choose 3 of 5'/.test(code),
  acceptCopy:/'ACCEPT WEEKLY CONTRACT':'ACCEPT 3 CONTRACTS'/.test(code),
  notSelected:/NOT SELECTED/.test(code),
  selectedCounter:/SELECTED/.test(code),
  disabledUntilThree:/canAccept\?'':' off'/.test(code),
  steamRequired:/STEAM CONNECTION REQUIRED/.test(code),
  offlineForcesJourney:/if\(!trusted && BOARD\.tab!=='journey'\) BOARD\.tab='journey'/.test(code),
  turnInGated:/if\(window\.questAtVeyra && !questAtVeyra\(\)\)/.test(code),
  premiumShell:/questBoardEl\(\)/.test(code),
  noReroll:!/REROLL/i.test(code.slice(code.indexOf('function cbPeriodSection'),
                                      code.indexOf('function cbJourneySection'))),
  nextChapterLocked:/cbNext/.test(code),
  trackerCapped:/if\(rows\.length<3\) rows\.push\(line\('DAILY', c\)\)/.test(code),
  trackerNotOffers:!/contractCurrentOffers/.test(
    code.slice(code.indexOf('function questRender'), code.indexOf('function questRender')+2200))
};
R.uiComplete = Object.values(R.ui).every(Boolean);

R.PASS = R.selectionFlow && R.noFourthSlot && R.requirementsFrozen
      && R.tomorrowScales && R.rewardsSurviveReset && R.pendingPays
      && R.noCatchUp && R.hierarchy && R.harderPaysMore && R.rewardsCentral
      && R.saveComplete && R.savesRoundTrip && R.journeyStates && R.uiComplete;
console.log(JSON.stringify(R,null,1));
if(!R.PASS) process.exit(1);
