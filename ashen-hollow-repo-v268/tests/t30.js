// elite packs: composition, density, and no population inflation
const fs=require('fs'), vm=require('vm');
const src=fs.readFileSync('work.html','utf8');
const R={};
const a=src.indexOf('const ELITE_CFG = {');
const b=src.indexOf('function ri2(a,b){');
const code=src.slice(a,b);

let spawned=[];
const sb={ console, Math,
  ri2:(x,y)=>x+Math.floor(Math.random()*(y-x+1)),
  spawnEnemy:(x,z,lvl,rarity,kind)=>{
    const e={x,z,lvl,rarity:rarity||'normal',kind:kind||('k'+Math.floor(Math.random()*4))};
    spawned.push(e); return e; } };
sb.window=sb; vm.createContext(sb);
vm.runInContext(code+'\nthis.G=spawnEliteGroup; this.C=ELITE_CFG;', sb, {filename:'p.js'});

// ---- 1. force each branch and inspect the group -------------------------
function forceRoll(v){ const r=Math.random; Math.random=()=>v; return ()=>{Math.random=r;}; }
function group(rollValue){
  spawned=[];
  // only the FIRST Math.random() call picks the branch; the rest must stay random
  let first=true; const real=Math.random;
  Math.random=()=>{ if(first){ first=false; return rollValue; } return real(); };
  const n=sb.G(10,10,5,null);
  Math.random=real;
  return { returned:n, made:spawned.length,
           rarities:spawned.map(e=>e.rarity),
           kinds:new Set(spawned.map(e=>e.kind)).size,
           packTags:spawned.map(e=>e.elitePack||(e.eliteMinion?'minion':'-')) };
}
R.rare  = group(0.001);
R.magic = group(0.030);
R.normal= group(0.900);

R.checks = {
  magicIsThreeMagics: R.magic.rarities.length===3 && R.magic.rarities.every(r=>r==='magic'),
  magicOneArchetype: R.magic.kinds===1,
  rareIsOneRare: R.rare.rarities.filter(r=>r==='rare').length===1,
  rareEscortAllNormal: R.rare.rarities.filter(r=>r!=='rare').every(r=>r==='normal'),
  rareEscortSize: R.rare.rarities.length-1,
  normalIsOne: R.normal.made===1 && R.normal.rarities[0]==='normal',
  returnMatchesMade: R.rare.returned===R.rare.made && R.magic.returned===R.magic.made
};

// ---- 2. density over a simulated floor ---------------------------------
spawned=[];
let slots=0, made=0;
const n=130;
while(made<n && slots++ < n*4) made += sb.G(0,0,5,null);
const cnt=(r)=>spawned.filter(e=>e.rarity===r).length;
R.floor={ target:n, actual:made, storedEnemies:spawned.length,
  normal:cnt('normal'), magic:cnt('magic'), rare:cnt('rare'),
  magicPacks:cnt('magic')/3, rarePacks:cnt('rare'),
  elitePct:+(((cnt('magic')+cnt('rare'))/made)*100).toFixed(1) };
R.noInflation = Math.abs(made-n) <= 4;   // a pack may overshoot by at most its size

// ---- 3. no other path can roll an elite --------------------------------
const w=/rarity:\{ normal:\{w:(\d+)[\s\S]*?magic :\{w:(\d+)[\s\S]*?rare  :\{w:(\d+)/.exec(src);
R.baseWeights={ normal:+w[1], magic:+w[2], rare:+w[3] };
R.baseRollNormalOnly = +w[2]===0 && +w[3]===0;
R.rareIsStronger = /rare  :\{w:0, hp:6\.0,dmg:1\.85/.test(src);
console.log(JSON.stringify(R,null,1));
