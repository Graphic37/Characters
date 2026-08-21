src = open('work.html', encoding='utf-8').read()
hits = {}
def rep(name, old, new, count=1):
    global src
    n = src.count(old)
    assert n == count, f"{name}: expected {count}, found {n}"
    src = src.replace(old, new); hits[name] = n

# ============================================== 1. THE COSTS, AS CONFIG
rep('cost-table',
"""const SUPPORT_SLOTS_MAX = 3;""",
"""/* ⚠ COSTS ARE INDEXED BY SLOT NUMBER ONLY, NEVER BY SKILL — his call, and the
   right one: the same Slot 2 price for every skill is one number to balance
   instead of eleven, and a player can learn it once. If a per-skill price is
   ever genuinely wanted, this table is where it would grow a second dimension;
   nothing else in the game would need to change.
   TUNING DATA. Slot 3 is deliberately far more than Slot 2 — the jump is the
   point, so a third support reads as an investment rather than a formality. */
const SUPPORT_SLOT_COST = { 2: 25000, 3: 140000 };
window.SUPPORT_SLOT_COST = SUPPORT_SLOT_COST;

const SUPPORT_SLOTS_MAX = 3;""")

# ============================================== 2. THE PURCHASE
rep('buy',
"""window.supportSlots=supportSlots;""",
"""window.supportSlots=supportSlots;

/* What the NEXT slot costs for this skill, or null when it is already maxed. */
function nextSlotCost(skillId){
  const have = supportSlots(skillId);
  if(have >= SUPPORT_SLOTS_MAX) return null;
  const c = SUPPORT_SLOT_COST[have + 1];
  return (typeof c === 'number') ? c : null;
}
window.nextSlotCost = nextSlotCost;

/* Buy one slot for ONE skill. Permanent, saved with that skill's gem state, and
   deliberately NOT global — unlocking Multishot's slot 2 leaves Rapid Fire at 1.
   Returns a small result object rather than a bare boolean so the caller can
   say WHY it refused without re-deriving it. */
function buySupportSlot(skillId){
  try{
    const g = (typeof gemFor==='function') ? gemFor(skillId) : null;
    if(!g) return { ok:false, why:'no-skill' };
    const have = supportSlots(skillId);
    if(have >= SUPPORT_SLOTS_MAX) return { ok:false, why:'maxed', have:have };
    const cost = nextSlotCost(skillId);
    if(cost === null) return { ok:false, why:'no-price', have:have };
    if((S.gold||0) < cost) return { ok:false, why:'gold', have:have, cost:cost,
                                    short: cost - (S.gold||0) };
    S.gold -= cost;
    g.supportSlots = have + 1;
    /* the pip in the skill panel is driven by supportSlots(), so it unlocks the
       moment this returns — nothing else to notify */
    try{ if(window.markStatsDirty) markStatsDirty(); }catch(e){}
    try{ if(window.refreshAll) refreshAll(); }catch(e){}
    try{ if(window.updateSkillsPanel) updateSkillsPanel(); }catch(e){}
    return { ok:true, have:g.supportSlots, cost:cost };
  }catch(e){
    window.ahErr&&window.ahErr(e,'buySupportSlot');
    return { ok:false, why:'error' };
  }
}
window.buySupportSlot = buySupportSlot;""")

# ============================================== 3. THE TAB
rep('tabbar',
"""    [['salvage','SALVAGE'],['craft','CRAFT'],['repair','REPAIR']].map(([id,label])=>""",
"""    [['salvage','SALVAGE'],['craft','CRAFT'],['repair','REPAIR'],['slots','SUPPORT SLOTS']].map(([id,label])=>""")

rep('route',
"""  const body =
    GAR.tab==='salvage' ? garSalvageBody() :
    GAR.tab==='repair'  ? garRepairBody()  : null;""",
"""  const body =
    GAR.tab==='salvage' ? garSalvageBody() :
    GAR.tab==='repair'  ? garRepairBody()  :
    GAR.tab==='slots'   ? garSlotsBody()   : null;""")

rep('wire',
"""  document.querySelectorAll('#winBody [data-salv]').forEach(el=>""",
"""  document.querySelectorAll('#winBody [data-buyslot]').forEach(el=>
    garSafeClick(el, ()=>{
      const r=buySupportSlot(el.dataset.buyslot);
      if(r.ok){
        try{ toast('Support Slot '+r.have+' unlocked \\u2014 '+fmt(r.cost)+' gold'); }catch(e){}
      } else if(r.why==='gold'){
        /* REFUSE CLEANLY: name the shortfall rather than just failing */
        try{ toast('Not enough gold \\u2014 '+fmt(r.short)+' short of '+fmt(r.cost)); }catch(e){}
      } else if(r.why==='maxed'){
        try{ toast('That skill already has all three support slots.'); }catch(e){}
      }
      garrickPanel('slots');          /* repaint either way */
    }));
  document.querySelectorAll('#winBody [data-salv]').forEach(el=>""")

