// fitsAlongside must MEASURE, and must apply each dock's own scale
const fs=require('fs'), vm=require('vm');
const src=fs.readFileSync('work.html','utf8');
const a=src.indexOf('function fitsAlongside(){');
const b=src.indexOf('function scheduleFit(){');
const code=src.slice(a,b);
const R={};
function run(lw, rw, scaleL, scaleR, vw){
  const el=(w)=>({offsetWidth:w});
  const sb={ console, innerWidth:vw,
    document:{ getElementById:(id)=> id==='leftDock'?el(lw):id==='rightDock'?el(rw):null,
               documentElement:{} },
    getComputedStyle:()=>({ getPropertyValue:(v)=> v==='--uiL'?String(scaleL):String(scaleR) }) };
  sb.window=sb; vm.createContext(sb);
  vm.runInContext(code+'\nthis.F=fitsAlongside;', sb, {filename:'f.js'});
  return sb.F();
}
// a normal wide window: 640 + 560 + gutter fits in 1920
R.wide1920 = run(640, 560, 1, 1, 1920);
// a 1280 laptop at full scale: 640+560+120 = 1320 > 1280 -> steps aside
R.laptop1280 = run(640, 560, 1, 1, 1280);
// ...but the same laptop with the docks scaled down DOES fit
R.laptop1280scaled = run(640, 560, 0.8, 0.8, 1280);
// a phone-narrow window never fits
R.narrow700 = run(640, 560, 1, 1, 700);
// ⚠ the scale must actually be applied, or the answer is wrong by ~20%
// pick a viewport where the SCALE decides the answer — at 1320 both cases fit,
// so the original comparison proved nothing about whether scale was applied
R.scaleIsApplied = { atFullScale: run(640,560,1,1,1000),      // 1320 > 1000 -> false
                     atSixtyPct:  run(640,560,0.6,0.6,1000),  //  840 <=1000 -> true
                     differs: run(640,560,1,1,1000)!==run(640,560,0.6,0.6,1000) };
// missing docks or a broken style read must not throw
{
  const sb={console, innerWidth:1920, document:{getElementById:()=>null, documentElement:{}},
    getComputedStyle:()=>({getPropertyValue:()=>'nonsense'})};
  sb.window=sb; vm.createContext(sb);
  vm.runInContext(code+'\nthis.F=fitsAlongside;', sb, {filename:'f2.js'});
  R.missingDocksSafe = sb.F();
}
// a NaN scale falls back to 1 rather than poisoning the sum
R.nanScaleFallsBackTo1 = run(640,560,NaN,NaN,1920);
console.log(JSON.stringify(R,null,1));
