/* ===========================================================================
   Part D : material library, geometry cache, world builder
   =========================================================================== */

const GEO = {};

function buildMaterialLibrary() {
  MAT.floor = stdMat(TEX.floor, { repeat: 1, env: 0.55 });
  MAT.floor.normalScale.set(1.15, 1.15);
  MAT.wall = stdMat(TEX.wall, { repeat: 1, env: 0.50 });
  MAT.wall.normalScale.set(1.25, 1.25);
  MAT.stone = stdMat(TEX.wall, { repeat: 2, env: 0.55, color: 0xeceae6 });
  MAT.dirt = stdMat(TEX.dirt, { repeat: 1, env: 0.15 });
  MAT.wood = stdMat(TEX.wood, { repeat: 1, env: 0.25 });
  MAT.metal = stdMat(TEX.metal, { repeat: 1, env: 1.0, metalness: 0.85, roughness: 0.6 });
  MAT.bone = stdMat(TEX.bone, { repeat: 1, env: 0.35 });
  MAT.cloth = stdMat(TEX.cloth, { repeat: 1, env: 0.10 });
  MAT.cloth.side = THREE.DoubleSide;

  MAT.water = new THREE.MeshStandardMaterial({
    color: 0x233530, roughness: 0.16, metalness: 0.02,
    normalMap: tex(TEX.waterN, 6), transparent: true, opacity: 0.52,
    envMapIntensity: 1.6, depthWrite: false
  });
  MAT.water.normalScale.set(0.30, 0.30);

  const mkDecal = (canvas, color, opacity, blend) => new THREE.MeshBasicMaterial({
    color, transparent: true, opacity, alphaMap: alphaTex(canvas), depthWrite: false,
    blending: blend || THREE.NormalBlending, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2
  });
  MAT.decGrime = mkDecal(TEX.blot, 0x0d0b09, 0.30);
  MAT.decCrack = mkDecal(TEX.crack, 0x0c0b09, 0.52);
  MAT.decMoss = mkDecal(TEX.scatter, 0x222a19, 0.42);
  MAT.decDust = mkDecal(TEX.scatter, 0x2e2a23, 0.22);
  MAT.decContact = mkDecal(TEX.grad, 0x000000, 0.42);
  MAT.decLight = mkDecal(TEX.grad, 0x8ea6c8, 0.045, THREE.AdditiveBlending);
  MAT.decFire = mkDecal(TEX.grad, 0xff8a3c, 0.030, THREE.AdditiveBlending);
  MAT.web = new THREE.MeshBasicMaterial({ color: 0x9a968c, transparent: true, opacity: 0.10, depthWrite: false, side: THREE.DoubleSide });

  MAT.coal = new THREE.MeshStandardMaterial({ color: 0x140b06, roughness: 0.95, emissive: 0xff4a10, emissiveIntensity: 1.5 });
  MAT.fire = new THREE.MeshBasicMaterial({
    color: 0xff9040, transparent: true, opacity: 0.85, alphaMap: alphaTex(TEX.flame),
    blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
  });
  MAT.shaft = new THREE.MeshBasicMaterial({
    color: 0x8ea6c8, transparent: true, opacity: 0.075, blending: THREE.AdditiveBlending,
    depthWrite: false, side: THREE.DoubleSide, vertexColors: true
  });
  MAT.ember = new THREE.PointsMaterial({
    size: 0.10, map: alphaTex(TEX.grad), color: 0xff8c3c, transparent: true,
    blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.85, sizeAttenuation: true
  });
  MAT.dust = new THREE.PointsMaterial({
    size: 0.055, map: alphaTex(TEX.grad), color: 0x9aa2ae, transparent: true,
    blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.28, sizeAttenuation: true
  });
}

function buildGeometryLibrary() {
  for (let q = 0; q < 4; q++) { GEO['floor' + q] = floorTileGeo(q); GEO['inlay' + q] = floorInlayGeo(q); }
  GEO.floorPit = floorPitGeo();
  for (let i = 0; i < 6; i++) GEO['wall_p' + i] = wallPanelGeo('plain', 11 + i * 137);
  GEO.wall_c0 = wallPanelGeo('cracked', 811); GEO.wall_c1 = wallPanelGeo('cracked', 977);
  GEO.wall_n0 = wallPanelGeo('niche', 1301); GEO.wall_n1 = wallPanelGeo('niche', 1471);
  GEO.wall_b0 = wallPanelGeo('broken', 1601); GEO.wall_b1 = wallPanelGeo('broken', 1777);
  GEO.post = mrg([box(0.66, WALL_H, 0.66, 0, WALL_H / 2, 0), box(0.80, 0.20, 0.80, 0, 0.10, 0), box(0.78, 0.16, 0.78, 0, WALL_H - 0.08, 0)]);
  GEO.corbel = corbelGeo();
  GEO.pillar = pillarGeo('tall');
  GEO.pillarShort = pillarGeo('short');
  GEO.pillarBroken = pillarGeo('broken');
  GEO.arch = archGeo();
  GEO.lintel = mrg([box(CELL, 0.62, 1.05, 0, 3.70, 0), box(CELL, 0.16, 1.30, 0, 3.32, 0), box(CELL, 0.14, 1.24, 0, 4.06, 0)]);
  GEO.jamb = mrg([box(0.70, 3.35, 1.10, 0, 1.68, 0), box(0.86, 0.22, 1.26, 0, 0.11, 0), box(0.86, 0.22, 1.26, 0, 3.44, 0)]);
  GEO.portcullis = portcullisGeo();
  GEO.brazier = brazierGeo();
  GEO.coals = coalsGeo();
  GEO.sconce = sconceGeo();
  GEO.sarc = sarcophagusGeo(false);
  GEO.sarcOpen = sarcophagusGeo(true);
  GEO.altar = altarGeo();
  GEO.statue0 = statueGeo(21); GEO.statue1 = statueGeo(88);
  GEO.rack = rackGeo();
  for (let i = 0; i < 3; i++) GEO['rubble' + i] = rubbleGeo(300 + i * 61, 1 + i * 0.55);
  GEO.bones0 = boneGeo(410); GEO.bones1 = boneGeo(455);
  GEO.urn0 = urnGeo(510); GEO.urn1 = urnGeo(577);
  GEO.barrel = barrelGeo();
  GEO.crate = crateGeo();
  GEO.chain = chainGeo();
  GEO.banner = bannerGeo();
  GEO.stairs = stairGeo(8);
  GEO.grating = gratingGeo();
  GEO.cobweb = cobwebGeo();
  GEO.decal = decalGeo(1);
  GEO.wallStain = wallStainGeo();
  GEO.fireQuad = new THREE.PlaneGeometry(1, 1);
}

