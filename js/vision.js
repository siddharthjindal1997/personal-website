// How a machine would see the room.
// MachineView: Sobel edges + dense optical flow, as a full-screen pass.
//   Flow is exact: every pixel's depth is unprojected and reprojected through
//   last frame's camera, so camera motion becomes a per-pixel motion field.
// Detections: YOLO-style boxes that lock on to the things in the room.
import * as THREE from 'three';

const frag = /* glsl */`
  uniform sampler2D tColor; uniform sampler2D tDepth;
  uniform mat4 uProjInv; uniform mat4 uCamWorld; uniform mat4 uPrevVP;
  uniform vec2 uRes; uniform float uTime; uniform float uSweep; uniform float uDpr;
  varying vec2 vUv;

  vec3 tone(vec3 c) { c = c / (1.0 + c); return pow(c, vec3(1.0 / 2.2)); }
  float lum(vec2 uv) { return dot(tone(texture2D(tColor, uv).rgb), vec3(0.299, 0.587, 0.114)); }
  vec3 hsv(vec3 c) { vec3 p = abs(fract(c.xxx + vec3(1.0, 2.0/3.0, 1.0/3.0)) * 6.0 - 3.0); return c.z * mix(vec3(1.0), clamp(p - 1.0, 0.0, 1.0), c.y); }

  vec2 flow(vec2 uv) {
    float d = texture2D(tDepth, uv).x;
    vec4 v = uProjInv * vec4(uv * 2.0 - 1.0, d * 2.0 - 1.0, 1.0); v /= v.w;
    vec4 p = uPrevVP * (uCamWorld * v); p.xy /= p.w;
    return (uv - (p.xy * 0.5 + 0.5)) * uRes;
  }
  float seg(vec2 p, vec2 a, vec2 b) { vec2 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-4), 0.0, 1.0); return length(pa - ba * h); }

  void main() {
    vec3 base = tone(texture2D(tColor, vUv).rgb);
    vec2 px = vUv * uRes, e = 1.0 / uRes;
    float tl = lum(vUv + e * vec2(-1, 1)), t = lum(vUv + e * vec2(0, 1)), tr = lum(vUv + e * vec2(1, 1));
    float l = lum(vUv + e * vec2(-1, 0)), r = lum(vUv + e * vec2(1, 0));
    float bl = lum(vUv + e * vec2(-1, -1)), b = lum(vUv + e * vec2(0, -1)), br = lum(vUv + e * vec2(1, -1));
    float gx = -tl - 2.0 * l - bl + tr + 2.0 * r + br;
    float gy = -bl - 2.0 * b - br + tl + 2.0 * t + tr;
    float edge = smoothstep(0.06, 0.32, length(vec2(gx, gy)));

    vec3 col = vec3(0.015, 0.022, 0.03) + dot(base, vec3(0.3, 0.59, 0.11)) * vec3(0.12, 0.15, 0.17);
    col += vec3(0.55, 1.0, 0.62) * edge * 0.85;

    float cell = 22.0 * uDpr;
    vec2 c = (floor(px / cell) + 0.5) * cell;
    vec2 f = flow(c / uRes) * 6.0;
    float len = length(f);
    if (len > cell * 1.4) f *= cell * 1.4 / len;
    float a = 1.0 - smoothstep(0.5 * uDpr, 1.3 * uDpr, seg(px, c, c + f));
    float head = 1.0 - smoothstep(1.2 * uDpr, 2.2 * uDpr, length(px - c - f));
    vec3 fc = hsv(vec3(atan(f.y, f.x) / 6.2832 + 0.5, 0.75, 1.0));
    float moving = smoothstep(0.6, 3.0, len);
    col = mix(col, fc, max(a, head) * moving);
    float dotA = 1.0 - smoothstep(0.7 * uDpr, 1.5 * uDpr, length(px - c));
    col = mix(col, vec3(0.7, 1.0, 0.75), dotA * 0.55);
    col *= 0.94 + 0.06 * sin(px.y * 1.3 / uDpr + uTime * 18.0);

    float line = 1.0 - uSweep;
    float on = step(line, 1.0 - vUv.y);
    vec3 outC = mix(base, col, on);
    outC += vec3(0.6, 1.0, 0.7) * (1.0 - smoothstep(0.0, 0.004, abs((1.0 - vUv.y) - line))) * step(0.001, uSweep) * step(uSweep, 0.999);
    gl_FragColor = vec4(outC, 1.0);
  }`;

