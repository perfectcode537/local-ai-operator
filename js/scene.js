// Hero 3D scene: the office PC as the operator core, workspaces in orbit,
// and task packets travelling between them.
import * as THREE from 'three';

const canvas = document.getElementById('scene');
const hero = document.querySelector('.hero');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const GREEN = 0x00A651;
const GOLD = 0xFFCD00;
const INK = 0x0C1D16;

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x050E0B, 14, 30);

const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
camera.position.set(0, 4.2, 13);
camera.lookAt(0, 0.6, 0);

// lights
scene.add(new THREE.AmbientLight(0xbfd8cc, 0.55));
const key = new THREE.DirectionalLight(0xffffff, 1.4);
key.position.set(5, 8, 6);
scene.add(key);
const goldLight = new THREE.PointLight(GOLD, 18, 12, 1.6);
goldLight.position.set(0, 2.4, 0);
scene.add(goldLight);
const greenLight = new THREE.PointLight(GREEN, 14, 14, 1.6);
greenLight.position.set(-3, 1, 3);
scene.add(greenLight);

const root = new THREE.Group();
scene.add(root);

// ---------- helpers ----------
function glowTexture(hex) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const col = new THREE.Color(hex);
  const rgb = `${Math.round(col.r * 255)},${Math.round(col.g * 255)},${Math.round(col.b * 255)}`;
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, `rgba(${rgb},1)`);
  grad.addColorStop(0.25, `rgba(${rgb},0.55)`);
  grad.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
const glowGold = glowTexture(GOLD);
const glowGreen = glowTexture(GREEN);

function labelSprite(text, sub) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 128;
  const g = c.getContext('2d');
  g.font = '700 64px Inter, Segoe UI, sans-serif';
  g.fillStyle = '#E8F0EC';
  g.textAlign = 'center';
  g.fillText(text, 128, 66);
  g.font = '500 24px JetBrains Mono, Consolas, monospace';
  g.fillStyle = '#8EA398';
  g.fillText(sub, 128, 106);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  s.scale.set(1.3, 0.65, 1);
  return s;
}

// ---------- floor ----------
const grid = new THREE.GridHelper(30, 30, 0x1f4a37, 0x123326);
grid.material.transparent = true;
grid.material.opacity = 0.55;
grid.position.y = -1.2;
root.add(grid);

const ringGeo = new THREE.RingGeometry(4.15, 4.2, 128);
const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: GOLD, transparent: true, opacity: 0.35, side: THREE.DoubleSide }));
ring.rotation.x = -Math.PI / 2;
ring.position.y = -1.18;
root.add(ring);

const ring2 = new THREE.Mesh(new THREE.RingGeometry(2.0, 2.03, 96), new THREE.MeshBasicMaterial({ color: GREEN, transparent: true, opacity: 0.5, side: THREE.DoubleSide }));
ring2.rotation.x = -Math.PI / 2;
ring2.position.y = -1.18;
root.add(ring2);

// ---------- core (the office PC) ----------
const core = new THREE.Group();
root.add(core);

const caseGeo = new THREE.BoxGeometry(1.5, 2.3, 1.7);
const caseMat = new THREE.MeshStandardMaterial({ color: INK, metalness: 0.6, roughness: 0.35 });
const caseMesh = new THREE.Mesh(caseGeo, caseMat);
caseMesh.position.y = 0;
core.add(caseMesh);

const edges = new THREE.LineSegments(new THREE.EdgesGeometry(caseGeo), new THREE.LineBasicMaterial({ color: GOLD, transparent: true, opacity: 0.9 }));
core.add(edges);

// front panel: GPU slots glowing (three cards)
const slots = [];
for (let i = 0; i < 3; i++) {
  const slot = new THREE.Mesh(
    new THREE.BoxGeometry(1.1, 0.08, 0.02),
    new THREE.MeshBasicMaterial({ color: GREEN })
  );
  slot.position.set(0, -0.55 + i * 0.32, 0.86);
  core.add(slot);
  slots.push(slot);
}
// status light
const statusDot = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 16), new THREE.MeshBasicMaterial({ color: GOLD }));
statusDot.position.set(0.5, 0.95, 0.86);
core.add(statusDot);

const coreGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowGreen, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }));
coreGlow.scale.set(6, 6, 1);
coreGlow.position.y = -0.2;
core.add(coreGlow);

// shield: wireframe policy layer around the core
const shield = new THREE.Mesh(
  new THREE.IcosahedronGeometry(1.95, 1),
  new THREE.MeshBasicMaterial({ color: GOLD, wireframe: true, transparent: true, opacity: 0.12 })
);
shield.position.y = 0.05;
core.add(shield);

// ---------- workspaces ----------
const WS = [
  ['A', 'retail'], ['B', 'property'], ['C', 'trades'], ['D', 'admin'],
  ['E', 'tenders'], ['F', 'research'], ['G', 'logistics'], ['H', 'support']
];
const R = 4.2;
const workspaces = WS.map(([id, kind], i) => {
  const a = (i / WS.length) * Math.PI * 2;
  const g = new THREE.Group();
  const geo = new THREE.BoxGeometry(0.7, 0.7, 0.7);
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0x10261D, metalness: 0.4, roughness: 0.4 }));
  const e = new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: GREEN, transparent: true, opacity: 0.9 }));
  g.add(m, e);
  const label = labelSprite(id, kind);
  label.position.y = 0.95;
  g.add(label);
  g.position.set(Math.cos(a) * R, -0.5, Math.sin(a) * R);
  g.userData = { angle: a, phase: Math.random() * Math.PI * 2, edge: e };
  root.add(g);

  // link line from core to workspace
  const pts = [new THREE.Vector3(0, -0.4, 0), new THREE.Vector3(Math.cos(a) * R, -0.5, Math.sin(a) * R)];
  const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineDashedMaterial({ color: 0x2c6b4d, dashSize: 0.12, gapSize: 0.1, transparent: true, opacity: 0.7 }));
  line.computeLineDistances();
  root.add(line);
  return g;
});