function defineKit(kit) {
  const F = { cast: false, recv: true };
  for (let q = 0; q < 4; q++) {
    kit.def('floor' + q, GEO['floor' + q], MAT.floor, F);
    kit.def('inlay' + q, GEO['inlay' + q], MAT.floor, F);
  }
  kit.def('floorPit', GEO.floorPit, MAT.dirt, F);
  const wallOpt = { cast: false, recv: true };
  for (const k of ['wall_p0', 'wall_p1', 'wall_p2', 'wall_p3', 'wall_p4', 'wall_p5', 'wall_c0', 'wall_c1', 'wall_n0', 'wall_n1', 'wall_b0', 'wall_b1'])
    kit.def(k, GEO[k], MAT.wall, wallOpt);
  kit.def('post', GEO.post, MAT.wall, wallOpt);
  kit.def('corbel', GEO.corbel, MAT.wall, wallOpt);
  // SHADOW BUDGET: only pieces whose silhouette reads from a top-down camera
  // cast. Everything else is a shadow-map render for visual noise.
  const SMALL = { cast: false };
  for (const k of ['pillar', 'pillarShort', 'pillarBroken', 'arch', 'lintel', 'jamb', 'altar', 'statue0', 'statue1', 'sarc', 'sarcOpen', 'stairs'])
    kit.def(k, GEO[k], MAT.stone);
  kit.def('brazier', GEO.brazier, MAT.metal);
  kit.def('coals', GEO.coals, MAT.coal, SMALL);
  kit.def('sconce', GEO.sconce, MAT.metal, SMALL);
  kit.def('portcullis', GEO.portcullis, MAT.metal);
  kit.def('grating', GEO.grating, MAT.metal, SMALL);
  kit.def('chain', GEO.chain, MAT.metal, SMALL);
  kit.def('rack', GEO.rack, MAT.wood);
  kit.def('barrel', GEO.barrel, MAT.wood, SMALL);
  kit.def('crate', GEO.crate, MAT.wood, SMALL);
  kit.def('banner', GEO.banner, MAT.cloth, SMALL);
  for (const k of ['rubble0', 'rubble1', 'rubble2']) kit.def(k, GEO[k], MAT.stone, SMALL);
  kit.def('bones0', GEO.bones0, MAT.bone, SMALL); kit.def('bones1', GEO.bones1, MAT.bone, SMALL);
  kit.def('urn0', GEO.urn0, MAT.stone, SMALL); kit.def('urn1', GEO.urn1, MAT.stone, SMALL);
  kit.def('cobweb', GEO.cobweb, MAT.web, { cast: false, recv: false, renderOrder: 3 });
  kit.def('decGrime', GEO.decal, MAT.decGrime, { cast: false, recv: false, renderOrder: 1 });
  kit.def('decCrack', GEO.decal, MAT.decCrack, { cast: false, recv: false, renderOrder: 1 });
  kit.def('decMoss', GEO.decal, MAT.decMoss, { cast: false, recv: false, renderOrder: 1 });
  kit.def('decDust', GEO.decal, MAT.decDust, { cast: false, recv: false, renderOrder: 1 });
  kit.def('decContact', GEO.decal, MAT.decContact, { cast: false, recv: false, renderOrder: 2 });
  kit.def('decLight', GEO.decal, MAT.decLight, { cast: false, recv: false, renderOrder: 2 });
  kit.def('decFire', GEO.decal, MAT.decFire, { cast: false, recv: false, renderOrder: 2 });
  kit.def('wallStain', GEO.wallStain, MAT.decGrime, { cast: false, recv: false, renderOrder: 1 });
}

/* ============================== WORLD ===================================== */
function tintJit(rng, amt) {
  const v = 1 - rng.n() * amt;
  const warm = 1 + (rng.n() - 0.5) * amt * 0.8;
  const r = Math.min(1, v * warm), g = Math.min(1, v), b = Math.min(1, v * (2 - warm));
  return (Math.round(r * 255) << 16) | (Math.round(g * 255) << 8) | Math.round(b * 255);
}

class World {
  constructor(scene, layout) {
    this.scene = scene;
    this.L = layout;
    this.group = new THREE.Group();
    this.group.name = 'dungeon';
    scene.add(this.group);
    this.kit = new Kit();
    this.fires = [];        // {x,y,z,r} brazier flame anchors
    this.shafts = [];
    this.waterMeshes = [];
    this.used = new Set();  // cell keys taken by props
    this.rng = new RNG(layout.seed ^ 0x9e37);
    defineKit(this.kit);
    this.build();
  }
  key(i, j) { return j * this.L.GW + i; }
  take(i, j) { this.used.add(this.key(i, j)); }
  free(i, j) { return this.L.isFloor(i, j) && !this.used.has(this.key(i, j)) && !this.clearSet.has(this.key(i, j)); }
  solid(i, j) { this.take(i, j); this.L.blockCell(i, j); }

  build() {
    const L = this.L;
    this.computeClearance();
    this.planPools();
    this.buildFloors();
    this.buildWalls();
    this.buildDoors();
    for (const r of L.rooms) this.decorate(r);
    this.buildCorridorDressing();
    this.kit.commit(this.group);
  }

