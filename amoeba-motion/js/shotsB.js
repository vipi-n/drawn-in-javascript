// Shots 4–6 (20–45 s). Feeding: the alga swoops in, pseudopods spring out and snap shut (shake + burst), digestion in
// a springy lens. Growth: a time-lapse with flickering days, streaking prey and a racing clock. Fission: an iris into
// the nucleus, springy chromosomes on a heartbeat, the straining pinch, the split on the downbeat, and the colony
// doubling while the camera punches out in steps until the drop shrinks back into the pond.
const { W, H, TAU, BAR, clamp, lerp, inv, ss, ease, easeIn, hash, noise1, rgba, PAL } = require('./core');
const D = require('./draw');
const A = require('./amoeba');
const Wd = require('./world');
const M = require('./motion');
const F = require('./fx');
const { T } = require('./tex');
const { s7cam } = require('./cast');

// =====================================================================
// S4 — phagocytosis (20–27.5)
// =====================================================================
const R4 = 150, CAP = [1.45 * R4 * Math.cos(-.62), 1.45 * R4 * Math.sin(-.62)], FIN = [.45 * R4 * Math.cos(-.62), .45 * R4 * Math.sin(-.62)];
const centre4 = (lt) => { const L = 55 * M.spring(lt - .95, 1.1, 4.2) * (1 - ss(3.6, 5.0, lt)); return [430 + lt * 14 + L * Math.cos(-.62), 610 + L * Math.sin(-.62)]; };
const bez = (p, u) => { const v = 1 - u; return [0, 1].map((k) => v * v * v * p[0][k] + 3 * v * v * u * p[1][k] + 3 * v * u * u * p[2][k] + u * u * u * p[3][k]); };
function prey4(lt) {
  const [ox, oy] = centre4(lt);
  if (lt < 2.4) {
    const [cx, cy] = centre4(2.4), P = [[1060, 90], [760, 30], [990, 430], [cx + CAP[0], cy + CAP[1]]];
    const u = M.quartOut(inv(0, 2.4, lt)), p = bez(P, u), q = bez(P, Math.max(0, u - .02));
    const ang = Math.atan2(p[1] - q[1], p[0] - q[0]) || 2.5, w = 16 * (1 - u) * Math.sin(lt * 9);
    return { x: p[0] - Math.sin(ang) * w, y: p[1] + Math.cos(ang) * w, ang, P, u, caught: 0 };
  }
  if (lt < 2.9) { const j = 5 * ss(2.4, 2.6, lt); return { x: ox + CAP[0] + j * Math.sin(lt * 40), y: oy + CAP[1] + j * Math.cos(lt * 37), ang: 2.5 + Math.sin(lt * 12) * .4, caught: 0 }; }
  const k = clamp(M.spring(lt - 3.25, 1.1, 4.5), 0, 1.15);
  return { x: ox + lerp(CAP[0], FIN[0], k), y: oy + lerp(CAP[1], FIN[1], k), ang: 2.5 + (lt - 2.9) * 1.2, caught: 1 };
}
function s4(ctx, lt, t) {
  const c = F.rig(lt, [
    [0, { x: 780, y: 300, z: .8, r: .12 }],
    [1.1, { x: 600, y: 480, z: 1.08, r: 0 }, M.expoOut],
    [2.9, { x: 560, y: 520, z: 1.34, r: -.03 }, M.sineInOut],
    [4.1, { x: 640, y: 450, z: 1.1, r: 0 }, M.expoOut],
    [7.5, { x: 720, y: 420, z: 1.24, r: .05 }, M.sineInOut],
  ], { drift: .7, seed: 5, shakes: [[2.9, 18]] });
  Wd.micro(ctx, c.x, c.y, c.z, t + 30, { r: c.r });
  const [ox, oy] = centre4(lt), pr = prey4(lt);
  const dirA = Math.atan2(pr.y - oy, pr.x - ox);
  const reach = clamp(M.spring(lt - 1.0, 1.25, 4.2), 0, 1.3) * (1 - M.expoInOut(inv(3.5, 4.7, lt)));
  const open = lerp(.62, .1, M.expoIn(inv(2.15, 2.9, lt)));
  const o = {
    x: ox, y: oy, R: R4, t, seed: 3, lead: dirA, flow: .7 + .3 * reach, stretch: { a: dirA, k: .1 * reach },
    pods: [{ a: dirA - open, L: R4 * 1.62 * reach, w: R4 * .29 }, { a: dirA + open, L: R4 * 1.62 * reach, w: R4 * .29 }, { a: dirA + Math.PI + .4 * Math.sin(lt * 1.7), L: R4 * .55 * (.6 + .4 * Math.sin(lt * 1.3)), w: R4 * .3 }],
    nuc: { a: dirA + Math.PI + .4, u: .25, r: R4 * .2 }, cv: { a: dirA + Math.PI - .9, u: .62, r: R4 * .17, ph: ((t / BAR) % 1 + 1) % 1 },
    food: [{ a: 2.5, u: .55, r: R4 * .07, dig: .65 }],
  };
  // red: the prey's approach traced behind it, then the pincer angle closing
  if (lt < 2.6 && pr.P) {
    const tr = []; for (let u = 0; u <= pr.u; u += .02) tr.push(bez(pr.P, u));
    if (tr.length > 2) D.tickPath(ctx, tr, 1, PAL.red, .8 * (1 - ss(2.2, 2.6, lt)), 26, 6, 2, true);
  }
  A.body(ctx, o); A.cvBurst(ctx, o);
  const dg = ss(1.1, 1.4, lt) * (1 - ss(2.8, 3.1, lt));
  if (dg > 0) {
    ctx.strokeStyle = rgba(PAL.red, dg * .8); ctx.lineWidth = 1.6; ctx.setLineDash([4, 6]);
    for (const p of o.pods.slice(0, 2)) D.line(ctx, ox, oy, ox + Math.cos(p.a) * (p.L + p.w + 30), oy + Math.sin(p.a) * (p.L + p.w + 30));
    ctx.setLineDash([]);
    D.angleArc(ctx, ox, oy, R4 * 1.25, o.pods[0].a, o.pods[1].a, 1, PAL.red, dg, 2.4);
    D.dot(ctx, ox, oy, 5, PAL.red, dg);
  }
  const vac = clamp(M.spring(lt - 2.9, 2.2, 6), 0, 1.3), dig = ss(5.0, 7.3, lt) * .7;
  if (vac > 0) { ctx.fillStyle = rgba('#f7e7c8', .85 * Math.min(1, vac)); ctx.beginPath(); ctx.arc(pr.x, pr.y, 34 * vac, 0, TAU); ctx.fill(); D.ring(ctx, pr.x, pr.y, 34 * vac, '#b98a62', Math.min(1, vac), 2); }
  Wd.alga(ctx, pr.x, pr.y, lerp(24, 20, Math.min(1, vac)), pr.ang, t, { noFlag: vac > .5, dig });
  if (lt < 2.6) F.marks(ctx, pr.x, pr.y, pr.ang, ss(.05, .3, lt) * (1 - ss(1.6, 2.2, lt)), t, { n: 3, len: 60, spread: 22, back: 48 });
  F.shiver(ctx, pr.x, pr.y, 34, ss(2.4, 2.55, lt) * (1 - ss(2.85, 2.95, lt)), t, { a: dirA + Math.PI / 2 });
  F.burst(ctx, pr.x, pr.y, lt - 2.9, { r: 120, life: .6, rays: 10 });
  F.flash(ctx, lt - 2.9, { a: .22, k: 9 });

  // digestion, in a lens that springs out of the food vacuole and later snaps back into it
  const p = inv(4.1, 4.9, lt) * (1 - inv(7.0, 7.45, lt));
  if (p > 0) {
    M.cam(ctx, c);
    const src = F.toScreen(c, pr.x, pr.y), dst = { x: 800, y: 290, r: 210 };
    F.screen(ctx);
    D.callout(ctx, { x: src[0], y: src[1], r: 40 }, dst, p, (g) => {
      F.screen(g);
      const bg = g.createRadialGradient(dst.x - 60, dst.y - 60, 20, dst.x, dst.y, dst.r);
      bg.addColorStop(0, '#fbf1da'); bg.addColorStop(1, '#f0c9a8');
      g.fillStyle = bg; g.fillRect(dst.x - dst.r, dst.y - dst.r, dst.r * 2, dst.r * 2);
      D.texture(g, T.stipD, .35, dst.x, dst.y); D.texture(g, T.hatchD, .15, dst.x, dst.y);
      const dg2 = ss(5.0, 7.0, lt), mr = 120, mem = [];
      for (let i = 0; i < 72; i++) { const a = TAU * i / 72, r = mr * (1 + (.035 * Math.sin(3 * a + t * 4) + .02 * Math.sin(5 * a - t * 6)) * (1 - dg2 * .5)); mem.push([dst.x + Math.cos(a) * r, dst.y + Math.sin(a) * r]); }
      g.fillStyle = 'rgba(250,238,214,.95)'; D.shape(g, mem); g.fill();
      g.strokeStyle = '#a46a4a'; g.lineWidth = 3; g.stroke();
      const sh = ss(5.2, 5.6, lt) * (1 - ss(6.6, 7.0, lt)), jx = sh * 4 * Math.sin(t * 47), jy = sh * 4 * Math.cos(t * 41), ar = lerp(70, 34, dg2);
      Wd.alga(g, dst.x + jx, dst.y + jy, ar, .3 + lt * .5, t, { noFlag: true, dig: dg2 });
      F.shiver(g, dst.x, dst.y, ar, sh, t, { a: lt * .7, col: '#7a4a2a' });
      // lysosomes spiral in, each fusing on its bell with a flash
      for (let i = 0; i < 10; i++) {
        const ta = 4.9 + i * .08, a0 = TAU * i / 10 + .3, u = (lt - (ta - .7)) / .7;
        if (u < 0) continue;
        if (u < 1) {
          for (let k = 3; k >= 0; k--) {
            const v = Math.max(0, u - k * .05), a = a0 + (1 - v) * 1.3, r = lerp(240, mr, easeIn(v));
            D.dot(g, dst.x + Math.cos(a) * r, dst.y + Math.sin(a) * r, lerp(9, 6, v) * (1 - k * .2), '#e0662f', k ? .25 : 1);
          }
        } else {
          const age = lt - ta, a = a0, x = dst.x + Math.cos(a) * mr, y = dst.y + Math.sin(a) * mr;
          if (age < .45) D.ring(g, x, y, 6 + age * 70, '#ff9a4a', 1 - age / .45, 2.5);
          D.glow(g, x, y, 22, '#ff9a4a', .5 * (1 - ss(6.0, 6.6, lt)));
          D.dot(g, x, y, 5, '#e0662f', 1 - ss(6.0, 6.6, lt) * .8);
        }
      }
      // nutrients burst out into the cytoplasm
      for (const [dx, dy, life] of M.burst(lt - 6.0, 26, 77, { v: 300, drag: 2.2, life: 1.5 })) {
        const x = dst.x + dx * (1 + 30 / Math.max(30, Math.hypot(dx, dy))), y = dst.y + dy * (1 + 30 / Math.max(30, Math.hypot(dx, dy)));
        D.glow(g, x, y, 12, PAL.gold, .4 * life); D.dot(g, x, y, 4, PAL.gold, Math.min(1, life * 1.5));
      }
    }, { col: '#3b2a2e', bg: '#f6e3c8' });
  }
}

