src = open('work.html', encoding='utf-8').read()
hits = {}
def rep(name, old, new, count=1):
    global src
    n = src.count(old)
    assert n == count, f"{name}: expected {count}, found {n}"
    src = src.replace(old, new); hits[name] = n

# ============================================================ 1. TAB TABLES
rep('stash-fixed',
"""const STASH_FIXED = {
  st0:{ n:'GEAR',     col:'#c2a052' },
  st1:{ n:'CURRENCY', col:'#d3ac68' },
  st2:{ n:'GEMS',     col:'#2fa39a' },
  st3:{ n:'DUMP',     col:'#8a8079' }
};""",
"""const STASH_FIXED = {
  st0:{ n:'GEAR',     col:'#c2a052' },
  st1:{ n:'CURRENCY', col:'#d3ac68' },
  st2:{ n:'GEMS',     col:'#2fa39a' },
  st3:{ n:'DUMP',     col:'#8a8079' },
  /* RUNES gets its own board (v149). st4 rather than renumbering st3, so a
     save with a DUMP tab full of things keeps it; the display order is fixed
     below instead, which is a cosmetic change and cannot lose an item. */
  st4:{ n:'RUNES',    col:'#a98fd8' }
};""")

rep('stash-order',
"""/* the player's names, persisted with the save */""",
"""/* RUNES sits next to GEMS in the strip even though it is st4 — they are the
   two "goes into something else" boards and belong together. */
(function(){
  const i=STASH_TABS.findIndex(t=>t.id==='st4');
  const j=STASH_TABS.findIndex(t=>t.id==='st3');
  if(i>0 && j>=0 && i>j) STASH_TABS.splice(j,0,STASH_TABS.splice(i,1)[0]);
})();
/* the player's names, persisted with the save */""")

rep('stash-rules',
"""  st2:{ label:'GEMS',     takes:it=>it.kind==='support' || it.kind==='rune' },   /* skill gems retired */
  st3:{ label:'DUMP',     takes:()=>true }
};""",
"""  st2:{ label:'GEMS',     takes:it=>it.kind==='support' },   /* skill gems retired */
  st4:{ label:'RUNES',    takes:it=>it.kind==='rune' },
  st3:{ label:'DUMP',     takes:()=>true }
};""")

rep('stash-tabfor',
"""function stashTabFor(it){
  for(const id of ['st0','st1','st2']) if(STASH_RULES[id].takes(it)) return id;
  return 'st3';
}""",
"""function stashTabFor(it){
  for(const id of ['st0','st1','st2','st4']) if(STASH_RULES[id].takes(it)) return id;
  return 'st3';
}""")

rep('stash-put-order',
"""  const order=[home,'st3','st0','st1','st2'].filter((v,i,a)=>a.indexOf(v)===i);""",
"""  const order=[home,'st3','st0','st1','st2','st4'].filter((v,i,a)=>a.indexOf(v)===i);""")

rep('deposit-count',
"""    else if(it.kind==='rune'||it.kind==='gem'||it.rarity==='gem') moved.gems++;""",
"""    else if(it.kind==='rune'){ moved.runes=(moved.runes||0)+1; }
    else if(it.kind==='gem'||it.rarity==='gem') moved.gems++;""")
rep('deposit-init',
"""  let moved={gear:0,currency:0,gems:0,other:0}, left=0;""",
"""  let moved={gear:0,currency:0,gems:0,runes:0,other:0}, left=0;""")
rep('deposit-total',
"""  const total=moved.gear+moved.currency+moved.gems+moved.other;""",
"""  const total=moved.gear+moved.currency+moved.gems+moved.runes+moved.other;""")
rep('deposit-toast',
"""                  ' currency, '+moved.gems+' gems'+(left?', '+left+' would not fit':''))""",
"""                  ' currency, '+moved.gems+' gems, '+moved.runes+' runes'+
                  (left?', '+left+' would not fit':''))""")