  /* cells that must stay free: doorway mouths and a step inside them */
  computeClearance() {
    const L = this.L;
    this.clearSet = new Set();
    for (let j = 0; j < L.GH; j++) for (let i = 0; i < L.GW; i++) {
      if (L.grid[L.idx(i, j)] !== CORR) continue;
      for (let dj = -2; dj <= 2; dj++) for (let di = -2; di <= 2; di++) {
        if (L.isFloor(i + di, j + dj)) this.clearSet.add(this.key(i + di, j + dj));
      }
    }
  }

  /* --- sunken water basins, decided before the floor is laid -------------- */
  planPools() {
    const L = this.L;
    this.sunk = new Map();
    for (const r of L.rooms) {
      if (r.type !== 'cistern' || r.isBoss) continue;
      const inset = 2, DROP = 0.60;
      const x0 = r.x + inset, x1 = r.x + r.w - inset, z0 = r.z + inset, z1 = r.z + r.d - inset;
      if (x1 - x0 < 3 || z1 - z0 < 3) continue;
      r.pool = { x0, x1, z0, z1, drop: DROP };
      for (let j = z0; j < z1; j++) for (let i = x0; i < x1; i++) {
        if (this.clearSet.has(this.key(i, j))) continue;
        this.sunk.set(this.key(i, j), DROP);
        this.take(i, j);
      }
    }
  }

  /* ------------------------------ floors --------------------------------- */
  buildFloors() {
    const L = this.L, rng = new RNG(L.seed + 7);
    for (let j = 0; j < L.GH; j++) for (let i = 0; i < L.GW; i++) {
      const t = L.grid[L.idx(i, j)];
      if (t === EMPTY) continue;
      const [wx, wz] = L.worldOf(i, j);
      const drop = this.sunk.get(this.key(i, j)) || 0;
      const q = (Math.abs(Math.imul(i + 3, 73) ^ Math.imul(j + 5, 151)) >> 3) & 3;
      const rot = ((Math.abs(Math.imul(i + 11, 37) ^ Math.imul(j + 7, 97)) >> 2) & 3) * Math.PI / 2;
      const tint = tintJit(rng, 0.06);
      const roll = rng.n();
      if (drop) {
        this.kit.add('floor' + q, wx, -drop, wz, { ry: rot, tint: tintJit(rng, 0.16) });
        this.kit.add('decMoss', wx, -drop + 0.02, wz, { ry: rng.r(0, 6.28), s: rng.r(2.0, 3.4) });
        continue;
      }
      if (roll < 0.020) {
        this.kit.add('floorPit', wx, 0, wz, { ry: rot, tint });
      } else {
        this.kit.add('floor' + q, wx, rng.n() < 0.10 ? -0.045 : 0, wz, { ry: rot, tint });
      }
      if (roll > 0.965) this.kit.add('decCrack', wx + rng.r(-0.4, 0.4), 0.012, wz + rng.r(-0.4, 0.4), { ry: rng.r(0, 6.28), s: rng.r(1.6, 3.0) });
      if (roll > 0.90 && roll < 0.955) this.kit.add('decGrime', wx + rng.r(-0.5, 0.5), 0.010, wz + rng.r(-0.5, 0.5), { ry: rng.r(0, 6.28), s: rng.r(1.8, 3.6) });
      if (roll > 0.86 && roll < 0.90) this.kit.add('decDust', wx, 0.011, wz, { ry: rng.r(0, 6.28), s: rng.r(1.4, 2.6) });
    }
  }

  /* ------------------------------ walls ---------------------------------- */
  buildWalls() {
    const L = this.L, rng = new RNG(L.seed + 31);
    const plains = ['wall_p0', 'wall_p1', 'wall_p2', 'wall_p3', 'wall_p4', 'wall_p5'];
    const OFF = 0.18;
    for (const w of L.walls) {
      const [wx, wz] = L.worldOf(w.i, w.j);
      let x = wx, z = wz, ry = 0;
      if (w.dir === 0) { z = (w.j + 1) * CELL + OFF; ry = Math.PI; }
      else if (w.dir === 1) { x = (w.i + 1) * CELL + OFF; ry = -Math.PI / 2; }
      else if (w.dir === 2) { z = w.j * CELL - OFF; ry = 0; }
      else { x = w.i * CELL - OFF; ry = Math.PI / 2; }
      const r = rng.n();
      let piece;
      if (r < 0.055) piece = rng.chance(0.5) ? 'wall_n0' : 'wall_n1';
      else if (r < 0.115) piece = rng.chance(0.5) ? 'wall_c0' : 'wall_c1';
      else if (r < 0.150) piece = rng.chance(0.5) ? 'wall_b0' : 'wall_b1';
      else piece = plains[(Math.abs(Math.imul(w.i + 1, 61) ^ Math.imul(w.j + 1, 199) ^ w.dir * 7)) % 6];
      const tint = tintJit(rng, 0.08);
      this.kit.add(piece, x, 0, z, { ry, tint });

      // contact shadow + grime where the wall meets the floor
      const inx = w.dir === 1 ? -1 : w.dir === 3 ? 1 : 0;
      const inz = w.dir === 0 ? -1 : w.dir === 2 ? 1 : 0;
      if (rng.n() < 0.18) this.kit.add('decGrime', x + inx * 0.9, 0.016, z + inz * 0.9, { ry: rng.r(0, 6.28), s: rng.r(1.6, 2.6) });
      // vault corbels near the ceiling, hugging the wall
      if (rng.n() < 0.22) this.kit.add('corbel', x, WALL_H - 1.35, z, { ry, tint });
    }
    for (const p of L.posts) {
      this.kit.add('post', p.i * CELL, 0, p.j * CELL, { tint: tintJit(rng, 0.11) });
    }
  }

