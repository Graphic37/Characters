src = open('work.html', encoding='utf-8').read()
hits = {}
def rep(name, old, new, count=1):
    global src
    n = src.count(old)
    assert n == count, f"{name}: expected {count}, found {n}"
    src = src.replace(old, new); hits[name] = n

# ============================================ 1. CRAFT LEAVES MARA
rep('mara',
"""    /* the two screens that used to live under Garrick's tabs */
    {id:'vSalv', label:'Salvage', onClick:()=>salvagePanel()},
    {id:'vCraft', label:'Crafting bench', onClick:()=>{ if(window.craftPanel) craftPanel(); }}""",
"""    /* ⚠ CRAFT REMOVED FROM HERE (v232). Crafting is done with the bench and
       the inventory open TOGETHER — an orb on the cursor, an item in the bag —
       so a standalone bench panel behind a vendor button is a worse version of
       a flow that already works. `craftPanel` itself is untouched and still
       reachable from the currency board; only this shortcut is gone.
       Salvage stays for now: marked-sell replaces it, and it should not be
       removed until that is the better route. */
    {id:'vSalv', label:'Salvage', onClick:()=>salvagePanel()}""")

# ============================================ 2. MARK-TO-SELL
rep('marks',
"""function salvageValue(it){""",
"""/* ===========================================================================
   MARK TO SELL  (v232)
   ---------------------------------------------------------------------------
   Right-click marks an item, S sells everything marked after one confirm.

   ⚠ MARKS LIVE IN A SET OF uids, NOT ON THE ITEMS. A flag on the item would
   have to be cleared on every path that destroys, moves, stacks or reloads one
   — and a stale `sellMark` on a saved item would resurrect a mark across a
   session. A Set outside the items is emptied in one place and cannot desync,
   and an item that vanished simply stops resolving.
   ========================================================================= */
const SELL = { marks:new Set() };
window.SELL = SELL;

function sellMarkable(it){
  if(!it) return false;
  if(it.locked) return false;               /* locking is a promise; honour it */
  if(it.kind!=='gear') return false;        /* currency and runes are not junk */
  if(window.EQ) for(const k in EQ) if(EQ[k]===it) return false;   /* worn */
  return true;
}
function sellToggle(it){
  if(!sellMarkable(it)){
    try{ toast(it && it.locked ? 'That item is locked.'
              : 'Only unequipped equipment can be marked.'); }catch(e){}
    return false;
  }
  if(SELL.marks.has(it.uid)) SELL.marks.delete(it.uid);
  else SELL.marks.add(it.uid);
  sellPaint();
  return true;
}
/* resolve marks to live items, dropping any that no longer exist */
function sellMarked(){
  const out=[];
  SELL.marks.forEach(uid=>{
    const it=(window.ITEM_BY_UID||{})[uid];
    if(it && sellMarkable(it) && findContainerOf(it)) out.push(it);
    else SELL.marks.delete(uid);            /* gone: forget it */
  });
  return out;
}
function sellTotal(){ return sellMarked().reduce((n,it)=>n+salvageValue(it),0); }

/* the visual mark, and the running total bar */
function sellPaint(){
  try{
    document.querySelectorAll('.item[data-uid]').forEach(el=>{
      el.classList.toggle('sellmark', SELL.marks.has(+el.dataset.uid) ||
                                      SELL.marks.has(el.dataset.uid));
    });
    let bar=document.getElementById('sellBar');
    const items=sellMarked();
    if(!items.length){ if(bar) bar.classList.remove('on'); return; }
    if(!bar){
      bar=document.createElement('div');
      bar.id='sellBar';
      document.body.appendChild(bar);
    }
    bar.innerHTML='<span class="sbN">'+items.length+'</span>'+
      '<span class="sbT">marked for sale</span>'+
      '<span class="sbG">'+fmt(sellTotal())+' gold</span>'+
      '<button class="sbSell" id="sbSell">Sell <b>S</b></button>'+
      '<button class="sbClear" id="sbClear">Clear</button>';
    bar.classList.add('on');
    bar.querySelector('#sbSell').onclick=()=>sellConfirm();
    bar.querySelector('#sbClear').onclick=()=>{ SELL.marks.clear(); sellPaint(); };
  }catch(e){ window.ahErr&&window.ahErr(e,'sellPaint'); }
}
window.sellPaint=sellPaint;
window.sellToggle=sellToggle;
window.sellMarked=sellMarked;

/* ⚠ ONE CONFIRM, STATING THE COUNT AND THE GOLD. Selling is irreversible and
   a mis-click on S with twelve items marked is a bad afternoon. */
function sellConfirm(){
  const items=sellMarked();
  if(!items.length){ try{ toast('Nothing marked to sell.'); }catch(e){} return; }
  const gold=sellTotal();
  let el=document.getElementById('sellConfirm');
  if(!el){
    el=document.createElement('div');
    el.id='sellConfirm';
    document.body.appendChild(el);
  }
  el.innerHTML=
    '<div class="scBox">'+
      '<div class="scTitle">Sell '+items.length+' item'+(items.length>1?'s':'')+'?</div>'+
      '<div class="scGold">'+fmt(gold)+' <span>gold</span></div>'+
      '<div class="scNote">This cannot be undone. Locked and equipped items are '+
        'never marked.</div>'+
      '<div class="scBtns">'+
        '<button class="scYes" id="scYes">Yes, sell</button>'+
        '<button class="scNo" id="scNo">No</button>'+
      '</div>'+
    '</div>';
  el.classList.add('on');
  const close=()=>el.classList.remove('on');
  el.querySelector('#scNo').onclick=close;
  el.querySelector('#scYes').onclick=()=>{ close(); sellDo(); };
  el.onclick=(e)=>{ if(e.target===el) close(); };
  SELL.confirmOpen=true;
}
window.sellConfirm=sellConfirm;

function sellDo(){
  const items=sellMarked();
  if(!items.length) return;
  let gold=0, n=0;
  items.forEach(it=>{
    const c=findContainerOf(it); if(!c) return;
    gold+=salvageValue(it);
    removeItem(c,it); n++;
  });
  S.gold+=gold;
  SELL.marks.clear();
  try{ toast('Sold '+n+' item'+(n>1?'s':'')+' for '+fmt(gold)+' gold'); }catch(e){}
  try{ refreshAll(); }catch(e){}
  sellPaint();
}
window.sellDo=sellDo;

function salvageValue(it){""")

open('work.html','w',encoding='utf-8').write(src)
print('applied:', hits)
