// Frogspawn: single eggs (dark animal pole / pale yolk pole in swelling jelly), clumps, and the macro embryo.
// The macro embryo (Gosner 1-16) is shaded per pixel as a real sphere: pigment by latitude, grey crescent, cleavage
// furrows as spherical Voronoi boundaries (2, 4, 8, 16, 32, 64, 200 cells) that cut in from the animal pole, epiboly +
// blastopore + yolk plug, then the neural plate whose folds rise and zip shut. From stage 16.5 the amphibian rig
// (hatchling mode, curled) takes over inside the capsule.
const { C, TAU, clamp, lerp, hash, rng, rgba, mix, ss, noise2 } = require('./core');
const G = require('./gfx');
const F = require('./frog');

// ---------------------------------------------------------------- small eggs + clumps
function egg(g, x, y, R, o = {}) {
  const core = o.core ?? .36, r = R * core, a = o.a ?? 1, rot = o.rot ?? 0, lx = -.6, ly = -.7;
  g.save(); g.globalAlpha *= a;
  // jelly
  g.fillStyle = G.rad(g, x, y, R, [[0, o.jelly ?? '#d8f0e0', .05], [.75, o.jelly ?? '#d8f0e0', .1], [.95, o.jelly ?? '#e8fff4', .26], [1, '#ffffff', .05]]);
  G.circle(g, x, y, R); g.fill();
  g.strokeStyle = rgba('#f4fffa', .5 * (o.rim ?? 1)); g.lineWidth = Math.max(1, R * .05);
  g.beginPath(); g.arc(x, y, R * .96, Math.PI * 1.05, Math.PI * 1.6); g.stroke();
  g.strokeStyle = rgba('#0c2a20', .25); g.lineWidth = Math.max(.7, R * .03);
  g.beginPath(); g.arc(x, y, R * .99, Math.PI * .1, Math.PI * .85); g.stroke();
  // ovum: dark top, pale bottom (rotated)
  if (o.inner) o.inner(g, x, y, r);
  else {
    const ux = Math.sin(rot), uy = -Math.cos(rot);
    g.fillStyle = G.lin(g, x + ux * r, y + uy * r, x - ux * r, y - uy * r, [[0, '#0d0a08'], [.48, '#2b2018'], [.6, '#9a8a6a'], [.75, '#d9cba8'], [1, '#efe4c8']]);
    G.circle(g, x, y, r); g.fill();
    g.fillStyle = G.rad(g, x, y, r, [[.6, '#000000', 0], [1, '#000000', .45]]); G.circle(g, x, y, r); g.fill();
  }
  g.fillStyle = 'rgba(255,255,255,.85)'; G.ellipse(g, x + lx * r * .45, y + ly * r * .45, r * .2, r * .12, -.6); g.fill();
  g.fillStyle = 'rgba(255,255,255,.7)'; G.ellipse(g, x + lx * R * .6, y + ly * R * .6, R * .1, R * .05, -.7); g.fill();
  g.restore();
}

