// Garrick has ONE screen and nothing else; gold shows as a pickup, not a toast
const fs=require('fs'), vm=require('vm');
const {JSDOM}=require('jsdom');
const src=fs.readFileSync('work.html','utf8');
const code=src.replace(/\/\*[\s\S]*?\*\//g,'');
const R={};

// ---- 1. ⚠ NOTHING ELSE REACHABLE FROM GARRICK OR MARA ---------------
{
  R.doors = {
    garrickRoutesCraft:/tab==='craft'/.test(code),
    garrickRoutesSalvage:/tab==='salvage'/.test(code),
    salvagePanelGone:!/salvagePanel/.test(code),
    maraSalvageBtn:/id:'vSalv'/.test(code),
    maraCraftBtn:/id:'vCraft'/.test(code),
    tabBarStubbed:/function garTabBar\(active\)\{ return ''; \}/.test(code)
  };
  R.nothingElseReachable =
       !R.doors.garrickRoutesCraft && !R.doors.garrickRoutesSalvage
    && R.doors.salvagePanelGone && !R.doors.maraSalvageBtn
    && !R.doors.maraCraftBtn && R.doors.tabBarStubbed;
  // the bodies still exist — removed the doors, not the rooms
  R.bodiesKept = { craftPanel:/function craftPanel\(\)/.test(code),
                   salvageBody:/function garSalvageBody\(\)/.test(code) };
}
// ---- 2. garrickPanel lands on the board whatever it is passed --------
{
  const a=src.indexOf('window.garrickPanel=function(tab){');
  const b=src.indexOf('function garWireTabs');
  function call(tab){
    const seen=[];
    const sb={ console, GAR:{tab:null},
      garSlotsBody:()=>{ seen.push('board'); return ''; },
      stationPanel:(t)=>seen.push('panel:'+t),
      garWide:()=>{}, garWireTabs:()=>{}, garSafeClick:()=>{},
      document:{querySelectorAll:()=>[]}, ahErr:()=>{} };
    sb.window=sb; vm.createContext(sb);
    vm.runInContext(src.slice(a,b)+'\nthis.P=window.garrickPanel;', sb, {filename:'g.js'});
    sb.P(tab);
    return seen;
  }
  R.routing = { none:call(undefined), slots:call('slots'),
                craft:call('craft'), salvage:call('salvage') };
  R.alwaysTheBoard = ['none','slots','craft','salvage']
    .every(k=>R.routing[k].includes('board'));
}
// ---- 3. the gold pickup replaces the toast ---------------------------
{
  const a=src.indexOf('function goldPop(amount){');
  const b=src.indexOf('window.goldPop=goldPop;');
  const dom=new JSDOM('<body></body>');
  let timers=0;
  const sb={ console, document:dom.window.document,
    fmt:(n)=>String(n).replace(/\B(?=(\d{3})+(?!\d))/g,','),
    setTimeout:()=>{ timers++; }, ahErr:()=>{} };
  sb.window=sb; vm.createContext(sb);
  vm.runInContext(src.slice(a,b)+'\nthis.G=goldPop;', sb, {filename:'p.js'});
  sb.G(8838);
  const wrap=dom.window.document.getElementById('goldPops');
  R.pop = { created:!!wrap, text:(wrap.querySelector('.gPop span')||{}).textContent,
            hasCoin:!!wrap.querySelector('.gPopCoin') };
  // several stack rather than replacing
  sb.G(120); sb.G(4500);
  R.pop.stacked = wrap.querySelectorAll('.gPop').length;
  // zero is not an event
  sb.G(0);
  R.pop.zeroIgnored = wrap.querySelectorAll('.gPop').length===3;
  R.popOk = R.pop.created && R.pop.text==='+8,838 Gold'
         && R.pop.hasCoin && R.pop.stacked===3 && R.pop.zeroIgnored;
  // ⚠ it must clean up by BOTH routes or the DOM grows forever
  R.cleanup = { onAnimEnd:/addEventListener\('animationend'/.test(code),
                fallbackTimer:timers>=3 };
  R.cleansUp = R.cleanup.onAnimEnd && R.cleanup.fallbackTimer;
}
// ---- 4. selling uses the pop, not a sentence -------------------------
R.sellUses = {
  popCalled:/SELL\.marks\.clear\(\);\s*\n\s*goldPop\(gold\);/.test(code),
  toastGone:!/Sold '\+n\+' item/.test(code),
  salvageMatches:/if\(window\.goldPop\) goldPop\(val\)/.test(code)
};
R.sellUsesPop = Object.values(R.sellUses).every(Boolean);
console.log(JSON.stringify(R,null,1));
