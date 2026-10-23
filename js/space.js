// Outside the room: cartoon space, a portal, odd planets, and cats.
import * as THREE from 'three';
import { rng, toTex } from './textures.js';
import { std } from './props.js';
import { meow } from './audio.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const TAU = Math.PI * 2;

/* ---------- sky ---------- */

function nebula() {
  const W = 2048, H = 1024, r = rng(77);
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, H);
  gr.addColorStop(0, '#0d0828'); gr.addColorStop(0.5, '#08182a'); gr.addColorStop(1, '#150a26');
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  const hues = [[150, 70, 220], [40, 200, 180], [230, 80, 170], [70, 100, 230], [120, 230, 90]];
  for (let i = 0; i < 90; i++) {
    const [R, G, B] = hues[(r() * hues.length) | 0];
    const x = r() * W, y = 180 + r() * (H - 360), rad = 80 + r() * 320, a = 0.04 + r() * 0.1;
    for (const ox of [-W, 0, W]) {
      const rg = g.createRadialGradient(x + ox, y, 0, x + ox, y, rad);
      rg.addColorStop(0, `rgba(${R},${G},${B},${a})`); rg.addColorStop(1, `rgba(${R},${G},${B},0)`);
      g.fillStyle = rg; g.fillRect(x + ox - rad, y - rad, rad * 2, rad * 2);
    }
  }
  for (let i = 0; i < 2500; i++) {
    g.fillStyle = `rgba(255,255,255,${r() * 0.35})`;
    g.fillRect(r() * W, r() * H, 1, 1);
  }
  return toTex(c);
}

function stars(renderer) {
  const N = 1800, pos = new Float32Array(N * 3), size = new Float32Array(N), seed = new Float32Array(N), col = new Float32Array(N * 3);
  const tints = [[1, 1, 1], [0.75, 0.85, 1], [1, 0.8, 0.95], [0.8, 1, 0.85]];
  for (let i = 0; i < N; i++) {
    const u = Math.random() * 2 - 1, a = Math.random() * TAU, s = Math.sqrt(1 - u * u), d = 120 + Math.random() * 30;
    pos.set([Math.cos(a) * s * d, u * d, Math.sin(a) * s * d], i * 3);
    size[i] = Math.random() < 0.06 ? 3 + Math.random() * 3 : 1 + Math.random() * 1.6;
    seed[i] = Math.random() * 100;
    col.set(tints[(Math.random() * tints.length) | 0], i * 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('size', new THREE.BufferAttribute(size, 1));
  geo.setAttribute('seed', new THREE.BufferAttribute(seed, 1));
  geo.setAttribute('tint', new THREE.BufferAttribute(col, 3));
  return new THREE.Points(geo, new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uScale: { value: renderer.getPixelRatio() } },
    vertexShader: /* glsl */`
      attribute float size; attribute float seed; attribute vec3 tint;
      uniform float uTime; uniform float uScale; varying vec3 vC;
      void main() {
        float tw = 0.6 + 0.4 * sin(uTime * (0.8 + fract(seed) * 2.0) + seed);
        vC = tint * tw * (size > 2.5 ? 2.2 : 1.0);
        gl_PointSize = size * uScale;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */`
      varying vec3 vC;
      void main() { float d = length(gl_PointCoord - 0.5); gl_FragColor = vec4(vC, smoothstep(0.5, 0.1, d)); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
}

/* ---------- portal ---------- */

function portal() {
  return new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: /* glsl */`
      uniform float uTime; varying vec2 vUv;
      void main() {
        vec2 p = vUv * 2.0 - 1.0;
        float r = length(p), a = atan(p.y, p.x);
        float edge = 0.8 + 0.05 * sin(a * 7.0 + uTime * 1.3) + 0.035 * sin(a * 13.0 - uTime * 2.1) + 0.02 * sin(a * 23.0 + uTime * 3.0);
        float glow = exp(-max(r - edge, 0.0) * 14.0) * 0.28;
        float inside = 1.0 - smoothstep(edge - 0.015, edge + 0.015, r);
        float s1 = 0.5 + 0.5 * sin(a * 3.0 + r * 16.0 - uTime * 2.2);
        float s2 = 0.5 + 0.5 * sin(a * 5.0 - r * 26.0 + uTime * 3.4);
        vec3 deep = vec3(0.02, 0.22, 0.03), mid = vec3(0.36, 0.88, 0.16), hot = vec3(0.85, 1.0, 0.55);
        vec3 col = mix(deep, mid, s1);
        col = mix(col, hot, s2 * smoothstep(0.15, 0.8, r) * 0.55);
        col += hot * (1.0 - smoothstep(0.0, 0.3, r)) * 0.35;
        col += hot * smoothstep(edge - 0.08, edge, r) * inside * 1.2;
        vec3 outC = col * inside * 0.95 + mid * glow;
        gl_FragColor = vec4(outC, max(inside, glow));
      }`,
    transparent: true, depthWrite: false,
  }));
}