export class MachineView {
  constructor(renderer) {
    this.renderer = renderer;
    this.rt = new THREE.WebGLRenderTarget(2, 2, { type: THREE.HalfFloatType, depthTexture: new THREE.DepthTexture(2, 2) });
    this.mat = new THREE.ShaderMaterial({
      uniforms: {
        tColor: { value: this.rt.texture }, tDepth: { value: this.rt.depthTexture },
        uProjInv: { value: new THREE.Matrix4() }, uCamWorld: { value: new THREE.Matrix4() }, uPrevVP: { value: new THREE.Matrix4() },
        uRes: { value: new THREE.Vector2() }, uTime: { value: 0 }, uSweep: { value: 0 }, uDpr: { value: 1 },
      },
      vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: frag,
      depthTest: false, depthWrite: false,
    });
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.mat);
    this.quad.frustumCulled = false;
    this.qScene = new THREE.Scene(); this.qScene.add(this.quad);
    this.qCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.prevVP = new THREE.Matrix4();
    this.on = false;
    this.sweep = 0;
  }

  setSize(w, h, dpr) {
    this.rt.setSize(w, h);
    this.mat.uniforms.uRes.value.set(w, h);
    this.mat.uniforms.uDpr.value = dpr;
  }

  get active() { return this.sweep > 0.001; }

  tick(dt) {
    const goal = this.on ? 1 : 0;
    this.sweep += Math.sign(goal - this.sweep) * Math.min(Math.abs(goal - this.sweep), dt * 1.6);
  }

  render(scene, camera, t) {
    const r = this.renderer, u = this.mat.uniforms;
    r.setRenderTarget(this.rt); r.render(scene, camera); r.setRenderTarget(null);
    u.uProjInv.value.copy(camera.projectionMatrixInverse);
    u.uCamWorld.value.copy(camera.matrixWorld);
    u.uPrevVP.value.copy(this.prevVP);
    u.uTime.value = t;
    u.uSweep.value = this.sweep * this.sweep * (3 - 2 * this.sweep);
    r.render(this.qScene, this.qCam);
  }

  remember(camera) { this.prevVP.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse); }
}

const ACCENT = '#b6ff5c';
const box = new THREE.Box3(), v = new THREE.Vector3();
const ease = (x) => 1 - Math.pow(1 - x, 3);

export class Detections {
  constructor(canvas) {
    this.canvas = canvas;
    this.g = canvas.getContext('2d');
    this.list = new Map();
    this.all = false;
    this.hover = null;
    this.flash = null;
    this.hotspots = false;
    this.spotsOn = true;
  }

  add(id, obj, label, conf) { this.list.set(id, { obj, label, conf, a: 0, lock: 0, delay: 0, scan: false }); }

  scan(stagger = 0.11, hold = 2.6) {
    let i = 0;
    for (const [id, d] of this.list) {
      if (id.startsWith('cat:') || (this.hotspots && id.startsWith('polaroid'))) continue; // cats roam; photos crowd a phone
      d.scan = true; d.delay = i++ * stagger; d.lock = 0;
    }
    clearTimeout(this._t);
    this._t = setTimeout(() => { for (const d of this.list.values()) d.scan = false; }, (i * stagger + hold) * 1000);
  }

  ping(id) { this.flash = id; clearTimeout(this._f); this._f = setTimeout(() => { this.flash = null; }, 1600); }

