import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { setAniso } from './textures.js';
import { loadModels } from './props.js';
import { buildRoom } from './room.js';
import { buildGigs, buildPlaces } from './worlds.js';
import { Rig } from './rig.js';
import { MachineView, Detections } from './vision.js';
import { ITEMS, POLAROIDS } from './content.js';

const $ = (s) => document.querySelector(s);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const touch = matchMedia('(pointer: coarse)').matches;

// Canvas textures are drawn once, so the fonts must be ready first.
const models = loadModels();
await Promise.race([
  Promise.all(['600 44px Caveat', 'italic 50px "Instrument Serif"', '400 84px "Instrument Serif"', '700 70px Inter', '500 16px "JetBrains Mono"']
    .map((f) => document.fonts.load(f))).catch(() => {}),
  wait(2500),
]);
await models;

/* ---------- renderer ---------- */

const canvas = $('#gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
const dpr = Math.min(devicePixelRatio, touch ? 1.75 : 2);
renderer.setPixelRatio(dpr);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
setAniso(Math.min(8, renderer.capabilities.getMaxAnisotropy()));

const camera = new THREE.PerspectiveCamera(32, innerWidth / innerHeight, 0.1, 400);
const rig = new Rig(camera);
const room = buildRoom(renderer);
const builders = { gigs: buildGigs, places: buildPlaces };
const worlds = {};

const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(room.scene, camera);
composer.addPass(renderPass);
composer.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.42, 0.55, 0.9));
composer.addPass(new OutputPass());

const vision = new MachineView(renderer);
const dets = new Detections($('#hud'));
dets.hotspots = touch;
for (const [id, it] of Object.entries(room.items)) {
  const meta = ITEMS[id];
  if (!meta) dets.add(id, it.obj, 'photo', 0.86);
  else dets.add(id, it.obj, meta.door ? `door → ${id}` : meta.label, meta.conf);
}
room.cats.forEach((c, i) => dets.add('cat:' + i, c.mesh, 'cat', 0.97));

/* ---------- ui ---------- */

const card = $('#card'), back = $('#back'), hint = $('#hint'), fade = $('#fade'), vbtn = $('#vision'), vhud = $('#vhud');
const state = { mode: 'room', focus: null, world: null, worldId: null, busy: false, scene: room.scene };

function showCard(c) {
  card.querySelector('.kicker').textContent = c.kicker || '';
  card.querySelector('h2').textContent = c.title;
  card.querySelector('.body').replaceChildren(...c.body.map((t) => Object.assign(document.createElement('p'), { textContent: t })));
  card.querySelector('.links').replaceChildren(...(c.links || []).map((l) =>
    Object.assign(document.createElement('a'), { href: l.href, textContent: `${l.text} ↗`, target: '_blank', rel: 'noopener' })));
  setHint(c.hint || '');
  card.classList.add('open');
  card.scrollTop = 0;
  requestAnimationFrame(placeView);
}
const setHint = (s) => { card.querySelector('.hint').textContent = s; };
function hideCard() { card.classList.remove('open'); placeView(); }

// Slide the rendered view away from the card so the subject stays visible.
function placeView() {
  const o = rig.offset;
  if (!card.classList.contains('open')) { o.gx = o.gy = 0; return; }
  if (innerWidth <= 720) { o.gx = 0; o.gy = card.offsetHeight / 2 + 8; }
  else { o.gx = (card.offsetWidth + 24) / 2; o.gy = 0; }
}

function contentFor(id) {
  if (id.startsWith('polaroid:')) return { ...POLAROIDS.find((p) => 'polaroid:' + p.id === id), kicker: 'photo · 0.86' };
  const it = ITEMS[id];
  return { ...it, kicker: `${it.label} · ${it.conf.toFixed(2)}` };
}

/* ---------- camera poses ---------- */

function overview() {
  const a = innerWidth / innerHeight, portrait = a < 1;
  room.frameSpace(portrait);
  camera.fov = portrait ? 50 : 32;
  camera.aspect = a;
  const half = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * a;
  const r = Math.max(portrait ? 12.5 : 14.5, (portrait ? 3.2 : 6.8) / half);
  return { target: new THREE.Vector3(0, portrait ? 0.4 : 0.9, portrait ? -0.6 : -0.3), r, az: 0, pol: portrait ? 0.62 : 0.9 };
}
function roomLimits(p) { rig.limit({ az: [-0.8, 0.8], pol: [0.25, 1.4], r: [p.r * 0.4, p.r * 1.7] }); }

function focus(id) {
  state.focus = id;
  const p = room.focusPose(id);
  rig.ease = 2.8; rig.set(p); rig.limitAround(p);
  rig.parallaxAmt = 0; rig.drift = 0.008;
  room.setUpright(id.startsWith('polaroid:') ? id : null);
  showCard(contentFor(id));
  dets.ping(id); dets.hover = null;
  back.hidden = false;
  document.body.classList.add('focused');
}

