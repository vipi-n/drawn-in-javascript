// Tiny flat-shaded 3D engine for spacecraft (painter's algorithm, procedural materials).
const { clamp, hash, lerp } = require('./core');
const { rgba } = require('./gfx');

const V = {
  add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
  sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  mul: (a, k) => [a[0] * k, a[1] * k, a[2] * k],
  dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
  norm: (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; },
};
// rotation matrix: yaw (Y), pitch (X), roll (Z)
function rot(yaw = 0, pitch = 0, roll = 0) {
  const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch), cr = Math.cos(roll), sr = Math.sin(roll);
  const Ry = [[cy, 0, sy], [0, 1, 0], [-sy, 0, cy]], Rx = [[1, 0, 0], [0, cp, -sp], [0, sp, cp]], Rz = [[cr, -sr, 0], [sr, cr, 0], [0, 0, 1]];
  return mm(Ry, mm(Rx, Rz));
}
function mm(A, B) { const C = [[0, 0, 0], [0, 0, 0], [0, 0, 0]]; for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) for (let k = 0; k < 3; k++) C[i][j] += A[i][k] * B[k][j]; return C; }
const mv = (M, v) => [M[0][0] * v[0] + M[0][1] * v[1] + M[0][2] * v[2], M[1][0] * v[0] + M[1][1] * v[1] + M[1][2] * v[2], M[2][0] * v[0] + M[2][1] * v[1] + M[2][2] * v[2]];

const MAT = {
  foil: { c: [205, 152, 58], kind: 'foil', spec: .45 },
  silver: { c: [190, 192, 198], kind: 'foil', spec: .8 },
  white: { c: [225, 225, 222], spec: .25 },
  grey: { c: [120, 122, 128], spec: .3 },
  dark: { c: [40, 40, 46], spec: .2 },
  solar: { c: [22, 38, 92], kind: 'solar', spec: 1.2 },
  dish: { c: [235, 235, 230], spec: .4, two: true },
  black: { c: [14, 14, 16], spec: .1 },
};

// ---------- primitives (return face lists) ----------
function quad(a, b, c, d, mat) { return [{ p: [a, b, c, d], mat }]; }
function box(c, s, mat, R = null) {
  const [x, y, z] = c, [w, h, d] = s.map((v) => v / 2);
  let P = [[-w, -h, -d], [w, -h, -d], [w, h, -d], [-w, h, -d], [-w, -h, d], [w, -h, d], [w, h, d], [-w, h, d]];
  if (R) P = P.map((p) => mv(R, p));
  P = P.map((p) => [p[0] + x, p[1] + y, p[2] + z]);
  const F = [[0, 3, 2, 1], [4, 5, 6, 7], [0, 4, 7, 3], [1, 2, 6, 5], [3, 7, 6, 2], [0, 1, 5, 4]];
  return F.map((f) => ({ p: f.map((i) => P[i]), mat: Array.isArray(mat) ? mat[F.indexOf(f)] : mat }));
}
// frustum along an axis from base centre b, direction dir (unit), length h, radii r0 (base) -> r1 (top)
function cyl(b, dir, h, r0, r1, n, mat, caps = true) {
  dir = V.norm(dir);
  const up = Math.abs(dir[1]) < .9 ? [0, 1, 0] : [1, 0, 0], u = V.norm(V.cross(dir, up)), v = V.cross(dir, u);
  const ring = (c, r) => Array.from({ length: n }, (_, i) => { const a = i / n * Math.PI * 2; return V.add(c, V.add(V.mul(u, Math.cos(a) * r), V.mul(v, Math.sin(a) * r))); });
  const top = V.add(b, V.mul(dir, h)), A = ring(b, r0), B = ring(top, r1), out = [];
  for (let i = 0; i < n; i++) { const j = (i + 1) % n; out.push({ p: [A[i], A[j], B[j], B[i]], mat }); }
  if (caps) { if (r0 > 0) out.push({ p: [...A].reverse(), mat: caps === true ? mat : caps }); if (r1 > 0) out.push({ p: B, mat: caps === true ? mat : caps }); }
  return out;
}
function rod(a, b, r, mat) { return cyl(a, V.sub(b, a), Math.hypot(...V.sub(b, a)), r, r, 5, mat, false); }
// parabolic dish facing dir
function dish(c, dir, r, depth, mat) {
  dir = V.norm(dir);
  const up = Math.abs(dir[1]) < .9 ? [0, 1, 0] : [1, 0, 0], u = V.norm(V.cross(dir, up)), v = V.cross(dir, u), out = [], n = 16, rings = 3;
  const pt = (k, i) => { const rr = r * k / rings, a = i / n * Math.PI * 2, zz = depth * (k / rings) ** 2; return V.add(c, V.add(V.add(V.mul(u, Math.cos(a) * rr), V.mul(v, Math.sin(a) * rr)), V.mul(dir, zz))); };
  for (let k = 0; k < rings; k++) for (let i = 0; i < n; i++) out.push({ p: [pt(k, i), pt(k + 1, i), pt(k + 1, i + 1), pt(k, i + 1)], mat });
  return out;
}
// flat panel centred at c spanning vectors a (width) and b (height)
function panel(c, a, b, mat) {
  const ha = V.mul(a, .5), hb = V.mul(b, .5);
  return [{ p: [V.sub(V.sub(c, ha), hb), V.sub(V.add(c, ha), hb), V.add(V.add(c, ha), hb), V.add(V.sub(c, ha), hb)], mat: { ...mat, two: true } }];
}