  /* --------------------------- doorway frames ----------------------------- */
  buildDoors() {
    const L = this.L;
    for (const d of L.doors) {
      if (d.horiz) {
        const x = (d.i + 0.5) * CELL;
        for (let j = d.j0; j <= d.j1; j++) this.kit.add('lintel', x, 0, (j + 0.5) * CELL, { ry: Math.PI / 2 });
        this.kit.add('jamb', x, 0, (d.j0 - 0.5) * CELL, { ry: Math.PI / 2 });
        this.kit.add('jamb', x, 0, (d.j1 + 1.5) * CELL, { ry: Math.PI / 2 });
      } else {
        const z = (d.j + 0.5) * CELL;
        for (let i = d.i0; i <= d.i1; i++) this.kit.add('lintel', (i + 0.5) * CELL, 0, z, {});
        this.kit.add('jamb', (d.i0 - 0.5) * CELL, 0, z, {});
        this.kit.add('jamb', (d.i1 + 1.5) * CELL, 0, z, {});
      }
    }
  }

  /* --------------------------- corridor dressing -------------------------- */
  buildCorridorDressing() {
    const L = this.L, rng = new RNG(L.seed + 404);
    for (const c of L.corridors) {
      const len = Math.abs(c.b - c.a);
      const step = 4;
      for (let t = 2; t < len - 1; t += step) {
        const side = rng.chance(0.5) ? c.c0 : c.c1;
        let i, j;
        if (c.horiz) { i = Math.min(c.a, c.b) + t; j = side; } else { j = Math.min(c.a, c.b) + t; i = side; }
        if (!L.isFloor(i, j)) continue;
        const [wx, wz] = L.worldOf(i, j);
        if (rng.chance(0.55)) {
          this.addSconce(wx, wz, c.horiz ? (side === c.c0 ? 2 : 0) : (side === c.c0 ? 3 : 1));
        } else if (rng.chance(0.5)) {
          this.kit.add('rubble' + rng.i(0, 1), wx + rng.r(-0.3, 0.3), 0, wz + rng.r(-0.3, 0.3), { ry: rng.r(0, 6.28), s: rng.r(0.6, 0.9), tint: tintJit(rng, 0.2) });
        } else {
          this.kit.add('bones' + rng.i(0, 1), wx, 0, wz, { ry: rng.r(0, 6.28), s: rng.r(0.8, 1.1) });
        }
      }
    }
  }
  addSconce(wx, wz, dir) {
    // dir: 0 wall on +Z, 1 on +X, 2 on -Z, 3 on -X
    const off = 0.80;
    const dx = dir === 1 ? off : dir === 3 ? -off : 0;
    const dz = dir === 0 ? off : dir === 2 ? -off : 0;
    const ry = dir === 0 ? Math.PI : dir === 1 ? -Math.PI / 2 : dir === 2 ? 0 : Math.PI / 2;
    this.kit.add('sconce', wx + dx, 2.20, wz + dz, { ry });
    // pull the flame clear of the masonry so the billboard is never sliced
    this.fires.push({ x: wx + dx * 0.55, y: 2.86, z: wz + dz * 0.55, s: 0.55, i: 0.62 });
  }
  addBrazier(wx, wz, scale = 1) {
    this.kit.add('brazier', wx, 0, wz, { s: scale });
    this.kit.add('coals', wx, 0, wz, { s: scale });
    this.fires.push({ x: wx, y: 1.05 * scale, z: wz, s: 1.0 * scale, i: 1.0 });
    this.kit.add('decFire', wx, 0.02, wz, { s: 3.4 * scale });
  }

  /* ------------------------------ rooms ----------------------------------- */
  roomCells(r, inset = 0) {
    const out = [];
    for (let j = r.z + inset; j < r.z + r.d - inset; j++) for (let i = r.x + inset; i < r.x + r.w - inset; i++) out.push([i, j]);
    return out;
  }
  wallSideOf(r, i, j) {
    if (j === r.z) return 2;
    if (j === r.z + r.d - 1) return 0;
    if (i === r.x) return 3;
    if (i === r.x + r.w - 1) return 1;
    return -1;
  }
  perimeter(r) {
    const out = [];
    for (let i = r.x; i < r.x + r.w; i++) { out.push([i, r.z]); out.push([i, r.z + r.d - 1]); }
    for (let j = r.z + 1; j < r.z + r.d - 1; j++) { out.push([r.x, j]); out.push([r.x + r.w - 1, j]); }
    return out;
  }

  decorate(r) {
    const rng = new RNG(this.L.seed + r.id * 9173 + 17);
    r.rng = rng;
    if (r.isBoss) return this.decArena(r, rng);
    switch (r.type) {
      case 'entry': return this.decEntry(r, rng);
      case 'hall': return this.decHall(r, rng);
      case 'nave': return this.decNave(r, rng);
      case 'crypt': return this.decCrypt(r, rng);
      case 'cistern': return this.decCistern(r, rng);
      case 'ossuary': return this.decOssuary(r, rng);
      case 'ritual': return this.decRitual(r, rng);
      case 'barracks': return this.decBarracks(r, rng);
      case 'gallery': return this.decGallery(r, rng);
      case 'vault': return this.decVault(r, rng);
      default: return this.decHall(r, rng);
    }
  }

