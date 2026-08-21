// ⚠ INTEGRATION: proximity -> prompt -> E -> panel -> buy -> slot unlocked.
// NOT "the dispatcher works". Every earlier suite proved a single link.
const fs=require('fs'), vm=require('vm');
const {JSDOM}=require('jsdom');
const src=fs.readFileSync('work.html','utf8');
const code=src.replace(/\/\*[\s\S]*?\*\//g,'');
const R={};

// ---- LINK 1: does the proximity picker even CONSIDER Garrick? ---------
{
  const a=src.indexOf("  /* \u26a0\u26a0 THE SECOND SKIP-LIST");
  const b=src.indexOf('  nearStation=best;');
  const loop=src.slice(a,b);
  R.link1 = {
    noNameSkip: !/s\.name==='Garrick'/.test(loop),
    usesFlag: /if\(s\.noPrompt\) continue;/.test(loop)
  };
  // run it
  const stations=[
    {name:'Garrick', pos:{x:0,z:0}, r:3.8},
    {name:'Mara',    pos:{x:30,z:0}, r:3.8},
    {name:'Scenery', pos:{x:1,z:0}, r:3.8, noPrompt:true}
  ];
  function pick(at){
    const sb={ console, Math, stations, player:{position:{x:at[0],z:at[1]}} };
    sb.window=sb; vm.createContext(sb);
    vm.runInContext('let best=null,bestD=1e9;\n'+
      loop.slice(loop.indexOf('for(const s of stations)'))+
      '\nthis.B=best;', sb, {filename:'p.js'});
    return sb.B && sb.B.name;
  }
  R.link1.atGarrick = pick([1,0]);
  R.link1.atMara    = pick([30,0]);
  R.link1.sceneryNeverWins = pick([1.05,0]) === 'Garrick';
  R.link1.ok = R.link1.atGarrick==='Garrick' && R.link1.atMara==='Mara'
            && R.link1.sceneryNeverWins;
}

// ---- LINK 2: E is not swallowed --------------------------------------
{
  const g=/if\(nearStation && nearStation\.noE\) return;/.test(code);
  R.link2 = { onlyNoE:g, noNameList:!/nearStation\.name==='Garrick' \|\| nearStation\.name==='Mara'/.test(code) };
  R.link2.ok = g && R.link2.noNameList;
}

// ---- LINK 3: E dispatches to Garrick's panel --------------------------
{
  const a=src.indexOf('function tryInteract(){');
  const b=src.indexOf("document.getElementById('winTitle').textContent=nearStation.title;");
  const calls=[];
  const sb={ console, WORLD:{mode:'TOWN'}, RIFT:{active:false}, winOpen:false,
    nearStation:{name:'Garrick', title:'t', body:'b', acts:[]},
    garrickPanel:(t)=>calls.push('panel:'+t),
    AH:{onStation:()=>false}, ahErr:()=>{} };
  sb.window=sb; sb.window.garrickPanel=sb.garrickPanel;
  vm.createContext(sb);
  vm.runInContext(src.slice(a,b)+'\n}\nthis.T=tryInteract;', sb, {filename:'i.js'});
  sb.T();
  R.link3 = { calls, ok: calls.some(c=>c.startsWith('panel:')) };
}

// ---- LINK 4: the panel IS the slot board (no tab bar since v231) ------
{
  // ⚠ this used to assert a SUPPORT SLOTS tab. The tab bar was removed when
  // Garrick became single-purpose, so asserting it would fail for the right
  // reason and hide link 5. What matters now is that E lands on the BOARD.
  const a=src.indexOf('window.garrickPanel=function(tab){');
  const b=src.indexOf('function garWireTabs');
  const seen=[];
  const sb={ console, GAR:{tab:null},
    garSlotsBody:()=>{ seen.push('slotBoard'); return ''; },
    stationPanel:(t)=>seen.push('panel:'+t),
    craftPanel:()=>seen.push('craft'), salvagePanel:()=>seen.push('salvage'),
    garWide:()=>{}, garWireTabs:()=>{}, garSafeClick:()=>{},
    document:{ querySelectorAll:()=>[] }, ahErr:()=>{} };
  sb.window=sb;
  vm.createContext(sb);
  vm.runInContext(src.slice(a,b)+'\nthis.P=window.garrickPanel;', sb, {filename:'t.js'});
  sb.P();
  R.link4 = { seen, landsOnBoard:seen.includes('slotBoard'),
              title:(seen.find(x=>x.startsWith('panel:'))||'') };
  R.link4.ok = R.link4.landsOnBoard && /Support Slots/.test(R.link4.title);
}

// ---- LINK 5: buying works end to end, and PERSISTS -------------------
{
  const a=src.indexOf('const SUPPORT_SLOT_COST');
  const b=src.indexOf('window.buySupportSlot = buySupportSlot;');
  const RG={ multishot:{supportSlots:1, sockets:[null]} };
  const sb={ console, Math, S:{gold:300000},
    gemFor:(id)=>RG[id], markStatsDirty:()=>{}, refreshAll:()=>{},
    updateSkillsPanel:()=>{}, ahErr:()=>{} };
  sb.window=sb;
  vm.createContext(sb);
  vm.runInContext(src.slice(a,b)+
    // ⚠ `this.S=supportSlots` OVERWROTE the sandbox's own `S` (the save
    // object), so `S.gold` read undefined and every purchase was refused for
    // "gold". The suite blamed the shop for its own name collision.
    '\nthis.B=buySupportSlot; this.N=nextSlotCost; this.SLOTS=supportSlots;', sb, {filename:'b.js'});
  const gold=()=>sb.S.gold;
  const before={ gold:gold(), slots:sb.SLOTS('multishot') };
  const buy=sb.B('multishot');
  const after={ gold:gold(), slots:sb.SLOTS('multishot') };
  R.link5 = { before, buy, after,
    goldFell: before.gold-after.gold === buy.cost,
    slotRose: after.slots === before.slots+1,
    // the SKILL PANEL reads supportSlots(), so the socket is live immediately
    panelSeesIt: sb.SLOTS('multishot')===2,
    // and it lives on the gem state, which rides the save
    onGemState: RG.multishot.supportSlots===2 };
  R.link5.ok = R.link5.goldFell && R.link5.slotRose && R.link5.panelSeesIt
            && R.link5.onGemState;
}
R.wholePathWorks = R.link1.ok && R.link2.ok && R.link3.ok && R.link4.ok && R.link5.ok;
console.log(JSON.stringify(R,null,1));
