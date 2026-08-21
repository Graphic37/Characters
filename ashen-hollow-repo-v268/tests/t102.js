// defensive rune lock + placement rule + tooltip clamp + socket display
const fs=require('fs'), vm=require('vm');
const {JSDOM}=require('jsdom');
const src=fs.readFileSync('work.html','utf8');
const code=src.replace(/\/\*[\s\S]*?\*\//g,'');
const R={};

// ---- 1. the locked curves ---------------------------------------------
{
  const loc=eval(/const RUNE_LOCAL_PCT=(\[[^\]]*\])/.exec(code)[1]);
  const all=eval(/const RUNE_ALLRES=(\[[^\]]*\])/.exec(code)[1]);
  R.curves = {
    // ⚠ ASSERT BY TIER, NEVER BY INDEX — the v191 rule. An earlier version of
    // this line `.reverse()`d the result, which made a WRONGLY-ORDERED table
    // look correct. Read each tier explicitly instead.
    local:[5,4,3,2,1].map(t=>loc[6-t]),
    allRes:[5,4,3,2,1].map(t=>all[6-t])
  };
  R.lockedAsAgreed = JSON.stringify(R.curves.local)==='[6,9,13,17,22]'
                  && JSON.stringify(R.curves.allRes)==='[1,2,3,4,5]';
  // ⚠ Warding must stay WORSE per family than fixing one family (3/5/7/9/12)
  const single=[3,5,7,9,12];
  R.wardingIsBroaderNotBetter = R.curves.allRes.every((v,i)=>v<single[i]);
}
// ---- 2. runeEffect returns the new kinds ------------------------------
{
  const a=src.indexOf('const RUNE_LOCAL_PCT=');
  const b=src.indexOf('window.RUNE_TYPES=RUNE_TYPES;');
  const sb={ console, Math, window:{} };
  sb.window=sb; vm.createContext(sb);
  // ⚠ the slice is SELF-CONTAINED — it declares the curves, RUNE_MAG and
  // RUNE_FAMILY itself. Every stub I added was a redeclaration.
  vm.runInContext(src.slice(a,b)+'\nthis.E=runeEffect; this.F=window.runeFitsItem;'+
    '\nthis.N=window.itemNativeDefence;', sb, {filename:'e.js'});
  R.effects = {
    wallT1:sb.E('rn_arm',1,'armour'),
    wallT5:sb.E('rn_arm',5,'armour'),
    foxT1:sb.E('rn_eva',1,'armour'),
    veilT1:sb.E('rn_es',1,'armour'),
    wardingT1:sb.E('rn_res',1,'armour')
  };
  R.kindsCorrect = R.effects.wallT1.kind==='localpct' && R.effects.wallT1.v===22
    && R.effects.wallT1.stat==='ar' && R.effects.foxT1.stat==='ev'
    && R.effects.veilT1.stat==='es' && R.effects.wardingT1.kind==='allres'
    && R.effects.wardingT1.v===5 && R.effects.wallT5.v===6;
  R.noFlatLeft = !JSON.stringify(R.effects).includes('"flat"');
  // ---- 3. ⚠ THE PLACEMENT RULE ----------------------------------------
  sb.window.BASES=[
    {id:'b_ar',  def:{ar:246}},
    {id:'b_ev',  def:{ev:238}},
    {id:'b_es',  def:{es:132}},
    {id:'b_hyb', def:{ar:214, ev:64}},
    {id:'b_ring',def:{}}
  ];
  const g=(b)=>({kind:'gear', baseId:b});
  R.fits = {
    wall_into_armour: sb.F('rn_arm', g('b_ar')).ok,
    wall_into_evasion:sb.F('rn_arm', g('b_ev')).ok,
    fox_into_hybrid:  sb.F('rn_eva', g('b_hyb')).ok,
    veil_into_hybrid: sb.F('rn_es',  g('b_hyb')).ok,
    wall_into_ring:   sb.F('rn_arm', g('b_ring')).ok,
    fire_into_ring:   sb.F('rn_fire',g('b_ring')).ok,   // not one of the three
    why:sb.F('rn_es', g('b_ar')).why
  };
  R.placementCorrect = R.fits.wall_into_armour===true
    && R.fits.wall_into_evasion===false && R.fits.fox_into_hybrid===true
    && R.fits.veil_into_hybrid===false && R.fits.wall_into_ring===false
    && R.fits.fire_into_ring===true && /Energy Shield/.test(R.fits.why||'');
}
// ---- 4. local defence is ADDITIVE and measured on real bases ----------
{
  const a=src.indexOf('window.itemLocalDefence=function(it){');
  const b=src.indexOf('window.runeTotals=function(){');
  const sb={ console, Math, ahErr:()=>{},
    // ⚠ the stub carried the SAME inverted table as the code did, so it agreed
    // with the bug. Ascending, like the real one: index 1 = T5, index 5 = T1.
    runeEffect:(t,tier)=>({kind:'localpct', stat:{rn_arm:'ar',rn_eva:'ev',rn_es:'es'}[t],
                           v:[0,6,9,13,17,22][6-tier]}),
    itemNativeDefence:(it)=>it.__def };
  sb.window=sb; Object.assign(sb.window,{runeEffect:sb.runeEffect,
    itemNativeDefence:sb.itemNativeDefence});
  vm.createContext(sb);
  vm.runInContext(src.slice(a,b)+'\nthis.L=window.itemLocalDefence;', sb, {filename:'l.js'});
  const three=(t)=>[{runeType:'rn_arm',tier:t},{runeType:'rn_arm',tier:t},{runeType:'rn_arm',tier:t}];
  R.measured = {
    plate_3xT1:sb.L({__def:{ar:612,ev:0,es:0}, runes:three(1)}),
    boots_2xT1:sb.L({__def:{ar:0,ev:76,es:0},
      runes:[{runeType:'rn_eva',tier:1},{runeType:'rn_eva',tier:1}]}),
    helm_1xT5:sb.L({__def:{ar:76,ev:0,es:0}, runes:[{runeType:'rn_arm',tier:5}]})
  };
  // ⚠ ADDITIVE: 3 x 22% = 66%, NOT 1.22^3 = 82%
  R.additive = R.measured.plate_3xT1.ar===Math.round(612*1.66)
            && R.measured.plate_3xT1.ar!==Math.round(612*Math.pow(1.22,3));
  R.scalesWithBase = R.measured.plate_3xT1.ar-612 === 404
                  && R.measured.helm_1xT5.ar-76 === 5;
  // the regressive flat version, for the record
  R.oldFlatWasRegressive = { boots:Math.round(100*104/76), plate:Math.round(100*156/612) };
}
// ---- 5. runeTotals must NOT globalise a local percentage --------------
R.totals = {
  localNotSummed:/eff\.kind==='localpct'\)\{/.test(code)
    && /`itemLocalDefence` applies it per item/.test(src),
  allResSpreads:/t\.res4\.fire\+=eff\.v; t\.res4\.cold\+=eff\.v;/.test(code)
};
R.noGlobalLeak = R.totals.localNotSummed && R.totals.allResSpreads;
// ---- 6. ⚠ THE ALT TOOLTIP THREW ---------------------------------------
{
  const a=src.indexOf('function positionTip(ev){');
  const b=src.indexOf('function hideTip(){');
  function run(ev, w, h){
    const TIP={ style:{left:'700px', top:'640px'},
      getBoundingClientRect:()=>({width:w, height:h, left:700, top:640}) };
    const sb={ console, TIP, Math, parseFloat,
      window:{ innerWidth:1280, innerHeight:720 } };
    sb.window.innerWidth=1280; sb.window.innerHeight=720;
    sb.innerWidth=1280; sb.innerHeight=720;
    vm.createContext(sb);
    vm.runInContext(src.slice(a,b)+'\nthis.P=positionTip;', sb, {filename:'p.js'});
    let threw=false;
    try{ sb.P(ev); }catch(e){ threw=true; }
    return { threw, left:parseFloat(TIP.style.left), top:parseFloat(TIP.style.top) };
  }
  R.altNull = run(null, 400, 620);              // tall panel, no event
  R.withEvent = run({clientX:600, clientY:600}, 400, 300);
  R.altSurvivesNull = R.altNull.threw===false;
  R.clampedOnScreen = R.altNull.top + 620 <= 720 && R.altNull.top>=10;
  R.reclampsAfterAlt = /requestAnimationFrame\(\(\)=>\{ try\{ positionTip\(null\)/.test(code);
  R.heightCapped = /#tipwrap \.tip\{ max-height:85vh/.test(src);
}
// ---- 7. sockets show the rune, on the item and in the tooltip ---------
R.sockets = {
  tooltipUsesArt:/RUNE_ART\[r\.runeType\]\) \|\| '';/.test(code),
  tooltipTitles:/title="'\+\(r\.name\|\|''\)/.test(code),
  overlayOnItem:/inner\+='<div class="sockOverlay">'/.test(code),
  gearOnly:/it\.kind==='gear' && \(it\.socketCount\|\|0\) > 0/.test(code),
  bigCircles:/\.item \.sockOverlay \.os\{/.test(src)
};
R.socketsShown = Object.values(R.sockets).every(Boolean);
console.log(JSON.stringify(R,null,1));
