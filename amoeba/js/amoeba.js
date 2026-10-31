// The amoeba: polar body with capsule pseudopods (smooth-max fillets), granular streaming, organelles,
// line-art (x-ray) variant, mitosis, cytokinesis neck, cyst, and a light-weight "mini" for crowds.
const { TAU, clamp, lerp, noise2, hash, rgba, mix, sepia, PAL, ss, ease, easeOut, backOut } = require('./core');
const D = require('./draw');
const { T } = require('./tex');

function wrap(a) { return Math.atan2(Math.sin(a), Math.cos(a)); }

function radius(o, th, shrink = 0) {
  const R = o.R, rd = o.round ?? 0, t = o.t ?? 0, sd = o.seed ?? 1;
  const c = Math.cos(th), s = Math.sin(th), wob = (o.wob ?? 1) * (1 - rd * .75);
  let r = R * (1 + wob * (.075 * noise2(c * 1.3 + sd, s * 1.3 + t * .35, sd) + .03 * noise2(c * 3 + sd * 2, s * 3 - t * .6, sd + 3)));
  if (o.stretch) r *= 1 + o.stretch.k * Math.cos(2 * (th - o.stretch.a));
  const k = R * .16;
  for (const p of o.pods || []) {
    const L = p.L * (1 - rd), w = p.w * (1 + .08 * noise2(p.a * 3, t * .8, sd + 9));
    if (L <= 1) continue;
    const d = wrap(th - p.a), sn = Math.abs(Math.sin(d)), cs = Math.cos(d);
    let rp = L * sn <= w ? L * cs + Math.sqrt(w * w - L * L * sn * sn) : cs > 0 ? w / sn : 0;
    rp = Math.min(rp, L + w) * (1 + .03 * noise2(c * 4, s * 4 + t, sd + 5));
    const m = Math.max(r, rp);
    r = m + k * Math.log(Math.exp((r - m) / k) + Math.exp((rp - m) / k));
  }
  return Math.max(2, r - shrink);
}
function outline(o, shrink = 0, n = 160) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const th = TAU * i / n, r = radius(o, th, shrink);
    pts.push([o.x + Math.cos(th) * r, o.y + Math.sin(th) * r]);
  }
  return pts;
}
// a point inside the body, u in [0,1] of the local radius
function inside(o, a, u, shrink = 0) { const r = radius(o, a, shrink) * u; return [o.x + Math.cos(a) * r, o.y + Math.sin(a) * r]; }

const C = (c, k) => (k > 0 ? sepia(c, k) : c);

