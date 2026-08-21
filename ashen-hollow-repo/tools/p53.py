import re
src = open('work.html', encoding='utf-8').read()

CSS = """
/* ---- pack bar + head plate: BARE (v199) ----------------------------------
   ⚠ I OVER-BUILT THIS. v194/v198 wrapped both readouts in a bordered, shaded
   panel with boxed affix chips — furniture around the information rather than
   the information itself. His reference is a NAME, a THIN BAR and the affixes
   as plain text. No panel, no border, no chips, no shadow box.
   Legibility over the world comes from text-shadow, which costs nothing and
   does not put a rectangle on screen.
   Blue = magic, gold = rare, the same two colours as the ground rings. */
#packBar{
  position:fixed; left:50%; top:16px; transform:translateX(-50%);
  z-index:40; pointer-events:none;
  width:min(340px, 40vw); padding:0;
  opacity:0; transition:opacity .22s ease;
  background:none; border:0; box-shadow:none;
  text-align:center;
}
#packBar.on{ opacity:1 }
#packBar .pbName{
  font:600 13px "Trebuchet MS",sans-serif; letter-spacing:.14em;
  text-transform:uppercase; color:#c9d2e0;
  text-shadow:0 1px 3px #000, 0 0 8px rgba(0,0,0,.9);
  margin-bottom:4px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
}
#packBar .pbTrack{
  height:7px; background:rgba(6,7,10,.72);
  border:1px solid rgba(0,0,0,.85); overflow:hidden;
  box-shadow:0 1px 3px rgba(0,0,0,.6);
}
#packBar .pbFill{ display:block; height:100%; width:0%; transition:width .18s linear }
#packBar .pbMods{
  display:flex; flex-wrap:wrap; gap:0 10px; justify-content:center; margin-top:4px;
}
#packBar .pbMod{
  font:600 10px "Trebuchet MS",sans-serif; letter-spacing:.06em;
  padding:0; background:none; border:0; color:#9aa4b4;
  text-shadow:0 1px 3px #000, 0 0 6px rgba(0,0,0,.9);
}
#packBar .pbMods:empty{ display:none }
#packBar .pbMod.more{ opacity:.7 }
#packBar.magic .pbName{ color:#9dc0f0 }
#packBar.magic .pbFill{ background:linear-gradient(180deg,#7db0ff,#3f6fc4) }
#packBar.magic .pbMod{ color:#93aecd }
#packBar.rare .pbName{ color:#f0d488 }
#packBar.rare .pbFill{ background:linear-gradient(180deg,#ffd97a,#d0a02f) }
#packBar.rare .pbMod{ color:#cdb681 }

/* the same treatment over the enemy's head — one visual language, two places */
#headPlate{
  position:fixed; left:0; top:0; z-index:38; pointer-events:none;
  min-width:130px; max-width:240px; padding:0;
  opacity:0; transition:opacity .18s ease;
  background:none; border:0; box-shadow:none; text-align:center;
  will-change:transform;
}
#headPlate.on{ opacity:1 }
#headPlate .hpName{
  font:600 11px "Trebuchet MS",sans-serif; letter-spacing:.09em;
  white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
  text-shadow:0 1px 3px #000, 0 0 8px rgba(0,0,0,.95); margin-bottom:3px;
}
#headPlate .hpTrack{
  height:5px; background:rgba(6,7,10,.72); border:1px solid rgba(0,0,0,.85);
  overflow:hidden;
}
#headPlate .hpFill{ display:block; height:100%; width:100%; transition:width .15s linear }
#headPlate .hpMods{
  display:flex; flex-wrap:wrap; gap:0 8px; justify-content:center; margin-top:3px;
}
#headPlate .hpMods span{
  font:600 9px "Trebuchet MS",sans-serif; letter-spacing:.05em;
  padding:0; background:none; border:0; color:#9aa4b4;
  text-shadow:0 1px 3px #000, 0 0 6px rgba(0,0,0,.95);
}
#headPlate .hpMods:empty{ display:none }
#headPlate.magic .hpName{ color:#9dc0f0 }
#headPlate.magic .hpFill{ background:linear-gradient(180deg,#7db0ff,#3f6fc4) }
#headPlate.magic .hpMods span{ color:#93aecd }
#headPlate.rare .hpName{ color:#f0d488 }
#headPlate.rare .hpFill{ background:linear-gradient(180deg,#ffd97a,#d0a02f) }
#headPlate.rare .hpMods span{ color:#cdb681 }
"""

# remove the two old style blocks wholesale, then append the bare one
def cut(start_marker, end_marker):
    global src
    a = src.index(start_marker)
    b = src.index(end_marker, a)
    src = src[:a] + src[b:]

cut("/* ---- the elite pack bar (v194) ---", "\n</style>")
# the head-plate block was appended later; remove it too if still present
if "/* ---- the over-head elite plate (v198) ---" in src:
    cut("/* ---- the over-head elite plate (v198) ---", "\n</style>")

assert src.count("#packBar{") == 0, "old pack bar CSS still present"
assert src.count("#headPlate{") == 0, "old head plate CSS still present"
src = src.replace("\n</style>", "\n" + CSS + "\n</style>", 1)

open('work.html','w',encoding='utf-8').write(src)
print("packBar rules:", src.count("#packBar{"), "| headPlate rules:", src.count("#headPlate{"))
