// ⚠⚠ PERMANENT LOCK ON THE TOWN'S SOURCE OF TRUTH.
// Three things, all driven through the REAL spawnPrefab / removePlaced /
// spawnStandaloneNPC — never a hand-built station:
//   1. build+reload the authored town N times -> exactly one of each
//   2. a legacy/old save mixing prefab ids -> still one of each, and it SAYS SO
//   3. the full path, authored layout -> interaction, for all five
const fs=require('fs'), vm=require('vm');
const src=fs.readFileSync('work.html','utf8');
const code=src.replace(/\/\*[\s\S]*?\*\//g,'');
const R={};

// ---------- the shipped authored layout ----------
function layout(){
  const i=src.indexOf('const DEFAULT_TOWN_LAYOUT=');
  const blob=src.slice(i+'const DEFAULT_TOWN_LAYOUT='.length);
  let d=0,end=0;
  for(let k=0;k<blob.length;k++){ const c=blob[k];
    if(c==='{')d++; else if(c==='}'){d--; if(!d){end=k+1;break;}} }
  return JSON.parse(blob.slice(0,end));
}
const LAY=layout();

// ---------- a town that runs the REAL spawn/remove/dedupe code ----------
function town(){
  // `let _placedN=0;` sits just above the function — take it too rather than
  // stubbing a counter the real code owns.
  const spA=src.indexOf('let _placedN=0;');
  const spB=src.indexOf('window.removePlaced=removePlaced;')+'window.removePlaced=removePlaced;'.length;
  const npcA=src.indexOf('function spawnStandaloneNPC(role,x,z){');
  const npcB=src.indexOf('\n}', src.indexOf('return rec.g;', npcA))+2;

  const stations=[], blockers=[], EDIT=[], warns=[];
  const ED={placed:[]};
  const scene={remove(){}, add(){}};
  const sb={ console:{warn:(m)=>warns.push(m), log:()=>{}},
    stations, blockers, EDIT, ED, scene, townRoot:{remove(){}},
    npc:(x,z)=>({g:{position:{x,z}, userData:{}, rotation:{}, scale:{setScalar(){}}}}),
    THREE:{Vector3:function(x,y,z){this.x=x;this.y=y;this.z=z;}},
    capturePlacedCollisionLocal(){}, rebuildPlacedCollision(){},
    grounded:(o)=>o, noShadowP:(o)=>o, block(){}, editable(){},
    // presentation the real spawnPrefab calls; irrelevant to station identity
    attachTownMoodFx(){}, edRegister(){}, applySavedTo(){}, say(){},
    ahErr:()=>{} };
  sb.window=sb;
  vm.createContext(sb);
  vm.runInContext(src.slice(npcA,npcB), sb, {filename:'npc.js'});
  // PREFABS: the real NPC + stash + legacy entries, geometry stubbed
  vm.runInContext(`
    let _stashN=0;
    function stashBuilder(x,z){
      const g={userData:{}, position:{fromArray(){}}, rotation:{}, scale:{setScalar(){}}};
      stations.push({name:'Stash', prompt:'Open Vault', key2:'F',
                     prompt2:'Deposit all', pos:new THREE.Vector3(x,0.95,z), r:2.8,
                     title:'The Vault', body:'', acts:['Open Vault']});
      return g;
    }
    function scenery(x,z){ return {userData:{}, position:{fromArray(){}},
      rotation:{}, scale:{setScalar(){}}}; }
    const PREFABS={
      npc_smith:     { station:1, make:(x,z)=>spawnStandaloneNPC('smith',x,z) },
      npc_merchant:  { station:1, make:(x,z)=>spawnStandaloneNPC('merchant',x,z) },
      npc_occultist: { station:1, make:(x,z)=>spawnStandaloneNPC('occultist',x,z) },
      /* v239: the vault is a geometry-free door anchor, not a chest prop */
      vault_door:    { station:1, make:stashBuilder },
      stash:         { station:1, make:stashBuilder },   // legacy chest id
      /* the LEGACY ids, composed exactly as the shipped file composes them */
      blacksmith:{ station:1, make:(x,z)=>{ const g=scenery(x,z);
                     spawnStandaloneNPC('smith',x,z); return g; } },
      vendor:    { station:1, make:(x,z)=>{ const g=scenery(x,z);
                     spawnStandaloneNPC('merchant',x,z); return g; } },
      crafting:  { station:1, make:(x,z)=>{ const g=scenery(x,z);
                     spawnStandaloneNPC('occultist',x,z); return g; } },
      bld_house1:{ make:scenery }, bld_house3:{ make:scenery },
      bld_smith:{ make:scenery }, bld_inn:{ make:scenery },
      barrel:{ make:scenery }, rubble:{ make:scenery },
      tree_dead_01:{ make:scenery }, tree_dead_02:{ make:scenery }
    };
  `, sb, {filename:'pre.js'});
  vm.runInContext(src.slice(spA,spB)+
    '\nthis.spawn=spawnPrefab; this.remove=removePlaced;', sb, {filename:'sp.js'});
  sb.__stations=stations; sb.__warns=warns; sb.__ED=ED;
  return sb;
}
const names=(t)=>t.__stations.map(s=>s.name).sort();
const count=(t,n)=>t.__stations.filter(s=>s.name===n).length;

// ---------- 1. build + reload N times ----------
{
  const t=town();
  const applyLayout=(rows)=>{
    // what edApplyLayout does: drop everything placed, then respawn
    t.__ED.placed.slice().forEach(rec=>{ if(rec.obj) t.remove(rec.obj); });
    t.__ED.placed.length=0;
    rows.forEach(p=>{
      const o=t.spawn(p.prefab, p.p[0], p.p[2]);
      if(o) t.__ED.placed.push({obj:o, prefab:p.prefab});
    });
  };
  const seen=[];
  for(let i=0;i<5;i++){ applyLayout(LAY.placed); seen.push({
    Garrick:count(t,'Garrick'), Mara:count(t,'Mara'), Veyra:count(t,'Veyra'),
    Stash:count(t,'Stash'), total:t.__stations.length }); }
  R.reloads = seen;
  R.oneOfEachEveryReload = seen.every(s=>
    s.Garrick===1 && s.Mara===1 && s.Veyra===1 && s.Stash===1);
  R.noGrowthAcrossReloads = seen[0].total===seen[4].total;
  R.warnsAfterReloads = t.__warns.length;
}

// ---------- 2. a legacy/old save that mixes both id families ----------
{
  const t=town();
  // the worst case: the authored npc_* AND the v24 legacy ids for all three
  const rows=[
    {prefab:'npc_smith',     p:[4.9,0,9.0]},
    {prefab:'npc_merchant',  p:[8.1,0,1.4]},
    {prefab:'npc_occultist', p:[-7.4,0,-4.6]},
    {prefab:'blacksmith',    p:[0,0,0]},
    {prefab:'vendor',        p:[3,0,3]},
    {prefab:'crafting',      p:[6,0,6]},
    {prefab:'vault_door',    p:[-4,0,2]},
    {prefab:'stash',         p:[9,0,9]}     // a legacy chest AND the new anchor
  ];
  rows.forEach(p=>t.spawn(p.prefab, p.p[0], p.p[2]));
  R.legacyMix = { names:names(t),
    Garrick:count(t,'Garrick'), Mara:count(t,'Mara'),
    Veyra:count(t,'Veyra'), Stash:count(t,'Stash') };
  R.legacyStaysSingle = ['Garrick','Mara','Veyra','Stash']
    .every(n=>count(t,n)===1);
  // ⚠ AND IT SAYS SO — a silent dedupe is how "three Garricks" went unnoticed
  R.duplicateWarnings = t.__warns.filter(w=>/duplicate station/.test(w));
  R.warnsLoudly = R.duplicateWarnings.length===4;
}

// ---------- 3. the full path, layout -> interaction ----------
{
  const t=town();
  LAY.placed.forEach(p=>t.spawn(p.prefab, p.p[0], p.p[2]));
  const live=t.__stations;
  const a=src.indexOf('function tryInteract(){');
  const b=src.indexOf("document.getElementById('winTitle').textContent=nearStation.title;");
  function press(st){
    const calls=[];
    const sb={ console, WORLD:{mode:'TOWN'}, RIFT:{active:false}, winOpen:false,
      nearStation:st,
      garrickPanel:()=>calls.push('SupportSlots'), vendorPanel:()=>calls.push('Trade'),
      questPanel:()=>calls.push('QuestBoard'), openRiftPanel:()=>calls.push('Rifts'),
      exitToTown:()=>{}, closeWin:()=>{}, toastRift:()=>{},
      AH:{onStation:(n)=>{ if(n==='Stash'){calls.push('Stash'); return true;} return false; }},
      ahErr:()=>{} };
    sb.window=sb;
    Object.assign(sb.window,{garrickPanel:sb.garrickPanel, vendorPanel:sb.vendorPanel,
      questPanel:sb.questPanel, openRiftPanel:sb.openRiftPanel});
    vm.createContext(sb);
    vm.runInContext(src.slice(a,b)+'\n}\nthis.T=tryInteract;', sb, {filename:'i.js'});
    sb.T();
    return calls;
  }
  const byName=(n)=>live.find(s=>s.name===n);
  R.fullPath = {
    Garrick:press(byName('Garrick')),
    Mara:press(byName('Mara')),
    Veyra:press(byName('Veyra')),
    Vault:press(byName('Stash')),
    Gate:press({name:'Travel', title:'Hollow Gate', body:'', acts:[]})
  };
  R.pathComplete =
       R.fullPath.Garrick.includes('SupportSlots')
    && R.fullPath.Mara.includes('Trade')
    && R.fullPath.Veyra.includes('QuestBoard')
    && R.fullPath.Vault.includes('Stash')
    && R.fullPath.Gate.includes('Rifts');
}

// ---------- the guard itself must stay ----------
R.guardPresent = /duplicate station "/.test(code)
              && /const _nameBefore=new Set\(stations\.map\(s=>s\.name\)\);/.test(code);
R.LOCKED = R.oneOfEachEveryReload && R.noGrowthAcrossReloads
        && R.legacyStaysSingle && R.warnsLoudly && R.pathComplete && R.guardPresent;
console.log(JSON.stringify(R,null,1));
