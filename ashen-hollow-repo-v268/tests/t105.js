// ⚠ THE BUG HUNT: do the defensive runes actually reach the character?
const fs=require('fs'), vm=require('vm');
const src=fs.readFileSync('work.html','utf8');
const code=src.replace(/\/\*[\s\S]*?\*\//g,'');
const R={};

// ---- 1. pieceDefence must apply the runes ----------------------------
{
  const a=src.indexOf('function pieceDefence(it){');
  const b=src.indexOf('function weaponStats(){');
  const sb={ console, Math, ahErr:()=>{},
    runeEffect:(t,tier)=>({kind:'localpct',
      stat:{rn_arm:'ar',rn_eva:'ev',rn_es:'es'}[t],
      v:[0,6,9,13,17,22][6-tier]}) };
  sb.window=sb; sb.window.runeEffect=sb.runeEffect;
  vm.createContext(sb);
  vm.runInContext(src.slice(a,b)+'\nthis.P=pieceDefence;', sb, {filename:'p.js'});
  const wall=(t)=>({runeType:'rn_arm', tier:t});
  R.plate = {
    bare:      sb.P({def:{ar:612}}).ar,
    oneT1:     sb.P({def:{ar:612}, runes:[wall(1)]}).ar,
    threeT1:   sb.P({def:{ar:612}, runes:[wall(1),wall(1),wall(1)]}).ar,
    threeT5:   sb.P({def:{ar:612}, runes:[wall(5),wall(5),wall(5)]}).ar
  };
  R.runesReachTheCharacter = R.plate.threeT1 === Math.round(612*1.66);
  // ⚠ ADDITIVE WITH LOCAL AFFIXES, not a second multiply
  const withAffix=sb.P({ def:{ar:612},
    mods:[{local:true, stat:'ar%', v:20}],
    runes:[wall(1),wall(1),wall(1)] }).ar;
  R.additiveWithAffixes = { value:withAffix,
    additive:Math.round(612*1.86), multiplicative:Math.round(612*1.66*1.20) };
  R.trulyAdditive = withAffix===R.additiveWithAffixes.additive
                 && withAffix!==R.additiveWithAffixes.multiplicative;
  // a rune in an item with no such defence adds nothing (legacy save safety)
  R.deadRuneHarmless = sb.P({def:{es:132}, runes:[wall(1)]}).es === 132;
}
// ---- 2. no stray resistance total ------------------------------------
R.noStrayRes = !/t\.res\+=eff\.v\*4/.test(code);

// ---- 3. ⚠ LEGACY SAVES: a rune socketed before the rule existed ------
{
  // an old save may hold Wall inside a pure-ES chest. It must not throw, must
  // not grant anything, and must not be silently counted somewhere else.
  const a=src.indexOf('window.itemLocalDefence=function(it){');
  const b=src.indexOf('window.runeTotals=function(){');
  const sb={ console, Math, ahErr:()=>{},
    runeEffect:(t,tier)=>({kind:'localpct', stat:'ar', v:22}),
    itemNativeDefence:()=>({ar:0, ev:0, es:132}) };
  sb.window=sb; Object.assign(sb.window,{runeEffect:sb.runeEffect,
    itemNativeDefence:sb.itemNativeDefence});
  vm.createContext(sb);
  vm.runInContext(src.slice(a,b)+'\nthis.L=window.itemLocalDefence;', sb, {filename:'l.js'});
  R.legacy = sb.L({ runes:[{runeType:'rn_arm', tier:1}] });
  R.legacySafe = R.legacy.ar===0 && R.legacy.es===132;
}
console.log(JSON.stringify(R,null,1));
