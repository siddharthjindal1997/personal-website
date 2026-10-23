// Things from my life, modelled from primitives. Each maker returns a Group
// (plus any handles the room needs to animate it). Units are metres.
import * as THREE from 'three';
import * as T from './textures.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const UP = V(0, 1, 0);
export const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...o });

export function shade(obj, cast = true, receive = true) {
  obj.traverse((m) => { if (m.isMesh) { m.castShadow = cast; m.receiveShadow = receive; } });
  return obj;
}

export function tag(obj, data) {
  obj.traverse((m) => { if (m.isMesh) Object.assign(m.userData, data); });
  return obj;
}

export function cyl(a, b, r, mat, seg = 10) {
  const dir = new THREE.Vector3().subVectors(b, a), len = dir.length();
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, seg), mat);
  m.position.copy(a).addScaledVector(dir, 0.5);
  m.quaternion.setFromUnitVectors(UP, dir.normalize());
  return m;
}

function box(w, h, d, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  return m;
}

// ShapeGeometry UVs are in shape units; remap them to 0..1 over a known rect.
function fitUV(geo, x0, y0, w, h) {
  const p = geo.attributes.position, uv = geo.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) - x0) / w, (p.getY(i) - y0) / h);
  uv.needsUpdate = true;
  return geo;
}

/* ---------- Yamaha F310 ---------- */