// ---------- organelles ----------
function nucleus(ctx, x, y, r, o = {}) {
  const k = o.sep ?? 0, a = o.a ?? 1;
  ctx.save(); ctx.globalAlpha *= a;
  ctx.fillStyle = rgba(C(PAL.nucLight, k), .9); ctx.beginPath(); ctx.arc(x, y, r * 1.12, 0, TAU); ctx.fill();
  const g = ctx.createRadialGradient(x - r * .3, y - r * .35, r * .1, x, y, r);
  g.addColorStop(0, rgba(C('#a35a96', k))); g.addColorStop(1, rgba(C(PAL.nucleus, k)));
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  ctx.clip();
  D.texture(ctx, T.stipL, .45, x, y);
  ctx.restore();
  ctx.save(); ctx.globalAlpha *= a;
  D.dot(ctx, x + r * .2, y + r * .15, r * .26, C('#4b1f4c', k));
  ctx.strokeStyle = rgba(C('#45203f', k), .9); ctx.lineWidth = Math.max(1.2, r * .07);
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke();
  ctx.strokeStyle = rgba('#fff4ea', .55); ctx.lineWidth = Math.max(1, r * .08);
  ctx.beginPath(); ctx.arc(x, y, r * .72, Math.PI * 1.05, Math.PI * 1.45); ctx.stroke();
  ctx.restore();
}
function vacuole(ctx, x, y, r, o = {}) {
  if (r < .8) return;
  const k = o.sep ?? 0, a = o.a ?? 1;
  ctx.save(); ctx.globalAlpha *= a;
  const g = ctx.createRadialGradient(x - r * .3, y - r * .3, r * .1, x, y, r);
  g.addColorStop(0, rgba(C('#d9f4ff', k), .95)); g.addColorStop(1, rgba(C(PAL.vac, k), .9));
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  ctx.strokeStyle = rgba(C(PAL.vacDeep, k)); ctx.lineWidth = Math.max(1, r * .09); ctx.stroke();
  D.dot(ctx, x - r * .38, y - r * .38, r * .18, '#ffffff', .9);
  ctx.restore();
}
function food(ctx, x, y, r, dig, col, o = {}) {
  const k = o.sep ?? 0, a = o.a ?? 1;
  ctx.save(); ctx.globalAlpha *= a;
  ctx.fillStyle = rgba(C('#f7e7c8', k), .85); ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  ctx.strokeStyle = rgba(C('#b98a62', k), .9); ctx.lineWidth = Math.max(1, r * .08); ctx.stroke();
  const rc = r * lerp(.72, .25, dig);
  ctx.fillStyle = rgba(C(mix(col, '#a8823d', dig), k)); ctx.beginPath();
  for (let i = 0; i < 18; i++) { const th = TAU * i / 18, rr = rc * (1 + .12 * Math.sin(th * 3 + r)); if (i) ctx.lineTo(x + Math.cos(th) * rr, y + Math.sin(th) * rr); else ctx.moveTo(x + Math.cos(th) * rr, y + Math.sin(th) * rr); }
  ctx.closePath(); ctx.fill();
  if (dig < .7) D.dot(ctx, x - rc * .3, y - rc * .2, rc * .22, C(mix('#1f5d2c', '#7a5a22', dig), k), .8);
  ctx.restore();
}

// ---------- full-colour amoeba ----------
// o: {x,y,R,t,seed,pods,round,wob,stretch,lead,flow,nuc:{a,u,r},cv:{a,u,r,ph},food:[...],sep,alpha}
function body(ctx, o) {
  const R = o.R, k = o.sep ?? 0, a = o.alpha ?? 1, n = o.n ?? 160;
  if (a <= 0) return;
  const out = outline(o, 0, n), inn = outline(o, R * .11, n);
  const lw = Math.max(1.5, R * .024);
  ctx.save(); ctx.globalAlpha *= a; ctx.lineJoin = 'round';
  // soft cast shadow on the substrate
  ctx.save();
  ctx.shadowColor = rgba(C('#1c3a40', k), .3); ctx.shadowBlur = R * .25; ctx.shadowOffsetX = R * .06; ctx.shadowOffsetY = R * .1;
  ctx.fillStyle = rgba(C(PAL.rim, k)); D.shape(ctx, out); ctx.fill();
  ctx.restore();
  // ectoplasm: clear, glassy outer zone
  ctx.save(); D.shape(ctx, out); ctx.clip();
  ctx.fillStyle = rgba(C(PAL.rim, k)); ctx.fillRect(o.x - R * 4, o.y - R * 4, R * 8, R * 8);
  D.texture(ctx, T.hatchL, .5, o.x, o.y);
  // endoplasm: granular, warm
  D.shape(ctx, inn); ctx.clip();
  const g = ctx.createRadialGradient(o.x - R * .25, o.y - R * .3, R * .1, o.x, o.y, R * 1.6);
  g.addColorStop(0, rgba(C('#f7c3a6', k))); g.addColorStop(1, rgba(C(PAL.bodyDeep, k)));
  ctx.fillStyle = g; ctx.fillRect(o.x - R * 4, o.y - R * 4, R * 8, R * 8);
  D.texture(ctx, T.stipD, .42, o.x, o.y);
  D.texture(ctx, T.hatchD, .16, o.x, o.y);
  // streaming granules
  const lead = o.lead ?? 0, fl = o.flow ?? 0, t = o.t ?? 0, sd = o.seed ?? 1, NG = o.grains ?? 70;
  for (let i = 0; i < NG; i++) {
    const h1 = hash(i * 3 + sd * 101), h2 = hash(i * 3 + 1 + sd * 101), h3 = hash(i * 3 + 2 + sd * 101);
    const life = ((t * (.25 + h3 * .2) + h1) % 1 + 1) % 1;
    const th = h1 * TAU + wrap(lead - h1 * TAU) * fl * life * .9;
    const u = clamp(Math.sqrt(h2) * .85 + fl * life * .25 * Math.cos(wrap(th - lead)), 0, .93);
    const p = inside(o, th, u, R * .11), s = (.7 + h3 * 1.6) * R / 170;
    D.dot(ctx, p[0], p[1], s, C(i % 3 ? PAL.gran : '#8e3f45', k), (.35 + .55 * h3) * Math.sin(Math.PI * life));
  }
  ctx.restore();
  // organelles
  for (const f of o.food || []) {
    const p = f.xy || inside(o, f.a, f.u, R * .11);
    food(ctx, p[0], p[1], f.r, f.dig ?? 0, f.col ?? '#5aa64a', { sep: k });
  }
  if (o.cv) {
    const p = inside(o, o.cv.a, o.cv.u, R * .11), ph = o.cv.ph ?? .5;
    const s = ph < .82 ? Math.sqrt(ph / .82) : 1 - easeOut((ph - .82) / .18);
    vacuole(ctx, p[0], p[1], o.cv.r * s, { sep: k });
  }
  if (o.nuc && !o.noNuc) { const p = inside(o, o.nuc.a, o.nuc.u, R * .11); nucleus(ctx, p[0], p[1], o.nuc.r, { sep: k }); }
  // membranes: inner boundary, outer edge, rim highlight
  ctx.strokeStyle = rgba(C('#fff6ec', k), .5); ctx.lineWidth = lw * .6; ctx.setLineDash([lw * 3, lw * 2.5]);
  D.shape(ctx, inn); ctx.stroke(); ctx.setLineDash([]);
  ctx.strokeStyle = rgba(C(PAL.edge, k)); ctx.lineWidth = lw; D.shape(ctx, out); ctx.stroke();
  const hi = out.filter((_, i) => i / n > .55 && i / n < .8).map(([x, y]) => [lerp(x, o.x, .045), lerp(y, o.y, .045)]);
  ctx.strokeStyle = rgba('#fffaf2', .75); ctx.lineWidth = lw * 1.1; ctx.lineCap = 'round';
  D.shape(ctx, hi, false); ctx.stroke();
  ctx.restore();
}

