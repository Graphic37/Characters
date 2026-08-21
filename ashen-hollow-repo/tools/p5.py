src = open('work.html', encoding='utf-8').read()
hits = {}
def rep(name, old, new, count=1):
    global src
    n = src.count(old)
    assert n == count, f"{name}: expected {count}, found {n}"
    src = src.replace(old, new); hits[name] = n

# ---- 1. a silent random fallback is what made the original bug unreadable ----
rep('makecurrency',
"""function makeCurrency(id,qty){
  const c = CURRENCY.filter(x=>x.id===id)[0]||pick(CURRENCY);""",
"""function makeCurrency(id,qty){
  /* THE FALLBACK USED TO BE `pick(CURRENCY)` -- an unknown id silently became a
     RANDOM orb, which is exactly how a missing cu_grkey row turned into "the
     key is sometimes a Corruption Orb" and stayed unexplained. A wrong id is a
     bug; make it loud and make it the SAME wrong thing every time, so the next
     one is reproducible instead of spooky. */
  let c = CURRENCY.filter(x=>x.id===id)[0];
  if(!c){
    try{ console.warn('makeCurrency: no such currency "'+id+'" — falling back to '+CURRENCY[0].id); }catch(e){}
    c = CURRENCY[0];
  }""")

# ---- 2. keys are counted where they ACTUALLY are ---------------------------
rep('keystacks',
"""function keyStacks(){
  const out=[];
  try{
    for(const c of [CONT.inv, CONT.st1, CONT.st3]){
      if(!c) continue;
      for(const it of c.items) if(it.baseId==='cu_grkey') out.push(it);
    }
  }catch(e){}
  return out;
}""",
"""function keyStacks(){
  const out=[];
  try{
    /* EVERY container, bag first. The old list was CONT.inv/st1/st3 by hand, so
       a key dragged to any other tab stopped being counted and could not be
       spent -- it was simply gone as far as the game was concerned. Now that
       cu_grkey routes like a real currency this matters more, not less. */
    const order=['inv'].concat(Object.keys(CONT).filter(k=>k!=='inv'));
    for(const k of order){
      const c=CONT[k]; if(!c || !c.items) continue;
      for(const it of c.items) if(it.baseId==='cu_grkey' && (it.qty||0)>0) out.push(it);
    }
  }catch(e){}
  return out;
}""")

# ---- 3. spending removes the stack from the container it is REALLY in ------
rep('spendkey',
"""function spendKey(){
  const k=keyStacks().filter(x=>x.qty>0)[0]; if(!k) return false;
  k.qty--;
  if(k.qty<=0){ try{ removeItem(CONT.inv,k); }catch(e){} }
  try{ refreshAll(); }catch(e){}
  return true;
}""",
"""function spendKey(){
  const k=keyStacks().filter(x=>x.qty>0)[0]; if(!k) return false;
  k.qty--;
  /* it was always removed from CONT.inv, so spending the last of a BANKED
     stack left a qty:0 item sitting in the stash forever -- invisible to the
     count, still occupying its cell. Remove it from wherever it lives. */
  if(k.qty<=0){
    try{
      const c=(typeof findContainerOf==='function') ? findContainerOf(k) : null;
      if(c) removeItem(c,k); else removeItem(CONT.inv,k);
    }catch(e){}
  }
  try{ refreshAll(); }catch(e){}
  return true;
}""")

# ---- 4. awarding merges with a banked stack, not just a bag one ------------
rep('awardkey2',
"""    let key=CONT.inv.items.filter(i=>i.baseId==='cu_grkey')[0];
    if(key){ key.qty++; return true; }""",
"""    /* merge with whichever stack exists, bag or bank -- the old lookup was
       CONT.inv only, so banking your keys then clearing a rift started a
       second stack instead of adding to the first */
    let key=(typeof keyStacks==='function') ? keyStacks()[0] : null;
    if(!key) key=CONT.inv.items.filter(i=>i.baseId==='cu_grkey')[0];
    if(key && (key.qty||0) < (key.max||99)){ key.qty++; return true; }""")

# ---- 5. a key is not a crafting orb: do not let it arm ---------------------
rep('board-arm',
"""      if(!t || !t.stacks.length){ toast('None of those in the stash.'); return; }
      S.useItem=t.stacks[0];""",
"""      if(!t || !t.stacks.length){ toast('None of those in the stash.'); return; }
      /* Only a CRAFTING orb can be put on the cursor. The board armed anything,
         so a Greater Rift Key could be picked up and clicked onto an item, and
         the only feedback was "Merchants only" -- which explains nothing. */
      const def=CURRENCY.filter(c=>c.id===el.dataset.cur)[0]||{};
      if(!def.craft){
        toast(el.dataset.cur==='cu_grkey'
          ? 'Greater Rift Keys are spent at the Rift Pillar, not on items.'
          : ((CURRENCY_META[el.dataset.cur]||{}).n||'That')+' is not used on items.');
        return;
      }
      S.useItem=t.stacks[0];""")

# ---- 6. the debug loot roll must not hand out keys -------------------------
rep('spawnloot',
"""    const it = roll<0.20 ? makeCurrency(pick(CURRENCY).id, ri(1,6))""",
"""    /* pick from the CRAFTING orbs only: with cu_grkey in the table a random
       roll could now hand out Greater Rift Keys */
    const craftable = CURRENCY.filter(c=>c.craft);
    const it = roll<0.20 ? makeCurrency(pick(craftable.length?craftable:CURRENCY).id, ri(1,6))""")

open('work.html','w',encoding='utf-8').write(src)
print('applied:', hits)
