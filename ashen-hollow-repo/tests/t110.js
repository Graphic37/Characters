// the RING and the BAR must agree on who is an elite
const fs=require('fs'), vm=require('vm');
const src=fs.readFileSync('work.html','utf8');
const code=src.replace(/\/\*[\s\S]*?\*\//g,'');
const R={};

// ⚠ v253: both readouts must call the SAME predicate
R.unified = {
  predicateExists:/function isEliteEnemy\(e\)\{/.test(code),
  ringUsesIt:/if\(isEliteEnemy\(e\)\) attachEliteGlow/.test(code),
  barUsesIt:/window\.isEliteEnemy \? isEliteEnemy\(e\)/.test(code),
  oldRingRuleGone:!/if\(rarity==='magic' \|\| rarity==='rare'\) attachEliteGlow/.test(code)
};
R.ringRule = R.unified.ringUsesIt;
const m=/const isElite = ([^;]+);/.exec(code);
R.barRule = m[1];

// ---- run the bar rule against every combination ---------------------
{
  const i=src.indexOf('    const mode=window.HPBAR_MODE;');
  const j=src.indexOf('    if(wantBar && hi<ACTORS.cap){', i);
  const slice=src.slice(i,j);
  function bar(e){
    const sb={ console, ahErr:()=>{}, e:e, nowA:100,
      window:{ HPBAR_MODE:undefined, HPBAR_LINGER:3, HEADPLATE_OWNER:()=>null } };
    sb.window.window=sb.window;
    vm.createContext(sb);
    vm.runInContext('var window=this.window; var HEADPLATE_OWNER=window.HEADPLATE_OWNER;\n'
      +slice+'\nthis.R=wantBar;', sb, {filename:'b.js'});
    return sb.R;
  }
  // the ring now runs the SAME predicate the bar does
  const pa=src.indexOf('function isEliteEnemy(e){');
  const pb=src.indexOf('window.isEliteEnemy=isEliteEnemy;');
  const psb={}; vm.createContext(psb);
  vm.runInContext(src.slice(pa,pb)+'\nthis.P=isEliteEnemy;', psb, {filename:'p.js'});
  const ring=(e)=>psb.P(e);
  const base={hp:100,maxHp:100,isBoss:false,lastHitAt:0};
  const cases=[
    ['pack magic',      {...base, rarity:'magic', elitePack:'magic'}],
    ['pack rare',       {...base, rarity:'rare',  elitePack:'rare'}],
    // ⚠ THE MISMATCH: rarity says elite, elitePack does not
    ['magic, no pack',  {...base, rarity:'magic'}],
    ['rare, no pack',   {...base, rarity:'rare'}],
    // and the reverse
    ['pack, plain rarity',{...base, rarity:'normal', elitePack:'magic'}],
    ['plain normal',    {...base, rarity:'normal'}]
  ];
  R.table = cases.map(([n,e])=>({ case:n, ring:ring(e), bar:bar(e),
                                  agree: ring(e)===bar(e) || (!ring(e)&&!bar(e)) }));
  R.disagreements = R.table.filter(r=>r.ring!==r.bar);
  R.ringAndBarAgree = R.disagreements.length===0;
}
R.OK = R.ringAndBarAgree && Object.keys(R.unified).every(k=>R.unified[k]);
console.log(JSON.stringify(R,null,1));
if(!R.OK) process.exit(1);
