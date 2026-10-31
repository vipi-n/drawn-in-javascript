// Vegetation built from a simple 3D structure and projected: coconut palms, casuarinas, scrub, grass.
// Every function takes (x, y) = base on screen and h = height in px; o.color gives a backlit silhouette,
// o.lit = { light:[lx,ly,lz] (screen x right, y up, z toward viewer), leaf/leafLit/leafDark/trunk/trunkLit... } gives a lit tree.
const { clamp, lerp, hash, rng, noise2 } = require('./core');
const { rgba, mixc } = require('./gfx');

const D2R = Math.PI / 180;
const norm3 = (v) => { const n = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / n, v[1] / n, v[2] / n]; };

function palette(o, def) {
  const hz = o.haze ?? null, hk = o.hazeK ?? 0, fix = (c) => (hz && hk > 0 ? mixc(c, hz, hk) : c);
  if (o.color) { const c = fix(o.color); return { sil: true, leaf: [c, c, c], back: fix(mixc(o.color, o.backCol ?? o.color, .5)), rachis: c, trunk: c, trunkLit: c, trunkDark: c, dead: c, nut: c, ring: c, light: [0, 1, 0] }; }
  const L = o.lit ?? {};
  const p = { ...def, ...L };
  return {
    sil: false, light: norm3(L.light ?? [-.6, .6, .5]),
    leaf: [fix(p.leafDark), fix(p.leaf), fix(p.leafLit)], back: fix(mixc(p.leafDark, p.leaf, .3)),
    rachis: fix(p.rachis), trunk: fix(p.trunk), trunkLit: fix(p.trunkLit), trunkDark: fix(p.trunkDark), dead: fix(p.dead), nut: fix(p.nut), ring: fix(p.trunkDark),
    rim: L.rim ? fix(L.rim) : null,
  };
}

