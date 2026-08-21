src = open('work.html', encoding='utf-8').read()
hits = {}
def rep(name, old, new, count=1):
    global src
    n = src.count(old)
    assert n == count, f"{name}: expected {count}, found {n}"
    src = src.replace(old, new); hits[name] = n

# ============================================ 1. PACK IDENTITY AT SPAWN
rep('packid',
"""function spawnEliteGroup(sx, sz, lvl, spotFn){""",
"""let ELITE_PACK_SEQ = 0;
function spawnEliteGroup(sx, sz, lvl, spotFn){
  /* every group gets an id, so the bar can treat "this pack" as one thing
     without inferring membership from positions later */
  const packId = 'pk'+(++ELITE_PACK_SEQ);""")

rep('packid-rare',
"""    const boss=put(sx, sz, 'rare');
    if(boss) boss.elitePack='rare';""",
"""    const boss=put(sx, sz, 'rare');
    if(boss){ boss.elitePack='rare'; boss.packId=packId; }""")

rep('packid-magic',
"""      if(e){ if(!kind) kind=e.kind; e.elitePack='magic'; n++; }""",
"""      if(e){ if(!kind) kind=e.kind; e.elitePack='magic'; e.packId=packId; n++; }""")

# ============================================ 2. THE BAR
rep('module',
"""/* ---- per-frame: sentries, fields, fuses, dots, the storm ---------------- */""",
"""/* ===========================================================================
   THE ELITE PACK BAR  (v194)
   ---------------------------------------------------------------------------
   A compact top-centre readout for the elite pack currently being fought:
   name, one health bar, and the pack's affixes. It SUPPLEMENTS the ground
   rings — those still say WHICH monster; this says whether the encounter is
   still going, which is the thing you cannot tell at a glance when Auto is
   playing and the screen is full of mobs.

   ⚠ HP MODEL — the decision he left open. This uses the SUM of the elite
   members' current and max HP, and does NOT invent a shared pool: no combat
   code changes, each monster still has its own HP and dies on its own. The bar
   is a readout over existing state, which is the only version that cannot
   desync from the fight.
   ESCORTS ARE EXCLUDED. A rare's 2-4 normal minions are ordinary monsters; if
   they counted, the bar would sit at 70% while the actual elite was nearly
   dead. The encounter IS the elite.
   Bosses are untouched — they have their own UI.
   ========================================================================= */
const PACKBAR = { el:null, id:null, hideAt:0, lastAt:0 };
const PACKBAR_CFG = {
  range: 22,        // a pack member this close counts as engaged
  linger: 2.6,      // seconds the bar stays after the pack dies
  hz: 8             // updates per second — this walks ENEMIES, so not per frame
};
window.PACKBAR_CFG = PACKBAR_CFG;

function packBarEl(){
  if(PACKBAR.el && PACKBAR.el.parentNode) return PACKBAR.el;
  const el=document.createElement('div');
  el.id='packBar';
  el.innerHTML='<div class="pbName"></div>'+
               '<div class="pbTrack"><i class="pbFill"></i></div>'+
               '<div class="pbMods"></div>';
  document.body.appendChild(el);
  PACKBAR.el=el;
  return el;
}

/* Which pack is the player actually fighting? The one with a living member
   nearest to him, inside `range`. Ties are broken by distance, so walking from
   one pack to another swaps the bar rather than holding the first forever. */
function activePack(){
  if(!window.ENEMIES || !RIFT.active) return null;
  const P=player.position;
  let best=null, bestD=PACKBAR_CFG.range;
  for(let i=0;i<ENEMIES.length;i++){
    const e=ENEMIES[i];
    if(!e || e.dead || !e.packId || !e.elitePack) continue;
    const d=Math.hypot(e.g.position.x-P.x, e.g.position.z-P.z);
    if(d<bestD){ bestD=d; best=e; }
  }
  return best ? best.packId : null;
}

/* Everything the bar needs about a pack, gathered in one pass. */
function packInfo(packId){
  const out={ id:packId, kind:'magic', alive:0, total:0, hp:0, maxHp:0,
              name:'', mods:[] };
  if(!packId || !window.ENEMIES) return out;
  const seen={};
  for(let i=0;i<ENEMIES.length;i++){
    const e=ENEMIES[i];
    if(!e || e.packId!==packId || !e.elitePack) continue;   /* elites only */
    out.total++;
    out.kind=e.elitePack;
    out.maxHp+=e.maxHp||0;
    if(!e.dead){ out.alive++; out.hp+=Math.max(0,e.hp||0); }
    if(!out.name) out.name=e.archName||e.kind||'Elite';
    (e.mods||[]).forEach(m=>{ if(!seen[m]){ seen[m]=1; out.mods.push(m); } });
  }
  /* a three-strong warband reads as a pack; a lone rare reads as a champion */
  out.title = out.kind==='rare'
    ? (out.name+' \\u2014 Champion')
    : (out.name+' Pack');
  return out;
}
window.packInfo=packInfo;
window.activePack=activePack;

function updatePackBar(){
  try{
    const now=performance.now()/1000;
    if(now-PACKBAR.lastAt < 1/PACKBAR_CFG.hz) return;
    PACKBAR.lastAt=now;

    if(!RIFT.active){ if(PACKBAR.el) PACKBAR.el.classList.remove('on'); PACKBAR.id=null; return; }

    const live=activePack();
    if(live){ PACKBAR.id=live; PACKBAR.hideAt=0; }
    else if(PACKBAR.id && !PACKBAR.hideAt){
      /* keep it up briefly so the kill is legible, then drop it */
      PACKBAR.hideAt=now+PACKBAR_CFG.linger;
    }
    if(PACKBAR.hideAt && now>PACKBAR.hideAt){
      PACKBAR.id=null; PACKBAR.hideAt=0;
      if(PACKBAR.el) PACKBAR.el.classList.remove('on');
      return;
    }
    if(!PACKBAR.id){ if(PACKBAR.el) PACKBAR.el.classList.remove('on'); return; }

    const info=packInfo(PACKBAR.id);
    if(!info.total){ PACKBAR.id=null; if(PACKBAR.el) PACKBAR.el.classList.remove('on'); return; }

    const el=packBarEl();
    el.classList.add('on');
    el.classList.toggle('rare', info.kind==='rare');
    el.classList.toggle('magic', info.kind!=='rare');

    const nm=el.querySelector('.pbName');
    const want=info.title + (info.total>1 ? '  ('+info.alive+'/'+info.total+')' : '');
    if(nm.textContent!==want) nm.textContent=want;

    const pct=info.maxHp>0 ? Math.max(0, Math.min(100, info.hp/info.maxHp*100)) : 0;
    el.querySelector('.pbFill').style.width=pct.toFixed(1)+'%';

    const md=el.querySelector('.pbMods');
    const mtxt=info.mods.join(' \\u00b7 ');
    if(md.dataset.v!==mtxt){
      md.dataset.v=mtxt;
      md.innerHTML=info.mods.map(m=>'<span class="pbMod">'+m+'</span>').join('');
    }
  }catch(e){ window.ahErr&&window.ahErr(e,'updatePackBar'); }
}
window.updatePackBar=updatePackBar;

/* ---- per-frame: sentries, fields, fuses, dots, the storm ---------------- */""")

