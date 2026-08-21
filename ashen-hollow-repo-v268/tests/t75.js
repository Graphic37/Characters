// five slots from one constant; a five-rung shop; NPC plates on real meshes
const fs=require('fs'), vm=require('vm');
const {JSDOM}=require('jsdom');
const src=fs.readFileSync('work.html','utf8');
const R={};

// ---- 1. ONE source of truth for the slot count ------------------------
R.slots = {
  moduleMax:(/const SUPPORT_SLOTS_MAX = (\d+)/.exec(src)||[])[1],
  classicReadsModule:/var SUPPORT_SLOTS = \(window\.SUPPORT_SLOTS_MAX \|\| 5\)/.test(src),
  exported:/window\.SUPPORT_SLOTS_MAX = SUPPORT_SLOTS_MAX;/.test(src),
  noHardcoded3:!/var SUPPORT_SLOTS = 3;/.test(src)
};
R.oneSourceOfTruth = R.slots.moduleMax==='5' && R.slots.classicReadsModule
                  && R.slots.exported && R.slots.noHardcoded3;

// ---- 2. costs for every rung, escalating, slot 1 free -----------------
{
  const m=/SUPPORT_SLOT_COST = (\{[^}]*\})/.exec(src);
  const C=eval('('+m[1]+')');
  R.costs=C;
  R.rungsPriced = [2,3,4,5].every(k=>typeof C[k]==='number');
  R.slot1Free = C[1]===undefined;
  R.escalates = C[3]>C[2]*3 && C[4]>C[3]*3 && C[5]>C[4]*3;
  // nextSlotCost must walk all five
  const a=src.indexOf('const SUPPORT_SLOT_COST');
  const b=src.indexOf('window.nextSlotCost = nextSlotCost;');
  const RG={};
  const sb={ console, Math, S:{gold:0},
    gemFor:(id)=>RG[id]||(RG[id]={supportSlots:1}), ahErr:()=>{} };
  sb.window=sb; vm.createContext(sb);
  // RG lives in the harness, not the sandbox — reference it through sb
  sb.RG=RG;
  vm.runInContext(src.slice(a,b)+'\nthis.N=nextSlotCost; this.S=supportSlots;',
    sb, {filename:'c.js'});
  const seq=[];
  for(let i=0;i<6;i++){ seq.push(sb.N('x')); RG.x.supportSlots=Math.min(5,(RG.x.supportSlots||1)+1); }
  R.ladder=seq;
  R.laddersToNull = seq[4]!==null && seq[5]===null;   // priced through 5, then maxed
}

// ---- 3. the shop UI moved to master/detail in v228 --------------------
// The old flat ladder (.slrow/.slstep) no longer exists; t85 covers the
// replacement. Asserting retired markup would be a green test for a screen
// the game no longer has.
R.shopRedesigned = /class="gsWrap"/.test(src) && !/class="slladder"/.test(src);

// ---- 4. the NPC plates walk the REAL npc list --------------------------
{
  R.plates = {
    usesRealList:/AH_WORLD && AH_WORLD\.npcs\) \|\| window\.npcs/.test(src),
    inventedRegistryGone:!/NPC_MESH\[key\]/.test(src),
    npcsExported:/get npcs\(\)\{ return \(typeof npcs!=='undefined'\) \? npcs : \[\]; \}/.test(src),
    tickWired:/window\.updateNpcPlates && window\.updateNpcPlates\(\);/.test(src),
    transformOnly:/translate\(-50%,-100%\) translate\(/.test(src),
    townOnly:/WORLD\.mode==='TOWN'/.test(src)
  };
  R.platesWiredCorrectly = Object.values(R.plates).every(Boolean);
  // the three titles exist with a role each
  const t=/const TOWNSFOLK=\{([\s\S]*?)\n\};/.exec(src)[1];
  R.titles = [...t.matchAll(/title:'([^']+)',\s*role:'([^']+)'/g)].map(m=>m[1]+' — '+m[2]);
  R.allThreeTitled = R.titles.length===3;
}
console.log(JSON.stringify(R,null,1));