// ---------------------------------------------------------------- coconut palm
const PALM_DEF = { leafDark: [24, 40, 20], leaf: [56, 84, 36], leafLit: [124, 146, 68], rachis: [140, 132, 80], trunk: [104, 94, 82], trunkLit: [176, 164, 140], trunkDark: [52, 46, 42], dead: [128, 96, 56], nut: [96, 110, 40] };
function palm(ctx, x, y, h, o = {}) {
  if (h < 3) return;
  const seed = o.seed ?? 1, r = rng(seed * 7 + 3), pal = palette(o, PALM_DEF);
  const Hm = o.metres ?? (13 + r() * 7), s = h / Hm;
  const lean = o.lean ?? (r() - .5) * .3, sway = o.sway ?? 0, t = o.t ?? 0, wind = o.wind ?? .5;
  const yaw = r() * 6.283, alpha = o.alpha ?? 1;
  // trunk: curved near the base, straighter above
  const tx = x + lean * h + sway * h * .012, ty = y - h * (1 - Math.abs(lean) * .1);
  const bx = x + lean * h * (o.bend ?? .15), by = y - h * .55;
  const tp = (u) => [(1 - u) * (1 - u) * x + 2 * u * (1 - u) * bx + u * u * tx, (1 - u) * (1 - u) * y + 2 * u * (1 - u) * by + u * u * ty];
  const tw = (u) => s * (u < .06 ? lerp(.62, .42, u / .06) : lerp(.42, .27, (u - .06) / .94));
  ctx.save(); if (alpha < 1) ctx.globalAlpha = alpha;
  const big = s * 5 > 90, mid = s * 5 > 34;
  // fronds in 3D around the crown
  const n = o.fronds ?? (big ? 26 : mid ? 20 : 14), fr = [];
  for (let j = 0; j < n; j++) {
    const a = clamp((j + r() * .6) / n), phi = j * 2.39996 + yaw + (r() - .5) * .3;
    const dead = a > .9 && r() < .75;
    let e0 = lerp(72, -18, Math.pow(a, .85)) + (r() - .5) * 12, bend = lerp(18, 85, a) + (r() - .5) * 16;
    if (dead) { e0 = -55 - r() * 15; bend = 20; }
    const fl = noise2(t * 1.3 + j * 3.7, seed) * 6 * wind + sway * 4 * Math.cos(phi);
    const Lf = (o.frond ?? 5) * (.7 + .3 * Math.min(1, a * 3)) * (.88 + r() * .24) * (dead ? .8 : 1);
    const K = 12, pts = [[0, 0, 0]], dirs = [];
    let px = Math.cos(phi) * .25, py = .1, pz = Math.sin(phi) * .25;
    pts[0] = [px, py, pz];
    for (let k = 1; k <= K; k++) {
      const u = (k - .5) / K, e = (e0 - bend * Math.pow(u, 1.4) - fl * u) * D2R;
      const d = [Math.cos(e) * Math.cos(phi), Math.sin(e), Math.cos(e) * Math.sin(phi)];
      dirs.push(d); px += d[0] * Lf / K; py += d[1] * Lf / K; pz += d[2] * Lf / K; pts.push([px, py, pz]);
    }
    fr.push({ a, phi, dead, Lf, pts, dirs, z: pts[K >> 1][2] + pts[K][2], seed: seed * 31 + j });
  }
  fr.sort((p, q) => p.z - q.z);
  const P = (v) => [tx + v[0] * s, ty - v[1] * s];
  const L3 = pal.light;
  const drawFrond = (F, back) => {
    const nl = big ? 40 : mid ? 24 : 12, K = F.pts.length - 1;
    const paths = [[], [], []], wl = .05 * s, poly = wl > 1.1;
    const fold = lerp(22, 48, F.a) * D2R, LLmax = (F.dead ? .6 : .95) * (F.a < .15 ? .8 : 1);
    for (let i = 0; i < nl; i++) {
      const u = .08 + .92 * (i + .5) / nl, kf = u * K, k0 = Math.min(K - 1, Math.floor(kf)), fk = kf - k0;
      const B = [lerp(F.pts[k0][0], F.pts[k0 + 1][0], fk), lerp(F.pts[k0][1], F.pts[k0 + 1][1], fk), lerp(F.pts[k0][2], F.pts[k0 + 1][2], fk)], T = F.dirs[k0];
      let sd = [-T[2], 0, T[0]]; const sl = Math.hypot(sd[0], sd[2]);
      sd = sl < .05 ? [Math.cos(F.phi + 1.57), 0, Math.sin(F.phi + 1.57)] : [sd[0] / sl, 0, sd[2] / sl];
      const prof = Math.pow(Math.sin(Math.PI * (.1 + .9 * u)), .5) * (1 - .5 * u * u);
      for (const sg of [-1, 1]) {
        const hsh = hash(F.seed * 13.1 + i * 2.7 + sg);
        if (hsh < .07) continue;
        let Ll = LLmax * prof * (hsh < .17 ? .5 : .85 + .3 * hash(i + F.seed));
        const fj = fold + (hash(i * 3.3 + F.seed + sg) - .5) * .5 + noise2(t * 2.1 + i * .4, F.seed + sg) * .25 * wind;
        const D = norm3([sg * sd[0] * Math.cos(fj) + T[0] * .55, -Math.sin(fj) + T[1] * .55, sg * sd[2] * Math.cos(fj) + T[2] * .55]);
        const E = [B[0] + D[0] * Ll, B[1] + D[1] * Ll - .3 * Ll, B[2] + D[2] * Ll];
        const M = [B[0] + D[0] * Ll * .55, B[1] + D[1] * Ll * .55, B[2] + D[2] * Ll * .55];
        let bin = 1;
        if (!pal.sil) {
          // leaflet upper-surface normal against the light; backlit leaflets glow a little through
          let nn = norm3([D[1] * T[2] - D[2] * T[1], D[2] * T[0] - D[0] * T[2], D[0] * T[1] - D[1] * T[0]]);
          if (nn[1] < 0) nn = [-nn[0], -nn[1], -nn[2]];
          const lam = nn[0] * L3[0] + nn[1] * L3[1] + nn[2] * L3[2] + (hash(i * 1.7 + F.seed) - .5) * .5;
          bin = lam > .45 ? 2 : lam > -.05 ? 1 : 0;
        }
        paths[bin].push(P(B), P(M), P(E));
      }
    }
    const cols = F.dead ? [mixc(pal.dead, [0, 0, 0], .35), pal.dead, mixc(pal.dead, [255, 230, 170], .25)] : back && pal.sil ? [pal.back, pal.back, pal.back] : pal.leaf;
    for (let b = 0; b < 3; b++) {
      const L = paths[b]; if (!L.length) continue;
      ctx.beginPath();
      if (poly) {
        ctx.fillStyle = rgba(cols[b]);
        for (let q = 0; q < L.length; q += 3) {
          const [b0, m0, e0] = [L[q], L[q + 1], L[q + 2]], dx = e0[0] - b0[0], dy = e0[1] - b0[1], dl = Math.hypot(dx, dy) || 1, nx = -dy / dl * wl * .5, ny = dx / dl * wl * .5;
          ctx.moveTo(b0[0] + nx, b0[1] + ny); ctx.quadraticCurveTo(m0[0] + nx * 1.1, m0[1] + ny * 1.1, e0[0], e0[1]); ctx.quadraticCurveTo(m0[0] - nx * 1.1, m0[1] - ny * 1.1, b0[0] - nx, b0[1] - ny); ctx.closePath();
        }
        ctx.fill();
      } else {
        ctx.strokeStyle = rgba(cols[b]); ctx.lineWidth = Math.max(.6, wl); ctx.lineCap = 'round';
        for (let q = 0; q < L.length; q += 3) { ctx.moveTo(L[q][0], L[q][1]); ctx.quadraticCurveTo(L[q + 1][0], L[q + 1][1], L[q + 2][0], L[q + 2][1]); }
        ctx.stroke();
      }
    }
    // rachis
    ctx.strokeStyle = rgba(F.dead ? pal.dead : back && pal.sil ? pal.back : pal.rachis); ctx.lineCap = 'round';
    for (const [k0, k1, w] of [[0, K >> 1, .07], [K >> 1, K, .04]]) {
      ctx.lineWidth = Math.max(.7, w * s); ctx.beginPath(); for (let k = k0; k <= k1; k++) { const p = P(F.pts[k]); k === k0 ? ctx.moveTo(p[0], p[1]) : ctx.lineTo(p[0], p[1]); } ctx.stroke();
    }
  };
  for (const F of fr) if (F.z < 0) drawFrond(F, true);
  // trunk
  const N = 26, Ls = [], Rs = [];
  for (let i = 0; i <= N; i++) {
    const u = i / N, [px, py] = tp(u), [qx, qy] = tp(Math.min(1, u + .01)), [ox, oy] = tp(Math.max(0, u - .01));
    const w = tw(u) / 2, dl = Math.hypot(qx - ox, qy - oy) || 1, nx = -(qy - oy) / dl, ny = (qx - ox) / dl;
    Ls.push([px + nx * w, py + ny * w]); Rs.push([px - nx * w, py - ny * w]);
  }
  ctx.fillStyle = rgba(pal.trunk); ctx.beginPath();
  Ls.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
  for (let i = N; i >= 0; i--) ctx.lineTo(Rs[i][0], Rs[i][1]);
  ctx.closePath(); ctx.fill();
  if (!pal.sil && s > 6) {
    // light falls across the round trunk: a lit band on the sun side, core shadow on the other
    const side = L3[0] < 0 ? 0 : 1;
    ctx.save(); ctx.clip();
    for (const [frac, c, a, wk] of [[.62, pal.trunkLit, .75, .45], [.82, pal.trunkLit, .45, .2], [-.55, pal.trunkDark, .7, .55]]) {
      ctx.strokeStyle = rgba(c, a); ctx.beginPath();
      for (let i = 0; i <= N; i++) { const [lx, ly] = side ? Rs[i] : Ls[i], [px, py] = tp(i / N), k = frac; const X = lerp(px, lx, k), Y = lerp(py, ly, k); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); }
      ctx.lineWidth = tw(.5) * wk; ctx.stroke();
    }
    ctx.restore();
  }
  // ring scars
  const ringStep = .16 * s;
  if (ringStep > 2.2) {
    const nr = Math.floor(Hm / .16);
    ctx.strokeStyle = rgba(pal.sil ? mixc(pal.trunk, [255, 255, 255], .05) : pal.ring, pal.sil ? .45 : .35); ctx.lineWidth = Math.max(.6, .02 * s); ctx.beginPath();
    for (let i = 1; i < nr; i++) {
      const u = i / nr + (hash(i + seed) - .5) * .004; if (u > .97) break;
      const k = Math.min(N, Math.round(u * N)), a = Ls[k], b = Rs[k], j = .08 + hash(i * 3 + seed) * .1;
      ctx.moveTo(a[0], a[1]); ctx.quadraticCurveTo((a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + Math.abs(b[0] - a[0]) * j, b[0], b[1]);
    }
    ctx.stroke();
  }
  // leaf bases and coconut bunches under the crown
  const nutR = .13 * s;
  ctx.fillStyle = rgba(pal.sil ? pal.trunk : mixc(pal.trunkDark, pal.dead, .4));
  ctx.beginPath(); ctx.ellipse(tx, ty + .25 * s, .42 * s, .5 * s, 0, 0, Math.PI * 2); ctx.fill();
  if (nutR > .8) {
    const nn = 6 + Math.floor(r() * 10);
    for (let k = 0; k < nn; k++) {
      const a = (k / nn) * 6.283 + r(), rr = .22 + r() * .25, nx = tx + Math.cos(a) * rr * s, ny = ty + (.35 + r() * .5) * s, z = Math.sin(a);
      if (z < -.3 && k % 2) continue;
      const nc = pal.sil ? pal.nut : mixc(pal.nut, [190, 150, 60], hash(k + seed) * .6);
      if (pal.sil || nutR < 2.5) { ctx.fillStyle = rgba(nc); ctx.beginPath(); ctx.arc(nx, ny, nutR, 0, Math.PI * 2); ctx.fill(); continue; }
      const g = ctx.createRadialGradient(nx + L3[0] * nutR * .45, ny - L3[1] * nutR * .45, nutR * .1, nx, ny, nutR);
      g.addColorStop(0, rgba(mixc(nc, [255, 240, 190], .35))); g.addColorStop(.6, rgba(nc)); g.addColorStop(1, rgba(mixc(nc, [0, 0, 0], .55)));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(nx, ny, nutR, 0, Math.PI * 2); ctx.fill();
    }
  }
  for (const F of fr) if (F.z >= 0) drawFrond(F, false);
  ctx.restore();
  return { top: [tx, ty] };
}