// =====================================================================
// S5 — growth time-lapse (27.5–32.5)
// =====================================================================
const MEALS = Array.from({ length: 12 }, (_, i) => .3 + i * .31);
function clock(ctx, x, y, r, a1, a2, col, al) {
  ctx.save(); ctx.strokeStyle = rgba(col, al); ctx.lineCap = 'round'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke();
  for (let i = 0; i < 12; i++) { const a = TAU * i / 12; D.line(ctx, x + Math.cos(a) * r * .78, y + Math.sin(a) * r * .78, x + Math.cos(a) * r * .94, y + Math.sin(a) * r * .94); }
  ctx.lineWidth = 3.2; D.line(ctx, x, y, x + Math.cos(a1) * r * .5, y + Math.sin(a1) * r * .5);
  ctx.lineWidth = 1.8; D.line(ctx, x, y, x + Math.cos(a2) * r * .82, y + Math.sin(a2) * r * .82);
  D.dot(ctx, x, y, 3.5, col, al);
  ctx.restore();
}
function s5(ctx, lt, t) {
  const c = F.rig(lt, [[0, { x: 540, y: 560, z: 1.12, r: -.03 }], [4.05, { x: 540, y: 560, z: .84, r: .045 }, M.sineInOut], [5.0, { x: 540, y: 560, z: 1.6, r: 0 }, M.expoIn]], { drift: .7, seed: 9 });
  const fast = 60 + t + lt * 5;
  Wd.micro(ctx, c.x, c.y, c.z, fast, { r: c.r });
  let R = lerp(125, 205, M.sineInOut(inv(.1, 4.0, lt)));
  for (const m of MEALS) R += 7 * M.wobble(lt - m, 2.5, 5);
  const rd = ss(3.85, 4.5, lt), tt = t + lt * 3, lead = lt * 2.6, ox = 540, oy = 560;
  const pods = [];
  for (let i = 0; i < 4; i++) pods.push({ a: lead + i * TAU / 4 + Math.sin(tt * .7 + i) * .5, L: Math.max(0, R * (.7 + .5 * Math.sin(tt * 1.3 + i * 2))), w: R * .3 });
  const o = {
    x: ox, y: oy, R, t: tt, seed: 3, pods, round: rd, lead, flow: .8,
    nuc: { a: Math.PI + .4, u: .25 * (1 - rd), r: R * .2 }, cv: { a: Math.PI - .9, u: .62, r: R * .15, ph: (lt * 1.6) % 1 },
    food: [{ a: 1, u: .5, r: R * .07, dig: (lt * .6) % 1 }, { a: -2, u: .55, r: R * .06, dig: (lt * .6 + .5) % 1 }],
  };
  // rings stamped at the starting size and then at each "day", like growth rings
  ctx.lineWidth = 2; ctx.setLineDash([8, 8]);
  for (const [ts, a] of [[0, .6], [1.3, .45], [2.6, .4], [3.6, .35]]) {
    if (lt < ts) continue;
    const r0 = ts === 0 ? 125 : lerp(125, 205, M.sineInOut(inv(.1, 4.0, ts))), r = r0 + 30 * (1 - clamp(M.spring(lt - ts, 2, 6), 0, 1.2));
    ctx.strokeStyle = rgba(PAL.red, a * ss(0, .2, lt - ts)); ctx.lineDashOffset = -lt * 30; ctx.beginPath(); ctx.arc(ox, oy, r, 0, TAU); ctx.stroke();
  }
  ctx.setLineDash([]); ctx.lineDashOffset = 0;
  A.body(ctx, o); A.cvBurst(ctx, o);
  // prey streaking in, each landing with a bump
  for (let i = 0; i < MEALS.length; i++) {
    const u = (lt - (MEALS[i] - .45)) / .45;
    if (u < 0 || u > 1.15) continue;
    const a = hash(i + 40) * TAU, rr = lerp(470, R * .75, easeIn(Math.min(1, u))), x = ox + Math.cos(a) * rr, y = oy + Math.sin(a) * rr;
    if (u <= 1) {
      ctx.strokeStyle = rgba('#ffffff', .6); ctx.lineWidth = 2; ctx.lineCap = 'round';
      D.line(ctx, x, y, x + Math.cos(a) * 90 * u, y + Math.sin(a) * 90 * u);
      ctx.save(); ctx.translate(x, y); ctx.rotate(a + u * 4); ctx.fillStyle = rgba(['#c76fa3', '#9c6ccf', '#5fbf4a'][i % 3]); ctx.beginPath(); ctx.roundRect(-11, -4.5, 22, 9, 4.5); ctx.fill(); ctx.restore();
    } else D.ring(ctx, ox + Math.cos(a) * R * .8, oy + Math.sin(a) * R * .8, 8 + (u - 1) * 260, '#fff6e0', 1 - (u - 1) / .15, 2);
  }
  // size bracket that springs with the growth
  const bx = ox - R - 70, top = oy - R, bot = oy + R, pb = ss(.4, 1, lt);
  ctx.strokeStyle = rgba(PAL.red, pb); ctx.lineWidth = 2.6;
  D.line(ctx, bx, oy, bx, lerp(oy, top, pb)); D.line(ctx, bx, oy, bx, lerp(oy, bot, pb));
  D.line(ctx, bx - 12, top, bx + 12, top, pb); D.line(ctx, bx - 12, bot, bx + 12, bot, pb);
  ctx.setLineDash([3, 6]); ctx.lineWidth = 1.4; D.line(ctx, bx, top, ox, top, pb); D.line(ctx, bx, bot, ox, bot, pb); ctx.setLineDash([]);
  // days flicker by; a clock races and the hours are tallied
  const flick = (Math.floor(lt * 5) % 2) * (1 - ss(3.7, 4.1, lt));
  F.fill(ctx, '#1c2a4a', .17 * flick);
  F.screen(ctx);
  const hud = ss(.1, .5, lt) * (1 - ss(4.2, 4.6, lt));
  clock(ctx, 110, 110, 46, lt * TAU * .55 - Math.PI / 2, lt * TAU * 6 - Math.PI / 2, '#22303f', .9 * hud);
  D.tally(ctx, 700, 70, lt * 3.4, '#22303f', 40, .9 * (1 - ss(4.3, 4.7, lt)));
  F.zoomLines(ctx, 540, 540, ss(4.3, 4.7, lt), t, { dir: -1, r0: 140, a: .45 });
}

