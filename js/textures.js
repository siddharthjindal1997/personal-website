// Every surface in the room is painted on a 2D canvas at load time.
// No image files: the whole site ships as code.
import * as THREE from 'three';

export function rng(seed = 1) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function make(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d')];
}

let ANISO = 8;
export const setAniso = (n) => { ANISO = n; };

export function toTex(c, { repeat, srgb = true } = {}) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = ANISO;
  if (repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat[0], repeat[1]);
  }
  return t;
}

const HAND = 'Caveat, cursive';
const MONO = '"JetBrains Mono", ui-monospace, monospace';
const SERIF = '"Instrument Serif", Georgia, serif';
const SANS = 'Inter, system-ui, sans-serif';
const TAU = Math.PI * 2;

function grain(g, w, h, amt, r) {
  const img = g.getImageData(0, 0, w, h), d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (r() - 0.5) * amt;
    d[i] += n; d[i + 1] += n; d[i + 2] += n;
  }
  g.putImageData(img, 0, 0);
}

/* ---------- room surfaces ---------- */

export function woodFloor() {
  const [c, g] = make(1024, 1024); const r = rng(7);
  const rows = 8, rh = 1024 / rows;
  for (let i = 0; i < rows; i++) {
    let x = -r() * 500;
    while (x < 1024) {
      const len = 320 + r() * 420;
      const hue = 26 + r() * 5, sat = 26 + r() * 10, l = 44 + r() * 7;
      g.fillStyle = `hsl(${hue},${sat}%,${l}%)`;
      g.fillRect(x, i * rh, len, rh);
      for (let k = 0; k < 22; k++) {
        const y = i * rh + r() * rh;
        g.strokeStyle = `hsla(${hue - 4},${sat + 10}%,${l - 20}%,${0.06 + r() * 0.12})`;
        g.lineWidth = 0.6 + r() * 1.6;
        g.beginPath(); g.moveTo(x, y);
        for (let s = 0; s <= len; s += 32) g.lineTo(x + s, y + Math.sin(s * 0.012 + k) * (1.5 + r() * 3));
        g.stroke();
      }
      g.fillStyle = 'rgba(38,22,10,.5)'; g.fillRect(x, i * rh, 2, rh);
      x += len;
    }
    g.fillStyle = 'rgba(38,22,10,.55)'; g.fillRect(0, i * rh, 1024, 2);
  }
  return toTex(c, { repeat: [4, 5] });
}

export function plaster() {
  const [c, g] = make(512, 512); const r = rng(3);
  g.fillStyle = '#ebe3d6'; g.fillRect(0, 0, 512, 512);
  for (let k = 0; k < 140; k++) {
    g.fillStyle = `rgba(120,96,70,${0.012 + r() * 0.02})`;
    g.beginPath(); g.ellipse(r() * 512, r() * 512, 10 + r() * 60, 6 + r() * 30, r() * 3, 0, TAU); g.fill();
  }
  grain(g, 512, 512, 9, r);
  return toTex(c, { repeat: [0.4, 0.4] });
}

export function rug() {
  const [c, g] = make(1024, 1024); const r = rng(11);
  const C = 512;
  const bands = [['#a84e36', 512], ['#e8dac0', 478], ['#2e3a55', 452], ['#e8dac0', 430], ['#a84e36', 318], ['#e8dac0', 288], ['#cf8547', 268], ['#2e3a55', 132], ['#e8dac0', 64]];
  for (const [col, rad] of bands) { g.fillStyle = col; g.beginPath(); g.arc(C, C, rad, 0, TAU); g.fill(); }
  g.fillStyle = '#2e3a55';
  for (let i = 0; i < 40; i++) {
    const a = (i / 40) * TAU;
    g.save(); g.translate(C + Math.cos(a) * 374, C + Math.sin(a) * 374); g.rotate(a + Math.PI / 4);
    g.fillRect(-13, -13, 26, 26); g.restore();
  }
  g.fillStyle = '#a84e36';
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * TAU;
    g.beginPath(); g.ellipse(C + Math.cos(a) * 200, C + Math.sin(a) * 200, 34, 12, a, 0, TAU); g.fill();
  }
  grain(g, 1024, 1024, 28, r);
  return toTex(c);
}

export function spruce() {
  const [c, g] = make(512, 1024); const r = rng(5);
  g.fillStyle = '#e4c28c'; g.fillRect(0, 0, 512, 1024);
  for (let x = 0; x < 512; x += 2 + r() * 6) {
    g.strokeStyle = `rgba(165,112,55,${0.06 + r() * 0.16})`;
    g.lineWidth = 0.5 + r() * 1.4;
    g.beginPath(); g.moveTo(x, 0); g.lineTo(x + (r() - 0.5) * 8, 1024); g.stroke();
  }
  const t = toTex(c, { repeat: [3, 1.5] });
  return t;
}

