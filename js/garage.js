// The room is a garage workshop coming apart: boarded walls and studs, an L of grey-topped
// cabinets, a wooden bench, pegboard, flasks, tube lights, a cracked slab with holes in it,
// and the back corner torn clean off into the void. All of it is modelled in Spline; the
// surfaces are painted on here. The door notches and window hole are part of the model, so
// they have to agree with DOOR_Z and WIN in room.js.
import * as THREE from 'three';
import * as T from './textures.js';
import { baked } from './props.js';
import { kitToon, kitGlow, toon } from './kit.js';

const H = 3.1, TH = 0.18;
export const TOP_Y = 0.9;
// the L of cabinets: along the back wall from x = CX0, then down the right wall to z = CZ1
const CX0 = -0.75, CD = 0.68, CZ1 = -1.05;

// The holes in the modelled slab, in plan: the floor's painted cracks start from these edges.
const HOLES = [
  [[-1.142, 1.5], [-1.324, 1.761], [-1.561, 1.949], [-1.771, 2.198], [-2.15, 2.1], [-2.501, 2.145], [-2.808, 2.001], [-3.024, 1.776], [-3.006, 1.5], [-3.178, 1.176], [-2.942, 0.897], [-2.503, 0.851], [-2.15, 0.686], [-1.783, 0.825], [-1.513, 1.015], [-1.234, 1.211]],
  [[0.001, -0.85], [-0.174, -0.694], [-0.348, -0.599], [-0.55, -0.479], [-0.801, -0.537], [-0.922, -0.695], [-0.97, -0.85], [-1.019, -1.045], [-0.787, -1.146], [-0.55, -1.159], [-0.312, -1.147], [-0.132, -1.024]],
];

export function buildGarage(scene, X, Z) {
  const group = new THREE.Group();
  scene.add(group);
  const add = (model, part, mat, cast = true, receive = true) => {
    const m = new THREE.Mesh(baked(model, part), mat);
    m.castShadow = cast; m.receiveShadow = receive;
    group.add(m);
    return m;
  };

  add('Garage', 'Garage Boards', toon({ map: T.garageWall() }));
  add('Garage', 'Garage Siding', toon({ map: T.siding() }));
  add('Garage', 'Garage Flat', kitToon());

  // The slab's UVs are its plan position in metres; turn those into canvas space.
  const fx0 = -X - TH, fz0 = -Z - TH, fw = 2 * (X + TH), fd = 2 * Z + TH + 0.3;
  const floorTex = T.concrete(HOLES, fx0, fz0, fw, fd);
  floorTex.repeat.set(1 / fw, 1 / fd); floorTex.offset.set(-fx0 / fw, (fz0 + fd) / fd);
  add('Garage', 'Garage Slab', toon({ map: floorTex }), false);

  const pegMat = toon({ map: T.pegboard() });
  pegMat.map.repeat.set(1.2, 1.6);
  add('Garage', 'Garage Peg', pegMat, false, false);

  add('GarageRoof', undefined, kitToon(), false);
  const tubes = add('GarageTubes', undefined, kitGlow(), false, false);

  // The rest of the ceiling only exists from underneath: you look down into an open box,
  // but lean down inside and there's a roof over you, as far as the tear.
  const lid = add('GarageLid', undefined, toon({ vertexColors: true, side: THREE.DoubleSide }), false, false);

  const bx0 = -X + 0.08, bx1 = -1.98, bd = 0.74;
  return {
    // circles polaroids bounce off instead of falling down the holes
    colliders: [[-2.15, 1.5, 0.85], [-0.55, -0.85, 0.34]],
    // rectangles they can't slide into: [x0, x1, z0, z1]
    blocks: [[CX0, X, -Z, -Z + CD], [X - CD, X, -Z, CZ1], [bx0, bx1, -Z, -Z + bd]],
    update(camera) { lid.visible = camera.position.y < H - 0.05; },
    skip: [tubes],
  };
}
