// The room is a garage workshop coming apart: boarded walls and studs, an L of grey-topped
// cabinets, a wooden bench, pegboard, flasks, tube lights, a cracked slab with holes in it,
// and the back corner torn clean off into the void.
import * as THREE from 'three';
import * as T from './textures.js';
import { Kit, kitToon, kitGlow, toon, jag, blob } from './kit.js';

const TAU = Math.PI * 2;
export const H = 3.1, TH = 0.18, TOP_Y = 0.9;
// the L of cabinets: along the back wall from x = CX0, then down the right wall to z = CZ1
export const CX0 = -0.75, CD = 0.68, CZ1 = -1.05;

const WOOD = '#7a6250', WOOD_D = '#54423a', BENCH = '#8a6a4c', CAB = '#3a3a42', CAB_DOOR = '#4a4a54', TOP = '#b9b6bf', DARK = '#1b171a', STEEL = '#8f949c';

function wall(shape, pos, rotY, inner, outer, edge) {
  const g = new THREE.Group();
  const half = new THREE.ExtrudeGeometry(shape, { depth: TH / 2, bevelEnabled: false });
  const a = new THREE.Mesh(half, [inner, edge]), b = new THREE.Mesh(half, [outer, edge]);
  a.position.z = TH / 2;
  g.add(a, b);
  g.position.set(...pos); g.rotation.y = rotY;
  return g;
}

const shapeOf = (pts) => new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));