export function doorPanel() {
  const [c, g] = make(256, 512); const r = rng(19);
  g.fillStyle = '#5e3b23'; g.fillRect(0, 0, 256, 512);
  for (let x = 0; x < 256; x += 2 + r() * 4) {
    g.strokeStyle = `rgba(30,15,6,${0.05 + r() * 0.12})`; g.lineWidth = 1;
    g.beginPath(); g.moveTo(x, 0); g.lineTo(x + (r() - 0.5) * 6, 512); g.stroke();
  }
  for (const [y, h] of [[34, 200], [262, 214]]) {
    g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(30, y, 196, h);
    g.fillStyle = 'rgba(255,220,180,.07)'; g.fillRect(30, y + h - 4, 196, 4); g.fillRect(222, y, 4, h);
    g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(30, y, 196, 4); g.fillRect(30, y, 4, h);
  }
  return toTex(c);
}

/* ---------- window view: Singapore at night ---------- */

export function skyline() {
  const W = 1024, H = 640, HZ = 470; const [c, g] = make(W, H); const r = rng(21);
  let gr = g.createLinearGradient(0, 0, 0, HZ);
  gr.addColorStop(0, '#070d22'); gr.addColorStop(0.55, '#1e2452'); gr.addColorStop(0.85, '#6b3d6a'); gr.addColorStop(1, '#c46a62');
  g.fillStyle = gr; g.fillRect(0, 0, W, HZ);
  for (let i = 0; i < 140; i++) {
    g.fillStyle = `rgba(255,255,255,${r() * 0.7})`;
    g.fillRect(r() * W, r() * HZ * 0.6, 1.4, 1.4);
  }
  // far towers
  const lit = (x, y, w, h, dens) => {
    for (let yy = y + 6; yy < y + h - 4; yy += 7) for (let xx = x + 4; xx < x + w - 4; xx += 6) {
      if (r() < dens) { g.fillStyle = r() < 0.8 ? 'rgba(255,214,150,.85)' : 'rgba(170,210,255,.8)'; g.fillRect(xx, yy, 3, 3); }
    }
  };
  for (let x = -20; x < W; x += 30 + r() * 30) {
    const w = 26 + r() * 40, h = 60 + r() * 150;
    g.fillStyle = `rgb(${18 + r() * 8},${20 + r() * 8},${42 + r() * 10})`;
    g.fillRect(x, HZ - h, w, h); lit(x, HZ - h, w, h, 0.25);
  }
  // Marina Bay Sands
  g.fillStyle = '#121528';
  for (const tx of [520, 600, 680]) {
    g.beginPath(); g.moveTo(tx, HZ); g.lineTo(tx + 52, HZ); g.lineTo(tx + 44, 250); g.lineTo(tx + 8, 250); g.closePath(); g.fill();
    lit(tx + 6, 256, 40, HZ - 256, 0.35);
  }
  g.fillStyle = '#151a30';
  g.beginPath(); g.moveTo(498, 236); g.lineTo(780, 230); g.quadraticCurveTo(800, 232, 806, 240); g.lineTo(498, 252); g.closePath(); g.fill();
  g.fillStyle = 'rgba(255,214,150,.9)'; g.fillRect(506, 244, 280, 2);
  // the Flyer
  g.strokeStyle = 'rgba(190,220,255,.75)'; g.lineWidth = 2;
  g.beginPath(); g.arc(880, 360, 82, 0, TAU); g.stroke();
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * TAU;
    g.fillStyle = 'rgba(200,230,255,.95)'; g.fillRect(880 + Math.cos(a) * 82 - 2, 360 + Math.sin(a) * 82 - 2, 4, 4);
  }
  g.strokeStyle = 'rgba(190,220,255,.3)'; g.lineWidth = 1;
  for (let i = 0; i < 14; i++) { const a = (i / 14) * TAU; g.beginPath(); g.moveTo(880, 360); g.lineTo(880 + Math.cos(a) * 82, 360 + Math.sin(a) * 82); g.stroke(); }
  g.strokeStyle = '#121528'; g.lineWidth = 6; g.beginPath(); g.moveTo(850, HZ); g.lineTo(880, 360); g.lineTo(910, HZ); g.stroke();
  // water + reflection
  gr = g.createLinearGradient(0, HZ, 0, H); gr.addColorStop(0, '#2a2246'); gr.addColorStop(1, '#070a18');
  g.fillStyle = gr; g.fillRect(0, HZ, W, H - HZ);
  g.save(); g.globalAlpha = 0.35; g.translate(0, HZ * 2); g.scale(1, -1);
  g.drawImage(c, 0, HZ - 240, W, 240, 0, HZ - 240, W, 240); g.restore();
  for (let y = HZ; y < H; y += 3) { g.fillStyle = `rgba(8,10,24,${0.25 + r() * 0.3})`; g.fillRect(0, y, W, 1.5); }
  return toTex(c);
}

