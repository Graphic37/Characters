/* ===========================================================================
   Part G : ARPG combat load harness
   Reproduces ASHEN HOLLOW's heaviest measured fight inside this dungeon so the
   renderer can be judged under real conditions rather than empty-room ones.
   Numbers taken from the game's own caps: ARROW_CAP 90, FX_CAP 120,
   NUM_CAP 44, LIGHT_BUDGET 10, enemies as individual shadow-casting meshes.
   =========================================================================== */

const LOAD = {
  on: false,
  enemies: [], arrows: [], fx: [], lights: [], numbers: [],
  root: null, numRoot: null,
  cfg: { enemies: 24, arrows: 80, fx: 60, numbers: 44, lights: 10 },
  geo: null, mat: null
};

function loadBuildAssets() {
  if (LOAD.geo) return;
  LOAD.geo = {
    body: new THREE.CylinderGeometry(0.42, 0.50, 1.55, 12),
    head: new THREE.SphereGeometry(0.30, 12, 10),
    // the game merges an arrow into ONE geometry — mirror that, not the old 7-object version
    arrow: mrg([
      cyl(0.022, 0.022, 0.95, 5, 0, 0, 0, Math.PI / 2, 0, 0),
      place(new THREE.ConeGeometry(0.055, 0.16, 5), 0, 0, 0.54, Math.PI / 2, 0, 0),
      box(0.008, 0.09, 0.14, 0, 0.045, -0.40),
      box(0.008, 0.09, 0.14, 0, -0.045, -0.40)
    ]),
    ring: new THREE.RingGeometry(0.92, 1.0, 28)
  };
  LOAD.mat = {
    body: new THREE.MeshStandardMaterial({ color: 0x6d5f52, roughness: 0.85 }),
    head: new THREE.MeshStandardMaterial({ color: 0x8a7a68, roughness: 0.8 }),
    elite: new THREE.MeshStandardMaterial({ color: 0x7a4a3a, roughness: 0.7, emissive: 0x3a1206, emissiveIntensity: 0.6 }),
    arrow: new THREE.MeshStandardMaterial({ color: 0xb9a98a, roughness: 0.6 }),
    ring: new THREE.MeshBasicMaterial({ color: 0xffa24a, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })
  };
}

function loadStart() {
  if (LOAD.on || !world || !hero) return;
  loadBuildAssets();
  const c = LOAD.cfg;
  LOAD.root = new THREE.Group();
  LOAD.root.name = 'combatLoad';
  scene.add(LOAD.root);
  const rng = new RNG(1234);
  const cx = hero.pos.x, cz = hero.pos.y;

  for (let i = 0; i < c.enemies; i++) {
    const g = new THREE.Group();
    const elite = i % 8 === 0;
    const b = new THREE.Mesh(LOAD.geo.body, elite ? LOAD.mat.elite : LOAD.mat.body);
    b.position.y = 0.78; b.castShadow = true; b.receiveShadow = true;
    const h = new THREE.Mesh(LOAD.geo.head, LOAD.mat.head);
    h.position.y = 1.72; h.castShadow = true; h.receiveShadow = true;
    g.add(b); g.add(h);
    if (elite) g.scale.setScalar(1.35);
    const a = rng.r(0, 6.283), d = rng.r(2, 11);
    g.position.set(cx + Math.cos(a) * d, 0, cz + Math.sin(a) * d);
    g.userData = { a, d, sp: rng.r(0.4, 1.1), ph: rng.r(0, 6.283) };
    LOAD.root.add(g);
    LOAD.enemies.push(g);
  }
  for (let i = 0; i < c.arrows; i++) {
    const m = new THREE.Mesh(LOAD.geo.arrow, LOAD.mat.arrow);
    m.castShadow = true;
    m.userData = { t: rng.n(), a: rng.r(0, 6.283), sp: rng.r(0.5, 1.2) };
    LOAD.root.add(m); LOAD.arrows.push(m);
  }
  for (let i = 0; i < c.fx; i++) {
    const m = new THREE.Mesh(LOAD.geo.ring, LOAD.mat.ring);
    m.rotation.x = -Math.PI / 2;
    m.userData = { t: rng.n(), a: rng.r(0, 6.283), d: rng.r(1, 10) };
    LOAD.root.add(m); LOAD.fx.push(m);
  }
  for (let i = 0; i < c.lights; i++) {
    const l = new THREE.PointLight(0x9fd0ff, 6, 9, 2);
    LOAD.root.add(l); LOAD.lights.push(l);
  }
  LOAD.numRoot = document.createElement('div');
  LOAD.numRoot.id = 'loadNumbers';
  LOAD.numRoot.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:14';
  document.body.appendChild(LOAD.numRoot);
  for (let i = 0; i < c.numbers; i++) {
    const d = document.createElement('div');
    d.style.cssText = 'position:absolute;font:600 15px var(--mono);color:#ffd9a0;text-shadow:0 2px 6px #000';
    d.textContent = (100 + ((i * 37) % 900)).toString();
    LOAD.numRoot.appendChild(d);
    LOAD.numbers.push({ el: d, t: Math.random(), a: Math.random() * 6.283, d: 1 + Math.random() * 9 });
  }
  LOAD.on = true;
  const b = document.getElementById('tLoad'); if (b) b.classList.add('on');
}