// ---------------------------------------------------------------- casuarina
const CAS_DEF = { leafDark: [24, 34, 26], leaf: [52, 70, 48], leafLit: [118, 132, 92], rachis: [70, 60, 50], trunk: [78, 66, 56], trunkLit: [140, 124, 104], trunkDark: [40, 34, 30], dead: [100, 90, 70], nut: [0, 0, 0] };
function casuarina(ctx, x, y, h, o = {}) {
  if (h < 3) return;
  const seed = o.seed ?? 1, r = rng(seed * 5 + 11), pal = palette(o, CAS_DEF);
  const Hm = o.metres ?? (14 + r() * 8), s = h / Hm, t = o.t ?? 0, sway = (o.sway ?? 0) * .4 + noise2(t * .7, seed) * .25 * (o.wind ?? .5);
  const L3 = pal.light, lean = (r() - .5) * .06 + (o.lean ?? 0);
  const trunkX = (u) => x + (lean * u + sway * .02 * u * u) * h + Math.sin(u * 7 + seed) * .006 * h;
  ctx.save(); if ((o.alpha ?? 1) < 1) ctx.globalAlpha = o.alpha;
  ctx.lineCap = 'round';
  // tapered trunk
  ctx.fillStyle = rgba(pal.trunk); ctx.beginPath();
  const segs = 10, tw = (u) => Math.max(.5, lerp(.2, .03, u) * s);
  for (let i = 0; i <= segs; i++) { const u = i / segs; ctx.lineTo(trunkX(u) - tw(u), y - u * h); }
  for (let i = segs; i >= 0; i--) { const u = i / segs; ctx.lineTo(trunkX(u) + tw(u), y - u * h); }
  ctx.fill();
  if (!pal.sil && s > 5) {
    ctx.strokeStyle = rgba(pal.trunkLit, .55); ctx.lineWidth = Math.max(.6, .08 * s); ctx.beginPath();
    for (let i = 0; i <= segs; i++) { const u = i / segs * .9; ctx.lineTo(trunkX(u) + Math.sign(L3[0]) * tw(u) * .45, y - u * h); }
    ctx.stroke();
  }
  // branches rising from the trunk, each carrying wispy drooping tufts of needles
  const big = s > 16, mid = s > 4;
  const nb = o.branches ?? (big ? 26 : mid ? 18 : 12), tufts = [];
  const crownBase = o.crownBase ?? (.28 + r() * .14), wd = o.width ?? 1.5;
  ctx.strokeStyle = rgba(pal.sil ? pal.trunk : mixc(pal.trunk, pal.trunkDark, .3)); ctx.lineWidth = Math.max(.5, .05 * s);
  ctx.beginPath();
  for (let b = 0; b < nb; b++) {
    const u = lerp(crownBase, .98, Math.pow((b + r()) / nb, .85)), phi = r() * 6.283;
    const len = (Math.pow(1 - u, .8) * .3 * Hm * (.55 + r() * .8) + .6) * wd, el = (30 + r() * 32) * D2R;
    const ox = trunkX(u), oy = y - u * h;
    const dx = Math.cos(phi) * Math.cos(el), dy = Math.sin(el), dz = Math.sin(phi) * Math.cos(el);
    const ex = ox + (dx * len + sway * len * .08) * s, ey = oy - dy * len * s * .75;
    ctx.moveTo(ox, oy); ctx.quadraticCurveTo(ox + dx * len * s * .45, oy - dy * len * s * .62, ex, ey);
    const nc = big ? 7 : mid ? 4 : 2;
    for (let c = 0; c < nc; c++) {
      const k = .25 + .75 * (c + r() * .7) / nc;
      tufts.push({ x: lerp(ox, ex, k) + (r() - .5) * .5 * s, y: lerp(oy, ey, k) - Math.sin(k * Math.PI) * len * s * .08 - r() * .3 * s, rc: (.38 + r() * .45) * (1.15 - u * .45) * s * (big ? 1 : mid ? 1.5 : 2.1), z: dz * k, ox: dx, oy: dy, sd: seed * 97 + b * 7 + c });
    }
  }
  ctx.stroke();
  // top leader tuft
  tufts.push({ x: trunkX(1), y: y - h, rc: .7 * s, z: 0, ox: 0, oy: 1, sd: seed * 13 });
  tufts.sort((a, b) => a.z - b.z);
  const strands = [[], [], []], masses = [[], []];
  const ns = big ? 30 : mid ? 16 : 7;
  for (const T of tufts) {
    const lamT = pal.sil ? 0 : T.ox * L3[0] + T.oy * L3[1] * .7 + T.z * L3[2] * .6;
    masses[lamT > .2 ? 1 : 0].push(T);
    for (let i = 0; i < ns; i++) {
      const h1 = hash(T.sd + i * 1.31), h2 = hash(T.sd * .7 + i * 2.17), h3 = hash(T.sd * 1.3 + i * .53);
      const a = h1 * 6.283, rr = Math.sqrt(h2);
      const sx = T.x + Math.cos(a) * rr * T.rc * 1.1, sy = T.y + Math.sin(a) * rr * T.rc * .42 - T.rc * .1;
      const len = (.45 + h3 * .8) * T.rc * 1.15 * (o.needle ?? 1);
      const out = Math.cos(a) * .35, bend = (out + sway * .25) * len + noise2(t * 1.6 + i * .37, T.sd) * .14 * len * (o.wind ?? .5);
      const top = -Math.sin(a) * rr;
      const v = lamT + top * .6 + (h2 - .5) * .45;
      const k = pal.sil ? 1 : v > .5 ? 2 : v > -.05 ? 1 : 0;
      strands[k].push(sx, sy, sx + bend * .5, sy + len * .45, sx + bend, sy + len);
    }
  }
  // soft inner mass so the tufts read as foliage, then the needle strands over it
  for (let k = 0; k < 2; k++) {
    if (!masses[k].length) continue;
    ctx.fillStyle = rgba(pal.sil ? pal.leaf[1] : mixc(pal.leaf[0], pal.leaf[1], k * .6), pal.sil ? .55 : big ? .6 : .85); ctx.beginPath();
    for (const T of masses[k]) ragged(ctx, T.x, T.y + T.rc * .3, T.rc * .85, T.rc * .45, T.sd);
    ctx.fill();
  }
  ctx.lineWidth = Math.max(.5, .028 * s);
  for (let k = 0; k < 3; k++) {
    const L = strands[k]; if (!L.length) continue;
    ctx.strokeStyle = rgba(pal.leaf[k]); ctx.beginPath();
    for (let q = 0; q < L.length; q += 6) { ctx.moveTo(L[q], L[q + 1]); ctx.quadraticCurveTo(L[q + 2], L[q + 3], L[q + 4], L[q + 5]); }
    ctx.stroke();
  }
  ctx.restore();
}

