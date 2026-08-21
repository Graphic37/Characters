src = open('work.html', encoding='utf-8').read()
hits = {}
def rep(name, old, new, count=1):
    global src
    n = src.count(old)
    assert n == count, f"{name}: expected {count}, found {n}"
    src = src.replace(old, new); hits[name] = n

rep('picker',
"""    var det = t && t.closest && t.closest('[data-detail]');""",
"""    /* ---- the support slot ------------------------------------------------
       Supports are permanent unlocks, so there is nothing to drag: clicking a
       slot opens a chooser and the skill stores an ID. */
    var slot = t && t.closest && t.closest('.skSock');
    if(slot){
      e.preventDefault(); e.stopPropagation();
      var sid = slot.dataset.skill, idx = +slot.dataset.sock;
      var openN = (window.supportSlots ? supportSlots(sid) : 1);
      if(idx >= openN){
        /* ⚠ NEVER SILENTLY FAIL on a locked slot — say why and where to fix it */
        try{ toast('Support Slot ' + (idx+1) + ' is locked — speak with Garrick in town.'); }
        catch(err){ window.ahErr&&window.ahErr(err,'slot:lockedToast'); }
        return;
      }
      openSupportPicker(sid, idx, slot);
      return;
    }

    var det = t && t.closest && t.closest('[data-detail]');""")

rep('picker-impl',
"""  /* The breakdown. Reads ONLY what skillDamage already returned, so the drawer""",
"""  /* ---- the support picker -------------------------------------------------
     Lists every support the account has unlocked, with the tier that will
     actually apply. A support already in ANOTHER slot of the SAME skill is
     shown disabled: the spec allows one support across many skills but not
     twice on one skill, and a greyed row with a reason teaches that rule
     better than a rejection after the click.
     -------------------------------------------------------------------- */
  var PICKER = null;
  function closeSupportPicker(){
    if(PICKER && PICKER.parentNode) PICKER.parentNode.removeChild(PICKER);
    PICKER = null;
  }
  window.closeSupportPicker = closeSupportPicker;

  function openSupportPicker(skillId, idx, anchor){
    try{
      closeSupportPicker();
      var DEFS = window.SUPPORT_DEFS || {};
      var socks = socketsFor(skillId) || [];
      var here = socks.map(function(s){
        var u = window.socketSupport ? socketSupport(s) : null; return u ? u.id : null;
      });
      var rows = '';
      Object.keys(DEFS).forEach(function(id){
        var d = DEFS[id];
        var tier = window.supportTier ? supportTier(id) : null;
        var usedElsewhereHere = here.indexOf(id) >= 0 && here.indexOf(id) !== idx;
        var locked = !tier;
        var cls = locked ? 'sp locked' : (usedElsewhereHere ? 'sp dup' : 'sp');
        var why = locked ? 'Locked — find it in Rifts'
                : usedElsewhereHere ? 'Already on this skill'
                : d.text(tier);
        rows += '<button class="'+cls+'" data-pick="'+id+'"'+
                ((locked||usedElsewhereHere)?' disabled':'')+'>'+
          '<span class="spArt">'+(window.supportArt?supportArt(id):'')+'</span>'+
          '<span class="spBody"><i>'+d.n+
            (tier?' <b>T'+tier+'</b>':' <b class="lock">LOCKED</b>')+'</i>'+
            '<em>'+why+'</em></span>'+
        '</button>';
      });
      var cur = here[idx];
      var el = document.createElement('div');
      el.className = 'spWrap';
      el.innerHTML =
        '<div class="spHead">CHOOSE SUPPORT'+
          '<button class="spClose" data-pickclose="1">\\u00D7</button></div>'+
        rows +
        (cur ? '<button class="sp clear" data-pick="">Remove '+
               ((DEFS[cur]&&DEFS[cur].n)||'support')+'</button>' : '');
      document.body.appendChild(el);
      PICKER = el;

      /* position against the slot, then pull back inside the viewport */
      var r = anchor.getBoundingClientRect();
      el.style.left = Math.round(r.left) + 'px';
      el.style.top  = Math.round(r.bottom + 6) + 'px';
      var b = el.getBoundingClientRect();
      if(b.right > innerWidth - 8)  el.style.left = Math.max(8, innerWidth - b.width - 8) + 'px';
      if(b.bottom > innerHeight - 8) el.style.top = Math.max(8, r.top - b.height - 6) + 'px';

      el.addEventListener('mousedown', function(ev){
        var btn = ev.target.closest('[data-pick],[data-pickclose]');
        if(!btn) return;
        ev.preventDefault(); ev.stopPropagation();
        if(btn.dataset.pickclose){ closeSupportPicker(); return; }
        assignSupport(skillId, idx, btn.dataset.pick || null);
        closeSupportPicker();
      }, true);
    }catch(err){ window.ahErr&&window.ahErr(err,'openSupportPicker'); }
  }
  window.openSupportPicker = openSupportPicker;

  /* Stores the ID ONLY. The tier is looked up live from the account table, so
     an upgrade from T4 to T2 reaches every skill using it with no migration of
     socket objects and nothing to re-socket. */
  function assignSupport(skillId, idx, supId){
    try{
      var socks = socketsFor(skillId); if(!socks) return false;
      if(supId){
        if(!(window.SUPPORT_DEFS||{})[supId]) return false;
        if(!(window.supportTier && supportTier(supId))){
          try{ toast('That support is not unlocked yet.'); }catch(e){}
          return false;
        }
        /* the one hard rule: not twice on the same skill */
        for(var i=0;i<socks.length;i++){
          if(i===idx) continue;
          var u = window.socketSupport ? socketSupport(socks[i]) : null;
          if(u && u.id===supId){
            try{ toast((SUPPORT_DEFS[supId].n)+' is already on this skill.'); }catch(e){}
            return false;
          }
        }
      }
      socks[idx] = supId || null;
      try{ if(window.markStatsDirty) markStatsDirty(); }catch(e){}
      try{ render(); }catch(e){ window.ahErr&&window.ahErr(e,'assignSupport:render'); }
      try{ if(window.refreshAll) refreshAll(); }catch(e){}
      return true;
    }catch(err){ window.ahErr&&window.ahErr(err,'assignSupport'); return false; }
  }
  window.assignSupport = assignSupport;

  /* clicking away, or pressing escape, puts it down */
  addEventListener('mousedown', function(e){
    if(!PICKER) return;
    if(e.target.closest && (e.target.closest('.spWrap') || e.target.closest('.skSock'))) return;
    closeSupportPicker();
  });
  addEventListener('keydown', function(e){ if(e.key==='Escape') closeSupportPicker(); });

  /* The breakdown. Reads ONLY what skillDamage already returned, so the drawer""")

