// Things from my life. The furniture and objects were modelled in Spline and baked to
// models/room.glb: one node per model, in metres, in the model's own frame. The parts
// that move, play or get painted on (strings, the canvas, the screen, the hoodie print)
// are layered on here. Each maker returns a Group (plus any handles the room needs).
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
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

/* ---------- the Spline models ---------- */

let MODELS = null;
export async function loadModels(url = 'models/room.glb') {
  const gltf = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(url);
  MODELS = Object.fromEntries(gltf.scene.children.map((n) => [n.name, n]));
}

// Clones share geometry and materials with the loaded model.
const model = (name) => MODELS[name].clone();

// Named parts are wrapper nodes around the actual mesh; swap the material on all of them.
// (GLTFLoader turns the spaces in Spline's names into underscores.)
function dress(root, name, mat) {
  root.getObjectByName(name.replaceAll(' ', '_')).traverse((m) => { if (m.isMesh) m.material = mat; });
  return mat;
}

// UVs in metres, projected along whichever axis each face looks down (walls tile plaster this way).
// Positions in the GLB are quantised; `matrix` is the node transform that turns them back into metres.
function boxUV(geo, matrix) {
  const p = geo.attributes.position, n = geo.attributes.normal, uv = new Float32Array(p.count * 2), v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i).applyMatrix4(matrix);
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
    const [a, b] = ax >= ay && ax >= az ? [v.z, v.y] : az >= ay ? [v.x, v.y] : [v.x, v.z];
    uv[i * 2] = a; uv[i * 2 + 1] = b;
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
}

/* ---------- the room shell: plank floor, walls, mouldings, rug ---------- */

export function makeRoom() {
  const g = model('Room');
  const walls = g.getObjectByName('Room_Walls');
  walls.traverse((m) => { if (m.isMesh) { m.geometry = m.geometry.clone(); m.updateMatrix(); boxUV(m.geometry, m.matrix); } });
  dress(g, 'Room Walls', new THREE.MeshStandardMaterial({ map: T.plaster(), roughness: 0.92 }));
  // each plank tone keeps its colour; the grain multiplies over it
  const oak = T.oakGrain();
  for (const k of 'ABCD') g.getObjectByName('Room_Floor_' + k).traverse((m) => { if (m.isMesh) { m.material = m.material.clone(); m.material.color.offsetHSL(0, 0, 0.06); m.material.map = oak; } });
  dress(g, 'Room Rug', new THREE.MeshStandardMaterial({ map: T.rug(), roughness: 1 }));
  return g;
}

/* ---------- cats in space ---------- */

export function makeCat(coat, seed) {
  const cat = model('Cat');
  dress(cat, 'Cat Body', std(0xffffff, { map: T.catCoat({ ...coat, seed }), roughness: 0.9, side: THREE.DoubleSide }));
  dress(cat, 'Cat Limbs', std(coat.limbs, { roughness: 0.9 }));
  dress(cat, 'Cat Ears', std(coat.ears, { roughness: 0.9 }));
  // a little self-light so the eyes still catch in deep space
  const eye = new THREE.MeshPhysicalMaterial({ color: coat.eye, emissive: coat.eye, emissiveIntensity: 0.35, roughness: 0.08, clearcoat: 1 });
  for (const n of ['Cat Eye L', 'Cat Eye R']) dress(cat, n, eye);
  return cat;
}

export const makeHelmet = () => model('CatHelmet');

// The stargate frame, in units of the swirl it surrounds (the swirl's edge sits at r = 0.4).
export const makePortalFrame = () => model('Portal');

/* ---------- Yamaha F310 ---------- */

export function makeGuitar() {
  const root = new THREE.Group();
  root.add(model('GuitarStand'));
  const guitar = new THREE.Group();
  const body = model('Guitar');
  guitar.add(body);
  root.add(guitar);
  dress(body, 'Guitar Top', std(0xffffff, { map: T.spruce(), roughness: 0.3 }));

  // Strings fan from the saddle (5.6cm) to the nut (3.8cm); the room plucks these.
  const TOP = 0.106, NUT = 0.94;
  const strings = [];
  const gauges = [0.0012, 0.001, 0.0009, 0.0008, 0.0006, 0.0005];
  const bronze = std(0xc9a46a, { metalness: 0.9, roughness: 0.3 });
  const steel = std(0xe6e6e6, { metalness: 1, roughness: 0.22 });
  const hitMat = new THREE.MeshBasicMaterial({ visible: false });
  // Past the nut each string runs up the tilted headstock to its tuner post (3 a side).
  const tilt = -0.22, post = (i) => {
    const s = i < 3 ? -1 : 1, row = i < 3 ? 2 - i : i - 3;
    const y = 0.05 + row * 0.048, z = 0.0122;
    return V(s * 0.026, NUT + y * Math.cos(tilt) - z * Math.sin(tilt), TOP + 0.002 + y * Math.sin(tilt) + z * Math.cos(tilt));
  };
  for (let i = 0; i < 6; i++) {
    const t = i / 5 - 0.5;
    const a = V(t * 0.056, 0.127, TOP + 0.013), b = V(t * 0.038, NUT, TOP + 0.0095);
    const mat = i < 4 ? bronze : steel;
    const mesh = cyl(a, b, gauges[i], mat, 5);
    mesh.castShadow = false;
    guitar.add(mesh);
    guitar.add(cyl(b, post(i), gauges[i], mat, 5));
    const hit = cyl(a, b, 0.0042, hitMat, 6);
    hit.userData.string = i;
    guitar.add(hit);
    strings.push({ mesh, base: mesh.position.clone(), amp: 0, hit });
  }

  guitar.position.set(0, 0.11, 0.1);
  guitar.rotation.x = -0.2;

  return { root, guitar, body, strings };
}