/* ---------- the easel: painted half, edge-detected half ---------- */

export function painting(W = 1024, H = 768) {
  const r = rng(42);
  const [base, b] = make(W, H);
  let gr = b.createLinearGradient(0, 0, 0, H * 0.64);
  gr.addColorStop(0, '#22335e'); gr.addColorStop(0.45, '#6f5a8f'); gr.addColorStop(0.82, '#e3845c'); gr.addColorStop(1, '#f6c27a');
  b.fillStyle = gr; b.fillRect(0, 0, W, H * 0.64);
  b.fillStyle = '#ffe1a6'; b.beginPath(); b.arc(W * 0.64, H * 0.52, W * 0.055, 0, TAU); b.fill();
  for (const [col, y0, amp, f] of [['#8b6a98', 0.5, 0.07, 0.006], ['#5a4e85', 0.56, 0.05, 0.009], ['#302d58', 0.62, 0.03, 0.014]]) {
    b.fillStyle = col; b.beginPath(); b.moveTo(0, H);
    for (let x = 0; x <= W; x += 6) b.lineTo(x, H * y0 - Math.abs(Math.sin(x * f + y0 * 9)) * H * amp - Math.sin(x * f * 2.7) * H * amp * 0.3);
    b.lineTo(W, H); b.closePath(); b.fill();
  }
  gr = b.createLinearGradient(0, H * 0.64, 0, H);
  gr.addColorStop(0, '#c97b62'); gr.addColorStop(0.18, '#40406e'); gr.addColorStop(1, '#1b1d38');
  b.fillStyle = gr; b.fillRect(0, H * 0.64, W, H * 0.36);
  for (let i = 0; i < 14; i++) {
    const w = 70 - i * 4;
    b.fillStyle = `rgba(255,214,160,${0.55 - i * 0.035})`;
    b.fillRect(W * 0.64 - w / 2 + (r() - 0.5) * 12, H * 0.66 + i * 17, w, 5);
  }
  // a small boat
  b.fillStyle = '#16162c';
  b.beginPath(); b.moveTo(W * 0.27, H * 0.76); b.lineTo(W * 0.335, H * 0.76); b.lineTo(W * 0.325, H * 0.778); b.lineTo(W * 0.28, H * 0.778); b.closePath(); b.fill();
  b.beginPath(); b.moveTo(W * 0.302, H * 0.758); b.lineTo(W * 0.302, H * 0.66); b.lineTo(W * 0.33, H * 0.75); b.closePath(); b.fill();

  const src = b.getImageData(0, 0, W, H).data;

  const [painted, p] = make(W, H);
  p.drawImage(base, 0, 0); p.lineCap = 'round';
  for (let i = 0; i < 9000; i++) {
    const x = r() * W, y = r() * H, k = ((y | 0) * W + (x | 0)) * 4, j = (r() - 0.5) * 24;
    p.strokeStyle = `rgba(${(src[k] + j) | 0},${(src[k + 1] + j) | 0},${(src[k + 2] + j) | 0},0.55)`;
    p.lineWidth = 3 + r() * 7;
    const len = 8 + r() * 22, a = (r() - 0.5) * 0.5;
    p.beginPath(); p.moveTo(x, y); p.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len); p.stroke();
  }

  // Sobel on the clean base: the "unfinished" half is literally edge detection.
  const [edges, e] = make(W, H);
  const out = e.createImageData(W, H), o = out.data;
  const L = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) L[i] = (0.299 * src[i * 4] + 0.587 * src[i * 4 + 1] + 0.114 * src[i * 4 + 2]) / 255;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, n = (r() - 0.5) * 8;
    let m = 0;
    if (x > 0 && y > 0 && x < W - 1 && y < H - 1) {
      const gx = -L[i - W - 1] - 2 * L[i - 1] - L[i + W - 1] + L[i - W + 1] + 2 * L[i + 1] + L[i + W + 1];
      const gy = -L[i - W - 1] - 2 * L[i - W] - L[i - W + 1] + L[i + W - 1] + 2 * L[i + W] + L[i + W + 1];
      m = Math.min(1, Math.hypot(gx, gy) * 2.4);
      if (m < 0.12) m = 0;
    }
    o[i * 4] = 243 + n - m * 185; o[i * 4 + 1] = 238 + n - m * 188; o[i * 4 + 2] = 228 + n - m * 190; o[i * 4 + 3] = 255;
  }
  e.putImageData(out, 0, 0);
  e.strokeStyle = 'rgba(80,70,60,.16)'; e.lineWidth = 1.2;
  for (const [x1, y1, x2, y2] of [[0, H * 0.64, W, H * 0.64], [W * 0.64, 0, W * 0.64, H], [W * 0.1, H * 0.95, W * 0.9, H * 0.2], [0, H * 0.33, W, H * 0.33]]) {
    e.beginPath(); e.moveTo(x1, y1); e.lineTo(x2, y2); e.stroke();
  }

  const [mask, m] = make(W, H);
  const dab = (x, y, rad, a = 1) => {
    const gg = m.createRadialGradient(x, y, 0, x, y, rad);
    gg.addColorStop(0, `rgba(0,0,0,${a})`); gg.addColorStop(0.55, `rgba(0,0,0,${a * 0.85})`); gg.addColorStop(1, 'rgba(0,0,0,0)');
    m.fillStyle = gg; m.beginPath(); m.arc(x, y, rad, 0, TAU); m.fill();
  };
  m.fillStyle = '#000'; m.fillRect(0, 0, W * 0.36, H);
  for (let i = 0; i < 900; i++) {
    const y = r() * H, x = W * (0.32 + Math.pow(r(), 1.6) * 0.22 + Math.sin(y * 0.01) * 0.025);
    dab(x, y, 14 + r() * 34, 0.9);
  }

  const [outC, oc] = make(W, H);
  const [tmp, t] = make(W, H);
  const texture = toTex(outC);
  function compose() {
    oc.drawImage(edges, 0, 0);
    t.globalCompositeOperation = 'source-over'; t.clearRect(0, 0, W, H); t.drawImage(mask, 0, 0);
    t.globalCompositeOperation = 'source-in'; t.drawImage(painted, 0, 0);
    oc.drawImage(tmp, 0, 0);
    texture.needsUpdate = true;
  }
  compose();

  let last = null;
  return {
    texture,
    paint(uv, start) {
      const x = uv.x * W, y = (1 - uv.y) * H;
      if (start || !last) last = { x, y };
      const steps = Math.max(1, Math.ceil(Math.hypot(x - last.x, y - last.y) / 10));
      for (let s = 1; s <= steps; s++) dab(last.x + ((x - last.x) * s) / steps, last.y + ((y - last.y) * s) / steps, 38, 0.9);
      last = { x, y };
      compose();
    },
    lift() { last = null; },
  };
}

