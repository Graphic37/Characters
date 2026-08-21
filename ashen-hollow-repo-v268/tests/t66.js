// the shipped baseline: one nav system live, one top bar, no dead switches
const fs=require('fs');
const src=fs.readFileSync('work.html','utf8');
const R={};
R.spineDefaultOff = /on: false,\s*\/\/ ahSpine\(true\) enables the spine follower/.test(src);
R.spineStillAvailable = /window\.ahSpine=function\(on\)/.test(src);
R.abToolingKept = /--- A\/B by travel mode ---/.test(src) && /window\.ahSpineMaps=function/.test(src);
R.oldPathIntact = /function autoAuthoredTravel\(P\)\{[\s\S]{0,600}AUTO\.path=null;/.test(src);
R.packBarOff = /function updatePackBar\(\)\{\s*\n\s*if\(PACKBAR\.el\) PACKBAR\.el\.classList\.remove\('on'\);/.test(src);
R.eliteHudIntact = /d\.id='eliteHud'/.test(src) && /id="eliteDmg"/.test(src);
R.headPlateLive = /window\.updateHeadPlate && window\.updateHeadPlate\(\)/.test(src);
R.townLoopSimple = /const AUTO_TOWN = \{ walk:true/.test(src) && !/gateRetry/.test(src);
// the diagnostics that stay useful
R.keys = {};
for(const m of src.matchAll(/e\.key===['"](F\d+)['"]/g)) R.keys[m[1]]=(R.keys[m[1]]||0)+1;
R.noDoubleBoundKeys = Object.values(R.keys).every(v=>v===1);
// nothing left half-wired
R.noOrphans = { spineHandoff:/spineHandoff/.test(src),
                segmentValidation:/segClear/.test(src),
                navMeshLegs:/const legPoints=\(a,b\)=>/.test(src),
                enemyRescue:/rescueStuckEnemies/.test(src),
                fxCaches:/const FX_MAT = \{ ring:new Map/.test(src) };
console.log(JSON.stringify(R,null,1));
