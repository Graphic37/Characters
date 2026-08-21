const fs=require('fs'), vm=require('vm');
const src=fs.readFileSync('work.html','utf8');

// --- the real currency table + makeCurrency, verbatim ---------------------
const tabA = src.indexOf('/* ---- 8. the five locked currencies');
const tabB = src.indexOf('/* ---- 9. crafting');
const tableCode = src.slice(tabA, tabB);
const mcA = src.indexOf('function makeCurrency(id,qty){');
const mcB = src.indexOf('\n}', src.indexOf('target:c.target, stack:1, lvlReq:0, ilvl:1};')) + 2;
const makeCode = src.slice(mcA, mcB);

// --- the real key path, verbatim -----------------------------------------
const kA = src.indexOf('function keyStacks(){');
const kB = src.indexOf('function enterGreaterRift(tier){');
const keyCode = src.slice(kA, kB);

// --- the real awardRiftKey, verbatim -------------------------------------
const aA = src.indexOf('function awardRiftKey(){');
const aB = src.indexOf('\n}', src.indexOf('if(k) return window.addItem(CONT.inv,k)!==false;')) + 2;
const awardCode = src.slice(aA, aB);

const CONT = { inv:{items:[]}, st1:{items:[]}, st2:{items:[]}, st3:{items:[]},
               st4:{items:[]}, st7:{items:[]} };
const warns=[];
const sb = {
  console: Object.assign({}, console, {warn:m=>warns.push(m)}),
  CONT, UID:1, CURRENCY:[],
  pick: a=>a[Math.floor(Math.random()*a.length)],
  toast:()=>{}, refreshAll:()=>{},
  removeItem:(c,it)=>{ const i=c.items.indexOf(it); if(i>=0) c.items.splice(i,1); },
  addItem:(c,it)=>{ c.items.push(it); return true; },
  findContainerOf: it => { for(const k in CONT) if(CONT[k].items.indexOf(it)>=0) return CONT[k]; return null; },
};
sb.window=sb; vm.createContext(sb);
vm.runInContext(tableCode + '\n' + makeCode + '\n' + keyCode + '\n' + awardCode +
  '\nthis.OUT={makeCurrency,keyStacks,keyCount,spendKey,awardRiftKey,CURRENCY};', sb, {filename:'key.js'});
const O = sb.OUT;
const R = {};

// 1. the id now resolves to a key, every time
const k1 = O.makeCurrency('cu_grkey', 1);
R.madeName = k1.name; R.madeBase = k1.baseId; R.madeMax = k1.max;
R.tenSame = new Set(Array.from({length:10},()=>O.makeCurrency('cu_grkey',1).name)).size;
R.hasCraftFlag = !!O.CURRENCY.filter(c=>c.id==='cu_grkey')[0].craft;   // must be false

// 2. a genuinely unknown id is loud and deterministic
const bad = new Set(Array.from({length:10},()=>O.makeCurrency('cu_nope',1).name));
R.unknownDistinct = bad.size; R.unknownName = [...bad][0];
R.warned = warns.length >= 10 && /cu_nope/.test(warns[0]);

// 3. counted wherever it sits
CONT.st7.items.push(O.makeCurrency('cu_grkey', 3));      // a player tab
R.countInPlayerTab = O.keyCount();
CONT.inv.items.push(O.makeCurrency('cu_grkey', 2));
R.countBoth = O.keyCount();
R.bagFirst = O.keyStacks()[0].qty;                        // bag stack first = 2

// 4. spending the last of a BANKED stack removes it from the bank
CONT.inv.items.length = 0; CONT.st7.items.length = 0;
CONT.st1.items.push(O.makeCurrency('cu_grkey', 1));
R.beforeSpend = O.keyCount();
O.spendKey();
R.afterSpend = O.keyCount();
R.st1Items = CONT.st1.items.length;                       // must be 0, no zombie
R.zombies = CONT.st1.items.filter(i=>i.qty<=0).length;

// 5. awarding merges with a banked stack instead of starting a second
CONT.inv.items.length=0; CONT.st1.items.length=0;
CONT.st1.items.push(O.makeCurrency('cu_grkey', 4));
O.awardRiftKey(); O.awardRiftKey();
R.stacksAfterAward = O.keyStacks().length;                // 1
R.qtyAfterAward = O.keyCount();                           // 6

// 6. from nothing, an award creates one properly
CONT.inv.items.length=0; CONT.st1.items.length=0;
O.awardRiftKey();
R.fromNothing = O.keyCount() + ' / ' + (O.keyStacks()[0]||{}).name;

console.log(JSON.stringify(R,null,1));
