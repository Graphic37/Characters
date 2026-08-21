const fs=require('fs'), vm=require('vm');
const src=fs.readFileSync('work.html','utf8');
const a=src.indexOf("const CURRENCY_ART_BASE =");
const b=src.indexOf("/* ============================================================================\n   2. ITEM DATA");
const code=src.slice(a,b);
// ⚠ the RUNE_ART slice now also contains preloadArt() and its boot call,
// so the sandbox needs the browser bits that call reaches.
const sb={console, ART:'none', GEAR_ART_ON:false,
  setTimeout:()=>{}, requestIdleCallback:()=>{},
  Image:function(){ this.decode=()=>({then:(f)=>{f();return{catch:()=>{}};}}); },
  gearArtIMG:()=>null, giSVG:()=>null, giKeyFor:()=>'',
  flaskSVG:()=>'FLASK', gemSVG:(g,s)=>'GEM'+(s?'-support':''), orbSVG:()=>'ORB', icoSVG:()=>'ICO'};
sb.window=sb; vm.createContext(sb);
vm.runInContext(code+'\nthis.OUT={itemArt,RUNE_ART};',sb,{filename:'art.js'});
const {itemArt,RUNE_ART}=sb.OUT, R={};
R.types = Object.keys(RUNE_ART).length;
R.allMapped = Object.values(RUNE_ART).every(u=>/\/\d\d_[a-z_]+\.png$/.test(u));
R.allDistinct = new Set(Object.values(RUNE_ART)).size === Object.keys(RUNE_ART).length;
R.url = RUNE_ART.rn_fire;
const html = itemArt({kind:'rune', runeType:'rn_fire', tier:5});
R.runeUsesImg = /<img/.test(html) && /02_flame\.png/.test(html);   // mapped filename, not the id
R.containedNotStretched = /object-fit:contain/.test(html);
// an unknown rune type must not break — it falls through
R.unknownType = itemArt({kind:'rune', runeType:'rn_nope'});
// the kill switch
sb.RUNE_ART_ON=false;
R.offFallsThrough = itemArt({kind:'rune', runeType:'rn_fire'});
sb.RUNE_ART_ON=true;
// other kinds are untouched
R.support = itemArt({kind:'support', grad:'gRed'});
R.currencyStillFirst = /<img/.test(itemArt({kind:'currency', baseId:'cu_exalt'}));
console.log(JSON.stringify(R,null,1));
