/* ===========================================================================
   Part C : layout generation
   grid cells are CELL metres square. cell (i,j) spans x[i*CELL,(i+1)*CELL]
   =========================================================================== */

const EMPTY = 0, ROOM = 1, CORR = 2;

const ARCHETYPES = {
  entry:    { w: [9, 11],  d: [9, 12],  label: 'Entrance Hall' },
  hall:     { w: [11, 15], d: [13, 19], label: 'Pillared Hall' },
  nave:     { w: [10, 12], d: [19, 26], label: 'Cathedral Nave' },
  crypt:    { w: [11, 14], d: [11, 14], label: 'Crypt' },
  cistern:  { w: [13, 17], d: [13, 17], label: 'Flooded Cistern' },
  ossuary:  { w: [10, 13], d: [13, 17], label: 'Ossuary' },
  ritual:   { w: [12, 15], d: [12, 15], label: 'Ritual Chamber' },
  barracks: { w: [8, 10],  d: [9, 12],  label: 'Guard Quarters' },
  gallery:  { w: [7, 9],   d: [17, 24], label: 'Collapsed Gallery' },
  vault:    { w: [8, 10],  d: [8, 10],  label: 'Sealed Vault' },
  arena:    { w: [17, 21], d: [17, 21], label: 'Boss Arena' }
};

/* Each complex gets its OWN palette and its OWN light preset. Before this the
   five themes shared four presets and identical stone, so every dungeon read
   the same grey-blue. `tint` multiplies the shared materials at build time —
   one theme per dungeon, so tinting the cached material is exactly right and
   costs nothing. */
const THEMES = {
  crypt:      { name: 'Blackreach Crypt',    pool: ['crypt', 'crypt', 'ossuary', 'hall', 'gallery', 'barracks', 'vault', 'ritual'],  light: 'ember',
                tint: { floor: 0xcfd2d8, wall: 0xc8ccd4, stone: 0xd6d8dc, bone: 0xffffff } },
  cathedral:  { name: 'Drowned Cathedral',   pool: ['nave', 'hall', 'ritual', 'ossuary', 'cistern', 'gallery', 'vault'],             light: 'moon',
                tint: { floor: 0xb9cbd2, wall: 0xaec2cc, stone: 0xc4d4da, bone: 0xe8f0f2 } },
  cistern:    { name: 'Sunken Cisterns',     pool: ['cistern', 'cistern', 'hall', 'gallery', 'crypt', 'barracks', 'vault'],          light: 'verdant',
                tint: { floor: 0xa8c0a4, wall: 0x9fb89c, stone: 0xb4c8ae, bone: 0xdce6d4 } },
  fortress:   { name: 'Ruined Keep',         pool: ['hall', 'barracks', 'gallery', 'hall', 'vault', 'ritual', 'crypt'],              light: 'ash',
                tint: { floor: 0xe0c9a0, wall: 0xd8c098, stone: 0xe6d2ac, bone: 0xf0e4c8 } },
  catacombs:  { name: 'Endless Catacombs',   pool: ['ossuary', 'crypt', 'gallery', 'ossuary', 'ritual', 'vault', 'hall'],            light: 'rust',
                tint: { floor: 0xd0a488, wall: 0xc09880, stone: 0xd4ac90, bone: 0xf2e2cc } }
};

/* Five presets for five complexes — no sharing, so no two dungeons in a row
   read the same. Colours here are sRGB, so they stay mid-grey and the MOOD
   comes from intensity (a dark hex lands at almost zero in linear space). */
