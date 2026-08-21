src = open('work.html', encoding='utf-8').read()
hits = {}
def rep(name, old, new, count=1):
    global src
    n = src.count(old)
    assert n == count, f"{name}: expected {count}, found {n}"
    src = src.replace(old, new); hits[name] = n

rep('board',
"""  const DEFS=window.SUPPORT_DEFS||{};
  const ids=Object.keys(DEFS);
  const cards=ids.map(id=>{""",
"""  const DEFS=window.SUPPORT_DEFS||{};
  /* ⚠ FILTER STATE LIVES ON THE HOST, NOT IN A MODULE VARIABLE. This tab is
     rebuilt whenever the stash repaints; a module-level filter would survive a
     repaint but not a reload, and a closure variable would reset on every
     repaint. The dataset keeps it exactly as long as the element lives. */
  const curCat = host.dataset.cat || 'all';
  const query  = (host.dataset.q || '').toLowerCase();

  const all=Object.keys(DEFS);
  /* count per category BEFORE filtering, so a chip can say how many it holds
     and an empty one can be hidden rather than leading nowhere */
  const counts={};
  all.forEach(id=>{ const c=supportCat(id); counts[c]=(counts[c]||0)+1; });

  const ids=all.filter(id=>{
    if(curCat!=='all' && supportCat(id)!==curCat) return false;
    if(query){
      const d=DEFS[id];
      const hay=(d.n+' '+(d.text?d.text(3):'')).toLowerCase();
      if(hay.indexOf(query)<0) return false;
    }
    return true;
  });

  /* the chip row: All first, then only the categories that actually contain
     something — an empty category is a dead control */
  const chips = ['<button class="gmChip'+(curCat==='all'?' on':'')+'" data-cat="all">'+
                 'All <i>'+all.length+'</i></button>']
    .concat((window.SUPPORT_CATS||[]).filter(c=>counts[c.id])
      .map(c=>'<button class="gmChip'+(curCat===c.id?' on':'')+'" data-cat="'+c.id+'" '+
              'title="'+c.d+'">'+c.n+' <i>'+counts[c.id]+'</i></button>')).join('');

  const cards=ids.map(id=>{""")

rep('grouped',
"""  }).join('');
  host.innerHTML=cards+
    '<div class="rnFoot">Supports are permanent account unlocks \\u2014 one copy '+""",
"""  }).join('');

  /* ⚠ WHEN SHOWING EVERYTHING, GROUP IT. A flat list of six is fine; a flat
     list of forty is the problem he is describing. Under a specific chip the
     heading would just repeat the chip, so it is omitted there. */
  let body;
  if(curCat==='all' && !query){
    body=(window.SUPPORT_CATS||[]).filter(c=>counts[c.id]).map(c=>{
      const inCat=all.filter(id=>supportCat(id)===c.id);
      return '<div class="gmGroup">'+
        '<div class="gmGroupHead">'+c.n+' <span>'+inCat.length+'</span></div>'+
        inCat.map(cardFor).join('')+
      '</div>';
    }).join('');
  } else {
    body = cards.length ? cards
         : '<div class="gmNone">No support gems match '+
           (query?('\\u201c'+query+'\\u201d'):'that category')+'.</div>';
  }

  host.innerHTML=
    '<div class="gmFilter">'+chips+
      '<input class="gmSearch" type="text" placeholder="Search supports\\u2026" '+
      'value="'+(host.dataset.q||'').replace(/"/g,'&quot;')+'">'+
    '</div>'+ body +
    '<div class="rnFoot">Supports are permanent account unlocks \\u2014 one copy '+""")

# the card builder has to be reusable for the grouped path
rep('cardfn',
"""  const cards=ids.map(id=>{
    const d=DEFS[id];""",
"""  function cardFor(id){
    const d=DEFS[id];""")

rep('cardend',
"""      '<div class="gmQty'+(tier?'':' zero')+'">'+(tier?('T'+tier):'\\u2014')+'</div>'+
    '</div>';
  }).join('');""",
"""      '<div class="gmQty'+(tier?'':' zero')+'">'+(tier?('T'+tier):'\\u2014')+'</div>'+
    '</div>';
  }
  const cards=ids.map(cardFor).join('');""")

open('work.html','w',encoding='utf-8').write(src)
print('applied:', hits)
