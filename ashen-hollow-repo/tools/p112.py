src = open('work.html', encoding='utf-8').read()
hits = {}
def rep(name, old, new, count=1):
    global src
    n = src.count(old)
    assert n == count, f"{name}: expected {count}, found {n}"
    src = src.replace(old, new); hits[name] = n

# ============================================ 1. THE BOARD IS VEYRA'S
rep('unglobal',
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

""",
"""/* ⚠ THE J HOTKEY AND THE CLICKABLE TRACKER ARE GONE (v236). I added them in
   v235 to solve "I cannot find the board", but the fix weakened the thing it
   was meant to serve: the board is Veyra's interaction UI, and a screen you
   can summon from anywhere is not attached to anyone. Accepting and turning in
   already require standing at her, so the board belongs there too — otherwise
   the town loop is a formality around a menu.
   A global read-only quest JOURNAL is a different screen and can exist later
   without this cost; it is not this one. */

""")

rep('tracker',
"""    const el=questEl();
    /* the tracker is the second door: click it to open the full board */
    if(!el.__wired){
      el.__wired=1;
      el.style.pointerEvents='auto';
      el.style.cursor='pointer';
      el.title='Open the contract board  (J)';
      el.addEventListener('click', ()=>{ window.questBoardToggle && questBoardToggle(); });
    }
    const q=QUESTS.active;""",
"""    /* the tracker is a TRACKER. It reports progress during play and opens
       nothing — the board is Veyra's. */
    const el=questEl();
    const q=QUESTS.active;""")

rep('foot',
"""      '<div class="qFoot">'+(done ? 'Return to Veyra'
                                  : ('Reward: '+q.coin+' Vaulted Coin'))+
        '<span class="qKey">J</span></div>';""",
"""      '<div class="qFoot">'+(done ? 'Return to Veyra'
                                  : ('Reward: '+q.coin+' Vaulted Coin'))+'</div>';""")

rep('idle',
"""      el.innerHTML='<div class="qTitle idle">No Contract</div>'+
                   '<div class="qLine">See Veyra in town</div>'+
                   '<div class="qFoot">Contract board <span class="qKey">J</span></div>';""",
"""      el.innerHTML='<div class="qTitle idle">No Contract</div>'+
                   '<div class="qLine">See Veyra in town</div>';""")

rep('css',
"""/* the tracker names its own hotkey — a screen nobody can find is a screen
   that does not exist (v235) */
#questBoard{ pointer-events:auto }
#questBoard .qKey{
  display:inline-block; margin-left:7px; padding:1px 6px;
  font:700 9.5px "Trebuchet MS",sans-serif; letter-spacing:.08em;
  color:#cfc7a8; border:1px solid #4a4335; background:rgba(0,0,0,.5);
}
#questBoard:hover .qTitle{ color:#8fc7ff }
#questBoard:hover .qKey{ border-color:#c8a24a; color:#f0e3c2 }
""",
"""/* the tracker is display-only again (v236) — it reports, it does not open */
#questBoard{ pointer-events:none }
""")

open('work.html','w',encoding='utf-8').write(src)
print('applied:', hits)
