// What's behind the doors.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import * as T from './textures.js';
import { std, cyl } from './props.js';
import { GIGS, PLACES } from './content.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

/* ---------- Gigs: a night crowd under stage lights ---------- */

export function buildGigs(renderer) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05050b);
  scene.fog = new THREE.FogExp2(0x0b0a1a, 0.026);
  scene.add(new THREE.HemisphereLight(0x39407a, 0x000000, 0.4));

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(160, 160), std(0x0c0c12, { roughness: 0.85 }));
  ground.rotation.x = -Math.PI / 2; scene.add(ground);

  const SZ = -20;
  const stage = new THREE.Mesh(new THREE.BoxGeometry(17, 1.2, 6), std(0x101016, { roughness: 0.7 }));
  stage.position.set(0, 0.6, SZ); scene.add(stage);
  const led = T.ledScreen();
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(13, 5.1), new THREE.MeshBasicMaterial({ map: led.texture, toneMapped: false, fog: false }));
  screen.position.set(0, 4.7, SZ - 2.9); scene.add(screen);
  const truss = std(0x2a2a30, { metalness: 0.7, roughness: 0.4 });
  scene.add(cyl(V(-8.6, 1.2, SZ - 2), V(-8.6, 8.2, SZ - 2), 0.18, truss));
  scene.add(cyl(V(8.6, 1.2, SZ - 2), V(8.6, 8.2, SZ - 2), 0.18, truss));
  scene.add(cyl(V(-8.6, 8.2, SZ - 2), V(8.6, 8.2, SZ - 2), 0.18, truss));

  const wash = [0xff7a3d, 0xd23cff, 0x3d7bff];
  wash.forEach((c, i) => { const l = new THREE.PointLight(c, 60, 30, 1.6); l.position.set((i - 1) * 6, 3, SZ + 2); scene.add(l); });

  // light beams
  const beamTex = T.verticalGradient([[0, '#ffffff'], [1, '#000000']], 4, 256, false);
  const beamGeo = new THREE.ConeGeometry(2.4, 18, 32, 1, true); beamGeo.translate(0, -9, 0);
  const beams = [];
  const cols = [0xffb070, 0xff5fd2, 0x7aa8ff, 0xffe2a0, 0xb07aff, 0xff9a5c, 0x8fd0ff];
  cols.forEach((c, i) => {
    const m = new THREE.Mesh(beamGeo, new THREE.MeshBasicMaterial({ color: c, alphaMap: beamTex, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
    m.position.set(-7.5 + i * 2.5, 8.1, SZ - 1.8);
    scene.add(m); beams.push(m);
  });

  // crowd
  const person = mergeGeometries([
    new THREE.CapsuleGeometry(0.24, 0.8, 4, 8).translate(0, 0.66, 0),
    new THREE.SphereGeometry(0.14, 10, 8).translate(0, 1.5, 0),
  ]);
  const COUNT = 820;
  const crowd = new THREE.InstancedMesh(person, std(0x0a0a10, { roughness: 1 }), COUNT);
  const folk = [];
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), p3 = new THREE.Vector3();
  for (let i = 0; i < COUNT; i++) {
    const x = (Math.random() - 0.5) * 24, z = SZ + 4.5 + Math.random() * 22;
    folk.push({ x, z, s: 0.9 + Math.random() * 0.22, ph: Math.random() * Math.PI * 2, jump: Math.random() < 0.3 });
  }
  scene.add(crowd);

  // phone torches
  const PH = 900, pp = new Float32Array(PH * 3), phase = new Float32Array(PH);
  for (let i = 0; i < PH; i++) {
    const f = folk[i % COUNT];
    pp[i * 3] = f.x + (Math.random() - 0.5) * 0.6; pp[i * 3 + 1] = 1.9 + Math.random() * 0.6; pp[i * 3 + 2] = f.z + (Math.random() - 0.5) * 0.6;
    phase[i] = Math.random() * Math.PI * 2;
  }
  const phGeo = new THREE.BufferGeometry();
  phGeo.setAttribute('position', new THREE.BufferAttribute(pp, 3));
  phGeo.setAttribute('phase', new THREE.BufferAttribute(phase, 1));
  const phones = new THREE.Points(phGeo, new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uScale: { value: renderer.getPixelRatio() } },
    vertexShader: /* glsl */`
      attribute float phase; uniform float uTime; uniform float uScale;
      void main() {
        vec3 p = position;
        p.x += sin(uTime * 1.1 + phase) * 0.3; p.y += cos(uTime * 1.1 + phase) * 0.06;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = uScale * 90.0 / -mv.z;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */`
      void main() { float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.0, d); gl_FragColor = vec4(vec3(1.6, 1.45, 1.2) * a, a); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  scene.add(phones);

  // stars
  const st = new Float32Array(500 * 3);
  for (let i = 0; i < 500; i++) {
    const a = Math.random() * Math.PI * 2, e = 0.15 + Math.random() * 1.2;
    st.set([Math.cos(a) * Math.cos(e) * 90, Math.sin(e) * 90, Math.sin(a) * Math.cos(e) * 90], i * 3);
  }
  const stars = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(st, 3)),
    new THREE.PointsMaterial({ color: 0xbfc8ff, size: 0.25, fog: false }));
  scene.add(stars);

  let slide = -1, nextAt = 0;
  return {
    scene, card: GIGS,
    pose: { target: V(0, 3.2, SZ + 2), r: 30, az: 0, pol: 1.47 },
    start: { target: V(0, 3.2, SZ + 2), r: 34, az: 0.25, pol: 1.52 },
    limits: { az: [-0.4, 0.4], pol: [1.28, 1.54], r: [16, 34] },
    portal: '#ff8a3d',
    update(t) {
      if (t > nextAt) {
        slide = (slide + 1) % GIGS.screen.length;
        const [name, sub] = GIGS.screen[slide];
        led.show(name, sub, [20, 290, 200][slide % 3]);
        nextAt = t + 4.5;
      }
      beams.forEach((b, i) => {
        b.rotation.z = Math.sin(t * 0.5 + i * 1.3) * 0.45;
        b.rotation.x = -0.55 - Math.sin(t * 0.37 + i) * 0.2;
      });
      for (let i = 0; i < COUNT; i++) {
        const f = folk[i];
        const bob = f.jump ? Math.max(0, Math.sin(t * 4.2 + f.ph)) * 0.18 : Math.sin(t * 2.1 + f.ph) * 0.03;
        p3.set(f.x, bob, f.z); sc.setScalar(f.s);
        crowd.setMatrixAt(i, m4.compose(p3, q, sc));
      }
      crowd.instanceMatrix.needsUpdate = true;
      phones.material.uniforms.uTime.value = t;
    },
  };
}

