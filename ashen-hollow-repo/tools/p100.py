src = open('work.html', encoding='utf-8').read()
hits = {}
def rep(name, old, new, count=1):
    global src
    n = src.count(old)
    assert n == count, f"{name}: expected {count}, found {n}"
    src = src.replace(old, new); hits[name] = n

# Escape must close it, like every other modal
rep('esc',
"""addEventListener('keydown', e=>{
  if(e.key==='F3'){ e.preventDefault(); window.perfToggle(); }
});""",
"""addEventListener('keydown', e=>{
  if(e.key==='F3'){ e.preventDefault(); window.perfToggle(); }
});
/* ⚠ ESCAPE CLOSES THE BOARD. It is its own element, not a station window, so
   the existing Escape handling does not know about it — and a modal you can
   only leave by finding the X is a modal people get stuck in. Runs in capture
   so it beats the menu handler that would otherwise open the game menu. */
addEventListener('keydown', e=>{
  if(e.key!=='Escape') return;
  const b=document.getElementById('questBoard2');
  if(b && b.classList.contains('on')){
    e.preventDefault(); e.stopPropagation();
    if(window.questBoardClose) questBoardClose();
  }
}, true);""")

CSS = """
/* ---- the quest board (v229) ----------------------------------------------
   Its own overlay, not the 440px station window — a list plus a detail column
   plus a primary action does not fit that frame, which is what made Garrick's
   shop cramped until v228. */
#questBoard2{
  position:fixed; inset:0; z-index:64; display:none;
  align-items:center; justify-content:center;
  background:rgba(3,4,6,.72);
}
#questBoard2.on{ display:flex }
.qbPanel{
  width:min(940px, 92vw); max-height:88vh; display:flex; flex-direction:column;
  background:linear-gradient(165deg,#1b1a17,#0d0d0c 62%);
  border:1px solid #6b5a33;
  box-shadow:0 18px 60px rgba(0,0,0,.8), inset 0 0 0 1px rgba(0,0,0,.6);
}
.qbHead{
  display:flex; align-items:center; gap:13px; padding:16px 20px;
  border-bottom:1px solid #3a3327;
  background:linear-gradient(180deg,rgba(52,42,22,.55),rgba(20,18,12,.35));
}
.qbHeadIco{ width:26px; height:26px; color:#c8a24a; flex:none }
.qbHeadIco svg{ width:100%; height:100% }
.qbTitle{
  flex:1; font:700 25px "Cinzel",Georgia,serif; letter-spacing:.10em;
  color:#f0e3c2; text-shadow:0 2px 8px #000;
}
.qbX{
  width:38px; height:38px; cursor:pointer; flex:none;
  font:400 19px/1 "Trebuchet MS",sans-serif; color:#b9ae95;
  border:1px solid #4a4335; background:rgba(0,0,0,.35);
}
.qbX:hover{ border-color:#c8a24a; color:#f0e3c2 }

.qbBody{ display:grid; grid-template-columns:342px minmax(0,1fr); gap:0; min-height:0 }
.qbList{
  border-right:1px solid #3a3327; padding:14px; overflow-y:auto;
  background:rgba(0,0,0,.22);
}
.qbListHead{
  font:600 10px "Trebuchet MS",sans-serif; letter-spacing:.22em;
  text-transform:uppercase; color:#8a8471; margin-bottom:11px;
}
.qbRow{
  display:flex; align-items:center; gap:12px; width:100%; text-align:left;
  padding:13px 13px; margin-bottom:7px; cursor:pointer;
  border:1px solid #2f332a; background:rgba(20,22,18,.6);
}
.qbRow:hover{ border-color:#5a6150 }
.qbRow.on{
  border-color:#c8a24a;
  background:linear-gradient(180deg,rgba(66,50,20,.7),rgba(28,22,12,.7));
}
.qbRow.locked{ opacity:.5 }
.qbIco{ width:30px; height:30px; flex:none; color:#9aa08e }
.qbIco svg{ width:100%; height:100% }
.qbRow.on .qbIco{ color:#e0c07a }
.qbRow.done .qbIco{ color:#2fa39a }
.qbRowText{ flex:1; min-width:0 }
.qbRowText b{ display:block; font:600 15px "Trebuchet MS",sans-serif; color:#e6e2d8 }
.qbRowText i{ display:block; font:normal 12px "Trebuchet MS",sans-serif;
  color:#8a8471; margin-top:2px }
.qbRowTag{ font:600 11.5px "Trebuchet MS",sans-serif; color:#7d7768; flex:none }
.qbRow.on .qbRowTag{ color:#f0d488 }
.qbRow.done .qbRowTag{ color:#2fa39a }
.qbListFoot{
  margin-top:12px; padding-top:11px; border-top:1px solid #2a2e26;
  font:11.5px "Trebuchet MS",sans-serif; color:#7d7768;
}
.qbListFoot b{ color:#cfc7a8 }

.qbDetail{ padding:24px 28px 22px; overflow-y:auto; text-align:center }
.qbDetIco{ width:56px; height:56px; margin:0 auto 12px; color:#c8a24a }
.qbDetIco svg{ width:100%; height:100% }
.qbDetName{
  font:700 27px "Cinzel",Georgia,serif; letter-spacing:.05em; color:#f0e3c2;
  text-shadow:0 2px 8px #000;
}
.qbRule{
  height:1px; margin:13px auto 15px; max-width:340px;
  background:linear-gradient(90deg,transparent,#4a4335 22%,#6b5a33 50%,#4a4335 78%,transparent);
}
.qbFlavour{
  font:italic 14px/1.65 "Trebuchet MS",sans-serif; color:#a9a191;
  max-width:52ch; margin:0 auto 22px;
}
.qbSec{
  font:600 10px "Trebuchet MS",sans-serif; letter-spacing:.22em;
  text-transform:uppercase; color:#8a8471; text-align:left;
  margin-bottom:9px; display:flex; align-items:center; gap:10px;
}
.qbSec::after{ content:''; flex:1; height:1px; background:#2f332a }
.qbObj{
  display:flex; align-items:center; justify-content:space-between; gap:14px;
  padding:11px 13px; border:1px solid #2f332a; background:rgba(20,22,18,.5);
}
.qbObjText{ font:14.5px "Trebuchet MS",sans-serif; color:#e6e2d8 }
.qbObjNum{ font:700 16px "Trebuchet MS",sans-serif; color:#f0d488 }
.qbObjNum.ok{ color:#5ee06a }
.qbTrack{ height:4px; margin:8px 0 22px; background:rgba(0,0,0,.6) }
.qbTrack i{ display:block; height:100%;
  background:linear-gradient(90deg,#8a6a1c,#f0d488); transition:width .25s ease }
.qbRewards{ display:flex; gap:12px; margin-bottom:24px }
.qbReward{
  display:flex; flex-direction:column; align-items:center; gap:3px;
  padding:13px 20px; border:1px solid #6b5a33;
  background:linear-gradient(180deg,rgba(46,38,20,.6),rgba(18,15,9,.6));
}
.qbRewIco{ width:34px; height:34px; color:#f0d488 }
.qbRewIco svg{ width:100%; height:100% }
.qbReward b{ font:700 19px "Cinzel",Georgia,serif; color:#f0d488 }
.qbReward i{ font:normal 10.5px "Trebuchet MS",sans-serif; color:#8a8471;
  letter-spacing:.06em }
.qbAction{ margin-top:4px }
.qbBtn{
  display:block; width:100%; padding:15px; cursor:pointer;
  font:700 15px "Trebuchet MS",sans-serif; letter-spacing:.18em;
  text-transform:uppercase; color:#1a1206;
  border:1px solid #e0c07a;
  background:linear-gradient(180deg,#f0d488,#c8a24a 55%,#8a6a1c);
}
.qbBtn:hover{ background:linear-gradient(180deg,#fbe6a6,#dcb85e 55%,#a07f27) }
.qbBtn.ok{ border-color:#7fe07a; color:#0a1a08;
  background:linear-gradient(180deg,#a8f0a0,#5ec455 55%,#2f7a2a) }
.qbBtn.ok:hover{ background:linear-gradient(180deg,#c2ffb9,#74dc69 55%,#3a9433) }
.qbBtn.wait{
  cursor:default; color:#9aa08e; text-transform:none; letter-spacing:.06em;
  border:1px dashed #4a4335; background:rgba(0,0,0,.3); font-weight:600;
}
.qbDone{
  padding:15px; text-align:center; color:#2fa39a;
  font:600 13px "Trebuchet MS",sans-serif; letter-spacing:.12em;
  text-transform:uppercase; border:1px solid #2f6b64; background:rgba(12,28,26,.5);
}
.qbDone.locked{ color:#6f695c; border-color:#3a3327; background:rgba(0,0,0,.3);
  text-transform:none; letter-spacing:.04em; font-weight:400 }
"""
rep('css', "\n</style>", "\n" + CSS + "\n</style>")

open('work.html','w',encoding='utf-8').write(src)
print('applied:', hits)
