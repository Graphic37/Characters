// pre-fix control: prove the three bugs were real, using the v148 source
const fs=require('fs'), vm=require('vm');
const src=fs.readFileSync('/mnt/user-data/uploads/ashen_hollow_town_v148.html','utf8');
const tabA=src.indexOf('/* ---- 8. the five locked currencies');
const tabB=src.indexOf('/* ---- 9. crafting');
const mcA=src.indexOf('function makeCurrency(id,qty){');
const mcB=src.indexOf('\n}', src.indexOf('target:c.target, stack:1, lvlReq:0, ilvl:1};'))+2;
const kA=src.indexOf('function keyStacks(){');
const kB=src.indexOf('function enterGreaterRift(tier){');
const CONT={inv:{items:[]},st1:{items:[]},st3:{items:[]},st7:{items:[]}};
const sb={console,CONT,UID:1,CURRENCY:[],pick:a=>a[Math.floor(Math.random()*a.length)],
 toast:()=>{},refreshAll:()=>{},
 removeItem:(c,it)=>{const i=c.items.indexOf(it);if(i>=0)c.items.splice(i,1);},
 addItem:(c,it)=>{c.items.push(it);return true;}};
sb.window=sb; vm.createContext(sb);
vm.runInContext(src.slice(tabA,tabB)+'\n'+src.slice(mcA,mcB)+'\n'+src.slice(kA,kB)+
 '\nthis.OUT={makeCurrency,keyStacks,keyCount,spendKey};',sb,{filename:'v148.js'});
const O=sb.OUT, R={};
R.tenMakeCurrency = Array.from({length:10},()=>O.makeCurrency('cu_grkey',1).name);
R.distinct = new Set(R.tenMakeCurrency).size;
CONT.st7.items.push({baseId:'cu_grkey',qty:3,name:'Greater Rift Key'});
R.countInPlayerTab = O.keyCount();
CONT.st7.items.length=0;
CONT.st1.items.push({baseId:'cu_grkey',qty:1,name:'Greater Rift Key'});
O.spendKey();
R.st1ItemsAfterSpend = CONT.st1.items.length;
R.zombieQty = (CONT.st1.items[0]||{}).qty;
console.log(JSON.stringify(R,null,1));
