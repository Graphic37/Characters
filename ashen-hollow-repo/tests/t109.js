// a rune's grant appears EXACTLY ONCE
const fs=require('fs'), vm=require('vm');
const {JSDOM}=require('jsdom');
const src=fs.readFileSync('work.html','utf8');
const code=src.replace(/\/\*[\s\S]*?\*\//g,'');
const R={};

// ---- render the real rune block + the real mods block ----------------
function render(it){
  const a=src.indexOf("  if(it.kind==='rune'){\n    b+='<hr><div class=\"prop\">Tier:");
  const b1=src.indexOf("  if(it.kind==='currency'){", a);
  const m1=src.indexOf("  if(it.mods && it.mods.length && it.kind!=='rune'){");
  const m2=src.indexOf("  if(it.desc)", m1);
  const sb={ console, ahErr:()=>{},
    it:it,
    statLine:(t)=>'<div class="mod">'+t+'</div>',
    window:{ RUNE_STAT_TEXT:(r)=>'6% increased Armour on this item',
      /* the real definitions keep a NEWLINE between the two halves; only
         RUNE_STAT_TEXT collapses it to a middot */
      RUNE_TYPES:[
        {id:'rn_arm',  txt:t=>'6% increased Armour on this item'},
        {id:'rn_fire', txt:t=>'Weapon: 6% increased Fire Damage\nArmour: +3% to Fire Resistance'}
      ] } };
  sb.window.window=sb.window;
  vm.createContext(sb);
  vm.runInContext('var b=""; var it=this.it; var window=this.window;\n'+
    'var RUNE_STAT_TEXT=window.RUNE_STAT_TEXT; var statLine=this.statLine;\n'+
    src.slice(a,b1)+'\n'+src.slice(m1,m2)+'\nthis.OUT=b;', sb, {filename:'r.js'});
  return sb.OUT;
}
const rune=(mods)=>({ kind:'rune', tier:5, runeType:'rn_arm', mods:mods });

// ---- 1. ⚠ EXACTLY ONE COPY OF THE GRANT ------------------------------
{
  const html=render(rune([{text:'6% increased Armour on this item'}]));
  const doc=new JSDOM('<div>'+html+'</div>').window.document;
  const lines=[...doc.querySelectorAll('.runeline')].map(e=>e.textContent);
  const mods =[...doc.querySelectorAll('.mod')].map(e=>e.textContent);
  R.single = { runelines:lines, modLines:mods,
               totalCopies:lines.concat(mods)
                 .filter(t=>/6% increased Armour/.test(t)).length };
  R.exactlyOnce = R.single.totalCopies===1;
  R.tierRowKept = /Tier:/.test(doc.body.textContent);
}
// ---- 2. a two-part rune still shows BOTH halves ----------------------
{
  const html=render(rune([{text:'Weapon: 6% increased Fire Damage'},
                          {text:'Armour: +3% to Fire Resistance'}]));
  const doc=new JSDOM('<div>'+html+'</div>').window.document;
  R.twoPart = [...doc.querySelectorAll('.runeline')].map(e=>e.textContent);
  R.bothHalvesKept = R.twoPart.length===2
    && /^Weapon/.test(R.twoPart[0]) && /^Armour/.test(R.twoPart[1]);
}
// ---- 3. ⚠ IDENTICAL LINES COLLAPSE, DIFFERENT ONES DO NOT ------------
{
  const same=render(rune([{text:'6% increased Armour on this item'},
                          {text:'6% increased Armour on this item'}]));
  const d1=new JSDOM('<div>'+same+'</div>').window.document;
  R.identicalCollapse = d1.querySelectorAll('.runeline').length===1;
  const diff=render(rune([{text:'6% increased Armour on this item'},
                          {text:'+12 to Evasion'}]));
  const d2=new JSDOM('<div>'+diff+'</div>').window.document;
  R.distinctKept = d2.querySelectorAll('.runeline').length===2;
}
// ---- 4. ⚠ NO STORED MOD: the halves must STILL split -----------------
{
  // this is the case that regressed — RUNE_STAT_TEXT had already replaced the
  // newline with a middot, so the fallback produced ONE merged sentence.
  const html=render({kind:'rune', tier:5, runeType:'rn_fire', mods:[]});
  const d=new JSDOM('<div>'+html+'</div>').window.document;
  R.fallbackSplits=[...d.querySelectorAll('.runeline')].map(e=>e.textContent);
  R.fallbackGivesTwoLines = R.fallbackSplits.length===2;
}
{
  const html=render(rune([]));
  const doc=new JSDOM('<div>'+html+'</div>').window.document;
  R.noModFallback = [...doc.querySelectorAll('.runeline')].map(e=>e.textContent);
  R.fallsBackToStatText = R.noModFallback.length===1;
}
// ---- 4b. a middot-joined string also splits --------------------------
{
  const html=render({kind:'rune', tier:5, runeType:'rn_none',
    mods:[{text:'Weapon: 6% increased Fire Damage \u00b7 Armour: +3% to Fire Resistance'}]});
  const d=new JSDOM('<div>'+html+'</div>').window.document;
  R.middotSplits=[...d.querySelectorAll('.runeline')].map(e=>e.textContent);
  R.middotGivesTwoLines = R.middotSplits.length===2;
}

// ---- 5. GEAR still shows its affixes ---------------------------------
{
  const gear={ kind:'gear', mods:[{text:'+36 to maximum Life', kind:'prefix'},
                                  {text:'91% increased Armour', kind:'suffix'}] };
  const html=render(gear);
  const doc=new JSDOM('<div>'+html+'</div>').window.document;
  R.gearMods = [...doc.querySelectorAll('.mod')].map(e=>e.textContent);
  R.gearUnaffected = R.gearMods.length===2;
}
console.log(JSON.stringify(R,null,1));