const LIGHT_PRESETS = {
  /* cold bone-grey vault, warm braziers, deep blue shadow */
  ember:   { fog: 0x14110d, fogD: 0.0070, amb: 0x807f8c, ambI: 1.00, hemiSky: 0x74798a, hemiGnd: 0x554027, hemiI: 0.95,
             dir: 0xa9b7d2, dirI: 0.55, fire: 0xff8b3a, fireI: 1.00, shaft: 0x8fa4c6 },
  /* pale moonlight down through broken vaulting, cool and open */
  moon:    { fog: 0x121722, fogD: 0.0062, amb: 0x7e88a4, ambI: 1.05, hemiSky: 0x7c8db4, hemiGnd: 0x453d33, hemiI: 1.05,
             dir: 0xc3d3f0, dirI: 1.25, fire: 0xff8534, fireI: 0.90, shaft: 0xa9c1e8 },
  /* algae and standing water: sickly green fill, dim key, heavy haze */
  verdant: { fog: 0x0f1a15, fogD: 0.0105, amb: 0x6e8878, ambI: 0.95, hemiSky: 0x5f8272, hemiGnd: 0x36402c, hemiI: 0.95,
             dir: 0x86ab97, dirI: 0.45, fire: 0xffb457, fireI: 1.00, shaft: 0x86b9a0 },
  /* dust and ochre sandstone, warm dry daylight bleeding through the ruin */
  ash:     { fog: 0x1d1710, fogD: 0.0068, amb: 0x968a75, ambI: 1.05, hemiSky: 0x9a8c6c, hemiGnd: 0x5b452c, hemiI: 1.00,
             dir: 0xe4cfa2, dirI: 1.05, fire: 0xff7f2c, fireI: 1.05, shaft: 0xd8c193 },
  /* red earth and old iron, the darkest of the five, lit almost only by fire */
  rust:    { fog: 0x190f0b, fogD: 0.0092, amb: 0x8a7264, ambI: 0.85, hemiSky: 0x7d6456, hemiGnd: 0x4a2c20, hemiI: 0.85,
             dir: 0xb08c74, dirI: 0.45, fire: 0xff7328, fireI: 1.15, shaft: 0xc0876a }
};
class Layout {
  constructor(seed, themeKey, sizeKey) {
    this.rng = new RNG(seed);
    this.seed = seed;
    this.theme = THEMES[themeKey] || THEMES.crypt;
    this.themeKey = themeKey;
    this.sizeKey = sizeKey;
    const counts = { small: 9, medium: 14, large: 19 };
    this.targetRooms = counts[sizeKey] || 14;
    this.GW = sizeKey === 'small' ? 70 : sizeKey === 'medium' ? 92 : 112;
    this.GH = this.GW;
    this.grid = new Uint8Array(this.GW * this.GH);
    this.rid = new Int16Array(this.GW * this.GH).fill(-1);
    this.rooms = [];
    this.corridors = [];
    this.doors = [];
    this.generate();
  }
  idx(i, j) { return j * this.GW + i; }
  get(i, j) { return (i < 0 || j < 0 || i >= this.GW || j >= this.GH) ? EMPTY : this.grid[j * this.GW + i]; }
  isFloor(i, j) { return this.get(i, j) !== EMPTY; }

  fits(x, z, w, d, margin) {
    if (x - margin < 1 || z - margin < 1 || x + w + margin >= this.GW - 1 || z + d + margin >= this.GH - 1) return false;
    for (const r of this.rooms) {
      if (x - margin < r.x + r.w + margin && x + w + margin > r.x - margin &&
          z - margin < r.z + r.d + margin && z + d + margin > r.z - margin) return false;
    }
    return true;
  }
  carveRoom(r) {
    r.id = this.rooms.length;
    this.rooms.push(r);
    for (let j = r.z; j < r.z + r.d; j++) for (let i = r.x; i < r.x + r.w; i++) {
      this.grid[this.idx(i, j)] = ROOM; this.rid[this.idx(i, j)] = r.id;
    }
    r.cx = r.x + r.w / 2; r.cz = r.z + r.d / 2;
    r.links = [];
    return r;
  }
  makeRoom(type, x, z, w, d) { return { type, x, z, w, d, label: ARCHETYPES[type].label }; }
  roomSize(type) {
    const a = ARCHETYPES[type], rng = this.rng;
    let w = rng.i(a.w[0], a.w[1]), d = rng.i(a.d[0], a.d[1]);
    if (rng.chance(0.4)) { const t = w; w = d; d = t; }
    return [w, d];
  }

