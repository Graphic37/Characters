// quests: counted from kills, turned in by hand, paid in Vaulted Coin
const fs=require('fs'), vm=require('vm');
const {JSDOM}=require('jsdom');
const src=fs.readFileSync('work.html','utf8');
const R={};

// ---- 0. Vaulted Coin really was unreachable ---------------------------
{
  const dropTable=/const CUR=\[([\s\S]*?)\];/.exec(src)[1];
  R.coin = { definedAsItem:/id:'cu_vault'/.test(src),
             inVendorDropTable:/cu_vault/.test(dropTable),
             nowGrantedByQuest:/makeCurrency\('cu_vault', q\.coin\)/.test(src) };
  R.questIsOnlySource = R.coin.definedAsItem && !R.coin.inVendorDropTable
                     && R.coin.nowGrantedByQuest;
}

// ---- 1. the whole lifecycle -------------------------------------------
const a=src.indexOf('const QUEST_DEFS = [');
const b=src.indexOf('/* ---- the state machine ---');
function world(){
  const dom=new JSDOM('<body></body>');
  const store={};
  const bag=[];
  const sb={ console, Math, document:dom.window.document,
    /* v220: the gate. In town, at Veyra, not in a rift. */
    WORLD:{mode:'TOWN'}, RIFT:{active:false}, nearStation:{name:'Veyra'},
    localStorage:{ getItem:k=>store[k]||null, setItem:(k,v)=>{store[k]=v;} },
    fmt:(n)=>String(n),
    toast:(m)=>sb.__toasts.push(m),
    makeCurrency:(id,q)=>({baseId:id, qty:q}),
    put:(it)=>{ bag.push(it); return true; },
    ahErr:()=>{} };
  sb.__toasts=[]; sb.__bag=bag; sb.__store=store; sb.__dom=dom;
  sb.window=sb; sb.window.RIFT=sb.RIFT; sb.window.nearStation=sb.nearStation;
  vm.createContext(sb);
  vm.runInContext(src.slice(a,b)+
    '\nthis.A=questAccept; this.T=questTurnIn; this.K=questNoteKill;'+
    '\nthis.Q=QUESTS; this.D=QUEST_DEFS; this.R=questRender;', sb, {filename:'q.js'});
  return sb;
}
{
  const w=world();
  R.beforeAccept = { active:w.Q.active };
  const acc=w.A();
  R.accepted = { ok:acc.ok, name:w.Q.active.n, goal:w.Q.active.goal, coin:w.Q.active.coin };
  // ⚠ accepting twice must not replace the live contract
  R.doubleAccept = w.A();
  // turning in early must refuse and pay nothing
  const early=w.T();
  R.earlyTurnIn = { ok:early.ok, why:early.why, left:early.left, paid:w.__bag.length };
  // kill to the goal
  for(let i=0;i<w.Q.active.goal;i++) w.K();
  R.atGoal = { have:w.Q.active.have, goal:w.Q.active.goal };
  // ⚠ overkill must not exceed the goal
  for(let i=0;i<50;i++) w.K();
  R.overkillClamped = w.Q.active.have === w.Q.active.goal;
  // and it must NOT auto-claim
  R.noAutoClaim = w.__bag.length===0 && w.Q.active!==null;
  const paid=w.T();
  R.turnedIn = { ok:paid.ok, coin:paid.coin, bagged:w.__bag.length,
                 item:w.__bag[0], activeCleared:w.Q.active===null, done:w.Q.done };
  // next contract is the NEXT rung
  w.A();
  R.ladder = { second:w.Q.active.n, secondGoal:w.Q.active.goal,
               harder:w.Q.active.goal > R.accepted.goal };
}
// ---- 2. it persists -----------------------------------------------------
{
  const w=world(); w.A();
  for(let i=0;i<50;i++) w.K();
  const saved=JSON.parse(w.__store['ashenQuest_v1']);
  R.persist = { savedHave:saved.active.have, savedId:saved.active.id };
  R.savedNotEveryKill = saved.active.have===50;   // saves on the 25s
}
// ---- 3. the board renders, and says something when EMPTY ---------------
{
  const w=world();
  w.R();
  const el=w.__dom.window.document.getElementById('questBoard');
  R.emptyBoard = { visible:el.classList.contains('on'), text:el.textContent };
  w.A(); for(let i=0;i<30;i++) w.K(); w.R();
  R.activeBoard = { title:el.querySelector('.qTitle').textContent,
                    line:el.querySelector('.qLine').textContent,
                    hasBar:!!el.querySelector('.qTrack i') };
  for(let i=0;i<200;i++) w.K(); w.R();
  R.doneBoard = { titleClass:el.querySelector('.qTitle').className,
                  foot:el.querySelector('.qFoot').textContent };
}
// ---- 4. wiring ---------------------------------------------------------
R.wiring = {
  killHookFeeds:/if\(!silent && window\.questNoteKill\) questNoteKill\(\)/.test(src),
  adenahDispatched:/nearStation\.name==='Adenah'\)\{ winOpen=true; window\.adenahPanel/.test(src),
  adenahStationExists:/stations\.push\(\{name:'Adenah'/.test(src),
  adenahNpcPlaced:/npc\(\.\.\.W\(2\.2,-\.6\), 0x6a4a7a, 'curio', rot\)/.test(src),
  adenahTitled:/title:'Adenah the Curio Vendor'/.test(src)
};
R.fullyWired = Object.values(R.wiring).every(Boolean);
console.log(JSON.stringify(R,null,1));
