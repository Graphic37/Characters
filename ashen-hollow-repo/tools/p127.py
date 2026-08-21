src = open('work.html', encoding='utf-8').read()
hits = {}
def rep(name, old, new, count=1):
    global src
    n = src.count(old)
    assert n == count, f"{name}: expected {count}, found {n}"
    src = src.replace(old, new); hits[name] = n

# ============================================ SIMPLER MARKUP
a = src.index('  /* ---- right: the selected skill, at a size worth looking at ----------- */')
b = src.index("  const action = maxed")
NEW = r"""  /* ---- right: the selected skill ---------------------------------------
     ⚠ THE CAPTIONS UNDER EACH SOCKET WERE THE OVERFLOW. "Free / Owned / Owned
     / Owned / Owned" is four repetitions of what the lit dot already says, and
     because a flex item will not shrink below its own text, that caption set a
     hard minimum width on every socket — five of them could not fit the column
     and the row ran out through the frame.
     So the caption is gone. A socket now shows the dot and its number; the
     PRICE appears under the one you can actually buy, which is the only place
     a number means anything. */
  let sockets='';
  for(let i=1;i<=max;i++){
    const owned = i<=have;
    const next  = (i===have+1);
    sockets +=
      '<div class="gsSock'+(owned?' own':next?' next':' far')+'">'+
        '<div class="gsSockDot">'+(owned?'<i></i>':'')+'</div>'+
        '<div class="gsSockNo">'+i+'</div>'+
      '</div>';
  }

"""
src = src[:a] + NEW + src[b:]

# the header carries the count, so the sub-line can go
rep('head',
"""        '<div class="gsHead">'+
          '<div class="gsName">'+(SK[sel].n||sel)+'</div>'+
          '<div class="gsSub">Support Slots <b>'+have+' / '+max+'</b></div>'+
        '</div>'+""",
"""        '<div class="gsHead">'+
          '<div class="gsName">'+(SK[sel].n||sel)+'</div>'+
          '<div class="gsSub">Support Slots <b>'+have+' / '+max+'</b></div>'+
        '</div>'+""")

open('work.html','w',encoding='utf-8').write(src)
print('applied:', hits, '| socket block simplified')
