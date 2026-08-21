// buy a tab with the REAL tables and the REAL redraw
const fs=require('fs'), vm=require('vm');
const {JSDOM}=require('jsdom');
const src=fs.readFileSync('work.html','utf8');
const R={};

// the real STASH_* construction, verbatim
const ta=src.indexOf('const STASH_TAB_COUNT');
const tb=src.indexOf('/* the player\'s names, persisted with the save */');
// the real renderer + confirm
const ra=src.indexOf('function refreshStashTabs(){');
const rb=src.indexOf('window.stashBuyConfirm=stashBuyConfirm;');
// the real name lookup
const na=src.indexOf('function stashTabName(id){');
const nb=src.indexOf('\n}', src.indexOf('return t? t.n', na))+2;

const dom=new JSDOM('<body><div id="stashTabs"></div></body>');
const sb={ console, Math, document:dom.window.document,
  S:{gold:9e9, stashBought:0, stashNames:{}},
  stashTab:'st0', fmt:(n)=>String(n), toast:(m)=>sb.__t.push(m),
  refreshAll:()=>{}, ahErr:(e,w)=>sb.__err.push(w+': '+e.message) };
sb.__t=[]; sb.__err=[];
sb.window=sb;
vm.createContext(sb);
vm.runInContext(src.slice(ta,tb)+'\n'+src.slice(na,nb)+'\n'+src.slice(ra,rb)+
  '\nthis.R=refreshStashTabs; this.C=stashBuyConfirm; this.B=stashBuyTab;'+
  '\nthis.TABS=STASH_TABS; this.CONT=CONT;', sb, {filename:'s.js'});

R.tabIds = sb.TABS.map(t=>t.id);
R.tabNames = sb.TABS.map(t=>t.n);

// ---- draw, click +, press Yes, redraw --------------------------------
function step(label, fn){
  try{ fn(); return {ok:true}; }
  catch(e){ return {ok:false, at:label, err:String(e && e.message || e),
                    stack:String(e && e.stack||'').split('\n')[1]||''}; }
}
R.draw   = step('first draw', ()=>sb.R());
R.plus   = !!sb.document.getElementById('stashAddTab');
R.click  = step('click +',   ()=>sb.document.getElementById('stashAddTab').onclick());
R.yes    = step('press Yes', ()=>{
  const y=sb.document.getElementById('sbYes');
  if(!y) throw new Error('no Yes button rendered');
  y.onclick();
});
R.redraw = step('redraw',    ()=>sb.R());
R.strip  = [...sb.document.getElementById('stashTabs').querySelectorAll('button')]
             .map(x=>x.textContent);
R.bought = sb.S.stashBought;
R.errors = sb.__err;
R.firstFailure = [R.draw,R.click,R.yes,R.redraw].filter(x=>!x.ok)[0] || null;
console.log(JSON.stringify(R,null,1));
