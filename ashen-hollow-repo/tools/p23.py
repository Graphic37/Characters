src = open('work.html', encoding='utf-8').read()
hits = {}
def rep(name, old, new, count=1):
    global src
    n = src.count(old)
    assert n == count, f"{name}: expected {count}, found {n}"
    src = src.replace(old, new); hits[name] = n

# ---- markup: a sibling of the bar, not a child ------------------------------
# #xpbar is `overflow:hidden` (it clips the fill to the rounded ends), so a
# badge placed inside it would be cropped by its own 8px height. It sits beside
# the bar and is positioned against #skillbar instead.
rep('xp-badge-markup',
"""    <div id="xpbar" title="Experience"><div id="xpfill"></div><div id="xpticks"></div></div>""",
"""    <div id="xpLvl" title="Character level"><span id="xpLvlNum">1</span></div>
    <div id="xpbar" title="Experience"><div id="xpfill"></div><div id="xpticks"></div></div>""")

CSS = """
/* ---- level plate on the XP bar (v168) -----------------------------------
   D3 hangs the level off the left end of the experience bar. Two constraints
   decided the implementation:
   - #xpbar is `overflow:hidden` so the fill clips to its rounded ends, which
     means a badge INSIDE it would be cropped to the bar's 8px height. It is a
     sibling, positioned against #skillbar.
   - the bar is centred with translateX(-50%), so the plate is anchored to the
     bar's own left edge via calc() rather than a guessed offset — change the
     bar's width and the plate still lands on its end. */
#xpLvl{
  position:absolute; z-index:4; pointer-events:none;
  top:5px; left:calc(50% - 130px); transform:translate(-50%,-50%) rotate(45deg);
  margin-top:4px;                    /* half the bar's 8px height: dead centre */
  width:26px; height:26px;
  background:linear-gradient(135deg,#f6e0a2,#c8a24a 42%,#7d5a1c 70%,#4a3410);
  border:1px solid #2a1e0a;
  box-shadow:0 0 0 1px rgba(246,224,162,.35) inset,
             0 2px 6px rgba(0,0,0,.75),
             0 0 10px rgba(200,162,74,.28);
}
#xpLvlNum{
  position:absolute; inset:0; transform:rotate(-45deg);
  display:flex; align-items:center; justify-content:center;
  font:700 12px "Trebuchet MS",sans-serif; color:#2a1c06;
  text-shadow:0 1px 0 rgba(255,240,200,.45);
  letter-spacing:-.02em;
}
/* three digits still have to fit inside the diamond */
#xpLvlNum.wide{ font-size:10px }
"""
rep('xp-badge-css', "\n</style>", "\n" + CSS + "\n</style>")

# ---- keep it in sync with the level ----------------------------------------
rep('xp-badge-update',
"""  $('#npLvl').textContent=S.lvl;""",
"""  $('#npLvl').textContent=S.lvl;
  { const lv=$('#xpLvlNum');
    if(lv && lv.textContent !== String(S.lvl)){
      lv.textContent=S.lvl;
      lv.classList.toggle('wide', String(S.lvl).length>2);
    } }""")

open('work.html','w',encoding='utf-8').write(src)
print('applied:', hits)
