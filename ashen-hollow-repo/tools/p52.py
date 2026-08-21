src = open('work.html', encoding='utf-8').read()
hits = {}
def rep(name, old, new, count=1):
    global src
    n = src.count(old)
    assert n == count, f"{name}: expected {count}, found {n}"
    src = src.replace(old, new); hits[name] = n

# ============================================ 1. LIVE TOOLTIP REFRESH
# ⚠ THE MECHANISM ALREADY EXISTED — `setTipDetail` re-renders an open tooltip by
# clearing `TIP.dataset.key` and calling showTip again. The currency path simply
# never used it, so a quality upgrade landed on the item and the open tooltip
# kept showing the pre-upgrade numbers until you moved the mouse away and back.
rep('refresh-fn',
"""function showTip(it, ev, isEquipped){
  if(S.held) return;""",
"""/* Re-render whatever tooltip is currently open, in place. The `key` cache is
   what stops a hover rebuilding every frame (v130's no-flicker rule), so a
   deliberate refresh has to clear it — otherwise showTip sees the same key and
   returns without doing anything. */
function refreshOpenTip(){
  try{
    if(!TIP || TIP.style.display==='none' || !TIP.dataset.item) return;
    const it=window.ITEM_BY_UID && ITEM_BY_UID[TIP.dataset.item];
    if(!it) return;
    TIP.dataset.key='';
    showTip(it, null, TIP.dataset.eq==='1');
  }catch(e){ window.ahErr&&window.ahErr(e,'refreshOpenTip'); }
}
window.refreshOpenTip=refreshOpenTip;

function showTip(it, ev, isEquipped){
  if(S.held) return;""")

# every currency application ends by refreshing the world; add the tooltip
rep('refresh-call',
"""    /* the armed stack may have survived (qty) or been consumed entirely --
       mirror consumeCurrency so the cursor never points at a dead object */""",
"""    /* the item under the cursor just changed — show it, rather than making him
       move the mouse off and back to discover what the orb did */
    try{ if(window.refreshOpenTip) refreshOpenTip(); }catch(e){ window.ahErr&&window.ahErr(e,'rune:tip'); }
    /* the armed stack may have survived (qty) or been consumed entirely --
       mirror consumeCurrency so the cursor never points at a dead object */""")

rep('refresh-call2',
"""function consumeCurrency(cur){""",
"""/* ⚠ ONE PLACE. Every orb — quality, exalt, annul, socket, corrupt — ends here,
   so refreshing the open tooltip here covers all of them and cannot be
   forgotten by whoever adds the next currency. */
function refreshTipAfterCurrency(){
  try{ if(window.refreshOpenTip) refreshOpenTip(); }
  catch(e){ window.ahErr&&window.ahErr(e,'refreshTipAfterCurrency'); }
}
function consumeCurrency(cur){
  refreshTipAfterCurrency();""")

# ============================================ 2. AFFIX CHIP CAP
rep('chip-cap',
"""    const md=el.querySelector('.pbMods');
    const mtxt=info.mods.join(' \\u00b7 ');
    if(md.dataset.v!==mtxt){
      md.dataset.v=mtxt;
      md.innerHTML=info.mods.map(m=>'<span class="pbMod">'+m+'</span>').join('');
    }""",
"""    /* ⚠ CAP THE CHIPS. A rare rolls 2-4 mods and a magic pack of three can
       show three different ones, so the union can grow — and an encounter bar
       that widens with the roll stops being a fixed, readable element. Four
       visible, the rest as "+N". */
    const md=el.querySelector('.pbMods');
    const mtxt=info.mods.join(' \\u00b7 ');
    if(md.dataset.v!==mtxt){
      md.dataset.v=mtxt;
      const MAXC=4;
      const shown=info.mods.slice(0,MAXC);
      let html=shown.map(m=>'<span class="pbMod">'+m+'</span>').join('');
      if(info.mods.length>MAXC)
        html+='<span class="pbMod more" title="'+info.mods.slice(MAXC).join(', ')+
              '">+'+(info.mods.length-MAXC)+'</span>';
      md.innerHTML=html;
    }""")

