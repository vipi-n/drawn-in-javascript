// One continuous amphibian rig, side view, facing right (flip:-1 faces left, showing the LEFT side + spiracle).
// Local units: snout-vent length = 200.  tad = 0 adult frog ... 1 tadpole; hatch blends the tadpole towards a
// newly hatched larva (yolk belly, external gills). Metamorphosis is a real morph: outlines are resampled and blended.
// Poses blend absolute joint angles (sit / crouch / leap / swim kick / float / hang). Extras: buccal pumping, calling
// sac, blink with eye retraction, jaw + projectile tongue (hinged at the front), nuptial pads, plump female, glass
// (see-through organs), operculum growing over the gills, legs budding, front legs bulging then popping out.
const { TAU, clamp, lerp, hash, rng, rgba, mix, shade, ss } = require('./core');
const G = require('./gfx');

const COMMON = { top: '#7e8f3c', side: '#a3994e', belly: '#efe0b0', dark: '#3a3216', spot: '#4a3a18', mask: '#4b2f1a', line: '#2a2410', fold: '#e9d68a', eye: '#d9a441', leg: '#8c8a43', throat: '#f4ecd2' };
const TADPAL = { top: '#3a3220', side: '#5b4c2a', belly: '#9a8650', dark: '#1d170b', spot: '#2a2010', mask: '#3a2a14', line: '#17120a', fold: '#c8b070', eye: '#c89a40', leg: '#6a5f34', throat: '#a89a68' };
const HATCHPAL = { top: '#2a2318', side: '#3c3222', belly: '#d6caa6', dark: '#120e08', spot: '#1a140c', mask: '#2a2216', line: '#120d08', fold: '#8a7a58', eye: '#5a4a30', leg: '#4a4230', throat: '#cfc2a0' };
const blendPal = (a, b, k) => { const o = {}; for (const key in a) o[key] = mix(a[key], b[key], k); return o; };

// absolute segment angles in the body frame (0 = towards the snout, + = clockwise/down): hip [thigh, shank, tarsus, foot],
// arm [upper, fore, hand]
const POSES = {
  sit: { pitch: -.42, hip: [.87, 3.55, .42, .47], arm: [2.17, 1.87, .52], toes: .5 },
  crouch: { pitch: -.2, hip: [.72, 3.6, .25, .22], arm: [2.45, 1.4, .25], toes: .5 },
  leap: { pitch: -.32, hip: [3.0, 3.1, 3.15, 3.2], arm: [.62, .67, .72], toes: .25 },
  swimOut: { pitch: 0, hip: [3.05, 3.12, 3.14, 3.16], arm: [2.8, 3.05, 3.1], toes: 1 },
  swimIn: { pitch: 0, hip: [.9, 3.5, 3.1, 3.1], arm: [2.7, 3.0, 3.1], toes: .1 },
  float: { pitch: -.12, hip: [2.4, 1.0, 2.6, 2.8], arm: [1.1, .9, .7], toes: .8 },
  hang: { pitch: -.05, hip: [2.2, 1.2, 2.4, 2.6], arm: [1.5, 1.3, 1.2], toes: .7 },
  tad: { pitch: 0, hip: [2.55, 3.0, 3.25, 3.3], arm: [1.9, .9, .6], toes: .45 },
};
function blendPose(w) {
  const out = { pitch: 0, hip: [0, 0, 0, 0], arm: [0, 0, 0], toes: 0 };
  let tot = 0;
  for (const k in w) if (POSES[k] && w[k] > 0) tot += w[k];
  if (tot <= 0) return { ...POSES.sit, hip: POSES.sit.hip.slice(), arm: POSES.sit.arm.slice() };
  for (const k in w) {
    const p = POSES[k], a = w[k] / tot;
    if (!p || w[k] <= 0) continue;
    out.pitch += p.pitch * a; out.toes += p.toes * a;
    for (let i = 0; i < 4; i++) out.hip[i] += p.hip[i] * a;
    for (let i = 0; i < 3; i++) out.arm[i] += p.arm[i] * a;
  }
  return out;
}
function chain(x, y, A, L) {
  const P = [[x, y]];
  for (let i = 0; i < A.length; i++) { const p = P[i]; P.push([p[0] + Math.cos(A[i]) * L[i], p[1] + Math.sin(A[i]) * L[i]]); }
  return P;
}
// lowest point of feet/hands below the origin (unscaled) for a pose, to stand frogs on a surface
function groundY(w, extraPitch = 0) {
  const P = w.hip ? w : blendPose(w), pitch = P.pitch + extraPitch, c = Math.cos(pitch), s = Math.sin(pitch);
  const tw = ([x, y]) => x * s + y * c;
  const hp = chain(-62, 2, P.hip, [72, 74, 40, 30]), ap = chain(36, 20, P.arm, [24, 26, 12]);
  return Math.max(...hp.slice(2).map(tw), ...ap.slice(2).map(tw)) + 4;
}

// ---------------------------------------------------------------- outlines (closed, clockwise from the snout tip)
function frogOutline(o) {
  const thr = (o.throat ?? 0) * 3 + (o.sac ?? 0) * 6, pl = (o.plump ?? 0) * 10, st = (o.stretch ?? 0), yg = o.young ?? 0, br = (o.breath ?? 0) * 3.2;
  const k = 1 + st * .12, hd = 1 + yg * .12;
  return [
    [100 * k, 4], [92 * k, -9 * hd], [70 * k, -19 * hd], [42 * k, -24 * hd], [10 * k, -27 - br * .15], [-25 * k, -31 - pl * .2 - br * .35], [-55 * k, -36 + st * 10 - br * .25],
    [-86 * k, -23 + st * 6], [-101 * k, -3], [-86 * k, 19 + pl * .6 + br * .5], [-42 * k, 32 + pl + br], [8 * k, 33 + pl * .6 + br * .7], [52 * k, 25 + thr], [84 * k, 14 + thr * .4],
  ];
}
const TAD_OUT = [[100, 12], [92, -22], [60, -52], [12, -64], [-40, -58], [-84, -30], [-96, -4], [-86, 22], [-52, 54], [8, 62], [62, 46], [92, 30]];
const HATCH_OUT = [[100, 2], [86, -26], [40, -42], [-20, -40], [-70, -28], [-96, -6], [-90, 18], [-56, 50], [6, 60], [62, 40], [92, 20]];
const N_OUT = 72;
const RS = new Map();
function rs(P, key) { if (key && RS.has(key)) return RS.get(key); const r = G.resample(G.dense(P, true, 10), N_OUT, true); if (key) RS.set(key, r); return r; }
function outline(o) {
  const tad = o.tad ?? 0, hatch = o.hatch ?? 0;
  if (tad <= 0) return frogOutline(o);
  const F = rs(frogOutline(o)), T = rs(TAD_OUT, 'tad'), Hh = rs(HATCH_OUT, 'hatch');
  const wF = 1 - tad, wT = tad * (1 - hatch), wH = tad * hatch, out = [];
  for (let i = 0; i < N_OUT; i++) out.push([F[i][0] * wF + T[i][0] * wT + Hh[i][0] * wH, F[i][1] * wF + T[i][1] * wT + Hh[i][1] * wH]);
  return out;
}

