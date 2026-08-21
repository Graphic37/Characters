src = open('work.html', encoding='utf-8').read()
hits = {}
def rep(name, old, new, count=1):
    global src
    n = src.count(old)
    assert n == count, f"{name}: expected {count}, found {n}"
    src = src.replace(old, new); hits[name] = n

# =================================================== 1. THE ALLOCATION PROBE
rep('probe',
"""import * as THREE from 'three';""",
"""import * as THREE from 'three';

/* ===========================================================================
   ALLOCATION PROBE  —  F5, and `ahAlloc()`
   ---------------------------------------------------------------------------
   His instruction, and it is the right one: stop adding cleanup guesses and
   make the thing creating them identify itself. I have twice "fixed" this leak
   by reasoning about which code LOOKS like it allocates — and both times the
   real source was somewhere I had not thought to read. There are 103 geometry
   and 64 material call sites; auditing them by eye is how I would guess again.

   So every geometry, material and texture constructor is wrapped to record the
   CALL SITE that created it, taken from a stack trace. `ahAlloc()` then prints
   allocations grouped by site, worst first — the leak names itself.

   ⚠ THIS IS A DIAGNOSTIC AND IT COSTS SOMETHING: capturing a stack per
   allocation is not free. It is OFF until switched on, and `ahAllocStop()`
   restores the untouched constructors. Never leave it running for play.
   ========================================================================= */
const ALLOC = { on:false, counts:new Map(), orig:null, total:0 };
function allocSite(){
  /* frame 0 is Error, 1 is this function, 2 is the wrapper — 3 is the caller */
  try{
    const st=(new Error()).stack.split('\\n');
    for(let i=3;i<st.length;i++){
      const l=st[i];
      if(!l) continue;
      if(/allocSite|ahAllocStart|Wrapped/.test(l)) continue;
      return l.trim().replace(/^at\\s+/,'').slice(0,120);
    }
  }catch(e){}
  return 'unknown';
}
function allocNote(kind, site){
  const k=kind+'  @  '+site;
  ALLOC.counts.set(k, (ALLOC.counts.get(k)||0)+1);
  ALLOC.total++;
}
window.ahAllocStart=function(){
  if(ALLOC.on) return 'already running';
  const KINDS=[];
  for(const name in THREE){
    if(!/Geometry$|Material$|Texture$/.test(name)) continue;
    const C=THREE[name];
    if(typeof C!=='function') continue;
    KINDS.push(name);
  }
  ALLOC.orig={};
  KINDS.forEach(name=>{
    const C=THREE[name];
    ALLOC.orig[name]=C;
    /* subclass rather than proxy: `new` still produces a real instance, so
       anything doing instanceof checks or reading .type keeps working */
    function Wrapped(...args){
      const o=new C(...args);
      allocNote(name, allocSite());
      return o;
    }
    Wrapped.prototype=C.prototype;
    try{ THREE[name]=Wrapped; }catch(e){ /* frozen module namespace */ }
  });
  ALLOC.on=true;
  ALLOC.counts.clear(); ALLOC.total=0;
  try{ console.log('[alloc] probe ON — '+KINDS.length+' constructors wrapped. '+
    'Play one rift, then ahAlloc(). Costs a stack per allocation; '+
    'ahAllocStop() when done.'); }catch(e){}
  return KINDS.length+' wrapped';
};
window.ahAllocStop=function(){
  if(!ALLOC.on) return 'not running';
  for(const name in ALLOC.orig){ try{ THREE[name]=ALLOC.orig[name]; }catch(e){} }
  ALLOC.on=false;
  return 'probe off';
};
window.ahAllocReset=function(){ ALLOC.counts.clear(); ALLOC.total=0; return 'alloc counts cleared'; };
window.ahAlloc=function(n){
  if(!ALLOC.counts.size){
    console.log('[alloc] nothing recorded — ahAllocStart() first, then play');
    return [];
  }
  const rows=[...ALLOC.counts.entries()].sort((a,b)=>b[1]-a[1]).slice(0, n||25);
  console.log('[alloc] '+ALLOC.total+' allocations, worst sites first:');
  rows.forEach(([k,v])=>console.log('  '+String(v).padStart(6)+'  '+k));
  console.log('  ⚠ a site with a count that RISES every rift is the leak; a big '+
              'one-off count at load is just the build.');
  return rows;
};
addEventListener('keydown', e=>{
  if(e.key==='F5' && e.shiftKey){ e.preventDefault();
    if(ALLOC.on){ window.ahAlloc(); } else { window.ahAllocStart(); } }
});""")

open('work.html','w',encoding='utf-8').write(src)
print('applied:', hits)
