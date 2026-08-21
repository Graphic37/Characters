src = open('work.html', encoding='utf-8').read()
hits = {}
def rep(name, old, new, count=1):
    global src
    n = src.count(old)
    assert n == count, f"{name}: expected {count}, found {n}"
    src = src.replace(old, new); hits[name] = n

# ============================================ 1. THE KILL HOOK FEEDS IT
rep('kill',
"""  if(!silent && typeof window.onEnemyKilled==='function') window.onEnemyKilled(e);""",
"""  /* quests count EVENTS, not state — a kill is the event */
  try{ if(!silent && window.questNoteKill) questNoteKill(); }
  catch(x){ window.ahErr&&window.ahErr(x,'questNoteKill'); }
  if(!silent && typeof window.onEnemyKilled==='function') window.onEnemyKilled(e);""")

# ============================================ 2. ADENAH, THE THIRD NPC
rep('npc',
"""  occultist:{ name:'Veyra',   title:'Veyra the Pale Keeper',  role:'Banker',
              url:MODELS+'Veyra.glb',   fitHeight:1.74, yaw:0, face: Math.PI      }
};""",
"""  occultist:{ name:'Veyra',   title:'Veyra the Pale Keeper',  role:'Banker',
              url:MODELS+'Veyra.glb',   fitHeight:1.74, yaw:0, face: Math.PI      },
  /* ⚠ NO MODEL OF HER OWN — she reuses Mara's glb. Adding a fourth download for
     a quest-giver would cost a megabyte for a character who stands still; the
     procedural body underneath is what differs, and the plate names her. */
  curio    :{ name:'Adenah',  title:'Adenah the Curio Vendor', role:'Contracts',
              url:MODELS+'Mara.glb',    fitHeight:1.68, yaw:0, face: Math.PI*0.5  }
};""")

open('work.html','w',encoding='utf-8').write(src)
print('applied:', hits)
