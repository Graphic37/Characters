src = open('work.html', encoding='utf-8').read()
hits = {}
def rep(name, old, new, count=1):
    global src
    n = src.count(old)
    assert n == count, f"{name}: expected {count}, found {n}"
    src = src.replace(old, new); hits[name] = n

# ============================================ THE UNLOCK MODEL
rep('model',
"""/* the player's names, persisted with the save */
function stashTabName(id){""",
"""/* ===========================================================================
   STASH TAB UNLOCKS  (v234)
   ---------------------------------------------------------------------------
   Four boards ship: GEAR, CURRENCY, SUPPORTS, RUNES. Everything else — DUMP
   and the seven generic tabs — is bought with gold, one at a time.

   ⚠ A TAB THAT HOLDS ITEMS IS ALWAYS SHOWN, BOUGHT OR NOT. His save already
   has seven items in DUMP; hiding that tab would leave them in the save file
   and unreachable on screen, which is the worst possible outcome — worse than
   an ugly tab strip, because nothing tells him they are gone. Grandfathering
   costs one `.items.length` check and makes the change impossible to lose data
   through.

   ⚠ AND DUMP IS LOAD-BEARING: `stashTabFor` returns it for anything that is
   not gear, currency, a support or a rune, and `stashPut` uses it as first
   overflow. Both are re-pointed below so a deposit never routes into a tab the
   player cannot open.
   ========================================================================= */
const STASH_BASE = ['st0','st1','st2','st4'];      /* always available */
/* the order extras unlock in — DUMP first, it is the most useful */
const STASH_EXTRA_ORDER = ['st3','st5','st6','st7','st8','st9','st10','st11'];
/* 25k, then x2.4 a tab: the first is a session away, the eighth is a project */
function stashTabCost(nBought){
  return Math.round(25000 * Math.pow(2.4, nBought) / 500) * 500;
}
function stashBought(){
  try{ return Math.max(0, Math.min(STASH_EXTRA_ORDER.length, S.stashBought|0)); }
  catch(e){ return 0; }
}
function stashTabUnlocked(id){
  if(STASH_BASE.indexOf(id)>=0) return true;
  const i=STASH_EXTRA_ORDER.indexOf(id);
  if(i<0) return false;
  if(i < stashBought()) return true;
  /* grandfathered: it holds something, so it must stay reachable */
  try{ const c=CONT[id]; if(c && c.items && c.items.length) return true; }catch(e){}
  return false;
}
window.stashTabUnlocked=stashTabUnlocked;
window.stashTabCost=stashTabCost;
window.stashBought=stashBought;

function stashBuyTab(){
  const n=stashBought();
  if(n>=STASH_EXTRA_ORDER.length){ toast('Every stash tab is unlocked.'); return {ok:false,why:'maxed'}; }
  const cost=stashTabCost(n);
  if((S.gold||0) < cost){
    toast('Not enough gold \\u2014 '+fmt(cost-(S.gold||0))+' short');
    return {ok:false, why:'gold', short:cost-(S.gold||0)};
  }
  S.gold-=cost;
  S.stashBought=n+1;
  try{ refreshStashTabs(); refreshAll(); }catch(e){}
  toast('Stash tab unlocked');
  return {ok:true, cost:cost, now:S.stashBought};
}
window.stashBuyTab=stashBuyTab;

/* the player's names, persisted with the save */
function stashTabName(id){""")

# ============================================ RENDER: 4 + BOUGHT + PLUS
rep('render',
"""  tabs.innerHTML='';
  STASH_TABS.forEach(t=>{
    const b=document.createElement('button');
    b.className='tab'+(t.id===stashTab?' on':'')+(t.fixed?' tab-fixed':'');
    b.textContent=stashTabName(t.id);
    b.dataset.tab=t.id;
    b.classList.add('tab-'+t.id);
    b.style.color = t.id===stashTab? t.col : '';
    b.title = t.fixed ? stashTabName(t.id) : 'Right-click to rename';
    const c=CONT[t.id];
    if(c && c.items.length) b.dataset.count=c.items.length;
    tabs.appendChild(b);
  });
}""",
"""  tabs.innerHTML='';
  STASH_TABS.forEach(t=>{
    if(!stashTabUnlocked(t.id)) return;          /* not bought, and empty */
    const b=document.createElement('button');
    b.className='tab'+(t.id===stashTab?' on':'')+(t.fixed?' tab-fixed':'');
    b.textContent=stashTabName(t.id);
    b.dataset.tab=t.id;
    b.classList.add('tab-'+t.id);
    b.style.color = t.id===stashTab? t.col : '';
    b.title = t.fixed ? stashTabName(t.id) : 'Right-click to rename';
    const c=CONT[t.id];
    if(c && c.items.length) b.dataset.count=c.items.length;
    tabs.appendChild(b);
  });
  /* the + button: last in the strip, priced in its tooltip */
  const n=stashBought();
  if(n < STASH_EXTRA_ORDER.length){
    const plus=document.createElement('button');
    plus.className='tab tabPlus';
    plus.id='stashAddTab';
    plus.textContent='+';
    const cost=stashTabCost(n);
    plus.title='Buy another stash tab \\u2014 '+fmt(cost)+' gold';
    plus.onclick=()=>stashBuyConfirm();
    tabs.appendChild(plus);
  }
}

/* ⚠ ONE CONFIRM, LIKE THE SELL. A tab is a five-figure purchase and the +
   sits next to tabs the player clicks constantly. */
function stashBuyConfirm(){
  const n=stashBought();
  if(n>=STASH_EXTRA_ORDER.length){ toast('Every stash tab is unlocked.'); return; }
  const cost=stashTabCost(n);
  const gold=S.gold||0;
  let el=document.getElementById('stashBuy');
  if(!el){ el=document.createElement('div'); el.id='stashBuy'; document.body.appendChild(el); }
  el.innerHTML=
    '<div class="sbBox">'+
      '<div class="sbTitle">Unlock another stash tab?</div>'+
      '<div class="sbCost">'+fmt(cost)+' <span>gold</span></div>'+
      '<div class="sbNote">'+(gold>=cost
        ? ('You have '+fmt(gold)+'. Tab '+(n+1)+' of '+STASH_EXTRA_ORDER.length+'.')
        : ('You have '+fmt(gold)+' \\u2014 '+fmt(cost-gold)+' short.'))+'</div>'+
      '<div class="sbBtns">'+
        (gold>=cost?'<button class="sbYes" id="sbYes">Yes, unlock</button>':'')+
        '<button class="sbNo" id="sbNo">'+(gold>=cost?'No':'Close')+'</button>'+
      '</div>'+
    '</div>';
  el.classList.add('on');
  const close=()=>el.classList.remove('on');
  el.querySelector('#sbNo').onclick=close;
  const yes=el.querySelector('#sbYes');
  if(yes) yes.onclick=()=>{ close(); stashBuyTab(); };
  el.onclick=(e)=>{ if(e.target===el) close(); };
}
window.stashBuyConfirm=stashBuyConfirm;""")

open('work.html','w',encoding='utf-8').write(src)
print('applied:', hits)