// 3D blob of egg centres (unit sphere-ish), cached
const BLOBS = new Map();
function blobPts(n, seed) {
  const key = n + ':' + seed;
  if (BLOBS.has(key)) return BLOBS.get(key);
  const r = rng(seed), P = [];
  let tries = 0;
  while (P.length < n && tries < 40000) {
    tries++;
    const x = r() * 2 - 1, y = r() * 2 - 1, z = r() * 2 - 1;
    if (x * x / 1.3 + y * y / .8 + z * z > 1) continue;
    const md = .19 * Math.pow(120 / n, 1 / 3);
    if (P.some((q) => (q[0] - x) ** 2 + (q[1] - y) ** 2 + (q[2] - z) ** 2 < md * md)) continue;
    P.push([x, y, z, r(), r()]);
  }
  P.sort((a, b) => a[2] - b[2]);
  BLOBS.set(key, P);
  return P;
}
// clump: o.n eggs, o.size (blob radius px), o.swell 0..1 (jelly radius), o.stage (inner embryo: 0 egg .. 1 comma .. 2 tadpole curled)
function clump(g, x, y, o = {}) {
  const n = o.n ?? 120, P = blobPts(n, o.seed ?? 5), size = o.size ?? 200, sw = o.swell ?? 1;
  const R = size * .19 * Math.pow(120 / n, 1 / 3) * lerp(.42, 1.05, sw), spread = lerp(.45, 1, sw), t = o.t ?? 0;
  const ang = o.spin ?? 0, cs = Math.cos(ang), sn = Math.sin(ang);
  for (const [px, py, pz, h1, h2] of P) {
    const rx = px * cs - pz * sn, rz = px * sn + pz * cs;
    const ex = x + rx * size * spread, ey = y + py * size * spread + Math.sin(t * 1.3 + h1 * 6) * 1.5, d = (rz + 1) / 2;
    const st = o.stage ?? 0;
    egg(g, ex, ey, R * (.92 + h2 * .16), {
      core: lerp(.95, .36, sw) * (st > .5 ? 1.05 : 1), a: (o.a ?? 1) * lerp(.55, 1, d), rot: (h1 - .5) * .5 * (1 - sw * .5),
      rim: lerp(.4, 1, d),
      inner: st > .2 ? (gg, cx, cy, r) => innerEmbryo(gg, cx, cy, r, st, t + h1 * 9, h1) : null,
    });
  }
}
// position + jelly radius of egg i in a clump drawn with the same options
function clumpEgg(x, y, o, i) {
  const n = o.n ?? 120, P = blobPts(n, o.seed ?? 5), size = o.size ?? 200, sw = o.swell ?? 1, t = o.t ?? 0;
  const R = size * .19 * Math.pow(120 / n, 1 / 3) * lerp(.42, 1.05, sw), spread = lerp(.45, 1, sw), ang = o.spin ?? 0;
  const [px, py, pz, h1, h2] = P[(i + n) % n], rx = px * Math.cos(ang) - pz * Math.sin(ang);
  return [x + rx * size * spread, y + py * size * spread + Math.sin(t * 1.3 + h1 * 6) * 1.5, R * (.92 + h2 * .16)];
}

// tiny embryo silhouettes for clump eggs: comma (st~1) -> curled tadpole (st~2)
function innerEmbryo(g, x, y, r, st, t, h) {
  const k = clamp(st - .2), tw = Math.sin(t * 6) * .15 * ss(1.2, 2, st);
  g.save(); g.translate(x, y); g.rotate(h * TAU + tw);
  if (st < 1) {
    g.fillStyle = G.lin(g, 0, -r, 0, r, [[0, '#1a120c'], [.6, '#3a2a1c'], [1, '#d9c9a4']]);
    G.ellipse(g, 0, 0, r * lerp(1, 1.35, k), r * lerp(1, .7, k)); g.fill();
  } else {
    g.strokeStyle = '#1e160e'; g.lineCap = 'round'; g.lineWidth = r * .7;
    g.beginPath(); g.arc(0, 0, r * .75, -Math.PI * .2, Math.PI * lerp(.9, 1.3, st - 1)); g.stroke();
    g.fillStyle = '#d4c49a'; G.circle(g, r * .55, r * .3, r * .32); g.fill();
  }
  g.restore();
}

