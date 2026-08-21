// the plated enemy must not also carry an instanced bar
const fs=require('fs'), vm=require('vm');
const src=fs.readFileSync('work.html','utf8');
const R={};

// ---- 1. HEADPLATE_OWNER reports only a LIVE, unexpired owner -----------
{
  const a=src.indexOf('const HEADPLATE = { el:null');
  const b=src.indexOf('function updatePackBar(){');
  const sb={ console, document:{createElement:()=>({classList:{toggle(){},remove(){}},
      querySelector:()=>({textContent:'',style:{},innerHTML:''}), style:{}}),
      body:{appendChild(){}} },
    RIFT:{active:true}, THREE:{Vector3:function(){ this.project=()=>this; }},
    camera:{}, innerWidth:100, innerHeight:100,
    performance:{now:()=>sb.__t*1000}, ahErr:()=>{} };
  sb.__t=100; sb.window=sb;
  vm.createContext(sb);
  vm.runInContext(src.slice(a,b)+'\nthis.N=window.notePlateTarget; this.O=window.HEADPLATE_OWNER;',
    sb, {filename:'h.js'});
  const e={dead:false, elitePack:'rare', mods:[], g:{position:{x:0,y:0,z:0}}};
  R.owner = { beforeNoting: sb.O() };
  sb.N(e);
  R.owner.afterNoting = sb.O()===e;
  sb.__t = 100 + 10;                 // past the 4s linger
  R.owner.afterLinger = sb.O();
  sb.__t = 100; sb.N(e); e.dead=true;
  R.owner.whenDead = sb.O();
  R.ownerIsStrict = R.owner.beforeNoting===null && R.owner.afterNoting===true
                 && R.owner.afterLinger===null && R.owner.whenDead===null;
}

// ---- 2. the bar pass skips exactly that enemy --------------------------
{
  // extract the decision, standalone
  // ⚠ the real indentation is 4 spaces, not 6 — a 6-space anchor found the
  // string nowhere and the slice came back empty, so `wantBar` was undefined.
  const i=src.indexOf("    const mode=window.HPBAR_MODE;");
  const j=src.indexOf("    if(wantBar && hi<ACTORS.cap){", i);
  const code=src.slice(i, j);
  // ⚠ the check is an IDENTITY comparison (`HEADPLATE_OWNER()===e`), so the
  // enemy must enter the sandbox BY REFERENCE. The first version serialised it
  // with JSON.stringify, creating a different object — the comparison could
  // never match and the suite blamed the code for its own cloning.
  function decide(e, plated, mode){
    const sb={ console, ahErr:()=>{}, e:e,
      window:{ HPBAR_MODE:mode, HPBAR_LINGER:3,
               HEADPLATE_OWNER:()=>plated } };
    sb.window.window=sb.window;
    vm.createContext(sb);
    vm.runInContext('var nowA=100;\n'+
      'var window=this.window; var HEADPLATE_OWNER=window.HEADPLATE_OWNER;\n'+
      code+'\nthis.R=wantBar;', sb, {filename:'d.js'});
    return sb.R;
  }
  const elite={ hp:50, maxHp:100, rarity:'rare', isBoss:false, lastHitAt:99.5 };
  const other={ hp:50, maxHp:100, rarity:'rare', isBoss:false, lastHitAt:99.5 };
  const normal={ hp:50, maxHp:100, rarity:'normal', isBoss:false, lastHitAt:99.5 };
  const boss={ hp:50, maxHp:100, rarity:'rare', isBoss:true, lastHitAt:99.5 };
  R.bars = {
    platedElite: decide(elite, elite, undefined),      // suppressed
    otherElite:  decide(other, elite, undefined),      // still drawn
    normalHurt:  decide(normal, elite, undefined),     // still drawn
    bossWhilePlated: decide(boss, boss, undefined)     // suppressed too
  };
  R.suppressesOnlyThePlatedOne =
    R.bars.platedElite===false && R.bars.otherElite===true && R.bars.normalHurt===true;
  // and with no plate active, nothing changes
  R.bars.noPlate = decide(elite, null, undefined);
  R.unchangedWithoutPlate = R.bars.noPlate===true;
  // the explicit 'always' mode is still honoured for OTHER enemies
  R.bars.alwaysOther = decide(other, elite, 'always');
  R.alwaysStillWorks = R.bars.alwaysOther===true;
}
console.log(JSON.stringify(R,null,1));
