// ⚠ THE STATIONS THE GAME ACTUALLY CREATES — not the ones I kept editing
const fs=require('fs'), vm=require('vm');
const src=fs.readFileSync('work.html','utf8');
const code=src.replace(/\/\*[\s\S]*?\*\//g,'');
const R={};

// ---- 1. run the REAL factory the layout uses -------------------------
{
  const a=src.indexOf('function spawnStandaloneNPC(role,x,z){');
  const b=src.indexOf('\n}', src.indexOf('return rec.g;', a))+2;
  const stations=[];
  const sb={ console, stations,
    npc:()=>({g:{position:{x:0,z:0}}}),
    THREE:{Vector3:function(x,y,z){this.x=x;this.y=y;this.z=z;}} };
  sb.window=sb; vm.createContext(sb);
  vm.runInContext(src.slice(a,b)+'\nthis.S=spawnStandaloneNPC;', sb, {filename:'n.js'});
  ['smith','merchant','occultist'].forEach((r,i)=>sb.S(r,i*10,0));
  R.live = stations.map(s=>({name:s.name, prompt:s.prompt, noE:!!s.noE,
                             key2:s.key2||'', acts:s.acts, r:s.r}));
  const veyra=stations.find(s=>s.name==='Veyra');
  R.veyra = veyra;
  // ⚠ THE BUG: noE swallowed E before any dispatch could run
  R.veyraCanBeInteracted = veyra && veyra.noE===false && veyra.prompt==='Contracts';
  R.garrickPrompt = (stations.find(s=>s.name==='Garrick')||{}).prompt;
  R.maraPrompt = (stations.find(s=>s.name==='Mara')||{}).prompt;
  R.noStaleActs = !JSON.stringify(R.live).match(/Repair|Salvage|Enchant|Reroll|Socket|Craft/);
}

// ---- 2. E now reaches the board for that REAL station ----------------
{
  const a=src.indexOf('function tryInteract(){');
  const b=src.indexOf("document.getElementById('winTitle').textContent=nearStation.title;");
  const calls=[];
  const sb={ console, WORLD:{mode:'TOWN'}, RIFT:{active:false}, winOpen:false,
    nearStation:R.veyra,
    questPanel:()=>calls.push('questBoard'),
    garrickPanel:()=>{}, vendorPanel:()=>{}, openRiftPanel:()=>{},
    exitToTown:()=>{}, closeWin:()=>{}, toastRift:()=>{},
    AH:{onStation:()=>false}, ahErr:()=>{} };
  sb.window=sb; sb.window.questPanel=sb.questPanel;
  vm.createContext(sb);
  vm.runInContext(src.slice(a,b)+'\n}\nthis.T=tryInteract;', sb, {filename:'i.js'});
  sb.T();
  R.pressE = calls;
  R.boardOpens = calls.includes('questBoard');
}

// ---- 3. ⚠ THE VAULT AND THE GATE EXISTED NOWHERE ---------------------
{
  const i=src.indexOf('const DEFAULT_TOWN_LAYOUT=');
  const blob=src.slice(i+'const DEFAULT_TOWN_LAYOUT='.length);
  let d=0,end=0;
  for(let k=0;k<blob.length;k++){ const c=blob[k];
    if(c==='{')d++; else if(c==='}'){d--; if(!d){end=k+1;break;}} }
  const lay=JSON.parse(blob.slice(0,end));
  const kinds=lay.placed.map(p=>p.prefab);
  R.layout = { stashPlaced:kinds.includes('stash'),
               waypointNotPlaced:!kinds.includes('waypoint'),
               npcs:kinds.filter(k=>k.startsWith('npc_')) };
  R.gate = { noPrefab:!/waypoint:\s*\{ label/.test(code),
             builtOnce:/function ensureHollowGate\(\)/.test(code),
             guarded:/if\(_gateBuilt\) return;/.test(code),
             calledOnLoad:/ensureHollowGate\(\);\s*\n\s*const raw=localStorage/.test(code) };
  R.vaultAndGateExist = R.layout.stashPlaced && R.layout.waypointNotPlaced
                     && Object.values(R.gate).every(Boolean);
  R.edKeyBumped = /ashenHollowEdits_v43_layout_20260820_vaultgate/.test(src);
}
console.log(JSON.stringify(R,null,1));