export function makeGuitar() {
  const root = new THREE.Group();
  const guitar = new THREE.Group();
  root.add(guitar);

  const D = 0.1, B = 0.006, TOP = D + B;
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.bezierCurveTo(0.12, 0, 0.2, 0.05, 0.2, 0.14);
  s.bezierCurveTo(0.2, 0.23, 0.135, 0.25, 0.135, 0.31);
  s.bezierCurveTo(0.135, 0.36, 0.148, 0.38, 0.145, 0.42);
  s.bezierCurveTo(0.142, 0.48, 0.09, 0.505, 0, 0.505);
  s.bezierCurveTo(-0.09, 0.505, -0.142, 0.48, -0.145, 0.42);
  s.bezierCurveTo(-0.148, 0.38, -0.135, 0.36, -0.135, 0.31);
  s.bezierCurveTo(-0.135, 0.25, -0.2, 0.23, -0.2, 0.14);
  s.bezierCurveTo(-0.2, 0.05, -0.12, 0, 0, 0);

  const topMat = std(0xffffff, { map: T.spruce(), roughness: 0.3 });
  const sideMat = std(0x3a1b0e, { roughness: 0.32 });
  const body = new THREE.Mesh(
    new THREE.ExtrudeGeometry(s, { depth: D, bevelEnabled: true, bevelThickness: B, bevelSize: B, bevelSegments: 3, curveSegments: 40 }),
    [topMat, sideMat],
  );
  guitar.add(body);

  const z = TOP + 0.0006;
  const flat = (geo, mat, x, y, zz = z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, zz); guitar.add(m); return m; };
  flat(new THREE.CircleGeometry(0.047, 48), new THREE.MeshBasicMaterial({ color: 0x080503 }), 0, 0.335, z + 0.0002);
  flat(new THREE.RingGeometry(0.052, 0.064, 64), std(0x26150b, { roughness: 0.4 }), 0, 0.335, z + 0.0004);
  flat(new THREE.RingGeometry(0.056, 0.0585, 64), std(0xefe6d4), 0, 0.335, z + 0.0006);

  const pg = new THREE.Shape();
  pg.moveTo(0.04, 0.29);
  pg.quadraticCurveTo(0.07, 0.235, 0.115, 0.25);
  pg.quadraticCurveTo(0.14, 0.29, 0.11, 0.35);
  pg.quadraticCurveTo(0.09, 0.38, 0.062, 0.37);
  pg.quadraticCurveTo(0.072, 0.32, 0.04, 0.29);
  flat(new THREE.ShapeGeometry(pg), std(0x0b0b0b, { roughness: 0.2 }), 0, 0, z);

  const rose = std(0x22120a, { roughness: 0.5 });
  const ivory = std(0xf2eadb, { roughness: 0.4 });
  guitar.add(box(0.15, 0.032, 0.009, rose, 0, 0.12, TOP + 0.0045));
  guitar.add(box(0.075, 0.003, 0.004, ivory, 0, 0.127, TOP + 0.0105));
  for (let i = 0; i < 6; i++) {
    const pin = new THREE.Mesh(new THREE.SphereGeometry(0.0032, 8, 6), ivory);
    pin.position.set((i / 5 - 0.5) * 0.056, 0.112, TOP + 0.0095);
    guitar.add(pin);
  }

  const NUT = 0.94, JOIN = 0.5, BOARD0 = 0.45;
  guitar.add(box(0.052, NUT - JOIN + 0.02, 0.028, std(0x5a2f17, { roughness: 0.45 }), 0, (NUT + JOIN) / 2, TOP - 0.012));
  guitar.add(box(0.05, NUT - BOARD0, 0.007, rose, 0, (NUT + BOARD0) / 2, TOP + 0.0035));
  const L = 0.634, fretY = (n) => NUT - L * (1 - Math.pow(2, -n / 12));
  const fretMat = std(0xd8d8d8, { metalness: 1, roughness: 0.3 });
  for (let n = 1; n < 20; n++) {
    const y = fretY(n);
    if (y < BOARD0 + 0.01) break;
    guitar.add(box(0.05, 0.0022, 0.0018, fretMat, 0, y, TOP + 0.0078));
  }
  const dotGeo = new THREE.CircleGeometry(0.0034, 12);
  for (const n of [3, 5, 7, 9, 12, 15]) {
    const y = (fretY(n - 1) + fretY(n)) / 2;
    for (const x of n === 12 ? [-0.012, 0.012] : [0]) flat(dotGeo, ivory, x, y, TOP + 0.0072);
  }
  guitar.add(box(0.05, 0.004, 0.009, ivory, 0, NUT, TOP + 0.0045));

  const head = new THREE.Group();
  head.position.set(0, NUT, TOP + 0.002);
  head.rotation.x = -0.22;
  head.add(box(0.085, 0.19, 0.014, std(0x2a160c, { roughness: 0.65, envMapIntensity: 0.3 }), 0, 0.1, -0.003));
  const chrome = std(0xe0e0e0, { metalness: 1, roughness: 0.2 });
  for (let i = 0; i < 3; i++) for (const sx of [-1, 1]) {
    const y = 0.05 + i * 0.048;
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.0035, 0.0035, 0.014, 8), chrome);
    post.rotation.x = Math.PI / 2; post.position.set(sx * 0.026, y, 0.008); head.add(post);
    const key = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.004, 12), chrome);
    key.rotation.z = Math.PI / 2; key.position.set(sx * 0.062, y, -0.003); head.add(key);
  }
  guitar.add(head);

  const strings = [];
  const gauges = [0.0012, 0.001, 0.0009, 0.0008, 0.0006, 0.0005];
  const bronze = std(0xc9a46a, { metalness: 0.9, roughness: 0.3 });
  const steel = std(0xe6e6e6, { metalness: 1, roughness: 0.22 });
  const hitMat = new THREE.MeshBasicMaterial({ visible: false });
  for (let i = 0; i < 6; i++) {
    const t = i / 5 - 0.5;
    const a = V(t * 0.056, 0.127, TOP + 0.013), b = V(t * 0.038, NUT, TOP + 0.0095);
    const mesh = cyl(a, b, gauges[i], i < 4 ? bronze : steel, 5);
    mesh.castShadow = false;
    guitar.add(mesh);
    const hit = cyl(a, b, 0.0042, hitMat, 6);
    hit.userData.string = i;
    guitar.add(hit);
    strings.push({ mesh, base: mesh.position.clone(), amp: 0, hit });
  }

  // A-frame stand
  const metal = std(0x1a1a1a, { metalness: 0.6, roughness: 0.4 });
  const stand = new THREE.Group();
  stand.add(cyl(V(-0.2, 0.01, 0.22), V(0, 0.6, -0.06), 0.008, metal));
  stand.add(cyl(V(0.2, 0.01, 0.22), V(0, 0.6, -0.06), 0.008, metal));
  stand.add(cyl(V(0, 0.01, -0.34), V(0, 0.6, -0.06), 0.008, metal));
  stand.add(cyl(V(0, 0.6, -0.06), V(0, 0.84, -0.1), 0.008, metal));
  stand.add(box(0.36, 0.02, 0.06, std(0x111111, { roughness: 0.9 }), 0, 0.12, 0.13));
  stand.add(box(0.09, 0.02, 0.02, std(0x111111, { roughness: 0.9 }), 0, 0.84, -0.09));
  root.add(stand);

  guitar.position.set(0, 0.11, 0.1);
  guitar.rotation.x = -0.2;

  return { root, guitar, body, strings };
}

