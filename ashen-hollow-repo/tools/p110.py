src = open('work.html', encoding='utf-8').read()
hits = {}
def rep(name, old, new, count=1):
    global src
    n = src.count(old)
    assert n == count, f"{name}: expected {count}, found {n}"
    src = src.replace(old, new); hits[name] = n

rep('tabfor',
"""function stashTabFor(it){
  for(const id of ['st0','st1','st2','st4']) if(STASH_RULES[id].takes(it)) return id;
  return 'st3';
}""",
"""function stashTabFor(it){
  for(const id of ['st0','st1','st2','st4']) if(STASH_RULES[id].takes(it)) return id;
  /* ⚠ DUMP IS NO LONGER GUARANTEED TO EXIST. It is the first purchasable tab
     now, so an unclassified item must fall back to a tab the player can
     actually open — GEAR is a real grid and always present. Returning a locked
     tab here would put the item in the save and nowhere on screen. */
  return (window.stashTabUnlocked && stashTabUnlocked('st3')) ? 'st3' : 'st0';
}""")

rep('put',
"""  const BOARD={st1:1, st2:1, st4:1};
  const player=[];
  for(const k in CONT) if(/^st\\d+$/.test(k) && !BOARD[k] && k!=='st3' && k!=='st0') player.push(k);""",
"""  const BOARD={st1:1, st2:1, st4:1};
  const player=[];
  /* ⚠ ONLY UNLOCKED TABS ARE OVERFLOW. Filling a tab he has not bought hides
     the item behind a purchase — and the grandfather rule would then reveal
     the tab, which reads as the stash silently growing on its own. */
  for(const k in CONT) if(/^st\\d+$/.test(k) && !BOARD[k] && k!=='st3' && k!=='st0'
      && (!window.stashTabUnlocked || stashTabUnlocked(k))) player.push(k);""")

rep('order',
"""  const order=[home,'st3','st0'].concat(player).filter((v,i,a)=>a.indexOf(v)===i)
                                .filter(id=>id===home || !BOARD[id]);""",
"""  const dump=(!window.stashTabUnlocked || stashTabUnlocked('st3')) ? ['st3'] : [];
  const order=[home].concat(dump,['st0'],player).filter((v,i,a)=>a.indexOf(v)===i)
                                .filter(id=>id===home || !BOARD[id]);""")

# if the open tab becomes locked (it never should, but saves drift), fall back
rep('guard',
"""window.refreshStashTabs=refreshStashTabs;""",
"""window.refreshStashTabs=refreshStashTabs;
/* a save from before v234 could have DUMP selected while it is now locked and
   empty — land on GEAR rather than on a tab with no button */
(function(){
  try{
    if(typeof stashTab!=='undefined' && !stashTabUnlocked(stashTab)) stashTab='st0';
  }catch(e){}
})();""")

CSS = """
/* ---- stash tab purchase (v234) -------------------------------------------- */
#stashTabs .tabPlus{
  min-width:34px; padding-left:0 !important; padding-right:0 !important;
  font:700 17px/1 "Trebuchet MS",sans-serif; color:#c8a24a;
  background-image:none !important;
}
#stashTabs .tabPlus:hover{ color:#f5e8c8; border-color:#c8a24a }
#stashBuy{
  position:fixed; inset:0; z-index:70; display:none;
  align-items:center; justify-content:center; background:rgba(3,4,6,.7);
}
#stashBuy.on{ display:flex }
.sbBox{
  width:min(400px,90vw); padding:26px 28px 22px; text-align:center;
  background:linear-gradient(165deg,#1b1a17,#0d0d0c 62%);
  border:1px solid #6b5a33; box-shadow:0 16px 50px rgba(0,0,0,.8);
}
.sbTitle{ font:700 20px "Cinzel",Georgia,serif; color:#f0e3c2; letter-spacing:.03em }
.sbCost{ font:700 30px "Cinzel",Georgia,serif; color:#f0d488; margin:11px 0 6px }
.sbCost span{ font:600 13px "Trebuchet MS",sans-serif; color:#8a8471;
  letter-spacing:.14em; margin-left:5px }
.sbNote{ font:12px/1.55 "Trebuchet MS",sans-serif; color:#8a8471;
  max-width:34ch; margin:0 auto 20px }
.sbBtns{ display:flex; gap:11px }
.sbBtns button{ flex:1; padding:12px; cursor:pointer;
  font:700 13px "Trebuchet MS",sans-serif; letter-spacing:.14em; text-transform:uppercase }
.sbYes{ color:#1a1206; border:1px solid #e0c07a;
  background:linear-gradient(180deg,#f0d488,#c8a24a 55%,#8a6a1c) }
.sbYes:hover{ background:linear-gradient(180deg,#fbe6a6,#dcb85e 55%,#a07f27) }
.sbNo{ color:#c9c2b2; border:1px solid #4a4335; background:rgba(0,0,0,.4) }
.sbNo:hover{ border-color:#8a8471; color:#f0e3c2 }
"""
rep('css', "\n</style>", "\n" + CSS + "\n</style>")

open('work.html','w',encoding='utf-8').write(src)
print('applied:', hits)
