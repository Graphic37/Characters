// the dev build starts on the test clock — as a FLAG, not as saved state
const fs=require('fs'), vm=require('vm');
const src=fs.readFileSync('work.html','utf8');
const code=src.replace(/\/\*[\s\S]*?\*\//g,'');
const R={};

function world(opts){
  opts=opts||{};
  const a=src.indexOf('const ContractClock = (function(){');
  const b=src.indexOf('const QUEST_DEFS = [');
  const store=opts.store||{};
  const sb={ console:{log:()=>{},warn:(m)=>sb.__warn.push(m),table:()=>{}},
    Math, JSON, isFinite, Number, String, Array, Object, Date,
    performance:{now:()=>0}, setInterval:()=>1,
    localStorage:{ getItem:(k)=>store[k]||null, setItem:(k,v)=>{store[k]=v;},
                   removeItem:(k)=>{delete store[k];} },
    navigator:{userAgent:'t'},
    S:{lvl:40, bestRiftTier:30, bestChallengeTier:18},
    RIFT:{tier:1}, toast:()=>{},
    grantCurrency:()=>{}, document:{getElementById:()=>null},
    ahErr:(e,w)=>sb.__err.push(w) };
  sb.__err=[]; sb.__warn=[]; sb.__store=store; sb.window=sb;
  vm.createContext(sb);
  vm.runInContext(src.slice(a,b), sb, {filename:'c.js'});
  return sb;
}

// ---- 1. the dev build comes up ready to use --------------------------
{
  // ⚠ the slice now RUNS the boot flag, so a fresh world is already on — that
  // IS the feature. Asserting "untrusted before auto" tested my harness's
  // ordering, not the build.
  const w=world();
  R.auto={ source:w.ContractClock.source(),
           now:w.ContractClock.nowTrusted(),
           daily:w.contractCurrentOffers('daily').length,
           weekly:w.contractCurrentOffers('weekly').length,
           warned:w.__warn.some(m=>/NOT Steam time/.test(m)) };
  R.startsUsable = R.auto.source==='dev'
    && R.auto.daily===5 && R.auto.weekly===3 && R.auto.warned===true;
  R.flagIsConstant = /const CONTRACT_DEV_AUTO_TEST_CLOCK = true;/.test(code);
  R.wiredAtBoot = /try\{ contractAutoTestClock\(\); \}catch\(e\)\{\}/.test(code);
}
// ---- 2. ⚠ IT NEVER OVERRIDES A REAL SOURCE ---------------------------
{
  const w=world();
  w.ContractClock.setTrusted(1800000000, 'steam');   // steam spoke first
  const before=w.ContractClock.nowTrusted();
  const took=w.contractAutoTestClock();
  R.steam={ autoRefused:took===false, source:w.ContractClock.source(),
            unchanged:w.ContractClock.nowTrusted()===before };
  R.defersToSteam = R.steam.autoRefused===true && R.steam.source==='steam'
    && R.steam.unchanged===true;
}
// ---- 3. ⚠ STILL NOT PERSISTED ---------------------------------------
{
  const store={};
  const w=world({store});
  w.contractAutoTestClock();
  const o=w.contractCurrentOffers('daily');
  o.slice(0,3).forEach(x=>w.contractToggleSelect('daily',x.id));
  w.contractAcceptSelected('daily');
  w.contractsSave();
  const raw=store[w.CONTRACT_SAVE_KEY];
  R.persist={ mentionsClock:/testClock|devClock|AUTO_TEST|offset|dev/i.test(raw) };
  // ⚠ simulate a REAL build: the flag is off, so clear the clock the boot
  // block set. What must survive from storage is the contract save; what must
  // NOT is the clock.
  const w2=world({store:{...store}});
  w2.ContractClock.__devClear();
  w2.contractsLoad();
  R.persist.withoutAuto={ source:w2.ContractClock.source(),
                          now:w2.ContractClock.nowTrusted(),
                          loaded:w2.CONTRACTS.daily.length };
  R.notPersisted = R.persist.mentionsClock===false
    && R.persist.withoutAuto.source===null
    && R.persist.withoutAuto.now===null
    && R.persist.withoutAuto.loaded===3;   /* the SAVE survived, the switch did not */
}
// ---- 4. one click switches it both ways ------------------------------
{
  const w=world();
  w.contractAutoTestClock();
  R.toggle={ start:w.ContractClock.source() };
  w.ahContractTestOnline(w.ContractClock.source()!=='dev');   // the bar's call
  R.toggle.afterOne=w.ContractClock.source();
  R.toggle.offersOff=w.contractCurrentOffers('daily').length;
  w.ahContractTestOnline(w.ContractClock.source()!=='dev');
  R.toggle.afterTwo=w.ContractClock.source();
  R.toggle.offersOn=w.contractCurrentOffers('daily').length;
  R.togglesBothWays = R.toggle.start==='dev' && R.toggle.afterOne===null
    && R.toggle.offersOff===0 && R.toggle.afterTwo==='dev' && R.toggle.offersOn===5;
}
// ---- 5. the bar shows its own state ----------------------------------
R.bar={
  singleSwitch:/data-cl="toggle"/.test(code),
  labelsState:/lbl\.textContent = dev \? 'TEST CLOCK' : 'REAL RULES'/.test(code),
  travelDisabledWhenOff:/b\.disabled=!dev/.test(code),
  hideButton:/data-cl="hide"/.test(code),
  noSeparateOnOff:!/data-cl="on"/.test(code) && !/data-cl="off"/.test(code)
};
R.barIsASwitch = Object.values(R.bar).every(Boolean);
// ---- 6. and it is still loudly marked in the board -------------------
R.marked={
  badge:/TEST CLOCK<\/span>/.test(code),
  banner:/SIMULATED TIME &mdash; not Steam server time/.test(code),
  neverOnline:!/>ONLINE</.test(code),
  flagDocumented:/SET THIS TO false BEFORE ANY REAL BUILD/.test(src)
};
R.stillMarked = Object.values(R.marked).every(Boolean);

R.PASS = R.startsUsable && R.flagIsConstant && R.wiredAtBoot
      && R.defersToSteam && R.notPersisted && R.togglesBothWays
      && R.barIsASwitch && R.stillMarked;
console.log(JSON.stringify(R,null,1));
if(!R.PASS) process.exit(1);
