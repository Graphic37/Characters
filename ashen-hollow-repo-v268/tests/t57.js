// the perf HUD: correct maths, real drift detection, no cost while hidden
const fs=require('fs'), vm=require('vm');
const {JSDOM}=require('jsdom');
const src=fs.readFileSync('work.html','utf8');
const R={};
const a=src.indexOf('const PERF = {');
// ⚠ anchor on something that will not move. The first version anchored on the
// F9 keybind, so renaming the key to F3 made indexOf return -1 and the slice
// ran to the end of the file — a test that breaks when an unrelated line moves.
const b=src.indexOf('/* \u26a0 I GUESSED TWICE');

function world(){
  const dom=new JSDOM('<body></body>');
  let t=0, renderCalls=0;
  const info={ render:{calls:120, triangles:250000}, memory:{geometries:400, textures:60},
               programs:{length:18} };
  const sb={ console, document:dom.window.document,
    performance:{now:()=>t},
    renderer:{ info },
    ENEMIES:[], ARROWS:[], FX:[], FIELDS:[], SENTRIES:[], GROUND:[],
    RIFT:{active:true}, player:{position:{x:0,z:0}},
    toast:()=>{}, spawnEnemy:()=>({}), spawnLoot:()=>{},
    RIFT_CFG:{enemyLevel:()=>10} };
  sb.window=sb; Object.assign(sb.window,{FX:sb.FX,FIELDS:sb.FIELDS,SENTRIES:sb.SENTRIES,
    ENEMIES:sb.ENEMIES,ARROWS:sb.ARROWS,GROUND:sb.GROUND});
  vm.createContext(sb);
  vm.runInContext(src.slice(a,b)+'\nthis.P=PERF;', sb, {filename:'p.js'});
  sb.__t=(v)=>{ t=v; };
  sb.__info=info;
  sb.__dom=dom;
  return sb;
}
// ---- 1. hidden = no DOM work, but timing IS still collected -------------
{
  const w=world();
  for(let i=1;i<=20;i++){ w.__t(i*16.7); w.perfSample(); }
  R.hidden = { framesCounted:w.P.frames>0, worstTracked:w.P.worst>0,
               noElementYet: !w.__dom.window.document.getElementById('perfHud') };
}
// ---- 2. FPS maths is right --------------------------------------------
{
  const w=world(); w.perfToggle(true);
  let t=0;
  for(let i=0;i<40;i++){ t+=16.7; w.__t(t); w.perfSample(); }   // 60fps for 668ms
  const el=w.__dom.window.document.getElementById('perfHud');
  const rows={}; const g=el.querySelector('.pfGrid');
  const is=[...g.querySelectorAll('i')], bs=[...g.querySelectorAll('b')];
  is.forEach((x,i)=>rows[x.textContent]=bs[i].textContent);
  R.fps = { reported:rows['FPS'], frameMs:rows['frame ms'],
            correct: Math.abs(+rows['FPS']-60)<=1 };
  R.fpsColour = g.querySelector('b.ok') ? 'ok' : (g.querySelector('b.warn')?'warn':'bad');
}
// ---- 3. a BAD frame rate is coloured, not just printed ------------------
{
  const w=world(); w.perfToggle(true);
  let t=0;
  for(let i=0;i<30;i++){ t+=50; w.__t(t); w.perfSample(); }      // 20fps
  const el=w.__dom.window.document.getElementById('perfHud');
  const bad=el.querySelector('b.bad');
  R.slowIsFlagged = !!bad;
}
// ---- 4. ⚠ THE DRIFT COLUMNS — the leak detector ------------------------
{
  const w=world(); w.perfToggle(true);
  let t=0;
  const step=()=>{ t+=16.7; w.__t(t); w.perfSample(); };
  for(let i=0;i<20;i++) step();                    // establishes the baseline
  const before=w.__dom.window.document.getElementById('perfHud').innerHTML;
  R.baselineZero = /geometries<\/i><b[^>]*>400\s*\(\+0\)/.test(before.replace(/&nbsp;/g,' '))
                || /\(\+0\)/.test(before);
  // now simulate a leak: geometries climb
  w.__info.memory.geometries = 520;
  w.__info.memory.textures = 95;
  for(let i=0;i<20;i++) step();
  const after=w.__dom.window.document.getElementById('perfHud').innerHTML;
  R.driftShown = /\(\+120\)/.test(after) && /\(\+35\)/.test(after);
  R.driftFlaggedBad = /class="bad">520/.test(after) || />520\s*\(\+120\)</.test(after);
  const el=w.__dom.window.document.getElementById('perfHud');
  R.leakColoured = [...el.querySelectorAll('b.bad')].length>0;
}
// ---- 5. baseline reset re-anchors the deltas ---------------------------
{
  const w=world(); w.perfToggle(true);
  let t=0; const step=()=>{ t+=16.7; w.__t(t); w.perfSample(); };
  for(let i=0;i<20;i++) step();
  w.__info.memory.geometries=600;
  for(let i=0;i<20;i++) step();
  w.perfBaseline();
  for(let i=0;i<20;i++) step();
  R.baselineReset = /\(\+0\)/.test(w.__dom.window.document.getElementById('perfHud').innerHTML);
}
// ---- 6. the stress command refuses outside a rift ----------------------
{
  const w=world(); w.RIFT.active=false; w.window.RIFT=w.RIFT;
  R.stressRefusesInTown = w.ahStress(10,5)===null;
  w.RIFT.active=true; w.window.RIFT=w.RIFT;
  R.stressRuns = w.ahStress(260,60);
}
// ---- 7. it samples AFTER the render, so info describes this frame ------
R.samplesAfterRender = /renderer\.render\(scene,camera\);\s*\n\s*\/\*[\s\S]{0,140}\*\/\s*\n\s*window\.perfSample/.test(src);
console.log(JSON.stringify(R,null,1));
