src = open('work.html', encoding='utf-8').read()
hits = {}
def rep(name, old, new, count=1):
    global src
    n = src.count(old)
    assert n == count, f"{name}: expected {count}, found {n}"
    src = src.replace(old, new); hits[name] = n

# ============================================ THE SLOT SHOP, REBUILT FOR 5
rep('shop',
"""function garSlotsBody(){
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
}""",
"""function garSlotsBody(){
  const SK = window.SKILLS || {};
  const ids = Object.keys(SK);
  if(!ids.length) return '<div class="garnote">No skills available.</div>';
  const gold = S.gold||0;
  const max  = window.SUPPORT_SLOTS_MAX || 5;

  /* ⚠ WITH FIVE SLOTS THE PLAYER NEEDS TO SEE THE WHOLE LADDER, NOT JUST THE
     NEXT RUNG. At three slots "Unlock Slot 2 — 12,000" was the entire story;
     at five, a player saving for slot 5 has to know it costs 900k before they
     spend on something else. Each row shows every step, what is owned, what is
     next, and what is still ahead — and the row itself says how far off the
     next one is rather than making him do the subtraction. */
  const rows = ids.map(id=>{
    const sk = SK[id];
    const have = window.supportSlots ? supportSlots(id) : 1;
    const cost = window.nextSlotCost ? nextSlotCost(id) : null;
    const maxed = have >= max;
    const afford = cost !== null && gold >= cost;

    /* the ladder: one pip per slot, priced, with the state written on it */
    let ladder='';
    for(let i=1;i<=max;i++){
      const owned = i<=have;
      const isNext = (i===have+1);
      const price = (window.SUPPORT_SLOT_COST||{})[i];
      const cls = owned ? 'own' : isNext ? 'next' : 'far';
      ladder += '<div class="slstep '+cls+'">'+
        '<i class="slpip'+(owned?' on':'')+'"></i>'+
        '<span>'+(owned ? (i===1?'free':'owned')
                        : (price!==undefined ? fmtShort(price) : '-'))+'</span>'+
      '</div>';
    }

    const short = (cost!==null && !afford) ? (cost - gold) : 0;
    return '<div class="slrow'+(maxed?' maxed':'')+'">'+
      '<div class="slname">'+(sk.n||id)+'<em>'+have+' / '+max+'</em></div>'+
      '<div class="slladder">'+ladder+'</div>'+
      (maxed
        ? '<div class="slmax">MAXED</div>'
        : '<button class="slbuy'+(afford?'':' poor')+'" data-buyslot="'+id+'">'+
            '<i>Slot '+(have+1)+'</i>'+
            '<b>'+fmt(cost)+'</b>'+
            (short? '<u>'+fmtShort(short)+' short</u>' : '<u>affordable</u>')+
          '</button>')+
    '</div>';
  }).join('');

  return '<div class="slhead">Every skill starts with one support slot. '+
           'The other four are bought here, per skill and permanently \\u2014 '+
           'unlocking a slot on one skill does not unlock it on another.</div>'+
         '<div class="slwrap">'+rows+'</div>'+
         '<div class="slgold">Gold: <b>'+fmt(gold)+'</b></div>';
}
/* 900000 -> "900k": a five-rung price ladder does not fit at full width, and
   the exact figure is on the button anyway */
function fmtShort(n){
  n=+n||0;
  return n>=1000000 ? (n/1000000).toFixed(n%1000000?1:0)+'m'
       : n>=1000    ? Math.round(n/1000)+'k'
       : String(n);
}""")

CSS = """
/* ---- Garrick's slot ladder (v218) ---------------------------------------- */
.slrow{
  display:grid; grid-template-columns:minmax(0,1fr) auto auto;
  gap:12px; align-items:center; padding:8px 10px; margin-bottom:6px;
  border:1px solid #34382e; background:linear-gradient(180deg,#141710,#0c0e0a);
}
.slname{ font:600 13px "Trebuchet MS",sans-serif; color:#cfc7a8;
  white-space:nowrap; overflow:hidden; text-overflow:ellipsis }
.slname em{ display:block; font-style:normal; font-size:10px; color:#7d7768;
  letter-spacing:.08em; margin-top:2px }
.slladder{ display:flex; gap:7px; align-items:flex-start }
.slstep{ display:flex; flex-direction:column; align-items:center; gap:3px; width:34px }
.slstep span{ font:600 9px "Trebuchet MS",sans-serif; letter-spacing:.02em }
.slstep.own span{ color:#2fa39a }
.slstep.next span{ color:#f0d488 }
.slstep.far span{ color:#5f6874 }
.slstep.next .slpip{ border-color:#c8a24a; box-shadow:0 0 6px rgba(200,162,74,.5) }
.slbuy{ display:flex; flex-direction:column; align-items:flex-end; gap:1px;
  padding:6px 11px; cursor:pointer; white-space:nowrap;
  border:1px solid #6b5a33; background:linear-gradient(180deg,#2a2313,#14110b) }
.slbuy i{ font:600 10px "Trebuchet MS",sans-serif; font-style:normal; color:#c8bda2 }
.slbuy b{ font:600 13px "Trebuchet MS",sans-serif; color:#f0d488 }
.slbuy u{ font:9px "Trebuchet MS",sans-serif; text-decoration:none; color:#7d7768 }
.slbuy.poor u{ color:#c06a58 }
.slbuy:hover{ border-color:#c8a24a; background:linear-gradient(180deg,#3a2f18,#1c170d) }
"""
rep('css', "\n</style>", "\n" + CSS + "\n</style>")

open('work.html','w',encoding='utf-8').write(src)
print('applied:', hits)
