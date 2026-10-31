// Shots 1–3 (0–20 s). The title is constructed and we dive through the reticle into the pond; the camera lands, a fish
// leaps, a dragonfly darts, we push into the leaf litter and dive through a lens into a drop; the amoeba crawls on
// false feet drawing its own diagram, an iris turns it to x-ray for its anatomy, colour sweeps back and it spots prey.
const { W, H, TAU, clamp, lerp, inv, ss, ease, hash, rgba, PAL } = require('./core');
const D = require('./draw');
const A = require('./amoeba');
const Wd = require('./world');
const M = require('./motion');
const F = require('./fx');
const { HERO, hero, followCam } = require('./cast');

function vignette(ctx, a) {
  F.screen(ctx);
  const g = ctx.createRadialGradient(540, 540, 300, 540, 540, 800);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(5,3,8,${a})`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}

// S2's camera comes first: S1 already shows the pond through the reticle with it
const S2CAM = [
  [-1.2, { x: 540, y: 600, z: .72, r: -.08 }],
  [.9, { x: 540, y: 540, z: 1.03, r: .01 }, M.sineInOut],
  [1.7, { x: 536, y: 552, z: 1.0, r: -.004 }, M.sineInOut],
  [4.7, { x: 452, y: 846, z: 2.3, r: -.035 }, M.sineInOut],
  [6.25, { x: 436, y: 906, z: 6.5, r: -.07 }, M.expoIn],
];
const s2cam = (lt) => F.rig(lt, S2CAM, { drift: .6, seed: 3 });

// =====================================================================
// S1 — a point of light, the reticle is constructed while the camera spirals out, the amoeba springs out of the
//      point, colour floods it, the title bounces in, then we fly through the reticle into the pond (0–5)
// =====================================================================
function s1(ctx, lt, t) {
  const c = F.rig(lt, [
    [0, { x: 540, y: 480, z: 2.6, r: -.55 }],
    [2.2, { x: 540, y: 540, z: 1, r: 0 }, M.quartOut],
    [4.0, { x: 540, y: 528, z: 1.07, r: .02 }, M.sineInOut],
    [5.0, { x: 540, y: 480, z: 2.85, r: .1 }, M.expoIn],
  ], { drift: .5 });
  const cx = 540, cy = 480, spin = lt * .1;
  F.fill(ctx, PAL.night);
  vignette(ctx, .6);
  M.cam(ctx, c);
  D.glow(ctx, cx, cy, 80, PAL.gold, ss(0, .3, lt) * (1 - ss(1.6, 2.4, lt)) * (.6 + .4 * Math.sin(lt * 7)));
  D.dot(ctx, cx, cy, 3.5, '#fff6dc', ss(0, .2, lt) * (1 - ss(1.5, 1.9, lt)));
  // ignition: sparks shoot out of the point and land where the reticle will be drawn
  ctx.lineCap = 'round';
  for (let i = 0; i < 28; i++) {
    const u = (lt - .12 - hash(i + 300) * .25) / (.6 + hash(i + 301) * .3);
    if (u <= 0 || u >= 1.25) continue;
    const a = TAU * i / 28 + hash(i + 302) * .3, r1 = 318 * M.expoOut(Math.min(1, u)), r0 = 318 * M.expoOut(Math.max(0, u - .12)), bend = .35 * (1 - Math.min(1, u));
    const al = 1 - ss(.85, 1.25, u);
    ctx.strokeStyle = rgba(i % 3 ? PAL.gold : PAL.cream, .9 * al); ctx.lineWidth = 2;
    D.line(ctx, cx + Math.cos(a - bend) * r0, cy + Math.sin(a - bend) * r0, cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
    D.dot(ctx, cx + Math.cos(a) * r1, cy + Math.sin(a) * r1, 2.4, '#fff6dc', al);
  }
  ctx.lineCap = 'round';
  // two circles swept in opposite directions by glowing pen tips
  ctx.strokeStyle = rgba(PAL.blue, .9); ctx.lineWidth = 1.6;
  const p1 = M.expoInOut(inv(.2, 1.3, lt)), tip1 = D.arcPart(ctx, cx, cy, 330, -Math.PI / 2 + spin, p1);
  ctx.lineWidth = 1.1;
  const p2 = M.expoInOut(inv(.45, 1.5, lt)), tip2 = D.arcPart(ctx, cx, cy, 304, Math.PI / 2 + spin, p2, -1);
  if (p1 > 0 && p1 < 1) D.spark(ctx, tip1, 1.2);
  if (p2 > 0 && p2 < 1) D.spark(ctx, tip2, .9);
  ctx.strokeStyle = rgba(PAL.blue, .55); ctx.lineWidth = 1.1;
  const pc = M.expoOut(inv(.7, 1.3, lt));
  for (let k = 0; k < 4; k++) { const a = spin * .5 + k * Math.PI / 2; D.line(ctx, cx + Math.cos(a) * 40, cy + Math.sin(a) * 40, cx + Math.cos(a) * (40 + 300 * pc), cy + Math.sin(a) * (40 + 300 * pc)); }
  // 72 ticks spring out one after another; the whole dial keeps turning
  ctx.strokeStyle = rgba(PAL.blue, .8); ctx.lineWidth = 1.2;
  for (let i = 0; i < 72; i++) {
    const age = lt - (.85 + i * .011);
    if (age <= 0) continue;
    const a = -Math.PI / 2 + TAU * i / 72 + spin, L = (i % 6 === 0 ? 20 : 9) * M.spring(age, 2.6, 7);
    D.line(ctx, cx + Math.cos(a) * 304, cy + Math.sin(a) * 304, cx + Math.cos(a) * (304 + L), cy + Math.sin(a) * (304 + L));
  }
  // vesica piscis — two overlapping circles, the shape of a cell about to become two — slowly turning
  const va = spin * 1.6, pv = M.expoInOut(inv(1.3, 2.3, lt)), vx = Math.cos(va) * 150, vy = Math.sin(va) * 150;
  ctx.strokeStyle = rgba(PAL.blueDim, .9); ctx.lineWidth = 1.1;
  const v1 = D.arcPart(ctx, cx - vx, cy - vy, 150, va, pv), v2 = D.arcPart(ctx, cx + vx, cy + vy, 150, va + Math.PI, pv);
  if (pv > 0 && pv < 1) { D.spark(ctx, v1, .7); D.spark(ctx, v2, .7); }

  // through the reticle the pond comes up to meet us
  const pa = ss(3.95, 4.5, lt);
  if (pa > 0) {
    const [sx, sy] = F.toScreen(c, cx, cy);
    F.iris(ctx, sx, sy, 304 * c.z, (g) => {
      g.globalAlpha = pa;
      const q = s2cam(lt - 5);
      Wd.pond(g, q.x, q.y, q.z, t, { level: 556, r: q.r });
      g.globalAlpha = 1;
    }, { rim: 0 });
    M.cam(ctx, c);
  }
  // the amoeba springs out of the point as a line drawing, pseudopods overshooting, then colour floods it
  const g1 = M.spring(lt - 1.5, 1.3, 4.5), g2 = M.spring(lt - 2.05, 1.6, 5), g3 = M.spring(lt - 2.45, 1.6, 5);
  const o = {
    x: cx, y: cy, R: lerp(16, 118, clamp(M.spring(lt - 1.45, 1.1, 4.5), 0, 1.25)), t: t * .8, seed: 11,
    pods: [{ a: -.5 + .18 * Math.sin(t * 1.3), L: 150 * g1 * (.88 + .12 * Math.sin(t * 2.1)), w: 36 }, { a: 2.2 + .12 * Math.sin(t * 1.1), L: 120 * g2, w: 30 }, { a: 1.0 + .1 * Math.sin(t * .9), L: 100 * g3 * (.8 + .2 * Math.sin(t * 1.7 + 1)), w: 26 }],
    lead: -.5, flow: .8, nuc: { a: 3.6, u: .25, r: 24 }, cv: { a: 2.6, u: .62, r: 17, ph: (lt / 2.5) % 1 }, food: [{ a: .4, u: .5, r: 10, dig: .3 }],
  };
  const fadeOut = 1 - ss(4.1, 4.6, lt);
  if (lt > 1.45 && fadeOut > 0) {
    ctx.save(); ctx.globalAlpha = fadeOut;
    const col = M.expoOut(inv(3.0, 3.8, lt));
    if (col > 0) {
      ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, 20 + 320 * col, 0, TAU); ctx.clip();
      A.body(ctx, o); A.cvBurst(ctx, o);
      ctx.restore();
    }
    A.lines(ctx, o, ease(inv(1.5, 2.6, lt)), { a: 1 - col * .75 });
    if (lt > 2.3) {
      const nc = A.inside(o, o.nuc.a, o.nuc.u, o.R * .11), cv = A.inside(o, o.cv.a, o.cv.u, o.R * .11);
      ctx.strokeStyle = rgba(PAL.blue, .8 * (1 - col * .6)); ctx.lineWidth = 1.2;
      const a1 = D.arcPart(ctx, nc[0], nc[1], 44, spin * 3, M.expoInOut(inv(2.3, 2.9, lt)));
      const a2 = D.arcPart(ctx, cv[0], cv[1], 30, 1 - spin * 3, M.expoInOut(inv(2.5, 3.1, lt)));
      if (lt < 2.9) D.spark(ctx, a1, .6); if (lt > 2.5 && lt < 3.1) D.spark(ctx, a2, .6);
    }
    F.burst(ctx, cx, cy, lt - 3.0, { r: 300, col: PAL.gold, life: .8, rays: 16 });
    ctx.restore();
  }
  // title: letters bounce up one by one, the rule springs out from the centre, the subtitle follows
  M.kinetic(ctx, 'AMOEBA', 540, 905, inv(2.45, 3.3, lt), { size: 64, track: 26, color: PAL.cream, stagger: .55 });
  const rule = 140 * M.spring(lt - 3.0, 1.4, 6);
  ctx.strokeStyle = rgba(PAL.gold, .75); ctx.lineWidth = 1.2;
  if (rule > 0) D.line(ctx, 540 - rule, 924, 540 + rule, 924);
  M.kinetic(ctx, 'the life cycle of a single cell', 540, 958, inv(3.15, 3.95, lt), { font: 'DidotI', size: 27, color: PAL.gold, stagger: .7 });
  // the reticle rim is the window we fly through
  if (pa > 0) {
    ctx.strokeStyle = rgba(PAL.cream, .9 * pa); ctx.lineWidth = 3 / c.z * 1.4;
    ctx.beginPath(); ctx.arc(cx, cy, 304, 0, TAU); ctx.stroke();
  }
  const [zx, zy] = F.toScreen(c, cx, cy);
  F.zoomLines(ctx, zx, zy, ss(4.15, 4.6, lt) * (1 - ss(4.85, 5, lt)), t, { r0: 304 * c.z * .92, a: .55, n: 70 });
}

// =====================================================================
// S2 — the camera lands on the pond with an overshoot; a fish leaps and splashes, a school darts by, a dragonfly
//      zips between hovers; we push in to the leaf litter, a lens springs open and we dive through it (5–11.25)
// =====================================================================
const DRAGON = [
  [0, { x: -90, y: 470 }], [.55, { x: 250, y: 446 }], [1.35, { x: 296, y: 468 }, M.sineInOut], [1.85, { x: 600, y: 428 }],
  [2.75, { x: 640, y: 452 }, M.sineInOut], [3.25, { x: 960, y: 400 }], [4.4, { x: 990, y: 420 }, M.sineInOut], [4.95, { x: 1380, y: 330 }],
];
function dragonfly(ctx, lt, t) {
  const p = M.keys(lt, DRAGON), q = M.keys(lt - .04, DRAGON);
  const vx = (p.x - q.x) / .04, vy = (p.y - q.y) / .04, sp = Math.hypot(vx, vy);
  const x = p.x, y = p.y + Math.sin(t * 5.3) * 5, dir = vx < -5 ? -1 : 1;
  if (x < -150 || x > 1250) return;
  F.marks(ctx, x, y, Math.atan2(vy, vx), ss(250, 800, sp), t, { n: 3, len: 70, spread: 14, back: 48 });
  ctx.save(); ctx.translate(x, y); ctx.rotate(clamp(vy / 900, -.35, .35) * dir + Math.sin(t * 2) * .05); ctx.scale(dir, 1);
  const f = Math.sin(t * 70);
  ctx.fillStyle = 'rgba(225,242,255,.32)';
  for (const wx of [6, -6]) { ctx.beginPath(); ctx.moveTo(wx, -3); ctx.arc(wx, -3, 30, -Math.PI / 2 - .9, -Math.PI / 2 + .5); ctx.closePath(); ctx.fill(); }
  ctx.fillStyle = 'rgba(235,248,255,.75)'; ctx.strokeStyle = 'rgba(70,90,130,.6)'; ctx.lineWidth = 1;
  for (const [wx, k] of [[7, 1], [-5, .9]]) { ctx.beginPath(); ctx.ellipse(wx - 4, -14 - f * 6, 26 * k, 5.5 * k, -.25 - f * .5, 0, TAU); ctx.fill(); ctx.stroke(); }
  ctx.strokeStyle = '#2f5bb5'; ctx.lineWidth = 4.5; ctx.lineCap = 'round'; D.line(ctx, -40, 2, 8, 0);
  ctx.strokeStyle = '#a9c6ff'; ctx.lineWidth = 1.2; for (let i = 0; i < 6; i++) D.line(ctx, -36 + i * 7, -.5, -36 + i * 7, 3.5);
  D.dot(ctx, 11, 0, 6, '#3d6fd0'); D.dot(ctx, 19, -1, 5.5, '#1f3f8f'); D.dot(ctx, 21, -3, 2, '#e9f2ff');
  ctx.restore();
}
function fishJump(lt) {
  const u = inv(.3, 1.4, lt), X = (v) => lerp(600, 880, v);
  return {
    u, x: X(u), y: 640 - Math.sin(Math.PI * u) * 300, ang: Math.atan2(-Math.cos(Math.PI * u) * Math.PI * 300, 280),
    tOut: .3 + .09 * 1.1, tIn: .3 + .91 * 1.1, xOut: X(.09), xIn: X(.91),
  };
}
function s2(ctx, lt, t) {
  const c = s2cam(lt), J = fishJump(lt);
  const splash = lt < J.tIn ? { x: J.xOut, age: lt - J.tOut } : { x: J.xIn, age: lt - J.tIn };
  Wd.pond(ctx, c.x, c.y, c.z, t, { level: 556, r: c.r, school: 6.15, splash });
  M.cam(ctx, c);
  if (J.u > 0 && J.u < 1) {
    ctx.save(); ctx.translate(J.x, J.y); ctx.rotate(J.ang); Wd.fish(ctx, 0, 0, 1.3, 1, t * 2.5, rgba('#f08a4b')); ctx.restore();
    if (J.y < 556) for (let i = 1; i < 6; i++) { const v = J.u - i * .025, y = 640 - Math.sin(Math.PI * v) * 300; if (y < 556) D.dot(ctx, lerp(600, 880, v) - 30, y + i * 3, 3.2 - i * .4, '#eafcff', .8 - i * .12); }
  }
  for (const [x0, age, sd] of [[J.xOut, lt - J.tOut, 5], [J.xIn, lt - J.tIn, 9]]) {
    for (const [x, y, s, a] of M.splashDrops(x0, 556, age, 18, sd, { a0: -Math.PI * .95, spread: Math.PI * .9, v: 430, g: 1500, life: .85, size: 4.5 })) D.dot(ctx, x, y, s, '#eafcff', a);
    if (age > 0 && age < .6) D.ring(ctx, x0, 556, 8 + age * 140, '#f4fdff', (1 - age / .6) * .8, 2);
  }
  dragonfly(ctx, lt, t);
  M.specks(ctx, c.x * c.z, c.y * c.z, t, { n: 10, a: .16, col: '#fff3c8' });

  // the lens: rings the leaf, throws out tangent connectors, springs open, then swallows the frame
  const pcl = inv(3.3, 4.4, lt), grow = M.expoIn(inv(4.95, 6.25, lt));
  if (pcl > 0) {
    const leaf = F.toScreen(c, 430, 918);
    const dst = { x: lerp(718, 540, grow), y: lerp(330, 540, grow), r: lerp(272, 820, grow) };
    const zc = Math.exp(lerp(Math.log(.55), Math.log(.8), grow));
    F.screen(ctx);
    D.callout(ctx, { x: leaf[0], y: leaf[1], r: 22 * c.z }, dst, pcl, (g) => {
      const fc = followCam(t);
      Wd.micro(g, fc.x, fc.y, zc, t, { sx: dst.x, sy: dst.y, r: fc.r });
      const o = hero(t); A.body(g, o); A.cvBurst(g, o);
    }, { col: '#fff6e0', bg: '#9fd8cf', a: 1 - grow });
    F.screen(ctx);
    const pr = inv(4.35, 4.9, lt) * (1 - ss(5.0, 5.4, lt));
    if (pr > 0) {
      const y = dst.y + dst.r + 34, x0 = dst.x - 120, x1 = dst.x + 120;
      ctx.strokeStyle = rgba(PAL.red, pr); ctx.lineWidth = 2.4; D.line(ctx, x0, y, lerp(x0, x1, M.expoOut(pr)), y);
      for (let i = 0; i <= 6; i++) { const L = (i % 3 ? 6 : 12) * M.spring(lt - 4.4 - i * .08, 2.5, 6); if (L > 0) D.line(ctx, lerp(x0, x1, i / 6), y - L, lerp(x0, x1, i / 6), y + L); }
      M.kinetic(ctx, '0.5 mm', dst.x, y + 42, clamp((lt - 4.55) / .5), { font: 'DidotI', size: 25, color: PAL.red, stagger: .5, alpha: 1 - ss(5.0, 5.4, lt) });
    }
    F.zoomLines(ctx, dst.x, dst.y, ss(5.15, 5.65, lt) * (1 - ss(5.95, 6.25, lt)), t, { r0: dst.r * .96, a: .5 });
  }
}

// =====================================================================
// S3 — crawling: each pseudopod shoots out on the beat and the body pours in, trailing a red diagram; an iris from
//      the nucleus flips to x-ray, labels spring in on the bells, colour sweeps back from the tip, prey is locked on (11.25–20)
// =====================================================================
function s3(ctx, lt, t) {
  const fc = followCam(t);
  const lz = M.keys(lt, [[0, Math.log(.8)], [.8, 0, M.expoOut], [3.3, 0], [4.15, Math.log(1.38), M.expoInOut], [6.8, Math.log(1.38)], [7.75, Math.log(.92), M.expoOut]]);
  const c = { x: fc.x, y: fc.y, z: Math.exp(lz), r: fc.r };
  const o = hero(t), g = o.g;
  const P = (p) => F.toScreen(c, p[0], p[1]);
  const nucW = A.inside(o, o.nuc.a, o.nuc.u, o.R * .11), cvW = A.inside(o, o.cv.a, o.cv.u, o.R * .11), fdW = A.inside(o, o.food[0].a, o.food[0].u, o.R * .11);
  const tipR = A.radius(o, o.lead), tipW = [o.x + Math.cos(o.lead) * tipR, o.y + Math.sin(o.lead) * tipR];
  // the prey: a flagellate swimming in, used at the end
  const ref = A.gaitAt(HERO, 18.55), pu = M.quartOut(inv(7.1, 8.75, lt));
  const ax = lerp(ref.x + 780, ref.x + 470, pu) + Math.sin(t * 5) * 12, ay = lerp(ref.y - 480, ref.y - 255, pu) + Math.cos(t * 4) * 10;

  const colour = () => {
    Wd.micro(ctx, c.x, c.y, c.z, t, { r: c.r });
    const dg = ss(.25, .7, lt) * (1 - ss(2.6, 3.0, lt));
    if (dg > 0) {
      const trail = [];
      for (let s = 9.6; s <= t - .05; s += .08) { const q = A.gaitAt(HERO, s); trail.push([q.x, q.y]); }
      if (trail.length > 2) D.tickPath(ctx, trail, 1, PAL.red, dg * .9, 30, 8, 2.4, true);
      for (let i = 1; i <= g.i; i++) {
        const s = HERO.steps[i], age = t - s.ts;
        if (s.ts < 9.6) continue;
        D.dot(ctx, s.x, s.y, 4.5, PAL.red, dg);
        if (age < .5) D.ring(ctx, s.x, s.y, 6 + 40 * M.expoOut(age * 2), PAL.red, dg * (1 - age * 2), 2);
      }
      const hl = o.R * 1.9 + 120 * M.spring(t - HERO.steps[g.i].ts, 1.8, 5);
      D.arrow(ctx, o.x, o.y, o.x + Math.cos(g.h) * hl, o.y + Math.sin(g.h) * hl, 1, PAL.red, 3, 18, dg);
      ctx.strokeStyle = rgba(PAL.red, dg * .7); ctx.lineWidth = 1.6; ctx.setLineDash([4, 6]);
      D.line(ctx, o.x, o.y, o.x + o.R * 2.6, o.y); ctx.setLineDash([]);
      D.angleArc(ctx, o.x, o.y, o.R * 2.2, 0, g.h, 1, PAL.red, dg, 2.2);
      D.dot(ctx, o.x, o.y, 5, PAL.red, dg);
    }
    A.body(ctx, o); A.cvBurst(ctx, o);
    if (lt > 7.0) {
      Wd.alga(ctx, ax, ay, 26, 2.5 + Math.sin(t * 6) * .2, t);
      F.marks(ctx, ax, ay, 2.5, ss(7.1, 7.4, lt) * (1 - ss(8.2, 8.6, lt)), t, { n: 3, len: 55, spread: 20, back: 46 });
      const lk = M.expoOut(inv(7.7, 8.15, lt));
      if (lk > 0) {
        const rr = lerp(190, 54, lk), rot = (1 - lk) * 1.4 + t * .4;
        ctx.strokeStyle = rgba(PAL.red, Math.sqrt(lk)); ctx.lineWidth = 3; ctx.lineCap = 'round';
        for (let k = 0; k < 4; k++) {
          const a = rot + Math.PI / 4 + k * Math.PI / 2, px = ax + Math.cos(a) * rr, py = ay + Math.sin(a) * rr;
          for (const s of [-1, 1]) { const b = a + s * Math.PI / 2, nx = ax + Math.cos(b) * rr, ny = ay + Math.sin(b) * rr; D.line(ctx, px, py, lerp(px, nx, .28), lerp(py, ny, .28)); }
        }
        D.ring(ctx, ax, ay, 8 + 4 * Math.sin(t * 9), PAL.red, lk, 2);
        ctx.setLineDash([9, 8]); ctx.lineWidth = 2; D.line(ctx, tipW[0], tipW[1], ax, ay, M.expoOut(inv(8.0, 8.45, lt))); ctx.setLineDash([]);
      }
    }
  };
  const xray = () => {
    F.fill(ctx, PAL.night);
    M.specks(ctx, c.x * c.z, c.y * c.z, t, { n: 14, a: .12, col: '#9fb6ff' });
    M.cam(ctx, c);
    F.blueprint(ctx, c, .5);
    A.lines(ctx, o, 1);
    F.turningRing(ctx, o.x, o.y, o.R * 2.05, t, { a: .7 });
    ctx.strokeStyle = rgba(PAL.blue, .8); ctx.lineWidth = 1.3;
    for (let i = 0; i < 48; i++) {
      const age = lt - 3.3 - i * .012;
      if (age <= 0) continue;
      const a = TAU * i / 48 - t * .12, L = (i % 4 ? 7 : 16) * M.spring(age, 2.5, 6), r0 = o.R * 2.3;
      D.line(ctx, o.x + Math.cos(a) * r0, o.y + Math.sin(a) * r0, o.x + Math.cos(a) * (r0 + L), o.y + Math.sin(a) * (r0 + L));
    }
    const ringAt = (p, r, t0) => {
      ctx.strokeStyle = rgba(PAL.blue, .85); ctx.lineWidth = 1.5;
      const tp = D.arcPart(ctx, p[0], p[1], r, -Math.PI / 2 + t, M.expoInOut(inv(t0, t0 + .5, lt)));
      if (lt > t0 && lt < t0 + .5) D.spark(ctx, tp, .8);
    };
    ringAt(nucW, o.nuc.r * 1.6, 4.0); ringAt(cvW, o.cv.r * 1.8, 4.5); ringAt(fdW, o.food[0].r * 2.2, 5.0); ringAt(tipW, 34, 5.5);
    F.screen(ctx);
    const n = P(nucW), cv = P(cvW), fd = P(fdW), tp = P(tipW), k = .707 * c.z;
    F.label(ctx, n[0] - o.nuc.r * 1.6 * k, n[1] - o.nuc.r * 1.6 * k, n[0] - 150, n[1] - 170, 'nucleus', lt - 4.5);
    F.label(ctx, cv[0] - o.cv.r * 1.8 * k, cv[1] + o.cv.r * 1.8 * k, cv[0] - 60, cv[1] + 200, 'contractile vacuole', lt - 5.0);
    F.label(ctx, fd[0] + o.food[0].r * 2.2 * k, fd[1] + o.food[0].r * 2.2 * k, fd[0] + 140, fd[1] + 175, 'food vacuole', lt - 5.5);
    F.label(ctx, tp[0] + 24 * k, tp[1] - 24 * k, tp[0] + 70, tp[1] - 175, 'pseudopod', lt - 6.0, { col: PAL.gold });
  };

  const r1 = 1150 * M.expoInOut(inv(3.0, 3.75, lt)), r2 = 1150 * M.expoInOut(inv(6.55, 7.3, lt));
  if (lt < 3.0) colour();
  else if (lt < 3.75) { colour(); const n = P(nucW); F.iris(ctx, n[0], n[1], r1, xray, { rim: 1 - ss(3.5, 3.75, lt) }); }
  else if (lt < 6.55) xray();
  else if (lt < 7.3) { xray(); const tp = P(tipW); F.iris(ctx, tp[0], tp[1], r2, colour, { rim: 1 - ss(7.0, 7.3, lt) }); }
  else colour();
}

module.exports = { s1, s2, s3 };