/* ---------- planets ---------- */

function bandTex(stops, seed) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 256;
  const g = c.getContext('2d'), r = rng(seed);
  let y = 0;
  while (y < 256) {
    const h = 6 + r() * 26;
    g.fillStyle = stops[(r() * stops.length) | 0];
    g.beginPath(); g.moveTo(0, y);
    for (let x = 0; x <= 512; x += 16) g.lineTo(x, y + Math.sin(x * 0.03 + y) * 3);
    for (let x = 512; x >= 0; x -= 16) g.lineTo(x, y + h + Math.sin(x * 0.025 + y * 2) * 3);
    g.fill();
    y += h;
  }
  g.fillStyle = 'rgba(160,40,40,.85)'; g.beginPath(); g.ellipse(330, 150, 34, 16, 0, 0, TAU); g.fill();
  return toTex(c);
}

function faceTex() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#e6a2c8'; g.fillRect(0, 0, 512, 256);
  g.fillStyle = 'rgba(180,90,150,.5)';
  for (const [x, y, rr] of [[60, 60, 18], [420, 190, 26], [200, 210, 12], [470, 50, 14]]) { g.beginPath(); g.arc(x, y, rr, 0, TAU); g.fill(); }
  // the face sits at u = 0.75, which is the sphere's local -z
  g.fillStyle = '#fff'; for (const x of [355, 410]) { g.beginPath(); g.ellipse(x, 110, 18, 24, 0, 0, TAU); g.fill(); }
  g.fillStyle = '#1a1022'; for (const x of [360, 414]) { g.beginPath(); g.arc(x, 116, 10, 0, TAU); g.fill(); }
  g.strokeStyle = '#1a1022'; g.lineWidth = 6; g.lineCap = 'round';
  g.beginPath(); g.moveTo(350, 160); g.quadraticCurveTo(372, 150, 384, 162); g.quadraticCurveTo(398, 150, 418, 158); g.stroke();
  return toTex(c);
}

function lumpy(radius, color, seed) {
  const r = rng(seed);
  const geo = new THREE.IcosahedronGeometry(radius, 3);
  const p = geo.attributes.position, v = new THREE.Vector3();
  const bumps = Array.from({ length: 7 }, () => [V(r() - 0.5, r() - 0.5, r() - 0.5).normalize(), 0.08 + r() * 0.14]);
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i).normalize();
    let k = 1;
    for (const [d, h] of bumps) k += h * Math.pow(Math.max(0, v.dot(d)), 6);
    p.setXYZ(i, v.x * radius * k, v.y * radius * k, v.z * radius * k);
  }
  geo.computeVertexNormals();
  return new THREE.Mesh(geo, std(color, { roughness: 0.85, flatShading: true }));
}

/* ---------- cats ---------- */

