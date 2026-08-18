const fs=require('fs');
let g = fs.readFileSync('/mnt/user-data/uploads/ashen_hollow_town_v62_authored_rift.html','utf8');
const mod = fs.readFileSync('depths_module.js','utf8');
const one = (needle) => { const n=(g.split(needle).length-1); if(n!==1) throw new Error(`${n} matches: ${needle.slice(0,70)}`); };

/* 1 -- insert the DEPTHS module just above buildDungeon, inside the world module */
/* buildDungeon is ASYNC -- anchoring on the bare 'function' keyword would
   splice the module between 'async' and 'function' and break the block. */
one('async function buildDungeon(id){');
g = g.replace('async function buildDungeon(id){', mod + '\n\nasync function buildDungeon(id){');

/* 2 -- buildDungeon takes a DEPTHS branch; everything after it is unchanged */
const OLD_HEAD = `  await townLoadMaterialCatalog();
  const objects=d.objects.filter(o=>o.visible!==false);`;
one(OLD_HEAD);
g = g.replace(OLD_HEAD, `  /* GENERATED GEOMETRY BRANCH. A DEPTHS map has no assetPaths -- it builds its
     own meshes and hands back the same floorPts / floorTops / bounds this
     function would otherwise compute from FBX. Everything below (lighting,
     floorY, navFromAuthored, spawn, exit gate, decor) runs unchanged. */
  if(d.kind==='DEPTHS'){
    const r=DEPTHS.build(d, dungeonRoot, dungeonBlock);
    dungeonRoot.traverse(o=>{ o.userData.world='RIFT'; });
    if(window.blockersDirty) blockersDirty();
    return buildDungeonTail(d, r.floorPts, r.floorTops, r.bounds, r.placed);
  }
  await townLoadMaterialCatalog();
  const objects=d.objects.filter(o=>o.visible!==false);`);

/* 3 -- split the shared tail out so both branches use exactly one copy of it */
const TAIL_START = `  /* LIGHTING. Authored maps carry their own preset; the old hardcoded trio is`;
one(TAIL_START);
g = g.replace(TAIL_START, `  return buildDungeonTail(d, floorPts, floorTops, bounds, placed);
}

function buildDungeonTail(d, floorPts, floorTops, bounds, placed){
  /* LIGHTING. Authored maps carry their own preset; the old hardcoded trio is`);

/* 4 -- register a generated dungeon so the Pillar dropdown can pick it */
one('window.buildDungeon=buildDungeon;');
g = g.replace('window.buildDungeon=buildDungeon;', `window.buildDungeon=buildDungeon;

/* ---- generated Ashen Depths maps as a first-class dungeon source -------- */
function newDepths(theme, size, seed){
  theme = theme || 'crypt'; size = size || 'medium';
  seed = (seed===undefined) ? (Math.random()*1e9|0) : (seed>>>0);
  const rec = DEPTHS.makeRecord(seed, theme, size);
  const id = 'depths_'+theme+'_'+seed;
  rec.id = id;
  DUNGEONS[id] = rec;
  say('[depths] generated "'+rec.name+'" seed '+seed+' — '+rec.roomGraph.length+' chambers');
  return id;
}
window.newDepths=newDepths;
/* reroll keeps the same slot so the dropdown selection stays valid */
function rerollDepths(id, seed){
  const cur = DUNGEONS[id];
  if(!cur || cur.kind!=='DEPTHS') return null;
  const rec = DEPTHS.makeRecord(seed===undefined?(Math.random()*1e9|0):seed, cur.theme, cur.size, cur.name);
  rec.id = id; DUNGEONS[id] = rec; return id;
}
window.rerollDepths=rerollDepths;`);

/* 5 -- a Generate control in the Rift Pillar panel, so a Depths run is
       reachable by clicking rather than by typing into the console */
const MARKUP_ANCHOR = `      '<button id="dunDrop" class="garact sell" style="flex:0 0 84px"'+(dl.length?'':' disabled')+
        '>Delete</button>'+
    '</div>'+`;
one(MARKUP_ANCHOR);
g = g.replace(MARKUP_ANCHOR, MARKUP_ANCHOR + `
    '<div class="strow" style="margin-top:12px"><span class="k">Ashen Depths</span><span class="v">'+
      '<select id="depTheme" style="background:#12100c;color:#e6d5a6;border:1px solid #4a3e2b;'+
      'padding:3px 6px;font:11px sans-serif">'+
      Object.keys(DEPTHS.THEMES).map(k=>'<option value="'+k+'">'+DEPTHS.THEMES[k].name+'</option>').join('')+
      '</select> '+
      '<select id="depSize" style="background:#12100c;color:#e6d5a6;border:1px solid #4a3e2b;'+
      'padding:3px 6px;font:11px sans-serif">'+
      '<option value="small">Small</option><option value="medium" selected>Medium</option>'+
      '<option value="large">Large</option>'+
      '</select></span></div>'+
    '<div style="display:flex;gap:6px;margin-top:8px">'+
      '<button id="depGen" class="garact" style="flex:1">Generate a Depths map</button>'+
      '<button id="depRoll" class="garact" style="flex:0 0 84px">Reroll</button>'+
    '</div>'+`);

const LISTEN_ANCHOR = `  const dimp=document.getElementById('dunImport'), dpaste=document.getElementById('dunPaste');`;
one(LISTEN_ANCHOR);
g = g.replace(LISTEN_ANCHOR, `  /* Generating builds the textures on first use and takes a couple of seconds,
     so the toast is painted before the work starts rather than after. */
  const depReopen=()=>{ closeWin(); winOpen=true; window.openRiftPanel(); };
  const dgen=document.getElementById('depGen');
  if(dgen) dgen.addEventListener('click',()=>{
    const th=(document.getElementById('depTheme')||{}).value||'crypt';
    const sz=(document.getElementById('depSize')||{}).value||'medium';
    toast('Carving the Depths...');
    setTimeout(()=>{ const id=newDepths(th,sz); setRiftDungeon(id);
      toast(DUNGEONS[id].name+' ready — '+DUNGEONS[id].roomGraph.length+' chambers'); depReopen(); }, 40);
  });
  const droll=document.getElementById('depRoll');
  if(droll) droll.addEventListener('click',()=>{
    const id=window.RIFT_DUNGEON;
    if(!id||!DUNGEONS[id]||DUNGEONS[id].kind!=='DEPTHS'){ toast('Pick a Depths map first'); return; }
    toast('Rerolling...');
    setTimeout(()=>{ rerollDepths(id); toast('New seed for '+DUNGEONS[id].name); depReopen(); }, 40);
  });
` + LISTEN_ANCHOR);

/* 6 -- a recovery hatch that runs BEFORE the game module, so it works even if
       the module would crash on a bad save. ?reset clears the game's own keys,
       ?wipe clears the whole origin. */
const HEAD_ANCHOR = '<script type="importmap">';
one(HEAD_ANCHOR);
g = g.replace(HEAD_ANCHOR, `<script>
/* RECOVERY HATCH — load the page with ?reset (or ?wipe) to clear saved state.
   Deliberately a plain classic script placed above the module: if the module
   ever fails to boot on a corrupt or oversized save, this still runs. */
(function(){
  try{
    var q = location.search || '';
    var KEYS = ['ashenHollowSave','ashenHollowProgress','ashenHollowDungeons_v1',
                'ashenHollowLightingLab_v1'];
    if(/[?&]wipe(=|&|$)/.test(q)){
      try{ localStorage.clear(); }catch(e){}
      document.addEventListener('DOMContentLoaded',function(){ console.log('[recovery] localStorage cleared (wipe)'); });
    } else if(/[?&]reset(=|&|$)/.test(q)){
      KEYS.forEach(function(k){ try{ localStorage.removeItem(k); }catch(e){} });
      document.addEventListener('DOMContentLoaded',function(){ console.log('[recovery] game save keys cleared (reset)'); });
    }
  }catch(e){}
})();
</script>
` + HEAD_ANCHOR);

/* 7 -- free the previous Depths build whenever the rift is torn down */
const CLEAR_ANCHOR = `function dungeonClearBuilt(){
  while(dungeonRoot.children.length) dungeonRoot.remove(dungeonRoot.children[0]);`;
one(CLEAR_ANCHOR);
g = g.replace(CLEAR_ANCHOR, `function dungeonClearBuilt(){
  /* a generated dungeon owns real GPU buffers; dropping the children alone
     leaked every one of them across repeated runs */
  try{ if(window.DEPTHS) DEPTHS.teardown(); }catch(e){}
  while(dungeonRoot.children.length) dungeonRoot.remove(dungeonRoot.children[0]);`);

/* 8 -- do not let generated maps pile up in DUNGEONS forever */
const KEEP_ANCHOR = `  say('[depths] generated "'+rec.name+'" seed '+seed+' — '+rec.roomGraph.length+' chambers');`;
one(KEEP_ANCHOR);
g = g.replace(KEEP_ANCHOR, `  /* keep the last few only: every retained record pins a Layout */
  const olds = Object.keys(DUNGEONS).filter(k=>DUNGEONS[k].kind==='DEPTHS' && k!==id && k!==window.RIFT_DUNGEON);
  while(olds.length > 3){ const drop=olds.shift(); delete DUNGEONS[drop]; }
` + KEEP_ANCHOR);

/* 9 -- MAP IS NO LONGER A CHOICE. Entering a Rift rolls a fresh Depths map. */
const SELECT_MARKUP = `    '<div class="strow"><span class="k">Layout</span><span class="v">'+
      '<select id="riftDunSel" style="background:#12100c;color:#e6d5a6;'+
      'border:1px solid #4a3e2b;padding:3px 6px;font:11px \\'Trebuchet MS\\',sans-serif">'+
      '<option value=""'+(!window.RIFT_DUNGEON&&!window.RIFT_PROCEDURAL?' selected':'')+
        '>Random from the pool</option>'+
      '<option value="__proc"'+(window.RIFT_PROCEDURAL?' selected':'')+
        '>Generated rooms (debug)</option>'+
      dl.map(d=>'<option value="'+d.id+'"'+(window.RIFT_DUNGEON===d.id?' selected':'')+
        '>'+d.name+' ('+d.objects+')</option>').join('')+
      '</select></span></div>'+`;
one(SELECT_MARKUP);
g = g.replace(SELECT_MARKUP, `    '<div class="strow"><span class="k">Map</span><span class="v">A new Depths map every run</span></div>'+`);

/* the Ashen Depths generate/reroll row goes with it -- nothing to pick anymore */
const DEPTHS_ROW_START = `    '<div class="strow" style="margin-top:12px"><span class="k">Ashen Depths</span><span class="v">'+`;
const DEPTHS_ROW_END = `      '<button id="depRoll" class="garact" style="flex:0 0 84px">Reroll</button>'+
    '</div>'+`;
const rowA = g.indexOf(DEPTHS_ROW_START), rowB = g.indexOf(DEPTHS_ROW_END);
if (rowA < 0 || rowB < 0) throw new Error('depths row anchors missing');
g = g.slice(0, rowA) + g.slice(rowB + DEPTHS_ROW_END.length);

/* and its listeners */
const LSTART = `  /* Generating builds the textures on first use and takes a couple of seconds,`;
const LEND = `  const dimp=document.getElementById('dunImport'), dpaste=document.getElementById('dunPaste');`;
const la = g.indexOf(LSTART), lb = g.indexOf(LEND);
if (la < 0 || lb < 0) throw new Error('depths listener anchors missing');
g = g.slice(0, la) + g.slice(lb);

/* 10 -- roll a fresh map inside enterRift, before the old pool logic runs */
const PICK_ANCHOR = `  let pick=window.RIFT_DUNGEON;
  if((!pick || !DUNGEONS[pick]) && !window.RIFT_PROCEDURAL){`;
one(PICK_ANCHOR);
g = g.replace(PICK_ANCHOR, `  /* EVERY RUN IS A NEW MAP. There is no map selector anywhere in the UI now:
     pressing ENTER RIFT rolls a fresh Ashen Depths layout, theme and size, and
     the tier widens the size band. The authored-pool draw below survives only
     as a fallback for when the generator is unavailable. */
  if(!window.RIFT_PROCEDURAL && window.DEPTHS && typeof newDepths==='function'){
    try{
      const th=Object.keys(DEPTHS.THEMES);
      const band = RIFT.tier>=10 ? ['medium','large','large']
                 : RIFT.tier>=5  ? ['small','medium','medium','large']
                                 : ['small','small','medium'];
      const id=newDepths(th[Math.floor(Math.random()*th.length)],
                         band[Math.floor(Math.random()*band.length)]);
      window.RIFT_DUNGEON=id; RIFT.rolledDungeon=id;
      say('[rift] descended into "'+DUNGEONS[id].name+'"');
    }catch(e){ say('[rift] could not roll a Depths map: '+e.message); }
  }
  let pick=window.RIFT_DUNGEON;
  if((!pick || !DUNGEONS[pick]) && !window.RIFT_PROCEDURAL){`);

/* 11 -- LOOT MUST LAND ON FLOOR. The bag-full overflow drop threw items at a
        blind random offset from the player, straight through walls. */
const DROP_ANCHOR = `function dropLoot(x,z,item){
  const m=new THREE.Mesh(new THREE.OctahedronGeometry(0.28), lootMat);
  m.position.set(x, groundAt(x,z)+0.5, z);`;
one(DROP_ANCHOR);
g = g.replace(DROP_ANCHOR, `/* KEEP DROPS ON FLOOR.
   First attempt used dungeonClearance() alone and items still ended up outside
   the walls: activeBlockers() is spatially culled around the player, so a point
   several rooms away sees no blockers at all and reports itself as clear. The
   walk grid the generated layout already owns is exact and O(1), so it is the
   primary oracle; clearance is only the fallback for authored FBX maps. */
function lootFloorOK(x,z){
  if(window.DEPTHS && typeof DEPTHS.walkableAt==='function'){
    const w=DEPTHS.walkableAt(x,z);
    if(w!==null) return w;                       // a Depths map is live: trust it
  }
  if(typeof dungeonClearance==='function') return dungeonClearance(x,z) > 0.42;
  return true;
}
function lootSpot(x,z,ax,az){
  try{
    if(!RIFT.active) return [x,z];
    if(lootFloorOK(x,z)) return [x,z];
    /* anchors, best first: the caller's, then the player, who is provably
       standing on floor because he walked there */
    const anchors=[];
    if(ax!==undefined) anchors.push([ax,az]);
    try{ const p=(window.AH_WORLD&&AH_WORLD.player)?AH_WORLD.player.position:null;
         if(p) anchors.push([p.x,p.z]); }catch(e){}
    for(const an of anchors){
      for(let t=0.85;t>0.001;t-=0.10){
        const px=an[0]+(x-an[0])*t, pz=an[1]+(z-an[1])*t;
        if(lootFloorOK(px,pz)) return [px,pz];
      }
      if(lootFloorOK(an[0],an[1])) return an;
    }
    /* everything is buried: spiral out from the requested point */
    const from=anchors.length?anchors[anchors.length-1]:[x,z];
    for(let r=0.6;r<=8;r+=0.6) for(let k=0;k<12;k++){
      const a=k*0.5236, px=from[0]+Math.cos(a)*r, pz=from[1]+Math.sin(a)*r;
      if(lootFloorOK(px,pz)) return [px,pz];
    }
  }catch(e){}
  return [x,z];
}
window.lootSpot=lootSpot; window.lootFloorOK=lootFloorOK;
function dropLoot(x,z,item,ax,az){
  const p=lootSpot(x,z,ax,az); x=p[0]; z=p[1];
  const m=new THREE.Mesh(new THREE.OctahedronGeometry(0.28), lootMat);
  m.position.set(x, groundAt(x,z)+0.5, z);`);