/* ---------- easel, half-finished canvas, stool with palette ---------- */

export function makeEasel(paint) {
  const g = model('Easel');

  // The canvas sits on the tray, tilted back with the mast; the clamp is part of the model.
  const holder = new THREE.Group();
  holder.position.set(0, 0.93, 0.24);
  holder.rotation.x = -0.13;
  const linen = std(0xf1ece2, { roughness: 0.9 });
  const art = new THREE.MeshStandardMaterial({ map: paint.texture, roughness: 0.85 });
  const back = std(0xd9cfbf, { roughness: 0.95 });
  const canvas = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.69, 0.035), [linen, linen, linen, linen, art, back]);
  canvas.position.set(0, 0.365, -0.02);
  holder.add(canvas);
  g.add(holder);

  return { root: g, canvas };
}

/* ---------- desk, laptop, mug, plant, chair ---------- */

export function makeDesk() {
  const g = model('Desk');

  const laptop = model('Laptop');
  laptop.position.set(-0.05, 0.768, 0.04);
  laptop.rotation.y = -0.12;
  const screen = dress(laptop, 'Laptop Screen', new THREE.MeshBasicMaterial({ map: T.laptopScreen(), toneMapped: false }));
  screen.color.setScalar(0.92);
  g.add(laptop);

  // chair, pulled out
  const chair = model('Chair');
  chair.position.set(0.1, 0, 0.62); chair.rotation.y = 0.35;
  g.add(chair);

  return { root: g, laptop };
}

/* ---------- coat rack + the Placecom hoodie ---------- */

export const makeRack = () => model('Rack');

// Hangs from its hook at the origin. The panels carry UVs laid out like the print canvas.
export function makeHoodie() {
  const pivot = model('Hoodie');
  const front = std(0xffffff, { map: T.hoodieFront(), roughness: 0.95 });
  for (const n of ['Hoodie Front', 'Hoodie Sleeve L', 'Hoodie Sleeve R', 'Hoodie Pocket']) dress(pivot, n, front);
  front.side = THREE.DoubleSide;
  dress(pivot, 'Hoodie Back', std(0xffffff, { map: T.hoodieBack(), roughness: 0.95 }));
  dress(pivot, 'Hoodie Hood', std(0x5e1824, { roughness: 0.95, side: THREE.DoubleSide }));
  return pivot;
}

/* ---------- doors to the outside ---------- */

export function makeDoor(word, portalStops) {
  const root = model('DoorFrame');
  const W = 1.1, H = 2.25;

  const hinge = new THREE.Group();
  hinge.position.set(-W / 2, 0, 0);
  const panel = model('DoorLeaf');
  hinge.add(panel);
  // the name plate sits on the lock rail
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.112), new THREE.MeshStandardMaterial({ map: T.plaque(word), metalness: 0.6, roughness: 0.35 }));
  plate.position.set(W / 2, 1.55, 0.0025); hinge.add(plate);
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

// The model is built for the 1.9 × 1.4m opening in the back wall; its lining sits just
// inside the hole so no face shares a plane with the wall (shared planes flicker).
export function makeWindow(w, h) {
  const g = model('Window');
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ color: 0x9fb8d8, transparent: true, opacity: 0.06, roughness: 0.05, metalness: 0.2 }));
  glass.position.z = -0.01; g.add(glass);
  return g;
}

/* ---------- floor lamp ---------- */

export function makeLamp() {
  const g = model('Lamp');
  dress(g, 'Lamp Shade', new THREE.MeshStandardMaterial({ color: 0xf2e2c4, emissive: 0xffb866, emissiveIntensity: 0.18, roughness: 0.9, side: THREE.DoubleSide }));
  dress(g, 'Lamp Bulb', new THREE.MeshBasicMaterial({ color: new THREE.Color(1.3, 1.05, 0.75), toneMapped: false }));
  const light = new THREE.PointLight(0xffb36b, 3.2, 0, 2);
  light.position.y = 1.6; g.add(light);
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