// =====================================================================
// S6 — binary fission and the doubling colony (32.5–45)
// =====================================================================
const GEN_T = [7.5, 8.75, 10.0, 11.25, 11.875];
const BEATS6 = [0, 1.25, 2.5, 3.75, 5.0, 6.25];
const pkey = (p) => p.reduce((a, v, i) => a + (v + 1) * (i + 3) * 17, 7);
const colonyR = (p) => 150 + 10 * Math.sin(pkey(p));
function axisOf(q) { return q.length === 0 ? 0 : axisOf(q.slice(0, -1)) + Math.PI / 2 + (hash(pkey(q)) - .5) * .9; }
// a daughter starts where its parent was when it split, springs apart, then wanders
function cellPos(p, lt) {
  if (p.length === 0) return [540, 560];
  const q = p.slice(0, -1), L = p.length, b = GEN_T[L - 1], s = p[L - 1] ? 1 : -1, ax = axisOf(q), age = lt - b;
  const [px, py] = cellPos(q, Math.min(lt, b));
  const d0 = L === 1 ? 216 : 1.08 * 1.1 * colonyR(q);
  const sep = d0 + (L === 1 ? 70 : 60) * clamp(M.spring(age, 1.1, 4), 0, 1.2) + 22 * Math.max(0, age);
  const k = pkey(p), wa = clamp(age);
  return [px + s * Math.cos(ax) * sep + 16 * wa * noise1(lt * .6, k % 97), py + s * Math.sin(ax) * sep + 16 * wa * noise1(lt * .6 + 50, k % 89)];
}
function colonyCell(p, x, y, lt, t) {
  const k = pkey(p), L = p.length, born = lt - GEN_T[L - 1], R = colonyR(p);
  const lead = axisOf(p.slice(0, -1)) + (p[L - 1] ? 0 : Math.PI) + .5 * Math.sin(t * .7 + k);
  return {
    x, y, R, t: t + k, seed: k % 50, lead, flow: .8, round: 1 - ss(0, .22, born),
    pods: [{ a: lead + Math.sin(t * 1.3 + k) * .5, L: R * (1.0 + .35 * Math.sin(t * 2.2 + k)) * clamp(M.spring(born - .05, 2, 5), 0, 1.2), w: R * .33 }, { a: lead + 2.2 + Math.sin(t * .9 + k), L: R * (.7 + .45 * Math.sin(t * 1.7 + k)) * clamp(M.spring(born - .15, 2, 5), 0, 1.2), w: R * .28 }],
    nuc: { a: lead + Math.PI + .4, u: .2, r: R * .2 }, cv: { a: lead + 2.2, u: .6, r: R * .14, ph: (((t + k * .3) / BAR) % 1 + 1) % 1 }, food: [{ a: lead + 1, u: .5, r: R * .07, dig: .4 }],
  };
}
let LAYER = null;
function layer() {
  if (!LAYER) LAYER = require('./core').C.createCanvas(W, H);
  const g = LAYER.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H);
  return g;
}
function s6(ctx, lt, t) {
  const c = F.rig(lt, [
    [0, { x: 540, y: 560, z: 1.6, r: 0 }],
    [.9, { x: 540, y: 560, z: 2.25, r: -.1 }, M.expoOut],
    [5.5, { x: 538, y: 560, z: 2.0, r: .1 }, M.sineInOut],
    [6.5, { x: 540, y: 560, z: 1.22, r: 0 }, M.expoInOut],
    [7.5, { x: 540, y: 560, z: 1.3, r: -.01 }, M.sineInOut],
    [8.2, { x: 540, y: 560, z: .95, r: .04 }, M.expoOut],
    [8.75, { x: 540, y: 560, z: .93, r: .04 }],
    [9.3, { x: 540, y: 560, z: .68, r: -.02 }, M.expoOut],
    [10.0, { x: 540, y: 560, z: .66, r: -.02 }],
    [10.5, { x: 540, y: 560, z: .48, r: .05 }, M.expoOut],
    [11.25, { x: 540, y: 560, z: .47, r: .05 }],
    [11.7, { x: 540, y: 560, z: .34, r: 0 }, M.expoOut],
    [12.5, { x: 540, y: 560, z: .28, r: -.03 }, M.sineInOut],
  ], { drift: .6, seed: 21, shakes: [[7.5, 18], [8.75, 6], [10, 6], [11.25, 5]] });
  const ox = 540, oy = 560, R = 200;
  const mp = inv(1.25, 5.6, lt);
  const kraw = inv(5.6, 7.5, lt), strain = ss(6.2, 6.6, lt) * (1 - ss(7.2, 7.45, lt));
  const k = clamp(kraw - .03 * Math.sin((lt - 6) * 14) * strain, 0, 1);
  let beat = 0; for (const b of BEATS6) beat += M.wobble(lt - b, 2.2, 7);
  const NR = lerp(40, 66, ss(1.0, 1.8, lt)) * (1 + .05 * beat);
  const roundO = { x: ox, y: oy, R, t: t + 30, seed: 3, wob: .7, round: 1, pods: [], nuc: { a: Math.PI + .4, u: 0, r: NR }, cv: { a: Math.PI - .9, u: .62, r: 30, ph: ((t / BAR) % 1) }, food: [] };
  const nucAt = (b, j) => { const s = j ? 1 : -1; return [lerp(ox + s * NR * 1.15, b.x - s * b.R * .1, ss(0, .7, k)), b.y, lerp(NR * .72, 32, k)]; };
  const ex = (p) => [540 + (p[0] - 540) * (1 + .28 * Math.max(0, lt - 7.5)), 560 + (p[1] - 560) * (1 + .28 * Math.max(0, lt - 7.5))];

  const colony = (cm) => {
    // every cell pinches in two during the 0.45 s before the next beat and the daughters part exactly on it
    const gens = GEN_T.filter((g) => lt >= g).length, next = GEN_T[gens] ?? 99, paths = [];
    const walk = (p) => { if (p.length === gens) { paths.push(p); return; } walk(p.concat([0])); walk(p.concat([1])); };
    walk([]);
    for (const p of paths) {
      const L = p.length, born = lt - GEN_T[L - 1], q = p.slice(0, -1);
      const [x, y] = ex(cellPos(p, lt));
      if (lt > next - .45) {
        const lobes = A.dividing(ctx, { x, y, R: 1.1 * colonyR(p), t, seed: 5, axis: axisOf(p) }, ease(clamp((lt - next + .45) / .45)));
        if (colonyR(p) * cm.z > 34) for (const b of lobes) A.nucleus(ctx, b.x, b.y, b.R * .2);
        continue;
      }
      if (born < .45) {
        const s = p[L - 1] ? 1 : -1, ax = axisOf(q);
        F.marks(ctx, x, y, ax + (s > 0 ? 0 : Math.PI), 1 - born / .45, t, { n: 3, len: 70, spread: 60, back: 170, w: 3 });
        if (s > 0 && L >= 2) { const [qx, qy] = ex(cellPos(q, GEN_T[L - 1])); F.burst(ctx, qx, qy, born, { r: 170, life: .5, rays: 10, w: 4 }); }
      }
      const o = colonyCell(p, x, y, lt, t);
      if (o.R * cm.z > 34) { A.body(ctx, o); A.cvBurst(ctx, o); } else A.mini(ctx, o);
    }
  };
  const colourScene = (cm, sx = W / 2, sy = H / 2) => {
    Wd.micro(ctx, cm.x, cm.y, cm.z, t + 90, { r: cm.r, sx, sy });
    if (lt < 5.6) {
      A.body(ctx, Object.assign({}, roundO, { noNuc: true, cv: lt < 2 ? roundO.cv : null }));
      if (mp <= 0) A.nucleus(ctx, ox, oy, NR);
      else A.mitosis(ctx, ox, oy, NR, mp, 0, { line: '#45203f', blue: '#3e5199', chrom: '#a8327a', springy: true, jig: .08, t, dur: 4.35 });
    } else if (lt < GEN_T[0]) {
      const [b1, b2] = A.dividing(ctx, { x: ox, y: oy, R, t: t + 30, seed: 3, axis: 0 }, k);
      [b1, b2].forEach((b, j) => { const [x, y, r] = nucAt(b, j); A.nucleus(ctx, x, y, r); });
    } else colony(cm);
  };
  const xrayScene = () => {
    F.fill(ctx, PAL.night);
    M.specks(ctx, c.x * c.z, c.y * c.z, t, { n: 14, a: .12, col: '#9fb6ff' });
    M.cam(ctx, c);
    F.blueprint(ctx, c, .45);
    // a ring pulses out of the nucleus on every heartbeat
    for (const b of BEATS6) { const age = lt - b; if (age > 0 && age < .9) D.ring(ctx, ox, oy, NR + age * 260, PAL.blue, (1 - age / .9) * .6, 1.6); }
    if (lt < 5.6) {
      A.lines(ctx, roundO, 1, { bare: true });
      A.mitosis(ctx, ox, oy, NR, mp, 0, { springy: true, jig: .08, t, dur: 4.35 });
      if (mp <= 0) { ctx.strokeStyle = rgba(PAL.cream); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(ox, oy, NR, 0, TAU); ctx.stroke(); }
    } else {
      const m = ctx.getTransform(), L = layer();
      L.setTransform(m.a, m.b, m.c, m.d, m.e, m.f);
      const [b1, b2] = A.dividing(L, { x: ox, y: oy, R, t: t + 30, seed: 3, axis: 0 }, k, 'lines', { bg: PAL.night });
      [b1, b2].forEach((b, j) => { const [x, y, r] = nucAt(b, j); L.strokeStyle = rgba(PAL.cream); L.lineWidth = 2; L.beginPath(); L.arc(x, y, r, 0, TAU); L.stroke(); });
      F.screen(ctx); ctx.drawImage(LAYER, 0, 0); M.cam(ctx, c);
      F.shiver(ctx, ox, oy, lerp(R * .9, 40, k), strain, t, { a: -Math.PI / 2, col: PAL.cream });
    }
    // blue construction: outer circle (then it keeps turning), the division plane, the two future daughters
    ctx.strokeStyle = rgba(PAL.blue, .8); ctx.lineWidth = 1.4;
    const pc = M.expoInOut(inv(.8, 2.2, lt));
    if (pc < 1) { const t1 = D.arcPart(ctx, ox, oy, R * 1.2, -Math.PI / 2, pc); D.spark(ctx, t1, 1); }
    else F.turningRing(ctx, ox, oy, R * 1.2, t, { a: .8, dash: [22, 9] });
    ctx.strokeStyle = rgba(PAL.blue, .8); ctx.setLineDash([10, 8]);
    D.line(ctx, ox, oy - R * 1.35, ox, oy - R * 1.35 + R * 2.7 * M.expoOut(inv(2.6, 3.4, lt))); ctx.setLineDash([]);
    for (let i = 0; i < 9; i++) { const y = oy - R + i * R / 4, L = 9 * M.spring(lt - 3.0 - i * .06, 2.4, 6); if (L > 0) D.line(ctx, ox - L, y, ox + L, y); }
    const pv = M.expoInOut(inv(4.2, 5.4, lt));
    const v1 = D.arcPart(ctx, ox - R * .62, oy, R * .8, Math.PI, pv), v2 = D.arcPart(ctx, ox + R * .62, oy, R * .8, 0, pv);
    if (pv > 0 && pv < 1) { D.spark(ctx, v1, .9); D.spark(ctx, v2, .9); }
  };

  if (lt < .75) { colourScene(c); F.iris(ctx, W / 2, H / 2, 1150 * M.expoInOut(inv(0, .75, lt)), xrayScene, { rim: 1 - ss(.55, .75, lt) }); }
  else if (lt < GEN_T[0]) xrayScene();
  else if (lt < 7.85) { xrayScene(); const [sx, sy] = F.toScreen(c, ox, oy); F.iris(ctx, sx, sy, 1150 * M.expoOut(inv(7.5, 7.85, lt)), () => colourScene(c), { rim: 1 - ss(7.7, 7.85, lt) }); }
  else if (lt < 11.55) colourScene(c);
  else {
    // pull out of the drop: the colony shrinks into a lens in the leaf litter of the pond
    const q = s7cam(lt - 12.5), out = Math.pow(inv(11.55, 12.5, lt), 2.5);
    Wd.pond(ctx, q.x, q.y, q.z, t, { level: 556, r: q.r });
    const [lx, ly] = F.toScreen(q, 430, 918), rr = lerp(1150, 18.6 * q.z, out);
    F.iris(ctx, lx, ly, rr, () => colourScene({ x: c.x, y: c.y, z: c.z * rr / 1150, r: c.r }, lx, ly), { col: '#fff6e0', rim: ss(11.6, 11.9, lt) });
    F.zoomLines(ctx, lx, ly, ss(11.6, 11.9, lt) * (1 - ss(12.3, 12.5, lt)), t, { dir: -1, r0: rr * .9, a: .45 });
  }
  if (lt >= GEN_T[0] && lt < 11.55) {
    M.cam(ctx, c);
    F.burst(ctx, ox, oy, lt - GEN_T[0], { r: 300, life: .8, rays: 18, w: 4 });
    F.flash(ctx, lt - GEN_T[0], { a: .55, k: 7 });
  }
  // the division tree grows top-right, a node popping for every doubling
  F.screen(ctx);
  const gens = GEN_T.filter((g) => lt >= g).length;
  const lv = lt < GEN_T[0] ? .33 * ss(1.2, 2, lt) : gens + ss(0, .4, lt - GEN_T[gens - 1]);
  D.divTree(ctx, 860, 74, lv, { w: 140, dy: 38, col: lt < 7.7 ? PAL.cream : '#22303f', a: ss(1.2, 1.8, lt) * (1 - ss(11.5, 11.9, lt)) });
}

module.exports = { s4, s5, s6 };