/* the overflow drop knows a good anchor: the player is standing on floor */
const OVERFLOW = `      dropLoot(player.position.x+Math.cos(a)*rr, player.position.z+Math.sin(a)*rr, g);`;
one(OVERFLOW);
g = g.replace(OVERFLOW, `      dropLoot(player.position.x+Math.cos(a)*rr, player.position.z+Math.sin(a)*rr, g,
               player.position.x, player.position.z);`);

/* 12 -- bake the Depths textures during idle so the first ENTER RIFT of a
        session does not stall on the ~2.7s one-time build */
const BOOT_ANCHOR = `window.buildDungeon=buildDungeon;`;
one(BOOT_ANCHOR);
g = g.replace(BOOT_ANCHOR, `window.buildDungeon=buildDungeon;
(function(){
  const bake=()=>{ try{ DEPTHS.ensureAssets(); }catch(e){} };
  if(window.requestIdleCallback) requestIdleCallback(bake,{timeout:8000});
  else setTimeout(bake, 4000);
})();`);

/* 13 -- corpse drops get an anchor too: a mob shoved into geometry by knockback
        or separation was dropping its loot inside the wall it died against. */
const CORPSE_DROP = `dropLoot(e.g.position.x, e.g.position.z, window.makeGear(null, ilvl));`;
one(CORPSE_DROP);
g = g.replace(CORPSE_DROP, `dropLoot(e.g.position.x, e.g.position.z, window.makeGear(null, ilvl), e.g.position.x, e.g.position.z);`);

/* 14 -- MIDDLE MOUSE ORBITS, IT NO LONGER PANS OFF THE HERO. The camera is
        always anchored on him; dragging swings the view around and tilts it. */
const CAM_FORMULA = `  camera.position.set(
    camAim.x+Math.sin(camYaw)*camDist*0.62,
    camAim.y+camDist*0.72,
    camAim.z+Math.cos(camYaw)*camDist*0.62);`;
one(CAM_FORMULA);
g = g.replace(CAM_FORMULA, `  /* 0.62 / 0.72 was a fixed elevation of ~49.3 degrees at radius 0.95.
     Same default, now steerable by the middle-mouse drag. */
  const _cL=0.95, _cp=Math.cos(camElev)*_cL, _sp=Math.sin(camElev)*_cL;
  camera.position.set(
    camAim.x+Math.sin(camYaw)*camDist*_cp,
    camAim.y+camDist*_sp,
    camAim.z+Math.cos(camYaw)*camDist*_cp);`);

const CAM_PAN_DECL = `const CAM_PAN_MAX=26;`;
one(CAM_PAN_DECL);
g = g.replace(CAM_PAN_DECL, `const CAM_PAN_MAX=26;
let camElev=0.860, CAM_ELEV_DEF=0.860;    // radians; matches the old fixed 0.62/0.72`);

const PAN_DRAG = `  const k=camDist*0.0024;                   // world units per pixel
  const cy=Math.cos(camYaw), sy=Math.sin(camYaw);
  camPan.x +=  cy*dx*k + sy*dy*k;           // screen right / screen down
  camPan.z += -sy*dx*k + cy*dy*k;
  if(camPan.length()>CAM_PAN_MAX) camPan.setLength(CAM_PAN_MAX);`;
one(PAN_DRAG);
g = g.replace(PAN_DRAG, `  /* ORBIT, NOT PAN. Dragging used to translate camPan and slide the camera off
     the hero entirely, which is how you could lose him off screen. It now turns
     the view around him and tilts it, and camPan stays pinned at zero. */
  camYaw  -= dx*0.0062;
  camElev  = Math.max(0.46, Math.min(1.32, camElev + dy*0.0042));
  camPan.set(0,0,0);`);

const PAN_RESET = `  if(camDrag.moved<5) camPan.set(0,0,0);    // click, not drag -> recentre`;
one(PAN_RESET);
g = g.replace(PAN_RESET, `  if(camDrag.moved<5) camElev=CAM_ELEV_DEF;  // click, not drag -> reset the tilt
  camPan.set(0,0,0);`);

const RECENTRE = `window.camRecentre=()=>camPan.set(0,0,0);`;
one(RECENTRE);
g = g.replace(RECENTRE, `window.camRecentre=()=>{ camPan.set(0,0,0); camElev=CAM_ELEV_DEF; };
/* read-only handles so camera behaviour can be asserted from outside */
window.CAMDBG={ get pan(){return camPan.length();}, get yaw(){return camYaw;},
                get elev(){return camElev;}, get dist(){return camDist;} };`);

/* 15 -- THE PROMPT CRASH. The rift branch wrote promptEl.textContent, which
        destroys the <b>E</b> and <i></i> children the town branch then does
        promptEl.querySelector('i').textContent on -> "can't access property
        textContent ... is null". Reachable the moment you stand on the exit
        gate, which in a generated map is the spawn point. */
const PROMPT_BUG = `    if(near){ promptEl.textContent=near.prompt; promptEl.classList.add('on'); }`;
one(PROMPT_BUG);
g = g.replace(PROMPT_BUG, `    if(near){
      let pi=promptEl.querySelector('i');
      if(!pi){ promptEl.innerHTML='<b>E</b><i></i>'; pi=promptEl.querySelector('i'); }
      pi.textContent=near.prompt;
      promptEl.classList.add('on');
    }`);

/* 16 -- NO LEAVE OPTION UNTIL THE RUN IS DONE. The gate spawns with you, so it
        was offering an exit on the first frame. Hidden until the boss dies. */
const GATE_STATION = `  const rec={name:'RiftExit', prompt:'Leave the Rift', pos:new THREE.Vector3(x,1.2,z), r:3.0,
             title:'Leave the Rift', body:'Step back through to Ashen Hollow.',
             acts:['Leave']};
  stations.push(rec);
  RIFT.exitStation=rec;`;
one(GATE_STATION);
g = g.replace(GATE_STATION, `  const rec={name:'RiftExit', prompt:'Leave the Rift', pos:new THREE.Vector3(x,1.2,z), r:3.0,
             title:'Leave the Rift', body:'Step back through to Ashen Hollow.',
             acts:['Leave'], sealed:true};
  stations.push(rec);
  RIFT.exitStation=rec;
  g.visible=false;                       // sealed until the rift is finished
  RIFT.exitSealed=true;`);

const GATE_SCAN = `  const riftStations=stations.filter(st=>st.name==='RiftExit');`;
one(GATE_SCAN);
g = g.replace(GATE_SCAN, `  const riftStations=stations.filter(st=>st.name==='RiftExit' && !st.sealed);`);

const FINISH = `function finishRift(){
  const wasGreater = !!RIFT.isGreater;`;
one(FINISH);
g = g.replace(FINISH, `function riftUnsealExit(){
  if(RIFT.exitStation) RIFT.exitStation.sealed=false;
  if(RIFT.exitGate) RIFT.exitGate.visible=true;
  RIFT.exitSealed=false;
  try{ toastRift('The way out has opened.'); }catch(e){}
}
window.riftUnsealExit=riftUnsealExit;
function finishRift(){
  riftUnsealExit();                      // the boss is down: you may leave now
  const wasGreater = !!RIFT.isGreater;`);

/* 17 -- THE DIABLO 3 RIFT PANEL. Replaces the dungeon/tier body wholesale with
        the card layout from his reference shot: rift-type cards, a LEVEL
        dropdown, the repeat toggle, ENTER RIFT / AUTOMATION. No MAP control --
        the map is rolled on entry and is not selectable. */
const PANEL_START = `const dl=listDungeons();`;
const PANEL_END = `  /* Advanced automation lives on its own screen (spec 22): the main panel`;
const pa = g.indexOf(PANEL_START), pb = g.indexOf(PANEL_END);
if (pa < 0 || pb < 0) throw new Error('panel anchors missing');
g = g.slice(0, pa) + `const _keys = (typeof keyCount==='function') ? keyCount() : 0;
  const _maxT = RIFT_CFG.maxTier, _maxG = (typeof GR_CFG!=='undefined') ? GR_CFG.maxTier : _maxT;
  window.__riftKind = window.__riftKind || 'neph';
  if(window.__riftKind==='greater' && _keys<1) window.__riftKind='neph';
  const _card = (id,label,sel,dim,corner) =>
    '<div id="'+id+'" style="position:relative;cursor:'+(dim?'default':'pointer')+';'+
      'border:1px solid '+(sel?'#c8a24a':'#3a3226')+';background:'+(sel?
        'linear-gradient(180deg,#241c10,#151009)':'#100e0b')+';'+
      'border-radius:3px;padding:16px 0 12px;text-align:center;margin-bottom:8px;'+
      'box-shadow:'+(sel?'0 0 0 1px rgba(200,162,74,.25) inset':'none')+';opacity:'+(dim?'.45':'1')+'">'+
      (corner?'<span style="position:absolute;top:8px;right:12px;font:10px \\'Trebuchet MS\\',sans-serif;'+
        'letter-spacing:.12em;color:#8b8272">'+corner+'</span>':'')+
      '<div style="width:62px;height:62px;margin:0 auto 10px;border-radius:50%;'+
        'background:radial-gradient(circle at 50% 40%,'+(sel?'#e0c07a,#7a5c22 60%,transparent 72%':
        '#6a5fa0,#2e2748 60%,transparent 72%')+')"></div>'+
      '<div style="font:13px \\'Trebuchet MS\\',sans-serif;letter-spacing:.22em;'+
        'color:'+(sel?'#f0e2c0':'#8b8272')+'">'+label+'</div>'+
    '</div>';
  let _lvl='';
  for(let t=1;t<=_maxT;t++) _lvl+='<option value="'+t+'"'+(t===(RIFT.tier||1)?' selected':'')+'>Level '+t+'</option>';
  body.innerHTML =
    '<div class="stcol" style="margin-bottom:12px">'+
      '<div style="text-align:center;font:11px \\'Trebuchet MS\\',sans-serif;letter-spacing:.24em;'+
        'color:#8b8272;margin:2px 0 12px">SELECT A RIFT TYPE</div>'+
      _card('rtNeph','NEPHALEM', window.__riftKind==='neph', false, '') +
      _card('rtGreater','GREATER', window.__riftKind==='greater', _keys<1, _keys+' KEYS') +
      '<div class="strow"><span class="k">Level</span><span class="v">'+
        '<select id="riftLevel" style="background:#12100c;color:#e6d5a6;border:1px solid #4a3e2b;'+
        'padding:4px 8px;min-width:180px;font:11px sans-serif">'+_lvl+'</select></span></div>'+
      '<label style="display:flex;align-items:center;gap:8px;margin-top:10px;'+
        'font:11px \\'Trebuchet MS\\',sans-serif;color:#a89f8b">'+
        '<input type="checkbox" id="riftRepeat"'+(RIFT.repeat?' checked':'')+'> Repeat when the boss dies</label>'+
      '<div class="stnote">The level sets the area level, which caps the item level of '+
      'everything that drops. Every run is a new map.</div>'+
    '</div>';
  document.getElementById('winTitle').textContent='Nephalem Rifts';
  const acts=document.getElementById('winActs');
  acts.innerHTML='<button id="riftGo">Enter Rift</button>'+
                 '<button id="autoCfg">Automation</button>';
  const _pick=(k)=>{ if(k==='greater' && _keys<1){ toastRift('You need a Greater Rift Key.'); return; }
    window.__riftKind=k; closeWin(); winOpen=true; window.openRiftPanel(); };
  document.getElementById('rtNeph').addEventListener('click',()=>_pick('neph'));
  document.getElementById('rtGreater').addEventListener('click',()=>_pick('greater'));
  document.getElementById('riftGo').addEventListener('click',()=>{
    const lvl=+document.getElementById('riftLevel').value;
    const rep=document.getElementById('riftRepeat').checked;
    closeWin();
    if(window.__riftKind==='greater') enterGreaterRift(Math.min(lvl,_maxG));
    else enterRift(Math.min(lvl,_maxT), rep);
  });
` + g.slice(pb);

/* 18 -- expose the boss spawner for assertions */
const BOSS_FN = `function riftUnsealExit(){`;
one(BOSS_FN);
g = g.replace(BOSS_FN, `window.spawnRiftBoss=()=>spawnRiftBoss();
function riftUnsealExit(){`);

/* 19 -- THE HERO CANNOT STAND INSIDE A MONSTER. Enemies had no body radius as
        far as the player was concerned, so walking (or Auto travelling) onto
        the Rift boss put the camera inside a 4.2m capsule and the hero
        vanished behind it. Resolved in collide(), which every movement path
        already goes through, so Auto gets it for free. Push-out only: it never
        pulls, and the radius is deliberately small so melee range is unchanged. */
const COLLIDE_TAIL = `  /* The 17.5 clamp is the TOWN boundary. Left on, it pins the hero inside a
     circle around the origin and he can never walk down the dungeon. */`;
one(COLLIDE_TAIL);
g = g.replace(COLLIDE_TAIL, `  if(typeof RIFT!=='undefined' && RIFT.active && typeof ENEMIES!=='undefined'){
    for(let i=0;i<ENEMIES.length;i++){
      const e=ENEMIES[i];
      if(!e || e.dead || !e.g) continue;
      const sc=e.g.scale.x||1;
      const min=(e.isBoss?0.80:0.52)*sc + 0.30;      // body radius + hero radius
      const dx=nx-e.g.position.x, dz=nz-e.g.position.z;
      const d=Math.hypot(dx,dz);
      if(d<min){
        if(d>0.0001){ nx=e.g.position.x+dx/d*min; nz=e.g.position.z+dz/d*min; }
        else { nx=e.g.position.x+min; }              // exactly concentric
      }
    }
  }
` + COLLIDE_TAIL);

/* 20 -- expose collide() so the push-out can be asserted */
const COLLIDE_EXPORT = `/* ========================================================== INTERACTION === */`;
one(COLLIDE_EXPORT);
g = g.replace(COLLIDE_EXPORT, `window.collide=(x,z)=>collide(x,z);
` + COLLIDE_EXPORT);

/* 21 -- ONE radius, shared by collide() and Auto, so they cannot disagree. */
const RADIUS_FN = `window.collide=(x,z)=>collide(x,z);`;
one(RADIUS_FN);
g = g.replace(RADIUS_FN, `/* A monster's body radius as the hero experiences it. collide() pushes him out
   to this, and Auto must aim to this, or the two fight each other forever. */
function enemyBodyRadius(e){
  const sc=(e && e.g && e.g.scale && e.g.scale.x) || 1;
  return (e && e.isBoss ? 0.80 : 0.52)*sc + 0.30;
}
window.enemyBodyRadius=enemyBodyRadius;
window.collide=(x,z)=>collide(x,z);`);

/* collide() uses the shared helper rather than its own copy of the numbers */
const COLLIDE_INLINE = `      const sc=e.g.scale.x||1;
      const min=(e.isBoss?0.80:0.52)*sc + 0.30;      // body radius + hero radius`;
one(COLLIDE_INLINE);
g = g.replace(COLLIDE_INLINE, `      const min=enemyBodyRadius(e);`);

/* 22 -- THE LIVELOCK. Auto's approach aimed at the enemy's exact CENTRE. Once
        collide() gave monsters a body, that point became unreachable: he shoved
        into the boss, never "arrived", and Auto reissued the same order every
        frame -- the running-into-the-boss loop. Aim at the near SURFACE
        instead, using the same radius collide() enforces. */
const APPROACH = `      const d=Math.hypot(e.g.position.x-P.x, e.g.position.z-P.z);
      if(d<ld){ ld=d; live={x:e.g.position.x, z:e.g.position.z}; }
    }
    if(live){ AUTO.state='TRAVEL'; autoSetPath({x:live.x,z:live.z,kind:'approach'},'approach'); return; }`;
