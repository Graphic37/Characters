/* ===========================================================================
   ASHEN DEPTHS  —  procedural PoE2-style dungeon renderer
   Part A : core, noise, procedural textures, material library
   =========================================================================== */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { SSAOPass } from 'three/addons/postprocessing/SSAOPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
import * as BGU from 'three/addons/utils/BufferGeometryUtils.js';

const VERSION = 'v1';

/* ------------------------------- RNG ------------------------------------- */
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
class RNG {
  constructor(seed) { this.f = mulberry32(seed >>> 0); }
  n() { return this.f(); }
  r(a, b) { return a + (b - a) * this.f(); }
  i(a, b) { return Math.floor(a + (b - a + 1) * this.f()); }
  pick(arr) { return arr[Math.floor(this.f() * arr.length)]; }
  chance(p) { return this.f() < p; }
  sign() { return this.f() < 0.5 ? -1 : 1; }
  shuffle(arr) { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(this.f() * (i + 1)); const t = arr[i]; arr[i] = arr[j]; arr[j] = t; } return arr; }
}

/* --------------------------- tileable noise ------------------------------ */
function hashT(x, y, per, s) {
  x = ((x % per) + per) % per; y = ((y % per) + per) % per;
  let h = Math.imul(x + 1, 374761393) ^ Math.imul(y + 1, 668265263) ^ Math.imul(s + 1, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
const sm = t => t * t * (3 - 2 * t);
function vnT(x, y, per, s) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const a = hashT(xi, yi, per, s), b = hashT(xi + 1, yi, per, s),
        c = hashT(xi, yi + 1, per, s), d = hashT(xi + 1, yi + 1, per, s);
  const u = sm(xf), v = sm(yf);
  return a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + d * u * v;
}
function fbmT(x, y, per, s, oct = 5) {
  let sum = 0, amp = 0.5, f = 1, norm = 0;
  for (let i = 0; i < oct; i++) { sum += vnT(x * f, y * f, per * f, s + i * 31) * amp; norm += amp; amp *= 0.5; f *= 2; }
  return sum / norm;
}
/* ridged / worley-ish crack field */
function worleyT(x, y, per, s) {
  const xi = Math.floor(x), yi = Math.floor(y);
  let d1 = 9, d2 = 9;
  for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
    const cx = xi + ox, cy = yi + oy;
    const px = cx + hashT(cx, cy, per, s), py = cy + hashT(cx, cy, per, s + 991);
    const d = (px - x) * (px - x) + (py - y) * (py - y);
    if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) { d2 = d; }
  }
  return Math.sqrt(d2) - Math.sqrt(d1);
}

/* --------------------------- canvas helpers ------------------------------ */
function newCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
/* linear reflectance -> sRGB texel */
function enc(c) { return [Math.pow(clamp01(c[0]), 1 / 2.2), Math.pow(clamp01(c[1]), 1 / 2.2), Math.pow(clamp01(c[2]), 1 / 2.2)]; }

