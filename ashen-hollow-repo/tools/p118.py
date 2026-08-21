import json
src = open('work.html', encoding='utf-8').read()
hits = {}
def rep(name, old, new, count=1):
    global src
    n = src.count(old)
    assert n == count, f"{name}: expected {count}, found {n}"
    src = src.replace(old, new); hits[name] = n

# ============================================ 1. A DOOR, NOT A BOX
rep('vault',
"""  stash:           { label:'Stash \\u00b7 The Vault', station:1, make:(x,z)=>stash(x,z) },""",
"""  stash:           { label:'Stash \\u00b7 Chest (legacy prop)', station:1, make:(x,z)=>stash(x,z) },
  /* ⚠ THE VAULT IS A DOOR, NOT A PROP. `stash()` builds a chest — a wooden box
     on the ground — and he wants the banking tied to the stone doorway that is
     already part of the authored town. So this places NO geometry at all: it
     registers the interaction only, in front of the door's steps.
     Nothing to draw means nothing to collide with, nothing to walk into, and
     nothing that can drift out of alignment with the art. */
  vault_door:      { label:'The Vault (door anchor)', station:1,
    make:(x,z)=>vaultDoorAnchor(x,z) },""")

rep('anchor',
"""/* ---- the ring of ruin around the town ------------------------------------ */""",
"""/* ===========================================================================
   THE VAULT DOOR  (v239)
   ---------------------------------------------------------------------------
   An interaction with no model. The door is authored town geometry; this only
   says WHERE the player has to stand for it, so the prompt appears at the
   doorway rather than over a crate someone dropped nearby.

   ⚠ THE ANCHOR IS A NAMED CONSTANT because it is the one number here that is
   a judgement about art I cannot see. `ahNear()` prints the authored objects
   around the player, so the exact spot is one paste away rather than a guess.
   ========================================================================= */
const VAULT_ANCHOR = { x:-4.0, z:2.0, r:3.0 };
function vaultDoorAnchor(x, z){
  /* a bare group: it owns the station, so `removePlaced` can still clean up */
  const g=new THREE.Group();
  g.position.set(x, 0, z);
  scene.add(g);
  stations.push({ name:'Stash', prompt:'Open Vault',
    key2:'F', prompt2:'Deposit all',
    pos:new THREE.Vector3(x, 1.25, z), r:VAULT_ANCHOR.r,
    title:'The Vault',
    body:'Everything you were not willing to lose. It will still be here when '+
         'you come back.',
    acts:['Open Vault'] });
  return g;
}
window.vaultDoorAnchor=vaultDoorAnchor;

/* ---- where am I? ---------------------------------------------------------
   Prints the nearest AUTHORED objects to the hero, with names and coordinates.
   I cannot see the town, so this is how a "that door there" becomes a number
   without another round of me guessing from a screenshot. */
window.ahNear=function(n){
  try{
    const P=AH_WORLD.player.position;
    const objs=(AUTHORED_TOWN.objects||[]).map(o=>{
      const p=o.position||[0,0,0];
      return { asset:String(o.assetPath||'').replace(/.*\\//,''),
               x:+p[0].toFixed(2), z:+p[2].toFixed(2),
               d:+Math.hypot(p[0]-P.x, p[2]-P.z).toFixed(2) };
    }).sort((a,b)=>a.d-b.d).slice(0, n||12);
    console.log('[near] hero at '+P.x.toFixed(2)+', '+P.z.toFixed(2));
    console.table(objs);
    const st=(stations||[]).map(s=>({ station:s.name,
      x:+s.pos.x.toFixed(2), z:+s.pos.z.toFixed(2),
      d:+Math.hypot(s.pos.x-P.x, s.pos.z-P.z).toFixed(2) })).sort((a,b)=>a.d-b.d);
    console.table(st);
    return objs;
  }catch(e){ console.warn('[near] '+(e&&e.message)); return []; }
};

/* ---- the ring of ruin around the town ------------------------------------ */""")

open('work.html','w',encoding='utf-8').write(src)

# swap the layout row: the chest prop out, the door anchor in
i=src.index('const DEFAULT_TOWN_LAYOUT=')
blob=src[i+len('const DEFAULT_TOWN_LAYOUT='):]
d=0; end=0
for k,ch in enumerate(blob):
    if ch=='{': d+=1
    elif ch=='}':
        d-=1
        if d==0: end=k+1; break
raw=blob[:end]
lay=json.loads(raw)
before=len(lay['placed'])
lay['placed']=[p for p in lay['placed'] if p['prefab']!='stash']
lay['placed'].append({"prefab":"vault_door","p":[-4.0,0,2.0],"r":[0,0,0],"s":[1,1,1]})
src=src.replace(raw, json.dumps(lay, separators=(', ', ': ')), 1)
src=src.replace("const ED_KEY='ashenHollowEdits_v43_layout_20260820_vaultgate';",
                "/* v239: the chest prop was replaced by a geometry-free door anchor */\n"
                "const ED_KEY='ashenHollowEdits_v44_layout_20260820_vaultdoor';")
open('work.html','w',encoding='utf-8').write(src)
print('applied:', hits, '| layout rows', before, '->', len(lay['placed']))
