// bosses scale; affixes actually do something and route through takeHit
const fs=require('fs'), vm=require('vm');
const src=fs.readFileSync('work.html','utf8');
const R={};

// ---- 1. boss HP grows with tier ---------------------------------------
{
  const i=src.indexOf('bossHpMult: t =>');
  const fn=eval('('+src.slice(i+'bossHpMult: '.length, src.indexOf(',\n', i))+')');
  const mob=(t)=>34+11*t;
  R.boss=[1,15,30,50,75,100].map(t=>({tier:t, mult:fn(t),
    hp:Math.round(mob(t)*fn(t)), vsWhite:Math.round(fn(t))}));
  R.tankierThanBefore = R.boss.every(b=>b.mult > 9);
  R.growsWithTier = R.boss.every((b,i)=>i===0 || b.mult > R.boss[i-1].mult);
  R.callerPassesTier = /bossHpMult\(RIFT\.tier\)/.test(src);
  R.noStaleConstantUse = !/bossHpMult;/.test(src);
}

// ---- 2. the affixes exist, and the actives really are active ----------
{
  const a=src.indexOf('const MOB_MODS=[');
  const b=src.indexOf('window.MOB_MODS=MOB_MODS;');
  const sb={ console, Math,
    affixFuse:(x,z,r,d,s,t)=>sb.__fuses.push({x,z,r,d,t}),
    affixPool:(x,z,r,s,t)=>sb.__pools.push({x,z,r,s,t}),
    fxRing:()=>{}, fxFlash:()=>{},
    spawnEnemy:(x,z,l)=>({x,z,l}),
    ENEMIES:new Array(50), DEPTHS:null, ahErr:()=>{} };
  sb.__fuses=[]; sb.__pools=[];
  sb.window=sb;
  vm.createContext(sb);
  vm.runInContext(src.slice(a,b)+'\nthis.M=MOB_MODS;', sb, {filename:'m.js'});
  const M=sb.M;
  R.affixCount = M.length;
  R.actives = M.filter(m=>m.active).map(m=>m.n);
  R.passivesKept = M.filter(m=>!m.active).map(m=>m.n).length;

  const P={x:0,z:0};
  // ⚠ a THREE Vector3 has .set(); a plain object literal does not. The stub
  // must match the interface the real code uses, or the test fails on its own
  // shortcut rather than on the behaviour.
  const pos=(x,y,z)=>({x,y,z, set(a,b,c){ this.x=a; this.y=b; this.z=c; }});
  const e={ g:{position:pos(5,0,5)}, dmg:10, level:20, maxHp:100, hp:50,
            home:{x:5,z:5}, affixCd:{} };
  const by=(id)=>M.filter(m=>m.id===id)[0];

  sb.__fuses.length=0; by('mortar').tick(e,P);
  R.mortar={ shells:sb.__fuses.length, delay:sb.__fuses[0].d,
             type:sb.__fuses[0].t, nearPlayer:sb.__fuses.every(f=>Math.hypot(f.x,f.z)<=6) };
  sb.__fuses.length=0; by('frostorb').tick(e,P);
  R.frozen={ orbs:sb.__fuses.length, delay:sb.__fuses[0].d, type:sb.__fuses[0].t };
  sb.__pools.length=0; by('plague').tick(e);
  by('plague').onDeath(e);
  R.plague={ pools:sb.__pools.length, onDeathBigger:sb.__pools[1].r > sb.__pools[0].r };
  const wasAt={x:e.g.position.x, z:e.g.position.z};
  sb.__fuses.length=0; by('teleport').tick(e,P);
  R.teleport={ moved: e.g.position.x!==wasAt.x || e.g.position.z!==wasAt.z,
               nowNearPlayer: Math.hypot(e.g.position.x,e.g.position.z)<3,
               leashFollowed: e.home.x===e.g.position.x,
               landingFuse: sb.__fuses.length===1 };
  e.spawned=0; const sp=[]; sb.spawnEnemy=(x,z,l)=>{ sp.push(1); return {}; };
  by('summoner').tick(e); by('summoner').tick(e); by('summoner').tick(e);
  by('summoner').tick(e);
  R.summoner={ spawnedTotal:sp.length, cappedAt6:e.spawned<=6 };
  const v={}; by('vampiric').apply(v);
  R.vampiric={ leech:v.leech };
  R.allActivesDoSomething = ['mortar','frostorb','plague','teleport','summoner']
    .every(id=>typeof by(id).tick==='function') && v.leech>0;
}

// ---- 3. ⚠ the damage must go through takeHit, not areaHit -------------
R.routing = {
  enemyFuseUsesTakeHit: /if\(f\.enemy\)\{[\s\S]{0,600}takeHit\(/.test(src),
  playerFuseStillAreaHit: /\} else \{\s*\n\s*areaHit\(f\.x,f\.z,f\.r, 2\.2, 'explosive'\);/.test(src),
  hostileFieldUsesTakeHit: /if\(f\.hostile\)\{[\s\S]{0,500}takeHit\(/.test(src),
  falloff: /1 - 0\.6\*\(d\/f\.r\)/.test(src)
};
R.damageRoutedCorrectly = Object.values(R.routing).every(Boolean);

// ---- 4. the tick is throttled and range-gated ------------------------
R.tickGuards = {
  elitesOnly: /if\(!e \|\| e\.dead \|\| !e\.g \|\| !e\.modDefs/.test(src),
  rangeGated: /if\(dx\*dx\+dz\*dz > 900\) continue;/.test(src),
  perAffixCooldown: /if\(nowAf < \(e\.affixCd\[M\.id\]\|\|0\)\) continue;/.test(src),
  staggered: /M\.cd\*\(0\.85\+Math\.random\(\)\*0\.3\)/.test(src)
};
R.tickIsCheap = Object.values(R.tickGuards).every(Boolean);
R.modDefsStored = /\(e\.modDefs=e\.modDefs\|\|\[\]\)\.push\(m\);/.test(src);
console.log(JSON.stringify(R,null,1));
