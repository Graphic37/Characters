src = open('work.html', encoding='utf-8').read()
hits = {}
def rep(name, old, new, count=1):
    global src
    n = src.count(old)
    assert n == count, f"{name}: expected {count}, found {n}"
    src = src.replace(old, new); hits[name] = n

# ============================================ 1. A WIDER, CLEARER PLUS
rep('plus',
"""    const plus=document.createElement('button');
    plus.className='tab tabPlus';
    plus.id='stashAddTab';
    plus.textContent='+';
    const cost=stashTabCost(n);
    plus.title='Buy Stash Tab \\u2014 '+fmt(cost)+' gold\\n'+
               'Adds one permanent general-purpose storage tab.';
    plus.onclick=()=>stashBuyConfirm();
    tabs.appendChild(plus);""",
"""    const plus=document.createElement('button');
    plus.className='tab tabPlus';
    plus.id='stashAddTab';
    const cost=stashTabCost(n);
    /* ⚠ A BARE "+" WAS A GUESS, NOT A BUTTON. It read as a spacer beside four
       labelled tabs and said nothing about what it does or what it costs — he
       had to click an unknown control to find out. It now states both. */
    plus.innerHTML='<b>+</b> <span>New Tab</span> <i>'+fmtShort(cost)+'</i>';
    plus.title='Buy Stash Tab \\u2014 '+fmt(cost)+' gold\\n'+
               'Adds one permanent general-purpose storage tab.';
    plus.onclick=()=>stashBuyConfirm();
    tabs.appendChild(plus);""")

# ============================================ 2. DRAG TO REORDER
rep('order',
"""function stashTabName(id){""",
"""/* ===========================================================================
   TAB ORDER  —  drag with the left button
   ---------------------------------------------------------------------------
   The strip's order was fixed by construction, so a bought tab always landed
   at the end regardless of what he kept in it. The order is the player's, so
   it lives in the SAVE.
   ⚠ ORDER IS STORED AS A LIST OF IDS, NOT AN INDEX PER TAB. An index-per-tab
   scheme has to be renumbered on every move and silently breaks if two tabs
   ever hold the same number; a list cannot express a duplicate or a gap.
   ⚠ AND IT IS RECONCILED, NOT TRUSTED: any id in the save that no longer
   exists is dropped, and any tab missing from the save is appended. A future
   tab, or a removed one, cannot leave the strip empty or hide a board.
   ========================================================================= */
function stashTabOrder(){
  const all=STASH_TABS.map(t=>t.id);
  let saved=[];
  try{ saved=(S.stashOrder||[]).filter(id=>all.indexOf(id)>=0); }catch(e){}
  const seen={};
  const out=[];
  saved.forEach(id=>{ if(!seen[id]){ seen[id]=1; out.push(id); } });
  all.forEach(id=>{ if(!seen[id]) out.push(id); });   /* anything new goes last */
  return out;
}
function stashTabsOrdered(){
  const byId={};
  STASH_TABS.forEach(t=>byId[t.id]=t);
  return stashTabOrder().map(id=>byId[id]).filter(Boolean);
}
window.stashTabsOrdered=stashTabsOrdered;
function stashMoveTab(dragId, beforeId){
  try{
    const order=stashTabOrder().filter(id=>id!==dragId);
    const at=beforeId ? order.indexOf(beforeId) : -1;
    if(at<0) order.push(dragId); else order.splice(at, 0, dragId);
    S.stashOrder=order;
    refreshStashTabs();
    return order;
  }catch(e){ window.ahErr&&window.ahErr(e,'stashMoveTab'); return null; }
}
window.stashMoveTab=stashMoveTab;
window.stashOrderReset=function(){ S.stashOrder=null; refreshStashTabs(); };

function stashTabName(id){""")

# the strip must iterate the ORDER, not the construction order
rep('iterate',
"""  tabs.innerHTML='';
  STASH_TABS.forEach(t=>{
    if(!stashTabUnlocked(t.id)) return;          /* not bought, and empty */""",
"""  tabs.innerHTML='';
  (window.stashTabsOrdered? stashTabsOrdered() : STASH_TABS).forEach(t=>{
    if(!stashTabUnlocked(t.id)) return;          /* not bought, and empty */""")

open('work.html','w',encoding='utf-8').write(src)
print('applied:', hits)
