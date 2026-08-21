// the dual-race bar: marker positions, pace verdict, and the plain-Rift case
const fs=require('fs'), vm=require('vm');
const {JSDOM}=require('jsdom');
const src=fs.readFileSync('work.html','utf8');
const R={};

// ---- 1. the timer really is 5:00 everywhere ------------------------------
R.timerSeconds = +/timerSeconds:\s*(\d+)/.exec(src)[1];
R.hardcoded1500 = (src.match(/15:00/g)||[]).length;
R.grClockDefined = /function grClock\(sec\)/.test(src);

// ---- 2. run the REAL update logic against a stub DOM ---------------------
const ua=src.indexOf('function updateRiftHud(){');
const ub=src.indexOf('const riftToast=document.createElement');
const code=src.slice(ua,ub);

function scenario(progress, target, elapsed, total, boss, greater){
  const dom=new JSDOM(
    '<div id="riftFrame"></div><i id="riftFill"></i><span id="riftPct"></span>'+
    '<span id="riftClock"></span><span id="riftSkull"></span><i id="riftPace"></i>'+
    '<span id="riftHour"></span><span id="riftPaceTxt"></span><div id="riftLabel"></div>');
  const doc=dom.window.document;
  const sb={ console, document:doc,
    RIFT:{active:true, progress, target, bossSpawned:boss, tier:10, repeat:false},
    GR:{active:greater, tier:10, timeLeft:total-elapsed},
    GR_CFG:{timerSeconds:total},
    RIFT_CFG:{areaLevel:t=>t},
    riftTopUp:()=>{},
  };
  sb.window=sb; vm.createContext(sb);
  vm.runInContext(code+'\nthis.U=updateRiftHud;', sb, {filename:'hud.js'});
  sb.U();
  const g=id=>doc.getElementById(id);
  return { fill:g('riftFill').style.width,
           skullLeft:g('riftSkull').style.left, skullShown:g('riftSkull').style.display,
           paceLeft:g('riftPace').style.left, paceShown:g('riftPace').style.display,
           hourLeft:g('riftHour').style.left,
           verdict:g('riftPaceTxt').textContent, verdictColour:g('riftPaceTxt').style.color,
           border:g('riftFrame').style.borderColor,
           clock:g('riftClock').textContent, pct:g('riftPct').textContent };
}
// his screenshot: 64% cleared, ~27% of the time used -> comfortably ahead
R.hisScreenshot = scenario(64,100, 81,300, false, true);
// dead level
R.onPace        = scenario(50,100, 150,300, false, true);
// falling behind
R.behind        = scenario(20,100, 180,300, false, true);
// guardian up
R.guardian      = scenario(100,100, 200,300, true, true);
// a PLAIN rift must show no pace furniture at all
R.plainRift     = scenario(40,100, 0,300, false, false);

// ---- 3. the ordering rule holds across the range -------------------------
const rows=[];
for(let p=0;p<=100;p+=10){
  const s=scenario(p,100, 150,300, false, true);   // time fixed at 50%
  rows.push({progress:p, verdict:s.verdict.split(' ')[0]});
}
R.sweepAtHalfTime = rows;
console.log(JSON.stringify(R,null,1));
