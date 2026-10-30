// Ink lines: the drawn outline every cartoon cel has. A second pass renders the scene's
// normals and depth; wherever either one breaks, the pixel gets inked.
import * as THREE from 'three';
import { Pass, FullScreenQuad } from 'three/addons/postprocessing/Pass.js';

const frag = /* glsl */`
  uniform sampler2D tColor, tNormal, tDepth; uniform vec2 uStep; uniform float uNear, uFar; varying vec2 vUv;

  // Depth buffer values are linear in 1/z, so a flat surface has zero second difference
  // at any angle: only real creases and silhouettes show up.
  float invZ(vec2 uv) { float d = texture2D(tDepth, uv).x; return (uFar - d * (uFar - uNear)) / (uNear * uFar); }
  vec3 nrm(vec2 uv) { return texture2D(tNormal, uv).xyz * 2.0 - 1.0; }

  void main() {
    vec4 color = texture2D(tColor, vUv);
    vec2 dx = vec2(uStep.x, 0.0), dy = vec2(0.0, uStep.y);
    float c = invZ(vUv), z = 1.0 / max(c, 1e-5);
    float lapX = abs(invZ(vUv - dx) + invZ(vUv + dx) - 2.0 * c), lapY = abs(invZ(vUv - dy) + invZ(vUv + dy) - 2.0 * c);
    float depthEdge = smoothstep(0.0035, 0.009, max(lapX, lapY) * z);
    vec3 n = nrm(vUv);
    float crease = max(max(1.0 - dot(n, nrm(vUv - dx)), 1.0 - dot(n, nrm(vUv + dx))), max(1.0 - dot(n, nrm(vUv - dy)), 1.0 - dot(n, nrm(vUv + dy))));
    float normalEdge = smoothstep(0.22, 0.5, crease);
    float ink = max(depthEdge, normalEdge) * mix(0.95, 0.6, smoothstep(18.0, 70.0, z));
    gl_FragColor = vec4(mix(color.rgb, vec3(0.006, 0.004, 0.005), ink), color.a);
  }`;

export class InkPass extends Pass {
  constructor(scene, camera) {
    super();
    this.scene = scene; this.camera = camera;
    this.skip = []; // particles and glows that shouldn't get outlines
    this.rt = new THREE.WebGLRenderTarget(2, 2, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthTexture: new THREE.DepthTexture(2, 2) });
    this.override = new THREE.MeshNormalMaterial({ side: THREE.DoubleSide });
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        tColor: { value: null }, tNormal: { value: this.rt.texture }, tDepth: { value: this.rt.depthTexture },
        uStep: { value: new THREE.Vector2() }, uNear: { value: 0.1 }, uFar: { value: 400 },
      },
      vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: frag, depthTest: false, depthWrite: false,
    });
    this.quad = new FullScreenQuad(this.material);
    this.clear = new THREE.Color(0.5, 0.5, 1);
  }

  setSize(w, h) {
    this.rt.setSize(w, h);
    // the line stays the same weight on any screen
    const px = Math.max(1, Math.round(h / 800));
    this.material.uniforms.uStep.value.set(px / w, px / h);
  }

  render(renderer, writeBuffer, readBuffer) {
    const { scene, camera, rt, skip } = this;
    const bg = scene.background, auto = renderer.shadowMap.autoUpdate, clear = new THREE.Color();
    const shown = skip.map((o) => o.visible);
    const alpha = renderer.getClearAlpha();
    renderer.getClearColor(clear);

    skip.forEach((o) => { o.visible = false; });
    scene.background = null; scene.overrideMaterial = this.override;
    renderer.shadowMap.autoUpdate = false;
    renderer.setRenderTarget(rt);
    renderer.setClearColor(this.clear, 1);
    renderer.clear();
    renderer.render(scene, camera);

    skip.forEach((o, i) => { o.visible = shown[i]; });
    scene.background = bg; scene.overrideMaterial = null;
    renderer.shadowMap.autoUpdate = auto;
    renderer.setClearColor(clear, alpha);

    const u = this.material.uniforms;
    u.tColor.value = readBuffer.texture; u.uNear.value = camera.near; u.uFar.value = camera.far;
    renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer);
    this.quad.render(renderer);
  }

  dispose() { this.rt.dispose(); this.material.dispose(); this.override.dispose(); this.quad.dispose(); }
}
