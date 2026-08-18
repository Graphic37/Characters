/* ===========================================================================
   Part B : geometry kit + instanced mesh manager
   =========================================================================== */

const CELL = 2.0;          // metres per grid cell
const WALL_H = 4.30;       // full wall height
const FLOOR_T = 0.26;      // floor slab thickness (top sits at y = 0)

/* ------------------------- geometry helpers ------------------------------- */
const _m4 = new THREE.Matrix4(), _e = new THREE.Euler(), _q = new THREE.Quaternion(),
      _v = new THREE.Vector3(), _s = new THREE.Vector3();

function place(geo, x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
  _e.set(rx, ry, rz); _q.setFromEuler(_e); _v.set(x, y, z); _s.set(sx, sy, sz);
  _m4.compose(_v, _q, _s);
  geo.applyMatrix4(_m4);
  return geo;
}
function box(w, h, d, x, y, z, rx = 0, ry = 0, rz = 0) {
  return place(new THREE.BoxGeometry(w, h, d), x, y, z, rx, ry, rz);
}
function cyl(rt, rb, h, seg, x, y, z, rx = 0, ry = 0, rz = 0) {
  return place(new THREE.CylinderGeometry(rt, rb, h, seg), x, y, z, rx, ry, rz);
}
function sph(r, w, h, x, y, z, sx = 1, sy = 1, sz = 1) {
  return place(new THREE.SphereGeometry(r, w, h), x, y, z, 0, 0, 0, sx, sy, sz);
}
function lathe(points, seg, x, y, z) {
  return place(new THREE.LatheGeometry(points, seg), x, y, z);
}
function mrg(list) {
  const clean = list.filter(Boolean).map(g => (g.index ? g.toNonIndexed() : g));
  clean.forEach(g => { if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2)); });
  const out = BGU.mergeGeometries(clean, false);
  out.computeVertexNormals();
  return out;
}
function jitterVerts(geo, amp, seed) {
  const p = geo.attributes.position, rng = new RNG(seed);
  for (let i = 0; i < p.count; i++) {
    p.setXYZ(i, p.getX(i) + (rng.n() - 0.5) * amp, p.getY(i) + (rng.n() - 0.5) * amp, p.getZ(i) + (rng.n() - 0.5) * amp);
  }
  geo.computeVertexNormals();
  return geo;
}

/* ============================ INSTANCE MANAGER ============================ */
let CHUNK_M = 28;                    // metres per spatial bucket; 0 = one mesh per type
class Kit {
  constructor() { this.defs = new Map(); this.meshes = []; this.dummy = new THREE.Object3D(); this.col = new THREE.Color(); }
  def(name, geo, mat, o = {}) {
    this.defs.set(name, { geo, mat, buckets: new Map(), cast: o.cast !== false, recv: o.recv !== false, renderOrder: o.renderOrder || 0 });
  }
  bucketKey(x, z) {
    if (!CHUNK_M) return 'all';
    return Math.floor(x / CHUNK_M) + '_' + Math.floor(z / CHUNK_M);
  }
  has(name) { return this.defs.has(name); }
  /** add(name, x, y, z, {ry, rx, rz, s, sx, sy, sz, tint}) */
  add(name, x, y, z, o) {
    const d = this.defs.get(name);
    if (!d) { console.warn('no kit piece', name); return; }
    const key = this.bucketKey(x, z);
    let items = d.buckets.get(key);
    if (!items) { items = []; d.buckets.set(key, items); }
    items.push([x, y, z, (o && o.rx) || 0, (o && o.ry) || 0, (o && o.rz) || 0,
      (o && (o.sx !== undefined ? o.sx : o.s)) || 1,
      (o && (o.sy !== undefined ? o.sy : o.s)) || 1,
      (o && (o.sz !== undefined ? o.sz : o.s)) || 1,
      (o && o.tint !== undefined) ? o.tint : 0xffffff]);
  }
  commit(parent) {
    for (const [name, d] of this.defs) {
      for (const [key, items] of d.buckets) this.commitBucket(parent, name, d, key, items);
      d.buckets.clear();
    }
  }
  commitBucket(parent, name, d, key, items) {
    {
      const n = items.length;
      if (!n) return;
      const im = new THREE.InstancedMesh(d.geo, d.mat, n);
      im.name = name + '#' + key;
      im.castShadow = d.cast; im.receiveShadow = d.recv;
      im.renderOrder = d.renderOrder;
      im.instanceMatrix.setUsage(THREE.StaticDrawUsage);
      let tinted = false;
      for (let i = 0; i < n; i++) if (items[i][9] !== 0xffffff) { tinted = true; break; }
      if (tinted) im.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(n * 3).fill(1), 3);
      for (let i = 0; i < n; i++) {
        const it = items[i], dm = this.dummy;
        dm.position.set(it[0], it[1], it[2]);
        dm.rotation.set(it[3], it[4], it[5]);
        dm.scale.set(it[6], it[7], it[8]);
        dm.updateMatrix();
        im.setMatrixAt(i, dm.matrix);
        if (tinted) { this.col.setHex(it[9]); this.col.convertSRGBToLinear(); im.setColorAt(i, this.col); }
      }
      im.instanceMatrix.needsUpdate = true;
      if (im.instanceColor) im.instanceColor.needsUpdate = true;
      im.computeBoundingSphere();
      parent.add(im);
      this.meshes.push(im);
    }
  }
  disposeAll() {
    for (const m of this.meshes) { m.parent && m.parent.remove(m); m.dispose(); }
    this.meshes.length = 0;
  }
}

