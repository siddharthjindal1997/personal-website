// Orbit camera with everything eased: drag, zoom and fly-to all just move a goal,
// and the camera chases it. That chase is what makes it feel smooth.
import * as THREE from 'three';

const clamp = THREE.MathUtils.clamp;

export class Rig {
  constructor(camera) {
    this.camera = camera;
    this.cur = { target: new THREE.Vector3(), r: 10, az: 0, pol: 1 };
    this.goal = { target: new THREE.Vector3(), r: 10, az: 0, pol: 1 };
    this.lim = { az: [-Math.PI, Math.PI], pol: [0.05, 1.55], r: [0.5, 60] };
    this.ease = 4;
    this.parallax = new THREE.Vector2();
    this.parallaxAmt = 0;
    this.drift = 0;
    this.offset = { x: 0, y: 0, gx: 0, gy: 0 };
  }

  set(pose, immediate = false) {
    const g = this.goal;
    if (pose.target) g.target.copy(pose.target);
    if (pose.r != null) g.r = pose.r;
    if (pose.az != null) g.az = pose.az;
    if (pose.pol != null) g.pol = pose.pol;
    if (immediate) {
      this.cur.target.copy(g.target);
      Object.assign(this.cur, { r: g.r, az: g.az, pol: g.pol });
    }
  }

  limit(lim) { Object.assign(this.lim, lim); }

  // Limits around a pose: look around it a little, never far.
  limitAround(p, daz = 0.55, dpol = [0.35, 0.2], dr = [0.6, 1.7]) {
    this.limit({ az: [p.az - daz, p.az + daz], pol: [p.pol - dpol[0], Math.min(1.56, p.pol + dpol[1])], r: [p.r * dr[0], p.r * dr[1]] });
  }

  rotate(dx, dy) {
    const g = this.goal, l = this.lim;
    g.az = clamp(g.az - dx * 0.0055, l.az[0], l.az[1]);
    g.pol = clamp(g.pol - dy * 0.0045, l.pol[0], l.pol[1]);
  }

  zoom(f) { this.goal.r = clamp(this.goal.r * f, this.lim.r[0], this.lim.r[1]); }
  zoomTo(r) { this.goal.r = clamp(r, this.lim.r[0], this.lim.r[1]); }

  update(dt, w, h, t) {
    const k = 1 - Math.exp(-dt * this.ease), c = this.cur, g = this.goal;
    c.target.lerp(g.target, k);
    c.r += (g.r - c.r) * k;
    c.az += (g.az - c.az) * k;
    c.pol += (g.pol - c.pol) * k;
    const az = c.az + this.parallax.x * this.parallaxAmt + Math.sin(t * 0.13) * this.drift;
    const pol = c.pol + this.parallax.y * this.parallaxAmt * 0.6 + Math.sin(t * 0.11 + 1) * this.drift * 0.4;
    const sp = Math.sin(pol);
    this.camera.position.set(
      c.target.x + c.r * sp * Math.sin(az),
      c.target.y + c.r * Math.cos(pol),
      c.target.z + c.r * sp * Math.cos(az),
    );
    this.camera.lookAt(c.target);
    const o = this.offset, ko = 1 - Math.exp(-dt * 5);
    o.x += (o.gx - o.x) * ko; o.y += (o.gy - o.y) * ko;
    this.camera.setViewOffset(w, h, o.x, o.y, w, h);
  }
}
