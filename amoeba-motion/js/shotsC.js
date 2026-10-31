// Shots 7–9 (45–67.5 s). Drought: a flickering time-lapse dries the pond (the sun jumps along its arc, the water steps
// down), we dive back into the litter where a sepia front sweeps the drop, the amoeba snaps its pseudopods in and walls
// itself into a cyst; nights wheel overhead. Rain: drops splash and run along the cracks, a big one hits the cyst and
// we dive in; colour blooms, the shell bursts and six young amoebae crawl away. The cycle: an iris closes into the ring,
// stations pop in, a comet runs the loop, and everything spirals back into a single point.
const { W, H, TAU, BAR, clamp, lerp, inv, ss, ease, hash, noise1, rng, rgba, PAL } = require('./core');
const D = require('./draw');
const A = require('./amoeba');
const Wd = require('./world');
const M = require('./motion');
const F = require('./fx');
const { T } = require('./tex');
const { s7cam } = require('./cast');

const DRY = { k: .9, c0: '#f0d9a8', c1: '#d9b77a', c2: '#a77a4c' };
const SPRING = { c0: '#d4f6d6', c1: '#8edbc6', c2: '#4fb0b8' };
function vignette(ctx, a) {
  F.screen(ctx);
  const g = ctx.createRadialGradient(540, 540, 300, 540, 540, 800);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(5,3,8,${a})`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}

// =====================================================================
// S7 — drought (45–53.75)
// =====================================================================
const DAY = .5;
function s7(ctx, lt, t) {
  if (lt < 2.75) return s7pond(ctx, lt, t);
  if (lt < 6.25) { const c = F.rig(lt - 2.75, CAM7B, { drift: .6, seed: 31 }); return s7micro(ctx, lt - 2.75, t, c, W / 2, H / 2); }
  return s7night(ctx, lt - 6.25, t);
}
function s7pond(ctx, lt, t) {
  const c = s7cam(lt);
  const day = Math.floor(lt / DAY), f = (lt / DAY) % 1, night = f > .74;
  const lv = clamp((day + ss(.05, .6, f)) / 5), level = lerp(556, 905, lv), dry = clamp(lv * 1.15);
  const u = clamp(f / .74), sx = 140 + u * 800, sy = 330 - Math.sin(Math.PI * u) * 240;
  Wd.pond(ctx, c.x, c.y, c.z, 45 + lt * 6, { dry, level, sunX: night ? -900 : sx, sunY: sy, heat: ss(.6, 1.6, lt), r: c.r });
  // the lens we just backed out of closes over the leaf litter
  const lens0 = 18.6 * c.z * (1 - ss(0, .4, lt));
  if (lens0 > 1) {
    const [lx, ly] = F.toScreen(c, 430, 918);
    F.iris(ctx, lx, ly, lens0, () => Wd.micro(ctx, 540, 560, .03, t + 90, { sx: lx, sy: ly, swim: false, fg: false }), { col: '#fff6e0', rim: 1 - ss(.2, .4, lt) });
  }
  M.cam(ctx, c);
  // red: the sun's daily path ticked out, and the water level falling notch by notch
  const arc = []; for (let i = 0; i <= 40; i++) { const v = i / 40; arc.push([140 + v * 800, 330 - Math.sin(Math.PI * v) * 240]); }
  D.tickPath(ctx, arc, M.expoOut(inv(.3, 1.25, lt)), PAL.red, .85, 40, 8, 2.2, true);
  ctx.strokeStyle = rgba(PAL.red, .9); ctx.lineWidth = 2.4; ctx.lineCap = 'round';
  for (let d = 0; d <= Math.min(day, 5); d++) {
    const y = lerp(556, 905, d / 5), L = 22 * clamp(M.spring(lt - d * DAY - .3, 2.4, 6), 0, 1.3);
    if (L > 0) D.line(ctx, 1010 - L, y, 1010 + L, y);
  }
  D.arrow(ctx, 1010, 560, 1010, Math.max(600, level), 1, PAL.red, 2.6, 16, ss(.3, .7, lt));
  if (night) {
    F.fill(ctx, '#141a3f', .5);
    const mx = 140 + (1 - u) * 800, my = 330 - Math.sin(Math.PI * u) * 200, [px, py] = F.toScreen(c, mx, my);
    D.glow(ctx, px, py, 70, '#fff4d0', .45); D.dot(ctx, px, py, 24, '#fff4d6'); D.dot(ctx, px + 10, py - 5, 21, '#2a2f5c');
  }
  // dive back into the leaf litter: a lens opens there and swallows the frame
  const dive = M.expoIn(inv(2.3, 2.75, lt));
  if (dive > 0) {
    const [lx, ly] = F.toScreen(c, 430, 918), rr = lerp(30, 1150, dive), sx2 = lerp(lx, 540, dive), sy2 = lerp(ly, 540, dive);
    const cb = F.rig(0, CAM7B, { drift: .6, seed: 31 });
    F.iris(ctx, sx2, sy2, rr, () => s7micro(ctx, 0, t, { x: cb.x, y: cb.y, z: cb.z * rr / 1150, r: cb.r }, sx2, sy2), { col: '#fff6e0', rim: 1 - ss(2.6, 2.75, lt) });
    F.zoomLines(ctx, sx2, sy2, ss(2.3, 2.5, lt), t, { r0: rr * .95, a: .5 });
  }
}
const CAM7B = [[0, { x: 540, y: 545, z: .9, r: -.06 }], [.7, { x: 540, y: 545, z: 1.25, r: -.03 }, M.expoOut], [3.5, { x: 540, y: 545, z: 1.45, r: .04 }, M.sineInOut]];
function s7micro(ctx, l2, t, c, sx, sy) {
  const front = lerp(-250, 1350, M.sineInOut(inv(.05, 1.5, l2)));
  if (front < 1300) Wd.micro(ctx, c.x, c.y, c.z, t + 120, { r: c.r, sx, sy });
  if (front > -200) {
    const edge = (y) => front + 40 * noise1(y * .01 + t * .7, 7) + 25 * Math.sin(y * .03);
    ctx.save(); F.screen(ctx); ctx.beginPath(); ctx.moveTo(-10, -10);
    for (let y = -10; y <= H + 10; y += 30) ctx.lineTo(edge(y), y);
    ctx.lineTo(-10, H + 10); ctx.closePath(); ctx.clip();
    Wd.micro(ctx, c.x, c.y, c.z, t + 120, Object.assign({ r: c.r, sx, sy }, DRY));
    ctx.restore();
    if (front < 1250) {
      F.screen(ctx); ctx.strokeStyle = 'rgba(255,243,214,.7)'; ctx.lineWidth = 3; ctx.beginPath();
      for (let y = -10; y <= H + 10; y += 30) ctx.lineTo(edge(y), y);
      ctx.stroke();
    }
  }
  M.cam(ctx, c, sx, sy);
  const sep = .8 * ss(400, 760, front), ox = 540, oy = 545;
  // drying cracks race across the substrate
  ctx.strokeStyle = rgba('#5a3622', .75 * ss(.4, 1, l2)); ctx.lineWidth = 2.4; ctx.lineCap = 'round';
  for (let k = 0; k < 16; k++) {
    const a = hash(k) * TAU, r0 = 330 + hash(k + 3) * 200, pts = [];
    for (let s = 0; s < 9; s++) pts.push([ox + Math.cos(a + Math.sin(s + k) * .15) * (r0 + s * 45), oy + Math.sin(a + Math.sin(s * 1.3 + k) * .15) * (r0 + s * 45)]);
    D.strokePart(ctx, pts, M.expoOut(inv(.4 + hash(k + 7) * .7, 1.0 + hash(k + 7) * .9, l2)), false, false);
  }
  const wall = inv(1.2, 2.6, l2), nn = l2 < 2.45 ? 1 : l2 < 2.8 ? 2 : l2 < 3.15 ? 4 : 8;
  if (wall <= 0) {
    const P0 = [{ a: -.3, L: 220, w: 50 }, { a: 2.4, L: 190, w: 46 }, { a: 1.2, L: 160, w: 40 }];
    const pods = P0.map((p, i) => ({ a: p.a, L: p.L * Math.max(0, 1 - M.spring(l2 - (.65 + i * .14), 1.8, 5)), w: p.w }));
    const rd = ss(.7, 1.3, l2), R = lerp(170, 150, rd);
    const o = { x: ox, y: oy, R, t, seed: 3, round: rd, sep, pods, stretch: { a: .4, k: .1 * M.wobble(l2 - 1.0, 2.4, 4) }, nuc: { a: Math.PI + .4, u: .25 * (1 - rd), r: 32 }, cv: { a: 2.2, u: .6, r: 22, ph: .5 }, food: [] };
    A.body(ctx, o);
    P0.forEach((p, i) => { const age = l2 - (.65 + i * .14); if (age > 0 && age < .35) F.marks(ctx, ox + Math.cos(p.a) * R * 1.1, oy + Math.sin(p.a) * R * 1.1, p.a + Math.PI, 1 - age / .35, t, { n: 3, len: 60, spread: 26, back: -70 }); });
  } else {
    const s = 1 + .07 * M.wobble(l2 - 1.2, 2, 4);
    A.cyst(ctx, ox, oy, 150 * s, { p: wall, sep, nuclei: nn, t });
    F.shiver(ctx, ox, oy, 175, ss(1.4, 1.6, l2) * (1 - ss(2.1, 2.3, l2)), t, { a: 0, col: '#fff3dc' });
    for (const tb of [2.45, 2.8, 3.15]) F.burst(ctx, ox, oy, l2 - tb, { r: 120, life: .45, rays: 8, col: '#fff3dc', w: 2.5 });
  }
  // blue construction of the wall layers, swept by pen tips, then turning while they harden
  for (let i = 0; i < 3; i++) {
    const r = 150 * (1.08 + i * .1), p = M.expoInOut(inv(.75 + i * .2, 1.55 + i * .2, l2)), fade = 1 - ss(2.3, 2.9, l2);
    if (fade <= 0 || p <= 0) continue;
    ctx.strokeStyle = rgba(PAL.blue, .85 * fade); ctx.lineWidth = 1.5;
    if (p < 1) { const tp = D.arcPart(ctx, ox, oy, r, -Math.PI / 2 + i + t * .6, p); D.spark(ctx, tp, .9, fade); }
    else F.turningRing(ctx, ox, oy, r, t * (i % 2 ? -1 : 1), { a: .85 * fade, w: 1.5 });
  }
}
function s7night(ctx, l3, t) {
  const c = F.rig(l3, [[0, { x: 540, y: 540, z: .85, r: -.04 }], [2.5, { x: 540, y: 700, z: 1.4, r: .03 }, M.quartOut]], { drift: .4, seed: 41 });
  Wd.nightSky(ctx, t, { trail: .15 + l3 * .55, rot: l3 * .55, px: 540, py: 150 });
  F.screen(ctx);
  for (const [t0, x0, y0] of [[.5, 180, 80], [1.6, 760, 140]]) {
    const u = (l3 - t0) / .45;
    if (u < 0 || u > 1) continue;
    const x = x0 + u * 300, y = y0 + u * 120;
    ctx.strokeStyle = rgba('#fff6dc', .8 * (1 - u)); ctx.lineWidth = 2; ctx.lineCap = 'round'; D.line(ctx, x - 90, y - 36, x, y);
    D.dot(ctx, x, y, 2.5, '#ffffff', 1 - u);
  }
  const mu = l3 / 2.5, mx = lerp(150, 930, mu), my = 320 - Math.sin(Math.PI * mu) * 190;
  D.glow(ctx, mx, my, 90, '#fff4d0', .4);
  D.dot(ctx, mx, my, 30, '#fff4d6'); D.dot(ctx, mx + 12, my - 6, 26, '#28306a');
  M.cam(ctx, c);
  const gy = (x) => 760 + Math.sin(x * .02) * 6 + (hash(Math.round(x)) - .5) * 4;
  ctx.fillStyle = '#2b2238'; ctx.beginPath(); ctx.moveTo(-200, gy(-200)); for (let x = -200; x <= 1280; x += 30) ctx.lineTo(x, gy(x)); ctx.lineTo(1280, 1400); ctx.lineTo(-200, 1400); ctx.closePath(); ctx.fill();
  ctx.save(); ctx.clip(); D.texture(ctx, T.hatchL, .12, 0, 0, true);
  ctx.strokeStyle = 'rgba(246,234,208,.28)'; ctx.lineWidth = 1.8; ctx.lineJoin = 'round';
  for (let i = 0; i < 24; i++) {
    let x = -160 + i * 60 + hash(i) * 30, y = 764; ctx.beginPath(); ctx.moveTo(x, y);
    for (let s = 0; s < 5; s++) { x += (hash(i * 9 + s) - .5) * 40; y += 14 + hash(i * 7 + s) * 26; ctx.lineTo(x, y); }
    ctx.stroke();
  }
  ctx.restore();
  ctx.strokeStyle = 'rgba(246,234,208,.5)'; ctx.lineWidth = 2; ctx.beginPath(); for (let x = -200; x <= 1280; x += 30) ctx.lineTo(x, gy(x)); ctx.stroke();
  const beat = .5 + .5 * Math.sin(t * 2.6);
  D.glow(ctx, 540, 770, 80 + 20 * beat, '#ffd9a0', .22 + .12 * beat);
  A.cyst(ctx, 540, 770, 24, { p: 1, sep: .55, nuclei: 4, t });
  F.screen(ctx);
  ctx.lineCap = 'round';
  for (let i = 0; i < 46; i++) {
    const sp = 160 + hash(i + 1) * 220, x = ((hash(i) * W + t * sp) % (W + 80)) - 40, y = 560 + hash(i + 2) * 300 + Math.sin(t * 3 + i) * 8;
    ctx.strokeStyle = rgba('#e9d6b0', .35); ctx.lineWidth = 1.4; D.line(ctx, x - sp * .06, y, x, y);
    D.dot(ctx, x, y, 1.6, '#f1e2c2', .6);
  }
  D.tally(ctx, 70, 64, 3 + l3 * 6.4, PAL.cream, 42, .9);
}

// =====================================================================
// S8 — rain and rebirth (53.75–61.25)
// =====================================================================
const DROPS = (() => { const r = rng(808), o = []; for (let tt = 0; tt < 2.5;) { tt += 1 / (6 + 28 * Math.min(1, tt / 2)); o.push({ t: tt, x: 150 + r() * 780, y: 150 + r() * 780 }); } return o; })();
const YOUNG = Array.from({ length: 6 }, (_, i) => {
  const a = i * TAU / 6 + .3;
  return { a, birth: 58.0 + i * .15, G: A.makeGait({ t0: 58.0 + i * .15, x: 540 + Math.cos(a) * 80, y: 540 + Math.sin(a) * 80, h: a, R: 62, step: .75, len: 62, n: 15, turn: .35, seed: 40 + i, sideP: .5 }) };
});
function young(i, t) {
  const y = YOUNG[i], R = 62 * clamp(M.spring(t - y.birth, 1.6, 5), 0, 1.2);
  const g = A.gaitAt(y.G, t, Math.max(R, 1));
  return { x: g.x, y: g.y, R, t: t + i * 3, seed: 20 + i, pods: g.pods, lead: g.lead, flow: g.flow, stretch: g.stretch, g, nuc: { a: g.h + Math.PI, u: .25, r: R * .22 }, cv: { a: g.h + 2, u: .6, r: R * .15, ph: (((t + i * .4) / BAR) % 1 + 1) % 1 }, food: [] };
}
const CAM8B = [[0, { x: 540, y: 540, z: 1.3, r: .08 }], [1.6, { x: 540, y: 540, z: 1.08, r: 0 }, M.expoOut], [5.0, { x: 540, y: 540, z: .74, r: -.05 }, M.sineInOut]];
const s8cam = (l2) => F.rig(l2, CAM8B, { drift: .6, seed: 51, shakes: [[1.65, 12]] });
function s8(ctx, lt, t) {
  if (lt < 2.5) return s8mud(ctx, lt, t);
  const l2 = lt - 2.5, c = s8cam(l2);
  const bloom = 1150 * M.expoOut(inv(0, 1.6, l2));
  if (bloom < 1100) s8scene(ctx, l2, t, c, DRY, .6);
  F.iris(ctx, 540, 540, bloom, () => s8scene(ctx, l2, t, c, SPRING, lerp(.6, 0, ss(0, 1.2, l2))), { col: '#ffffff', rim: 1 - ss(1.2, 1.6, l2) });
  M.cam(ctx, c);
  F.burst(ctx, 540, 540, l2 - 1.65, { r: 360, life: .8, rays: 16, w: 4 });
  F.flash(ctx, l2 - 1.65, { a: .4, k: 8 });
  F.screen(ctx);
  W8(ctx, t, 6 * (1 - ss(0, 2, l2)));
}
const W8 = (ctx, t, rate) => Wd.ripples(ctx, t, rate, 53.75, { col: '#ffffff' });
function s8scene(ctx, l2, t, c, look, sepK) {
  Wd.micro(ctx, c.x, c.y, c.z, t + 150, Object.assign({ r: c.r }, look));
  const open = inv(.65, 1.65, l2), out = l2 - 1.65;
  if (out < 0) {
    A.cyst(ctx, 540, 540, 150, { p: 1, sep: sepK, nuclei: 6, crack: open, t });
    F.shiver(ctx, 540, 540, 180, ss(.7, .9, l2), t, { a: Math.PI / 4, col: '#ffffff' });
    return;
  }
  // shell fragments fly off with drag and spin
  for (let i = 0; i < 6; i++) {
    const a0 = i * TAU / 6 + .2, d = 330 * (1 - Math.exp(-3.2 * out)), rot = (hash(i) - .5) * 3 * (1 - Math.exp(-2 * out)), fa = 1 - ss(.6, 1.4, out);
    if (fa <= 0) continue;
    const fx = 540 + Math.cos(a0 + .425) * 164, fy = 540 + Math.sin(a0 + .425) * 164;
    ctx.save(); ctx.translate(fx + Math.cos(a0 + .425) * d, fy + Math.sin(a0 + .425) * d); ctx.rotate(rot); ctx.translate(-fx, -fy);
    ctx.globalAlpha = fa;
    ctx.beginPath(); ctx.arc(540, 540, 178, a0, a0 + .85); ctx.arc(540, 540, 150, a0 + .85, a0, true); ctx.closePath();
    ctx.fillStyle = '#b07a4c'; ctx.fill(); ctx.save(); ctx.clip(); D.texture(ctx, T.hatchX, .5, 540, 540); ctx.restore();
    ctx.strokeStyle = '#5a3622'; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.restore();
  }
  const dg = ss(2.2, 2.6, l2) * (1 - ss(4.2, 4.7, l2));
  for (let i = 0; i < 6; i++) {
    const tb = YOUNG[i].birth, tt = 53.75 + 2.5 + l2;
    if (tt < tb) continue;
    const o = young(i, tt);
    if (dg > 0) {
      const tr = []; for (let s = tb; s <= tt; s += .1) { const q = A.gaitAt(YOUNG[i].G, s); tr.push([q.x, q.y]); }
      if (tr.length > 1) D.tickPath(ctx, tr, 1, PAL.red, dg * .8, 26, 6, 2, true);
      const L = 2.2 * 62 + 40 * M.spring(tt - tb - .6, 1.8, 5);
      D.arrow(ctx, o.x, o.y, o.x + Math.cos(o.g.h) * L, o.y + Math.sin(o.g.h) * L, 1, PAL.red, 2.6, 15, dg);
    }
    if (tt - tb < .4) F.marks(ctx, o.x, o.y, YOUNG[i].a, 1 - (tt - tb) / .4, t, { n: 3, len: 50, spread: 30, back: 70 });
    A.body(ctx, o); A.cvBurst(ctx, o);
  }
}
function s8mud(ctx, lt, t) {
  const c = F.rig(lt, [[0, { x: 540, y: 540, z: .8, r: -.07 }], [1.0, { x: 540, y: 540, z: .9, r: -.04 }, M.expoOut], [2.05, { x: 540, y: 540, z: 1.06, r: .02 }, M.sineInOut], [2.5, { x: 540, y: 540, z: 3.6, r: .12 }, M.expoIn]], { drift: .5, seed: 61 });
  const src = [];
  for (const d of DROPS) { const age = lt - d.t; if (age > 0 && src.length < 30) src.push([d.x, d.y, 150 * M.expoOut(clamp(age / 1.4))]); }
  const flood = 950 * M.expoOut(inv(2.05, 2.5, lt));
  Wd.mud(ctx, c.x, c.y, c.z, t, { src, flood, floodAt: [[540, 540]], r: c.r });
  // the cyst waits; target rings close in on it before the big drop lands
  if (lt < 2.2) A.cyst(ctx, 540, 540, 22, { p: 1, sep: .55, nuclei: 4, t });
  for (let i = 0; i < 3; i++) { const u = inv(1.5 + i * .12, 2.05, lt); if (u > 0 && u < 1) D.ring(ctx, 540, 540, lerp(190, 26, M.expoIn(u)), '#e6f8ff', .8 * Math.sin(Math.PI * u), 2); }
  for (const d of DROPS) {
    const age = lt - d.t;
    if (age < 0 || age > 1.1) continue;
    const a = 1 - age / 1.1;
    D.ring(ctx, d.x, d.y, age * 90, '#e6f8ff', a * .8, 2); D.ring(ctx, d.x, d.y, age * 54, '#e6f8ff', a * .5, 1.5);
    for (const [dx, dy, life] of M.burst(age, 7, Math.round(d.x * 13 + d.y), { v: 170, drag: 5, life: .35 })) D.dot(ctx, d.x + dx, d.y + dy, 2.4, '#ffffff', life);
    if (age < .1) D.dot(ctx, d.x, d.y, 5, '#ffffff', 1 - age / .1);
  }
  for (const [dx, dy, life] of M.burst(lt - 2.05, 22, 99, { v: 520, drag: 4, life: .5 })) D.dot(ctx, 540 + dx, 540 + dy, 5, '#ffffff', life);
  F.burst(ctx, 540, 540, lt - 2.05, { r: 220, life: .5, rays: 14, col: '#ffffff' });
  Wd.rain(ctx, t, ss(0, .6, lt));
  // big out-of-focus drops whipping past the lens
  F.screen(ctx); ctx.lineCap = 'round';
  for (let i = 0; i < 7; i++) {
    const y = ((t * 1500 + hash(i) * 1400) % 1500) - 250, x = 60 + hash(i + 1) * 960;
    ctx.strokeStyle = rgba('#eaf8ff', .16 * ss(0, .5, lt)); ctx.lineWidth = 10 + hash(i + 2) * 8; D.line(ctx, x, y - 160, x - 12, y);
  }
  // dive into the splash: the drop of water opens onto the cyst below
  const dive = M.expoIn(inv(2.12, 2.5, lt));
  if (dive > 0) {
    const cb = s8cam(0), rr = lerp(20, 1150, dive);
    F.iris(ctx, 540, 540, rr, () => s8scene(ctx, 0, t, { x: cb.x, y: cb.y, z: cb.z * rr / 1150, r: cb.r }, DRY, .6), { col: '#ffffff', rim: 1 - ss(2.4, 2.5, lt) });
  }
  F.flash(ctx, lt - 2.05, { a: .45, k: 9 });
  F.zoomLines(ctx, 540, 540, ss(2.1, 2.3, lt), t, { r0: 120, a: .5 });
}

// =====================================================================
// S9 — the cycle as a diagram, title, back to a point (61.25–67.5)
// =====================================================================
const STATIONS = 5;
const passT = (i) => 2.05 + 1.95 * Math.acos(1 - 2 * i / STATIONS) / Math.PI;
function s9(ctx, lt, t) {
  const e = M.expoInOut(inv(0, 1.25, lt)), cx = 540, cy = lerp(540, 520, e), Rr = 300, rot = lt * .2;
  const ir = lerp(820, Rr, e), fade = ss(1.0, 1.9, lt);
  const imp = Math.pow(inv(4.1, 4.85, lt), 3), RR = Rr * (1 - imp);
  F.fill(ctx, PAL.night);
  if (fade < 1) {
    F.iris(ctx, cx, cy, ir, () => {
      const c8 = s8cam(5 + lt);
      Wd.micro(ctx, c8.x, c8.y, c8.z * lerp(1, .68, e), t + 150, Object.assign({ sx: 540, sy: cy, r: c8.r + lt * .05 }, SPRING));
      for (let i = 0; i < 6; i++) { const o = young(i, t); A.body(ctx, o); A.cvBurst(ctx, o); }
      F.fill(ctx, PAL.night, fade);
    }, { rim: 0 });
  }
  vignette(ctx, .5 * ss(0, .8, lt));
  ctx.strokeStyle = rgba(PAL.blue, .9); ctx.lineWidth = 1.8;
  ctx.beginPath(); ctx.arc(cx, cy, Math.max(1, lt < 4.1 ? ir : RR), 0, TAU); ctx.stroke();
  // ticks spring out round the ring, which keeps turning
  ctx.strokeStyle = rgba(PAL.blue, .7 * (1 - imp)); ctx.lineWidth = 1.2;
  for (let i = 0; i < 60; i++) {
    const L = (i % 5 ? 7 : 15) * M.spring(lt - 1.0 - i * .008, 2.5, 6);
    if (L <= 0) continue;
    const a = -Math.PI / 2 + TAU * i / 60 + rot;
    D.line(ctx, cx + Math.cos(a) * (RR + 12), cy + Math.sin(a) * (RR + 12), cx + Math.cos(a) * (RR + 12 + L), cy + Math.sin(a) * (RR + 12 + L));
  }
  const travel = M.sineInOut(inv(2.05, 4.0, lt)), dotA = -Math.PI / 2 + rot + TAU * travel;
  if (travel > 0) {
    // a comet laps the cycle, its tail fading behind it
    for (let s = 0; s < 24; s++) {
      const a1 = Math.max(-Math.PI / 2 + rot, dotA - s * .045), a0 = Math.max(-Math.PI / 2 + rot, dotA - (s + 1) * .045);
      if (a1 <= a0) break;
      ctx.strokeStyle = rgba(PAL.gold, .95 * (1 - s / 24) * (1 - imp)); ctx.lineWidth = 4.5 - s * .15;
      ctx.beginPath(); ctx.arc(cx, cy, RR, a0, a1); ctx.stroke();
    }
    ctx.strokeStyle = rgba(PAL.gold, .35 * (1 - imp)); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx, cy, RR, -Math.PI / 2 + rot, dotA); ctx.stroke();
  }
  const icons = [
    (x, y, s) => A.body(ctx, { x, y, R: 30 * s, t, seed: 3, pods: [{ a: -.4 + .3 * Math.sin(t * 2), L: 40 * s * (.8 + .3 * Math.sin(t * 3)), w: 11 * s }, { a: 2.4, L: 30 * s * (.7 + .3 * Math.sin(t * 2.4)), w: 9 * s }], nuc: { a: 3.5, u: .25, r: 6 * s }, food: [], n: 90, grains: 20 }),
    (x, y, s) => { const cl = .5 + .5 * Math.sin(t * 3); A.body(ctx, { x: x - 6 * s, y, R: 30 * s, t, seed: 4, pods: [{ a: -.15 - .4 * cl, L: 42 * s, w: 10 * s }, { a: .15 + .4 * cl, L: 42 * s, w: 10 * s }], nuc: { a: 3.5, u: .25, r: 6 * s }, food: [], n: 90, grains: 20 }); Wd.alga(ctx, x + 30 * s, y + 4 * s, 9 * s, Math.sin(t * 4) * .4, t, { noFlag: true }); },
    (x, y, s) => A.dividing(ctx, { x, y, R: 32 * s, t, seed: 3, axis: 0 }, .7 + .15 * Math.sin(t * 2.5)),
    (x, y, s) => { D.glow(ctx, x, y, 50 * s, '#ffd9a0', .25 + .15 * Math.sin(t * 3)); A.cyst(ctx, x, y, 26 * s, { p: 1, sep: .5, nuclei: 4, t }); },
    (x, y, s) => { const u = (t * .8) % 1; for (let i = 0; i < 4; i++) { const a = i * TAU / 4 + .5; A.mini(ctx, { x: x + Math.cos(a) * 26 * s * (.4 + .8 * u), y: y + Math.sin(a) * 26 * s * (.4 + .8 * u), R: 11 * s, t, seed: 30 + i, alpha: 1 - ss(.7, 1, u), pods: [{ a, L: 14 * s, w: 4 * s }] }); } },
  ];
  for (let i = 0; i < STATIONS; i++) {
    const a = -Math.PI / 2 + TAU * i / STATIONS + rot + imp * 2.5, x = cx + Math.cos(a) * RR, y = cy + Math.sin(a) * RR;
    const pop = clamp(M.spring(lt - (1.3 + i * .18), 1.8, 5), 0, 1.25) * (1 - imp);
    if (pop <= 0) continue;
    let punch = M.wobble(lt - passT(i), 2.2, 5); if (i === 0) punch += M.wobble(lt - 4.0, 2.2, 5);
    const lit = Math.exp(-Math.pow(((dotA - (a - imp * 2.5)) % TAU + TAU) % TAU, 2) * 30) * (travel > 0 && travel < 1 ? 1 : 0);
    const r = 66 * pop * (1 + .22 * punch);
    D.glow(ctx, x, y, r * 2.2, PAL.gold, .35 * lit);
    const g = ctx.createRadialGradient(x - r * .3, y - r * .3, 4, x, y, Math.max(5, r));
    g.addColorStop(0, '#d4f6d6'); g.addColorStop(1, '#6fc3bd');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.clip(); icons[i](x, y, pop); ctx.restore();
    D.ring(ctx, x, y, r, PAL.cream, 1, 2.4); D.ring(ctx, x, y, r + 8, PAL.blue, .7, 1);
    const a2 = a + TAU / STATIONS / 2, chx = cx + Math.cos(a2) * RR, chy = cy + Math.sin(a2) * RR;
    ctx.save(); ctx.translate(chx, chy); ctx.rotate(a2 + Math.PI / 2); ctx.strokeStyle = rgba(PAL.blue, Math.min(1, pop)); ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.moveTo(-6, -9); ctx.lineTo(4, 0); ctx.lineTo(-6, 9); ctx.stroke(); ctx.restore();
  }
  if (travel > 0 && travel < 1) { const px = cx + Math.cos(dotA) * RR, py = cy + Math.sin(dotA) * RR; D.glow(ctx, px, py, 44, PAL.gold, .85); D.dot(ctx, px, py, 6.5, '#fff6dc'); }
  M.kinetic(ctx, 'AMOEBA', cx, cy + 12, inv(2.2, 2.95, lt), { size: 54, track: 20, color: PAL.cream, stagger: .55, out: inv(3.95, 4.45, lt) });
  M.kinetic(ctx, 'one cell, an endless cycle', cx, cy + 54, inv(2.6, 3.4, lt), { font: 'DidotI', size: 24, color: PAL.gold, stagger: .7, out: inv(4.0, 4.5, lt) });
  // everything collapses back into the single point the film began with, on the closing bell
  const pt = ss(4.7, 4.9, lt) * (1 - ss(5.7, 6.2, lt));
  if (pt > 0) { D.glow(ctx, cx, cy, 70 + 20 * Math.sin(lt * 9), PAL.gold, .75 * pt); D.dot(ctx, cx, cy, 4.5, '#fff6dc', pt); }
  F.burst(ctx, cx, cy, lt - 4.85, { r: 160, life: .7, rays: 12, col: PAL.gold, w: 2.5 });
}

module.exports = { s7, s8, s9 };