one(APPROACH);
g = g.replace(APPROACH, `      const d=Math.hypot(e.g.position.x-P.x, e.g.position.z-P.z);
      if(d<ld){ ld=d; live={x:e.g.position.x, z:e.g.position.z, e:e}; }
    }
    if(live){
      /* stand off by the body radius plus a margin, so the destination is a
         place he can actually occupy */
      const stand=enemyBodyRadius(live.e)+0.45;
      const dx=P.x-live.x, dz=P.z-live.z, dd=Math.hypot(dx,dz);
      const ax = dd>0.001 ? live.x+dx/dd*stand : live.x+stand;
      const az = dd>0.001 ? live.z+dz/dd*stand : live.z;
      AUTO.state='TRAVEL';
      autoSetPath({x:ax,z:az,kind:'approach'},'approach');
      return;
    }`);

/* 23 -- SKELETON ENEMIES. The old enemyMesh built a fresh cylinder, a fresh
        sphere, and TWO fresh materials for every single mob -- 98 mobs meant
        196 geometries and 196 materials. The replacement shares two cached
        geometries and one material per rarity, so it is more detail for fewer
        resources. Rarity scale moves onto the Group so the geometry can be
        shared; spawnRiftBoss multiplies rather than overwrites, keeping the
        boss exactly the size it was. */
const OLD_MESH = `function enemyMesh(rarity, scale){
  const g=new THREE.Group();
  const col = rarity==='rare'?0xd8a33c : rarity==='magic'?0x5b7fd0 : 0x9a5a52;
  const body=new THREE.Mesh(new THREE.CylinderGeometry(0.34*scale,0.42*scale,1.25*scale,10),
    new THREE.MeshStandardMaterial({color:col, roughness:.85, metalness:.05}));
  body.position.y=0.62*scale; body.castShadow=true; g.add(body);
  const head=new THREE.Mesh(new THREE.SphereGeometry(0.26*scale,10,8),
    new THREE.MeshStandardMaterial({color:col, roughness:.8}));
  head.position.y=1.45*scale; head.castShadow=true; g.add(head);
  return g;
}`;
one(OLD_MESH);
g = g.replace(OLD_MESH, `function enemyMesh(rarity, scale){
  if(window.DEPTHS && typeof DEPTHS.skeletonGroup==='function'){
    try{
      const g=DEPTHS.skeletonGroup(rarity);
      g.scale.setScalar(scale);            // scale on the Group, not the geometry
      return g;
    }catch(e){ /* fall through to the placeholder below */ }
  }
  const g=new THREE.Group();
  const col = rarity==='rare'?0xd8a33c : rarity==='magic'?0x5b7fd0 : 0x9a5a52;
  const body=new THREE.Mesh(new THREE.CylinderGeometry(0.34*scale,0.42*scale,1.25*scale,10),
    new THREE.MeshStandardMaterial({color:col, roughness:.85, metalness:.05}));
  body.position.y=0.62*scale; body.castShadow=true; g.add(body);
  const head=new THREE.Mesh(new THREE.SphereGeometry(0.26*scale,10,8),
    new THREE.MeshStandardMaterial({color:col, roughness:.8}));
  head.position.y=1.45*scale; head.castShadow=true; g.add(head);
  return g;
}
/* Cheap gait: two hip rotations and a little body bob. No skinning, no bones,
   no per-frame allocation -- it is four sin() calls per visible mob. */
function poseEnemy(e, dt, moving){
  const sk = e.g && e.g.userData && e.g.userData.skel;
  if(!sk) return;
  sk.ph += dt * (moving ? 8.2 : 1.7);
  const sw = Math.sin(sk.ph) * (moving ? 0.62 : 0.05);
  sk.legs[0].rotation.x =  sw;
  sk.legs[1].rotation.x = -sw;
  sk.body.position.y = moving ? Math.abs(Math.sin(sk.ph)) * 0.035 : 0;
  sk.body.rotation.z = sw * 0.05;
}
window.poseEnemy=poseEnemy;`);

/* the boss keeps its old effective size: 1.35 (rare) x 1.8 */
const BOSS_SCALE = `b.dmg*=1.6; b.g.scale.setScalar(1.8);`;
one(BOSS_SCALE);
g = g.replace(BOSS_SCALE, `b.dmg*=1.6; b.g.scale.multiplyScalar(1.8);   // multiply: rarity scale already applied`);

/* drive the gait from the one place that already moves a mob each frame */
const MOVE_LINE = `      e.g.position.set(nx, groundAt(nx,nz), nz);
      e.g.rotation.y=Math.atan2(dx,dz);`;
one(MOVE_LINE);
g = g.replace(MOVE_LINE, `      e.g.position.set(nx, groundAt(nx,nz), nz);
      e.g.rotation.y=Math.atan2(dx,dz);
      poseEnemy(e, dt, true);`);

/* 24 -- MORE ENEMIES. Bands roughly doubled, and the area thresholds that
        decide a room's density are loosened so more chambers count as busy.
        Skeletons share two geometries, so the added cost is CPU-side AI and
        triangles, not draw calls. */
const DENSITY = `const DENSITY_N={ low:[3,4], medium:[5,6], high:[7,9] }`;
one(DENSITY);
g = g.replace(DENSITY, `const DENSITY_N={ low:[6,8], medium:[10,13], high:[15,19] }`);

/* 25 -- THE BOSS CIRCLING. My v68 standoff aimed the approach at the monster's
        BODY surface (~2.2m on the boss). AUTO_CFG says a bow engages from
        7.5-13m and kites anything closer than 5.2m, so Auto walked to 2.2m,
        the kite rule shoved it back out, the approach re-aimed at 2.2m, and it
        orbited forever without ever settling into the firing band. The
        standoff has to be the ENGAGEMENT band, not the ribcage. */
const STANDOFF = `      const stand=enemyBodyRadius(live.e)+0.45;`;
one(STANDOFF);
g = g.replace(STANDOFF, `      const band=(typeof AUTO_CFG!=='undefined' && AUTO_CFG.bowRange) ? AUTO_CFG.bowRange[0] : 7.5;
      const stand=Math.max(enemyBodyRadius(live.e)+0.45, band*0.94);`);

/* 26 -- DUNGEONS ARE IDLE-ONLY. No WASD, no click-to-move inside a Rift; Auto
        owns the body. window.MANUAL_MOVE re-enables it for debugging. */
const WASD = `  if(keys['w']||keys['arrowup'])   { mx-=fwd.x; mz-=fwd.z; }
  if(keys['s']||keys['arrowdown']) { mx+=fwd.x; mz+=fwd.z; }
  if(keys['a']||keys['arrowleft']) { mx-=rgt.x; mz-=rgt.z; }
  if(keys['d']||keys['arrowright']){ mx+=rgt.x; mz+=rgt.z; }
  if(mx||mz) moveTarget=null;`;
one(WASD);
g = g.replace(WASD, `  const idleOnly = !window.MANUAL_MOVE && window.RIFT && RIFT.active;
  if(!idleOnly){
    if(keys['w']||keys['arrowup'])   { mx-=fwd.x; mz-=fwd.z; }
    if(keys['s']||keys['arrowdown']) { mx+=fwd.x; mz+=fwd.z; }
    if(keys['a']||keys['arrowleft']) { mx-=rgt.x; mz-=rgt.z; }
    if(keys['d']||keys['arrowright']){ mx+=rgt.x; mz+=rgt.z; }
    if(mx||mz) moveTarget=null;
  } else { moveTarget=null; }`);

const CLICK_MOVE = `  if(ray.ray.intersectPlane(floorPlane,hit)) moveTarget=hit;`;
one(CLICK_MOVE);
g = g.replace(CLICK_MOVE, `  if(!window.MANUAL_MOVE && window.RIFT && RIFT.active) return;   // idle-only run
  if(ray.ray.intersectPlane(floorPlane,hit)) moveTarget=hit;`);

/* 27 -- AN OPEN PANEL MUST NOT STOP THE RUN. uiBusy still swallows keys, but it
        no longer switches Auto off, so checking the inventory mid-run costs
        nothing. */
const AUTODRIVE = `  const autoDriving = window.AUTO && AUTO.on && window.RIFT && RIFT.active &&
                      (performance.now()/1000 >= AUTO.suspendUntil) && !uiBusy && !ED.on;`;
one(AUTODRIVE);
g = g.replace(AUTODRIVE, `  const autoDriving = window.AUTO && AUTO.on && window.RIFT && RIFT.active &&
                      (performance.now()/1000 >= AUTO.suspendUntil) && !ED.on;`);

/* 28 -- CAMERA SNAPS ON ENTRY instead of flying across the map. camAim lerps at
        dt*5 toward the hero, so a teleport of 100m read as a long pan. */
const CAM_LERP = `  camAimT.copy(player.position).add(camPan);
  camAim.lerp(camAimT, Math.min(1,dt*5));`;
one(CAM_LERP);
g = g.replace(CAM_LERP, `  camAimT.copy(player.position).add(camPan);
  if(window.__camWarp){ camAim.copy(camAimT); window.__camWarp=false; }
  else camAim.lerp(camAimT, Math.min(1,dt*5));`);

const SET_MODE = `function setWorldMode(mode){
  WORLD.mode=mode;`;
one(SET_MODE);
g = g.replace(SET_MODE, `function setWorldMode(mode){
  window.__camWarp=true;                 // snap, do not pan, across a teleport
  WORLD.mode=mode;`);

/* the hero is placed AFTER the mode switch on an authored map, so warp again */
const SPAWN_PLACE = `player.position.set(res.spawn.x, groundAt(res.spawn.x,res.spawn.z), res.spawn.z);`;
one(SPAWN_PLACE);
g = g.replace(SPAWN_PLACE, `player.position.set(res.spawn.x, groundAt(res.spawn.x,res.spawn.z), res.spawn.z);
      window.__camWarp=true;`);

/* 29 -- a Rift always runs itself */
const RIFT_AUTO = `  RIFT.runs++;
  setWorldMode('RIFT');`;
one(RIFT_AUTO);
g = g.replace(RIFT_AUTO, `  RIFT.runs++;
  if(window.AUTO) AUTO.on=true;            // dungeons are idle-only
  setWorldMode('RIFT');`);

/* 30 -- base movement speed down a notch */
const SPEED = `  walkSpeed : 2.3,             // shift-walk
  runSpeed  : 5.4,`;
one(SPEED);
g = g.replace(SPEED, `  walkSpeed : 2.0,             // shift-walk
  runSpeed  : 4.3,             // was 5.4 — read as sprinting, not running`);

/* 31 -- SKELETON LEGIONNAIRE: animation states and a fair attack.
        Replaces poseEnemy with the package's state set (idle / locomotion /
        windup / active / recovery / hit / death) and replaces the melee
        "cooldown expires, damage happens" rule with wind-up -> active window ->
        recovery. Section 12.2: no melee damage from proximity alone. */
const OLD_POSE = `/* Cheap gait: two hip rotations and a little body bob. No skinning, no bones,
   no per-frame allocation -- it is four sin() calls per visible mob. */
function poseEnemy(e, dt, moving){
  const sk = e.g && e.g.userData && e.g.userData.skel;
  if(!sk) return;
  sk.ph += dt * (moving ? 8.2 : 1.7);
  const sw = Math.sin(sk.ph) * (moving ? 0.62 : 0.05);
  sk.legs[0].rotation.x =  sw;
  sk.legs[1].rotation.x = -sw;
  sk.body.position.y = moving ? Math.abs(Math.sin(sk.ph)) * 0.035 : 0;
  sk.body.rotation.z = sw * 0.05;
}
window.poseEnemy=poseEnemy;`;
one(OLD_POSE);
g = g.replace(OLD_POSE, `const LOD_FAR = 24;          // beyond this, arms and sword are hidden (3 draws)
const ANIM_FAR_HZ = 15;      // section 13: 30-60 Hz near, 15 Hz far
function poseEnemy(e, dt, moving){
  const sk = e.g && e.g.userData && e.g.userData.skel;
  if(!sk) return;

  /* update-rate LOD. Distance is to the hero, who is the only camera anchor. */
  let far=false;
  try{
    const p=AH_WORLD.player.position;
    const dx=e.g.position.x-p.x, dz=e.g.position.z-p.z;
    far = (dx*dx+dz*dz) > LOD_FAR*LOD_FAR;
  }catch(err){}
  if(far !== (sk.lod===0)){
    sk.lod = far?0:1;
    sk.arms[0].visible = sk.arms[1].visible = !far;   // sword is a child of arm 1
  }
  if(far){
    sk.animT += dt;
    if(sk.animT < 1/ANIM_FAR_HZ) return;
    dt = sk.animT; sk.animT = 0;
  }

  /* death takes priority over everything else */
  if(e.deathT!==undefined){
    e.deathT += dt;
    const t=Math.min(1, e.deathT/1.25);
    const ease=t*t;
    sk.torso.rotation.x = -ease*1.45;                 // knees soften, torso folds
    sk.torso.position.y = -ease*0.62;
    sk.legs[0].rotation.x = ease*1.1; sk.legs[1].rotation.x = ease*0.85;
    sk.arms[0].rotation.x = ease*0.9; sk.arms[1].rotation.x = ease*1.3;
    sk.torso.rotation.z = ease*0.35;
    return;
  }

  /* hit reaction: a short flinch that reads at gameplay zoom */
  if(e.hitT>0){
    e.hitT -= dt;
    const k=Math.max(0, e.hitT)/ (e.hitHeavy?0.52:0.26);
    const f=Math.sin(k*Math.PI)*(e.hitHeavy?0.42:0.20);
    sk.torso.rotation.x = -f;
    sk.torso.position.y = -f*0.10;
    sk.arms[0].rotation.x = f*0.7; sk.arms[1].rotation.x = f*0.5;
    if(e.hitT<=0){ e.hitT=0; e.hitHeavy=false; }
    return;
  }

  /* attack: anticipation -> active -> follow-through -> recover */
  if(e.atk){
    const a=e.atk, W=a.windup, A=a.active, R=a.recovery;
    let arm, torsoTwist, lean;
    if(a.t < W){
      const k=a.t/W, ease=k*k;                        // slow load, then commit
      arm = -2.35*ease; torsoTwist = 0.42*ease; lean = -0.10*ease;
    } else if(a.t < W+A){
      const k=(a.t-W)/A;
      arm = -2.35 + (3.05)*k; torsoTwist = 0.42 - 0.85*k; lean = -0.10 + 0.34*k;
    } else {
      const k=Math.min(1,(a.t-W-A)/R);
      arm = 0.70*(1-k) - 0.15*k; torsoTwist = -0.43*(1-k); lean = 0.24*(1-k);
    }
    if(a.id==='backhand'){ arm*=-0.85; torsoTwist*=-1.1; }
    sk.arms[1].rotation.x = arm;
    sk.arms[1].rotation.z = a.id==='backhand' ? -0.5 : 0.18;
    sk.arms[0].rotation.x = -arm*0.28;
    sk.torso.rotation.y = torsoTwist;
    sk.torso.rotation.x = lean;
    sk.torso.position.y = 0;
    sk.legs[0].rotation.x = a.id==='stepin' ? -0.35*Math.min(1,a.t/W) : 0.06;
    sk.legs[1].rotation.x = a.id==='stepin' ?  0.30*Math.min(1,a.t/W) : -0.06;
    return;
  }

  /* locomotion / idle */
  sk.ph += dt * (moving ? 8.2 : 1.9);
  const sw = Math.sin(sk.ph) * (moving ? 0.62 : 0.045);
  sk.legs[0].rotation.x =  sw;
  sk.legs[1].rotation.x = -sw;
  sk.arms[0].rotation.x = -sw*0.55;                   // arms counter-swing
  sk.arms[1].rotation.x =  sw*0.45;
  sk.arms[0].rotation.z = 0; sk.arms[1].rotation.z = 0.10;
  sk.torso.position.y = moving ? Math.abs(Math.sin(sk.ph))*0.035 : Math.sin(sk.ph*0.6)*0.012;
  sk.torso.rotation.z = sw*0.05;
  sk.torso.rotation.y = sw*0.09;
  sk.torso.rotation.x = moving ? 0.14 : 0.04;         // forward-hunched thorax
}
window.poseEnemy=poseEnemy;

/* --- fair melee: damage lands in the ACTIVE window, never on proximity ----- */
function enemyPickAttack(e, d){
  const L=(window.DEPTHS&&DEPTHS.legionnaireDef)?DEPTHS.legionnaireDef():null;
  const list=(L?L.attacks:null) || [{id:'chop',weight:1,damageMult:1,windup:0.42,active:0.10,recovery:0.48,minRange:0,maxRange:1.9}];
  const ok=list.filter(a=>d>=a.minRange && d<=a.maxRange);
  const pool=ok.length?ok:[list[0]];
  let total=0; for(const a of pool) total+=a.weight;
  let r=Math.random()*total;
  for(const a of pool){ r-=a.weight; if(r<=0) return a; }
  return pool[0];
}
function enemyAttackTick(e, dt, d){
  if(e.hitT>0 || e.deathT!==undefined){ e.atk=null; return; }
  if(e.atk){
    const a=e.atk, prev=a.t;
    a.t += dt;
    const w=a.windup, act=a.windup+a.active;
    /* ACTIVE WINDOW: the contact moment, and only then */
    if(prev < w && a.t >= w){
      const reach=(window.DEPTHS&&DEPTHS.legionnaireDef?DEPTHS.legionnaireDef().meleeReach:1.9)
                  * (e.g.scale.x||1);
      if(d <= reach + 0.25){
        const dmg=Math.round(e.dmg * a.damageMult);
        if(typeof window.onPlayerHit==='function') window.onPlayerHit(e, dmg);
        floatNumber(player.position, dmg, false);
      }
    }
    if(a.t >= act + a.recovery){
      e.atk=null;
      e.cd=(window.DEPTHS&&DEPTHS.legionnaireDef?DEPTHS.legionnaireDef().cadence:1.6)
           - a.windup - a.active - a.recovery;
      if(e.cd<0.05) e.cd=0.05;
    }
    return;
  }
  /* settle briefly before committing, so he does not skate into a swing */
  e.cd -= dt;
  if(e.cd>0) return;
  const a=enemyPickAttack(e,d);
  e.atk={ id:a.id, t:0, windup:a.windup, active:a.active, recovery:a.recovery, damageMult:a.damageMult };
}
window.enemyAttackTick=enemyAttackTick;`);

