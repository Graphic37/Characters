src = open('work.html', encoding='utf-8').read()
hits = {}
def rep(name, old, new, count=1):
    global src
    n = src.count(old)
    assert n == count, f"{name}: expected {count}, found {n}"
    src = src.replace(old, new); hits[name] = n

rep('perf',
"""  renderer.render(scene,camera);
  requestAnimationFrame(frame);""",
"""  renderer.render(scene,camera);
  /* AFTER the render, so renderer.info describes the frame just drawn rather
     than the previous one. */
  window.perfSample && window.perfSample();
  requestAnimationFrame(frame);""")

rep('module',
"""addEventListener('resize',()=>{
  camera.aspect=innerWi""",
"""/* ===========================================================================
   PERFORMANCE DIAGNOSTIC  —  F9
   ---------------------------------------------------------------------------
   I cannot run this game. Every performance claim I have made in this project
   has been arithmetic, not measurement, and his list of FPS risks is a list of
   things only the running build can answer. So the game takes the reading, the
   same way F4 took the Auto reading rather than asking him to press F8 mid-run.

   ⚠ THE DRIFT COLUMNS ARE THE POINT. An instantaneous FPS number cannot see
   "runs fine at first, gets worse after 20 minutes" — the classic symptom of
   particles or projectiles that outlive their owner. Draw calls, geometries
   and textures are therefore recorded at the FIRST sample and shown as a
   delta, so a leak is visible as a rising number rather than as a vague sense
   that it feels worse than it did.

   The panel itself is throttled to 4Hz and does no DOM work while hidden.
   ========================================================================= */
const PERF = {
  on:false, el:null, last:0, frames:0, acc:0,
  ms:[], worst:0, worstWindow:0,
  base:null, t0:0, samples:0
};
function perfEl(){
  if(PERF.el && PERF.el.parentNode) return PERF.el;
  const el=document.createElement('div');
  el.id='perfHud';
  document.body.appendChild(el);
  PERF.el=el;
  return el;
}
function perfCounts(){
  const n=(a)=>{ try{ return (a&&a.length)|0; }catch(e){ return 0; } };
  let particles=0;
  try{ particles = n(window.FX) + n(window.FIELDS) + n(window.SENTRIES); }catch(e){}
  return {
    enemies: n(window.ENEMIES),
    alive: (window.ENEMIES||[]).reduce((c,e)=>c+((e&&!e.dead)?1:0),0),
    projectiles: n(window.ARROWS),
    particles: particles,
    loot: n(window.GROUND)
  };
}
window.perfSample=function(){
  const now=performance.now();
  if(!PERF.t0) PERF.t0=now;
  /* frame timing is collected ALWAYS — the cost is one subtraction, and a
     diagnostic that only measures while you are looking at it cannot tell you
     what happened before you opened it. */
  if(PERF.last){
    const dt=now-PERF.last;
    PERF.acc+=dt; PERF.frames++;
    if(dt>PERF.worstWindow) PERF.worstWindow=dt;
    if(dt>PERF.worst) PERF.worst=dt;
  }
  PERF.last=now;
  if(!PERF.on) return;
  if(now-(PERF.drawAt||0) < 250) return;      /* 4Hz */
  PERF.drawAt=now;
  try{
    const info=renderer.info;
    const cur={ calls:info.render.calls, tris:info.render.triangles,
                geo:info.memory.geometries, tex:info.memory.textures,
                programs:(info.programs&&info.programs.length)||0 };
    if(!PERF.base){ PERF.base=Object.assign({}, cur); }
    PERF.samples++;
    const fps = PERF.frames ? (1000/(PERF.acc/PERF.frames)) : 0;
    const avgMs = PERF.frames ? (PERF.acc/PERF.frames) : 0;
    PERF.acc=0; PERF.frames=0;
    const c=perfCounts();
    const d=(k)=>{ const v=cur[k]-PERF.base[k]; return (v>0?'+':'')+v; };
    const mins=((now-PERF.t0)/60000);
    const row=(a,b,cls)=>'<i>'+a+'</i><b'+(cls?' class="'+cls+'"':'')+'>'+b+'</b>';
    const fpsCls = fps<30?'bad':(fps<55?'warn':'ok');
    const worstCls = PERF.worstWindow>50?'bad':(PERF.worstWindow>25?'warn':'ok');
    perfEl().innerHTML =
      '<div class="pfHead">PERFORMANCE &middot; '+mins.toFixed(1)+' min</div>'+
      '<div class="pfGrid">'+
        row('FPS', fps.toFixed(0), fpsCls)+
        row('frame ms', avgMs.toFixed(1), fpsCls)+
        row('worst 250ms', PERF.worstWindow.toFixed(0)+' ms', worstCls)+
        row('worst ever', PERF.worst.toFixed(0)+' ms')+
        row('enemies', c.alive+' / '+c.enemies)+
        row('projectiles', c.projectiles)+
        row('particles', c.particles)+
        row('loot on floor', c.loot)+
        row('draw calls', cur.calls+'  ('+d('calls')+')')+
        row('triangles', (cur.tris/1000).toFixed(0)+'k')+
        row('geometries', cur.geo+'  ('+d('geo')+')', (cur.geo-PERF.base.geo)>60?'bad':'')+
        row('textures', cur.tex+'  ('+d('tex')+')', (cur.tex-PERF.base.tex)>20?'bad':'')+
        row('programs', cur.programs)+
      '</div>'+
      '<div class="pfNote">The bracketed figures are drift since the panel first '+
      'sampled. Rising geometries or textures is a leak, not load.</div>';
    PERF.worstWindow=0;
  }catch(e){ window.ahErr&&window.ahErr(e,'perfSample'); }
};
window.perfToggle=function(on){
  PERF.on = (on===undefined) ? !PERF.on : !!on;
  const el=perfEl();
  el.classList.toggle('on', PERF.on);
  if(PERF.on){ PERF.drawAt=0; }      /* draw immediately, not in 250ms */
  return PERF.on;
};
/* reset the drift baseline — use it after a deliberate change so the deltas
   describe the thing you just did */
window.perfBaseline=function(){ PERF.base=null; PERF.worst=0; PERF.t0=performance.now(); };

/* ---- the nasty case, reproducibly ---------------------------------------
   His test: 250+ enemies and lots of loot. Doing it by hand means never
   running the same test twice, so it is a command. */
window.ahStress=function(enemies, drops){
  enemies = enemies===undefined ? 260 : enemies;
  drops   = drops===undefined ? 60 : drops;
  try{
    if(!window.RIFT || !RIFT.active){
      try{ toast('Enter a Rift first — the stress test needs a dungeon.'); }catch(e){}
      return null;
    }
    const P=player.position;
    let made=0;
    for(let i=0;i<enemies;i++){
      const a=Math.random()*6.283, r=6+Math.random()*26;
      const x=P.x+Math.cos(a)*r, z=P.z+Math.sin(a)*r;
      const lvl=(window.RIFT_CFG?RIFT_CFG.enemyLevel(RIFT.tier):10);
      if(window.spawnEnemy && spawnEnemy(x,z,lvl)) made++;
    }
    let dropped=0;
    for(let i=0;i<drops;i++){
      try{
        const a=Math.random()*6.283, r=2+Math.random()*12;
        if(window.spawnLoot){ spawnLoot(P.x+Math.cos(a)*r, P.z+Math.sin(a)*r); dropped++; }
      }catch(e){}
    }
    window.perfToggle(true);
    window.perfBaseline();
    try{ toast('STRESS: +'+made+' enemies, +'+dropped+' drops'); }catch(e){}
    return { enemies:made, drops:dropped };
  }catch(e){ window.ahErr&&window.ahErr(e,'ahStress'); return null; }
};

addEventListener('keydown', e=>{
  if(e.key==='F9'){ e.preventDefault(); window.perfToggle(); }
});

addEventListener('resize',()=>{
  camera.aspect=innerWi""")

