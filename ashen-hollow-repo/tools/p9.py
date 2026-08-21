import re
src = open('work.html', encoding='utf-8').read()
hits = {}
def rep(name, old, new, count=1):
    global src
    n = src.count(old)
    assert n == count, f"{name}: expected {count}, found {n}"
    src = src.replace(old, new); hits[name] = n

# ---------------------------------------------------------------- the panel
rep('card-labels',
"""      _card('rtNeph','NEPHALEM','neph', window.__riftKind==='neph', false, null)+
      _card('rtGreater','GREATER','greater', window.__riftKind==='greater', _keys<1, _keys)+""",
"""      _card('rtNeph','RIFT','neph', window.__riftKind==='neph', false, null)+
      _card('rtGreater','CHALLENGE','greater', window.__riftKind==='greater', _keys<1, _keys)+""")

rep('panel-title',
"""  document.getElementById('winTitle').textContent='Nephalem Rifts';""",
"""  document.getElementById('winTitle').textContent='Rifts';""")

rep('legacy-panel',
"""    '<div class="stcol"><h3>Greater Rift</h3>'+""",
"""    '<div class="stcol"><h3>Challenge Rift</h3>'+""")

rep('legacy-keys',
"""  body.innerHTML += '<div style="margin-top:10px;opacity:.8">Greater Rift Keys: <b>'+""",
"""  body.innerHTML += '<div style="margin-top:10px;opacity:.8">Challenge Keys: <b>'+""")

# ---------------------------------------------------------------- the HUD bar
rep('hud',
"""    (GR.active ? 'GREATER RIFT '+GR.tier
               : 'NEPHALEM RIFT '+RIFT.tier+'  ·  area '+RIFT_CFG.areaLevel(RIFT.tier))+""",
"""    (GR.active ? 'CHALLENGE RIFT '+GR.tier
               : 'RIFT '+RIFT.tier+'  ·  area '+RIFT_CFG.areaLevel(RIFT.tier))+""")

# ---------------------------------------------------------------- the key item
rep('key-currency',
""" {id:'cu_grkey',  n:'Greater Rift Key', grad:'gGem',   shape:'shard', max:99,
  use:'Opens a Greater Rift', target:null}""",
""" {id:'cu_grkey',  n:'Challenge Key',    grad:'gGem',   shape:'shard', max:99,
  use:'Opens a Challenge Rift', target:null}""")

rep('key-meta',
"""  cu_grkey: {n:'Greater Rift Key', d:'Opens a Greater Rift'},""",
"""  cu_grkey: {n:'Challenge Key', d:'Opens a Challenge Rift'},""")

# every remaining player-facing string. The ID `cu_grkey`, the `GR` state and
# `enterGreaterRift` keep their names — renaming internals is churn with no
# player-visible benefit, and a save carries ids, not labels.
SWAPS = [
  ("'Greater Rift Keys are spent at the Rift Pillar, not on items.'",
   "'Challenge Keys are spent at the Rift Pillar, not on items.'"),
  ("'You need a Greater Rift Key.'", "'You need a Challenge Key.'", 2),
  ("'No Greater Rift Key.'", "'No Challenge Key.'"),
  ("'Greater Rift '+GR.tier+' — 15:00'", "'Challenge Rift '+GR.tier+' — 15:00'"),
  ("'Greater Rift cleared — '", "'Challenge Rift cleared — '"),
  ("'Greater Rift failed — no upgrade attempts.'", "'Challenge Rift failed — no upgrade attempts.'"),
  ("'Out of Greater Rift Keys — auto-spend stopped.'", "'Out of Challenge Keys — auto-spend stopped.'", 2),
  ("'Rift complete'+(gotKey?' — Greater Rift Key':'')", "'Rift complete'+(gotKey?' — Challenge Key':'')"),
  ("(wasGreater?'.':' and a Greater Rift Key.')", "(wasGreater?'.':' and a Challenge Key.')"),
  ("'> Auto-spend Greater Rift Keys while any remain</label>'",
   "'> Auto-spend Challenge Keys while any remain</label>'"),
  ("'Gem levels come from Greater Rift upgrade attempts.",
   "'Gem levels come from Challenge Rift upgrade attempts."),
  ("'Levels come from Greater Rift upgrade attempts.",
   "'Levels come from Challenge Rift upgrade attempts."),
  ("'Not implemented yet. This is where Greater Rift clears will rank &mdash; '",
   "'Not implemented yet. This is where Challenge Rift clears will rank &mdash; '"),
]
for i,s in enumerate(SWAPS):
    o, n = s[0], s[1]
    cnt = s[2] if len(s) > 2 else 1
    rep('swap%d'%i, o, n, cnt)

# ---------------------------------------------------------------- the art hooks
rep('art',
"""  neph:    'https://raw.githubusercontent.com/Graphic37/ARPG-/main/rift-sigil-nephalem.png',
  greater: 'https://raw.githubusercontent.com/Graphic37/ARPG-/main/rift-sigil-greater.png',""",
"""  neph:    'https://raw.githubusercontent.com/Graphic37/ARPG-/main/rift-sigil-standard.png',
  greater: 'https://raw.githubusercontent.com/Graphic37/ARPG-/main/rift-sigil-challenge.png',""")

# ------------------------------------------- rename keys already in a save
rep('key-migration',
"""/* ---- 11. loot filter hooks ---------------------------------------------- */""",
"""/* A KEY ALREADY IN A SAVE KEEPS THE NAME IT WAS MADE WITH. `makeCurrency`
   copies the label at creation time, so renaming the CURRENCY row alone would
   leave old stacks reading "Greater Rift Key" beside new ones reading
   "Challenge Key" — the same item, two names, in the same tab. */
setTimeout(function(){
  try{
    let n=0;
    for(const k in CONT){
      (CONT[k].items||[]).forEach(it=>{
        if(it && it.baseId==='cu_grkey' && it.name!=='Challenge Key'){
          it.name='Challenge Key'; it.baseName='Challenge Key';
          it.use='Opens a Challenge Rift'; n++;
        }
      });
    }
    if(n) try{ refreshAll(); }catch(e){ window.ahErr&&window.ahErr(e,'keyRename:refresh'); }
  }catch(e){ window.ahErr&&window.ahErr(e,'keyRename'); }
}, 1500);

/* ---- 11. loot filter hooks ---------------------------------------------- */""")

open('work.html','w',encoding='utf-8').write(src)
print('applied:', hits)
left = re.findall(r'Greater Rift|Nephalem|NEPHALEM', src)
print('remaining mentions (comments included):', len(left))