/* ============================ PIECE BUILDERS ============================== */

/* --- floor slab, four UV quadrants of the flagstone atlas ----------------- */
function floorTileGeo(quad) {
  const g = new THREE.BoxGeometry(CELL - 0.02, FLOOR_T, CELL - 0.02);
  const qx = (quad % 2) * 0.5, qy = (quad < 2 ? 0.5 : 0.0);
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) {
    const u = uv.getX(i), v = uv.getY(i);
    if (i >= 8 && i < 12) uv.setXY(i, qx + u * 0.5, qy + v * 0.5);
    else uv.setXY(i, qx + u * 0.5, qy + 0.05 + v * 0.08);
  }
  uv.needsUpdate = true;
  return place(g, 0, -FLOOR_T / 2, 0);
}
/* a sunken / missing slab: shows dirt below */
function floorPitGeo() {
  return place(new THREE.BoxGeometry(CELL - 0.02, 0.10, CELL - 0.02), 0, -FLOOR_T - 0.02, 0);
}
/* raised ornate inlay used at room centres */
function floorInlayGeo(quad) {
  const g = floorTileGeo(quad);
  return place(g, 0, 0.035, 0);
}

/* --- wall panels ----------------------------------------------------------
   local origin: centre of the 2m run, base at y=0, thickness along Z,
   room side faces +Z.                                                       */
function wallPanelGeo(variant, seed) {
  const rng = new RNG(seed);
  const W = CELL, T = 0.54;
  const parts = [];
  // plinth course, slightly proud
  parts.push(box(W, 0.40, T + 0.18, 0, 0.20, 0));
  parts.push(box(W, 0.07, T + 0.26, 0, 0.42, 0));

  const topH = variant === 'broken' ? rng.r(1.9, 2.9) : (variant === 'low' ? 2.6 : WALL_H);
  let y = 0.46;
  const rows = [];
  while (y < topH - 0.16) {
    const hh = Math.min(rng.r(0.44, 0.64), topH - y - 0.02);
    if (hh < 0.16) break;
    rows.push({ y, hh });
    y += hh + 0.025;
  }
  const niche = variant === 'niche' ? { lo: 2, hi: 3 } : null;
  rows.forEach((row, ri) => {
    const n = rng.i(2, 3);
    const gaps = [];
    let acc = 0;
    for (let i = 0; i < n; i++) { const w = rng.r(0.7, 1.3); gaps.push(w); acc += w; }
    let x = -W / 2;
    for (let i = 0; i < n; i++) {
      const bw = (gaps[i] / acc) * W - 0.035;
      const cx = x + bw / 2 + 0.0175;
      x += (gaps[i] / acc) * W;
      // niche opening: skip the middle block on two rows
      if (niche && ri >= niche.lo && ri <= niche.hi && Math.abs(cx) < 0.42) continue;
      // cracked variant drops one block and tilts another
      if (variant === 'cracked' && ri === 1 && i === 1) continue;
      const depth = T + rng.r(-0.05, 0.07);
      const tilt = variant === 'cracked' ? rng.r(-0.035, 0.035) : rng.r(-0.012, 0.012);
      let bh = row.hh - 0.03;
      if (variant === 'broken' && ri === rows.length - 1) bh *= rng.r(0.35, 1.0);
      parts.push(box(bw, bh, depth, cx, row.y + bh / 2, rng.r(-0.02, 0.02), 0, 0, tilt));
    }
  });
  if (niche) {
    // back slab + shelf + lintel of the recess
    parts.push(box(1.0, 1.5, 0.16, 0, rows[niche.lo] ? rows[niche.lo].y + 0.75 : 2.0, -0.20));
    parts.push(box(0.98, 0.10, 0.44, 0, rows[niche.lo] ? rows[niche.lo].y : 1.6, -0.02));
  }
  if (variant !== 'broken') {
    // cornice
    parts.push(box(W, 0.14, T + 0.22, 0, topH - 0.10, 0));
    parts.push(box(W, 0.10, T + 0.10, 0, topH + 0.02, 0));
  }
  return mrg(parts);
}

