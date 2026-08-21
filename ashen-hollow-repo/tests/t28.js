// the shield must rise from the BOTTOM, on its own scale
const fs=require('fs'), vm=require('vm');
const {JSDOM}=require('jsdom');
const src=fs.readFileSync('work.html','utf8');
const R={};
const a=src.indexOf('  const lifeMax = st.life || 1;');
const b=src.indexOf("  $('#enFill').style.height");
const code=src.slice(a,b);

function run(life, lifeMax, es, esMax){
  const dom=new JSDOM('<i id="hpFill"></i><i id="esFill"></i>');
  const doc=dom.window.document;
  const sb={console, document:doc, $:(s)=>doc.querySelector(s),
    st:{life:lifeMax}, S:{life:life/lifeMax}, esNow:es, esMax:esMax};
  sb.window=sb; vm.createContext(sb);
  vm.runInContext('const st=this.st, S=this.S, esNow=this.esNow, esMax=this.esMax;\n'+code, sb, {filename:'h.js'});
  const hp=doc.getElementById('hpFill'), esf=doc.getElementById('esFill');
  return { life:hp.style.height, shield:esf.style.height,
           clip:esf.style.clipPath||'(none set)', opacity:esf.style.opacity };
}
// ⚠ the shield is now sized against life+shield, so a FULL shield shows the
// share it actually represents rather than filling the globe.
R.hisCase     = run(811,811, 174,174);   // the screenshot: 174 of 985 = 17.7%
R.full        = run(100,100, 100,100);   // equal pools -> 50/50
R.halfBoth    = run(50,100, 50,100);
R.lowLifeFullShield = run(10,100, 100,100);
R.noShield    = run(86,86, 0,0);
R.shieldOnly  = run(0,100, 40,100);
R.tinyShield  = run(800,800, 40,40);     // a small shield must look small

// the anchor is CSS: bottom:0 on .orb-fill
const css=src.slice(src.indexOf('<style>'), src.indexOf('</style>'));
R.anchoredBottom = /\.orb-fill\{[^}]*bottom:0/.test(css);
R.esAnchoredBottom = /\.orb-fill\.es\{[^}]*bottom:0/.test(css);
R.esTranslucent = /\.orb-fill\.es\{[\s\S]{0,400}?rgba\(200,240,255,\.52\)/.test(css);
R.noClipUsed = !/clipPath = 'inset/.test(src);

// the key property: shield height tracks its OWN pool, not a combined one
// jsdom normalises "50.0%" to "50%", so compare NUMBERS, not the strings the
// browser happens to echo back
const pc=(v)=>parseFloat(v);
/* life keeps its OWN scale (a healthy globe is a full globe); the shield is a
   share of the combined pool. */
R.lifeOnOwnScale = pc(R.halfBoth.life)===50 && pc(R.lowLifeFullShield.life)===10
                && pc(R.hisCase.life)===100 && pc(R.noShield.life)===100;
R.shieldProportional = {
  hisCase:pc(R.hisCase.shield),          // 174/985 = 17.7
  equalPools:pc(R.full.shield),          // 100/200 = 50
  tiny:pc(R.tinyShield.shield),          // 40/840  = 4.8
  neverFillsGlobeWhenSmall: pc(R.tinyShield.shield) < 10 };
R.matchesHisEstimate = Math.abs(pc(R.hisCase.shield) - 17.7) < 0.5;
console.log(JSON.stringify(R,null,1));