  /* wall-hugging dressing shared by most rooms */
  dressWalls(r, rng, opt = {}) {
    const per = this.perimeter(r);
    rng.shuffle(per);
    let sconces = 0, banners = 0;
    const wantS = opt.sconces !== undefined ? opt.sconces : Math.max(2, Math.round(per.length * 0.09));
    const wantB = opt.banners !== undefined ? opt.banners : Math.round(per.length * 0.05);
    for (const [i, j] of per) {
      const side = this.wallSideOf(r, i, j);
      if (side < 0) continue;
      if (!this.free(i, j)) continue;
      const [wx, wz] = this.L.worldOf(i, j);
      if (sconces < wantS && rng.chance(0.6)) {
        this.addSconce(wx, wz, side); this.take(i, j); sconces++;
      } else if (banners < wantB) {
        const off = 0.92;
        const dx = side === 1 ? off : side === 3 ? -off : 0;
        const dz = side === 0 ? off : side === 2 ? -off : 0;
        const ry = side === 0 ? Math.PI : side === 1 ? -Math.PI / 2 : side === 2 ? 0 : Math.PI / 2;
        this.kit.add('banner', wx + dx, 0.72, wz + dz, { ry, tint: tintJit(rng, 0.3) });
        this.take(i, j); banners++;
      }
    }
    // scattered debris against the walls
    for (const [i, j] of per) {
      if (!this.free(i, j) || !rng.chance(0.16)) continue;
      const [wx, wz] = this.L.worldOf(i, j);
      const pick = rng.n();
      if (pick < 0.45) this.kit.add('rubble' + rng.i(0, 2), wx + rng.r(-0.4, 0.4), 0, wz + rng.r(-0.4, 0.4), { ry: rng.r(0, 6.28), s: rng.r(0.55, 1.0), tint: tintJit(rng, 0.22) });
      else if (pick < 0.75) this.kit.add('bones' + rng.i(0, 1), wx, 0, wz, { ry: rng.r(0, 6.28), s: rng.r(0.8, 1.2) });
      else this.kit.add('urn' + rng.i(0, 1), wx + rng.r(-0.3, 0.3), 0, wz + rng.r(-0.3, 0.3), { ry: rng.r(0, 6.28), s: rng.r(0.85, 1.25), tint: tintJit(rng, 0.2) });
      this.take(i, j);
    }
  }

  /* central floor motif */
  inlayRect(r, rng, insetX, insetZ) {
    for (let j = r.z + insetZ; j < r.z + r.d - insetZ; j++) for (let i = r.x + insetX; i < r.x + r.w - insetX; i++) {
      const [wx, wz] = this.L.worldOf(i, j);
      this.kit.add('inlay' + ((i + j) & 1 ? 3 : 1), wx, 0, wz, { ry: ((i * 3 + j) & 3) * Math.PI / 2, tint: tintJit(rng, 0.14) });
    }
  }
  inlayDisc(r, rng, radius) {
    const cx = r.cx, cz = r.cz;
    for (let j = r.z; j < r.z + r.d; j++) for (let i = r.x; i < r.x + r.w; i++) {
      const d = Math.hypot(i + 0.5 - cx, j + 0.5 - cz);
      if (d > radius) continue;
      const [wx, wz] = this.L.worldOf(i, j);
      this.kit.add('inlay' + (d < radius * 0.45 ? 3 : 1), wx, 0, wz, { ry: ((i + j) & 3) * Math.PI / 2, tint: tintJit(rng, 0.12) });
    }
  }

  hangChains(r, rng, count) {
    for (let k = 0; k < count; k++) {
      const i = rng.i(r.x + 1, r.x + r.w - 2), j = rng.i(r.z + 1, r.z + r.d - 2);
      const [wx, wz] = this.L.worldOf(i, j);
      this.kit.add('chain', wx + rng.r(-0.5, 0.5), WALL_H + 0.2, wz + rng.r(-0.5, 0.5), { s: rng.r(0.8, 1.4) });
    }
  }

  decEntry(r, rng) {
    this.dressWalls(r, rng, { sconces: 5, banners: 3 });
    this.inlayRect(r, rng, 2, 2);
    // a broad flight of steps against the outer wall
    const side = this.entrySide(r);
    for (let k = 0; k < 4; k++) {
      let i, j, ry = 0;
      /* stairGeo builds its flight rising toward local -Z, so the low step has
         to face INTO the room. Every one of these was 180 degrees out, which
         read as a staircase climbing into the wall. */
      if (side === 2) { i = Math.round(r.cx) - 2 + k; j = r.z; ry = 0; }
      else if (side === 0) { i = Math.round(r.cx) - 2 + k; j = r.z + r.d - 1; ry = Math.PI; }
      else if (side === 3) { i = r.x; j = Math.round(r.cz) - 2 + k; ry = Math.PI / 2; }
      else { i = r.x + r.w - 1; j = Math.round(r.cz) - 2 + k; ry = -Math.PI / 2; }
      if (!this.L.isFloor(i, j)) continue;
      const [wx, wz] = this.L.worldOf(i, j);
      this.kit.add('stairs', wx, 0, wz, { ry, tint: tintJit(rng, 0.16) });
      this.solid(i, j);
    }
    this.scatterProps(r, rng, [['crate', 0.4], ['barrel', 0.4], ['rubble1', 0.2]], 4);
    const [bx, bz] = this.L.worldOf(Math.round(r.cx) - 2, Math.round(r.cz));
    this.addBrazier(bx, bz, 1.1); this.solid(Math.round(r.cx) - 2, Math.round(r.cz));
    const [bx2, bz2] = this.L.worldOf(Math.round(r.cx) + 1, Math.round(r.cz));
    this.addBrazier(bx2, bz2, 1.1); this.solid(Math.round(r.cx) + 1, Math.round(r.cz));
    r.spawn = this.L.worldOf(Math.round(r.cx), Math.round(r.cz) + 2);
  }
  entrySide(r) {
    const L = this.L;
    if (r.z < 6) return 2;
    if (r.z + r.d > L.GH - 6) return 0;
    if (r.x < 6) return 3;
    return 1;
  }

  decHall(r, rng) {
    this.dressWalls(r, rng, {});
    const long = r.d >= r.w;
    const inset = 2;
    this.inlayRect(r, rng, long ? Math.max(2, ((r.w / 2) | 0) - 2) : 2, long ? 2 : Math.max(2, ((r.d / 2) | 0) - 2));
    const rowA = long ? r.x + inset : r.z + inset;
    const rowB = long ? r.x + r.w - 1 - inset : r.z + r.d - 1 - inset;
    const from = long ? r.z + 2 : r.x + 2, to = long ? r.z + r.d - 2 : r.x + r.w - 2;
    for (let t = from; t < to; t += 3) {
      for (const row of [rowA, rowB]) {
        const i = long ? row : t, j = long ? t : row;
        if (!this.free(i, j)) continue;
        const [wx, wz] = this.L.worldOf(i, j);
        const broken = rng.chance(0.14);
        this.kit.add(broken ? 'pillarBroken' : 'pillar', wx, 0, wz, { ry: rng.chance(0.5) ? Math.PI / 2 : 0, tint: tintJit(rng, 0.18) });
        this.solid(i, j);
        if (rng.chance(0.35)) {
          const [ox, oz] = this.L.worldOf(long ? row + (row === rowA ? 1 : -1) : t, long ? t : row + (row === rowA ? 1 : -1));
          this.addBrazier(ox, oz, 0.95);
        }
      }
    }
    this.hangChains(r, rng, 3);
    this.scatterProps(r, rng, [['rubble0', 0.4], ['bones0', 0.3], ['urn0', 0.3]], 6);
  }

