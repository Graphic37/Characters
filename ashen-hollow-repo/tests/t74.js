// tooltip: no noise line, slot-correct rune text, bigger type
const fs=require('fs'), vm=require('vm');
const src=fs.readFileSync('work.html','utf8');
const R={};

// ---- 1. the "No sockets" sentence is GONE ------------------------------
// ⚠ my own comment QUOTES the removed string, so a raw search finds it and
// reports the line as still present. Strip comments before asserting removal —
// this is the same artefact as v193's blend-mode check.
const codeOnly = src.replace(/\/\*[\s\S]*?\*\//g,'');
R.noiseLineGone = !/No sockets <span/.test(codeOnly)
               && !/a Socket Orb adds one \(max/.test(codeOnly);
// and an item WITH sockets still shows the row
R.socketRowKept = /Sockets: <b>'\+pips\+'<\/b>/.test(src);

// ---- 2. the rune line shows ONLY the applicable half -------------------
{
  const a=src.indexOf('function FAM_NAME(f){');
  const b=src.indexOf('function tipHTML(it, cmp, vs){');
  const ra=src.indexOf('const RUNE_ELEM_PCT');
  const rb=src.indexOf('window.runeEffect=runeEffect;');
  const sb={ console, Math, ahErr:()=>{} };
  sb.window=sb;
  vm.createContext(sb);
  // v244: runeEffect also resolves the local-% defensive runes
  const PRE='const RUNE_LOCAL_STAT={rn_arm:"ar",rn_eva:"ev",rn_es:"es"};'+
    'const RUNE_LOCAL_PCT=[0,6,9,13,17,22];const RUNE_ALLRES=[0,1,2,3,4,5];\n';
  vm.runInContext(PRE+'const RUNE_MAG=[0,4,9,17,30,52];\n'+src.slice(ra,rb)+
    '\nwindow.runeEffect=runeEffect;\n'+src.slice(a,b)+
    '\nthis.F=FAM_NAME; this.T=RUNE_FLAT_TEXT; this.E=runeEffect;', sb, {filename:'n.js'});

  // replicate the tooltip's decision exactly
  const line=(rune, cat)=>{
    const slotKind=(cat==='weapon')?'weapon':'armour';
    const eff=sb.E(rune.runeType, rune.tier, slotKind);
    if(eff.kind==='pct')  return eff.v+'% increased '+sb.F(eff.family)+' Damage';
    if(eff.kind==='res')  return '+'+eff.v+'% to '+sb.F(eff.family)+' Resistance';
    if(eff.kind==='flat') return sb.T(rune, eff.v);
    if(eff.kind==='none') return 'No effect in this item';
    // v244: the defensive runes are local percentages now
    if(eff.kind==='localpct') return eff.v+'% increased '+
      ({ar:'Armour',ev:'Evasion',es:'Energy Shield'}[eff.stat]||'')+' on this item';
    if(eff.kind==='allres') return '+'+eff.v+'% to all Resistances';
    return '';
  };
  const storms={runeType:'rn_lght', tier:5, stat:'light'};
  const iron  ={runeType:'rn_phys', tier:1, stat:'phys'};
  const wall  ={runeType:'rn_arm',  tier:1, stat:'ar'};
  R.lines = {
    stormsInHelmet: line(storms,'helmet'),
    stormsInWeapon: line(storms,'weapon'),
    ironInWeapon:   line(iron,'weapon'),
    ironInHelmet:   line(iron,'helmet'),
    wallInHelmet:   line(wall,'helmet')
  };
  // ⚠ the whole point: a helmet must NOT mention a weapon bonus
  R.helmetHidesWeaponHalf = !/Damage/.test(R.lines.stormsInHelmet);
  R.weaponHidesArmourHalf = !/Resistance/.test(R.lines.stormsInWeapon);
  R.oneLineEach = Object.values(R.lines).every(l=>l.length<50 && !/\u2014|·/.test(l));
  R.ironHonest = /No effect/.test(R.lines.ironInHelmet);
}

// ---- 3. width grew BEFORE the type ------------------------------------
{
  const css=src.slice(src.indexOf('<style>'), src.indexOf('</style>'))
               .replace(/\/\*[\s\S]*?\*\//g,'');
  // ⚠ the selectors passed in are ALREADY regex-escaped by the caller, so
  // escaping them a second time turned `\.tip` into `\\.tip` and matched
  // nothing — every size came back null.
  const last=(sel)=>{ const re=new RegExp(sel+'\\{([^}]*)\\}','g');
    let m,v=null; while((m=re.exec(css))) v=m[1]; return (v||'').replace(/\s+/g,' '); };
  const num=(r,p)=>{ const m=new RegExp(p+':([\\d.]+)px').exec(r); return m?+m[1]:null; };
  R.type = {
    width: num(last('body\\[data-skin="forged"\\] #tipwrap \\.tip'), 'width'),
    name:  num(last('body\\[data-skin="forged"\\] #tipwrap \\.tip-name'), 'font-size'),
    prop:  num(last('#tipwrap \\.tip \\.prop'), 'font-size'),
    mod:   num(last('#tipwrap \\.tip \\.mod'), 'font-size'),
    rune:  num(last('#tipwrap \\.tip \\.runeline'), 'font-size')
  };
  R.widerThanBefore = R.type.width > 306;
  R.typeBiggerThanBefore = R.type.mod > 11.5 && R.type.name > 15;
  // ⚠ the ratio matters: more width per point of font than before, or affixes wrap
  R.widthKeptPace = (R.type.width/306) >= (R.type.mod/11.5) - 0.01;
  R.runeIsLightBlue = /#8fc7ff/.test(last('#tipwrap \\.tip \\.runeline'));
  R.runeMatchesAffixSize = R.type.rune === R.type.mod;
}
console.log(JSON.stringify(R,null,1));
