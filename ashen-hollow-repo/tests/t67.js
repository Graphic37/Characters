// the probe identifies its caller; the kill target follows the timer
const fs=require('fs'), vm=require('vm');
const src=fs.readFileSync('work.html','utf8');
const R={};

// ---- 1. the allocation probe names the CALL SITE -----------------------
{
  const a=src.indexOf('const ALLOC = { on:false');
  const b=src.indexOf("addEventListener('keydown', e=>{\n  if(e.key==='F5'");
  const THREE={
    BoxGeometry:function(){ this.type='Box'; },
    SphereGeometry:function(){ this.type='Sphere'; },
    MeshBasicMaterial:function(){ this.type='MB'; },
    CanvasTexture:function(){ this.type='CT'; },
    Vector3:function(){},           // must NOT be wrapped
  };
  const logs=[];
  const sb={ console:{log:(...x)=>logs.push(x.join(' '))}, THREE, Error };
  sb.window=sb; vm.createContext(sb);
  vm.runInContext(src.slice(a,b)+
    '\nthis.S=window.ahAllocStart; this.P=window.ahAlloc; this.X=window.ahAllocStop;'+
    '\nthis.mk=function(){ new THREE.BoxGeometry(); };'+
    '\nthis.mk2=function(){ for(let i=0;i<7;i++) new THREE.MeshBasicMaterial(); };',
    sb, {filename:'probe.js'});
  const wrapped=sb.S();
  R.wrapped = wrapped;
  R.vector3Untouched = sb.THREE.Vector3.name==='Vector3';
  sb.mk(); sb.mk(); sb.mk2();
  new sb.THREE.CanvasTexture();
  const rows=sb.P();
  R.rows = rows.map(([k,v])=>({count:v, key:k.split('  @  ')[0], site:k.split('  @  ')[1].slice(0,40)}));
  R.groupsByKind = R.rows.some(r=>r.key==='BoxGeometry' && r.count===2)
                && R.rows.some(r=>r.key==='MeshBasicMaterial' && r.count===7);
  R.namesDistinctSites = new Set(R.rows.map(r=>r.site)).size>1;
  R.instancesStillReal = (()=>{ const o=new sb.THREE.BoxGeometry(); return o.type==='Box'; })();
  R.stopRestores = (sb.X(), sb.THREE.BoxGeometry.name==='BoxGeometry');
}

// ---- 2. the kill target is DERIVED from the timer ----------------------
{
  // ⚠ slicing two arrow-function bodies out of an object literal by index is
  // exactly the brittle extraction that has bitten this project repeatedly.
  // Run the WHOLE RIFT_CFG object instead — it is self-contained.
  const a=src.indexOf('const RIFT_CFG = {');
  const b=src.indexOf('window.RIFT_CFG=RIFT_CFG;');
  const sb={ console, Math };
  sb.window=sb;
  vm.createContext(sb);
  vm.runInContext('var GR_CFG={timerSeconds:300}; window.GR_CFG=GR_CFG;\n'+
    src.slice(a,b)+'\nthis.C=RIFT_CFG; this.G=GR_CFG;', sb, {filename:'k.js'});
  const tiers=[1,10,25,50,75,100];
  R.curve = tiers.map(t=>({ tier:t, kills:sb.C.killTarget(t),
                            secsPerKill:+(300/sb.C.killTarget(t)).toFixed(1) }));
  const old=(t)=>Math.round(14+t*0.9);
  R.vsOld = tiers.map(t=>({tier:t, old:old(t), oldPace:+(300/old(t)).toFixed(1),
                           now:sb.C.killTarget(t)}));
  R.worstPace = Math.min(...R.curve.map(c=>c.secsPerKill));
  R.top100Humane = R.worstPace >= 3.5;
  R.monotonic = R.curve.every((c,i)=>i===0 || c.kills>=R.curve[i-1].kills);
  // ⚠ THE COUPLING: change the timer, the target follows automatically
  const at300=sb.C.killTarget(100);
  sb.G.timerSeconds=600;
  const at600=sb.C.killTarget(100);
  R.timerCoupled={at300, at600};
  R.followsTimer = at600 === at300*2;
}
console.log(JSON.stringify(R,null,1));