// ---------- line-art (x-ray) amoeba ----------
function lines(ctx, o, p = 1, opt = {}) {
  const R = o.R, a = opt.a ?? 1, col = opt.col ?? PAL.cream, n = o.n ?? 160;
  if (a <= 0 || p <= 0) return;
  ctx.save(); ctx.globalAlpha *= a; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  const out = outline(o, 0, n), inn = outline(o, R * .11, n);
  ctx.strokeStyle = rgba(col); ctx.lineWidth = opt.w ?? 2.4;
  D.strokePart(ctx, out, ease(p), true);
  ctx.globalAlpha *= .55; ctx.lineWidth = 1.3; ctx.setLineDash([6, 6]);
  D.strokePart(ctx, inn, ease(clamp(p * 1.3 - .3)), true);
  ctx.setLineDash([]); ctx.globalAlpha /= .55;
  const q = clamp(p * 1.6 - .6);
  if (q > 0 && !opt.bare) {
    ctx.lineWidth = 1.6;
    if (o.nuc && !o.noNuc) { const c = inside(o, o.nuc.a, o.nuc.u, R * .11); D.arcPart(ctx, c[0], c[1], o.nuc.r, -1.6, q); D.arcPart(ctx, c[0] + o.nuc.r * .2, c[1] + o.nuc.r * .15, o.nuc.r * .26, 0, q); }
    if (o.cv) { const c = inside(o, o.cv.a, o.cv.u, R * .11); D.arcPart(ctx, c[0], c[1], o.cv.r * .9, 0, q); }
    for (const f of o.food || []) { const c = f.xy || inside(o, f.a, f.u, R * .11); D.arcPart(ctx, c[0], c[1], f.r, 1, q); }
    const NG = 40, sd = o.seed ?? 1;
    for (let i = 0; i < NG; i++) {
      const c = inside(o, hash(i * 7 + sd) * TAU, Math.sqrt(hash(i * 7 + 3 + sd)) * .85, R * .11);
      D.dot(ctx, c[0], c[1], 1.6, col, q * .7);
    }
  }
  ctx.restore();
}