/* ---------- easel, half-finished canvas, stool with palette ---------- */

export function makeEasel(paint) {
  const g = new THREE.Group();
  const wood = std(0x9c6b3e, { roughness: 0.75 });
  g.add(cyl(V(-0.42, 0, 0.28), V(-0.04, 1.95, 0), 0.022, wood));
  g.add(cyl(V(0.42, 0, 0.28), V(0.04, 1.95, 0), 0.022, wood));
  g.add(cyl(V(0, 0, -0.62), V(0, 1.82, -0.04), 0.02, wood));
  g.add(box(1.0, 0.035, 0.1, wood, 0, 0.9, 0.24));
  g.add(box(1.0, 0.04, 0.012, wood, 0, 0.925, 0.29));

  const holder = new THREE.Group();
  holder.position.set(0, 0.93, 0.24);
  holder.rotation.x = -0.13;
  const linen = std(0xf1ece2, { roughness: 0.9 });
  const art = new THREE.MeshStandardMaterial({ map: paint.texture, roughness: 0.85 });
  const back = std(0xd9cfbf, { roughness: 0.95 });
  const canvas = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.69, 0.035), [linen, linen, linen, linen, art, back]);
  canvas.position.set(0, 0.365, -0.02);
  holder.add(canvas);
  holder.add(box(0.14, 0.05, 0.07, wood, 0, 0.73, -0.02));
  g.add(holder);

  // stool + palette + brush jar
  const stool = new THREE.Group();
  stool.position.set(0.78, 0, 0.42);
  const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.04, 28), std(0x7a5232, { roughness: 0.7 }));
  seat.position.y = 0.52; stool.add(seat);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    stool.add(cyl(V(Math.cos(a) * 0.1, 0.5, Math.sin(a) * 0.1), V(Math.cos(a) * 0.2, 0, Math.sin(a) * 0.2), 0.014, wood));
  }
  const pal = new THREE.Shape();
  pal.absellipse(0, 0, 0.16, 0.11, 0, Math.PI * 2);
  const hole = new THREE.Path(); hole.absellipse(-0.1, 0.02, 0.022, 0.018, 0, Math.PI * 2, true); pal.holes.push(hole);
  const palette = new THREE.Mesh(new THREE.ExtrudeGeometry(pal, { depth: 0.006, bevelEnabled: false, curveSegments: 32 }), std(0xd8b98a, { roughness: 0.6 }));
  palette.rotation.x = -Math.PI / 2; palette.rotation.z = 0.5; palette.position.y = 0.541;
  stool.add(palette);
  const blobs = [0xe86a4a, 0xf2c14e, 0x3f6fb5, 0xf4f1ea, 0x6a3d7a, 0x2f8f6b, 0xd94f7a];
  blobs.forEach((c, i) => {
    const a = -1.2 + i * 0.42;
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.016, 12, 8), std(c, { roughness: 0.25 }));
    b.scale.set(1, 0.45, 1);
    const lx = Math.cos(a) * 0.115, ly = Math.sin(a) * 0.072;
    b.position.set(lx * Math.cos(0.5) - ly * Math.sin(0.5), 0.55, -(lx * Math.sin(0.5) + ly * Math.cos(0.5)));
    stool.add(b);
  });
  g.add(stool);

  const jar = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.055, 0.16, 20, 1, true),
    new THREE.MeshStandardMaterial({ color: 0xcfe3e6, roughness: 0.1, transparent: true, opacity: 0.35, side: THREE.DoubleSide }));
  jar.position.set(-0.62, 0.08, 0.45); g.add(jar);
  const water = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.052, 0.1, 20), new THREE.MeshStandardMaterial({ color: 0x8aa0b8, transparent: true, opacity: 0.5, roughness: 0.1 }));
  water.position.set(-0.62, 0.055, 0.45); g.add(water);
  [[0.02, 0.01, 0xe86a4a], [-0.015, 0.015, 0x3f6fb5], [0.0, -0.02, 0x2f8f6b]].forEach(([dx, dz, c], i) => {
    const p0 = V(-0.62 + dx, 0.02, 0.45 + dz), p1 = V(-0.62 + dx * 6, 0.32 + i * 0.02, 0.45 + dz * 6);
    g.add(cyl(p0, p1, 0.006, std(0x2b2b2b)));
    g.add(cyl(p0, p0.clone().lerp(p1, 0.12), 0.007, std(c)));
  });

  return { root: g, canvas };
}

