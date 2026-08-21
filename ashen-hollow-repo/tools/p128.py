src = open('work.html', encoding='utf-8').read()
hits = {}
def rep(name, old, new, count=1):
    global src
    n = src.count(old)
    assert n == count, f"{name}: expected {count}, found {n}"
    src = src.replace(old, new); hits[name] = n

CSS = """
/* ---- Garrick's board, sized to actually fit (v246) -----------------------
   ⚠⚠ THE ROOT CAUSE WAS `box-sizing:border-box` PLUS A FLEX MINIMUM.
   The page sets border-box globally, so `width:660px` INCLUDED the 34px frame
   on each side — the real content box was 592px, and after the skill list,
   the gap and the detail padding only 326px reached the socket row. Five flex
   items that refuse to shrink below their own caption text needed more than
   that, so the row ran out through the frame.
   Two fixes, both structural rather than cosmetic:
     1. the window is sized in VIEWPORT terms and states the frame explicitly,
        so it cannot be quietly eaten again;
     2. every grid and flex child gets `min-width:0`, which is what actually
        permits shrinking — without it a child's text is a hard floor.
   ------------------------------------------------------------------------ */
body[data-skin="forged"] #ahWin.wide{
  width:min(880px, 94vw) !important;
  max-width:94vw !important;
}
/* ⚠ WITHOUT THESE THE COLUMNS CANNOT SHRINK AT ALL */
#ahWin.wide .gsWrap,
#ahWin.wide .gsList,
#ahWin.wide .gsDetail,
#ahWin.wide .gsSocks,
#ahWin.wide .gsSock{ min-width:0 }

.gsWrap{ grid-template-columns:250px minmax(0,1fr) !important; gap:20px !important }

/* the skill list: room for a full name on one line */
.gsList{ max-height:430px !important; padding:7px !important }
.gsRow{ padding:13px 14px !important; font-size:15px !important; gap:10px }
.gsRowName{ white-space:nowrap; overflow:hidden; text-overflow:ellipsis }
.gsRowSlots{ font-size:13px !important }

.gsDetail{ padding:22px 24px 24px !important }
.gsName{ font-size:28px !important }
.gsSub{ font-size:14px !important }
.gsSub b{ font-size:17px !important }

/* the sockets: bigger, and they may WRAP rather than overflow */
.gsSocks{ display:flex; flex-wrap:wrap; gap:14px !important; margin-bottom:22px !important }
.gsSock{ flex:1 1 64px; max-width:110px }
.gsSockDot{ height:60px !important; margin-bottom:7px !important }
.gsSockDot i{ width:24px !important; height:24px !important }
.gsSockNo{
  font:700 15px "Trebuchet MS",sans-serif !important; letter-spacing:0 !important;
  text-transform:none !important; color:#6f695c;
}
.gsSock.own .gsSockNo{ color:#2fa39a }
.gsSock.next .gsSockNo{ color:#f0d488 }

/* the purchase box */
.gsActLabel{ font-size:11px !important }
.gsActBig{ font-size:21px !important }
.gsActCost{ font-size:34px !important; margin:9px 0 15px !important }
.gsBuy{ padding:16px !important; font-size:16px !important }
.gsShort{ padding:13px !important; font-size:14px !important }
.gsActNote{ font-size:13px !important }

.gsGold b{ font-size:25px !important }
.gsGold span{ font-size:11px !important }
.gsHelp{ font-size:12.5px !important }
"""
rep('css', "\n</style>", "\n" + CSS + "\n</style>")

open('work.html','w',encoding='utf-8').write(src)
print('applied:', hits)
