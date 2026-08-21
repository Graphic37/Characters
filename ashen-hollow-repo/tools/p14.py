src = open('work.html', encoding='utf-8').read()
hits = {}
def rep(name, old, new, count=1):
    global src
    n = src.count(old)
    assert n == count, f"{name}: expected {count}, found {n}"
    src = src.replace(old, new); hits[name] = n

# ============================================================ 1. THE SIZING
# min-height only sets a FLOOR. The rune board's nine stacked rows (a name line
# plus a 30px art cell plus a tier caption plus margins, ~86px each) came to
# roughly 780px against the grid's 530 — so the panel grew on that tab and
# shrank again on the next. Every board is now pinned to the grid's exact box.
rep('board-size',
"""#runeTab, #gemTab{
  display:none; padding:4px 2px 2px;
  width:calc(var(--cell) * 10);
  min-height:calc(var(--cell) * 10);
  box-sizing:border-box; align-content:center;
}
#runeTab.on, #gemTab.on{ display:flex; flex-direction:column; justify-content:center; }""",
"""/* ⚠ HEIGHT, NOT MIN-HEIGHT. `min-height` is a floor: content taller than the
   grid still grew the panel, which is exactly what made the RUNES tab resize
   the whole stash when he clicked through. All three boards are now pinned to
   the grid's box in BOTH directions, so the panel geometry is identical on
   every tab whatever the board decides to draw inside it. Overflow scrolls
   rather than pushing the shell. */
#runeTab, #gemTab{
  display:none; padding:4px 2px 2px;
  width:calc(var(--cell) * 10);
  height:calc(var(--cell) * 10);
  max-height:calc(var(--cell) * 10);
  box-sizing:border-box;
}
#runeTab.on, #gemTab.on{
  display:flex; flex-direction:column; justify-content:flex-start;
  overflow-y:auto; overflow-x:hidden;
}""")

rep('cur-size',
"""  width:calc(var(--cell) * 10);
  min-height:calc(var(--cell) * 10);   /* must track the grid's row count */
  box-sizing:border-box;
  /* centre the board in that box rather than letting it sit short at the top */
  display:none;
  align-content:center;
}
#curTab.on{ display:flex; flex-direction:column; justify-content:center; }""",
"""  width:calc(var(--cell) * 10);
  height:calc(var(--cell) * 10);       /* must track the grid's row count */
  max-height:calc(var(--cell) * 10);
  box-sizing:border-box;
  display:none;
}
#curTab.on{ display:flex; flex-direction:column; justify-content:center;
            overflow-y:auto; overflow-x:hidden; }""")

# ============================================================ 2. THE LAYOUT
# Pinning the height alone would leave the rune board scrolling nine tall rows
# inside a 530px box. It is a 9 x 5 TABLE, so lay it out as one: tier captions
# once in a header rather than repeated 45 times, and the type name beside its
# row instead of above it. ~430px of content — it fits without scrolling.
rep('rune-css',
""".rnRow{ margin-bottom:6px; }
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
}""",
"""/* one row per type, five tiers across — a table, not nine stacked blocks */
.rnHead{ display:flex; align-items:flex-end; gap:5px; margin-bottom:4px;
  padding-bottom:3px; border-bottom:1px solid rgba(169,143,216,.20); }
.rnHead .rnName{ border:0; padding:0; margin:0; }
.rnHeadTier{ flex:1; text-align:center;
  font:600 9px "Trebuchet MS",sans-serif; letter-spacing:.14em; color:#8a7c5c; }
.rnRow{ display:flex; align-items:center; gap:5px; margin-bottom:4px; }
.rnName{
  width:112px; flex:0 0 112px; text-align:left; overflow:hidden;
  font:600 10px "Trebuchet MS",sans-serif; letter-spacing:.06em; color:#8a7c5c;
  white-space:nowrap; text-overflow:ellipsis;
}
.rnLive{ color:#a98fd8; letter-spacing:0; font-weight:400; }
.rnCells{ display:flex; gap:5px; flex:1; }
.rnCell{
  position:relative; flex:1; height:38px; cursor:pointer;
  display:flex; align-items:center; justify-content:center;
  background:linear-gradient(180deg,rgba(20,17,26,.94),rgba(8,7,10,.97));
  border:1px solid #35304a; box-shadow:inset 0 0 14px rgba(0,0,0,.9);
}
.rnCell:hover{ border-color:#8a76b8; }
.rnCell.empty{ opacity:.30; cursor:default; }
.rnCell.empty:hover{ border-color:#35304a; }
.rnArt{ width:26px; height:26px; display:flex;
  align-items:center; justify-content:center; }
.rnArt svg, .rnArt img{ width:100%; height:100%; object-fit:contain; }
.rnQty{
  position:absolute; top:1px; right:2px; min-width:13px; padding:0 2px;
  font:700 9px "Trebuchet MS",sans-serif; color:#e2d7f6; line-height:1.3;
  background:rgba(0,0,0,.85); border:1px solid #4b4166;
}""")

# the tier caption moves out of every cell and into the header
rep('rune-markup',
"""      cells+='<div class="rnCell'+(have?'':' empty')+'" data-rune="'+rt.id+'" data-tier="'+tier+'" '+
        'title="'+rt.n+' (T'+tier+') \\u2014 '+rt.txt(mag)+'">'+
        '<div class="rnArt">'+art+'</div>'+
        '<div class="rnTier">T'+tier+'</div>'+
        (have?'<div class="rnQty">'+have.qty+'</div>':'')+
      '</div>';""",
"""      cells+='<div class="rnCell'+(have?'':' empty')+'" data-rune="'+rt.id+'" data-tier="'+tier+'" '+
        'title="'+rt.n+' (T'+tier+') \\u2014 '+rt.txt(mag)+'">'+
        '<div class="rnArt">'+art+'</div>'+
        (have?'<div class="rnQty">'+have.qty+'</div>':'')+
      '</div>';""")

rep('rune-header',
"""  host.innerHTML=rows+""",
"""  /* the tier captions belong in ONE header, not repeated in all 45 cells */
  let head='<div class="rnHead"><div class="rnName"></div><div class="rnCells">';
  for(let tier=5; tier>=1; tier--) head+='<div class="rnHeadTier">T'+tier+'</div>';
  head+='</div></div>';
  host.innerHTML=head+rows+""")

open('work.html','w',encoding='utf-8').write(src)
print('applied:', hits)
