// the void treatment: linear-safe colours, one plane, real teardown
const fs=require('fs'), vm=require('vm');
const {JSDOM}=require('jsdom');
const src=fs.readFileSync('work.html','utf8');
const R={};

// ---- 1. ⚠ THE v169 TRAP: are the colours in the safe LINEAR range? -----
const lin=(hex)=>[ (hex>>16&255)/255, (hex>>8&255)/255, (hex&255)/255 ];
const srgb=(c)=> c<=0.0031308 ? c*12.92 : 1.055*Math.pow(c,1/2.4)-0.055;
const m=/voidColor:\s*(0x[0-9a-f]+)/i.exec(src), m2=/voidFog:\s*(0x[0-9a-f]+)/i.exec(src);
const vc=parseInt(m[1],16), vf=parseInt(m2[1],16);
R.voidColor = { hex:'0x'+vc.toString(16).padStart(6,'0'),
  linear:lin(vc).map(v=>+v.toFixed(3)),
  displayedSRGB:lin(vc).map(v=>+srgb(v).toFixed(3)),
  maxLinear:+Math.max(...lin(vc)).toFixed(3) };
// v169's mistake: a 0.30 linear value displays near 0.58
R.v169Comparison = { theirValue:0.30, wouldDisplayAs:+srgb(0.30).toFixed(3),
                     oursMaxDisplaysAs:+Math.max(...lin(vc).map(srgb)).toFixed(3) };
R.insideSafeRange = Math.max(...lin(vc)) <= 0.08 && Math.max(...lin(vf)) <= 0.08;
R.fogDarkerThanBackdrop = Math.max(...lin(vf)) < Math.max(...lin(vc));
R.notPureBlack = Math.max(...lin(vc)) > 0.01;
R.isBlueish = lin(vc)[2] > lin(vc)[0];   // blue channel above red

// ---- 2. ONE plane, no skirts, no silhouettes ---------------------------
const ba=src.indexOf('const VOID = { plane:null };');
const bb=src.indexOf('window.buildVoidBackdrop=buildVoidBackdrop;');
const body=src.slice(ba,bb);
// ⚠ `new THREE.Mesh` also matches `new THREE.MeshBasicMaterial`. Anchor on the
// constructor call, not the prefix — the first reading said 2 planes for 1.
R.cost = { planes:(body.match(/new THREE\.Mesh\(/g)||[]).length,
           lights:(body.match(/Light\(/g)||[]).length,
           shadows:/castShadow|receiveShadow/.test(body),
           unlit:/MeshBasicMaterial/.test(body) };
// ⚠ `outskirts()` is pre-existing TOWN code and my own comment says the word
// "skirts". Test for the v169 IMPLEMENTATION, not for the string.
R.noSkirtsReturned = !/shadeDown|abyssPillar|abyssArch|MAT\.abyss|buildAbyss\b/.test(src);

// ---- 3. it builds and tears down cleanly -------------------------------
{
  let disposed=0;
  const THREE={ PlaneGeometry:function(){ this.rotateX=()=>{}; this.dispose=()=>disposed++; },
    MeshBasicMaterial:function(o){ Object.assign(this,o); this.dispose=()=>disposed++; },
    Mesh:function(g,m){ this.geometry=g; this.material=m; this.userData={};
      this.position={set(){}}; this.parent=null; } };
  const root={ children:[], add(m){ m.parent=this; this.children.push(m); },
               remove(m){ const i=this.children.indexOf(m); if(i>=0) this.children.splice(i,1); } };
  const sb={console, THREE, LOOK:{voidColor:vc, backdropY:-26}};
  sb.window=sb;
  vm.createContext(sb);
  vm.runInContext(src.slice(ba,bb)+'\nthis.B=buildVoidBackdrop; this.C=clearVoidBackdrop; this.V=VOID;',
    sb, {filename:'v.js'});
  const bounds={minX:0,maxX:100,minZ:0,maxZ:80};
  sb.B(root,bounds);
  R.build = { added:root.children.length, hasPlane:!!sb.V.plane };
  sb.B(root,bounds);                   // rebuilding must not stack
  R.rebuildDoesNotStack = root.children.length===1;
  sb.C();
  R.teardown = { left:root.children.length, disposed, planeNull:sb.V.plane===null };
  R.disposesBoth = disposed>=2;        // geometry AND material
}

// ---- 4. the vignette is DOM, not GPU -----------------------------------
const css=src.slice(src.indexOf('<style>'), src.indexOf('</style>'));
const vig=/#ahVig\{([^}]*)\}/.exec(css)[1].replace(/\s+/g,' ');
R.vignette = { isFixedOverlay:/position:fixed/.test(vig),
  pointerEventsNone:/pointer-events:none/.test(vig),
  belowUI:/z-index:1;/.test(vig),
  usesGradientNotShader:/radial-gradient/.test(vig),
  togglesByClass:/#ahVig\.on\{ opacity:1 \}/.test(css) };
// it must be ON in a rift and OFF outside
R.toggledOnRiftEntry = /if\(window\.setVignette\) setVignette\(true\)/.test(src);
R.toggledOffOnClear  = /if\(window\.setVignette\) setVignette\(false\)/.test(src);
console.log(JSON.stringify(R,null,1));
