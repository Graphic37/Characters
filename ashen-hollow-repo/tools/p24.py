src = open('work.html', encoding='utf-8').read()
hits = {}
def rep(name, old, new, count=1):
    global src
    n = src.count(old)
    assert n == count, f"{name}: expected {count}, found {n}"
    src = src.replace(old, new); hits[name] = n

# ============================================================ GEOMETRY + MATS
rep('abyss-geo',
"""  kit.def('wallStain', GEO.wallStain, MAT.decGrime, { cast: false, recv: false, renderOrder: 1 });
}""",
"""  kit.def('wallStain', GEO.wallStain, MAT.decGrime, { cast: false, recv: false, renderOrder: 1 });

  /* ---- THE ABYSS ---------------------------------------------------------
     Everything below is decoration hanging UNDER the dungeon. It adds no
     collision, no lights and no shadows, and it goes through the same kit as
     the rest, so each piece is one instanced draw call and teardown already
     knows how to free it.
     The gradient is baked into VERTEX COLOURS rather than lit, so these need
     no light to fade into the dark — which is the whole reason this is cheap
     enough to do at all. */
  kit.def('skirt', GEO.skirt, MAT.abyss, { cast: false, recv: false });
  kit.def('abyssPillar', GEO.abyssPillar, MAT.abyss, { cast: false, recv: false });
  kit.def('abyssArch', GEO.abyssArch, MAT.abyss, { cast: false, recv: false });
}""")

rep('abyss-geo-defs',
"""  GEO.wallStain = wallStainGeo();""",
"""  GEO.wallStain = wallStainGeo();

  /* the skirt: the outside face of a wall, continuing down into the dark.
     Height is generous (6m) because the camera is high — a short one reads as
     a lip rather than a cliff. */
  GEO.skirt = shadeDown(new THREE.BoxGeometry(CELL + 0.36, 6.0, 0.30), 0.30, 0.02);
  GEO.abyssPillar = shadeDown(new THREE.CylinderGeometry(0.9, 1.25, 26, 6, 1, true), 0.16, 0.01);
  GEO.abyssArch = shadeDown(new THREE.TorusGeometry(3.4, 0.42, 4, 10, Math.PI), 0.15, 0.02);""")

rep('abyss-shade-fn',
"""function jitterVerts(geo, amp, seed) {""",
"""/* Bake a top-to-bottom brightness ramp into vertex colours. An unlit material
   reading these fades into the void by itself — no light, no shadow, no cost. */
function shadeDown(geo, topV, botV) {
  const p = geo.attributes.position;
  let minY = Infinity, maxY = -Infinity;
  for (let i = 0; i < p.count; i++) { const y = p.getY(i); if (y < minY) minY = y; if (y > maxY) maxY = y; }
  const span = Math.max(1e-6, maxY - minY);
  const c = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    const k = (p.getY(i) - minY) / span;          // 0 at the bottom, 1 at the top
    const v = botV + (topV - botV) * (k * k);     // squared: dark for most of the drop
    c[i * 3] = v * 1.00; c[i * 3 + 1] = v * 1.03; c[i * 3 + 2] = v * 1.22;   // cool, not neutral
  }
  geo.setAttribute('color', new THREE.BufferAttribute(c, 3));
  return geo;
}

function jitterVerts(geo, amp, seed) {""")

rep('abyss-mat',
"""  kit.def('urn0', GEO.urn0, MAT.stone, SMALL); kit.def('urn1', GEO.urn1, MAT.stone, SMALL);""",
"""  /* unlit and fogged: the scene fog is what makes distant abyss geometry
     dissolve, and skipping the lighting model is most of the saving */
  MAT.abyss = new THREE.MeshBasicMaterial({ vertexColors: true, fog: true });
  kit.def('urn0', GEO.urn0, MAT.stone, SMALL); kit.def('urn1', GEO.urn1, MAT.stone, SMALL);""")

# ============================================================ THE BUILD PASS
rep('abyss-build-call',
"""    this.buildCorridorDressing();
    this.kit.commit(this.group);""",
"""    this.buildCorridorDressing();
    this.buildAbyss();
    this.kit.commit(this.group);""")

