// the vault is a door anchor: a station, no prop, and banking still works
const fs=require('fs'), vm=require('vm');
const src=fs.readFileSync('work.html','utf8');
const code=src.replace(/\/\*[\s\S]*?\*\//g,'');
const R={};

// ---- 1. the chest prop is no longer placed ---------------------------
{
  const i=src.indexOf('const DEFAULT_TOWN_LAYOUT=');
  const blob=src.slice(i+'const DEFAULT_TOWN_LAYOUT='.length);
  let d=0,end=0;
  for(let k=0;k<blob.length;k++){ const c=blob[k];
    if(c==='{')d++; else if(c==='}'){d--; if(!d){end=k+1;break;}} }
  const lay=JSON.parse(blob.slice(0,end));
  const kinds=lay.placed.map(p=>p.prefab);
  const anchor=lay.placed.find(p=>p.prefab==='vault_door');
  R.layout = { chestGone:!kinds.includes('stash'),
               anchorPlaced:!!anchor,
               at:anchor?[anchor.p[0],anchor.p[2]]:null };
  R.chestRemoved = R.layout.chestGone && R.layout.anchorPlaced;
}
// ---- 2. the anchor builds a STATION and no geometry -------------------
{
  const a=src.indexOf('const VAULT_ANCHOR =');
  const b=src.indexOf('window.vaultDoorAnchor=vaultDoorAnchor;');
  const stations=[]; let added=0;
  const sb={ console, stations,
    scene:{ add:()=>{ added++; } },
    // ⚠ v248: the anchor DOES add geometry now — two editor-only markers, so
    // it can be clicked and dragged in F2. The assertion that matters is not
    // "no geometry" but "nothing VISIBLE IN PLAY", checked below.
    THREE:{ Group:function(){ this.position={set(){}}; this.children=[];
              this.userData={}; this.add=(o)=>this.children.push(o); },
            Mesh:function(){ this.userData={}; this.visible=true; this.position={y:0}; },
            CylinderGeometry:function(){}, MeshBasicMaterial:function(){},
            Vector3:function(x,y,z){this.x=x;this.y=y;this.z=z;} },
    ED:{on:false}, localStorage:{getItem:()=>null, setItem:()=>{}} };
  sb.window=sb; vm.createContext(sb);
  vm.runInContext('function vaultApplySaved(){}\n'+src.slice(a,b)+
    '\nthis.V=vaultDoorAnchor; this.A=VAULT_ANCHOR;', sb, {filename:'v.js'});
  const g=sb.V(-4,2);
  R.anchor = { stations:stations.length, name:stations[0].name,
    prompt:stations[0].prompt, key2:stations[0].key2,
    prompt2:stations[0].prompt2, r:stations[0].r,
    pos:[stations[0].pos.x, stations[0].pos.z],
    sceneAdds:added, constantExposed:!!sb.A };
  R.anchor.markers=g.children.length;
  R.anchor.allHiddenInPlay=g.children.every(c=>c.visible===false);
  R.stationOnly = stations.length===1 && stations[0].name==='Stash'
    && stations[0].key2==='F' && added===1
    && R.anchor.allHiddenInPlay;   // markers exist but never show in play
}
// ---- 3. ⚠ BANKING STILL GATES ON IT ----------------------------------
{
  const a=src.indexOf('function veyraStation(){');
  const b=src.indexOf('window.nearVeyra=nearVeyra;');
  function near(at){
    const sb={ console, Math, WORLD:{mode:'TOWN'},
      AH_WORLD:{ stations:[{name:'Stash', pos:{x:-4,z:2}, r:3.0}],
                 player:{position:{x:at[0], z:at[1]}} }, ahErr:()=>{} };
    sb.window=sb; vm.createContext(sb);
    vm.runInContext(src.slice(a,b)+'\nthis.N=nearVeyra; this.S=veyraStation;', sb, {filename:'b.js'});
    return { station:sb.S()&&sb.S().name, near:sb.N() };
  }
  R.banking = { atDoor:near([-4,2.5]), acrossTown:near([9,9]) };
  R.banksAtTheDoor = R.banking.atDoor.near===true
                  && R.banking.atDoor.station==='Stash'
                  && R.banking.acrossTown.near===false;
}
// ---- 4. the locator exists so the spot stops being a guess ------------
R.locator = { defined:/window\.ahNear=function/.test(code),
              listsAuthored:/AUTHORED_TOWN\.objects/.test(code.slice(code.indexOf('window.ahNear'))),
              listsStations:/station:s\.name/.test(code) };
R.locatorReady = Object.values(R.locator).every(Boolean);
// ---- 5. the town lock still holds -------------------------------------
R.edKeyBumped = /ashenHollowEdits_v44_layout_20260820_vaultdoor/.test(src);
console.log(JSON.stringify(R,null,1));