/* ---------- desk, laptop, mug, plant, chair ---------- */

export function makeDesk() {
  const g = new THREE.Group();
  const walnut = std(0x6b4529, { roughness: 0.5 });
  const black = std(0x1b1b1b, { metalness: 0.5, roughness: 0.45 });
  g.add(box(1.7, 0.05, 0.72, walnut, 0, 0.74, 0));
  for (const [x, z] of [[-0.8, -0.3], [0.8, -0.3], [-0.8, 0.3], [0.8, 0.3]]) g.add(cyl(V(x, 0, z), V(x * 0.97, 0.72, z * 0.9), 0.016, black));

  // laptop
  const laptop = new THREE.Group();
  laptop.position.set(-0.05, 0.765, 0.04);
  laptop.rotation.y = -0.12;
  const alu = std(0xc6c9ce, { metalness: 0.7, roughness: 0.35 });
  laptop.add(box(0.34, 0.016, 0.235, alu, 0, 0.008, 0));
  const keys = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.115), new THREE.MeshStandardMaterial({ map: T.keyboard(), roughness: 0.7 }));
  keys.rotation.x = -Math.PI / 2; keys.position.set(0, 0.0165, -0.03); laptop.add(keys);
  const pad = new THREE.Mesh(new THREE.PlaneGeometry(0.11, 0.065), std(0xb5b8bd, { metalness: 0.5, roughness: 0.4 }));
  pad.rotation.x = -Math.PI / 2; pad.position.set(0, 0.0166, 0.07); laptop.add(pad);
  const lid = new THREE.Group();
  lid.position.set(0, 0.016, -0.1175);
  lid.rotation.x = -1.92;
  lid.add(box(0.34, 0.008, 0.235, alu, 0, 0.004, 0.1175));
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.31, 0.194), new THREE.MeshBasicMaterial({ map: T.laptopScreen(), toneMapped: false }));
  screen.rotation.x = Math.PI / 2; screen.position.set(0, -0.0005, 0.122);
  screen.material.color.setScalar(0.92);
  lid.add(screen);
  laptop.add(lid);
  g.add(laptop);

  // mug
  const mug = new THREE.Group();
  mug.position.set(0.42, 0.765, 0.08);
  mug.add(new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.04, 0.1, 24), std(0xe9e2d6, { roughness: 0.35 })));
  mug.children[0].position.y = 0.05;
  const coffee = new THREE.Mesh(new THREE.CircleGeometry(0.038, 24), std(0x2a160b, { roughness: 0.15 }));
  coffee.rotation.x = -Math.PI / 2; coffee.position.y = 0.09; mug.add(coffee);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.026, 0.007, 8, 20), std(0xe9e2d6, { roughness: 0.35 }));
  handle.position.set(0.045, 0.05, 0); mug.add(handle);
  g.add(mug);

  // succulent
  const plant = new THREE.Group();
  plant.position.set(-0.62, 0.765, -0.18);
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.055, 0.11, 20), std(0xb9643f, { roughness: 0.85 }));
  pot.position.y = 0.055; plant.add(pot);
  const leaf = std(0x5f8f62, { roughness: 0.6, flatShading: true });
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2, tilt = i % 2 ? 0.5 : 0.9;
    const l = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.1, 5), leaf);
    l.position.set(Math.cos(a) * 0.025, 0.14, Math.sin(a) * 0.025);
    l.rotation.set(Math.sin(a) * tilt, 0, -Math.cos(a) * tilt);
    plant.add(l);
  }
  g.add(plant);

  // chair, pulled out
  const chair = new THREE.Group();
  chair.position.set(0.1, 0, 0.62); chair.rotation.y = 0.35;
  const oak = std(0xa47547, { roughness: 0.6 });
  chair.add(box(0.44, 0.04, 0.42, oak, 0, 0.46, 0));
  for (const [x, z] of [[-0.19, -0.18], [0.19, -0.18], [-0.19, 0.18], [0.19, 0.18]]) chair.add(cyl(V(x, 0, z), V(x, 0.45, z), 0.018, oak));
  chair.add(cyl(V(-0.19, 0.46, 0.19), V(-0.19, 0.95, 0.22), 0.018, oak));
  chair.add(cyl(V(0.19, 0.46, 0.19), V(0.19, 0.95, 0.22), 0.018, oak));
  chair.add(box(0.42, 0.14, 0.025, oak, 0, 0.86, 0.215));
  g.add(chair);

  return { root: g, laptop };
}

