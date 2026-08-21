src = open('work.html', encoding='utf-8').read()
hits = {}
def rep(name, old, new, count=1):
    global src
    n = src.count(old)
    assert n == count, f"{name}: expected {count}, found {n}"
    src = src.replace(old, new); hits[name] = n

# Adenah stands at Mara's stall — a curio vendor sharing the market makes
# sense, and it means no new building and no new pathing anchor.
rep('place',
"""  if(opts.station!==false) stations.push({name:'Mara', prompt:'Trade with Mara',""",
"""  /* ⚠ SHE SHARES MARA'S STALL. A quest-giver needs to be FINDABLE, and the
     market is where the player already walks; a fourth building would mean new
     collision, a new walk anchor and a new thing for Auto to snag on — for an
     NPC you visit between runs. Offset so the two are not inside each other. */
  if(opts.npc!==false) npc(...W(2.2,-.6), 0x6a4a7a, 'curio', rot);
  if(opts.station!==false) stations.push({name:'Adenah', prompt:'Contracts',
    pos:(([wx,wz])=>new THREE.Vector3(wx,1.3,wz))(W(2.2,-.2)), r:3.4,
    title:'Adenah, Curio Vendor',
    body:'She keeps a ledger of things that need killing, and pays in coin the '+
         'Pale still honours. Bring her a finished contract.',
    acts:['Contracts']});
  if(opts.station!==false) stations.push({name:'Mara', prompt:'Trade with Mara',""")

open('work.html','w',encoding='utf-8').write(src)
print('applied:', hits)
