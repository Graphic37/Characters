// every elite carries a bar at all times; normals still earn theirs
const fs=require('fs'), vm=require('vm');
const src=fs.readFileSync('work.html','utf8');
const code=src.replace(/\/\*[\s\S]*?\*\//g,'');
const R={};
const i=src.indexOf('    const mode=window.HPBAR_MODE;');
const j=src.indexOf('    if(wantBar && hi<ACTORS.cap){', i);
const decision=src.slice(i, j);

function want(e, mode, plated){
  const sb={ console, ahErr:()=>{}, e:e, nowA:100,
    window:{ HPBAR_MODE:mode, HPBAR_LINGER:3,
             HEADPLATE_OWNER:()=>plated||null } };
  sb.window.window=sb.window;
  vm.createContext(sb);
  vm.runInContext('var window=this.window; var HEADPLATE_OWNER=window.HEADPLATE_OWNER;\n'
    +decision+'\nthis.R=wantBar;', sb, {filename:'d.js'});
  return sb.R;
}
const mob=(o)=>Object.assign({hp:100, maxHp:100, rarity:'normal', isBoss:false,
                              lastHitAt:0}, o);

// ---- 1. ⚠ BOTH KINDS OF ELITE, AT FULL HEALTH, NEVER HIT --------------
{
  R.atFullHealth = {
    magicElite: want(mob({elitePack:'magic', rarity:'magic'})),
    rareElite:  want(mob({elitePack:'rare',  rarity:'rare'})),
    boss:       want(mob({isBoss:true})),
    normal:     want(mob({}))
  };
  R.everyEliteAlwaysOn = R.atFullHealth.magicElite===true
                      && R.atFullHealth.rareElite===true
                      && R.atFullHealth.boss===true;
  R.normalsStillQuiet = R.atFullHealth.normal===false;
}
// ---- 2. the OLD rule is what he was seeing ----------------------------
{
  // old: (recent || isBoss || rarity==='rare')
  const old=(e,now)=>{
    const hurt=e.hp<e.maxHp;
    const recent=hurt && (now-(e.lastHitAt||0) < 3);
    return recent || e.isBoss || e.rarity==='rare';
  };
  const magicFull=mob({elitePack:'magic', rarity:'magic'});
  const magicHitLongAgo=mob({elitePack:'magic', rarity:'magic', hp:60, lastHitAt:0});
  R.oldBehaviour = {
    magicAtFull:old(magicFull,100),
    magicHurtButStale:old(magicHitLongAgo,100),
    rareAtFull:old(mob({elitePack:'rare',rarity:'rare'}),100)
  };
  R.explainsTheReport = R.oldBehaviour.magicAtFull===false
                     && R.oldBehaviour.magicHurtButStale===false
                     && R.oldBehaviour.rareAtFull===true;
  R.nowFixed = want(magicFull)===true && want(magicHitLongAgo)===true;
}
// ---- 3. a hurt normal still shows, briefly ----------------------------
{
  R.normal = {
    justHit: want(mob({hp:60, lastHitAt:99})),      // 1s ago
    hitLongAgo: want(mob({hp:60, lastHitAt:80})),   // 20s ago
    untouched: want(mob({}))
  };
  R.normalsUnchanged = R.normal.justHit===true && R.normal.hitLongAgo===false
                    && R.normal.untouched===false;
}
// ---- 4. keyed on the SPAWN marker, not the loot tier ------------------
{
  // an elite whose rarity field disagrees must still get a bar
  R.oddCases = {
    elitePackOnly: want(mob({elitePack:'magic', rarity:'normal'})),
    rarityOnly:    want(mob({rarity:'rare'})),
    minion:        want(mob({eliteMinion:true}))    // escort: NOT an elite
  };
  R.keyedOnSpawnMarker = R.oddCases.elitePackOnly===true
                      && R.oddCases.rarityOnly===true
                      && R.oddCases.minion===false;
}
// ---- 5. modes and the plate dedupe both survive -----------------------
{
  R.modes = {
    always_normal: want(mob({}), 'always'),
    off_normal:    want(mob({}), 'off'),
    off_elite:     want(mob({elitePack:'magic'}), 'off')
  };
  R.modesIntact = R.modes.always_normal===true && R.modes.off_normal===false
               && R.modes.off_elite===true;
  const plated=mob({elitePack:'rare', rarity:'rare'});
  R.platedSuppressed = want(plated, undefined, plated)===false;
  R.otherEliteKept = want(mob({elitePack:'rare', rarity:'rare'}), undefined, plated)===true;
}
// ---- 6. the cap cannot starve elites ---------------------------------
{
  const cap=+(/cap:\s*(\d+)/.exec(src)||[])[1];
  R.cap = { value:cap, worstCaseEnemies:271,
            // hi increments at most once per enemy, so bars <= enemies
            canStarve: 271 > cap };
  R.capSafe = R.cap.canStarve===false;
}
console.log(JSON.stringify(R,null,1));
