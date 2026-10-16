// "How it works" - a pinned 3D story in four chapters: Plan, Act, Verify, Report.
// Scroll progress (0..1) arrives from main.js through the 'how:progress' event.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const canvas = document.getElementById('core3d');
const host = canvas.parentElement;
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const IVORY = 0xF4F1EA, GOLD = 0xDDB04B, GREEN = 0x3FAE7A, INK = 0x0B1511;

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(INK, 9, 21);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
const key = new THREE.DirectionalLight(0xfff3dc, 2.2);
key.position.set(4, 7, 5);
scene.add(key, new THREE.AmbientLight(0x9fb8aa, 0.25));
const rim = new THREE.PointLight(GOLD, 30, 10, 2);
rim.position.set(-2.5, 2.5, -2);
scene.add(rim);

const world = new THREE.Group();
scene.add(world);

/* ---------- helpers ---------- */
function glow(hex, size = 128) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const col = new THREE.Color(hex);
  const rgb = `${col.r * 255 | 0},${col.g * 255 | 0},${col.b * 255 | 0}`;
  const gr = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gr.addColorStop(0, `rgba(${rgb},1)`); gr.addColorStop(.3, `rgba(${rgb},.5)`); gr.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = gr; g.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const glowGold = glow(GOLD), glowGreen = glow(GREEN);
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const smooth = (v) => { v = clamp01(v); return v * v * (3 - 2 * v); };

/* ---------- floor ---------- */
const floor = new THREE.Mesh(new THREE.CircleGeometry(60, 96), new THREE.MeshStandardMaterial({ color: 0x0C1813, metalness: 0.55, roughness: 0.6 }));
floor.rotation.x = -Math.PI / 2;
floor.position.y = -1.6;
world.add(floor);
for (const [r, col, op] of [[2.1, GOLD, .7], [3.8, 0x2A4A3B, .9], [5.6, 0x1F3A2E, .8]]) {
  const ring = new THREE.Mesh(new THREE.RingGeometry(r, r + 0.012, 160), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: op }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = -1.59; world.add(ring);
}

/* ---------- the operator core ---------- */
const core = new THREE.Group();
world.add(core);
const body = new THREE.Mesh(
  new RoundedBoxGeometry(1.5, 2.7, 1.5, 6, 0.14),
  new THREE.MeshPhysicalMaterial({ color: 0x14241D, metalness: 0.75, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.15 })
);
core.add(body);
const frame = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.56, 2.76, 1.56)), new THREE.LineBasicMaterial({ color: GOLD, transparent: true, opacity: .55 }));
core.add(frame);
const slots = [];
for (let i = 0; i < 3; i++) {
  const s = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.05, 0.02), new THREE.MeshBasicMaterial({ color: GREEN }));
  s.position.set(0, -0.7 + i * 0.32, 0.765);
  core.add(s); slots.push(s);
}
const eye = new THREE.Mesh(new THREE.CircleGeometry(0.16, 48), new THREE.MeshBasicMaterial({ color: GOLD }));
eye.position.set(0, 0.75, 0.766);
core.add(eye);
const eyeRing = new THREE.Mesh(new THREE.RingGeometry(0.24, 0.26, 64), new THREE.MeshBasicMaterial({ color: IVORY, transparent: true, opacity: .6 }));
eyeRing.position.copy(eye.position).z += 0.001;
core.add(eyeRing);
const coreGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowGreen, transparent: true, opacity: .35, depthWrite: false, blending: THREE.AdditiveBlending }));
coreGlow.scale.set(6, 6, 1); coreGlow.position.y = -0.6;
core.add(coreGlow);

