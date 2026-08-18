/* ===========================================================================
   Part E : firelight FX, particles, light pool, hero
   =========================================================================== */

/* ------------------------------ flames ------------------------------------ */
const FLAME_VERT = `
uniform float uTime;
attribute float aPhase;
varying vec2 vUv;
varying float vFlick;
void main() {
  vUv = uv;
  #ifdef USE_INSTANCING
    mat4 im = instanceMatrix;
  #else
    mat4 im = mat4(1.0);
  #endif
  vec4 centre = modelMatrix * im * vec4(0.0, 0.0, 0.0, 1.0);
  float sc = length(vec3(im[0][0], im[0][1], im[0][2]));
  float t = uTime * 2.6 + aPhase;
  float flick = 0.80 + 0.20 * sin(t * 7.3) + 0.12 * sin(t * 13.7 + 1.3) + 0.06 * sin(t * 23.1);
  vFlick = flick;
  vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
  vec3 up    = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
  float w = sc * (0.62 + 0.06 * sin(t * 9.1 + 0.7));
  float h = sc * (1.05 * flick);
  float lean = sc * 0.06 * sin(t * 3.1);
  vec3 p = centre.xyz + right * (position.x * w + (position.y + 0.5) * lean) + up * ((position.y + 0.5) * h);
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}`;
const FLAME_FRAG = `
uniform sampler2D uMap;
uniform vec3 uHot;
uniform vec3 uCool;
uniform float uOpacity;
varying vec2 vUv;
varying float vFlick;
void main() {
  float a = texture2D(uMap, vUv).a;
  if (a < 0.01) discard;
  vec3 c = mix(uCool, uHot, smoothstep(0.10, 0.80, a));
  gl_FragColor = vec4(c * (0.7 + vFlick * 0.6), a * uOpacity * vFlick);
}`;

function makeFlames(fires, flameTex, colorHot) {
  if (!fires.length) return null;
  const per = 2;                     // two crossed billboards read better than one
  const n = fires.length * per;
  const geo = new THREE.PlaneGeometry(1, 1);
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uMap: { value: alphaTex(flameTex) },
      uHot: { value: new THREE.Color(colorHot) },
      uCool: { value: new THREE.Color(0x8c2a06) },
      uOpacity: { value: 0.80 }
    },
    vertexShader: FLAME_VERT, fragmentShader: FLAME_FRAG,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide
  });
  const mesh = new THREE.InstancedMesh(geo, mat, n);
  mesh.frustumCulled = false;
  mesh.renderOrder = 6;
  const dummy = new THREE.Object3D();
  const phase = new Float32Array(n);
  let k = 0;
  for (const f of fires) {
    for (let p = 0; p < per; p++) {
      dummy.position.set(f.x, f.y, f.z);
      dummy.scale.setScalar(f.s * 1.15);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      mesh.setMatrixAt(k, dummy.matrix);
      phase[k] = (k * 1.7) % 6.283 + p * 2.1;
      k++;
    }
  }
  mesh.instanceMatrix.needsUpdate = true;
  geo.setAttribute('aPhase', new THREE.InstancedBufferAttribute(phase, 1));
  return mesh;
}

/* ------------------------- embers & dust motes ----------------------------- */
const PARTICLE_VERT = `
uniform float uTime;
uniform float uSize;
uniform float uRise;
uniform float uLife;
attribute vec3 aBase;
attribute float aPhase;
attribute float aSpeed;
varying float vFade;
void main() {
  float t = fract((uTime * aSpeed + aPhase) / uLife);
  vec3 p = aBase;
  p.y += t * uRise;
  p.x += sin((uTime * 0.8 + aPhase) * 1.7) * 0.35 * t;
  p.z += cos((uTime * 0.7 + aPhase) * 1.9) * 0.35 * t;
  vFade = sin(t * 3.14159);
  vec4 mv = viewMatrix * modelMatrix * vec4(p, 1.0);
  gl_PointSize = uSize * (300.0 / max(1.0, -mv.z));
  gl_Position = projectionMatrix * mv;
}`;
const PARTICLE_FRAG = `
uniform sampler2D uMap;
uniform vec3 uColor;
uniform float uOpacity;
varying float vFade;
void main() {
  float a = texture2D(uMap, gl_PointCoord).a;
  gl_FragColor = vec4(uColor, a * vFade * uOpacity);
}`;