// ---------------------------------------------------------------- limbs
function seg(g, ax, ay, ra, bx, by, rb, bulge = 0) {
  const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, nx = -uy, ny = ux;
  const mx = (ax + bx) / 2, my = (ay + by) / 2, rm = (ra + rb) / 2;
  g.beginPath();
  g.moveTo(ax + nx * ra, ay + ny * ra);
  g.quadraticCurveTo(mx + nx * (rm + bulge * 1.4), my + ny * (rm + bulge * 1.4), bx + nx * rb, by + ny * rb);
  const a1 = Math.atan2(ny, nx);
  g.arc(bx, by, rb, a1, a1 - Math.PI, true);
  g.quadraticCurveTo(mx - nx * (rm + bulge * .5), my - ny * (rm + bulge * .5), ax - nx * ra, ay - ny * ra);
  g.arc(ax, ay, ra, a1 + Math.PI, a1, true);
  g.closePath();
}
function shadeSeg(g, ax, ay, bx, by, w, c, far) {
  const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L, mx = (ax + bx) / 2, my = (ay + by) / 2, top = ny < 0 ? 1 : -1;
  return G.lin(g, mx + nx * w * top, my + ny * w * top, mx - nx * w * top, my - ny * w * top, [[0, shade(c, far ? -.15 : .22)], [.55, shade(c, far ? -.3 : 0)], [1, shade(c, far ? -.55 : -.38)]]);
}
function bars(g, ax, ay, bx, by, w, n, col) {
  const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
  g.fillStyle = col;
  for (let i = 0; i < n; i++) {
    const u = (i + .6) / (n + .3), cx = ax + dx * u, cy = ay + dy * u, bw = L / n * .38;
    g.beginPath();
    g.moveTo(cx - dx / L * bw + nx * w, cy - dy / L * bw + ny * w); g.lineTo(cx + dx / L * bw + nx * w, cy + dy / L * bw + ny * w);
    g.lineTo(cx + dx / L * bw * .6 - nx * w, cy + dy / L * bw * .6 - ny * w); g.lineTo(cx - dx / L * bw * 1.3 - nx * w, cy - dy / L * bw * 1.3 - ny * w); g.closePath(); g.fill();
  }
}
function hindLeg(g, hx, hy, A, o, far) {
  const pal = o.pal, s = o.legScale ?? 1, L = [72 * s, 74 * s, 40 * s, 30 * s];
  const P = chain(hx, hy, A, L);
  const c = far ? shade(pal.leg, -.25) : pal.leg, line = pal.line, lw = o.lw;
  const r0 = 20 * s, r1 = 8 * s, r2 = 5.5 * s, r3 = 4.5 * s;
  const [ax, ay] = P[3], fa = A[3], spread = .1 + (o.toes ?? .5) * .55;
  const toes = [-1.6, -.8, 0, .8, 1.3].map((k, i) => { const a = fa + k * spread * .5, Lt = (i === 3 ? 50 : i === 2 ? 42 : i === 4 ? 34 : i === 1 ? 32 : 24) * s; return [ax + Math.cos(a) * Lt, ay + Math.sin(a) * Lt]; });
  g.fillStyle = rgba(far ? shade(pal.leg, -.35) : shade(pal.leg, .15), .5);
  g.beginPath(); g.moveTo(ax, ay); g.lineTo(toes[0][0], toes[0][1]);
  for (let i = 0; i < 4; i++) { const p = toes[i], q = toes[i + 1]; g.quadraticCurveTo((p[0] + q[0]) / 2 + (ax - (p[0] + q[0]) / 2) * .35, (p[1] + q[1]) / 2 + (ay - (p[1] + q[1]) / 2) * .35, q[0], q[1]); }
  g.closePath(); g.fill();
  for (const [tx, ty] of toes) {
    g.strokeStyle = line; g.lineCap = 'round'; g.lineWidth = 4.4 * s + lw; g.beginPath(); g.moveTo(ax, ay); g.lineTo(tx, ty); g.stroke();
    g.strokeStyle = c; g.lineWidth = Math.max(.5, 4.4 * s - lw * .3); g.beginPath(); g.moveTo(ax, ay); g.lineTo(tx, ty); g.stroke();
    g.fillStyle = shade(c, .2); G.circle(g, tx, ty, 2.6 * s); g.fill();
  }
  const parts = [[P[2], P[3], r2, r3, 0], [P[1], P[2], r1, r2, 3 * s], [P[0], P[1], r0, r1, 6 * s]];
  for (const [a, b, ra, rb, bu] of parts) {
    seg(g, a[0], a[1], ra, b[0], b[1], rb, bu);
    g.fillStyle = shadeSeg(g, a[0], a[1], b[0], b[1], Math.max(ra, rb), c, far); g.fill();
    g.save(); g.clip(); bars(g, a[0], a[1], b[0], b[1], Math.max(ra, rb) * 1.6, 3, rgba(pal.dark, (far ? .35 : .5) * (o.barK ?? 1))); g.restore();
    seg(g, a[0], a[1], ra, b[0], b[1], rb, bu);
    g.strokeStyle = line; g.lineWidth = lw; g.stroke();
  }
  return P;
}
function frontLeg(g, sx, sy, A, o, far) {
  const pal = o.pal, s = o.armScale ?? 1, L = [24 * s, 26 * s, 12 * s];
  const P = chain(sx, sy, A, L);
  const c = far ? shade(pal.leg, -.25) : shade(pal.leg, .08), line = pal.line, lw = o.lw;
  const [hx, hy] = P[2], ha = A[2];
  [-.5, -.15, .2, .55].forEach((k, i) => {
    const a = ha + k, Lf = (i === 1 || i === 2 ? 17 : 13) * s, tx = hx + Math.cos(a) * Lf, ty = hy + Math.sin(a) * Lf;
    g.strokeStyle = line; g.lineCap = 'round'; g.lineWidth = 4 * s + lw; g.beginPath(); g.moveTo(hx, hy); g.lineTo(tx, ty); g.stroke();
    g.strokeStyle = c; g.lineWidth = Math.max(.5, 4 * s - lw * .3); g.beginPath(); g.moveTo(hx, hy); g.lineTo(tx, ty); g.stroke();
    g.fillStyle = shade(c, .25); G.circle(g, tx, ty, 2.3 * s); g.fill();
    if (i === 0 && o.male && !far) { g.fillStyle = rgba('#2a1d10', .9); G.circle(g, hx + Math.cos(a) * 6 * s, hy + Math.sin(a) * 6 * s, 3.8 * s); g.fill(); }
  });
  const parts = [[P[1], P[2], 5.5 * s, 4 * s, 1 * s], [P[0], P[1], 8 * s, 5.5 * s, 2 * s]];
  for (const [a, b, ra, rb, bu] of parts) {
    seg(g, a[0], a[1], ra, b[0], b[1], rb, bu);
    g.fillStyle = shadeSeg(g, a[0], a[1], b[0], b[1], ra, c, far); g.fill();
    g.strokeStyle = line; g.lineWidth = lw; g.stroke();
  }
  return P;
}