/* ---------- workspaces (nodes) ---------- */
const NODES = 6, R = 3.8;
const nodes = [];
function letterTexture(ch) {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#F4F1EA'; g.font = '400 190px "Instrument Serif", Georgia, serif';
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(ch, 128, 140);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
for (let i = 0; i < NODES; i++) {
  const a = (i / NODES) * Math.PI * 2 + 0.3;
  const letter = 'ABCDEF'[i];
  const m = new THREE.Mesh(new RoundedBoxGeometry(0.55, 0.55, 0.55, 4, 0.07), new THREE.MeshPhysicalMaterial({ color: 0xE9E3D6, metalness: 0.1, roughness: 0.35, clearcoat: .6, emissive: new THREE.Color(0x000000) }));
  const tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: letterTexture(letter), transparent: true, depthWrite: false }));
  tag.scale.set(.62, .62, 1); tag.position.y = .72;
  m.add(tag);
  m.userData.letter = letter; m.userData.tag = tag;
  m.position.set(Math.cos(a) * R, -0.9, Math.sin(a) * R);
  Object.assign(m.userData, { a, ph: Math.random() * 6.28 });
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowGreen, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  halo.scale.set(1.8, 1.8, 1);
  m.add(halo);
  m.userData.halo = halo;
  world.add(m); nodes.push(m);
}

/* ---------- plan plates ---------- */
const plates = [];
for (let i = 0; i < 5; i++) {
  const g = new THREE.Group();
  const p = new THREE.Mesh(new RoundedBoxGeometry(1.7, 0.05, 1.05, 2, 0.02), new THREE.MeshPhysicalMaterial({ color: IVORY, metalness: 0, roughness: .4, transparent: true, opacity: .92 }));
  const e = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.72, 0.06, 1.07)), new THREE.LineBasicMaterial({ color: GOLD, transparent: true }));
  const line = new THREE.Mesh(new THREE.PlaneGeometry(1.1 - i * 0.12, 0.05), new THREE.MeshBasicMaterial({ color: 0x0F5A3C }));
  line.rotation.x = -Math.PI / 2; line.position.set(-0.1, 0.03, 0);
  g.add(p, e, line);
  g.position.set(2.15, -1.5, 0.4);
  world.add(g); plates.push(g);
}

/* ---------- packets ---------- */
const packets = [];
function spawnPacket() {
  const n = nodes[(Math.random() * NODES) | 0];
  const from = new THREE.Vector3(0, 0.2, 0), to = n.position.clone();
  const mid = from.clone().lerp(to, .5); mid.y += 1.6 + Math.random();
  const curve = new THREE.QuadraticBezierCurve3(from, mid, to);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowGold, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  s.scale.set(.42, .42, 1);
  const trail = new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(36)), new THREE.LineBasicMaterial({ color: GOLD, transparent: true, opacity: 0 }));
  world.add(s, trail);
  packets.push({ s, trail, curve, t: 0, sp: .5 + Math.random() * .35, n });
}

/* ---------- verify scanner ---------- */
const scanner = new THREE.Mesh(new THREE.TorusGeometry(1.25, 0.015, 8, 120), new THREE.MeshBasicMaterial({ color: GREEN, transparent: true, opacity: 0 }));
scanner.rotation.x = Math.PI / 2;
world.add(scanner);
const sweep = new THREE.Mesh(new THREE.RingGeometry(0.2, 0.24, 120), new THREE.MeshBasicMaterial({ color: GREEN, transparent: true, opacity: 0, side: THREE.DoubleSide }));
sweep.rotation.x = -Math.PI / 2; sweep.position.y = -1.58;
world.add(sweep);