/* ---------- coat rack + the Placecom hoodie ---------- */

export function makeRack() {
  const g = new THREE.Group();
  const wood = std(0x3a281c, { roughness: 0.55 });
  g.add(cyl(V(0, 0, 0), V(0, 1.95, 0), 0.022, wood));
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.5;
    g.add(cyl(V(0, 0.18, 0), V(Math.cos(a) * 0.32, 0.01, Math.sin(a) * 0.32), 0.018, wood));
  }
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.035, 16, 12), wood);
  knob.position.y = 1.97; g.add(knob);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 2;
    g.add(cyl(V(0, 1.8, 0), V(Math.sin(a) * 0.13, 1.88, Math.cos(a) * 0.13), 0.01, wood));
  }
  return g;
}

export function makeHoodie() {
  const pivot = new THREE.Group();
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.lineTo(0.07, 0);
  s.quadraticCurveTo(0.17, -0.02, 0.24, -0.07);
  s.quadraticCurveTo(0.29, -0.12, 0.3, -0.2);
  s.lineTo(0.36, -0.6);
  s.lineTo(0.295, -0.632);
  s.lineTo(0.218, -0.25);
  s.lineTo(0.222, -0.7);
  s.quadraticCurveTo(0.224, -0.78, 0.2, -0.78);
  s.lineTo(-0.2, -0.78);
  s.quadraticCurveTo(-0.224, -0.78, -0.222, -0.7);
  s.lineTo(-0.218, -0.25);
  s.lineTo(-0.295, -0.632);
  s.lineTo(-0.36, -0.6);
  s.lineTo(-0.3, -0.2);
  s.quadraticCurveTo(-0.29, -0.12, -0.24, -0.07);
  s.quadraticCurveTo(-0.17, -0.02, -0.07, 0);
  s.lineTo(0, 0);

  const TH = 0.04, BV = 0.018;
  const maroon = std(0x5e1824, { roughness: 0.95 });
  const bodyGeo = new THREE.ExtrudeGeometry(s, { depth: TH, bevelEnabled: true, bevelThickness: BV, bevelSize: BV * 0.6, bevelSegments: 4, curveSegments: 16 });
  bodyGeo.translate(0, 0, -TH / 2);
  pivot.add(new THREE.Mesh(bodyGeo, maroon));

  const W = T.HOODIE_W / 1000, H = T.HOODIE_H / 1000;
  const decal = (tex, back) => {
    const geo = fitUV(new THREE.ShapeGeometry(s, 24), -W / 2, -H, W, H);
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95 }));
    m.position.z = (back ? -1 : 1) * (TH / 2 + BV + 0.0015);
    if (back) m.rotation.y = Math.PI;
    return m;
  };
  pivot.add(decal(T.hoodieFront(), false));
  pivot.add(decal(T.hoodieBack(), true));

  // the hood hangs down the back as a soft teardrop
  const hoodShape = new THREE.Shape();
  hoodShape.moveTo(-0.13, 0.05);
  hoodShape.quadraticCurveTo(-0.16, -0.1, -0.02, -0.19);
  hoodShape.quadraticCurveTo(0, -0.2, 0.02, -0.19);
  hoodShape.quadraticCurveTo(0.16, -0.1, 0.13, 0.05);
  hoodShape.quadraticCurveTo(0, 0.1, -0.13, 0.05);
  const hood = new THREE.Mesh(new THREE.ExtrudeGeometry(hoodShape, { depth: 0.03, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.012, bevelSegments: 4, curveSegments: 20 }), std(0x581722, { roughness: 0.95 }));
  hood.position.z = -(TH / 2 + BV + 0.05);
  pivot.add(hood);

  const cord = std(0xf3efe8, { roughness: 0.8 });
  for (const x of [-0.05, 0.05]) {
    const z = TH / 2 + BV + 0.006;
    pivot.add(cyl(V(x, -0.02, z), V(x * 1.15, -0.27, z + 0.004), 0.0045, cord, 6));
    const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.025, 8), std(0xbfbfbf, { metalness: 0.8, roughness: 0.3 }));
    tip.position.set(x * 1.15, -0.28, z + 0.004); pivot.add(tip);
  }
  return pivot;
}