/* ---------- laptop ---------- */

export function laptopScreen() {
  const W = 1024, H = 640; const [c, g] = make(W, H); const r = rng(9);
  g.fillStyle = '#0c1824'; g.fillRect(0, 0, W, H);
  g.fillStyle = '#1b2832'; g.beginPath();
  const cx = 660, cy = 330;
  for (let i = 0; i <= 72; i++) {
    const a = (i / 72) * TAU;
    const rx = 290 + Math.sin(a * 3) * 26 + Math.sin(a * 7) * 12, ry = 150 + Math.cos(a * 2) * 18 + Math.sin(a * 5) * 9;
    const x = cx + Math.cos(a) * rx, y = cy + Math.sin(a) * ry;
    i ? g.lineTo(x, y) : g.moveTo(x, y);
  }
  g.fill();
  g.fillStyle = '#20402f';
  for (let i = 0; i < 7; i++) { g.beginPath(); g.ellipse(cx - 200 + r() * 400, cy - 90 + r() * 180, 20 + r() * 40, 12 + r() * 24, r() * 3, 0, TAU); g.fill(); }
  g.strokeStyle = 'rgba(170,195,210,.22)'; g.lineWidth = 2;
  for (let i = 0; i < 30; i++) {
    g.beginPath(); g.moveTo(cx - 260 + r() * 520, cy - 130 + r() * 260);
    g.bezierCurveTo(cx - 260 + r() * 520, cy - 130 + r() * 260, cx - 260 + r() * 520, cy - 130 + r() * 260, cx - 260 + r() * 520, cy - 130 + r() * 260);
    g.stroke();
  }
  g.strokeStyle = 'rgba(240,180,90,.55)'; g.lineWidth = 4;
  g.beginPath(); g.moveTo(400, 380); g.bezierCurveTo(560, 300, 760, 420, 930, 300); g.stroke();
  g.beginPath(); g.moveTo(640, 180); g.bezierCurveTo(620, 260, 700, 380, 660, 480); g.stroke();
  const pins = [];
  for (let i = 0; i < 26; i++) pins.push([cx - 240 + r() * 480, cy - 110 + r() * 220, r() < 0.6 ? '#e5484d' : '#3fb6a8']);
  for (const [x, y, col] of pins) {
    g.fillStyle = col; g.beginPath(); g.arc(x, y, 8, 0, TAU); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(x, y, 3, 0, TAU); g.fill();
  }
  const [px, py] = pins[3];
  g.fillStyle = '#f4f1ea'; g.beginPath(); g.roundRect(px + 14, py - 70, 210, 76, 10); g.fill();
  g.fillStyle = '#1a2229'; g.font = `600 17px ${SANS}`; g.fillText('Point of interest', px + 28, py - 42);
  g.fillStyle = '#9aa4ac'; g.fillRect(px + 28, py - 30, 150, 8); g.fillRect(px + 28, py - 16, 110, 8);

  g.fillStyle = 'rgba(15,21,27,.97)'; g.fillRect(0, 0, 300, H);
  g.fillStyle = '#f4f1ea'; g.font = `600 27px ${SANS}`; g.fillText('maps.gov.sg', 28, 58);
  g.fillStyle = '#76838e'; g.font = `400 14px ${SANS}`; g.fillText('Maps · Layers · Places', 28, 84);
  for (let i = 0; i < 8; i++) {
    const y = 118 + i * 60;
    g.fillStyle = i === 2 ? '#22313c' : '#171f27'; g.beginPath(); g.roundRect(18, y, 264, 48, 8); g.fill();
    g.fillStyle = ['#e5484d', '#3fb6a8', '#f0b45a', '#8f7cf0'][i % 4]; g.beginPath(); g.arc(42, y + 24, 7, 0, TAU); g.fill();
    g.fillStyle = '#c6ccd1'; g.fillRect(62, y + 14, 90 + r() * 110, 8);
    g.fillStyle = '#5d6a74'; g.fillRect(62, y + 28, 60 + r() * 90, 6);
  }
  g.fillStyle = 'rgba(20,28,36,.94)'; g.beginPath(); g.roundRect(330, 22, 380, 44, 10); g.fill();
  g.fillStyle = '#76838e'; g.font = `400 16px ${SANS}`; g.fillText('Search places…', 352, 50);
  return toTex(c);
}

