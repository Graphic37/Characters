// Phase 2: board from unlocks, 3 slots with locks, picker rules
const fs=require('fs'), vm=require('vm');
const {JSDOM}=require('jsdom');
const src=fs.readFileSync('work.html','utf8');
const R={};

// ---------- assignSupport: the rules that matter ------------------------
const aa=src.indexOf('  function assignSupport(skillId, idx, supId){');
const ab=src.indexOf('  window.assignSupport = assignSupport;');
const sfa=src.indexOf('  function socketsFor(id){');
const sfb=src.indexOf('  window.skillSockets = socketsFor;');

function world(unlocks){
  const RANGER_GEMS={ multishot:{sockets:[null,null,null], supportSlots:2},
                      rapid:{sockets:[null,null,null], supportSlots:1} };
  const SUPPORT_DEFS={ s_chain:{n:'Fork',more:[0,1.15,1.13,1.11,1.09,1.07]},
                       s_brut:{n:'Savagery',more:[0,1.34,1.31,1.28,1.24,1.20]},
                       s_tempo:{n:'Swift Cadence',more:[0,1.18,1.16,1.13,1.10,1.07]} };
  const toasts=[];
  const sb={ console, has:()=>true, RANGER_GEMS, SUPPORT_DEFS, toasts,
    toast:(m)=>toasts.push(m), render:()=>{}, markStatsDirty:()=>{},
    supportTier:(id)=>unlocks[id]||null,
    socketSupport:(e)=>{ if(!e) return null; const id=typeof e==='string'?e:(e&&e.baseId);
      const d=SUPPORT_DEFS[id]; if(!d) return null; const t=unlocks[id]||null;
      return {id, n:d.n, tier:t, more:t?d.more[t]:1}; } };
  sb.window=sb; Object.assign(sb.window,{SUPPORT_DEFS, supportTier:sb.supportTier,
    socketSupport:sb.socketSupport, markStatsDirty:sb.markStatsDirty});
  vm.createContext(sb);
  vm.runInContext('var SUPPORT_SLOTS=3;\n'+src.slice(sfa,sfb)+'\n'+src.slice(aa,ab)+
    '\nthis.A=assignSupport; this.G=RANGER_GEMS;', sb, {filename:'a.js'});
  sb.T=toasts; return sb;
}

// 1. assign stores the ID ONLY
{
  const w=world({s_chain:4});
  R.assignOk = w.A('multishot',0,'s_chain');
  R.stored = w.G.multishot.sockets[0];
  R.storesIdNotObject = typeof R.stored === 'string';
}
// 2. the SAME support may serve MANY skills
{
  const w=world({s_chain:4});
  w.A('multishot',0,'s_chain'); const second=w.A('rapid',0,'s_chain');
  R.sharedAcrossSkills = { second, multishot:w.G.multishot.sockets[0], rapid:w.G.rapid.sockets[0] };
}
// 3. but NOT twice on the same skill
{
  const w=world({s_chain:4});
  w.A('multishot',0,'s_chain');
  const dup=w.A('multishot',1,'s_chain');
  R.duplicateRefused = { returned:dup, slot1:w.G.multishot.sockets[1], toast:w.T[w.T.length-1] };
}
// 4. a locked support cannot be assigned
{
  const w=world({s_chain:4});
  const r=w.A('multishot',0,'s_brut');   // not unlocked
  R.lockedRefused = { returned:r, slot0:w.G.multishot.sockets[0], toast:w.T[w.T.length-1] };
}
// 5. an ACCOUNT upgrade changes what the socket is worth, with no re-socketing
{
  const unlocks={s_chain:4};
  const w=world(unlocks);
  w.A('multishot',0,'s_chain');
  const before=w.socketSupport(w.G.multishot.sockets[0]);
  unlocks.s_chain=2;                       // account upgrade
  const after=w.socketSupport(w.G.multishot.sockets[0]);
  R.accountUpgrade = { storedUnchanged:w.G.multishot.sockets[0]==='s_chain',
    tierBefore:before.tier, tierAfter:after.tier,
    moreBefore:+before.more.toFixed(3), moreAfter:+after.more.toFixed(3),
    strongerNow: after.more>before.more };
}
// 6. removal
{
  const w=world({s_chain:4});
  w.A('multishot',0,'s_chain'); w.A('multishot',0,null);
  R.removal = w.G.multishot.sockets[0];
}

// ---------- the board renders from the unlock table ---------------------
{
  const ba=src.indexOf('function supportSocketedIn(baseId){');
  const bb=src.indexOf('window.drawGemTab=drawGemTab;');
  const dom=new JSDOM('<div class="grid-wrap"><div class="cells" id="stCells"></div></div>');
  const doc=dom.window.document;
  const DEFS={ s_chain:{n:'Fork',grad:'gBlue',more:[0,1.15,1.13,1.11,1.09,1.07],
                        text:t=>'Fork text T'+t},
               s_brut:{n:'Savagery',grad:'gRed',more:[0,1.34,1.31,1.28,1.24,1.20],
                        text:t=>'Savagery text T'+t} };
  const unlocks={ s_chain:3 };
  const sb={console, document:doc, SUPPORT_DEFS:DEFS,
    gemSVG:()=>'<svg/>', icoSVG:()=>'<svg/>', toast:()=>{},
    /* v224: the board groups by category and rebinds listeners. Those live
       outside this slice; this suite covers the CARDS, t81 covers grouping. */
    supportCat:()=>'other',
    SUPPORT_CATS:[{id:'other',n:'Uncategorised',d:''}],
    setTimeout:(fn)=>fn, clearTimeout:()=>{},
    supportTier:(id)=>unlocks[id]||null,
    RANGER_GEMS:{ multishot:{sockets:['s_chain',null,null]} },
    SKILLS:{ multishot:{n:'Multishot'} },
    socketSupport:(e)=>{ const id=typeof e==='string'?e:null; return id?{id}:null; } };
  sb.window=sb; Object.assign(sb.window,{SUPPORT_DEFS:DEFS, supportTier:sb.supportTier,
    socketSupport:sb.socketSupport, RANGER_GEMS:sb.RANGER_GEMS, SKILLS:sb.SKILLS,
    SUPPORT_CATS:sb.SUPPORT_CATS, supportCat:sb.supportCat});
  vm.createContext(sb); vm.runInContext(src.slice(ba,bb), sb, {filename:'b.js'});
  sb.drawGemTab();
  const g=doc.getElementById('gemTab');
  R.board={ cards:g.querySelectorAll('.gmCard').length,
    locked:g.querySelectorAll('.gmCard.empty').length,
    unlockedLabel:(g.querySelector('.gmLvl')||{}).textContent,
    lockedVisible:/LOCKED/.test(g.innerHTML),
    nextUpgrade:(g.querySelector('.gmNext')||{}).textContent,
    usedBy:(g.querySelector('.gmIn')||{}).textContent,
    readsInventory:/supportTotals/.test(src.slice(ba,bb)) };
}
// the tab is renamed and no physical support is seeded
R.tabRenamed = /st2:\{ n:'SUPPORTS'/.test(src);
R.noSeededSupports = !/addItem\(CONT\.inv, makeSupport/.test(src);
R.lockedSlotSpeaks = /is locked — speak with Garrick in town/.test(src);
console.log(JSON.stringify(R,null,1));