rep('body',
"""function garSalvageBody(){""",
"""/* ---- Garrick: support slot upgrades (phase 3) ---------------------------
   Gold's permanent sink. One row per skill: what it has, what the next slot
   costs, and a button that is honest about why it cannot be pressed. */
function garSlotsBody(){
  const SK = window.SKILLS || {};
  const ids = Object.keys(SK);
  if(!ids.length) return '<div class="garnote">No skills available.</div>';
  const gold = S.gold||0;
  const rows = ids.map(id=>{
    const sk = SK[id];
    const have = window.supportSlots ? supportSlots(id) : 1;
    const max  = window.SUPPORT_SLOTS_MAX || 3;
    const cost = window.nextSlotCost ? nextSlotCost(id) : null;
    const maxed = have >= max;
    const afford = cost !== null && gold >= cost;
    let pips='';
    for(let i=0;i<max;i++) pips += '<i class="slpip'+(i<have?' on':'')+'"></i>';
    return '<div class="slrow'+(maxed?' maxed':'')+'">'+
      '<div class="slname">'+(sk.n||id)+'</div>'+
      '<div class="slpips">'+pips+'<span>'+have+' / '+max+'</span></div>'+
      (maxed
        ? '<div class="slmax">MAXED</div>'
        : '<button class="slbuy'+(afford?'':' poor')+'" data-buyslot="'+id+'">'+
            '<i>Unlock Slot '+(have+1)+'</i>'+
            '<b>'+fmt(cost)+' gold</b>'+
          '</button>')+
    '</div>';
  }).join('');
  return '<div class="slhead">Support slots are permanent and bought per skill. '+
           'Unlocking a slot on one skill does not unlock it on another.</div>'+
         '<div class="slwrap">'+rows+'</div>'+
         '<div class="slgold">Gold: <b>'+fmt(gold)+'</b></div>';
}

function garSalvageBody(){""")

CSS = """
/* ---- Garrick: support slot upgrades (v183) ------------------------------- */
.slhead{ font:11px "Trebuchet MS",sans-serif; color:#8a8471; line-height:1.5;
  margin-bottom:9px; }
.slwrap{ max-height:340px; overflow-y:auto; }
.slrow{
  display:grid; grid-template-columns:minmax(0,1fr) auto auto; gap:10px;
  align-items:center; padding:7px 9px; margin-bottom:5px;
  border:1px solid #34382e; background:linear-gradient(180deg,#141710,#0c0e0a);
}
.slrow.maxed{ opacity:.72 }
.slname{ font:600 12.5px "Trebuchet MS",sans-serif; color:#cfc7a8;
  white-space:nowrap; overflow:hidden; text-overflow:ellipsis }
.slpips{ display:flex; align-items:center; gap:4px }
.slpips span{ font:10px "Trebuchet MS",sans-serif; color:#7d7768; margin-left:4px }
.slpip{ width:9px; height:9px; border-radius:50%; border:1px solid #3d4132;
  background:#0a0c08 }
.slpip.on{ background:radial-gradient(circle at 38% 32%, #cfe8dd, #2fa39a 60%, #0a0c08);
  border-color:#0a0c08; box-shadow:0 0 5px rgba(47,163,154,.55) }
.slmax{ font:600 10px "Trebuchet MS",sans-serif; letter-spacing:.16em; color:#2fa39a }
.slbuy{
  display:flex; flex-direction:column; align-items:flex-end; gap:1px;
  padding:5px 10px; cursor:pointer; white-space:nowrap;
  border:1px solid #6b5a33; background:linear-gradient(180deg,#2a2313,#14110b);
}
.slbuy i{ font:600 10px "Trebuchet MS",sans-serif; font-style:normal; color:#c8bda2 }
.slbuy b{ font:600 11.5px "Trebuchet MS",sans-serif; color:#f0d488 }
.slbuy:hover{ border-color:#c8a24a; background:linear-gradient(180deg,#3a2f18,#1c170d) }
/* affordable or not, the price is always shown — the button explains itself */
.slbuy.poor{ border-color:#4a3a32 }
.slbuy.poor b{ color:#c06a58 }
.slgold{ margin-top:9px; text-align:right; font:11px "Trebuchet MS",sans-serif;
  color:#8a8471 }
.slgold b{ color:#f0d488; font-size:12.5px }
.garnote{ font:11px "Trebuchet MS",sans-serif; color:#8a8471 }
"""
rep('css', "\n</style>", "\n" + CSS + "\n</style>")

open('work.html','w',encoding='utf-8').write(src)
print('applied:', hits)
