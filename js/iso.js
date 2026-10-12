// Workspace isolation in 3D: each business is a sealed glass cell with its own
// data moving inside. Policy walls sit between cells. A cross-workspace request
// hits the wall and is turned back.
import * as THREE from 'three';

const canvas = document.getElementById('iso');
const stage = canvas.parentElement;
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const GREEN = 0x00A651, GOLD = 0xFFCD00, RED = 0xFF5A4E;

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(34, 2, 0.1, 100);
scene.add(new THREE.AmbientLight(0xcfe3d8, 0.7));
const dir = new THREE.DirectionalLight(0xffffff, 1.2);
dir.position.set(4, 8, 6);
scene.add(dir);

const world = new THREE.Group();
scene.add(world);

const floor = new THREE.GridHelper(40, 40, 0x1f4a37, 0x10291f);
floor.material.transparent = true;
floor.material.opacity = 0.5;
floor.position.y = -1.01;
world.add(floor);

function label(text, sub) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 96;
  const g = c.getContext('2d');
  g.textAlign = 'center';
  g.font = '800 46px Inter, Segoe UI, sans-serif';
  g.fillStyle = '#E8F0EC';
  g.fillText(text, 128, 48);
  g.font = '500 20px JetBrains Mono, Consolas, monospace';
  g.fillStyle = '#8EA398';
  g.fillText(sub, 128, 82);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false }));
  s.scale.set(2.2, 0.82, 1);
  return s;
}

const SIZE = 1.7, GAP = 2.5, COLS = 6;
const cells = [];
const walls = [];

function makeCell(id, name) {
  const g = new THREE.Group();
  const geo = new THREE.BoxGeometry(SIZE, SIZE, SIZE);
  const glass = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
    color: 0x0f2a20, transparent: true, opacity: 0.32, metalness: 0.2, roughness: 0.1, depthWrite: false
  }));
  const edge = new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: GREEN, transparent: true, opacity: 0.95 }));
  g.add(glass, edge);

  // data particles living inside the cell
  const N = 70;
  const pos = new Float32Array(N * 3);
  const vel = [];
  for (let i = 0; i < N; i++) {
    for (let k = 0; k < 3; k++) pos[i * 3 + k] = (Math.random() - 0.5) * SIZE * 0.8;
    vel.push(new THREE.Vector3((Math.random() - 0.5), (Math.random() - 0.5), (Math.random() - 0.5)).multiplyScalar(0.6));
  }
  const pg = new THREE.BufferGeometry();
  pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(pg, new THREE.PointsMaterial({ color: 0x4DD68F, size: 0.06, transparent: true, opacity: 0.95 }));
  g.add(pts);

  const lb = label(id, name);
  lb.position.y = SIZE / 2 + 0.7;
  g.add(lb);

  g.scale.setScalar(0.01);
  world.add(g);
  const cell = { id, g, edge, pts, vel, target: new THREE.Vector3(), born: performance.now() };
  cells.push(cell);
  return cell;
}

function makeWall() {
  const geo = new THREE.PlaneGeometry(SIZE * 1.05, SIZE * 1.05, 6, 6);
  const m = new THREE.MeshBasicMaterial({ color: GOLD, transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false });
  const plane = new THREE.Mesh(geo, m);
  const wire = new THREE.LineSegments(new THREE.WireframeGeometry(geo), new THREE.LineBasicMaterial({ color: GOLD, transparent: true, opacity: 0.35 }));
  const g = new THREE.Group();
  g.add(plane, wire);
  g.rotation.y = Math.PI / 2;
  world.add(g);
  const w = { g, plane, wire, flash: 0 };
  walls.push(w);
  return w;
}

function layout() {
  const n = cells.length;
  const rows = Math.ceil(n / COLS);
  cells.forEach((c, i) => {
    const row = Math.floor(i / COLS), col = i % COLS;
    const inRow = Math.min(COLS, n - row * COLS);
    c.target.set((col - (inRow - 1) / 2) * GAP, 0, (row - (rows - 1) / 2) * GAP * 1.6);
  });
  // a wall between every neighbour in a row
  let wi = 0;
  cells.forEach((c, i) => {
    const next = cells[i + 1];
    if (!next || Math.floor(i / COLS) !== Math.floor((i + 1) / COLS)) return;
    const w = walls[wi] || makeWall();
    w.target = c.target.clone().add(next.target).multiplyScalar(0.5);
    w.pair = [c.id, next.id];
    wi++;
  });
  rowsN = rows;
  const span = Math.min(n, COLS) * GAP;
  camDist = Math.max(7.5, span * 0.82 + rows * 2.2);
}