// ---------------------------------------------------------------- per-pixel embryo sphere
function fib(n, warp, seed) {
  const r = rng(seed), P = [];
  for (let i = 0; i < n; i++) {
    let y = 1 - 2 * (i + .5) / n;
    y = 1 - 2 * Math.pow((1 - y) / 2, warp);
    const rr = Math.sqrt(1 - y * y), a = i * 2.399963 + r() * .3;
    P.push(norm([Math.cos(a) * rr + (r() - .5) * .05, y, Math.sin(a) * rr + (r() - .5) * .05]));
  }
  return P;
}
function norm(v) { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; }
function sectors(ns, tiers, off = 0, jit = 0, seed = 1) {
  const r = rng(seed), P = [];
  for (const ty of tiers) for (let k = 0; k < ns; k++) { const a = (k + .5) / ns * TAU + off + (r() - .5) * jit, rr = Math.sqrt(1 - ty * ty); P.push(norm([Math.cos(a) * rr, ty + (r() - .5) * jit * .5, Math.sin(a) * rr])); }
  return P;
}
const CELLSETS = [
  null, // 1 cell
  [[1, 0, 0], [-1, 0, 0]],
  sectors(4, [0], Math.PI / 4 - Math.PI / 4),
  sectors(4, [.72, -.32]),
  sectors(8, [.72, -.32], Math.PI / 8),
  sectors(8, [.9, .58, .08, -.62], Math.PI / 8, .08, 3),
  sectors(16, [.9, .62, .25, -.5], 0, .18, 4),
  fib(200, 1.5, 9),
];
// stage -> [cell set index (old), new, progress]
function cleavage(gs) {
  if (gs < 2.6) return [0, 0, 0];
  const steps = [[2.6, 1], [3.6, 2], [4.6, 3], [5.6, 4], [6.6, 5], [7.6, 6], [8.6, 7]];
  let idx = 0;
  for (let i = 0; i < steps.length; i++) if (gs >= steps[i][0]) idx = i;
  const [s0, k] = steps[idx], prog = clamp((gs - s0) / .8);
  return [idx === 0 ? 0 : steps[idx - 1][1], k, prog];
}
function vor(P, x, y, z) {
  let b1 = -2, b2 = -2;
  for (let i = 0; i < P.length; i++) { const d = P[i][0] * x + P[i][1] * y + P[i][2] * z; if (d > b1) { b2 = b1; b1 = d; } else if (d > b2) b2 = d; }
  return b1 - b2;
}
// Euler view (yaw, pitch, roll) for a stage
function view(gs, t) {
  const A = [.5 + t * .1, .5, .12], B = [.1, -1.12, 0], N = [0, .12, -Math.PI / 2];
  const k1 = ss(9.2, 10, gs), k2 = ss(12.2, 13, gs);
  return [0, 1, 2].map((i) => lerp(lerp(A[i], B[i], k1), N[i], k2));
}
let SPH = null;
function sphere(g, x, y, Rs, gs, t, o = {}) {
  const res = o.res ?? .62, R = Math.max(8, Math.round(Rs * res)), stretch0 = 1 + ss(13, 16.5, gs) * .12 + (o.stretch ?? 0);
  const S = 2 * R + 4, SX = Math.ceil(2 * R * stretch0) + 4;
  if (!SPH || SPH.S !== S || SPH.SX !== SX) { const cv = C.createCanvas(SX, S); SPH = { cv, g: cv.getContext('2d'), S, SX, im: null }; SPH.im = SPH.g.createImageData(SX, S); }
  const d = SPH.im.data; d.fill(0);
  const [yaw, pitch, roll] = o.view ?? view(gs, t);
  // p_egg = Ry(-yaw) Rx(-pitch) Rz(-roll) v
  const cr = Math.cos(-roll), sr = Math.sin(-roll), cp = Math.cos(-pitch), sp = Math.sin(-pitch), cy = Math.cos(-yaw), sy = Math.sin(-yaw);
  const [c0, c1, prog] = cleavage(gs);
  const P0 = CELLSETS[c0], P1 = CELLSETS[c1], cellK = 1 - ss(9, 10, gs), wCell = c1 >= 6 ? .02 : .045;
  const lat0 = lerp(-.12, -1.0, ss(9.6, 12.8, gs));              // epiboly: pigment spreads down
  const bp = ss(9.6, 10.4, gs), bpArc = lerp(.6, Math.PI, ss(10.3, 11.6, gs)), ringR = Math.acos(clamp(-lat0, -1, 1));
  const neural = ss(12.6, 13.4, gs), close = ss(13.6, 16, gs);
  const stretch = stretch0;
  const Lx = -.45, Ly = -.6, Lz = .66;                             // key light (view space, y down)
  const furrowAt = (ex, ey, ez) => {
    let f = 0;
    if (P1 && cellK > 0) {
      const front = ss(1 - prog * 2.4, 1 - prog * 2.4 + .35, ey);   // furrow cuts in from the animal pole
      const d1 = vor(P1, ex, ey, ez), f1 = Math.exp(-((d1 / wCell) ** 2)) * front;
      if (P0) { const d0 = vor(P0, ex, ey, ez); const f0 = Math.exp(-((d0 / (c0 >= 6 ? .02 : .045)) ** 2)); f = c1 >= 6 ? lerp(f0, f1, prog) : Math.max(f0, f1); } else f = f1;
      f *= cellK;
    }
    return f;
  };
  for (let py = 0; py < S; py++) {
    const vy = (py - S / 2) / R;
    for (let px = 0; px < SX; px++) {
      const vx = (px - SX / 2) / R, ex2 = vx / stretch, rr = ex2 * ex2 + vy * vy;
      if (rr > 1.0) continue;
      let r1 = Math.sqrt(rr);
      // silhouette notches where furrows meet the outline
      if (r1 > .9 && cellK > 0 && P1) {
        const sx = ex2 / r1, sy2 = vy / r1;
        let ux = sx * cr - (-sy2) * sr, uy = sx * sr + (-sy2) * cr, uz = 0;
        let qy = uy * cp - uz * sp, qz = uy * sp + uz * cp, qx = ux;
        const ex = qx * cy + qz * sy, ez = -qx * sy + qz * cy;
        if (r1 > 1 - .07 * furrowAt(ex, qy, ez)) continue;
      }
      const nz = Math.sqrt(Math.max(0, 1 - rr)), nx = ex2, ny = vy;
      // view -> egg
      let ux = nx * cr - (-ny) * sr, uy = nx * sr + (-ny) * cr, uz = nz;
      let qy = uy * cp - uz * sp, qz = uy * sp + uz * cp, qx = ux;
      const ex = qx * cy + qz * sy, ey = qy, ez = -qx * sy + qz * cy;
      // albedo
      const tAnim = ss(lat0 - .12, lat0 + .1, ey);
      let ar = lerp(222, 44, tAnim), ag = lerp(206, 30, tAnim), ab = lerp(170, 20, tAnim);
      const nn = noise2(ex * 9 + 3, ey * 9 + ez * 5, 2) * .5 + noise2(ex * 23, ez * 23 + ey * 7, 5) * .25;
      ar *= 1 + nn * .14; ag *= 1 + nn * .14; ab *= 1 + nn * .12;
      // grey crescent (dorsal, just below the boundary) before gastrulation
      const gc = (1 - ss(8.5, 10, gs)) * ss(1.6, 2.4, gs) * Math.max(0, ez) ** 2 * Math.exp(-(((ey - lat0 + .02) / .1) ** 2));
      ar = lerp(ar, 128, gc * .8); ag = lerp(ag, 112, gc * .8); ab = lerp(ab, 98, gc * .8);
      let shadeK = 1;
      // blastopore lip + yolk plug
      if (bp > 0 && gs < 13.4) {
        const th = Math.acos(clamp(-ey, -1, 1)), lon = Math.atan2(ex, ez), inArc = ss(bpArc, bpArc - .25, Math.abs(lon));
        const plug = ss(ringR + .03, ringR - .05, th) * ss(9.8, 10.6, gs);
        ar = lerp(ar, 226, plug); ag = lerp(ag, 210, plug); ab = lerp(ab, 170, plug);
        const lip = Math.exp(-(((th - ringR - .03) / .07) ** 2)) * inArc * bp * (1 - ss(12.6, 13.3, gs));
        shadeK *= 1 - lip * .88;
      }
      // neural plate (dorsal, anterior = +y) with folds rising and closing over the midline
      if (neural > 0) {
        const s = Math.atan2(ey, ez), head = Math.exp(-(((s - .3) / .38) ** 2));
        const tipK = s > .3 ? Math.sqrt(Math.max(0, 1 - ((s - .3) / .48) ** 2)) : 1, tailK = s < -.6 ? Math.sqrt(Math.max(0, 1 - ((s + .6) / .5) ** 2)) : 1;
        const wid = (.11 + .24 * head) * tipK * tailK * (1 - close * .92), inside = tipK > 0 && tailK > 0 ? 1 : 0;
        const dz = Math.abs(ex);
        const plate = ss(wid + .03, wid - .02, dz) * inside * neural;
        ar = lerp(ar, 128, plate * .75); ag = lerp(ag, 88, plate * .75); ab = lerp(ab, 58, plate * .75);
        const fold = Math.exp(-(((dz - wid) / .05) ** 2)) * inside * neural;
        const side = Math.sign(ex) * (dz < wid ? -1 : 1);
        shadeK *= 1 + fold * (.45 - .35 * side * Math.sign(vy || 1)) - plate * .05;
        if (close > .9) shadeK *= 1 - Math.exp(-((dz / .02) ** 2)) * inside * .35;
      }
      const fur = furrowAt(ex, ey, ez);
      shadeK *= 1 - fur * .78;
      // lighting
      const lam = Math.max(0, nx * Lx + ny * Ly + nz * Lz), wrap = (lam + .35) / 1.35;
      const hx = Lx, hy = Ly, hz = Lz + 1, hl = Math.hypot(hx, hy, hz), hd = Math.max(0, (nx * hx + ny * hy + nz * hz) / hl), spec = (Math.pow(hd, 90) * .85 + Math.pow(hd, 12) * .12) * (1 - fur);
      const fres = Math.pow(1 - nz, 3);
      const k = (.25 + .85 * wrap) * shadeK;
      const i4 = (py * SX + px) * 4;
      d[i4] = clamp(ar * k + spec * 240 + fres * 70, 0, 255);
      d[i4 + 1] = clamp(ag * k + spec * 240 + fres * 95, 0, 255);
      d[i4 + 2] = clamp(ab * k + spec * 235 + fres * 90, 0, 255);
      d[i4 + 3] = 255 * Math.min(1, (1 - r1) * R * .9 + .05);
    }
  }
  SPH.g.putImageData(SPH.im, 0, 0);
  g.save();
  g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
  if (o.rot) { g.translate(x, y); g.rotate(o.rot); g.translate(-x, -y); }
  g.drawImage(SPH.cv, 0, 0, SX, S, x - Rs * SX / (2 * R), y - Rs * S / (2 * R), Rs * SX / R, Rs * S / R);
  g.restore();
}

