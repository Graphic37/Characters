src = open('work.html', encoding='utf-8').read()
hits = {}
def rep(name, old, new, count=1):
    global src
    n = src.count(old)
    assert n == count, f"{name}: expected {count}, found {n}"
    src = src.replace(old, new); hits[name] = n

rep('setter',
"""window.vaultDoorAnchor=vaultDoorAnchor;""",
"""window.vaultDoorAnchor=vaultDoorAnchor;

/* ===========================================================================
   PLACE THE VAULT WHERE YOU ARE STANDING  —  `ahSetVault()`
   ---------------------------------------------------------------------------
   ⚠ I HAVE GUESSED THIS TWICE AND BEEN WRONG TWICE. (-4, 2) has no building
   within 7.6m and no authored geometry within 8m — it is open plaza. I cannot
   see the town, and "the square building's door" is not something the layout
   data names: the buildings are FBX models loaded by filename, so the door is
   inside the mesh where no code of mine can find it.
   So stop guessing. Stand in the doorway, run `ahSetVault()`, and the station
   moves there and STAYS there — persisted, so a reload keeps it.
   `ahSetVault(x, z)` also accepts explicit coordinates.
   ========================================================================= */
const VAULT_KEY='ashenVaultAnchor_v1';
window.ahSetVault=function(x, z){
  try{
    if(x===undefined){
      const P=AH_WORLD.player.position;
      x=+P.x.toFixed(2); z=+P.z.toFixed(2);
    }
    const st=(stations||[]).filter(s=>s.name==='Stash')[0];
    if(!st){ console.warn('[vault] no vault station exists to move'); return null; }
    st.pos.x=x; st.pos.z=z;
    localStorage.setItem(VAULT_KEY, JSON.stringify({x:x, z:z}));
    console.log('[vault] moved to '+x+', '+z+' — saved, reload-safe');
    try{ toast('Vault moved here'); }catch(e){}
    return {x:x, z:z};
  }catch(e){ console.warn('[vault] '+(e&&e.message)); return null; }
};
window.ahVaultReset=function(){
  try{ localStorage.removeItem(VAULT_KEY); }catch(e){}
  console.log('[vault] custom position cleared — reload to use the default');
};
/* apply a saved position the moment the station is built, so it is never
   briefly in the wrong place */
function vaultApplySaved(st){
  try{
    const raw=localStorage.getItem(VAULT_KEY);
    if(!raw) return;
    const d=JSON.parse(raw);
    if(typeof d.x==='number' && typeof d.z==='number'){ st.pos.x=d.x; st.pos.z=d.z; }
  }catch(e){}
}""")

rep('apply',
"""    acts:['Open Vault'] });
  return g;""",
"""    acts:['Open Vault'] });
  vaultApplySaved(stations[stations.length-1]);
  return g;""")

open('work.html','w',encoding='utf-8').write(src)
print('applied:', hits)
