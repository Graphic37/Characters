// the elite marker: shared resources, right colours, cleaned up on death
const fs=require('fs'), vm=require('vm');
const src=fs.readFileSync('work.html','utf8');
const R={};
const a=src.indexOf('let ELITE_ART=null;');
const b=src.indexOf('function ri2(a,b){');
const code=src.slice(a,b);

let geoMade=0, matMade=0, disposed=0;
const THREE={
  RingGeometry:function(){ geoMade++; this.id='geo'+geoMade; this.rotateX=()=>{};
                           this.dispose=()=>{disposed++;}; },
  MeshBasicMaterial:function(o){ matMade++; Object.assign(this,o); this.id='mat'+matMade;
                                 this.dispose=()=>{disposed++;}; },
  Mesh:function(g,m){ this.geometry=g; this.material=m; this.userData={};
    this.position={y:0}; this.scale={x:1,y:1,z:1,set(a,b,c){this.x=a;this.y=b;this.z=c;}};
    this.parent=null; },
  DoubleSide:'double'
};
const keep=new Set();
const ENEMIES=[];
const sb={ console, THREE, ENEMIES, performance:{now:()=>2000},
  AH_KEEP_GEO:keep };
sb.window=sb; sb.window.AH_KEEP_GEO=keep;
vm.createContext(sb);
vm.runInContext(code+'\nthis.A=attachEliteGlow; this.T=tickEliteGlow; this.ART=()=>ELITE_ART;', sb, {filename:'g.js'});

const mkEnemy=()=>({ dead:false, g:{ add(m){ m.parent=this; this.child=m; } } });
const m1=mkEnemy(), m2=mkEnemy(), r1=mkEnemy();
sb.A(m1,'magic'); sb.A(m2,'magic'); sb.A(r1,'rare');
ENEMIES.push(m1,m2,r1);

// 1. built ONCE no matter how many elites
for(let i=0;i<50;i++){ const e=mkEnemy(); sb.A(e, i%2?'rare':'magic'); ENEMIES.push(e); }
R.resources={ geometriesMade:geoMade, materialsMade:matMade, elites:ENEMIES.length };
R.sharedGeometry = m1.glow.geometry === r1.glow.geometry;
R.separateMaterials = m1.glow.material !== r1.glow.material;
R.magicSharesMaterial = m1.glow.material === m2.glow.material;
R.keepRegistered = keep.size===1;

// 2. the colours and the sizes
R.magic={ colour:'0x'+m1.glow.material.color.toString(16), scale:+m1.glow.scale.x.toFixed(2) };
R.rare ={ colour:'0x'+r1.glow.material.color.toString(16), scale:+r1.glow.scale.x.toFixed(2) };
R.rareIsBigger = r1.glowBase > m1.glowBase;
R.notAdditive = m1.glow.material.blending===undefined && m1.glow.material.depthWrite===false;
R.opacity = m1.glow.material.opacity;
R.aboveFloor = m1.glow.position.y > 0;

// 3. the marker is STATIC now — the tick must not move it
const before=m1.glow.scale.x;
sb.T(0.016); sb.T(0.016); sb.T(0.016);
R.static={ before, after:m1.glow.scale.x, unchanged: before===m1.glow.scale.x };

// 4. a dead elite drops its marker and DISPOSES NOTHING
const da=src.indexOf('function disposeEnemy(e){');
const db=src.indexOf('window.disposeEnemy=disposeEnemy;');
const dcode=src.slice(da,db);
R.disposeDetaches = /if\(e\.glow\)\{ if\(e\.glow\.parent\) e\.glow\.parent\.remove\(e\.glow\); e\.glow=null; \}/.test(dcode);
R.disposeDisposesNothing = !/glow[\s\S]{0,80}dispose\(\)/.test(dcode);
const ka=src.indexOf('function killEnemy(e, silent){');
R.killDetaches = /a corpse keeps its mesh for the death animation/.test(src.slice(ka,ka+600));
R.disposedCount = disposed;   // must be 0 — nothing shared may ever be freed
console.log(JSON.stringify(R,null,1));