/* ---------- report document ---------- */
function reportTexture() {
  const c = document.createElement('canvas'); c.width = 640; c.height = 820;
  const g = c.getContext('2d');
  g.fillStyle = '#F7F4EE'; g.fillRect(0, 0, 640, 820);
  g.fillStyle = '#0B1511'; g.font = '400 64px "Instrument Serif", serif'; g.fillText('Result report', 48, 110);
  g.font = '500 22px "JetBrains Mono", monospace'; g.fillStyle = '#66716B'; g.fillText('RUN R-5521  ·  BUSINESS A', 48, 160);
  g.fillStyle = '#C9962E'; g.fillRect(48, 190, 544, 2);
  const rows = [['Verified steps', '7 / 7', '#0F5A3C'], ['Failed (reported)', '0', '#C2412F'], ['Skipped after resume', '2', '#C9962E'], ['Spent', 'A$25', '#0B1511']];
  rows.forEach(([k, v, col], i) => {
    const y = 270 + i * 112;
    g.fillStyle = '#66716B'; g.font = '400 26px "Inter Tight", sans-serif'; g.fillText(k, 48, y);
    g.fillStyle = col; g.font = '400 64px "Instrument Serif", serif'; g.fillText(v, 48, y + 64);
    g.fillStyle = 'rgba(11,21,17,.1)'; g.fillRect(48, y + 84, 544, 1);
  });
  g.fillStyle = '#0F5A3C'; g.beginPath(); g.arc(560, 110, 34, 0, 7); g.fill();
  g.strokeStyle = '#F7F4EE'; g.lineWidth = 7; g.beginPath(); g.moveTo(543, 110); g.lineTo(555, 123); g.lineTo(578, 97); g.stroke();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
const doc = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.8), new THREE.MeshBasicMaterial({ map: reportTexture(), transparent: true, opacity: 0, side: THREE.DoubleSide, toneMapped: false, fog: false }));
world.add(doc);
if (document.fonts) document.fonts.ready.then(() => {
  doc.material.map = reportTexture(); doc.material.needsUpdate = true;
  nodes.forEach((n) => { n.userData.tag.material.map = letterTexture(n.userData.letter); n.userData.tag.material.needsUpdate = true; });
});

/* ---------- dust ---------- */
const DN = 360, dpos = new Float32Array(DN * 3);
for (let i = 0; i < DN; i++) { dpos[i * 3] = (Math.random() - .5) * 20; dpos[i * 3 + 1] = Math.random() * 9 - 2; dpos[i * 3 + 2] = (Math.random() - .5) * 20; }
const dgeo = new THREE.BufferGeometry(); dgeo.setAttribute('position', new THREE.BufferAttribute(dpos, 3));
const dust = new THREE.Points(dgeo, new THREE.PointsMaterial({ color: 0xC9B98E, size: .025, transparent: true, opacity: .55 }));
world.add(dust);