function unfocus() {
  state.focus = null;
  room.setUpright(null);
  const p = overview();
  rig.ease = 2.6; rig.set(p); roomLimits(p);
  rig.parallaxAmt = touch ? 0 : 0.05; rig.drift = 0.02;
  hideCard();
  back.hidden = true;
  document.body.classList.remove('focused');
}

async function enter(id) {
  if (state.busy) return;
  state.busy = true;
  state.focus = null; room.setUpright(null); hideCard();
  room.doors[id].goal = 1;
  rig.limit({ az: [-Math.PI, Math.PI], pol: [0.1, 1.56], r: [0.5, 40] });
  rig.parallaxAmt = 0;
  rig.ease = 2.4; rig.set(room.doorPose(id, false));
  await wait(750);
  rig.ease = 1.8; rig.set(room.doorPose(id, true));
  await wait(600);
  const w = (worlds[id] ||= builders[id](renderer));
  fade.style.background = w.portal; fade.classList.add('on');
  await wait(550);
  Object.assign(state, { mode: 'world', world: w, worldId: id, scene: w.scene });
  rig.set(w.start, true); rig.ease = 1.2; rig.set(w.pose); rig.limit(w.limits); rig.drift = 0.03;
  back.textContent = '← back inside'; back.hidden = false;
  document.body.classList.add('focused');
  showCard({ ...w.card });
  fade.classList.remove('on');
  await wait(600);
  state.busy = false;
}

async function exit() {
  if (state.busy) return;
  state.busy = true;
  const id = state.worldId;
  fade.style.background = '#0e0c0b'; fade.classList.add('on'); hideCard();
  await wait(500);
  Object.assign(state, { mode: 'room', world: null, worldId: null, scene: room.scene });
  rig.set(room.doorPose(id, true), true);
  room.doors[id].goal = 0;
  const p = overview();
  rig.ease = 1.5; rig.set(p); roomLimits(p);
  rig.parallaxAmt = touch ? 0 : 0.05; rig.drift = 0.02;
  back.textContent = '← room'; back.hidden = true;
  document.body.classList.remove('focused');
  fade.classList.remove('on');
  await wait(500);
  state.busy = false;
}

function goBack() { if (state.mode === 'world') exit(); else if (state.focus) unfocus(); }

/* ---------- input ---------- */

const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
function pick(e) {
  if (state.mode !== 'room') return null;
  ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  return ray.intersectObjects(room.pickables, false)[0] || null;
}

const pointers = new Map();
let gesture = null, lastString = null, interacted = false;

function firstTouch() {
  if (interacted) return;
  interacted = true;
  hint.classList.add('gone');
}

function strumAt(hit) {
  const s = hit && hit.object.userData.item === 'guitar' ? room.stringAt(hit.point) : null;
  if (s != null && s !== lastString) room.pluck(s);
  lastString = s;
}

canvas.addEventListener('pointerdown', (e) => {
  canvas.setPointerCapture(e.pointerId);
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pointers.size === 2) {
    const [a, b] = [...pointers.values()];
    if (gesture?.mode === 'fling') room.release(true);
    gesture = { mode: 'pinch', d: Math.hypot(a.x - b.x, a.y - b.y), r0: rig.goal.r };
    return;
  }
  const hit = pick(e), ud = hit?.object.userData || {};
  let mode = 'orbit';
  if (state.mode === 'room' && !state.busy) {
    if (state.focus === 'easel' && ud.paint) mode = 'paint';
    else if (state.focus === 'guitar' && ud.item === 'guitar') mode = 'strum';
    else if (ud.polaroid != null && !state.focus) mode = 'fling';
  }
  gesture = { mode, x: e.clientX, y: e.clientY, t0: performance.now(), moved: 0, hit };
  if (mode === 'paint') room.easel.paint(hit.uv, true);
  if (mode === 'fling') room.grab(ud.polaroid, ray.ray);
  if (mode === 'strum') lastString = room.stringAt(hit.point);
  if (mode === 'orbit') canvas.classList.add('dragging');
  rig.ease = Math.max(rig.ease, 6);
});

