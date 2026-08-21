src = open('work.html', encoding='utf-8').read()
hits = {}
def rep(name, old, new, count=1):
    global src
    n = src.count(old)
    assert n == count, f"{name}: expected {count}, found {n}"
    src = src.replace(old, new); hits[name] = n

rep('dispatch',
"""  if(nearStation.name==='Mara'){  winOpen=true; window.vendorPanel(); return; }""",
"""  if(nearStation.name==='Mara'){  winOpen=true; window.vendorPanel(); return; }
  if(nearStation.name==='Adenah'){ winOpen=true; window.adenahPanel(); return; }""")

rep('panel',
"""function garSlotsBody(){""",
"""/* ===========================================================================
   ADENAH — CONTRACTS  (v219)
   ---------------------------------------------------------------------------
   ⚠ THE TURN-IN IS DELIBERATELY MANUAL, per his design. Auto clears the
   dungeon; walking back to collect is the one thing it will not do for you.
   That is the whole point of the loop, so this panel never auto-claims and
   the board never says "collected" on its own.
   ========================================================================= */
window.adenahPanel=function(){
  try{
    const q=QUESTS.active;
    const nxt=questNextDef();
    let body='';
    if(!q){
      body='<div class="adIntro">The ledger always has work in it.</div>'+
        '<div class="adCard">'+
          '<div class="adName">'+nxt.n+'</div>'+
          '<div class="adTask">'+nxt.verb+' '+fmt(nxt.goal)+' '+nxt.unit+'</div>'+
          '<div class="adPay">Pays <b>'+nxt.coin+'</b> Vaulted Coin</div>'+
          '<button class="adBtn" data-quest="accept">Accept Contract</button>'+
        '</div>';
    } else if(q.have >= q.goal){
      body='<div class="adIntro">Done, then. Hold out your hand.</div>'+
        '<div class="adCard done">'+
          '<div class="adName">'+q.n+'</div>'+
          '<div class="adTask">'+fmt(q.goal)+' / '+fmt(q.goal)+' \\u2014 complete</div>'+
          '<div class="adPay">Pays <b>'+q.coin+'</b> Vaulted Coin</div>'+
          '<button class="adBtn ok" data-quest="turnin">Turn In</button>'+
        '</div>';
    } else {
      const left=q.goal-q.have;
      body='<div class="adIntro">Not finished. Come back when it is.</div>'+
        '<div class="adCard busy">'+
          '<div class="adName">'+q.n+'</div>'+
          '<div class="adTask">'+fmt(q.have)+' / '+fmt(q.goal)+
            ' \\u2014 <b>'+fmt(left)+'</b> to go</div>'+
          '<div class="adPay">Pays <b>'+q.coin+'</b> Vaulted Coin</div>'+
        '</div>';
    }
    body+='<div class="adFoot">Contracts completed: <b>'+QUESTS.done+'</b></div>';
    document.getElementById('winTitle').textContent='Adenah, Curio Vendor';
    document.getElementById('winBody').innerHTML=body;
    document.getElementById('winActs').innerHTML='';
    document.getElementById('ahWin').classList.add('on');
    document.querySelectorAll('#winBody [data-quest]').forEach(el=>{
      el.addEventListener('click', ()=>{
        const a=el.dataset.quest;
        if(a==='accept') questAccept();
        else if(a==='turnin'){
          const r=questTurnIn();
          if(!r.ok && r.why==='incomplete')
            try{ toast(fmt(r.left)+' still to kill'); }catch(e){}
        }
        window.adenahPanel();          /* repaint in place */
      });
    });
  }catch(e){ window.ahErr&&window.ahErr(e,'adenahPanel'); }
};

function garSlotsBody(){""")

CSS = """
/* ---- the quest board (v219) ---------------------------------------------
   Top-left, above the canvas and below every panel. Reads at a glance during
   a fight, which is the only time it matters. */
#questBoard{
  position:fixed; left:14px; top:64px; z-index:37; pointer-events:none;
  min-width:210px; max-width:280px;
  opacity:0; transition:opacity .3s ease;
}
#questBoard.on{ opacity:1 }
#questBoard .qTitle{
  font:700 15px "Trebuchet MS",sans-serif; letter-spacing:.03em; color:#6aa9ff;
  text-shadow:0 2px 4px #000, 0 0 10px rgba(0,0,0,.95);
}
#questBoard .qTitle.done{ color:#7fe07a }
#questBoard .qTitle.idle{ color:#8a8471 }
#questBoard .qLine{
  font:13px "Trebuchet MS",sans-serif; color:#e6e2d8; margin:3px 0 0 10px;
  text-shadow:0 2px 4px #000, 0 0 8px rgba(0,0,0,.95); line-height:1.35;
}
#questBoard .qNum{ color:#f04a5a; font-weight:700 }
#questBoard .qOk{ color:#5ee06a; font-weight:700 }
#questBoard .qTrack{
  height:3px; margin:6px 0 0 10px; background:rgba(0,0,0,.6);
  box-shadow:0 1px 2px rgba(0,0,0,.8);
}
#questBoard .qTrack i{
  display:block; height:100%; background:linear-gradient(90deg,#3f6fc4,#7db0ff);
  transition:width .25s ease;
}
#questBoard .qFoot{
  font:10.5px "Trebuchet MS",sans-serif; color:#9aa08e; margin:5px 0 0 10px;
  letter-spacing:.04em; text-shadow:0 1px 3px #000;
}
/* ---- Adenah's panel ------------------------------------------------------ */
.adIntro{ font:italic 12px "Trebuchet MS",sans-serif; color:#8a8471; margin-bottom:10px }
.adCard{ border:1px solid #34382e; background:linear-gradient(180deg,#141710,#0c0e0a);
  padding:12px 14px }
.adCard.done{ border-color:#3f7a3a }
.adCard.busy{ opacity:.9 }
.adName{ font:700 15px "Trebuchet MS",sans-serif; color:#cfc7a8; margin-bottom:5px }
.adTask{ font:13px "Trebuchet MS",sans-serif; color:#b9b3a2; margin-bottom:8px }
.adTask b{ color:#f0d488 }
.adPay{ font:12px "Trebuchet MS",sans-serif; color:#8a8471; margin-bottom:11px }
.adPay b{ color:#f0d488; font-size:14px }
.adBtn{ display:block; width:100%; padding:8px; cursor:pointer;
  font:600 12px "Trebuchet MS",sans-serif; letter-spacing:.1em; color:#e8dcc0;
  border:1px solid #6b5a33; background:linear-gradient(180deg,#2a2313,#14110b) }
.adBtn:hover{ border-color:#c8a24a; background:linear-gradient(180deg,#3a2f18,#1c170d) }
.adBtn.ok{ border-color:#3f7a3a; color:#bff0b8 }
.adBtn.ok:hover{ border-color:#6ad063 }
.adFoot{ margin-top:11px; font:11px "Trebuchet MS",sans-serif; color:#7d7768 }
.adFoot b{ color:#cfc7a8 }
"""
rep('css', "\n</style>", "\n" + CSS + "\n</style>")

open('work.html','w',encoding='utf-8').write(src)
print('applied:', hits)
