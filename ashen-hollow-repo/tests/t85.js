// the workshop board: master/detail, wide only here, selection survives a buy
const fs=require('fs'), vm=require('vm');
const {JSDOM}=require('jsdom');
const src=fs.readFileSync('work.html','utf8');
const code=src.replace(/\/\*[\s\S]*?\*\//g,'');
const R={};

const a=src.indexOf('function garSlotsBody(){');
const b=src.indexOf('function fmtShort(n){');
const fa=src.indexOf('function fmtShort(n){');
const fb=src.indexOf('\n}', src.indexOf(": String(n);", fa))+2;

function build(sel, slots, gold){
  const RG={};
  Object.keys(slots).forEach(k=>RG[k]=slots[k]);
  const sb={ console, Math, S:{gold},
    GAR:{tab:'slots', slotSel:sel},
    SKILLS:{ multishot:{n:'Multishot'}, rapid:{n:'Rapid Fire'},
             sentry:{n:'Sentry'}, rain:{n:'Rain of Arrows'} },
    fmt:(n)=>String(n).replace(/\B(?=(\d{3})+(?!\d))/g,','),
    supportSlots:(id)=>RG[id]||1,
    SUPPORT_SLOTS_MAX:5,
    SUPPORT_SLOT_COST:{2:12000,3:55000,4:240000,5:900000},
    nextSlotCost:(id)=>{ const h=RG[id]||1;
      return h>=5?null:({2:12000,3:55000,4:240000,5:900000})[h+1]; },
    ahErr:()=>{} };
  sb.window=sb;
  Object.assign(sb.window,{ supportSlots:sb.supportSlots, SUPPORT_SLOTS_MAX:5,
    nextSlotCost:sb.nextSlotCost, SKILLS:sb.SKILLS,
    SUPPORT_SLOT_COST:sb.SUPPORT_SLOT_COST });
  vm.createContext(sb);
  vm.runInContext(src.slice(fa,fb)+'\n'+src.slice(a,b)+'\nthis.B=garSlotsBody; this.G=GAR;',
    sb, {filename:'g.js'});
  const doc=new JSDOM('<div id="winBody">'+sb.B()+'</div>').window.document;
  return { doc, GAR:sb.G };
}
const SLOTS={ multishot:1, rapid:3, sentry:5, rain:1 };

// ---- 1. left list shows every skill with its count --------------------
{
  const {doc}=build('multishot', SLOTS, 500000);
  const rows=[...doc.querySelectorAll('.gsRow')];
  R.list = rows.map(r=>r.querySelector('.gsRowName').textContent+' '+
                       r.querySelector('.gsRowSlots').textContent);
  R.selectedRow=(doc.querySelector('.gsRow.on .gsRowName')||{}).textContent;
  R.maxedRowFlagged=!!doc.querySelector('.gsRow.done');
  R.listOk = rows.length===4 && R.selectedRow==='Multishot' && R.maxedRowFlagged;
}
// ---- 2. detail: five big sockets, the next one highlighted ------------
{
  const {doc}=build('multishot', SLOTS, 500000);
  const socks=[...doc.querySelectorAll('.gsSock')];
  R.detail = { name:(doc.querySelector('.gsName')||{}).textContent,
    sub:(doc.querySelector('.gsSub')||{}).textContent.replace(/\s+/g,' '),
    sockets:socks.length,
    owned:doc.querySelectorAll('.gsSock.own').length,
    next:doc.querySelectorAll('.gsSock.next').length,
    far:doc.querySelectorAll('.gsSock.far').length,
    // v246: the per-socket caption was removed — it was the flex minimum that
    // forced the row out through the frame. The dot and the number carry it.
    labels:socks.map(s=>s.querySelector('.gsSockNo').textContent) };
  R.detailOk = R.detail.sockets===5 && R.detail.owned===1
            && R.detail.next===1 && R.detail.far===3
            && R.detail.labels.join('')==='12345';
}
// ---- 3. the action box, all three states ------------------------------
{
  const rich=build('multishot', SLOTS, 500000).doc;
  R.rich = { big:(rich.querySelector('.gsActBig')||{}).textContent,
             cost:(rich.querySelector('.gsActCost')||{}).textContent.replace(/\s+/g,' '),
             hasBuy:!!rich.querySelector('.gsBuy'),
             buysSel:(rich.querySelector('.gsBuy')||{dataset:{}}).dataset.buyslot };
  const poor=build('multishot', SLOTS, 500).doc;
  R.poor = { hasBuy:!!poor.querySelector('.gsBuy'),
             short:(poor.querySelector('.gsShort')||{}).textContent,
             flagged:!!poor.querySelector('.gsAct.poor') };
  const max=build('sentry', SLOTS, 500000).doc;
  R.maxed = { big:(max.querySelector('.gsActBig')||{}).textContent,
              hasBuy:!!max.querySelector('.gsBuy'),
              flagged:!!max.querySelector('.gsAct.maxed') };
  R.actionsOk = R.rich.hasBuy && R.rich.buysSel==='multishot'
             && !R.poor.hasBuy && /more/.test(R.poor.short||'')
             && !R.maxed.hasBuy && R.maxed.flagged;
}
// ---- 4. gold is stated properly, not as a footnote --------------------
{
  const {doc}=build('multishot', SLOTS, 13897101);
  R.gold = { label:(doc.querySelector('.gsGold span')||{}).textContent,
             value:(doc.querySelector('.gsGold b')||{}).textContent,
             hasCoin:!!doc.querySelector('.gsCoin') };
  R.goldOk = R.gold.value==='13,897,101' && R.gold.hasCoin;
}
// ---- 5. ⚠ selection must SURVIVE the repaint after a purchase ---------
R.selection = {
  onGAR:/GAR\.slotSel/.test(code),
  defaulted:/if\(!GAR\.slotSel \|\| !SK\[GAR\.slotSel\]\) GAR\.slotSel = ids\[0\];/.test(code),
  clickRepaints:/GAR\.slotSel=el\.dataset\.slotsel; garrickPanel\('slots'\)/.test(code)
};
R.selectionSurvives = Object.values(R.selection).every(Boolean);
// a stale id must not blank the panel
{
  const {doc,GAR}=build('deletedSkill', SLOTS, 1000);
  R.staleSel = { recoveredTo:GAR.slotSel, rendered:!!doc.querySelector('.gsName') };
  R.staleSafe = R.staleSel.rendered;
}
// ---- 6. wide ONLY on this tab -----------------------------------------
R.wide = {
  ruleExists:/#ahWin\.wide\{ width:660px \}/.test(src),
  setOnSlots:/garWide\(GAR\.tab==='slots'\)/.test(code),
  timesCalled:(code.match(/garWide\(GAR\.tab==='slots'\)/g)||[]).length
};
R.wideOnlyHere = R.wide.ruleExists && R.wide.setOnSlots && R.wide.timesCalled>=2;
R.staleToastFixed = !/all three support slots/.test(code);
console.log(JSON.stringify(R,null,1));
