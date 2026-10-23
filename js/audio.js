// Karplus–Strong plucked strings: a burst of noise fed through a decaying delay line.
let ctx, bus;
const cache = new Map();

function ensure() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    const body = ctx.createBiquadFilter();
    body.type = 'peaking'; body.frequency.value = 190; body.Q.value = 1.2; body.gain.value = 5;
    const comp = ctx.createDynamicsCompressor();
    const out = ctx.createGain(); out.gain.value = 0.6;
    body.connect(comp); comp.connect(out); out.connect(ctx.destination);
    bus = body;
  }
  if (ctx.state === 'suspended') ctx.resume();
}

function buffer(freq) {
  const k = freq.toFixed(2);
  if (cache.has(k)) return cache.get(k);
  const sr = ctx.sampleRate, len = Math.floor(sr * 3.2), N = Math.round(sr / freq);
  const buf = ctx.createBuffer(1, len, sr), y = buf.getChannelData(0);
  const damp = 0.9965 - (freq / 400) * 0.004;
  let prev = 0;
  for (let i = 0; i < N; i++) { const n = Math.random() * 2 - 1; prev = prev * 0.35 + n * 0.65; y[i] = prev; }
  for (let i = N; i < len; i++) y[i] = damp * 0.5 * (y[i - N] + y[i - N - 1 < 0 ? 0 : i - N - 1]);
  cache.set(k, buf);
  return buf;
}

// A sawtooth gliding up then down through a sweeping band-pass reads as "meow".
export function meow(pitch = 1) {
  ensure();
  const t = ctx.currentTime;
  const o = ctx.createOscillator();
  o.type = 'sawtooth';
  o.frequency.setValueAtTime(430 * pitch, t);
  o.frequency.linearRampToValueAtTime(760 * pitch, t + 0.18);
  o.frequency.exponentialRampToValueAtTime(390 * pitch, t + 0.62);
  const f = ctx.createBiquadFilter();
  f.type = 'bandpass'; f.Q.value = 3.5;
  f.frequency.setValueAtTime(900, t);
  f.frequency.linearRampToValueAtTime(1900, t + 0.2);
  f.frequency.linearRampToValueAtTime(700, t + 0.62);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.55, t + 0.06);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
  o.connect(f); f.connect(g); g.connect(bus);
  o.start(t); o.stop(t + 0.75);
}

export function pluck(freq, when = 0, vel = 1) {
  ensure();
  const src = ctx.createBufferSource();
  src.buffer = buffer(freq);
  const g = ctx.createGain(); g.gain.value = 0.32 * vel;
  src.connect(g); g.connect(bus);
  src.start(ctx.currentTime + when);
}