  generate() {
    const rng = this.rng;
    // entrance sits near one edge, facing inward
    const [ew, ed] = this.roomSize('entry');
    const side = rng.i(0, 3);
    let ex, ez;
    if (side === 0) { ex = ((this.GW - ew) / 2 | 0) + rng.i(-8, 8); ez = 3; }
    else if (side === 1) { ex = ((this.GW - ew) / 2 | 0) + rng.i(-8, 8); ez = this.GH - ed - 3; }
    else if (side === 2) { ex = 3; ez = ((this.GH - ed) / 2 | 0) + rng.i(-8, 8); }
    else { ex = this.GW - ew - 3; ez = ((this.GH - ed) / 2 | 0) + rng.i(-8, 8); }
    this.carveRoom(this.makeRoom('entry', ex, ez, ew, ed));

    const pool = this.theme.pool.slice();
    let guard = 0;
    while (this.rooms.length < this.targetRooms && guard++ < 900) {
      // bias growth toward the most recently placed rooms so the dungeon reads
      // as a journey outward rather than a blob
      const srcIdx = Math.min(this.rooms.length - 1, Math.max(0, this.rooms.length - 1 - Math.floor(Math.abs(rng.n() - rng.n()) * this.rooms.length)));
      const src = this.rooms[srcIdx];
      const type = rng.pick(pool);
      const [w, d] = this.roomSize(type);
      const dir = rng.i(0, 3);
      const gap = rng.i(4, 9);
      let x, z;
      if (dir === 0) {        // +X
        x = src.x + src.w + gap;
        z = src.z + rng.i(-Math.max(1, d - 5), Math.max(1, src.d - 5));
      } else if (dir === 1) { // -X
        x = src.x - gap - w;
        z = src.z + rng.i(-Math.max(1, d - 5), Math.max(1, src.d - 5));
      } else if (dir === 2) { // +Z
        z = src.z + src.d + gap;
        x = src.x + rng.i(-Math.max(1, w - 5), Math.max(1, src.w - 5));
      } else {                // -Z
        z = src.z - gap - d;
        x = src.x + rng.i(-Math.max(1, w - 5), Math.max(1, src.w - 5));
      }
      if (!this.fits(x, z, w, d, 3)) continue;
      // require a clean straight corridor: overlap of at least 4 cells
      const horiz = dir === 0 || dir === 1;
      const oLo = horiz ? Math.max(src.z, z) : Math.max(src.x, x);
      const oHi = horiz ? Math.min(src.z + src.d, z + d) : Math.min(src.x + src.w, x + w);
      if (oHi - oLo < 5) continue;
      const room = this.carveRoom(this.makeRoom(type, x, z, w, d));
      this.connect(src, room, horiz, oLo, oHi);
    }

    // a couple of loop links so the map is not a pure tree
    let loops = 0;
    for (let a = 0; a < this.rooms.length && loops < 3; a++) {
      for (let b = a + 2; b < this.rooms.length && loops < 3; b++) {
        const A = this.rooms[a], B = this.rooms[b];
        if (A.links.includes(B.id)) continue;
        const oxLo = Math.max(A.x, B.x), oxHi = Math.min(A.x + A.w, B.x + B.w);
        const ozLo = Math.max(A.z, B.z), ozHi = Math.min(A.z + A.d, B.z + B.d);
        if (ozHi - ozLo >= 5) {
          const gap = (B.x > A.x) ? B.x - (A.x + A.w) : A.x - (B.x + B.w);
          if (gap > 2 && gap < 16 && this.clearBand(true, A, B, ozLo, ozHi)) { this.connect(A, B, true, ozLo, ozHi); loops++; }
        } else if (oxHi - oxLo >= 5) {
          const gap = (B.z > A.z) ? B.z - (A.z + A.d) : A.z - (B.z + B.d);
          if (gap > 2 && gap < 16 && this.clearBand(false, A, B, oxLo, oxHi)) { this.connect(A, B, false, oxLo, oxHi); loops++; }
        }
      }
    }

    // pick the boss room: deepest by graph distance, then upgrade it to an arena
    this.computeDepths();
    let deepest = this.rooms[0];
    for (const r of this.rooms) if (r.depth > deepest.depth) deepest = r;
    deepest.isBoss = true;
    deepest.label = 'Boss Arena — ' + deepest.label;
    this.rooms[0].isEntry = true;

    this.buildWalls();
    this.buildNav();
  }

