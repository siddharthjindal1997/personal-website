// The TV in the sofa corner. Its screen is a canvas repainted while it plays: a slow idle
// loop from across the room, then my favourite episodes once you sit down in front of it.
// Beside it floats a note for each one, AR style: a glass card pinned to the TV by a
// leader line, swept in by a scan bar, always turned to face you.
import * as THREE from 'three';
import { toTex, rng } from './textures.js';
import { SHOWS } from './content.js';

export const EPISODES = SHOWS.flatMap((s) => s.episodes.map((e) => ({ ...e, show: s.name })));

const SW = 1024, SH = 576;
const ACCENT = '#b6ff5c';
const MONO = '"JetBrains Mono", ui-monospace, monospace';
const SERIF = '"Instrument Serif", Georgia, serif';
const SANS = 'Inter, system-ui, sans-serif';
const TAU = Math.PI * 2;
const ease = (x) => 1 - Math.pow(1 - x, 3);

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d')];
}

/* ---------- the episodes, painted ---------- */

const R = rng(42);
const BUBBLES = Array.from({ length: 46 }, () => ({ x: R() * SW, s: 18 + R() * 40, r: 2 + R() * 7, p: R() }));
const STARS = Array.from({ length: 140 }, () => ({ x: R() * SW, y: R() * SH * 0.6, r: 0.6 + R() * 1.6, p: R() * TAU }));
const DUST = Array.from({ length: 50 }, () => ({ x: R(), y: R(), p: R() * TAU }));
const SKYLINE = [];
for (let x = 0; x < SW;) {
  const w = 34 + R() * 70;
  SKYLINE.push({ x, w, h: 40 + R() * 140, lit: Array.from({ length: 40 }, () => R() < 0.3) });
  x += w + 3;
}

function vignette(g, a) {
  const v = g.createRadialGradient(SW / 2, SH / 2, SH * 0.3, SW / 2, SH / 2, SW * 0.62);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, `rgba(0,0,0,${a})`);
  g.fillStyle = v; g.fillRect(0, 0, SW, SH);
}

function sky(g, stops) {
  const gr = g.createLinearGradient(0, 0, 0, SH);
  for (const [at, c] of stops) gr.addColorStop(at, c);
  g.fillStyle = gr; g.fillRect(0, 0, SW, SH);
}

function stars(g, t, a = 1) {
  for (const s of STARS) {
    g.fillStyle = `rgba(255,248,230,${a * (0.45 + 0.4 * Math.sin(t * 1.7 + s.p))})`;
    g.beginPath(); g.arc(s.x, s.y, s.r, 0, TAU); g.fill();
  }
}

// A horse's head in profile, facing right, centred on its cheek.
function horse(g, x, y, s, tilt = 0) {
  g.save(); g.translate(x, y); g.scale(s, s); g.rotate(tilt);
  g.fillStyle = '#5a3b26';
  g.beginPath(); g.moveTo(-14, -28); g.lineTo(-8, -58); g.lineTo(2, -30); g.fill();
  g.beginPath(); g.moveTo(-26, -24); g.lineTo(-24, -54); g.lineTo(-12, -28); g.fill();
  g.beginPath(); g.ellipse(4, 2, 26, 36, -0.75, 0, TAU); g.fill();
  g.fillStyle = '#e8dcc8'; g.beginPath(); g.ellipse(26, 22, 11, 13, -0.75, 0, TAU); g.fill();
  g.fillStyle = '#2a1a10'; g.beginPath(); g.ellipse(-26, -6, 9, 30, 0.3, 0, TAU); g.fill(); // mane
  g.fillStyle = '#111'; g.beginPath(); g.arc(-1, -10, 3, 0, TAU); g.fill();
  g.restore();
}

