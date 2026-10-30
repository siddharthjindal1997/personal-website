// The cartoon look: flat stepped shading. The kit materials read their colour from the
// vertices, which is how the garage's clutter and the floating houses are baked.
import * as THREE from 'three';

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