CSS = """
/* ---- the performance HUD (v201) ------------------------------------------
   Top-left, monospace, no chrome beyond a dark backing so it stays legible
   over the dungeon. Hidden by default; F9 toggles. */
#perfHud{
  position:fixed; left:10px; top:10px; z-index:220; pointer-events:none;
  display:none; min-width:210px; padding:8px 10px 9px;
  background:rgba(6,8,11,.86); border:1px solid #2b323c;
  font-family:ui-monospace,Menlo,Consolas,monospace;
  text-shadow:0 1px 2px #000;
}
#perfHud.on{ display:block }
#perfHud .pfHead{
  font-size:9px; letter-spacing:.16em; color:#7f8a99; margin-bottom:6px;
  border-bottom:1px solid #232a33; padding-bottom:4px;
}
#perfHud .pfGrid{ display:grid; grid-template-columns:1fr auto; gap:1px 12px }
#perfHud .pfGrid i{ font-style:normal; font-size:10px; color:#8b95a3 }
#perfHud .pfGrid b{ font-size:10px; color:#d6dde6; text-align:right }
#perfHud .pfGrid b.ok{ color:#8fe06a }
#perfHud .pfGrid b.warn{ color:#e8c46a }
#perfHud .pfGrid b.bad{ color:#ff7a63 }
#perfHud .pfNote{
  margin-top:6px; font-size:9px; line-height:1.45; color:#5f6874;
  max-width:210px;
}
"""
rep('css', "\n</style>", "\n" + CSS + "\n</style>")

open('work.html','w',encoding='utf-8').write(src)
print('applied:', hits)
