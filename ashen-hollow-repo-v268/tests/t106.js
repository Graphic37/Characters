// the vault anchor must be placeable BY HIM: draggable in F2, or one command
const fs=require('fs'), vm=require('vm');
const src=fs.readFileSync('work.html','utf8');
const code=src.replace(/\/\*[\s\S]*?\*\//g,'');
const R={};

// ---- 1. the anchor now has something to click ------------------------
{
  // ⚠ the constant sits just above the function — take it too rather than
  // stubbing a value the real code owns.
  const a=src.indexOf('const VAULT_ANCHOR =');
  const b=src.indexOf('window.vaultDoorAnchor=vaultDoorAnchor;');
  const stations=[]; const added=[];
  const sb={ console, stations, ahErr:()=>{},
    scene:{ add:(o)=>added.push(o) },
    ED:{on:false},
    THREE:{
      Group:function(){ this.children=[]; this.userData={};
        this.position={set:(x,y,z)=>{this.__p=[x,y,z];}};
        this.add=(o)=>this.children.push(o); },
      Mesh:function(g,m){ this.userData={}; this.visible=true;
        this.position={y:0}; this.geometry=g; this.material=m; },
      CylinderGeometry:function(){}, MeshBasicMaterial:function(o){ this.opts=o; },
      Vector3:function(x,y,z){this.x=x;this.y=y;this.z=z;}
    },
    localStorage:{ getItem:()=>null, setItem:()=>{} } };
  sb.window=sb; vm.createContext(sb);
  // `vaultApplySaved` is defined AFTER the export line this slice ends on —
  // stub it; the persistence path has its own case below.
  vm.runInContext('function vaultApplySaved(){}\n'+src.slice(a,b)+
    '\nthis.V=vaultDoorAnchor;', sb, {filename:'v.js'});
  const g=sb.V(-4,2);
  R.marker = { children:g.children.length,
    allEditorOnly:g.children.every(c=>c.userData.editorOnly===1),
    hiddenWhenEditorOff:g.children.every(c=>c.visible===false),
    tagged:g.userData.vaultMarker===1,
    stationStillMade:stations.length===1 && stations[0].name==='Stash' };
  R.clickable = R.marker.children===2 && R.marker.allEditorOnly
             && R.marker.hiddenWhenEditorOff && R.marker.stationStillMade;
}
// ---- 2. ⚠ THE MARKER MUST NOT SHOW IN PLAY ---------------------------
R.editorGate = {
  toggleWired:/if\(window\.refreshEditorOnly\) refreshEditorOnly\(ED\.on\)/.test(code),
  helperExists:/window\.refreshEditorOnly=function/.test(code),
  hiddenAtBuild:/mk\.visible=post\.visible=!!\(window\.ED && ED\.on\)/.test(code)
};
R.neverInPlay = Object.values(R.editorGate).every(Boolean);

// ---- 3. one command, and it persists ---------------------------------
{
  const a=src.indexOf('const VAULT_KEY=');
  const b=src.indexOf('function vaultApplySaved(st){');
  const store={};
  const stations=[{name:'Stash', pos:{x:-4, z:2}}];
  const sb={ console, stations,
    AH_WORLD:{ player:{position:{x:11.3, z:-7.42}} },
    localStorage:{ getItem:(k)=>store[k]||null, setItem:(k,v)=>{store[k]=v;},
                   removeItem:(k)=>{delete store[k];} },
    toast:()=>{} };
  sb.window=sb; vm.createContext(sb);
  vm.runInContext(src.slice(a,b)+'\nthis.S=window.ahSetVault; this.R=window.ahVaultReset;',
    sb, {filename:'s.js'});
  const r1=sb.S();                       // from where the player stands
  R.setFromPlayer = { returned:r1, station:{x:stations[0].pos.x, z:stations[0].pos.z},
                      saved:JSON.parse(store['ashenVaultAnchor_v1']||'null') };
  R.movesToPlayer = stations[0].pos.x===11.3 && stations[0].pos.z===-7.42
                 && R.setFromPlayer.saved.x===11.3;
  const r2=sb.S(2.5, -6.1);              // explicit coordinates
  R.setExplicit = { x:stations[0].pos.x, z:stations[0].pos.z };
  R.acceptsCoords = stations[0].pos.x===2.5 && stations[0].pos.z===-6.1;
  sb.R();
  R.resetClears = store['ashenVaultAnchor_v1']===undefined;
}
// ---- 4. a saved position is applied AT BUILD, not a frame later -------
R.persist = {
  appliedInBuilder:/vaultApplySaved\(stations\[stations\.length-1\]\);/.test(code),
  readsStore:/localStorage\.getItem\(VAULT_KEY\)/.test(code)
};
R.reloadSafe = Object.values(R.persist).every(Boolean);
console.log(JSON.stringify(R,null,1));