const COATS = [
  { body: 0xe0873a, head: 0xe0873a, bits: 0xf3e3cc },
  { body: 0x232326, head: 0x232326, bits: 0x232326 },
  { body: 0xf2efe9, head: 0xe0873a, bits: 0x2a2a2e },
  { body: 0x8c919c, head: 0x8c919c, bits: 0xe9e4dc },
  { body: 0xe8d2a8, head: 0xe8d2a8, bits: 0x6b4a33 },
  { body: 0xf2efe9, head: 0xf2efe9, bits: 0xf2efe9 },
];

function makeCat(coat, helmet) {
  const cat = new THREE.Group();
  const fur = std(coat.body, { roughness: 0.9 }), headFur = std(coat.head, { roughness: 0.9 }), bits = std(coat.bits, { roughness: 0.9 });
  const add = (geo, mat, x, y, z, sx = 1, sy = 1, sz = 1) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.scale.set(sx, sy, sz); cat.add(m); return m; };
  add(new THREE.SphereGeometry(0.2, 18, 14), fur, 0, 0, 0, 1, 0.85, 1.7);
  add(new THREE.SphereGeometry(0.16, 18, 14), headFur, 0, 0.12, 0.38);
  add(new THREE.SphereGeometry(0.075, 12, 10), std(0xf6efe6, { roughness: 0.9 }), 0, 0.07, 0.5, 1.15, 0.8, 0.9);
  add(new THREE.SphereGeometry(0.018, 8, 6), std(0xe58aa0), 0, 0.105, 0.57);
  for (const s of [-1, 1]) {
    const ear = add(new THREE.ConeGeometry(0.06, 0.12, 4), bits, s * 0.085, 0.27, 0.36);
    ear.rotation.z = -s * 0.3;
    const eye = add(new THREE.SphereGeometry(0.03, 10, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 2.2, 0.5), toneMapped: false }), s * 0.062, 0.16, 0.5);
    eye.scale.set(1, 1.25, 0.6);
  }
  const leg = new THREE.CapsuleGeometry(0.045, 0.16, 4, 8);
  for (const [x, z, rx] of [[-0.1, 0.2, -1.1], [0.1, 0.2, -1.1], [-0.1, -0.2, 1.1], [0.1, -0.2, 1.1]]) {
    const l = add(leg, fur, x, -0.13, z);
    l.rotation.x = rx; l.position.z += Math.sign(z) * 0.06;
  }
  const tail = new THREE.CatmullRomCurve3([V(0, 0.04, -0.3), V(0, 0.16, -0.48), V(0.07, 0.34, -0.56), V(0.16, 0.46, -0.46)]);
  add(new THREE.TubeGeometry(tail, 20, 0.034, 8), bits === fur ? fur : bits, 0, 0, 0);
  if (helmet) {
    add(new THREE.SphereGeometry(0.25, 24, 18), new THREE.MeshStandardMaterial({ color: 0xbfe6ff, transparent: true, opacity: 0.22, roughness: 0.05, metalness: 0.1, depthWrite: false }), 0, 0.14, 0.4);
    const collar = add(new THREE.TorusGeometry(0.2, 0.025, 8, 28), std(0xd8dde4, { metalness: 0.7, roughness: 0.3 }), 0, 0.02, 0.3);
    collar.rotation.x = 1.2;
  }
  return cat;
}

