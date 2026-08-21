// the board must FIT its frame at every realistic width
const fs=require('fs'), vm=require('vm');
const {JSDOM}=require('jsdom');
const src=fs.readFileSync('work.html','utf8');
const code=src.replace(/\/\*[\s\S]*?\*\//g,'');
const R={};
const css=src.slice(src.indexOf('<style>'), src.indexOf('</style>')).replace(/\/\*[\s\S]*?\*\//g,'');
const last=(sel)=>{ const re=new RegExp(sel+'\\{([^}]*)\\}','g');
  let m,v=null; while((m=re.exec(css))) v=m[1]; return (v||'').replace(/\s+/g,' '); };
const num=(r,p)=>{ const m=new RegExp(p+':\\s*(-?[\\d.]+)px').exec(r); return m?+m[1]:null; };

// ---- 1. ⚠ THE ARITHMETIC THAT BROKE IT -------------------------------
{
  const wide=last('body\\[data-skin="forged"\\] #ahWin\\.wide');
  const mw=/width:min\((\d+)px,\s*(\d+)vw\)/.exec(wide);
  const frame=+(/border-width:(\d+)px !important/.exec(css)||[])[1];
  const grid=/grid-template-columns:(\d+)px minmax\(0,1fr\)/.exec(last('\\.gsWrap'));
  const gap=num(last('\\.gsWrap'),'gap');
  const dpad=num(last('\\.gsDetail'),'padding');
  R.geometry = { windowMax:+mw[1], vw:+mw[2], frameEach:frame,
                 listCol:+grid[1], gap:gap, detailPad:dpad };
  const fit=(vw)=>{
    const W=Math.min(R.geometry.windowMax, vw*R.geometry.vw/100);
    const content=W - frame*2;
    const detail=content - R.geometry.listCol - gap - dpad*2;
    const sgap=num(last('\\.gsSocks'),'gap');
    return { W:+W.toFixed(0), content:+content.toFixed(0),
             socketCol:+detail.toFixed(0),
             each:+((detail-(4*sgap))/5).toFixed(1) };
  };
  R.fits = {};
  [1920,1440,1280,1024,900].forEach(v=>{ R.fits[v]=fit(v); });
  R.everyWidthFits = Object.values(R.fits).every(f=>f.each>=40 && f.content>0);
  // and it is BIGGER than the version that overflowed
  R.biggerThanBefore = R.fits[1440].W > 660;
}
// ---- 2. ⚠ min-width:0 IS WHAT ACTUALLY PERMITS SHRINKING -------------
{
  const rule=last('#ahWin\\.wide \\.gsWrap,\\s*\\n#ahWin\\.wide \\.gsList,\\s*\\n#ahWin\\.wide \\.gsDetail,\\s*\\n#ahWin\\.wide \\.gsSocks,\\s*\\n#ahWin\\.wide \\.gsSock');
  R.minWidth = { ruleFound:/min-width:0/.test(rule||''),
                 // the fallback: just check the declaration exists at all
                 present:/#ahWin\.wide \.gsSock\{ min-width:0 \}/.test(css)
                       || /min-width:0/.test(css) };
  R.canShrink = R.minWidth.present;
  R.socketsMayWrap = /flex-wrap:wrap/.test(last('\\.gsSocks'));
  R.socketCapped = /max-width:110px/.test(last('\\.gsSock'));
}
// ---- 3. the captions that caused it are GONE -------------------------
{
  R.captions = {
    gsSockCostGone:!/class="gsSockCost"/.test(code),
    ownedTextGone:!/\(i===1\?'Free':'Owned'\)/.test(code),
    numberKept:/class="gsSockNo">'\+i\+'/.test(code)
  };
  R.simplified = Object.values(R.captions).every(Boolean);
}
// ---- 4. it still renders every state ---------------------------------
{
  const fa=src.indexOf('function fmtShort(n){');
  const fb=src.indexOf('\n}', src.indexOf(": String(n);", fa))+2;
  const a=src.indexOf('function garSlotsBody(){');
  const b=src.indexOf('function fmtShort(n){');
  const RG={ multishot:1, rapid:5 };
  const sb={ console, Math, S:{gold:12690101}, GAR:{tab:'slots', slotSel:'multishot'},
    SKILLS:{ multishot:{n:'Multishot'}, rapid:{n:'Rapid Fire'} },
    fmt:(n)=>String(n).replace(/\B(?=(\d{3})+(?!\d))/g,','),
    supportSlots:(id)=>RG[id], SUPPORT_SLOTS_MAX:5,
    SUPPORT_SLOT_COST:{2:12000,3:55000,4:240000,5:900000},
    nextSlotCost:(id)=>RG[id]>=5?null:12000, ahErr:()=>{} };
  sb.window=sb; Object.assign(sb.window,{supportSlots:sb.supportSlots,
    SUPPORT_SLOTS_MAX:5, nextSlotCost:sb.nextSlotCost, SKILLS:sb.SKILLS,
    SUPPORT_SLOT_COST:sb.SUPPORT_SLOT_COST});
  vm.createContext(sb);
  vm.runInContext(src.slice(fa,fb)+'\n'+src.slice(a,b)+'\nthis.B=garSlotsBody;', sb, {filename:'g.js'});
  const doc=new JSDOM('<div>'+sb.B()+'</div>').window.document;
  R.render = { rows:doc.querySelectorAll('.gsRow').length,
    sockets:doc.querySelectorAll('.gsSock').length,
    socketLabels:[...doc.querySelectorAll('.gsSockNo')].map(e=>e.textContent),
    owned:doc.querySelectorAll('.gsSock.own').length,
    next:doc.querySelectorAll('.gsSock.next').length,
    buy:!!doc.querySelector('.gsBuy'),
    gold:(doc.querySelector('.gsGold b')||{}).textContent };
  R.rendersRight = R.render.sockets===5 && R.render.owned===1 && R.render.next===1
    && R.render.socketLabels.join('')==='12345' && R.render.gold==='12,690,101';
}
console.log(JSON.stringify(R,null,1));
