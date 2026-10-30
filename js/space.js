// Outside the room: reality has come apart. Black void, the neighbourhood repeating in broken
// floating copies, bright cracks between the copies, and hundreds of the same cat.
import * as THREE from 'three';
import { rng, stopSign } from './textures.js';
import { kitToon, kitGlow, toon } from './kit.js';
import { baked } from './props.js';
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

/* ---------- small things adrift ---------- */

// The stop sign on its boulder, a side table, an upside-down rocking chair, a tree on a clod
// of lawn, a corner of somebody's roof, a slab of pavement. All modelled in Spline.
function adrift() {
  const mat = kitToon();
  return ['AdriftSign', 'AdriftTable', 'AdriftChair', 'AdriftTree', 'AdriftRoof', 'AdriftPave'].map((name) => new THREE.Mesh(baked(name), mat));
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
  const blockGeo = baked('Block'), blockGlow = baked('BlockGlow');
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
  drifters[0].add(new THREE.Mesh(baked('AdriftSign', 'AdriftSign Face'), toon({ map: stopSign() })));
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
