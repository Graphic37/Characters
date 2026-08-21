// support categories: self-classifying, grouped, filterable, searchable
const fs=require('fs'), vm=require('vm');
const {JSDOM}=require('jsdom');
const src=fs.readFileSync('work.html','utf8');
const R={};

// ---- 1. the category is a FIELD, not a central list -------------------
{
  const a=src.indexOf('const SUPPORT_CATS = [');
  const b=src.indexOf('const SUPPORT_DEFS = {');
  const sb={ console };
  sb.window=sb; vm.createContext(sb);
  vm.runInContext(src.slice(a,b)+'\nthis.C=SUPPORT_CATS; this.F=supportCat;', sb, {filename:'c.js'});
  sb.window.SUPPORT_DEFS={ a:{cat:'damage'}, b:{cat:'proj'}, c:{}, d:{cat:'nonsense'} };
  R.cats = sb.C.map(c=>c.id);
  R.classify = { withCat:sb.F('a'), otherCat:sb.F('b'),
                 missing:sb.F('c'), bogus:sb.F('d'), unknownId:sb.F('zz') };
  R.unknownFallsToOther = R.classify.missing==='other' && R.classify.bogus==='other'
                       && R.classify.unknownId==='other';
  // a NEW support with a valid cat classifies itself, no list edit
  sb.window.SUPPORT_DEFS.newGem={cat:'elemental'};
  R.newGemSelfClassifies = sb.F('newGem')==='elemental';
}

// ---- 2. the six shipped supports are all classified -------------------
{
  const defs=[...src.matchAll(/id:'(s_\w+)',\s*cat:'(\w+)'/g)].map(m=>[m[1],m[2]]);
  R.shipped = Object.fromEntries(defs);
  const allIds=[...src.matchAll(/(s_\w+)\s*:\s*\{ id:'s_\w+'/g)].map(m=>m[1]);
  R.everyShippedClassified = allIds.every(id=>R.shipped[id]);
  R.spread = [...new Set(defs.map(d=>d[1]))].length;
}

// ---- 3. the board groups, filters and searches ------------------------
{
  const a=src.indexOf('function drawGemTab(){');
  const b=src.indexOf('\n}\n', src.indexOf("support slot in the Skills panel.</div>'"))+2;
  const ca=src.indexOf('const SUPPORT_CATS = [');
  const cb=src.indexOf('const SUPPORT_DEFS = {');
  function run(cat, q){
    const dom=new JSDOM('<body><div id="stCells"></div></body>');
    const doc=dom.window.document;
    const host=doc.createElement('div'); host.id='gemTab';
    doc.body.appendChild(host);
    if(cat) host.dataset.cat=cat;
    if(q)   host.dataset.q=q;
    const DEFS={
      s_brut :{n:'Savagery',      cat:'damage', text:()=>'more Physical Damage'},
      s_cruel:{n:'Cruel Edge',    cat:'damage', text:()=>'more damage'},
      s_tempo:{n:'Swift Cadence', cat:'speed',  text:()=>'increased Attack Speed'},
      s_chain:{n:'Fork',          cat:'proj',   text:()=>'projectiles fork'},
      s_min  :{n:'Grave Discipline',cat:'minion',text:()=>'minions'},
      s_aura :{n:'Wider Reach',   cat:'area',   text:()=>'area of effect'}
    };
    const sb={ console, document:doc,
      supportTier:(id)=>id==='s_brut'?3:null,
      supportSocketedIn:()=>[], supportArt:()=>'',
      setTimeout:(fn)=>fn, clearTimeout:()=>{}, ahErr:()=>{} };
    sb.window=sb; sb.window.SUPPORT_DEFS=DEFS;
    vm.createContext(sb);
    vm.runInContext(src.slice(ca,cb)+'\nwindow.SUPPORT_CATS=SUPPORT_CATS; window.supportCat=supportCat;\n'
      +src.slice(a,b)+'\nthis.D=drawGemTab;', sb, {filename:'g.js'});
    sb.D();
    return { host, doc };
  }
  const all=run(null,null);
  R.allView = {
    groups:[...all.host.querySelectorAll('.gmGroupHead')].map(h=>h.textContent.trim()),
    cards:all.host.querySelectorAll('.gmCard').length,
    chips:[...all.host.querySelectorAll('.gmChip')].map(c=>c.textContent.trim()),
    hasSearch:!!all.host.querySelector('.gmSearch')
  };
  R.groupsWhenShowingAll = R.allView.groups.length===5 && R.allView.cards===6;
  // ⚠ EMPTY CATEGORIES MUST NOT APPEAR — a chip leading nowhere is a dead control
  R.noEmptyChips = !R.allView.chips.some(c=>/Elemental|Defence|Utility|Uncategorised/.test(c));

  const dmg=run('damage',null);
  R.damageView = { cards:dmg.host.querySelectorAll('.gmCard').length,
                   groups:dmg.host.querySelectorAll('.gmGroupHead').length,
                   activeChip:(dmg.host.querySelector('.gmChip.on')||{}).textContent };
  R.filterWorks = R.damageView.cards===2 && R.damageView.groups===0;

  const q=run(null,'fork');
  R.searchView = { cards:q.host.querySelectorAll('.gmCard').length,
                   name:(q.host.querySelector('.gmName')||{}).textContent };
  R.searchWorks = R.searchView.cards===1 && /Fork/.test(R.searchView.name||'');

  const none=run('minion','zzz');
  R.emptyState = { cards:none.host.querySelectorAll('.gmCard').length,
                   msg:(none.host.querySelector('.gmNone')||{}).textContent };
  R.emptyStateSpeaks = R.emptyState.cards===0 && /No support gems match/.test(R.emptyState.msg||'');
}
// ---- 4. state survives on the host, and listeners rebind --------------
R.wiring = {
  stateOnHost:/host\.dataset\.cat \|\| 'all'/.test(src),
  rebindsAfterInner:/host\.querySelectorAll\('\.gmChip'\)\.forEach/.test(src),
  searchDebounced:/host\.__qT=setTimeout/.test(src),
  caretRestored:/nb\.setSelectionRange\(nb\.value\.length/.test(src)
};
R.wiredWell = Object.values(R.wiring).every(Boolean);
console.log(JSON.stringify(R,null,1));