const ART = {
  // S3E4: a horse in a diving helmet, adrift among jellyfish.
  underwater: {
    glow: '#3fa3c4',
    draw(g, t) {
      sky(g, [[0, '#2a8fa8'], [0.45, '#0f4d6e'], [1, '#03121f']]);
      g.save(); g.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 6; i++) {
        const x = 120 + i * 160 + Math.sin(t * 0.4 + i) * 40, w = 40 + (i % 3) * 30;
        const s = g.createLinearGradient(0, 0, 0, SH * 0.9);
        s.addColorStop(0, 'rgba(190,240,255,0.16)'); s.addColorStop(1, 'rgba(190,240,255,0)');
        g.fillStyle = s;
        g.beginPath(); g.moveTo(x - w / 2, 0); g.lineTo(x + w / 2, 0); g.lineTo(x + w * 1.6 + 90, SH); g.lineTo(x - w * 0.6 + 90, SH); g.fill();
      }
      for (let i = 0; i < 3; i++) {
        const jx = 180 + i * 330 + Math.sin(t * 0.3 + i * 2) * 30;
        const jy = SH + 60 - ((t * (14 + i * 5) + i * 200) % (SH + 160));
        const pulse = 1 + Math.sin(t * 2 + i) * 0.08;
        const jg = g.createRadialGradient(jx, jy, 2, jx, jy, 46);
        jg.addColorStop(0, 'rgba(255,170,220,0.55)'); jg.addColorStop(1, 'rgba(255,170,220,0)');
        g.fillStyle = jg; g.beginPath(); g.arc(jx, jy, 46, 0, TAU); g.fill();
        g.fillStyle = 'rgba(255,200,235,0.6)';
        g.beginPath(); g.ellipse(jx, jy, 22 * pulse, 16 / pulse, 0, Math.PI, 0); g.fill();
        g.strokeStyle = 'rgba(255,200,235,0.35)'; g.lineWidth = 1.5;
        for (let k = -2; k <= 2; k++) {
          g.beginPath(); g.moveTo(jx + k * 7, jy);
          for (let s = 1; s <= 6; s++) g.lineTo(jx + k * 7 + Math.sin(t * 2 + s + k) * 4, jy + s * 9);
          g.stroke();
        }
      }
      g.restore();
      // the diver
      g.save();
      g.translate(SW * 0.45 + Math.sin(t * 0.25) * 60, SH * 0.46 + Math.sin(t * 0.7) * 12);
      g.rotate(Math.sin(t * 0.5) * 0.08);
      g.fillStyle = '#c9a777'; g.beginPath(); g.roundRect(-38, 48, 76, 90, 24); g.fill();
      g.fillStyle = '#8f7a55'; g.fillRect(-44, 52, 88, 12);
      horse(g, 4, 4, 0.95);
      g.strokeStyle = 'rgba(220,240,255,0.85)'; g.lineWidth = 4; g.fillStyle = 'rgba(180,225,255,0.12)';
      g.beginPath(); g.arc(0, 0, 62, 0, TAU); g.fill(); g.stroke();
      g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = 6;
      g.beginPath(); g.arc(0, 0, 50, -2.4, -1.7); g.stroke();
      g.restore();
      g.strokeStyle = '#06261f'; g.lineCap = 'round';
      for (let i = 0; i < 9; i++) {
        const bx = 40 + i * 120 + (i % 2) * 30;
        g.lineWidth = 10 + (i % 3) * 4;
        g.beginPath(); g.moveTo(bx, SH + 10);
        for (let s = 1; s <= 8; s++) g.lineTo(bx + Math.sin(t * 0.8 + s * 0.6 + i) * s * 3, SH - s * (22 + (i % 4) * 6));
        g.stroke();
      }
      g.strokeStyle = 'rgba(220,245,255,0.55)'; g.lineWidth = 1.5;
      for (const b of BUBBLES) {
        const y = SH + 20 - ((t * b.s + b.p * (SH + 40)) % (SH + 40));
        g.beginPath(); g.arc(b.x + Math.sin(t * 1.5 + b.p * 9) * 6, y, b.r, 0, TAU); g.stroke();
      }
      vignette(g, 0.5);
    },
  },

  // S4E11: a faded room that keeps rearranging, the faces scribbled out.
  memory: {
    glow: '#c9b48a',
    draw(g, t) {
      g.fillStyle = '#7d958b'; g.fillRect(0, 0, SW, SH);
      const shift = Math.floor(t / 2.5) % 2 ? 24 : 0;
      g.strokeStyle = 'rgba(240,225,190,0.2)'; g.lineWidth = 2;
      for (let y = 0, row = 0; y < SH; y += 48, row++) {
        for (let x = -48 + shift + (row % 2) * 24; x < SW + 48; x += 48) {
          g.beginPath(); g.moveTo(x, y - 9); g.lineTo(x + 9, y); g.lineTo(x, y + 9); g.lineTo(x - 9, y); g.closePath(); g.stroke();
        }
      }
      g.fillStyle = '#e8d7a8'; g.fillRect(90 + shift * 3, 110, 170, 140);
      g.strokeStyle = '#4f3d33'; g.lineWidth = 8; g.strokeRect(90 + shift * 3, 110, 170, 140);
      g.beginPath(); g.moveTo(175 + shift * 3, 110); g.lineTo(175 + shift * 3, 250); g.stroke();
      g.fillStyle = '#4f3d33'; g.fillRect(760 - shift * 4, 150, 130, 320);
      g.fillStyle = '#5b4636'; g.fillRect(0, 470, SW, SH - 470);
      const figure = (x, s, dress, seed) => {
        const hr = 30 * s, hy = 470 - 300 * s + hr;
        g.fillStyle = dress;
        g.beginPath(); g.moveTo(x - 30 * s, hy + hr + 6 * s); g.lineTo(x + 30 * s, hy + hr + 6 * s); g.lineTo(x + 70 * s, 470); g.lineTo(x - 70 * s, 470); g.fill();
        g.fillStyle = '#e2c4a4'; g.beginPath(); g.arc(x, hy, hr, 0, TAU); g.fill();
        g.fillStyle = '#3a2a20'; g.beginPath(); g.arc(x, hy - hr * 0.2, hr * 1.06, Math.PI, 0); g.fill();
        const r = rng(seed * 977 + Math.floor(t * 9));
        g.strokeStyle = 'rgba(15,12,10,0.9)'; g.lineWidth = 2.2 * s + 1;
        g.beginPath(); g.moveTo(x, hy);
        for (let i = 0; i < 26; i++) g.lineTo(x + (r() - 0.5) * hr * 2.2, hy + (r() - 0.5) * hr * 2.2);
        g.stroke();
      };
      figure(440, 1, '#2f3b5c', 1);
      figure(575, 0.62, '#9a3a3a', 2);
      g.fillStyle = `rgba(120,90,50,${0.22 + Math.sin(t * 0.7) * 0.06})`; g.fillRect(0, 0, SW, SH);
      vignette(g, 0.6);
    },
  },

  // S5E6: one spotlight, one lectern, one horse talking.
  eulogy: {
    glow: '#f2c98a',
    draw(g, t) {
      g.fillStyle = '#0c0a0e'; g.fillRect(0, 0, SW, SH);
      g.fillStyle = '#16121a';
      for (let i = 0; i < 8; i++) g.fillRect(i * 132 + 10, 40, 112, 380);
      g.fillStyle = '#2a1a14';
      g.beginPath(); g.moveTo(700, 330); g.lineTo(960, 330); g.lineTo(985, 365); g.lineTo(950, 400); g.lineTo(720, 400); g.lineTo(690, 365); g.fill();
      g.fillStyle = '#1b1210'; g.fillRect(735, 400, 190, 80);
      for (let i = 0; i < 16; i++) {
        g.fillStyle = ['#c9a0a8', '#e8dccb', '#8a5a6a'][i % 3];
        g.beginPath(); g.arc(752 + i * 12, 326 - (i % 3) * 6, 7, 0, TAU); g.fill();
      }
      const flick = 0.92 + Math.sin(t * 11) * 0.02 + Math.sin(t * 3.1) * 0.03;
      g.save(); g.globalCompositeOperation = 'lighter';
      const cone = g.createLinearGradient(0, 0, 0, SH);
      cone.addColorStop(0, `rgba(255,235,190,${0.3 * flick})`); cone.addColorStop(1, `rgba(255,235,190,${0.07 * flick})`);
      g.fillStyle = cone;
      g.beginPath(); g.moveTo(385, 0); g.lineTo(435, 0); g.lineTo(560, SH); g.lineTo(260, SH); g.fill();
      g.fillStyle = 'rgba(255,230,180,0.22)'; g.beginPath(); g.ellipse(410, 505, 160, 26, 0, 0, TAU); g.fill();
      for (const d of DUST) {
        const y = (d.y * SH + t * 7) % SH, x = 410 + (d.x - 0.5) * (60 + y * 0.45) + Math.sin(t * 0.3 + d.p) * 8;
        g.fillStyle = `rgba(255,240,210,${0.3 + 0.3 * Math.sin(t + d.p)})`; g.fillRect(x, y, 2, 2);
      }
      g.restore();
      g.fillStyle = '#1d1d24'; g.beginPath(); g.roundRect(360, 250, 100, 120, 30); g.fill();
      horse(g, 420, 205, 0.9, -0.1);
      g.fillStyle = '#7d5838';
      g.beginPath(); g.moveTo(335, 320); g.lineTo(485, 320); g.lineTo(478, 336); g.lineTo(342, 336); g.fill();
      g.fillStyle = '#6b4a30';
      g.beginPath(); g.moveTo(352, 336); g.lineTo(468, 336); g.lineTo(445, 500); g.lineTo(375, 500); g.fill();
      g.strokeStyle = '#2a2a2e'; g.lineWidth = 3; g.beginPath(); g.moveTo(430, 320); g.lineTo(445, 268); g.stroke();
      g.fillStyle = '#3a3a40'; g.beginPath(); g.ellipse(447, 262, 6, 9, 0.4, 0, TAU); g.fill();
      vignette(g, 0.55);
    },
  },

  // S6E15: dinner with everyone who's gone, and the door at the end, the dark creeping in.
  dinner: {
    glow: '#a68cff',
    draw(g, t) {
      sky(g, [[0, '#2c1d50'], [0.6, '#160d2a'], [1, '#07050c']]);
      stars(g, t, 0.8);
      const dx = SW / 2, dy = 230;
      g.fillStyle = '#000';
      g.beginPath();
      for (let i = 0; i <= 64; i++) {
        const a = (i / 64) * TAU;
        const r = 104 + Math.sin(a * 5 + t * 0.8) * 14 + Math.sin(a * 9 - t * 1.3) * 8 + Math.min(40, t * 1.5);
        g.lineTo(dx + Math.cos(a) * r * 1.15, dy + Math.sin(a) * r);
      }
      g.fill();
      for (let i = 0; i < 4; i++) {
        const x = dx - 60 + i * 40, len = 30 + ((t * 12 + i * 37) % 70);
        g.fillRect(x - 3, dy + 90, 6, len);
        g.beginPath(); g.arc(x, dy + 90 + len, 6, 0, TAU); g.fill();
      }
      const halo = g.createRadialGradient(dx, dy, 10, dx, dy, 90);
      halo.addColorStop(0, 'rgba(255,226,168,0.9)'); halo.addColorStop(1, 'rgba(255,226,168,0)');
      g.fillStyle = halo; g.fillRect(dx - 90, dy - 90, 180, 180);
      g.fillStyle = '#ffe2a8'; g.fillRect(dx - 32, dy - 56, 64, 112);
      const cloth = g.createLinearGradient(0, 340, 0, SH);
      cloth.addColorStop(0, '#6c6676'); cloth.addColorStop(1, '#d8d2c4');
      g.fillStyle = cloth;
      g.beginPath(); g.moveTo(452, 340); g.lineTo(572, 340); g.lineTo(880, SH); g.lineTo(144, SH); g.fill();
      for (let k = 0; k < 6; k++) {
        const p = k / 5, y = 352 + p * p * 190, spread = 30 + p * 230;
        for (const side of [-1, 1]) {
          const x = dx + side * (spread + 40 + p * 60), s = 0.35 + p * 0.75;
          g.fillStyle = '#0d0a14';
          g.beginPath(); g.roundRect(x - 30 * s, y - 70 * s, 60 * s, 90 * s, 18 * s); g.fill();
          g.beginPath(); g.arc(x, y - 92 * s, 20 * s, 0, TAU); g.fill();
          g.strokeStyle = 'rgba(170,150,230,0.85)'; g.lineWidth = 2;
          g.beginPath(); g.arc(x, y - 92 * s, 20 * s, side > 0 ? Math.PI * 0.8 : -0.8, side > 0 ? Math.PI * 1.6 : 0.2); g.stroke();
        }
        const cx = dx + Math.sin(k * 2.3) * spread * 0.3, cy = y - 8;
        const f = 1 + Math.sin(t * 9 + k * 3) * 0.15;
        const cg = g.createRadialGradient(cx, cy - 8, 1, cx, cy - 8, 26 * (0.5 + p));
        cg.addColorStop(0, 'rgba(255,207,112,0.8)'); cg.addColorStop(1, 'rgba(255,207,112,0)');
        g.fillStyle = cg; g.beginPath(); g.arc(cx, cy - 8, 26 * (0.5 + p), 0, TAU); g.fill();
        g.fillStyle = '#efe6d2'; g.fillRect(cx - 2 - p * 2, cy - 4, 4 + p * 4, 10 + p * 18);
        g.fillStyle = '#ffcf70'; g.beginPath(); g.ellipse(cx, cy - 10, 2.5 + p * 2, (5 + p * 4) * f, 0, 0, TAU); g.fill();
      }
      vignette(g, 0.6);
    },
  },

  // S6E16: two friends on a rooftop, the city warm below, the party behind them.
  rooftop: {
    glow: '#e8936a',
    draw(g, t) {
      sky(g, [[0, '#0a1230'], [0.55, '#3a2f5c'], [0.8, '#e0875a'], [1, '#e0875a']]);
      stars(g, t, 0.7);
      const mg = g.createRadialGradient(820, 110, 20, 820, 110, 90);
      mg.addColorStop(0, 'rgba(244,234,210,0.5)'); mg.addColorStop(1, 'rgba(244,234,210,0)');
      g.fillStyle = mg; g.fillRect(730, 20, 180, 180);
      g.fillStyle = '#f4ead2'; g.beginPath(); g.arc(820, 110, 32, 0, TAU); g.fill();
      for (const b of SKYLINE) {
        const top = 440 - b.h;
        g.fillStyle = '#1a1630'; g.fillRect(b.x, top, b.w, b.h);
        let k = 0;
        for (let y = top + 10; y < 430; y += 16) {
          for (let x = b.x + 6; x < b.x + b.w - 8; x += 12) {
            if (b.lit[k++ % 40]) { g.fillStyle = 'rgba(255,207,138,0.75)'; g.fillRect(x, y, 5, 7); }
          }
        }
      }
      g.strokeStyle = 'rgba(40,30,30,0.9)'; g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(0, 54);
      for (let x = 0; x <= SW; x += 16) g.lineTo(x, 54 + Math.sin((x / SW) * Math.PI) * 50);
      g.stroke();
      for (let x = 20; x < SW; x += 44) {
        const y = 58 + Math.sin((x / SW) * Math.PI) * 50, a = 0.7 + 0.3 * Math.sin(t * 3 + x);
        const bg = g.createRadialGradient(x, y, 1, x, y, 12);
        bg.addColorStop(0, `rgba(255,217,138,${a})`); bg.addColorStop(1, 'rgba(255,217,138,0)');
        g.fillStyle = bg; g.fillRect(x - 12, y - 12, 24, 24);
      }
      g.fillStyle = '#121019'; g.fillRect(0, 440, SW, SH - 440);
      g.fillStyle = '#2b2638'; g.fillRect(0, 440, SW, 6);
      const breathe = Math.sin(t * 1.1) * 1.5;
      g.fillStyle = '#3d4a7a'; g.beginPath(); g.roundRect(380, 330 + breathe, 100, 116, 34); g.fill();
      horse(g, 438, 292 + breathe, 0.9, 0.12);
      g.fillStyle = '#4c5a3c'; g.beginPath(); g.roundRect(560, 360, 76, 86, 26); g.fill();
      g.fillStyle = '#c99a7a'; g.beginPath(); g.arc(596, 335, 25, 0, TAU); g.fill();
      g.fillStyle = '#1a1412'; g.beginPath(); g.arc(598, 330, 27, Math.PI * 0.85, Math.PI * 2.15); g.fill();
      vignette(g, 0.45);
    },
  },

  // From across the room: the hills at dusk, the sign missing its D.
  idle: {
    glow: '#e9a06c',
    draw(g, t) {
      const h = Math.sin(t * 0.05) * 0.5 + 0.5;
      sky(g, [[0, '#1c1838'], [0.5, h > 0.5 ? '#6a4a8a' : '#5e4482'], [0.82, '#f0a868'], [1, '#f6c18a']]);
      stars(g, t, 0.35);
      g.fillStyle = '#3b2a4a';
      g.beginPath(); g.moveTo(0, SH);
      for (let x = 0; x <= SW; x += 16) g.lineTo(x, 330 - Math.sin(x / 210) * 60 - Math.sin(x / 90) * 14);
      g.lineTo(SW, SH); g.fill();
      g.font = `700 46px ${SANS}`; g.fillStyle = '#f4efe6';
      'HOLLYWOO'.split('').forEach((ch, i) => {
        const x = 300 + i * 52, y = 300 - Math.sin(x / 210) * 60 - Math.sin(x / 90) * 14 - 14 + (i % 2) * 4;
        g.save(); g.translate(x, y); g.rotate((i % 3 - 1) * 0.05); g.fillText(ch, 0, 0); g.restore();
      });
      g.fillStyle = '#24192f';
      g.beginPath(); g.moveTo(0, SH);
      for (let x = 0; x <= SW; x += 16) g.lineTo(x, 450 - Math.sin(x / 160 + 1) * 40);
      g.lineTo(SW, SH); g.fill();
      g.strokeStyle = '#120d18'; g.fillStyle = '#120d18'; g.lineCap = 'round';
      for (const [px, ph] of [[120, 260], [860, 300], [930, 220]]) {
        g.lineWidth = 9; g.beginPath(); g.moveTo(px, SH); g.quadraticCurveTo(px + 20, SH - ph / 2, px + 10, SH - ph); g.stroke();
        for (let k = 0; k < 7; k++) {
          const a = (k / 7) * TAU + Math.sin(t * 0.8 + k) * 0.06;
          g.lineWidth = 6; g.beginPath(); g.moveTo(px + 10, SH - ph);
          g.quadraticCurveTo(px + 10 + Math.cos(a) * 40, SH - ph - 20 + Math.sin(a) * 10, px + 10 + Math.cos(a) * 70, SH - ph + 20 + Math.abs(Math.sin(a)) * 30);
          g.stroke();
        }
      }
      if ((t % 4) < 0.15) { g.fillStyle = '#ff5a4a'; g.fillRect(((t * 40) % (SW + 200)) - 100, 90, 4, 4); }
      g.font = `500 22px ${MONO}`; g.fillStyle = 'rgba(243,237,228,0.75)';
      g.fillText(`favourite episodes · ${EPISODES.length}`, 36, SH - 34);
      g.fillStyle = ACCENT; g.beginPath(); g.arc(24, SH - 41, 5, 0, TAU); g.fill();
      vignette(g, 0.4);
    },
  },
};

