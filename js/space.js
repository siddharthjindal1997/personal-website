// Outside the room: reality has come apart. Black void, the neighbourhood repeating in broken
// floating copies, bright cracks between the copies, and hundreds of the same cat.
import * as THREE from 'three';
import { rng, stopSign } from './textures.js';
import { Kit, kitToon, kitGlow, toon, jag, blob } from './kit.js';
import { makeCat, catGeometry, catMaterial } from './cat.js';
import { meow } from './audio.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const TAU = Math.PI * 2;

/* ---------- specks ---------- */

function stars(renderer) {
  const N = 700, pos = new Float32Array(N * 3), size = new Float32Array(N), seed = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const u = Math.random() * 2 - 1, a = Math.random() * TAU, s = Math.sqrt(1 - u * u), d = 90 + Math.random() * 60;
    pos.set([Math.cos(a) * s * d, u * d, Math.sin(a) * s * d], i * 3);
    size[i] = 0.8 + Math.random() * 1.2;
    seed[i] = Math.random() * 100;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('size', new THREE.BufferAttribute(size, 1));
  geo.setAttribute('seed', new THREE.BufferAttribute(seed, 1));
  return new THREE.Points(geo, new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uScale: { value: renderer.getPixelRatio() } },
    vertexShader: /* glsl */`
      attribute float size; attribute float seed; uniform float uTime; uniform float uScale; varying float vA;
      void main() {
        vA = 0.3 + 0.2 * sin(uTime * (0.5 + fract(seed)) + seed);
        gl_PointSize = size * uScale;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */`
      varying float vA;
      void main() { gl_FragColor = vec4(vec3(0.85, 0.9, 0.95), vA * smoothstep(0.5, 0.2, length(gl_PointCoord - 0.5))); }`,
    transparent: true, depthWrite: false,
  }));
}

/* ---------- the crack between copies of the world ---------- */

function rift(length, width) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(length, width), new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uLen: { value: length }, uW: { value: width } },
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: /* glsl */`
      uniform float uTime, uLen, uW; varying vec2 vUv;
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float noise(vec2 p) {
        vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
      }
      void main() {
        vec2 p = vec2(vUv.x * uLen, (vUv.y - 0.5) * uW);
        float d = abs(p.y) / (uW * 0.5);
        // long flat flecks, crawling along the crack in both directions
        float a = noise(vec2(p.x * 0.9 + uTime * 0.3, p.y * 4.5));
        float b = noise(vec2(p.x * 2.4 - uTime * 0.55, p.y * 8.0 + 4.0));
        float reach = 0.5 + 0.4 * noise(vec2(p.x * 0.18 + uTime * 0.05, 7.0));
        float keep = a * 0.62 + b * 0.38;
        float solid = step(0.34 + (d / reach) * 0.34, keep) * step(d, reach);
        if (solid < 0.5) discard;
        vec3 col = vec3(0.56, 0.93, 0.88);
        col = mix(col, vec3(1.15, 1.2, 1.15), step(0.56, keep - d * 0.2));
        col = mix(col, vec3(1.15, 1.1, 0.55), step(0.82, b) * 0.9);
        col = mix(col, vec3(1.0, 0.68, 0.72), step(0.86, a) * step(0.5, d));
        gl_FragColor = vec4(col, 1.0);
      }`,
    side: THREE.DoubleSide,
  }));
  return mesh;
}

/* ---------- the neighbourhood ---------- */

const ROOF = '#3e312d', WALL = '#8d8a8b', LIT = '#fff0ae', NEON = '#b6f53c', GRASS = '#5d6d50', LAWN_D = '#4e5c46', ROCK = '#2b2829';

// House with a pitched roof, ridge along x: front of the walls is +z.
function house(k, x, z, w, d, h, wall, roof, pitch = 1.3) {
  k.box(w, h, d, x, h / 2, z, wall);
  k.box(w + 0.5, 0.1, d + 0.5, x, h + 0.02, z, roof);
  k.gable(w + 0.5, pitch, d + 0.5, x, h + 0.05, z, roof);
  // shingle marks, scratched in
  const a = Math.atan2(pitch, (d + 0.5) / 2), r = rng((x * 13 + z * 7) | 0);
  for (let i = 0; i < 14; i++) {
    const s = r() < 0.5 ? 1 : -1, t = 0.15 + r() * 0.7, px = x + (r() - 0.5) * (w - 0.3);
    k.box(0.38, 0.02, 0.03, px, h + 0.09 + t * pitch, z + s * (1 - t) * (d + 0.5) / 2 + s * 0.03, '#17110f');
    k.box(0.03, 0.02, 0.2, px + 0.19, h + 0.09 + t * pitch, z + s * (1 - t) * (d + 0.5) / 2 + s * 0.03, '#17110f', [s * a, 0, 0]);
  }
}

function buildBlock() {
  const k = new Kit(), g = new Kit(), r = rng(29);

  // the torn-out ground, and the dirt hanging off it
  const W = 13, D = 7.4;
  const outline = [
    [-W, -D + 1], ...jag([-W, -D + 1], [W, -D], 22, 0.7, r), [W, -D],
    ...jag([W, -D], [W - 0.6, D], 12, 0.9, r), [W - 0.6, D],
    ...jag([W - 0.6, D], [-W + 0.6, D - 0.4], 22, 0.3, r), [-W + 0.6, D - 0.4],
    ...jag([-W + 0.6, D - 0.4], [-W, -D + 1], 12, 0.9, r),
  ];
  k.shard(outline, 0.9, GRASS, ROCK, [0, 0, 0]);
  const rock = new THREE.IcosahedronGeometry(1, 1);
  for (let i = 0; i < 26; i++) {
    const x = (r() - 0.5) * 2 * (W - 3), z = (r() - 0.5) * 2 * (D - 2.5);
    k.add(rock, r() < 0.5 ? ROCK : '#37322f', [x, -1.2 - r() * 0.8, z], [r() * 3, r() * 3, 0], [2 + r() * 2.2, 0.8 + r() * 1.6, 1.6 + r() * 1.8]);
  }

  // street front: kerb, pavement, a strip of road dropping away
  k.box(22, 0.08, 1.05, 0, 0.06, 5.55, '#8d8d91');
  for (let x = -10.5; x < 11; x += 1.5) k.box(0.05, 0.02, 1.05, x, 0.11, 5.55, '#2a2728');
  k.box(22, 0.05, 0.9, 0, 0.03, 6.5, '#2c2a2c');

  // the main house, garage lit up and open
  house(k, -1.2, -1.4, 7.6, 4.8, 2.5, WALL, ROOF, 1.5);
  house(k, -3.2, 0.3, 3.4, 2.4, 2.5, WALL, ROOF, 1.1);
  k.box(3.1, 0.45, 0.1, -3.2, 2.2, 1.56, '#5f5c5e');
  g.box(2.9, 1.85, 0.05, -3.2, 0.95, 1.58, '#fff6d8');
  // hoop
  k.box(0.56, 0.4, 0.04, -3.2, 3.15, 1.62, '#e9e6dc').box(0.26, 0.2, 0.02, -3.2, 3.1, 1.65, '#54504e');
  k.add(new THREE.TorusGeometry(0.13, 0.016, 6, 16), '#d4602c', [-3.2, 2.98, 1.78], [Math.PI / 2, 0, 0]);
  // the driveway, floodlit from the garage
  k.box(3.2, 0.05, 3.3, -3.2, 0.04, 3.2, '#b9b6a8');
  g.box(2.6, 0.03, 2.5, -3.2, 0.075, 2.8, '#fff6dc');
  k.box(0.04, 0.02, 1.7, -2.5, 0.1, 3.6, '#1a1718', [0, 0.7, 0]).box(0.04, 0.02, 1.1, -3.6, 0.1, 3.9, '#1a1718', [0, -0.5, 0]);
  // the front room's window, and the door under its little porch
  g.box(1.8, 0.95, 0.04, 0.55, 1.4, 1.03, LIT);
  for (const x of [-0.05, 0.55, 1.15]) k.box(0.04, 0.95, 0.03, x, 1.4, 1.06, '#2a2526');
  k.box(1.9, 0.36, 0.5, 0.55, 0.2, 1.3, '#6a4238').box(1.4, 0.2, 0.3, 0.55, 0.42, 1.3, '#3c5a34');
  house(k, 2.45, 0.2, 1.05, 1.4, 1.9, '#5d5a5c', ROOF, 0.55);
  k.box(0.62, 1.4, 0.03, 2.45, 0.7, 0.92, '#24201f');
  g.box(0.1, 0.55, 0.02, 2.31, 0.95, 0.94, LIT).box(0.1, 0.55, 0.02, 2.59, 0.95, 0.94, LIT);
  // satellite dish
  k.add(new THREE.SphereGeometry(0.34, 12, 8, 0, TAU, 0, 1.1), '#8a8a8c', [-0.6, 4.25, -1.1], [-0.9, 0.4, 0]);
  // lawn and its glowing patch
  k.box(4.3, 0.05, 4.2, 0.6, 0.03, 3.3, LAWN_D);
  g.box(2.1, 0.03, 2.1, 0.5, 0.07, 3.0, NEON);
  k.ball(0.42, -0.9, 0.3, 1.55, '#355a2f', [1, 0.8, 0.8]).ball(0.34, 1.75, 0.26, 1.55, '#355a2f', [1, 0.8, 0.8]);

  // the tall house next door, balcony and all
  house(k, 6.1, -1.4, 4.4, 5.0, 4.6, WALL, ROOF, 1.5);
  g.box(1.6, 1.2, 0.04, 6.1, 3.3, 1.13, LIT);
  k.box(0.05, 1.2, 0.03, 6.1, 3.3, 1.17, '#2a2526');
  k.box(2.8, 0.14, 0.9, 6.1, 2.4, 1.55, '#2e2422');
  k.box(2.6, 0.03, 0.75, 6.1, 2.49, 1.55, '#d0642a');
  for (let x = 4.85; x <= 7.35; x += 0.31) k.box(0.04, 0.42, 0.04, x, 2.72, 1.95, '#c9602a');
  k.box(2.8, 0.05, 0.05, 6.1, 2.94, 1.95, '#8c4a26');
  g.box(1.5, 0.9, 0.04, 6.1, 1.2, 1.13, LIT);
  k.box(2.3, 0.42, 0.5, 6.1, 0.25, 1.45, '#6a4238').box(2.1, 0.22, 0.34, 6.1, 0.52, 1.45, '#3c5a34');
  // path and its brick edging, and a hose reel
  k.box(1.3, 0.05, 4.2, 3.9, 0.03, 3.2, '#6f6e72');
  for (const x of [3.22, 4.58]) k.box(0.14, 0.06, 4.2, x, 0.04, 3.2, '#6e3b34');
  k.add(new THREE.TorusGeometry(0.19, 0.04, 6, 14), '#1f2a22', [4.95, 0.28, 2.1], [0, 0.9, 0]);
  k.box(4.0, 0.05, 2.6, 6.8, 0.03, 4.0, LAWN_D);
  g.box(2.0, 0.03, 0.8, 7.2, 0.07, 4.7, NEON);

  // the end houses, snapped off by the edge of the ground
  house(k, -9, -1.8, 4.6, 4.4, 2.4, '#6c5361', '#6d696e', 1.2);
  g.box(1.4, 0.45, 0.04, -9, 1.0, 0.44, LIT);
  for (let i = 0; i < 6; i++) k.box(0.27, 0.32, 0.26, -9.68 + i * 0.27, 1.4, 0.52, i % 2 ? '#e6e0d0' : '#9b3a3a');
  g.box(1.6, 0.03, 1.6, -9, 0.07, 3.2, NEON);
  house(k, 10.8, -2.2, 3.6, 4.6, 2.6, '#7c7b80', '#6d696e', 1.3);
  g.box(0.9, 0.9, 0.04, 10.6, 1.4, 0.13, '#46505a');

  // back yard: wall, shed, a tree
  k.box(10, 0.75, 0.14, -2.4, 0.37, -5.4, '#6c6a66');
  house(k, -3.5, -6.0 + 1.05, 1.3, 1.1, 1.0, '#4c4a4a', ROOF, 0.6);
  k.box(0.44, 0.72, 0.02, -3.5, 0.36, -4.44, '#232021');
  k.box(0.1, 2.0, 0.1, 3.0, 1.0, -5.1, '#4d3a2c');
  k.ball(1.0, 3.0, 2.6, -5.1, '#6f8a5a', [1, 0.9, 1]).ball(0.72, 2.4, 2.1, -4.9, '#6f8a5a').ball(0.72, 3.65, 2.2, -5.0, '#607a4e');
  k.ball(0.95, -8.6, 1.6, -4.9, '#3e5636', [1, 1.2, 1]).ball(0.8, 9.0, 1.2, -5.2, '#3e5636');
  // a hedge and a gate on the left of the drive
  k.box(0.5, 0.65, 3.0, -5.9, 0.33, 2.6, '#3e5e32');
  k.box(1.3, 0.8, 0.06, -6.5, 0.4, 0.5, '#a9a79f');

  // crumbs of the world, drifting off the broken ends
  const crumb = ['#e8e1c6', '#6c5361', '#2b2829', '#5d6d50', '#8d8a8b', '#3e312d', '#2b2829'];
  for (let i = 0; i < 120; i++) {
    const s = r() < 0.5 ? -1 : 1, x = s * (W - 2.4 + r() * r() * 7), z = (r() - 0.5) * 2 * D, w = 0.08 + r() * r() * 0.5;
    k.box(w, w * (0.4 + r() * 0.6), w, x, (r() - 0.5) * 1.2, z, crumb[(r() * crumb.length) | 0], [r(), r(), r()]);
  }
  return [k.merged(), g.merged()];
}

/* ---------- small things adrift ---------- */

function adrift() {
  const out = [], r = rng(5), rock = new THREE.IcosahedronGeometry(1, 1);
  const piece = (k, extra) => { const m = k.mesh(kitToon()); if (extra) m.add(extra); out.push(m); return m; };

  // the stop sign on its boulder
  const sign = new Kit();
  sign.add(rock, ROCK, [0, -0.9, 0], [0.4, 0.3, 0], [1.9, 0.75, 1.5]);
  sign.rod([0, -0.3, 0], [0, 2.7, 0], 0.05, '#1f1b1c');
  sign.add(new THREE.CylinderGeometry(0.74, 0.74, 0.06, 8), '#3d2a2c', [0, 2.8, 0], [Math.PI / 2, Math.PI / 8, 0]);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(0.98, 0.98), toon({ map: stopSign() }));
  face.position.set(0, 2.8, 0.04);
  piece(sign, face);

  // the side table
  const table = new Kit();
  table.box(1.1, 0.08, 0.62, 0, 0.5, 0, '#a35f3a');
  for (const x of [-0.46, 0.46]) for (const z of [-0.24, 0.24]) table.box(0.07, 0.5, 0.07, x, 0.25, z, '#7a4528');
  piece(table);

  // the rocking chair, upside down
  const chair = new Kit(), O = '#dd9b3a';
  chair.box(0.62, 0.05, 0.6, 0, 0.5, 0, O);
  for (let i = 0; i < 5; i++) chair.box(0.05, 0.62, 0.03, -0.26 + i * 0.13, 0.84, -0.3, O);
  chair.box(0.66, 0.06, 0.04, 0, 1.17, -0.3, O);
  for (const x of [-0.28, 0.28]) {
    chair.box(0.05, 0.5, 0.05, x, 0.25, 0.26, O).box(0.05, 0.5, 0.05, x, 0.25, -0.26, O).box(0.05, 0.04, 0.5, x, 0.76, 0, O);
    chair.add(new THREE.TorusGeometry(0.75, 0.025, 6, 20, 1.3), '#b57a2a', [x, 0.76, 0], [0, Math.PI / 2, Math.PI + 0.77 + 0.34]);
  }
  piece(chair);

  // a tree on a clod of lawn
  const tree = new Kit();
  tree.shard(blob(0, 0, 1.3, 1.0, 9, r), 0.3, GRASS, ROCK, [0, 0, 0]);
  tree.add(rock, ROCK, [0, -0.5, 0], [0.2, 1, 0], [1.05, 0.5, 0.85]);
  tree.box(0.14, 1.2, 0.14, 0, 0.6, 0, '#4d3a2c');
  tree.ball(0.72, 0, 1.6, 0, '#6f8a5a').ball(0.52, -0.42, 1.25, 0.1, '#6f8a5a').ball(0.5, 0.42, 1.3, -0.1, '#607a4e');
  piece(tree);

  // a corner of somebody's roof
  const roof = new Kit();
  roof.shard(blob(0, 0, 1.2, 0.9, 7, r, 0.35), 0.18, ROOF, '#7f7a76', [0, 0, 0], [0.7, 0, 0]);
  for (let i = 0; i < 5; i++) roof.box(0.26, 0.02, 0.03, (r() - 0.5) * 1.2, 0.02, (r() - 0.5) * 0.6, '#17110f', [0.7, 0, 0]);
  piece(roof);

  // a slab of pavement
  const pave = new Kit();
  pave.shard(blob(0, 0, 1.3, 0.55, 8, r, 0.25), 0.2, '#8d8d91', ROCK, [0, 0, 0]);
  piece(pave);

  return out;
}

/* ---------- it all ---------- */

// Most cats get their own mesh so you can poke them; the crowd behind them is one instanced draw.
const HERO = [
  // pose, size, orbit x, orbit z, height, speed, facing
  ['leap', 3.3, 13.5, 10.5, -5.5, 0.03, 1], ['drift', 2.6, 12.5, 11, -2.2, -0.035, -1], ['leap', 1.9, 10.2, 8.5, -0.8, 0.05, -1],
  ['drift', 1.5, 8.8, 7.2, 0.8, -0.055, 1], ['leap', 1.2, 8.3, 6.8, 2.0, 0.065, 1], ['sleep', 1.1, 7.8, 6.6, -1.5, -0.04, 1],
  ['drift', 0.95, 7.5, 6.4, 3.2, 0.07, -1], ['leap', 0.8, 7.0, 6.1, 1.2, -0.08, -1], ['sleep', 0.75, 7.6, 7.2, 4.0, 0.05, -1],
  ['drift', 0.7, 6.8, 5.8, -0.4, 0.09, 1], ['leap', 0.62, 6.5, 5.8, 2.6, -0.1, 1], ['drift', 0.55, 7.2, 6.4, 4.8, 0.08, -1],
  ['leap', 4.2, 17, 13, -9, -0.022, 1], ['drift', 1.7, 11, 9, -4, 0.045, 1],
];

export function buildSpace(scene, renderer) {
  const starfield = stars(renderer);
  scene.add(starfield);

  /* the block repeats, four ways, with cracks running between the copies */
  const [blockGeo, blockGlow] = buildBlock();
  const blockMat = kitToon(), blockGlowMat = kitGlow(), glows = [];
  const lay = (x, y, z, s, flip) => {
    const b = new THREE.Mesh(blockGeo, blockMat), l = new THREE.Mesh(blockGlow, blockGlowMat);
    b.add(l); glows.push(l);
    b.position.set(x, y, z); b.scale.set(flip ? -s : s, s, s);
    scene.add(b);
    return b;
  };
  const Y = -13, far = -34, mid = -13;
  lay(-16, Y, far, 1, false); lay(16, Y, far, 1, false);
  lay(-27, Y + 1, mid, 1, true); lay(27, Y + 1, mid, 1, false);
  lay(-10, Y - 9, 3, 1, false); lay(14, Y - 9, 2, 1, true);

  const rifts = [];
  const crack = (len, w, x, y, z, rotY) => {
    const m = rift(len, w);
    m.rotation.set(-Math.PI / 2, rotY, 0, 'YXZ');
    m.position.set(x, y, z);
    scene.add(m); rifts.push(m);
  };
  crack(220, 2.2, 0, -7, -22, 0.02);
  crack(58, 2.0, -1.5, -7, -32, Math.PI / 2 + 0.05);
  crack(120, 1.8, 0, -14, -2, -0.03);

  /* rock and rubble filling the dark */
  const rubble = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), toon({ flatShading: true }), 230);
  rubble.frustumCulled = false;
  {
    const r = rng(9), m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), c = new THREE.Color();
    const tones = ['#1d1a1c', '#262225', '#2f2b2c', '#262225', '#3c3735', '#5d6d50', '#8a7f6e'];
    for (let i = 0; i < 230; i++) {
      const a = r() * TAU, d = 7.5 + r() * 34, s = i < 20 ? 0.8 + r() * 1.5 : 0.06 + r() * r() * 0.55;
      const p = V(Math.cos(a) * d, -9 + r() * 14, -3 + Math.sin(a) * d * 0.8);
      if (p.z > 3 && p.y > -2) p.y = -4 - r() * 6; // nothing hanging between you and the room
      if (i < 20) p.z = -Math.abs(p.z) - 5;
      m.compose(p, q.setFromEuler(e.set(r() * 3, r() * 3, r() * 3)), V(s, s * (0.5 + r() * 0.5), s));
      rubble.setMatrixAt(i, m);
      rubble.setColorAt(i, c.set(tones[(r() * tones.length) | 0]));
    }
  }
  scene.add(rubble);

  const drifters = adrift();
  const DRIFT = [[-11.5, 0.8, -8], [-13, -2.5, -3.5], [8.5, 3.6, -6.5], [-8.8, -3.4, 5], [10.5, -2.2, 3.5], [12, 1.5, -12]];
  drifters.forEach((d, i) => {
    d.position.set(...DRIFT[i]);
    d.rotation.set(0.3 * Math.sin(i * 3), i * 1.1, i === 2 ? Math.PI * 0.8 : 0.2 * Math.cos(i * 2));
    scene.add(d);
  });

  /* cats, on slow loops around the room, never through it */
  const cats = [], pickables = [];
  // Round the front of a loop a cat dips well below the floor, so it never hangs over the room.
  const sink = (z, y, size) => { const k = THREE.MathUtils.smoothstep(z, -2, 3); return y - k * (Math.max(0, y + 2) + size * 1.4); };
  HERO.forEach(([pose, size, rx, rz, y, w, face], i) => {
    const m = makeCat(pose);
    m.scale.set(face * size, size, size);
    m.traverse((o) => { if (o.isMesh) { o.userData.cat = i; pickables.push(o); } });
    scene.add(m);
    cats.push({
      mesh: m, size, rx, rz, w, th: (i * 2.399) % TAU, yb: y, ph: i * 1.9,
      roll: 0.25 + (i % 3) * 0.12, tumble: V(i % 5 === 0 ? 0.08 : 0, 0, i % 7 === 0 ? 0.1 : 0), turn: V(), boost: 0,
      off: V(), vel: V(), pitch: 0.75 + (i % 5) * 0.09 + 0.5 / (0.6 + size),
    });
  });

  const crowd = [];
  const crowdMeshes = ['leap', 'drift', 'sleep'].map((pose, p) => {
    const n = [46, 46, 14][p], inst = new THREE.InstancedMesh(catGeometry(pose, true), catMaterial(), n);
    inst.frustumCulled = false;
    const r = rng(100 + p);
    for (let i = 0; i < n; i++) {
      const a = r() * TAU, d = 8 + r() * r() * 30;
      const c = {
        inst, i, a, d, w: (r() < 0.5 ? -1 : 1) * (0.01 + r() * 0.03), y: -11 + r() * 17, ph: r() * TAU,
        s: (0.16 + r() * r() * 0.55) * (d > 20 ? 1.5 : 1), e: new THREE.Euler(r() * 0.8 - 0.4, r() * 1.6 - 0.8, r() * TAU),
        spin: (r() - 0.5) * 0.35,
      };
      crowd.push(c);
    }
    scene.add(inst);
    return inst;
  });
  const m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), p4 = V(0, 0, 0), s4 = V(1, 1, 1);

  return {
    cats, pickables,
    skip: [starfield, ...rifts],
    poke(i) {
      const c = cats[i];
      meow(c.pitch);
      c.boost = 9;
      const out = c.mesh.position.clone().setY(0).normalize();
      c.vel.addScaledVector(out, 7).add(V(0, 4, 0));
      c.turn.set(0.2 + Math.random() * 0.2, 0.1, 0.2);
    },
    update(dt, t) {
      starfield.material.uniforms.uTime.value = t;
      for (const r of rifts) r.material.uniforms.uTime.value = t;
      drifters.forEach((d, i) => {
        d.rotation.y += dt * 0.03 * (i % 2 ? 1 : -1);
        d.position.y = DRIFT[i][1] + Math.sin(t * 0.25 + i * 2) * 0.35;
      });
      for (const c of cats) {
        c.th += c.w * dt;
        // springy kick so a poked cat flies off and drifts back
        c.vel.addScaledVector(c.off, -1.1 * dt).multiplyScalar(Math.exp(-dt * 0.9));
        c.off.addScaledVector(c.vel, dt);
        c.boost *= Math.exp(-dt * 1.2);
        // always more or less showing you its face; a poke sets it tumbling for good
        c.tumble.addScaledVector(c.turn, c.boost * dt);
        c.tumble.z += (c.ph % 1 > 0.5 ? 1 : -1) * 0.012 * dt;
        c.mesh.rotation.set(
          -0.45 + Math.sin(t * 0.3 + c.ph) * 0.18 + c.tumble.x,
          Math.sin(t * 0.21 + c.ph) * 0.35 + c.tumble.y,
          Math.sin(t * 0.17 + c.ph * 2) * c.roll + c.tumble.z,
        );
        const z = -1.5 + Math.sin(c.th) * c.rz;
        c.mesh.position.set(Math.cos(c.th) * c.rx, sink(z, c.yb, c.size) + Math.sin(t * 0.3 + c.ph) * 0.9, z).add(c.off);
      }
      for (const c of crowd) {
        c.a += c.w * dt;
        c.e.z += c.spin * dt;
        p4.set(Math.cos(c.a) * c.d, c.y + Math.sin(t * 0.25 + c.ph) * 0.6, -3 + Math.sin(c.a) * c.d * 0.8);
        // keep the near-camera side of the crowd low, so they don't hang over the room
        if (p4.z > 2) p4.y = Math.min(p4.y, -3.5);
        m4.compose(p4, q4.setFromEuler(c.e), s4.setScalar(c.s));
        c.inst.setMatrixAt(c.i, m4);
      }
      for (const m of crowdMeshes) m.instanceMatrix.needsUpdate = true;
    },
  };
}