// ---------- packets ----------
const packets = [];
function spawnPacket() {
  const target = workspaces[Math.floor(Math.random() * workspaces.length)];
  const outbound = Math.random() > 0.35;
  const from = outbound ? new THREE.Vector3(0, 0.3, 0) : target.position.clone();
  const to = outbound ? target.position.clone() : new THREE.Vector3(0, 0.3, 0);
  const mid = from.clone().lerp(to, 0.5);
  mid.y += 1.4 + Math.random() * 0.8;
  const curve = new THREE.QuadraticBezierCurve3(from, mid, to);
  const gold = outbound;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: gold ? glowGold : glowGreen, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  s.scale.set(0.45, 0.45, 1);
  root.add(s);

  // faint trail
  const trailGeo = new THREE.BufferGeometry().setFromPoints(curve.getPoints(40));
  const trail = new THREE.Line(trailGeo, new THREE.LineBasicMaterial({ color: gold ? GOLD : GREEN, transparent: true, opacity: 0 }));
  root.add(trail);

  packets.push({ s, trail, curve, t: 0, speed: 0.35 + Math.random() * 0.25, target });
}

// ---------- particles (dust) ----------
const dustGeo = new THREE.BufferGeometry();
const N = 260;
const pos = new Float32Array(N * 3);
for (let i = 0; i < N; i++) {
  pos[i * 3] = (Math.random() - 0.5) * 22;
  pos[i * 3 + 1] = Math.random() * 8 - 1;
  pos[i * 3 + 2] = (Math.random() - 0.5) * 22;
}
dustGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: 0x8EA398, size: 0.035, transparent: true, opacity: 0.6 }));
root.add(dust);

// ---------- layout ----------
function resize() {
  const w = hero.clientWidth;
  const h = hero.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  // keep the scene to the right of the headline on wide screens
  if (w > 980) {
    root.position.set(4.6, 0, 0);
    root.scale.setScalar(1);
    canvas.style.opacity = '1';
  } else {
    root.position.set(0, -0.8, -2);
    root.scale.setScalar(0.8);
    canvas.style.opacity = '0.35';
  }
}
window.addEventListener('resize', resize);
resize();

// ---------- interaction ----------
const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
window.addEventListener('pointermove', (e) => {
  mouse.tx = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.ty = (e.clientY / window.innerHeight) * 2 - 1;
});

let visible = true;
new IntersectionObserver(([en]) => { visible = en.isIntersecting; }, { threshold: 0 }).observe(hero);

// ---------- loop ----------
const clock = new THREE.Clock();
let spawnTimer = 0;
function tick() {
  requestAnimationFrame(tick);
  if (!visible) return;
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;

  mouse.x += (mouse.tx - mouse.x) * 0.04;
  mouse.y += (mouse.ty - mouse.y) * 0.04;

  const spin = reduceMotion ? 0 : t * 0.06;
  root.rotation.y = spin + mouse.x * 0.35;
  root.rotation.x = mouse.y * 0.08;

  core.position.y = Math.sin(t * 1.2) * 0.06;
  shield.rotation.y = t * 0.15;
  shield.rotation.x = t * 0.07;
  statusDot.material.color.setHex(Math.sin(t * 4) > 0 ? GOLD : 0x6b5600);
  slots.forEach((s, i) => { s.material.color.setHSL(0.41, 1, 0.22 + 0.14 * (0.5 + 0.5 * Math.sin(t * 3 + i * 1.3))); });
  coreGlow.material.opacity = 0.45 + Math.sin(t * 1.5) * 0.1;

  workspaces.forEach((g) => {
    g.position.y = -0.5 + Math.sin(t * 1.1 + g.userData.phase) * 0.12;
    g.children[0].rotation.y = t * 0.3 + g.userData.phase;
    g.children[1].rotation.y = t * 0.3 + g.userData.phase;
  });

  if (!reduceMotion) {
    spawnTimer -= dt;
    if (spawnTimer <= 0 && packets.length < 14) {
      spawnPacket();
      spawnTimer = 0.35 + Math.random() * 0.45;
    }
  }

  for (let i = packets.length - 1; i >= 0; i--) {
    const p = packets[i];
    p.t += dt * p.speed;
    const k = Math.min(p.t, 1);
    p.s.position.copy(p.curve.getPoint(k));
    p.trail.material.opacity = Math.sin(k * Math.PI) * 0.35;
    if (p.t >= 1) {
      p.target.userData.edge.material.color.setHex(GOLD);
      setTimeout(() => p.target.userData.edge.material.color.setHex(GREEN), 260);
      root.remove(p.s, p.trail);
      p.s.material.dispose();
      p.trail.geometry.dispose();
      p.trail.material.dispose();
      packets.splice(i, 1);
    }
  }

  dust.rotation.y = t * 0.01;
  renderer.render(scene, camera);
}
tick();