// Channel bug and a lower third that fades after a few seconds, like a streaming app.
function hud(g, ep, t) {
  g.font = `500 22px ${MONO}`; g.fillStyle = 'rgba(255,255,255,0.7)';
  g.fillText(ep.se, 34, 50);
  const a = Math.max(0, Math.min(1, 6 - t)) * Math.min(1, t * 2);
  if (a <= 0) return;
  g.globalAlpha = a;
  const fade = g.createLinearGradient(0, SH - 190, 0, SH);
  fade.addColorStop(0, 'rgba(0,0,0,0)'); fade.addColorStop(1, 'rgba(0,0,0,0.75)');
  g.fillStyle = fade; g.fillRect(0, SH - 190, SW, 190);
  g.font = `500 18px ${MONO}`; g.fillStyle = ACCENT;
  g.fillText(ep.show.toUpperCase(), 40, SH - 92);
  g.font = `400 50px ${SERIF}`; g.fillStyle = '#fff';
  g.fillText(ep.title, 40, SH - 46);
  g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(40, SH - 26, SW - 80, 4);
  g.fillStyle = ACCENT; g.fillRect(40, SH - 26, (SW - 80) * Math.min(1, 0.04 + t / 600), 4);
  g.globalAlpha = 1;
}

const [noise, ng] = canvas(160, 90);
function snow(g) {
  const img = ng.createImageData(160, 90), d = img.data;
  for (let i = 0; i < d.length; i += 4) { const v = Math.random() * 255; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255; }
  ng.putImageData(img, 0, 0);
  g.imageSmoothingEnabled = false; g.drawImage(noise, 0, 0, SW, SH); g.imageSmoothingEnabled = true;
}