/* ---------- Places: floating islands at dusk ---------- */

const skyFrag = /* glsl */`
  varying vec3 vDir;
  void main() {
    float h = normalize(vDir).y;
    vec3 top = vec3(0.09, 0.13, 0.32), mid = vec3(0.47, 0.34, 0.6), hz = vec3(1.0, 0.68, 0.52), low = vec3(0.16, 0.15, 0.3);
    vec3 c = h > 0.0 ? mix(mix(hz, mid, smoothstep(0.0, 0.18, h)), top, smoothstep(0.18, 0.7, h)) : mix(hz, low, smoothstep(0.0, 0.15, -h));
    gl_FragColor = vec4(c, 1.0);
  }`;

function island(r, seed) {
  const rand = T.rng(seed);
  const g = new THREE.Group();
  const jitter = (geo, amt) => {
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) p.setXYZ(i, p.getX(i) + (rand() - 0.5) * amt, p.getY(i) + (rand() - 0.5) * amt * 0.5, p.getZ(i) + (rand() - 0.5) * amt);
    geo.computeVertexNormals();
    return geo;
  };
  const rock = new THREE.Mesh(jitter(new THREE.ConeGeometry(r, r * 1.7, 9, 3).toNonIndexed(), 0.35), std(0x8a6c5a, { flatShading: true, roughness: 0.9 }));
  rock.rotation.x = Math.PI; rock.position.y = -r * 0.85; g.add(rock);
  const top = new THREE.Mesh(jitter(new THREE.CylinderGeometry(r * 1.02, r, 0.35, 9, 1).toNonIndexed(), 0.12), std(0x7fae6b, { flatShading: true, roughness: 0.85 }));
  top.position.y = 0.0; g.add(top);
  const leaf = std(0x4f8a5a, { flatShading: true, roughness: 0.8 }), trunk = std(0x6a4a32);
  for (let i = 0; i < 4; i++) {
    const a = rand() * Math.PI * 2, d = r * (0.6 + rand() * 0.3);
    const tr = new THREE.Group(); tr.position.set(Math.cos(a) * d, 0.17, Math.sin(a) * d);
    const tk = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.4, 6), trunk); tk.position.y = 0.2; tr.add(tk);
    const cr = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.75, 6), leaf); cr.position.y = 0.7; tr.add(cr);
    g.add(tr);
  }
  return g;
}