  decNave(r, rng) {
    this.dressWalls(r, rng, { banners: 6 });
    const long = r.d >= r.w;
    this.inlayRect(r, rng, long ? 3 : 2, long ? 2 : 3);
    const rowA = long ? r.x + 2 : r.z + 2;
    const rowB = long ? r.x + r.w - 3 : r.z + r.d - 3;
    const from = long ? r.z + 2 : r.x + 2, to = long ? r.z + r.d - 3 : r.x + r.w - 3;
    for (let t = from; t < to; t += 2) {
      for (const row of [rowA, rowB]) {
        const i = long ? row : t, j = long ? t : row;
        if (!this.free(i, j)) continue;
        const [wx, wz] = this.L.worldOf(i, j);
        this.kit.add('pillar', wx, 0, wz, { tint: tintJit(rng, 0.16) });
        this.solid(i, j);
      }
    }
    // altar at the far end
    const ai = long ? Math.round(r.cx) : r.x + r.w - 3, aj = long ? r.z + r.d - 3 : Math.round(r.cz);
    if (this.L.isFloor(ai, aj)) {
      const [wx, wz] = this.L.worldOf(ai, aj);
      this.kit.add('altar', wx, 0, wz, { ry: long ? 0 : Math.PI / 2, tint: tintJit(rng, 0.12) });
      this.solid(ai, aj);
      this.addBrazier(...this.L.worldOf(ai - 2, aj), 1.0); this.solid(ai - 2, aj);
      this.addBrazier(...this.L.worldOf(ai + 2, aj), 1.0); this.solid(ai + 2, aj);
      const st = rng.chance(0.5) ? 'statue0' : 'statue1';
      if (this.free(ai - 3, aj - 1)) { this.kit.add(st, ...this.xz(ai - 3, aj - 1, 0), { ry: rng.r(0, 6.28), tint: tintJit(rng, 0.2) }); this.solid(ai - 3, aj - 1); }
      if (this.free(ai + 3, aj - 1)) { this.kit.add(st, ...this.xz(ai + 3, aj - 1, 0), { ry: rng.r(0, 6.28), tint: tintJit(rng, 0.2) }); this.solid(ai + 3, aj - 1); }
    }
    this.hangChains(r, rng, 5);
    this.addShaft(r, rng);
  }

  decCrypt(r, rng) {
    this.dressWalls(r, rng, {});
    const long = r.d >= r.w;
    for (let j = r.z + 2; j < r.z + r.d - 2; j += 2) {
      for (let i = r.x + 2; i < r.x + r.w - 2; i += 3) {
        if (!this.free(i, j) || !this.free(i + 1, j)) continue;
        if (rng.chance(0.22)) continue;
        const [wx, wz] = this.L.worldOf(i, j);
        const open = rng.chance(0.28);
        this.kit.add(open ? 'sarcOpen' : 'sarc', wx + CELL / 2, 0, wz, { ry: long ? 0 : Math.PI / 2, tint: tintJit(rng, 0.22) });
        this.solid(i, j); this.solid(i + 1, j);
        if (open) this.kit.add('bones' + rng.i(0, 1), wx + CELL / 2 + rng.r(-0.6, 0.6), 0, wz + rng.r(0.8, 1.1), { ry: rng.r(0, 6.28) });
      }
    }
    this.scatterProps(r, rng, [['bones0', 0.5], ['bones1', 0.3], ['urn1', 0.2]], 8);
    this.hangChains(r, rng, 2);
    for (const d of [[-1, 0], [1, 0]]) {
      const i = Math.round(r.cx) + d[0] * Math.max(2, ((r.w / 2) | 0) - 2), j = Math.round(r.cz);
      if (!this.free(i, j)) continue;
      this.addBrazier(...this.L.worldOf(i, j), 1.0); this.solid(i, j);
    }
  }

  decOssuary(r, rng) {
    this.dressWalls(r, rng, { banners: 0 });
    for (const [i, j] of this.perimeter(r)) {
      const side = this.wallSideOf(r, i, j);
      if (side < 0 || !this.free(i, j) || !rng.chance(0.55)) continue;
      const off = 0.55;
      const dx = side === 1 ? off : side === 3 ? -off : 0;
      const dz = side === 0 ? off : side === 2 ? -off : 0;
      const ry = side === 0 ? Math.PI : side === 1 ? -Math.PI / 2 : side === 2 ? 0 : Math.PI / 2;
      const [wx, wz] = this.L.worldOf(i, j);
      this.kit.add('rack', wx + dx, 0, wz + dz, { ry, tint: tintJit(rng, 0.25) });
      for (let s = 0; s < 5; s++) {
        this.kit.add('bones' + rng.i(0, 1), wx + dx + rng.r(-0.8, 0.8), 0.42 + rng.i(0, 3) * 0.62, wz + dz + rng.r(-0.2, 0.2), { ry: rng.r(0, 6.28), s: rng.r(0.7, 1.0) });
      }
      this.solid(i, j);
    }
    this.inlayRect(r, rng, 3, 3);
    this.scatterProps(r, rng, [['bones0', 0.6], ['bones1', 0.4]], 12);
    const [cx, cz] = this.L.worldOf(Math.round(r.cx), Math.round(r.cz));
    this.addBrazier(cx, cz, 1.05); this.solid(Math.round(r.cx), Math.round(r.cz));
  }