// jelly capsule around the macro egg (vitelline membrane + jelly layers), darkfield lit
function capsule(g, x, y, Rc, t, o = {}) {
  const a = o.a ?? 1, thin = o.thin ?? 0;
  g.save(); g.globalAlpha *= a;
  g.fillStyle = G.rad(g, x, y, Rc * 1.55, [[0, '#9fe8d0', .03], [.62, '#9fe8d0', .06], [.66, '#c8fff0', .16], [.72, '#9fe8d0', .05], [.97, '#c8fff0', .14], [1, '#c8fff0', 0]]);
  G.circle(g, x, y, Rc * 1.55); g.fill();
  g.lineWidth = 2.2; g.strokeStyle = rgba('#e6fff8', .55 * (1 - thin));
  G.circle(g, x, y, Rc); g.stroke();
  g.lineWidth = 1.2; g.strokeStyle = rgba('#b8fff0', .3);
  G.circle(g, x, y, Rc * 1.52); g.stroke();
  g.strokeStyle = rgba('#ffffff', .65); g.lineWidth = 5;
  g.beginPath(); g.arc(x, y, Rc * 1.5, Math.PI * 1.1, Math.PI * 1.45); g.stroke();
  g.lineWidth = 3; g.beginPath(); g.arc(x, y, Rc * .97, Math.PI * 1.12, Math.PI * 1.38); g.stroke();
  g.restore();
}

// egg-space unit vector -> view [x, y (screen down), z] in sphere radii, matching sphere()
function project(gs, t, p, o = {}) {
  const [yaw, pitch, roll] = o.view ?? view(gs, t);
  const [x, y, z] = p;
  const x1 = x * Math.cos(yaw) + z * Math.sin(yaw), z1 = -x * Math.sin(yaw) + z * Math.cos(yaw), y1 = y;
  const y2 = y1 * Math.cos(pitch) - z1 * Math.sin(pitch), z2 = y1 * Math.sin(pitch) + z1 * Math.cos(pitch), x2 = x1;
  const x3 = x2 * Math.cos(roll) - y2 * Math.sin(roll), y3 = x2 * Math.sin(roll) + y2 * Math.cos(roll);
  const stretch = 1 + ss(13, 16.5, gs) * .12 + (o.stretch ?? 0);
  return [x3 * stretch, -y3, z2];
}

module.exports = { egg, clump, clumpEgg, blobPts, sphere, capsule, innerEmbryo, view, cleavage, project };