// ---------- mitosis inside a nucleus ----------
// p: 0 prophase .. 1 telophase; returns the two daughter-nucleus centres
function mitosis(ctx, x, y, r, p, axis, o = {}) {
  const lc = o.line ?? PAL.cream, bc = o.blue ?? PAL.blue, a = o.a ?? 1, chrom = o.chrom ?? '#f08bb8';
  const ux = Math.cos(axis), uy = Math.sin(axis), vx = -uy, vy = ux;
  const pole = r * 1.55;
  const sep = ease(ss(.5, .78, p)) * r * 1.15;
  ctx.save(); ctx.globalAlpha *= a; ctx.lineCap = 'round';
  // envelope dissolves then reforms around two daughters
  const env = 1 - ss(.18, .34, p);
  if (env > 0) { ctx.strokeStyle = rgba(lc, env); ctx.lineWidth = 2; ctx.setLineDash([9, 5 + (1 - env) * 14]); ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke(); ctx.setLineDash([]); }
  // spindle: lens-shaped arcs between the poles, drawn like compass construction
  const sp = ss(.2, .42, p) * (1 - ss(.82, .97, p));
  if (sp > 0) {
    ctx.strokeStyle = rgba(bc, .85 * sp); ctx.lineWidth = 1.4;
    const P1 = [x - ux * (pole + sep * .3), y - uy * (pole + sep * .3)], P2 = [x + ux * (pole + sep * .3), y + uy * (pole + sep * .3)];
    for (let i = -4; i <= 4; i++) {
      const off = i * r * .2, mx = x + vx * off * 1.4, my = y + vy * off * 1.4;
      const pts = [];
      for (let s = 0; s <= 20; s++) {
        const u = s / 20, b = 4 * u * (1 - u);
        pts.push([lerp(P1[0], P2[0], u) + vx * off * 1.4 * b, lerp(P1[1], P2[1], u) + vy * off * 1.4 * b]);
      }
      D.strokePart(ctx, pts, ss(.2 + Math.abs(i) * .02, .4 + Math.abs(i) * .02, p), false);
      void mx; void my;
    }
    for (const P of [P1, P2]) {
      for (let j = 0; j < 10; j++) { const an = TAU * j / 10; D.line(ctx, P[0], P[1], P[0] + Math.cos(an) * r * .35, P[1] + Math.sin(an) * r * .35, sp); }
      D.glow(ctx, P[0], P[1], r * .5, '#9fb6ff', .6 * sp);
      D.dot(ctx, P[0], P[1], 3, '#e8eeff', sp);
    }
  }
  // chromosomes: scattered threads -> condensed X's -> metaphase plate -> pulled to the poles
  const N = 6, cond = ss(0, .2, p), align = ease(ss(.3, .48, p));
  for (let i = 0; i < N; i++) {
    const h1 = hash(i * 5 + 1), h2 = hash(i * 5 + 2), h3 = hash(i * 5 + 3);
    const sx = x + Math.cos(h1 * TAU) * r * .55 * Math.sqrt(h2), sy = y + Math.sin(h1 * TAU) * r * .55 * Math.sqrt(h2);
    const off = (i - (N - 1) / 2) * r * .26;
    const mx = x + vx * off, my = y + vy * off;
    const cx = lerp(sx, mx, align), cy = lerp(sy, my, align);
    const len = lerp(r * .5, r * .26, cond), ang = lerp(h3 * TAU, axis + Math.PI / 2, align);
    const th = lerp(2, 6.5, cond);
    ctx.strokeStyle = rgba(chrom, .95); ctx.lineWidth = th;
    for (const s of [-1, 1]) {
      const dx = s * ux * sep, dy = s * uy * sep;
      const bend = (p > .5 ? 1 : 0) * ss(.5, .62, p) * len * .5 * -s;
      const bx = Math.cos(ang) * len / 2, by = Math.sin(ang) * len / 2, kx = s * ux * th * .45 * cond, ky = s * uy * th * .45 * cond;
      ctx.beginPath();
      ctx.moveTo(cx + dx + kx - bx + ux * bend, cy + dy + ky - by + uy * bend);
      if (cond < .3) ctx.bezierCurveTo(cx + dx + by * 1.4, cy + dy - bx * 1.4, cx + dx - by * 1.4, cy + dy + bx * 1.4, cx + dx + kx + bx, cy + dy + ky + by);
      else ctx.quadraticCurveTo(cx + dx + kx, cy + dy + ky, cx + dx + kx + bx + ux * bend, cy + dy + ky + by + uy * bend);
      ctx.stroke();
    }
  }
  // new envelopes
  const ne = ss(.8, .96, p);
  const n1 = [x - ux * sep, y - uy * sep], n2 = [x + ux * sep, y + uy * sep];
  if (ne > 0) {
    ctx.strokeStyle = rgba(lc, ne); ctx.lineWidth = 2;
    for (const c of [n1, n2]) D.arcPart(ctx, c[0], c[1], r * .72, axis, ne);
  }
  ctx.restore();
  return [n1, n2];
}