/* ---------- camera path, one key per chapter ---------- */
const CAMS = [
  { p: new THREE.Vector3(7.4, 2.8, 8.8), l: new THREE.Vector3(0.8, -0.3, 0) },
  { p: new THREE.Vector3(-7.0, 5.0, 8.8), l: new THREE.Vector3(0, -0.5, 0) },
  { p: new THREE.Vector3(0.8, 8.2, 9.4), l: new THREE.Vector3(0, -0.7, 0) },
  { p: new THREE.Vector3(3.4, 1.8, 7.6), l: new THREE.Vector3(0.6, 0.3, 0) }
];
let mobile = false;
function resize() {
  const w = host.clientWidth, h = host.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  mobile = w < 900;
  camera.fov = mobile ? 48 : 34;
  camera.updateProjectionMatrix();
  // shift the projection so the scene sits right of the text (desktop) or above it (mobile)
  if (mobile) camera.setViewOffset(w, h, 0, h * 0.2, w, h);
  else camera.setViewOffset(w, h, -w * 0.2, 0, w, h);
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

let target = window.__howProgress || 0, prog = target;
window.addEventListener('how:progress', (e) => { target = e.detail; });
const mouse = { x: 0, y: 0 };
window.addEventListener('pointermove', (e) => { mouse.x = e.clientX / innerWidth - .5; mouse.y = e.clientY / innerHeight - .5; });
let visible = false;
new IntersectionObserver(([en]) => { visible = en.isIntersecting; }, { threshold: 0 }).observe(host);

const tmpP = new THREE.Vector3(), tmpL = new THREE.Vector3();
const clock = new THREE.Clock();
let spawn = 0;

function tick() {
  requestAnimationFrame(tick);
  const dt = Math.min(clock.getDelta(), .05);
  if (!visible) return;
  const t = clock.elapsedTime;
  prog += (target - prog) * (1 - Math.exp(-dt * 7));
  const q = prog * 4; // 0..4

  // camera between chapter keys
  const i0 = Math.min(3, Math.floor(q)), i1 = Math.min(3, i0 + 1), f = smooth(q - i0);
  tmpP.lerpVectors(CAMS[i0].p, CAMS[i1].p, f);
  tmpL.lerpVectors(CAMS[i0].l, CAMS[i1].l, f);
  if (mobile) tmpP.multiplyScalar(1.22);
  tmpP.x += mouse.x * .8; tmpP.y -= mouse.y * .5;
  camera.position.copy(tmpP);
  camera.lookAt(tmpL);

  // core idles
  core.position.y = Math.sin(t * 1.1) * .05;
  core.rotation.y = Math.sin(t * .3) * .12;
  slots.forEach((s, i) => s.material.color.setHSL(.42, .5, .3 + .2 * (.5 + .5 * Math.sin(t * 3 + i))));
  eyeRing.scale.setScalar(1 + .08 * Math.sin(t * 2));

  // 01 PLAN - plates rise one by one, later fold into the report
  const planK = smooth(q / .9), fold = smooth((q - 2.9) / .45);
  plates.forEach((g, i) => {
    const k = smooth(planK * 5 - i);
    const y = -1.5 + k * (0.15 + i * 0.36);
    g.position.set(2.15 + fold * 0.25, y + fold * (0.4 - y), 0.4 + fold * 0.6);
    g.scale.setScalar(Math.max(.001, 1 - fold * .95));
    g.rotation.y = -0.35 + Math.sin(t * .6 + i) * .03;
    g.children[1].material.opacity = .4 + .6 * k;
  });

  // 02 ACT - packets travel to the workspaces
  const actK = clamp01(1 - Math.abs(q - 1.5) / 1.1);
  if (!reduced) {
    spawn -= dt;
    if (actK > .05 && spawn <= 0 && packets.length < 18) { spawnPacket(); spawn = .5 - actK * .38; }
  }
  for (let i = packets.length - 1; i >= 0; i--) {
    const p = packets[i];
    p.t += dt * p.sp;
    const k = Math.min(1, p.t);
    p.s.position.copy(p.curve.getPoint(k));
    p.trail.material.opacity = Math.sin(k * Math.PI) * .45;
    if (p.t >= 1) {
      p.n.userData.hit = 1;
      world.remove(p.s, p.trail); p.s.material.dispose(); p.trail.geometry.dispose(); p.trail.material.dispose();
      packets.splice(i, 1);
    }
  }

  // 03 VERIFY - a scan ring passes over the core, then sweeps out to every workspace
  const vk = clamp01(q - 2);
  const verOn = clamp01(1 - Math.abs(q - 2.5) / .7);
  scanner.position.y = -1.4 + ((vk * 2.2) % 1) * 2.8;
  scanner.material.opacity = verOn * .9;
  sweep.scale.setScalar(.5 + vk * 18);
  sweep.material.opacity = verOn * (1 - vk) * .9;

  nodes.forEach((n, i) => {
    n.position.y = -0.9 + Math.sin(t * 1.2 + n.userData.ph) * .08;
    n.rotation.y = t * .4 + n.userData.ph;
    n.userData.tag.position.set(0, .72, 0);
    const verified = q > 2 && vk * NODES * 1.25 > i ? 1 : 0;
    n.userData.hit = Math.max(0, (n.userData.hit || 0) - dt * 1.6);
    n.material.emissive.setRGB(0.05 * n.userData.hit + verified * 0.03, 0.22 * verified + 0.12 * n.userData.hit, 0.12 * verified);
    n.userData.halo.material.opacity = Math.max(n.userData.hit * .7, verified * .45);
  });

  // 04 REPORT - the document rises in front of the core
  const rk = smooth((q - 3.1) / .5);
  doc.material.opacity = rk;
  const solid = rk > .985;
  if (doc.material.transparent === solid) { doc.material.transparent = !solid; doc.material.needsUpdate = true; }
  doc.renderOrder = 10;
  doc.visible = rk > .01;
  doc.position.set(mobile ? 1.55 : 1.85, 0.45 + (rk - 1) * 1.0, 1.35);
  doc.lookAt(camera.position.x, doc.position.y, camera.position.z);
  doc.rotation.z = (1 - rk) * .12;

  rim.intensity = 22 + Math.sin(t * 1.4) * 6;
  dust.rotation.y = t * .012;
  renderer.render(scene, camera);
}
tick();