  clearBand(horiz, A, B, lo, hi) {
    const c = Math.floor((lo + hi) / 2);
    if (horiz) {
      const x0 = Math.min(A.x + A.w, B.x + B.w), x1 = Math.max(A.x, B.x);
      for (let i = x0; i < x1; i++) for (let j = c - 3; j <= c + 3; j++) if (this.get(i, j) !== EMPTY) return false;
    } else {
      const z0 = Math.min(A.z + A.d, B.z + B.d), z1 = Math.max(A.z, B.z);
      for (let j = z0; j < z1; j++) for (let i = c - 3; i <= c + 3; i++) if (this.get(i, j) !== EMPTY) return false;
    }
    return true;
  }

  connect(A, B, horiz, lo, hi) {
    const rng = this.rng;
    const width = rng.chance(0.35) ? 4 : 3;
    const centre = Math.floor((lo + hi) / 2) + rng.i(-1, 1);
    const half = Math.floor(width / 2);
    const c0 = centre - half, c1 = c0 + width - 1;
    if (horiz) {
      const x0 = Math.min(A.x + A.w, B.x + B.w), x1 = Math.max(A.x, B.x);
      for (let i = x0; i < x1; i++) for (let j = c0; j <= c1; j++) {
        if (this.get(i, j) === EMPTY) { this.grid[this.idx(i, j)] = CORR; this.rid[this.idx(i, j)] = -1; }
      }
      this.doors.push({ i: x0, j0: c0, j1: c1, horiz: true });
      this.doors.push({ i: x1 - 1, j0: c0, j1: c1, horiz: true });
      this.corridors.push({ horiz: true, a: x0, b: x1, c0, c1 });
    } else {
      const z0 = Math.min(A.z + A.d, B.z + B.d), z1 = Math.max(A.z, B.z);
      for (let j = z0; j < z1; j++) for (let i = c0; i <= c1; i++) {
        if (this.get(i, j) === EMPTY) { this.grid[this.idx(i, j)] = CORR; this.rid[this.idx(i, j)] = -1; }
      }
      this.doors.push({ j: z0, i0: c0, i1: c1, horiz: false });
      this.doors.push({ j: z1 - 1, i0: c0, i1: c1, horiz: false });
      this.corridors.push({ horiz: false, a: z0, b: z1, c0, c1 });
    }
    A.links.push(B.id); B.links.push(A.id);
  }

  computeDepths() {
    for (const r of this.rooms) r.depth = -1;
    const q = [this.rooms[0]]; this.rooms[0].depth = 0;
    while (q.length) {
      const r = q.shift();
      for (const id of r.links) { const n = this.rooms[id]; if (n.depth < 0) { n.depth = r.depth + 1; q.push(n); } }
    }
    for (const r of this.rooms) if (r.depth < 0) r.depth = 0;
  }

  /* --- derive every wall segment and corner post ------------------------- */
  buildWalls() {
    this.walls = [];   // {i,j,dir}  dir 0:+Z 1:+X 2:-Z 3:-X  (side of cell i,j)
    this.posts = [];   // lattice vertices that are true corners
    const D = [[0, 1], [1, 0], [0, -1], [-1, 0]];
    for (let j = 0; j < this.GH; j++) for (let i = 0; i < this.GW; i++) {
      if (!this.isFloor(i, j)) continue;
      for (let d = 0; d < 4; d++) {
        if (!this.isFloor(i + D[d][0], j + D[d][1])) this.walls.push({ i, j, dir: d });
      }
    }
    for (let j = 1; j < this.GH; j++) for (let i = 1; i < this.GW; i++) {
      const a = this.isFloor(i - 1, j - 1) ? 1 : 0, b = this.isFloor(i, j - 1) ? 1 : 0;
      const c = this.isFloor(i - 1, j) ? 1 : 0, e = this.isFloor(i, j) ? 1 : 0;
      const n = a + b + c + e;
      if (n === 0 || n === 4) continue;
      if (n === 2 && ((a && e) || (b && c))) { this.posts.push({ i, j }); continue; } // diagonal pinch
      if (n === 1 || n === 3) this.posts.push({ i, j });
    }
  }

  /* --- walkability + a room lookup per cell ------------------------------ */
  buildNav() {
    this.walk = new Uint8Array(this.GW * this.GH);
    for (let k = 0; k < this.grid.length; k++) this.walk[k] = this.grid[k] !== EMPTY ? 1 : 0;
  }
  blockCell(i, j) { if (i >= 0 && j >= 0 && i < this.GW && j < this.GH) this.walk[this.idx(i, j)] = 0; }
  walkable(i, j) { return i >= 0 && j >= 0 && i < this.GW && j < this.GH && this.walk[this.idx(i, j)] === 1; }