// cytokinesis neck between two circles (centres ±d along axis), half-width n at the waist
function neck(cx, cy, axis, d, R1, n) {
  const al = clamp(Math.acos(clamp(d / R1, -1, 1)) + .45, .8, 2.2);
  const A = [-d + R1 * Math.cos(al), -R1 * Math.sin(al)], B = [d - R1 * Math.cos(al), -R1 * Math.sin(al)], M = [0, -n];
  const h = Math.hypot(A[0] - M[0], A[1] - M[1]) * .33;
  const top = [];
  const bz = (p0, c1, c2, p3) => { for (let s = 0; s <= 12; s++) { const u = s / 12, v = 1 - u; top.push([v * v * v * p0[0] + 3 * v * v * u * c1[0] + 3 * v * u * u * c2[0] + u * u * u * p3[0], v * v * v * p0[1] + 3 * v * v * u * c1[1] + 3 * v * u * u * c2[1] + u * u * u * p3[1]]); } };
  bz(A, [A[0] + Math.sin(al) * h, A[1] + Math.cos(al) * h], [M[0] - h, M[1]], M);
  bz(M, [M[0] + h, M[1]], [B[0] - Math.sin(al) * h, B[1] + Math.cos(al) * h], B);
  const all = top.concat(top.slice().reverse().map(([x, y]) => [x, -y]));
  const c = Math.cos(axis), s = Math.sin(axis);
  return all.map(([x, y]) => [cx + x * c - y * s, cy + x * s + y * c]);
}