rep('tick',
"""  window.tickEliteGlow && window.tickEliteGlow(dt);""",
"""  window.tickEliteGlow && window.tickEliteGlow(dt);
  window.updatePackBar && window.updatePackBar();""")

rep('clear',
"""function clearRift(){""",
"""function clearRift(){
  try{ if(window.PACKBAR_RESET) PACKBAR_RESET(); }catch(e){ window.ahErr&&window.ahErr(e,'clearRift:packbar'); }""")

rep('reset',
"""window.updatePackBar=updatePackBar;""",
"""window.updatePackBar=updatePackBar;
/* the bar describes one rift's fight; it must not survive the rift */
window.PACKBAR_RESET=function(){
  PACKBAR.id=null; PACKBAR.hideAt=0;
  if(PACKBAR.el) PACKBAR.el.classList.remove('on');
};""")

CSS = """
/* ---- the elite pack bar (v194) -------------------------------------------
   Top-centre, compact, information-first. No glow, no pulse, no screen-wide
   effects — it competes with nothing and reads in a glance. */
#packBar{
  position:fixed; left:50%; top:14px; transform:translateX(-50%);
  z-index:40; pointer-events:none;
  width:min(360px, 42vw); padding:7px 12px 8px;
  opacity:0; transition:opacity .22s ease;
  background:linear-gradient(180deg,rgba(14,16,20,.90),rgba(7,8,11,.94));
  border:1px solid #3a3f4a;
  box-shadow:0 3px 14px rgba(0,0,0,.6), inset 0 0 0 1px rgba(0,0,0,.7);
}
#packBar.on{ opacity:1 }
#packBar .pbName{
  font:600 12px "Trebuchet MS",sans-serif; letter-spacing:.12em;
  text-transform:uppercase; text-align:center; color:#c9d2e0;
  text-shadow:0 1px 3px #000; margin-bottom:5px; white-space:nowrap;
  overflow:hidden; text-overflow:ellipsis;
}
#packBar .pbTrack{
  height:9px; background:#08090c; border:1px solid #000;
  box-shadow:inset 0 1px 3px rgba(0,0,0,.9); overflow:hidden;
}
#packBar .pbFill{
  display:block; height:100%; width:0%;
  transition:width .18s linear;
}
#packBar .pbMods{
  display:flex; flex-wrap:wrap; gap:4px; justify-content:center; margin-top:6px;
}
#packBar .pbMod{
  font:600 9px "Trebuchet MS",sans-serif; letter-spacing:.06em;
  padding:2px 6px; color:#aab3c2;
  background:rgba(255,255,255,.045); border:1px solid #333a45;
}
#packBar .pbMods:empty{ display:none }
/* blue for magic, gold for rare — the same two colours as the ground rings */
#packBar.magic{ border-color:#3c5c8f }
#packBar.magic .pbName{ color:#9dc0f0 }
#packBar.magic .pbFill{ background:linear-gradient(180deg,#7db0ff,#3f6fc4 60%,#28497f) }
#packBar.magic .pbMod{ border-color:#33455f; color:#9fb6d4 }
#packBar.rare{ border-color:#8a6f31 }
#packBar.rare .pbName{ color:#f0d488 }
#packBar.rare .pbFill{ background:linear-gradient(180deg,#ffd97a,#d0a02f 60%,#8a6a1c) }
#packBar.rare .pbMod{ border-color:#5a4a26; color:#d3bf90 }
"""
rep('css', "\n</style>", "\n" + CSS + "\n</style>")

open('work.html','w',encoding='utf-8').write(src)
print('applied:', hits)
