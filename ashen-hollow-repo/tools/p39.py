src = open('work.html', encoding='utf-8').read()
hits = {}
def rep(name, old, new, count=1):
    global src
    n = src.count(old)
    assert n == count, f"{name}: expected {count}, found {n}"
    src = src.replace(old, new); hits[name] = n

# ================================================= 1. THE GATE TOAST
# ⚠ IT REPORTS A FAILURE WITH NO CONSEQUENCE. `enterRift(tier, true)` runs on
# BOTH branches — the walk to the gate is flavour, not a requirement. So the
# toast told him about something he could not act on and that changed nothing,
# every single auto-run. A message that is always ignorable trains the player
# to ignore messages.
rep('gate-toast',
"""    const goGate = ()=> autoWalkToStation('Travel', (arrived)=>{
      if(!arrived) toast('Could not reach the gate — descending anyway');
      setTimeout(()=>{ try{ enterRift(tier, true); }catch(e){ window.ahErr&&window.ahErr(e,'goGate:4619'); } }, 450);
    });""",
"""    const descend = ()=> setTimeout(()=>{
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
    });""")

rep('gate-status',
"""      L.push('  node fixes: snapped='+(AUTO.stats.nodeSnapped||0)+""",
"""      L.push('  town walk: gate retries='+(AUTO.stats.gateRetry||0)+
             '  gate failures='+(AUTO.stats.gateWalkFailed||0)+
             '  detours='+(AUTO.stats.townDetour||0));
      L.push('  node fixes: snapped='+(AUTO.stats.nodeSnapped||0)+""")

# ================================================= 2. RINGS, NOT GLOWS
rep('elite-art',
"""let ELITE_ART=null;
function eliteArt(){
  if(ELITE_ART) return ELITE_ART;
  const geo=new THREE.CircleGeometry(1, 22);
  geo.rotateX(-Math.PI/2);
  const mk=(hex)=>new THREE.MeshBasicMaterial({
    color:hex, transparent:true, opacity:0.30,
    blending:THREE.AdditiveBlending, depthWrite:false, toneMapped:false, fog:true });
  ELITE_ART={ geo:geo, magic:mk(0x5a8cff), rare:mk(0xe8b552) };""",
"""let ELITE_ART=null;
function eliteArt(){
  if(ELITE_ART) return ELITE_ART;
  /* ⚠ A RING, NOT A GLOW. The additive disc bloomed across the floor and read
     as lighting rather than as a marker — he asked for a plain coloured circle
     under the enemy. An annulus with NORMAL blending draws a clean outline that
     stays the colour it is told to be, whatever the floor underneath is doing. */
  const geo=new THREE.RingGeometry(0.72, 0.92, 30);
  geo.rotateX(-Math.PI/2);
  const mk=(hex)=>new THREE.MeshBasicMaterial({
    color:hex, transparent:true, opacity:0.85,
    depthWrite:false, toneMapped:false, fog:true, side:THREE.DoubleSide });
  ELITE_ART={ geo:geo, magic:mk(0x4d8dff), rare:mk(0xf2c53d) };""")

rep('elite-attach',
"""    const s=rarity==='rare' ? 1.15 : 0.85;
    m.scale.set(s,s,s);""",
"""    /* rare reads as the bigger threat, but both stay circles the same width of
       line — a marker that changes shape as well as colour is two rules */
    const s=rarity==='rare' ? 1.25 : 1.0;
    m.scale.set(s,s,s);""")

# the breath goes with the glow
rep('elite-tick',
"""/* a slow breath, so an elite reads as alive rather than as a decal. One sine
   per elite per frame — no allocation, no material churn. */
function tickEliteGlow(dt){
  if(!ENEMIES || !ENEMIES.length) return;
  const t=performance.now()/1000;
  for(let i=0;i<ENEMIES.length;i++){
    const e=ENEMIES[i];
    if(!e || !e.glow || e.dead) continue;
    const k=e.glowBase*(1+Math.sin(t*1.7+i)*0.07);
    e.glow.scale.set(k,k,k);
  }
}""",
"""/* The pulse is gone with the glow: a marker that moves competes with the thing
   it is marking. Kept as a no-op so the frame-loop hook and any caller still
   resolve — removing the call site is a separate, riskier edit for no gain. */
function tickEliteGlow(dt){ /* intentionally static */ }""")

open('work.html','w',encoding='utf-8').write(src)
print('applied:', hits)