# ============================================================ 2. THE BOARDS
BOARD_JS = """
/* ===========================================================================
   THE RUNE BOARD  (stash tab st4)
   Runes are a 9 x 5 table, not a bag of loose squares: nine types, five tiers,
   five of a tier fusing into the next. A grid hid that structure completely --
   you could not see which type you were short of. The board IS the structure.
   ========================================================================= */
function runeTotalsByCell(){
  const t={};
  try{
    for(const k in CONT){
      (CONT[k].items||[]).forEach(it=>{
        if(!it || it.kind!=='rune') return;
        const key=it.runeType+'|'+it.tier;
        if(!t[key]) t[key]={qty:0, items:[]};
        t[key].qty += (it.qty||1);
        t[key].items.push(it);
      });
    }
  }catch(e){}
  return t;
}
window.runeTotalsByCell=runeTotalsByCell;

function drawRuneTab(){
  const wrap=document.getElementById('stCells');
  if(!wrap) return;
  const host=document.getElementById('runeTab') || (()=>{
    const d=document.createElement('div'); d.id='runeTab';
    wrap.parentNode.appendChild(d); return d;
  })();
  const totals=runeTotalsByCell();
  const eq=(typeof window.runeTotals==='function') ? window.runeTotals() : null;
  const rows=(window.RUNE_TYPES||[]).map(rt=>{
    let cells='';
    for(let tier=5; tier>=1; tier--){
      const k=rt.id+'|'+tier, have=totals[k];
      const mag=(window.RUNE_MAG_PUBLIC||[0,4,9,17,30,52])[6-tier];
      const art=(have && typeof itemArt==='function') ? itemArt(have.items[0]) : '';
      cells+='<div class="rnCell'+(have?'':' empty')+'" data-rune="'+rt.id+'" data-tier="'+tier+'" '+
        'title="'+rt.n+' (T'+tier+') \\u2014 '+rt.txt(mag)+'">'+
        '<div class="rnArt">'+art+'</div>'+
        '<div class="rnTier">T'+tier+'</div>'+
        (have?'<div class="rnQty">'+have.qty+'</div>':'')+
      '</div>';
    }
    const live = eq && eq[rt.stat] ? ' <span class="rnLive">+'+eq[rt.stat]+' socketed</span>' : '';
    return '<div class="rnRow"><div class="rnName">'+rt.n+live+'</div>'+
           '<div class="rnCells">'+cells+'</div></div>';
  }).join('');
  host.innerHTML=rows+
    '<div class="rnFoot">Five of a tier fuse into the next automatically. '+
    'Right-click a rune to lift it, then click a socketed item to set it \\u2014 '+
    'setting a rune consumes it, and replacing one destroys the old.</div>';
  host.querySelectorAll('[data-rune]').forEach(el=>{
    const take=()=>{
      const t=runeTotalsByCell()[el.dataset.rune+'|'+el.dataset.tier];
      if(!t || !t.items.length){ toast('You have none of those.'); return; }
      armRune(t.items[0]);
    };
    el.addEventListener('click', take);
    el.addEventListener('contextmenu',(ev)=>{ ev.preventDefault(); take(); });
  });
}
window.drawRuneTab=drawRuneTab;

/* ===========================================================================
   THE GEM BOARD  (stash tab st2)
   One card per support that exists, owned or not, with what it actually does.
   A grid of six identical squares told you nothing about what you were missing.
   ========================================================================= */
function supportTotals(){
  const t={};
  try{
    for(const k in CONT){
      (CONT[k].items||[]).forEach(it=>{
        if(!it || it.kind!=='support') return;
        if(!t[it.baseId]) t[it.baseId]={qty:0, items:[]};
        t[it.baseId].qty++; t[it.baseId].items.push(it);
      });
    }
  }catch(e){}
  for(const id in t) t[id].items.sort((a,b)=>(b.level||1)-(a.level||1));
  return t;
}
window.supportTotals=supportTotals;

/* which skills is this support already sitting in? worth knowing before you
   go looking for a copy you have already spent */
function supportSocketedIn(baseId){
  const out=[];
  try{
    if(window.RANGER_GEMS && window.SKILLS){
      for(const id in RANGER_GEMS){
        const st=RANGER_GEMS[id];
        if(!st || !Array.isArray(st.sockets)) continue;
        if(st.sockets.some(s=>s && s.baseId===baseId))
          out.push((SKILLS[id]&&SKILLS[id].n)||id);
      }
    }
  }catch(e){}
  return out;
}

function drawGemTab(){
  const wrap=document.getElementById('stCells');
  if(!wrap) return;
  const host=document.getElementById('gemTab') || (()=>{
    const d=document.createElement('div'); d.id='gemTab';
    wrap.parentNode.appendChild(d); return d;
  })();
  const totals=supportTotals();
  const cards=(window.SUPPORTS||[]).map(s=>{
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
  });
}
window.drawGemTab=drawGemTab;

/* arm a rune on the cursor, exactly the way a currency orb arms -- one
   interaction model for "hold this, then click the thing it goes into" */
function armRune(rune){
  if(!rune) return;
  S.useItem=rune;
  try{
    setHeld(null);
    document.body.classList.add('holding','using');
    CUR.style.display='block';
    const cell=cellScreen();
    CUR.style.width=cell+'px'; CUR.style.height=cell+'px';
    CUR.innerHTML='<div class="art">'+itemArt(rune)+'</div>';
    hideTip();
  }catch(e){}
  try{ toast(rune.name+' in hand \\u2014 click an item with an empty socket'); }catch(e){}
  try{ refreshAll(); }catch(e){}
}
window.armRune=armRune;
"""
rep('boards', "\nfunction drawStash(){", BOARD_JS + "\nfunction drawStash(){")

