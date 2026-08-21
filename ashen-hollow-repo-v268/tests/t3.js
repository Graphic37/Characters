const fs = require('fs'), vm = require('vm');
const { JSDOM } = require('jsdom');
const src = fs.readFileSync('work.html','utf8');

// the two board renderers + their helpers, verbatim from the shipped file
const a = src.indexOf("function runeTotalsByCell(){");
const b = src.indexOf("function drawStash(){");
const code = src.slice(a, b);

const dom = new JSDOM('<div class="grid-wrap"><div class="cells" id="stCells"></div></div>');
const doc = dom.window.document;

const CONT = { inv:{items:[]}, st2:{items:[]}, st4:{items:[]} };
const RUNE_TYPES = JSON.parse(JSON.stringify([
 {id:'rn_phys',n:'Rune of Iron',stat:'phys'},{id:'rn_fire',n:'Rune of Cinders',stat:'fire'},
 {id:'rn_cold',n:'Rune of Frost',stat:'cold'},{id:'rn_lght',n:'Rune of Storms',stat:'light'},
 {id:'rn_pois',n:'Rune of Blight',stat:'pois'},{id:'rn_arm',n:'Rune of the Wall',stat:'ar'},
 {id:'rn_eva',n:'Rune of the Fox',stat:'ev'},{id:'rn_es',n:'Rune of the Veil',stat:'es'},
 {id:'rn_res',n:'Rune of Warding',stat:'res'}
])).map(r => Object.assign(r, {txt: v => '+'+v+' to '+r.stat}));

const SUPPORTS = [
 {id:'s_brut',n:'Savagery',desc:'34% more Physical Damage.'},
 {id:'s_tempo',n:'Swift Cadence',desc:'18% increased Attack Speed.'},
 {id:'s_cruel',n:'Cruel Edge',desc:'27% more vs Low Life.'},
 {id:'s_chain',n:'Fork',desc:'Projectiles Fork.'},
 {id:'s_min',n:'Grave Discipline',desc:'Minions deal more.'},
 {id:'s_aura',n:'Wider Reach',desc:'Auras bigger.'}
];

// stock the stash: three rune cells and two supports owned
CONT.st4.items.push({kind:'rune',runeType:'rn_fire',tier:5,qty:3,name:'Rune of Cinders (T5)'});
CONT.st4.items.push({kind:'rune',runeType:'rn_fire',tier:4,qty:1,name:'Rune of Cinders (T4)'});
CONT.st4.items.push({kind:'rune',runeType:'rn_res', tier:1,qty:1,name:'Rune of Warding (T1)'});
CONT.st2.items.push({kind:'support',baseId:'s_brut',level:7});
CONT.st2.items.push({kind:'support',baseId:'s_brut',level:12});
CONT.st2.items.push({kind:'support',baseId:'s_chain',level:3});

const sandbox = {
  console, document: doc, CONT, RUNE_TYPES, SUPPORTS,
  itemArt: ()=>'<svg class="a"/>',
  toast: ()=>{}, refreshAll: ()=>{}, setHeld: ()=>{}, moveCursorItem: ()=>{},
  findContainerOf: ()=>CONT.st2, removeItem: ()=>{}, hideTip: ()=>{},
  cellScreen: ()=>53, CUR:{style:{}}, S:{},
  RANGER_GEMS: { multishot:{ sockets:[{baseId:'s_brut'},null,null] } },
  SKILLS: { multishot:{ n:'Multishot' } },
};
sandbox.window = sandbox;
sandbox.window.RUNE_TYPES = RUNE_TYPES;
sandbox.window.runeTotals = () => ({phys:0,fire:9,cold:0,light:0,pois:0,ar:0,ev:0,es:0,res:52});
vm.createContext(sandbox);
vm.runInContext(code, sandbox, {filename:'boards.js'});

const R = {};
sandbox.drawRuneTab();
const rt = doc.getElementById('runeTab');
R.runeRows = rt.querySelectorAll('.rnRow').length;
R.runeCells = rt.querySelectorAll('[data-rune]').length;
R.emptyCells = rt.querySelectorAll('.rnCell.empty').length;
R.filledCells = R.runeCells - R.emptyCells;
R.qtyBadges = Array.from(rt.querySelectorAll('.rnQty')).map(e=>e.textContent).join(',');
R.tierOrder = Array.from(rt.querySelectorAll('.rnHeadTier')).map(e=>e.textContent).join('');
R.liveTags = Array.from(rt.querySelectorAll('.rnLive')).map(e=>e.textContent.trim()).join(' | ');

sandbox.drawGemTab();
const gt = doc.getElementById('gemTab');
R.gemCards = gt.querySelectorAll('.gmCard').length;
R.gemOwned = gt.querySelectorAll('.gmCard:not(.empty)').length;
R.gemQtys = Array.from(gt.querySelectorAll('.gmQty')).map(e=>e.textContent).join(',');
R.gemBestLevel = (gt.querySelector('.gmLvl')||{}).textContent;
R.gemSocketedNote = (gt.querySelector('.gmIn')||{}).textContent;

// redraw twice: a board must not stack duplicates
sandbox.drawRuneTab(); sandbox.drawRuneTab();
R.rowsAfterRedraws = doc.getElementById('runeTab').querySelectorAll('.rnRow').length;
R.boardCount = doc.querySelectorAll('#runeTab').length;

console.log(JSON.stringify(R, null, 1));
