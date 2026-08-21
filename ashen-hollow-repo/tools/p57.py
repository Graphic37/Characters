src = open('work.html', encoding='utf-8').read()
hits = {}
def rep(name, old, new, count=1):
    global src
    n = src.count(old)
    assert n == count, f"{name}: expected {count}, found {n}"
    src = src.replace(old, new); hits[name] = n

# ============================================ 1. BANKING
rep('bank',
"""function autoBankAtVeyra(then){
  autoWalkToStation('Veyra', ()=>{
    try{ depositAll(); toast('Banked at Veyra'); }catch(e){ window.ahErr&&window.ahErr(e,'autoBankAtVeyra:4585'); }
    setTimeout(()=>{ try{ if(then) then(); }catch(e){ window.ahErr&&window.ahErr(e,'autoBankAtVeyra:4586'); } }, 500);
  });
}""",
"""/* ⚠ THE WALK WAS NEVER A REQUIREMENT — IT WAS A DEPENDENCY I INVENTED.
   Banking is `depositAll()`. Descending is `enterRift()`. Neither needs the
   hero to be standing anywhere. But the auto-repeat loop made both wait on a
   town walk, and town has no pathfinding (v145) — so a snag on one prop could
   stall the whole between-runs sequence, and every fix since has been an
   attempt to make an unreliable walk reliable.
   The walk still HAPPENS, because watching her cross the town is the point of
   having a town. It simply no longer GATES anything: the bank and the descent
   fire on a timer regardless of whether she arrived. Worst case she banks
   mid-stride, which nobody can tell from banking at the counter.
   `AUTO_TOWN.walk = false` skips the stroll entirely if he ever wants it. */
const AUTO_TOWN = { walk:true, bankAfter:900, descendAfter:900 };
window.AUTO_TOWN = AUTO_TOWN;

function autoBankAtVeyra(then){
  const done = ()=>{
    try{ depositAll(); toast('Banked'); }
    catch(e){ window.ahErr&&window.ahErr(e,'autoBankAtVeyra:deposit'); }
    try{ if(then) then(); }catch(e){ window.ahErr&&window.ahErr(e,'autoBankAtVeyra:then'); }
  };
  /* ⚠ FIRE ONCE. The walk callback and the timer race each other by design;
     whichever wins, the other must not run it again. */
  let fired=false;
  const once=()=>{ if(fired) return; fired=true; done(); };
  if(AUTO_TOWN.walk){
    try{ autoWalkToStation('Veyra', once); }
    catch(e){ window.ahErr&&window.ahErr(e,'autoBankAtVeyra:walk'); }
  }
  setTimeout(once, AUTO_TOWN.bankAfter);
}""")

# ============================================ 2. DESCENDING
rep('next',
"""function autoNextRun(tier){
  autoBankAtVeyra(()=>{
    const descend = ()=> setTimeout(()=>{
      try{ enterRift(tier, true); }catch(e){ window.ahErr&&window.ahErr(e,'goGate:4619'); }
    }, 450);
    const goGate = ()=> autoWalkToStation('Travel', (arrived)=>{
      if(arrived){ descend(); return; }
      /* ONE RETRY VIA THE CENTRE. Town has no pathfinding (v145), so a failed
         approach is almost always a snag on one prop — re-aiming from open
         ground clears it far more often than pressing on does. */
      if(!AUTO.__gateRetry){
        AUTO.__gateRetry = true;
        AUTO.stats.gateRetry=(AUTO.stats.gateRetry||0)+1;
        autoWalkToPoint(TOWN_CENTRE.x, TOWN_CENTRE.z, ()=>{
          autoWalkToStation('Travel', (ok2)=>{
            AUTO.__gateRetry = false;
            if(!ok2) AUTO.stats.gateWalkFailed=(AUTO.stats.gateWalkFailed||0)+1;
            descend();
          }, 9000);
        }, 7000, 2.2);
        return;
      }
      AUTO.__gateRetry = false;
      /* Counted, not announced. F8 reports it; the player cannot act on it and
         the run descends either way. */
      AUTO.stats.gateWalkFailed=(AUTO.stats.gateWalkFailed||0)+1;
      descend();
    });
    /* via the middle: one bad diagonal becomes two clear legs. Skipped when he
       is already there, so it never adds a detour for nothing. */
    let p=null; try{ p=heroPos(); }catch(e){ window.ahErr&&window.ahErr(e,'goGate:4623'); }
    const far = !p || Math.hypot(p.x-TOWN_CENTRE.x, p.z-TOWN_CENTRE.z) > 3.5;
    if(far){
      AUTO.stats.viaCentre=(AUTO.stats.viaCentre||0)+1;
      autoWalkToPoint(TOWN_CENTRE.x, TOWN_CENTRE.z, ()=>goGate(), 9000, 2.2);
    } else goGate();
  });
}""",
"""/* ⚠ THE WHOLE BETWEEN-RUNS SEQUENCE IS NOW TWO CALLS ON TIMERS.
   What was here: walk to Veyra -> bank -> walk to the centre -> walk to the
   gate -> on failure retry via the centre -> walk to the gate again -> descend.
   SEVEN steps, five of them town walks, each able to fail, and the whole chain
   only as reliable as its weakest leg. That is why this kept breaking: the
   sequence demanded perfection from a system that has no pathfinding.
   Now: bank, wait, descend. The stroll is cosmetic and cannot block anything.
   The retry ladder, the via-centre detour and their counters are all deleted —
   they existed only to make a required walk succeed, and it is not required. */
function autoNextRun(tier){
  autoBankAtVeyra(()=>{
    let fired=false;
    const descend=()=>{
      if(fired) return; fired=true;
      try{ enterRift(tier, true); }
      catch(e){ window.ahErr&&window.ahErr(e,'autoNextRun:enter'); }
    };
    if(AUTO_TOWN.walk){
      try{ autoWalkToStation('Travel', descend); }
      catch(e){ window.ahErr&&window.ahErr(e,'autoNextRun:walk'); }
    }
    setTimeout(descend, AUTO_TOWN.descendAfter);
  });
}""")

# the counters those steps fed are now meaningless — say so rather than
# reporting zeroes forever
rep('status',
"""      L.push('  town walk: gate retries='+(AUTO.stats.gateRetry||0)+
             '  gate failures='+(AUTO.stats.gateWalkFailed||0)+
             '  detours='+(AUTO.stats.townDetour||0));""",
"""      /* the gate-retry counters went with the retry ladder in v203 — the walk
         no longer gates anything, so a failed walk is not an event */
      L.push('  town: auto-walk='+((window.AUTO_TOWN&&AUTO_TOWN.walk)?'on':'off')+
             '  (bank and descend are on timers, not on arrival)');""")

open('work.html','w',encoding='utf-8').write(src)
print('applied:', hits)
