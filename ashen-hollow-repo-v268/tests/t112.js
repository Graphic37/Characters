// ENEMY BALANCE — measured against benchmark profiles, not his character
const fs=require('fs'), vm=require('vm');
const src=fs.readFileSync('work.html','utf8');
const code=src.replace(/\/\*[\s\S]*?\*\//g,'');
const R={};

// ---- the real curve functions, extracted ------------------------------
const a=src.indexOf('function enemyDmgAt(level){');
const b=src.indexOf('window.enemyDmgAt=enemyDmgAt;');
const cfg=/const CFG = \{[\s\S]*?\n\};/.exec(src)[0];
const sb={ console, Math, window:{} };
sb.window=sb; vm.createContext(sb);
vm.runInContext(cfg+'\n'+src.slice(a,b)+
  '\nthis.D=enemyDmgAt; this.H=enemyHpAt; this.C=enemyCadenceAt; this.CFG=CFG;',
  sb, {filename:'c.js'});

// ---- benchmark defensive profiles (early / mid / end) -----------------
const PROF={
  early:{lvl:15, life:420,  ar:420,  ev:260,  res:15},
  mid:  {lvl:40, life:1020, ar:1900, ev:900,  res:45},
  end:  {lvl:85, life:2760, ar:7000, ev:2600, res:72}
};
const K=5, EVK=55, EVCAP=0.60;
const afterArmour=(raw,ar)=>raw*(1 - ar/(ar+K*raw));
const dodge=(p,atkLvl)=>Math.min(EVCAP, p.ev/(p.ev+EVK*atkLvl));

// ---- 1. damage now scales super-linearly ------------------------------
{
  const old=(t)=>6+1.7*t;
  R.damage={};
  [1,20,35,60,100].forEach(t=>{
    R.damage['T'+t]={ was:Math.round(old(t)), now:Math.round(sb.D(t)),
                      x:+(sb.D(t)/old(t)).toFixed(1) };
  });
  R.superLinear = sb.D(100)/sb.D(50) > 2;   // doubling tier more than doubles it
  R.lowTierUntouched = Math.abs(sb.D(1)-8)<1.5;
}
// ---- 2. ⚠ THE TARGETS, AS PERCENT OF EACH BENCHMARK POOL -------------
{
  const R_M={normal:1.00, magic:1.25, rare:1.85};
  R.threat={};
  [20,35,60,100].forEach(t=>{
    const row={};
    Object.keys(PROF).forEach(k=>{
      const p=PROF[k];
      row[k]={};
      Object.keys(R_M).forEach(r=>{
        row[k][r]=Math.round(100*afterArmour(sb.D(t)*R_M[r], p.ar)/p.life);
      });
      /* the telegraphed heavy on a rare */
      row[k].heavy=Math.round(100*afterArmour(sb.D(t)*R_M.rare*1.85, p.ar)/p.life);
    });
    R.threat['T'+t]=row;
  });
  const T35=R.threat.T35.mid, T100=R.threat.T100.mid;
  R.targets={
    'T35 reasonable for lv40 (normal 5-15%)': T35.normal>=5 && T35.normal<=15,
    'T100 normal nearly one-shots lv40 (>=60%)': T100.normal>=60,
    'T100 magic one-shots lv40 (>=90%)': T100.magic>=90,
    'T100 rare outright kills (>=100%)': T100.rare>=100,
    'T100 telegraphed kills (>=100%)': T100.heavy>=100,
    'T100 survivable for endgame (<40%)': R.threat.T100.end.normal<40,
    'early has no business at T60 (>=100%)': R.threat.T60.early.normal>=100
  };
  R.hitsTargets = Object.values(R.targets).every(Boolean);
}
// ---- 3. HP grows, but gentler than damage ----------------------------
{
  const oldHp=(t)=>34+11*t;
  R.hp={};
  [20,35,100].forEach(t=>{ R.hp['T'+t]={ was:Math.round(oldHp(t)),
    now:Math.round(sb.H(t)), x:+(sb.H(t)/oldHp(t)).toFixed(2) }; });
  const dmgX=sb.D(100)/(6+1.7*100), hpX=sb.H(100)/oldHp(100);
  R.hpGrowsSlower = hpX < dmgX;
  R.hpRespectsPacing = hpX < 3.5;   // v210 pacing demands a kill every 4.0s at T100
}
// ---- 4. ⚠ EVASION DEGRADES AGAINST DEEPER ATTACKERS ------------------
{
  R.evasion = { readsAttacker:/DEF_CFG\.evasionK\*atkLvl/.test(code),
                signature:/function takeHit\(raw, type, hitKind, srcLevel\)/.test(code),
                enemyPasses:/takeHit\(dmg, type, 'attack', e && e\.level\)/.test(code) };
  const p=PROF.mid;
  R.evasion.vsT10  = Math.round(100*dodge(p,10));
  R.evasion.vsT100 = Math.round(100*dodge(p,100));
  R.evasionDegrades = R.evasion.vsT100 < R.evasion.vsT10
    && R.evasion.readsAttacker && R.evasion.signature && R.evasion.enemyPasses;
}
// ---- 5. hazards scale with their caster ------------------------------
{
  R.hazards = {
    poolFromCaster:/const dps = src && src\.dmg \? Math\.max\(2, src\.dmg\*0\.40\) : 14;/.test(code),
    plaguePassesSelf:/affixPool\(e\.g\.position\.x, e\.g\.position\.z, 2\.6, 6, 'pois', e\)/.test(code),
    fuseCarriesLevel:/dmg:\(src&&src\.dmg\)\|\|8, level:\(src&&src\.level\)\|\|0/.test(code),
    fieldPassesLevel:/'dot', f\.level\)/.test(code)
  };
  // a T100 rare's pool vs the old flat 14
  const rareDmg=sb.D(100)*1.85;
  R.hazards.poolDpsT100=Math.round(rareDmg*0.40);
  R.hazards.wasFlat=14;
  R.hazardsScale = Object.keys(R.hazards).filter(k=>k.endsWith('Level')||k.endsWith('Caster')||k.endsWith('Self'))
    .every(k=>R.hazards[k]) && R.hazards.poolDpsT100 > 200;
}
// ---- 6. cadence tightens modestly ------------------------------------
{
  R.cadence={ T1:+sb.C(1).toFixed(2), T50:+sb.C(50).toFixed(2), T100:+sb.C(100).toFixed(2) };
  R.cadenceModest = R.cadence.T100>=0.7 && R.cadence.T100<1 && R.cadence.T1===1;
}
// ---- 7. ⚠ THE PLAYER WAS NOT TOUCHED ---------------------------------
{
  R.playerUntouched = {
    lifeFormula:/const life=Math\.round\(180\+S\.lvl\*8\+\(m\.life\|\|0\)\)/.test(code),
    armourK:/armourK: 5/.test(code),
    evasionCap:/evasionCap: 0\.60/.test(code),
    // ⚠ it is `resCap: 0.75` (a fraction), not 75. I asserted the wrong VALUE
    // and read an untouched constant as changed — check what the file says
    // before deciding the file is wrong.
    resCap:/resCap:\s*0\.75\b/.test(code)
  };
  R.noPlayerNerf = Object.values(R.playerUntouched).every(Boolean);
}
R.PASS = R.hitsTargets && R.evasionDegrades && R.hazardsScale
      && R.hpGrowsSlower && R.cadenceModest && R.noPlayerNerf && R.superLinear;
console.log(JSON.stringify(R,null,1));
if(!R.PASS) process.exit(1);
