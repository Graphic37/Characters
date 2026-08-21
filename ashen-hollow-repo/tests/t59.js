// the FX leak: base materials cached, clones freed, geometry shared
const fs=require('fs'), vm=require('vm');
const src=fs.readFileSync('work.html','utf8');
const R={};
const a=src.indexOf('const FX_MAT = { ring:new Map(), sprite:new Map() };');
const b=src.indexOf('/* a stretched glow that follows an arrow');
// ⚠ anchor on the NEXT function, not on a brace — fxTrail's body grew a
// multi-line fxAdd() call and the brace anchor cut the slice short.
const te=src.indexOf('function updateFX(dt){');

let geoMade=0, matMade=0, disposed=0;
const FX=[];
const THREE={
  RingGeometry:function(){ geoMade++; this.userData={}; this.dispose=()=>disposed++; },
  MeshBasicMaterial:function(o){ matMade++; Object.assign(this,o); this.userData={};
    this.clone=()=>{ const c=new THREE.MeshBasicMaterial(o); return c; };
    this.dispose=()=>disposed++; },
  SpriteMaterial:function(o){ matMade++; Object.assign(this,o); this.userData={};
    this.clone=()=>{ const c=new THREE.SpriteMaterial(o); return c; };
    this.dispose=()=>disposed++; },
  Mesh:function(g,m){ this.geometry=g; this.material=m; this.userData={};
    this.rotation={x:0}; this.position={set(){}}; this.scale={setScalar(){}, set(){}}; },
  Sprite:function(m){ this.isSprite=true; this.material=m; this.userData={};
    this.position={set(){},addScaledVector(){}}; this.scale={setScalar(){},set(){}}; },
  Group:function(){ this.children=[]; this.userData={}; this.add=(c)=>this.children.push(c);
    this.position={set(){}}; },
  Vector3:function(x,y,z){ this.x=x;this.y=y;this.z=z; },
  DoubleSide:2, AdditiveBlending:1
};
const sb={ console, THREE, fxDot:{isTexture:true}, Math,
  AH_KEEP_GEO:new Set(),
  fxAdd:(o,life,fn)=>{ FX.push({o,fn}); return o; } };
sb.window=sb; sb.window.AH_KEEP_GEO=sb.AH_KEEP_GEO;
vm.createContext(sb);
vm.runInContext(src.slice(a,te)+
  '\nthis.R=fxRing; this.F=fxFlash; this.S=fxSparks; this.T=fxTrail; this.M=FX_MAT;',
  sb, {filename:'fx.js'});

// ---- 1. BASE materials are created once per colour ---------------------
matMade=0; geoMade=0;
for(let i=0;i<50;i++) sb.R(0,0,0, 1, 3, 0xff8844, 0.3);
R.rings50 = { baseMaterials:sb.M.ring.size, geometriesCreated:geoMade,
              note:'50 rings, one colour' };
R.ringGeoSharedOnce = geoMade===1;
R.ringBaseOnce = sb.M.ring.size===1;

// two colours -> two bases, still one geometry
for(let i=0;i<20;i++) sb.R(0,0,0, 1, 3, 0x44aaff, 0.3);
R.twoColours = { bases:sb.M.ring.size, geometries:geoMade };

// ---- 2. ⚠ THE WORST ONE: sparks made a material PER SPARK --------------
const before=sb.M.sprite.size;
for(let i=0;i<30;i++) sb.S(0,0,0, 9, 0xffcc66, 2, 0.4);   // 270 sparks
R.sparks = { burstCount:30, sparksEach:9, totalSprites:270,
             spriteBases:sb.M.sprite.size,
             basesAddedByColour:sb.M.sprite.size-before };
R.sparkBaseNotPerSpark = (sb.M.sprite.size-before) <= 1;

// ---- 3. every clone is MARKED, so ahFree can free it safely ------------
const ring=sb.R(0,0,0,1,3,0x00ff00,0.3);
const flash=sb.F(0,0,0,1,0x00ff00,0.3);
R.clonesMarked = { ring:!!ring.material.userData.fxClone,
                   flash:!!flash.material.userData.fxClone };
R.basesNotMarked = ![...sb.M.ring.values(), ...sb.M.sprite.values()]
  .some(m=>m.userData && m.userData.fxClone);

// ---- 4. ahFree frees a clone and never a base -------------------------
{
  const fa=src.indexOf('function ahFree(root){');
  const fb=src.indexOf('window.ahFree=ahFree;');
  let freed=0;
  const base={ userData:{}, dispose:()=>{ freed++; } };
  const clone={ userData:{fxClone:1}, dispose:()=>{ freed++; } };
  const sb2={ console, AH_KEEP_GEO:new Set(),
    ahErr:()=>{},
    node:{ material:clone, isSprite:true, geometry:null,
           traverse(fn){ fn(this); } } };
  sb2.window=sb2;
  vm.createContext(sb2);
  vm.runInContext('const AH_KEEP_GEO=new Set();\n'+src.slice(fa,fb)+'\nthis.F=ahFree;', sb2, {filename:'af.js'});
  sb2.F(sb2.node);
  R.ahFreeFreesClone = freed===1;
  freed=0;
  sb2.node.material=base;
  sb2.F(sb2.node);
  R.ahFreeSkipsBase = freed===0;
}
console.log(JSON.stringify(R,null,1));