# --- drawStash routes the two new boards ---------------------------------
rep('drawstash',
"""function drawStash(){
  /* the CURRENCY tab is a fixed board, every other tab is the normal grid */
  const isCur = stashTab==='st1';
  const cells=$('#stCells'), cur=document.getElementById('curTab');
  if(cells) cells.style.display = isCur?'none':'';
  if(isCur){
    drawCurrencyTab();
    const c2=document.getElementById('curTab');
    if(c2){ c2.classList.add('on'); c2.style.display=''; }   // .on carries the size
  }
  else {
    if(cur){ cur.classList.remove('on'); cur.style.display='none'; }
    drawGrid(stashTab,$('#stCells'),$('#stItems'));
  }""",
"""function drawStash(){
  /* THREE tabs are fixed boards now (currency, gems, runes); everything else is
     the normal grid. Each board hides the others, or two would stack. */
  const BOARDS={ st1:{id:'curTab', draw:drawCurrencyTab},
                 st2:{id:'gemTab', draw:drawGemTab},
                 st4:{id:'runeTab', draw:drawRuneTab} };
  const board=BOARDS[stashTab];
  const cells=$('#stCells');
  if(cells) cells.style.display = board?'none':'';
  for(const k in BOARDS){
    if(k===stashTab) continue;
    const el=document.getElementById(BOARDS[k].id);
    if(el){ el.classList.remove('on'); el.style.display='none'; }
  }
  if(board){
    board.draw();
    const el=document.getElementById(board.id);
    if(el){ el.classList.add('on'); el.style.display=''; }   // .on carries the size
  }
  else {
    drawGrid(stashTab,$('#stCells'),$('#stItems'));
  }""")

# ============================================ 3. SOCKETING: ARM + APPLY
# arm a rune with right-click in any grid, next to the currency arm branch
rep('arm-rune-grid',
"""        if(it.kind==='currency' && it.target){
          if(S.useItem===it){ cancelUse(); return; }   // right-click it again to put it down""",
"""        if(it.kind==='rune'){
          if(S.useItem===it){ cancelUse(); return; }
          armRune(it); moveCursorItem(e); return;
        }
        if(it.kind==='currency' && it.target){
          if(S.useItem===it){ cancelUse(); return; }   // right-click it again to put it down""")