export function buildGarage(scene, X, Z, door, win) {
  const r = T.rng(12);
  const group = new THREE.Group();
  scene.add(group);

  /* ---------- walls ---------- */

  const inner = toon({ map: T.garageWall() }), outer = toon({ map: T.siding() }), edge = toon({ color: '#5b4638' });
  const [wx, wy, ww, wh] = win;

  // back wall: the right end is gone above the counter
  const back = shapeOf([
    [-X - TH, 0], [X + TH, 0], [X + TH, TOP_Y - 0.05],
    ...jag([X + TH, TOP_Y - 0.05], [3.25, TOP_Y + 0.1], 5, 0.09, r), [3.25, TOP_Y + 0.1],
    ...jag([3.25, TOP_Y + 0.1], [3.35, 2.0], 5, 0.13, r), [3.35, 2.0],
    ...jag([3.35, 2.0], [2.98, H], 5, 0.14, r), [2.98, H], [-X - TH, H],
  ]);
  back.holes.push(new THREE.Path([
    new THREE.Vector2(wx - ww / 2, wy - wh / 2), new THREE.Vector2(wx - ww / 2, wy + wh / 2),
    new THREE.Vector2(wx + ww / 2, wy + wh / 2), new THREE.Vector2(wx + ww / 2, wy - wh / 2),
  ]));
  // The rear half of each wall carries the outside skin, the front half the boards.
  group.add(wall(back, [0, 0, -Z - TH], 0, inner, outer, edge));

  // side walls: s = -z along the wall, with the door opening as a notch in the outline
  const s0 = -door - 0.55, s1 = -door + 0.55;
  const left = shapeOf([[-Z, 0], [s0, 0], [s0, 2.25], [s1, 2.25], [s1, 0], [Z + TH, 0], [Z + TH, H], [-Z, H]]);
  group.add(wall(left, [-X - TH, 0, 0], Math.PI / 2, inner, outer, edge));
  const right = shapeOf([
    [-Z, 0], [s0, 0], [s0, 2.25], [s1, 2.25], [s1, 0], [Z + TH, 0], [Z + TH, TOP_Y - 0.05],
    ...jag([Z + TH, TOP_Y - 0.05], [1.45, TOP_Y + 0.1], 5, 0.09, r), [1.45, TOP_Y + 0.1],
    ...jag([1.45, TOP_Y + 0.1], [0.95, 2.05], 5, 0.12, r), [0.95, 2.05],
    ...jag([0.95, 2.05], [1.3, H], 4, 0.12, r), [1.3, H], [-Z, H],
  ]);
  // the right wall's boards must face the room, so its layers swap
  group.add(wall(right, [X, 0, 0], Math.PI / 2, outer, inner, edge));

  /* ---------- slab, with two holes through to the void ---------- */

  const holes = [blob(-2.15, 1.5, 1.05, 0.8, 16, r), blob(-0.55, -0.85, 0.5, 0.36, 12, r, 0.2)];
  const fx0 = -X - TH, fz0 = -Z - TH, fw = 2 * (X + TH), fd = 2 * Z + TH + 0.3;
  const edgeF = jag([X + TH, Z + 0.12], [-X - TH, Z + 0.12], 16, 0.13, r);
  const outline = [[fx0, -fz0], ...edgeF.map(([x, z]) => [x, -z]).reverse(), [X + TH, -Z - 0.12], [X + TH, -fz0]];
  const slab = new THREE.Shape(outline.map(([x, y]) => new THREE.Vector2(x, y)));
  for (const h of holes) slab.holes.push(new THREE.Path(h.map(([x, z]) => new THREE.Vector2(x, -z))));
  const floorTex = T.concrete(holes, fx0, fz0, fw, fd);
  // Cap UVs come through as the shape's own x and y (= -z), in metres; turn those into canvas space.
  floorTex.repeat.set(1 / fw, 1 / fd); floorTex.offset.set(-fx0 / fw, (fz0 + fd) / fd);
  const floor = new THREE.Mesh(new THREE.ExtrudeGeometry(slab, { depth: 0.24, bevelEnabled: false }), [toon({ map: floorTex }), toon({ color: '#6e645c' })]);
  floor.rotation.x = -Math.PI / 2; floor.position.y = -0.24;
  group.add(floor);

  const k = new Kit();

  // broken bits of slab tipped up round the big hole, and some loose in it
  for (let i = 0; i < 11; i++) {
    const a = (i / 11) * TAU + r(), d = 0.75 + r() * 0.5;
    const x = -2.15 + Math.cos(a) * 1.05 * d, z = 1.5 + Math.sin(a) * 0.8 * d;
    const inside = d < 0.95;
    k.shard(blob(0, 0, 0.14 + r() * 0.2, 0.1 + r() * 0.14, 7, r), 0.09, '#e6dec6', '#574e47', [x, inside ? -0.1 - r() * 0.5 : 0.04, z], [(r() - 0.5) * 0.7, r() * 3, (r() - 0.5) * 0.7]);
  }
  // what's under the slab: joists and pipes, snapped off where the floor went
  for (let x = -4.2; x < 4.4; x += 0.9) k.box(0.1, 0.22, 2 * Z + 0.1, x, -0.36, 0, '#3a2d27');
  for (const [a, b, rad, col] of [
    [[-4.3, -0.56, 1.2], [-1.6, -0.56, 1.25], 0.05, '#7d8088'], [[-1.6, -0.56, 1.25], [-1.6, -1.05, 1.25], 0.05, '#7d8088'],
    [[-3.3, -0.66, 2.9], [-3.3, -0.66, 0.1], 0.04, '#6a5a50'], [[-0.9, -0.62, -2.4], [-0.9, -0.62, -0.5], 0.04, '#7d8088'], [[-0.9, -0.62, -0.5], [-0.3, -0.95, -0.3], 0.04, '#7d8088'],
    [[-2.4, -0.6, 2.9], [-2.4, -0.6, 2.2], 0.06, '#6a5a50'], [[2.0, -0.58, 3.0], [2.0, -0.58, -1], 0.05, '#7d8088'],
  ]) k.rod(a, b, rad, col);

  /* ---------- studs and rails ---------- */

  const stud = (x, z, h, y0 = 0, wide = 'x') => k.box(wide === 'x' ? 0.11 : 0.07, h, wide === 'x' ? 0.07 : 0.11, x, y0 + h / 2, z, WOOD);
  const zb = -Z + 0.035;
  for (const x of [-4.05, -3.0, -1.95, -0.9]) stud(x, zb, H);
  for (const x of [1.95, 2.95]) stud(x, zb, H);
  k.box(wx - ww / 2 + X - 0.12, 0.11, 0.07, (-X + wx - ww / 2) / 2 - 0.06, H - 0.1, zb, WOOD);
  k.box(1.9, 0.11, 0.07, 2.0, H - 0.1, zb, WOOD);
  // snapped studs where the corner tore away
  k.box(0.11, 1.2, 0.07, 3.75, TOP_Y + 0.5, zb, WOOD, [0, 0, -0.1]);
  k.box(0.11, 0.65, 0.07, 3.1, H - 0.4, zb, WOOD, [0, 0, 0.14]);
  k.box(0.07, 0.9, 0.11, X - 0.035, TOP_Y + 0.35, -2.1, WOOD, [0.1, 0, 0]);
  // left and right walls
  const zl = (x) => (x < 0 ? -X + 0.035 : X - 0.035);
  for (const z of [-2.2, -1.2, 1.25, 2.3]) stud(zl(-1), z, H, 0, 'z');
  for (const z of [-0.8, 2.75]) stud(zl(1), z, H, 0, 'z');
  k.box(0.07, 0.11, 2 * Z, zl(-1), H - 0.1, 0, WOOD);
  k.box(0.07, 0.11, 3.9, zl(1), H - 0.1, 0.95, WOOD);
  // wall tops, seen from above: raw timber plates
  k.box(X + TH + 2.98, 0.05, TH + 0.04, (2.98 - X - TH) / 2, H + 0.02, -Z - TH / 2, WOOD_D);
  k.box(TH + 0.04, 0.05, 2 * Z + TH, -X - TH / 2, H + 0.02, -TH / 2, WOOD_D);
  k.box(TH + 0.04, 0.05, 4.2, X + TH / 2, H + 0.02, 0.8, WOOD_D);

  /* ---------- rafters and tube lights over the back of the room ---------- */

  const roof = new Kit(), tubes = new Kit();
  for (const x of [-3.5, -2.1, -0.7, 0.7, 2.1]) roof.box(0.12, 0.2, 1.05 + r() * 0.35, x, H - 0.08, -Z + 0.55, WOOD_D);
  roof.box(5.95, 0.14, 0.12, -0.78, H - 0.12, -Z + 0.72, WOOD_D);
  for (const x of [-2.8, -0.65, 1.4]) {
    roof.box(1.28, 0.06, 0.42, x, H - 0.22, -Z + 0.45, '#7f9186');
    for (const dz of [-0.12, 0, 0.12]) tubes.add(new THREE.CylinderGeometry(0.024, 0.024, 1.16, 8), '#f6fff0', [x, H - 0.27, -Z + 0.45 + dz], [0, 0, Math.PI / 2]);
  }
  const rafters = roof.mesh(kitToon());
  rafters.castShadow = false;
  const tubeMesh = tubes.mesh(kitGlow());
  group.add(rafters, tubeMesh);

  // The rest of the ceiling only exists from underneath: you look down into an open box,
  // but lean down inside and there's a roof over you, as far as the tear.
  const lid = new THREE.Group();
  const under = shapeOf([[-X, -Z], [2.98, -Z], ...jag([2.98, -Z], [X, -1.3], 6, 0.2, r), [X, -1.3], [X, Z], ...jag([X, Z], [-X, Z], 10, 0.12, r)]);
  const ceil = new THREE.Mesh(new THREE.ShapeGeometry(under), toon({ color: '#3b3338', side: THREE.DoubleSide }));
  ceil.rotation.x = Math.PI / 2; ceil.position.y = H;
  lid.add(ceil);
  const joists = new Kit();
  for (let x = -3.5; x < 4.3; x += 1.4) joists.box(0.12, 0.2, 2 * Z - 1.0, x, H - 0.1, 0.5, WOOD_D);
  lid.add(joists.mesh(kitToon()));
  group.add(lid);

  /* ---------- the L of cabinets ---------- */

  const top = (w, d, x, z) => {
    k.box(w, 0.1, d, x, 0.05, z, DARK); // toe kick
    k.box(w, TOP_Y - 0.15, d, x, 0.1 + (TOP_Y - 0.15) / 2, z, CAB);
    k.box(w + 0.05, 0.05, d + 0.05, x, TOP_Y - 0.025, z, TOP);
  };
  const backW = X - CX0, rightD = CZ1 + Z - CD;
  top(backW, CD, CX0 + backW / 2, -Z + CD / 2);
  top(CD, rightD, X - CD / 2, -Z + CD + rightD / 2);
  const doorFace = (x, z, facing) => {
    if (facing === 'z') k.box(0.54, TOP_Y - 0.28, 0.02, x, 0.5, z, CAB_DOOR).ball(0.022, x + 0.2, 0.68, z + 0.03, '#c8c6cc');
    else k.box(0.02, TOP_Y - 0.28, 0.54, x, 0.5, z, CAB_DOOR).ball(0.022, x - 0.03, 0.68, z + 0.2, '#c8c6cc');
  };
  for (let x = CX0 + 0.33; x < X - CD - 0.2; x += 0.62) doorFace(x, -Z + CD + 0.012, 'z');
  for (let z = -Z + CD + 0.33; z < CZ1 - 0.2; z += 0.62) doorFace(X - CD - 0.012, z, 'x');

  /* ---------- the bench on the left ---------- */

  const bx0 = -X + 0.08, bx1 = -1.98, bd = 0.74, by = 0.86, bw = bx1 - bx0, bc = (bx0 + bx1) / 2, bz = -Z + bd / 2;
  k.box(bw, 0.08, bd, bc, by - 0.04, bz, BENCH);
  k.box(bw - 0.3, 0.05, bd - 0.14, bc, 0.25, bz, '#6a503b');
  k.box(bw - 0.2, 0.1, 0.05, bc, by - 0.14, -Z + bd - 0.05, '#6a503b');
  for (const x of [bx0 + 0.09, bx1 - 0.09]) for (const z of [-Z + 0.09, -Z + bd - 0.09]) k.box(0.13, by - 0.08, 0.13, x, (by - 0.08) / 2, z, BENCH);
  // red vice at the front corner
  k.box(0.3, 0.1, 0.22, bx1 - 0.3, by + 0.05, -Z + bd - 0.14, '#9c3b2c');
  k.box(0.08, 0.15, 0.1, bx1 - 0.42, by + 0.15, -Z + bd - 0.14, '#7d8088').box(0.08, 0.15, 0.1, bx1 - 0.24, by + 0.15, -Z + bd - 0.14, '#7d8088');
  k.rod([bx1 - 0.3, by + 0.06, -Z + bd - 0.05], [bx1 - 0.3, by + 0.06, -Z + bd + 0.12], 0.012, '#c8c6cc');
  k.rod([bx1 - 0.4, by + 0.06, -Z + bd + 0.12], [bx1 - 0.2, by + 0.06, -Z + bd + 0.12], 0.012, '#c8c6cc');
  // gas bottles on the bench, a squat tank and a box underneath
  const bottle = (x, z, h, rad, col) => {
    k.add(new THREE.CylinderGeometry(rad, rad, h, 16), col, [x, by + h / 2, z]).ball(rad, x, by + h, z, col);
    k.disc(0.05, 0.02, x + 0.02, by + h + rad + 0.04, z + 0.02, '#e8e6d8').rod([x, by + h, z], [x, by + h + rad + 0.04, z], 0.012, '#555');
  };
  bottle(-4.0, -Z + 0.2, 0.62, 0.095, '#bcc0c6');
  bottle(-3.7, -Z + 0.2, 0.62, 0.095, '#bcc0c6');
  k.ball(0.26, -3.75, 0.5, -Z + 0.4, '#4e5b5e', [1, 0.72, 1]);
  k.rod([-3.75, 0.68, -Z + 0.4], [-3.75, 0.76, -Z + 0.4], 0.05, '#7d8088');
  k.box(0.46, 0.34, 0.36, -2.75, 0.45, -Z + 0.42, '#c9a877');
  k.rod([-3.2, by, -Z + 0.3], [-3.2, by + 0.3, -Z + 0.3], 0.05, '#3d5970');
  // a yellow speaker, a wall phone and the long-handled shears, hung on the boards
  k.box(0.62, 0.62, 0.14, -2.62, 1.75, -Z + 0.09, '#b7ad6b');
  k.disc(0.24, 0.02, -2.62, 1.75, -Z + 0.17, '#d9c980').disc(0.1, 0.02, -2.62, 1.75, -Z + 0.18, '#857a47').disc(0.04, 0.03, -2.62, 1.75, -Z + 0.19, '#2a2622');
  k.box(0.32, 0.36, 0.09, -2.62, 2.42, -Z + 0.06, '#34343a').box(0.24, 0.12, 0.02, -2.62, 2.5, -Z + 0.11, '#d7d4c6');
  for (const s of [-1, 1]) {
    k.box(0.05, 0.72, 0.03, -3.95 + s * 0.06, 1.45, -Z + 0.06, '#d3a64f', [0, 0, s * 0.12]);
    k.box(0.08, 0.58, 0.03, -3.95 - s * 0.02, 2.08, -Z + 0.07, '#47474f', [0, 0, -s * 0.12]);
  }
  k.add(new THREE.TorusGeometry(0.17, 0.018, 8, 24), '#222', [-3.35, 2.15, -Z + 0.1], [0, 0, 0]);
  k.add(new THREE.TorusGeometry(0.15, 0.018, 8, 24), '#222', [-3.35, 2.13, -Z + 0.12], [0, 0, 0.2]);
  k.box(0.07, 0.2, 0.08, -4.2, 2.65, -Z + 0.06, '#d9c6a2');

  /* ---------- pegboard, dials and a shelf above the counter ---------- */

  const peg = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.6), toon({ map: T.pegboard() }));
  peg.material.map.repeat.set(1.2, 1.6);
  peg.position.set(2.35, 1.82, -Z + 0.09);
  group.add(peg);
  k.box(1.28, 1.68, 0.04, 2.35, 1.82, -Z + 0.065, WOOD_D);
  const dial = (x, y, rad, col, needle) => {
    k.disc(rad, 0.03, x, y, -Z + 0.11, DARK).disc(rad * 0.84, 0.03, x, y, -Z + 0.125, col);
    if (needle) k.box(rad * 0.1, rad * 0.72, 0.012, x + rad * 0.2, y + rad * 0.2, -Z + 0.145, DARK, [0, 0, -0.7]);
  };
  dial(2.72, 2.32, 0.15, '#6b6f70');
  for (let a = 0; a < 3; a++) k.box(0.03, 0.26, 0.02, 2.72, 2.32, -Z + 0.15, DARK, [0, 0, (a / 3) * Math.PI]);
  dial(2.3, 1.72, 0.1, '#c6c1a4', true);
  dial(2.62, 1.75, 0.075, '#c6c1a4', true);
  dial(1.98, 1.5, 0.08, '#6b6f70');
  dial(2.32, 1.34, 0.11, '#b9ad76', true);
  dial(2.74, 1.38, 0.09, '#6b6f70');
  k.box(0.26, 0.2, 0.03, 2.72, 1.98, -Z + 0.115, '#d0d6c0');
  k.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([[2.02, 1.5], [2.1, 1.9], [2.4, 1.98], [2.6, 1.75]].map(([x, y]) => new THREE.Vector3(x, y, -Z + 0.13))), 20, 0.009, 6), DARK);
  k.box(1.3, 0.04, 0.2, 2.35, 2.68, -Z + 0.18, WOOD);
  for (const [x, h, rad, col] of [[1.9, 0.2, 0.04, '#3d5970'], [2.02, 0.14, 0.05, '#d9c6a2'], [2.34, 0.26, 0.045, '#b53a3a'], [2.5, 0.12, 0.05, '#c9a877'], [2.8, 0.18, 0.04, '#708a70']]) {
    k.add(new THREE.CylinderGeometry(rad, rad, h, 12), col, [x, 2.7 + h / 2, -Z + 0.17]);
  }

  /* ---------- the counter's clutter: glassware, boxes, papers ---------- */

  const flask = (x, z, y, rad, liquid) => {
    const glass = new THREE.LatheGeometry([[0.001, 0], [rad, 0], [rad * 0.92, rad * 0.5], [rad * 0.28, rad * 1.5], [rad * 0.28, rad * 2.1]].map(([a, b]) => new THREE.Vector2(a, b)), 16);
    k.add(glass, '#dfe8ee', [x, y, z]);
    k.add(new THREE.LatheGeometry([[0.001, 0.01], [rad * 1.01, 0.01], [rad * 0.95, rad * 0.5], [rad * 0.6, rad * 0.95], [0.001, rad * 0.95]].map(([a, b]) => new THREE.Vector2(a, b)), 16), liquid, [x, y, z]);
    k.add(new THREE.CylinderGeometry(rad * 0.3, rad * 0.27, 0.04, 8), '#c9a877', [x, y + rad * 2.1, z]);
    return k;
  };
  const tripod = (x, z, y0, h, rad) => {
    k.add(new THREE.TorusGeometry(rad, 0.008, 6, 18), '#6a6d74', [x, y0 + h, z], [Math.PI / 2, 0, 0]);
    for (let a = 0; a < 3; a++) k.rod([x + Math.cos(a * 2.09) * rad, y0 + h, z + Math.sin(a * 2.09) * rad], [x + Math.cos(a * 2.09) * rad * 1.5, y0, z + Math.sin(a * 2.09) * rad * 1.5], 0.008, '#6a6d74');
  };
  const cz = -Z + 0.34;
  tripod(2.72, cz, TOP_Y, 0.2, 0.08); flask(2.72, cz, TOP_Y + 0.2, 0.1, '#e88fd2');
  k.rod([3.2, TOP_Y, cz - 0.12], [3.2, TOP_Y + 0.82, cz - 0.12], 0.01, '#6a6d74').box(0.22, 0.02, 0.2, 3.2, TOP_Y + 0.01, cz - 0.08, '#55585e');
  k.rod([3.2, TOP_Y + 0.42, cz - 0.12], [3.2, TOP_Y + 0.42, cz], 0.012, '#6a6d74');
  k.add(new THREE.TorusGeometry(0.075, 0.008, 6, 18), '#6a6d74', [3.2, TOP_Y + 0.42, cz + 0.02], [Math.PI / 2, 0, 0]);
  flask(3.2, cz + 0.02, TOP_Y + 0.42, 0.11, '#86e3d6');
  k.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([[2.72, 1.33, cz], [2.78, 1.62, cz], [3.0, 1.66, cz], [3.2, 1.68, cz + 0.02]].map((p) => new THREE.Vector3(...p))), 18, 0.009, 6), '#2d2a2c');
  // parts drawers
  k.box(0.42, 0.3, 0.3, 1.97, TOP_Y + 0.15, cz - 0.05, '#5c5d66');
  for (const y of [0.05, 0.14, 0.23]) k.box(0.36, 0.07, 0.01, 1.97, TOP_Y + y + 0.01, cz + 0.105, '#74757e').ball(0.012, 1.97, TOP_Y + y + 0.01, cz + 0.115, '#c8c6cc');
  // spool of wire
  k.add(new THREE.CylinderGeometry(0.075, 0.075, 0.14, 16), '#3b2c26', [2.34, TOP_Y + 0.08, cz + 0.08]);
  k.add(new THREE.CylinderGeometry(0.09, 0.09, 0.02, 16), '#1d1a1c', [2.34, TOP_Y + 0.01, cz + 0.08]).add(new THREE.CylinderGeometry(0.09, 0.09, 0.02, 16), '#1d1a1c', [2.34, TOP_Y + 0.15, cz + 0.08]);
  // transformer, with its dial
  k.box(0.34, 0.26, 0.28, 3.72, TOP_Y + 0.13, cz - 0.05, '#d4c588');
  k.disc(0.075, 0.03, 3.72, TOP_Y + 0.15, cz + 0.1, '#3f6a5c').disc(0.03, 0.03, 3.72, TOP_Y + 0.15, cz + 0.12, '#c8c6cc');
  // green radio on the return, and the sink
  k.box(0.28, 0.2, 0.42, X - 0.34, TOP_Y + 0.1, -2.0, '#47584d');
  k.add(new THREE.CylinderGeometry(0.06, 0.06, 0.03, 16), '#c8c6cc', [X - 0.495, TOP_Y + 0.12, -2.0], [0, 0, Math.PI / 2]);
  k.box(0.46, 0.015, 0.54, X - 0.34, TOP_Y + 0.005, -1.42, '#9096a0').box(0.38, 0.016, 0.46, X - 0.34, TOP_Y + 0.008, -1.42, '#4d5058');
  k.rod([X - 0.1, TOP_Y, -1.42], [X - 0.1, TOP_Y + 0.26, -1.42], 0.016, '#c8c6cc').rod([X - 0.1, TOP_Y + 0.26, -1.42], [X - 0.3, TOP_Y + 0.2, -1.42], 0.014, '#c8c6cc');
  // papers
  for (const [x, z, a] of [[1.82, cz + 0.22, 0.2], [2.06, cz + 0.26, -0.3], [2.98, cz + 0.2, 0.5], [-0.42, cz + 0.1, 0.15]]) k.box(0.2, 0.014, 0.28, x, TOP_Y + 0.007, z, '#eeeade', [0, a, 0]);

  const clutter = k.mesh(kitToon());
  clutter.castShadow = clutter.receiveShadow = true;
  group.add(clutter);
  floor.receiveShadow = true;
  for (const w of group.children) if (w.isGroup && w !== lid) w.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });

  return {
    // circles polaroids bounce off instead of falling down the holes
    colliders: [[-2.15, 1.5, 0.85], [-0.55, -0.85, 0.34]],
    // rectangles they can't slide into: [x0, x1, z0, z1]
    blocks: [[CX0, X, -Z, -Z + CD], [X - CD, X, -Z, CZ1], [bx0, bx1, -Z, -Z + bd]],
    update(camera) { lid.visible = camera.position.y < H - 0.05; },
    skip: [tubeMesh],
  };
}
