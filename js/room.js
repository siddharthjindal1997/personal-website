// The room: a BumpTop-style open box you look down into.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import * as T from './textures.js';
import * as P from './props.js';
import { ITEMS, POLAROIDS } from './content.js';
import { pluck } from './audio.js';
import { buildSpace } from './space.js';

const X = 4.4, Z = 2.9, H = 3.4, WT = 0.2;

// Wall outline in its own (u, y) plane, with an optional door notch and window hole.
function wallGeo(u0, u1, door, win) {
  const s = new THREE.Shape();
  s.moveTo(u0, 0);
  if (door) { s.lineTo(door[0], 0); s.lineTo(door[0], door[2]); s.lineTo(door[1], door[2]); s.lineTo(door[1], 0); }
  s.lineTo(u1, 0); s.lineTo(u1, H); s.lineTo(u0, H); s.lineTo(u0, 0);
  if (win) {
    const [cx, cy, w, h] = win, p = new THREE.Path();
    p.moveTo(cx - w / 2, cy - h / 2); p.lineTo(cx - w / 2, cy + h / 2); p.lineTo(cx + w / 2, cy + h / 2); p.lineTo(cx + w / 2, cy - h / 2); p.lineTo(cx - w / 2, cy - h / 2);
    s.holes.push(p);
  }
  return new THREE.ExtrudeGeometry(s, { depth: WT, bevelEnabled: false });
}

// Chords for a bonfire guitarist. null = muted string.
const CHORDS = [
  ['G', [98.0, 123.47, 146.83, 196.0, 246.94, 392.0]],
  ['D', [null, 110.0, 146.83, 220.0, 293.66, 369.99]],
  ['Em', [82.41, 123.47, 164.81, 196.0, 246.94, 329.63]],
  ['C', [null, 130.81, 164.81, 196.0, 261.63, 329.63]],
];

