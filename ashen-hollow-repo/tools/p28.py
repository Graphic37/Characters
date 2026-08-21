src = open('work.html', encoding='utf-8').read()
hits = {}
def rep(name, old, new, count=1):
    global src
    n = src.count(old)
    assert n == count, f"{name}: expected {count}, found {n}"
    src = src.replace(old, new); hits[name] = n

# ================================================= 1. SOCKETS ON THE ITEM ART
# He socketed a rune and could not tell whether anything happened — because
# nothing on the item changed and, with socketCount 0, the tooltip said nothing
# either. PoE draws the sockets ON the item; so do we.
rep('item-sockets',
"""  if(it.kind==='gem' && Array.isArray(it.sockets)){
    inner+='<div class="socks">'+it.sockets.map(s=>'<i style="background:'+(s?'#c2a052':'#1a1611')+'"></i>').join('')+'</div>';
  }""",
"""  if(it.kind==='gem' && Array.isArray(it.sockets)){
    inner+='<div class="socks">'+it.sockets.map(s=>'<i style="background:'+(s?'#c2a052':'#1a1611')+'"></i>').join('')+'</div>';
  }
  /* GEAR SOCKETS, DRAWN ON THE ITEM. Without this a socketed item and a bare
     one are pixel-identical in the bag, which is exactly why he could not tell
     whether his rune went in. A filled socket takes the rune's own colour, so
     the grid answers "what is in this" without a tooltip. */
  if(it.kind==='gear' && (it.socketCount||0) > 0){
    const rs=it.runes||[];
    let sk='';
    for(let i=0;i<it.socketCount;i++){
      const r=rs[i];
      sk+='<i class="gs'+(r?' full':'')+'"'+
          (r?' style="--rc:'+runeColour(r)+'"':'')+
          ' title="'+(r?(r.name||'Rune'):'Empty socket')+'"></i>';
    }
    inner+='<div class="gsocks">'+sk+'</div>';
  }""")

# one colour table, shared by the pip and the tooltip
rep('rune-colour',
"""function itemEl(it,cell){""",
"""/* A rune's colour is its stat's colour — the same hue the glyph art uses, so a
   filled socket reads as "fire in there" at a glance rather than "something". */
const RUNE_COLOUR = {
  phys:'#d8dde6', fire:'#ff8a3c', cold:'#6fd0ff', light:'#c08cff',
  pois:'#8ede4a', ar:'#e0b45c', ev:'#7fe2a8', es:'#7fb4ff', res:'#f0d070'
};
function runeColour(r){
  if(!r) return '#3a3226';
  return RUNE_COLOUR[r.stat] || RUNE_COLOUR[r.runeType] || '#c2a052';
}
window.runeColour=runeColour;

function itemEl(it,cell){""")

# the paperdoll shows them too — equipped is where they matter most
rep('paperdoll-sockets',
"""      d.innerHTML='<div class="art">'+itemArt(it)+'</div>'+
        (it.kind==='gem'?'':'');""",
"""      let pd='<div class="art">'+itemArt(it)+'</div>';
      /* the equipped item is the one whose runes are actually doing something,
         so it needs the pips more than a bag copy does */
      if(it.kind==='gear' && (it.socketCount||0) > 0){
        const rs=it.runes||[];
        let sk='';
        for(let i=0;i<it.socketCount;i++){
          const r=rs[i];
          sk+='<i class="gs'+(r?' full':'')+'"'+(r?' style="--rc:'+runeColour(r)+'"':'')+'></i>';
        }
        pd+='<div class="gsocks">'+sk+'</div>';
      }
      d.innerHTML=pd;""")

# ================================================= 2. THE TOOLTIP MUST SPEAK AT ZERO
# ⚠ THE ACTUAL REASON HE COULD NOT TELL: gear is created with `socketCount: 0`
# and only a Socket Orb or a corruption adds one — so the socket block was
# skipped entirely, and an item with no sockets looked identical to one whose
# sockets were all empty. Same lesson as the Shield 0/0 row in v164: a stat that
# vanishes when empty cannot teach you it exists.
rep('tip-zero',
"""    const scap=it.socketCount||0;
    if(scap){""",
"""    const scap=it.socketCount||0;
    if(!scap){
      b+='<hr><div class="prop lo">No sockets <span class="lo">'+
         '&mdash; a Socket Orb adds one (max '+(it.socketCapNormal||1)+')</span></div>';
    }
    if(scap){""")

CSS = """
/* ---- sockets drawn on the item (v172) ------------------------------------
   Bottom-left of the cell, small enough not to fight the art, bright enough to
   count at a glance. A filled socket carries its rune's colour through --rc. */
.item .gsocks{
  position:absolute; left:3px; bottom:3px; z-index:4;
  display:flex; gap:3px; pointer-events:none;
}
.item .gsocks .gs{
  width:9px; height:9px; border-radius:50%;
  border:1px solid #0b0906;
  background:radial-gradient(circle at 38% 32%, #2a2419, #0c0a07 72%);
  box-shadow:0 0 0 1px rgba(200,162,74,.30), inset 0 1px 2px rgba(0,0,0,.9);
}
.item .gsocks .gs.full{
  background:radial-gradient(circle at 36% 30%, #fff, var(--rc) 42%, #0a0806 88%);
  border-color:#0a0806;
  box-shadow:0 0 5px var(--rc), 0 0 0 1px rgba(0,0,0,.8);
}
/* the paperdoll is bigger, so its pips can be too */
.slot .gsocks{ left:4px; bottom:4px; gap:4px }
.slot .gsocks .gs{ width:11px; height:11px }
#tipwrap .prop.lo, #tipwrap .prop .lo{ color:#6f695c }
"""
rep('socket-css', "\n</style>", "\n" + CSS + "\n</style>")

open('work.html','w',encoding='utf-8').write(src)
print('applied:', hits)
