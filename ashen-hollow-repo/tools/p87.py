src = open('work.html', encoding='utf-8').read()
hits = {}
def rep(name, old, new, count=1):
    global src
    n = src.count(old)
    assert n == count, f"{name}: expected {count}, found {n}"
    src = src.replace(old, new); hits[name] = n

# ⚠ the layout is CACHED IN localStorage under ED_KEY, so a change to the
# DEFAULT is invisible to anyone who has one saved. The key is already
# date-versioned — that is the established way to publish a new default.
rep('edkey',
"""const ED_KEY='ashenHollowEdits_v41_layout_20260817_110652_cheststash';""",
"""/* bumped v220: the default layout changed (four trees removed from the smith),
   and a saved layout under the old key would keep the old trees forever */
const ED_KEY='ashenHollowEdits_v42_layout_20260820_smithclear';""")

# ============================================ 1. VEYRA IS THE QUEST GIVER
rep('dispatch',
"""  if(nearStation.name==='Veyra'){ winOpen=true; window.garrickPanel('craft'); return; }""",
"""  /* ⚠ VEYRA IS THE THIRD NPC AND THE QUEST GIVER — his original brief, which I
     misread by adding a fourth. Crafting is not lost: it lives in Garrick's
     panel and is still reachable from him, which is where the tabs actually
     are. Her F-key banking is a separate binding and is untouched. */
  if(nearStation.name==='Veyra'){ winOpen=true; window.questPanel(); return; }""")

rep('adenah-dispatch',
"""  if(nearStation.name==='Adenah'){ winOpen=true; window.adenahPanel(); return; }
""", "")

rep('adenah-station',
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
""", "")

rep('adenah-npc',
"""  /* ⚠ NO MODEL OF HER OWN — she reuses Mara's glb. Adding a fourth download for
     a quest-giver would cost a megabyte for a character who stands still; the
     procedural body underneath is what differs, and the plate names her. */
  curio    :{ name:'Adenah',  title:'Adenah the Curio Vendor', role:'Contracts',
              url:MODELS+'Mara.glb',    fitHeight:1.68, yaw:0, face: Math.PI*0.5  }
};""",
"""};""")

rep('veyra-role',
"""  occultist:{ name:'Veyra',   title:'Veyra the Pale Keeper',  role:'Banker',""",
"""  /* ⚠ THREE NPCs, NOT FOUR. Veyra banks AND takes contracts — the town stays
     Garrick / Mara / Veyra, with the Rift pillar and stash as objects. */
  occultist:{ name:'Veyra',   title:'Veyra the Pale Keeper',  role:'Contracts & Vault',""")

rep('veyra-station',
"""    title:'Veyra, Occultist',
    body:'Reagents, patience and a little risk. She will reshape what you already carry — for a price you may not like.',
    acts:['Enchant','Reroll','Socket','Craft']});""",
"""    title:'Veyra, the Pale Keeper',
    body:'She keeps the vault, and a ledger of things that need killing. '+
         'Bring her a finished contract and she pays in coin the Pale still honours.',
    acts:['Contracts','Bank']});""")

rep('veyra-prompt',
"""stations.push({name:'Veyra', prompt:'', noE:true, key2:'F', prompt2:'Bank findings',""",
"""stations.push({name:'Veyra', prompt:'Contracts', key2:'F', prompt2:'Bank findings',""")

# ============================================ 2. THE GATE HE ASKED FOR
rep('gate',
"""function questAccept(){
  if(QUESTS.active) return { ok:false, why:'busy' };""",
"""/* ⚠ HIS CATCH, AND IT IS A REAL HOLE. `questAccept`/`questTurnIn` were plain
   globals — anything that could call them (a console, a stray binding, a future
   panel opened from anywhere) would work MID-RIFT, which defeats the entire
   point of the manual return. The requirement belongs on the FUNCTION, not on
   the button that happens to call it today. */
function questAtVeyra(){
  try{
    if(typeof WORLD!=='undefined' && WORLD.mode!=='TOWN') return false;
    if(window.RIFT && RIFT.active) return false;
    const st=window.nearStation;
    return !!(st && st.name==='Veyra');
  }catch(e){ return false; }
}
window.questAtVeyra=questAtVeyra;

function questAccept(){
  if(!questAtVeyra()) return { ok:false, why:'away' };
  if(QUESTS.active) return { ok:false, why:'busy' };""")

rep('gate2',
"""function questTurnIn(){
  const q=QUESTS.active;
  if(!q) return { ok:false, why:'none' };""",
"""function questTurnIn(){
  if(!questAtVeyra()) return { ok:false, why:'away' };
  const q=QUESTS.active;
  if(!q) return { ok:false, why:'none' };""")

# ============================================ 3. THE NAMEPLATE GOES
rep('nameplate',
"""<div id="nameplate">
  <div class="nm">ASHVEIL</div>
  <div class="lv">Warden of the Pale &middot; Level <span id="npLvl">42</span></div>
</div>
""",
"""<!-- the ASHVEIL / Warden-of-the-Pale plate was removed in v220: it stated the
     hero's own name and level, which the character sheet already owns, and it
     occupied the corner the quest tracker and minimap now use. -->
""")

open('work.html','w',encoding='utf-8').write(src)
print('applied:', hits)
