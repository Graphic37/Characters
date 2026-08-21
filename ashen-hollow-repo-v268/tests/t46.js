// the tooltip name plate: taller floor, text clear of the ornamental lip
const fs=require('fs'), vm=require('vm');
const {JSDOM}=require('jsdom');
const src=fs.readFileSync('work.html','utf8');
const R={};
const css=src.slice(src.indexOf('<style>')+7, src.indexOf('</style>'));

// 1. every fallback moved together — a stale one gives a cramped first frame
R.fallbacks = { stale:(src.match(/var\(--tipHead,(46|54)px\)/g)||[]).length,
                current:(src.match(/var\(--tipHead,58px\)/g)||[]).length };
R.allFallbacksMoved = R.fallbacks.stale===0 && R.fallbacks.current===5;

// 2. the padding change is present and is the TOP that grew
// ⚠ there are SEVERAL `.tip-head` rules; the first match is a different one.
// Select the rule by its CONTENT (the one that owns --tipHead), not by position.
const rule=(css.match(/\{[^{}]*min-height:var\(--tipHead[^{}]*\}/)||[''])[0].replace(/\s+/g,' ');
const pad=/padding:([\d]+)px ([\d]+)px ([\d]+)px/.exec(rule);
R.padding = { top:+pad[1], sides:+pad[2], bottom:+pad[3],
  /* ⚠ the real assertion: BALANCED. Asymmetric padding biases the centring
     box and just moves the crowding from one edge to the other. */
  balanced: pad[1]===pad[3],
  biasPx: (+pad[1] - +pad[3])/2 };
R.stillCentres = /justify-content:center/.test(rule);

// 3. measureTipHead: run the REAL function against known header heights
const a=src.indexOf('function measureTipHead(){');
const b=src.indexOf('function positionTip(ev){');
function measure(headHeight){
  const dom=new JSDOM('<div class="tip"><div class="tip-head"></div></div>');
  const doc=dom.window.document;
  const tip=doc.querySelector('.tip'), hd=doc.querySelector('.tip-head');
  Object.defineProperty(hd,'scrollHeight',{get:()=>headHeight});
  const set={};
  tip.style.setProperty=(k,v)=>{ set[k]=v; };
  const sb={console, TIP:{ querySelectorAll:()=>[tip] }};
  sb.window=sb; vm.createContext(sb);
  vm.runInContext(src.slice(a,b)+'\nthis.M=measureTipHead;', sb, {filename:'m.js'});
  sb.M();
  return set['--tipHead'];
}
R.measured = {
  tiny_10px:  measure(10),   // floor applies
  oneLine_24: measure(24),   // floor still applies
  twoLine_38: measure(38),   // 38+16 = 54 -> ties the floor
  twoLine_44: measure(44),   // 44+16 = 60 -> above the floor
  tall_60:    measure(60) };
R.floorIs58 = R.measured.tiny_10px==='58px' && R.measured.oneLine_24==='58px';
R.slackIs20 = R.measured.twoLine_44==='64px' && R.measured.tall_60==='80px';
// the old numbers, for comparison: a 38px two-line header got 50px
// a REAL two-line header: scrollHeight includes the 26px of padding, so a
// ~30px text block measures ~56 and the band lands at 76.
R.realTwoLine = measure(56);
R.progression = { v189:'50px', v190:'54px', now:R.measured.twoLine_38 };
console.log(JSON.stringify(R,null,1));