function makeParticles(bases, opts) {
  const n = bases.length / 3;
  if (!n) return null;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(bases), 3));
  geo.setAttribute('aBase', new THREE.BufferAttribute(new Float32Array(bases), 3));
  const phase = new Float32Array(n), speed = new Float32Array(n);
  for (let i = 0; i < n; i++) { phase[i] = Math.random() * opts.life; speed[i] = 0.6 + Math.random() * 0.8; }
  geo.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1));
  geo.setAttribute('aSpeed', new THREE.BufferAttribute(speed, 1));
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 }, uSize: { value: opts.size }, uRise: { value: opts.rise },
      uLife: { value: opts.life }, uMap: { value: alphaTex(TEX.grad) },
      uColor: { value: new THREE.Color(opts.color) }, uOpacity: { value: opts.opacity }
    },
    vertexShader: PARTICLE_VERT, fragmentShader: PARTICLE_FRAG,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
  });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  pts.renderOrder = 7;
  return pts;
}

/* ---------------------------- light pool ---------------------------------- */
class LightPool {
  constructor(scene, count, shadowCount, preset) {
    this.lights = [];
    this.preset = preset;
    for (let i = 0; i < count; i++) {
      const l = new THREE.PointLight(preset.fire, 0, 17, 2);
      l.castShadow = i < shadowCount;
      if (l.castShadow) {
        l.shadow.mapSize.set(512, 512);
        l.shadow.bias = -0.006;
        l.shadow.normalBias = 0.06;
        l.shadow.camera.near = 0.35;
        l.shadow.camera.far = 17;
      }
      l.visible = false;
      scene.add(l);
      this.lights.push(l);
    }
    this.sources = [];
    this.timer = 0;
    this.assigned = [];
    this.gain = 1;
  }
  setSources(list) { this.sources = list; this.assigned = []; }
  update(dt, focus) {
    this.timer -= dt;
    if (this.timer > 0) return;
    this.timer = 0.20;
    const src = this.sources;
    const scored = [];
    for (let i = 0; i < src.length; i++) {
      const f = src[i];
      const d = (f.x - focus.x) * (f.x - focus.x) + (f.z - focus.z) * (f.z - focus.z);
      if (d < 3600) scored.push([d, i]);
    }
    scored.sort((a, b) => a[0] - b[0]);
    const n = this.lights.length;
    for (let k = 0; k < n; k++) {
      const l = this.lights[k];
      if (k < scored.length) {
        const f = src[scored[k][1]];
        l.position.set(f.x, f.y + 0.15, f.z);
        l.color.set(this.preset.fire);
        l.intensity = this.preset.fireI * f.i * 26 * this.gain;
        l.distance = 15 + f.s * 6;
        l.visible = true;
      } else { l.visible = false; l.intensity = 0; }
    }
  }
  dispose(scene) { for (const l of this.lights) scene.remove(l); this.lights.length = 0; }
}

/* ------------------------------- hero ------------------------------------- */
function buildHero() {
  const g = new THREE.Group();
  const cloth = new THREE.MeshStandardMaterial({ color: 0x4a4038, roughness: 0.95, metalness: 0.0, envMapIntensity: 0.4 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x2a2724, roughness: 0.9 });
  const leather = new THREE.MeshStandardMaterial({ color: 0x5c4330, roughness: 0.85 });
  const steel = new THREE.MeshStandardMaterial({ color: 0x6d6a66, roughness: 0.45, metalness: 0.85, envMapIntensity: 1.0 });

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.20, 0.42, 4, 10), leather);
  torso.position.y = 1.06; g.add(torso);

  const cloakProf = [];
  for (let i = 0; i <= 10; i++) { const t = i / 10; cloakProf.push(new THREE.Vector2(0.17 + t * t * 0.30, 1.30 - t * 1.05)); }
  const cloak = new THREE.Mesh(new THREE.LatheGeometry(cloakProf, 16), cloth);
  cloak.material.side = THREE.DoubleSide;
  g.add(cloak);

  const hood = new THREE.Mesh(new THREE.ConeGeometry(0.20, 0.34, 12), cloth);
  hood.position.set(0, 1.46, -0.01); g.add(hood);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.115, 12, 10), dark);
  head.position.set(0, 1.40, 0.02); g.add(head);
  const shoulders = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.22, 0.12, 12), cloth);
  shoulders.position.y = 1.28; g.add(shoulders);

  const legs = [];
  for (const s of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.40, 3, 8), dark);
    leg.position.set(s * 0.10, 0.36, 0);
    g.add(leg); legs.push(leg);
  }
  const arms = [];
  for (const s of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.062, 0.34, 3, 8), leather);
    arm.position.set(s * 0.235, 1.06, 0);
    g.add(arm); arms.push(arm);
  }
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.86, 0.014), steel);
  blade.position.set(0.30, 0.86, -0.08); blade.rotation.z = 0.18; g.add(blade);
  const guard = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.035, 0.045), steel);
  guard.position.set(0.30, 1.28, -0.08); g.add(guard);

  const lantern = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8),
    new THREE.MeshStandardMaterial({ color: 0x241608, emissive: 0xffa042, emissiveIntensity: 0.9, roughness: 0.6 }));
  lantern.position.set(-0.30, 0.92, 0.10); g.add(lantern);

  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });

  const light = new THREE.PointLight(0xffb066, 5.5, 10, 2);
  light.position.set(-0.46, 1.35, 0.16);
  g.add(light);

  g.userData = { legs, arms, cloak, light, lantern, phase: 0 };
  return g;
}

