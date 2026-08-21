src = open('work.html', encoding='utf-8').read()
CSS = """
/* ==================== THE RUNE AND GEM BOARDS (v149) ======================
   Both sized to exactly the grid they replace (10 x 10 cells) so the panel
   never resizes on a tab change -- the v121 bug, and the reason the currency
   board pins its own min-height. */
#runeTab, #gemTab{
  display:none; padding:4px 2px 2px;
  width:calc(var(--cell) * 10);
  min-height:calc(var(--cell) * 10);
  box-sizing:border-box; align-content:center;
}
#runeTab.on, #gemTab.on{ display:flex; flex-direction:column; justify-content:center; }

/* ---- runes: nine types down, five tiers across ------------------------- */
.rnRow{ margin-bottom:6px; }
.rnName{
  font:600 10px "Trebuchet MS",sans-serif; letter-spacing:.16em; color:#8a7c5c;
  padding-bottom:3px; margin-bottom:4px;
  border-bottom:1px solid rgba(169,143,216,.16);
}
.rnLive{ color:#a98fd8; letter-spacing:.04em; font-weight:400; }
.rnCells{ display:flex; gap:6px; }
.rnCell{
  position:relative; flex:1; cursor:pointer; text-align:center; padding:4px 2px 2px;
  background:linear-gradient(180deg,rgba(20,17,26,.94),rgba(8,7,10,.97));
  border:1px solid #35304a; box-shadow:inset 0 0 14px rgba(0,0,0,.9);
}
.rnCell:hover{ border-color:#8a76b8; }
.rnCell.empty{ opacity:.34; cursor:default; }
.rnCell.empty:hover{ border-color:#35304a; }
.rnArt{ width:30px; height:30px; margin:0 auto 1px; display:flex;
  align-items:center; justify-content:center; }
.rnArt svg, .rnArt img{ width:88%; height:88%; object-fit:contain; }
.rnTier{ font:9px "Trebuchet MS",sans-serif; letter-spacing:.10em; color:#7d7590; }
.rnQty{
  position:absolute; top:2px; right:3px; min-width:14px; padding:0 3px;
  font:700 9px "Trebuchet MS",sans-serif; color:#e2d7f6;
  background:rgba(0,0,0,.82); border:1px solid #4b4166;
}
.rnFoot{ font-size:10px; color:#6f695c; margin-top:6px; line-height:1.45; }

/* ---- gems: one card per support, owned or not -------------------------- */
.gmCard{
  position:relative; display:flex; align-items:center; gap:9px; cursor:pointer;
  padding:6px 8px; margin-bottom:6px;
  background:linear-gradient(180deg,rgba(15,21,20,.94),rgba(7,9,9,.97));
  border:1px solid #274038; box-shadow:inset 0 0 16px rgba(0,0,0,.9);
}
.gmCard:hover{ border-color:#3f8d80; }
.gmCard.empty{ opacity:.40; cursor:default; }
.gmCard.empty:hover{ border-color:#274038; }
.gmArt{ width:38px; height:38px; flex:none; display:flex;
  align-items:center; justify-content:center; }
.gmArt svg, .gmArt img{ width:90%; height:90%; object-fit:contain; }
.gmBody{ flex:1; min-width:0; text-align:left; }
.gmName{ font:12px "Trebuchet MS",sans-serif; color:#cfe4de; }
.gmLvl{ font-size:10px; color:#2fa39a; letter-spacing:.08em; }
.gmDesc{ font:10px "Trebuchet MS",sans-serif; color:#8a8579; line-height:1.4; }
.gmIn{ font:9px "Trebuchet MS",sans-serif; color:#2fa39a; letter-spacing:.08em;
  margin-top:2px; }
.gmQty{
  position:absolute; top:5px; right:6px; min-width:15px; padding:0 3px;
  font:700 10px "Trebuchet MS",sans-serif; color:#d8ece7;
  background:rgba(0,0,0,.82); border:1px solid #2f5850;
}
.gmQty.zero{ color:#6f695c; border-color:#333; }

/* ---- socket pips in the item tooltip ----------------------------------- */
#tipwrap .sockpip{
  display:inline-block; width:9px; height:9px; margin-right:4px;
  border:1px solid #6a6152; border-radius:50%; background:rgba(0,0,0,.6);
  vertical-align:middle;
}
#tipwrap .sockpip.full{ background:#a98fd8; border-color:#c9b4f0;
  box-shadow:0 0 5px rgba(169,143,216,.7); }
#tipwrap .runeline{ color:#c0abe6; font-size:11.5px; padding:1px 0; }
#tipwrap .runeline.empty{ color:#6f695c; font-style:italic; }
"""
old = "\n</style>"
assert src.count(old) == 1
src = src.replace(old, "\n" + CSS + "\n</style>")
open('work.html','w',encoding='utf-8').write(src)
print('css added', len(CSS))
