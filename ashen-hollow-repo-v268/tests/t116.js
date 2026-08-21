// the buy path cannot black-screen; the plus is legible; tabs reorder
const fs=require('fs'), vm=require('vm');
const {JSDOM}=require('jsdom');
const src=fs.readFileSync('work.html','utf8');
const code=src.replace(/\/\*[\s\S]*?\*\//g,'');
const R={};

// ---- 1. ⚠ A RUNTIME ERROR MUST NOT REPLACE THE GAME ------------------
{
  const a=src.indexOf('let __booted=false;');
  const b=src.indexOf("addEventListener('unhandledrejection'");
  function fire(booted){
    let shown=false, logged=[];
    const errEl={ style:{display:'none'}, textContent:'' };
    const sb={ console:{warn:(m)=>logged.push(m)}, err:errEl,
      window:{ ahErr:(e,w)=>logged.push('ahErr:'+w), toast:()=>{} },
      addEventListener:(n,fn)=>{ if(n==='error') sb.__fn=fn; } };
    sb.window.window=sb.window;
    vm.createContext(sb);
    vm.runInContext('var err=this.err; var window=this.window;\n'+src.slice(a,b)+
      // ⚠ it is assigned to `window`, not declared — call it the way the game
      // does, or the sandbox reports my harness as a code fault.
      '\nif(this.__boot) window.markBooted();\nthis.FIRE=this.__fn;', 
      Object.assign(sb,{__boot:booted}), {filename:'e.js'});
    sb.FIRE({ message:'x is not a function' });
    return { overlayShown:errEl.style.display==='flex', text:errEl.textContent, logged };
  }
  R.beforeBoot = fire(false);
  R.afterBoot  = fire(true);
  R.bootScreenOnlyAtBoot = R.beforeBoot.overlayShown===true
                        && R.afterBoot.overlayShown===false;
  R.runtimeErrorReported = R.afterBoot.logged.length>0;
  R.bootFlagSet = /window\.markBooted && markBooted\(\)/.test(code);
}
// ---- 2. the plus states what it does and what it costs ---------------
{
  R.plus = {
    hasLabel:/plus\.innerHTML='<b>\+<\/b> <span>New Tab<\/span> <i>'\+fmt\(cost\)/.test(code),
    // ⚠ and it must use a function this BLOCK can see
    noCrossBlockCall:!/plus\.innerHTML=[^;]*fmtShort/.test(code),
    notBareText:!/plus\.textContent='\+'/.test(code),
    widerCss:/#stashTabs \.tabPlus\{[\s\S]{0,160}padding:0 13px/.test(src),
    stillCostsGold:/S\.gold-=cost;/.test(code)
  };
  R.plusClear = Object.values(R.plus).every(Boolean);
}
// ---- 3. ⚠ ORDER IS RECONCILED, NOT TRUSTED ---------------------------
{
  const a=src.indexOf('const STASH_DRAG={ id:null };');
  const b=src.indexOf('function stashTabName(id){');
  const sb={ console, S:{}, ahErr:()=>{}, refreshStashTabs:()=>{},
    STASH_TABS:['st0','st1','st2','st4','st5'].map(id=>({id, n:id})) };
  sb.window=sb;
  vm.createContext(sb);
  vm.runInContext(src.slice(a,b)+
    '\nthis.O=stashTabOrder; this.M=stashMoveTab; this.L=stashTabsOrdered;', sb, {filename:'o.js'});
  R.order = { fresh:sb.O() };
  // a move
  sb.M('st5','st1');
  R.order.afterMove=sb.O();
  R.moveWorks = R.order.afterMove.indexOf('st5')===1;
  // ⚠ a saved id that no longer exists must be dropped
  sb.S.stashOrder=['st9','st5','st0','st5'];       // stale + duplicate
  R.order.reconciled=sb.O();
  R.dropsStale = R.order.reconciled.indexOf('st9')<0;
  R.dropsDuplicates = R.order.reconciled.filter(x=>x==='st5').length===1;
  R.keepsEverything = R.order.reconciled.length===sb.STASH_TABS.length;
  // a brand-new tab appears at the end rather than vanishing
  sb.STASH_TABS.push({id:'st6', n:'st6'});
  R.order.withNew=sb.O();
  R.newTabAppended = R.order.withNew[R.order.withNew.length-1]==='st6';
  // move to the end
  sb.M('st0', null);
  R.movedToEnd = sb.O()[sb.O().length-1]==='st0';
  R.orderSound = R.moveWorks && R.dropsStale && R.dropsDuplicates
              && R.keepsEverything && R.newTabAppended && R.movedToEnd;
}
// ---- 4. the strip renders in that order, and drag is wired -----------
{
  R.wiring = {
    stripUsesOrder:/\(window\.stashTabsOrdered\? stashTabsOrdered\(\) : STASH_TABS\)\.forEach/.test(code),
    draggable:/b\.draggable=true;/.test(code),
    dropReorders:/if\(id && id!==t\.id\) stashMoveTab\(id, t\.id\);/.test(code),
    dropAtEnd:/stashMoveTab\(id, null\);/.test(code),
    // ⚠ tabs are NOT selected by an inline onclick — selection is a delegated
    // mousedown on `.tab` that sets `stashTab` from `data-tab`. I asserted a
    // handler the code never had; drag does not touch that path.
    clickStillSelects:// ⚠ v260: selector scoped to `#stashTabs .tab[data-tab]`
    /const tab=closest\('#stashTabs \.tab\[data-tab\]'\);[\s\S]{0,220}stashTab=id;/.test(code)
  };
  R.dragWired = Object.values(R.wiring).every(Boolean);
}
R.PASS = R.bootScreenOnlyAtBoot && R.runtimeErrorReported && R.plusClear
      && R.orderSound && R.dragWired;
console.log(JSON.stringify(R,null,1));
if(!R.PASS) process.exit(1);