// two-lobed body during cytokinesis: k 0 (one round cell) .. 1 (two cells just parted)
function dividing(ctx, o, k, mode = 'colour', opt = {}) {
  const R = o.R, Rd = lerp(R, R * .8, ss(0, .6, k)), d = lerp(0, R * 1.08, ease(k)), axis = o.axis ?? 0;
  const nw = lerp(Rd, 0, ss(.12, .97, k));
  const ux = Math.cos(axis), uy = Math.sin(axis);
  const mk = (s) => ({ x: o.x + s * ux * d, y: o.y + s * uy * d, R: Rd, t: o.t, seed: (o.seed ?? 1) + (s > 0 ? 7 : 3), round: lerp(1, .55, ss(.85, 1, k)), wob: .8, pods: s > 0 ? [{ a: axis, L: Rd * .9 * ss(.8, 1, k), w: Rd * .32 }] : [{ a: axis + Math.PI, L: Rd * .9 * ss(.8, 1, k), w: Rd * .32 }] });
  const b1 = mk(-1), b2 = mk(1);
  const outs = [outline(b1, 0, 120), outline(b2, 0, 120)], inns = [outline(b1, Rd * .11, 120), outline(b2, Rd * .11, 120)];
  if (nw > 1) { const a = neck(o.x, o.y, axis, d, Rd * .96, nw), b = neck(o.x, o.y, axis, d, Rd * .85, Math.max(0, nw - Rd * .11)); a.poly = b.poly = true; outs.push(a); inns.push(b); }
  const kk = o.sep ?? 0, lw = Math.max(1.5, R * .024);
  ctx.save(); ctx.globalAlpha *= o.alpha ?? 1; ctx.lineJoin = 'round';
  if (mode === 'lines') {
    // union outline: thick light stroke then knock out the interior with the background
    ctx.strokeStyle = rgba(opt.col ?? PAL.cream); ctx.lineWidth = 5;
    for (const p of outs) { D.shape(ctx, p); ctx.stroke(); }
    ctx.fillStyle = opt.bg ?? PAL.night;
    for (const p of outs) { D.shape(ctx, p); ctx.fill(); }
    ctx.strokeStyle = rgba(opt.col ?? PAL.cream, .45); ctx.lineWidth = 1.3; ctx.setLineDash([6, 6]);
    ctx.save(); ctx.beginPath(); for (const p of inns) D.trace(ctx, p); ctx.clip();
    ctx.restore(); ctx.setLineDash([]);
  } else {
    ctx.save(); ctx.shadowColor = rgba(C('#1c3a40', kk), .3); ctx.shadowBlur = R * .25; ctx.shadowOffsetX = R * .06; ctx.shadowOffsetY = R * .1;
    ctx.fillStyle = rgba(C(PAL.rim, kk)); for (const p of outs) { D.shape(ctx, p); ctx.fill(); }
    ctx.restore();
    ctx.strokeStyle = rgba(C(PAL.edge, kk)); ctx.lineWidth = lw * 2;
    for (const p of outs) { D.shape(ctx, p); ctx.stroke(); }
    ctx.fillStyle = rgba(C(PAL.rim, kk)); for (const p of outs) { D.shape(ctx, p); ctx.fill(); }
    ctx.save(); ctx.beginPath(); for (const p of inns) D.trace(ctx, p); ctx.clip();
    const g = ctx.createRadialGradient(o.x - R * .25, o.y - R * .3, R * .1, o.x, o.y, R * 2);
    g.addColorStop(0, rgba(C('#f7c3a6', kk))); g.addColorStop(1, rgba(C(PAL.bodyDeep, kk)));
    ctx.fillStyle = g; ctx.fillRect(o.x - R * 4, o.y - R * 4, R * 8, R * 8);
    D.texture(ctx, T.stipD, .42, o.x, o.y);
    D.texture(ctx, T.hatchD, .16, o.x, o.y);
    ctx.restore();
    const hi = (pts, n) => pts.filter((_, i) => i / n > .55 && i / n < .8);
    ctx.strokeStyle = rgba('#fffaf2', .7); ctx.lineWidth = lw; ctx.lineCap = 'round';
    for (const [p, c] of [[outs[0], b1], [outs[1], b2]]) { D.shape(ctx, hi(p, 120).map(([x, y]) => [lerp(x, c.x, .045), lerp(y, c.y, .045)]), false); ctx.stroke(); }
  }
  ctx.restore();
  return [b1, b2];
}

