const fs=require('fs');
const P='parts/';
const rd=f=>fs.readFileSync(P+f,'utf8');

// --- a_core: strip the standalone imports, keep everything else -------------
let core = rd('a_core.js');
core = core.replace(/^import[\s\S]*?BufferGeometryUtils\.js';\n/m, '');
core = core.replace(/const VERSION = 'v1';\n/, '');

let kit    = rd('b_kit.js');
let layout = rd('c_layout.js');
let world  = rd('d_world.js');

// World must build into a caller-supplied parent, not a global scene
world = world.replace(
  "  constructor(scene, layout) {\n    this.scene = scene;\n    this.L = layout;\n    this.group = new THREE.Group();\n    this.group.name = 'dungeon';\n    scene.add(this.group);",
  "  constructor(parent, layout) {\n    this.scene = parent;\n    this.L = layout;\n    this.group = new THREE.Group();\n    this.group.name = 'depths';\n    parent.add(this.group);");
if (world.includes('scene.add(this.group)')) throw new Error('World parent swap failed');

// --- e_fx: take only the two GPU FX factories ------------------------------
const fx = rd('e_fx.js');
const cut = (from, to) => {
  const a = fx.indexOf(from); const b = to ? fx.indexOf(to) : fx.length;
  if (a < 0 || b < 0) throw new Error('fx slice failed: ' + from);
  return fx.slice(a, b);
};
const fxFlames    = cut('const FLAME_VERT', '/* ---------------------------- light pool');
const fxParticles = ''; // makeParticles lives inside the flames slice range below
const partsFx = fxFlames;
if (!/function makeParticles/.test(partsFx)) throw new Error('makeParticles not in slice');

const api = `

/* ======================= SKELETON ENEMY GEOMETRY ==========================
   Built ONCE and shared by every enemy. Three merged pieces -- body (pelvis,
   spine, ribcage, arms, skull) and one leg used twice, mirrored -- so a mob is
   3 draw calls instead of a draw call per bone, and 98 of them still share two
   geometries and one material. Detail lives in the geometry, not in the object
   count, because object count is what costs frames.                        */
let SKEL = null;
function buildSkeleton() {
  if (SKEL) return SKEL;
  const B = [];                                   // body parts
  const bone = (r1, r2, len, x, y, z, rx, rz, seg) =>
    cyl(r1, r2, len, seg || 6, x, y, z, rx || 0, 0, rz || 0);

  /* pelvis */
  B.push(box(0.30, 0.10, 0.18, 0, 0.94, 0));
  B.push(box(0.12, 0.16, 0.15, -0.13, 0.88, 0, 0, 0, 0.35));
  B.push(box(0.12, 0.16, 0.15, 0.13, 0.88, 0, 0, 0, -0.35));
  B.push(box(0.22, 0.09, 0.16, 0, 0.86, -0.01));

  /* lumbar + thoracic spine, gently curved */
  for (let i = 0; i < 9; i++) {
    const t = i / 8, y = 1.00 + t * 0.42;
    const z = Math.sin(t * 2.6) * 0.035;
    const r = 0.048 - t * 0.010;
    B.push(cyl(r, r * 1.12, 0.036, 6, 0, y, z));
    if (i % 2 === 0) B.push(box(0.030, 0.055, 0.075, 0, y, z - 0.055));   // spinous process
  }

  /* ribcage: six pairs of arcs off the spine, plus a sternum */
  for (let i = 0; i < 6; i++) {
    const t = i / 5, y = 1.08 + t * 0.30;
    const w = 0.155 + Math.sin(t * Math.PI) * 0.055;
    for (const s of [-1, 1]) {
      const g = new THREE.TorusGeometry(w, 0.016, 4, 9, Math.PI * 0.92);
      place(g, 0, y, -0.02, Math.PI / 2, 0, s > 0 ? -0.35 : Math.PI + 0.35);
      B.push(g);
    }
  }
  B.push(box(0.055, 0.26, 0.022, 0, 1.24, 0.115));

  /* clavicles and shoulders (the arms themselves are separate pieces now) */
  for (const s of [-1, 1]) {
    B.push(bone(0.020, 0.024, 0.20, s * 0.10, 1.44, 0.055, 0, s * 1.30));
    B.push(place(new THREE.SphereGeometry(0.045, 7, 6), s * 0.205, 1.42, 0.02));
  }

  /* SKULL. This was deleted by accident in the v72 arm split -- the slice that
     pulled the arms out of the torso took the whole head with it, which is why
     the skeletons were headless. Rebuilt slightly enlarged, per the package's
     "slightly enlarged skull for top-down readability". */
  B.push(bone(0.032, 0.036, 0.11, 0, 1.505, 0.008));                       // cervical stack
  B.push(place(new THREE.SphereGeometry(0.132, 12, 10), 0, 1.640, 0.005, 0, 0, 0, 1.0, 1.06, 1.04));
  B.push(box(0.205, 0.042, 0.082, 0, 1.622, 0.098));                       // brow ridge
  B.push(box(0.160, 0.082, 0.092, 0, 1.552, 0.076));                       // maxilla
  B.push(box(0.146, 0.052, 0.076, 0, 1.499, 0.066));                       // mandible
  B.push(box(0.150, 0.030, 0.030, 0, 1.512, 0.040));                       // jaw hinge
  B.push(box(0.034, 0.060, 0.034, 0, 1.560, 0.118));                       // nasal
  for (const s of [-1, 1]) {
    /* orbit: a raised rim with a recessed dark socket inside it, so the eye
       reads as a hole rather than a bump at gameplay zoom */
    B.push(place(new THREE.TorusGeometry(0.040, 0.013, 4, 10), s * 0.052, 1.596, 0.088, 0.25, 0, 0));
    B.push(place(new THREE.SphereGeometry(0.030, 7, 6), s * 0.052, 1.594, 0.052));
    B.push(box(0.032, 0.044, 0.048, s * 0.108, 1.566, 0.048));             // zygomatic
    B.push(box(0.026, 0.070, 0.030, s * 0.118, 1.606, 0.010));             // temporal
  }
  for (let i = 0; i < 6; i++) {                                            // upper teeth
    B.push(box(0.015, 0.024, 0.015, -0.043 + i * 0.0172, 1.522, 0.106));
  }
  B.push(box(0.030, 0.048, 0.030, 0, 1.680, -0.088));                      // occipital bump

  /* ONE ARM, pivoted at the shoulder so rotating its group swings the whole
     limb. Used twice, the right one mirrored on X. */
  const A = [];
  A.push(bone(0.030, 0.036, 0.32, 0, -0.17, 0));                       // humerus
  A.push(place(new THREE.SphereGeometry(0.036, 6, 5), 0, -0.345, 0));  // elbow
  A.push(bone(0.020, 0.024, 0.29, 0.012, -0.50, 0.006));               // radius
  A.push(bone(0.017, 0.020, 0.29, -0.014, -0.50, -0.004));             // ulna
  A.push(box(0.075, 0.085, 0.038, 0, -0.678, 0.004));                  // palm
  for (let f = 0; f < 3; f++)
    A.push(box(0.018, 0.070, 0.020, (f - 1) * 0.026, -0.748, 0.006));  // fingers
  A.push(box(0.020, 0.055, 0.022, 0.030, -0.700, -0.024));             // thumb

  /* SWORD, pivoted at the grip. The weapon silhouette is half the read at this
     camera, so it is deliberately oversized. */
  const W = [];
  W.push(cyl(0.019, 0.021, 0.155, 6, 0, 0.075, 0));                    // grip
  W.push(place(new THREE.SphereGeometry(0.030, 7, 6), 0, -0.012, 0));  // pommel
  W.push(box(0.215, 0.036, 0.052, 0, 0.165, 0));                       // crossguard
  W.push(box(0.030, 0.055, 0.048, 0, 0.196, 0));                       // ricasso
  W.push(box(0.072, 0.640, 0.020, 0, 0.545, 0));                       // blade
  W.push(box(0.030, 0.640, 0.030, 0, 0.545, 0));                       // fuller ridge
  W.push(place(new THREE.ConeGeometry(0.036, 0.135, 4), 0, 0.930, 0)); // point

  /* one leg, used twice; the right is the same geometry mirrored on X */
  const L = [];
  L.push(place(new THREE.SphereGeometry(0.048, 7, 6), 0, 0.86, 0));       // femoral head
  L.push(bone(0.034, 0.040, 0.42, 0, 0.64, 0.005));                        // femur
  L.push(place(new THREE.SphereGeometry(0.042, 7, 6), 0, 0.425, 0.005));   // knee
  L.push(bone(0.026, 0.032, 0.38, 0, 0.225, 0.005));                       // tibia
  L.push(bone(0.016, 0.019, 0.36, 0.032, 0.225, 0.0));                     // fibula
  L.push(box(0.075, 0.045, 0.055, 0, 0.038, 0.005));                       // ankle
  L.push(box(0.085, 0.038, 0.150, 0, 0.022, 0.070));                       // foot
  for (let t = 0; t < 3; t++) L.push(box(0.020, 0.022, 0.045, -0.024 + t * 0.024, 0.014, 0.160));

  SKEL = { body: mrg(B), arm: mrg(A), sword: mrg(W), leg: mrg(L) };
  return SKEL;
}

const SKEL_MAT = {};
function skeletonMaterial(rarity) {
  ensureAssets();
  if (SKEL_MAT[rarity]) return SKEL_MAT[rarity];
  /* the sheet asks for enemies that read BRIGHTER than the environment, so the
     bone base is lifted and given a whisper of emissive -- cheap, shared, and
     it keeps them off the floor tone in an unlit room */
  /* Brighter than the environment, NOT self-lit. The first pass ran emissive at
     0.55 and every skeleton glowed pale gold -- that is the "arcade" failure the
     brief warns about. Roughly 60-70% of the mockup, as asked. */
  const tint = rarity === 'rare' ? 0xdfb87c : rarity === 'magic' ? 0xacc0e0 : 0xe4dccc;
  const m = stdMat(TEX.bone, { repeat: 2, env: 0.42, color: tint });
  m.roughness = 0.76;
  m.emissive = new THREE.Color(0x0e0b09);
  m.emissiveIntensity = 0.20;
  SKEL_MAT[rarity] = m;
  return m;
}

/* SKELETON LEGIONNAIRE rig. Six articulated pieces per the package standard
   (torso/head, two arms, two legs, sword), every one of them a merged geometry
   shared across every mob, one material per rarity. Pivots are at the joints so
   a rotation is the whole animation -- no skinning, no bones, no per-mob
   geometry. Far LOD hides the arms and sword, which drops a distant mob to the
   three-draw-call budget in section 13. */
const LEGIONNAIRE = {
  id: 'skeleton_legionnaire', role: 'melee_baseline',
  hpMult: 1.00, dmgMult: 1.00, speed: 2.40, collisionRadius: 0.42,
  staggerResist: 1.00, threatWeight: 1.0, meleeReach: 1.90,
  preferredMin: 1.35, preferredMax: 1.85,
  attacks: [
    { id: 'chop',     weight: 0.55, damageMult: 1.00, windup: 0.42, active: 0.10, recovery: 0.48, minRange: 0,    maxRange: 1.90 },
    { id: 'backhand', weight: 0.30, damageMult: 0.85, windup: 0.30, active: 0.10, recovery: 0.44, minRange: 0,    maxRange: 1.90 },
    { id: 'stepin',   weight: 0.15, damageMult: 1.10, windup: 0.55, active: 0.12, recovery: 0.55, minRange: 1.80, maxRange: 2.50 }
  ],
  cadence: 1.60, settleMin: 0.10, settleMax: 0.22,
  hitLight: 0.26, hitHeavy: 0.52, deathTime: 1.25
};

function skeletonGroup(rarity) {
  const S = buildSkeleton(), mat = skeletonMaterial(rarity);
  const g = new THREE.Group();

  const torso = new THREE.Mesh(S.body, mat);
  torso.castShadow = true; torso.receiveShadow = true;      // the only caster
  g.add(torso);

  const arms = [];
  for (const s of [-1, 1]) {
    const sh = new THREE.Group();
    sh.position.set(s * 0.205, 1.42, 0.02);
    const arm = new THREE.Mesh(S.arm, mat);
    if (s > 0) arm.scale.x = -1;
    arm.castShadow = false; arm.receiveShadow = true;
    sh.add(arm); g.add(sh); arms.push(sh);
  }
  /* sword rides in the right hand; carried low on approach, per the brief */
  const sword = new THREE.Mesh(S.sword, mat);
  sword.position.set(0, -0.70, 0.02);
  sword.rotation.set(-2.05, 0, 0);
  sword.castShadow = false; sword.receiveShadow = true;
  arms[1].add(sword);

  const legs = [];
  for (const s of [-1, 1]) {
    const hip = new THREE.Group();
    hip.position.set(s * 0.125, 0.86, 0);
    const leg = new THREE.Mesh(S.leg, mat);
    leg.position.y = -0.86;
    if (s > 0) leg.scale.x = -1;
    leg.castShadow = false; leg.receiveShadow = true;
    hip.add(leg); g.add(hip); legs.push(hip);
  }

  g.userData.skel = {
    torso: torso, arms: arms, legs: legs, sword: sword,
    ph: Math.random() * 6.283,          // phase offset so a pack never marches in step
    lod: 1, animT: 0
  };
  return g;
}
function legionnaireDef() { return LEGIONNAIRE; }


/* =========================== PUBLIC API ================================== */
let ASSETS_READY = false;
const KEEP_GEO = new Set();
function ensureAssets() {
  if (ASSETS_READY) return;
  TEX.floor  = buildFloorAtlas(512);
  TEX.wall   = buildWallStone(512);
  TEX.wood   = buildWood(256);
  TEX.metal  = buildMetal(256);
  TEX.bone   = buildBone(256);
  TEX.cloth  = buildCloth(256);
  TEX.dirt   = buildDirt(256);
  TEX.waterN = buildWaterNormal(256);
  TEX.blot    = stampAlpha(256, 'blot', 11);
  TEX.crack   = stampAlpha(256, 'crack', 23);
  TEX.scatter = stampAlpha(256, 'rubblescatter', 37);
  TEX.grad    = radial(128, 0.0, 0.5, 2.0);
  TEX.flame   = flameAlpha(128);
  buildMaterialLibrary();
  buildGeometryLibrary();
  for (const k in GEO) KEEP_GEO.add(GEO[k]);
  ASSETS_READY = true;
}

/* Everything the Rift needs beyond geometry, in the format the authored
   pipeline already consumes -- roomGraph, markers, combatZones, lighting.
   No new contract: buildDungeon() reads these exactly as it reads a
   Blueprint Forge export. */
function makeRecord(seed, themeKey, sizeKey, name) {
  ensureAssets();
  const L = new Layout(seed >>> 0, themeKey, sizeKey);
  const P = LIGHT_PRESETS[THEMES[themeKey].light];
  const wc = (i, j) => { const p = L.worldOf(i, j); return [p[0], 0, p[1]]; };

  const roomGraph = L.rooms.map(r => ({
    id: 'r' + r.id,
    role: r.isBoss ? 'boss' : (r.isEntry ? 'entrance' : 'room'),
    center: wc(Math.round(r.cx), Math.round(r.cz)),
    connections: r.links.map(i => 'r' + i)
  }));
  const combatZones = L.rooms.filter(r => !r.isEntry).map(r => ({
    id: 'r' + r.id,
    density: r.isBoss ? 'high' : (r.w * r.d > 150 ? 'high' : (r.w * r.d > 80 ? 'medium' : 'low')),
    radius: Math.max(6, Math.min(r.w, r.d) * CELL * 0.42)
  }));
  const entry = L.rooms[0], boss = L.rooms.find(r => r.isBoss) || L.rooms[L.rooms.length - 1];
  const spawnCell = entry.spawn ? null : [Math.round(entry.cx), Math.round(entry.cz)];
  const spawnPos = entry.spawn ? [entry.spawn[0], 0, entry.spawn[1]] : wc(spawnCell[0], spawnCell[1]);
  const markers = [
    { type: 'PLAYER_SPAWN', position: spawnPos },
    { type: 'EXIT',         position: spawnPos },
    { type: 'BOSS_ZONE',    room: 'r' + boss.id, position: wc(Math.round(boss.cx), Math.round(boss.cz)) }
  ];
  const rec = {
    kind: 'DEPTHS',
    name: name || (THEMES[themeKey].name + ' \\u2014 ' + sizeKey),
    seed: seed >>> 0, theme: themeKey, size: sizeKey,
    objects: [],                       // no FBX; geometry is generated
    roomGraph, markers, combatZones, decorZones: [],
    spawn: spawnPos,
    /* No bloom or colour grade in the game's renderer, so the preset carries
       the mood on its own -- warmer fill, stronger key, higher exposure. */
    /* Tuned against the running game, not the standalone viewer: once the
       brazier pool lights correctly the fill and exposure have to come back
       down or the whole frame blows out and bleaches the HUD. */
    lighting: {
      ambientColor: P.amb, ambient: P.ambI * 0.80,
      keyColor: P.dir,     key: P.dirI * 0.85,
      warm: 0.35, fogColor: P.fog, fog: P.fogD, exposure: 1.00
    }
  };
  /* NON-ENUMERABLE ON PURPOSE. The Layout holds the grid typed arrays, every
     wall record and every post; JSON.stringify of a record WITH it attached is
     259KB. Nothing in the game persists these records today, but one future
     save that walks DUNGEONS would blow the localStorage quota and brick the
     boot. Hidden from stringify, and rebuildable from the seed anyway. */
  Object.defineProperty(rec, '_layout', { value: L, writable: true, enumerable: false, configurable: true });
  return rec;
}

/* Build the geometry into the Rift and hand back exactly what buildDungeon()
   already computes from an FBX map: floor points, floor tops, bounds. */
/* The standalone viewer lit these materials with a generated environment map.
   The game has no scene.environment, so without this every surface loses its
   ambient specular and the stone reads flat grey. Assigned per material rather
   than on the scene, so nothing leaks back into town. */
let ENV_DONE = false;
function applyEnv() {
  if (ENV_DONE) return;
  const rn = (window.AH_WORLD && window.AH_WORLD.renderer) || window.renderer;
  if (!rn) return;
  try {
    const pm = new THREE.PMREMGenerator(rn);
    const src = buildEnvTexture();
    const env = pm.fromEquirectangular(src).texture;
    src.dispose(); pm.dispose();
    for (const k in MAT) {
      const m = MAT[k];
      if (m && m.isMeshStandardMaterial) { m.envMap = env; m.needsUpdate = true; }
    }
    ENV_DONE = true;
  } catch (e) {}
}

function build(record, parent, blockFn) {
  ensureAssets();
  applyEnv();
  /* Repaint the shared materials for THIS complex. One theme per dungeon, so
     tinting the cached material is correct and free -- no clones, no extra
     textures, no extra draw calls. */
  {
    const T = (THEMES[record.theme] && THEMES[record.theme].tint) || null;
    const set = (m, hex) => { if (m && hex !== undefined) m.color.setHex(hex); };
    if (T) {
      set(MAT.floor, T.floor); set(MAT.wall, T.wall);
      set(MAT.stone, T.stone); set(MAT.bone, T.bone);
      for (const k in SKEL_MAT) {
        /* keep the rarity signal, shift the base bone toward the complex */
        const base = k === 'rare' ? 0xd8b26a : k === 'magic' ? 0x9fb6dc : 0xd9d2c0;
        const c = new THREE.Color(base).multiply(new THREE.Color(T.bone));
        SKEL_MAT[k].color.copy(c);
      }
    }
  }
  const L = record._layout || (makeRecord(record.seed, record.theme, record.size)._layout);
  record._layout = L;
  teardown();                       // free the previous dungeon before building another
  const w = new World(parent, L);
  ACTIVE = { world: w, layout: L, parent, record };

  /* FLOOR SAMPLES ARE SUBSAMPLED, AND THAT IS THE WHOLE POINT.
     navFromAuthored builds its nav mesh in O(n^2) over these points and then
     clearance-tests each survivor against every blocker. One sample per 2m
     cell gave 2,308 points on a medium map -- ~7,500 after its half-cell
     offsets -- and froze the tab for 4.6s on ENTER RIFT. An FBX map supplies
     a few hundred. Stride to a comparable density and the cost falls with the
     square. Bounds are still measured over EVERY cell so the lighting and the
     minimap frame the real dungeon, not the sampled one. */
  const floorPts = [], floorTops = [];
  const bounds = { minX: 1e9, maxX: -1e9, minZ: 1e9, maxZ: -1e9 };
  let cells = 0;
  for (let k = 0; k < L.grid.length; k++) if (L.grid[k]) cells++;
  const stride = Math.max(1, Math.round(Math.sqrt(cells / NAV_SAMPLE_TARGET)));
  for (let j = 0; j < L.GH; j++) for (let i = 0; i < L.GW; i++) {
    if (!L.isFloor(i, j)) continue;
    const p = L.worldOf(i, j);
    if (p[0] < bounds.minX) bounds.minX = p[0];
    if (p[0] > bounds.maxX) bounds.maxX = p[0];
    if (p[1] < bounds.minZ) bounds.minZ = p[1];
    if (p[1] > bounds.maxZ) bounds.maxZ = p[1];
    if (i % stride || j % stride) continue;
    floorPts.push({ x: p[0], z: p[1] });
    floorTops.push(0);
  }
  /* a sparse grid can miss a narrow corridor entirely; make sure every room
     centre and every corridor still contributes at least one sample */
  const seen = new Set(floorPts.map(p => Math.round(p.x) + ':' + Math.round(p.z)));
  const ensure = (i, j) => {
    if (!L.isFloor(i, j)) return;
    const p = L.worldOf(i, j), k = Math.round(p[0]) + ':' + Math.round(p[1]);
    if (seen.has(k)) return;
    seen.add(k); floorPts.push({ x: p[0], z: p[1] }); floorTops.push(0);
  };
  for (const r of L.rooms) ensure(Math.round(r.cx), Math.round(r.cz));
  for (const c of L.corridors) {
    const a = Math.min(c.a, c.b), b = Math.max(c.a, c.b), mid = (c.c0 + c.c1) >> 1;
    for (let t = a; t < b; t += 2) c.horiz ? ensure(t, mid) : ensure(mid, t);
  }

  /* COLLISION FROM THE GRID, NOT FROM BOUNDING BOXES. The layout already knows
     which edges are walls and which cells a prop closed off, so blockers are
     exact -- no door frame can wall up its own doorway. */
  let n = 0;
  if (blockFn) {
    for (const wl of L.walls) {
      const cx = (wl.i + 0.5) * CELL, cz = (wl.j + 0.5) * CELL;
      let bx = cx, bz = cz, ax = 0, az = 0;
      if (wl.dir === 0)      { bz = (wl.j + 1) * CELL; ax = 1; }
      else if (wl.dir === 1) { bx = (wl.i + 1) * CELL; az = 1; }
      else if (wl.dir === 2) { bz = wl.j * CELL;       ax = 1; }
      else                   { bx = wl.i * CELL;       az = 1; }
      for (let k = 0; k < 2; k++) {
        const t = (k + 0.5) / 2 - 0.5;
        blockFn(bx + ax * t * CELL, bz + az * t * CELL, 0.62); n++;
      }
    }
    for (const p of L.posts) { blockFn(p.i * CELL, p.j * CELL, 0.48); n++; }
    for (let j = 0; j < L.GH; j++) for (let i = 0; i < L.GW; i++) {
      if (!L.isFloor(i, j) || L.walkable(i, j)) continue;
      const p = L.worldOf(i, j);
      blockFn(p[0], p[1], 0.78); n++;
    }
  }

  /* BEDROCK. Everything outside the walls was pure black void, so the dungeon
     read as a paper cut-out floating in nothing. A single dark stone plane a
     little below the floor, oversized past the map edge, gives the fog
     something to sit on: the gaps between rooms become unlit rock instead of a
     hole. One draw call, no shadows, no lights. */
  {
    const pad = 220;      // generous: you must never be able to see past its edge
    const bw = (bounds.maxX - bounds.minX) + pad * 2;
    const bd = (bounds.maxZ - bounds.minZ) + pad * 2;
    const bg = new THREE.PlaneGeometry(bw, bd, 1, 1);
    const bmat = new THREE.MeshStandardMaterial({
      map: tex(TEX.dirt.alb, Math.max(8, bw / 14), true),
      normalMap: tex(TEX.dirt.nrm, Math.max(8, bw / 14)),
      roughness: 1.0, metalness: 0.0, color: 0x6a6155, envMapIntensity: 0.15
    });
    bmat.normalScale.set(0.6, 0.6);
    const bed = new THREE.Mesh(bg, bmat);
    bed.rotation.x = -Math.PI / 2;
    bed.position.set((bounds.minX + bounds.maxX) / 2, -1.15, (bounds.minZ + bounds.maxZ) / 2);
    bed.receiveShadow = false; bed.castShadow = false;
    bed.renderOrder = -1;
    w.group.add(bed);
  }

  // firelight + flames, driven by the module's own frame loop
  const flames = makeFlames(w.fires, TEX.flame, LIGHT_PRESETS[THEMES[record.theme].light].fire);
  if (flames) { flames.userData.world = 'RIFT'; w.group.add(flames); }
  ACTIVE.flames = flames;
  ACTIVE.fires = w.fires;
  ACTIVE.preset = LIGHT_PRESETS[THEMES[record.theme].light];
  ACTIVE.lights = [];
  for (let i = 0; i < LIGHT_COUNT; i++) {
    const l = new THREE.PointLight(ACTIVE.preset.fire, 0, 16, 2);
    l.visible = false; l.userData.world = 'RIFT';
    w.group.add(l); ACTIVE.lights.push(l);
  }
  startTick();
  return { floorPts, floorTops, bounds, placed: w.kit.meshes.length, blockers: n, world: w };
}

/* ---- self-driven frame loop: no edit to the game's update loop ---------- */
const LIGHT_COUNT = 8;
const NAV_SAMPLE_TARGET = 420;   // floor samples handed to navFromAuthored
let ACTIVE = null, TICKING = false, LTIMER = 0;
/* window.HERO is the character rig and carries no .position -- the player's
   world transform lives on AH_WORLD.player. Getting this wrong means the
   brazier light pool never activates and the dungeon renders with flame
   sprites but no firelight, which is exactly how it looked. */
function focusPoint() {
  try {
    const w = window.AH_WORLD;
    if (w && w.player && w.player.position) return w.player.position;
    const h = window.HERO;
    if (h && h.position) return h.position;
    if (h && h.root && h.root.position) return h.root.position;
  } catch (e) {}
  return null;
}
function startTick() {
  if (TICKING) return;
  TICKING = true;
  const t0 = performance.now();
  const step = () => {
    if (!ACTIVE || !ACTIVE.world || !ACTIVE.world.group.parent) { TICKING = false; return; }
    const t = (performance.now() - t0) / 1000;
    if (ACTIVE.flames) ACTIVE.flames.material.uniforms.uTime.value = t;
    if (MAT.water && MAT.water.normalMap) { MAT.water.normalMap.offset.x = t * 0.012; MAT.water.normalMap.offset.y = t * 0.008; }
    if (MAT.coal) MAT.coal.emissiveIntensity = 1.25 + Math.sin(t * 5.1) * 0.35;
    LTIMER -= 0.016;
    if (LTIMER <= 0) {
      LTIMER = 0.25;
      const f = focusPoint();
      if (f && ACTIVE.fires.length) {
        const scored = [];
        for (let i = 0; i < ACTIVE.fires.length; i++) {
          const s = ACTIVE.fires[i];
          const d = (s.x - f.x) * (s.x - f.x) + (s.z - f.z) * (s.z - f.z);
          if (d < 2500) scored.push([d, i]);
        }
        scored.sort((a, b) => a[0] - b[0]);
        for (let k = 0; k < ACTIVE.lights.length; k++) {
          const l = ACTIVE.lights[k];
          if (k < scored.length) {
            const s = ACTIVE.fires[scored[k][1]];
            l.position.set(s.x, s.y + 0.15, s.z);
            l.intensity = ACTIVE.preset.fireI * s.i * 20;
            l.distance = 15 + s.s * 6;
            l.visible = true;
          } else { l.visible = false; l.intensity = 0; }
        }
      }
    }
    requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
/* Per-build resources only. GEO/MAT are the shared cache and are never
   disposed -- doing so would blank every later dungeon. */
/* Authoritative "is this point on floor?" — the walk grid the layout already
   owns. dungeonClearance() cannot answer this reliably because activeBlockers()
   is spatially culled around the player, so a point far away sees no blockers
   and reports itself as wide open. That is why loot was still landing outside
   the walls after the first fix. Returns null when no Depths map is live so
   callers can fall back. */
function walkableAt(x, z, margin) {
  if (!ACTIVE || !ACTIVE.layout) return null;
  const L = ACTIVE.layout;
  const m = (margin === undefined) ? 0.45 : margin;
  const probes = [[0, 0], [m, 0], [-m, 0], [0, m], [0, -m]];
  for (let k = 0; k < probes.length; k++) {
    const i = Math.floor((x + probes[k][0]) / CELL);
    const j = Math.floor((z + probes[k][1]) / CELL);
    if (!L.walkable(i, j)) return false;
  }
  return true;
}

function teardown() {
  const A = ACTIVE;
  ACTIVE = null;
  if (!A) return;
  try {
    if (A.world && A.world.group) {
      A.world.group.traverse(o => {
        if ((o.isMesh || o.isPoints) && o.geometry && !KEEP_GEO.has(o.geometry)) o.geometry.dispose();
        if (o.isMesh && o.material && o.material.isShaderMaterial) o.material.dispose();
      });
      if (A.world.group.parent) A.world.group.parent.remove(A.world.group);
    }
    if (A.record) A.record._layout = null;   // rebuilt from the seed next time
  } catch (e) {}
}

return { THEMES, LIGHT_PRESETS, CELL, ensureAssets, makeRecord, build, teardown, walkableAt,
         skeletonGroup, skeletonMaterial, buildSkeleton, legionnaireDef,
         get active() { return ACTIVE; } };
`;

const mod = `
/* ===========================================================================
   ASHEN DEPTHS -- procedural PoE2-style dungeon geometry, embedded.
   Self-contained: every texture, mesh and material is generated here, so this
   adds no network assets and shares nothing with the FBX pipeline. It emits
   the SAME metadata an authored Blueprint Forge export does (roomGraph,
   markers, combatZones, lighting), so buildDungeon() consumes it unchanged.
   Wrapped in an IIFE because the game module has ~1000 globals and this code
   uses short names like Kit, World, MAT, box, place.
   ========================================================================= */
const DEPTHS = (function () {
const BGU = { mergeGeometries: mergeGeometries };
${core}
${kit}
${layout}
${world}
${partsFx}
${api}
})();
window.DEPTHS = DEPTHS;
`;

fs.writeFileSync('depths_module.js', mod);
console.log('module', (mod.length/1024).toFixed(1)+'KB');