  decCistern(r, rng) {
    this.dressWalls(r, rng, { banners: 0, sconces: 6 });
    if (!r.pool) { this.decHall(r, rng); return; }
    const { x0, x1, z0, z1, drop: DROP } = r.pool;
    const wGeo = new THREE.PlaneGeometry((x1 - x0) * CELL, (z1 - z0) * CELL);
    const water = new THREE.Mesh(wGeo, MAT.water);
    water.rotation.x = -Math.PI / 2;
    water.position.set((x0 + x1) / 2 * CELL, -0.22, (z0 + z1) / 2 * CELL);
    water.renderOrder = 4;
    this.group.add(water);
    this.waterMeshes.push(water);
    // pillars rising out of the water
    for (let j = z0 + 1; j < z1 - 1; j += 3) for (let i = x0 + 1; i < x1 - 1; i += 3) {
      if (!rng.chance(0.7)) continue;
      const [wx, wz] = this.L.worldOf(i, j);
      this.kit.add('pillar', wx, -DROP, wz, { tint: tintJit(rng, 0.28) });
    }
    this.hangChains(r, rng, 6);
    for (let k = 0; k < 3; k++) {
      const i = rng.i(x0, x1 - 1), j = rng.i(z0, z1 - 1);
      this.kit.add('grating', ...this.xz(i, j, -DROP + 0.02), { ry: rng.chance(0.5) ? Math.PI / 2 : 0 });
    }
    this.addShaft(r, rng);
  }

