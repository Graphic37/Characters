// ⚠ THE FULL ROUND TRIP HE ASKED FOR:
// buy two tabs -> reorder -> fill storage -> deposit overflow -> save/reload
// -> prove Gold, order, unlock state and EVERY ITEM survived.
const fs=require('fs'), vm=require('vm');
const {JSDOM}=require('jsdom');
const src=fs.readFileSync('work.html','utf8');
const code=src.replace(/\/\*[\s\S]*?\*\//g,'');
const R={};

function world(){
  const dom=new JSDOM('<body><div id="stashTabs"></div></body>');
  const store={};
  const CONT={ inv:{id:'inv',w:10,h:6,items:[]} };
  for(let i=0;i<12;i++) CONT['st'+i]={id:'st'+i,w:10,h:10,items:[]};
  const CAP=4;                       // tiny tabs so overflow is reachable
  const sb={ console, Math, JSON, document:dom.window.document, CONT,
    S:{ lvl:42, gold:100000, xp:0, stashBought:0, stashNames:{}, stashOrder:null },
    SAVE_VERSION:1, SAVE_KEY:'k',
    localStorage:{ getItem:(k)=>store[k]||null, setItem:(k,v)=>{store[k]=v;},
                   removeItem:(k)=>{delete store[k];} },
    EQ:{}, RANGER_GEMS:{}, LOADOUT:{actives:[],ultimate:null},
    AUTOMATION:{autoSpendKeys:0,autoUpgrade:0,gemPriority:[]},
    GR:{tier:1}, RIFT:{tier:1,repeat:0},
    packItem:(it)=>it?Object.assign({},it):null,
    unpackItem:(it)=>it?Object.assign({},it):null,
    addItem:(c,it)=>{ if(c.items.length>=CAP) return false; c.items.push(it); return true; },
    stashTabFor:()=>'st0',
    fmt:String, toast:()=>{}, refreshAll:()=>{}, prompt:()=>null,
    stashTabName:(id)=>id, ahErr:(e,w)=>sb.__err.push(w), Date:Date,
    refreshStashTabs:()=>{} };
  sb.__err=[]; sb.__store=store;
  sb.window=sb;
  vm.createContext(sb);
  // the real tab tables, order logic, buy, overflow, save and load
  const parts=[
    // ⚠ the order/move helpers sit after that marker, but `refreshStashTabs`
    // is in a LATER SCRIPT BLOCK — slicing to it swallowed a `</script>`.
    // Stop at the end of this block instead.
    // ⚠ the first slice already runs past STASH_DRAG and stashBuyTab — adding
    // them again redeclared them. One contiguous slice, ending before `EQ`,
    // which needs SLOTS this sandbox does not have.
    [src.indexOf('const STASH_TAB_COUNT'), src.indexOf('const EQ={};')],
    [src.indexOf('function stashPut(it){'), src.indexOf('window.stashPut=stashPut;')],
    [src.indexOf('function saveGame(){'), src.indexOf('window.saveGame=saveGame;')],
    [src.indexOf('function loadGame(){'), src.indexOf('window.loadGame=loadGame;')]
  ];
  vm.runInContext(parts.map(p=>src.slice(p[0],p[1])).join('\n')+
    '\nthis.BUY=stashBuyTab; this.MOVE=stashMoveTab; this.ORDER=stashTabOrder;'+
    '\nthis.PUT=stashPut; this.SAVE=saveGame; this.LOAD=loadGame;'+
    '\nthis.UNLOCKED=stashTabUnlocked; this.CONT=CONT; this.S=S;',
    sb, {filename:'w.js'});
  sb.window.stashTabOrder=sb.ORDER;
  sb.window.stashTabUnlocked=sb.UNLOCKED;
  sb.window.saveGame=sb.SAVE;
  return sb;
}

const w=world();
// ---- 1. buy two tabs -------------------------------------------------
R.goldStart=w.S.gold;
R.buy1=w.BUY(); R.buy2=w.BUY();
R.goldAfterBuys=w.S.gold;
R.bought=w.S.stashBought;
R.spent=R.goldStart-R.goldAfterBuys;
R.chargedOnce = R.spent === (R.buy1.cost + R.buy2.cost);
R.bothUnlocked = w.UNLOCKED('st5') && w.UNLOCKED('st6');

// ---- 2. ⚠ A FAILED PURCHASE MUST CHANGE NOTHING ----------------------
{
  const g=w.S.gold, b=w.S.stashBought;
  w.S.gold=10;                       // far too little
  const bad=w.BUY();
  R.failedBuy={ ok:bad.ok, why:bad.why, goldUnchanged:w.S.gold===10,
                boughtUnchanged:w.S.stashBought===b };
  w.S.gold=g;
  R.failureIsClean = bad.ok===false && R.failedBuy.goldUnchanged
                  && R.failedBuy.boughtUnchanged;
}
// ---- 3. reorder: st6 before st5 --------------------------------------
w.MOVE('st6','st5');
R.orderAfterMove=w.ORDER().filter(id=>id==='st5'||id==='st6');
R.reordered = R.orderAfterMove[0]==='st6';

// ---- 4. fill storage, then overflow ----------------------------------
{
  let n=0;
  const mk=()=>({uid:++n, kind:'gear', name:'item'+n});
  // fill GEAR (st0) to its cap
  const placed=[];
  for(let i=0;i<4;i++){ w.CONT.st0.items.push(mk()); }
  // now deposit 8 more — they must land in the PURCHASED tabs, st6 first
  const landed=[];
  for(let i=0;i<8;i++){ landed.push(w.PUT(mk())); }
  R.overflowLanded=landed;
  R.overflowUsesPurchased = landed.filter(x=>x==='st5'||x==='st6').length===8;
  // ⚠ AND IT FOLLOWS HIS ORDER: st6 was moved first, so it fills first
  R.overflowFollowsOrder = landed[0]==='st6' && landed[4]==='st5';
  R.itemsBefore = { st0:w.CONT.st0.items.length, st5:w.CONT.st5.items.length,
                    st6:w.CONT.st6.items.length };
  R.totalBefore = Object.keys(w.CONT).reduce((a,k)=>a+w.CONT[k].items.length,0);
}
// ---- 5. ⚠ SAVE / RELOAD --------------------------------------------
{
  w.SAVE();
  const raw=w.__store['k'];
  R.savedKeys=Object.keys(JSON.parse(raw));
  // a fresh world, then load
  const w2=world();
  w2.__store['k']=raw;
  w2.S.gold=0; w2.S.stashBought=0; w2.S.stashOrder=null;
  Object.keys(w2.CONT).forEach(k=>w2.CONT[k].items=[]);
  const ok=w2.LOAD();
  R.reload={ loaded:ok, gold:w2.S.gold, bought:w2.S.stashBought,
             order:(w2.S.stashOrder||[]).filter(id=>id==='st5'||id==='st6'),
             st0:w2.CONT.st0.items.length, st5:w2.CONT.st5.items.length,
             st6:w2.CONT.st6.items.length };
  R.reload.total=Object.keys(w2.CONT).reduce((a,k)=>a+w2.CONT[k].items.length,0);
  R.goldSurvives   = R.reload.gold===R.goldAfterBuys;
  R.unlockSurvives = R.reload.bought===R.bought;
  R.orderSurvives  = R.reload.order[0]==='st6';
  R.itemsSurvive   = R.reload.total===R.totalBefore
                  && R.reload.st5===R.itemsBefore.st5
                  && R.reload.st6===R.itemsBefore.st6;
  // ⚠ reordering must not have MOVED anything
  R.reorderMovedNothing = R.reload.st5===4 && R.reload.st6===4;
}
// ---- 6. old saves without the new keys still load --------------------
{
  const w3=world();
  const legacy=JSON.parse(w.__store['k']);
  delete legacy.char.gold; delete legacy.stash;
  w3.__store['k']=JSON.stringify(legacy);
  w3.S.gold=555; 
  const ok=w3.LOAD();
  R.legacy={ loaded:ok, goldKept:w3.S.gold===555 };
  R.legacySafe = ok===true && R.legacy.goldKept;
}
R.PASS = R.chargedOnce && R.bothUnlocked && R.failureIsClean && R.reordered
      && R.overflowUsesPurchased && R.overflowFollowsOrder
      && R.goldSurvives && R.unlockSurvives && R.orderSurvives
      && R.itemsSurvive && R.reorderMovedNothing && R.legacySafe;
console.log(JSON.stringify(R,null,1));
if(!R.PASS) process.exit(1);
