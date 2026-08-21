// sockets must be VISIBLE: on the item, on the paperdoll, and in the tooltip
const fs=require('fs'), vm=require('vm');
const {JSDOM}=require('jsdom');
const src=fs.readFileSync('work.html','utf8');
const R={};

// ---- 1. the real itemEl draws pips -------------------------------------
const a=src.indexOf('const RUNE_COLOUR = {');
const b=src.indexOf('/* ---- inventory panel ---');
const code=src.slice(a,b);
const dom=new JSDOM('<div id=x></div>');
const sb={ console, document:dom.window.document,
  itemArt:()=>'<svg/>', gearArtURL:()=>null, S:{useItem:null, filter:''} };
sb.window=sb; vm.createContext(sb);
vm.runInContext(code+'\nthis.F=itemEl; this.C=runeColour;', sb, {filename:'i.js'});

const mk=(sockets,runes)=>({uid:1,kind:'gear',rarity:'rare',name:'Helm',baseName:'Helm',
  x:0,y:0,w:2,h:2, socketCount:sockets, runes:runes});
function pips(el){
  return { count:el.querySelectorAll('.gsocks .gs').length,
           filled:el.querySelectorAll('.gsocks .gs.full').length,
           colours:[...el.querySelectorAll('.gs.full')].map(e=>e.getAttribute('style')) };
}
R.noSockets = pips(sb.F(mk(0,[]),53));
R.threeEmpty = pips(sb.F(mk(3,[null,null,null]),53));
R.oneFilled = pips(sb.F(mk(3,[{stat:'fire',name:'Rune of Cinders (T5)'},null,null]),53));
R.allFilled = pips(sb.F(mk(2,[{stat:'cold',name:'a'},{stat:'ar',name:'b'}]),53));
R.colourByStat = { fire:sb.C({stat:'fire'}), cold:sb.C({stat:'cold'}),
                   unknown:sb.C({stat:'nope'}), none:sb.C(null) };
R.distinctColours = new Set(['fire','cold','light','pois','ar','ev','es','res','phys']
  .map(s=>sb.C({stat:s}))).size;

// ---- 2. the tooltip speaks at ZERO sockets -----------------------------
R.tipZeroLine = /No sockets <span class="lo">/.test(src);
R.tipStillListsRunes = /class="runeline"/.test(src);
// the "no sockets" branch must not also run when there ARE sockets
const ta=src.indexOf('    const scap=it.socketCount||0;');
const tb=src.indexOf('  if(it.kind===\'support\')', ta);
const tip=src.slice(ta,tb);
R.branchesExclusive = /if\(!scap\)\{/.test(tip) && /\n    if\(scap\)\{/.test(tip);

// ---- 3. why he could not tell: gear ships with ZERO sockets -------------
R.gearDefaultSockets = +/socketCount: (\d+),/.exec(src)[1];
R.socketSources = { socketOrb:/it\.socketCount=\(it\.socketCount\|\|0\)\+1;/.test(src),
                    corruption:/corruptionResult='extra socket'/.test(src),
                    onDrop:/socketCount\s*[:=]\s*(?!0)/.test(src.slice(src.indexOf('function makeGear'), src.indexOf('function makeGear')+3000)) };
console.log(JSON.stringify(R,null,1));