# ============================================ 3. THE OVER-HEAD PLATE
rep('plate',
"""function updatePackBar(){""",
"""/* ===========================================================================
   THE OVER-HEAD ELITE PLATE  (v198)
   ---------------------------------------------------------------------------
   His reference shows the SAME information twice: once at the top of the screen
   and once above the elite you are hitting. That is not redundancy — the top
   bar answers "is this encounter still going", the head plate answers "WHICH of
   these is the one I am fighting". Auto makes the second question harder, not
   easier, so both earn their place.

   One plate, reused, for the single enemy currently being damaged. Projected
   with the camera rather than parented to the mesh: a DOM label costs nothing
   per frame beyond a matrix multiply, and it never scales with distance or
   clips through geometry the way a sprite would.
   ========================================================================= */
const HEADPLATE = { el:null, e:null, until:0, v:'' };
const HEADPLATE_CFG = { linger:4.0, maxChips:3 };
function headPlateEl(){
  if(HEADPLATE.el && HEADPLATE.el.parentNode) return HEADPLATE.el;
  const el=document.createElement('div');
  el.id='headPlate';
  el.innerHTML='<div class="hpName"></div>'+
               '<div class="hpTrack"><i class="hpFill"></i></div>'+
               '<div class="hpMods"></div>';
  document.body.appendChild(el);
  HEADPLATE.el=el;
  return el;
}
/* combat calls this on every hit; the most recently damaged elite owns the plate */
window.notePlateTarget=function(e){
  if(!e || !e.elitePack) return;
  HEADPLATE.e=e;
  HEADPLATE.until=performance.now()/1000+HEADPLATE_CFG.linger;
};
function updateHeadPlate(){
  try{
    const now=performance.now()/1000;
    const e=HEADPLATE.e;
    const el=HEADPLATE.el;
    if(!e || e.dead || now>HEADPLATE.until || !RIFT.active){
      if(el) el.classList.remove('on');
      if(!e || e.dead) HEADPLATE.e=null;
      return;
    }
    const box=headPlateEl();
    /* project the head position to screen space */
    const p=e.g.position;
    const v=new THREE.Vector3(p.x, p.y+(e.bodyRadius?e.bodyRadius*2.4:2.2), p.z);
    v.project(camera);
    if(v.z>1){ box.classList.remove('on'); return; }   /* behind the camera */
    const x=(v.x*0.5+0.5)*innerWidth, y=(-v.y*0.5+0.5)*innerHeight;
    box.style.transform='translate(-50%,-100%) translate('+Math.round(x)+'px,'+Math.round(y)+'px)';
    box.classList.add('on');
    const rare = e.elitePack==='rare';
    box.classList.toggle('rare', rare);
    box.classList.toggle('magic', !rare);
    const nm=(e.archName||e.kind||'Elite')+(rare?' (Elite)':'');
    const mods=(e.mods||[]).slice(0,HEADPLATE_CFG.maxChips);
    const sig=nm+'|'+mods.join(',');
    if(HEADPLATE.v!==sig){
      HEADPLATE.v=sig;
      box.querySelector('.hpName').textContent=nm;
      box.querySelector('.hpMods').innerHTML=mods.map(m=>'<span>'+m+'</span>').join('');
    }
    const pct=e.maxHp>0 ? Math.max(0,Math.min(100,(e.hp/e.maxHp)*100)) : 0;
    box.querySelector('.hpFill').style.width=pct.toFixed(1)+'%';
  }catch(err){ window.ahErr&&window.ahErr(err,'updateHeadPlate'); }
}
window.updateHeadPlate=updateHeadPlate;
window.HEADPLATE_RESET=function(){
  HEADPLATE.e=null; HEADPLATE.until=0; HEADPLATE.v='';
  if(HEADPLATE.el) HEADPLATE.el.classList.remove('on');
};

function updatePackBar(){""")

rep('note-hit',
"""  e.hp-=applied;""",
"""  e.hp-=applied;
  /* the elite you are actually hitting owns the head plate */
  try{ if(e.elitePack && window.notePlateTarget) notePlateTarget(e); }
  catch(err){ window.ahErr&&window.ahErr(err,'damageEnemy:plate'); }""")

rep('plate-tick',
"""  window.updatePackBar && window.updatePackBar();""",
"""  window.updatePackBar && window.updatePackBar();
  window.updateHeadPlate && window.updateHeadPlate();""")

rep('plate-clear',
"""  try{ if(window.PACKBAR_RESET) PACKBAR_RESET(); }catch(e){ window.ahErr&&window.ahErr(e,'clearRift:packbar'); }""",
"""  try{ if(window.PACKBAR_RESET) PACKBAR_RESET(); }catch(e){ window.ahErr&&window.ahErr(e,'clearRift:packbar'); }
  try{ if(window.HEADPLATE_RESET) HEADPLATE_RESET(); }catch(e){ window.ahErr&&window.ahErr(e,'clearRift:headplate'); }""")

CSS = """
/* ---- the over-head elite plate (v198) ------------------------------------
   Same rarity language as the pack bar and the ground rings: blue = magic,
   gold = rare. Positioned by transform only, so moving it never triggers a
   layout — the one property that is cheap to change every frame. */
#headPlate{
  position:fixed; left:0; top:0; z-index:38; pointer-events:none;
  min-width:150px; max-width:260px; padding:4px 8px 5px;
  opacity:0; transition:opacity .18s ease;
  background:linear-gradient(180deg,rgba(12,14,18,.86),rgba(6,7,10,.92));
  border:1px solid #3a3f4a; text-align:center;
  box-shadow:0 2px 10px rgba(0,0,0,.6);
  will-change:transform;
}
#headPlate.on{ opacity:1 }
#headPlate .hpName{
  font:600 11px "Trebuchet MS",sans-serif; letter-spacing:.08em;
  white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
  text-shadow:0 1px 3px #000; margin-bottom:3px;
}
#headPlate .hpTrack{ height:6px; background:#08090c; border:1px solid #000; overflow:hidden }
#headPlate .hpFill{ display:block; height:100%; width:100%; transition:width .15s linear }
#headPlate .hpMods{ display:flex; flex-wrap:wrap; gap:3px; justify-content:center; margin-top:4px }
#headPlate .hpMods span{
  font:600 8px "Trebuchet MS",sans-serif; letter-spacing:.05em;
  padding:1px 4px; background:rgba(255,255,255,.05); border:1px solid #333a45; color:#aab3c2;
}
#headPlate .hpMods:empty{ display:none }
#headPlate.magic{ border-color:#3c5c8f }
#headPlate.magic .hpName{ color:#9dc0f0 }
#headPlate.magic .hpFill{ background:linear-gradient(180deg,#7db0ff,#3f6fc4) }
#headPlate.rare{ border-color:#8a6f31 }
#headPlate.rare .hpName{ color:#f0d488 }
#headPlate.rare .hpFill{ background:linear-gradient(180deg,#ffd97a,#d0a02f) }
/* the overflow chip on the pack bar */
#packBar .pbMod.more{ opacity:.75 }
"""
rep('css', "\n</style>", "\n" + CSS + "\n</style>")

open('work.html','w',encoding='utf-8').write(src)
print('applied:', hits)