canvas.addEventListener('pointermove', (e) => {
  if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (!touch) rig.parallax.set((e.clientX / innerWidth - 0.5) * 2, (e.clientY / innerHeight - 0.5) * 2);
  if (!gesture) {
    if (e.pointerType !== 'mouse') return;
    const hit = pick(e), ud = hit?.object.userData;
    const id = ud?.item || (ud?.cat != null ? 'cat:' + ud.cat : null);
    dets.hover = state.focus || state.busy ? null : id;
    canvas.style.cursor = id ? 'pointer' : '';
    if (state.focus === 'guitar') strumAt(hit);
    return;
  }
  if (gesture.mode === 'pinch') {
    if (pointers.size < 2) return;
    const [a, b] = [...pointers.values()];
    rig.zoomTo(gesture.r0 * gesture.d / Math.max(20, Math.hypot(a.x - b.x, a.y - b.y)));
    return;
  }
  const dx = e.clientX - gesture.x, dy = e.clientY - gesture.y;
  gesture.x = e.clientX; gesture.y = e.clientY; gesture.moved += Math.abs(dx) + Math.abs(dy);
  if (gesture.moved > 6) firstTouch();
  switch (gesture.mode) {
    case 'orbit': rig.rotate(dx, dy); break;
    case 'paint': { const h = pick(e); if (h?.object.userData.paint) room.easel.paint(h.uv); else room.easel.lift(); break; }
    case 'strum': strumAt(pick(e)); break;
    case 'fling': pick(e); room.drag(ray.ray); break;
  }
});

function end(e) {
  pointers.delete(e.pointerId);
  canvas.classList.remove('dragging');
  if (!gesture) return;
  if (gesture.mode === 'pinch') { if (pointers.size === 0) gesture = null; return; }
  const tap = gesture.moved < 8 && performance.now() - gesture.t0 < 450;
  if (gesture.mode === 'fling') room.release(tap);
  if (gesture.mode === 'paint') room.easel.lift();
  if (gesture.mode === 'strum') {
    lastString = null;
    if (tap) { const msg = room.action('guitar'); if (msg) setHint(msg); }
  } else if (tap && gesture.mode !== 'paint') onTap(gesture.hit);
  gesture = null;
}
canvas.addEventListener('pointerup', end);
canvas.addEventListener('pointercancel', end);
canvas.addEventListener('pointerleave', () => { if (!gesture) dets.hover = null; });

function onTap(hit) {
  firstTouch();
  if (state.busy || state.mode !== 'room') return;
  const cat = hit?.object.userData.cat;
  if (cat != null) { room.poke(cat); dets.ping('cat:' + cat); return; }
  const id = hit?.object.userData.item;
  if (!id) { if (state.focus) unfocus(); return; }
  if (ITEMS[id]?.door) { enter(id); return; }
  if (state.focus === id) { const msg = room.action(id); if (msg) setHint(msg); return; }
  focus(id);
}

canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  rig.ease = Math.max(rig.ease, 5);
  rig.zoom(Math.exp(e.deltaY * 0.0012));
  firstTouch();
}, { passive: false });

back.addEventListener('click', goBack);
addEventListener('keydown', (e) => {
  if (e.key === 'Escape') goBack();
  if (e.key === 'v' && !e.metaKey && !e.ctrlKey) vbtn.click();
});
vbtn.addEventListener('click', () => {
  vision.on = !vision.on;
  vbtn.setAttribute('aria-pressed', vision.on);
  dets.all = vision.on;
  vhud.classList.toggle('on', vision.on);
});

/* ---------- size ---------- */

function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  composer.setSize(w, h);
  vision.setSize(Math.floor(w * dpr), Math.floor(h * dpr), dpr);
  dets.resize(w, h, Math.min(devicePixelRatio, 2));
  const p = overview();
  if (state.mode === 'room' && !state.focus && !state.busy) { rig.set(p); roomLimits(p); }
  placeView();
}
addEventListener('resize', resize);
resize();

/* ---------- go ---------- */

const ov = overview();
rig.set({ ...ov, r: ov.r * 1.8, pol: 0.22, az: -0.75 }, true);
rig.ease = 1.15; rig.set(ov); roomLimits(ov);
rig.parallaxAmt = touch ? 0 : 0.05; rig.drift = 0.02;
hint.textContent = touch ? 'drag to look around · pinch to zoom · tap anything' : 'drag to look around · scroll to zoom · click anything';

const clock = new THREE.Clock();
let t = 0, shownCount = -1;
function frame() {
  const dt = Math.min(clock.getDelta(), 1 / 20);
  t += dt;
  rig.update(dt, innerWidth, innerHeight, t);
  if (state.mode === 'room') room.update(dt, t); else state.world.update(t, dt);
  vision.tick(dt);
  if (vision.active) vision.render(state.scene, camera, t);
  else { renderPass.scene = state.scene; composer.render(dt); }
  vision.remember(camera);
  dets.spotsOn = state.mode === 'room' && !state.focus && !state.busy;
  const n = dets.draw(camera, dt, t, state.mode === 'room');
  if (vision.on && n !== shownCount) { shownCount = n; vhud.querySelector('b').textContent = n; }
  requestAnimationFrame(frame);
}
frame();
$('#boot').classList.add('gone');
setTimeout(() => dets.scan(), 2300);
setTimeout(() => { for (const id of Object.keys(builders)) worlds[id] ||= builders[id](renderer); }, 6000);