export function keyboard() {
  const [c, g] = make(512, 256);
  g.fillStyle = '#2a2c30'; g.fillRect(0, 0, 512, 256);
  g.fillStyle = '#121316';
  for (let row = 0; row < 5; row++) for (let k = 0; k < 14; k++) {
    g.beginPath(); g.roundRect(10 + k * 35.5, 10 + row * 38, 31, 33, 4); g.fill();
  }
  g.beginPath(); g.roundRect(140, 200, 230, 33, 4); g.fill();
  return toTex(c);
}

/* ---------- the Placecom hoodie (1px = 1mm, origin at the neck) ---------- */

export const HOODIE_W = 720, HOODIE_H = 790;
const MAROON = '#6a1d2a', CREAM = '#f3efe8';

function fabric(g, r) {
  g.fillStyle = MAROON; g.fillRect(0, 0, HOODIE_W, HOODIE_H);
  for (let i = 0; i < 26; i++) {
    const x = r() * HOODIE_W;
    const gr = g.createLinearGradient(x - 30, 0, x + 30, 0);
    gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.5, `rgba(0,0,0,${0.05 + r() * 0.08})`); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(x - 30, 200 + r() * 200, 60, 600);
  }
  g.fillStyle = 'rgba(0,0,0,.2)'; g.fillRect(0, 728, HOODIE_W, 62);
  g.strokeStyle = 'rgba(0,0,0,.18)'; g.lineWidth = 2;
  for (let x = 0; x < HOODIE_W; x += 7) { g.beginPath(); g.moveTo(x, 730); g.lineTo(x, 790); g.stroke(); }
  for (const [x1, x2] of [[650, 720], [0, 70]]) {
    g.save(); g.beginPath();
    const s = x1 > 300 ? 1 : -1, cx1 = x1 > 300 ? 655 : 65, cx2 = x1 > 300 ? 720 : 0;
    g.moveTo(cx1, 632); g.lineTo(cx2, 600); g.lineTo(cx2 - s * 12, 548); g.lineTo(cx1 - s * 12, 582); g.closePath();
    g.fillStyle = 'rgba(0,0,0,.2)'; g.fill(); g.restore();
  }
  grain(g, HOODIE_W, HOODIE_H, 12, r);
}

function kgpLogo(g, x, y, R) {
  g.strokeStyle = CREAM; g.fillStyle = CREAM; g.lineWidth = 3;
  g.beginPath(); g.arc(x, y, R, 0, TAU); g.stroke();
  g.lineWidth = 2; g.beginPath(); g.arc(x, y, R * 0.6, 0, TAU); g.stroke();
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * TAU;
    g.beginPath(); g.moveTo(x + Math.cos(a) * R * 0.66, y + Math.sin(a) * R * 0.66); g.lineTo(x + Math.cos(a) * R * 0.92, y + Math.sin(a) * R * 0.92); g.stroke();
  }
  g.beginPath(); g.moveTo(x, y - R * 0.42); g.quadraticCurveTo(x + R * 0.38, y, x, y + R * 0.36); g.quadraticCurveTo(x - R * 0.38, y, x, y - R * 0.42); g.fill();
}

