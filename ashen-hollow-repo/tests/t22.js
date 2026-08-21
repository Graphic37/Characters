const fs=require('fs'), vm=require('vm');
const {JSDOM}=require('jsdom');
const src=fs.readFileSync('work.html','utf8');
const css=src.slice(src.indexOf('<style>')+7, src.indexOf('</style>'));
const R={};
const rule=(sel)=>{ const re=new RegExp('\\n'+sel.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\{([^}]*)\\}','g');
  let m,last=null; while((m=re.exec(css))) last=m[1]; return last?last.replace(/\s+/g,' ').trim():null; };

// 1. the plate exists, is a SIBLING of the bar, and is anchored to its left end
R.markupOrder = /id="xpLvl"[\s\S]{0,120}id="xpbar"/.test(src);
R.notInsideBar = !/id="xpbar"[^>]*>[\s\S]{0,60}id="xpLvl"/.test(src);
const p=rule('#xpLvl');
R.plate={ left:(p.match(/left:([^;]+)/)||[])[1], top:(p.match(/top:([^;]+)/)||[])[1],
          rotated:/rotate\(45deg\)/.test(p), size:(p.match(/width:([^;]+)/)||[])[1] };
// the bar is width 260 centred; its left edge is 50% - 130px
const bar=rule('#xpbar');
const barW=+(bar.match(/width:(\d+)px/)||[])[1];
const wantLeft='calc(50% - '+(barW/2)+'px)';
R.anchoredToBarEdge = R.plate.left.trim()===wantLeft;
R.barWidth=barW;
R.barClips = /overflow:hidden/.test(bar);      // why it can't live inside

// 2. the number counter-rotates so it reads upright
R.numUpright = /rotate\(-45deg\)/.test(rule('#xpLvlNum'));

// 3. it updates with the level, and 3 digits shrink
const ua=src.indexOf("  $('#npLvl').textContent=S.lvl;");
const code=src.slice(ua, src.indexOf('$(\'#xpfill\')', ua));
const dom=new JSDOM('<span id="npLvl"></span><span id="xpLvlNum">1</span>');
const doc=dom.window.document;
function setLvl(n){
  const sb={console, document:doc, $:(s)=>doc.querySelector(s), S:{lvl:n}};
  sb.window=sb; vm.createContext(sb); vm.runInContext(code, sb, {filename:'x.js'});
  const el=doc.getElementById('xpLvlNum');
  return { text:el.textContent, wide:el.classList.contains('wide') };
}
R.lvl1=setLvl(1); R.lvl42=setLvl(42); R.lvl100=setLvl(100); R.back=setLvl(7);
console.log(JSON.stringify(R,null,1));