/* replace the proximity-cooldown melee with the state machine */
const OLD_MELEE = `    } else if(d<=CFG.enemy.meleeRange){
      e.cd-=dt;
      if(e.cd<=0){
        e.cd=CFG.enemy.attackCd;
        if(typeof window.onPlayerHit==='function') window.onPlayerHit(e, Math.round(e.dmg));

        floatNumber(player.position, Math.round(e.dmg), false);
      }
    }`;
one(OLD_MELEE);
g = g.replace(OLD_MELEE, `    } else if(d<=CFG.enemy.meleeRange){
      enemyAttackTick(e, dt, d);
      poseEnemy(e, dt, false);
    }`);

/* a committed attack roots him: he must not walk out of his own swing */
const APPROACH_GUARD = `    if(d < CFG.enemy.aggro && d > CFG.enemy.meleeRange){`;
one(APPROACH_GUARD);
g = g.replace(APPROACH_GUARD, `    if(e.atk){ enemyAttackTick(e, dt, d); poseEnemy(e, dt, false); }
    else if(d < CFG.enemy.aggro && d > CFG.enemy.meleeRange){`);

/* 32 -- HIT REACTION. damageEnemy already sets e.hitT=0.9 for the existing hit
        flash, so the flinch gets its OWN field rather than hijacking it. A
        heavy hit cancels a wind-up; a light one does not (Legionnaire stagger
        resistance is 1.00x). */
const DMG_HOOK = `e.hp-=applied;
  e.hitT=0.9;`;
one(DMG_HOOK);
g = g.replace(DMG_HOOK, `e.hp-=applied;
  e.hitT=0.9;
  const heavy = applied > e.maxHp*0.12;
  e.hitHeavy = heavy;
  e.flinch = heavy ? 0.52 : 0.26;
  if(heavy && e.atk && e.atk.t < e.atk.windup) e.atk=null;   // a real hit interrupts`);

/* 33 -- DEATH. killEnemy removes the mesh on the same frame, so the collapse
        plays on a detached CORPSE instead. Gameplay is untouched: the enemy is
        gone from ENEMIES immediately and the kill event still fires. */
const KILL = `function killEnemy(e, silent){
  if(!e || e.dead) return;
  e.dead=true;
  riftRoot.remove(e.g); scene.remove(e.g);`;
one(KILL);
g = g.replace(KILL, `const CORPSES=[];
function tickCorpses(dt){
  for(let i=CORPSES.length-1;i>=0;i--){
    const c=CORPSES[i];
    c.t+=dt;
    if(typeof poseEnemy==='function') poseEnemy(c.e, dt, false);
    if(c.t>1.9){ riftRoot.remove(c.g); scene.remove(c.g); CORPSES.splice(i,1); }
  }
}
window.tickCorpses=tickCorpses;
function killEnemy(e, silent){
  if(!e || e.dead) return;
  e.dead=true;
  if(e.g && e.g.userData && e.g.userData.skel && CORPSES.length<24){
    e.deathT=0; e.atk=null; e.flinch=0;
    CORPSES.push({g:e.g, e:e, t:0});           // let the body fold, then clear it
  } else { riftRoot.remove(e.g); scene.remove(e.g); }`);

const KILL_TAIL = `  const i=ENEMIES.indexOf(e); if(i>=0) ENEMIES.splice(i,1);
  if(e.bar){ e.bar.remove(); e.bar=null; }
  if(!silent && typeof window.onEnemyKilled==='function') window.onEnemyKilled(e);`;
one(KILL_TAIL);
g = g.replace(KILL_TAIL, `  const i=ENEMIES.indexOf(e); if(i>=0) ENEMIES.splice(i,1);
  if(e.bar){ e.bar.remove(); e.bar=null; }
  if(!silent && typeof window.onEnemyKilled==='function') window.onEnemyKilled(e);`);

/* corpses need a frame; ride the one the loop already calls */
const FX_TICK = `window.updateFX && window.updateFX(dt);`;
one(FX_TICK);
g = g.replace(FX_TICK, `window.updateFX && window.updateFX(dt);
  window.tickCorpses && window.tickCorpses(dt);`);

/* 34 -- flinch reads its own field, and the collision radius comes from the
        package (0.42 m) rather than my earlier guess */
g = g.replace(`  if(e.hitT>0){
    e.hitT -= dt;
    const k=Math.max(0, e.hitT)/ (e.hitHeavy?0.52:0.26);`,
`  if(e.flinch>0){
    e.flinch -= dt;
    const k=Math.max(0, e.flinch)/ (e.hitHeavy?0.52:0.26);`);
g = g.replace(`    if(e.hitT<=0){ e.hitT=0; e.hitHeavy=false; }
    return;`,
`    if(e.flinch<=0){ e.flinch=0; e.hitHeavy=false; }
    return;`);
g = g.replace(`  if(e.hitT>0 || e.deathT!==undefined){ e.atk=null; return; }`,
              `  if(e.flinch>0 || e.deathT!==undefined){ e.atk=null; return; }`);
g = g.replace(`  return (e && e.isBoss ? 0.80 : 0.52)*sc + 0.30;`,
              `  return (e && e.isBoss ? 0.80 : 0.42)*sc + 0.30;   // package: collisionRadius 0.42`);

/* 35 -- the boss placement sanity check used dungeonClearance, which is
        spatially culled around the PLAYER. When the boss spawns in an arena
        across the map that function sees no blockers at all and reports the
        spot clear, so the nudge-onto-open-floor never ran. Ask the layout's
        walk grid instead; it is exact at any distance. */
const BOSS_CLEAR = `  if(typeof dungeonClearance==='function' && RIFT.authored && RIFT.nav){
    const room=RIFT.nav.bossRoom;
    if(dungeonClearance(bx,bz)<1.2 && room && room.pts.length){`;
one(BOSS_CLEAR);
g = g.replace(BOSS_CLEAR, `  const bossSpotBad = (x,z) => {
    if(window.DEPTHS && typeof DEPTHS.walkableAt==='function'){
      const w=DEPTHS.walkableAt(x,z,0.9);          // wide probe: he is 2.4m across
      if(w!==null) return !w;
    }
    return (typeof dungeonClearance==='function') ? dungeonClearance(x,z)<1.2 : false;
  };
  if(RIFT.authored && RIFT.nav){
    const room=RIFT.nav.bossRoom;
    if(bossSpotBad(bx,bz) && room && room.pts.length){`);

/* 36 -- ENEMIES SPAWNED THROUGH WALLS. The wave jitters +-1m off a nav point;
        a point near a wall pushes the mob straight into the void. Same class as
        the loot bug, same fix: ask the layout's walk grid, which is exact at any
        distance, and fall back to the unjittered point. */
const SPAWN_JITTER = `        const p=room.pts[Math.floor(Math.random()*room.pts.length)];
        spawnEnemy(p.x+(Math.random()-.5)*2, p.z+(Math.random()-.5)*2, lvl);`;
one(SPAWN_JITTER);
g = g.replace(SPAWN_JITTER, `        const p=room.pts[Math.floor(Math.random()*room.pts.length)];
        const s=enemySpawnSpot(p.x+(Math.random()-.5)*2, p.z+(Math.random()-.5)*2, p.x, p.z);
        spawnEnemy(s[0], s[1], lvl);`);

const SPAWN_FN = `function riftSpawnWave(opts){`;
one(SPAWN_FN);
g = g.replace(SPAWN_FN, `/* Pull a spawn back onto walkable floor. dungeonClearance is spatially culled
   around the player and cannot answer for a room across the map, so the walk
   grid is the oracle wherever a generated map is live. */
function enemySpawnSpot(x, z, ax, az){
  const ok=(px,pz)=>{
    if(window.DEPTHS && typeof DEPTHS.walkableAt==='function'){
      const w=DEPTHS.walkableAt(px,pz,0.5);
      if(w!==null) return w;
    }
    return (typeof dungeonClearance==='function') ? dungeonClearance(px,pz)>0.55 : true;
  };
  if(ok(x,z)) return [x,z];
  for(let t=0.75;t>0.001;t-=0.15){
    const px=ax+(x-ax)*t, pz=az+(z-az)*t;
    if(ok(px,pz)) return [px,pz];
  }
  if(ok(ax,az)) return [ax,az];
  for(let r=0.8;r<=4;r+=0.8) for(let k=0;k<8;k++){
    const a=k*0.785, px=ax+Math.cos(a)*r, pz=az+Math.sin(a)*r;
    if(ok(px,pz)) return [px,pz];
  }
  return [ax,az];
}
window.enemySpawnSpot=enemySpawnSpot;
function riftSpawnWave(opts){`);

/* 37 -- AUTO IGNORED ANYTHING THAT LEFT THE ROOM. The engage branch filtered
        enemies by navRoomAt(e) === current room, so a skeleton that chased him
        through a doorway became invisible to targeting -- he would stand there
        not shooting while it hit him. Room enemies still win; anything else
        inside combatRadius is now a valid fallback. */
const ENGAGE = `    let live=null, ld=1e9;
    for(const e of ENEMIES){
      if(e.dead) continue;
      if(navRoomAt(e.g.position.x,e.g.position.z)!==cur) continue;
      const d=Math.hypot(e.g.position.x-P.x, e.g.position.z-P.z);
      if(d<ld){ ld=d; live={x:e.g.position.x, z:e.g.position.z, e:e}; }
    }`;
one(ENGAGE);
g = g.replace(ENGAGE, `    let live=null, ld=1e9, near=null, nd=1e9;
    const RCOMBAT=(typeof AUTO_CFG!=='undefined'&&AUTO_CFG.combatRadius)?AUTO_CFG.combatRadius:16;
    for(const e of ENEMIES){
      if(e.dead) continue;
      const d=Math.hypot(e.g.position.x-P.x, e.g.position.z-P.z);
      if(navRoomAt(e.g.position.x,e.g.position.z)===cur){
        if(d<ld){ ld=d; live={x:e.g.position.x, z:e.g.position.z, e:e}; }
      } else if(d<RCOMBAT && d<nd){
        nd=d; near={x:e.g.position.x, z:e.g.position.z, e:e};
      }
    }
    /* something chasing him out of the room still deserves an answer */
    if(!live && near) live=near;`);

/* 38 -- A STATUS DUMP HE CAN PASTE BACK. Press F8 (or call ahStatus()) and it
        prints and copies a single compact report: where he is, what Auto is
        doing and why, what it is targeting, and -- the part that matters -- an
        automatic scan for the failure modes that have actually bitten us:
        mobs or loot outside the walls, an unreachable Auto node, a target Auto
        cannot see, and a boss wedged in geometry. */