// ---------- renderer ----------
// o: {R (matrix), pos [x,y,z] camera space (z forward), scale, f, cx, cy, light (camera space, toward light), amb, rim}
function render(ctx, faces, o) {
  const R = o.R ?? rot(), pos = o.pos, sc = o.scale ?? 1, f = o.f, cx = o.cx ?? 960, cy = o.cy ?? 540;
  const L = V.norm(o.light ?? [-.6, .4, -.6]), amb = o.amb ?? .08;
  const list = [];
  faces.forEach((fc, idx) => {
    const P = fc.p.map((p) => { const q = mv(R, p); return [q[0] * sc + pos[0], q[1] * sc + pos[1], q[2] * sc + pos[2]]; });
    if (P.some((p) => p[2] < .05)) return;
    let n = V.norm(V.cross(V.sub(P[1], P[0]), V.sub(P[2], P[0])));
    // our winding gives normals pointing outward for CCW-from-outside; camera at origin looking +z
    const cen = P.reduce((s, p) => V.add(s, p), [0, 0, 0]).map((v) => v / P.length);
    let facing = V.dot(n, cen) < 0;
    if (!facing) { if (!fc.mat.two) return; n = V.mul(n, -1); }
    const S = P.map((p) => [cx + f * p[0] / p[2], cy - f * p[1] / p[2]]);
    list.push({ S, P, n, z: cen[2], mat: fc.mat, idx, cen });
  });
  list.sort((a, b) => b.z - a.z);
  for (const F of list) {
    const m = F.mat, lam = Math.max(0, V.dot(F.n, L));
    const view = V.norm(V.mul(F.cen, -1)), refl = V.sub(V.mul(F.n, 2 * V.dot(F.n, L)), L);
    const sp = Math.pow(Math.max(0, V.dot(refl, view)), m.kind === 'solar' ? 30 : 14) * (m.spec ?? .3) * (lam > 0 ? 1 : 0);
    const rim = (o.rim ?? 0) * Math.pow(1 - Math.abs(V.dot(F.n, view)), 2);
    const k = amb + lam * (o.sun ?? 1.1);
    const col = m.emit ? m.c : m.c.map((c) => c * k + 255 * sp + (o.rimColor ?? [255, 200, 150])[0] * 0 + rim * 120);
    ctx.beginPath();
    F.S.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
    ctx.closePath();
    ctx.fillStyle = rgba(col.map((c) => clamp(c, 0, 255)));
    ctx.fill();
    if (m.kind === 'foil' && F.S.length === 4) {
      ctx.save(); ctx.clip();
      const r = (s) => hash(F.idx * 13.7 + s);
      for (let k2 = 0; k2 < 7; k2++) {
        const u1 = r(k2), v1 = r(k2 + .3), u2 = r(k2 + .6), v2 = r(k2 + .9), u3 = r(k2 + 1.2), v3 = r(k2 + 1.5);
        const bil = (u, v) => { const [a, b, c, d] = F.S; return [lerp(lerp(a[0], b[0], u), lerp(d[0], c[0], u), v), lerp(lerp(a[1], b[1], u), lerp(d[1], c[1], u), v)]; };
        const p1 = bil(u1, v1), p2 = bil(u2, v2), p3 = bil(u3, v3), br = (r(k2 + 2) - .45) * .5;
        ctx.fillStyle = br > 0 ? `rgba(255,240,200,${br * (.3 + sp)})` : `rgba(40,20,0,${-br * .6})`;
        ctx.beginPath(); ctx.moveTo(...p1); ctx.lineTo(...p2); ctx.lineTo(...p3); ctx.fill();
      }
      ctx.restore();
    }
    if (m.kind === 'solar' && F.S.length === 4) {
      const [a, b, c, d] = F.S, nu = m.nu ?? 6, nv = m.nv ?? 4;
      ctx.strokeStyle = `rgba(150,170,210,${.25 + sp * .5})`; ctx.lineWidth = .8;
      ctx.beginPath();
      for (let i = 1; i < nu; i++) { const t = i / nu; ctx.moveTo(lerp(a[0], b[0], t), lerp(a[1], b[1], t)); ctx.lineTo(lerp(d[0], c[0], t), lerp(d[1], c[1], t)); }
      for (let i = 1; i < nv; i++) { const t = i / nv; ctx.moveTo(lerp(a[0], d[0], t), lerp(a[1], d[1], t)); ctx.lineTo(lerp(b[0], c[0], t), lerp(b[1], c[1], t)); }
      ctx.stroke();
    }
    if (o.edges !== false) { ctx.strokeStyle = `rgba(0,0,0,${o.edgeA ?? .25})`; ctx.lineWidth = .7; ctx.stroke(); }
  }
  return list;
}
// project a model point with the same transform
function project(p, o) {
  const q = mv(o.R ?? rot(), p), sc = o.scale ?? 1;
  const x = q[0] * sc + o.pos[0], y = q[1] * sc + o.pos[1], z = q[2] * sc + o.pos[2];
  return [(o.cx ?? 960) + o.f * x / z, (o.cy ?? 540) - o.f * y / z, z];
}

