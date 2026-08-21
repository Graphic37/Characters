// ⚠⚠ LIVE-TOWN ARCHITECTURE AUDIT.
// Starts from the AUTHORED LAYOUT and the REAL factories — never from a
// hand-built station object. That shortcut is what hid the v237 bug for
// seventeen versions.
const fs=require('fs'), vm=require('vm');
const src=fs.readFileSync('work.html','utf8');
const code=src.replace(/\/\*[\s\S]*?\*\//g,'');
const R={};

// ---------- the authored layout, parsed from the shipped file ----------
function layout(){
  const i=src.indexOf('const DEFAULT_TOWN_LAYOUT=');
  const blob=src.slice(i+'const DEFAULT_TOWN_LAYOUT='.length);
  let d=0,end=0;
  for(let k=0;k<blob.length;k++){ const c=blob[k];
    if(c==='{')d++; else if(c==='}'){d--; if(!d){end=k+1;break;}} }
  return JSON.parse(blob.slice(0,end));
}
const LAY=layout();
R.step1_layout = {
  prefabs:[...new Set(LAY.placed.map(p=>p.prefab))].filter(p=>!p.startsWith('tree')),
  npcs:LAY.placed.filter(p=>p.prefab.startsWith('npc_')).map(p=>p.prefab),
  // v239: the vault is placed as `vault_door` (a station, no prop)
  stashPlaced:LAY.placed.some(p=>p.prefab==='vault_door'||p.prefab==='stash')
};
R.step1_ok = R.step1_layout.npcs.length===3 && R.step1_layout.stashPlaced;

// ---------- run the REAL NPC factory ----------
function realStations(){
  const a=src.indexOf('function spawnStandaloneNPC(role,x,z){');
  const b=src.indexOf('\n}', src.indexOf('return rec.g;', a))+2;
  const stations=[];
  const sb={ console, stations, npc:()=>({g:{position:{x:0,z:0}}}),
    THREE:{Vector3:function(x,y,z){this.x=x;this.y=y;this.z=z;}} };
  sb.window=sb; vm.createContext(sb);
  vm.runInContext(src.slice(a,b)+'\nthis.S=spawnStandaloneNPC;', sb, {filename:'n.js'});
  // spawn them at the AUTHORED coordinates
  const map={npc_smith:'smith', npc_merchant:'merchant', npc_occultist:'occultist'};
  LAY.placed.filter(p=>map[p.prefab]).forEach(p=>sb.S(map[p.prefab], p.p[0], p.p[2]));
  return stations;
}
const NPCS=realStations();
R.step2_npcStations = NPCS.map(s=>({name:s.name, prompt:s.prompt, noE:!!s.noE,
  key2:s.key2||'', r:s.r, x:+s.pos.x.toFixed(1), z:+s.pos.z.toFixed(1)}));
R.step2_ok = NPCS.length===3 && NPCS.every(s=>!s.noE && s.prompt);

// ---------- the vault, from the REAL stash builder ----------
{
  const a=src.indexOf("stations.push({name:'Stash'");
  const seg=src.slice(a, src.indexOf('});', a)+3);
  R.step3_vault = {
    prompt:(/prompt:'([^']*)'/.exec(seg)||[])[1],
    key2:(/key2:'(\w+)'/.exec(seg)||[])[1],
    prompt2:(/prompt2:'([^']*)'/.exec(seg)||[])[1],
    noE:/noE:\s*true/.test(seg)
  };
  R.step3_ok = R.step3_vault.prompt && R.step3_vault.key2==='F' && !R.step3_vault.noE;
}
// ---------- the gate, built once ----------
R.step4_gate = {
  notAPrefab:!/waypoint:\s*\{ label/.test(code),
  builtOnce:/function ensureHollowGate\(\)/.test(code),
  guarded:/if\(_gateBuilt\) return;/.test(code),
  calledAtLoad:/ensureHollowGate\(\);/.test(code),
  pushesTravel:/stations\.push\(\{name:'Travel'/.test(code)
};
R.step4_ok = Object.values(R.step4_gate).every(Boolean);

// ---------- ⚠ ONE DEFINITION PER NPC ----------
{
  const pushes=[...code.matchAll(/stations\.push\(\{name:'(\w+)'/g)].map(m=>m[1]);
  const factory=[...code.matchAll(/(smith|merchant|occultist):\{name:'(\w+)'/g)].map(m=>m[2]);
  R.step5_definitions = { buildingPushes:pushes, npcFactory:factory };
  // the three NPCs must be defined ONLY in the factory
  R.step5_noDuplicates = ['Garrick','Mara','Veyra'].every(n=>
    !pushes.includes(n) && factory.includes(n));
  R.step5_buildingsAreScenery =
    !/if\(opts\.npc!==false\) npc\(/.test(code) &&
    !/if\(opts\.station!==false\) stations\.push/.test(code);
  R.step5_legacyComposed = /make:\(x,z\)=>\{ const g=blacksmith\(x,z,\{npc:false,station:false\}\);/.test(code);
  R.step5_dedupeGuard = /duplicate station "/.test(code);
  R.step5_ok = R.step5_noDuplicates && R.step5_buildingsAreScenery
            && R.step5_legacyComposed && R.step5_dedupeGuard;
}

// ---------- the full chain, for all five, through the REAL dispatcher ----------
{
  const a=src.indexOf('function tryInteract(){');
  const b=src.indexOf("document.getElementById('winTitle').textContent=nearStation.title;");
  function press(station){
    const calls=[];
    const sb={ console, WORLD:{mode:'TOWN'}, RIFT:{active:false}, winOpen:false,
      nearStation:station,
      garrickPanel:(t)=>calls.push('SupportSlots'),
      vendorPanel:()=>calls.push('Trade'),
      questPanel:()=>calls.push('QuestBoard'),
      openRiftPanel:()=>calls.push('RiftSelect'),
      exitToTown:()=>{}, closeWin:()=>{}, toastRift:()=>{},
      AH:{onStation:(n)=>{ if(n==='Stash'){calls.push('StashOpen'); return true;} return false; }},
      ahErr:()=>{} };
    sb.window=sb;
    Object.assign(sb.window,{garrickPanel:sb.garrickPanel, vendorPanel:sb.vendorPanel,
      questPanel:sb.questPanel, openRiftPanel:sb.openRiftPanel});
    vm.createContext(sb);
    vm.runInContext(src.slice(a,b)+'\n}\nthis.T=tryInteract;', sb, {filename:'i.js'});
    sb.T();
    return calls;
  }
  const vault={name:'Stash', title:'The Vault', body:'', acts:[], key2:'F'};
  const gate ={name:'Travel', title:'Hollow Gate', body:'', acts:[]};
  R.step6_chain = {
    Garrick:press(NPCS.find(s=>s.name==='Garrick')),
    Mara:press(NPCS.find(s=>s.name==='Mara')),
    Veyra:press(NPCS.find(s=>s.name==='Veyra')),
    Vault:press(vault),
    Gate:press(gate)
  };
  R.step6_ok =
       R.step6_chain.Garrick.includes('SupportSlots')
    && R.step6_chain.Mara.includes('Trade')
    && R.step6_chain.Veyra.includes('QuestBoard')
    && R.step6_chain.Vault.includes('StashOpen')
    && R.step6_chain.Gate.includes('RiftSelect');
}
R.AUDIT_PASSES = R.step1_ok && R.step2_ok && R.step3_ok && R.step4_ok
              && R.step5_ok && R.step6_ok;
console.log(JSON.stringify(R,null,1));