export function hoodieFront() {
  const [c, g] = make(HOODIE_W, HOODIE_H); const r = rng(15);
  fabric(g, r);
  g.fillStyle = '#cfc9bf'; g.fillRect(357, 30, 6, 700);
  g.fillStyle = '#a9a299';
  for (let y = 30; y < 728; y += 6) g.fillRect(352, y, 16, 2);
  g.fillStyle = '#ddd7cd'; g.fillRect(352, 70, 16, 28);
  g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 3;
  g.beginPath(); g.moveTo(205, 640); g.lineTo(250, 520); g.stroke();
  g.beginPath(); g.moveTo(515, 640); g.lineTo(470, 520); g.stroke();
  kgpLogo(g, 470, 200, 36);
  return toTex(c);
}

export function hoodieBack() {
  const [c, g] = make(HOODIE_W, HOODIE_H); const r = rng(16);
  fabric(g, r);
  g.fillStyle = CREAM; g.textAlign = 'center';
  g.font = `700 70px ${SANS}`; g.fillText('PLACECOM', 360, 262);
  g.font = `700 50px ${SANS}`; g.fillText('JINDAL', 360, 340);
  // campus skyline, as printed along the hem
  g.strokeStyle = CREAM; g.lineWidth = 3; g.lineJoin = 'round';
  const base = 712;
  g.beginPath(); g.moveTo(150, base); g.lineTo(570, base); g.stroke();
  g.strokeRect(170, 650, 380, 62);
  g.strokeRect(325, 590, 70, 60);
  g.beginPath(); g.arc(360, 590, 30, Math.PI, 0); g.stroke();
  g.beginPath(); g.moveTo(360, 560); g.lineTo(360, 540); g.stroke();
  for (let i = 0; i < 9; i++) { g.beginPath(); g.arc(190 + i * 42, base, 12, Math.PI, 0); g.stroke(); }
  g.beginPath(); g.moveTo(170, 650); g.lineTo(220, 625); g.lineTo(270, 650); g.stroke();
  g.beginPath(); g.moveTo(450, 650); g.lineTo(500, 625); g.lineTo(550, 650); g.stroke();
  return toTex(c);
}

/* ---------- small things ---------- */

export function sticky(text, color, seed) {
  const [c, g] = make(256, 256); const r = rng(seed);
  const gr = g.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, color); gr.addColorStop(1, shadeHex(color, -18));
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  g.fillStyle = 'rgba(0,0,0,.06)'; g.fillRect(0, 0, 256, 34);
  g.fillStyle = '#2a2722'; g.font = `600 44px ${HAND}`; g.textBaseline = 'top';
  const words = text.split(' '); let line = '', y = 52;
  for (const w of words) {
    const t = line ? line + ' ' + w : w;
    if (g.measureText(t).width > 210 && line) { g.fillText(line, 24 + r() * 4, y); line = w; y += 46; } else line = t;
  }
  g.fillText(line, 24, y);
  return toTex(c);
}

function shadeHex(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v) => Math.max(0, Math.min(255, v + amt));
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
}

export function plaque(text) {
  const [c, g] = make(256, 96);
  const gr = g.createLinearGradient(0, 0, 0, 96);
  gr.addColorStop(0, '#e2c27a'); gr.addColorStop(0.5, '#b8924a'); gr.addColorStop(1, '#8d6c30');
  g.fillStyle = gr; g.beginPath(); g.roundRect(0, 0, 256, 96, 10); g.fill();
  g.strokeStyle = 'rgba(60,40,10,.6)'; g.lineWidth = 3; g.beginPath(); g.roundRect(8, 8, 240, 80, 6); g.stroke();
  g.fillStyle = '#3a280c'; g.font = `italic 50px ${SERIF}`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, 128, 52);
  return toTex(c);
}

export function verticalGradient(stops, w = 8, h = 256, srgb = true) {
  const [c, g] = make(w, h);
  const gr = g.createLinearGradient(0, 0, 0, h);
  for (const [o, col] of stops) gr.addColorStop(o, col);
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
  return toTex(c, { srgb });
}

/* ---------- polaroids ---------- */

