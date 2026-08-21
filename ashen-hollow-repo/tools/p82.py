src = open('work.html', encoding='utf-8').read()
hits = {}
def rep(name, old, new, count=1):
    global src
    n = src.count(old)
    assert n == count, f"{name}: expected {count}, found {n}"
    src = src.replace(old, new); hits[name] = n

rep('titles',
"""  smith    :{ name:'Garrick', url:MODELS+'Garrick.glb', fitHeight:1.82, yaw:0, face:-Math.PI*0.88 },
  merchant :{ name:'Mara',    url:MODELS+'Mara.glb',    fitHeight:1.70, yaw:0, face: Math.PI      },
  occultist:{ name:'Veyra',   url:MODELS+'Veyra.glb',   fitHeight:1.74, yaw:0, face: Math.PI      }
};""",
"""  /* `title` is the D3-style epithet and `role` the trade beneath it — the two
     lines his reference shows over an NPC's head. The role was already implied
     by the key; writing it down means the label and the station cannot drift. */
  smith    :{ name:'Garrick', title:'Garrick the Emberhand',  role:'Blacksmith',
              url:MODELS+'Garrick.glb', fitHeight:1.82, yaw:0, face:-Math.PI*0.88 },
  merchant :{ name:'Mara',    title:'Mara of the Long Road',  role:'Merchant',
              url:MODELS+'Mara.glb',    fitHeight:1.70, yaw:0, face: Math.PI      },
  occultist:{ name:'Veyra',   title:'Veyra the Pale Keeper',  role:'Banker',
              url:MODELS+'Veyra.glb',   fitHeight:1.74, yaw:0, face: Math.PI      }
};
window.TOWNSFOLK=TOWNSFOLK;

/* ===========================================================================
   NPC NAME PLATES  (v218)
   ---------------------------------------------------------------------------
   Two lines over each townsfolk's head: the epithet, then the trade. DOM
   rather than sprites — three labels cost nothing, they never scale with
   distance, and they cannot clip through the building behind them.

   ⚠ POSITIONED BY TRANSFORM ONLY, like the elite head plate: moving a label
   must not trigger layout. Town only, and hidden the moment a rift starts. */
const NPCPLATES = { els:{}, wrap:null };
function npcPlateWrap(){
  if(NPCPLATES.wrap && NPCPLATES.wrap.parentNode) return NPCPLATES.wrap;
  const w=document.createElement('div');
  w.id='npcPlates';
  document.body.appendChild(w);
  NPCPLATES.wrap=w;
  return w;
}
function npcPlateFor(key, def){
  if(NPCPLATES.els[key]) return NPCPLATES.els[key];
  const el=document.createElement('div');
  el.className='npcPlate';
  el.innerHTML='<div class="npcName"></div><div class="npcRole"></div>';
  el.querySelector('.npcName').textContent=def.title||def.name;
  el.querySelector('.npcRole').textContent=def.role||'';
  npcPlateWrap().appendChild(el);
  NPCPLATES.els[key]=el;
  return el;
}
function updateNpcPlates(){
  try{
    const inTown = (typeof WORLD!=='undefined') && WORLD.mode==='TOWN';
    const wrap=NPCPLATES.wrap;
    if(!inTown){ if(wrap) wrap.classList.remove('on'); return; }
    npcPlateWrap().classList.add('on');
    const P=(window.AH_WORLD && AH_WORLD.player) ? AH_WORLD.player.position : null;
    for(const key in TOWNSFOLK){
      const def=TOWNSFOLK[key];
      const g=(window.NPC_MESH && NPC_MESH[key]) || null;
      const el=npcPlateFor(key, def);
      if(!g){ el.classList.remove('vis'); continue; }
      /* fade with distance rather than popping: a label that blinks on at a
         hard radius reads as a bug */
      const d=P ? Math.hypot(g.position.x-P.x, g.position.z-P.z) : 0;
      if(d > 26){ el.classList.remove('vis'); continue; }
      const v=new THREE.Vector3(g.position.x, g.position.y+2.15, g.position.z);
      v.project(camera);
      if(v.z>1){ el.classList.remove('vis'); continue; }
      el.style.transform='translate(-50%,-100%) translate('+
        Math.round((v.x*0.5+0.5)*innerWidth)+'px,'+
        Math.round((-v.y*0.5+0.5)*innerHeight)+'px)';
      el.style.opacity = d>20 ? String(1-(d-20)/6) : '1';
      el.classList.add('vis');
    }
  }catch(e){ window.ahErr&&window.ahErr(e,'updateNpcPlates'); }
}
window.updateNpcPlates=updateNpcPlates;""")

CSS = """
/* ---- NPC name plates (v218) ---------------------------------------------- */
#npcPlates{ position:fixed; inset:0; z-index:36; pointer-events:none; display:none }
#npcPlates.on{ display:block }
.npcPlate{
  position:absolute; left:0; top:0; text-align:center; white-space:nowrap;
  opacity:0; transition:opacity .25s ease; will-change:transform;
}
.npcPlate.vis{ opacity:1 }
.npcPlate .npcName{
  font:600 12.5px "Trebuchet MS",sans-serif; letter-spacing:.06em; color:#e8dcc0;
  text-shadow:0 1px 3px #000, 0 0 9px rgba(0,0,0,.95);
}
.npcPlate .npcRole{
  font:11px "Trebuchet MS",sans-serif; letter-spacing:.05em; color:#9aa08e;
  text-shadow:0 1px 3px #000, 0 0 8px rgba(0,0,0,.95); margin-top:1px;
}
"""
rep('css', "\n</style>", "\n" + CSS + "\n</style>")

open('work.html','w',encoding='utf-8').write(src)
print('applied:', hits)