class Hero {
  constructor(scene, layout) {
    this.L = layout;
    this.obj = buildHero();
    scene.add(this.obj);
    this.pos = new THREE.Vector2(0, 0);
    this.path = null; this.pathI = 0;
    this.speed = 5.6;
    this.facing = 0;
    this.auto = true;
    this.autoWait = 0;
    this.visited = new Set();
    const entry = layout.rooms[0];
    const sp = entry.spawn || layout.worldOf(Math.round(entry.cx), Math.round(entry.cz));
    this.pos.set(sp[0], sp[1]);
    this.obj.position.set(sp[0], 0, sp[1]);
    this.visited.add(entry.id);
  }
  moveTo(x, z) {
    const [si, sj] = this.L.cellOf(this.pos.x, this.pos.y);
    const [ti, tj] = this.L.cellOf(x, z);
    const p = findPath(this.L, si, sj, ti, tj);
    if (p && p.length > 1) { this.path = p; this.pathI = 1; }
    else if (p) { this.path = null; }
  }
  roomAt() {
    const [i, j] = this.L.cellOf(this.pos.x, this.pos.y);
    const id = this.L.rid[this.L.idx(i, j)];
    return id >= 0 ? this.L.rooms[id] : null;
  }
  pickNextRoom() {
    const here = this.roomAt();
    const cands = this.L.rooms.filter(r => !this.visited.has(r.id));
    if (!cands.length) { this.visited.clear(); if (here) this.visited.add(here.id); return this.L.rooms[0]; }
    cands.sort((a, b) => {
      const da = Math.hypot(a.cx * CELL - this.pos.x, a.cz * CELL - this.pos.y);
      const db = Math.hypot(b.cx * CELL - this.pos.x, b.cz * CELL - this.pos.y);
      return da - db;
    });
    return cands[0];
  }
  update(dt, input) {
    const ud = this.obj.userData;
    let moved = 0;
    // direct WASD overrides any path
    if (input && (input.x || input.z)) {
      this.path = null; this.autoWait = 0.6;
      const len = Math.hypot(input.x, input.z) || 1;
      const step = this.speed * dt;
      const nx = this.pos.x + (input.x / len) * step, nz = this.pos.y + (input.z / len) * step;
      if (this.canStand(nx, this.pos.y)) this.pos.x = nx;
      if (this.canStand(this.pos.x, nz)) this.pos.y = nz;
      this.facing = Math.atan2(input.x, input.z);
      moved = 1;
    } else if (this.path) {
      const tgt = this.path[this.pathI];
      const [tx, tz] = this.L.worldOf(tgt[0], tgt[1]);
      const dx = tx - this.pos.x, dz = tz - this.pos.y;
      const d = Math.hypot(dx, dz);
      if (d < 0.28) {
        this.pathI++;
        if (this.pathI >= this.path.length) { this.path = null; this.autoWait = 1.3; }
      } else {
        const step = Math.min(this.speed * dt, d);
        this.pos.x += dx / d * step; this.pos.y += dz / d * step;
        this.facing = Math.atan2(dx, dz);
        moved = 1;
      }
    } else if (this.auto) {
      this.autoWait -= dt;
      if (this.autoWait <= 0) {
        const r = this.pickNextRoom();
        this.visited.add(r.id);
        const t = this.L.worldOf(Math.round(r.cx), Math.round(r.cz));
        this.moveTo(t[0], t[1]);
        this.autoWait = 2.0;
      }
    }
    // pose
    ud.phase += dt * (moved ? 9.5 : 1.6);
    const sw = Math.sin(ud.phase) * (moved ? 0.42 : 0.05);
    ud.legs[0].rotation.x = sw; ud.legs[1].rotation.x = -sw;
    ud.arms[0].rotation.x = -sw * 0.7; ud.arms[1].rotation.x = sw * 0.7;
    this.obj.position.set(this.pos.x, moved ? Math.abs(Math.sin(ud.phase)) * 0.045 : 0, this.pos.y);
    let df = this.facing - this.obj.rotation.y;
    while (df > Math.PI) df -= Math.PI * 2;
    while (df < -Math.PI) df += Math.PI * 2;
    this.obj.rotation.y += df * Math.min(1, dt * 12);
    ud.light.intensity = 5.0 + Math.sin(performance.now() * 0.006) * 0.8;
  }
  canStand(x, z) {
    const [i, j] = this.L.cellOf(x, z);
    return this.L.walkable(i, j);
  }
}
