// the quest board: real two-column panel, ladder states, gated actions
const fs=require('fs'), vm=require('vm');
const {JSDOM}=require('jsdom');
const src=fs.readFileSync('work.html','utf8');
const code=src.replace(/\/\*[\s\S]*?\*\//g,'');
const R={};

// ⚠ QICO sits BEFORE QUEST_DEFS in the file, so slicing [QUEST_DEFS..QICO] was
// a negative range. Take the defs+state block, then the board block, in file
// order — and stitch them in dependency order for the sandbox.
const qa=src.indexOf('const QUEST_DEFS = [');
const qb=src.indexOf('function questEl(){');
const a=src.indexOf('const QICO = {');
// ⚠ `questEl` is the SMALL tracker and lives BEFORE the board in the file, so
// that anchor gave a slice running past the board into the vendor panel. End on
// the board's own last line instead.
const b=src.indexOf("\n};\n", src.indexOf("window.ahErr(e,'questPanel')"))+4;

function board(opts){
  const o=Object.assign({done:0, active:null, sel:null, station:{name:'Veyra'},
                         mode:'TOWN', rift:false}, opts||{});
  const dom=new JSDOM('<body></body>');
  const bag=[];
  const sb={ console, Math, document:dom.window.document,
    WORLD:{mode:o.mode}, RIFT:{active:o.rift}, nearStation:o.station,
    localStorage:{getItem:()=>null,setItem:()=>{}},
    fmt:(n)=>String(n).replace(/\B(?=(\d{3})+(?!\d))/g,','),
    toast:(m)=>sb.__t.push(m), makeCurrency:(id,q)=>({baseId:id,qty:q}),
    put:(it)=>{bag.push(it);return true;}, ahErr:()=>{}, winOpen:false,
    // v235 added the J hotkey inside this slice
    addEventListener:()=>{} };
  sb.__t=[]; sb.__bag=bag; sb.window=sb;
  sb.window.RIFT=sb.RIFT; sb.window.nearStation=o.station;
  vm.createContext(sb);
  vm.runInContext(src.slice(qa,qb)+'\nfunction questRender(){}\n'+src.slice(a,b)+
    '\nthis.P=window.questPanel; this.Q=QUESTS; this.C=window.questBoardClose;',
    sb, {filename:'q.js'});
  sb.Q.done=o.done; sb.Q.sel=o.sel;
  if(o.active) sb.Q.active=o.active;
  sb.P();
  const el=dom.window.document.getElementById('questBoard2');
  return { el, sb, doc:dom.window.document };
}
const D=(i,have)=>{ const d=[{id:'q_cull',goal:120,coin:1},{id:'q_purge',goal:400,coin:3},
                              {id:'q_harvest',goal:1000,coin:8}][i];
                    return {id:d.id, n:'x', verb:'Kill', unit:'enemies',
                            goal:d.goal, have, coin:d.coin}; };

// ---- 1. it is a real two-column panel, not the station window ---------
{
  const {el}=board({});
  R.structure = {
    ownElement: !!el,
    notStationPanel: !/questPanel[\s\S]{0,300}stationPanel/.test(code),
    header:(el.querySelector('.qbTitle')||{}).textContent,
    hasClose:!!el.querySelector('.qbX'),
    listRows:el.querySelectorAll('.qbRow').length,
    hasDetail:!!el.querySelector('.qbDetail'),
    open:el.classList.contains('on')
  };
  R.isRealBoard = R.structure.listRows===3 && R.structure.hasDetail
               && R.structure.hasClose && R.structure.open;
}
// ---- 2. ⚠ the LADDER states are honest -------------------------------
{
  const mid=board({ done:1, active:D(1,84), sel:null });
  const tags=[...mid.el.querySelectorAll('.qbRow')].map(r=>
    r.className.replace('qbRow','').trim()+':'+r.querySelector('.qbRowTag').textContent);
  R.ladder = tags;
  R.ladderHonest = /done/.test(tags[0]) && /active/.test(tags[1]) && /locked/.test(tags[2]);
}
// ---- 3. the detail shows objective, progress and reward --------------
{
  const {el}=board({ done:1, active:D(1,84), sel:1 });
  R.detail = {
    name:(el.querySelector('.qbDetName')||{}).textContent,
    hasFlavour:!!el.querySelector('.qbFlavour'),
    objective:(el.querySelector('.qbObjText')||{}).textContent,
    progress:(el.querySelector('.qbObjNum')||{}).textContent,
    reward:(el.querySelector('.qbReward b')||{}).textContent,
    rewardName:(el.querySelector('.qbReward i')||{}).textContent,
    bar:!!el.querySelector('.qbTrack i')
  };
  R.detailOk = R.detail.progress==='84 / 400' && R.detail.reward==='3'
            && /Vaulted Coin/.test(R.detail.rewardName||'');
}
// ---- 4. the action button matches the state --------------------------
{
  R.actions = {
    // ⚠ the X button is ALSO [data-qact], and it comes first in the DOM — the
    // first version of this grabbed the close button and reported the accept
    // action as missing. Scope the query to the action area.
    fresh:   (board({done:0, sel:0}).el.querySelector('.qbAction [data-qact]')||{}).dataset,
    inProg:  (board({done:0, active:D(0,50), sel:0}).el.querySelector('.qbBtn.wait')||{}).textContent,
    complete:(board({done:0, active:D(0,120), sel:0}).el.querySelector('[data-qact="turnin"]')||{}).textContent,
    doneRow: !!board({done:2, sel:0}).el.querySelector('.qbDone'),
    lockedRow: !!board({done:0, sel:2}).el.querySelector('.qbDone.locked')
  };
  R.actionsOk = R.actions.fresh.qact==='accept'
             && /In Progress/.test(R.actions.inProg||'')
             && /Turn In/.test(R.actions.complete||'')
             && R.actions.doneRow && R.actions.lockedRow;
}
// ---- 5. ⚠ the GATE still applies — no accepting from a rift ----------
{
  const away=board({done:0, sel:0, mode:'RIFT', rift:true});
  away.el.querySelector('[data-qact="accept"]').dispatchEvent(
    new away.doc.defaultView.Event('click'));
  R.gate = { accepted: away.sb.Q.active!==null, toasts: away.sb.__t };
  R.gateHolds = R.gate.accepted===false;
}
// ---- 6. a full turn-in through the board pays and advances -----------
{
  const w=board({done:0, active:D(0,120), sel:0});
  w.el.querySelector('[data-qact="turnin"]').dispatchEvent(
    new w.doc.defaultView.Event('click'));
  R.turnIn = { bag:w.sb.__bag, done:w.sb.Q.done, active:w.sb.Q.active,
               selFollowed:w.sb.Q.sel };
  R.turnInWorks = w.sb.__bag.length===1 && w.sb.Q.done===1
               && w.sb.Q.active===null && w.sb.Q.sel===1;
}
// ---- 7. escape and click-outside close it ---------------------------
R.closing = {
  escapeBound:/if\(e\.key!=='Escape'\) return;[\s\S]{0,220}questBoardClose/.test(code),
  capturePhase:/questBoardClose\(\);\s*\n\s*\}\s*\n\}, true\);/.test(code),
  clickOutside:/if\(e\.target===el\) questBoardClose\(\)/.test(code),
  xButton:/data-qact="close"/.test(code)
};
R.closable = Object.values(R.closing).every(Boolean);
// the small tracker survives
R.trackerKept = /id='questBoard'/.test(code) && /function questRender\(\)/.test(code);
console.log(JSON.stringify(R,null,1));
