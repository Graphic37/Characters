src = open('work.html', encoding='utf-8').read()
hits = {}
def rep(name, old, new, count=1):
    global src
    n = src.count(old)
    assert n == count, f"{name}: expected {count}, found {n}"
    src = src.replace(old, new); hits[name] = n

rep('goldpop',
"""function sellDo(){""",
"""/* ===========================================================================
   GOLD GAINED  (v233)
   ---------------------------------------------------------------------------
   ⚠ A TOAST WAS THE WRONG SHAPE. "Sold 1 item for 8 838 gold" in a bordered
   box is a system message about a transaction; what the player wants is the
   ARPG pickup beat — a coin, a number, a rise, gone. The sentence also told
   him something he already knew (he pressed the button) in words he had to
   read, where a number he can glance at is enough.
   Floats up from the orb row and self-removes; several stack rather than
   replacing each other, so a fast sequence still reads as a sequence.
   ========================================================================= */
function goldPop(amount){
  try{
    if(!amount) return;
    let w=document.getElementById('goldPops');
    if(!w){
      w=document.createElement('div');
      w.id='goldPops';
      document.body.appendChild(w);
    }
    const el=document.createElement('div');
    el.className='gPop';
    el.innerHTML='<i class="gPopCoin"></i><span>+'+fmt(amount)+' Gold</span>';
    w.appendChild(el);
    /* remove on the animation's own end rather than a matching timeout — a
       duplicated duration is a thing that drifts */
    el.addEventListener('animationend', ()=>{ try{ el.remove(); }catch(e){} });
    /* belt and braces: if the animation never fires (reduced motion, a
       backgrounded tab) the node must still go */
    setTimeout(()=>{ try{ el.remove(); }catch(e){} }, 4000);
  }catch(e){ window.ahErr&&window.ahErr(e,'goldPop'); }
}
window.goldPop=goldPop;

function sellDo(){""")

rep('usepop',
"""  S.gold+=gold;
  SELL.marks.clear();
  try{ toast('Sold '+n+' item'+(n>1?'s':'')+' for '+fmt(gold)+' gold'); }catch(e){}""",
"""  S.gold+=gold;
  SELL.marks.clear();
  goldPop(gold);""")

# the single-item salvage path should feel the same, not different
rep('salvpop',
"""  S.gold+=val;
  toast('Salvaged for '+fmt(val)+' gold');""",
"""  S.gold+=val;
  if(window.goldPop) goldPop(val); else toast('Salvaged for '+fmt(val)+' gold');""")

CSS = """
/* ---- gold gained (v233) ---------------------------------------------------
   The loot-pickup beat, not a system message: coin, number, rise, gone.
   Above the orb row and clear of it at any hud scale, like #pickupWrap. */
#goldPops{
  position:fixed; left:50%; transform:translateX(-50%);
  bottom:calc(196px * var(--hudScale, 1) + 10px);
  z-index:63; pointer-events:none;
  display:flex; flex-direction:column-reverse; align-items:center; gap:5px;
}
.gPop{
  display:flex; align-items:center; gap:8px;
  padding:5px 13px 5px 9px;
  background:linear-gradient(180deg,rgba(24,20,12,.92),rgba(12,10,7,.94));
  border:1px solid rgba(160,130,60,.55);
  box-shadow:0 2px 10px rgba(0,0,0,.6);
  animation:gPopRise 2.2s ease-out forwards;
}
.gPop span{
  font:700 15px "Cinzel",Georgia,serif; letter-spacing:.02em; color:#f0d488;
  text-shadow:0 1px 3px #000;
}
.gPopCoin{
  width:15px; height:15px; border-radius:50%; flex:none;
  background:radial-gradient(circle at 36% 30%,#f6e3a8,#c8a24a 58%,#6f5320);
  box-shadow:0 1px 3px rgba(0,0,0,.7), inset 0 0 0 1px rgba(0,0,0,.3);
}
@keyframes gPopRise{
  0%   { opacity:0; transform:translateY(10px) scale(.94) }
  12%  { opacity:1; transform:translateY(0) scale(1) }
  70%  { opacity:1; transform:translateY(-16px) }
  100% { opacity:0; transform:translateY(-30px) }
}
"""
rep('css', "\n</style>", "\n" + CSS + "\n</style>")

open('work.html','w',encoding='utf-8').write(src)
print('applied:', hits)
