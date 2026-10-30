// The cat: cream fur, salmon patches, a pink collar with a gold bell, enormous green eyes.
// One texture and one merged mesh per pose, so a hundred of them cost next to nothing.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { catSkin, CAT_UV } from './textures.js';
import { toon } from './kit.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();

// Copy `geo` under `matrix`, squeezing its UVs into a rect of the skin ([u0, v0, u1, v1], or [u, v] for a flat colour).
function part(parts, geo, matrix, rect) {
  const g = geo.index ? geo.toNonIndexed() : geo.clone();
  g.applyMatrix4(matrix);
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) {
    if (rect.length === 2) uv.setXY(i, rect[0], rect[1]);
    else uv.setXY(i, rect[0] + uv.getX(i) * (rect[2] - rect[0]), rect[1] + uv.getY(i) * (rect[3] - rect[1]));
  }
  g.clearGroups();
  parts.push(g);
}

const mat = (p, r = [0, 0, 0], s = [1, 1, 1]) => new THREE.Matrix4().compose(V(...p), q.setFromEuler(e.set(...r)), V(...s));

const POSES = {
  // mid-pounce: paws thrown forward, hind legs out behind, tail up
  leap: {
    body: [0.56, 0.37, 0.36], head: [0.52, 0.26, 0.03], yaw: 0.35, tilt: 0.05,
    legs: [[[0.3, -0.18, 0.17], [0.7, -0.26, 0.24]], [[0.3, -0.18, -0.17], [0.68, -0.2, -0.22]], [[-0.34, -0.16, 0.17], [-0.68, -0.36, 0.24]], [[-0.34, -0.16, -0.17], [-0.64, -0.3, -0.24]]],
    tail: [[-0.46, 0.1, 0], [-0.74, 0.3, 0], [-0.86, 0.72, 0.04], [-0.66, 1.08, 0.04], [-0.46, 1.12, 0]], face: CAT_UV.awake,
  },
  // drifting: legs dangling every which way, tail curled
  drift: {
    body: [0.52, 0.38, 0.36], head: [0.48, 0.24, 0.04], yaw: 0.55, tilt: -0.08,
    legs: [[[0.28, -0.22, 0.17], [0.38, -0.52, 0.28]], [[0.26, -0.22, -0.17], [0.44, -0.48, -0.22]], [[-0.3, -0.22, 0.17], [-0.46, -0.5, 0.27]], [[-0.3, -0.22, -0.17], [-0.34, -0.52, -0.26]]],
    tail: [[-0.44, 0.08, 0], [-0.76, 0.02, 0], [-1.02, 0.26, 0.06], [-1.0, 0.6, 0.08], [-0.82, 0.68, 0]], face: CAT_UV.awake,
  },
  // asleep in a loaf, even out here
  sleep: {
    body: [0.5, 0.33, 0.38], head: [0.42, 0.06, 0.16], yaw: 0.4, tilt: 0.28,
    legs: [[[0.24, -0.26, 0.2], [0.42, -0.31, 0.3]], [[-0.3, -0.26, 0.22], [-0.42, -0.31, 0.3]]],
    tail: [[-0.44, -0.12, 0.1], [-0.56, -0.2, 0.3], [-0.26, -0.28, 0.48], [0.1, -0.29, 0.5], [0.3, -0.26, 0.46]], face: CAT_UV.asleep,
  },
};

// `lo` is for the far-off crowd: same cat, a sixth of the triangles.
const GEO = {};
export function catGeometry(pose, lo = false) {
  const key = pose + (lo ? ':lo' : '');
  if (GEO[key]) return GEO[key];
  const P = POSES[pose], parts = [];
  const orb = lo ? new THREE.SphereGeometry(1, 12, 9) : new THREE.SphereGeometry(1, 24, 16);

  part(parts, orb, mat([0, 0, 0], [0, 0, 0], P.body), CAT_UV.body);

  // the head and everything fixed to it
  const H = mat(P.head, [0, P.yaw, P.tilt]), inHead = (m) => H.clone().multiply(m);
  part(parts, orb, inHead(mat([0, 0, 0], [0, 0, 0], [0.41, 0.35, 0.37])), P.face);
  const ear = new THREE.ConeGeometry(1, 1, lo ? 7 : 14);
  for (const s of [-1, 1]) {
    part(parts, ear, inHead(mat([s * 0.24, 0.36, -0.02], [0, 0, -s * 0.36], [0.135, 0.24, 0.07])), CAT_UV.cream);
    part(parts, ear, inHead(mat([s * 0.24, 0.345, 0.03], [0, 0, -s * 0.36], [0.085, 0.17, 0.05])), CAT_UV.ear);
    if (!lo) for (const a of [-0.14, 0.14]) {
      const w = new THREE.CylinderGeometry(0.0035, 0.0035, 0.3, 4);
      part(parts, w, inHead(mat([s * 0.48, -0.06 + a * 0.1, 0.19], [0, 0, Math.PI / 2 + s * a], [1, 1, 1])), CAT_UV.ink);
    }
  }

  // collar and bell, between head and body
  const axis = V(...P.head).normalize(), neck = V(...P.head).addScaledVector(axis, -0.24);
  const turn = new THREE.Quaternion().setFromUnitVectors(V(0, 0, 1), axis);
  part(parts, new THREE.TorusGeometry(0.3, 0.038, lo ? 5 : 8, lo ? 12 : 24), new THREE.Matrix4().compose(neck, turn, V(1, 1, 1)), CAT_UV.collar);
  part(parts, new THREE.SphereGeometry(0.058, lo ? 6 : 10, lo ? 4 : 8), mat([neck.x + 0.06, neck.y - 0.24, neck.z + 0.2]), CAT_UV.gold);

  for (const [a, b] of P.legs) {
    const A = V(...a), dir = V(...b).sub(A), len = dir.length();
    const g = new THREE.CapsuleGeometry(0.105, len, lo ? 2 : 4, lo ? 6 : 10);
    g.applyQuaternion(q.setFromUnitVectors(V(0, 1, 0), dir.clone().normalize()));
    part(parts, g, mat(A.addScaledVector(dir, 0.5).toArray()), CAT_UV.cream);
  }

  const curve = new THREE.CatmullRomCurve3(P.tail.map((p) => V(...p)));
  part(parts, new THREE.TubeGeometry(curve, lo ? 12 : 24, 0.05, lo ? 5 : 8), new THREE.Matrix4(), CAT_UV.tail);
  part(parts, new THREE.SphereGeometry(0.05, lo ? 5 : 8, lo ? 4 : 6), mat(P.tail[P.tail.length - 1]), CAT_UV.tailTip);

  return (GEO[key] = mergeGeometries(parts, false));
}

let MAT = null;
export const catMaterial = () => (MAT ||= toon({ map: catSkin() }));

export const makeCat = (pose) => new THREE.Mesh(catGeometry(pose), catMaterial());