CSS = """
/* ---- support slots + picker (v180, phase 2) ------------------------------ */
.skSock.slotlocked{
  background:radial-gradient(circle at 50% 50%, #0a0b09 0 52%, #1a1c16 54% 60%, #0a0b09 62%) !important;
  box-shadow:inset 0 0 8px #000, 0 0 0 1px #101208 !important;
  cursor:help; opacity:.75;
}
.skSock.slotlocked:hover{ box-shadow:inset 0 0 8px #000, 0 0 0 1px #4a4536 !important; }
.skLockGlyph{ font-size:10px; color:#585340; line-height:1; filter:grayscale(1) }
.skSock{ cursor:pointer }
.skSockTier{
  position:absolute; right:-2px; bottom:-3px; z-index:3;
  font:700 8px "Trebuchet MS",sans-serif; letter-spacing:.02em;
  color:#0c0f0b; background:#9fd5c4; border:1px solid #05070a;
  padding:0 2px; border-radius:2px; pointer-events:none;
}
/* the picker */
.spWrap{
  position:fixed; z-index:220; width:262px; max-height:60vh; overflow-y:auto;
  padding:6px; border:1px solid #4a4a3a; border-radius:2px;
  background:linear-gradient(180deg,#14170f,#0a0c08);
  box-shadow:0 10px 30px rgba(0,0,0,.75), inset 0 0 0 1px rgba(0,0,0,.8);
}
.spHead{
  display:flex; align-items:center; justify-content:space-between;
  font:600 9px "Trebuchet MS",sans-serif; letter-spacing:.20em; color:#8a8368;
  padding:3px 4px 7px; border-bottom:1px solid #2c2f24; margin-bottom:6px;
}
.spClose{
  width:18px; height:18px; padding:0; line-height:1; cursor:pointer; font-size:12px;
  display:flex; align-items:center; justify-content:center;
  background:transparent; border:1px solid #3d4032; color:#a89c76;
}
.spClose:hover{ color:#fff0c8; border-color:#7d7455 }
button.sp{
  display:flex; align-items:center; gap:9px; width:100%; text-align:left;
  padding:6px 7px; margin-bottom:4px; cursor:pointer;
  border:1px solid #2c3026; background:linear-gradient(180deg,#12150f,#0b0d09);
}
button.sp:hover:not(:disabled){ border-color:#5f7a52; background:linear-gradient(180deg,#181d14,#0d100b) }
button.sp:disabled{ opacity:.42; cursor:default }
.spArt{ width:30px; height:30px; flex:none; display:flex; align-items:center; justify-content:center }
.spArt svg, .spArt img{ width:100%; height:100%; object-fit:contain }
.spBody{ flex:1; min-width:0 }
.spBody i{ display:block; font:600 12px "Trebuchet MS",sans-serif; font-style:normal; color:#cfc7a8 }
.spBody i b{ color:#9fd5c4; font-size:11px }
.spBody i b.lock{ color:#6f695c }
.spBody em{ display:block; font:10.5px "Trebuchet MS",sans-serif; font-style:normal;
  color:#857f6c; line-height:1.4; margin-top:1px }
button.sp.clear{ justify-content:center; color:#b58a7a; font:600 11px "Trebuchet MS",sans-serif;
  border-color:#4a322c; margin-top:2px }
button.sp.clear:hover{ border-color:#8a5648; color:#f0c2ae }
/* the SUPPORTS board */
.gmLvl.lock{ color:#6f695c !important }
.gmNext{ font:10px "Trebuchet MS",sans-serif; color:#2fa39a; letter-spacing:.06em; margin-top:3px }
.gmQty.zero{ color:#5f5a4e }
"""
rep('picker-css', "\n</style>", "\n" + CSS + "\n</style>")

open('work.html','w',encoding='utf-8').write(src)
print('applied:', hits)
