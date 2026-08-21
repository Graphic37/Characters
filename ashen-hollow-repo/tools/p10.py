src = open('work.html', encoding='utf-8').read()
hits = {}
def rep(name, old, new, count=1):
    global src
    n = src.count(old)
    assert n == count, f"{name}: expected {count}, found {n}"
    src = src.replace(old, new); hits[name] = n

# =================================================== 1. THE FEELER DEADLOCK
# Found by simulating the real collide()/feelerAdjust() against a synthetic
# grid: standing inside a blocked cell, every heading fails the 0.8m probe, the
# scan finds nothing and returns [0,0]. That is a DEADLOCK, not a stop: the
# movement block only calls collide() when the desired velocity is non-zero, so
# returning zero means collide's own escape-from-geometry path can never run.
rep('feeler-fallback',
"""  let best=null, bestClear=0;
  for(let k=0;k<16;k++){
    const a=k*0.3927;
    const cx=Math.cos(a), cz=Math.sin(a);
    let clear=0;
    for(const d of [0.8,1.6,2.4]){ if(hit(P.x+cx*d,P.z+cz*d)) break; clear=d; }
    if(clear>bestClear){ bestClear=clear; best=[cx,cz]; }
  }
  return best || [0,0];
}""",
"""  let best=null, bestClear=0;
  /* the ladder starts SHORT. It began at 0.8m, which is further than the half
     width of a 2m cell — so from inside a blocked cell every heading failed on
     its first probe, nothing was ever "clear", and this returned [0,0]. */
  for(let k=0;k<16;k++){
    const a=k*0.3927;
    const cx=Math.cos(a), cz=Math.sin(a);
    let clear=0;
    for(const d of [0.45,0.9,1.6,2.4]){ if(hit(P.x+cx*d,P.z+cz*d)) break; clear=d; }
    if(clear>bestClear){ bestClear=clear; best=[cx,cz]; }
  }
  if(best) return best;
  /* NOTHING IS CLEAR IN ANY DIRECTION — which in practice means she is inside
     geometry. Returning [0,0] here is a deadlock: the movement block skips
     collide() entirely when the desired velocity is zero, so the escape path
     built for exactly this case never runs and she stands there until the
     unstick teleport. Ask for the original heading instead and let collide()
     resolve it; it knows how to walk out. */
  return [ux,uz];
}""")

# =================================================== 2. OVERFLOW INTO A BOARD
# st1/st2/st4 are BOARDS, not grids. An item that overflows into one is invisible
# — the board replaces the grid, so it renders nothing and the item is simply
# gone as far as the player can tell.
rep('stashput',
"""  const order=[home,'st3','st0','st1','st2','st4'].filter((v,i,a)=>a.indexOf(v)===i);
  for(const id of order){
    const c=CONT[id]; if(!c) continue;
    if(addItem(c,it)!==false) return id;
  }
  return null;""",
"""  /* BOARD TABS ARE NEVER OVERFLOW. st1 (currency), st2 (gems) and st4 (runes)
     draw a fixed board instead of the grid, so anything that lands in one
     without belonging there is invisible — present in the save, unreachable on
     screen. Only the item's OWN home may be a board; every fallback is a real
     grid, and the player tabs are used before giving up. */
  const BOARD={st1:1, st2:1, st4:1};
  const player=[];
  for(const k in CONT) if(/^st\\d+$/.test(k) && !BOARD[k] && k!=='st3' && k!=='st0') player.push(k);
  player.sort();
  const order=[home,'st3','st0'].concat(player).filter((v,i,a)=>a.indexOf(v)===i)
                                .filter(id=>id===home || !BOARD[id]);
  for(const id of order){
    const c=CONT[id]; if(!c) continue;
    if(addItem(c,it)!==false) return id;
  }
  return null;""")

# =================================================== 3. CHALLENGE RIFT CAP
# Regression I introduced in v149: the old Pillar slider spanned
# max(RIFT_CFG.maxTier, GR_CFG.maxTier); the new dropdown is built to _maxT
# only, so Challenge Rift levels 101-150 became unreachable and the gem upgrade
# curve lost its top half.
rep('level-cap',
"""  const _lvlNow = Math.min(RIFT.tier||1, _maxT);
  let _lvl='';
  for(let t=1;t<=_maxT;t++) _lvl+='<option value="'+t+'"'+(t===_lvlNow?' selected':'')+'>Level '+t+'</option>';
  const _sub = (t) => 'Area Level '+RIFT_CFG.areaLevel(t)+' \\u00b7 Item Level Cap '+RIFT_CFG.areaLevel(t);""",
"""  /* THE CAP FOLLOWS THE CARD. A Challenge Rift runs to GR_CFG.maxTier (150) and
     the gem upgrade curve is 1:1 with it, so building the list to the standard
     cap of 100 silently deleted the top half of that progression. */
  const _isG = window.__riftKind==='greater';
  const _cap = _isG ? _maxG : _maxT;
  const _lvlNow = Math.min(RIFT.tier||1, _cap);
  let _lvl='';
  for(let t=1;t<=_cap;t++) _lvl+='<option value="'+t+'"'+(t===_lvlNow?' selected':'')+'>Level '+t+'</option>';
  const _sub = (t) => 'Area Level '+RIFT_CFG.areaLevel(t)+' \\u00b7 Item Level Cap '+RIFT_CFG.areaLevel(t)+
                      (_isG ? ' \\u00b7 15:00' : '');""")

# =================================================== 4. A BUTTON THAT LIES
# SORT TAB on a board tab sorts a grid nobody can see, so it reads as broken.
rep('sort-board',
"""    if(t.id==='btnStashSort') sortContainer(stashTab);""",
"""    if(t.id==='btnStashSort'){
      /* the board tabs have no grid to sort; a button that visibly does nothing
         is the same trap as the dead skill dots in v136 */
      if(stashTab==='st1'||stashTab==='st2'||stashTab==='st4')
        toast('This tab is a board — nothing to sort.');
      else sortContainer(stashTab);
    }""")

open('work.html','w',encoding='utf-8').write(src)
print('applied:', hits)
