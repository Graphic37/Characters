src = open('work.html', encoding='utf-8').read()
hits = {}
def rep(name, old, new, count=1):
    global src
    n = src.count(old)
    assert n == count, f"{name}: expected {count}, found {n}"
    src = src.replace(old, new); hits[name] = n

rep('legacy',
"""  /* hidden backward-compatible IDs for old v24 editor saves */
  blacksmith:{ label:'Legacy · Garrick + Forge', station:1, make:(x,z)=>blacksmith(x,z) },
  vendor:    { label:'Legacy · Mara + Stall', station:1, make:(x,z)=>vendor(x,z) },
  crafting:  { label:'Legacy · Veyra + Lab', station:1, make:(x,z)=>crafting(x,z) },""",
"""  /* ⚠ LEGACY IDS FOR OLD v24 EDITOR SAVES — now COMPOSED, not duplicated.
     These used to call the building bare, which spawned a second NPC and
     pushed a second station. They now build the scenery and then call the ONE
     canonical factory, so an old save gets the same result through the same
     code path as the authored town. */
  blacksmith:{ label:'Legacy · Garrick + Forge', station:1,
    make:(x,z)=>{ const g=blacksmith(x,z,{npc:false,station:false});
                  spawnStandaloneNPC('smith',x,z); return g; } },
  vendor:    { label:'Legacy · Mara + Stall', station:1,
    make:(x,z)=>{ const g=vendor(x,z,{npc:false,station:false});
                  spawnStandaloneNPC('merchant',x,z); return g; } },
  crafting:  { label:'Legacy · Veyra + Lab', station:1,
    make:(x,z)=>{ const g=crafting(x,z,{npc:false,station:false});
                  spawnStandaloneNPC('occultist',x,z); return g; } },""")

# ⚠ AND A GUARD: the same station must never be registered twice, whatever
# combination of prefabs a save contains.
rep('dedupe',
"""function spawnPrefab(id, x, z, rotY, scale){
  const def=PREFABS[id];
  if(!def) return null;""",
"""function spawnPrefab(id, x, z, rotY, scale){
  const def=PREFABS[id];
  if(!def) return null;
  /* ⚠ ONE STATION PER NAME. A save holding both `npc_smith` and the legacy
     `blacksmith` would otherwise register two Garricks — which is the bug the
     "three Garricks after two reloads" comment describes, and the shape of the
     whole v220-v237 mess. Recorded before, checked after. */
  const _nameBefore=new Set(stations.map(s=>s.name));""")

rep('dedupe2',
"""  o.userData.ownedStations=stations.slice(sBefore);""",
"""  /* drop any station whose name already existed before this prefab ran */
  for(let i=stations.length-1;i>=sBefore;i--){
    const st=stations[i];
    if(_nameBefore.has(st.name)){
      try{ console.warn('[town] duplicate station "'+st.name+'" from prefab "'+id+
                        '" — ignored'); }catch(e){}
      stations.splice(i,1);
    }
  }
  o.userData.ownedStations=stations.slice(sBefore);""")

open('work.html','w',encoding='utf-8').write(src)
print('applied:', hits)
