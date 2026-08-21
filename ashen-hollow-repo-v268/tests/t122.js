// the pickup flourish: it plays, it cleans up, and it never gates the progress
const fs=require('fs'), vm=require('vm');
const {JSDOM}=require('jsdom');
const src=fs.readFileSync('work.html','utf8');
const code=src.replace(/\/\*[\s\S]*?\*\//g,'');
const R={};

function fxWorld(opts){
  opts=opts||{};
  const dom=new JSDOM(`<body>
    <div id="riftFrame"><div id="riftWell"><i id="riftFill"></i></div></div>
  </body>`);
  const doc=dom.window.document;
  // jsdom has no layout: give the frame a real rect
  doc.getElementById('riftFrame').getBoundingClientRect=()=>
    (opts.hidden ? {left:0,top:0,width:0,height:0} : {left:900,top:20,width:330,height:30});
  const timers=[];
  const a=src.indexOf('function orbScreenPos(o){');
  const b=src.indexOf('window.tickOrbs=function(dt){');
  const sb={ console, Math, document:doc,
    innerWidth:1600, innerHeight:900,
    camera:{}, 
    THREE:{ Vector3:function(x,y,z){ this.x=x;this.y=y;this.z=z;
      this.project=()=>{ this.x=opts.offscreen?0.5:0.2; this.y=0.3;
                         this.z=opts.behind?1.4:0.5; return this; }; } },
    RIFT:{active:true, target:75, progress:0, bossSpawned:false},
    riftProgressChanged:()=>{ sb.__barChecked=true; },
    setTimeout:(fn,ms)=>{ timers.push({fn,ms}); return timers.length; },
    ahErr:(e,w)=>sb.__err.push(w+': '+(e&&e.message)) };
  sb.__err=[]; sb.__barChecked=false; sb.window=sb;
  vm.createContext(sb);
  vm.runInContext(src.slice(a,b)+
    '\nthis.POS=orbScreenPos; this.FLY=orbFlyTo; this.PULSE=orbBarPulse;'+
    '\nthis.COLLECT=orbCollect;', sb, {filename:'f.js'});
  sb.doc=doc; sb.timers=timers;
  sb.runTimers=()=>{ const t=timers.splice(0); t.sort((x,y)=>x.ms-y.ms).forEach(x=>x.fn()); };
  return sb;
}
const orb=(kind,value)=>({ kind:kind, value:value,
  g:{position:{x:5,y:0.6,z:5}} });

// ---- 1. a pickup produces the mote, the pulse and the number ----------
{
  const w=fxWorld();
  w.COLLECT(orb('rare',2));
  R.immediate = { progress:w.RIFT.progress,
                  motes:w.doc.querySelectorAll('.orbFly').length,
                  barChecked:w.__barChecked };
  // ⚠ THE PROGRESS IS AWARDED AT ONCE, not when the animation lands
  R.awardIsImmediate = R.immediate.progress===2 && R.immediate.barChecked;
  R.motePresent = R.immediate.motes===1;
  const el=w.doc.querySelector('.orbFly');
  R.mote = { cls:el.className,
             hasDx:!!el.style.getPropertyValue('--dx'),
             hasLift:!!el.style.getPropertyValue('--lift'),
             rare:/orbFlyR/.test(el.className) };
  R.moteAimed = R.mote.hasDx && R.mote.hasLift && R.mote.rare;
  // now let the delayed pulse fire
  w.runTimers();
  R.afterTimers = { fill:w.doc.getElementById('riftFill').className,
                    gains:w.doc.querySelectorAll('.orbGain').length,
                    motesLeft:w.doc.querySelectorAll('.orbFly').length };
  R.pulses = /orbHit/.test(R.afterTimers.fill) || R.afterTimers.gains>0;
  // ⚠ CLEANED UP: the fallback timer removes the mote even with no animationend
  R.moteCleanedUp = R.afterTimers.motesLeft===0;
}
// ---- 2. the percentage is the orb's real share of the bar -------------
{
  const w=fxWorld();
  w.RIFT.target=75;
  w.PULSE('rare', 2);
  const tag=w.doc.querySelector('.orbGain');
  R.gainText = tag && tag.textContent;
  R.percentIsReal = R.gainText==='+3%';     // 2/75 = 2.7% -> 3
}
// ---- 3. ⚠ THE FX MUST NEVER BLOCK THE AWARD --------------------------
{
  // camera behind / HUD hidden / no frame at all — progress must still land
  const cases={
    behindCamera: fxWorld({behind:true}),
    hudHidden:    fxWorld({hidden:true})
  };
  R.robust={};
  for(const k in cases){
    const w=cases[k];
    w.COLLECT(orb('magic',2));
    R.robust[k]={ progress:w.RIFT.progress, motes:w.doc.querySelectorAll('.orbFly').length,
                  errors:w.__err.length };
  }
  R.awardSurvivesEverything =
    Object.values(R.robust).every(v=>v.progress===2 && v.errors===0);
  R.noMoteWhenPointless =
    R.robust.behindCamera.motes===0 && R.robust.hudHidden.motes===0;
}
// ---- 4. reduced motion is respected ----------------------------------
R.a11y = {
  mediaQuery:/@media \(prefers-reduced-motion: reduce\)\{[\s\S]{0,200}\.orbFly\{ display:none \}/.test(src),
  keepsTheNumber:/@media \(prefers-reduced-motion: reduce\)\{[\s\S]{0,240}\.orbGain\{ animation-duration/.test(src)
};
R.respectsMotion = R.a11y.mediaQuery && R.a11y.keepsTheNumber;
// ---- 5. two cleanup paths, as the v233 gold pop taught ----------------
R.cleanup = {
  moteOnEvent:/el\.addEventListener\('animationend', done\)/.test(code),
  moteOnTimer:/setTimeout\(done, 1200\)/.test(code),
  tagOnEvent:/tag\.addEventListener\('animationend', done\)/.test(code),
  tagOnTimer:/setTimeout\(done, 1100\)/.test(code)
};
R.doubleCleanup = Object.values(R.cleanup).every(Boolean);
R.PASS = R.awardIsImmediate && R.motePresent && R.moteAimed && R.pulses
      && R.moteCleanedUp && R.percentIsReal && R.awardSurvivesEverything
      && R.noMoteWhenPointless && R.respectsMotion && R.doubleCleanup;
console.log(JSON.stringify(R,null,1));
if(!R.PASS) process.exit(1);