export function buildRoom(renderer) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0e0c0b);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.28;
  pmrem.dispose();
  const space = buildSpace(scene, renderer);

  /* lights */
  scene.add(new THREE.HemisphereLight(0xffe7cc, 0x3a2a20, 0.55));
  const key = new THREE.DirectionalLight(0xfff0dc, 1.7);
  key.position.set(-5, 10, 7);
  key.target.position.set(0, 0, -0.5);
  key.castShadow = true;
  const mobile = matchMedia('(pointer: coarse)').matches;
  key.shadow.mapSize.setScalar(mobile ? 1024 : 2048);
  Object.assign(key.shadow.camera, { left: -7.5, right: 7.5, top: 7, bottom: -7, near: 1, far: 30 });
  key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02; key.shadow.radius = 4;
  scene.add(key, key.target);
  const moon = new THREE.SpotLight(0x7f9cff, 9, 12, 0.6, 0.9, 1.5);
  moon.position.set(0.8, 2.2, -4.5); moon.target.position.set(0.6, 0, -1);
  scene.add(moon, moon.target);

  /* shell */
  const plaster = T.plaster();
  const wallMat = new THREE.MeshStandardMaterial({ map: plaster, roughness: 0.92 });
  const cutMat = new THREE.MeshStandardMaterial({ color: 0x2b2420, roughness: 0.9 });
  const floorMat = new THREE.MeshStandardMaterial({ map: T.woodFloor(), roughness: 0.55 });
  const floor = new THREE.Mesh(new THREE.BoxGeometry(2 * X + 2 * WT, 0.25, 2 * Z + WT), [cutMat, cutMat, floorMat, cutMat, cutMat, cutMat]);
  floor.position.set(0, -0.125, -WT / 2);
  floor.receiveShadow = true;
  scene.add(floor);

  const WIN = [0.7, 2.0, 1.9, 1.4];
  const back = new THREE.Mesh(wallGeo(-X - WT, X + WT, null, WIN), [wallMat, cutMat]);
  back.position.z = -Z - WT;
  const DOOR_Z = 0.3, DW = 1.1, DH = 2.25;
  // Side walls stop at the back wall's inner face; overlapping corners z-fight.
  const left = new THREE.Mesh(wallGeo(-Z, Z, [-DOOR_Z - DW / 2, -DOOR_Z + DW / 2, DH]), [wallMat, cutMat]);
  left.rotation.y = Math.PI / 2; left.position.x = -X - WT;
  const right = new THREE.Mesh(wallGeo(-Z, Z, [DOOR_Z - DW / 2, DOOR_Z + DW / 2, DH]), [wallMat, cutMat]);
  right.rotation.y = -Math.PI / 2; right.position.x = X + WT;
  for (const w of [back, left, right]) { w.receiveShadow = true; w.castShadow = true; scene.add(w); }

  const trim = P.std(0xe6ddcf, { roughness: 0.6 });
  const board = (w, x, z, ry) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, 0.1, 0.025), trim); b.position.set(x, 0.05, z); b.rotation.y = ry; b.receiveShadow = true; scene.add(b); };
  board(2 * X, 0, -Z + 0.0125, 0);
  const zs = [[-Z, DOOR_Z - DW / 2 - 0.08], [DOOR_Z + DW / 2 + 0.08, Z]];
  for (const [a, b] of zs) {
    board(b - a, -X + 0.0125, (a + b) / 2, Math.PI / 2);
    board(b - a, X - 0.0125, (a + b) / 2, Math.PI / 2);
  }

  const rug = new THREE.Mesh(new THREE.CircleGeometry(1.5, 72), new THREE.MeshStandardMaterial({ map: T.rug(), roughness: 1 }));
  rug.rotation.x = -Math.PI / 2; rug.position.set(0.2, 0.004, 0.8); rug.receiveShadow = true;
  scene.add(rug);

  /* things */
  const items = {};
  const pickables = [...space.pickables];
  const register = (id, obj, focus = {}) => {
    items[id] = { obj, focus };
    P.tag(obj, { item: id });
    obj.traverse((m) => { if (m.isMesh) pickables.push(m); });
  };

  const paint = T.painting();
  const easel = P.makeEasel(paint);
  easel.root.position.set(-2.75, 0, -1.3); easel.root.rotation.y = 0.42;
  scene.add(P.shade(easel.root));
  register('easel', easel.root, { obj: easel.canvas, r: 2.0, az: 0.42, pol: 1.45 });
  easel.canvas.userData.paint = true;

  const rack = P.makeRack();
  rack.position.set(-1.4, 0, -2.5);
  scene.add(P.shade(rack));
  const hoodie = P.makeHoodie();
  hoodie.position.set(-1.4, 1.86, -2.37); hoodie.rotation.y = 0.08;
  scene.add(P.shade(hoodie));
  register('hoodie', hoodie, { r: 2.1, az: 0.12, pol: 1.47 });
  const hoodieState = { flip: 0, goal: 0, swing: 0 };

  const desk = P.makeDesk();
  desk.root.position.set(0.7, 0, -2.48);
  scene.add(P.shade(desk.root));
  register('laptop', desk.laptop, { r: 1.15, az: -0.12, pol: 1.12 });

  const win = P.makeWindow(WIN[2], WIN[3]);
  win.position.set(WIN[0], WIN[1], -Z - 0.02);
  scene.add(P.shade(win, false, true));
  register('window', win, { r: 3.6, az: -0.08, pol: 1.45 });
  // The city sits 3m behind the glass, faked with a parallax shader so nothing pokes out of the box.
  const view = new THREE.Mesh(new THREE.PlaneGeometry(WIN[2], WIN[3]), new THREE.ShaderMaterial({
    uniforms: { map: { value: T.skyline() }, uOrigin: { value: new THREE.Vector3(WIN[0], WIN[1], -Z - 0.1) }, uSize: { value: new THREE.Vector2(9, 5.6) }, uDepth: { value: 3 } },
    vertexShader: 'varying vec3 vW; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: /* glsl */`
      uniform sampler2D map; uniform vec3 uOrigin; uniform vec2 uSize; uniform float uDepth; varying vec3 vW;
      void main() {
        vec3 d = normalize(vW - cameraPosition);
        vec2 hit = (vW.xy - uOrigin.xy) + d.xy * (uDepth / max(-d.z, 0.05));
        vec2 uv = hit / uSize + vec2(0.5, 0.42);
        gl_FragColor = vec4(texture2D(map, clamp(uv, 0.0, 1.0)).rgb, 1.0);
      }`,
  }));
  view.position.set(WIN[0], WIN[1], -Z - 0.1);
  scene.add(view);

  const guitar = P.makeGuitar();
  guitar.root.position.set(2.8, 0, -1.6); guitar.root.rotation.y = -0.45;
  scene.add(P.shade(guitar.root));
  register('guitar', guitar.root, { obj: guitar.guitar, r: 2.3, az: -0.45, pol: 1.4 });
  const guitarState = { chord: 0 };

  const lamp = P.makeLamp();
  lamp.position.set(3.95, 0, -2.55);
  scene.add(P.shade(lamp, true, false));

  const notes = new THREE.Group();
  [['learn to sell', '#f7e27a'], ['post-training, distillation', '#f9b8c4'], ['a RAG that holds up', '#bfe3c0'], ['build a real agent', '#f7e27a']]
    .forEach(([text, col], i) => {
      const n = P.makeNote(T.sticky(text, col, i + 3));
      n.position.set((i % 2) * 0.22 + (i > 1 ? 0.08 : 0), -Math.floor(i / 2) * 0.22, 0.002 * i);
      n.rotation.z = [0.06, -0.05, 0.03, -0.08][i];
      notes.add(n);
    });
  notes.position.set(2.15, 2.25, -Z + 0.006);
  scene.add(P.shade(notes, false, true));
  register('notes', notes, { r: 1.4, az: -0.12, pol: 1.5 });

  const doors = {
    gigs: P.makeDoor('gigs', [[0, '#120a2e'], [0.6, '#5a1e5c'], [1, '#ff8a3d']]),
    places: P.makeDoor('places', [[0, '#3c4f96'], [0.55, '#d77d86'], [1, '#ffc58f']]),
  };
  doors.gigs.root.position.set(-X, 0, DOOR_Z); doors.gigs.root.rotation.y = Math.PI / 2;
  doors.places.root.position.set(X, 0, DOOR_Z); doors.places.root.rotation.y = -Math.PI / 2;
  for (const [id, d] of Object.entries(doors)) {
    scene.add(P.shade(d.root, true, true));
    d.root.traverse((m) => { if (m.isMesh && m.material.isMeshBasicMaterial) { m.castShadow = false; m.receiveShadow = false; } });
    register(id, d.hinge);
  }

  /* polaroids: flick them around, BumpTop style */
  const bodies = POLAROIDS.map((p, i) => {
    const mesh = P.makePolaroid(T.polaroid(p.motif, p.caption, i * 17 + 5));
    P.shade(mesh, true, true);
    scene.add(mesh);
    const id = 'polaroid:' + p.id;
    register(id, mesh, { r: 1.15, az: 0, pol: 0.55 });
    mesh.userData.polaroid = i;
    const a = (i / POLAROIDS.length) * Math.PI * 2 + 0.3;
    return {
      mesh, id, x: 0.2 + Math.cos(a) * 0.85, z: 0.85 + Math.sin(a) * 0.55, a: (Math.random() - 0.5) * 1.2,
      vx: 0, vz: 0, va: 0, y: 0.009 + i * 0.0035, lift: 0, held: false, upright: false, hist: [],
    };
  });
  const statics = [
    [-2.75, -1.3, 0.62], [-1.87, -1.24, 0.26], [2.8, -1.6, 0.42], [-1.4, -2.5, 0.34], [3.95, -2.55, 0.22], [0.8, -1.86, 0.32],
  ];
  const DESK = [-0.15, 1.55, -Z, -2.12];
  const BR = 0.26;

  function physics(dt) {
    for (const b of bodies) {
      if (b.held) continue;
      b.x += b.vx * dt; b.z += b.vz * dt; b.a += b.va * dt;
      const f = Math.exp(-dt * 2.3);
      b.vx *= f; b.vz *= f; b.va *= Math.exp(-dt * 3);
      if (b.upright) {
        const target = Math.round(b.a / (Math.PI * 2)) * Math.PI * 2;
        b.a += (target - b.a) * (1 - Math.exp(-dt * 6));
      }
      const bounce = (v) => -v * 0.55;
      if (b.x < -X + BR) { b.x = -X + BR; b.vx = bounce(b.vx); }
      if (b.x > X - BR) { b.x = X - BR; b.vx = bounce(b.vx); }
      if (b.z < -Z + BR) { b.z = -Z + BR; b.vz = bounce(b.vz); }
      if (b.z > Z - BR) { b.z = Z - BR; b.vz = bounce(b.vz); }
      for (const [sx, sz, sr] of statics) {
        const dx = b.x - sx, dz = b.z - sz, d = Math.hypot(dx, dz), min = sr + BR;
        if (d < min && d > 1e-4) {
          const nx = dx / d, nz = dz / d;
          b.x = sx + nx * min; b.z = sz + nz * min;
          const vn = b.vx * nx + b.vz * nz;
          if (vn < 0) { b.vx -= 1.5 * vn * nx; b.vz -= 1.5 * vn * nz; b.va += vn * 2; }
        }
      }
      if (b.x > DESK[0] - BR && b.x < DESK[1] + BR && b.z < DESK[3] + BR) { b.z = DESK[3] + BR; b.vz = Math.abs(b.vz) * 0.5; }
    }
    for (let i = 0; i < bodies.length; i++) for (let j = i + 1; j < bodies.length; j++) {
      const p = bodies[i], q = bodies[j];
      if (p.held || q.held) continue;
      const dx = q.x - p.x, dz = q.z - p.z, d = Math.hypot(dx, dz), min = BR * 1.55;
      if (d < min && d > 1e-4) {
        const nx = dx / d, nz = dz / d, push = (min - d) / 2;
        p.x -= nx * push; p.z -= nz * push; q.x += nx * push; q.z += nz * push;
        const rel = (q.vx - p.vx) * nx + (q.vz - p.vz) * nz;
        if (rel < 0) {
          const imp = -1.5 * rel / 2;
          p.vx -= imp * nx; p.vz -= imp * nz; q.vx += imp * nx; q.vz += imp * nz;
          const tang = (q.vx - p.vx) * -nz + (q.vz - p.vz) * nx;
          p.va += tang * 1.5; q.va -= tang * 1.5;
        }
      }
    }
  }

  const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  let grabbed = null, grabOff = { x: 0, z: 0 };

  /* dust in the lamplight */
  const N = 260, pos = new Float32Array(N * 3), seed = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 9; pos[i * 3 + 1] = 0.3 + Math.random() * 2.8; pos[i * 3 + 2] = (Math.random() - 0.5) * 6.5;
    seed[i] = Math.random() * 100;
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  dustGeo.setAttribute('seed', new THREE.BufferAttribute(seed, 1));
  const dust = new THREE.Points(dustGeo, new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uScale: { value: renderer.getPixelRatio() } },
    vertexShader: /* glsl */`
      attribute float seed; uniform float uTime; uniform float uScale; varying float vA;
      void main() {
        vec3 p = position;
        p.x += sin(uTime * 0.11 + seed) * 0.35; p.y += sin(uTime * 0.07 + seed * 1.7) * 0.25; p.z += cos(uTime * 0.09 + seed) * 0.3;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = uScale * 28.0 / -mv.z;
        vA = 0.25 + 0.25 * sin(uTime * 0.6 + seed * 3.0);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */`
      varying float vA;
      void main() { float d = length(gl_PointCoord - 0.5); gl_FragColor = vec4(1.0, 0.86, 0.62, vA * smoothstep(0.5, 0.0, d)); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  scene.add(dust);

  const box3 = new THREE.Box3(), tmpV = new THREE.Vector3();

  return {
    scene, items, pickables, doors, easel: paint,
    cats: space.cats, poke: space.poke, frameSpace: space.frame,
    stringHits: guitar.strings.map((s) => s.hit),

    focusPose(id) {
      const it = items[id], f = it.focus;
      box3.setFromObject(f.obj || it.obj).getCenter(tmpV);
      return { target: tmpV.clone(), r: f.r, az: f.az, pol: f.pol };
    },
    doorPose(id, near) {
      const d = doors[id], s = id === 'gigs' ? 1 : -1;
      const target = d.root.position.clone().add(new THREE.Vector3(-s * (near ? 0.9 : 0), 1.2, 0));
      return { target, r: near ? 1.3 : 3.4, az: (s * Math.PI) / 2, pol: 1.45 };
    },

    setUpright(id) { for (const b of bodies) b.upright = b.id === id; },

    action(id) {
      if (id === 'hoodie') { hoodieState.goal = hoodieState.goal ? 0 : Math.PI; hoodieState.swing = 0.06; return null; }
      if (id === 'guitar') {
        const [, freqs] = CHORDS[guitarState.chord];
        freqs.forEach((f, i) => { if (f) pluck(f, i * 0.022, 0.9); guitar.strings[i].amp = f ? 1 : 0.2; });
        const name = CHORDS[guitarState.chord][0];
        guitarState.chord = (guitarState.chord + 1) % CHORDS.length;
        return `strummed ${name} · next ${CHORDS[guitarState.chord][0]}`;
      }
      return null;
    },
    // Which string is under this point? Strings fan out from saddle (5.6cm) to nut (3.8cm).
    stringAt(p) {
      const l = guitar.guitar.worldToLocal(p.clone());
      if (l.y < 0.13 || l.y > 0.93) return null;
      const span = 0.056 - 0.018 * (l.y - 0.127) / 0.813, u = l.x / span + 0.5;
      if (u < -0.12 || u > 1.12) return null;
      return Math.max(0, Math.min(5, Math.round(u * 5)));
    },
    pluck(i) {
      const f = CHORDS[guitarState.chord][1][i];
      if (f) pluck(f, 0, 0.8);
      guitar.strings[i].amp = f ? 1 : 0.2;
    },

    grab(i, ray) {
      const b = bodies[i], p = ray.intersectPlane(floorPlane, tmpV);
      if (!p) return;
      grabbed = b; b.held = true; b.vx = b.vz = b.va = 0; b.upright = false;
      grabOff = { x: p.x - b.x, z: p.z - b.z };
      b.hist = [{ x: b.x, z: b.z, t: performance.now() }];
    },
    drag(ray) {
      if (!grabbed) return;
      const p = ray.intersectPlane(floorPlane, tmpV);
      if (!p) return;
      const b = grabbed;
      b.x = THREE.MathUtils.clamp(p.x - grabOff.x, -X + BR, X - BR);
      b.z = THREE.MathUtils.clamp(p.z - grabOff.z, -Z + BR, Z - BR);
      const now = performance.now();
      b.hist.push({ x: b.x, z: b.z, t: now });
      while (b.hist.length > 2 && now - b.hist[0].t > 90) b.hist.shift();
    },
    release(tap) {
      if (!grabbed) return;
      const b = grabbed; grabbed = null; b.held = false;
      if (tap || b.hist.length < 2) return;
      const h0 = b.hist[0], h1 = b.hist[b.hist.length - 1], dt = Math.max(16, h1.t - h0.t) / 1000;
      let vx = (h1.x - h0.x) / dt, vz = (h1.z - h0.z) / dt;
      const sp = Math.hypot(vx, vz), max = 9;
      if (sp > max) { vx *= max / sp; vz *= max / sp; }
      b.vx = vx; b.vz = vz;
      b.va = (grabOff.x * vz - grabOff.z * vx) * 4;
    },
    isHolding: () => !!grabbed,

    update(dt, t) {
      physics(dt);
      for (const b of bodies) {
        b.lift += ((b.held ? 0.3 : 0) - b.lift) * (1 - Math.exp(-dt * 12));
        b.mesh.position.set(b.x, b.y + b.lift, b.z);
        b.mesh.rotation.set(-b.lift * 0.6, b.a, 0, 'YXZ');
      }
      for (const [i, s] of guitar.strings.entries()) {
        if (s.amp < 0.002) { s.mesh.position.copy(s.base); continue; }
        s.mesh.position.x = s.base.x + Math.sin(t * (95 + i * 23)) * 0.0016 * s.amp;
        s.amp *= Math.exp(-dt * 2.2);
      }
      hoodieState.flip += (hoodieState.goal - hoodieState.flip) * (1 - Math.exp(-dt * 3.2));
      hoodieState.swing *= Math.exp(-dt * 1.2);
      hoodie.rotation.y = 0.08 + hoodieState.flip;
      hoodie.rotation.z = Math.sin(t * 2.6) * hoodieState.swing + Math.sin(t * 0.5) * 0.006;
      for (const d of Object.values(doors)) {
        d.open += (d.goal - d.open) * (1 - Math.exp(-dt * 3));
        d.hinge.rotation.y = -d.open * 1.75;
        d.spill.intensity = d.open * 40;
      }
      dust.material.uniforms.uTime.value = t;
      space.update(dt, t);
    },
  };
}