// ---------------------------------------------------------------- scrub, grass
// irregular blob sub-path (caller fills)
function ragged(ctx, x, y, rx, ry, seed, n = 16) {
  for (let i = 0; i <= n; i++) {
    const a = i / n * 6.283, k = .7 + .45 * hash(seed + (i % n) * 1.37);
    const px = x + Math.cos(a) * rx * k, py = y + Math.sin(a) * ry * k;
    i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
  }
  ctx.closePath();
}
// dense low shrub: shadowed body, then leaf clusters lit from the light side
function shrub(ctx, x, y, w, h, o = {}) {
  const seed = o.seed ?? 1, pal = palette(o, { ...CAS_DEF, leafDark: [26, 38, 22], leaf: [58, 78, 36], leafLit: [118, 132, 66] }), L3 = pal.light;
  ctx.fillStyle = rgba(pal.leaf[0]); ctx.beginPath(); ragged(ctx, x, y - h * .4, w * .42, h * .42, seed, 40); ctx.fill();
  const leaf = o.leaf ?? Math.max(1, Math.min(6, w * .012));
  const n = Math.min(1600, Math.max(20, Math.floor(w * h / (leaf * leaf * 3)))), bins = [[], [], []];
  for (let i = 0; i < n; i++) {
    const h1 = hash(seed * 3.1 + i * 1.7), h2 = hash(seed * 1.3 + i * 2.9), a = h1 * Math.PI, rr = Math.pow(h2, .4);
    const px = x + Math.cos(a) * rr * w * .5, py = y - Math.sin(a) * rr * h * .95 + (hash(i * 3.7 + seed) - .5) * h * .1;
    const lam = pal.sil ? 0 : Math.cos(a) * rr * L3[0] + Math.sin(a) * rr * L3[1] + (hash(i + seed) - .5) * .8 - (1 - rr) * .4;
    bins[lam > .4 ? 2 : lam > -.15 ? 1 : 0].push(px, py, leaf * (.6 + hash(i * 7 + seed) * .8), hash(i * 5.3 + seed) * 3.14);
  }
  for (let k = 0; k < 3; k++) {
    const L = bins[k]; if (!L.length) continue;
    ctx.fillStyle = rgba(pal.leaf[k]); ctx.beginPath();
    for (let q = 0; q < L.length; q += 4) { ctx.moveTo(L[q] + Math.cos(L[q + 3]) * L[q + 2], L[q + 1] + Math.sin(L[q + 3]) * L[q + 2]); ctx.ellipse(L[q], L[q + 1], L[q + 2], L[q + 2] * .5, L[q + 3], 0, Math.PI * 2); }
    ctx.fill();
  }
}
function grass(ctx, x0, x1, y, hmin, hmax, o = {}) {
  const seed = o.seed ?? 1, n = o.n ?? Math.floor((x1 - x0) / 3), t = o.t ?? 0, wind = o.wind ?? .5;
  const cols = o.colors ?? [[20, 16, 12]];
  const paths = cols.map(() => []);
  for (let i = 0; i < n; i++) {
    const h1 = hash(seed + i * 1.13), h2 = hash(seed * 2 + i * .71), h3 = hash(seed * 3 + i * 2.3);
    const x = lerp(x0, x1, h1), hh = lerp(hmin, hmax, h2 * h2), b = (h3 - .5) * hh * .5 + noise2(t * 1.5 + x * .01, seed) * hh * .25 * wind;
    paths[Math.floor(h3 * cols.length) % cols.length].push(x, y + h2 * (o.depth ?? 0), x + b * .3, y - hh * .6, x + b, y - hh);
  }
  ctx.lineCap = 'round';
  cols.forEach((c, k) => {
    const L = paths[k]; if (!L.length) return;
    ctx.strokeStyle = rgba(c); ctx.lineWidth = o.width ?? 1.6; ctx.beginPath();
    for (let q = 0; q < L.length; q += 6) { ctx.moveTo(L[q], L[q + 1]); ctx.quadraticCurveTo(L[q + 2], L[q + 3], L[q + 4], L[q + 5]); }
    ctx.stroke();
  });
}

module.exports = { palm, casuarina, shrub, grass, ragged };
