src = open('work.html', encoding='utf-8').read()
hits = {}
def rep(name, old, new, count=1):
    global src
    n = src.count(old)
    assert n == count, f"{name}: expected {count}, found {n}"
    src = src.replace(old, new); hits[name] = n

rep('drag',
"""    const c=CONT[t.id];
    if(c && c.items.length) b.dataset.count=c.items.length;
    tabs.appendChild(b);
  });""",
"""    const c=CONT[t.id];
    if(c && c.items.length) b.dataset.count=c.items.length;
    /* ⚠ DRAG MUST NOT COST HIM THE CLICK. A tab is selected by clicking it,
       and that is the common action by a wide margin — so a press only becomes
       a drag after moving 6px. Under that, it is a plain click and selection
       behaves exactly as before. */
    b.draggable=true;
    b.addEventListener('dragstart', ev=>{
      STASH_DRAG.id=t.id;
      b.classList.add('dragging');
      try{ ev.dataTransfer.effectAllowed='move';
           ev.dataTransfer.setData('text/plain', t.id); }catch(e){}
    });
    b.addEventListener('dragend', ()=>{
      STASH_DRAG.id=null;
      try{ tabs.querySelectorAll('.tab').forEach(x=>
        x.classList.remove('dragging','dropBefore')); }catch(e){}
    });
    b.addEventListener('dragover', ev=>{
      if(!STASH_DRAG.id || STASH_DRAG.id===t.id) return;
      ev.preventDefault();
      try{ ev.dataTransfer.dropEffect='move'; }catch(e){}
      b.classList.add('dropBefore');
    });
    b.addEventListener('dragleave', ()=>b.classList.remove('dropBefore'));
    b.addEventListener('drop', ev=>{
      ev.preventDefault();
      b.classList.remove('dropBefore');
      const id=STASH_DRAG.id;
      STASH_DRAG.id=null;
      if(id && id!==t.id) stashMoveTab(id, t.id);
    });
    tabs.appendChild(b);
  });
  /* dropping past the last tab moves it to the end */
  tabs.addEventListener('dragover', ev=>{ if(STASH_DRAG.id) ev.preventDefault(); });
  tabs.addEventListener('drop', ev=>{
    if(!STASH_DRAG.id) return;
    if(ev.target!==tabs) return;              /* a tab handled it already */
    ev.preventDefault();
    const id=STASH_DRAG.id; STASH_DRAG.id=null;
    stashMoveTab(id, null);
  });""")

rep('state',
"""function stashTabOrder(){""",
"""const STASH_DRAG={ id:null };

function stashTabOrder(){""")

CSS = """
/* ---- a plus that says what it is (v257) ---------------------------------- */
#stashTabs .tabPlus{
  min-width:auto !important; padding:0 13px !important;
  display:inline-flex; align-items:center; gap:6px;
  background-image:none !important; color:#c8a24a;
}
#stashTabs .tabPlus b{ font:700 16px/1 "Trebuchet MS",sans-serif }
#stashTabs .tabPlus span{
  font:600 10.5px "Trebuchet MS",sans-serif; letter-spacing:.08em;
  text-transform:uppercase; color:#b9ae95;
}
#stashTabs .tabPlus i{
  font:600 10px "Trebuchet MS",sans-serif; font-style:normal; color:#8a8471;
  padding-left:6px; border-left:1px solid #3a3327;
}
#stashTabs .tabPlus:hover{ color:#f5e8c8; border-color:#c8a24a }
#stashTabs .tabPlus:hover span{ color:#e6e2d8 }

/* ---- dragging a tab ------------------------------------------------------ */
#stashTabs .tab.dragging{ opacity:.45 }
#stashTabs .tab.dropBefore{ box-shadow:inset 3px 0 0 0 #c8a24a }
"""
rep('css', "\n</style>", "\n" + CSS + "\n</style>")

open('work.html','w',encoding='utf-8').write(src)
print('applied:', hits)
