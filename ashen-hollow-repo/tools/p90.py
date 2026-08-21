src = open('work.html', encoding='utf-8').read()
hits = {}
def rep(name, old, new, count=1):
    global src
    n = src.count(old)
    assert n == count, f"{name}: expected {count}, found {n}"
    src = src.replace(old, new); hits[name] = n

# ============================================ 1. THE VAULT DOOR IS THE BANK
rep('gate-fn',
"""/* Is the hero standing at Veyra's station? */
/* NOTE: this lives in the UI script block, which cannot see the world module's
   'stations' or 'player' bindings -- everything goes through AH_WORLD. Reaching
   for the bare identifiers silently threw and made the gate always refuse. */
function veyraStation(){
  try{ return (AH_WORLD.stations||[]).find(s=>s.name==='Veyra')||null; }catch(e){ return null; }
}""",
"""/* Is the hero standing at the vault door? */
/* ⚠ THE BANK MOVED FROM VEYRA TO THE STASH DOORWAY (v222). The archway IS the
   vault — putting the deposit on an NPC when there is a literal vault door in
   the town was the odd arrangement, and it left Veyra doing two unrelated jobs.
   NOTE: this lives in the UI script block, which cannot see the world module's
   'stations' or 'player' bindings -- everything goes through AH_WORLD. Reaching
   for the bare identifiers silently threw and made the gate always refuse. */
function veyraStation(){
  try{ return (AH_WORLD.stations||[]).find(s=>s.name==='Stash')||null; }catch(e){ return null; }
}""")

rep('gate-r',
"""  return Math.hypot(st.pos.x-P.x, st.pos.z-P.z) <= ((st.r||3.6)+0.6);""",
"""  /* the stash station has a tighter radius than Veyra's did; read its OWN */
  return Math.hypot(st.pos.x-P.x, st.pos.z-P.z) <= ((st.r||2.8)+0.9);""")

rep('toast',
"""  /* the stash lives with Veyra: depositing from anywhere made her pointless */
  if(!nearVeyra()){ toast('Bank at Veyra'); return; }""",
"""  /* depositing from anywhere would make the vault pointless */
  if(!nearVeyra()){ toast('Bank at the Vault'); return; }""")

# the station itself advertises both keys
rep('station',
"""stations.push({name:'Stash', prompt:'Open Stash', pos:(([wx,wz])=>new THREE.Vector3(wx,0.95,wz))(W(0,0)), r:2.8,
    title:'Stash', body:'Everything you were not willing to lose. It will still be here when you come back.',
    acts:['Open Stash']});""",
"""stations.push({name:'Stash', prompt:'Open Vault', key2:'F', prompt2:'Deposit all',
    pos:(([wx,wz])=>new THREE.Vector3(wx,0.95,wz))(W(0,0)), r:2.8,
    title:'The Vault', body:'Everything you were not willing to lose. It will still be here when you come back.',
    acts:['Open Vault']});""")

# Veyra keeps contracts only
rep('veyra',
"""stations.push({name:'Veyra', prompt:'Contracts', key2:'F', prompt2:'Bank findings',""",
"""stations.push({name:'Veyra', prompt:'Contracts',""")

rep('veyra-role',
"""              url:MODELS+'Veyra.glb',   fitHeight:1.74, yaw:0, face: Math.PI      },""",
"""              url:MODELS+'Veyra.glb',   fitHeight:1.74, yaw:0, face: Math.PI      },""",1)

rep('veyra-title',
"""  occultist:{ name:'Veyra',   title:'Veyra the Pale Keeper',  role:'Contracts & Vault',""",
"""  occultist:{ name:'Veyra',   title:'Veyra the Pale Keeper',  role:'Contracts',""")

rep('veyra-acts',
"""    body:'She keeps the vault, and a ledger of things that need killing. '+
         'Bring her a finished contract and she pays in coin the Pale still honours.',
    acts:['Contracts','Bank']});""",
"""    body:'She keeps a ledger of things that need killing, and pays in coin the '+
         'Pale still honours. Bring her a finished contract.',
    acts:['Contracts']});""")

# ============================================ 2. BIGGER TOOLTIPS, AGAIN
CSS = """
/* ---- tooltip legibility, pass two (v222) ---------------------------------
   v217 went 306 -> 356px with 13px affixes and he still wants more. Same rule
   as before: WIDTH FIRST, so raising the type does not push affixes onto a
   second line. 356 -> 400px buys the room for 14.5px body text. */
body[data-skin="forged"] #tipwrap .tip{ width:400px !important }
body[data-skin="forged"] #tipwrap .tip-name{ font-size:18.5px !important }
body[data-skin="forged"] #tipwrap .tip-base{ font-size:14px !important }
#tipwrap .tip .prop{ font-size:14.5px }
#tipwrap .tip .mod{ font-size:14.5px; line-height:1.52 }
#tipwrap .tip .lo{ font-size:12.5px }
#tipwrap .tip .runeline{ font-size:14.5px; line-height:1.48 }
#tipwrap .tip .runeline.empty{ font-size:13px }
#tipwrap .tip hr{ margin:8px 0 }
"""
rep('css', "\n</style>", "\n" + CSS + "\n</style>")

open('work.html','w',encoding='utf-8').write(src)
print('applied:', hits)
