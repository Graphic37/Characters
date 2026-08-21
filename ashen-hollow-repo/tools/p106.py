src = open('work.html', encoding='utf-8').read()
hits = {}
def rep(name, old, new, count=1):
    global src
    n = src.count(old)
    assert n == count, f"{name}: expected {count}, found {n}"
    src = src.replace(old, new); hits[name] = n

rep('input',
"""window.sellDo=sellDo;""",
"""window.sellDo=sellDo;

/* ---- input ---------------------------------------------------------------
   ⚠ DELEGATED FROM document, NOT BOUND PER CELL. The grids are rebuilt on
   every refresh, so per-cell listeners would have to be re-attached by every
   path that repaints — and the one that forgot would leave dead cells that
   look identical to live ones. One listener on the document survives every
   repaint by construction. */
addEventListener('contextmenu', e=>{
  const el = e.target && e.target.closest && e.target.closest('.item[data-uid]');
  if(!el) return;
  /* an orb on the cursor means right-click is doing something else */
  if(window.S && S.useItem) return;
  const it = (window.ITEM_BY_UID||{})[el.dataset.uid];
  if(!it) return;
  e.preventDefault();
  e.stopPropagation();
  sellToggle(it);
});

addEventListener('keydown', e=>{
  if(e.key!=='s' && e.key!=='S') return;
  /* ⚠ NEVER STEAL A KEYSTROKE FROM A TEXT FIELD. The support search box and
     any future input would otherwise lose every "s" the player types. */
  const t=e.target;
  if(t && (/INPUT|TEXTAREA|SELECT/.test(t.tagName||'') || t.isContentEditable)) return;
  if(e.ctrlKey || e.metaKey || e.altKey) return;
  if(!SELL.marks.size) return;               /* nothing marked: leave S alone */
  e.preventDefault();
  sellConfirm();
});""")

# marks must repaint after any grid rebuild
rep('repaint',
"""function flashItem(uid){""",
"""/* the grids are rebuilt constantly; re-apply the marks after each one */
(function(){
  const wrap=(name)=>{
    const orig=window[name];
    if(typeof orig!=='function') return;
    window[name]=function(){
      const r=orig.apply(this, arguments);
      try{ if(window.sellPaint) sellPaint(); }catch(e){}
      return r;
    };
  };
  /* ⚠ deferred: these are defined later in the file than this block runs */
  setTimeout(()=>{ ['drawInv','drawStash','refreshAll'].forEach(wrap); }, 0);
})();

function flashItem(uid){""")

CSS = """
/* ---- mark to sell (v232) -------------------------------------------------- */
.item.sellmark{
  outline:2px solid #d8623f; outline-offset:-2px;
  box-shadow:inset 0 0 0 9999px rgba(216,98,63,.22);
}
.item.sellmark::after{
  content:''; position:absolute; right:2px; top:2px; width:7px; height:7px;
  border-radius:50%; background:#d8623f; box-shadow:0 0 5px rgba(216,98,63,.9);
  pointer-events:none;
}
#sellBar{
  position:fixed; left:50%; bottom:132px; transform:translateX(-50%);
  z-index:62; display:none; align-items:center; gap:13px;
  padding:9px 13px 9px 15px;
  background:linear-gradient(180deg,rgba(28,16,12,.96),rgba(14,9,7,.97));
  border:1px solid #7a4030; box-shadow:0 4px 18px rgba(0,0,0,.7);
}
#sellBar.on{ display:flex }
#sellBar .sbN{ font:700 17px "Cinzel",Georgia,serif; color:#f0a184 }
#sellBar .sbT{ font:12px "Trebuchet MS",sans-serif; color:#b9ae95 }
#sellBar .sbG{ font:700 14px "Trebuchet MS",sans-serif; color:#f0d488;
  padding-left:11px; border-left:1px solid #4a3328 }
#sellBar button{
  cursor:pointer; padding:7px 13px; font:600 11.5px "Trebuchet MS",sans-serif;
  letter-spacing:.1em; text-transform:uppercase;
}
#sellBar .sbSell{ color:#1a0d08; border:1px solid #e0906e;
  background:linear-gradient(180deg,#f0a184,#c86a48 55%,#8a3f28) }
#sellBar .sbSell b{ margin-left:6px; opacity:.72; font-weight:700 }
#sellBar .sbSell:hover{ background:linear-gradient(180deg,#ffb99c,#dc7d58 55%,#a04c30) }
#sellBar .sbClear{ color:#b9ae95; border:1px solid #4a4335; background:rgba(0,0,0,.35) }
#sellBar .sbClear:hover{ border-color:#8a8471; color:#e6e2d8 }

#sellConfirm{
  position:fixed; inset:0; z-index:70; display:none;
  align-items:center; justify-content:center; background:rgba(3,4,6,.7);
}
#sellConfirm.on{ display:flex }
.scBox{
  width:min(400px,90vw); padding:26px 28px 22px; text-align:center;
  background:linear-gradient(165deg,#1b1a17,#0d0d0c 62%);
  border:1px solid #7a4030; box-shadow:0 16px 50px rgba(0,0,0,.8);
}
.scTitle{ font:700 21px "Cinzel",Georgia,serif; color:#f0e3c2; letter-spacing:.03em }
.scGold{ font:700 30px "Cinzel",Georgia,serif; color:#f0d488; margin:11px 0 6px }
.scGold span{ font:600 13px "Trebuchet MS",sans-serif; color:#8a8471;
  letter-spacing:.14em; margin-left:5px }
.scNote{ font:12px/1.55 "Trebuchet MS",sans-serif; color:#8a8471;
  max-width:34ch; margin:0 auto 20px }
.scBtns{ display:flex; gap:11px }
.scBtns button{ flex:1; padding:12px; cursor:pointer;
  font:700 13px "Trebuchet MS",sans-serif; letter-spacing:.14em; text-transform:uppercase }
.scYes{ color:#1a0d08; border:1px solid #e0906e;
  background:linear-gradient(180deg,#f0a184,#c86a48 55%,#8a3f28) }
.scYes:hover{ background:linear-gradient(180deg,#ffb99c,#dc7d58 55%,#a04c30) }
.scNo{ color:#c9c2b2; border:1px solid #4a4335; background:rgba(0,0,0,.4) }
.scNo:hover{ border-color:#8a8471; color:#f0e3c2 }
"""
rep('css', "\n</style>", "\n" + CSS + "\n</style>")

open('work.html','w',encoding='utf-8').write(src)
print('applied:', hits)
