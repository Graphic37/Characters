// the arrow must DO something, the drawer must agree with the headline
const fs=require('fs'), vm=require('vm');
const {JSDOM}=require('jsdom');
const src=fs.readFileSync('work.html','utf8');
const R={};

// 1. the arrow is a real control with a handler
R.arrowIsButton = /<button class="skArrow" data-detail="/.test(src);
R.arrowHandled  = /closest\('\[data-detail\]'\)/.test(src);
R.drawerExists  = /data-detailfor="/.test(src);
R.arrowRotates  = /\.skArrow\.on\{ transform:rotate\(90deg\)/.test(src);

// 2. the CSS block parses and no malformed colours survive
const css=src.slice(src.indexOf('<style>')+7, src.indexOf('</style>'));
const dom=new JSDOM('<style>'+css+'</style>');
R.cssRules = dom.window.document.styleSheets[0].cssRules.length;
const rule=(sel)=>{ const re=new RegExp('\\n'+sel.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\{([^}]*)\\}','g');
  let m,v=null; while((m=re.exec(css))) v=m[1]; return v; };
R.arrowRule = /color:#a89c76/.test(rule('.skArrow')||'');
R.badHex = (css.match(/#[0-9a-fA-F]*[g-zG-Z]/g)||[]).filter(x=>!/^#[a-zA-Z]/.test(x));

// 3. the drawer reads ONLY skillDamage's output — no second calculation
const da=src.indexOf('  function detailHTML(id){');
const db=src.indexOf('  window.skillDetailHTML = detailHTML;');
const dcode=src.slice(da,db);
R.drawerRecomputes = /weaponAvg\(\)|gearFlat\(\)|gearMult\(\)/.test(dcode.replace(/D\.\w+/g,''));
R.drawerUsesD = (dcode.match(/D\.\w+/g)||[]).length;

// 4. run it for real against a stubbed skillDamage
const sb={ console, window:{},
  has:()=>true, SKILLS:{ multishot:{n:'Multishot', cd:5} },
  skillDamage:()=>({ hit:890, burst:890, dps:178, hits:5, tag:'ATTACK',
    supports:['Fork T3','Savagery T5'], gemMult:1.0, supportMult:1.221, speedMult:1.13,
    weaponAvg:120.5, gearFlat:32, coef:0.6, gearMult:1.15, critAvg:1.32,
    rate:0.2, crit:24, critMult:230 }) };
sb.window=sb; vm.createContext(sb);
vm.runInContext(dcode+'\nthis.F=detailHTML;', sb, {filename:'d.js'});
const html=sb.F('multishot');
const d2=new JSDOM('<div>'+html+'</div>').window.document;
R.render={ rows:d2.querySelectorAll('.sdRow').length,
  outputs:[...d2.querySelectorAll('.sdOut b')].map(e=>e.textContent),
  supportsNamed:/Fork T3, Savagery T5/.test(html),
  speedNoteShown:/Attack speed/.test(html),
  cooldownNoteShown:/5s cooldown/.test(html) };
// the headline in the row is D.burst for a cd skill; the drawer must print the same
R.drawerMatchesHeadline = R.render.outputs.includes('890');

// 5. sockets are trimmed, not just padded
R.trims = /if\(st\.sockets\.length > SUPPORT_SLOTS\) st\.sockets\.length = SUPPORT_SLOTS;/.test(src);
{
  const sa=src.indexOf('  function socketsFor(id){');
  const sbnd=src.indexOf('  window.skillSockets = socketsFor;');
  const RG={ multishot:{ sockets:[1,2,3,4,5] }, rapid:{} };
  const s2={console, has:()=>true, RANGER_GEMS:RG, SUPPORT_SLOTS:3};
  s2.window=s2; vm.createContext(s2);
  vm.runInContext('var SUPPORT_SLOTS=3;\n'+src.slice(sa,sbnd)+'\nthis.F=socketsFor;', s2, {filename:'sf.js'});
  R.socketLengths={ hadFive:s2.F('multishot').length, hadNone:s2.F('rapid').length };
}
console.log(JSON.stringify(R,null,1));
