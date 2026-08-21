// the strip shows names, not numbers; DUMP is gone and nothing is stranded
const fs=require('fs'), vm=require('vm');
const {JSDOM}=require('jsdom');
const src=fs.readFileSync('work.html','utf8');
const code=src.replace(/\/\*[\s\S]*?\*\//g,'');
const R={};

// ---- 1. ⚠ THE COUNT IS A BADGE, NOT PART OF THE NAME -----------------
{
  const css=src.slice(src.indexOf('<style>'), src.indexOf('</style>'))
               .replace(/\/\*[\s\S]*?\*\//g,'');
  const rule=/#stashTabs \.tab\[data-count\]::after\{([^}]*)\}/.exec(css)[1]
               .replace(/\s+/g,' ');
  R.badge = { rule:rule.trim(),
    positioned:/position:absolute/.test(rule),
    notInline:!/margin-left/.test(rule),
    outOfFlow:/top:2px/.test(rule) && /right:4px/.test(rule) };
  R.countIsNotAName = R.badge.positioned && R.badge.notInline && R.badge.outOfFlow;
}
// ---- 2. base tabs keep plain names; only purchased ones are numbered --
{
  const a=src.indexOf('const STASH_TAB_COUNT');
  const b=src.indexOf('const EQ={};');
  const sb={ console, Math, S:{}, ahErr:()=>{}, refreshStashTabs:()=>{},
    toast:()=>{}, fmt:String, CONT:{}, addItem:()=>true };
  sb.window=sb; vm.createContext(sb);
  vm.runInContext(src.slice(a,b)+'\nthis.T=STASH_TABS; this.U=stashTabUnlocked;'+
    '\nthis.N=stashTabName;', sb, {filename:'t.js'});
  R.names = sb.T.map(t=>t.n);
  const base=R.names.slice(0,4);
  R.baseNames = base;
  R.baseHasNoNumbers = base.every(n=>!/\d|\bI+\b/.test(n));
  R.purchasedNumbered = R.names.filter(n=>/^STASH \d+$/.test(n)).length===7;
}
// ---- 3. ⚠ DUMP NEVER SHOWS -------------------------------------------
{
  const a=src.indexOf('const STASH_TAB_COUNT');
  const b=src.indexOf('const EQ={};');
  const CONT={}; for(let i=0;i<12;i++) CONT['st'+i]={items:[]};
  const sb={ console, Math, S:{stashBought:7}, ahErr:()=>{}, CONT,
    refreshStashTabs:()=>{}, toast:()=>{}, fmt:String, addItem:()=>true };
  sb.window=sb; vm.createContext(sb);
  vm.runInContext(src.slice(a,b)+'\nthis.U=stashTabUnlocked; this.C=CONT;', sb, {filename:'d.js'});
  R.dump = { whenEmpty:sb.U('st3') };
  sb.C.st3.items=[{uid:1},{uid:2}];          // even holding items
  R.dump.whenFull=sb.U('st3');
  R.dumpNeverShows = R.dump.whenEmpty===false && R.dump.whenFull===false;
  // every other tab is unaffected
  R.dump.othersOk = sb.U('st0') && sb.U('st5') && sb.U('st11');
}
// ---- 4. ⚠ AND NOTHING IS STRANDED: the migration empties it ----------
{
  const a=src.indexOf('function migrateDumpTab(){');
  const b=src.indexOf('window.migrateDumpTab=migrateDumpTab;');
  function run(gearRoom, bagRoom){
    const CONT={ inv:{items:[]} };
    for(let i=0;i<12;i++) CONT['st'+i]={items:[]};
    CONT.st3.items=[1,2,3,4,5,6,7].map(n=>({uid:n}));
    let g=gearRoom, bag=bagRoom;
    const sb={ console:{warn:()=>{}}, Math, CONT,
      S:{dumpMigrated:0}, STASH_LEGACY:'st3',
      STASH_EXTRA_ORDER:['st5','st6','st7','st8','st9','st10','st11'],
      stashTabUnlocked:(id)=>id==='st0',
      stashTabFor:()=>'st0',
      addItem:(c,it)=>{
        if(c===CONT.st0){ if(g<=0) return false; g--; return c.items.push(it),true; }
        if(c===CONT.inv){ if(bag<=0) return false; bag--; return c.items.push(it),true; }
        return false;
      },
      toast:()=>{}, ahErr:()=>{} };
    sb.window=sb; vm.createContext(sb);
    vm.runInContext('const STASH_LEGACY="st3";\n'+src.slice(a,b)+
      '\nthis.M=migrateDumpTab; this.C=CONT;', sb, {filename:'m.js'});
    const r=sb.M();
    return { result:r, left:sb.C.st3.items.length,
             gear:sb.C.st0.items.length, bag:sb.C.inv.items.length,
             total:sb.C.st3.items.length+sb.C.st0.items.length+sb.C.inv.items.length };
  }
  R.migrate = {
    plentyOfRoom: run(99, 99),
    gearFull_bagFree: run(0, 99),      // ⚠ the bag is the last resort
    everythingFull: run(0, 0)
  };
  R.allSeven = Object.values(R.migrate).every(m=>m.total===7);
  R.bagRescues = R.migrate.gearFull_bagFree.left===0
              && R.migrate.gearFull_bagFree.bag===7;
  R.nothingLost = R.allSeven && R.migrate.everythingFull.left===7;
}
// ---- 5. overflow can never target it ---------------------------------
R.routing = {
  dumpNotOverflow:/const dump=\[\];/.test(code),
  homeFallsBackToGear:/\? 'st3' : 'st0';/.test(code),
  playerListSkipsIt:/k!=='st3'/.test(code)
};
R.cannotRouteToDump = R.routing.dumpNotOverflow && R.routing.playerListSkipsIt;
R.PASS = R.countIsNotAName && R.baseHasNoNumbers && R.purchasedNumbered
      && R.dumpNeverShows && R.nothingLost && R.bagRescues && R.cannotRouteToDump;
console.log(JSON.stringify(R,null,1));
if(!R.PASS) process.exit(1);