  decRitual(r, rng) {
    this.dressWalls(r, rng, { banners: 4 });
    const R = Math.min(r.w, r.d) / 2 - 1.5;
    this.inlayDisc(r, rng, R);
    const ci = Math.round(r.cx), cj = Math.round(r.cz);
    this.kit.add('altar', ...this.xz(ci, cj, 0), { ry: rng.chance(0.5) ? Math.PI / 2 : 0, tint: tintJit(rng, 0.12) });
    this.solid(ci, cj);
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      const i = Math.round(r.cx + Math.cos(a) * (R - 0.6)), j = Math.round(r.cz + Math.sin(a) * (R - 0.6));
      if (!this.free(i, j)) continue;
      const [wx, wz] = this.L.worldOf(i, j);
      if (k % 2 === 0) { this.addBrazier(wx, wz, 0.9); this.solid(i, j); }
      else { this.kit.add(rng.chance(0.5) ? 'statue0' : 'statue1', wx, 0, wz, { ry: -a + Math.PI / 2, tint: tintJit(rng, 0.2) }); this.solid(i, j); }
    }
    this.hangChains(r, rng, 4);
    this.scatterProps(r, rng, [['bones1', 0.5], ['urn0', 0.5]], 5);
  }

  decBarracks(r, rng) {
    this.dressWalls(r, rng, { banners: 2 });
    this.scatterProps(r, rng, [['crate', 0.35], ['barrel', 0.35], ['rack', 0.15], ['urn1', 0.15]], 10, true);
    const [cx, cz] = this.L.worldOf(Math.round(r.cx), Math.round(r.cz));
    this.addBrazier(cx, cz, 1.0); this.solid(Math.round(r.cx), Math.round(r.cz));
  }

  decGallery(r, rng) {
    this.dressWalls(r, rng, { banners: 1, sconces: 3 });
    const long = r.d >= r.w;
    // a collapse mound partway along
    const t = long ? rng.i(r.z + 3, r.z + r.d - 4) : rng.i(r.x + 3, r.x + r.w - 4);
    for (let k = -1; k <= 1; k++) {
      const i = long ? Math.round(r.cx) + k : t, j = long ? t : Math.round(r.cz) + k;
      if (!this.L.isFloor(i, j)) continue;
      const [wx, wz] = this.L.worldOf(i, j);
      this.kit.add('rubble2', wx, 0, wz, { ry: rng.r(0, 6.28), s: rng.r(1.3, 1.9), tint: tintJit(rng, 0.25) });
      this.kit.add('rubble1', wx + rng.r(-0.8, 0.8), 0, wz + rng.r(-0.8, 0.8), { ry: rng.r(0, 6.28), s: rng.r(1.0, 1.5), tint: tintJit(rng, 0.25) });
      this.take(i, j);
    }
    for (let k = 0; k < 6; k++) {
      const i = rng.i(r.x + 1, r.x + r.w - 2), j = rng.i(r.z + 1, r.z + r.d - 2);
      if (!this.free(i, j)) continue;
      const [wx, wz] = this.L.worldOf(i, j);
      this.kit.add('pillarBroken', wx, 0, wz, { ry: rng.r(0, 6.28), tint: tintJit(rng, 0.24) });
      this.kit.add('rubble0', wx + rng.r(-0.7, 0.7), 0, wz + rng.r(-0.7, 0.7), { ry: rng.r(0, 6.28), s: rng.r(0.7, 1.1) });
      this.solid(i, j);
    }
    this.addShaft(r, rng, 2);
    this.scatterProps(r, rng, [['rubble0', 0.5], ['bones0', 0.3], ['urn1', 0.2]], 8);
  }

  decVault(r, rng) {
    this.dressWalls(r, rng, { banners: 3, sconces: 4 });
    this.inlayRect(r, rng, 2, 2);
    const ci = Math.round(r.cx), cj = Math.round(r.cz);
    this.kit.add('altar', ...this.xz(ci, cj, 0), { tint: tintJit(rng, 0.1) });
    this.solid(ci, cj);
    for (const d of [[-2, 0], [2, 0], [0, -2], [0, 2]]) {
      const i = ci + d[0], j = cj + d[1];
      if (!this.free(i, j)) continue;
      this.kit.add('urn0', ...this.xz(i, j, 0), { s: 1.3, tint: tintJit(rng, 0.15) });
      this.take(i, j);
    }
    this.scatterProps(r, rng, [['crate', 0.5], ['barrel', 0.5]], 5, true);
  }

  decArena(r, rng) {
    /* THE FIGHTING FLOOR IS RESERVED FIRST. The boss spawns at this room's
       centre and is 2.4m wide; the player is pushed out of it and out of every
       prop. Filling the middle with an altar, four statues and a pillar ring
       turned that into a wedge trap. Everything solid now lives at the rim. */
    const ci = Math.round(r.cx), cj = Math.round(r.cz);
    const clearR = Math.max(4, Math.round(Math.min(r.w, r.d) * 0.34));
    for (let dj = -clearR; dj <= clearR; dj++) for (let di = -clearR; di <= clearR; di++) {
      if (Math.hypot(di, dj) > clearR) continue;
      this.clearSet.add(this.key(ci + di, cj + dj));      // no prop may take it
    }

    this.dressWalls(r, rng, { sconces: 8, banners: 8 });
    const R = Math.min(r.w, r.d) / 2 - 1;
    this.inlayDisc(r, rng, R);                            // floor pattern only, no collision

    /* pillars hug the wall rather than ringing the fight */
    const n = 8;
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2 + 0.3;
      const i = Math.round(r.cx + Math.cos(a) * R), j = Math.round(r.cz + Math.sin(a) * R);
      if (!this.free(i, j)) continue;
      const [wx, wz] = this.L.worldOf(i, j);
      this.kit.add(rng.chance(0.18) ? 'pillarBroken' : 'pillar', wx, 0, wz, { tint: tintJit(rng, 0.2) });
      this.solid(i, j);
    }
    /* Braziers ring the fighting floor itself, not the wall. Pushing them out
       to the pillars left the middle of a 40m arena pitch black -- clearing the
       centre of obstacles also cleared it of light. These are placed with
       take(), never solid(), so they light the fight without blocking it. */
    let lit = 0;
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2 + 0.19;
      const rad = clearR * 0.82;
      const i = Math.round(r.cx + Math.cos(a) * rad), j = Math.round(r.cz + Math.sin(a) * rad);
      if (!this.L.isFloor(i, j)) continue;
      this.addBrazier(...this.L.worldOf(i, j), 1.15);
      this.take(i, j);
      lit++;
    }
    /* and one at dead centre if the ring came up short */
    if (lit < 4 && this.L.isFloor(ci, cj)) { this.addBrazier(...this.L.worldOf(ci, cj), 1.2); lit++; }
    r.arenaBraziers = lit;
    /* the altar moves to the back wall — a backdrop, not an obstacle */
    const ai = Math.round(r.cx), aj = r.z + 2;
    if (this.L.isFloor(ai, aj)) {
      this.kit.add('altar', ...this.xz(ai, aj, 0), { tint: tintJit(rng, 0.1) });
      this.solid(ai, aj);
      for (const d of [-3, 3]) {
        const si = ai + d;
        if (!this.L.isFloor(si, aj)) continue;
        this.kit.add(rng.chance(0.5) ? 'statue0' : 'statue1', ...this.xz(si, aj, 0),
          { ry: d < 0 ? 0.5 : -0.5, s: 1.15, tint: tintJit(rng, 0.18) });
        this.solid(si, aj);
      }
    }
    this.hangChains(r, rng, 8);
    this.addShaft(r, rng, 2);
    /* bones and rubble are non-blocking dressing, kept off the fighting floor */
    this.scatterProps(r, rng, [['bones0', 0.5], ['bones1', 0.3], ['rubble0', 0.2]], 14);

    /* belt and braces: whatever happened above, the fighting floor is walkable */
    for (let dj = -clearR; dj <= clearR; dj++) for (let di = -clearR; di <= clearR; di++) {
      const i = ci + di, j = cj + dj;
      if (Math.hypot(di, dj) > clearR) continue;
      if (this.L.isFloor(i, j)) this.L.walk[this.L.idx(i, j)] = 1;
    }
    r.arenaClearR = clearR;
  }

  xz(i, j, y) { const [x, z] = this.L.worldOf(i, j); return [x, y, z]; }

  scatterProps(r, rng, table, count, blockSolid) {
    let tries = 0;
    while (count > 0 && tries++ < count * 30) {
      const i = rng.i(r.x + 1, r.x + r.w - 2), j = rng.i(r.z + 1, r.z + r.d - 2);
      if (!this.free(i, j)) continue;
      let pick = rng.n(), acc = 0, name = table[0][0];
      for (const [n, p] of table) { acc += p; if (pick <= acc) { name = n; break; } }
      const [wx, wz] = this.L.worldOf(i, j);
      this.kit.add(name, wx + rng.r(-0.45, 0.45), 0, wz + rng.r(-0.45, 0.45),
        { ry: rng.r(0, 6.28), s: rng.r(0.8, 1.15), tint: tintJit(rng, 0.22) });
      if (blockSolid) this.solid(i, j); else this.take(i, j);
      count--;
    }
  }

  /* a shaft of pale light through a ceiling breach */
  addShaft(r, rng, count = 1) {
    for (let k = 0; k < count; k++) {
      const i = rng.i(r.x + 2, r.x + r.w - 3), j = rng.i(r.z + 2, r.z + r.d - 3);
      const [wx, wz] = this.L.worldOf(i, j);
      const top = 11, rad = rng.r(1.6, 2.6);
      const g = new THREE.CylinderGeometry(rad * 0.42, rad, top, 14, 1, true);
      const pos = g.attributes.position, col = new Float32Array(pos.count * 3);
      for (let v = 0; v < pos.count; v++) {
        const t = (pos.getY(v) + top / 2) / top;            // 0 floor, 1 ceiling
        let a = Math.pow(t, 1.9);
        a *= 1 - Math.max(0, (t - 0.88) / 0.12) * 0.75;     // soften the mouth
        col[v * 3] = col[v * 3 + 1] = col[v * 3 + 2] = a;
      }
      g.setAttribute('color', new THREE.BufferAttribute(col, 3));
      const m = new THREE.Mesh(g, MAT.shaft);
      m.position.set(wx, top / 2, wz);
      m.renderOrder = 5;
      this.group.add(m);
      this.shafts.push(m);
      this.kit.add('decLight', wx, 0.02, wz, { s: rad * 2.1 });
    }
  }
}