  worldOf(i, j) { return [(i + 0.5) * CELL, (j + 0.5) * CELL]; }
  cellOf(x, z) { return [Math.floor(x / CELL), Math.floor(z / CELL)]; }

  bounds() {
    let x0 = 1e9, z0 = 1e9, x1 = -1e9, z1 = -1e9;
    for (const r of this.rooms) { x0 = Math.min(x0, r.x); z0 = Math.min(z0, r.z); x1 = Math.max(x1, r.x + r.w); z1 = Math.max(z1, r.z + r.d); }
    return { x0: x0 * CELL, z0: z0 * CELL, x1: x1 * CELL, z1: z1 * CELL };
  }
  stats() {
    let cells = 0;
    for (let k = 0; k < this.grid.length; k++) if (this.grid[k]) cells++;
    return { rooms: this.rooms.length, cells, area: Math.round(cells * CELL * CELL), walls: this.walls.length };
  }
}

/* ------------------------------ A* ---------------------------------------- */
function findPath(L, si, sj, ti, tj) {
  if (!L.walkable(ti, tj)) {
    let best = null, bd = 1e9;
    for (let r = 1; r < 6 && !best; r++) {
      for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) {
        if (!L.walkable(ti + di, tj + dj)) continue;
        const d = di * di + dj * dj;
        if (d < bd) { bd = d; best = [ti + di, tj + dj]; }
      }
    }
    if (!best) return null;
    ti = best[0]; tj = best[1];
  }
  if (!L.walkable(si, sj)) return null;
  const W = L.GW, N = W * L.GH;
  const gScore = new Float32Array(N).fill(Infinity);
  const came = new Int32Array(N).fill(-1);
  const open = [], inOpen = new Uint8Array(N);
  const h = (i, j) => Math.hypot(i - ti, j - tj);
  const sIdx = sj * W + si, tIdx = tj * W + ti;
  gScore[sIdx] = 0;
  open.push({ k: sIdx, f: h(si, sj) }); inOpen[sIdx] = 1;
  const D = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414]];
  let guard = 0;
  while (open.length && guard++ < 60000) {
    let bi = 0;
    for (let i = 1; i < open.length; i++) if (open[i].f < open[bi].f) bi = i;
    const cur = open.splice(bi, 1)[0];
    inOpen[cur.k] = 0;
    if (cur.k === tIdx) break;
    const ci = cur.k % W, cj = (cur.k / W) | 0;
    for (const [di, dj, cost] of D) {
      const ni = ci + di, nj = cj + dj;
      if (!L.walkable(ni, nj)) continue;
      if (di && dj && (!L.walkable(ci + di, cj) || !L.walkable(ci, cj + dj))) continue;
      const nk = nj * W + ni, ng = gScore[cur.k] + cost;
      if (ng < gScore[nk]) {
        gScore[nk] = ng; came[nk] = cur.k;
        if (!inOpen[nk]) { open.push({ k: nk, f: ng + h(ni, nj) }); inOpen[nk] = 1; }
      }
    }
  }
  if (came[tIdx] < 0 && tIdx !== sIdx) return null;
  const path = [];
  let k = tIdx;
  while (k >= 0) { path.push([k % W, (k / W) | 0]); if (k === sIdx) break; k = came[k]; }
  path.reverse();
  return smoothPath(L, path);
}
function smoothPath(L, path) {
  if (path.length < 3) return path;
  const out = [path[0]];
  let i = 0;
  while (i < path.length - 1) {
    let j = path.length - 1;
    for (; j > i + 1; j--) if (losClear(L, path[i], path[j])) break;
    out.push(path[j]);
    i = j;
  }
  return out;
}
function losClear(L, a, b) {
  const steps = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) * 2);
  for (let s = 1; s < steps; s++) {
    const t = s / steps;
    const i = Math.round(a[0] + (b[0] - a[0]) * t), j = Math.round(a[1] + (b[1] - a[1]) * t);
    if (!L.walkable(i, j)) return false;
  }
  return true;
}
