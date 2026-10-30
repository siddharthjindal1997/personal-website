// The cat: cream fur, salmon patches, a pink collar with a gold bell, enormous green eyes.
// Modelled in Spline in three poses, each with a low-poly twin for the far-off crowd. All
// share one painted skin, so a hundred of them cost next to nothing.
import * as THREE from 'three';
import { baked } from './props.js';
import { catSkin } from './textures.js';
import { toon } from './kit.js';

const MODEL = { leap: 'CatLeap', drift: 'CatDrift', sleep: 'CatSleep' };

export function catGeometry(pose, lo = false) {
  const name = MODEL[pose] + (lo ? 'Lo' : '');
  return baked(name, `${name} Mesh`);
}

let MAT = null;
export const catMaterial = () => (MAT ||= toon({ map: catSkin() }));

export const makeCat = (pose) => new THREE.Mesh(catGeometry(pose), catMaterial());