/** Build an RGB canvas from a per-pixel callback returning [r,g,b] in 0..1 */
function paint(size, fn) {
  const c = newCanvas(size, size), ctx = c.getContext('2d');
  const img = ctx.createImageData(size, size), d = img.data;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const o = (y * size + x) * 4, col = fn(x, y);
    d[o] = clamp01(col[0]) * 255; d[o + 1] = clamp01(col[1]) * 255; d[o + 2] = clamp01(col[2]) * 255; d[o + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return c;
}
/** Build a Float32 height field */
function field(size, fn) {
  const a = new Float32Array(size * size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) a[y * size + x] = fn(x, y);
  return a;
}
/** Height field -> tangent-space normal map canvas (tileable, wraps) */
function normalFromHeight(h, size, strength) {
  const c = newCanvas(size, size), ctx = c.getContext('2d');
  const img = ctx.createImageData(size, size), d = img.data;
  const at = (x, y) => h[(((y % size) + size) % size) * size + (((x % size) + size) % size)];
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const dx = (at(x - 1, y - 1) + 2 * at(x - 1, y) + at(x - 1, y + 1)) - (at(x + 1, y - 1) + 2 * at(x + 1, y) + at(x + 1, y + 1));
    const dy = (at(x - 1, y - 1) + 2 * at(x, y - 1) + at(x + 1, y - 1)) - (at(x - 1, y + 1) + 2 * at(x, y + 1) + at(x + 1, y + 1));
    let nx = dx * strength, ny = dy * strength, nz = 1;
    const l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l;
    const o = (y * size + x) * 4;
    d[o] = (nx * 0.5 + 0.5) * 255; d[o + 1] = (ny * 0.5 + 0.5) * 255; d[o + 2] = (nz * 0.5 + 0.5) * 255; d[o + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return c;
}
/** Height field -> greyscale canvas (roughness / ao) */
function greyFromField(h, size, map) {
  const c = newCanvas(size, size), ctx = c.getContext('2d');
  const img = ctx.createImageData(size, size), d = img.data;
  for (let i = 0; i < size * size; i++) {
    const v = clamp01(map(h[i], i % size, (i / size) | 0)) * 255;
    d[i * 4] = v; d[i * 4 + 1] = v; d[i * 4 + 2] = v; d[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return c;
}
function tex(canvas, repeat = 1, srgb = false) {
  const t = new THREE.CanvasTexture(canvas);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.anisotropy = 8;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/* =========================== TEXTURE LIBRARY ============================== */
const TEX = {};

/* --- floor: 2x2 atlas of four distinct flagstone slabs -------------------- */
function buildFloorAtlas(S) {
  const half = S / 2;
  // height field first
  const h = new Float32Array(S * S);
  for (let q = 0; q < 4; q++) {
    const ox = (q % 2) * half, oy = ((q / 2) | 0) * half, seed = 100 + q * 37;
    for (let y = 0; y < half; y++) for (let x = 0; x < half; x++) {
      const u = x / half, v = y / half;
      // slab subdivision: 2x2 or 3x2 slabs inside the quadrant
      const nx = q < 2 ? 2 : 3, nz = 2;
      const gx = u * nx, gz = v * nz;
      const fx = gx - Math.floor(gx), fz = gz - Math.floor(gz);
      const edge = Math.min(fx, 1 - fx, fz, 1 - fz);
      const grout = clamp01(edge / 0.055);                       // 0 in the joint
      const cellSeed = seed + Math.floor(gx) * 13 + Math.floor(gz) * 71;
      const bump = fbmT(x * 0.10, y * 0.10, half * 0.10, cellSeed, 4);
      const grain = fbmT(x * 0.55, y * 0.55, half * 0.55, cellSeed + 5, 2);
      const crack = clamp01(1 - worleyT(x * 0.035, y * 0.035, half * 0.035, seed + 9) * 6);
      let hv = 0.55 + bump * 0.30 + grain * 0.10;
      hv -= (1 - grout) * 0.42;                                   // mortar recess
      hv -= crack * 0.28;                                         // cracks
      hv -= Math.pow(1 - grout, 2) * 0.05;
      // chipped corners
      const chip = fbmT(x * 0.22, y * 0.22, half * 0.22, cellSeed + 44, 2);
      if (edge < 0.10 && chip > 0.62) hv -= 0.25;
      h[(oy + y) * S + (ox + x)] = hv;
    }
  }
  const alb = paint(S, (x, y) => {
    const q = (x >= half ? 1 : 0) + (y >= half ? 2 : 0);
    const hv = h[y * S + x];
    const stain = fbmT(x * 0.012, y * 0.012, S * 0.012, 200 + q, 3);
    const moss = clamp01((fbmT(x * 0.03, y * 0.03, S * 0.03, 300 + q, 3) - 0.60) * 4);
    const soot = clamp01((fbmT(x * 0.008, y * 0.008, S * 0.008, 400, 2) - 0.55) * 2.6);
    // base: cold bone-grey stone with a warm sandstone drift
    let r = 0.185, g = 0.176, b = 0.163;
    r += stain * 0.075; g += stain * 0.060; b += stain * 0.040;
    const shade = 0.55 + hv * 0.70;
    r *= shade; g *= shade; b *= shade;
    r = r * (1 - moss * 0.7) + 0.070 * moss; g = g * (1 - moss * 0.7) + 0.090 * moss; b = b * (1 - moss * 0.7) + 0.055 * moss;
    r *= (1 - soot * 0.55); g *= (1 - soot * 0.58); b *= (1 - soot * 0.55);
    return enc([r, g, b]);
  });
  const rough = greyFromField(h, S, (v, x, y) => 0.96 - v * 0.30 + fbmT(x * 0.3, y * 0.3, S * 0.3, 501, 1) * 0.10);
  const nrm = normalFromHeight(h, S, 3.4);
  return { alb, rough, nrm };
}

/* --- wall stone block ----------------------------------------------------- */
function buildWallStone(S) {
  const h = field(S, (x, y) => {
    const rows = 4;
    const gy = (y / S) * rows, fz = gy - Math.floor(gy);
    const rowI = Math.floor(gy);
    const off = hashT(rowI, 0, rows, 7) * 0.5;
    const cols = 3;
    const gx = (x / S) * cols + off, fx = gx - Math.floor(gx);
    const edge = Math.min(fx, 1 - fx, fz, 1 - fz);
    const grout = clamp01(edge / 0.06);
    const cs = rowI * 17 + Math.floor(gx) * 5;
    const bump = fbmT(x * 0.09, y * 0.09, S * 0.09, cs, 4);
    const grain = fbmT(x * 0.6, y * 0.6, S * 0.6, cs + 3, 2);
    const pit = clamp01((fbmT(x * 0.25, y * 0.25, S * 0.25, cs + 8, 2) - 0.66) * 5);
    let v = 0.58 + bump * 0.26 + grain * 0.09;
    v -= (1 - grout) * 0.46;
    v -= pit * 0.22;
    return v;
  });
  const alb = paint(S, (x, y) => {
    const hv = h[y * S + x];
    const drift = fbmT(x * 0.010, y * 0.010, S * 0.010, 610, 3);
    // vertical damp streaks
    const streak = clamp01((fbmT(x * 0.05, y * 0.006, S * 0.05, 620, 2) - 0.52) * 3);
    let r = 0.170 + drift * 0.075, g = 0.163 + drift * 0.065, b = 0.152 + drift * 0.050;
    const shade = 0.50 + hv * 0.78;
    r *= shade; g *= shade; b *= shade;
    r *= (1 - streak * 0.42); g *= (1 - streak * 0.36); b *= (1 - streak * 0.26);
    const salt = clamp01((fbmT(x * 0.06, y * 0.06, S * 0.06, 640, 2) - 0.70) * 4);
    r += salt * 0.10; g += salt * 0.10; b += salt * 0.095;
    return enc([r, g, b]);
  });
  const rough = greyFromField(h, S, v => 0.98 - v * 0.22);
  const nrm = normalFromHeight(h, S, 3.0);
  return { alb, rough, nrm };
}

/* --- generic helpers for small material set ------------------------------- */
function buildWood(S) {
  const h = field(S, (x, y) => {
    const rings = Math.sin((y * 0.10 + fbmT(x * 0.02, y * 0.02, S * 0.02, 71, 3) * 9) * 3.0) * 0.5 + 0.5;
    const plank = Math.floor(x / (S / 4));
    const pj = hashT(plank, 0, 4, 3) * 0.15;
    const gap = clamp01(Math.min((x % (S / 4)) / 4, ((S / 4) - (x % (S / 4))) / 4));
    return 0.5 + rings * 0.25 + pj - (1 - gap) * 0.4;
  });
  const alb = paint(S, (x, y) => {
    const hv = h[y * S + x];
    const s = 0.45 + hv * 0.8;
    return enc([0.115 * s, 0.082 * s, 0.054 * s]);
  });
  return { alb, rough: greyFromField(h, S, v => 0.90 - v * 0.15), nrm: normalFromHeight(h, S, 2.2) };
}
function buildMetal(S) {
  const h = field(S, (x, y) => {
    const n = fbmT(x * 0.05, y * 0.05, S * 0.05, 811, 5);
    const pit = clamp01((fbmT(x * 0.30, y * 0.30, S * 0.30, 812, 3) - 0.60) * 4);
    return 0.6 + n * 0.25 - pit * 0.35;
  });
  const alb = paint(S, (x, y) => {
    const hv = h[y * S + x];
    const rust = clamp01((fbmT(x * 0.03, y * 0.03, S * 0.03, 820, 4) - 0.48) * 2.4);
    let r = 0.075, g = 0.072, b = 0.070;
    r = r * (1 - rust) + 0.135 * rust; g = g * (1 - rust) + 0.066 * rust; b = b * (1 - rust) + 0.032 * rust;
    const s = 0.55 + hv * 0.7;
    return enc([r * s, g * s, b * s]);
  });
  const rough = greyFromField(h, S, (v, x, y) => 0.52 + (1 - v) * 0.40 + fbmT(x * 0.03, y * 0.03, S * 0.03, 820, 4) * 0.25);
  return { alb, rough, nrm: normalFromHeight(h, S, 2.0) };
}
function buildBone(S) {
  const h = field(S, (x, y) => 0.6 + fbmT(x * 0.08, y * 0.08, S * 0.08, 901, 4) * 0.3
    - clamp01((fbmT(x * 0.4, y * 0.4, S * 0.4, 902, 3) - 0.62) * 4) * 0.25);
  const alb = paint(S, (x, y) => {
    const hv = h[y * S + x], dirt = fbmT(x * 0.02, y * 0.02, S * 0.02, 903, 4);
    const s = 0.55 + hv * 0.7;
    return enc([(0.330 - dirt * 0.11) * s, (0.305 - dirt * 0.115) * s, (0.258 - dirt * 0.110) * s]);
  });
  return { alb, rough: greyFromField(h, S, v => 0.80 - v * 0.20), nrm: normalFromHeight(h, S, 2.0) };
}
function buildCloth(S) {
  const h = field(S, (x, y) => {
    const weave = (Math.sin(x * 1.6) * Math.sin(y * 1.6)) * 0.12;
    return 0.6 + weave + fbmT(x * 0.03, y * 0.03, S * 0.03, 950, 4) * 0.2;
  });
  const alb = paint(S, (x, y) => {
    const hv = h[y * S + x], w = fbmT(x * 0.015, y * 0.015, S * 0.015, 951, 4);
    const s = 0.5 + hv * 0.8;
    return enc([(0.145 + w * 0.05) * s, (0.052 + w * 0.02) * s, (0.041 + w * 0.015) * s]);
  });
  return { alb, rough: greyFromField(h, S, () => 0.92), nrm: normalFromHeight(h, S, 1.6) };
}
function buildWaterNormal(S) {
  const h = field(S, (x, y) =>
    fbmT(x * 0.035, y * 0.035, S * 0.035, 1001, 4) * 0.6 + fbmT(x * 0.11, y * 0.11, S * 0.11, 1002, 3) * 0.4);
  return normalFromHeight(h, S, 0.9);
}
function buildDirt(S) {
  const h = field(S, (x, y) => 0.5 + fbmT(x * 0.06, y * 0.06, S * 0.06, 1101, 5) * 0.4
    + clamp01((fbmT(x * 0.5, y * 0.5, S * 0.5, 1102, 2) - 0.5) * 2) * 0.1);
  const alb = paint(S, (x, y) => {
    const hv = h[y * S + x], s = 0.45 + hv * 0.8;
    return enc([0.095 * s, 0.080 * s, 0.062 * s]);
  });
  return { alb, rough: greyFromField(h, S, () => 0.98), nrm: normalFromHeight(h, S, 2.4) };
}

/* --- alpha stamps used for decals ---------------------------------------- */
function stampAlpha(S, kind, seed) {
  const c = newCanvas(S, S), ctx = c.getContext('2d');
  const img = ctx.createImageData(S, S), d = img.data;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const u = x / S - 0.5, v = y / S - 0.5;
    const r = Math.hypot(u, v) * 2;
    let a = 0;
    if (kind === 'blot') {
      const n = fbmT(x * 0.03, y * 0.03, S * 0.03, seed, 4);
      a = clamp01((1.0 - r * (0.7 + n * 0.9)) * 1.4) * (0.55 + n * 0.6);
    } else if (kind === 'crack') {
      const w = 1 - clamp01(worleyT(x * 0.02, y * 0.02, S * 0.02, seed) * 9);
      a = clamp01(w - 0.28) * 1.6 * clamp01(1.5 - r * 1.6);
    } else if (kind === 'gradient') {
      a = clamp01(1 - r) ** 2;
    } else if (kind === 'rubblescatter') {
      const n = fbmT(x * 0.12, y * 0.12, S * 0.12, seed, 3);
      a = clamp01((n - 0.55) * 3.4) * clamp01(1.3 - r * 1.4);
    }
    const o = (y * S + x) * 4;
    d[o] = d[o + 1] = d[o + 2] = 255; d[o + 3] = clamp01(a) * 255;
  }
  ctx.putImageData(img, 0, 0);
  return c;
}
/** radial soft alpha, used for contact shadows, fire, embers, dust */
function radial(S, inner, outer, pow) {
  const c = newCanvas(S, S), ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(S / 2, S / 2, S * inner, S / 2, S / 2, S * outer);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.5, `rgba(255,255,255,${Math.pow(0.5, pow)})`);
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
  return c;
}
/** soft flame silhouette */
function flameAlpha(S) {
  const c = newCanvas(S, S), ctx = c.getContext('2d');
  const img = ctx.createImageData(S, S), d = img.data;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const u = (x / S - 0.5) * 2, v = 1 - y / S;
    const w = (1 - v) * 0.85 + 0.12;
    const inside = clamp01(1 - Math.abs(u) / w);
    const n = fbmT(x * 0.05, y * 0.05, S * 0.05, 1201, 4);
    const a = clamp01(inside * 1.5 - 0.15) * clamp01(v * 3.0) * clamp01(1.25 - v) * (0.6 + n * 0.9);
    const o = (y * S + x) * 4;
    d[o] = 255; d[o + 1] = 255; d[o + 2] = 255; d[o + 3] = clamp01(a) * 255;
  }
  ctx.putImageData(img, 0, 0);
  return c;
}
function alphaTex(canvas, repeat = 1) {
  const t = new THREE.CanvasTexture(canvas);
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  t.repeat.set(repeat, repeat);
  return t;
}

/* --------------------- environment (image based light) -------------------- */
function buildEnvTexture() {
  const w = 256, h = 128, c = newCanvas(w, h), ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0.00, '#141a26');
  g.addColorStop(0.45, '#1b1e26');
  g.addColorStop(0.70, '#2a241d');
  g.addColorStop(1.00, '#3d2c1c');
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  // a faint warm pool low on the horizon, as if firelight bounced off the floor
  const r = ctx.createRadialGradient(w * 0.5, h * 0.92, 2, w * 0.5, h * 0.92, w * 0.42);
  r.addColorStop(0, 'rgba(168,102,44,0.60)'); r.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = r; ctx.fillRect(0, 0, w, h);
  const t = new THREE.CanvasTexture(c);
  t.mapping = THREE.EquirectangularReflectionMapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/* ============================== MATERIALS ================================= */
const MAT = {};

function stdMat(set, opts = {}) {
  const rep = opts.repeat || 1;
  const m = new THREE.MeshStandardMaterial({
    map: tex(set.alb, rep, true),
    roughnessMap: tex(set.rough, rep),
    normalMap: tex(set.nrm, rep),
    roughness: opts.roughness !== undefined ? opts.roughness : 1.0,
    metalness: opts.metalness !== undefined ? opts.metalness : 0.0,
    color: opts.color !== undefined ? opts.color : 0xffffff,
    envMapIntensity: opts.env !== undefined ? opts.env : 0.35
  });
  if (opts.normalScale) m.normalScale.set(opts.normalScale, opts.normalScale);
  return m;
}
