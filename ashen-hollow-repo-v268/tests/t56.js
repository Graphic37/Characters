// ⚠ vertexColors:true makes the attribute MANDATORY. Any MAT.wall user without
// one renders black. This asserts the baked list IS the set of MAT.wall users.
const fs=require('fs'), vm=require('vm');
const src=fs.readFileSync('work.html','utf8');
const R={};

// 1. every kit.def that uses MAT.wall, straight from the source
// ⚠ pieces register BOTH ways: `GEO[k]` in the loop and `GEO.post` by dot.
// The first version of this regex only understood the bracket form, so it
// missed post/corbel and captured the loop variable `k` as a piece name —
// reporting a mismatch that did not exist.
const users=[...src.matchAll(/kit\.def\(\s*'([\w]+)'\s*,\s*GEO(?:\.\1|\['\1'\])\s*,\s*MAT\.wall/g)]
  .map(m=>m[1]);
const loop=/for \(const k of \[([^\]]+)\]\)\s*\n\s*kit\.def\(k, GEO\[k\], MAT\.wall/.exec(src);
const loopKeys=loop ? loop[1].split(',').map(s=>s.trim().replace(/'/g,'')) : [];
const allUsers=[...new Set(loopKeys.concat(users))];
const baked=/const WALL_PIECES = \[([\s\S]*?)\];/.exec(src)[1]
  .split(',').map(s=>s.trim().replace(/['\n]/g,'')).filter(Boolean);
R.matWallUsers = allUsers.sort();
R.bakedList = baked.slice().sort();
R.everyUserBaked = allUsers.every(u=>baked.includes(u));
R.noExtras = baked.every(b=>allUsers.includes(b));
R.counts = { users:allUsers.length, baked:baked.length };

// 2. ⚠ THE RAMP ONLY EVER MULTIPLIES DOWN
{
  const a=src.indexOf('function bakeContactDark(geo){');
  const b=src.indexOf('window.bakeContactDark=bakeContactDark;');
  let stored=null;
  const heights=[0,0.2,0.5,1.15,2.0,3.5];
  const geo={ attributes:{position:{count:heights.length, getY:(i)=>heights[i]}},
              setAttribute:(n,at)=>{ stored=at.array; } };
  const sb={console, THREE:{ BufferAttribute:function(a,n){ this.array=a; } },
            LOOK:{baseDark:0.42, baseHeight:1.15}};
  sb.window=sb; vm.createContext(sb);
  vm.runInContext(src.slice(a,b)+'\nthis.F=bakeContactDark;', sb, {filename:'r.js'});
  sb.F(geo);
  const vals=heights.map((h,i)=>+stored[i*3].toFixed(3));
  R.ramp = heights.map((h,i)=>({y:h, mul:vals[i]}));
  R.ceilingIsOne = vals.every(v=>v<=1.0);
  R.floorIsDark  = vals[0]<=0.45;
  R.monotonic = vals.every((v,i)=>i===0 || v>=vals[i-1]);
  R.fullByHeight = vals[3]>=0.999;
  R.neutral = [0,1,2].every(i=>stored[i*3]===stored[i*3+1] && stored[i*3+1]===stored[i*3+2]);
}
// 3. the material flag is set, and only on MAT.wall
R.flagOnWall = /MAT\.wall\.vertexColors = true;/.test(src);
R.flagLeakedElsewhere = (src.match(/MAT\.\w+\.vertexColors = true/g)||[])
  .filter(x=>!/MAT\.wall/.test(x));
// MAT.stone shares TEX.wall but is a DIFFERENT material — must not be flagged
R.stoneUntouched = !/MAT\.stone\.vertexColors/.test(src);

// 4. lights: colour changed, count NOT
{
  const la=src.indexOf('function applyDungeonLighting(d, bounds){');
  const lb=src.indexOf('/* exposure and fog are GLOBAL', la);
  const rig=src.slice(la,lb);
  R.lightRig={ ambient:(rig.match(/new THREE\.AmbientLight/g)||[]).length,
               directional:(rig.match(/new THREE\.DirectionalLight/g)||[]).length,
               point:(rig.match(/new THREE\.PointLight/g)||[]).length,
               warmKeyUsed:/K\.keyWarm/.test(rig), coolAmbUsed:/K\.ambCool/.test(rig) };
}
// 5. the art pass touched nothing it was told not to
R.untouched = { collision:!/dungeonBlock|blockCell/.test(src.slice(src.indexOf('function bakeContactDark'), src.indexOf('window.bakeContactDark'))),
                autoUnchanged:!/AUTO\./.test(src.slice(src.indexOf('function bakeContactDark'), src.indexOf('window.bakeContactDark'))) };
console.log(JSON.stringify(R,null,1));
