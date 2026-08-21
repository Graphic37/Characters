// clicking the + must not throw; clicking a tab must still select
const fs=require('fs'), vm=require('vm');
const {JSDOM}=require('jsdom');
const src=fs.readFileSync('work.html','utf8');
const code=src.replace(/\/\*[\s\S]*?\*\//g,'');
const R={};

// the REAL selection handler
const a=src.indexOf("    const tab=closest('#stashTabs .tab[data-tab]');");
const b=src.indexOf('    const sk=closes', a);
const slice=src.slice(a,b);

function click(el, dom){
  const drawn=[];
  const sb={ console:{warn:(m)=>drawn.push('warn:'+m)},
    closest:(sel)=>el.closest(sel),
    $$:(sel)=>[...dom.window.document.querySelectorAll(sel)],
    STASH_TABS:[{id:'st0',n:'GEAR',col:'#c2a052'},
                {id:'st5',n:'STASH 1',col:'#9fb4d8'}],
    stashTab:'st0',
    drawStash:()=>drawn.push('drawStash'),
    scheduleFit:()=>drawn.push('scheduleFit') };
  sb.window=sb; vm.createContext(sb);
  let threw=null;
  try{
    vm.runInContext('(function(){'+slice+'})();'+
      '\nthis.OUT={tab:stashTab, drawn:this.__d};',
      Object.assign(sb,{__d:drawn}), {filename:'c.js'});
  }catch(e){ threw=String(e && e.message || e); }
  return { threw, tab:sb.stashTab, drawn };
}

const dom=new JSDOM(`<body><div id="stashTabs">
  <button class="tab on tab-st0" data-tab="st0">GEAR</button>
  <button class="tab tab-st5" data-tab="st5">STASH 1</button>
  <button class="tab tabPlus" id="stashAddTab"><b>+</b> <span>New Tab</span></button>
</div></body>`);
const doc=dom.window.document;

// ---- 1. ⚠ THE + BUTTON: the thing that threw six times ---------------
{
  const plus=doc.getElementById('stashAddTab');
  R.plus = click(plus, dom);
  R.plusDoesNotThrow = R.plus.threw===null;
  R.plusDoesNotSelect = R.plus.tab==='st0' && !R.plus.drawn.includes('drawStash');
  // and clicking the INNER <b>/<span> must behave the same — closest() walks up
  R.plusInner = click(plus.querySelector('span'), dom);
  R.innerSafe = R.plusInner.threw===null && !R.plusInner.drawn.includes('drawStash');
}
// ---- 2. a real tab still selects -------------------------------------
{
  const t5=doc.querySelector('[data-tab="st5"]');
  R.realTab = click(t5, dom);
  R.selects = R.realTab.threw===null && R.realTab.tab==='st5'
           && R.realTab.drawn.includes('drawStash');
}
// ---- 3. a tab with no table entry warns instead of throwing ----------
{
  const dom2=new JSDOM('<body><div id="stashTabs">'+
    '<button class="tab" data-tab="st99">GHOST</button></div></body>');
  const ghost=dom2.window.document.querySelector('[data-tab="st99"]');
  R.ghost = click(ghost, dom2);
  R.ghostSafe = R.ghost.threw===null && R.ghost.drawn.some(d=>d.startsWith('warn:'));
}
// ---- 4. the selector is scoped to the strip --------------------------
R.scoped = {
  requiresDataTab:/closest\('#stashTabs \.tab\[data-tab\]'\)/.test(code),
  guardsMissingEntry:/if\(!t\)\{ try\{ console\.warn\('\[stash\] no table entry/.test(code),
  classOnlyMatchGone:!/const tab=closest\('\.tab'\);/.test(code)
};
R.scopedOk = Object.values(R.scoped).every(Boolean);
R.PASS = R.plusDoesNotThrow && R.plusDoesNotSelect && R.innerSafe
      && R.selects && R.ghostSafe && R.scopedOk;
console.log(JSON.stringify(R,null,1));
if(!R.PASS) process.exit(1);