const LANDMARKS = {
  kgp() {
    const g = new THREE.Group(), cream = std(0xeadfca, { roughness: 0.7 }), roof = std(0x9b4a33);
    const b = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.5, 0.55), cream); b.position.y = 0.25; g.add(b);
    const tw = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.95, 0.42), cream); tw.position.y = 0.48; g.add(tw);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), roof); dome.position.y = 0.95; g.add(dome);
    for (const x of [-0.7, 0.7]) { const r = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.25, 4), roof); r.rotation.y = Math.PI / 4; r.position.set(x, 0.62, 0); r.scale.set(1.2, 1, 0.75); g.add(r); }
    return g;
  },
  charminar() {
    const g = new THREE.Group(), stone = std(0xe4d2b0, { roughness: 0.8 });
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.6, 0.75), stone); b.position.y = 0.3; g.add(b);
    for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 1.35, 10), stone); m.position.set(x * 0.36, 0.68, z * 0.36); g.add(m);
      const k = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), stone); k.position.set(x * 0.36, 1.4, z * 0.36); g.add(k);
    }
    return g;
  },
  gateway() {
    const s = new THREE.Shape(); s.moveTo(-0.7, 0); s.lineTo(0.7, 0); s.lineTo(0.7, 1.1); s.lineTo(-0.7, 1.1); s.lineTo(-0.7, 0);
    const h = new THREE.Path(); h.moveTo(-0.28, 0.02); h.lineTo(-0.28, 0.55); h.absarc(0, 0.55, 0.28, Math.PI, 0, true); h.lineTo(0.28, 0.02); h.lineTo(-0.28, 0.02); s.holes.push(h);
    const g = new THREE.Group(), stone = std(0xd8c095, { roughness: 0.8 });
    const arch = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: 0.4, bevelEnabled: false }), stone); arch.position.z = -0.2; g.add(arch);
    for (const x of [-0.6, -0.2, 0.2, 0.6]) { const t = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.32, 8), stone); t.position.set(x, 1.26, 0); g.add(t); }
    return g;
  },
  mbs() {
    const g = new THREE.Group(), glass = std(0xb8c4d6, { metalness: 0.6, roughness: 0.25 });
    for (const x of [-0.42, 0, 0.42]) { const t = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.45, 0.3), glass); t.position.set(x, 0.72, 0); g.add(t); }
    const deck = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.07, 0.34), std(0xe9eef4, { roughness: 0.4 })); deck.position.set(0.06, 1.49, 0); g.add(deck);
    const tree = std(0x7a4fa0, { roughness: 0.6 });
    for (const x of [-0.9, 0.85]) {
      g.add(cyl(V(x, 0, 0.3), V(x, 0.7, 0.3), 0.025, tree));
      const c = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.18, 10, 1, true), tree); c.rotation.x = Math.PI; c.position.set(x, 0.78, 0.3); g.add(c);
    }
    return g;
  },
};

function paperPlane() {
  const g = new THREE.BufferGeometry();
  const v = new Float32Array([
    0, 0, 0.5, -0.32, 0, -0.3, 0, 0.02, -0.18,
    0, 0, 0.5, 0, 0.02, -0.18, 0.32, 0, -0.3,
    0, 0, 0.5, 0, 0.02, -0.18, 0, -0.12, -0.25,
  ]);
  g.setAttribute('position', new THREE.BufferAttribute(v, 3));
  g.computeVertexNormals();
  return new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0xffffff, side: THREE.DoubleSide, roughness: 0.6 }));
}