function loadStop() {
  if (!LOAD.on) return;
  scene.remove(LOAD.root);
  LOAD.root.traverse(o => { if (o.isMesh) { /* shared geo/mat, keep */ } });
  LOAD.enemies.length = 0; LOAD.arrows.length = 0; LOAD.fx.length = 0; LOAD.lights.length = 0;
  if (LOAD.numRoot) LOAD.numRoot.remove();
  LOAD.numbers.length = 0;
  LOAD.root = null; LOAD.on = false;
  const b = document.getElementById('tLoad'); if (b) b.classList.remove('on');
}

const _lv = new THREE.Vector3();
function loadUpdate(dt, t) {
  if (!LOAD.on || !hero) return;
  const cx = hero.pos.x, cz = hero.pos.y;
  for (const g of LOAD.enemies) {
    const u = g.userData;
    u.a += dt * 0.28 * u.sp;
    const d = u.d + Math.sin(t * 0.7 + u.ph) * 1.2;
    g.position.set(cx + Math.cos(u.a) * d, Math.abs(Math.sin(t * 6 + u.ph)) * 0.06, cz + Math.sin(u.a) * d);
    g.rotation.y = -u.a + Math.PI / 2;
  }
  for (const m of LOAD.arrows) {
    const u = m.userData;
    u.t += dt * u.sp * 1.6;
    if (u.t > 1) { u.t = 0; u.a = Math.random() * 6.283; }
    const r = 1 + u.t * 12;
    m.position.set(cx + Math.cos(u.a) * r, 1.1 + Math.sin(u.t * 3.14) * 0.5, cz + Math.sin(u.a) * r);
    m.rotation.set(0, -u.a + Math.PI / 2, 0);
  }
  for (const m of LOAD.fx) {
    const u = m.userData;
    u.t += dt * 1.4;
    if (u.t > 1) { u.t = 0; u.a = Math.random() * 6.283; u.d = 1 + Math.random() * 10; }
    const s = 0.3 + u.t * 2.4;
    m.position.set(cx + Math.cos(u.a) * u.d, 0.06, cz + Math.sin(u.a) * u.d);
    m.scale.setScalar(s);
    m.material.opacity = 0.55 * (1 - u.t);
  }
  for (let i = 0; i < LOAD.lights.length; i++) {
    const l = LOAD.lights[i], a = t * 0.5 + i * 0.63;
    l.position.set(cx + Math.cos(a) * 6, 1.4, cz + Math.sin(a) * 6);
    l.intensity = 5 + Math.sin(t * 4 + i) * 2;
  }
  // DOM damage numbers, projected every frame exactly as the game does
  for (const n of LOAD.numbers) {
    n.t += dt * 0.9;
    if (n.t > 1) { n.t = 0; n.a = Math.random() * 6.283; n.d = 1 + Math.random() * 9; }
    _lv.set(cx + Math.cos(n.a) * n.d, 1.4 + n.t * 1.6, cz + Math.sin(n.a) * n.d);
    _lv.project(camera);
    n.el.style.left = ((_lv.x * 0.5 + 0.5) * innerWidth) + 'px';
    n.el.style.top = ((-_lv.y * 0.5 + 0.5) * innerHeight) + 'px';
    n.el.style.opacity = String(1 - n.t);
  }
}
