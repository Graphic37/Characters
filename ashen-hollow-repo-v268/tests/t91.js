// four base tabs + a priced plus; and NOTHING can end up in a locked tab
const fs=require('fs'), vm=require('vm');
const {JSDOM}=require('jsdom');
const src=fs.readFileSync('work.html','utf8');
const code=src.replace(/\/\*[\s\S]*?\*\//g,'');
const R={};
const a=src.indexOf('const STASH_BASE =');
const b=src.indexOf('/* the player\'s names, persisted with the save */');

function model(bought, contents){
  const CONT={};
  ['st0','st1','st2','st3','st4','st5','st6','st7','st8','st9','st10','st11']
    .forEach(id=>CONT[id]={items:(contents&&contents[id])||[]});
  const sb={ console, Math, S:{gold:9e9, stashBought:bought}, CONT,
    fmt:String, toast:(m)=>sb.__t.push(m),
    refreshStashTabs:()=>{}, refreshAll:()=>{}, ahErr:()=>{} };
  sb.__t=[]; sb.window=sb; Object.assign(sb.window,{CONT});
  vm.createContext(sb);
  vm.runInContext(src.slice(a,b)+
    '\nthis.U=stashTabUnlocked; this.C=stashTabCost; this.B=stashBought;'+
    '\nthis.Buy=stashBuyTab; this.EX=STASH_EXTRA_ORDER; this.SS=S;', sb, {filename:'m.js'});
  return sb;
}
// ---- 1. a fresh save shows exactly four ------------------------------
{
  const m=model(0);
  const all=['st0','st1','st2','st3','st4','st5','st11'];
  R.fresh = Object.fromEntries(all.map(id=>[id, m.U(id)]));
  R.fourBase = m.U('st0')&&m.U('st1')&&m.U('st2')&&m.U('st4')
            && !m.U('st3') && !m.U('st5') && !m.U('st11');
}
// ---- 2. ⚠ A TAB WITH ITEMS IS ALWAYS SHOWN ---------------------------
{
  const m=model(0, { st3:[{},{},{},{},{},{},{}] });   // his 7 dump items
  R.grandfather = { dumpLocked:model(0).U('st3'), dumpWithItems:m.U('st3') };
  R.noOrphanedItems = R.grandfather.dumpLocked===false
                   && R.grandfather.dumpWithItems===true;
}
// ---- 3. buying unlocks in order, at an escalating price --------------
{
  const m=model(0);
  R.costs=[0,1,2,3,7].map(n=>m.C(n));
  R.escalates = R.costs[1]>R.costs[0] && R.costs[4]>R.costs[3]*2;
  const buys=[];
  for(let i=0;i<9;i++) buys.push(m.Buy().ok);
  R.buying = { attempts:buys.length, succeeded:buys.filter(Boolean).length,
               extras:m.EX.length, boughtNow:m.SS.stashBought,
               unlockOrder:m.EX.filter(id=>m.U(id)) };
  R.buysAllThenStops = R.buying.succeeded===m.EX.length
                    && buys[m.EX.length]===false;
  // poor refuses cleanly
  const p=model(0); p.SS.gold=10;
  const r=p.Buy();
  R.poor = { ok:r.ok, why:r.why, goldUntouched:p.SS.gold===10,
             nothingBought:p.SS.stashBought===0 };
  R.poorRefused = r.ok===false && r.why==='gold' && R.poor.goldUntouched;
}
// ---- 4. the strip renders four + a plus ------------------------------
{
  const ra=src.indexOf('function refreshStashTabs(){');
  const rb=src.indexOf('function stashBuyConfirm(){');
  const dom=new JSDOM('<body><div id="stashTabs"></div></body>');
  const CONT={}; ['st0','st1','st2','st3','st4','st5'].forEach(id=>CONT[id]={items:[]});
  const TABS=[{id:'st0',n:'GEAR',col:'#c2a052',fixed:1},
              {id:'st1',n:'CURRENCY',col:'#d3ac68',fixed:1},
              {id:'st2',n:'SUPPORTS',col:'#2fa39a',fixed:1},
              {id:'st4',n:'RUNES',col:'#8fbf9a',fixed:1},
              {id:'st3',n:'DUMP',col:'#8a8079',fixed:1},
              {id:'st5',n:'TAB 6',col:'#aaa',fixed:0}];
  const sb={ console, Math, document:dom.window.document, CONT,
    STASH_TABS:TABS, stashTab:'st0', stashTabName:(id)=>({st0:'GEAR',st1:'CURRENCY',
      st2:'SUPPORTS',st4:'RUNES',st3:'DUMP',st5:'TAB 6'})[id],
    stashTabUnlocked:(id)=>['st0','st1','st2','st4'].indexOf(id)>=0,
    stashBought:()=>0, stashTabCost:()=>25000,
    STASH_EXTRA_ORDER:['st3','st5'], fmt:String, ahErr:()=>{} };
  sb.window=sb; vm.createContext(sb);
  vm.runInContext(src.slice(ra,rb)+'\nthis.R=refreshStashTabs;', sb, {filename:'r.js'});
  sb.R();
  const strip=dom.window.document.getElementById('stashTabs');
  R.strip = [...strip.querySelectorAll('button')].map(b=>b.textContent);
  R.hasPlus = !!strip.querySelector('#stashAddTab');
  R.plusTitle = (strip.querySelector('#stashAddTab')||{}).title;
  R.stripCorrect = R.strip.length===5 && R.strip[4]==='+'
    && R.strip.slice(0,4).join(',')==='GEAR,CURRENCY,SUPPORTS,RUNES';
}
// ---- 5. ⚠ ROUTING NEVER TARGETS A LOCKED TAB -------------------------
R.routing = {
  tabForFallsBackToGear:/return \(window\.stashTabUnlocked && stashTabUnlocked\('st3'\)\) \? 'st3' : 'st0';/.test(code),
  overflowFiltersLocked:/&& \(!window\.stashTabUnlocked \|\| stashTabUnlocked\(k\)\)/.test(code),
  dumpConditionalInOrder:/const dump=\(!window\.stashTabUnlocked \|\| stashTabUnlocked\('st3'\)\) \? \['st3'\] : \[\];/.test(code),
  selectedTabGuard:/if\(typeof stashTab!=='undefined' && !stashTabUnlocked\(stashTab\)\) stashTab='st0';/.test(code)
};
R.routingSafe = Object.values(R.routing).every(Boolean);
console.log(JSON.stringify(R,null,1));