/* ---------- doors to the outside ---------- */

export function makeDoor(word, portalStops) {
  const root = new THREE.Group();
  const trim = std(0xefe8dc, { roughness: 0.6 });
  const W = 1.1, H = 2.25;
  // Trim lines the opening and sits just inside it, like the window frame.
  const TD = 0.26, tz = -0.08, ti = 0.01;
  root.add(box(0.08, H + 0.08, TD, trim, -W / 2 - 0.04 + ti, (H + 0.08) / 2, tz));
  root.add(box(0.08, H + 0.08, TD, trim, W / 2 + 0.04 - ti, (H + 0.08) / 2, tz));
  root.add(box(W + 0.16, 0.08, TD, trim, 0, H + 0.04 - ti, tz));

  const hinge = new THREE.Group();
  hinge.position.set(-W / 2, 0, 0);
  const panelMat = new THREE.MeshStandardMaterial({ map: T.doorPanel(), roughness: 0.55 });
  const edge = std(0x4a2e1b, { roughness: 0.6 });
  const panel = new THREE.Mesh(new THREE.BoxGeometry(W - 0.01, H - 0.01, 0.05), [edge, edge, edge, edge, panelMat, panelMat]);
  panel.position.set(W / 2, H / 2, -0.03);
  hinge.add(panel);
  const brass = std(0xc9a24f, { metalness: 0.9, roughness: 0.3 });
  for (const z of [0.01, -0.07]) {
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.03, 16, 12), brass);
    knob.position.set(W - 0.1, 1.0, z); hinge.add(knob);
  }
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.112), new THREE.MeshStandardMaterial({ map: T.plaque(word), metalness: 0.6, roughness: 0.35 }));
  plate.position.set(W / 2, 1.55, -0.003); hinge.add(plate);
  root.add(hinge);

  const portalTex = T.verticalGradient(portalStops, 8, 256);
  const portal = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshBasicMaterial({ map: portalTex, toneMapped: false }));
  portal.position.set(0, H / 2, -0.17);
  root.add(portal);

  const spill = new THREE.SpotLight(new THREE.Color(portalStops[portalStops.length - 1][1]), 0, 9, 0.9, 0.8, 1.6);
  spill.position.set(0, 1.9, -0.12);
  spill.target.position.set(0, 0, 2.5);
  root.add(spill, spill.target);

  return { root, hinge, panel, spill, open: 0, goal: 0 };
}

