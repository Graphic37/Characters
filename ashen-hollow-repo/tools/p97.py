src = open('work.html', encoding='utf-8').read()
hits = {}
def rep(name, old, new, count=1):
    global src
    n = src.count(old)
    assert n == count, f"{name}: expected {count}, found {n}"
    src = src.replace(old, new); hits[name] = n

# ============================================ 1. THE PANEL NEEDS ROOM
# ⚠ THE 440px WINDOW IS WHY THE ROWS WERE CRAMPED. Every fix inside the body
# would have been fighting the frame. Widened for THIS PANEL ONLY — the vendor
# and salvage tabs are lists and read fine at 440.
rep('width',
"""function garSlotsBody(){""",
"""/* the workshop board needs width; the other Garrick tabs do not */
function garWide(on){
  try{ document.getElementById('ahWin').classList.toggle('wide', !!on); }
  catch(e){ window.ahErr&&window.ahErr(e,'garWide'); }
}
window.garWide=garWide;

function garSlotsBody(){""")

# ============================================ 2. MASTER / DETAIL
a = src.index('function garSlotsBody(){')
b = src.index('function fmtShort(n){')
NEW = r"""function garSlotsBody(){
  const SK = window.SKILLS || {};
  const ids = Object.keys(SK);
  if(!ids.length) return '<div class="garnote">No skills available.</div>';
  const gold = S.gold||0;
  const max  = window.SUPPORT_SLOTS_MAX || 5;

  /* ⚠ MASTER / DETAIL, NOT A TABLE OF EVERYTHING.
     The old board showed every skill's whole ladder at once, so each row got a
     sliver of a 440px window and nothing could be bigger than a chip. Showing
     ONE skill in full costs a click and buys the room to make the thing being
     bought look worth buying — which is the actual complaint.
     The selection lives on GAR so it survives the repaint after a purchase. */
  if(!GAR.slotSel || !SK[GAR.slotSel]) GAR.slotSel = ids[0];
  const sel  = GAR.slotSel;
  const have = window.supportSlots ? supportSlots(sel) : 1;
  const cost = window.nextSlotCost ? nextSlotCost(sel) : null;
  const maxed= have >= max;
  const afford = cost!==null && gold >= cost;
  const COSTS = window.SUPPORT_SLOT_COST || {};

  /* ---- left: the skill list, current slots on every row ---------------- */
  const list = ids.map(id=>{
    const h = window.supportSlots ? supportSlots(id) : 1;
    const done = h>=max;
    return '<button class="gsRow'+(id===sel?' on':'')+(done?' done':'')+'" '+
             'data-slotsel="'+id+'">'+
      '<span class="gsRowName">'+(SK[id].n||id)+'</span>'+
      '<span class="gsRowSlots'+(done?' full':'')+'">'+h+' / '+max+'</span>'+
    '</button>';
  }).join('');

  /* ---- right: the selected skill, at a size worth looking at ----------- */
  let sockets='';
  for(let i=1;i<=max;i++){
    const owned = i<=have;
    const next  = (i===have+1);
    const price = COSTS[i];
    sockets +=
      '<div class="gsSock'+(owned?' own':next?' next':' far')+'">'+
        '<div class="gsSockDot">'+(owned?'<i></i>':'')+'</div>'+
        '<div class="gsSockNo">Slot '+i+'</div>'+
        '<div class="gsSockCost">'+
          (owned ? (i===1?'Free':'Owned')
                 : (price!==undefined ? fmtShort(price) : '—'))+
        '</div>'+
      '</div>';
  }

  const action = maxed
    ? '<div class="gsAct maxed">'+
        '<div class="gsActLabel">Maxed</div>'+
        '<div class="gsActBig">All '+max+' slots unlocked</div>'+
        '<div class="gsActNote">Nothing further to buy for this skill.</div>'+
      '</div>'
    : '<div class="gsAct'+(afford?'':' poor')+'">'+
        '<div class="gsActLabel">Next Upgrade</div>'+
        '<div class="gsActBig">Unlock Slot '+(have+1)+'</div>'+
        '<div class="gsActCost">'+fmt(cost)+' <span>Gold</span></div>'+
        (afford
          ? '<button class="gsBuy" data-buyslot="'+sel+'">Purchase</button>'
          : '<div class="gsShort">Need '+fmtShort(cost-gold)+' more</div>')+
      '</div>';

  return '<div class="gsHelp">Unlock additional Support Gem slots for each '+
           'skill. Every skill starts with one. Extra slots are permanent, '+
           'bought per skill, and never shared between skills.</div>'+
    '<div class="gsWrap">'+
      '<div class="gsList">'+list+'</div>'+
      '<div class="gsDetail">'+
        '<div class="gsHead">'+
          '<div class="gsName">'+(SK[sel].n||sel)+'</div>'+
          '<div class="gsSub">Support Slots <b>'+have+' / '+max+'</b></div>'+
        '</div>'+
        '<div class="gsSocks">'+sockets+'</div>'+
        action+
      '</div>'+
    '</div>'+
    '<div class="gsFoot">'+
      '<div class="gsGold"><i class="gsCoin"></i>'+
        '<span>Your Gold</span><b>'+fmt(gold)+'</b></div>'+
    '</div>';
}

"""
src = src[:a] + NEW + src[b:]
open('work.html','w',encoding='utf-8').write(src)
print('applied:', hits, '| body rewritten')
