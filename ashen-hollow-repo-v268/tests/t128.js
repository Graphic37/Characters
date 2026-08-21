// the card's objective line must not repeat its own title
const fs=require('fs'), vm=require('vm');
const src=fs.readFileSync('work.html','utf8');
const code=src.replace(/\/\*[\s\S]*?\*\//g,'');
const R={};
const a=src.indexOf('const ContractClock = (function(){');
const b=src.indexOf('const QUEST_DEFS = [');
const store={};
const sb={ console:{log:()=>{},warn:()=>{},table:()=>{}}, Math, JSON, Date,
  isFinite, Number, String, Array, Object,
  performance:{now:()=>0}, setInterval:()=>1,
  localStorage:{getItem:(k)=>store[k]||null,setItem:(k,v)=>{store[k]=v;},removeItem:()=>{}},
  navigator:{userAgent:'t'}, S:{lvl:40,bestRiftTier:30,bestChallengeTier:18},
  RIFT:{tier:1}, toast:()=>{}, grantCurrency:()=>{},
  document:{getElementById:()=>null}, ahErr:()=>{} };
sb.window=sb; vm.createContext(sb);
vm.runInContext(src.slice(a,b), sb, {filename:'c.js'});

// every family carries a description, and none of them is just the name
R.families = sb.CONTRACT_FAMILIES.map(f=>({ id:f.id, n:f.n, desc:f.desc }));
R.allHaveDesc = R.families.every(f=>!!f.desc);
R.noneRepeatsName = R.families.every(f=>f.desc && f.desc!==f.n);

// the rendered lines differ from the titles
const offers=sb.contractCurrentOffers('daily');
const cbA=src.indexOf('function cbObjText(o){');
const cbB=src.indexOf('function cbReward(r){');
const sb2={ window:{CONTRACT_FAMILIES:sb.CONTRACT_FAMILIES} };
vm.createContext(sb2);
vm.runInContext(src.slice(cbA,cbB)+'\nthis.T=cbObjText;', sb2, {filename:'o.js'});
R.cards = offers.map(o=>({ title:o.n, line:sb2.T(o), diff:o.diffName }));
R.noCardRepeats = R.cards.every(c=>c.line!==c.title && c.line.indexOf(c.title)!==0);
// a tier-bearing card says so in words, not "at T1+"
R.tierWording = R.cards.filter(c=>/tier \d+ or higher/.test(c.line)).length;
R.PASS = R.allHaveDesc && R.noneRepeatsName && R.noCardRepeats;
console.log(JSON.stringify(R,null,1));
if(!R.PASS) process.exit(1);
