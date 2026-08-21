import re, sys, hashlib
src = open('work.html', encoding='utf-8').read()
orig = src
hits = {}

def rep(name, old, new, count=1):
    global src
    n = src.count(old)
    assert n == count, f"{name}: expected {count} match(es), found {n}"
    src = src.replace(old, new)
    hits[name] = n

# ---------------------------------------------------------------- 1. COLLIDE
old_collide = """  if(inRift && window.DEPTHS && DEPTHS.walkableAt){
    if(DEPTHS.walkableAt(nx,nz)===false){          // no margin: it LOOSENS the test
      /* try the raw request; if that is illegal too, stand still. Returning the
         REQUEST here was the bug: it is a wall point by definition. */
      if(DEPTHS.walkableAt(ox,oz)===true) return [ox,oz];
      const P=player.position;
      return [P.x, P.z];
    }
  }"""

new_collide = """  if(inRift && window.DEPTHS && DEPTHS.walkableAt){
    /* SLIDING, NOT STOPPING. The old branch returned the CURRENT position when
       the resolved point was illegal, so a diagonal approach to any wall froze
       the hero mid-stride while the run animation kept playing — that is the
       "running in place" he kept seeing. A body that meets a wall at an angle
       should keep the component of its motion that is still legal. */
    const legal=(x,z)=>DEPTHS.walkableAt(x,z)!==false;   // null = no layout = legal
    if(!legal(nx,nz)){
      const P=player.position;
      const dx=ox-P.x, dz=oz-P.z;
      if(legal(P.x,P.z)){
        AUTO.stats.slides=(AUTO.stats.slides||0)+1;
        if(legal(ox,oz)) return [ox,oz];                 // the raw request is fine
        if(legal(ox,P.z)) return [ox,P.z];               // slide along Z wall
        if(legal(P.x,oz)) return [P.x,oz];               // slide along X wall
        /* deflect, nearest heading first, at full then half step */
        for(const ang of [0.39,-0.39,0.79,-0.79,1.18,-1.18,1.57,-1.57]){
          const c=Math.cos(ang), s=Math.sin(ang);
          const rx=dx*c-dz*s, rz=dx*s+dz*c;
          for(const f of [1,0.55]){
            const px=P.x+rx*f, pz=P.z+rz*f;
            if(legal(px,pz)) return [px,pz];
          }
        }
        return [P.x,P.z];                                // genuinely boxed in
      }
      /* ALREADY INSIDE GEOMETRY. Standing still here is a permanent stall: every
         request resolves illegal, so she never leaves. Walk OUT at normal step
         size instead of waiting for the unstick teleport. */
      const step=Math.max(0.18, Math.hypot(dx,dz));
      for(let r=0.4; r<=3.2; r+=0.4){
        for(let k=0;k<12;k++){
          const a=k*0.5236;
          const ex=P.x+Math.cos(a)*r, ez=P.z+Math.sin(a)*r;
          if(legal(ex,ez)){
            const d=Math.hypot(ex-P.x, ez-P.z)||1;
            const t=Math.min(1, step/d);                 // ease out, never a jump
            AUTO.stats.escapes=(AUTO.stats.escapes||0)+1;
            return [P.x+(ex-P.x)*t, P.z+(ez-P.z)*t];
          }
        }
      }
      return [nx,nz];                                    // nothing legal anywhere
    }
  }"""
rep('collide-slide', old_collide, new_collide)

# ---------------------------------------------------------------- 2. FEELERS
old_feeler = """function feelerAdjust(dx,dz){
  const P=player.position;
  const len=Math.hypot(dx,dz)||1;
  const ux=dx/len, uz=dz/len;
  const act=activeBlockers();
  const probe=(ax,az)=>{
    const px=P.x+ax*STEER_CFG.feeler, pz=P.z+az*STEER_CFG.feeler;
    for(let i=0;i<act.length;i++){
      const b=act[i];
      if(Math.hypot(px-b.x,pz-b.z) < b.r+0.7) return true;
    }
    return false;
  };
  if(!probe(ux,uz)) return [ux,uz];
  for(const ang of [0.5,-0.5,1.0,-1.0,1.6,-1.6,2.3,-2.3]){
    const c=Math.cos(ang), s2=Math.sin(ang);
    const rx=ux*c-uz*s2, rz=ux*s2+uz*c;
    if(!probe(rx,rz)) return [rx,rz];
  }
  return [0,0];
}"""

