src = open('work.html', encoding='utf-8').read()
hits = {}
def rep(name, old, new, count=1):
    global src
    n = src.count(old)
    assert n == count, f"{name}: expected {count}, found {n}"
    src = src.replace(old, new); hits[name] = n

rep('input',
"""addEventListener('contextmenu', e=>{
  const el = e.target && e.target.closest && e.target.closest('.item[data-uid]');
  if(!el) return;
  /* an orb on the cursor means right-click is doing something else */
  if(window.S && S.useItem) return;
  const it = (window.ITEM_BY_UID||{})[el.dataset.uid];
  if(!it) return;
  e.preventDefault();
  e.stopPropagation();
  sellToggle(it);
});""",
"""/* ⚠ RIGHT-CLICK ALREADY EQUIPS. Taking it for marking meant every attempt to
   equip an item from the bag also flagged it for sale — two destructive-ish
   actions on one gesture, and the more common one loses. His call: SPACE while
   hovering, which is otherwise unbound outside the editor's fly camera.
   The hovered item is not tracked separately anywhere — but the TOOLTIP
   already knows it (`TIP.dataset.item`), and the tooltip is showing precisely
   when something is hovered. Reusing that means no second hover listener to
   keep in sync with the first. */
addEventListener('keydown', e=>{
  if(e.code!=='Space' && e.key!==' ') return;
  const t=e.target;
  /* never steal the key from a text field or a focused button */
  if(t && (/INPUT|TEXTAREA|SELECT|BUTTON/.test(t.tagName||'') || t.isContentEditable)) return;
  if(e.ctrlKey || e.metaKey || e.altKey) return;
  /* the editor owns Space for its fly camera */
  if(window.ED && ED.on) return;
  /* only while a tooltip is up, which is exactly "hovering an item" */
  if(!window.TIP || TIP.style.display==='none' || !TIP.dataset.item) return;
  const it=(window.ITEM_BY_UID||{})[TIP.dataset.item];
  if(!it) return;
  e.preventDefault();
  e.stopPropagation();
  sellToggle(it);
});""")

# the bar should say which key
rep('bar',
"""      '<button class="sbSell" id="sbSell">Sell <b>S</b></button>'+""",
"""      '<button class="sbSell" id="sbSell">Sell <b>S</b></button>'+""",1)

open('work.html','w',encoding='utf-8').write(src)
print('applied:', hits)
