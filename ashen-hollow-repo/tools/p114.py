src = open('work.html', encoding='utf-8').read()
hits = {}
def rep(name, old, new, count=1):
    global src
    n = src.count(old)
    assert n == count, f"{name}: expected {count}, found {n}"
    src = src.replace(old, new); hits[name] = n

rep('run',
"""(function(){
  try{
    if(typeof stashTab!=='undefined' && !stashTabUnlocked(stashTab)) stashTab='st0';
  }catch(e){}
})();""",
"""(function(){
  try{
    /* ⚠ RUN THE MIGRATION BEFORE THE SELECTED-TAB GUARD, not after — the guard
       reads `stashTabUnlocked`, and DUMP's answer changes the moment it is
       emptied. Retried on every load while anything is left, because the
       reason for a failure is usually "no room", which the player fixes. */
    if(window.migrateDumpTab && (!S.dumpMigrated)) migrateDumpTab();
  }catch(e){ window.ahErr&&window.ahErr(e,'dumpMigrate:boot'); }
  try{
    if(typeof stashTab!=='undefined' && !stashTabUnlocked(stashTab)) stashTab='st0';
  }catch(e){}
})();""")

rep('copy',
"""  el.innerHTML=
    '<div class="sbBox">'+
      '<div class="sbTitle">Unlock another stash tab?</div>'+
      '<div class="sbCost">'+fmt(cost)+' <span>gold</span></div>'+
      '<div class="sbNote">'+(gold>=cost
        ? ('You have '+fmt(gold)+'. Tab '+(n+1)+' of '+STASH_EXTRA_ORDER.length+'.')
        : ('You have '+fmt(gold)+' \\u2014 '+fmt(cost-gold)+' short.'))+'</div>'+""",
"""  el.innerHTML=
    '<div class="sbBox">'+
      '<div class="sbTitle">Buy Stash Tab</div>'+
      '<div class="sbCost">'+fmt(cost)+' <span>gold</span></div>'+
      '<div class="sbWhat">Adds one permanent general-purpose storage tab.</div>'+
      '<div class="sbNote">'+(gold>=cost
        ? ('You have '+fmt(gold)+'. This is tab '+(n+1)+' of '+
           STASH_EXTRA_ORDER.length+'.')
        : ('You have '+fmt(gold)+' \\u2014 '+fmt(cost-gold)+' short.'))+'</div>'+""")

rep('plus-title',
"""    plus.title='Buy another stash tab \\u2014 '+fmt(cost)+' gold';""",
"""    plus.title='Buy Stash Tab \\u2014 '+fmt(cost)+' gold\\n'+
               'Adds one permanent general-purpose storage tab.';""")

CSS = """
.sbWhat{
  font:13px/1.5 "Trebuchet MS",sans-serif; color:#b9b3a2;
  max-width:32ch; margin:0 auto 10px;
}
"""
rep('css', "\n</style>", "\n" + CSS + "\n</style>")

open('work.html','w',encoding='utf-8').write(src)
print('applied:', hits)