new_feeler = """function feelerAdjust(dx,dz){
  const P=player.position;
  const len=Math.hypot(dx,dz)||1;
  const ux=dx/len, uz=dz/len;
  /* INSIDE A DUNGEON THE WALK GRID IS THE ORACLE. The feelers used to probe
     activeBlockers() only, which is spatially culled and (since v132) is not
     what collide() actually enforces — so she would steer confidently into a
     heading collide() then refused, and pin. Probe what actually stops her. */
  const grid = (window.DEPTHS && DEPTHS.walkableAt && typeof RIFT!=='undefined' && RIFT.active)
    ? ((x,z)=>DEPTHS.walkableAt(x,z)===false) : null;
  const act = grid ? null : activeBlockers();
  const hit=(px,pz)=>{
    if(grid) return grid(px,pz);
    for(let i=0;i<act.length;i++){
      const b=act[i];
      if(Math.hypot(px-b.x,pz-b.z) < b.r+0.7) return true;
    }
    return false;
  };
  /* TWO DEPTHS, not one. A single 2.4m sample steps straight over a doorway
     jamb: the far point is open floor and the near one is masonry. */
  const probe=(ax,az)=>{
    for(const d of [1.15, STEER_CFG.feeler]){
      if(hit(P.x+ax*d, P.z+az*d)) return true;
    }
    return false;
  };
  if(!probe(ux,uz)) return [ux,uz];
  /* finer fan, nearest heading first, so she rounds a corner instead of
     choosing a 57-degree lurch the moment a wall clips the whisker */
  for(const ang of [0.35,-0.35,0.7,-0.7,1.05,-1.05,1.4,-1.4,1.75,-1.75,2.1,-2.1,2.5,-2.5]){
    const c=Math.cos(ang), s2=Math.sin(ang);
    const rx=ux*c-uz*s2, rz=ux*s2+uz*c;
    if(!probe(rx,rz)) return [rx,rz];
  }
  /* LAST RESORT USED TO BE STANDING STILL, which is the pose he screenshotted.
     Take the longest free heading at close range instead — moving one metre
     the wrong way beats not moving at all, and the goal logic re-aims next
     tick from wherever that leaves her. */
  let best=null, bestClear=0;
  for(let k=0;k<16;k++){
    const a=k*0.3927;
    const cx=Math.cos(a), cz=Math.sin(a);
    let clear=0;
    for(const d of [0.8,1.6,2.4]){ if(hit(P.x+cx*d,P.z+cz*d)) break; clear=d; }
    if(clear>bestClear){ bestClear=clear; best=[cx,cz]; }
  }
  return best || [0,0];
}"""
rep('feeler-grid', old_feeler, new_feeler)

# ------------------------------------------------- 3. BRAZIERS STOP BLOCKING
# every brazier that also claimed its walk cell -> take() only (dressing, per v132)
braz = [
 ("      this.addBrazier(...this.L.worldOf(ai - 2, aj), 1.0); this.solid(ai - 2, aj);\n"
  "      this.addBrazier(...this.L.worldOf(ai + 2, aj), 1.0); this.solid(ai + 2, aj);",
  "      this.addBrazier(...this.L.worldOf(ai - 2, aj), 1.0); this.take(ai - 2, aj);\n"
  "      this.addBrazier(...this.L.worldOf(ai + 2, aj), 1.0); this.take(ai + 2, aj);"),
 ("      this.addBrazier(...this.L.worldOf(i, j), 1.0); this.solid(i, j);",
  "      this.addBrazier(...this.L.worldOf(i, j), 1.0); this.take(i, j);"),
 ("    this.addBrazier(cx, cz, 1.05); this.solid(Math.round(r.cx), Math.round(r.cz));",
  "    this.addBrazier(cx, cz, 1.05); this.take(Math.round(r.cx), Math.round(r.cz));"),
 ("      if (k % 2 === 0) { this.addBrazier(wx, wz, 0.9); this.solid(i, j); }",
  "      if (k % 2 === 0) { this.addBrazier(wx, wz, 0.9); this.take(i, j); }"),
 ("    this.addBrazier(cx, cz, 1.0); this.solid(Math.round(r.cx), Math.round(r.cz));",
  "    this.addBrazier(cx, cz, 1.0); this.take(Math.round(r.cx), Math.round(r.cz));"),
]
for i,(o,n) in enumerate(braz):
    rep(f'brazier-{i}', o, n)

# ------------------------------------------- 4. NO LANTERNS ON THE SPAWN ROOM
old_entry = """    this.scatterProps(r, rng, [['crate', 0.4], ['barrel', 0.4], ['rubble1', 0.2]], 4);
    const [bx, bz] = this.L.worldOf(Math.round(r.cx) - 2, Math.round(r.cz));
    this.addBrazier(bx, bz, 1.1); this.solid(Math.round(r.cx) - 2, Math.round(r.cz));"""
second = ("    const [bx2, bz2] = this.L.worldOf(Math.round(r.cx) + 1, Math.round(r.cz));\n"
          "    this.addBrazier(bx2, bz2, 1.1); this.solid(Math.round(r.cx) + 1, Math.round(r.cz));")
new_entry = """    /* NO PROPS AND NO LANTERNS ON THE LANDING SPOT. This room is where the
       player materialises: two braziers were placed two cells either side of
       its centre, which is exactly the pair standing on top of her in his
       screenshot, and the scattered crates were the other thing she woke up
       wedged against. The room is lit from the walls instead. */
    this.dressWalls(r, rng, { sconces: 4 });"""
rep('entry-braziers', old_entry + "\n" + second, new_entry)

# --------------------------------------------------- 5. cu_grkey is a real currency
rep('grkey-currency',
""" {id:'cu_vault',  n:'Vaulted Coin',   grad:'gGold',  shape:'orb',   max:99,
  use:'Currency accepted by every merchant in the Pale', target:null}
);""",
""" {id:'cu_vault',  n:'Vaulted Coin',   grad:'gGold',  shape:'orb',   max:99,
  use:'Currency accepted by every merchant in the Pale', target:null},
 /* cu_grkey had an icon, a label and an award path that hand-built the item,
    but no row here — so makeCurrency('cu_grkey') fell through to pick(CURRENCY)
    and handed back a random orb. */
 {id:'cu_grkey',  n:'Greater Rift Key', grad:'gGem',   shape:'shard', max:99,
  use:'Opens a Greater Rift', target:null}
);""")

open('work.html','w',encoding='utf-8').write(src)
print("applied:", hits)
print("delta bytes:", len(src)-len(orig))