# the live apply path learns about runes
rep('apply-rune',
"""window.applyCurrency = function(target, info){
  const cur=S.useItem;
  if(!cur) return;
  if(target.kind!=='gear'){ toast('That currency has no effect'); return; }""",
"""window.applyCurrency = function(target, info){
  const cur=S.useItem;
  if(!cur) return;
  /* RUNES USE THE ORB INTERACTION. Everything a rune needs already existed --
     RUNE_TYPES, five tiers, sockets[] on every gear item, socketRune(), and the
     stat wiring in collectMods/buildStats -- but nothing ever CALLED socketRune,
     so the whole system was unreachable from the game. This is that call. */
  if(cur.kind==='rune'){
    if(target.kind!=='gear'){ toast('Runes only fit equipment.'); return; }
    const cap=target.socketCount||0;
    if(!cap){ toast('That item has no sockets \\u2014 use a Socket Orb first.'); return; }
    target.runes=target.runes||[];
    while(target.runes.length<cap) target.runes.push(null);
    let idx=target.runes.findIndex((r,i)=>i<cap && !r);
    if(idx<0){ toast('Every socket on that item is filled.'); return; }
    const res=window.socketRune(target, idx, cur);
    if(!res || !res.ok){ toast((res&&res.why)||'That rune will not fit.'); return; }
    /* the armed stack may have survived (qty) or been consumed entirely --
       mirror consumeCurrency so the cursor never points at a dead object */
    if(!findContainerOf(cur)){
      S.useItem=null;
      try{ CUR.style.display='none'; document.body.classList.remove('holding','using'); }catch(e){}
    } else {
      try{ CUR.innerHTML='<div class="art">'+itemArt(cur)+'</div>'; }catch(e){}
    }
    const left=target.runes.filter((r,i)=>i<cap && !r).length;
    toast(cur.baseName+' set into '+target.name+
          (left? ' \\u2014 '+left+' socket'+(left>1?'s':'')+' left' : ' \\u2014 fully socketed'));
    if(window.markStatsDirty) window.markStatsDirty();
    if(info&&info.redraw) info.redraw(); else refreshAll();
    try{ flashItem(target.uid); }catch(e){}
    return;
  }
  if(target.kind!=='gear'){ toast('That currency has no effect'); return; }""")

# ============================================ 4. TOOLTIP SHOWS SOCKETS
rep('tip-sockets',
"""    if(it.quality) b+='<div class="prop">Quality: <b class="val">+'+it.quality+'%</b></div>';
  }""",
"""    if(it.quality) b+='<div class="prop">Quality: <b class="val">+'+it.quality+'%</b></div>';
    /* SOCKETS WERE INVISIBLE ON THE ITEM ITSELF. The count lived only in the
       vendor panel, and a socketed rune appeared nowhere at all, so there was
       no way to tell a fully-runed item from a bare one. */
    const scap=it.socketCount||0;
    if(scap){
      const rs=it.runes||[];
      let pips='';
      for(let i=0;i<scap;i++) pips+='<span class="sockpip'+(rs[i]?' full':'')+'"></span>';
      b+='<hr><div class="prop">Sockets: <b>'+pips+'</b></div>';
      for(let i=0;i<scap;i++){
        const r=rs[i];
        b+= r ? ('<div class="runeline">'+r.name+' \\u2014 '+
                 (window.RUNE_STAT_TEXT? window.RUNE_STAT_TEXT(r) : ('+'+r.v))+'</div>')
              : '<div class="runeline empty">Empty socket</div>';
      }
    }
  }""")

rep('tip-rune-body',
"""  if(it.kind==='support'){
    b+='<hr><div class="prop">Level: <b>'+it.level+'</b></div>';
  }""",
"""  if(it.kind==='support'){
    b+='<hr><div class="prop">Level: <b>'+it.level+'</b></div>';
  }
  if(it.kind==='rune'){
    b+='<hr><div class="prop">Tier: <b>T'+it.tier+'</b>'+
       (it.tier>1?'<span class="lo"> \\u00b7 five fuse into T'+(it.tier-1)+'</span>':
                  '<span class="lo"> \\u00b7 highest tier</span>')+'</div>';
  }""")

rep('hint-rune',
"""  if(it.kind==='support') return 'Lift, then place into a skill socket.';""",
"""  if(it.kind==='support') return 'Lift, then place into a skill socket.';
  if(it.kind==='rune') return 'Right-click to lift, then click an item with an empty socket.';""")

