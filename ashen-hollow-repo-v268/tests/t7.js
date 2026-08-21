const fs=require('fs'), vm=require('vm');
const src=fs.readFileSync('work.html','utf8');

function slice(a,b,name){
  const i=src.indexOf(a); if(i<0) throw new Error('miss '+name);
  const j=src.indexOf(b,i); if(j<0) throw new Error('miss end '+name);
  return src.slice(i,j+b.length);
}

// ---- fake THREE, counting every allocation --------------------------------
let texMade=0, geoMade=0, geoDisposed=0;
const THREE = {
  CanvasTexture: function(c){ texMade++; this.canvas=c; this.repeat={set(){}}; this.id=texMade;
                              this.dispose=()=>{}; },
  TorusGeometry: function(){ geoMade++; this.id='torus'+geoMade;
                             this.dispose=function(){ geoDisposed++; }; },
  CircleGeometry: function(){ geoMade++; this.id='circle'+geoMade;
                              this.dispose=function(){ geoDisposed++; }; },
  MeshBasicMaterial: function(o){ this.o=o; },
  ClampToEdgeWrapping: 'clamp', AdditiveBlending: 'add'
};

const R={};

// ============================== 1. alphaTex is a cache now =================
{
  const code = slice('const ALPHA_TEX_CACHE = new Map();', '  return t;\n}', 'alphaTex');
  const sb={THREE, console}; sb.window=sb; vm.createContext(sb);
  vm.runInContext(code+'\nthis.F=alphaTex;', sb, {filename:'alphaTex.js'});
  const canvasA={n:'flame'}, canvasB={n:'grad'};
  texMade=0;
  const t1=sb.F(canvasA), t2=sb.F(canvasA), t3=sb.F(canvasB), t4=sb.F(canvasA,4);
  R.sameCanvasSameObject = (t1===t2);
  R.differentCanvasDifferent = (t1!==t3);
  R.differentRepeatDifferent = (t1!==t4);
  // simulate 40 rifts: flames + 2 particle systems each
  for(let i=0;i<40;i++){ sb.F(canvasA); sb.F(canvasB); sb.F(canvasB); }
  R.texturesAfter40Rifts = texMade;      // must stay at the 3 distinct ones
}

// ============================== 2. the exit gate is built once =============
{
  const code = slice('const GATE_ART={};', 'return GATE_ART;\n}', 'gateArt');
  const sb={THREE, console, AH_KEEP_GEO:new Set()}; sb.window=sb; vm.createContext(sb);
  vm.runInContext(code+'\nthis.F=gateArt;', sb, {filename:'gate.js'});
  geoMade=0;
  const a=sb.F(), b=sb.F();
  for(let i=0;i<40;i++) sb.F();                 // 40 more rifts
  R.geometriesFor42Gates = geoMade;             // must be 2, not 84
  R.gateGeoStable = (a.ringGeo===b.ringGeo);
  R.gateRegisteredAsKeep = sb.AH_KEEP_GEO.size === 2;
}

// ============================== 3. ahFree ==================================
{
  const code = slice('const AH_KEEP_GEO = new Set();', 'window.ahFree=ahFree;', 'ahFree');
  const sb={console}; sb.window=sb; vm.createContext(sb);
  vm.runInContext(code+'\nthis.F=ahFree; this.KEEP=AH_KEEP_GEO;', sb, {filename:'ahFree.js'});
  const mk=(name)=>({ name, disposed:0, dispose(){ this.disposed++; } });
  const ownGeo=mk('own1'), ownGeo2=mk('own2'), sharedGeo=mk('shared'),
        spriteGeo=mk('THREE-global-sprite-geometry'), taggedGeo=mk('tagged');
  taggedGeo.userData={shared:true};
  sb.KEEP.add(sharedGeo);
  const tree={ children:[], geometry:null,
    traverse(fn){ fn(this); this.children.forEach(c=>c.traverse?c.traverse(fn):fn(c)); } };
  const node=(g,extra)=>Object.assign({ geometry:g, children:[],
    traverse(fn){ fn(this); this.children.forEach(c=>c.traverse(fn)); } }, extra||{});
  tree.children.push(node(ownGeo));
  tree.children.push(node(ownGeo2));
  tree.children.push(node(sharedGeo));                     // registered keep
  tree.children.push(node(spriteGeo, {isSprite:true}));    // the global sprite buffer
  tree.children.push(node(taggedGeo));                     // userData.shared
  const freed = sb.F(tree);
  R.freed = freed;                                  // 2
  R.ownDisposed = ownGeo.disposed + ownGeo2.disposed;      // 2
  R.sharedUntouched = sharedGeo.disposed;                  // 0
  R.spriteUntouched = spriteGeo.disposed;                  // 0  <- the important one
  R.taggedUntouched = taggedGeo.disposed;                  // 0
  R.nullSafe = sb.F(null);                                 // 0, no throw
}

console.log(JSON.stringify(R,null,1));
