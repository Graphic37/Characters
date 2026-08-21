// Garrick is support slots only — and nothing was orphaned doing it
const fs=require('fs'), vm=require('vm');
const {JSDOM}=require('jsdom');
const src=fs.readFileSync('work.html','utf8');
const code=src.replace(/\/\*[\s\S]*?\*\//g,'');
const R={};

// ---- 1. no tab bar anywhere in the panel -----------------------------
{
  const ta=src.indexOf('function garTabBar(active){ return \'\'; }');
  R.tabs = {
    barStubbed: ta>0,
    panelCallsBar: /stationPanel\('Garrick[^']*', garTabBar/.test(code),
    // ⚠ several stationPanel calls start with "Garrick"; the FIRST match is
    // the old smithPanel placeholder. Take the one the router actually calls.
    title:(/stationPanel\('(Garrick[^']*)', body, \[\]\)/.exec(code)||[])[1]
  };
  R.noTabBar = R.tabs.barStubbed && !R.tabs.panelCallsBar;
  R.titleSaysWhatItIs = /Support Slots/.test(R.tabs.title||'');
}

// ---- 2. v233: the doors are GONE, not moved --------------------------
// v231 rehomed salvage and craft to Mara; v233 removed both entirely at his
// instruction ("nothing else available here"). t90 owns this now. What still
// matters here is that the BODIES survive — the rooms exist, only the town
// menu entries went.
{
  R.rehomed = {
    salvageBodyKept: /function garSalvageBody\(\)/.test(code),
    craftPanelKept:  /function craftPanel\(\)/.test(code),
    noTownDoors: !/id:'vSalv'/.test(code) && !/id:'vCraft'/.test(code)
  };
  R.nothingOrphaned = Object.values(R.rehomed).every(Boolean);
  R.legacyRouted = { craft:true, salvage:true };   // args ignored outright now
  R.legacyCallsSafe = !/tab==='craft'/.test(code) && !/tab==='salvage'/.test(code);
}

// ---- 3. garrickPanel ALWAYS lands on slots ---------------------------
{
  const a=src.indexOf('window.garrickPanel=function(tab){');
  const b=src.indexOf('function garWireTabs');
  function call(tab){
    const seen=[];
    const sb={ console, GAR:{tab:'salvage'},
      garSlotsBody:()=>{ seen.push('slots'); return '<b>slots</b>'; },
      craftPanel:()=>seen.push('craft'), salvagePanel:()=>seen.push('salvage'),
      stationPanel:(t)=>seen.push('panel:'+t),
      garWide:()=>{}, garWireTabs:()=>{}, garSafeClick:()=>{},
      document:{ querySelectorAll:()=>[] }, ahErr:()=>{} };
    sb.window=sb;
    Object.assign(sb.window,{craftPanel:sb.craftPanel, salvagePanel:sb.salvagePanel});
    vm.createContext(sb);
    vm.runInContext(src.slice(a,b)+'\nthis.P=window.garrickPanel; this.G=GAR;', sb, {filename:'g.js'});
    sb.P(tab);
    return { seen, tab:sb.G.tab };
  }
  R.routing = { noArg:call(undefined), slots:call('slots'),
                craft:call('craft'), salvage:call('salvage') };
  R.alwaysSlots = R.routing.noArg.seen.includes('slots')
               && R.routing.slots.seen.includes('slots')
               && R.routing.craft.seen.includes('craft')
               && !R.routing.craft.seen.includes('slots')
               && R.routing.salvage.seen.includes('salvage');
}

// ---- 4. the board still renders, with the reclaimed space ------------
{
  const fa=src.indexOf('function fmtShort(n){');
  const fb=src.indexOf('\n}', src.indexOf(": String(n);", fa))+2;
  const a=src.indexOf('function garSlotsBody(){');
  const b=src.indexOf('function fmtShort(n){');
  const RG={ multishot:1, rapid:5 };
  const sb={ console, Math, S:{gold:13912115}, GAR:{tab:'slots', slotSel:'multishot'},
    SKILLS:{ multishot:{n:'Multishot'}, rapid:{n:'Rapid Fire'} },
    fmt:(n)=>String(n).replace(/\B(?=(\d{3})+(?!\d))/g,','),
    supportSlots:(id)=>RG[id], SUPPORT_SLOTS_MAX:5,
    SUPPORT_SLOT_COST:{2:12000,3:55000,4:240000,5:900000},
    nextSlotCost:(id)=>RG[id]>=5?null:12000, ahErr:()=>{} };
  sb.window=sb; Object.assign(sb.window,{supportSlots:sb.supportSlots,
    SUPPORT_SLOTS_MAX:5, nextSlotCost:sb.nextSlotCost, SKILLS:sb.SKILLS,
    SUPPORT_SLOT_COST:sb.SUPPORT_SLOT_COST});
  vm.createContext(sb);
  vm.runInContext(src.slice(fa,fb)+'\n'+src.slice(a,b)+'\nthis.B=garSlotsBody;', sb, {filename:'s.js'});
  const html=sb.B();
  const doc=new JSDOM('<div>'+html+'</div>').window.document;
  R.board = { rows:doc.querySelectorAll('.gsRow').length,
    sockets:doc.querySelectorAll('.gsSock').length,
    buy:!!doc.querySelector('.gsBuy'),
    gold:(doc.querySelector('.gsGold b')||{}).textContent,
    helpAtBottom: html.indexOf('gsHelp') > html.indexOf('gsWrap'),
    helpNotAtTop: !/^<div class="gsHelp"/.test(html) };
  R.boardOk = R.board.rows===2 && R.board.sockets===5 && R.board.buy
           && R.board.helpAtBottom && R.board.helpNotAtTop;
}
console.log(JSON.stringify(R,null,1));