const MOTIFS = {
  omr(g, S, r) {
    g.fillStyle = '#efe4c4'; g.fillRect(0, 0, S, S);
    g.fillStyle = '#cdbd92'; g.fillRect(0, 0, S, 52);
    g.fillStyle = '#3b3322'; g.font = `500 17px ${MONO}`; g.fillText('JEE · 2015 · ANSWER SHEET', 20, 32);
    for (let row = 0; row < 9; row++) {
      const y = 86 + row * 38, pick = (r() * 4) | 0;
      g.fillStyle = '#6b5f45'; g.font = `400 15px ${MONO}`; g.fillText(String(row + 1).padStart(2, '0'), 24, y + 5);
      for (let j = 0; j < 4; j++) {
        g.strokeStyle = '#8f8263'; g.lineWidth = 1.5; g.beginPath(); g.arc(96 + j * 72, y, 11, 0, TAU); g.stroke();
        if (j === pick) { g.fillStyle = '#1f1d1a'; g.beginPath(); g.arc(96 + j * 72, y, 8.5, 0, TAU); g.fill(); }
      }
    }
    g.save(); g.translate(300, 330); g.rotate(-0.22);
    g.strokeStyle = 'rgba(190,40,40,.85)'; g.lineWidth = 5; g.strokeRect(-92, -34, 184, 68);
    g.fillStyle = 'rgba(190,40,40,.85)'; g.font = `700 28px ${MONO}`; g.textAlign = 'center'; g.fillText('RANK 1,500', 0, 10);
    g.restore();
  },
  wire(g, S) {
    const gr = g.createLinearGradient(0, 0, 0, S); gr.addColorStop(0, '#0a1420'); gr.addColorStop(1, '#123040');
    g.fillStyle = gr; g.fillRect(0, 0, S, S);
    g.strokeStyle = 'rgba(110,220,255,.25)'; g.lineWidth = 1;
    for (let i = -10; i <= 10; i++) { g.beginPath(); g.moveTo(S / 2, 210); g.lineTo(S / 2 + i * 70, S); g.stroke(); }
    for (let k = 0; k < 8; k++) { const y = 230 + Math.pow(k / 7, 1.8) * 210; g.beginPath(); g.moveTo(0, y); g.lineTo(S, y); g.stroke(); }
    g.strokeStyle = '#86e9ff'; g.lineWidth = 2;
    g.strokeRect(80, 220, 280, 90); g.strokeRect(185, 140, 70, 80);
    g.beginPath(); g.moveTo(80, 220); g.lineTo(120, 196); g.lineTo(400, 196); g.lineTo(360, 220); g.stroke();
    g.beginPath(); g.moveTo(400, 196); g.lineTo(400, 286); g.lineTo(360, 310); g.stroke();
    g.beginPath(); g.arc(220, 140, 35, Math.PI, 0); g.stroke();
    for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(110 + i * 44, 310, 12, Math.PI, 0); g.stroke(); }
    g.fillStyle = '#86e9ff'; g.font = `500 16px ${MONO}`; g.fillText('VR · KGP', 24, 40);
  },
  wave(g, S, r) {
    g.fillStyle = '#17161f'; g.fillRect(0, 0, S, S);
    const peaks = [0.22, 0.57, 0.83];
    for (let x = 0; x < S; x += 6) {
      const t = x / S; let h = 20 + r() * 40;
      let peak = false;
      for (const p of peaks) { const d = Math.abs(t - p); if (d < 0.05) { h += (1 - d / 0.05) * 150; peak = true; } }
      g.fillStyle = peak ? '#ff9b4a' : '#6d6c8c';
      g.fillRect(x, 260 - h / 2, 4, h);
    }
    g.fillStyle = '#ff9b4a';
    for (const p of peaks) { g.beginPath(); g.moveTo(p * S, 92); g.lineTo(p * S - 9, 76); g.lineTo(p * S + 9, 76); g.fill(); }
    g.strokeStyle = 'rgba(255,255,255,.2)'; g.beginPath(); g.moveTo(0, 380); g.lineTo(S, 380); g.stroke();
    g.fillStyle = '#b4b2cf'; g.font = `500 16px ${MONO}`; g.fillText('excitement(t)', 20, 410);
  },
  flow(g, S) {
    g.fillStyle = '#0f1315'; g.fillRect(0, 0, S, S);
    for (let y = 24; y < S; y += 36) for (let x = 24; x < S; x += 36) {
      const dx = x - S / 2, dy = y - S / 2, d = Math.hypot(dx, dy) + 1;
      const vx = -dy / d * 14 + 6, vy = dx / d * 14;
      const a = Math.atan2(vy, vx);
      g.strokeStyle = `hsl(${(a / TAU) * 360 + 180},80%,62%)`; g.lineWidth = 2;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + vx, y + vy); g.stroke();
      g.beginPath(); g.moveTo(x + vx, y + vy); g.lineTo(x + vx - Math.cos(a - 0.5) * 6, y + vy - Math.sin(a - 0.5) * 6); g.stroke();
    }
  },
  doc(g, S, r) {
    g.fillStyle = '#d9dde0'; g.fillRect(0, 0, S, S);
    g.save(); g.translate(S / 2, S / 2); g.rotate(-0.06);
    g.fillStyle = '#fbfbf8'; g.fillRect(-160, -200, 320, 400);
    g.fillStyle = '#9aa1a8';
    for (let i = 0; i < 6; i++) g.fillRect(-130, -170 + i * 16, 120 + r() * 140, 6);
    g.strokeStyle = '#7d858c'; g.lineWidth = 1.5;
    for (let i = 0; i <= 5; i++) { g.beginPath(); g.moveTo(-130, -50 + i * 26); g.lineTo(130, -50 + i * 26); g.stroke(); }
    for (let i = 0; i <= 3; i++) { g.beginPath(); g.moveTo(-130 + i * 86.6, -50); g.lineTo(-130 + i * 86.6, 80); g.stroke(); }
    g.strokeStyle = '#7d858c'; g.strokeRect(-130, 120, 18, 18); g.strokeRect(-130, 152, 18, 18);
    g.strokeStyle = '#1d1d1d'; g.lineWidth = 3; g.beginPath(); g.moveTo(-127, 129); g.lineTo(-121, 135); g.lineTo(-110, 118); g.stroke();
    g.fillStyle = '#9aa1a8'; g.fillRect(-100, 126, 110, 6); g.fillRect(-100, 158, 90, 6);
    g.strokeStyle = '#3ddc84'; g.lineWidth = 2.5;
    g.strokeRect(-138, -58, 276, 146); g.strokeRect(-136, 114, 30, 30);
    g.fillStyle = '#3ddc84'; g.font = `500 13px ${MONO}`;
    g.fillText('table 0.97', -138, -64); g.fillText('ticked 0.99', -100, 108);
    g.restore();
  },
  kampung(g, S) {
    const gr = g.createLinearGradient(0, 0, 0, S); gr.addColorStop(0, '#f8dcc3'); gr.addColorStop(1, '#eeaf8e');
    g.fillStyle = gr; g.fillRect(0, 0, S, S);
    g.fillStyle = '#ffe9b0'; g.beginPath(); g.arc(340, 110, 46, 0, TAU); g.fill();
    g.fillStyle = '#7a5a43';
    for (const x of [130, 190, 250, 310]) g.fillRect(x, 300, 8, 90);
    g.fillStyle = '#2f6f6a'; g.fillRect(110, 220, 220, 84);
    g.fillStyle = '#b4553a'; g.beginPath(); g.moveTo(90, 226); g.lineTo(220, 140); g.lineTo(350, 226); g.closePath(); g.fill();
    g.fillStyle = '#f3e3c8'; g.fillRect(200, 250, 40, 54);
    g.fillStyle = '#d6455a';
    g.beginPath(); g.moveTo(220, 120); g.bezierCurveTo(196, 96, 168, 118, 194, 142); g.lineTo(220, 164); g.lineTo(246, 142); g.bezierCurveTo(272, 118, 244, 96, 220, 120); g.fill();
    g.fillStyle = '#c98a64'; g.fillRect(0, 388, S, 52);
  },
};