const STATUS_ANCHOR = `window.collide=(x,z)=>collide(x,z);`;
one(STATUS_ANCHOR);
g = g.replace(STATUS_ANCHOR, `window.collide=(x,z)=>collide(x,z);

function ahStatus(){
  const L=[];
  const n=(v,d)=>(v===undefined||v===null)?'-':(typeof v==='number'?v.toFixed(d===undefined?1:d):v);
  const walk=(x,z)=>{ try{ const w=DEPTHS.walkableAt(x,z); return w===null?'?':(w?'ok':'IN WALL'); }catch(e){ return '?'; } };
  try{
    const P=(window.AH_WORLD&&AH_WORLD.player)?AH_WORLD.player.position:null;
    L.push('=== ASHEN HOLLOW STATUS ===');
    L.push('mode '+WORLD.mode+(RIFT.active?('  tier '+RIFT.tier+'  progress '+RIFT.progress+'/'+RIFT.target):''));
    if(RIFT_DUNGEON && DUNGEONS[RIFT_DUNGEON])
      L.push('map  '+DUNGEONS[RIFT_DUNGEON].name+'  ('+(DUNGEONS[RIFT_DUNGEON].roomGraph||[]).length+' chambers, kind '+DUNGEONS[RIFT_DUNGEON].kind+')');
    if(P) L.push('hero x'+n(P.x)+' z'+n(P.z)+'  floor '+walk(P.x,P.z)+'  hp '+n(COMBAT&&COMBAT.hp,0));
    L.push('enemies alive '+ENEMIES.length+'   boss '+(RIFT.bossSpawned?(RIFT.boss?'alive':'dead'):'not spawned')+
           '   exit '+(RIFT.exitSealed?'sealed':'open'));
    /* loot state: the difference between "ignored" and "bag full" matters */
    if(window.GROUND){
      const nowL=performance.now()/1000;
      const onFloor=GROUND.length;
      const skipped=GROUND.filter(g=>g.skip).length;
      const waiting=GROUND.filter(g=>g.retryAt>nowL).length;
      let nearest='-';
      if(P && onFloor){
        let bd=1e9; for(const gr of GROUND){ if(gr.skip) continue;
          const d=Math.hypot(gr.g.position.x-P.x,gr.g.position.z-P.z); if(d<bd) bd=d; }
        nearest = bd<1e9 ? n(bd)+'m' : '-';
      }
      L.push('loot on floor '+onFloor+'  (filtered '+skipped+', retry-wait '+waiting+')'+
             '  nearest '+nearest+'  radius '+((window.AUTO_CFG&&AUTO_CFG.lootRadius)||'-')+
             '  bagFull='+(GROUND.bagFull>nowL));
    }

    /* --- Auto --- */
    if(window.AUTO){
      L.push('AUTO on='+AUTO.on+'  state='+AUTO.state+'  why="'+(AUTO.nodeWhy||'')+'"'+
             '  room='+(AUTO.roomId||AUTO.room)+'  goal='+(AUTO.goalId||'-'));
      if(AUTO.node) L.push('  node x'+n(AUTO.node.x)+' z'+n(AUTO.node.z)+'  '+walk(AUTO.node.x,AUTO.node.z)+
        '  age '+n(performance.now()/1000-(AUTO.nodeSince||0))+'s'+
        (P?('  dist '+n(Math.hypot(AUTO.node.x-P.x,AUTO.node.z-P.z))):''));
      else L.push('  node none');
      L.push('  stats stuck='+AUTO.stats.stuck+' retarget='+AUTO.stats.retarget+' transitions='+AUTO.stats.transitions);
      L.push('  suspended='+(performance.now()/1000 < (AUTO.suspendUntil||0)));
    }

    /* --- nearest enemy, and whether Auto can even see it --- */
    if(P && ENEMIES.length){
      let best=null,bd=1e9;
      for(const e of ENEMIES){ if(e.dead) continue;
        const d=Math.hypot(e.g.position.x-P.x,e.g.position.z-P.z); if(d<bd){bd=d;best=e;} }
      if(best){
        const sameRoom=(typeof navRoomAt==='function' && RIFT.nav)
          ? (navRoomAt(best.g.position.x,best.g.position.z)===navRoomAt(P.x,P.z)) : '?';
        L.push('nearest mob '+n(bd)+'m  '+walk(best.g.position.x,best.g.position.z)+
               '  sameRoom='+sameRoom+'  atk='+(best.atk?best.atk.id+'@'+n(best.atk.t,2):'none')+
               '  hp '+n(best.hp,0)+'/'+n(best.maxHp,0));
      }
    }

    /* --- automatic scan for the failure modes that have actually bitten us --- */
    const bad=[];
    let mobsOut=0, lootOut=0;
    for(const e of ENEMIES){ if(!e.dead && walk(e.g.position.x,e.g.position.z)==='IN WALL') mobsOut++; }
    for(const gr of (window.GROUND||[])){ if(walk(gr.g.position.x,gr.g.position.z)==='IN WALL') lootOut++; }
    if(mobsOut) bad.push(mobsOut+' enemies outside the walls');
    if(lootOut) bad.push(lootOut+' ground items outside the walls');
    if(window.AUTO && AUTO.node && walk(AUTO.node.x,AUTO.node.z)==='IN WALL')
      bad.push('Auto is walking at a node inside a wall');
    if(window.AUTO && AUTO.node && (performance.now()/1000-(AUTO.nodeSince||0))>12)
      bad.push('Auto node is stale (>12s) — it cannot reach it');
    if(RIFT.boss && walk(RIFT.boss.g.position.x, RIFT.boss.g.position.z)==='IN WALL')
      bad.push('the boss is standing in geometry');
    if(P && RIFT.active && walk(P.x,P.z)==='IN WALL') bad.push('the HERO is inside geometry');
    if(window.AUTO && AUTO.on && ENEMIES.length && !AUTO.node && AUTO.state!=='EXIT')
      bad.push('Auto has no node while enemies are alive');
    if(window.GROUND && P){
      const nowL=performance.now()/1000;
      const reach=GROUND.filter(gr=>!gr.skip && !(gr.retryAt>nowL) &&
        Math.hypot(gr.g.position.x-P.x,gr.g.position.z-P.z) < ((window.AUTO_CFG&&AUTO_CFG.lootRadius)||14)).length;
      if(reach && AUTO && AUTO.state!=='LOOT' && !AUTO.target)
        bad.push(reach+' drops are in range but Auto is not looting (state '+AUTO.state+')');
      if(GROUND.bagFull>nowL) bad.push('bag is full — drops are being left on purpose');
    }
    L.push(bad.length ? ('!! '+bad.join('\\n!! ')) : 'scan: nothing obviously wrong');
  }catch(err){ L.push('status threw: '+err.message); }
  const out=L.join('\\n');
  console.log(out);
  try{ navigator.clipboard.writeText(out); toast&&toast('Status copied to clipboard'); }catch(e){}
  return out;
}
window.ahStatus=ahStatus;
addEventListener('keydown',e=>{ if(e.key==='F8'){ e.preventDefault(); ahStatus(); } });`);

/* 39 -- LOOT WAS UNREACHABLE DURING A FIGHT. The LOOT block sits AFTER the
        combat block, which ends in `return`. With 200+ mobs in a large map
        there is nearly always a target, so Auto never reached the loot code at
        all -- drops were walked over and left behind, then fell outside
        lootRadius forever once he moved on. Two changes: an instant grab that
        runs BEFORE combat (pickup is free, it needs no pathing), and a wider
        radius so a drop behind him is still a candidate once the room quiets. */
const LOOT_BLOCK = `  /* ---------- LOOT ---------- */
  const nowS=performance.now()/1000;`;
one(LOOT_BLOCK);
g = g.replace(LOOT_BLOCK, `  /* ---------- LOOT ---------- */
  const nowS=performance.now()/1000;`);

const COMBAT_RETURN = `    autoAttack(tgt);
    return;
  }`;
one(COMBAT_RETURN);
g = g.replace(COMBAT_RETURN, `    autoAttack(tgt);
    return;
  }`);

/* the grab pass goes in front of everything that can return early */
const AUTO_HEAD = `  /* --- stuck detection, the part that matters for unattended play --- */`;
one(AUTO_HEAD);
g = g.replace(AUTO_HEAD, `  /* OPPORTUNISTIC GRAB. Picking up costs nothing and needs no pathing, so it
     must not sit behind the combat branch's early return. Anything he is
     already standing on is his, fight or no fight. */
  if(window.GROUND && GROUND.length){
    const nowG=performance.now()/1000;
    for(let i=GROUND.length-1;i>=0;i--){
      const gr=GROUND[i];
      if(gr.skip || (gr.retryAt>nowG)) continue;
      const dx=gr.g.position.x-P.x, dz=gr.g.position.z-P.z;
      if(dx*dx+dz*dz < 5.3){                 // ~2.3 m
        if(pickUp(gr) && AUTO.lootTarget===gr) AUTO.lootTarget=null;
      }
    }
  }

  /* --- stuck detection, the part that matters for unattended play --- */`);

const LOOT_RADIUS = `lootRadius:14,`;
one(LOOT_RADIUS);
g = g.replace(LOOT_RADIUS, `lootRadius:22,          // was 14 — a drop behind him fell out of range too fast`);

/* 40 -- THE PANIC KITE. Two mistakes stacked.
   (a) My v71 approach standoff was bowRange[0]*0.94 = 7.05m, but the steering
       band's strongRetreat is 7.0 and gentleRetreat is 8.0 -- so the instant he
       reached his own approach target the steering told him to back away, then
       the approach re-issued, forever. The standoff must be STEER_CFG.ideal.
   (b) Every distance was measured centre-to-centre. A 0.72m skeleton and a
       2.24m boss are not the same problem: at 10m from a boss's CENTRE he is
       1.5m closer to the thing than the band intends, which put him
       permanently inside strongRetreat -- a full-speed panic sprint that never
       settles long enough to shoot. Distances are now normalised to the gap a
       normal mob would leave. */
const COMBAT_DIST = `function steerCombat(tgt, dt){`;
one(COMBAT_DIST);
g = g.replace(COMBAT_DIST, `const NORMAL_BODY = 0.72;      // a baseline skeleton's radius + the hero's
function combatDist(tgt, rawD){
  const r = (typeof enemyBodyRadius==='function') ? enemyBodyRadius(tgt) : NORMAL_BODY;
  return rawD - (r - NORMAL_BODY);     // identical for trash, honest for a boss
}
window.combatDist=combatDist;
function steerCombat(tgt, dt){`);

const STEER_D = `  const dx=tgt.g.position.x-P.x, dz=tgt.g.position.z-P.z;
  const d=Math.hypot(dx,dz)||0.001;
  const tx=dx/d, tz=dz/d, sx=-tz, sz=tx;`;
one(STEER_D);
g = g.replace(STEER_D, `  const dx=tgt.g.position.x-P.x, dz=tgt.g.position.z-P.z;
  const raw=Math.hypot(dx,dz)||0.001;
  const tx=dx/raw, tz=dz/raw, sx=-tz, sz=tx;
  const d=Math.max(0.001, combatDist(tgt, raw));   // band is about the GAP, not centres`);

const STATE_D = `    const dd=Math.hypot(tgt.g.position.x-P.x, tgt.g.position.z-P.z);
    AUTO.state = dd<STEER_CFG.strongRetreat ? 'RETREAT'
               : dd>STEER_CFG.strongAdvance ? 'ADVANCE' : 'FIGHT';`;
one(STATE_D);
g = g.replace(STATE_D, `    const dd=combatDist(tgt, Math.hypot(tgt.g.position.x-P.x, tgt.g.position.z-P.z));
    AUTO.state = dd<STEER_CFG.strongRetreat ? 'RETREAT'
               : dd>STEER_CFG.strongAdvance ? 'ADVANCE' : 'FIGHT';`);

const STANDOFF2 = `      const band=(typeof AUTO_CFG!=='undefined' && AUTO_CFG.bowRange) ? AUTO_CFG.bowRange[0] : 7.5;
      const stand=Math.max(enemyBodyRadius(live.e)+0.45, band*0.94);`;
one(STANDOFF2);
g = g.replace(STANDOFF2, `      /* walk to where the steering wants to SIT, not to the edge of its retreat
         band, and add the target's extra bulk so a boss is not approached to
         inside its own body */
      const ideal=(typeof STEER_CFG!=='undefined' && STEER_CFG.ideal) ? STEER_CFG.ideal : 10.0;
      const bulk=Math.max(0, enemyBodyRadius(live.e)-NORMAL_BODY);
      const stand=Math.max(enemyBodyRadius(live.e)+0.45, ideal+bulk);`);

/* 42 -- D3 RIFT RULES.
   Nephalem: no Guardian. Fill the bar, a return-to-town channel fires, and the
   next rift of the same tier opens by itself.
   Greater: keyed and timed as now, but the Guardian only spawns at 100% and is
   far harder than a rare elite.
   Research notes that shaped this: the bar is 0-100% on the RIGHT under the
   minimap; monsters give progress by toughness with an elite pack worth about
   4%; and in a Greater Rift the Guardian appears at 100% even if the timer has
   already run out. */

/* the bar's target is derived from the population actually spawned, so "about
   three quarters of the dungeon" holds on a small map and a large one alike */
const WAVE_END = `    say('[rift] authored wave: '+spawned+' enemies across '+list.length+' combat zones');`;
one(WAVE_END);
g = g.replace(WAVE_END, `    let w=0;
    for(const e of ENEMIES){ if(!e.dead) w += e.rarity==='rare'?4 : e.rarity==='magic'?2 : 1; }
    RIFT.target = Math.max(20, Math.round(w*0.75));
    RIFT.progress = 0;
    say('[rift] authored wave: '+spawned+' enemies across '+list.length+' combat zones'+
        ' — bar target '+RIFT.target+' progress points (~75% of the pack)');`);

/* progress weights: an elite pack is worth about 4% */
const PROGRESS = `  RIFT.progress += e.rarity==='rare'?3 : e.rarity==='magic'?2 : 1;
  if(RIFT.progress>=RIFT.target){ spawnRiftBoss(); return; }`;
one(PROGRESS);
g = g.replace(PROGRESS, `  RIFT.progress += e.rarity==='rare'?4 : e.rarity==='magic'?2 : 1;
  if(RIFT.progress>=RIFT.target){
    /* A NEPHALEM RIFT HAS NO GUARDIAN — filling the bar ends the run. Only a
       Greater Rift gets a boss, and it appears at 100% even if time is up. */
    if(GR.active) spawnRiftBoss(); else riftFilled();
    return;
  }`);

/* the Greater Rift Guardian is a different animal from a rare elite */
const BOSS_BUFF = `  b.maxHp*=RIFT_CFG.bossHpMult; b.hp=b.maxHp;
  b.dmg*=1.6; b.g.scale.multiplyScalar(1.8);`;
one(BOSS_BUFF);
g = g.replace(BOSS_BUFF, `  b.maxHp*=RIFT_CFG.bossHpMult; b.dmg*=1.6;
  if(GR.active){ b.maxHp*=2.5; b.dmg*=1.4; b.isGuardian=true; }
  b.hp=b.maxHp;
  b.g.scale.multiplyScalar(GR.active?2.1:1.8);`);

const BOSS_TOAST = `  toastRift('The Rift boss has appeared.');`;
one(BOSS_TOAST);
g = g.replace(BOSS_TOAST, `  toastRift(GR.active ? 'The Rift Guardian has appeared.' : 'The Rift boss has appeared.');`);

/* 43 -- the fill -> channel -> town -> next rift loop */
const UNSEAL = `function riftUnsealExit(){`;
one(UNSEAL);
g = g.replace(UNSEAL, `/* Bar full on a Nephalem Rift: channel out, then open the next one at the same
   tier. The channel is a real 3s window, not an instant cut, so it reads as a
   teleport rather than a screen swap. Auto-restart follows the Repeat toggle so
   the loop can be stopped. */
function riftFilled(){
  if(RIFT.filling) return;
  RIFT.filling=true;
  RIFT.progress=RIFT.target;
  const tier=RIFT.tier, again=!!RIFT.repeat;
  toastRift('Rift complete — returning to town');
  riftChannel(3.0, ()=>{
    RIFT.filling=false;
    exitToTown('Rift complete.');
    if(again) setTimeout(()=>{ try{ enterRift(tier, true); }catch(e){} }, 1400);
  });
}
window.riftFilled=riftFilled;

/* a visible channel: ring under the hero plus a countdown bar */
function riftChannel(secs, done){
  const el=document.createElement('div');
  el.id='riftChannel';
  el.style.cssText='position:fixed;left:50%;bottom:22vh;transform:translateX(-50%);z-index:62;'+
    'width:280px;text-align:center;font:11px "Trebuchet MS",sans-serif;letter-spacing:.22em;'+
    'color:#cfc0a0;text-transform:uppercase';
  el.innerHTML='<div style="margin-bottom:6px">Returning to town</div>'+
    '<div style="height:6px;background:rgba(0,0,0,.65);border:1px solid #4a4335">'+
    '<i id="riftChannelFill" style="display:block;height:100%;width:0%;'+
    'background:linear-gradient(90deg,#3b6ea8,#9fd8ff)"></i></div>';
  document.body.appendChild(el);
  const fill=el.querySelector('#riftChannelFill');
  const t0=performance.now();
  const step=()=>{
    const t=(performance.now()-t0)/1000;
    fill.style.width=Math.min(100,(t/secs)*100)+'%';
    if(t<secs){ requestAnimationFrame(step); }
    else { el.remove(); if(done) done(); }
  };
  requestAnimationFrame(step);
}
window.riftChannel=riftChannel;

function riftUnsealExit(){`);

/* 44 -- THE BAR MOVES RIGHT, gets a percentage in the middle, and takes the
        Greater Rift's purple treatment plus a timer. Matches his reference
        shots and the D3 placement (right side, under where a minimap sits). */
const BAR_CSS = `riftBar.style.cssText='position:fixed;left:50%;top:16px;transform:translateX(-50%);z-index:59;'+
  'display:none;width:min(560px,60vw);font:11px "Trebuchet MS",sans-serif;color:#b9ae95;text-align:center';
riftBar.innerHTML='<div id="riftLabel" style="letter-spacing:.22em;margin-bottom:5px"></div>'+
  '<div style="height:6px;background:rgba(0,0,0,.6);border:1px solid #4a4335">'+
  '<i id="riftFill" style="display:block;height:100%;width:0%;background:linear-gradient(90deg,#8a6a24,#e8c877)"></i></div>';`;
