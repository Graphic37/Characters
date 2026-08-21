// click the + through the REAL handler and see what throws
const fs=require('fs'), vm=require('vm');
const {JSDOM}=require('jsdom');
const src=fs.readFileSync('work.html','utf8');
const R={};
const a=src.indexOf('function refreshStashTabs(){');
const b=src.indexOf('window.stashBuyConfirm=stashBuyConfirm;');

const dom=new JSDOM('<body><div id="stashTabs"></div></body>');
const doc=dom.window.document;
const CONT={}; ['st0','st1','st2','st3','st4','st5'].forEach(id=>CONT[id]={items:[]});
const sb={ console, Math, document:doc, CONT,
  STASH_TABS:[{id:'st0',n:'GEAR',col:'#c2a052',fixed:1},
              {id:'st1',n:'CURRENCY',col:'#d3ac68',fixed:1},
              {id:'st2',n:'SUPPORTS',col:'#2fa39a',fixed:1},
              {id:'st4',n:'RUNES',col:'#8fbf9a',fixed:1}],
  stashTab:'st0',
  stashTabName:(id)=>id,
  stashTabUnlocked:(id)=>['st0','st1','st2','st4'].indexOf(id)>=0,
  stashBought:()=>0,
  stashTabCost:()=>25000,
  STASH_EXTRA_ORDER:['st5','st6'],
  S:{gold:9e9},
  fmt:(n)=>String(n),
  toast:()=>{},
  ahErr:()=>{} };
sb.window=sb;
vm.createContext(sb);
vm.runInContext(src.slice(a,b)+'\nthis.R=refreshStashTabs; this.C=stashBuyConfirm;',
  sb, {filename:'s.js'});
sb.R();
const strip=doc.getElementById('stashTabs');
const plus=strip.querySelector('#stashAddTab');
R.plusRendered = !!plus;

// ⚠ CLICK IT, exactly as the browser would
let threw=null;
try{ plus.onclick(); }catch(e){ threw=String(e && e.message || e); }
R.clickThrew = threw;
R.confirmShown = !!doc.getElementById('stashBuy');

// ⚠ now press YES — the confirm opening proves nothing about the purchase
const ba=src.indexOf('function stashBuyTab(){');
const bb=src.indexOf('window.stashBuyTab=stashBuyTab;');
let realRefreshThrew=null;
sb.refreshStashTabs=()=>{ sb.R(); };
sb.refreshAll=()=>{};
vm.runInContext(src.slice(ba,bb)+'\nthis.B=stashBuyTab;', sb, {filename:'b.js'});
// the REAL unlock check must see the new tab
sb.stashBought=()=>sb.S.stashBought|0;
sb.stashTabUnlocked=(id)=>{
  if(['st0','st1','st2','st4'].indexOf(id)>=0) return true;
  const i=sb.STASH_EXTRA_ORDER.indexOf(id);
  return i>=0 && i < (sb.S.stashBought|0);
};
let buyThrew=null, res=null;
try{ res=sb.B(); }catch(e){ buyThrew=String(e && e.message || e); }
R.buy = { threw:buyThrew, result:res, goldAfter:sb.S.gold, bought:sb.S.stashBought };

// ⚠ AND THE STRIP MUST REDRAW WITH THE NEW TAB — st5 is not in STASH_TABS!
R.stripAfter = [...doc.getElementById('stashTabs').querySelectorAll('button')]
  .map(x=>x.textContent);
R.newTabShown = R.stripAfter.some(t=>/st5|STASH/.test(t));
R.tabInStashTabs = sb.STASH_TABS.some(t=>t.id==='st5');
console.log(JSON.stringify(R,null,1));