export function polaroid(motif, caption, seed) {
  const [c, g] = make(512, 608);
  g.fillStyle = '#f6f3ec'; g.fillRect(0, 0, 512, 608);
  g.save(); g.beginPath(); g.rect(36, 36, 440, 440); g.clip(); g.translate(36, 36);
  MOTIFS[motif](g, 440, rng(seed));
  const v = g.createRadialGradient(220, 220, 120, 220, 220, 330);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.28)');
  g.fillStyle = v; g.fillRect(0, 0, 440, 440);
  g.restore();
  g.fillStyle = '#2a2622'; g.font = `600 50px ${HAND}`; g.textAlign = 'center';
  g.fillText(caption, 256, 556);
  return toTex(c);
}

/* ---------- outside ---------- */

export function ledScreen() {
  const [c, g] = make(1024, 400); const tex = toTex(c);
  function show(name, sub, hue) {
    const gr = g.createLinearGradient(0, 0, 1024, 400);
    gr.addColorStop(0, `hsl(${hue},70%,14%)`); gr.addColorStop(1, `hsl(${hue + 40},80%,38%)`);
    g.fillStyle = gr; g.fillRect(0, 0, 1024, 400);
    g.fillStyle = '#fff6e8'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `italic 128px ${SERIF}`; g.fillText(name, 512, 180);
    g.font = `500 26px ${MONO}`; g.fillStyle = 'rgba(255,240,220,.75)'; g.fillText(sub.toUpperCase(), 512, 290);
    g.fillStyle = 'rgba(0,0,0,.35)';
    for (let y = 0; y < 400; y += 4) g.fillRect(0, y, 1024, 1.5);
    for (let x = 0; x < 1024; x += 4) g.fillRect(x, 0, 1.5, 400);
    tex.needsUpdate = true;
  }
  return { texture: tex, show };
}

export function label(name, years) {
  const [c, g] = make(512, 180);
  g.textAlign = 'center'; g.shadowColor = 'rgba(40,20,40,.5)'; g.shadowBlur = 16;
  g.fillStyle = '#fffaf2'; g.font = `400 84px ${SERIF}`; g.fillText(name, 256, 96);
  g.fillStyle = '#ffe2c8'; g.font = `500 26px ${MONO}`; g.fillText(years, 256, 146);
  return toTex(c);
}
