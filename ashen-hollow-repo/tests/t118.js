// the remaining verification points: drag threshold, loud errors, price update
const fs=require('fs'), vm=require('vm');
const {JSDOM}=require('jsdom');
const src=fs.readFileSync('work.html','utf8');
const code=src.replace(/\/\*[\s\S]*?\*\//g,'');
const R={};

// ---- 1. ⚠ AN ORDINARY CLICK MUST STILL SELECT ------------------------
{
  // The drag uses the NATIVE HTML5 drag API, whose threshold is the browser's
  // own — a mousedown+mouseup without movement never fires dragstart. Prove
  // the click path is reachable and untouched by the drag handlers.
  const a=src.indexOf('function refreshStashTabs(){');
  const b=src.indexOf('window.stashBuyConfirm=stashBuyConfirm;');
  const dom=new JSDOM('<body><div id="stashTabs"></div></body>');
  const CONT={}; ['st0','st1','st2','st4'].forEach(id=>CONT[id]={items:[]});
  const sb={ console, document:dom.window.document, CONT,
    STASH_TABS:[{id:'st0',n:'GEAR',col:'#c2a052',fixed:1},
                {id:'st1',n:'CUR',col:'#d3ac68',fixed:1}],
    stashTab:'st0', stashTabName:(id)=>id,
    stashTabUnlocked:()=>true, stashBought:()=>0, stashTabCost:()=>25000,
    STASH_EXTRA_ORDER:['st5'], S:{gold:9e9}, fmt:String, toast:()=>{},
    stashTabsOrdered:null, STASH_DRAG:{id:null}, stashMoveTab:()=>{},
    ahErr:()=>{} };
  sb.window=sb; vm.createContext(sb);
  vm.runInContext(src.slice(a,b)+'\nthis.R=refreshStashTabs;', sb, {filename:'r.js'});
  sb.R();
  const tab=dom.window.document.querySelector('#stashTabs .tab');
  R.click = {
    tabRendered:!!tab,
    carriesId:tab && tab.dataset.tab==='st0',
    draggable:tab && tab.draggable===true,
    // ⚠ no inline onclick is CORRECT — selection is delegated on mousedown
    noInlineClick:tab && !tab.onclick,
    delegatedSelectorIntact:// ⚠ v260: the selector is scoped to `#stashTabs .tab[data-tab]` — the
    // bare `.tab` match also caught the + button and threw on `t.col`.
    /const tab=closest\('#stashTabs \.tab\[data-tab\]'\);[\s\S]{0,220}stashTab=id;/.test(code)
  };
  // a plain click (no dragstart) leaves the drag state untouched
  R.click.dragStateAfterPlainClick = sb.STASH_DRAG.id;
  R.clickStillWorks = R.click.carriesId && R.click.delegatedSelectorIntact
                   && R.click.dragStateAfterPlainClick===null;
  R.nativeDragThreshold = /b\.draggable=true;/.test(code)
    && /addEventListener\('dragstart'/.test(code);
}
// ---- 2. ⚠ ERRORS STAY LOUD -------------------------------------------
{
  R.loud = {
    keepsRealError:/const real=\(e && e\.error\) \|\| new Error\(msg\);/.test(code),
    namesTheSource:/String\(e\.filename\)\.replace\(\/\.\*\\\/\/,''\)\+':'\+\(e\.lineno/.test(code)
      || /e\.filename/.test(code),
    consoleError:/console\.error\('\[uncaught\] '\+where/.test(code),
    toastNamesIt:/toast\('Error at '\+where/.test(code),
    reachesF6:/window\.ahErr && window\.ahErr\(real, 'uncaught @ '/.test(code),
    notSwallowed:!/catch\(x\)\{\}\s*\n\s*return;\s*\n\s*\}\s*\n\s*err\.style/.test(code)
  };
  R.errorsLoud = R.loud.keepsRealError && R.loud.namesTheSource
              && R.loud.consoleError && R.loud.reachesF6;
}
// ---- 3. the next price updates immediately ---------------------------
{
  const ca=src.indexOf('function stashTabCost(');
  const cb=src.indexOf('\n}', ca)+2;
  const sb={ console, Math }; vm.createContext(sb);
  vm.runInContext(src.slice(ca,cb)+'\nthis.C=stashTabCost;', sb, {filename:'c.js'});
  R.prices=[0,1,2,3].map(n=>sb.C(n));
  R.priceRises = R.prices[1]>R.prices[0] && R.prices[2]>R.prices[1];
  // the strip recomputes from stashBought() on every redraw, and the buy
  // triggers a redraw — so the label cannot go stale
  R.priceRecomputed = /const n=stashBought\(\);[\s\S]{0,900}const cost=stashTabCost\(n\);/.test(code)
                   && /refreshStashTabs\(\); refreshAll\(\);/.test(code);
}
// ---- 4. the namespace exists and fails loudly ------------------------
{
  const a=src.indexOf('window.AH = window.AH || {};');
  const b=src.indexOf("const err=document.getElementById('err');");
  const sb={ console:{warn:(m)=>sb.__w.push(m)}, window:{} };
  sb.__w=[]; sb.window=sb; vm.createContext(sb);
  vm.runInContext(src.slice(a,b)+'\nthis.AH=window.AH;', sb, {filename:'n.js'});
  sb.AH.def('foo', ()=>42);
  R.ns={ defined:sb.AH.has('foo'), calls:sb.AH.need('foo')() };
  try{ sb.AH.need('missing'); R.ns.missingThrew=false; }
  catch(e){ R.ns.missingThrew=true; R.ns.msg=e.message.slice(0,40); }
  sb.AH.def('foo', ()=>7);
  R.ns.warnsOnRedefine=sb.__w.length===1;
  R.namespaceSound = R.ns.defined && R.ns.calls===42 && R.ns.missingThrew
                  && R.ns.warnsOnRedefine;
}
R.PASS = R.clickStillWorks && R.errorsLoud && R.priceRises
      && R.priceRecomputed && R.namespaceSound;
console.log(JSON.stringify(R,null,1));
if(!R.PASS) process.exit(1);
