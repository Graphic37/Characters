src = open('work.html', encoding='utf-8').read()
hits = {}
def rep(name, old, new, count=1):
    global src
    n = src.count(old)
    assert n == count, f"{name}: expected {count}, found {n}"
    src = src.replace(old, new); hits[name] = n

# ⚠ ONE DOOR IS NOT ENOUGH FOR A SCREEN HE CANNOT FIND.
# The board has existed since v229 and is wired to Veyra's E, and I can find no
# fault in that path — which is exactly why it needs more than one entrance.
# A screen reachable only by standing in the right spot is a screen that looks
# missing whenever the spot is wrong, and there is nothing on screen that names
# the key or the place.
rep('hotkey',
"""window.questBoardClose=function(){""",
"""/* J opens the board from anywhere, and the tracker is clickable — a contract
   screen is an INSPECT screen, so needing to walk to an NPC to READ it is a
   restriction with no purpose. Accepting and turning in are still gated to
   Veyra (v220/v227); only looking is free. */
window.questBoardToggle=function(){
  try{
    const el=document.getElementById('questBoard2');
    if(el && el.classList.contains('on')){ questBoardClose(); return; }
    if(typeof window.questPanel==='function') questPanel();
    else console.warn('[quest] the board is not available on this build');
  }catch(e){ window.ahErr&&window.ahErr(e,'questBoardToggle'); }
};
addEventListener('keydown', e=>{
  if(e.key!=='j' && e.key!=='J') return;
  const t=e.target;
  if(t && (/INPUT|TEXTAREA|SELECT/.test(t.tagName||'') || t.isContentEditable)) return;
  if(e.ctrlKey || e.metaKey || e.altKey) return;
  e.preventDefault();
  window.questBoardToggle();
});

window.questBoardClose=function(){""")

# the small tracker becomes the other door
rep('tracker',
"""    const el=questEl();
    const q=QUESTS.active;""",
"""    const el=questEl();
    /* the tracker is the second door: click it to open the full board */
    if(!el.__wired){
      el.__wired=1;
      el.style.pointerEvents='auto';
      el.style.cursor='pointer';
      el.title='Open the contract board  (J)';
      el.addEventListener('click', ()=>{ window.questBoardToggle && questBoardToggle(); });
    }
    const q=QUESTS.active;""")

# and say so on the tracker itself, so the key is discoverable
rep('foot',
"""      '<div class="qFoot">'+(done ? 'Return to Veyra'
                                  : ('Reward: '+q.coin+' Vaulted Coin'))+'</div>';""",
"""      '<div class="qFoot">'+(done ? 'Return to Veyra'
                                  : ('Reward: '+q.coin+' Vaulted Coin'))+
        '<span class="qKey">J</span></div>';""")

rep('idle-foot',
"""      el.innerHTML='<div class="qTitle idle">No Contract</div>'+
                   '<div class="qLine">See Veyra in town</div>';""",
"""      el.innerHTML='<div class="qTitle idle">No Contract</div>'+
                   '<div class="qLine">See Veyra in town</div>'+
                   '<div class="qFoot">Contract board <span class="qKey">J</span></div>';""")

CSS = """
/* the tracker names its own hotkey — a screen nobody can find is a screen
   that does not exist (v235) */
#questBoard{ pointer-events:auto }
#questBoard .qKey{
  display:inline-block; margin-left:7px; padding:1px 6px;
  font:700 9.5px "Trebuchet MS",sans-serif; letter-spacing:.08em;
  color:#cfc7a8; border:1px solid #4a4335; background:rgba(0,0,0,.5);
}
#questBoard:hover .qTitle{ color:#8fc7ff }
#questBoard:hover .qKey{ border-color:#c8a24a; color:#f0e3c2 }
"""
rep('css', "\n</style>", "\n" + CSS + "\n</style>")

open('work.html','w',encoding='utf-8').write(src)
print('applied:', hits)