let camDist = 10, rowsN = 1;
[['A', 'retail'], ['B', 'property'], ['C', 'trades'], ['D', 'admin']].forEach(([i, n]) => makeCell(i, n));
layout();
walls.forEach((w) => w.g.position.copy(w.target));
cells.forEach((c) => c.g.position.copy(c.target));

// denied request
const probes = [];
function cross() {
  const a = cells[0], b = cells[1];
  const wall = walls.find((w) => w.pair && w.pair[0] === a.id && w.pair[1] === b.id) || walls[0];
  const s = new THREE.Mesh(new THREE.SphereGeometry(0.11, 20, 20), new THREE.MeshBasicMaterial({ color: RED }));
  s.position.copy(a.g.position);
  world.add(s);
  const trail = [];
  probes.push({ s, from: a.g.position.clone(), hit: wall.g.position.clone(), wall, t: 0, phase: 0, trail });
}

window.addEventListener('ws:add', (e) => {
  makeCell(e.detail.id, e.detail.kind);
  layout();
});
window.addEventListener('ws:cross', cross);

function resize() {
  const w = stage.clientWidth, h = stage.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(stage);
resize();

const mouse = { x: 0, y: 0 };
stage.addEventListener('pointermove', (e) => {
  const r = stage.getBoundingClientRect();
  mouse.x = (e.clientX - r.left) / r.width - 0.5;
  mouse.y = (e.clientY - r.top) / r.height - 0.5;
});
stage.addEventListener('pointerleave', () => { mouse.x = 0; mouse.y = 0; });

let visible = false;
new IntersectionObserver(([en]) => { visible = en.isIntersecting; }).observe(stage);

const clock = new THREE.Clock();
let curDist = camDist, yaw = 0, pitch = 0;
function tick() {
  requestAnimationFrame(tick);
  if (!visible) { clock.getDelta(); return; }
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;

  yaw += ((reduceMotion ? 0 : Math.sin(t * 0.18) * 0.35) + mouse.x * 0.6 - yaw) * 0.05;
  pitch += (mouse.y * 0.25 - pitch) * 0.05;
  curDist += (camDist - curDist) * 0.05;
  camera.position.set(Math.sin(yaw) * curDist, 2.6 + pitch * 4 + curDist * (0.38 + 0.42 * (rowsN - 1)), Math.cos(yaw) * curDist);
  camera.lookAt(0, -0.1, 0);

  const half = SIZE * 0.4;
  cells.forEach((c, i) => {
    c.g.position.lerp(c.target, 0.08);
    const age = (performance.now() - c.born) / 600;
    c.g.scale.setScalar(Math.min(1, 0.01 + age) ** 0.6);
    c.g.position.y = Math.sin(t * 1.1 + i) * 0.06;
    const arr = c.pts.geometry.attributes.position.array;
    for (let k = 0; k < c.vel.length; k++) {
      for (let a = 0; a < 3; a++) {
        const idx = k * 3 + a;
        arr[idx] += c.vel[k].getComponent(a) * dt;
        if (arr[idx] > half || arr[idx] < -half) c.vel[k].setComponent(a, -c.vel[k].getComponent(a));
      }
    }
    c.pts.geometry.attributes.position.needsUpdate = true;
    c.edge.material.color.lerp(new THREE.Color(GREEN), 0.05);
  });

  walls.forEach((w) => {
    if (w.target) w.g.position.lerp(w.target, 0.08);
    w.flash = Math.max(0, w.flash - dt * 1.4);
    const col = new THREE.Color(GOLD).lerp(new THREE.Color(RED), Math.min(1, w.flash * 1.4));
    w.plane.material.color.copy(col);
    w.wire.material.color.copy(col);
    w.plane.material.opacity = 0.1 + w.flash * 0.45 + Math.sin(t * 2) * 0.02;
    w.wire.material.opacity = 0.3 + w.flash * 0.6;
  });

  for (let i = probes.length - 1; i >= 0; i--) {
    const p = probes[i];
    p.t += dt * (p.phase === 0 ? 1.6 : 1.1);
    if (p.phase === 0) {
      const k = Math.min(p.t, 1);
      p.s.position.lerpVectors(p.from, p.hit, k);
      p.s.position.y += Math.sin(k * Math.PI) * 0.5;
      if (k >= 1) {
        p.phase = 1; p.t = 0; p.wall.flash = 1;
        cells[1].edge.material.color.setHex(RED);
      }
    } else {
      const k = Math.min(p.t, 1);
      p.s.position.lerpVectors(p.hit, p.from, k * 0.7);
      p.s.material.transparent = true;
      p.s.material.opacity = 1 - k;
      if (k >= 1) { world.remove(p.s); p.s.geometry.dispose(); p.s.material.dispose(); probes.splice(i, 1); }
    }
  }

  renderer.render(scene, camera);
}
tick();