/* vault corbel — springing of a ceiling rib, hugs the wall so it never
   occludes the play space from a top-down camera */
function corbelGeo() {
  const p = [];
  p.push(box(0.46, 0.5, 0.5, 0, 0.25, 0.1));
  p.push(box(0.34, 0.34, 0.9, 0, 0.62, 0.34, -0.45));
  p.push(box(0.28, 0.28, 0.9, 0, 1.05, 0.72, -0.85));
  return mrg(p);
}

/* --- pillar --------------------------------------------------------------- */
function pillarGeo(kind) {
  const p = [];
  const h = kind === 'short' ? 3.1 : WALL_H;
  p.push(box(1.24, 0.24, 1.24, 0, 0.12, 0));
  p.push(box(1.06, 0.22, 1.06, 0, 0.34, 0));
  p.push(box(0.90, 0.30, 0.90, 0, 0.60, 0));
  const shaftH = h - 1.55;
  p.push(cyl(0.31, 0.36, shaftH, 14, 0, 0.75 + shaftH / 2, 0));
  // fluting suggested with slim ribs
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    p.push(cyl(0.045, 0.05, shaftH - 0.1, 5, Math.cos(a) * 0.325, 0.78 + shaftH / 2, Math.sin(a) * 0.325));
  }
  p.push(cyl(0.37, 0.33, 0.13, 14, 0, 0.75 + shaftH + 0.06, 0));
  p.push(cyl(0.52, 0.37, 0.34, 14, 0, 0.75 + shaftH + 0.28, 0));
  p.push(box(1.10, 0.20, 1.10, 0, 0.75 + shaftH + 0.55, 0));
  p.push(box(0.96, 0.14, 0.96, 0, 0.75 + shaftH + 0.72, 0));
  if (kind === 'broken') {
    const q = p.slice(0, 6);
    return mrg(q);
  }
  return mrg(p);
}

/* --- archway spanning one cell -------------------------------------------- */
function archGeo() {
  const p = [];
  const jamb = (sx) => {
    p.push(box(0.46, 3.0, 0.72, sx * 1.10, 1.5, 0));
    p.push(box(0.58, 0.22, 0.86, sx * 1.10, 0.11, 0));
    p.push(box(0.58, 0.20, 0.86, sx * 1.10, 3.05, 0));
  };
  jamb(-1); jamb(1);
  const R = 1.10, cy = 3.15;
  for (let i = 0; i < 9; i++) {
    const a = Math.PI * (i + 0.5) / 9;
    const x = Math.cos(a) * R, y = Math.sin(a) * R;
    p.push(box(0.40, 0.46, 0.72, x, cy + y, 0, 0, 0, a - Math.PI / 2));
  }
  p.push(box(2.9, 0.26, 0.80, 0, cy + R + 0.30, 0));
  // keystone
  p.push(box(0.34, 0.62, 0.84, 0, cy + R - 0.10, 0));
  return mrg(p);
}

/* --- doorway with an iron portcullis -------------------------------------- */
function portcullisGeo() {
  const p = [];
  for (let i = 0; i < 7; i++) p.push(cyl(0.055, 0.055, 3.0, 6, -0.9 + i * 0.3, 1.5, 0));
  for (let j = 0; j < 3; j++) p.push(box(2.0, 0.085, 0.085, 0, 0.5 + j * 1.05, 0));
  return mrg(p);
}

