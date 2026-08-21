// the workshop chrome: X on the frame, no dead tab, one close control
const fs=require('fs'), vm=require('vm');
const {JSDOM}=require('jsdom');
const src=fs.readFileSync('work.html','utf8');
const code=src.replace(/\/\*[\s\S]*?\*\//g,'');
const R={};

// ---- 1. the X sits ON the frame, not inside the content --------------
{
  const css=src.slice(src.indexOf('<style>'), src.indexOf('</style>'))
               .replace(/\/\*[\s\S]*?\*\//g,'');
  const base=/#ahWin \.close\{([^}]*)\}/.exec(css)[1].replace(/\s+/g,' ');
  const over=/body\[data-skin="forged"\] #ahWin > button\.close\{([^}]*)\}/.exec(css)[1].replace(/\s+/g,' ');
  const n=(r,p)=>{ const m=new RegExp(p+':(-?[\\d.]+)px').exec(r); return m?+m[1]:null; };
  const frame=+(/border-width:(\d+)px !important/.exec(css)||[])[1];
  R.closeBtn = { frameWidth:frame,
    baseRight:n(base,'right'), baseTop:n(base,'top'),
    nowRight:n(over,'right'), nowTop:n(over,'top'),
    size:n(over,'width') };
  // ⚠ absolute inside #ahWin resolves to the PADDING box, so a positive offset
  // is INSIDE the frame. It must be negative to reach the frame band.
  R.movedOntoFrame = R.closeBtn.nowRight<0 && R.closeBtn.nowTop<0;
  // and it must not overshoot past the outer edge of the frame
  R.staysOnFrame = Math.abs(R.closeBtn.nowTop) + R.closeBtn.size <= frame + R.closeBtn.size;
  R.higherThanBefore = R.closeBtn.nowTop < R.closeBtn.baseTop;
}

// ---- 2. the tab bar itself went in v231 ------------------------------
// Repair was removed here in v230; v231 removed the whole bar when Garrick
// became single-purpose, and t88 covers the rehoming of salvage and craft.
// Asserting "the bar contains salvage and craft" would now be a green test
// for a control the panel no longer has.
{
  R.tabs=[];
  R.repairGone = !/'repair'/.test(code);
  R.realTabsKept = /function salvagePanel\(\)\{/.test(code)
                && /id:'vCraft'/.test(code);   // rehomed, not deleted
  R.routerCannotReachIt = !/GAR\.tab==='repair'/.test(code);
  R.bodyStubbed = /function garRepairBody\(\)\{ return ''; \}/.test(code);
}

// ---- 3. ONE close control on the panel ------------------------------
{
  R.actions = {
    // v231 dropped the tab bar from the call; the assertion is still "no
    // action buttons", which is the empty array at the end.
    slotsPanelActions:/stationPanel\('Garrick[^']*', body, \[\]\);/.test(code),
    frameXStillThere:/<button class="close" onclick="closeWin\(\)">/.test(src)
  };
  R.oneCloseOnly = R.actions.slotsPanelActions && R.actions.frameXStillThere;
}

// ---- 4. the slots board still works after the chrome change ---------
{
  const fa=src.indexOf('function fmtShort(n){');
  const fb=src.indexOf('\n}', src.indexOf(": String(n);", fa))+2;
  const a=src.indexOf('function garSlotsBody(){');
  const b=src.indexOf('function fmtShort(n){');
  const RG={ multishot:1, rapid:5 };
  const sb={ console, Math, S:{gold:500000}, GAR:{tab:'slots', slotSel:'multishot'},
    SKILLS:{ multishot:{n:'Multishot'}, rapid:{n:'Rapid Fire'} },
    fmt:(n)=>String(n), supportSlots:(id)=>RG[id], SUPPORT_SLOTS_MAX:5,
    SUPPORT_SLOT_COST:{2:12000,3:55000,4:240000,5:900000},
    nextSlotCost:(id)=>RG[id]>=5?null:12000, ahErr:()=>{} };
  sb.window=sb; Object.assign(sb.window,{supportSlots:sb.supportSlots,
    SUPPORT_SLOTS_MAX:5, nextSlotCost:sb.nextSlotCost, SKILLS:sb.SKILLS,
    SUPPORT_SLOT_COST:sb.SUPPORT_SLOT_COST});
  vm.createContext(sb);
  vm.runInContext(src.slice(fa,fb)+'\n'+src.slice(a,b)+'\nthis.B=garSlotsBody;', sb, {filename:'g.js'});
  const doc=new JSDOM('<div>'+sb.B()+'</div>').window.document;
  R.board = { rows:doc.querySelectorAll('.gsRow').length,
              sockets:doc.querySelectorAll('.gsSock').length,
              buy:!!doc.querySelector('.gsBuy'),
              gold:!!doc.querySelector('.gsGold b') };
  R.boardIntact = R.board.rows===2 && R.board.sockets===5 && R.board.buy;
}
console.log(JSON.stringify(R,null,1));