# ============================================ 5. RUNES ACTUALLY DROP
rep('rune-drops',
"""  if(Math.random()<chance && typeof window.makeGear==='function'){
    const ilvl=Math.max(1, RIFT_CFG.areaLevel(RIFT.tier)-Math.floor(Math.random()*5));
    dropLoot(e.g.position.x, e.g.position.z, window.makeGear(null, ilvl), e.g.position.x, e.g.position.z);
  }""",
"""  if(Math.random()<chance && typeof window.makeGear==='function'){
    const ilvl=Math.max(1, RIFT_CFG.areaLevel(RIFT.tier)-Math.floor(Math.random()*5));
    dropLoot(e.g.position.x, e.g.position.z, window.makeGear(null, ilvl), e.g.position.x, e.g.position.z);
  }
  /* RUNES HAD NO SOURCE. makeRune existed and nothing in the game ever called
     it, so the rune tab, the fusing and the sockets were a system with no
     input. They drop as T5 almost always and fuse upward; the tier floor
     lifts slowly with rift tier so a deep run is not still handing out T5s. */
  try{
    const rc = e.isBoss?0.85 : e.rarity==='rare'?0.30 : e.rarity==='magic'?0.12 : 0.045;
    if(Math.random()<rc && typeof window.makeRune==='function' && window.RUNE_TYPES){
      const t=RIFT.tier||1;
      let tier=5;
      const r=Math.random();
      if(r < Math.min(0.30, t*0.006)) tier=4;
      if(r < Math.min(0.08, t*0.0015)) tier=3;
      if(e.isBoss && Math.random()<0.25) tier=Math.max(1,tier-1);
      const type=RUNE_TYPES[Math.floor(Math.random()*RUNE_TYPES.length)].id;
      dropLoot(e.g.position.x, e.g.position.z, window.makeRune(type, tier),
               e.g.position.x, e.g.position.z);
    }
  }catch(x){}""")

# the key no longer needs to be built by hand
rep('awardkey',
"""    let key=CONT.inv.items.filter(i=>i.baseId==='cu_grkey')[0];
    if(key){ key.qty++; return true; }
    const k=window.makeCurrency ? window.makeCurrency('cu_vault',1) : null;
    if(k){
      k.baseId='cu_grkey'; k.name='Greater Rift Key'; k.baseName='Greater Rift Key';
      k.qty=1; k.max=99;
      return window.addItem(CONT.inv,k)!==false;
    }""",
"""    let key=CONT.inv.items.filter(i=>i.baseId==='cu_grkey')[0];
    if(key){ key.qty++; return true; }
    /* cu_grkey is a real CURRENCY row now, so the key is made the same way
       every other currency is instead of being forged out of a Vaulted Coin. */
    const k=window.makeCurrency ? window.makeCurrency('cu_grkey',1) : null;
    if(k) return window.addItem(CONT.inv,k)!==false;""")

# ============================================ 6. RUNE HELPERS + MIGRATION
rep('rune-helpers',
"""/* ---- 11. loot filter hooks ---------------------------------------------- */""",
"""/* the magnitude table and a printable line, both needed by the board and the
   tooltip, which live in an earlier script block and cannot see the consts */
window.RUNE_MAG_PUBLIC=RUNE_MAG;
window.RUNE_STAT_TEXT=function(r){
  if(!r) return '';
  const t=(RUNE_TYPES.filter(x=>x.id===r.runeType)[0]);
  return t ? t.txt(r.v) : ('+'+r.v);
};

/* ONE-TIME MIGRATION for the new RUNES tab. st4 was a free player tab, so it
   may hold anything; runes may be sitting in GEMS, DUMP or the bag. Move both
   ways rather than assuming an empty tab, and never destroy what will not fit. */
setTimeout(function(){
  try{
    if(!CONT.st4) return;
    let inn=0, out=0, stuck=0;
    /* anything that is NOT a rune leaves st4 for its proper home */
    (CONT.st4.items||[]).slice().forEach(it=>{
      if(it.kind==='rune') return;
      removeItem(CONT.st4, it);
      if(!stashPut(it)){ addItem(CONT.st4, it); stuck++; } else out++;
    });
    /* every rune in the stash comes home; the BAG is left alone, since that is
       where he is actively carrying things */
    for(const k in CONT){
      if(k==='st4' || k==='inv') continue;
      (CONT[k].items||[]).slice().forEach(it=>{
        if(!it || it.kind!=='rune') return;
        removeItem(CONT[k], it);
        if(addItem(CONT.st4, it)===false){ addItem(CONT[k], it); stuck++; } else inn++;
      });
    }
    if(inn||out) { try{ refreshAll(); }catch(e){} }
    if(stuck) { try{ toast('Rune tab is full \\u2014 '+stuck+' item(s) stayed put'); }catch(e){} }
  }catch(e){}
}, 1400);

/* ---- 11. loot filter hooks ---------------------------------------------- */""")

open('work.html','w',encoding='utf-8').write(src)
print('applied:', hits)