/* ---------- the floating note ---------- */

const PW = 1024, PH = 1120;

function wrap(g, text, w) {
  const out = [];
  let line = '';
  for (const word of text.split(' ')) {
    const next = line ? `${line} ${word}` : word;
    if (g.measureText(next).width > w && line) { out.push(line); line = word; } else line = next;
  }
  if (line) out.push(line);
  return out;
}

function drawNote(g, ep, i, n) {
  const L = 64, W = PW - L * 2;
  g.clearRect(0, 0, PW, PH);
  g.fillStyle = 'rgba(9,22,18,0.84)';
  g.beginPath(); g.roundRect(8, 8, PW - 16, PH - 16, 28); g.fill();
  g.strokeStyle = 'rgba(182,255,92,0.5)'; g.lineWidth = 2; g.stroke();
  g.strokeStyle = ACCENT; g.lineWidth = 7; g.lineCap = 'square';
  const c = 64, m = 10;
  g.beginPath();
  g.moveTo(m, m + c); g.lineTo(m, m); g.lineTo(m + c, m);
  g.moveTo(PW - m - c, m); g.lineTo(PW - m, m); g.lineTo(PW - m, m + c);
  g.moveTo(PW - m, PH - m - c); g.lineTo(PW - m, PH - m); g.lineTo(PW - m - c, PH - m);
  g.moveTo(m + c, PH - m); g.lineTo(m, PH - m); g.lineTo(m, PH - m - c);
  g.stroke();

  let y = 96;
  const pad = (k) => String(k).padStart(2, '0');
  g.font = `500 26px ${MONO}`; g.fillStyle = ACCENT;
  g.fillText(`● AR NOTE ${pad(i + 1)}/${pad(n)}`, L, y);
  g.textAlign = 'right'; g.fillText(ep.se, PW - L, y); g.textAlign = 'left';
  y += 30;
  g.fillStyle = 'rgba(182,255,92,0.3)'; g.fillRect(L, y, W, 2);
  y += 62;
  g.font = `500 24px ${MONO}`; g.fillStyle = '#93a88f';
  g.fillText(ep.show.toUpperCase(), L, y);
  g.font = `400 96px ${SERIF}`; g.fillStyle = '#f3ede4';
  for (const line of wrap(g, ep.title, W)) { y += 94; g.fillText(line, L, y); }
  y += 64;
  g.font = `500 22px ${MONO}`; g.fillStyle = '#93a88f';
  g.fillText('WHAT IT BRINGS UP', L, y);
  y += 22;
  let x = L;
  g.font = `500 25px ${MONO}`;
  for (const [label, conf] of ep.feels) {
    const text = `${label} ${conf.toFixed(2)}`, w = g.measureText(text).width + 32;
    if (x + w > PW - L) { x = L; y += 62; }
    g.fillStyle = 'rgba(182,255,92,0.12)'; g.beginPath(); g.roundRect(x, y, w, 48, 8); g.fill();
    g.strokeStyle = ACCENT; g.lineWidth = 1.5; g.stroke();
    g.fillStyle = ACCENT; g.fillText(text, x + 16, y + 33);
    x += w + 14;
  }
  y += 48 + 18;
  // the words get as much room as is left
  let size = 38, lines;
  for (; size > 24; size--) {
    g.font = `400 ${size}px ${SANS}`;
    lines = ep.body.map((p) => wrap(g, p, W));
    const h = lines.reduce((s, p) => s + p.length, 0) * size * 1.45 + (lines.length - 1) * size * 0.7;
    if (y + h < PH - 130) break;
  }
  g.fillStyle = '#dcd5c9';
  for (const p of lines) {
    for (const line of p) { y += size * 1.45; g.fillText(line, L, y); }
    y += size * 0.7;
  }
  g.font = `500 22px ${MONO}`; g.fillStyle = '#93a88f';
  g.fillText('TAP THE TV · NEXT ▸', L, PH - 64);
  for (let k = 0; k < n; k++) {
    g.fillStyle = k === i ? ACCENT : 'rgba(182,255,92,0.3)';
    g.beginPath(); g.arc(PW - L - (n - 1 - k) * 26, PH - 72, 6, 0, TAU); g.fill();
  }
}

