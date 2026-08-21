// mark to sell: right-click marks, S confirms, nothing sells without a Yes
const fs=require('fs'), vm=require('vm');
const {JSDOM}=require('jsdom');
const src=fs.readFileSync('work.html','utf8');
const code=src.replace(/\/\*[\s\S]*?\*\//g,'');
const R={};
const a=src.indexOf('const SELL = { marks:new Set() };');
const b=src.indexOf('function salvageValue(it){');
const va=src.indexOf('function salvageValue(it){');
const vb=src.indexOf('function salvageItem(it){');

function world(items, worn){
  const dom=new JSDOM('<body></body>');
  const BY={}; items.forEach(i=>BY[i.uid]=i);
  const bag={ items:items.slice() };
  const sb={ console, Math, document:dom.window.document,
    S:{gold:0}, EQ:worn||{}, ITEM_BY_UID:BY,
    findContainerOf:(it)=>bag.items.includes(it)?bag:null,
    removeItem:(c,it)=>{ const i=c.items.indexOf(it); if(i>=0) c.items.splice(i,1); },
    fmt:(n)=>String(n).replace(/\B(?=(\d{3})+(?!\d))/g,','),
    // the slice includes the delegated input listeners; stub the registrar
    addEventListener:()=>{}, setTimeout:(fn)=>{},
    toast:(m)=>sb.__t.push(m), refreshAll:()=>{}, ahErr:()=>{} };
  sb.__t=[]; sb.__bag=bag; sb.window=sb;
  Object.assign(sb.window,{EQ:sb.EQ, ITEM_BY_UID:BY, S:sb.S});
  vm.createContext(sb);
  vm.runInContext(src.slice(va,vb)+'\n'+src.slice(a,b)+
    '\nthis.T=sellToggle; this.M=sellMarked; this.C=sellConfirm; this.D=sellDo;'+
    '\nthis.MARKS=SELL; this.V=salvageValue; this.Tot=sellTotal;', sb, {filename:'s.js'});
  sb.__doc=dom.window.document;
  sb.__gold=()=>sb.S.gold;
  return sb;
}
const gear=(uid,extra)=>Object.assign({uid, kind:'gear', rarity:'rare', ilvl:40, w:2,h:2}, extra||{});

// ---- 1. what can be marked ------------------------------------------
{
  const worn=gear(9);
  const w=world([gear(1), gear(2,{locked:true}),
                 {uid:3,kind:'currency'}, worn], {weapon:worn});
  R.markable = {
    plainGear: w.T(w.ITEM_BY_UID[1]),
    locked:    w.T(w.ITEM_BY_UID[2]),
    currency:  w.T(w.ITEM_BY_UID[3]),
    equipped:  w.T(worn)
  };
  R.marks = [...w.MARKS.marks];
  R.toasts = w.__t;
  R.onlyLooseGear = R.markable.plainGear===true && R.markable.locked===false
                 && R.markable.currency===false && R.markable.equipped===false
                 && R.marks.length===1;
}
// ---- 2. toggling off ------------------------------------------------
{
  const w=world([gear(1)]);
  w.T(w.ITEM_BY_UID[1]); const on=w.MARKS.marks.size;
  w.T(w.ITEM_BY_UID[1]); const off=w.MARKS.marks.size;
  R.toggle={on, off};
  R.togglesBothWays = on===1 && off===0;
}
// ---- 3. the total is real gold --------------------------------------
{
  const w=world([gear(1), gear(2), gear(3)]);
  [1,2,3].forEach(u=>w.T(w.ITEM_BY_UID[u]));
  const each=w.V(w.ITEM_BY_UID[1]);
  R.total={ items:w.M().length, each, sum:w.Tot(), correct:w.Tot()===each*3 };
}
// ---- 4. ⚠ NOTHING SELLS WITHOUT A YES --------------------------------
{
  const w=world([gear(1), gear(2)]);
  [1,2].forEach(u=>w.T(w.ITEM_BY_UID[u]));
  w.C();                                   // open the confirm
  R.confirmOpened = !!w.__doc.getElementById('sellConfirm');
  R.beforeYes = { bag:w.__bag.items.length, gold:w.__gold() };
  const el=w.__doc.getElementById('sellConfirm');
  R.confirmText = {
    title:(el.querySelector('.scTitle')||{}).textContent,
    gold:(el.querySelector('.scGold')||{}).textContent.replace(/\s+/g,' '),
    hasYes:!!el.querySelector('#scYes'), hasNo:!!el.querySelector('#scNo')
  };
  // press NO
  el.querySelector('#scNo').onclick();
  R.afterNo = { bag:w.__bag.items.length, gold:w.__gold(), marks:w.MARKS.marks.size };
  // press YES
  w.C(); w.__doc.getElementById('scYes').onclick();
  R.afterYes = { bag:w.__bag.items.length, gold:w.__gold(), marks:w.MARKS.marks.size };
  R.confirmGates = R.afterNo.bag===2 && R.afterNo.gold===0 && R.afterNo.marks===2
                && R.afterYes.bag===0 && R.afterYes.gold>0 && R.afterYes.marks===0;
}
// ---- 5. ⚠ a mark for a VANISHED item resolves away, never throws -----
{
  const w=world([gear(1), gear(2)]);
  [1,2].forEach(u=>w.T(w.ITEM_BY_UID[u]));
  w.removeItem(w.__bag, w.ITEM_BY_UID[1]);      // sold/destroyed elsewhere
  const live=w.M();
  R.stale = { markedBefore:2, resolvesTo:live.length, marksNow:w.MARKS.marks.size };
  R.staleForgotten = live.length===1 && w.MARKS.marks.size===1;
}
// ---- 6. input wiring -------------------------------------------------
R.input = {
  // ⚠ v250: marking moved OFF right-click (which equips) onto SPACE while
  // hovering. t108 owns that binding now; what matters here is that marking
  // has SOME input path and that it reads the hovered item.
  delegated:/if\(e\.code!=='Space' && e\.key!==' '\) return;/.test(code),
  skipsWhenOrbHeld:/TIP\.dataset\.item/.test(code),
  sKey:/if\(e\.key!=='s' && e\.key!=='S'\) return;/.test(code),
  ignoresTextFields:/INPUT\|TEXTAREA\|SELECT/.test(code.slice(code.indexOf("e.key!=='s'"))),
  sDoesNothingUnmarked:/if\(!SELL\.marks\.size\) return;/.test(code),
  repaintsAfterGrids:/\['drawInv','drawStash','refreshAll'\]\.forEach\(wrap\)/.test(code)
};
R.inputOk = Object.values(R.input).every(Boolean);
// ---- 7. craft is off Mara, salvage kept ------------------------------
// v233: salvage went too — marked-sell replaced it, so the vestigial button
// to a worse version of the same flow was removed rather than kept.
R.mara = { craftGone:!/id:'vCraft'/.test(code), salvageKept:!/id:'vSalv'/.test(code),
           craftPanelStillExists:/function craftPanel\(\)/.test(code) };
R.craftRemovedNotDeleted = R.mara.craftGone && R.mara.craftPanelStillExists;
console.log(JSON.stringify(R,null,1));
