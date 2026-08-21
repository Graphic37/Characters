src = open('work.html', encoding='utf-8').read()
hits = {}
def rep(name, old, new, count=1):
    global src
    n = src.count(old)
    assert n == count, f"{name}: expected {count}, found {n}"
    src = src.replace(old, new); hits[name] = n

# title now says what the panel is, since nothing else does
rep('title',
"""  stationPanel('Garrick · Workshop', garTabBar(GAR.tab)+body, []);""",
"""  stationPanel('Garrick \\u00b7 Support Slots', body, []);""")

# the helper paragraph was centred, three lines, and sat above everything —
# it is reference text, not a headline
rep('help',
"""  return '<div class="gsHelp">Unlock additional Support Gem slots for each '+
           'skill. Every skill starts with one. Extra slots are permanent, '+
           'bought per skill, and never shared between skills.</div>'+
    '<div class="gsWrap">'+""",
"""  /* ⚠ THE EXPLANATION MOVED TO THE BOTTOM. Three centred lines above the
     board pushed the actual content down and were read once and never again —
     the player needs the rule available, not announced. */
  return '<div class="gsWrap">'+""")

rep('help-foot',
"""    '<div class="gsFoot">'+
      '<div class="gsGold"><i class="gsCoin"></i>'+
        '<span>Your Gold</span><b>'+fmt(gold)+'</b></div>'+
    '</div>';""",
"""    '<div class="gsFoot">'+
      '<div class="gsGold"><i class="gsCoin"></i>'+
        '<span>Your Gold</span><b>'+fmt(gold)+'</b></div>'+
      '<div class="gsHelp">Slots are permanent, bought per skill, '+
        'and never shared.</div>'+
    '</div>';""")

CSS = """
/* ---- workshop board, tabless (v231) --------------------------------------
   With the tab bar gone the board owns the panel, so it can breathe: the list
   is taller, the sockets are bigger, and the rule text sits at the bottom
   beside the gold rather than above everything. */
.gsHelp{
  font:12px "Trebuchet MS",sans-serif; color:#6f695c; line-height:1.5;
  text-align:right; max-width:34ch;
}
.gsWrap{ grid-template-columns:210px minmax(0,1fr) !important; gap:16px !important }
.gsList{ max-height:392px !important }
.gsRow{ padding:11px 12px !important; font-size:13.5px !important }
.gsDetail{ padding:18px 20px 19px !important }
.gsName{ font-size:23px !important }
.gsSocks{ gap:10px !important; margin-bottom:18px !important }
.gsSockDot{ height:46px !important }
.gsSockDot i{ width:18px !important; height:18px !important }
.gsSockNo{ font-size:10px !important }
.gsSockCost{ font-size:12.5px !important }
.gsActCost{ font-size:28px !important }
.gsBuy{ padding:13px !important; font-size:14px !important }
.gsFoot{ align-items:flex-end !important }
"""
rep('css', "\n</style>", "\n" + CSS + "\n</style>")

open('work.html','w',encoding='utf-8').write(src)
print('applied:', hits)
