src = open('work.html', encoding='utf-8').read()
hits = {}
def rep(name, old, new, count=1):
    global src
    n = src.count(old)
    assert n == count, f"{name}: expected {count}, found {n}"
    src = src.replace(old, new); hits[name] = n

# ==================================================== 1. THE SUPPORTS BOARD
rep('board',
"""  const totals=supportTotals();
  /* SUPPORTS is a script-scoped const, not a window property (the v136 trap),
     so it must be read bare -- window.SUPPORTS is undefined. */
  const SUPS=(typeof SUPPORTS!=='undefined' && SUPPORTS) ? SUPPORTS : [];
  const cards=SUPS.map(s=>{
    const t=totals[s.id];
    const best=t&&t.items[0];
    const art=(best && typeof itemArt==='function') ? itemArt(best) : '';
    const inUse=supportSocketedIn(s.id);
    return '<div class="gmCard'+(t?'':' empty')+'" data-sup="'+s.id+'">'+
      '<div class="gmArt">'+art+'</div>'+
      '<div class="gmBody">'+
        '<div class="gmName">'+s.n+(t?' <span class="gmLvl">Lv '+(best.level||1)+'</span>':'')+'</div>'+
        '<div class="gmDesc">'+s.desc+'</div>'+
        (inUse.length?'<div class="gmIn">socketed in '+inUse.join(', ')+'</div>':'')+
      '</div>'+
      (t?'<div class="gmQty">'+t.qty+'</div>':'<div class="gmQty zero">0</div>')+
    '</div>';
  }).join('');
  host.innerHTML=cards+
    '<div class="rnFoot">Lift a support and drop it into a skill socket in the '+
    'Skills panel. Sockets accept supports only \\u2014 runes go into gear.</div>';
  host.querySelectorAll('[data-sup]').forEach(el=>{
    el.addEventListener('mousedown',(ev)=>{
      ev.preventDefault(); ev.stopPropagation();
      const t=supportTotals()[el.dataset.sup];
      if(!t || !t.items.length){ toast('You do not have that support.'); return; }
      const it=t.items[0];
      const c=findContainerOf(it); if(c) removeItem(c,it);
      setHeld(it,0,0); moveCursorItem(ev); refreshAll();
    });
  });""",
"""  /* ⚠ BUILT FROM THE UNLOCK TABLE, NOT FROM INVENTORY. Supports are permanent
     account progression now — there is nothing in a container to read, and a
     board that scanned CONT would show an empty tab forever. */
  const DEFS=window.SUPPORT_DEFS||{};
  const ids=Object.keys(DEFS);
  const cards=ids.map(id=>{
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
      '<div class="gmQty'+(tier?'':' zero')+'">'+(tier?('T'+tier):'—')+'</div>'+
    '</div>';
  }).join('');
  host.innerHTML=cards+
    '<div class="rnFoot">Supports are permanent account unlocks \\u2014 one copy '+
    'serves every skill. Find better tiers in Rifts (T1 is strongest). Assign '+
    'them from a skill\\'s support slot in the Skills panel.</div>';""")

# supportSocketedIn must read IDs, not item objects
rep('socketed-in',
"""        if(st.sockets.some(s=>s && s.baseId===baseId))
          out.push((SKILLS[id]&&SKILLS[id].n)||id);""",
"""        /* sockets store IDs now; the seam accepts either shape */
        if(st.sockets.some(s=>{
          const sup = window.socketSupport ? socketSupport(s) : null;
          return sup ? sup.id===baseId : (s && s.baseId===baseId);
        })) out.push((SKILLS[id]&&SKILLS[id].n)||id);""")

# a support has no item to render, so draw its gem from the def's gradient
rep('support-art',
"""function drawGemTab(){""",
"""/* A support is no longer an item, so there is no `itemArt` to call. Reuse the
   game's own gem renderer with the def's gradient — one code path with the
   rest of the UI rather than a second look that would drift. */
function supportArt(id){
  const d=(window.SUPPORT_DEFS||{})[id];
  if(!d) return '';
  try{
    if(typeof gemSVG==='function') return gemSVG(d.grad, true);
    if(typeof icoSVG==='function') return icoSVG('gem');
  }catch(e){ window.ahErr&&window.ahErr(e,'supportArt'); }
  return '';
}
window.supportArt=supportArt;

function drawGemTab(){""")

# the tab is called SUPPORTS now
rep('tab-name',
"""  st2:{ n:'GEMS',     col:'#2fa39a' },""",
"""  st2:{ n:'SUPPORTS', col:'#2fa39a' },""")
rep('tab-rule',
"""  st2:{ label:'GEMS',     takes:it=>it.kind==='support' },   /* skill gems retired */""",
"""  /* nothing is stored here any more — the board is generated from the unlock
     table. The rule stays only so a stray legacy item still routes somewhere
     sane until migration retires it. */
  st2:{ label:'SUPPORTS', takes:it=>it.kind==='support' },""")

