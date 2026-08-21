src = open('work.html', encoding='utf-8').read()
hits = {}
def rep(name, old, new, count=1):
    global src
    n = src.count(old)
    assert n == count, f"{name}: expected {count}, found {n}"
    src = src.replace(old, new); hits[name] = n

CSS = """
/* =============== BOARD LEGIBILITY (v171) =================================
   The gem cards were 10px description text on a 38px icon — sized as if the
   board were tight for room, when in fact six cards used 372px of a 530px box.
   ⚠ THE IMPORTANT PROPERTY: the boards are pinned to `calc(var(--cell) * 10)`
   (v159), so growing the CARDS does not grow the PANEL. The dock's `--uiL`
   fitter therefore has nothing to react to and cannot scale the increase back
   off — which is exactly what happened in v135 when a size change was applied
   to a panel that could grow. Spend the headroom, keep the box.
   Budget: 6 cards x 80px + footer ~40 = 520 of 530. */
.gmCard{
  gap:12px !important;
  padding:9px 11px !important;
  margin-bottom:7px !important;
}
.gmArt{ width:52px !important; height:52px !important; }
.gmName{ font-size:14px !important; letter-spacing:.02em; margin-bottom:2px }
.gmLvl{ font-size:11px !important; }
.gmDesc{ font-size:11.5px !important; line-height:1.45 !important; color:#9a9488 !important; }
.gmIn{ font-size:10px !important; margin-top:3px !important; }
.gmQty{ top:7px !important; right:8px !important; min-width:18px !important;
  padding:1px 4px !important; font-size:11px !important; }
/* an unowned support was at 40% opacity — legible enough to READ is the point
   of listing it at all, since the card is how you learn the gem exists */
.gmCard.empty{ opacity:.62 !important; }

/* the rune board had 81px spare in the same box; give it to the row height,
   where it buys icon size rather than whitespace */
.rnCell{ height:44px !important; }
.rnArt{ width:32px !important; height:32px !important; }
.rnName{ font-size:11px !important; }
.rnQty{ font-size:10px !important; min-width:15px !important; }
.rnHeadTier{ font-size:10px !important; }
.rnFoot{ font-size:11px !important; line-height:1.5 !important; }

/* paired mode has a wider panel, so the cards can breathe further */
body.pairOpen .gmArt{ width:58px !important; height:58px !important; }
body.pairOpen .gmName{ font-size:15px !important; }
body.pairOpen .gmDesc{ font-size:12.5px !important; }
"""
rep('board-legibility', "\n</style>", "\n" + CSS + "\n</style>")

open('work.html','w',encoding='utf-8').write(src)
print('applied:', hits)
