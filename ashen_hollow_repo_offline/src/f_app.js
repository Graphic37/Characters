/* ===========================================================================
   Part F : renderer, camera rig, post stack, UI, main loop
   =========================================================================== */

const GradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uVignette: { value: 1.05 },
    uGrain: { value: 0.030 },
    uContrast: { value: 1.10 },
    uSat: { value: 0.93 },
    uShadowTint: { value: new THREE.Color(0x38405a) },
    uHiTint: { value: new THREE.Color(0xffd7a8) },
    uSplit: { value: 0.10 }
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float uTime, uVignette, uGrain, uContrast, uSat, uSplit;
    uniform vec3 uShadowTint, uHiTint;
    varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    void main(){
      vec3 c = texture2D(tDiffuse, vUv).rgb;
      float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
      c = mix(vec3(l), c, uSat);
      c = clamp((c - 0.5) * uContrast + 0.5, 0.0, 1.4);
      // split toning: cool shadows, warm highlights
      c = mix(c, c * uShadowTint * 2.0, (1.0 - smoothstep(0.0, 0.42, l)) * uSplit);
      c = mix(c, c * uHiTint, smoothstep(0.55, 1.0, l) * uSplit * 0.8);
      // vignette
      vec2 d = vUv - 0.5;
      float v = 1.0 - dot(d, d) * uVignette;
      c *= clamp(v, 0.0, 1.0);
      // fine film grain, luminance weighted so it hides in the darks
      float g = (hash(vUv * 1024.0 + uTime) - 0.5) * uGrain * (1.25 - l);
      c += g;
      gl_FragColor = vec4(c, 1.0);
    }`
};

const QUALITY = {
  ultra:  { label: 'Ultra',  shadow: 2048, lights: 10, shadowLights: 2, dpr: 2.0,  smaa: true,  bloom: true },
  game:   { label: 'In-game', shadow: 1024, lights: 6,  shadowLights: 1, dpr: 1.0,  smaa: false, bloom: true },
  high:   { label: 'High',   shadow: 1536, lights: 8,  shadowLights: 1, dpr: 1.5,  smaa: true,  bloom: true },
  medium: { label: 'Medium', shadow: 1024, lights: 6,  shadowLights: 1, dpr: 1.25, smaa: true,  bloom: true },
  perf:   { label: 'Perf',   shadow: 0,    lights: 5,  shadowLights: 0, dpr: 1.0,  smaa: false, bloom: false }
};

const App = {
  seed: (Math.random() * 1e9) | 0,
  theme: 'crypt',
  size: 'large',
  quality: 'high',
  post: true,
  ssao: true,
  bloom: true,
  cinematic: false,
  freeCam: false,
  showMap: true,
  lightGain: 1.0
};

let renderer, scene, camera, composer, controls, clock;
let renderPass, ssaoPass, bloomPass, gradePass, outputPass, smaaPass;
let dirLight, hemi, ambient, lightPool;
let world, layout, hero, flames, embers, dust, preset;
let camYaw = -Math.PI * 0.25, camPitch = 0.95, camDist = 26, camTarget = new THREE.Vector3();
let lastRoomId = -2, zoneTimer = 0;
const keys = Object.create(null);
const KEEP_GEO = new Set();
let captureNext = false;
let postFailed = false;
let frameCount = 0, fpsAcc = 0, fpsTime = 0, fps = 0;

/* ------------------------------ bootstrap --------------------------------- */
function initRenderer() {
  renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance', stencil: false });
  renderer.setSize(innerWidth, innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.06;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.info.autoReset = false;
  document.getElementById('stage').appendChild(renderer.domElement);

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(30, innerWidth / innerHeight, 0.5, 420);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTex = buildEnvTexture();
  scene.environment = pmrem.fromEquirectangular(envTex).texture;
  envTex.dispose(); pmrem.dispose();

  ambient = new THREE.AmbientLight(0x1b1a20, 0.3);
  scene.add(ambient);
  hemi = new THREE.HemisphereLight(0x3a4258, 0x1e150d, 0.7);
  scene.add(hemi);
  dirLight = new THREE.DirectionalLight(0x8fa8d6, 0.45);
  dirLight.position.set(-38, 62, 26);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.set(2048, 2048);
  dirLight.shadow.camera.near = 20; dirLight.shadow.camera.far = 160;
  dirLight.shadow.camera.left = -36; dirLight.shadow.camera.right = 36;
  dirLight.shadow.camera.top = 36; dirLight.shadow.camera.bottom = -36;
  dirLight.shadow.bias = -0.0012;
  dirLight.shadow.normalBias = 0.045;
  scene.add(dirLight);
  scene.add(dirLight.target);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.dampingFactor = 0.08;
  controls.maxPolarAngle = Math.PI * 0.49;
  controls.enabled = false;

  clock = new THREE.Clock();
  addEventListener('resize', onResize);
}

function buildComposer() {
  const q = QUALITY[App.quality];
  if (composer) composer.dispose();
  composer = new EffectComposer(renderer);
  composer.setSize(innerWidth, innerHeight);
  composer.setPixelRatio(Math.min(devicePixelRatio, q.dpr));

  // SSAOPass in r160 does NOT render the beauty pass -- it multiplies AO onto
  // whatever is already in the read buffer. Put it FIRST and you get black.
  renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);
  ssaoPass = null;
  if (App.ssao) {
    ssaoPass = new SSAOPass(scene, camera, innerWidth, innerHeight);
    ssaoPass.kernelRadius = 10;
    ssaoPass.minDistance = 0.004;
    ssaoPass.maxDistance = 0.08;
    ssaoPass.output = SSAOPass.OUTPUT.Default;
    composer.addPass(ssaoPass);
  }
  if (q.bloom && App.bloom) {
    bloomPass = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.42, 0.68, 0.86);
    composer.addPass(bloomPass);
  }
  outputPass = new OutputPass();
  composer.addPass(outputPass);
  gradePass = new ShaderPass(GradeShader);
  composer.addPass(gradePass);
  if (q.smaa) {
    smaaPass = new SMAAPass(innerWidth * Math.min(devicePixelRatio, q.dpr), innerHeight * Math.min(devicePixelRatio, q.dpr));
    composer.addPass(smaaPass);
  }
}

function applyQuality() {
  const q = QUALITY[App.quality];
  renderer.setPixelRatio(Math.min(devicePixelRatio, q.dpr));
  renderer.shadowMap.enabled = q.shadow > 0;
  dirLight.castShadow = q.shadow > 0;
  if (q.shadow > 0) {
    dirLight.shadow.mapSize.set(q.shadow, q.shadow);
    if (dirLight.shadow.map) { dirLight.shadow.map.dispose(); dirLight.shadow.map = null; }
  }
  if (lightPool) { lightPool.dispose(scene); lightPool = null; }
  lightPool = new LightPool(scene, q.lights, q.shadow > 0 ? q.shadowLights : 0, preset);
  lightPool.gain = App.lightGain;
  if (world) lightPool.setSources(world.fires);
  scene.traverse(o => { if (o.isMesh && o.material && o.material.needsUpdate !== undefined) o.material.needsUpdate = true; });
  buildComposer();
}

function onResize() {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  if (composer) { composer.setSize(innerWidth, innerHeight); }
  if (ssaoPass) ssaoPass.setSize(innerWidth, innerHeight);
  const mm = document.getElementById('minimap');
  if (mm) { mm.width = 220; mm.height = 220; }
}

/* ----------------------------- world lifecycle ---------------------------- */
function disposeWorld() {
  if (!world) return;
  if (typeof loadStop === 'function') loadStop();
  world.group.traverse(o => {
    if (o.isMesh || o.isPoints) {
      if (o.geometry && !KEEP_GEO.has(o.geometry)) o.geometry.dispose();
    }
  });
  scene.remove(world.group);
  if (flames) { scene.remove(flames); flames.geometry.dispose(); flames.material.dispose(); flames = null; }
  if (embers) { scene.remove(embers); embers.geometry.dispose(); embers.material.dispose(); embers = null; }
  if (dust) { scene.remove(dust); dust.geometry.dispose(); dust.material.dispose(); dust = null; }
  if (hero) {
    hero.obj.traverse(o => { if (o.isMesh) { o.geometry.dispose(); if (o.material.dispose) o.material.dispose(); } });
    scene.remove(hero.obj); hero = null;
  }
  world = null;
}

function generate() {
  disposeWorld();
  preset = LIGHT_PRESETS[THEMES[App.theme].light];
  scene.fog = new THREE.FogExp2(preset.fog, preset.fogD);
  renderer.setClearColor(new THREE.Color(preset.fog).multiplyScalar(0.30), 1);
  ambient.color.set(preset.amb); ambient.intensity = preset.ambI;
  dirLight.color.set(preset.dir); dirLight.intensity = preset.dirI;
  hemi.color.set(preset.hemiSky); hemi.groundColor.set(preset.hemiGnd); hemi.intensity = preset.hemiI;

  layout = new Layout(App.seed, App.theme, App.size);
  world = new World(scene, layout);

  flames = makeFlames(world.fires, TEX.flame, preset.fire);
  if (flames) scene.add(flames);

  // embers rise from every fire; dust drifts through the whole complex
  const eb = [];
  for (const f of world.fires) {
    const n = f.s > 0.8 ? 10 : 4;
    for (let k = 0; k < n; k++) eb.push(f.x + (Math.random() - 0.5) * 0.5, f.y - 0.2, f.z + (Math.random() - 0.5) * 0.5);
  }
  embers = makeParticles(eb, { size: 0.055, rise: 3.4, life: 3.2, color: 0xff8a34, opacity: 0.95 });
  if (embers) scene.add(embers);

  const db = [];
  for (let k = 0; k < 2600; k++) {
    const j = Math.floor(Math.random() * layout.GH), i = Math.floor(Math.random() * layout.GW);
    if (!layout.isFloor(i, j)) { continue; }
    const [x, z] = layout.worldOf(i, j);
    db.push(x + (Math.random() - 0.5) * CELL, Math.random() * 4.2, z + (Math.random() - 0.5) * CELL);
  }
  dust = makeParticles(db, { size: 0.030, rise: 1.1, life: 9.0, color: 0x9fb0c4, opacity: 0.26 });
  if (dust) scene.add(dust);

  hero = new Hero(scene, layout);
  camTarget.set(hero.pos.x, 0, hero.pos.y);
  lastRoomId = -2; zoneTimer = 0;
  if (lightPool) { lightPool.preset = preset; lightPool.setSources(world.fires); }
  updateReadout();
}

/* ------------------------------- camera ----------------------------------- */
function updateCamera(dt) {
  if (App.freeCam) { controls.update(); return; }
  const t = hero ? new THREE.Vector3(hero.pos.x, 0.9, hero.pos.y) : camTarget;
  camTarget.lerp(t, Math.min(1, dt * 4.5));
  if (App.cinematic) camYaw += dt * 0.045;
  const cp = Math.cos(camPitch), sp = Math.sin(camPitch);
  camera.position.set(
    camTarget.x + Math.sin(camYaw) * cp * camDist,
    camTarget.y + sp * camDist,
    camTarget.z + Math.cos(camYaw) * cp * camDist
  );
  camera.lookAt(camTarget);
  dirLight.position.set(camTarget.x - 34, 58, camTarget.z + 24);
  dirLight.target.position.copy(camTarget);
  dirLight.target.updateMatrixWorld();
}

/* -------------------------------- input ----------------------------------- */
const rayc = new THREE.Raycaster();
const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const ndc = new THREE.Vector2();
const hitPoint = new THREE.Vector3();

function initInput() {
  const dom = renderer.domElement;
  dom.addEventListener('pointerdown', e => {
    if (App.freeCam || e.button !== 0) return;
    ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    rayc.setFromCamera(ndc, camera);
    if (rayc.ray.intersectPlane(groundPlane, hitPoint) && hero) hero.moveTo(hitPoint.x, hitPoint.z);
  });
  dom.addEventListener('wheel', e => {
    if (App.freeCam) return;
    e.preventDefault();
    camDist = Math.max(12, Math.min(80, camDist + Math.sign(e.deltaY) * 2.2));
  }, { passive: false });
  addEventListener('keydown', e => {
    keys[e.code] = true;
    const k = e.key.toLowerCase();
    if (k === 'r') { App.seed = (Math.random() * 1e9) | 0; document.getElementById('seed').value = App.seed; generate(); }
    if (k === 'q') camYaw -= 0.12;
    if (k === 'e') camYaw += 0.12;
    if (k === 'h') document.body.classList.toggle('hideui');
    if (k === 'm') { App.showMap = !App.showMap; document.getElementById('minimap').style.display = App.showMap ? 'block' : 'none'; }
    if (k === 'c') { App.cinematic = !App.cinematic; }
    if (k === 'f') { App.freeCam = !App.freeCam; controls.enabled = App.freeCam; if (App.freeCam) { controls.target.copy(camTarget); controls.update(); } }
    if (k === 'p') captureNext = true;
    if (k === '1') { App.post = !App.post; syncToggles(); }
    if (k === '2') { App.bloom = !App.bloom; buildComposer(); syncToggles(); }
    if (k === '3') { App.ssao = !App.ssao; buildComposer(); syncToggles(); }
    if (k === '4') { LOAD.on ? loadStop() : loadStart(); syncToggles(); }
    if (k === ' ') { if (hero) { hero.auto = !hero.auto; hero.path = null; hero.autoWait = 0; } e.preventDefault(); }
  });
  addEventListener('keyup', e => { keys[e.code] = false; });
}
function readMove() {
  if (App.freeCam) return { x: 0, z: 0 };
  let x = 0, z = 0;
  if (keys.KeyW || keys.ArrowUp) z -= 1;
  if (keys.KeyS || keys.ArrowDown) z += 1;
  if (keys.KeyA || keys.ArrowLeft) x -= 1;
  if (keys.KeyD || keys.ArrowRight) x += 1;
  if (!x && !z) return { x: 0, z: 0 };
  // move relative to the camera yaw so WASD always matches the screen
  const c = Math.cos(camYaw), s = Math.sin(camYaw);
  return { x: x * c + z * s, z: -x * s + z * c };
}

function syncToggles() {
  const set = (id, on) => { const el = document.getElementById(id); if (el) el.classList.toggle('on', on); };
  set('tPost', App.post); set('tBloom', App.bloom); set('tSsao', App.ssao);
  set('tLoad', LOAD.on);
}

/* ------------------------- zone-title reveal ------------------------------ */
function checkZone(dt) {
  if (!hero) return;
  const el = document.getElementById('zone');
  const r = hero.roomAt();
  const id = r ? r.id : -1;
  if (id !== lastRoomId) {
    lastRoomId = id;
    if (r) {
      el.querySelector('.name').textContent = r.label.replace(/^Boss Arena — /, '');
      el.querySelector('.depth').textContent =
        r.isBoss ? 'the deep chamber' : r.isEntry ? 'threshold' : 'depth ' + r.depth;
      el.classList.add('show');
      zoneTimer = 3.4;
    } else { el.classList.remove('show'); zoneTimer = 0; }
  }
  if (zoneTimer > 0) { zoneTimer -= dt; if (zoneTimer <= 0) el.classList.remove('show'); }
}

/* -------------------------------- minimap --------------------------------- */
let mmTimer = 0;
function drawMinimap() {
  const cv = document.getElementById('minimap');
  if (!cv || !layout || !App.showMap) return;
  const ctx = cv.getContext('2d');
  const b = layout.bounds();
  const pad = 8;
  const sx = (cv.width - pad * 2) / (b.x1 - b.x0), sz = (cv.height - pad * 2) / (b.z1 - b.z0);
  const s = Math.min(sx, sz);
  ctx.clearRect(0, 0, cv.width, cv.height);
  ctx.fillStyle = 'rgba(8,9,11,0.72)';
  ctx.fillRect(0, 0, cv.width, cv.height);
  const X = x => pad + (x - b.x0) * s, Z = z => pad + (z - b.z0) * s;
  ctx.fillStyle = '#2a2723';
  for (const c of layout.corridors) {
    if (c.horiz) ctx.fillRect(X(Math.min(c.a, c.b) * CELL), Z(c.c0 * CELL), Math.abs(c.b - c.a) * CELL * s, (c.c1 - c.c0 + 1) * CELL * s);
    else ctx.fillRect(X(c.c0 * CELL), Z(Math.min(c.a, c.b) * CELL), (c.c1 - c.c0 + 1) * CELL * s, Math.abs(c.b - c.a) * CELL * s);
  }
  for (const r of layout.rooms) {
    ctx.fillStyle = r.isBoss ? '#5a2a1c' : r.isEntry ? '#25382e' : '#37332c';
    ctx.fillRect(X(r.x * CELL), Z(r.z * CELL), r.w * CELL * s, r.d * CELL * s);
    ctx.strokeStyle = 'rgba(200,180,140,0.20)'; ctx.lineWidth = 1;
    ctx.strokeRect(X(r.x * CELL), Z(r.z * CELL), r.w * CELL * s, r.d * CELL * s);
  }
  if (hero) {
    ctx.fillStyle = '#e8b06a';
    ctx.beginPath(); ctx.arc(X(hero.pos.x), Z(hero.pos.y), 3.2, 0, 6.283); ctx.fill();
  }
}

/* -------------------------------- readout --------------------------------- */
function updateReadout() {
  const st = layout.stats();
  document.getElementById('rDungeon').textContent = THEMES[App.theme].name;
  document.getElementById('rRooms').textContent = st.rooms;
  document.getElementById('rArea').textContent = st.area.toLocaleString() + ' m²';
  document.getElementById('rWalls').textContent = st.walls.toLocaleString();
  document.getElementById('rLights').textContent = world.fires.length;
}
function updatePerfReadout() {
  const info = renderer.info;
  document.getElementById('rDraws').textContent = info.render.calls;
  document.getElementById('rTris').textContent = (info.render.triangles / 1000).toFixed(0) + 'k';
  document.getElementById('rFps').textContent = fps.toFixed(0);
  const r = hero && hero.roomAt();
  document.getElementById('rRoom').textContent = r ? r.label : 'Passage';
}

/* --------------------------------- loop ----------------------------------- */
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(0.05, clock.getDelta());
  const t = clock.elapsedTime;

  if (hero) hero.update(dt, readMove());
  loadUpdate(dt, t);
  checkZone(dt);
  updateCamera(dt);
  if (lightPool) lightPool.update(dt, camTarget);
  if (flames) flames.material.uniforms.uTime.value = t;
  if (embers) embers.material.uniforms.uTime.value = t;
  if (dust) dust.material.uniforms.uTime.value = t;
  if (gradePass) gradePass.uniforms.uTime.value = t;
  if (MAT.water) { MAT.water.normalMap.offset.x = t * 0.012; MAT.water.normalMap.offset.y = t * 0.008; }
  if (MAT.coal) MAT.coal.emissiveIntensity = 1.25 + Math.sin(t * 5.1) * 0.35;

  renderer.info.reset();
  if (App.post && !postFailed) {
    try { composer.render(); }
    catch (err) {
      postFailed = true;
      console.warn('post-processing failed, falling back to direct render', err);
      renderer.render(scene, camera);
    }
  } else {
    renderer.render(scene, camera);
  }

  if (captureNext) {
    captureNext = false;
    const a = document.createElement('a');
    a.download = `ashen_depths_${App.theme}_${App.seed}.png`;
    a.href = renderer.domElement.toDataURL('image/png');
    a.click();
  }

  fpsAcc++; fpsTime += dt;
  if (fpsTime > 0.5) { fps = fpsAcc / fpsTime; fpsAcc = 0; fpsTime = 0; updatePerfReadout(); }
  mmTimer -= dt;
  if (mmTimer <= 0) { mmTimer = 0.12; drawMinimap(); }
  frameCount++;
}

/* --------------------------------- UI ------------------------------------- */
function initUI() {
  const $ = id => document.getElementById(id);
  const themeSel = $('theme');
  for (const k in THEMES) {
    const o = document.createElement('option'); o.value = k; o.textContent = THEMES[k].name; themeSel.appendChild(o);
  }
  themeSel.value = App.theme;
  themeSel.onchange = () => { App.theme = themeSel.value; generate(); };
  const sizeSel = $('size');
  sizeSel.value = App.size;
  sizeSel.onchange = () => { App.size = sizeSel.value; generate(); };
  const qSel = $('quality');
  for (const k in QUALITY) { const o = document.createElement('option'); o.value = k; o.textContent = QUALITY[k].label; qSel.appendChild(o); }
  qSel.value = App.quality;
  qSel.onchange = () => { App.quality = qSel.value; applyQuality(); };
  $('seed').value = App.seed;
  $('seed').onchange = e => { App.seed = (parseInt(e.target.value, 10) || 0) >>> 0; generate(); };
  $('regen').onclick = () => { App.seed = (Math.random() * 1e9) | 0; $('seed').value = App.seed; generate(); };
  $('shot').onclick = () => { captureNext = true; };
  const ex = $('exposure');
  ex.oninput = () => { renderer.toneMappingExposure = parseFloat(ex.value); $('exposureV').textContent = parseFloat(ex.value).toFixed(2); };
  const lg = $('lightgain');
  lg.oninput = () => { App.lightGain = parseFloat(lg.value); if (lightPool) lightPool.gain = App.lightGain; $('lightgainV').textContent = App.lightGain.toFixed(2); };
  const fg = $('fog');
  fg.value = preset.fogD; $('fogV').textContent = preset.fogD.toFixed(4);
  fg.oninput = () => { const v = parseFloat(fg.value); if (scene.fog) scene.fog.density = v; $('fogV').textContent = v.toFixed(4); };
  $('tPost').onclick = () => { App.post = !App.post; syncToggles(); };
  $('tBloom').onclick = () => { App.bloom = !App.bloom; buildComposer(); syncToggles(); };
  $('tSsao').onclick = () => { App.ssao = !App.ssao; buildComposer(); syncToggles(); };
  $('tLoad').onclick = () => { LOAD.on ? loadStop() : loadStart(); syncToggles(); };
  syncToggles();
  const gr = $('grain');
  gr.oninput = () => { const v = parseFloat(gr.value); gradePass.uniforms.uGrain.value = v; $('grainV').textContent = v.toFixed(3); };
}

/* ------------------------------ boot sequence ------------------------------ */
const frame = () => new Promise(r => requestAnimationFrame(() => setTimeout(r, 0)));
async function boot() {
  const status = document.getElementById('bootstatus');
  const say = async (msg) => { status.textContent = msg; await frame(); };

  initRenderer();
  await say('carving flagstone');
  TEX.floor = buildFloorAtlas(512);
  await say('quarrying wall block');
  TEX.wall = buildWallStone(512);
  await say('seasoning timber and iron');
  TEX.wood = buildWood(256);
  TEX.metal = buildMetal(256);
  await say('bleaching bone');
  TEX.bone = buildBone(256);
  TEX.cloth = buildCloth(256);
  TEX.dirt = buildDirt(256);
  await say('flooding the cisterns');
  TEX.waterN = buildWaterNormal(256);
  await say('staining the stone');
  TEX.blot = stampAlpha(256, 'blot', 11);
  TEX.crack = stampAlpha(256, 'crack', 23);
  TEX.scatter = stampAlpha(256, 'rubblescatter', 37);
  TEX.grad = radial(128, 0.0, 0.5, 2.0);
  TEX.flame = flameAlpha(128);
  await say('assembling the kit');
  buildMaterialLibrary();
  buildGeometryLibrary();
  for (const k in GEO) KEEP_GEO.add(GEO[k]);
  await say('raising walls');
  preset = LIGHT_PRESETS[THEMES[App.theme].light];
  applyQuality();
  generate();
  await say('lighting the braziers');
  initInput();
  initUI();
  document.getElementById('boot').classList.add('gone');
  animate();
}
/* a small handle for tuning and automated capture */
window.AD = {
  get app() { return App; }, get scene() { return scene; }, get world() { return world; },
  get layout() { return layout; }, get hero() { return hero; }, get renderer() { return renderer; },
  get camera() { return camera; }, get ssaoPass() { return ssaoPass; }, get composer() { return composer; },
  setQuality(q) { App.quality = q; const s = document.getElementById('quality'); if (s) s.value = q; applyQuality(); },
  setPost(p, b, a) { App.post = p; App.bloom = b; App.ssao = a; buildComposer(); syncToggles(); },
  setDpr(v) { renderer.setPixelRatio(v); composer.setPixelRatio(v); },
  setChunk(m) { CHUNK_M = m; generate(); },
  gameMode() { CHUNK_M = 20; App.ssao = false; App.bloom = true; App.post = true; App.quality = 'game';
    const s = document.getElementById('quality'); if (s) s.value = 'game'; applyQuality(); generate(); syncToggles(); },
  get chunkSize() { return CHUNK_M; },
  meshCount() { return world ? world.kit.meshes.length : 0; },
  load(on, cfg) { if (cfg) Object.assign(LOAD.cfg, cfg); on ? loadStart() : loadStop(); syncToggles(); return LOAD.on; },
  get LOAD() { return LOAD; },
  setTheme(t) { App.theme = t; const s = document.getElementById('theme'); if (s) s.value = t; generate(); },
  setSize(z) { App.size = z; const s = document.getElementById('size'); if (s) s.value = z; generate(); },
  setSeed(n) { App.seed = n >>> 0; const s = document.getElementById('seed'); if (s) s.value = App.seed; generate(); },
  view(yaw, pitch, dist) { if (yaw !== undefined) camYaw = yaw; if (pitch !== undefined) camPitch = pitch; if (dist !== undefined) camDist = dist; },
  warp(x, z) { if (hero) { hero.path = null; hero.pos.set(x, z); hero.obj.position.set(x, 0, z); camTarget.set(x, 0.9, z); } },
  gotoRoom(i) { const r = layout.rooms[i % layout.rooms.length]; const p = layout.worldOf(Math.round(r.cx), Math.round(r.cz)); this.warp(p[0], p[1]); return r.label; },
  frames() { return frameCount; }
};

boot();
