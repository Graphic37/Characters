// ONE top bar. The pack bar must never show; eliteHud must be untouched.
const fs=require('fs'), vm=require('vm');
const {JSDOM}=require('jsdom');
const src=fs.readFileSync('work.html','utf8');
const R={};

// 1. eliteHud is intact and still owns the top of the screen
R.eliteHud = {
  exists: /d\.id='eliteHud'/.test(src),
  topCentre: /position:fixed;left:50%;top:min\(40px,4\.6vh\)/.test(src),
  zIndex: (/z-index:58/.exec(src)||[])[0],
  hasName: /id="eliteName"/.test(src),
  hasDamage: /id="eliteDmg"/.test(src),
  hasCaps: /id="eliteCaps"/.test(src),
  untouchedByMe: !/eliteHud[\s\S]{0,200}v208/.test(src)
};

// 2. the pack bar can no longer turn itself on
{
  const a=src.indexOf('const PACKBAR = { el:null');
  const b=src.indexOf('function updatePackBar_retired(){');
  const dom=new JSDOM('<body></body>');
  const e={dead:false,maxHp:100,hp:80,mods:['Brutal'],packId:'p',
           elitePack:'magic',archName:'Skeleton Legionnaire',
           g:{position:{x:1,z:0}}};
  const sb={console, document:dom.window.document, ENEMIES:[e],
    RIFT:{active:true}, player:{position:{x:0,z:0}},
    performance:{now:()=>5000}};
  sb.window=sb; vm.createContext(sb);
  vm.runInContext(src.slice(a,b)+'\nthis.U=updatePackBar; this.I=packInfo;', sb, {filename:'p.js'});
  sb.U(); sb.U(); sb.U();
  const el=dom.window.document.getElementById('packBar');
  R.packBar = { elementCreated: !!el,
                visible: el ? el.classList.contains('on') : false };
  R.packBarStaysHidden = !R.packBar.visible;
  // packInfo survives — nothing else computes pack-wide health
  R.packInfoKept = typeof sb.I === 'function' && sb.I('p').total === 1;
}

// 3. the frame loop no longer calls it
{
  const i=src.indexOf('window.updateHeadPlate && window.updateHeadPlate();');
  const seg=src.slice(i-400, i+120);
  R.frameLoop = { callsHeadPlate:/window\.updateHeadPlate && window\.updateHeadPlate\(\)/.test(seg),
                  callsPackBar:/window\.updatePackBar && window\.updatePackBar\(\)/.test(seg) };
  R.onlyOneTopBarDriven = R.frameLoop.callsHeadPlate && !R.frameLoop.callsPackBar;
}

// 4. the head plate is unaffected — it answers a different question
R.headPlateKept = /function updateHeadPlate\(\)/.test(src)
               && /window\.notePlateTarget=function\(e\)/.test(src);
console.log(JSON.stringify(R,null,1));
