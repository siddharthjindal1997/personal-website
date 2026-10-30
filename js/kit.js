// The cartoon look: flat stepped shading, plus a small kit for building lots of little
// coloured parts into one mesh (the garage's clutter, the floating houses, the debris).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const UP = V(0, 1, 0);
const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), col = new THREE.Color();

let RAMP = null;
function ramp() {
  if (RAMP) return RAMP;
  RAMP = new THREE.DataTexture(new Uint8Array([120, 120, 190, 255, 255]), 5, 1, THREE.RedFormat);
  RAMP.minFilter = RAMP.magFilter = THREE.NearestFilter;
  RAMP.needsUpdate = true;
  return RAMP;
}

export const toon = (o = {}) => new THREE.MeshToonMaterial({ gradientMap: ramp(), ...o });
export const glow = (o = {}) => new THREE.MeshBasicMaterial({ toneMapped: false, ...o });
export const kitToon = () => toon({ vertexColors: true });
export const kitGlow = () => glow({ vertexColors: true });

// Swap every lit material under `root` for its toon equivalent; shared materials stay shared.
export function toonify(root) {
  const done = new Map();
  const swap = (mat) => {
    if (!mat.isMeshStandardMaterial) return mat;
    if (!done.has(mat)) {
      done.set(mat, toon({
        color: mat.color, map: mat.map, side: mat.side, transparent: mat.transparent, opacity: mat.opacity,
        emissive: mat.emissive, emissiveMap: mat.emissiveMap, emissiveIntensity: mat.emissiveIntensity,
        vertexColors: mat.vertexColors, alphaTest: mat.alphaTest, name: mat.name,
      }));
    }
    return done.get(mat);
  };
  root.traverse((m) => {
    if (m.isMesh) m.material = Array.isArray(m.material) ? m.material.map(swap) : swap(m.material);
  });
}

export class Kit {
  parts = [];

  add(geo, color, pos = [0, 0, 0], rot = [0, 0, 0], scale = [1, 1, 1]) {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    g.applyMatrix4(m4.compose(V(...pos), q.setFromEuler(e.set(...rot)), V(...scale)));
    for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k);
    g.clearGroups();
    col.set(color);
    const c = new Float32Array(g.attributes.position.count * 3);
    for (let i = 0; i < c.length; i += 3) { c[i] = col.r; c[i + 1] = col.g; c[i + 2] = col.b; }
    g.setAttribute('color', new THREE.BufferAttribute(c, 3));
    this.parts.push(g);
    return this;
  }

  // centred box
  box(w, h, d, x, y, z, color, rot) { return this.add(new THREE.BoxGeometry(w, h, d), color, [x, y, z], rot); }

  // a rod between two points
  rod(a, b, r, color, seg = 8) {
    const A = V(...a), dir = V(...b).sub(A), len = dir.length();
    const g = new THREE.CylinderGeometry(r, r, len, seg);
    g.applyQuaternion(q.setFromUnitVectors(UP, dir.clone().normalize()));
    return this.add(g, color, A.addScaledVector(dir, 0.5).toArray());
  }

  ball(r, x, y, z, color, scale = [1, 1, 1]) { return this.add(new THREE.SphereGeometry(r, 16, 12), color, [x, y, z], [0, 0, 0], scale); }

  // a disc facing +z, for dials and speaker cones
  disc(r, d, x, y, z, color) { return this.add(new THREE.CylinderGeometry(r, r, d, 24), color, [x, y, z], [Math.PI / 2, 0, 0]); }

  // gable roof: ridge along x, base centred at (x, y, z)
  gable(w, h, d, x, y, z, color, rotY = 0) {
    const s = new THREE.Shape([new THREE.Vector2(-d / 2, 0), new THREE.Vector2(d / 2, 0), new THREE.Vector2(0, h)]);
    const g = new THREE.ExtrudeGeometry(s, { depth: w, bevelEnabled: false });
    g.translate(0, 0, -w / 2); g.rotateY(Math.PI / 2 + rotY);
    return this.add(g, color, [x, y, z]);
  }

  // a flat broken shape, top colour over a darker edge: floor shards, ground chunks
  shard(pts, depth, top, side, pos, rot) {
    const g = new THREE.ExtrudeGeometry(new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y))), { depth, bevelEnabled: false });
    g.rotateX(Math.PI / 2); // the shape's y is now z, its top cap at y = 0 facing up
    const n = g.attributes.normal, up = [];
    for (let i = 0; i < n.count; i++) if (n.getY(i) > 0.9) up.push(i);
    this.add(g, side, pos, rot);
    const c = this.parts[this.parts.length - 1].attributes.color;
    col.set(top);
    for (const i of up) c.setXYZ(i, col.r, col.g, col.b);
    return this;
  }

  merged() { return mergeGeometries(this.parts, false); }
  mesh(mat) { return new THREE.Mesh(this.merged(), mat); }
}

// Wobbly outline of a broken edge: points from a to b with the middle ones knocked off the line.
export function jag(a, b, n, amp, r) {
  const out = [];
  for (let i = 1; i < n; i++) {
    const t = i / n, nx = -(b[1] - a[1]), ny = b[0] - a[0], l = Math.hypot(nx, ny) || 1, k = (r() - 0.5) * 2 * amp;
    out.push([a[0] + (b[0] - a[0]) * t + (nx / l) * k, a[1] + (b[1] - a[1]) * t + (ny / l) * k]);
  }
  return out;
}

// A lumpy closed loop, for holes and broken slabs.
export function blob(cx, cy, rx, ry, n, r, rough = 0.28) {
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2, k = 1 + (r() - 0.5) * 2 * rough;
    return [cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k];
  });
}