const NOTE_VERT = /* glsl */`
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
// Revealed top-down by a bright scan bar, with faint scanlines and a flicker.
const NOTE_FRAG = /* glsl */`
  uniform sampler2D map; uniform float uTime; uniform float uReveal;
  varying vec2 vUv;
  void main() {
    vec4 c = texture2D(map, vUv);
    float y = 1.0 - vUv.y, edge = uReveal * 1.08;
    float bar = smoothstep(0.035, 0.0, abs(y - edge)) * step(uReveal, 0.999);
    float lines = 0.9 + 0.1 * sin(vUv.y * 1100.0 - uTime * 8.0);
    float flick = 0.95 + 0.05 * sin(uTime * 37.0) * sin(uTime * 13.0);
    vec3 col = c.rgb * lines * flick + vec3(0.71, 1.0, 0.36) * bar * 1.4;
    float a = (c.a * step(y, edge) + bar * 0.8) * min(1.0, uReveal * 4.0);
    gl_FragColor = vec4(col, a);
  }`;

/* ---------- the set ---------- */

// `tv` is the TV model, screen facing +z from the wall it hangs on; `screen` its screen part.
// Set `onChange(episode, index, count)` on the result to hear which episode is on.
export function buildTV(tv, screen) {
  const [sc, sg] = canvas(SW, SH);
  const screenTex = toTex(sc);
  screenTex.generateMipmaps = false; screenTex.minFilter = THREE.LinearFilter;
  const screenMat = new THREE.MeshBasicMaterial({ map: screenTex, toneMapped: false });
  screen.traverse((m) => { if (m.isMesh) { m.material = screenMat; m.castShadow = false; } });

  const glow = new THREE.PointLight(0xe9a06c, 0, 5, 2);
  glow.position.set(0, 1.3, 0.7);
  tv.add(glow);

  const [nc, ng2] = canvas(PW, PH);
  const noteTex = toTex(nc);
  const NW = 0.86, NH = NW * PH / PW;
  const note = new THREE.Mesh(new THREE.PlaneGeometry(NW, NH), new THREE.ShaderMaterial({
    uniforms: { map: { value: noteTex }, uTime: { value: 0 }, uReveal: { value: 0 } },
    vertexShader: NOTE_VERT, fragmentShader: NOTE_FRAG,
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
  }));
  note.renderOrder = 10;
  note.layers.disableAll();

  // Leader line from the TV to the note, a dot at each end, and brackets locking onto the screen.
  const lineMat = new THREE.LineBasicMaterial({ color: ACCENT, transparent: true, opacity: 0, toneMapped: false, depthWrite: false });
  const leader = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), lineMat);
  leader.frustumCulled = false;
  const dotMat = new THREE.MeshBasicMaterial({ color: ACCENT, transparent: true, opacity: 0, toneMapped: false, depthWrite: false });
  const dots = [0, 1].map(() => new THREE.Mesh(new THREE.SphereGeometry(0.012, 10, 8), dotMat));
  const sx = 0.755, sy = 0.44, cy = 1.303, arm = 0.12, z = 0.08, pts = [];
  for (const [x, y] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    const px = x * sx, py = cy + y * sy;
    pts.push(new THREE.Vector3(px, py, z), new THREE.Vector3(px - x * arm, py, z), new THREE.Vector3(px, py, z), new THREE.Vector3(px, py - y * arm, z));
  }
  const brackets = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), lineMat);
  tv.add(brackets);

  const holo = new THREE.Group();
  holo.add(note, leader, ...dots);

  // Where things go, in the TV's frame. On a phone the note floats above the TV instead.
  const portrait = () => innerWidth < innerHeight;
  const layout = () => (portrait()
    ? { at: new THREE.Vector3(0, 2.66, 0.35), scale: 1.65, from: new THREE.Vector3(0, 1.75, 0.07), to: new THREE.Vector3(0, -NH / 2, 0) }
    : { at: new THREE.Vector3(-1.27, 1.42, 0.45), scale: 1, from: new THREE.Vector3(-0.74, 1.62, 0.07), to: new THREE.Vector3(NW / 2, NH * 0.22, 0) });

  const s = {
    on: false, idx: 0, show: 'idle', epT: 0, cut: 0, acc: 1, level: 0,
    noteIdx: null, reveal: 0, wait: 0, yaw: null,
  };
  const v = new THREE.Vector3(), tint = new THREE.Color();

  function play(i) {
    s.idx = (i + EPISODES.length) % EPISODES.length;
    s.show = s.on ? s.idx : 'idle';
    s.cut = 0.35; s.epT = 0; s.acc = 1;
    if (s.on) api.onChange(EPISODES[s.idx], s.idx, EPISODES.length);
  }

  function paint(dt) {
    if (s.cut > 0) { snow(sg); s.cut -= dt; return; }
    if (s.show === 'idle') { ART.idle.draw(sg, s.epT); return; }
    const ep = EPISODES[s.show];
    ART[ep.art].draw(sg, s.epT);
    hud(sg, ep, s.epT);
    if (s.epT < 0.5) { sg.fillStyle = `rgba(0,0,0,${1 - s.epT * 2})`; sg.fillRect(0, 0, SW, SH); }
  }

  const api = {
    holo, pickables: [note], onChange() {},
    open() { if (s.on) return; s.on = true; play(s.idx); },
    close() { if (!s.on) return; s.on = false; play(s.idx); },
    next(d = 1) { play(s.idx + d); },
    get index() { return s.idx; },

    pose() {
      const p = portrait(), aspect = innerWidth / innerHeight;
      const target = tv.localToWorld(p ? new THREE.Vector3(0, 2.12, 0.25) : new THREE.Vector3(-0.5, 1.36, 0.25));
      const hfov = Math.atan(Math.tan(THREE.MathUtils.degToRad(p ? 25 : 16)) * aspect);
      const r = Math.max(2.6, (p ? 0.86 : 1.5) / Math.tan(hfov));
      const facing = tv.getWorldDirection(v);
      return { target, r, az: Math.atan2(facing.x, facing.z) + (p ? 0 : 0.07), pol: p ? 1.47 : 1.43 };
    },

    update(dt, t, camera) {
      s.epT += dt;
      s.acc += dt;
      const fps = s.on ? 30 : 10;
      if (s.acc >= 1 / fps) { paint(s.acc); s.acc = 0; screenTex.needsUpdate = true; }
      s.level += ((s.on ? 1 : 0.62) - s.level) * (1 - Math.exp(-dt * 3));
      screenMat.color.setScalar(s.level);
      const art = ART[s.show === 'idle' ? 'idle' : EPISODES[s.show].art];
      glow.color.lerp(tint.set(art.glow), 1 - Math.exp(-dt * 2));
      glow.intensity = (s.cut > 0 ? 0.6 : 1) * s.level * (s.on ? 2.6 : 1.4);

      // The note: collapse, swap, then sweep back in.
      const want = s.on ? s.idx : null;
      if (want !== s.noteIdx) {
        s.reveal = Math.max(0, s.reveal - dt * 5);
        if (s.reveal === 0) {
          s.noteIdx = want;
          if (want != null) { drawNote(ng2, EPISODES[want], want, EPISODES.length); noteTex.needsUpdate = true; s.wait = s.yaw == null ? 0.7 : 0.15; }
        }
      } else if (want != null) {
        s.wait -= dt;
        if (s.wait <= 0) s.reveal = Math.min(1, s.reveal + dt * 1.3);
      }
      note.material.uniforms.uReveal.value = s.reveal;
      note.material.uniforms.uTime.value = t;
      if (s.reveal > 0) note.layers.enable(0); else note.layers.disableAll();
      const a = ease(Math.min(1, s.reveal * 1.5));
      lineMat.opacity = a * 0.9; dotMat.opacity = a;
      holo.visible = brackets.visible = a > 0.001;
      if (!holo.visible) { s.yaw = null; return; }

      const L = layout();
      tv.localToWorld(note.position.copy(L.at));
      note.position.y += Math.sin(t * 1.3) * 0.012;
      // turn to face the viewer, but only about the vertical
      const yaw = Math.atan2(camera.position.x - note.position.x, camera.position.z - note.position.z);
      if (s.yaw == null) s.yaw = yaw;
      s.yaw += Math.atan2(Math.sin(yaw - s.yaw), Math.cos(yaw - s.yaw)) * (1 - Math.exp(-dt * 4));
      note.rotation.set(0, s.yaw, 0);
      note.scale.setScalar(L.scale * (0.94 + 0.06 * a));
      note.updateMatrixWorld();
      tv.localToWorld(dots[0].position.copy(L.from));
      note.localToWorld(dots[1].position.copy(L.to));
      const pos = leader.geometry.attributes.position;
      pos.setXYZ(0, dots[0].position.x, dots[0].position.y, dots[0].position.z);
      pos.setXYZ(1, dots[1].position.x, dots[1].position.y, dots[1].position.z);
      pos.needsUpdate = true;
    },
  };
  return api;
}
