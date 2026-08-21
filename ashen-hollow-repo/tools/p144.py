import json
src = open('work.html', encoding='utf-8').read()
hits = {}
def rep(name, old, new, count=1):
    global src
    n = src.count(old)
    assert n == count, f"{name}: expected {count}, found {n}"
    src = src.replace(old, new); hits[name] = n

# ⚠ HIS MEASUREMENT, NOT MY GUESS. He stood in the doorway and ran
# ahSetVault(): -7.74, -1.68. That is 4.1m from `bld_house3`, so the vault door
# belongs to that building — the identification I could not make from the
# layout data, because the door lives inside an FBX mesh.
# Baking it in as the DEFAULT so it is not hostage to one browser's
# localStorage: a cleared save, another machine or a fresh install would
# otherwise land back on my wrong (-4, 2).
rep('anchor',
"""const VAULT_ANCHOR = { x:-4.0, z:2.0, r:3.0 };""",
"""/* Measured in-game by standing in the doorway (`ahSetVault()`), not guessed.
   ⚠ RADIUS 2.2, NOT 3.0: Veyra stands 2.95m away with a 3.2m radius, so a
   wide vault circle would swallow the approach to her and the proximity
   picker — which takes the NEAREST station — would hand back the wrong prompt
   along the whole path between them. A tight vault circle keeps the doorway
   unambiguous while leaving her reachable everywhere else.
   `ahSetVault()` still overrides this per save. */
const VAULT_ANCHOR = { x:-7.74, z:-1.68, r:2.2 };""")

open('work.html','w',encoding='utf-8').write(src)

# the layout row must move too, or the anchor spawns at the old spot
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
moved=0
for p in lay['placed']:
    if p['prefab']=='vault_door':
        p['p']=[-7.74, 0, -1.68]; moved+=1
src=src.replace(raw, json.dumps(lay, separators=(', ', ': ')), 1)
open('work.html','w',encoding='utf-8').write(src)
print('applied:', hits, '| layout rows moved:', moved)
