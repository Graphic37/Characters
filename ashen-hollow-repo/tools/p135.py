src = open('work.html', encoding='utf-8').read()
hits = {}
def rep(name, old, new, count=1):
    global src
    n = src.count(old)
    assert n == count, f"{name}: expected {count}, found {n}"
    src = src.replace(old, new); hits[name] = n

# the sell bar should name the marking key too, not just the sell key
rep('bar',
"""    bar.innerHTML='<span class="sbN">'+items.length+'</span>'+
      '<span class="sbT">marked for sale</span>'+""",
"""    bar.innerHTML='<span class="sbN">'+items.length+'</span>'+
      '<span class="sbT">marked for sale</span>'+""")

# tell the player the key exists, in the tooltip footer where it is relevant
rep('hint',
"""  if(it.kind==='gear' && !isEquipped)
    b+='<div class="tiphint">Right-click to equip.</div>';""",
"""  if(it.kind==='gear' && !isEquipped)
    b+='<div class="tiphint">Right-click to equip &middot; '+
       '<b>Space</b> to mark for sale</div>';""")

open('work.html','w',encoding='utf-8').write(src)
print('applied:', hits)