const SPOTS = new Map();
function spots(seed) {
  if (SPOTS.has(seed)) return SPOTS.get(seed);
  const r = rng(seed), out = [];
  for (let i = 0; i < 26; i++) {
    const x = -95 + r() * 175, y = -36 + r() * 46, rr = 3 + r() * 8;
    if (x > 60 && y < -15) continue;
    const pts = [];
    for (let k = 0; k < 7; k++) { const a = k / 7 * TAU, q = rr * (.7 + r() * .6); pts.push([x + Math.cos(a) * q * 1.25, y + Math.sin(a) * q * .8]); }
    out.push(pts);
  }
  SPOTS.set(seed, out);
  return out;
}

// ---------------------------------------------------------------- tadpole tail
// spine from the body junction backwards; fins wrap a tapering muscle; travelling-wave undulation
function tail(g, o, pal, lw) {
  const tad = o.tad ?? 0, len = (o.tailLen ?? 1) * (o.hatch ? lerp(1, .8, o.hatch) : 1), t = o.t ?? 0;
  if (len < .01) return;
  const L = 330 * len, amp = (o.swim ?? .4) * 34, fr = o.freq ?? 2.2, n = 16, P = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n, y = Math.sin(TAU * fr * t - u * 5.2 + (o.ph ?? 0)) * amp * Math.pow(u, 1.4) * Math.sqrt(len) + (o.curl ?? 0) * u * u * 80;
    P.push([-80 - L * u, -2 + y]);
  }
  const fin = Math.pow(len, 1.4) * (o.hatch ? lerp(1, .5, o.hatch) : 1);
  const mus = (u) => lerp(26, 1.5, Math.pow(u, .85)) * Math.sqrt(Math.max(.05, len));
  const topF = (u) => mus(u) + fin * 31 * Math.sin(Math.PI * Math.min(1, u * 1.05 + .02)) * (u < .08 ? u / .08 : 1);
  const botF = (u) => mus(u) + fin * 24 * Math.sin(Math.PI * Math.min(1, u * 1.08 + .04)) * (u < .12 ? u / .12 : 1);
  const nrm = P.map((p, i) => { const a = P[Math.max(0, i - 1)], b = P[Math.min(n, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1; return [-dy / d, dx / d]; });
  // nrm points "down" when the tail runs to -x; top side = minus normal
  const finPts = [];
  for (let i = 0; i <= n; i++) { const u = i / n; finPts.push([P[i][0] - nrm[i][0] * topF(u), P[i][1] - nrm[i][1] * topF(u)]); }
  for (let i = n; i >= 0; i--) { const u = i / n; finPts.push([P[i][0] + nrm[i][0] * botF(u), P[i][1] + nrm[i][1] * botF(u)]); }
  g.save();
  g.fillStyle = G.lin(g, P[0][0], 0, P[n][0], 0, [[0, o.finCol ?? '#d8cfa0', .66 * tad + .22], [1, o.finCol ?? '#d8cfa0', .34 * tad + .12]]);
  G.blob(g, finPts, .8); g.fill();
  // fin speckles
  g.save(); G.blob(g, finPts, .8); g.clip();
  g.fillStyle = rgba(pal.dark, .25);
  for (let i = 0; i < 40; i++) { const u = hash(i + 3), q = P[Math.round(u * n)], nn = nrm[Math.round(u * n)], d = (hash(i + 9) - .5) * 2 * topF(u); G.circle(g, q[0] + nn[0] * d, q[1] + nn[1] * d, 1 + hash(i) * 1.8); g.fill(); }
  g.restore();
  g.strokeStyle = rgba(pal.line, .45); g.lineWidth = lw * .6; G.blob(g, finPts, .8); g.stroke();
  // muscle
  const mpts = [];
  for (let i = 0; i <= n; i++) { const u = i / n; mpts.push([P[i][0] - nrm[i][0] * mus(u), P[i][1] - nrm[i][1] * mus(u)]); }
  for (let i = n; i >= 0; i--) { const u = i / n; mpts.push([P[i][0] + nrm[i][0] * mus(u) * .8, P[i][1] + nrm[i][1] * mus(u) * .8]); }
  g.fillStyle = G.lin(g, 0, -30, 0, 30, [[0, pal.top], [.6, pal.side], [1, mix(pal.side, pal.belly, .5)]]);
  G.blob(g, mpts, .9); g.fill();
  // myomere chevrons
  g.save(); G.blob(g, mpts, .9); g.clip();
  g.strokeStyle = rgba(pal.dark, .35); g.lineWidth = 1.4;
  for (let i = 1; i < n; i++) { const q = P[i], nn = nrm[i], w = mus(i / n); g.beginPath(); g.moveTo(q[0] - nn[0] * w, q[1] - nn[1] * w); g.lineTo(q[0] + 6, q[1]); g.lineTo(q[0] + nn[0] * w, q[1] + nn[1] * w); g.stroke(); }
  g.restore();
  g.strokeStyle = pal.line; g.lineWidth = lw * .8; G.blob(g, mpts, .9); g.stroke();
  g.restore();
}

// ---------------------------------------------------------------- the rig
function frog(g, o) {
  const tad = clamp(o.tad ?? 0), hatch = clamp(o.hatch ?? 0);
  const basePal = { ...COMMON, ...(o.pal || {}) }, tp = o.tadPal ? { ...TADPAL, ...o.tadPal } : TADPAL;
  const pal = tad > 0 ? blendPal(basePal, hatch > 0 ? blendPal(tp, HATCHPAL, hatch) : tp, tad) : basePal;
  const s = o.s ?? 1, seed = o.seed ?? 7, side = (o.flip ?? 1) < 0 ? 'left' : 'right', t = o.t ?? 0;
  const P = o.joints ?? blendPose(o.pose ?? (tad > .5 ? { tad: 1 } : { sit: 1 }));
  const pitch = P.pitch + (o.pitch ?? 0);
  const legs = o.legs ?? (1 - tad), arms = o.arms ?? (tad > 0 ? 1 - tad : 1);
  const oo = { ...o, pal, lw: (o.lw ?? 2.2), toes: o.toes ?? P.toes, legScale: (o.legScale ?? 1) * Math.min(1, legs * 1.1) * lerp(1, .72, tad), armScale: lerp(.55, 1, ss(.5, 1, arms)), barK: 1 - tad * .7 };
  const adult = 1 - tad;
  g.save();
  g.translate(o.x ?? 0, o.y ?? 0);
  g.scale(s * (o.flip ?? 1), s);
  g.rotate(pitch);
  if (o.alpha !== undefined) g.globalAlpha *= o.alpha;
  const hip = [lerp(-62, -74, tad), lerp(2, 26, tad)];
  const sh = [lerp(36, 22, tad), lerp(20, 40, tad)];
  const hipA = o.hip ?? P.hip, armA = o.arm ?? P.arm;
  const showLegs = !o.noLegs && legs > .22, armsOut = !o.noLegs && arms > .55;
  // far limbs
  g.save(); g.translate(-6, -5);
  if (showLegs) hindLeg(g, hip[0], hip[1], hipA.map((a, i) => a + (i === 0 ? -.08 : 0)), oo, true);
  if (armsOut) frontLeg(g, sh[0] - 4, sh[1], armA.map((a, i) => a + (i === 0 ? .1 : 0)), oo, true);
  g.restore();
  // tadpole tail / froglet stub
  if (tad > 0 && (o.tailLen ?? 1) > .01) tail(g, { ...o, tad }, pal, oo.lw);
  else if ((o.tail ?? 0) > .01) tail(g, { ...o, tad: .6, tailLen: o.tail, swim: o.swim ?? .15 }, pal, oo.lw);
  // body
  const B = outline(o), glass = o.glass ?? 0;
  g.save();
  G.blob(g, B);
  g.fillStyle = G.lin(g, 0, lerp(-40, -64, tad), 0, lerp(36, 62, tad), [[0, pal.top], [.45, pal.side], [.78, mix(pal.side, pal.belly, .6)], [1, pal.belly]]);
  g.globalAlpha *= 1 - glass * .78;
  g.fill();
  g.save(); G.blob(g, B); g.clip();
  if (adult > .02) {
    g.fillStyle = rgba(pal.spot, .55 * adult);
    for (const sp of spots(seed)) { G.blob(g, sp); g.fill(); }
    g.fillStyle = G.lin(g, 84, -10, 14, 0, [[0, pal.mask, 0], [.22, pal.mask, .85 * adult], [.8, pal.mask, .8 * adult], [1, pal.mask, .0]]);
    G.blob(g, [[78, -10], [60, -17], [30, -17], [14, -6], [18, 7], [40, 5], [62, 0]]); g.fill();
    g.fillStyle = G.rad(g, 62, 28, 40, [[0, o.male ? '#cfd6dc' : pal.throat, .8 * adult], [1, pal.throat, 0]]);
    g.fillRect(20, 0, 90, 50);
  }
  // granules / gold flecks
  g.fillStyle = rgba(tad > .5 ? '#f0c860' : '#fff6c8', tad > .5 ? .55 : .16);
  for (let i = 0; i < 70; i++) { const gx = -98 + hash(seed * 11 + i) * 190, gy = lerp(-38, -62, tad) + hash(seed * 13 + i) * lerp(40, 90, tad); G.circle(g, gx, gy, .8 + hash(i + seed) * lerp(1.6, 1.2, tad)); g.fill(); }
  // tadpole belly: iridescent bronze + coiled gut showing through
  if (tad > .02) {
    const gutA = tad * (1 - hatch * .8);
    g.fillStyle = G.rad(g, -6, 40, 70, [[0, '#e9cf8a', .35 * gutA], [1, '#e9cf8a', 0]]); g.fillRect(-90, -10, 180, 90);
    g.lineCap = 'round';
    // double spiral: the long larval gut winds in, then back out beside itself (a tube seen through the belly skin)
    for (const [r0, a0, lw2, col, al] of [[30, 0, 4.2, '#3a2c14', .2], [24, .55, 4.2, '#3a2c14', .2], [30, 0, 1.4, '#f0d8a0', .22], [24, .55, 1.4, '#f0d8a0', .22]]) {
      g.strokeStyle = rgba(col, al * gutA); g.lineWidth = lw2;
      g.beginPath();
      for (let i = 0; i <= 140; i++) { const u = i / 140, ang = a0 + u * 2.6 * TAU, r = r0 * (1 - u * .78) + Math.sin(u * 37) * 1.1; const x = -18 + Math.cos(ang) * r * 1.45, y = 38 + Math.sin(ang) * r * .5; i ? g.lineTo(x, y) : g.moveTo(x, y); }
      g.stroke();
    }
    if (hatch > .02 && (o.yolk ?? 1) > 0) {
      const yk = hatch * (o.yolk ?? 1);
      g.fillStyle = G.rad(g, -10, 34, 66, [[0, '#efe2bc', .95 * yk], [.7, '#d8c8a0', .8 * yk], [1, '#d8c8a0', 0]]); g.fillRect(-100, -10, 200, 90);
      g.fillStyle = rgba('#c8b48a', .5 * yk);
      for (let i = 0; i < 40; i++) { G.circle(g, -70 + hash(i + 300) * 130, 16 + hash(i + 400) * 40, 2 + hash(i + 500) * 3); g.fill(); }
    }
  }
  // form shading + wet sheen + rim light
  g.fillStyle = G.lin(g, 0, -10, 0, lerp(40, 66, tad), [[0, '#000000', 0], [.7, '#000000', 0], [1, '#1a1206', .3]]);
  g.fillRect(-110, -70, 220, 140);
  g.globalCompositeOperation = 'screen';
  g.fillStyle = G.lin(g, 0, lerp(-40, -64, tad), 0, lerp(-10, -20, tad), [[0, '#fffbe0', .28 * (o.wet ?? 1)], [1, '#fffbe0', 0]]);
  g.fillRect(-110, -70, 220, 60);
  G.blob(g, B); g.lineWidth = 9; g.strokeStyle = G.lin(g, 0, lerp(-40, -64, tad), 0, 0, [[0, o.rim ?? '#fff3c0', .5], [1, o.rim ?? '#fff3c0', 0]]); g.stroke();
  g.globalCompositeOperation = 'source-over';
  if ((o.drops ?? 0) > .01 && adult > .3) skinDrops(g, o, pal, seed, t, o.drops * adult);
  g.restore();
  if (adult > .05) {
    g.strokeStyle = rgba(pal.fold, .65 * adult); g.lineWidth = 2.4; g.lineCap = 'round';
    g.beginPath(); g.moveTo(52, -20); g.bezierCurveTo(20, -24, -20, -27, -54, -30 + (o.stretch ?? 0) * 8); g.stroke();
  }
  g.fillStyle = rgba('#ffffff', .55 * (o.wet ?? 1));
  G.ellipse(g, -20, lerp(-27, -56, tad), 12, 2.4, -.08); g.fill(); G.ellipse(g, 18, lerp(-23, -58, tad), 7, 1.8, -.05); g.fill();
  g.globalAlpha = (o.alpha ?? 1);
  G.blob(g, B); g.strokeStyle = pal.line; g.lineWidth = oo.lw; g.lineJoin = 'round'; g.stroke();
  g.restore();
  if (glass > .01) organs(g, glass, o);
  // tadpole: external gills, operculum, spiracle, adhesive gland, oral disc
  if (tad > .02) larvalBits(g, o, pal, oo.lw, side, arms);
  // adult head details
  if (adult > .05) {
    g.save(); g.globalAlpha *= ss(0, .6, adult);
    g.fillStyle = G.rad(g, 35, -6, 10, [[0, shade(pal.mask, .3)], [.75, shade(pal.mask, .1)], [1, shade(pal.mask, -.35)]]);
    G.circle(g, 35, -6, 8.5 * adult); g.fill(); g.strokeStyle = rgba(shade(pal.mask, .45), .6); g.lineWidth = 1.4; g.stroke();
    g.restore();
  }
  if ((o.sac ?? 0) > .02) {
    const k = o.sac, rx = 20 + 16 * k, ry = 8 + 20 * k, cx = 64 - 6 * k, cy = 22 + 12 * k;
    g.fillStyle = G.rad(g, cx - rx * .3, cy - ry * .3, Math.max(rx, ry) * 1.2, [[0, '#ffffff', .9], [.55, o.male ? '#dfe4e2' : '#f6efd8', .85], [1, '#b8b49a', .8]]);
    G.ellipse(g, cx, cy, rx, ry); g.fill(); g.strokeStyle = pal.line; g.lineWidth = oo.lw * .9; g.stroke();
    g.fillStyle = 'rgba(255,255,255,.7)'; G.ellipse(g, cx - rx * .35, cy - ry * .45, rx * .3, ry * .18, -.3); g.fill();
  }
  mouth(g, o, pal, oo.lw, tad);
  g.fillStyle = pal.line; G.ellipse(g, lerp(90, 86, tad), lerp(-7, -16, tad), 2.4, 1.6, -.4); g.fill();
  eye(g, lerp(66, 56, tad), lerp(-24, -22, tad) + (o.eyeIn ?? 0) * 8, lerp(15 * (1 + (o.young ?? 0) * .22), hatch > 0 ? 9 : 12, tad), o, pal, adult);
  // near limbs; tadpole front legs bulge under the skin before they pop
  if (showLegs) hindLeg(g, hip[0], hip[1], hipA, oo, false);
  else if (!o.noLegs && legs > .02 && tad > 0) bud(g, hip[0] + 6, hip[1] + 8, legs / .22, pal, oo.lw);
  if (armsOut) {
    const pop = ss(.55, .75, arms);
    g.save(); g.translate(sh[0], sh[1]); g.scale(pop, pop); g.translate(-sh[0], -sh[1]);
    frontLeg(g, sh[0], sh[1], armA, oo, false);
    g.restore();
  } else if (tad > 0 && arms > .15) {
    const k = ss(.15, .45, arms);
    g.fillStyle = G.rad(g, sh[0] + 6, sh[1] - 6, 26, [[0, shade(pal.side, .35), .7 * k], [1, pal.side, 0]]);
    G.ellipse(g, sh[0] + 4, sh[1] - 6, 24 * k, 14 * k, .4); g.fill();
    g.strokeStyle = rgba(pal.line, .35 * k); g.lineWidth = 1.5; g.stroke();
  }
  g.restore();
}

// water beads on the back that swell, slide down the flank and fall away (adult out of water)
function skinDrops(g, o, pal, seed, t, k) {
  for (let i = 0; i < 11; i++) {
    const per = 2.4 + hash(seed * 5 + i) * 3.2, u = ((t / per + hash(seed * 7 + i)) % 1 + 1) % 1;
    const x0 = -84 + hash(seed * 3 + i) * 150, y0 = -32 + hash(seed * 9 + i) * 10, y = y0 + u * u * 46, x = x0 - u * 7;
    const r = (1.5 + hash(i + seed) * 2.3) * (1 - u * .35), a = k * Math.sin(Math.PI * Math.min(1, u * 1.15));
    if (a < .02) continue;
    g.strokeStyle = rgba('#ffffff', .14 * a); g.lineWidth = r * .7; g.lineCap = 'round';
    g.beginPath(); g.moveTo(x0, y0); g.lineTo(x + .5, y - r); g.stroke();
    g.fillStyle = rgba(shade(pal.side, -.35), .35 * a); G.ellipse(g, x + r * .15, y + r * .2, r, r * 1.12); g.fill();
    g.fillStyle = rgba('#f4fff4', .22 * a); G.ellipse(g, x, y, r, r * 1.12); g.fill();
    g.fillStyle = rgba('#ffffff', .9 * a); G.circle(g, x - r * .35, y - r * .4, r * .32); g.fill();
  }
}

function bud(g, x, y, k, pal, lw) {
  k = clamp(k);
  g.fillStyle = shade(pal.side, .15);
  G.ellipse(g, x - 6 * k, y + 4 * k, 9 * k + 2, 6 * k + 1.5, .5); g.fill();
  g.strokeStyle = pal.line; g.lineWidth = lw * .8; g.stroke();
}

function larvalBits(g, o, pal, lw, side, arms) {
  const tad = o.tad, gills = clamp(o.gills ?? 0), oper = clamp(o.oper ?? 1), t = o.t ?? 0;
  g.save(); g.globalAlpha *= ss(.3, .8, tad);
  // external gills: branched, blood-red filaments behind the head, swaying
  if (gills > .01) {
    const foldX = lerp(60, -10, oper);
    g.save();
    g.beginPath(); g.rect(-200, -200, foldX + 200, 400); g.clip();
    for (let k = 0; k < 3; k++) {
      const bx = 34 - k * 6, by = -14 + k * 8, L = [92, 80, 66][k] * gills, sw = Math.sin(t * 3 + k) * .1;
      const a = [-1.8, -2.25, -2.7][k] + sw, P = [];
      for (let i = 0; i <= 6; i++) { const u = i / 6; P.push([bx + Math.cos(a - u * .3) * L * u, by + Math.sin(a - u * .3) * L * u]); }
      g.strokeStyle = rgba('#d8584e', .9); g.lineWidth = 5; g.lineCap = 'round'; g.beginPath(); G.curve(g, P, false); g.stroke();
      g.lineWidth = 2.4;
      for (let i = 1; i < 6; i++) {
        const p = P[i], aa = a - i * .05;
        for (const sgn of [-1, 1]) { const ba = aa + sgn * .85, bl = 18 * gills * (1 - i * .1); g.strokeStyle = rgba('#ff8f80', .85); g.beginPath(); g.moveTo(p[0], p[1]); g.quadraticCurveTo(p[0] + Math.cos(ba) * bl * .6, p[1] + Math.sin(ba) * bl * .6, p[0] + Math.cos(ba + sgn * .3) * bl, p[1] + Math.sin(ba + sgn * .3) * bl); g.stroke(); }
      }
    }
    g.restore();
  }
  // operculum fold growing back over the gill region
  if (oper > .02 && oper < .98 && gills > .01) {
    const fx = lerp(44, -10, oper);
    g.strokeStyle = rgba(pal.line, .8); g.lineWidth = lw; g.beginPath(); g.moveTo(fx + 10, -26); g.quadraticCurveTo(fx - 6, 8, fx + 6, 40); g.stroke();
    g.strokeStyle = rgba(shade(pal.side, .4), .7); g.lineWidth = 2; g.beginPath(); g.moveTo(fx + 13, -24); g.quadraticCurveTo(fx - 3, 8, fx + 9, 38); g.stroke();
  }
  // spiracle (left side only), until the left arm comes out through it
  if (side === 'left' && oper > .9 && arms < .6) {
    const k = 1 - ss(.45, .6, arms);
    g.fillStyle = rgba(shade(pal.side, -.15), k); G.ellipse(g, 26, 40, 11, 6, -.35); g.fill();
    g.strokeStyle = rgba(pal.line, k); g.lineWidth = lw * .8; g.stroke();
    g.fillStyle = rgba('#0a0805', k); G.ellipse(g, 19, 42, 4, 2.6, -.35); g.fill();
  }
  // adhesive gland (hatchling) + oral disc with keratin beak
  const hatch = o.hatch ?? 0;
  if (hatch > .05) { g.fillStyle = rgba('#120c06', .8 * hatch); g.beginPath(); g.moveTo(70, 38); g.lineTo(80, 28); g.lineTo(84, 36); g.lineTo(76, 46); g.closePath(); g.fill(); }
  if (hatch < .9) {
    const k = 1 - hatch;
    g.fillStyle = rgba(shade(pal.belly, -.1), k); G.ellipse(g, 92, 28, 10, 8, .3); g.fill();
    g.strokeStyle = rgba('#0c0904', .9 * k); g.lineWidth = 3; g.beginPath(); g.arc(94, 28, 5, -1.2, 1.4); g.stroke();
  }
  g.restore();
}

function eye(g, x, y, r, o, pal, adult) {
  if (adult > .05) {
    g.save(); g.globalAlpha *= ss(.05, .7, adult);
    g.fillStyle = G.lin(g, x, y - r * 1.3, x, y + r, [[0, shade(pal.top, .1)], [1, pal.side]]);
    G.ellipse(g, x, y + 2, r * 1.22, r * 1.12); g.fill(); g.strokeStyle = pal.line; g.lineWidth = 2; g.stroke();
    g.restore();
  }
  g.save();
  G.circle(g, x, y, r); g.clip();
  g.fillStyle = G.rad(g, x - r * .2, y - r * .3, r * 1.2, [[0, '#f7d27a'], [.55, pal.eye], [1, '#5a3a10']]);
  g.fillRect(x - r, y - r, 2 * r, 2 * r);
  g.strokeStyle = 'rgba(60,35,10,.35)'; g.lineWidth = 1.2;
  for (let i = 0; i < 9; i++) { const a = i / 9 * TAU; g.beginPath(); g.moveTo(x + Math.cos(a) * r * .45, y + Math.sin(a) * r * .45); g.lineTo(x + Math.cos(a + .3) * r, y + Math.sin(a + .3) * r); g.stroke(); }
  const lx = x + (o.look?.[0] ?? 1.5) * r / 15 + 1, ly = y + (o.look?.[1] ?? 0) * r / 15, pr = lerp(.58, .7, o.tad ?? 0) * (o.pupil ?? 1);
  g.fillStyle = '#0b0805'; G.ellipse(g, lx, ly, r * pr, r * lerp(.3, .62, o.tad ?? 0) * (o.pupil ?? 1)); g.fill();
  g.fillStyle = G.lin(g, x, y - r, x, y + r, [[0, '#000000', .35], [.5, '#000000', 0], [1, '#000000', .25]]); g.fillRect(x - r, y - r, 2 * r, 2 * r);
  g.fillStyle = 'rgba(255,255,255,.95)'; G.ellipse(g, x - r * .32, y - r * .42, r * .26, r * .17, -.5); g.fill();
  g.fillStyle = 'rgba(255,255,255,.45)'; G.circle(g, x + r * .35, y + r * .35, r * .1); g.fill();
  const b = clamp(o.blink ?? 0);
  if (b > .01) {
    g.fillStyle = rgba('#d8e2cf', .85); g.fillRect(x - r, y + r - 2 * r * b, 2 * r, 2 * r * b);
    g.fillStyle = shade(pal.top, .05); g.fillRect(x - r, y - r, 2 * r, r * .5 * b);
  }
  if (o.sleep) {
    g.fillStyle = G.lin(g, x, y - r, x, y + r, [[0, shade(pal.top, .15)], [1, shade(pal.side, -.1)]]); g.fillRect(x - r, y - r, 2 * r, 2 * r);
    g.strokeStyle = pal.line; g.lineWidth = 2; g.beginPath(); g.arc(x, y - r * .2, r * .9, .35, Math.PI - .35); g.stroke();
  }
  g.restore();
  g.strokeStyle = pal.line; g.lineWidth = 2; G.circle(g, x, y, r); g.stroke();
  // catchlight twinkle: a slowly turning four-point star on the highlight
  const gl = (o.glint ?? 0) * (1 - clamp(o.blink ?? 0)) * (o.sleep ? 0 : 1);
  if (gl > .02) {
    const tw = .65 + .35 * Math.sin((o.t ?? 0) * 3.1 + x), sx = x - r * .32, sy = y - r * .42, L = r * 1.1 * gl * tw;
    g.save(); g.translate(sx, sy); g.rotate((o.t ?? 0) * .4); g.globalCompositeOperation = 'screen';
    g.fillStyle = 'rgba(255,252,235,.9)';
    for (let q = 0; q < 2; q++) { g.rotate(Math.PI / 2); g.beginPath(); g.moveTo(-L, 0); g.quadraticCurveTo(0, -L * .07, L, 0); g.quadraticCurveTo(0, L * .07, -L, 0); g.fill(); }
    g.fillStyle = G.rad(g, 0, 0, L * .5, [[0, '#ffffff', .8 * gl], [1, '#ffffff', 0]]); G.circle(g, 0, 0, L * .5); g.fill();
    g.restore();
  }
  if (adult > .05) {
    g.save(); g.globalAlpha *= ss(.05, .7, adult);
    g.strokeStyle = shade(pal.top, .2); g.lineWidth = 3.5; g.lineCap = 'round';
    g.beginPath(); g.arc(x, y + 1, r * 1.05, Math.PI * 1.08, Math.PI * 1.92); g.stroke();
    g.strokeStyle = pal.line; g.lineWidth = 1.6; g.beginPath(); g.arc(x, y + 1, r * 1.16, Math.PI * 1.1, Math.PI * 1.9); g.stroke();
    g.restore();
  }
}

function mouth(g, o, pal, lw, tad) {
  const m = clamp(o.mouth ?? 0), hinge = [lerp(34, 88, ss(0, .7, tad)), 8], ang = m * .5;
  if (tad > .7) return;
  if (m < .02) {
    g.save(); g.globalAlpha *= 1 - ss(.3, .7, tad);
    g.strokeStyle = pal.line; g.lineWidth = lw * .9; g.lineCap = 'round';
    g.beginPath(); g.moveTo(99, 5); g.bezierCurveTo(80, 9, 56, 9, hinge[0], hinge[1] - 2); g.stroke();
    g.strokeStyle = rgba(pal.fold, .5); g.lineWidth = 1.4; g.beginPath(); g.moveTo(96, 8); g.bezierCurveTo(78, 12, 58, 12, hinge[0] + 6, 9); g.stroke();
    g.restore();
    return;
  }
  const cs = Math.cos(ang), sn = Math.sin(ang), rot = ([x, y]) => [hinge[0] + (x - hinge[0]) * cs - (y - hinge[1]) * sn, hinge[1] + (x - hinge[0]) * sn + (y - hinge[1]) * cs];
  const tipU = [99, 5], tipL = rot([97, 9]), chin = rot([84, 16]);
  g.fillStyle = '#5a1f22';
  g.beginPath(); g.moveTo(hinge[0], hinge[1]); g.lineTo(tipU[0], tipU[1]); g.lineTo(tipL[0], tipL[1]); g.closePath(); g.fill();
  g.fillStyle = G.lin(g, hinge[0], hinge[1], tipL[0], tipL[1], [[0, '#7a2a2c'], [1, '#c45a5a']]);
  g.beginPath(); g.moveTo(hinge[0] + 6, hinge[1] + 2); g.lineTo(tipL[0] - 6, tipL[1] - 2); g.lineTo(rot([70, 13])[0], rot([70, 13])[1]); g.closePath(); g.fill();
  g.fillStyle = pal.throat;
  g.beginPath(); g.moveTo(hinge[0], hinge[1]); g.lineTo(tipL[0], tipL[1]); g.lineTo(chin[0], chin[1] + 4); g.lineTo(hinge[0] + 10, hinge[1] + 14); g.closePath(); g.fill();
  g.strokeStyle = pal.line; g.lineWidth = lw;
  g.beginPath(); g.moveTo(hinge[0], hinge[1]); g.lineTo(tipU[0], tipU[1]); g.moveTo(hinge[0], hinge[1]); g.lineTo(tipL[0], tipL[1]); g.lineTo(chin[0], chin[1] + 4); g.stroke();
  const T = o.tongue;
  if (T && T.k > .01) {
    const bx = tipL[0] - 4, by = tipL[1] - 1, tx = lerp(bx, T.x, T.k), ty = lerp(by, T.y, T.k);
    const mx = (bx + tx) / 2 + (ty - by) * .15, my = (by + ty) / 2 - Math.abs(tx - bx) * .12;
    g.strokeStyle = '#d0606a'; g.lineCap = 'round'; g.lineWidth = 7;
    g.beginPath(); g.moveTo(bx, by); g.quadraticCurveTo(mx, my, tx, ty); g.stroke();
    g.strokeStyle = 'rgba(255,200,205,.6)'; g.lineWidth = 2; g.beginPath(); g.moveTo(bx, by - 1.5); g.quadraticCurveTo(mx, my - 2, tx, ty - 2); g.stroke();
    g.fillStyle = G.rad(g, tx - 2, ty - 2, 10, [[0, '#ffb0b8'], [1, '#c04a56']]); G.circle(g, tx, ty, 8); g.fill();
    g.fillStyle = 'rgba(255,255,255,.6)'; G.circle(g, tx - 3, ty - 3, 2.2); g.fill();
  }
}

// see-through anatomy: lungs, heart, gut (long coil for tadpoles), internal gills, thyroid glow
function organs(g, a, o) {
  const t = o.t ?? 0, tad = o.tad ?? 0;
  g.save(); g.globalAlpha *= a; g.globalCompositeOperation = 'lighter';
  const L = o.lungs ?? (1 - tad * .7), gut = o.gut ?? tad, gi = o.igills ?? tad;
  if (L > .01) { g.fillStyle = G.rad(g, 0, 4, 46, [[0, '#ff9fb0', .6 * L], [1, '#ff6f90', .05 * L]]); G.ellipse(g, -4, lerp(4, 2, tad), 38 * (.5 + .5 * L), 13 * (.5 + .5 * L), -.08); g.fill(); }
  const hb = .85 + .15 * Math.max(0, Math.sin(t * 7.5));
  g.fillStyle = G.rad(g, 34, 24, 12, [[0, '#ff5a4a', .95], [1, '#ff2a2a', 0]]); G.circle(g, 34, 24, 10 * hb); g.fill();
  if (gi > .01) {
    g.strokeStyle = rgba('#ff8a7a', .7 * gi); g.lineWidth = 2;
    for (let k = 0; k < 4; k++) { g.beginPath(); g.arc(30 - k * 7, 12, 12 + k * 2, .9, 2.6); g.stroke(); for (let i = 0; i < 6; i++) { const aa = .9 + i * .3, rr = 12 + k * 2; g.beginPath(); g.moveTo(30 - k * 7 + Math.cos(aa) * rr, 12 + Math.sin(aa) * rr); g.lineTo(30 - k * 7 + Math.cos(aa) * (rr + 6), 12 + Math.sin(aa) * (rr + 6)); g.stroke(); } }
  }
  // the gut: a long double coil in the tadpole, a short loop in the adult
  const turns = 1.1 + gut * 1.7, R0 = lerp(16, 30, gut), gx = lerp(-40, -16, gut), gy = lerp(14, 36, gut);
  g.lineCap = 'round';
  for (const [r0, a0, lw2, al] of [[R0, 0, 4.4, .5], [R0 * .8, .6, 4.4, .5], [R0, 0, 1.4, .6], [R0 * .8, .6, 1.4, .6]]) {
    g.strokeStyle = rgba(lw2 > 2 ? '#e8b85a' : '#fff4c8', al); g.lineWidth = lw2; g.beginPath();
    for (let i = 0; i <= 120; i++) { const u = i / 120, ang = a0 + u * turns * TAU, r = r0 * (1 - u * .75); const x = gx + Math.cos(ang) * r * 1.45, y = gy + Math.sin(ang) * r * .5; i ? g.lineTo(x, y) : g.moveTo(x, y); }
    g.stroke();
  }
  if ((o.thyroid ?? 0) > .01) { const th = o.thyroid; G.glow(g, 62, 26, 34 + 20 * th, '#ffd36a', .9 * th); }
  g.restore();
}

// local rig point -> parent space, matching frog()'s transform
function toWorld(o, lx, ly) {
  const P = o.joints ?? blendPose(o.pose ?? ((o.tad ?? 0) > .5 ? { tad: 1 } : { sit: 1 }));
  const p = P.pitch + (o.pitch ?? 0), s = o.s ?? 1, f = o.flip ?? 1, c = Math.cos(p), sn = Math.sin(p);
  return [(o.x ?? 0) + s * f * (lx * c - ly * sn), (o.y ?? 0) + s * (lx * sn + ly * c)];
}
// a joint of the near limbs in parent space: limb 'hand' | 'foot' | 'knee' | 'elbow'
function joint(o, which) {
  const P = o.joints ?? blendPose(o.pose ?? { sit: 1 }), tad = o.tad ?? 0;
  if (which === 'hand' || which === 'elbow') {
    const A = o.arm ?? P.arm, s = 1, sh = [lerp(36, 22, tad), lerp(20, 40, tad)], C = chain(sh[0], sh[1], A, [24 * s, 26 * s, 12 * s]);
    return toWorld(o, ...(which === 'hand' ? C[2] : C[1]));
  }
  const A = o.hip ?? P.hip, hip = [lerp(-62, -74, tad), lerp(2, 26, tad)], C = chain(hip[0], hip[1], A, [72, 74, 40, 30]);
  return toWorld(o, ...(which === 'foot' ? C[3] : C[1]));
}

module.exports = { frog, POSES, blendPose, groundY, outline, COMMON, TADPAL, HATCHPAL, seg, chain, hindLeg, frontLeg, eye, organs, tail, toWorld, joint };
