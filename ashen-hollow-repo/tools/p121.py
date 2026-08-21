src = open('work.html', encoding='utf-8').read()
hits = {}
def rep(name, old, new, count=1):
    global src
    n = src.count(old)
    assert n == count, f"{name}: expected {count}, found {n}"
    src = src.replace(old, new); hits[name] = n

# ⚠ AN EMPTY BOX MUST SAY WHY. Twice now he has screenshotted a blank map and
# twice I have audited statically and found nothing. A panel that fails silently
# forces that loop; one that states its own reason ends it in one screenshot.
rep('report',
"""    const live = !!(window.RIFT && RIFT.active && MMAP.built && MMAP.bounds);
    const wrap=mmapEl();
    wrap.classList.toggle('on', live);
    if(!live) return;""",
"""    const inRift = !!(window.RIFT && RIFT.active);
    const live = inRift && MMAP.built && MMAP.bounds;
    const wrap=mmapEl();
    wrap.classList.toggle('on', inRift);        /* shown in a rift, always */
    if(!inRift) return;
    if(!live){
      /* ⚠ SAY IT ON THE PANEL, not only in a log he would have to know to read */
      const g0=MMAP.ctx, S0=MMAP.size;
      g0.clearRect(0,0,S0,S0);
      g0.fillStyle='#7f8a99';
      g0.font='10px "Trebuchet MS",sans-serif';
      g0.textAlign='center';
      g0.fillText(MMAP.why || 'no route data', S0/2, S0/2);
      return;
    }""")

rep('why',
"""    const mesh = window.RIFT && RIFT.nav && RIFT.nav.mesh;
    const pts = mesh && mesh.pts;
    if(!pts || pts.length<8){ say('[minimap] no nav mesh — not drawn'); return; }""",
"""    MMAP.why='';
    const mesh = window.RIFT && RIFT.nav && RIFT.nav.mesh;
    const pts = mesh && mesh.pts;
    if(!pts || pts.length<8){
      MMAP.why = !RIFT ? 'no rift' : !RIFT.nav ? 'no nav'
               : !mesh ? 'no mesh' : ('only '+(pts?pts.length:0)+' pts');
      say('[minimap] not drawn: '+MMAP.why);
      return;
    }""")

rep('state',
"""const MMAP = { el:null, ctx:null, base:null, baseCtx:null, bounds:null,
               at:0, size:158, built:false };""",
"""const MMAP = { el:null, ctx:null, base:null, baseCtx:null, bounds:null,
               at:0, size:158, built:false, why:'', pts:0 };
/* ---- what is the map actually holding? ------------------------------------
   `ahMap()` reports the bake, and `ahUI()` names every visible fixed panel with
   its screen rect. I cannot see the game; between them a "there are two maps"
   or "the box is empty" becomes a fact in one paste instead of three rounds of
   me reading code and finding nothing. */
window.ahMap=function(){
  const r={ built:MMAP.built, why:MMAP.why||'(none)', points:MMAP.pts,
            bounds:MMAP.bounds, inRift:!!(window.RIFT&&RIFT.active),
            navPts:(window.RIFT&&RIFT.nav&&RIFT.nav.mesh&&RIFT.nav.mesh.pts||[]).length,
            elements:document.querySelectorAll('#miniWrap').length };
  try{
    /* is the baked layer actually non-blank? count lit pixels */
    if(MMAP.base){
      const d=MMAP.baseCtx.getImageData(0,0,MMAP.base.width,MMAP.base.height).data;
      let lit=0; for(let i=3;i<d.length;i+=4) if(d[i]>8) lit++;
      r.litPixels=lit;
    }
  }catch(e){ r.litPixels='unreadable: '+(e&&e.message); }
  console.log('[map]', JSON.stringify(r));
  return r;
};
window.ahUI=function(){
  const out=[];
  document.querySelectorAll('body *').forEach(el=>{
    const cs=getComputedStyle(el);
    if(cs.position!=='fixed' && cs.position!=='absolute') return;
    if(cs.display==='none' || cs.visibility==='hidden' || +cs.opacity===0) return;
    const b=el.getBoundingClientRect();
    if(b.width<40 || b.height<40) return;
    if(b.right<0 || b.bottom<0 || b.left>innerWidth || b.top>innerHeight) return;
    out.push({ id:el.id||'', cls:(el.className&&el.className.toString().slice(0,28))||'',
               x:Math.round(b.left), y:Math.round(b.top),
               w:Math.round(b.width), h:Math.round(b.height), z:cs.zIndex });
  });
  out.sort((a,b)=>a.x-b.x);
  console.table(out);
  return out;
};""")

rep('count',
"""    MMAP.built=true;
    say('[minimap] '+pts.length+' nav points over '+span.toFixed(0)+'m');""",
"""    MMAP.built=true; MMAP.pts=pts.length;
    say('[minimap] '+pts.length+' nav points over '+span.toFixed(0)+'m');""")

open('work.html','w',encoding='utf-8').write(src)
print('applied:', hits)