/* --- braziers, sconces ---------------------------------------------------- */
function brazierGeo() {
  const p = [];
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    p.push(cyl(0.045, 0.06, 1.05, 6, Math.cos(a) * 0.20, 0.52, Math.sin(a) * 0.20, Math.sin(a) * 0.14, 0, -Math.cos(a) * 0.14));
    p.push(box(0.10, 0.05, 0.22, Math.cos(a) * 0.30, 0.025, Math.sin(a) * 0.30, 0, -a, 0));
  }
  p.push(cyl(0.28, 0.22, 0.06, 12, 0, 0.62, 0));
  const prof = [];
  for (let i = 0; i <= 8; i++) { const t = i / 8; prof.push(new THREE.Vector2(0.16 + t * 0.32, t * 0.34)); }
  prof.push(new THREE.Vector2(0.50, 0.40)); prof.push(new THREE.Vector2(0.455, 0.40));
  for (let i = 8; i >= 0; i--) { const t = i / 8; prof.push(new THREE.Vector2(0.13 + t * 0.31, 0.05 + t * 0.33)); }
  p.push(lathe(prof, 14, 0, 0.66, 0));
  return mrg(p);
}
function coalsGeo() {
  const p = [];
  const rng = new RNG(4242);
  for (let i = 0; i < 9; i++) {
    const a = rng.r(0, 6.283), r = rng.r(0, 0.30);
    p.push(jitterVerts(place(new THREE.IcosahedronGeometry(rng.r(0.07, 0.12), 0), Math.cos(a) * r, rng.r(0.94, 1.02), Math.sin(a) * r), 0.05, i + 7));
  }
  return mrg(p);
}
function sconceGeo() {
  const p = [];
  p.push(box(0.26, 0.5, 0.10, 0, 0.25, 0.05));
  p.push(cyl(0.035, 0.035, 0.42, 6, 0, 0.42, 0.22, -0.7));
  const prof = [];
  for (let i = 0; i <= 6; i++) { const t = i / 6; prof.push(new THREE.Vector2(0.07 + t * 0.14, t * 0.18)); }
  p.push(lathe(prof, 10, 0, 0.56, 0.40));
  return mrg(p);
}

/* --- crypt / temple furniture --------------------------------------------- */
function sarcophagusGeo(open) {
  const p = [];
  p.push(box(2.30, 0.16, 1.16, 0, 0.08, 0));
  p.push(box(2.10, 0.72, 0.98, 0, 0.52, 0));
  p.push(box(2.18, 0.09, 1.04, 0, 0.92, 0));
  if (open) {
    p.push(box(2.24, 0.20, 1.06, 0.55, 1.02, 0.30, 0, 0.12, 0.055));
  } else {
    p.push(box(2.24, 0.20, 1.06, 0, 1.06, 0));
    // effigy
    p.push(box(0.52, 0.14, 1.42, 0, 1.20, 0, 0, Math.PI / 2, 0));
    p.push(sph(0.16, 10, 8, -0.62, 1.28, 0, 1, 1.1, 1));
    p.push(box(0.10, 0.62, 0.10, 0.15, 1.26, 0));
  }
  return mrg(p);
}
function altarGeo() {
  const p = [];
  p.push(box(2.0, 0.18, 1.4, 0, 0.09, 0));
  p.push(box(1.7, 0.20, 1.15, 0, 0.28, 0));
  p.push(box(1.42, 0.74, 0.92, 0, 0.75, 0));
  p.push(box(1.86, 0.16, 1.30, 0, 1.20, 0));
  p.push(box(1.72, 0.07, 1.18, 0, 1.31, 0));
  return mrg(p);
}
function statueGeo(seed) {
  const rng = new RNG(seed);
  const p = [];
  p.push(box(1.30, 0.26, 1.30, 0, 0.13, 0));
  p.push(box(1.12, 0.55, 1.12, 0, 0.53, 0));
  p.push(box(1.24, 0.14, 1.24, 0, 0.87, 0));
  const prof = [];
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    prof.push(new THREE.Vector2(0.52 - t * 0.28 + Math.sin(t * 6) * 0.03, t * 1.75));
  }
  p.push(lathe(prof, 16, 0, 0.94, 0));
  p.push(cyl(0.30, 0.24, 0.30, 12, 0, 2.78, 0));             // shoulders
  p.push(sph(0.19, 12, 10, 0, 3.05, 0.01, 1, 1.15, 1));      // head
  p.push(place(new THREE.ConeGeometry(0.30, 0.52, 12, 1, true), 0, 3.06, -0.02)); // hood
  p.push(box(0.15, 0.90, 0.16, -0.33, 2.42, 0.06, 0.2, 0, 0.12));
  p.push(box(0.15, 0.90, 0.16, 0.33, 2.42, 0.06, 0.2, 0, -0.12));
  if (rng.chance(0.5)) { // greatsword down the front
    p.push(box(0.10, 1.55, 0.03, 0, 1.85, 0.36));
    p.push(box(0.34, 0.08, 0.06, 0, 2.58, 0.36));
    p.push(sph(0.06, 8, 6, 0, 2.72, 0.36));
  }
  return mrg(p);
}
function rackGeo() {   // ossuary bone rack / shelving
  const p = [];
  p.push(box(0.14, 2.4, 0.14, -1.05, 1.2, 0.30));
  p.push(box(0.14, 2.4, 0.14, 1.05, 1.2, 0.30));
  p.push(box(0.14, 2.4, 0.14, -1.05, 1.2, -0.30));
  p.push(box(0.14, 2.4, 0.14, 1.05, 1.2, -0.30));
  for (let i = 0; i < 4; i++) p.push(box(2.24, 0.09, 0.76, 0, 0.42 + i * 0.62, 0));
  p.push(box(2.24, 0.10, 0.76, 0, 2.38, 0));
  return mrg(p);
}

