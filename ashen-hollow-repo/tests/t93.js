// board tied to Veyra; DUMP migrated then retired; nothing lost
const fs=require('fs'), vm=require('vm');
const {JSDOM}=require('jsdom');
const src=fs.readFileSync('work.html','utf8');
const code=src.replace(/\/\*[\s\S]*?\*\//g,'');
const R={};

// ---- 1. the board is Veyra's again ----------------------------------
R.board = {
  veyraOpens:/nearStation\.name==='Veyra'\)\{ winOpen=true; window\.questPanel\(\)/.test(code),
  noJKey:!/e\.key!=='j'/.test(code),
  noToggle:!/questBoardToggle/.test(code),
  trackerInert:/#questBoard\{ pointer-events:none \}/.test(src),
  // ⚠ this matched `questBoard2`'s own backdrop click-to-close, which is the
  // BOARD, not the tracker. Assert on the tracker's element id exactly.
  trackerHasNoClick:!/QUESTS\.el[\s\S]{0,200}addEventListener\('click'/.test(code),
  gatesIntact:/function questAtVeyra\(\)/.test(code)
};
R.tiedToVeyra = Object.values(R.board).every(Boolean);

// ---- 2. DUMP is out of the purchase order ---------------------------
{
  const m=/const STASH_EXTRA_ORDER = \[([^\]]*)\]/.exec(code)[1];
  R.order = m.replace(/'/g,'').split(',');
  R.dumpNotBuyable = !R.order.includes('st3') && R.order.length===7;
}

// ---- 3. ⚠ THE MIGRATION MOVES EVERYTHING, OR KEEPS THE TAB ----------
{
  const a=src.indexOf('const STASH_BASE =');
  const b=src.indexOf('/* the player\'s names, persisted with the save */');
  function run(dumpItems, roomInGear, bought){
    const CONT={};
    ['st0','st1','st2','st3','st4','st5','st6','st7','st8','st9','st10','st11']
      .forEach(id=>CONT[id]={items:[]});
    CONT.st3.items=dumpItems.slice();
    let space=roomInGear;
    const sb={ console:{warn:(m)=>sb.__w.push(m)}, Math,
      S:{gold:0, stashBought:bought||0, dumpMigrated:0}, CONT,
      stashTabFor:()=>'st0',
      addItem:(c,it)=>{ if(c===CONT.st0 && space<=0) return false;
                        if(c===CONT.st0) space--; c.items.push(it); return true; },
      fmt:String, toast:(m)=>sb.__t.push(m),
      refreshStashTabs:()=>{}, refreshAll:()=>{}, ahErr:()=>{} };
    sb.__t=[]; sb.__w=[]; sb.window=sb; Object.assign(sb.window,{CONT});
    vm.createContext(sb);
    vm.runInContext(src.slice(a,b)+
      '\nthis.M=migrateDumpTab; this.U=stashTabUnlocked; this.C=CONT; this.SS=S;',
      sb, {filename:'m.js'});
    return sb;
  }
  const seven=[1,2,3,4,5,6,7].map(n=>({uid:n}));
  // plenty of room: everything moves, tab retires
  const ok=run(seven, 99);
  R.fullMove = { result:ok.M(), dumpLeft:ok.C.st3.items.length,
                 gearNow:ok.C.st0.items.length, migrated:ok.SS.dumpMigrated,
                 dumpVisible:ok.U('st3'), toasts:ok.__t };
  R.movedEverything = R.fullMove.dumpLeft===0 && R.fullMove.gearNow===7
                   && R.fullMove.migrated===1 && R.fullMove.dumpVisible===false;
  // NO room: nothing lost, tab stays visible, not marked done
  const tight=run(seven, 0);
  const r2=tight.M();
  R.noRoom = { moved:r2.moved, left:r2.left, done:r2.done,
               total:tight.C.st3.items.length+tight.C.st0.items.length,
               dumpVisible:tight.U('st3'), migrated:tight.SS.dumpMigrated };
  R.nothingLost = R.noRoom.total===7 && R.noRoom.dumpVisible===true
               && R.noRoom.migrated===0;
  // PARTIAL room: some move, the rest stay, tab stays
  const part=run(seven, 3);
  const r3=part.M();
  R.partial = { moved:r3.moved, left:r3.left,
                total:part.C.st3.items.length+part.C.st0.items.length,
                dumpVisible:part.U('st3') };
  R.partialSafe = R.partial.total===7 && R.partial.moved===3
               && R.partial.left===4 && R.partial.dumpVisible===true;
  // an already-empty dump retires silently
  const none=run([], 99);
  R.empty = { result:none.M(), visible:none.U('st3') };
  R.emptyRetires = R.empty.result.done===true && R.empty.visible===false;
}
// ---- 4. migration runs BEFORE the selected-tab guard -----------------
{
  const mi=code.indexOf('migrateDumpTab()');
  const gi=code.indexOf("!stashTabUnlocked(stashTab)) stashTab='st0'");
  R.bootOrder = { migrateAt:mi>0, guardAt:gi>0, migrateFirst: mi>0 && gi>mi };
}
// ---- 5. copy and naming ---------------------------------------------
R.copy = {
  title:/<div class="sbTitle">Buy Stash Tab<\/div>/.test(code),
  what:/Adds one permanent general-purpose storage tab\./.test(code),
  plusTooltip:/plus\.title='Buy Stash Tab/.test(code),
  namedStash:/'STASH '\+\(i-4\)/.test(code),
  // ⚠ the remaining `'TAB '+(i+1)` is STASH_RULES' internal label for the
  // free tabs, not the strip's display name. Assert on the DISPLAY name.
  noTabN:!/n: f\? f\.n : 'TAB '/.test(code)
};
R.copyOk = Object.values(R.copy).every(Boolean);
console.log(JSON.stringify(R,null,1));