  resize(w, h, dpr) {
    this.canvas.width = w * dpr; this.canvas.height = h * dpr;
    this.w = w; this.h = h; this.dpr = dpr;
  }

  draw(camera, dt, t, enabled = true) {
    const g = this.g, W = this.w, H = this.h;
    g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    g.clearRect(0, 0, W, H);
    let n = 0;
    for (const [id, d] of this.list) {
      const want = enabled && (this.all || d.scan || this.hover === id || this.flash === id);
      if (d.scan && d.delay > 0) { d.delay -= dt; continue; }
      d.a += ((want ? 1 : 0) - d.a) * (1 - Math.exp(-dt * (want ? 10 : 5)));
      d.lock = want ? Math.min(1, d.lock + dt * 2.6) : d.lock;
      if (!want && d.a < 0.02) { d.lock = 0; }
      const rect = this.project(d.obj, camera);
      if (rect && this.hotspots && this.spotsOn && enabled && !this.all && !d.scan && !id.startsWith('polaroid') && !id.startsWith('cat:')) this.spot(rect, t, id.length);
      if (d.a < 0.02 || !rect) continue;
      n++;
      const p = ease(d.lock), pad = (1 - p) * 40;
      const x = rect[0] - pad, y = rect[1] - pad, w = rect[2] - rect[0] + pad * 2, h = rect[3] - rect[1] + pad * 2;
      g.globalAlpha = d.a;
      g.strokeStyle = ACCENT; g.lineWidth = 1;
      g.strokeRect(x, y, w, h);
      g.lineWidth = 2.5;
      const c = Math.min(14, w / 4, h / 4);
      g.beginPath();
      g.moveTo(x, y + c); g.lineTo(x, y); g.lineTo(x + c, y);
      g.moveTo(x + w - c, y); g.lineTo(x + w, y); g.lineTo(x + w, y + c);
      g.moveTo(x + w, y + h - c); g.lineTo(x + w, y + h); g.lineTo(x + w - c, y + h);
      g.moveTo(x + c, y + h); g.lineTo(x, y + h); g.lineTo(x, y + h - c);
      g.stroke();
      const conf = Math.min(0.99, d.conf + Math.sin(t * 1.7 + id.length) * 0.008).toFixed(2);
      const text = `${d.label} ${conf}`;
      g.font = '500 11px "JetBrains Mono", monospace';
      const tw = g.measureText(text).width + 10;
      const ty = y > 22 ? y - 18 : y + h;
      g.fillStyle = ACCENT; g.fillRect(x, ty, tw, 18);
      g.fillStyle = '#0b1205'; g.fillText(text, x + 5, ty + 13);
      g.globalAlpha = 1;
    }
    return n;
  }

  spot(rect, t, k) {
    const g = this.g, x = (rect[0] + rect[2]) / 2, y = (rect[1] + rect[3]) / 2;
    const p = (t * 0.7 + k * 0.13) % 1;
    g.strokeStyle = `rgba(182,255,92,${0.7 * (1 - p)})`; g.lineWidth = 1.5;
    g.beginPath(); g.arc(x, y, 6 + p * 16, 0, Math.PI * 2); g.stroke();
    g.fillStyle = 'rgba(182,255,92,.95)'; g.beginPath(); g.arc(x, y, 3.5, 0, Math.PI * 2); g.fill();
  }

  project(obj, camera) {
    box.setFromObject(obj);
    if (box.isEmpty()) return null;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (let i = 0; i < 8; i++) {
      v.set(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z).project(camera);
      if (v.z > 1 || v.z < -1) return null;
      const sx = (v.x + 1) / 2 * this.w, sy = (1 - v.y) / 2 * this.h;
      x0 = Math.min(x0, sx); y0 = Math.min(y0, sy); x1 = Math.max(x1, sx); y1 = Math.max(y1, sy);
    }
    if (x1 < 0 || y1 < 0 || x0 > this.w || y0 > this.h) return null;
    return [x0, y0, x1, y1];
  }
}
