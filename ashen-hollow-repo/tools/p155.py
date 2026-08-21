src = open('work.html', encoding='utf-8').read()
hits = {}
def rep(name, old, new, count=1):
    global src
    n = src.count(old)
    assert n == count, f"{name}: expected {count}, found {n}"
    src = src.replace(old, new); hits[name] = n

rep('sel',
"""    const tab=closest('.tab');
    if(tab){
      stashTab=tab.dataset.tab;
      $$('.tab').forEach(x=>{ x.classList.toggle('on',x===tab); x.style.color=''; });
      const t=STASH_TABS.filter(s=>s.id===stashTab)[0]; tab.style.color=t.col;
      drawStash(); scheduleFit(); return;
    }""",
"""    /* ⚠⚠ THIS THREW SIX TIMES IN HIS SESSION: "can't access property col,
       t is undefined". `closest('.tab')` matched the **+ New Tab button** —
       it wears `class="tab tabPlus"` for its styling but carries no
       `data-tab`, so `stashTab` became undefined, the lookup found nothing,
       and `t.col` threw on every click of the one control whose whole job is
       to be clicked.
       This is also the original black screen: v257 stopped the overlay from
       eating the game, but the throw underneath was never found — the fix made
       the symptom survivable and left the cause in place.
       ⚠ MATCH ON THE DATA, NOT THE CLASS. A class is styling and gets reused;
       `data-tab` is what actually identifies a stash tab, and the plus does not
       have one. The `t` guard is belt-and-braces for a tab whose entry has been
       removed from the table. */
    const tab=closest('#stashTabs .tab[data-tab]');
    if(tab){
      const id=tab.dataset.tab;
      const t=STASH_TABS.filter(s=>s.id===id)[0];
      if(!t){ try{ console.warn('[stash] no table entry for "'+id+'"'); }catch(e){} return; }
      stashTab=id;
      $$('#stashTabs .tab').forEach(x=>{ x.classList.toggle('on',x===tab); x.style.color=''; });
      tab.style.color=t.col;
      drawStash(); scheduleFit(); return;
    }""")

open('work.html','w',encoding='utf-8').write(src)
print('applied:', hits)