/* --- scatter props --------------------------------------------------------- */
/* Broken MASONRY, not shattered glass. The old version jittered an icosahedron
   by half its own radius, which tears the hull into spiky translucent-looking
   plates -- it read as a pile of smashed windows sitting on the flagstones.
   Rubble in a stone dungeon is broken blocks: chamfered slabs at rough angles,
   a few smaller chips, all resting on the floor. */
function rubbleGeo(seed, scale) {
  const p = [];
  const rng = new RNG(seed);
  const n = rng.i(4, 7);
  for (let i = 0; i < n; i++) {
    const w = rng.r(0.22, 0.46) * scale;
    const h = rng.r(0.10, 0.22) * scale;
    const d = rng.r(0.18, 0.40) * scale;
    const a = rng.r(0, 6.283), dist = rng.r(0, 0.42) * scale;
    p.push(box(w, h, d,
      Math.cos(a) * dist, h * 0.5 + rng.r(0, 0.04),  Math.sin(a) * dist,
      rng.r(-0.28, 0.28), rng.r(0, 3.14), rng.r(-0.28, 0.28)));
  }
  const chips = rng.i(2, 4);
  for (let i = 0; i < chips; i++) {
    const r = rng.r(0.05, 0.11) * scale;
    const a = rng.r(0, 6.283), dist = rng.r(0.15, 0.62) * scale;
    p.push(box(r * 2, r * 1.3, r * 1.7,
      Math.cos(a) * dist, r * 0.7, Math.sin(a) * dist,
      rng.r(-0.5, 0.5), rng.r(0, 3.14), rng.r(-0.5, 0.5)));
  }
  return mrg(p);
}
function boneGeo(seed) {
  const p = [];
  const rng = new RNG(seed);
  for (let i = 0; i < 6; i++) {
    const a = rng.r(0, 6.283), d = rng.r(0, 0.45);
    p.push(cyl(0.035, 0.035, rng.r(0.3, 0.55), 5, Math.cos(a) * d, 0.05, Math.sin(a) * d, Math.PI / 2, rng.r(0, 3.14), 0));
  }
  // skull
  p.push(sph(0.115, 10, 8, 0.12, 0.11, -0.06, 1, 0.95, 1.15));
  p.push(box(0.14, 0.07, 0.11, 0.12, 0.055, 0.03));
  p.push(place(new THREE.SphereGeometry(0.03, 6, 5), 0.075, 0.13, -0.17));
  p.push(place(new THREE.SphereGeometry(0.03, 6, 5), 0.165, 0.13, -0.17));
  return mrg(p);
}
function urnGeo(seed) {
  const rng = new RNG(seed);
  const prof = [];
  const H = rng.r(0.55, 0.9);
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    prof.push(new THREE.Vector2(0.10 + Math.sin(t * Math.PI * 0.92) * 0.24, t * H));
  }
  prof.push(new THREE.Vector2(0.13, H + 0.05));
  return lathe(prof, 12, 0, 0, 0);
}
function barrelGeo() {
  const prof = [];
  for (let i = 0; i <= 8; i++) { const t = i / 8; prof.push(new THREE.Vector2(0.28 + Math.sin(t * Math.PI) * 0.09, t * 0.86)); }
  const p = [lathe(prof, 14, 0, 0, 0)];
  p.push(cyl(0.365, 0.365, 0.05, 14, 0, 0.22, 0));
  p.push(cyl(0.365, 0.365, 0.05, 14, 0, 0.64, 0));
  return mrg(p);
}
function crateGeo() {
  const p = [box(0.86, 0.80, 0.86, 0, 0.40, 0)];
  for (const s of [-1, 1]) {
    p.push(box(0.92, 0.09, 0.09, 0, 0.14, s * 0.44));
    p.push(box(0.92, 0.09, 0.09, 0, 0.66, s * 0.44));
    p.push(box(0.09, 0.09, 0.92, s * 0.44, 0.14, 0));
    p.push(box(0.09, 0.09, 0.92, s * 0.44, 0.66, 0));
  }
  return mrg(p);
}
function chainGeo() {
  const p = [];
  for (let i = 0; i < 12; i++) {
    p.push(place(new THREE.TorusGeometry(0.055, 0.017, 4, 8), 0, -i * 0.085, 0, Math.PI / 2, (i % 2) * Math.PI / 2, 0));
  }
  return mrg(p);
}
function bannerGeo() {
  const g = new THREE.PlaneGeometry(1.10, 2.60, 6, 10);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i);
    p.setZ(i, Math.sin((x + 0.55) * 2.6) * 0.055 + Math.sin(y * 1.4) * 0.03);
  }
  g.computeVertexNormals();
  const p2 = [place(g, 0, 1.30, 0)];
  p2.push(cyl(0.035, 0.035, 1.30, 6, 0, 2.62, 0, 0, 0, Math.PI / 2));
  return mrg(p2);
}
function stairGeo(steps) {
  const p = [];
  for (let i = 0; i < steps; i++) {
    p.push(box(CELL, 0.20, CELL / steps + 0.02, 0, 0.10 + i * 0.20, CELL / 2 - (i + 0.5) * (CELL / steps)));
  }
  return mrg(p);
}
function gratingGeo() {
  const p = [];
  for (let i = 0; i < 5; i++) p.push(box(1.30, 0.05, 0.06, 0, 0.02, -0.5 + i * 0.25));
  for (let i = 0; i < 5; i++) p.push(box(0.06, 0.05, 1.30, -0.5 + i * 0.25, 0.02, 0));
  p.push(box(1.5, 0.09, 0.10, 0, 0.02, 0.7));
  p.push(box(1.5, 0.09, 0.10, 0, 0.02, -0.7));
  p.push(box(0.10, 0.09, 1.5, 0.7, 0.02, 0));
  p.push(box(0.10, 0.09, 1.5, -0.7, 0.02, 0));
  return mrg(p);
}
function cobwebGeo() {
  const g = new THREE.BufferGeometry();
  const v = [], uv = [];
  const R = 1.5;
  for (let i = 0; i < 5; i++) {
    const a0 = (i / 5) * Math.PI * 0.5, a1 = ((i + 1) / 5) * Math.PI * 0.5;
    v.push(0, 0, 0, Math.cos(a0) * R, 0, Math.sin(a0) * R, Math.cos(a1) * R, 0, Math.sin(a1) * R);
    uv.push(0.5, 0.5, 0.5 + Math.cos(a0) * 0.5, 0.5 + Math.sin(a0) * 0.5, 0.5 + Math.cos(a1) * 0.5, 0.5 + Math.sin(a1) * 0.5);
  }
  g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals();
  return g;
}
function decalGeo(size) {
  return place(new THREE.PlaneGeometry(size, size), 0, 0, 0, -Math.PI / 2, 0, 0);
}
function wallStainGeo() {
  return new THREE.PlaneGeometry(2.2, 3.0);
}