/* ---------- window ---------- */

export function makeWindow(w, h) {
  const g = new THREE.Group();
  const frame = std(0xf1ece4, { roughness: 0.5 });
  // The frame lines the whole wall opening and sits slightly inside it, so its faces
  // never share a plane with the hole's edges (shared planes z-fight and flicker).
  const f = 0.07, inset = 0.015, D = 0.26, z = -0.09;
  g.add(box(w + f * 2, f, D, frame, 0, h / 2 + f / 2 - inset, z));
  g.add(box(w + f * 2, f, D, frame, 0, -h / 2 - f / 2 + inset, z));
  g.add(box(f, h, D, frame, -w / 2 - f / 2 + inset, 0, z));
  g.add(box(f, h, D, frame, w / 2 + f / 2 - inset, 0, z));
  g.add(box(0.035, h, 0.05, frame, 0, 0, 0));
  g.add(box(w, 0.035, 0.05, frame, 0, h * 0.12, 0));
  g.add(box(w + 0.3, 0.04, 0.22, frame, 0, -h / 2 - f - 0.01, 0.08));
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ color: 0x9fb8d8, transparent: true, opacity: 0.06, roughness: 0.05, metalness: 0.2 }));
  glass.position.z = -0.01; g.add(glass);
  return g;
}

/* ---------- floor lamp ---------- */

export function makeLamp() {
  const g = new THREE.Group();
  const brass = std(0xb08a4a, { metalness: 0.8, roughness: 0.35 });
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.19, 0.03, 32), brass);
  base.position.y = 0.015; g.add(base);
  g.add(cyl(V(0, 0.03, 0), V(0, 1.62, 0), 0.012, brass));
  const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.27, 0.32, 40, 1, true),
    new THREE.MeshStandardMaterial({ color: 0xf2e2c4, emissive: 0xffb866, emissiveIntensity: 0.18, roughness: 0.9, side: THREE.DoubleSide }));
  shade.position.y = 1.66; g.add(shade);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.3, 1.05, 0.75), toneMapped: false }));
  bulb.position.y = 1.6; g.add(bulb);
  const light = new THREE.PointLight(0xffb36b, 3.2, 0, 2);
  light.position.y = 1.58; g.add(light);
  return g;
}

/* ---------- loose things ---------- */

export function makePolaroid(tex) {
  const paper = std(0xf3f0e8, { roughness: 0.8 });
  const face = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.45 });
  return new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.006, 0.475), [paper, paper, face, paper, paper, paper]);
}

export function makeNote(tex) {
  return new THREE.Mesh(new THREE.PlaneGeometry(0.17, 0.17), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 }));
}