// ---------- spacecraft ----------
function aryabhata() {
  // rhombicuboctahedron: 26 faces, as on India's first satellite
  const s = 1 + Math.SQRT2, verts = [];
  for (const a of [[1, 1, s], [1, s, 1], [s, 1, 1]]) for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) verts.push([a[0] * sx, a[1] * sy, a[2] * sz]);
  const normals = [];
  for (let i = 0; i < 3; i++) for (const sg of [-1, 1]) { const n = [0, 0, 0]; n[i] = sg; normals.push([n, 'sq']); }
  for (const [i, j] of [[0, 1], [0, 2], [1, 2]]) for (const a of [-1, 1]) for (const b of [-1, 1]) { const n = [0, 0, 0]; n[i] = a; n[j] = b; normals.push([V.norm(n), 'sq']); }
  for (const a of [-1, 1]) for (const b of [-1, 1]) for (const c of [-1, 1]) normals.push([V.norm([a, b, c]), 'tri']);
  const faces = [];
  for (const [n, kind] of normals) {
    const ds = verts.map((v) => V.dot(v, n)), mx = Math.max(...ds);
    const pts = verts.filter((v, i) => ds[i] > mx - 1e-6);
    const c = pts.reduce((s, p) => V.add(s, p), [0, 0, 0]).map((v) => v / pts.length);
    const u = V.norm(V.sub(pts[0], c)), w = V.cross(n, u);
    pts.sort((p, q) => Math.atan2(V.dot(V.sub(p, c), w), V.dot(V.sub(p, c), u)) - Math.atan2(V.dot(V.sub(q, c), w), V.dot(V.sub(q, c), u)));
    const isTop = Math.abs(n[1]) > .99;
    faces.push({ p: pts.map((p) => V.mul(p, .29)), mat: kind === 'tri' || isTop ? MAT.silver : { ...MAT.solar, nu: 5, nv: 5 } });
  }
  faces.push(...rod([0, .7, 0], [0, 1.25, 0], .02, MAT.silver), ...rod([.2, .6, .2], [.55, 1.05, .55], .012, MAT.silver), ...rod([-.2, .6, -.2], [-.55, 1.05, -.55], .012, MAT.silver));
  return faces;
}
// orbiter bus with one big wing and a dish (Mangalyaan / Chandrayaan orbiters)
function orbiter(o = {}) {
  const f = [];
  f.push(...box([0, 0, 0], [1.5, 1.5, 1.5], MAT.foil));
  f.push(...rod([.75, 0, 0], [1.2, 0, 0], .04, MAT.grey));
  const segs = o.segs ?? 3;
  for (let i = 0; i < segs; i++) f.push(...panel([1.2 + .7 + i * 1.32, 0, 0], [1.28, 0, 0], [0, 0, 1.8], { ...MAT.solar, nu: 5, nv: 6 }));
  f.push(...cyl([0, .75, 0], [0, 1, 0], .25, .08, .08, 6, MAT.grey));
  f.push(...dish([0, 1.0, 0], [0, 1, 0], o.dish ?? 1.1, .32, MAT.dish));
  f.push(...cyl([0, -.75, 0], [0, -1, 0], .35, .12, .22, 10, MAT.dark));
  return f;
}
function lander() { // Vikram
  const f = [];
  f.push(...box([0, 0, 0], [2, 1.15, 2], MAT.foil));
  f.push(...box([0, .72, 0], [1.4, .3, 1.4], MAT.silver));
  f.push(...panel([0, .1, 1.01], [1.7, 0, 0], [0, .9, 0], { ...MAT.solar, nu: 6, nv: 3 }));
  f.push(...panel([1.01, .1, 0], [0, 0, 1.4], [0, .9, 0], { ...MAT.solar, nu: 5, nv: 3 }));
  for (const [sx, sz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
    const top = [sx * .9, -.2, sz * .9], foot = [sx * 1.45, -1.25, sz * 1.45];
    f.push(...rod(top, foot, .06, MAT.silver), ...rod([sx * .9, -.55, sz * .4], foot, .035, MAT.silver));
    f.push(...cyl(V.add(foot, [0, -.05, 0]), [0, 1, 0], .08, .3, .3, 10, MAT.silver));
  }
  for (const [x, z] of [[0, 0], [.55, .55], [-.55, .55], [.55, -.55], [-.55, -.55]]) f.push(...cyl([x, -.58, z], [0, -1, 0], .25, .1, .17, 8, MAT.dark));
  f.push(...rod([.5, .88, -.4], [.5, 1.4, -.4], .025, MAT.grey), ...dish([.5, 1.4, -.4], [.3, 1, .3], .3, .08, MAT.dish));
  return f;
}
function rover() { // Pragyan
  const f = [];
  f.push(...box([0, .45, 0], [.9, .35, .75], MAT.foil));
  f.push(...panel([0, .78, -.15], [.95, 0, 0], [0, .3, .62], { ...MAT.solar, nu: 6, nv: 3 }));
  f.push(...rod([.3, .62, .3], [.3, 1.05, .3], .025, MAT.silver), ...box([.3, 1.08, .32], [.22, .09, .1], MAT.grey));
  for (const x of [-.52, .52]) for (const z of [-.3, 0, .3]) {
    f.push(...cyl([x - (x > 0 ? .05 : -.05), .2, z], [x > 0 ? 1 : -1, 0, 0], .1, .17, .17, 12, MAT.silver));
    f.push(...rod([x * .85, .38, z], [x, .22, z], .02, MAT.grey));
  }
  return f;
}
function propModule(withLander = true) { // Ch-3 propulsion module with lander stacked on top
  const f = [];
  f.push(...cyl([0, -1, 0], [0, 1, 0], 2, .9, .9, 14, MAT.foil));
  f.push(...rod([.9, 0, 0], [1.3, 0, 0], .04, MAT.grey));
  f.push(...panel([2.9, 0, 0], [3.2, 0, 0], [0, 0, 1.7], { ...MAT.solar, nu: 10, nv: 5 }));
  if (withLander) f.push(...lander().map((fc) => ({ ...fc, p: fc.p.map((p) => V.add(V.mul(p, .85), [0, 2.2, 0])) })));
  return f;
}
function aditya() {
  const f = [];
  f.push(...box([0, 0, 0], [1.6, 1.6, 1.6], MAT.foil));
  for (const s of [-1, 1]) f.push(...rod([s * .8, 0, 0], [s * 1.2, 0, 0], .04, MAT.grey), ...panel([s * 2.4, 0, 0], [2.2, 0, 0], [0, 0, 1.5], { ...MAT.solar, nu: 7, nv: 5 }));
  f.push(...cyl([0, .8, 0], [0, 1, 0], 1.1, .45, .4, 14, MAT.white));
  f.push(...cyl([0, 1.9, 0], [0, 1, 0], .05, .4, .4, 14, MAT.black));
  return f;
}
function gaganyaan() {
  const f = [];
  f.push(...cyl([0, -2.8, 0], [0, 1, 0], 2.8, 1.75, 1.75, 20, MAT.silver));
  f.push(...cyl([0, 0, 0], [0, 1, 0], 2.4, 1.75, .75, 20, MAT.white));
  f.push(...cyl([0, 2.4, 0], [0, 1, 0], .4, .75, .55, 14, MAT.grey));
  for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + .4, d = [Math.cos(a), 0, Math.sin(a)]; f.push(...panel(V.add(V.mul(d, 3.3), [0, -1.5, 0]), V.mul(d, 3), [0, 1.6, 0], { ...MAT.solar, nu: 6, nv: 3 })); }
  f.push(...cyl([0, -2.8, 0], [0, -1, 0], .7, .35, .65, 12, MAT.dark));
  return f;
}
function ps4() { // PSLV fourth stage + payload adapter
  const f = [];
  f.push(...cyl([0, -1.4, 0], [0, 1, 0], 2.4, 1.35, 1.35, 24, MAT.silver, MAT.grey));
  f.push(...cyl([0, 1, 0], [0, 1, 0], .6, 1.35, .9, 24, MAT.white));
  f.push(...cyl([0, -1.4, 0], [0, -1, 0], .9, .35, .75, 12, MAT.dark));
  return f;
}
function cubesat(seed) {
  const s = [.1, .34, .1], f = box([0, 0, 0], s, hash(seed) > .5 ? MAT.silver : MAT.foil);
  if (hash(seed + 1) > .3) for (const sg of [-1, 1]) f.push(...panel([sg * .2, 0, 0], [.3, 0, 0], [0, .3, 0], { ...MAT.solar, nu: 2, nv: 3 }));
  return f;
}

module.exports = { V, rot, mv, MAT, box, cyl, rod, dish, panel, render, project, aryabhata, orbiter, lander, rover, propModule, aditya, gaganyaan, ps4, cubesat };
