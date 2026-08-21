// the boards must get bigger CONTENT without getting a bigger BOX
const fs=require('fs');
const src=fs.readFileSync('work.html','utf8');
const css=src.slice(src.indexOf('<style>'), src.indexOf('</style>'));
const R={};
const last=(sel)=>{ const re=new RegExp('\\n'+sel.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\{([^}]*)\\}','g');
  let m,v=null; while((m=re.exec(css))) v=m[1]; return v?v.replace(/\s+/g,' ').trim():null; };
const px=(rule,prop)=>{ const m=(rule||'').match(new RegExp(prop+':\\s*([0-9.]+)px')); return m?+m[1]:null; };

// 1. the BOX is unchanged — this is what stops the dock fitter undoing it
const board=last('#runeTab, #gemTab');
R.boxHeight=(board.match(/height:([^;!]+)/)||[])[1].trim();
R.boxUnchanged = R.boxHeight==='calc(var(--cell) * 10)';

// 2. the content grew
R.gem={ art:px(last('.gmArt'),'width'), name:px(last('.gmName'),'font-size'),
        desc:px(last('.gmDesc'),'font-size'), pad:(last('.gmCard')||'').match(/padding:([^;!]+)/)[1].trim() };
R.rune={ cell:px(last('.rnCell'),'height'), art:px(last('.rnArt'),'width') };
R.grew = R.gem.art>38 && R.gem.desc>10 && R.rune.cell>38;

// 3. IT STILL FITS. 6 cards + footer against the 530px box at --cell 53
const CELL=53, box=CELL*10;
const cardH = R.gem.art + 9*2 + 2;              // art + vertical padding + border
const gemTotal = 4+2 + 6*(cardH+7) + (3*17+8);  // pad + cards + 3-line footer
R.gemFits = { box, computed:gemTotal, fits:gemTotal<=box, spare:box-gemTotal };
const rnHead = 12+3+1+4;
const runeTotal = 4+2 + rnHead + 9*(R.rune.cell+4) + (3*17+8);
R.runeFits = { box, computed:runeTotal, fits:runeTotal<=box, spare:box-runeTotal };

// 4. the unowned card is readable, not a ghost
R.emptyOpacity = (last('.gmCard.empty')||'').match(/opacity:\s*([0-9.]+)/)[1];
console.log(JSON.stringify(R,null,1));