one(BAR_CSS);
g = g.replace(BAR_CSS, `riftBar.style.cssText='position:fixed;right:18px;top:18px;z-index:59;'+
  'display:none;width:min(330px,30vw);font:11px "Trebuchet MS",sans-serif;color:#b9ae95;text-align:center';
riftBar.innerHTML=
  '<div id="riftLabel" style="letter-spacing:.20em;margin-bottom:5px;text-align:right;'+
    'text-shadow:0 1px 3px #000"></div>'+
  /* ornate frame: outer bevel, inner well, fill, and the % floating on top */
  '<div id="riftFrame" style="position:relative;height:24px;border:1px solid #6b5a33;'+
    'border-radius:3px;background:linear-gradient(180deg,#241f18,#14110c);'+
    'box-shadow:0 2px 10px rgba(0,0,0,.6), inset 0 0 0 1px rgba(0,0,0,.7)">'+
    '<div style="position:absolute;inset:3px;background:#0a0908;border:1px solid #000;overflow:hidden">'+
      '<i id="riftFill" style="display:block;height:100%;width:0%;'+
        'background:linear-gradient(180deg,#f0d488,#c8912e 55%,#7d5714);'+
        'box-shadow:0 0 10px rgba(232,200,119,.35);transition:width .18s linear"></i>'+
    '</div>'+
    '<span id="riftPct" style="position:absolute;inset:0;display:flex;align-items:center;'+
      'justify-content:center;font:600 12px \\'Trebuchet MS\\',sans-serif;letter-spacing:.06em;'+
      'color:#fff;text-shadow:0 1px 3px #000,0 0 6px #000">0%</span>'+
    '<span id="riftClock" style="position:absolute;right:-2px;top:26px;font:10px \\'Trebuchet MS\\',sans-serif;'+
      'letter-spacing:.14em;color:#b9ae95;text-shadow:0 1px 3px #000"></span>'+
  '</div>';`);

const HUD_FN = `function updateRiftHud(){
  if(!RIFT.active) return;
  riftTopUp();
  const pct=RIFT.bossSpawned?100:Math.min(100, RIFT.progress/RIFT.target*100);
  document.getElementById('riftFill').style.width=pct+'%';
  const mm=Math.floor(GR.timeLeft/60), ss=Math.floor(GR.timeLeft%60);
  document.getElementById('riftLabel').textContent =
    (GR.active? 'GREATER RIFT '+GR.tier+'   ·   '+mm+':'+String(ss).padStart(2,'0')
              : 'RIFT TIER '+RIFT.tier+'   ·   area level '+RIFT_CFG.areaLevel(RIFT.tier))+
    (RIFT.bossSpawned?'   ·   BOSS':'   ·   '+Math.min(RIFT.progress,RIFT.target)+' / '+RIFT.target)+
    (RIFT.repeat?'   ·   REPEAT ON':'');
}`;
one(HUD_FN);
g = g.replace(HUD_FN, `function updateRiftHud(){
  if(!RIFT.active) return;
  riftTopUp();
  const pct=RIFT.bossSpawned?100:Math.min(100, RIFT.progress/RIFT.target*100);
  const fill=document.getElementById('riftFill');
  const pctEl=document.getElementById('riftPct');
  const clock=document.getElementById('riftClock');
  fill.style.width=pct+'%';
  /* purple for a Greater Rift, gold for a Nephalem — his two reference bars */
  fill.style.background = GR.active
    ? 'linear-gradient(180deg,#c9a6ff,#7a3fd6 55%,#3f1d78)'
    : 'linear-gradient(180deg,#f0d488,#c8912e 55%,#7d5714)';
  fill.style.boxShadow = GR.active
    ? '0 0 10px rgba(150,90,240,.45)' : '0 0 10px rgba(232,200,119,.35)';
  document.getElementById('riftFrame').style.borderColor = GR.active ? '#6a4a9a' : '#6b5a33';
  pctEl.textContent = RIFT.bossSpawned ? (GR.active?'GUARDIAN':'BOSS') : pct.toFixed(1)+'%';
  if(GR.active){
    const mm=Math.floor(Math.max(0,GR.timeLeft)/60), ss=Math.floor(Math.max(0,GR.timeLeft)%60);
    clock.textContent='\\u23F3 '+mm+':'+String(ss).padStart(2,'0');
    clock.style.color = GR.timeLeft<60 ? '#e08a6a' : '#b9ae95';
  } else clock.textContent='';
  document.getElementById('riftLabel').textContent =
    (GR.active ? 'GREATER RIFT '+GR.tier
               : 'NEPHALEM RIFT '+RIFT.tier+'  ·  area '+RIFT_CFG.areaLevel(RIFT.tier))+
    (RIFT.repeat && !GR.active ? '  ·  REPEAT' : '');
}`);

/* 45 -- TIME BASE MISMATCH. The node hard-timeout is measured in REAL seconds
        (performance.now) while movement integrates a CAPPED dt (min .05). Any
        time the frame rate dips, real time runs ahead of simulated time, so
        Auto abandons a node it was making perfectly good progress toward,
        recomputes, and does it again — which looks exactly like stuttering on
        the spot. Both sides now measure in the same clock. */
const NODE_TIMEOUT = `  if(AUTO.node && AUTO.nodeSince && (now-AUTO.nodeSince)>(AUTO.crossing?22:12)){`;
one(NODE_TIMEOUT);
g = g.replace(NODE_TIMEOUT, `  AUTO.nodeAge = (AUTO.nodeAge||0) + dt;                 // simulated, like movement
  if(AUTO.node && AUTO.nodeAge>(AUTO.crossing?22:12)){`);

const NODE_RESET = `  AUTO.node=nd;
  AUTO.nodeSince=performance.now()/1000;`;
one(NODE_RESET);
g = g.replace(NODE_RESET, `  AUTO.node=nd;
  AUTO.nodeSince=performance.now()/1000;
  AUTO.nodeAge=0;                       // simulated-time twin of nodeSince`);

/* 46 -- STUTTER DETECTION, so an F8 taken during one answers it outright.
        Rolling ~4s of travel: if he covers real distance but ends up where he
        started, he is oscillating, not walking. */
const STUCK_HEAD = `  const moved=Math.hypot(P.x-AUTO.lastPos.x, P.z-AUTO.lastPos.z);`;
one(STUCK_HEAD);
g = g.replace(STUCK_HEAD, `  const moved=Math.hypot(P.x-AUTO.lastPos.x, P.z-AUTO.lastPos.z);
  /* rolling travel window: path length vs net displacement */
  AUTO.win = AUTO.win || [];
  AUTO.winT = (AUTO.winT||0) + dt;
  if(AUTO.winT > 0.25){
    AUTO.winT = 0;
    AUTO.win.push([P.x, P.z]);
    if(AUTO.win.length > 16) AUTO.win.shift();      // ~4 s
    if(AUTO.win.length > 4){
      let path=0;
      for(let i=1;i<AUTO.win.length;i++)
        path += Math.hypot(AUTO.win[i][0]-AUTO.win[i-1][0], AUTO.win[i][1]-AUTO.win[i-1][1]);
      const net = Math.hypot(AUTO.win[AUTO.win.length-1][0]-AUTO.win[0][0],
                             AUTO.win[AUTO.win.length-1][1]-AUTO.win[0][1]);
      AUTO.stats.pathLen = +path.toFixed(1);
      AUTO.stats.netMove = +net.toFixed(1);
      AUTO.stats.efficiency = path>0.5 ? +(net/path).toFixed(2) : 1;
    }
  }`);

/* surface it in the report and in the scan */
const STATUS_STATS = `      L.push('  stats stuck='+AUTO.stats.stuck+' retarget='+AUTO.stats.retarget+' transitions='+AUTO.stats.transitions);`;
one(STATUS_STATS);
g = g.replace(STATUS_STATS, `      L.push('  stats stuck='+AUTO.stats.stuck+' retarget='+AUTO.stats.retarget+' transitions='+AUTO.stats.transitions);
      if(AUTO.stats.efficiency!==undefined)
        L.push('  travel last 4s: path '+AUTO.stats.pathLen+'m  net '+AUTO.stats.netMove+
               'm  efficiency '+AUTO.stats.efficiency+(AUTO.stats.efficiency<0.3?'  <-- OSCILLATING':''));
      L.push('  node age (simulated) '+n(AUTO.nodeAge||0)+'s');`);

const SCAN_ADD = `    if(window.AUTO && AUTO.on && ENEMIES.length && !AUTO.node && AUTO.state!=='EXIT')
      bad.push('Auto has no node while enemies are alive');`;
one(SCAN_ADD);
g = g.replace(SCAN_ADD, `    if(window.AUTO && AUTO.on && ENEMIES.length && !AUTO.node && AUTO.state!=='EXIT')
      bad.push('Auto has no node while enemies are alive');
    if(window.AUTO && AUTO.stats.efficiency!==undefined && AUTO.stats.efficiency<0.3 && AUTO.stats.pathLen>1.5)
      bad.push('Auto is oscillating: '+AUTO.stats.pathLen+'m walked, only '+AUTO.stats.netMove+
               'm of progress in the last 4s (state '+AUTO.state+', why "'+(AUTO.nodeWhy||'')+'")');
    if(window.AUTO && (AUTO.nodeAge||0) > 10)
      bad.push('Auto has been chasing the same node for '+n(AUTO.nodeAge)+'s');`);

/* 47 -- HIS HYPOTHESIS, TESTED: is Auto changing its mind too fast?
   Travel only re-decides when AUTO.node is null, so it is gated -- EXCEPT that
   the engage branch rebuilds the approach path from the target's CURRENT
   position every time it runs. Against a mob walking toward him the approach
   point walks toward him too: he arrives, the node clears, the point is
   recomputed half a metre away, he arrives again. A tight arrive/re-path loop
   with no commitment, which is stutter-in-place with no combat target set --
   exactly the NEXT_ROOM/-/N signature the trace showed.
   `AUTO.stats.pathSet` counts re-paths so this is measurable, and
   AUTO_CFG.approachCommit gates the fix so both can be measured. */
const PATH_FN = `function autoSetPath(dest, why){
  if(!dest) return;`;
one(PATH_FN);
g = g.replace(PATH_FN, `function autoSetPath(dest, why){
  if(!dest) return;
  AUTO.stats.pathSet=(AUTO.stats.pathSet||0)+1;`);

const APPROACH_ISSUE = `      AUTO.state='TRAVEL';
      autoSetPath({x:ax,z:az,kind:'approach'},'approach');
      return;`;
one(APPROACH_ISSUE);
g = g.replace(APPROACH_ISSUE, `      AUTO.state='TRAVEL';
      /* COMMIT to an approach. Re-pathing at a moving mob every time the node
         clears is what makes him shuffle on the spot. Keep the previous
         destination until the mob has actually gone somewhere else. */
      const commit = (AUTO_CFG.approachCommit!==false);
      if(commit && AUTO.approachFor===live.e && AUTO.approachAt){
        const drift=Math.hypot(live.x-AUTO.approachSrc.x, live.z-AUTO.approachSrc.z);
        if(drift < (AUTO_CFG.approachDrift||2.5)){
          if(!AUTO.node) autoSetNode(AUTO.approachAt,'approach-hold');
          return;
        }
      }
      AUTO.approachFor=live.e;
      AUTO.approachSrc={x:live.x, z:live.z};
      AUTO.approachAt={x:ax, z:az, kind:'approach'};
      autoSetPath(AUTO.approachAt,'approach');
      return;`);

const CFG_ADD = `  stuckDistance:0.55,
  maxRetries:3,`;
one(CFG_ADD);
g = g.replace(CFG_ADD, `  stuckDistance:0.55,
  approachCommit:true,    // hold an approach destination instead of re-pathing at a moving mob
  approachDrift:2.5,      // metres the mob must move before the approach is recomputed
  maxRetries:3,`);

/* surface the churn in F8 */
const STATS_LINE = `      L.push('  stats stuck='+AUTO.stats.stuck+' retarget='+AUTO.stats.retarget+' transitions='+AUTO.stats.transitions);`;
one(STATS_LINE);
g = g.replace(STATS_LINE, `      L.push('  stats stuck='+AUTO.stats.stuck+' retarget='+AUTO.stats.retarget+
             ' transitions='+AUTO.stats.transitions+' repaths='+(AUTO.stats.pathSet||0));`);

/* 48 -- the travel window has to be cleared on a teleport, or entering a rift
        writes a 150m jump into it and the efficiency reading is meaningless. */
const WARP_CLEAR = `  window.__camWarp=true;                 // snap, do not pan, across a teleport`;
one(WARP_CLEAR);
g = g.replace(WARP_CLEAR, `  window.__camWarp=true;                 // snap, do not pan, across a teleport
  if(window.AUTO){ AUTO.win=[]; AUTO.stats.pathSet=0;
    AUTO.stats.efficiency=undefined; AUTO.stats.pathLen=0; AUTO.stats.netMove=0; }`);

/* 49 -- WHY EVERY DUNGEON LOOKED THE SAME. Two causes, both outside the theme
   data I had been tuning:
   (a) `applyDungeonLighting` applies fog DENSITY but never fog COLOUR, and the
       far-field fog tone is the single most dominant colour on screen. Every
       complex was rendering through the town's fog.
   (b) The town's own light rig (ambient, hemisphere, moon, fill, pool) is
       parented to the scene, not to townRoot. Hiding townRoot hides its meshes
       but leaves its LIGHTS burning, so every dungeon preset was being mixed
       under a constant town wash. Muted for the duration of a Rift and
       restored on the way out. */
const LIGHT_SAVE = `  if(!RIFT.prevLook){
    RIFT.prevLook={ exposure:renderer.toneMappingExposure,
                    fog:scene.fog?scene.fog.density:null };
  }`;
one(LIGHT_SAVE);
g = g.replace(LIGHT_SAVE, `  if(!RIFT.prevLook){
    RIFT.prevLook={ exposure:renderer.toneMappingExposure,
                    fog:scene.fog?scene.fog.density:null,
                    fogColor:scene.fog?scene.fog.color.getHex():null,
                    bg:(scene.background&&scene.background.isColor)?scene.background.getHex():null,
                    town:[] };
    for(const nm of ['ambient','hemi','moon','townFill','townPool']){
      let l=null; try{ l=eval(nm); }catch(e){}
      if(l && l.isLight) RIFT.prevLook.town.push([l, l.intensity]);
    }
  }
  /* the town rig would otherwise wash out every preset equally */
  for(const e of RIFT.prevLook.town) e[0].intensity=0;
  if(L.fogColor!==undefined && scene.fog){
    scene.fog.color.setHex(L.fogColor);
    if(scene.background && scene.background.isColor) scene.background.setHex(L.fogColor);
  }`);

const LIGHT_RESTORE = `function restoreWorldLook(){
  if(!RIFT.prevLook) return;
  renderer.toneMappingExposure=RIFT.prevLook.exposure;
  if(scene.fog && RIFT.prevLook.fog!==null) scene.fog.density=RIFT.prevLook.fog;
  RIFT.prevLook=null;
}`;
one(LIGHT_RESTORE);
g = g.replace(LIGHT_RESTORE, `function restoreWorldLook(){
  if(!RIFT.prevLook) return;
  renderer.toneMappingExposure=RIFT.prevLook.exposure;
  if(scene.fog && RIFT.prevLook.fog!==null) scene.fog.density=RIFT.prevLook.fog;
  if(scene.fog && RIFT.prevLook.fogColor!==null) scene.fog.color.setHex(RIFT.prevLook.fogColor);
  if(scene.background && scene.background.isColor && RIFT.prevLook.bg!==null)
    scene.background.setHex(RIFT.prevLook.bg);
  for(const e of (RIFT.prevLook.town||[])) e[0].intensity=e[1];   // give the town its light back
  RIFT.prevLook=null;
}`);

/* 50 -- THE PANIC. STEER_CFG.strongRetreat is 7.0m, so a melee skeleton walking
   at him is ALWAYS inside the retreat band: he sprints away from one harmless
   mob forever, and when a wall stops him he shuffles in place. His read was
   right. A single attacker is now something you stand and fight; full retreat
   is reserved for real pressure — a crowd inside the band, or low health. */