# ==================================================== 2. THREE SLOTS, SOME LOCKED
rep('slot-render',
"""      var sockHTML = '<div class="skSocks">';
      for(var i=0;i<socks.length;i++){
        var s = socks[i];
        var tip = s ? ((s.n||s.baseName||'Support') +
                       (typeof s.more==='number' ? ' — x'+s.more.toFixed(2) : ''))
                    : 'Empty support socket';
        sockHTML += '<div class="skSock'+(s?' filled':' empty')+'" data-skill="'+id+'" '+
                    'data-sock="'+i+'" data-uid="'+(s?s.uid:'')+'" title="'+tip+'">'+
                    sockArt(s)+
                    '</div>';
      }
      sockHTML += '</div>';""",
"""      /* ALWAYS THREE SLOTS, with the ones beyond the unlocked count visibly
         locked. Showing only the unlocked ones would hide the progression that
         Garrick sells in phase 3 — the player has to be able to see what they
         do not have yet. */
      var open = (window.supportSlots ? supportSlots(id) : 1);
      var sockHTML = '<div class="skSocks">';
      for(var i=0;i<SUPPORT_SLOTS;i++){
        var s = (i<socks.length) ? socks[i] : null;
        var sup = (window.socketSupport && s) ? socketSupport(s) : null;
        var lockedSlot = i >= open;
        var tip = lockedSlot ? 'Support Slot Locked — unlock it with Garrick in town'
                : sup ? (sup.n + (sup.tier ? ' T'+sup.tier : '') +
                         ' — x'+(sup.more||1).toFixed(2))
                : 'Empty support slot — click to assign a support';
        sockHTML += '<div class="skSock'+(lockedSlot?' slotlocked':(sup?' filled':' empty'))+
                    '" data-skill="'+id+'" data-sock="'+i+'" '+
                    'data-uid="'+(sup?sup.id:'')+'" title="'+tip+'">'+
                    (lockedSlot ? '<b class="skLockGlyph">\\u1F512</b>'
                                : sockArt(sup))+
                    (sup && sup.tier ? '<span class="skSockTier">T'+sup.tier+'</span>' : '')+
                    '</div>';
      }
      sockHTML += '</div>';""")

# sockArt now takes the seam's shape
rep('sockart',
"""  function sockArt(s){
    if(!s) return '';
    try{
      if(has('itemArt')){
        var html = itemArt(s);
        if(html) return '<span class="skSockArt">' + html + '</span>';
      }
    }catch(e){ window.ahErr&&window.ahErr(e,'sockArt:21528'); }
    /* only if the renderer is genuinely unavailable */
    return '<b>' + String(s.n || s.baseName || 'S').slice(0,2).toUpperCase() + '</b>';
  }""",
"""  function sockArt(s){
    if(!s) return '';
    try{
      /* a support is not an item any more, so render it from its def */
      if(s.id && window.supportArt){
        var a = supportArt(s.id);
        if(a) return '<span class="skSockArt">' + a + '</span>';
      }
      if(has('itemArt')){
        var html = itemArt(s);
        if(html) return '<span class="skSockArt">' + html + '</span>';
      }
    }catch(e){ window.ahErr&&window.ahErr(e,'sockArt:21528'); }
    return '<b>' + String(s.n || s.baseName || 'S').slice(0,2).toUpperCase() + '</b>';
  }""")

# the in-place updater must speak the same language
rep('update-pips',
"""      var socks = socketsFor(id) || [];
      var pips = el.querySelectorAll('.skSock');
      for(var i=0;i<pips.length && i<socks.length;i++){
        var s = socks[i], pip = pips[i];
        /* keyed on uid: redraw the pip only when a DIFFERENT gem is in it,
           so the no-flicker rule from v130 still holds */
        var want = s ? String(s.uid) : '';
        if(pip.dataset.uid !== want){
          pip.dataset.uid = want;
          pip.innerHTML = sockArt(s);
        }
        pip.classList.toggle('filled', !!s);
        pip.classList.toggle('empty', !s);
        pip.title = s ? ((s.n||s.baseName||'Support') +
                        (typeof s.more==='number' ? ' — x'+s.more.toFixed(2) : ''))
                      : 'Empty support socket';
      }""",
"""      var socks = socketsFor(id) || [];
      var openN = (window.supportSlots ? supportSlots(id) : 1);
      var pips = el.querySelectorAll('.skSock');
      for(var i=0;i<pips.length;i++){
        var pip = pips[i];
        var sup = (window.socketSupport && i<socks.length) ? socketSupport(socks[i]) : null;
        var lockedSlot = i >= openN;
        /* keyed on ID+TIER, so an ACCOUNT upgrade repaints the pip: Fork T4 ->
           Fork T2 must change what the slot says without anything being
           re-socketed. The v130 no-flicker rule still holds — the key only
           changes when what is displayed changes. */
        var want = lockedSlot ? 'lock' : (sup ? sup.id+':'+(sup.tier||0) : '');
        if(pip.dataset.uid !== want){
          pip.dataset.uid = want;
          pip.innerHTML = lockedSlot ? '<b class="skLockGlyph">\\u1F512</b>'
            : (sockArt(sup) + (sup && sup.tier ? '<span class="skSockTier">T'+sup.tier+'</span>' : ''));
        }
        pip.classList.toggle('slotlocked', lockedSlot);
        pip.classList.toggle('filled', !lockedSlot && !!sup);
        pip.classList.toggle('empty', !lockedSlot && !sup);
        pip.title = lockedSlot ? 'Support Slot Locked — unlock it with Garrick in town'
          : sup ? (sup.n + (sup.tier ? ' T'+sup.tier : '') + ' — x'+(sup.more||1).toFixed(2))
          : 'Empty support slot — click to assign a support';
      }""")

open('work.html','w',encoding='utf-8').write(src)
print('applied:', hits)
