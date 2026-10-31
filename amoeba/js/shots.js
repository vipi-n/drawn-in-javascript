// The nine shots. Each receives local time lt (s) and global time t.
const { W, H, TAU, BAR, clamp, lerp, inv, ss, ease, easeOut, easeIn, backOut, pulse, hash, noise1, rgba, mix, PAL } = require('./core');
const D = require('./draw');
const A = require('./amoeba');
const Wd = require('./world');
const { T } = require('./tex');
const { cam, screen } = Wd;

function fillScreen(ctx, col, a = 1) { if (a <= 0) return; screen(ctx); ctx.fillStyle = rgba(col, a); ctx.fillRect(0, 0, W, H); }
function vignetteDark(ctx, a) { screen(ctx); const g = ctx.createRadialGradient(540, 540, 300, 540, 540, 800); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(5,3,8,${a})`); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
// screen position of a world point under the current transform
function proj(ctx, x, y) { const m = ctx.getTransform(); return [m.a * x + m.c * y + m.e, m.b * x + m.d * y + m.f]; }
function label(ctx, ax, ay, tx, ty, s, p, o = {}) {
  if (p <= 0) return;
  const col = o.col ?? PAL.cream, right = tx >= ax;
  ctx.save(); ctx.strokeStyle = rgba(col, .85); ctx.lineWidth = 1.4; ctx.lineCap = 'round';
  D.dot(ctx, ax, ay, 3.5, col, clamp(p * 4));
  const ex = tx + (right ? -14 : 14);
  const q = ease(clamp(p * 1.6));
  const L1 = Math.hypot(ex - ax, ty - ay), L2 = Math.abs(tx - ex), f = L1 / (L1 + L2);
  D.line(ctx, ax, ay, lerp(ax, ex, clamp(q / f)), lerp(ay, ty, clamp(q / f)));
  if (q > f) D.line(ctx, ex, ty, lerp(ex, tx, (q - f) / (1 - f)), ty);
  ctx.restore();
  D.text(ctx, s, tx + (right ? 8 : -8), ty + 8, { font: 'DidotI', size: o.size ?? 27, color: col, align: right ? 'left' : 'right', reveal: clamp(p * 1.4 - .4) });
}

// =====================================================================
// the crawling hero (shared by the pond callout and shot 3)
// =====================================================================
function crawler(t, R = 150) {
  const x = 300 + (t - 9) * 48, y = 560 + Math.sin(t * .4) * 25, lead = -.15 + .25 * Math.sin(t * .3);
  const pods = [{ a: lead, L: R * (1.35 + .3 * Math.sin(t * .9)), w: R * .38 }];
  for (let i = 0; i < 14; i++) {
    const ts = 3 + i * 1.05, u = t - ts, life = 3.4;
    if (u <= 0 || u >= life) continue;
    const L = R * (1.15 + .5 * hash(i + 5)) * Math.pow(Math.sin(Math.PI * u / life), 1.5);
    pods.push({ a: lead + (hash(i) - .5) * 2.6, L, w: R * (.24 + .1 * hash(i + 9)) });
  }
  return {
    x, y, R, t, seed: 3, pods, lead, flow: .9,
    nuc: { a: Math.PI + .4, u: .25, r: R * .2 }, cv: { a: Math.PI - .9, u: .62, r: R * .15, ph: ((t / BAR) % 1 + 1) % 1 },
    food: [{ a: .9, u: .5, r: R * .085, dig: .3 }, { a: 2.5, u: .55, r: R * .07, dig: .65 }, { a: -2.3, u: .45, r: R * .065, dig: .1, col: '#c76fa3' }],
  };
}
const crawlCamX = (t) => lerp(520, 700, inv(11.25, 20, t));

// =====================================================================
// S1 — reticle construction, line amoeba, title (0–5)
// =====================================================================
function s1(ctx, lt, t) {
  fillScreen(ctx, PAL.night);
  vignetteDark(ctx, .6);
  const cx = 540, cy = 480;
  screen(ctx);
  D.glow(ctx, cx, cy, 70, PAL.gold, ss(0, .3, lt) * (1 - ss(1.6, 2.4, lt)) * (.6 + .4 * Math.sin(lt * 6)));
  ctx.lineCap = 'round';
  // compass construction
  ctx.strokeStyle = rgba(PAL.blue, .9); ctx.lineWidth = 1.6;
  const p1 = ease(inv(.25, 1.4, lt)), tip1 = D.arcPart(ctx, cx, cy, 330, -Math.PI / 2, p1);
  ctx.lineWidth = 1.1;
  const p2 = ease(inv(.55, 1.6, lt)), tip2 = D.arcPart(ctx, cx, cy, 304, Math.PI / 2, p2, -1);
  if (p1 < 1) D.spark(ctx, tip1, 1, ss(.25, .35, lt));
  if (p2 > 0 && p2 < 1) D.spark(ctx, tip2, .8);
  const pc = ease(inv(.7, 1.5, lt));
  ctx.strokeStyle = rgba(PAL.blue, .55);
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) D.line(ctx, cx + dx * 40, cy + dy * 40, cx + dx * (40 + 300 * pc), cy + dy * (40 + 300 * pc));
  ctx.strokeStyle = rgba(PAL.blue, .8); ctx.lineWidth = 1.2;
  for (let i = 0; i < 72; i++) {
    const a = -Math.PI / 2 + TAU * i / 72, pp = ss(.9 + i * .012, 1.0 + i * .012, lt), L = i % 6 === 0 ? 20 : 9;
    if (pp > 0) D.line(ctx, cx + Math.cos(a) * 304, cy + Math.sin(a) * 304, cx + Math.cos(a) * (304 + L * pp), cy + Math.sin(a) * (304 + L * pp));
  }
  // vesica piscis — the shape of a cell about to become two
  ctx.strokeStyle = rgba(PAL.blueDim, .9); ctx.lineWidth = 1.1;
  const pv = ease(inv(1.3, 2.3, lt));
  const v1 = D.arcPart(ctx, cx - 150, cy, 150, 0, pv), v2 = D.arcPart(ctx, cx + 150, cy, 150, Math.PI, pv);
  if (pv > 0 && pv < 1) { D.spark(ctx, v1, .7); D.spark(ctx, v2, .7); }
  // the amoeba grows out of the centre point as a line drawing, then colour develops underneath
  const grow = ease(inv(1.5, 3.2, lt));
  const o = {
    x: cx, y: cy, R: lerp(20, 118, ease(inv(1.5, 2.3, lt))), t: t * .8, seed: 11,
    pods: [{ a: -.5, L: 150 * grow, w: 36 }, { a: 2.2, L: 120 * ease(inv(2.2, 3.6, lt)), w: 30 }, { a: 1.0, L: 100 * ease(inv(2.6, 4, lt)), w: 26 }],
    lead: -.5, flow: .8, nuc: { a: 3.6, u: .25, r: 24 }, cv: { a: 2.6, u: .62, r: 17, ph: (lt / BAR) % 1 }, food: [{ a: .4, u: .5, r: 10, dig: .3 }],
  };
  const col = ss(3.0, 4.1, lt);
  if (col > 0) {
    // colour develops from the centre outward
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, 30 + 300 * ease(col), 0, TAU); ctx.clip();
    A.body(ctx, o);
    ctx.restore();
  }
  A.lines(ctx, o, ease(inv(1.5, 2.9, lt)), { a: 1 - col * .75 });
  if (lt > 2.4) {
    const nc = A.inside(o, o.nuc.a, o.nuc.u, o.R * .11), cv = A.inside(o, o.cv.a, o.cv.u, o.R * .11);
    ctx.strokeStyle = rgba(PAL.blue, .8 * (1 - col * .6)); ctx.lineWidth = 1.2;
    D.arcPart(ctx, nc[0], nc[1], 44, 0, ease(inv(2.4, 3.1, lt)));
    D.arcPart(ctx, cv[0], cv[1], 30, 1, ease(inv(2.6, 3.3, lt)));
  }
  // title
  D.text(ctx, 'AMOEBA', 540, 905, { font: 'Didot', size: 64, track: 26, align: 'center', color: PAL.cream, reveal: inv(2.5, 3.5, lt) });
  D.text(ctx, 'the life cycle of a single cell', 540, 952, { font: 'DidotI', size: 27, align: 'center', color: PAL.gold, alpha: ss(3.3, 3.9, lt) });
  ctx.strokeStyle = rgba(PAL.gold, .7 * ss(3.1, 3.8, lt)); ctx.lineWidth = 1;
  D.line(ctx, 540 - 140 * ss(3.1, 3.8, lt), 924, 540 + 140 * ss(3.1, 3.8, lt), 924);
}

// =====================================================================
// S2 — the pond, push in to the leaf, callout into a drop (5–11.25)
// =====================================================================
function s2(ctx, lt, t) {
  const pz = ease(inv(.2, 5.2, lt));
  const z = lerp(1, 2.3, pz), cx = lerp(540, 450, pz), cy = lerp(540, 860, pz);
  Wd.pond(ctx, cx, cy, z, t, { dragon: true, level: 556 });
  cam(ctx, cx, cy, z);
  const leaf = proj(ctx, 430, 916);
  screen(ctx);
  const pc = inv(3.4, 4.6, lt), grow = ease(inv(5.0, 6.25, lt));
  const dst = { x: lerp(700, 540, grow), y: lerp(350, 540, grow), r: lerp(270, 800, grow) };
  const mz = lerp(.55, 1, grow);
  if (pc > 0) {
    const inner = () => {
      Wd.micro(ctx, crawlCamX(t), 540, mz, t, { sx: dst.x, sy: dst.y });
      cam(ctx, crawlCamX(t), 540, mz, dst.x, dst.y);
      A.body(ctx, crawler(t));
      screen(ctx);
    };
    D.callout(ctx, { x: leaf[0], y: leaf[1], r: 26 * z * .8 }, dst, pc, inner, { col: '#fff6e0', bg: '#9fd8cf', a: 1 - grow });
    // red scale marks: magnification bar under the lens
    const pr = inv(4.4, 5.0, lt) * (1 - grow);
    if (pr > 0) {
      const y = dst.y + dst.r + 34, x0 = dst.x - 120, x1 = dst.x + 120;
      ctx.strokeStyle = rgba(PAL.red, pr); ctx.lineWidth = 2.4; D.line(ctx, x0, y, lerp(x0, x1, ease(pr)), y);
      for (let i = 0; i <= 6; i++) { const x = lerp(x0, x1, i / 6); if ((x - x0) / (x1 - x0) <= ease(pr) + 1e-3) D.line(ctx, x, y - (i % 3 ? 6 : 12), x, y + (i % 3 ? 6 : 12)); }
      D.text(ctx, '0.5 mm', dst.x, y + 40, { font: 'DidotI', size: 24, color: PAL.red, align: 'center', alpha: ss(.5, 1, pr) });
    }
  }
}

// =====================================================================
// S3 — crawling on false feet; x-ray anatomy (11.25–20)
// =====================================================================
function s3(ctx, lt, t) {
  const cx = crawlCamX(t), z = 1;
  Wd.micro(ctx, cx, 540, z, t);
  cam(ctx, cx, 540, z);
  const o = crawler(t);
  A.body(ctx, o);
  // red diagram: trail with ticks behind, heading arrow ahead, angle to the horizontal
  const dg = ss(.6, 1.2, lt) * (1 - ss(3.6, 4.0, lt));
  if (dg > 0) {
    const trail = [];
    for (let s = 9.5; s <= t; s += .1) { const c = crawler(s); trail.push([c.x, c.y + 0]); }
    if (trail.length > 2) D.tickPath(ctx, trail.slice(0, -1), 1, PAL.red, dg * .9, 30, 8, 2.4, true);
    const hx = o.x + Math.cos(o.lead) * o.R * 1.9, hy = o.y + Math.sin(o.lead) * o.R * 1.9;
    D.arrow(ctx, o.x, o.y, hx + Math.cos(o.lead) * 110, hy + Math.sin(o.lead) * 110, ease(inv(.8, 1.8, lt)), PAL.red, 3, 18, dg);
    ctx.strokeStyle = rgba(PAL.red, dg * .7); ctx.lineWidth = 1.6; ctx.setLineDash([4, 6]);
    D.line(ctx, o.x, o.y, o.x + o.R * 2.6, o.y, ease(inv(1, 1.8, lt))); ctx.setLineDash([]);
    D.angleArc(ctx, o.x, o.y, o.R * 2.2, 0, o.lead, ease(inv(1.4, 2.2, lt)), PAL.red, dg, 2.2);
    D.dot(ctx, o.x, o.y, 5, PAL.red, dg);
  }
  // x-ray: colour drains to a night-blue line drawing with labelled anatomy
  const xr = ss(3.75, 4.35, lt) * (1 - ss(7.1, 7.8, lt));
  if (xr > 0) {
    fillScreen(ctx, PAL.night, xr * .94);
    cam(ctx, cx, 540, z);
    const dp = inv(3.8, 4.8, lt);
    A.lines(ctx, o, dp, { a: xr });
    ctx.strokeStyle = rgba(PAL.blue, .75 * xr); ctx.lineWidth = 1.3;
    D.arcPart(ctx, o.x, o.y, o.R * 2.05, -Math.PI / 2, ease(inv(4.0, 5.0, lt)));
    for (let i = 0; i < 48; i++) { const a = TAU * i / 48, p = ss(4.3 + i * .01, 4.5 + i * .01, lt); if (p > 0) D.line(ctx, o.x + Math.cos(a) * o.R * 2.05, o.y + Math.sin(a) * o.R * 2.05, o.x + Math.cos(a) * (o.R * 2.05 + (i % 4 ? 7 : 15) * p), o.y + Math.sin(a) * (o.R * 2.05 + (i % 4 ? 7 : 15) * p)); }
    const nc = A.inside(o, o.nuc.a, o.nuc.u, o.R * .11), cv = A.inside(o, o.cv.a, o.cv.u, o.R * .11), fd = A.inside(o, o.food[0].a, o.food[0].u, o.R * .11);
    const tipA = o.lead, tipR = A.radius(o, tipA), tip = [o.x + Math.cos(tipA) * tipR, o.y + Math.sin(tipA) * tipR];
    D.arcPart(ctx, nc[0], nc[1], o.nuc.r * 1.6, 0, ease(inv(4.4, 5.0, lt)));
    D.arcPart(ctx, cv[0], cv[1], o.cv.r * 1.7, 0, ease(inv(4.9, 5.5, lt)));
    D.arcPart(ctx, fd[0], fd[1], o.food[0].r * 2, 0, ease(inv(5.4, 6.0, lt)));
    const S = (p) => proj(ctx, p[0], p[1]);
    const n = S(nc), c = S(cv), f = S(fd), tp = S(tip);
    screen(ctx);
    ctx.globalAlpha = xr;
    label(ctx, n[0] - o.nuc.r * 1.1, n[1] - o.nuc.r * 1.1, n[0] - 170, n[1] - 160, 'nucleus', inv(4.5, 5.3, lt));
    label(ctx, c[0] - o.cv.r * 1.2, c[1] + o.cv.r * 1.2, c[0] - 150, c[1] + 170, 'contractile vacuole', inv(5.0, 5.8, lt));
    label(ctx, f[0] + o.food[0].r * 1.4, f[1] + o.food[0].r * 1.4, f[0] + 140, f[1] + 180, 'food vacuole', inv(5.5, 6.3, lt));
    label(ctx, tp[0] + 8, tp[1] - 8, tp[0] + 70, tp[1] - 170, 'pseudopod', inv(6.0, 6.8, lt), { col: PAL.gold });
    ctx.globalAlpha = 1;
  }
}

// =====================================================================
// S4 — phagocytosis + digestion callout + contractile vacuole (20–27.5)
// =====================================================================
function feedState(lt, t) {
  const R = 150, ox = 430 + lt * 6, oy = 610;
  // alga swims in along a wavy path, then is carried inward once engulfed
  const swim = ease(inv(0, 2.6, lt));
  let ax = lerp(930, ox + R * 1.42 * Math.cos(-.62), swim) + Math.sin(lt * 5) * 10 * (1 - swim);
  let ay = lerp(230, oy + R * 1.42 * Math.sin(-.62), swim) + Math.cos(lt * 4) * 14 * (1 - swim);
  const inward = ease(inv(3.6, 5.2, lt));
  const fin = [ox + Math.cos(-.62) * R * .45, oy + Math.sin(-.62) * R * .45];
  ax = lerp(ax, fin[0], inward); ay = lerp(ay, fin[1], inward);
  const dir = Math.atan2(ay - oy, ax - oy * 0 - ox);
  const reach = ease(inv(1.0, 2.6, lt)) * (1 - ease(inv(3.6, 5.0, lt)));
  const close = ease(inv(2.4, 3.4, lt));
  const pods = [
    { a: -.62 - lerp(.5, .14, close), L: R * 1.75 * reach, w: R * .3 },
    { a: -.62 + lerp(.5, .14, close), L: R * 1.75 * reach, w: R * .3 },
    { a: 2.6, L: R * .7 * (.5 + .5 * Math.sin(lt * .8)), w: R * .3 },
  ];
  const cvPh = ((t / BAR) % 1 + 1) % 1;
  const o = { x: ox, y: oy, R, t, seed: 3, pods, lead: -.62, flow: .7 + .3 * reach, nuc: { a: Math.PI + .4, u: .25, r: R * .2 }, cv: { a: Math.PI - .9, u: .62, r: R * .17, ph: cvPh }, food: [{ a: 2.5, u: .55, r: R * .07, dig: .65 }] };
  return { o, ax, ay, dir, engulfed: close > .8, inward };
}
function s4(ctx, lt, t) {
  const z = 1.18, cx = 560, cy = 540;
  Wd.micro(ctx, cx + lt * 4, cy, z, t + 30);
  cam(ctx, cx + lt * 4, cy, z);
  const st = feedState(lt, t), o = st.o;
  A.body(ctx, o);
  // the alga: free, then wrapped in a food vacuole
  const vac = ss(3.0, 3.8, lt);
  if (vac > 0) { ctx.fillStyle = rgba('#f7e7c8', .85 * vac); ctx.beginPath(); ctx.arc(st.ax, st.ay, 30, 0, TAU); ctx.fill(); D.ring(ctx, st.ax, st.ay, 30, '#b98a62', vac, 2); }
  Wd.alga(ctx, st.ax, st.ay, lerp(24, 21, vac), st.dir + Math.PI + Math.sin(lt * 3) * .2 * (1 - vac), t, { noFlag: vac > .5, dig: ss(4.8, 7.4, lt) * .6 });
  // contractile vacuole squirts water out each bar
  const ph = o.cv.ph, since = (ph - .82) / .18 * BAR * .18;
  if (ph > .82) {
    const a = o.cv.a, rr = A.radius(o, a), px = o.x + Math.cos(a) * rr, py = o.y + Math.sin(a) * rr;
    for (let i = 0; i < 3; i++) { const r = 8 + since * 160 + i * 14; ctx.strokeStyle = rgba(PAL.vacDeep, Math.max(0, .8 - since * 2.4)); ctx.lineWidth = 2.4; ctx.beginPath(); ctx.arc(px, py, r, a - .6, a + .6); ctx.stroke(); }
  }
  // red diagram: the two pseudopods' reach, as angle arcs
  const dg = ss(1.0, 1.4, lt) * (1 - ss(3.2, 3.6, lt));
  if (dg > 0) {
    ctx.strokeStyle = rgba(PAL.red, dg * .8); ctx.lineWidth = 1.6; ctx.setLineDash([4, 6]);
    for (const p of o.pods.slice(0, 2)) D.line(ctx, o.x, o.y, o.x + Math.cos(p.a) * (p.L + p.w + 30), o.y + Math.sin(p.a) * (p.L + p.w + 30));
    ctx.setLineDash([]);
    D.angleArc(ctx, o.x, o.y, o.R * 1.25, o.pods[0].a, o.pods[1].a, 1, PAL.red, dg, 2.4);
    D.dot(ctx, o.x, o.y, 5, PAL.red, dg);
  }
  // digestion callout
  const pc = inv(4.2, 5.2, lt);
  if (pc > 0) {
    const src = proj(ctx, st.ax, st.ay);
    screen(ctx);
    const dst = { x: 800, y: 290, r: 205 };
    D.callout(ctx, { x: src[0], y: src[1], r: 40 }, dst, pc, () => {
      screen(ctx);
      const g = ctx.createRadialGradient(dst.x - 60, dst.y - 60, 20, dst.x, dst.y, dst.r);
      g.addColorStop(0, '#fbf1da'); g.addColorStop(1, '#f0c9a8');
      ctx.fillStyle = g; ctx.fillRect(dst.x - dst.r, dst.y - dst.r, dst.r * 2, dst.r * 2);
      D.texture(ctx, T.stipD, .35, dst.x, dst.y); D.texture(ctx, T.hatchD, .15, dst.x, dst.y);
      const dig = ss(5.0, 7.3, lt), mr = 120;
      ctx.fillStyle = 'rgba(250,238,214,.95)'; ctx.beginPath(); ctx.arc(dst.x, dst.y, mr, 0, TAU); ctx.fill();
      D.ring(ctx, dst.x, dst.y, mr, '#a46a4a', 1, 3);
      Wd.alga(ctx, dst.x, dst.y, lerp(70, 34, dig), .3 + lt * .1, t, { noFlag: true, dig });
      // lysosomes arrive and fuse with the membrane
      for (let i = 0; i < 10; i++) {
        const a = TAU * i / 10 + .3, u = ease(inv(4.9 + i * .06, 5.7 + i * .06, lt)), r = lerp(200, mr, u);
        D.dot(ctx, dst.x + Math.cos(a) * r, dst.y + Math.sin(a) * r, lerp(9, 5, u), '#e0662f', 1 - ss(6.0, 6.6, lt) * .7);
        if (u >= 1) D.glow(ctx, dst.x + Math.cos(a) * mr, dst.y + Math.sin(a) * mr, 22, '#ff9a4a', .5 * (1 - ss(6.0, 6.6, lt)));
      }
      // nutrients leak out into the cytoplasm
      for (let i = 0; i < 18; i++) {
        const a = TAU * hash(i + 3), u = ease(inv(6.0 + hash(i) * .5, 7.4, lt)), r = lerp(30, 210, u);
        if (u > 0) D.dot(ctx, dst.x + Math.cos(a) * r, dst.y + Math.sin(a) * r, 4, PAL.gold, 1 - u * .5);
      }
    }, { col: '#3b2a2e', bg: '#f6e3c8' });
  }
}

// =====================================================================
// S5 — growth, time-lapse with tally of hours and a size bracket (27.5–32.5)
// =====================================================================
function s5(ctx, lt, t) {
  const z = .92, cx = 560, cy = 545;
  Wd.micro(ctx, cx, cy, z, t + 60);
  const day = .5 - .5 * Math.cos(lt * TAU / 1.25);
  fillScreen(ctx, '#1c2a4a', day * .28);
  cam(ctx, cx, cy, z);
  const g = ease(inv(.2, 4.4, lt)), R = lerp(130, 200, g), tt = t + lt * 3;
  const lead = lt * 2.2, rd = ss(4.0, 5.0, lt);
  const pods = [];
  for (let i = 0; i < 4; i++) { const a = lead + i * TAU / 4 + Math.sin(tt * .7 + i) * .5, L = R * (.7 + .5 * Math.sin(tt * 1.3 + i * 2)); pods.push({ a, L: Math.max(0, L), w: R * .3 }); }
  const o = { x: 545, y: 560, R, t: tt, seed: 3, pods, round: rd, lead, flow: .8, nuc: { a: Math.PI + .4, u: .25 * (1 - rd), r: R * .2 }, cv: { a: Math.PI - .9, u: .62, r: R * .15, ph: (lt * 1.6) % 1 }, food: [{ a: 1, u: .5, r: R * .07, dig: (lt * .6) % 1 }, { a: -2, u: .55, r: R * .06, dig: (lt * .6 + .5) % 1 }] };
  // ghost of the starting size
  ctx.strokeStyle = rgba(PAL.red, .55 * ss(.3, .8, lt)); ctx.lineWidth = 2; ctx.setLineDash([8, 8]);
  ctx.beginPath(); ctx.arc(o.x, o.y, 130, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
  A.body(ctx, o);
  // prey streaming in
  for (let i = 0; i < 24; i++) {
    const s = i * .18, u = (lt - s) / .55;
    if (u < 0 || u > 1) continue;
    const a = hash(i + 40) * TAU, r = lerp(520, R * .6, easeIn(u)), x = o.x + Math.cos(a) * r, y = o.y + Math.sin(a) * r;
    ctx.save(); ctx.translate(x, y); ctx.rotate(a + u * 4); ctx.fillStyle = rgba(['#c76fa3', '#9c6ccf', '#5fbf4a'][i % 3], 1 - ss(.85, 1, u)); ctx.beginPath(); ctx.roundRect(-10, -4, 20, 8, 4); ctx.fill(); ctx.restore();
  }
  // size bracket
  const bx = o.x - 250, top = o.y - R, bot = o.y + R, pb = ss(.4, 1, lt);
  ctx.strokeStyle = rgba(PAL.red, pb); ctx.lineWidth = 2.6;
  D.line(ctx, bx, o.y, bx, lerp(o.y, top, pb)); D.line(ctx, bx, o.y, bx, lerp(o.y, bot, pb));
  D.line(ctx, bx - 12, top, bx + 12, top, pb); D.line(ctx, bx - 12, bot, bx + 12, bot, pb);
  ctx.setLineDash([3, 6]); ctx.lineWidth = 1.4; D.line(ctx, bx, top, o.x, top, pb); D.line(ctx, bx, bot, o.x, bot, pb); ctx.setLineDash([]);
  screen(ctx);
  const sp = proj(ctx, 0, 0); void sp;
  // tally of hours
  D.tally(ctx, 700, 70, lt * 3.4, '#22303f', 40, .9);
}

// =====================================================================
// S6 — binary fission: mitosis (x-ray), cytokinesis, colony (32.5–45)
// =====================================================================
const GEN_T = [7.5, 8.75, 10.0, 11.25, 11.875];
let LAYER = null;
function layer() {
  if (!LAYER) LAYER = require('./core').C.createCanvas(W, H);
  const c = LAYER.getContext('2d');
  c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, W, H);
  return c;
}
function colonyNode(path) {
  // a cell is a path of left/right choices; returns {x,y,axis,R,birth}
  let x = 540, y = 560, axis = 0, R = 160, birth = GEN_T[0];
  for (let g = 0; g < path.length; g++) {
    const s = path[g] ? 1 : -1, b = GEN_T[g];
    axis = g === 0 ? 0 : axis + Math.PI / 2 + (hash(path.slice(0, g).reduce((a, v, i) => a + (v + 1) * (i + 3) * 17, 7)) - .5) * .9;
    const nb = g + 1 < GEN_T.length ? GEN_T[g + 1] : 99;
    void nb;
    x += s * Math.cos(axis) * R * 1.0; y += s * Math.sin(axis) * R * 1.0;
    birth = b;
  }
  return { x, y, axis, R, birth };
}
function colonyPos(path, lt) {
  // position of the cell at local time lt, including drifting apart after its birth and colony expansion
  const n = colonyNode(path), age = lt - n.birth;
  let parentX = 540, parentY = 560;
  if (path.length > 1) { const p = colonyNode(path.slice(0, -1)); parentX = p.x; parentY = p.y; }
  if (path.length === 1) { parentX = 540; parentY = 560; }
  const s = path[path.length - 1] ? 1 : -1;
  // gen 1 picks up from the hero split (R 200); later gens from the 0.45 s colony split (R 170)
  const sep = path.length === 1 ? 216 + 40 * Math.max(0, age) : 184 * ease(clamp(age / .45)) + 40 * Math.max(0, age - .45);
  let x = parentX + s * Math.cos(n.axis) * sep, y = parentY + s * Math.sin(n.axis) * sep;
  const ex = 1 + .32 * Math.max(0, lt - GEN_T[0]);
  x = 540 + (x - 540) * ex; y = 560 + (y - 560) * ex;
  return [x, y, n.axis];
}
function colonyCell(path, lt, t, z) {
  const [x, y, axis] = colonyPos(path, lt), sd = path.reduce((a, v, i) => a * 2 + v + i, 1);
  const lead = axis + (path[path.length - 1] ? 0 : Math.PI);
  const R = 150 + 10 * Math.sin(sd);
  const age = lt - GEN_T[path.length - 1];
  const pods = [{ a: lead + Math.sin(t + sd) * .4, L: R * (.8 + .3 * Math.sin(t * 1.4 + sd)) * ss(.2, .6, age), w: R * .33 }, { a: lead + 2.2 + Math.sin(t * .7 + sd), L: R * .7 * ss(.4, .9, age) * (.5 + .5 * Math.sin(t * 1.1 + sd)), w: R * .28 }];
  return { x, y, R, t: t + sd, seed: sd % 50, pods, lead, flow: .8, round: 1 - ss(0, .5, age), nuc: { a: Math.PI + .4, u: .2, r: R * .2 }, cv: { a: 2.2, u: .6, r: R * .14, ph: ((t + sd * .3) / BAR) % 1 }, food: [{ a: 1, u: .5, r: R * .07, dig: .4 }], _z: z };
}
function s6(ctx, lt, t) {
  const xr = ss(0, 1.0, lt) * (1 - ss(7.0, 8.0, lt));
  const zin = ease(inv(0, 1.25, lt)), zout = ease(inv(7.8, 12.2, lt));
  const z = lerp(lerp(.92, 1.3, zin), .3, zout), cx = lerp(560, 540, zin), cy = lerp(545, 560, zin);
  const R = 200, ox = lerp(545, 540, zin), oy = 560;
  // backdrop
  if (xr < 1) Wd.micro(ctx, cx, cy, z, t + 90);
  cam(ctx, cx, cy, z);
  const mp = inv(1.25, 5.6, lt), k = inv(5.6, 7.5, lt);
  const roundO = { x: ox, y: oy, R, t: t + 30, seed: 3, wob: .7, round: 1, pods: [], nuc: { a: Math.PI + .4, u: .25 * (1 - zin), r: 40 }, cv: { a: Math.PI - .9, u: .62, r: 30, ph: ((t / BAR) % 1) }, food: [] };
  const NR = lerp(40, 66, ss(1.0, 1.8, lt));
  const nucAt = (b, j) => { const s = j ? 1 : -1; return [lerp(ox + s * NR * 1.15, b.x - s * b.R * .1, ss(0, .7, k)), b.y, lerp(NR * .72, 32, k)]; };
  // colour pass
  const colourPass = () => {
    if (lt < 5.6) A.body(ctx, Object.assign({}, roundO, { noNuc: true, cv: lt < 2 ? roundO.cv : null }));
    else if (lt < GEN_T[0]) {
      const [b1, b2] = A.dividing(ctx, { x: ox, y: oy, R, t: t + 30, seed: 3, axis: 0 }, k);
      [b1, b2].forEach((b, j) => { const [x, y, r] = nucAt(b, j); A.nucleus(ctx, x, y, r); });
    }
    if (lt < 5.6) {
      // in colour the nucleus is drawn whole until mitosis takes over in the x-ray
      if (mp <= 0) A.nucleus(ctx, ox, oy, NR);
      else {
        const nn = A.mitosis(ctx, ox, oy, NR, mp, 0, { line: '#45203f', blue: '#3e5199', chrom: '#a8327a', a: 1 });
        void nn;
      }
    }
  };
  colourPass();
  if (xr > 0) {
    fillScreen(ctx, PAL.night, xr * .96);
    cam(ctx, cx, cy, z);
    ctx.save(); ctx.globalAlpha = xr;
    if (lt < 5.6) {
      A.lines(ctx, roundO, 1, { bare: true });
      A.mitosis(ctx, ox, oy, NR, mp, 0);
      if (mp <= 0) { ctx.strokeStyle = rgba(PAL.cream); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(ox, oy, NR, 0, TAU); ctx.stroke(); }
    } else if (lt < GEN_T[0]) {
      // drawn on its own layer so the knocked-out interior fades as one piece
      const m = ctx.getTransform(), L = layer();
      L.setTransform(m.a, m.b, m.c, m.d, m.e, m.f);
      const [b1, b2] = A.dividing(L, { x: ox, y: oy, R, t: t + 30, seed: 3, axis: 0 }, k, 'lines', { bg: PAL.night });
      [b1, b2].forEach((b, j) => { const [x, y, r] = nucAt(b, j); L.strokeStyle = rgba(PAL.cream); L.lineWidth = 2; L.beginPath(); L.arc(x, y, r, 0, TAU); L.stroke(); });
      screen(ctx); ctx.drawImage(LAYER, 0, 0); cam(ctx, cx, cy, z);
    }
    // blue construction: outer circle, division plane, the two future daughters (vesica piscis)
    ctx.strokeStyle = rgba(PAL.blue, .8); ctx.lineWidth = 1.4;
    const t1 = D.arcPart(ctx, ox, oy, R * 1.2, -Math.PI / 2, ease(inv(.8, 2.2, lt)));
    if (lt < 2.2) D.spark(ctx, t1, 1, ss(.8, 1, lt));
    ctx.setLineDash([10, 8]); D.line(ctx, ox, oy - R * 1.35, ox, oy - R * 1.35 + R * 2.7 * ease(inv(2.6, 3.8, lt))); ctx.setLineDash([]);
    const pv = ease(inv(4.2, 5.6, lt));
    const v1 = D.arcPart(ctx, ox - R * .62, oy, R * .8, Math.PI, pv), v2 = D.arcPart(ctx, ox + R * .62, oy, R * .8, 0, pv);
    if (pv > 0 && pv < 1) { D.spark(ctx, v1, .9); D.spark(ctx, v2, .9); }
    for (let i = 0; i < 9; i++) { const y = oy - R + i * R / 4, p = ss(3.0 + i * .06, 3.3 + i * .06, lt); D.line(ctx, ox - 9 * p, y, ox + 9 * p, y); }
    ctx.restore();
  }
  // the moment of parting
  const pop = inv(7.4, 8.0, lt);
  if (pop > 0 && pop < 1) { cam(ctx, cx, cy, z); for (let i = 0; i < 2; i++) D.ring(ctx, ox, oy, 20 + pop * (160 + i * 70), '#fff6e0', (1 - pop) * .9, 3 - i); }
  // colony: daughters part, and each lineage keeps doubling
  if (lt >= GEN_T[0]) {
    cam(ctx, cx, cy, z);
    const gens = GEN_T.filter((g) => lt >= g).length;
    const paths = [];
    const walk = (p) => { if (p.length === gens) { paths.push(p); return; } walk(p.concat([0])); walk(p.concat([1])); };
    walk([]);
    const drawn = new Set();
    for (const p of paths) {
      const g = p.length - 1, age = lt - GEN_T[g];
      if (g >= 1 && age < .45) {
        const par = p.slice(0, -1), key = par.join('');
        if (drawn.has(key)) continue;
        drawn.add(key);
        const [px, py] = colonyPos(par, GEN_T[g]), ch = colonyNode(p);
        A.dividing(ctx, { x: px, y: py, R: 170, t, seed: 5, axis: ch.axis }, clamp(age / .45));
        continue;
      }
      const o = colonyCell(p, lt, t, z);
      if (o.R * z > 40) A.body(ctx, o); else A.mini(ctx, o);
    }
  }
  // the division tree (top right)
  screen(ctx);
  const gens = GEN_T.filter((g) => lt >= g).length;
  const lv = lt < GEN_T[0] ? .33 * ss(1.2, 2, lt) : gens + ss(0, .4, lt - GEN_T[gens - 1]);
  const tc = xr > .5 ? PAL.cream : '#22303f';
  D.divTree(ctx, 860, 74, lv, { w: 140, dy: 38, col: tc, a: ss(1.2, 1.8, lt) });
}

// =====================================================================
// S7 — drought: pond dries, the amoeba walls itself into a cyst, nights pass (45–53.75)
// =====================================================================
function s7(ctx, lt, t) {
  if (lt < 2.5) {
    const d = ss(0, 2.4, lt), lev = lerp(556, 905, ease(inv(.1, 2.45, lt)));
    // the sun's daily arc, sped up
    const u = ((lt + .3) / 1.1) % 1;
    const sx = 140 + u * 800, sy = 330 - Math.sin(Math.PI * u) * 240;
    Wd.pond(ctx, 540, 560, 1.04, t, { dry: d, level: lev, sunX: sx, sunY: sy });
    cam(ctx, 540, 560, 1.04);
    const arc = []; for (let i = 0; i <= 40; i++) { const v = i / 40; arc.push([140 + v * 800, 330 - Math.sin(Math.PI * v) * 240]); }
    D.tickPath(ctx, arc, ease(inv(.2, 1.2, lt)), PAL.red, .85, 40, 8, 2.2, true);
    // falling water-level marks
    ctx.strokeStyle = rgba(PAL.red, .9); ctx.lineWidth = 2.4;
    for (let i = 0; i < 4; i++) { const y = lerp(556, 905, i / 3); if (lev > y) { D.line(ctx, 990, y, 1030, y); } }
    D.arrow(ctx, 1010, 560, 1010, Math.max(600, lev), 1, PAL.red, 2.6, 16, ss(.3, .7, lt));
    return;
  }
  if (lt < 6.25) {
    const l2 = lt - 2.5, k = ss(0, 2.2, l2);
    Wd.micro(ctx, 540, 545, 1.05, t + 120, { k, c0: mix('#c4eedf', '#f0d9a8', k), c1: mix('#8fd3c6', '#d9b77a', k), c2: mix('#5fb0b2', '#a77a4c', k) });
    cam(ctx, 540, 545, 1.05);
    // drying cracks creeping over the substrate
    ctx.strokeStyle = rgba('#5a3622', .7 * k); ctx.lineWidth = 2.2; ctx.lineCap = 'round';
    for (let c = 0; c < 14; c++) {
      const a = hash(c) * TAU, r0 = 330 + hash(c + 3) * 200, pts = [];
      for (let s = 0; s < 8; s++) pts.push([540 + Math.cos(a + Math.sin(s + c) * .15) * (r0 + s * 40), 545 + Math.sin(a + Math.sin(s * 1.3 + c) * .15) * (r0 + s * 40)]);
      D.strokePart(ctx, pts, ss(.3 + hash(c + 7) * .6, 1.6 + hash(c + 7) * .8, l2), false, false);
    }
    const rd = ss(.2, 1.1, l2), wall = inv(1.5, 3.0, l2);
    const nucs = l2 < 2.7 ? 1 : l2 < 3.05 ? 2 : l2 < 3.4 ? 4 : 8;
    if (wall <= 0) {
      const o = { x: 540, y: 545, R: lerp(170, 150, rd), t: t, seed: 3, round: rd, sep: k * .8, pods: [{ a: -.3, L: 220, w: 50 }, { a: 2.4, L: 190, w: 46 }, { a: 1.2, L: 160, w: 40 }], nuc: { a: Math.PI + .4, u: .25 * (1 - rd), r: 32 }, cv: { a: 2.2, u: .6, r: 22, ph: .5 }, food: [] };
      A.body(ctx, o);
    } else A.cyst(ctx, 540, 545, 150, { p: wall, sep: k * .8, nuclei: nucs, t });
    // blue construction of the wall layers, before they harden
    ctx.strokeStyle = rgba(PAL.blue, .85 * (1 - ss(2.6, 3.4, l2))); ctx.lineWidth = 1.5;
    for (let i = 0; i < 3; i++) { const tp = D.arcPart(ctx, 540, 545, 150 * (1.08 + i * .1), -Math.PI / 2 + i, ease(inv(1.0 + i * .2, 1.9 + i * .2, l2))); if (l2 < 2.1 + i * .2) D.spark(ctx, tp, .9, ss(1.0, 1.1, l2)); }
    return;
  }
  // night after night
  const l3 = lt - 6.25;
  Wd.nightSky(ctx, t, { trail: .15 + l3 * .55, rot: l3 * .55, px: 540, py: 150 });
  screen(ctx);
  // moon
  const mu = (l3 / 2.5);
  const mx = lerp(150, 930, mu), my = 320 - Math.sin(Math.PI * mu) * 190;
  D.glow(ctx, mx, my, 90, '#fff4d0', .4);
  ctx.fillStyle = '#fff4d6'; ctx.beginPath(); ctx.arc(mx, my, 30, 0, TAU); ctx.fill();
  ctx.fillStyle = '#28306a'; ctx.beginPath(); ctx.arc(mx + 12, my - 6, 26, 0, TAU); ctx.fill();
  // cracked ground, side-on
  ctx.fillStyle = '#2b2238'; ctx.beginPath(); ctx.moveTo(0, 760); for (let x = 0; x <= W; x += 30) ctx.lineTo(x, 760 + Math.sin(x * .02) * 6 + (hash(x) - .5) * 4); ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath(); ctx.fill();
  ctx.save(); ctx.clip(); D.texture(ctx, T.hatchL, .12, 0, 0, true);
  ctx.strokeStyle = 'rgba(246,234,208,.28)'; ctx.lineWidth = 1.8; ctx.lineJoin = 'round';
  for (let i = 0; i < 18; i++) {
    let x = 20 + i * 60 + hash(i) * 30, y = 764; ctx.beginPath(); ctx.moveTo(x, y);
    for (let s = 0; s < 4; s++) { x += (hash(i * 9 + s) - .5) * 40; y += 14 + hash(i * 7 + s) * 26; ctx.lineTo(x, y); }
    ctx.stroke();
  }
  ctx.restore();
  ctx.strokeStyle = 'rgba(246,234,208,.5)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, 760); for (let x = 0; x <= W; x += 30) ctx.lineTo(x, 760 + Math.sin(x * .02) * 6 + (hash(x) - .5) * 4); ctx.stroke();
  // the cyst, dormant but alive
  D.glow(ctx, 540, 770, 80, '#ffd9a0', .25 + .1 * Math.sin(t * 2));
  A.cyst(ctx, 540, 770, 24, { p: 1, sep: .55, nuclei: 4, t });
  // dust on the wind
  for (let i = 0; i < 40; i++) { const x = ((hash(i) * W + t * (140 + hash(i + 1) * 160)) % (W + 40)) - 20, y = 600 + hash(i + 2) * 200 + Math.sin(t * 3 + i) * 8; D.dot(ctx, x, y, 1.5, '#e9d6b0', .5); }
  // tally of days
  D.tally(ctx, 70, 64, 3 + l3 * 6.4, PAL.cream, 42, .9);
}

// =====================================================================
// S8 — rain, the cyst softens and new amoebae crawl out (53.75–61.25)
// =====================================================================
function s8(ctx, lt, t) {
  if (lt < 2.5) {
    const z = lerp(.85, 1.05, lt / 2.5);
    Wd.mud(ctx, 540, 540, z, t, { wet: ss(.5, 1.9, lt), flood: ss(1.5, 2.5, lt) * .95 });
    cam(ctx, 540, 540, z);
    if (lt < 2.2) A.cyst(ctx, 540, 540, 22, { p: 1, sep: .55, nuclei: 4, t });
    Wd.ripples(ctx, t, lerp(6, 34, ss(0, 2, lt)), 53.75);
    Wd.rain(ctx, t, ss(0, .6, lt));
    return;
  }
  const l2 = lt - 2.5;
  const col = ease(inv(0, 1.4, l2));
  const spring = { c0: '#d4f6d6', c1: '#8edbc6', c2: '#4fb0b8' };
  Wd.micro(ctx, 540, 540, 1, t + 150, { k: .9, c0: '#f0d9a8', c1: '#d9b77a', c2: '#a77a4c' });
  ctx.save(); screen(ctx); ctx.beginPath(); ctx.arc(540, 540, 40 + 900 * col, 0, TAU); ctx.clip();
  Wd.micro(ctx, 540, 540, 1, t + 150, spring);
  ctx.restore();
  cam(ctx, 540, 540, 1);
  const open = inv(.7, 1.7, l2), out = ease(inv(1.5, 4.8, l2));
  const N = 6;
  // shell fragments drift away
  if (open > .45) {
    for (let i = 0; i < 6; i++) {
      const a0 = i * TAU / 6 + .2, d = out * 300, rot = out * (hash(i) - .5) * 1.6, fa = 1 - ss(.3, 1, out);
      if (fa <= 0) continue;
      ctx.save(); ctx.translate(540 + Math.cos(a0 + .45) * d, 540 + Math.sin(a0 + .45) * d); ctx.translate(540, 540); ctx.rotate(rot); ctx.translate(-540, -540);
      ctx.globalAlpha = fa;
      ctx.beginPath(); ctx.arc(540, 540, 178, a0, a0 + .85); ctx.arc(540, 540, 150, a0 + .85, a0, true); ctx.closePath();
      ctx.fillStyle = '#b07a4c'; ctx.fill(); ctx.save(); ctx.clip(); D.texture(ctx, T.hatchX, .5, 540, 540); ctx.restore();
      ctx.strokeStyle = '#5a3622'; ctx.lineWidth = 2.5; ctx.stroke();
      ctx.restore();
    }
  }
  if (open < .5) A.cyst(ctx, 540, 540, 150, { p: 1, sep: lerp(.6, 0, col), nuclei: N, open: open * 2, t });
  else {
    for (let i = 0; i < N; i++) {
      const a = i * TAU / N + .3, d = 60 + 300 * out, R = lerp(46, 70, out);
      const x = 540 + Math.cos(a) * d, y = 540 + Math.sin(a) * d;
      // red vectors: where each new cell heads
      const dg = ss(1.8, 2.3, l2) * (1 - ss(4.2, 4.8, l2));
      if (dg > 0) {
        D.tickPath(ctx, [[540 + Math.cos(a) * 60, 540 + Math.sin(a) * 60], [x, y]], 1, PAL.red, dg * .8, 26, 6, 2, true);
        D.arrow(ctx, x, y, x + Math.cos(a) * (R * 2.2 + 30), y + Math.sin(a) * (R * 2.2 + 30), ss(2.0, 2.6, l2), PAL.red, 2.6, 15, dg);
      }
      A.body(ctx, { x, y, R, t: t + i * 3, seed: 20 + i, pods: [{ a, L: R * (.9 + .4 * out), w: R * .36 }, { a: a + 2.4, L: R * .6 * out, w: R * .28 }], lead: a, flow: .9, round: 1 - ss(0, .6, out), nuc: { a: a + Math.PI, u: .25, r: R * .2 }, cv: { a: a + 2, u: .6, r: R * .15, ph: ((t + i * .4) / BAR) % 1 }, food: [] });
    }
  }
  // remaining rain sparkles on the surface film
  Wd.ripples(ctx, t, 6 * (1 - ss(0, 2, l2)), 53.75, { col: '#ffffff' });
}

// =====================================================================
// S9 — the cycle as a diagram, title, back to a point (61.25–67.5)
// =====================================================================
const STATIONS = 5;
function s9(ctx, lt, t) {
  const cx = 540, cy = 520, Rr = 300;
  const iris = ease(inv(0, 1.3, lt));
  // the last micro view closes into the ring
  fillScreen(ctx, PAL.night);
  const ir = lerp(820, Rr, iris), fade = ss(1.0, 1.9, lt);
  if (fade < 1) {
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, ir, 0, TAU); ctx.clip();
    Wd.micro(ctx, 540, 540, lerp(.9, .5, iris), t + 150, { c0: '#d4f6d6', c1: '#8edbc6', c2: '#4fb0b8', sx: cx, sy: cy });
    cam(ctx, 540, 540, lerp(.9, .5, iris), cx, cy);
    for (let i = 0; i < 6; i++) { const a = i * TAU / 6 + .3, d = 360 + lt * 40; A.mini(ctx, { x: 540 + Math.cos(a) * d, y: 540 + Math.sin(a) * d, R: 70, t, seed: 20 + i, pods: [{ a, L: 90, w: 25 }] }); }
    fillScreen(ctx, PAL.night, fade);
    ctx.restore();
  }
  screen(ctx);
  vignetteDark(ctx, .5);
  ctx.strokeStyle = rgba(PAL.blue, .9); ctx.lineWidth = 1.8;
  ctx.beginPath(); ctx.arc(cx, cy, ir, 0, TAU); ctx.stroke();
  const out = ss(4.6, 5.6, lt);
  // stations around the ring
  const icons = [
    (x, y, s) => A.body(ctx, { x, y, R: 30 * s, t, seed: 3, pods: [{ a: -.4, L: 40 * s, w: 11 * s }, { a: 2.4, L: 30 * s, w: 9 * s }], nuc: { a: 3.5, u: .25, r: 6 * s }, food: [], n: 90, grains: 20 }),
    (x, y, s) => { A.body(ctx, { x: x - 6 * s, y, R: 30 * s, t, seed: 4, pods: [{ a: -.3, L: 42 * s, w: 10 * s }, { a: .5, L: 42 * s, w: 10 * s }], nuc: { a: 3.5, u: .25, r: 6 * s }, food: [], n: 90, grains: 20 }); Wd.alga(ctx, x + 30 * s, y + 4 * s, 9 * s, 0, t, { noFlag: true }); },
    (x, y, s) => A.dividing(ctx, { x, y, R: 32 * s, t, seed: 3, axis: 0 }, .72 + .1 * Math.sin(t * 2)),
    (x, y, s) => A.cyst(ctx, x, y, 26 * s, { p: 1, sep: .5, nuclei: 4, t }),
    (x, y, s) => { for (let i = 0; i < 4; i++) { const a = i * TAU / 4 + .5; A.mini(ctx, { x: x + Math.cos(a) * 18 * s, y: y + Math.sin(a) * 18 * s, R: 11 * s, t, seed: 30 + i, pods: [{ a, L: 14 * s, w: 4 * s }] }); } },
  ];
  const travel = ss(2.0, 4.6, lt);
  const dotA = -Math.PI / 2 + TAU * travel;
  if (travel > 0) {
    ctx.strokeStyle = rgba(PAL.gold, .9 * (1 - out)); ctx.lineWidth = 3.5; ctx.beginPath(); ctx.arc(cx, cy, Rr, -Math.PI / 2, dotA); ctx.stroke();
  }
  for (let i = 0; i < STATIONS; i++) {
    const a = -Math.PI / 2 + TAU * i / STATIONS, x = cx + Math.cos(a) * Rr, y = cy + Math.sin(a) * Rr;
    const pop = backOut(inv(1.3 + i * .18, 1.8 + i * .18, lt)) * (1 - out);
    if (pop <= 0) continue;
    const lit = travel > 0 ? Math.exp(-Math.pow(((dotA - a) % TAU + TAU) % TAU, 2) * 30) + (((dotA - a) % TAU + TAU) % TAU < .3 ? .2 : 0) : 0;
    const r = 66 * pop;
    D.glow(ctx, x, y, r * 2.2, PAL.gold, .35 * lit);
    const g = ctx.createRadialGradient(x - r * .3, y - r * .3, 4, x, y, r);
    g.addColorStop(0, '#d4f6d6'); g.addColorStop(1, '#6fc3bd');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.clip(); icons[i](x, y, pop); ctx.restore();
    D.ring(ctx, x, y, r, PAL.cream, 1, 2.4); D.ring(ctx, x, y, r + 8, PAL.blue, .7, 1);
    // chevrons between stations
    const a2 = a + TAU / STATIONS / 2, chx = cx + Math.cos(a2) * Rr, chy = cy + Math.sin(a2) * Rr;
    ctx.save(); ctx.translate(chx, chy); ctx.rotate(a2 + Math.PI / 2); ctx.strokeStyle = rgba(PAL.blue, pop); ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.moveTo(-6, -9); ctx.lineTo(4, 0); ctx.lineTo(-6, 9); ctx.stroke(); ctx.restore();
  }
  if (travel > 0 && travel < 1) { const px = cx + Math.cos(dotA) * Rr, py = cy + Math.sin(dotA) * Rr; D.glow(ctx, px, py, 40, PAL.gold, .8); D.dot(ctx, px, py, 6, '#fff6dc'); }
  // centre words
  const words = ss(2.2, 3.0, lt) * (1 - out);
  D.text(ctx, 'AMOEBA', cx, cy + 12, { font: 'Didot', size: 54, track: 20, align: 'center', color: PAL.cream, alpha: words });
  D.text(ctx, 'one cell, an endless cycle', cx, cy + 52, { font: 'DidotI', size: 24, align: 'center', color: PAL.gold, alpha: words });
  // everything returns to a single point
  if (out > 0) {
    const sh = 1 - ease(ss(4.8, 6.0, lt));
    ctx.strokeStyle = rgba(PAL.blue, .9 * sh); ctx.lineWidth = 1.8; ctx.beginPath(); ctx.arc(cx, cy, Math.max(1, Rr * sh), 0, TAU); ctx.stroke();
    D.glow(ctx, cx, cy, 70, PAL.gold, .7 * ss(4.8, 5.4, lt) * (1 - ss(5.8, 6.25, lt)));
    D.dot(ctx, cx, cy, 4, '#fff6dc', ss(4.8, 5.4, lt) * (1 - ss(5.8, 6.25, lt)));
  }
}

module.exports = { s1, s2, s3, s4, s5, s6, s7, s8, s9 };