const RADIAL = `  else radial=-1.0;`;
one(RADIAL);
g = g.replace(RADIAL, `  else {
    /* how much pressure is actually on him? */
    let crowd=0;
    for(let i=0;i<ENEMIES.length;i++){
      const e=ENEMIES[i];
      if(e.dead) continue;
      const ed=Math.hypot(e.g.position.x-P.x, e.g.position.z-P.z);
      if(combatDist(e, ed) < STEER_CFG.gentleRetreat) crowd++;
    }
    const hurt = (typeof COMBAT!=='undefined' && COMBAT.maxHp) ? (COMBAT.hp/COMBAT.maxHp < 0.45) : false;
    const cornered = MOVE.pinned > 0.9;      // shoved at a wall for ~a second
    radial = (crowd>=3 || hurt) && !cornered ? -1.0 : 0.0;   // else hold ground and shoot
  }`);

/* detect being pinned: asking to move but not moving */
const PINNED = `  const rooted=(typeof planted==='function' && planted());`;
one(PINNED);
g = g.replace(PINNED, `  /* pinned = the body is being told to move and is not moving. Retreating into
     a wall used to look identical to retreating successfully. */
  {
    const px=player.position.x, pz=player.position.z;
    const want=Math.hypot(mx,mz)>0.05;
    const got=Math.hypot(px-(MOVE.lastX!==undefined?MOVE.lastX:px), pz-(MOVE.lastZ!==undefined?MOVE.lastZ:pz));
    MOVE.pinned = (want && got < 0.004) ? (MOVE.pinned||0)+dt : 0;
    MOVE.lastX=px; MOVE.lastZ=pz;
  }
  const rooted=(typeof planted==='function' && planted());`);

/* 51 -- the rust palette reads too dark; drop it from the rotation. The theme
        stays selectable by name, it just never gets rolled. */
const THEME_ROLL = `      const th=Object.keys(DEPTHS.THEMES);`;
one(THEME_ROLL);
g = g.replace(THEME_ROLL, `      /* 'catacombs' (rust) renders too dark to play — excluded from the roll,
         still reachable via newDepths('catacombs', ...) if it gets retuned */
      const th=Object.keys(DEPTHS.THEMES).filter(k=>k!=='catacombs');`);

/* 52 -- F only works next to Veyra, and Auto banks between runs. */
const F_KEY = `  e.preventDefault();
  depositAll();
});`;
one(F_KEY);
g = g.replace(F_KEY, `  e.preventDefault();
  /* the stash lives with Veyra: depositing from anywhere made her pointless */
  if(!nearVeyra()){ toast('Stand with Veyra to bank your findings.'); return; }
  depositAll();
});

/* Is the hero standing at Veyra's station? */
/* NOTE: this lives in the UI script block, which cannot see the world module's
   'stations' or 'player' bindings -- everything goes through AH_WORLD. Reaching
   for the bare identifiers silently threw and made the gate always refuse. */
function veyraStation(){
  try{ return (AH_WORLD.stations||[]).find(s=>s.name==='Veyra')||null; }catch(e){ return null; }
}
function heroPos(){
  try{ return AH_WORLD.player.position; }catch(e){ return null; }
}
function nearVeyra(){
  const st=veyraStation(), P=heroPos();
  if(!st || !P) return false;
  try{ if(WORLD.mode!=='TOWN') return false; }catch(e){}
  return Math.hypot(st.pos.x-P.x, st.pos.z-P.z) <= ((st.r||3.6)+0.6);
}
window.nearVeyra=nearVeyra;
window.veyraStation=veyraStation;

/* BETWEEN RUNS: walk to Veyra, bank everything, then let the next rift open.
   Called on the way out of a Rift; the rift restart waits for it. */
function autoBankAtVeyra(then){
  const finish=()=>{ try{ if(then) then(); }catch(e){} };
  try{
    if(WORLD.mode!=='TOWN'){ finish(); return; }
    const st=veyraStation();
    const P=heroPos();
    if(!st || !P){ finish(); return; }
    const dx=st.pos.x-P.x, dz=st.pos.z-P.z, d=Math.hypot(dx,dz);
    const stop=Math.max(1.2,(st.r||3.6)-1.2);
    /* she is a few metres from the portal, so a straight walk is enough */
    if(d>stop){
      const t0=performance.now();
      const step=()=>{
        if(WORLD.mode!=='TOWN'){ finish(); return; }
        const p=heroPos(); if(!p){ finish(); return; }
        const ex=st.pos.x-p.x, ez=st.pos.z-p.z, ed=Math.hypot(ex,ez);
        if(ed<=stop || performance.now()-t0>6000){
          depositAll(); toast('Banked at Veyra'); setTimeout(finish, 500); return;
        }
        AH_WORLD.setMoveTarget(new THREE.Vector3(st.pos.x, 0, st.pos.z));
        requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
      return;
    }
    depositAll(); toast('Banked at Veyra'); setTimeout(finish, 500);
  }catch(e){ finish(); }
}
window.autoBankAtVeyra=autoBankAtVeyra;`);

/* the rift loop banks before it re-opens */
const RESTART = `    exitToTown('Rift complete.');
    if(again) setTimeout(()=>{ try{ enterRift(tier, true); }catch(e){} }, 1400);`;
one(RESTART);
g = g.replace(RESTART, `    exitToTown('Rift complete.');
    /* bank the run's findings with Veyra before the next portal opens */
    setTimeout(()=>{
      autoBankAtVeyra(()=>{ if(again){ try{ enterRift(tier, true); }catch(e){} } });
    }, 900);`);

/* 53 -- SKILL RANGE. Every skill inherited `pickTarget`, which accepts anything
   inside CFG.enemy.aggro (26m) with NO line-of-sight test — so Rain of Arrows
   fell on packs a room and a half away, through walls. Gated in `useSkill`,
   which is the single choke point every skill passes through, so this covers
   skills defined anywhere in the file. Ranges sit inside AUTO_CFG.bowRange's
   upper bound (13m) so Auto's own engagement band still works. */
const RANGE_TABLE = `function useSkill(id, forced, viaAuto){
  const sk=SKILLS[id]; if(!sk) return false;`;
one(RANGE_TABLE);
g = g.replace(RANGE_TABLE, `const SKILL_RANGE = {
  basic:     12.5,   // the filler shot, and the longest reach we allow
  multishot: 11.5,   // a cone, not a sniper rifle
  rapid:     12.0,   // single-target burst
  ricochet:  11.0,
  poison:    10.5,
  vengeance: 10.5,
  storm:     10.5,
  rain:       9.5,   // it falls where he can SEE, not two rooms over
  sentry:     9.0,   // he plants it near himself
  _default:  11.0
};
window.SKILL_RANGE=SKILL_RANGE;
function skillRange(id){
  const r=SKILL_RANGE[id];
  return (r!==undefined?r:SKILL_RANGE._default) * (window.SKILL_RANGE_MULT||1);
}
window.skillRange=skillRange;

function useSkill(id, forced, viaAuto){
  const sk=SKILLS[id]; if(!sk) return false;`);

const TGT_GATE = `  const tgt = (forced && !forced.dead) ? forced : pickTarget();
  if(!tgt && id!=='basic') return false;`;
one(TGT_GATE);
g = g.replace(TGT_GATE, `  const tgt = (forced && !forced.dead) ? forced : pickTarget(skillRange(id));
  if(!tgt && id!=='basic') return false;
  /* out of this skill's reach: refuse, so Auto falls through to something it
     can actually land instead of firing into the far end of the dungeon */
  if(tgt){
    const P0=player.position;
    const dT=Math.hypot(tgt.g.position.x-P0.x, tgt.g.position.z-P0.z);
    if(dT > skillRange(id)) return false;
    if(typeof clearLine==='function' &&
       !clearLine(P0.x,P0.z,tgt.g.position.x,tgt.g.position.z)) return false;   // no shots through walls
  }`);

/* pickTarget honours a range cap and line of sight */
const PICK = `function pickTarget(){
  const p=player.position;
  let best=null, bestScore=-1e9;
  for(const e of ENEMIES){
    const d=Math.hypot(e.g.position.x-p.x, e.g.position.z-p.z);
    if(d>CFG.enemy.aggro) continue;`;
one(PICK);
g = g.replace(PICK, `function pickTarget(maxRange){
  const p=player.position;
  const cap=Math.min(CFG.enemy.aggro, maxRange!==undefined?maxRange:12.5);
  let best=null, bestScore=-1e9;
  for(const e of ENEMIES){
    if(e.dead) continue;
    const d=Math.hypot(e.g.position.x-p.x, e.g.position.z-p.z);
    if(d>cap) continue;
    if(typeof clearLine==='function' && !clearLine(p.x,p.z,e.g.position.x,e.g.position.z)) continue;`);

/* 54 -- READABILITY PASS. The whole design rests on one fact: every skeleton in
   the dungeon already shares THREE materials and TWO geometries. So a rim term
   injected into those materials costs the same at 3 enemies as at 300, and
   ground rings and health bars are one InstancedMesh each. Nothing here scales
   with enemy count except a handful of matrix writes.
   Budget: +4 draw calls total (enemy rings, hp backplate, hp fill, player ring)
   and ONE non-shadow-casting player light. No per-enemy lights, no outline
   pass, no extra post-processing, no DOM. */
const ACTORS_ANCHOR = `window.collide=(x,z)=>collide(x,z);`;
one(ACTORS_ANCHOR);
g = g.replace(ACTORS_ANCHOR, `window.collide=(x,z)=>collide(x,z);

/* ---------- rim light, injected into materials that already exist ---------- */
function addRim(mat, colour, strength, power){
  if(!mat || mat.userData.__rim) return mat;
  mat.userData.__rim=true;
  mat.onBeforeCompile=(sh)=>{
    sh.uniforms.uRimCol={value:new THREE.Color(colour)};
    sh.uniforms.uRimStr={value:strength};
    sh.uniforms.uRimPow={value:power};
    sh.vertexShader=sh.vertexShader
      .replace('#include <common>', '#include <common>\\nvarying vec3 vRimN;\\nvarying vec3 vRimV;')
      .replace('#include <project_vertex>',
               '#include <project_vertex>\\n vRimN = normalize(normalMatrix * objectNormal);\\n vRimV = normalize(-mvPosition.xyz);');
    sh.fragmentShader=sh.fragmentShader
      .replace('#include <common>', '#include <common>\\nvarying vec3 vRimN;\\nvarying vec3 vRimV;\\nuniform vec3 uRimCol;\\nuniform float uRimStr;\\nuniform float uRimPow;')
      .replace('#include <dithering_fragment>',
               '#include <dithering_fragment>\\n float rimF = 1.0 - max(dot(normalize(vRimN), normalize(vRimV)), 0.0);\\n gl_FragColor.rgb += uRimCol * pow(rimF, uRimPow) * uRimStr;');
    mat.userData.__sh=sh;
  };
  mat.needsUpdate=true;
  return mat;
}
window.addRim=addRim;

const ACTORS = {
  ready:false, cap:320,
  ring:null, hpBack:null, hpFill:null, playerRing:null, playerLight:null,
  hot:{}, dummy:null, col:null, hover:null
};

/* health bars: two InstancedMeshes, billboarded in the vertex shader so the CPU
   only ever writes a matrix. The fill's pivot is its LEFT edge, so shrinking it
   on X drains the bar without rebuilding anything. */
const HP_VERT = \`
uniform float uH;
attribute float aFill;
varying float vFill;
varying vec2 vUv2;
void main(){
  vUv2 = uv; vFill = aFill;
  vec4 c = modelMatrix * instanceMatrix * vec4(0.0,0.0,0.0,1.0);
  float w = length(vec3(instanceMatrix[0][0],instanceMatrix[0][1],instanceMatrix[0][2]));
  vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
  vec3 up    = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
  vec3 p = c.xyz + right*(position.x*w) + up*(position.y*uH);
  gl_Position = projectionMatrix * viewMatrix * vec4(p,1.0);
}\`;
const HP_FRAG = \`
uniform vec3 uCol;
uniform float uAlpha;
varying float vFill;
varying vec2 vUv2;
void main(){
  if(vUv2.x > vFill) discard;          // the fill drains left to right
  gl_FragColor = vec4(uCol, uAlpha);
}\`;

function actorsInit(){
  if(ACTORS.ready) return;
  const W=window.AH_WORLD; if(!W || !W.scene) return;
  ACTORS.dummy=new THREE.Object3D();
  ACTORS.col=new THREE.Color();

  /* --- ground rings: one flat RingGeometry, instanced, tinted per state --- */
  const ringGeo=new THREE.RingGeometry(0.42,0.52,20);
  ringGeo.rotateX(-Math.PI/2);
  const ringMat=new THREE.MeshBasicMaterial({ color:0xffffff, transparent:true, opacity:0.34,
    depthWrite:false, blending:THREE.AdditiveBlending, toneMapped:false });
  ACTORS.ring=new THREE.InstancedMesh(ringGeo, ringMat, ACTORS.cap);
  ACTORS.ring.instanceColor=new THREE.InstancedBufferAttribute(new Float32Array(ACTORS.cap*3).fill(1),3);
  ACTORS.ring.frustumCulled=false; ACTORS.ring.renderOrder=3; ACTORS.ring.count=0;
  W.scene.add(ACTORS.ring);

  /* --- health bars --- */
  const mkBar=(col,alpha,h,order)=>{
    const gq=new THREE.PlaneGeometry(1,1);
    const fill=new Float32Array(ACTORS.cap).fill(1);
    gq.setAttribute('aFill', new THREE.InstancedBufferAttribute(fill,1));
    const m=new THREE.ShaderMaterial({
      uniforms:{ uCol:{value:new THREE.Color(col)}, uAlpha:{value:alpha}, uH:{value:h} },
      vertexShader:HP_VERT, fragmentShader:HP_FRAG,
      transparent:true, depthWrite:false, depthTest:false });
    const im=new THREE.InstancedMesh(gq,m,ACTORS.cap);
    im.frustumCulled=false; im.renderOrder=order; im.count=0;
    W.scene.add(im); return im;
  };
  ACTORS.hpBack=mkBar(0x0a0708,0.78,0.16,8);
  ACTORS.hpFill=mkBar(0xc0453a,0.95,0.12,9);

  /* --- player: a thin gold ring and ONE cheap light, no shadows --- */
  const pGeo=new THREE.RingGeometry(0.40,0.47,28);
  pGeo.rotateX(-Math.PI/2);
  ACTORS.playerRing=new THREE.Mesh(pGeo, new THREE.MeshBasicMaterial({
    color:0xc79a4a, transparent:true, opacity:0.55, depthWrite:false,
    blending:THREE.AdditiveBlending, toneMapped:false }));
  ACTORS.playerRing.renderOrder=3;
  W.scene.add(ACTORS.playerRing);

  ACTORS.playerLight=new THREE.PointLight(0xffcf96, 3.2, 7.5, 2);
  ACTORS.playerLight.castShadow=false;
  W.scene.add(ACTORS.playerLight);

  ACTORS.ready=true;
}
window.actorsInit=actorsInit;

/* rim colours: gold for the hero, muted crimson for everything hostile */
function actorsSkinMaterials(){
  try{
    if(window.DEPTHS && DEPTHS.skeletonMaterial){
      for(const r of ['normal','magic','rare']) addRim(DEPTHS.skeletonMaterial(r), 0x7a2418, 0.30, 2.6);
    }
  }catch(e){}
  try{
    const h=AH_WORLD.player;
    if(h && !h.userData.__rimmed){
      h.traverse(o=>{ if(o.isMesh && o.material){
        const list=Array.isArray(o.material)?o.material:[o.material];
        list.forEach(m=>{ addRim(m, 0xc79a4a, 0.34, 2.4);
          if(m.emissive){ m.emissive.setHex(0x2a1d0c); m.emissiveIntensity=0.35; } });
      }});
      h.userData.__rimmed=true;
    }
  }catch(e){}
}

const _av=new THREE.Vector3();
function actorsTick(dt){
  if(!ACTORS.ready){ actorsInit(); if(!ACTORS.ready) return; }
  actorsSkinMaterials();
  const W=window.AH_WORLD;
  const P=W&&W.player?W.player.position:null;
  const inRift = (typeof RIFT!=='undefined') && RIFT.active;

  /* player marker */
  if(P){
    ACTORS.playerRing.visible=true;
    ACTORS.playerRing.position.set(P.x, 0.05, P.z);
    ACTORS.playerLight.position.set(P.x, 1.5, P.z);
    ACTORS.playerLight.visible=inRift;
  } else { ACTORS.playerRing.visible=false; ACTORS.playerLight.visible=false; }

  if(!inRift || typeof ENEMIES==='undefined'){
    ACTORS.ring.count=0; ACTORS.hpBack.count=0; ACTORS.hpFill.count=0;
    ACTORS.ring.instanceMatrix.needsUpdate=true; return;
  }

  const d=ACTORS.dummy, c=ACTORS.col;
  const tgt=(window.AUTO&&AUTO.target)||null;
  const hov=ACTORS.hover;
  let ri=0, hi=0;
  const fillA=ACTORS.hpFill.geometry.getAttribute('aFill');
  for(let i=0;i<ENEMIES.length && ri<ACTORS.cap;i++){
    const e=ENEMIES[i];
    if(e.dead || !e.g) continue;
    const sc=e.g.scale.x||1;
    const ex=e.g.position.x, ez=e.g.position.z;
    if(P && (ex-P.x)*(ex-P.x)+(ez-P.z)*(ez-P.z) > 3600) continue;   // 60 m cull

    /* ring — subtle by default, brighter when the enemy actually matters */
    const active = (e===tgt) || (e===hov) || !!e.atk || (e.hp<e.maxHp);
    d.position.set(ex, 0.045, ez);
    d.rotation.set(0,0,0);
    d.scale.setScalar(sc*(e.isBoss?2.2:1.0));
    d.updateMatrix();
    ACTORS.ring.setMatrixAt(ri, d.matrix);
    const k = (e===tgt) ? 1.0 : (e===hov ? 0.8 : (active ? 0.5 : 0.26));
    c.setRGB(0.62*k, 0.14*k, 0.09*k);
    ACTORS.ring.setColorAt(ri, c);
    ri++;

    /* health bar only once it means something, exactly as before */
    if(e.hp < e.maxHp && hi<ACTORS.cap){
      const w=0.95*(e.isBoss?1.7:1.0);
      d.position.set(ex, e.g.position.y + 2.05*sc, ez);
      d.scale.set(w,1,1);
      d.updateMatrix();
      ACTORS.hpBack.setMatrixAt(hi, d.matrix);
      ACTORS.hpFill.setMatrixAt(hi, d.matrix);
      fillA.array[hi]=Math.max(0, Math.min(1, e.hp/e.maxHp));
      hi++;
    }
  }
  ACTORS.ring.count=ri;
  ACTORS.ring.instanceMatrix.needsUpdate=true;
  if(ACTORS.ring.instanceColor) ACTORS.ring.instanceColor.needsUpdate=true;
  ACTORS.hpBack.count=hi; ACTORS.hpFill.count=hi;
  ACTORS.hpBack.instanceMatrix.needsUpdate=true;
  ACTORS.hpFill.instanceMatrix.needsUpdate=true;
  fillA.needsUpdate=true;
}
window.actorsTick=actorsTick;
window.ACTORS=ACTORS;`);