// ---------- cyst ----------
// p: wall build 0..1; open: hatching 0..1; sep: sepia
function cyst(ctx, x, y, R, o = {}) {
  const p = o.p ?? 1, k = o.sep ?? 0, open = o.open ?? 0, t = o.t ?? 0, nn = o.nuclei ?? 1;
  ctx.save(); ctx.globalAlpha *= o.alpha ?? 1;
  const wall = (rr, amp, f, sd) => { const pts = []; for (let i = 0; i < 90; i++) { const th = TAU * i / 90; const r = rr * (1 + amp * noise2(Math.cos(th) * f + sd, Math.sin(th) * f, sd)); pts.push([x + Math.cos(th) * r, y + Math.sin(th) * r]); } return pts; };
  const outer = wall(R * 1.18, .05, 2.2, 3), mid = wall(R * 1.08, .025, 3, 5);
  const wp = ease(ss(.15, .85, p)) * (1 - ss(.0, .5, open));
  // shadow
  ctx.save(); ctx.shadowColor = 'rgba(30,20,10,0.35)'; ctx.shadowBlur = R * .3; ctx.shadowOffsetY = R * .12;
  ctx.fillStyle = rgba(C('#e8b48f', k)); ctx.beginPath(); ctx.arc(x, y, R, 0, TAU); ctx.fill(); ctx.restore();
  // inner cytoplasm ball
  ctx.save(); ctx.beginPath(); ctx.arc(x, y, R, 0, TAU); ctx.clip();
  const g = ctx.createRadialGradient(x - R * .3, y - R * .35, R * .1, x, y, R * 1.1);
  g.addColorStop(0, rgba(C('#f8cdb0', k))); g.addColorStop(1, rgba(C('#d98670', k)));
  ctx.fillStyle = g; ctx.fillRect(x - R, y - R, R * 2, R * 2);
  D.texture(ctx, T.stipD, .5, x, y);
  ctx.restore();
  // nuclei multiply inside (multiple fission)
  for (let i = 0; i < nn; i++) {
    const a = i * 2.39996 + .5, rr = nn === 1 ? 0 : R * .5 * Math.sqrt((i + .5) / nn);
    nucleus(ctx, x + Math.cos(a) * rr, y + Math.sin(a) * rr, R * (nn === 1 ? .3 : .3 / Math.sqrt(nn) * 1.3), { sep: k });
  }
  // wall layers
  if (wp > 0) {
    ctx.save(); ctx.globalAlpha *= wp;
    ctx.beginPath(); D.trace(ctx, outer); ctx.arc(x, y, R * .99, 0, TAU, true); ctx.fillStyle = rgba(C('#b07a4c', k)); ctx.fill('evenodd');
    ctx.save(); ctx.clip('evenodd'); D.texture(ctx, T.hatchX, .55, x, y); D.texture(ctx, T.stipD, .5, x, y); ctx.restore();
    ctx.beginPath(); D.trace(ctx, mid); ctx.arc(x, y, R * .99, 0, TAU, true); ctx.fillStyle = rgba(C('#e5c38e', k), .9); ctx.fill('evenodd');
    ctx.strokeStyle = rgba(C('#5a3622', k)); ctx.lineWidth = Math.max(1.5, R * .03); D.shape(ctx, outer); ctx.stroke();
    ctx.lineWidth = Math.max(1, R * .015); D.shape(ctx, mid); ctx.stroke();
    ctx.strokeStyle = rgba('#fff3dc', .6); ctx.lineWidth = Math.max(1.2, R * .03); ctx.beginPath(); ctx.arc(x, y, R * 1.12, Math.PI * 1.08, Math.PI * 1.42); ctx.stroke();
    ctx.restore();
  }
  // cracks as it hatches
  if (open > 0) {
    ctx.strokeStyle = rgba('#3a2216', clamp(open * 3)); ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    for (let c = 0; c < 4; c++) {
      const a0 = c * 1.7 + .4, pts = [];
      for (let s = 0; s <= 5; s++) { const r = R * (1.2 - s * .1), a = a0 + Math.sin(s * 2.3 + c) * .18; pts.push([x + Math.cos(a) * r, y + Math.sin(a) * r]); }
      D.strokePart(ctx, pts, clamp(open * 4 - c * .4), false, false);
    }
  }
  void t;
  ctx.restore();
}

// ---------- crowd member ----------
function mini(ctx, o) {
  const R = o.R, k = o.sep ?? 0, a = o.alpha ?? 1;
  if (a <= 0 || R < 1) return;
  const out = outline(o, 0, 56);
  ctx.save(); ctx.globalAlpha *= a; ctx.lineJoin = 'round';
  ctx.fillStyle = rgba(C(PAL.rim, k)); D.shape(ctx, out); ctx.fill();
  ctx.fillStyle = rgba(C(PAL.body, k)); D.shape(ctx, outline(o, R * .14, 40)); ctx.fill();
  ctx.strokeStyle = rgba(C(PAL.edge, k)); ctx.lineWidth = Math.max(1, R * .05); D.shape(ctx, out); ctx.stroke();
  const n = inside(o, (o.seed ?? 1) * 2, .25);
  D.dot(ctx, n[0], n[1], R * .22, C(PAL.nucleus, k));
  ctx.restore();
}

module.exports = { radius, outline, inside, body, lines, mitosis, neck, dividing, cyst, mini, nucleus, vacuole, food };
