// every board must claim exactly the grid's box, and the rune table must fit
const fs=require('fs'), vm=require('vm');
const {JSDOM}=require('jsdom');
const src=fs.readFileSync('work.html','utf8');
const css=src.slice(src.indexOf('<style>')+7, src.indexOf('</style>'));
const R={};

// ---- 1. the sizing rules are identical across all three boards -----------
function ruleFor(sel){
  const re=new RegExp(sel.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\{([^}]*)\\}');
  const m=css.match(re); return m?m[1].replace(/\s+/g,' ').trim():null;
}
const boards=ruleFor('#runeTab, #gemTab');
const cur=ruleFor('#curTab');
const grab=(txt,prop)=>{ const m=txt&&txt.match(new RegExp(prop+':([^;]+)')); return m?m[1].trim():null; };
R.boards={ width:grab(boards,'width'), height:grab(boards,'height'), max:grab(boards,'max-height'),
           minHeightGone: !/min-height/.test(boards||'') };
R.currency={ width:grab(cur,'width'), height:grab(cur,'height'), max:grab(cur,'max-height'),
             minHeightGone: !/min-height/.test(cur||'') };
R.allThreeMatch = R.boards.height===R.currency.height && R.boards.width===R.currency.width
                  && R.boards.height==='calc(var(--cell) * 10)';

// ---- 2. arithmetic: does the rune table fit in 10 cells at --cell 53? ----
const CELL=53, box=CELL*10;                      // 530px, the grid's height
const head=9+3+1+4;                              // caption + padding + border + margin
const row=38+4;                                  // cell height + margin
const foot=3*14+6;                               // three lines of note + margin
const pad=4+2;
const total=pad+head+9*row+foot;
R.runeBoardHeight={ box, computed:total, fits: total<=box, spare: box-total };

// ---- 3. the markup actually renders the new shape ------------------------
const a=src.indexOf("function runeTotalsByCell(){");
const b=src.indexOf("function drawStash(){");
const code=src.slice(a,b);
const dom=new JSDOM('<div class="grid-wrap"><div class="cells" id="stCells"></div></div>');
const doc=dom.window.document;
const CONT={inv:{items:[]},st2:{items:[]},st4:{items:[
  {kind:'rune',runeType:'rn_fire',tier:5,qty:3,name:'a'},
  {kind:'rune',runeType:'rn_res',tier:1,qty:1,name:'b'}]}};
const RUNE_TYPES=['rn_phys','rn_fire','rn_cold','rn_lght','rn_pois','rn_arm','rn_eva','rn_es','rn_res']
  .map(id=>({id,n:'Rune '+id,stat:id,txt:v=>'+'+v}));
const sb={console,document:doc,CONT,RUNE_TYPES,SUPPORTS:[],
  itemArt:()=>'<svg/>',toast:()=>{},refreshAll:()=>{},setHeld:()=>{},moveCursorItem:()=>{},
  findContainerOf:()=>null,removeItem:()=>{},hideTip:()=>{},cellScreen:()=>53,CUR:{style:{}},S:{},
  RANGER_GEMS:{},SKILLS:{}};
sb.window=sb; sb.window.RUNE_TYPES=RUNE_TYPES;
sb.window.runeTotals=()=>({phys:0,fire:9,cold:0,light:0,pois:0,ar:0,ev:0,es:0,res:52});
vm.createContext(sb); vm.runInContext(code,sb,{filename:'b.js'});
sb.drawRuneTab();
const rt=doc.getElementById('runeTab');
R.headers = Array.from(rt.querySelectorAll('.rnHeadTier')).map(e=>e.textContent).join(' ');
R.headerCount = rt.querySelectorAll('.rnHead').length;
R.rows = rt.querySelectorAll('.rnRow').length;
R.cells = rt.querySelectorAll('[data-rune]').length;
R.tierCaptionsInCells = rt.querySelectorAll('.rnTier').length;   // must be 0 now
R.qtyBadges = Array.from(rt.querySelectorAll('.rnQty')).map(e=>e.textContent).join(',');
sb.drawRuneTab(); sb.drawRuneTab();
R.headerAfterRedraws = doc.querySelectorAll('.rnHead').length;
console.log(JSON.stringify(R,null,1));