rep('abyss-build',
"""  /* --------------------------- doorway frames ----------------------------- */""",
"""  /* ------------------------------- the abyss ------------------------------
     Rooms should read as elevated platforms over a bottomless complex, not as
     tiles floating on an unfinished black background. Three cheap layers:
     a skirt down the outside of every EXTERIOR wall, sparse silhouettes far
     below, and (outside this class) two haze planes.
     NOTHING here is a second dungeon: no floors, no collision, no lights. */
  buildAbyss() {
    const L = this.L, rng = new RNG(L.seed + 907);
    const SK = { 0: [0, 1], 1: [1, 0], 2: [0, -1], 3: [-1, 0] };

    /* Which walls are actually on the outside? A wall exists wherever floor
       meets non-floor, but two rooms one cell apart both raise walls with no
       gap to see through — skirting those is invisible work. Require the two
       cells beyond to be empty as well. */
    let skirts = 0;
    for (const w of L.walls) {
      const [dx, dz] = SK[w.dir];
      if (L.isFloor(w.i + dx, w.j + dz)) continue;
      if (L.isFloor(w.i + dx * 2, w.j + dz * 2)) continue;
      const OFF = 0.30;
      let x = w.i * CELL + CELL / 2, z = w.j * CELL + CELL / 2, ry = 0;
      if (w.dir === 0) { z = (w.j + 1) * CELL + OFF; ry = 0; }
      else if (w.dir === 1) { x = (w.i + 1) * CELL + OFF; ry = Math.PI / 2; }
      else if (w.dir === 2) { z = w.j * CELL - OFF; ry = 0; }
      else { x = w.i * CELL - OFF; ry = Math.PI / 2; }
      /* warm the top of a skirt that stands near a light, instead of adding a
         real one: this is the "torch bounce" for the price of an instance tint */
      const lit = this.nearLight ? this.nearLight(x, z) : false;
      this.kit.add('skirt', x, -3.0 + rng.r(-0.25, 0.25), z,
        { ry, tint: lit ? 0xffb877 : 0xffffff });
      skirts++;
    }

    /* silhouettes, far enough down that they never crowd the play space */
    const bx0 = 0, bz0 = 0, bx1 = L.GW * CELL, bz1 = L.GH * CELL;
    const want = Math.min(26, Math.round((L.GW * L.GH) / 260));
    for (let n = 0; n < want; n++) {
      const x = rng.r(bx0 - 8, bx1 + 8), z = rng.r(bz0 - 8, bz1 + 8);
      const i = Math.floor(x / CELL), j = Math.floor(z / CELL);
      if (L.isFloor(i, j)) continue;                 // never under the floor
      if (rng.chance(0.62)) {
        this.kit.add('abyssPillar', x, -19 + rng.r(-4, 4), z,
          { ry: rng.r(0, 6.28), s: rng.r(0.8, 1.5) });
      } else {
        this.kit.add('abyssArch', x, -11 + rng.r(-5, 5), z,
          { ry: rng.r(0, 6.28), rz: Math.PI, s: rng.r(0.9, 1.6) });
      }
    }
    this._abyssStats = { skirts, silhouettes: want };
  }

  /* a sconce or brazier within ~4m — used only to tint, never to light */
  nearLight(x, z) {
    const L = this.L;
    if (!this._lightPts) return false;
    for (let i = 0; i < this._lightPts.length; i++) {
      const p = this._lightPts[i];
      if (Math.abs(p[0] - x) < 4.2 && Math.abs(p[1] - z) < 4.2) return true;
    }
    return false;
  }

  /* --------------------------- doorway frames ----------------------------- */""")

# record sconce/brazier positions so nearLight has something to test
rep('light-points',
"""  addSconce(wx, wz, dir) {""",
"""  noteLight(x, z) {
    if (!this._lightPts) this._lightPts = [];
    this._lightPts.push([x, z]);
  }
  addSconce(wx, wz, dir) {
    this.noteLight(wx, wz);""")

rep('brazier-note',
"""  addBrazier(""",
"""  addBrazierNoted(x, z, s) { this.noteLight(x, z); return this.addBrazier(x, z, s); }
  addBrazier(""")

open('work.html','w',encoding='utf-8').write(src)
print('applied:', hits)
