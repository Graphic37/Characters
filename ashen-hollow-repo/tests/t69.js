// sentries out of walls; preload after paint; shaders warmed before play
const fs=require('fs'), vm=require('vm');
const src=fs.readFileSync('work.html','utf8');
const R={};

// ---- 1. the sentry never lands in a wall -------------------------------
{
  // ⚠ extract just the fire() BODY, not a half-open object literal — slicing
  // to an arbitrary line leaves unbalanced braces and the sandbox won't parse.
  const i=src.indexOf('      /* \u26a0 THIS PLANTED AT A FIXED OFFSET');
  const j=src.indexOf('      while(SENTRIES.length > count*2)', i);
  const body=src.slice(i, j);
  // a wall for x >= 5
  const walk=(x,z)=> x < 5;
  function run(playerAt){
    const placed=[];
    const sb={ console, Math,
      skillParams:()=>({count:3}),
      player:{position:{x:playerAt[0], z:playerAt[1]}},
      spawnSentry:(x,z,life)=>placed.push({x:+x.toFixed(2), z:+z.toFixed(2)}),
      DEPTHS:{ walkableAt:(x,z)=> walk(x,z) },
      AUTO:{stats:{}}, SENTRIES:[], riftRoot:{remove(){}}, ahFree:null };
    sb.window=sb; sb.window.DEPTHS=sb.DEPTHS;
    sb.window.nearestStandable=(x,z,r)=>{
      for(let rr=0.5; rr<=r; rr+=0.5)
        for(let k=0;k<16;k++){
          const a=k/16*6.283, nx=x+Math.cos(a)*rr, nz=z+Math.sin(a)*rr;
          if(walk(nx,nz)) return {x:nx,z:nz};
        }
      return null;
    };
    vm.createContext(sb);
    vm.runInContext('function fire(){\n'+body+'\n}\nthis.F=fire; this.A=AUTO;', sb, {filename:'s.js'});
    sb.F();
    return { placed, moved:sb.A.stats.sentryMoved||0 };
  }
  const openGround=run([1,0]);
  const backToWall=run([4.6,0]);      // offsets would push turrets past x=5
  R.sentry = {
    openGround: { count:openGround.placed.length, moved:openGround.moved,
                  allWalkable:openGround.placed.every(p=>walk(p.x,p.z)) },
    againstWall:{ count:backToWall.placed.length, moved:backToWall.moved,
                  allWalkable:backToWall.placed.every(p=>walk(p.x,p.z)),
                  where:backToWall.placed }
  };
  R.neverInWall = R.sentry.openGround.allWalkable && R.sentry.againstWall.allWalkable;
  R.stillPlantsAll = R.sentry.againstWall.count===3;   // never silently skipped
  R.untouchedWhenClear = openGround.moved===0;
}

// ---- 2. the preload runs AFTER paint, serially, and decodes ------------
{
  const a=src.indexOf('function preloadArt(){');
  const b=src.indexOf('window.preloadArt=preloadArt;');
  let created=0, decoded=0, concurrent=0, peak=0;
  const logs=[];
  const sb={ console:{log:(...x)=>logs.push(x.join(' '))},
    CURRENCY_ART:{a:'u1',b:'u2'}, RUNE_ART:{c:'u3',d:'u3'},  // u3 duplicated
    GEAR_ART:{e:'u4'},
    setTimeout:(fn,ms)=>{ fn(); },
    Image:function(){
      created++; concurrent++; peak=Math.max(peak,concurrent);
      const self=this;
      // ⚠ FULLY SYNCHRONOUS STUB. The production code assigns onload/onerror
      // BEFORE src, so firing on assignment is faithful — and a microtask or
      // timer never drains inside a synchronous test, which is why the first
      // two versions of this stub reported "1 image created" for a chain that
      // is actually fine.
      Object.defineProperty(this,'src',{ set(v){
        self._u=v;
        concurrent--;
        self.onload && self.onload();
      }});
      // ⚠ a real Promise resolves in a MICROTASK, which never runs before this
      // synchronous test ends — so the chain stopped after one image and the
      // suite reported a bug that does not exist. A thenable that calls back
      // immediately keeps the chain synchronous for the harness.
      this.decode=()=>{ decoded++; return { then:(f)=>{ f(); return {catch:()=>{}}; } }; };
    },
    ahErr:()=>{} };
  sb.window=sb; sb.window.GEAR_ART=sb.GEAR_ART;
  vm.createContext(sb);
  vm.runInContext(src.slice(a,b)+'\nthis.P=preloadArt;', sb, {filename:'p.js'});
  sb.P();
  // let the microtask chain drain
  R.preload = { imagesCreated:created, peakConcurrent:peak,
                deduped: created===4, log:logs[0] };
  R.oneAtATime = peak===1;
  R.deferredNotImmediate = /requestIdleCallback\(\(\)=>preloadArt\(\)/.test(src);
  R.forcesDecode = /img\.decode\(\)\.then/.test(src);
}

// ---- 3. shaders warm at build, before the first frame ------------------
{
  R.warm = { present:/renderer\.compile\(scene, camera\)/.test(src),
             beforeExitGate: src.indexOf('renderer.compile(scene, camera)')
                             < src.indexOf('riftExitGate(exitAt.x, exitAt.z)'),
             guarded:/if\(renderer && renderer\.compile\)/.test(src),
             reportsTime:/shaders compiled in '/.test(src) };
}
console.log(JSON.stringify(R,null,1));