/* drive it from the frame hook that already exists */
const TICK_HOOK = `  window.tickCorpses && window.tickCorpses(dt);`;
one(TICK_HOOK);
g = g.replace(TICK_HOOK, `  window.tickCorpses && window.tickCorpses(dt);
  window.actorsTick && window.actorsTick(dt);`);

/* the DOM health bars are replaced by the instanced ones */
const DOM_BAR = `    /* health bar only while it matters */
    if(e.hp < e.maxHp){
      const b=barFor(e);`;
one(DOM_BAR);
g = g.replace(DOM_BAR, `    /* health bars are instanced now (see actorsTick); the DOM path stays for
       reference but is switched off — one div per mob does not survive 300 */
    if(false && e.hp < e.maxHp){
      const b=barFor(e);`);

/* 55 -- CLOSING THE GAPS AGAINST HIS ANNOTATED SHEET.
   v83 gave every enemy the SAME rim because they share three materials, so
   "hovered = stronger rim" and "targeted = strongest rim" could not happen.
   Fix: keep the shared material for the crowd, and swap the one or two enemies
   that are hovered/targeted onto a HOT clone with a stronger rim. Two enemies
   at a time means +1-2 draw calls, not +50.
   Also per the sheet: health bars on every enemy (not only damaged ones),
   enemies read brighter than the environment, and hover is finally wired. */
const HOT_ANCHOR = `const _av=new THREE.Vector3();`;
one(HOT_ANCHOR);
g = g.replace(HOT_ANCHOR, `/* one hot clone per rarity, built lazily; shares every map with the base */
function hotMaterial(rarity){
  if(ACTORS.hot[rarity]) return ACTORS.hot[rarity];
  let base=null;
  try{ base=DEPTHS.skeletonMaterial(rarity); }catch(e){}
  if(!base) return null;
  const m=base.clone();
  m.userData={};                       // clear the base's rim flag so we can re-inject
  addRim(m, 0x8f2718, 0.62, 2.0);      // "strongest rim light", held at ~65%
  m.emissive=new THREE.Color(0x220a05); m.emissiveIntensity=0.34;
  ACTORS.hot[rarity]=m;
  return m;
}
function setEnemyHot(e, hot){
  if(!e || !e.g || e.__hot===hot) return;
  const sk=e.g.userData.skel; if(!sk) return;
  const mat = hot ? hotMaterial(e.rarity||'normal') : null;
  const base = (()=>{ try{ return DEPTHS.skeletonMaterial(e.rarity||'normal'); }catch(x){ return null; } })();
  const use = hot ? mat : base;
  if(!use) return;
  e.g.traverse(o=>{ if(o.isMesh) o.material=use; });
  e.__hot=hot;
}
window.setEnemyHot=setEnemyHot;

/* HOVER, done in screen space: project each nearby enemy and take the closest
   to the cursor. No raycasting, no BVH — about 50 projections at 12 Hz. */
const _hv=new THREE.Vector3();
let _hoverT=0, _mouseX=-1, _mouseY=-1;
addEventListener('pointermove', e=>{ _mouseX=e.clientX; _mouseY=e.clientY; });
function updateHover(dt){
  _hoverT-=dt;
  if(_hoverT>0) return;
  _hoverT=1/12;
  if(_mouseX<0 || typeof ENEMIES==='undefined' || !RIFT.active){ ACTORS.hover=null; return; }
  const cam=AH_WORLD.camera;
  let best=null, bd=90*90;                 // 90 px pick radius
  for(let i=0;i<ENEMIES.length;i++){
    const e=ENEMIES[i];
    if(e.dead||!e.g) continue;
    _hv.set(e.g.position.x, e.g.position.y+1.0, e.g.position.z).project(cam);
    if(_hv.z>1) continue;
    const sx=(_hv.x*0.5+0.5)*innerWidth, sy=(-_hv.y*0.5+0.5)*innerHeight;
    const d=(sx-_mouseX)*(sx-_mouseX)+(sy-_mouseY)*(sy-_mouseY);
    if(d<bd){ bd=d; best=e; }
  }
  ACTORS.hover=best;
}

const _av=new THREE.Vector3();`);

/* health bars for everyone, per the sheet — they are instanced, so this is a
   matrix write, not a draw call */
const BAR_COND = `    if(e.hp < e.maxHp && hi<ACTORS.cap){`;
one(BAR_COND);
g = g.replace(BAR_COND, `    if(hi<ACTORS.cap){`);

/* drive hover, and apply the hot swap to only the enemies that need it */
const TICK_BODY = `  const d=ACTORS.dummy, c=ACTORS.col;
  const tgt=(window.AUTO&&AUTO.target)||null;
  const hov=ACTORS.hover;`;
one(TICK_BODY);
g = g.replace(TICK_BODY, `  updateHover(dt);
  const d=ACTORS.dummy, c=ACTORS.col;
  const tgt=(window.AUTO&&AUTO.target)||null;
  const hov=ACTORS.hover;
  /* exactly the enemies that are hovered or targeted wear the hot material */
  if(ACTORS.lastHot && ACTORS.lastHot!==tgt && ACTORS.lastHot!==hov) setEnemyHot(ACTORS.lastHot,false);
  if(ACTORS.lastHov && ACTORS.lastHov!==tgt && ACTORS.lastHov!==hov) setEnemyHot(ACTORS.lastHov,false);
  if(tgt) setEnemyHot(tgt,true);
  if(hov) setEnemyHot(hov,true);
  ACTORS.lastHot=tgt; ACTORS.lastHov=hov;`);

/* 56 -- ENEMIES AGGROED THROUGH WALLS, AND AUTO WAITED TO SHOOT THROUGH ONE.
   His screenshot: four skeletons lined up against the far side of a wall
   pathing at him, while he stood still doing nothing. Two halves of the same
   bug.
   (a) Enemy aggro was `d < CFG.enemy.aggro` with NO line-of-sight test, so a
       whole room woke up through solid stone and piled against the wall.
   (b) v82 correctly stopped `useSkill` firing through walls, and v37's engage
       fallback picks any enemy inside combatRadius WITHOUT a sight test — so
       Auto committed to a target it could never shoot and simply waited. That
       is the freezing we have been chasing.
   Waking is sticky for a few seconds so a mob that loses sight mid-chase does
   not stall in the doorway, and sleeping mobs skip steering entirely, which is
   also a real saving at 200+ enemies. */
/* The aggro branch is `else if`, chained off the attack branch, so the gate has
   to go IN FRONT of the whole chain rather than inside it. */
const CHAIN_HEAD = `    if(e.atk){ enemyAttackTick(e, dt, d); poseEnemy(e, dt, false); }`;
one(CHAIN_HEAD);
g = g.replace(CHAIN_HEAD, `    /* SIGHT GATE: a mob does not know about him through a wall. Sticky for a
       few seconds so one that loses sight mid-chase does not stall in the
       doorway, and taking damage counts as knowing. Sleeping mobs skip
       steering entirely, which is also a real saving at 200+ enemies. */
    {
      /* the loop's player handle is 'player', not 'P' -- P belongs to autoTick */
      const sees = (typeof clearLine!=='function') ||
                   clearLine(e.g.position.x, e.g.position.z, player.position.x, player.position.z);
      if(sees && d < CFG.enemy.aggro) e.wake = 3.0;
      else if(e.wake>0) e.wake -= dt;
      const engaged = (e.wake>0) || e.hp < e.maxHp || e.isBoss;
      if(!engaged){ poseEnemy(e, dt, false); continue; }
    }
    if(e.atk){ enemyAttackTick(e, dt, d); poseEnemy(e, dt, false); }`);

/* Auto must not commit to something it cannot shoot */
const ENGAGE_SIGHT = `      if(navRoomAt(e.g.position.x,e.g.position.z)===cur){
        if(d<ld){ ld=d; live={x:e.g.position.x, z:e.g.position.z, e:e}; }
      } else if(d<RCOMBAT && d<nd){
        nd=d; near={x:e.g.position.x, z:e.g.position.z, e:e};
      }`;
one(ENGAGE_SIGHT);
g = g.replace(ENGAGE_SIGHT, `      /* no line of sight, no engagement -- committing to a target behind a wall
         is what left him standing still waiting to fire through it */
      if(typeof clearLine==='function' && !clearLine(P.x,P.z,e.g.position.x,e.g.position.z)) continue;
      if(navRoomAt(e.g.position.x,e.g.position.z)===cur){
        if(d<ld){ ld=d; live={x:e.g.position.x, z:e.g.position.z, e:e}; }
      } else if(d<RCOMBAT && d<nd){
        nd=d; near={x:e.g.position.x, z:e.g.position.z, e:e};
      }`);

/* report it, so a future freeze answers itself */
const SCAN_SIGHT = `    if(window.AUTO && (AUTO.nodeAge||0) > 10)`;
one(SCAN_SIGHT);
g = g.replace(SCAN_SIGHT, `    if(window.AUTO && AUTO.target && P && typeof clearLine==='function' &&
       !clearLine(P.x,P.z,AUTO.target.g.position.x,AUTO.target.g.position.z))
      bad.push('Auto is holding a target it has no line of sight to');
    if(window.AUTO && (AUTO.nodeAge||0) > 10)`);

/* 57 -- THE "IMPORTED" LANGUAGE AND THE BUILT-IN DUNGEON BOTH GO.
   Every rift is generated now, so the Straight Hall JSON, the auto-registration
   that fired 1.1s after boot, the Load/Delete controls and the "Imported: N"
   row are all dead weight. Removing the embedded JSON alone takes 43.7KB off
   the file. `importDungeon` stays as a function for debugging; it is simply not
   surfaced or called any more. */
const BUILTIN_REG = `/* register it once the importer exists, and only if it is not already there */
setTimeout(()=>{
  try{
    const have=Object.values(DUNGEONS).some(d=>d.builtin);
    if(!have) loadBuiltinDungeon();
  }catch(e){}
}, 1100);`;
one(BUILTIN_REG);
g = g.replace(BUILTIN_REG, `/* NOT auto-registered any more: every rift is a generated Depths map. Call
   loadBuiltinDungeon() by hand if an authored map is ever needed again. */`);

/* the restore-on-boot message and pass */
const RESTORE = `setTimeout(()=>{ const n=dungeonLoadSaved(); if(n) say('[dungeon] '+n+' imported dungeon(s) restored'); }, 900);`;
one(RESTORE);
g = g.replace(RESTORE, `/* nothing to restore: dungeons are generated per run, not stored */`);

/* (the Load/Delete row and Imported counter were already removed by the v77
   panel rewrite -- nothing left to strip here) */

/* the import log line */
const IMPORT_LOG = `say('[dungeon] imported "'+d.name+'" — '+d.objects.length+' objects, id '+d.id);`;
one(IMPORT_LOG);
g = g.replace(IMPORT_LOG, `say('[dungeon] loaded "'+d.name+'" — '+d.objects.length+' objects');`);

const IMPORT_TOAST = `try{ toast('Imported '+d.name+' ('+d.objects.length+' objects)'); }catch(e){}`;
one(IMPORT_TOAST);
g = g.replace(IMPORT_TOAST, `try{ toast('Loaded '+d.name); }catch(e){}`);

const IMPORT_NAME = `name:name || d.map?.name || d.name || 'Imported dungeon',`;
one(IMPORT_NAME);
g = g.replace(IMPORT_NAME, `name:name || d.map?.name || d.name || 'Authored dungeon',`);

/* 59 -- the panel already sits inside the carved frame; the .stcol block draws
        a SECOND rectangle inside it, which is the border-inside-a-border he is
        seeing. Dropped for the rift panel only, so other screens keep it. */
const PANEL_WRAP = `  body.innerHTML =
    '<div class="stcol" style="margin-bottom:12px">'+`;
one(PANEL_WRAP);
g = g.replace(PANEL_WRAP, `  body.innerHTML =
    '<div class="stcol" style="margin-bottom:12px;border:0;background:none;box-shadow:none;padding:2px 4px">'+`);

/* (the earlier step already retired every 'imported' string -- IMPORT_LOG,
   IMPORT_TOAST and IMPORT_NAME above cover the name, the log and the toast) */

fs.writeFileSync('game_v63.html', g);
console.log('v63', (g.length/1024).toFixed(0)+'KB  (was', (fs.statSync('/mnt/user-data/uploads/ashen_hollow_town_v62_authored_rift.html').size/1024).toFixed(0)+'KB)');
