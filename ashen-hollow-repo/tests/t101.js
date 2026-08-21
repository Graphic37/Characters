// the rune tooltip: one name, one grant per line, weapon first
const fs=require('fs'), vm=require('vm');
const {JSDOM}=require('jsdom');
const src=fs.readFileSync('work.html','utf8');
const code=src.replace(/\/\*[\s\S]*?\*\//g,'');
const R={};

// ---- 1. the header prints the name ONCE ------------------------------
{
  const m=/const baseIsRedundant = it\.baseName && it\.name &&\s*\n\s*\(([^;]+)\);/.exec(code);
  const expr=m[1];
  const test=(name,baseName)=>{
    const it={name, baseName};
    return eval('(function(it){ return ('+expr+'); })')(it);
  };
  R.redundancy = {
    runeWithTier: test('Rune of Cinders (T5)','Rune of Cinders'),   // suffix -> hide
    identical:    test('Iron Ring','Iron Ring'),                    // same  -> hide
    realBase:     test('Doombane','Warden Bascinet'),               // differs -> SHOW
    prefixed:     test('Gleaming Warden Bascinet','Warden Bascinet') // base is a SUFFIX -> show
  };
  R.namePrintedOnce = R.redundancy.runeWithTier===true
                   && R.redundancy.identical===true
                   && R.redundancy.realBase===false;
  R.gearBaseKept = R.redundancy.prefixed===false;
}
// ---- 2. the grants render one per line, weapon first ------------------
{
  const a=src.indexOf("  if(it.kind==='rune'){");
  const b=src.indexOf("  if(it.kind==='currency'){", a);
  function render(txt, tier){
    let b2='';
    const sb={ console, ahErr:()=>{},
      it:{kind:'rune', tier:tier||5},
      window:{ RUNE_STAT_TEXT:()=>txt } };
    sb.window.window=sb.window;
    vm.createContext(sb);
    vm.runInContext('var b=""; var it=this.it; var window=this.window;\n'+
      'var RUNE_STAT_TEXT=window.RUNE_STAT_TEXT;\n'+
      src.slice(a,b)+'\nthis.OUT=b;', sb, {filename:'r.js'});
    return sb.OUT;
  }
  // the shipped text puts weapon first already
  const html=render('Weapon: 6% increased Fire Damage\nArmour: +3% to Fire Resistance');
  const doc=new JSDOM('<div>'+html+'</div>').window.document;
  R.lines = [...doc.querySelectorAll('.runeline')].map(e=>e.textContent);
  R.oneGrantPerLine = R.lines.length===2;
  R.weaponFirst = /^Weapon/.test(R.lines[0]||'') && /^Armour/.test(R.lines[1]||'');
  R.tierRowKept = /Tier:/.test(doc.body.textContent) && /five fuse into T4/.test(doc.body.textContent);

  // ⚠ AND IT SORTS: a definition written armour-first must still render weapon-first
  const flipped=render('Armour: +3% to Fire Resistance\nWeapon: 6% increased Fire Damage');
  const d2=new JSDOM('<div>'+flipped+'</div>').window.document;
  R.flipped = [...d2.querySelectorAll('.runeline')].map(e=>e.textContent);
  R.sortsRegardlessOfSource = /^Weapon/.test(R.flipped[0]||'');

  // a slot-agnostic rune (one line, neither prefix) still renders
  const single=render('+52 to Armour');
  const d3=new JSDOM('<div>'+single+'</div>').window.document;
  R.singleGrant = [...d3.querySelectorAll('.runeline')].map(e=>e.textContent);
  R.singleStillWorks = R.singleGrant.length===1;

  // no text at all -> no empty rule, no blank rows
  const none=render('');
  R.noText = { hasRule:/<hr>/.test(none.slice(none.indexOf('Tier')+4)),
               rows:(none.match(/runeline/g)||[]).length };
  R.emptySafe = R.noText.rows===0;
}
// ---- 3. the SOCKETED path (v217) is untouched -------------------------
R.socketed = {
  stillSlotAware:/const slotKind = \(it\.cat==='weapon'\) \? 'weapon' : 'armour';/.test(code),
  separateFromItemPath:(code.match(/RUNE_STAT_TEXT/g)||[]).length>=2
};
R.socketedIntact = R.socketed.stillSlotAware;
console.log(JSON.stringify(R,null,1));