export function buildSpace(scene, renderer) {
  const sky = new THREE.Mesh(new THREE.SphereGeometry(160, 48, 24), new THREE.MeshBasicMaterial({ map: nebula(), side: THREE.BackSide, depthWrite: false }));
  scene.add(sky);
  const starfield = stars(renderer);
  scene.add(starfield);

  const gate = portal();
  scene.add(gate);

  const ringed = lumpy(5, 0xe48a5e, 3);
  ringed.position.set(-19, -17, -29); ringed.scale.setScalar(0.8);
  const ring = new THREE.Mesh(new THREE.RingGeometry(7, 10.5, 64), new THREE.MeshStandardMaterial({ color: 0xf2d6a2, side: THREE.DoubleSide, transparent: true, opacity: 0.75, roughness: 0.8 }));
  ring.rotation.set(1.2, 0.3, 0); ringed.add(ring);
  const giant = new THREE.Mesh(new THREE.SphereGeometry(7, 48, 32), std(0xffffff, { map: bandTex(['#5fb7b0', '#e8d8b0', '#9a6a4a', '#3f7f9a', '#d9a066'], 9), roughness: 0.7 }));
  giant.position.set(15, -19, -13); giant.rotation.z = 0.35;
  const face = new THREE.Mesh(new THREE.SphereGeometry(3.2, 40, 28), std(0xffffff, { map: faceTex(), roughness: 0.8 }));
  const moon = lumpy(1.4, 0x9fa4c8, 11);
  moon.position.set(22, 6, -30);
  scene.add(ringed, giant, face, moon);

  // cats on slow loops around the room, never through it
  let faceY = 0;
  const cats = [];
  const pickables = [];
  for (let i = 0; i < 11; i++) {
    const m = makeCat(COATS[i % COATS.length], i === 2 || i === 7);
    m.scale.setScalar(1.3 + (i % 3) * 0.25);
    m.traverse((o) => { if (o.isMesh) { o.userData.cat = i; pickables.push(o); } });
    scene.add(m);
    cats.push({
      mesh: m, rx: 8 + (i % 4) * 1.6, rz: 6.6 + (i % 3) * 1.2, w: (i % 2 ? 1 : -1) * (0.035 + (i % 5) * 0.012),
      th: (i / 11) * TAU, yb: -3.5 + ((i * 7) % 11) * 0.85, ph: i * 1.9,
      spin: V(0.12 + (i % 3) * 0.08, 0.1 + (i % 4) * 0.05, 0.06), boost: 0,
      off: V(), vel: V(), pitch: 0.85 + (i % 5) * 0.08,
    });
  }

  return {
    cats, pickables,
    // The room hides whatever is straight behind it, so the portal sits in a corner
    // that's open for the screen shape: top-right on wide screens, top band on tall ones.
    frame(portrait) {
      const cam = portrait ? V(0, 12.5, 8) : V(0, 10, 11);
      if (portrait) { gate.position.set(0, -21, -40); gate.scale.setScalar(28); face.position.set(3, -15, 1); }
      else { gate.position.set(17.6, -14.9, -35.1); gate.scale.setScalar(22); face.position.set(-11, -19, -6); }
      gate.lookAt(cam);
      face.lookAt(cam); face.rotateY(Math.PI);
      faceY = face.position.y;
    },
    poke(i) {
      const c = cats[i];
      meow(c.pitch);
      c.boost = 9;
      const out = c.mesh.position.clone().setY(0).normalize();
      c.vel.addScaledVector(out, 7).add(V(0, 4, 0));
    },
    update(dt, t) {
      gate.material.uniforms.uTime.value = t;
      gate.rotation.z += dt * 0.05;
      starfield.material.uniforms.uTime.value = t;
      ringed.rotation.y += dt * 0.03; giant.rotation.y += dt * 0.02; moon.rotation.y += dt * 0.05;
      face.position.y = faceY + Math.sin(t * 0.4) * 0.5;
      for (const c of cats) {
        c.th += c.w * dt;
        // springy kick so a poked cat flies off and drifts back
        c.vel.addScaledVector(c.off, -1.1 * dt).multiplyScalar(Math.exp(-dt * 0.9));
        c.off.addScaledVector(c.vel, dt);
        c.boost *= Math.exp(-dt * 1.2);
        const s = 1 + c.boost;
        c.mesh.rotation.x += c.spin.x * s * dt;
        c.mesh.rotation.y += c.spin.y * s * dt;
        c.mesh.rotation.z += c.spin.z * s * dt;
        c.mesh.position.set(Math.cos(c.th) * c.rx, c.yb + Math.sin(t * 0.3 + c.ph) * 1.1, -1.5 + Math.sin(c.th) * c.rz).add(c.off);
      }
    },
  };
}