export function buildPlaces(renderer) {
  const scene = new THREE.Scene();
  const sky = new THREE.Mesh(new THREE.SphereGeometry(200, 32, 16), new THREE.ShaderMaterial({
    vertexShader: 'varying vec3 vDir; void main() { vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: skyFrag, side: THREE.BackSide, depthWrite: false,
  }));
  scene.add(sky);
  const sun = new THREE.Mesh(new THREE.SphereGeometry(7, 24, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 2.1, 1.3), toneMapped: false, fog: false }));
  sun.position.set(-12, 11, -160); scene.add(sun);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene(); envScene.add(sky.clone(), sun.clone());
  scene.environment = pmrem.fromScene(envScene, 0.02, 1, 400).texture;
  scene.environmentIntensity = 0.7;
  pmrem.dispose();
  scene.fog = new THREE.Fog(new THREE.Color().setRGB(1, 0.68, 0.52, THREE.LinearSRGBColorSpace), 50, 170);

  scene.add(new THREE.HemisphereLight(0xffd6b0, 0x2d2850, 0.9));
  const sunLight = new THREE.DirectionalLight(0xffc89a, 2.2);
  sunLight.position.set(-30, 18, -40); scene.add(sunLight);

  const water = new THREE.Mesh(new THREE.PlaneGeometry(500, 500), new THREE.MeshStandardMaterial({ color: 0x4a4f86, metalness: 0.9, roughness: 0.18 }));
  water.rotation.x = -Math.PI / 2; water.position.y = -6; scene.add(water);

  const spots = [V(-8, 1.5, -2), V(-2.7, 2.7, -5), V(2.7, 1.8, -2.5), V(8, 3.0, -5.5)];
  const isles = PLACES.stops.map((s, i) => {
    const g = island(2.2, 31 + i * 7);
    const lm = LANDMARKS[s.landmark](); lm.position.y = 0.17; lm.rotation.y = -0.3 + i * 0.15; lm.scale.setScalar(1.25); g.add(lm);
    const lab = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.label(s.name, s.years), depthWrite: false, fog: false }));
    lab.scale.set(3.4, 1.2, 1); lab.position.y = 3.1; g.add(lab);
    g.position.copy(spots[i]);
    scene.add(g);
    return { g, y: spots[i].y, ph: i * 1.7 };
  });

  const curves = [];
  for (let i = 0; i < spots.length - 1; i++) {
    const a = spots[i].clone().add(V(0, 1.2, 0)), b = spots[i + 1].clone().add(V(0, 1.2, 0));
    const c = a.clone().lerp(b, 0.5).add(V(0, 4, 0));
    const curve = new THREE.QuadraticBezierCurve3(a, c, b);
    curves.push(curve);
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(80)),
      new THREE.LineDashedMaterial({ color: 0xffffff, dashSize: 0.25, gapSize: 0.18, transparent: true, opacity: 0.7 }));
    line.computeLineDistances();
    scene.add(line);
  }
  const plane = paperPlane(); plane.scale.setScalar(0.9); scene.add(plane);
  const look = new THREE.Vector3();

  return {
    scene, card: PLACES,
    pose: { target: V(-0.6, 2.4, -3.5), r: 30, az: 0.06, pol: 1.3 },
    start: { target: V(-0.6, 2.4, -3.5), r: 38, az: 0.45, pol: 1.42 },
    limits: { az: [-0.7, 0.7], pol: [0.85, 1.45], r: [13, 36] },
    portal: '#ffc58f',
    update(t) {
      for (const s of isles) s.g.position.y = s.y + Math.sin(t * 0.6 + s.ph) * 0.25;
      const u = (t * 0.09) % curves.length, i = Math.floor(u), f = u - i;
      const cv = curves[i];
      plane.position.copy(cv.getPointAt(f));
      look.copy(cv.getPointAt(Math.min(1, f + 0.01)));
      if (f > 0.99) look.add(cv.getTangentAt(1));
      plane.lookAt(look);
    },
  };
}
