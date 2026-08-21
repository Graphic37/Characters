src = open('work.html', encoding='utf-8').read()
a = src.index('function drawGemTab(){')
b = src.index("them from a skill\\'s support slot in the Skills panel.</div>';\n}\n") \
    + len("them from a skill\\'s support slot in the Skills panel.</div>';\n}\n")

NEW = r"""function drawGemTab(){
  const wrap=document.getElementById('stCells');
  if(!wrap) return;
  const host=document.getElementById('gemTab') || (()=>{
    const d=document.createElement('div'); d.id='gemTab';
    wrap.parentNode.appendChild(d); return d;
  })();
  /* ⚠ BUILT FROM THE UNLOCK TABLE, NOT FROM INVENTORY. Supports are permanent
     account progression now — there is nothing in a container to read, and a
     board that scanned CONT would show an empty tab forever. */
  const DEFS=window.SUPPORT_DEFS||{};

  /* ⚠ FILTER STATE LIVES ON THE HOST ELEMENT. This tab is rebuilt whenever the
     stash repaints, so a closure variable would reset every repaint and a
     module variable would never reset at all. The dataset lasts exactly as
     long as the element does, which is what "current filter" means. */
  const curCat = host.dataset.cat || 'all';
  const query  = (host.dataset.q || '').toLowerCase();

  const all=Object.keys(DEFS);
  /* counted BEFORE filtering, so a chip can state its size and an EMPTY
     category can be hidden rather than leading nowhere */
  const counts={};
  all.forEach(id=>{ const c=supportCat(id); counts[c]=(counts[c]||0)+1; });

  function matches(id){
    if(curCat!=='all' && supportCat(id)!==curCat) return false;
    if(query){
      const d=DEFS[id];
      let hay=d.n;
      try{ hay += ' ' + (d.text?d.text(3):''); }catch(e){}
      if(hay.toLowerCase().indexOf(query)<0) return false;
    }
    return true;
  }

  function cardFor(id){
    const d=DEFS[id];
    const tier=window.supportTier?supportTier(id):null;
    const inUse=supportSocketedIn(id);
    const art=(typeof supportArt==='function')?supportArt(id):'';
    const next = tier && tier>1 ? ('Next upgrade: T'+(tier-1))
               : tier===1 ? 'Fully upgraded' : '';
    return '<div class="gmCard'+(tier?'':' empty')+'" data-sup="'+id+'">'+
      '<div class="gmArt">'+art+'</div>'+
      '<div class="gmBody">'+
        '<div class="gmName">'+d.n+
          (tier?' <span class="gmLvl">T'+tier+' UNLOCKED</span>'
               :' <span class="gmLvl lock">LOCKED</span>')+'</div>'+
        '<div class="gmDesc">'+
          (tier ? d.text(tier) : 'Find this Support Gem in Rifts.')+'</div>'+
        (inUse.length?'<div class="gmIn">used by '+inUse.join(', ')+'</div>':'')+
        (next?'<div class="gmNext">'+next+'</div>':'')+
      '</div>'+
      '<div class="gmQty'+(tier?'':' zero')+'">'+(tier?('T'+tier):'\u2014')+'</div>'+
    '</div>';
  }

  /* All first, then only categories that actually contain something —
     an empty category is a dead control */
  const chips = ['<button class="gmChip'+(curCat==='all'?' on':'')+'" data-cat="all">'+
                 'All <i>'+all.length+'</i></button>']
    .concat((window.SUPPORT_CATS||[]).filter(c=>counts[c.id])
      .map(c=>'<button class="gmChip'+(curCat===c.id?' on':'')+'" data-cat="'+c.id+'" '+
              'title="'+c.d+'">'+c.n+' <i>'+counts[c.id]+'</i></button>')).join('');

  /* ⚠ WHEN SHOWING EVERYTHING, GROUP IT. A flat list of six is fine; a flat
     list of forty is the problem he is describing. Under a specific chip the
     heading would only repeat the chip, so it is dropped there. */
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
    const hits=all.filter(matches);
    body = hits.length ? hits.map(cardFor).join('')
         : '<div class="gmNone">No support gems match '+
           (query ? ('\u201c'+query+'\u201d') : 'that category')+'.</div>';
  }

  host.innerHTML=
    '<div class="gmFilter">'+chips+
      '<input class="gmSearch" type="text" placeholder="Search supports\u2026" '+
        'value="'+(host.dataset.q||'').replace(/"/g,'&quot;')+'">'+
    '</div>'+ body +
    '<div class="rnFoot">Supports are permanent account unlocks \u2014 one copy '+
    'serves every skill. Find better tiers in Rifts (T1 is strongest). Assign '+
    'them from a skill\'s support slot in the Skills panel.</div>';

  /* ⚠ REBIND AFTER EVERY REBUILD — innerHTML discards the old listeners.
     The chips redraw the tab; the search box does NOT, on every keystroke,
     because rebuilding would destroy the input and with it the caret. It
     stores the query and redraws on a short idle instead. */
  host.querySelectorAll('.gmChip').forEach(b=>{
    b.addEventListener('click', ()=>{
      host.dataset.cat = b.dataset.cat;
      drawGemTab();
    });
  });
  const box=host.querySelector('.gmSearch');
  if(box){
    box.addEventListener('input', ()=>{
      host.dataset.q = box.value;
      clearTimeout(host.__qT);
      host.__qT=setTimeout(()=>{
        drawGemTab();
        const nb=host.querySelector('.gmSearch');
        if(nb){ nb.focus(); nb.setSelectionRange(nb.value.length, nb.value.length); }
      }, 220);
    });
  }
}
"""
src = src[:a] + NEW + src[b:]
open('work.html','w',encoding='utf-8').write(src)
print('drawGemTab rewritten whole')
