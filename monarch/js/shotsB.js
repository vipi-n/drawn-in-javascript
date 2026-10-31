// Shots 4-6 (25-50 s): five instars on a milkweed leaf in time-lapse (eating the edge away, four molts, frass, the
// leaf shrinking around it); a blue jay grabs it, tastes the milkweed poison (x-ray) and spits it out; the grown
// caterpillar wanders under a twig at golden hour, spins a silk pad, drops into a J and hangs through the night.
const { W, H, TAU, clamp, lerp, inv, ss, hash, rgba, mix, PAL, rng } = require('./core');
const D = require('./draw');
const M = require('./motion');
const F = require('./fx');
const U = require('./ui');
const Wd = require('./world');
const P = require('./plants');
const Lv = require('./larva');
const Bd = require('./birds');
const S = require('./scene');
const { EV } = require('./cues');

const screen = (ctx) => ctx.setTransform(1, 0, 0, 1, 0, 0);

// ===================================================================== S4: growing up (25-37.5)
const LF = { x: -160, y: 760, ang: -.03, L: 1500, W: 300, curl: 0 };
const INSTAR = [
  { a: 25.0, L: 64, z: 2.9, u: .2 },
  { a: 27.5, L: 104, z: 2.3, u: .31 },
  { a: 30.0, L: 168, z: 1.75, u: .44 },
  { a: 32.5, L: 270, z: 1.32, u: .58 },
  { a: 35.0, L: 440, z: .98, u: .76 },
];
const EDGE = (() => { const pts = []; for (let i = 0; i <= 120; i++) pts.push(P.leafAt(LF, i / 120, -1)); return Lv.polyPath(pts); })();
const sAtU = (u) => { // arc length of the top edge at leaf fraction u
  let best = 0, bd = 1e9; const p = P.leafAt(LF, u, -1);
  for (let s = 0; s < EDGE.len; s += 4) { const q = EDGE.at(s); const d = (q[0] - p[0]) ** 2 + (q[1] - p[1]) ** 2; if (d < bd) { bd = d; best = s; } }
  return best;
};
const HEAD_S = INSTAR.map((k) => sAtU(k.u));
function instarAt(t) { let i = 0; for (let k = 0; k < INSTAR.length; k++) if (t >= INSTAR[k].a) i = k; return i; }
// bites eaten out of the top edge so far (leaf coords)
function bites(t) {
  const out = [[.02, -1, .3, 1]];
  INSTAR.forEach((k, i) => {
    if (t < k.a) return;
    const end = INSTAR[i + 1] ? INSTAR[i + 1].a - .5 : 37.4, g = ss(k.a + .4, end, t);
    const u = k.u + k.L * .06 / LF.L;
    out.push([u, -1.05, (k.L * .45 / LF.W) * (.15 + .85 * g), i + 3]);
    if (i > 1) out.push([u - k.L * .25 / LF.L, -1.02, (k.L * .3 / LF.W) * g, i + 9]);
  });
  if (t > EV.bird) { const k = INSTAR[4]; out.push([k.u + k.L * .06 / LF.L + .02, -1.05, (k.L * .5 / LF.W), 21]); }
  return out;
}
function leafStage(ctx, c, t, o = {}) {
  S.meadowBack(ctx, c, t, o.tod ?? .45, { sun: [980, 360], sunR: 44, rays: .35, bokehN: 18, bokehA: .22, dof: 6, clouds: 4 });
  M.cam(ctx, S.layerCam(c, .75));
  for (let i = 0; i < 6; i++) P.milkweed(ctx, -400 + i * 380, 1500, { s: 1.4, t, seed: i + 21, dof: 7, umbels: i % 2 === 0 });
  M.cam(ctx, c);
  P.stem(ctx, [[LF.x - 10, 1800], [LF.x - 40, 1200], [LF.x, LF.y], [LF.x - 60, -200]], 40, 26, { col: '#6f924a' });
  P.leaf(ctx, { x: LF.x - 20, y: 220, ang: Math.PI + .4, L: 900, W: 220, curl: -.06, col: '#5a9440', dof: 3 });
  P.leaf(ctx, { ...LF, bites: bites(t), light: 1.1, veinA: .85, macro: .8, rim: .5 });
}
// the caterpillar of instar i on the edge
function edgeLarva(ctx, i, t, o = {}) {
  const k = INSTAR[i], L = o.L ?? k.L, sh = o.headS ?? HEAD_S[i];
  return Lv.larva(ctx, { path: EDGE, s0: sh - L, L, instar: i + 1, t, eat: o.eat ?? 1, chew: t, up: 1, dull: o.dull ?? 0, limp: o.limp ?? 0, toxin: o.toxin, alpha: o.alpha, lift: o.lift });
}
// time-lapse: patches of sunlight sliding across the leaf as the days pass (screen space, additive)
function dapple(ctx, c, t) {
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'lighter';
  for (let k = 0; k < 7; k++) {
    const x = ((hash(k * 3) * 1600 + t * (120 + 60 * hash(k))) % 1700) - 300, y = 300 + hash(k * 3 + 1) * 600 + Math.sin(t * .7 + k) * 60, r = 160 + hash(k + 9) * 160;
    D.glow(ctx, x, y, r, '#fff6c8', .13);
  }
  ctx.restore();
}

function s4(ctx, lt, t) {
  const i = instarAt(t);
  const keys = [];
  INSTAR.forEach((q, j) => { // each stage: a slow truck past the caterpillar, then a spring out to the next size
    const mid = EDGE.at(HEAD_S[j] - q.L * .5), side = j % 2 ? 1 : -1, tr = j === 0 ? 2.4 : 1;
    keys.push([q.a - 25 + (j ? .5 : 0), { x: mid[0] - side * 70 * tr / q.z, y: mid[1] - 70 / q.z, z: q.z * (j === 0 ? 1.2 : 1.06), r: side * .03 }, j ? M.expoOut : undefined]);
    keys.push([(INSTAR[j + 1] ? INSTAR[j + 1].a : 37.5) - 25, { x: mid[0] + side * 90 * tr / q.z, y: mid[1] - 40 / q.z, z: q.z * .9, r: -side * .03 }, M.sineInOut]);
  });
  const c0 = F.rig(lt, keys, { drift: 1.2, shakes: EV.molts.map((m) => [m - 25, 5]) });
  const c = { ...c0, r: c0.r + Math.sin(t * 1.1) * .012 };
  leafStage(ctx, c, t);
  M.cam(ctx, c);
  dapple(ctx, c, t);
  // previous skins left on the leaf
  EV.molts.forEach((m, j) => {
    const age = t - m;
    if (age < 0 || age > 2.2) return;
    const q = INSTAR[j], p = EDGE.at(HEAD_S[j] - q.L * .95);
    Lv.exuvia(ctx, p[0], p[1], q.L * .5, q.L * .08, Math.atan2(p[3], p[2]), { alpha: 1 - ss(1.4, 2.2, age), head: false });
    // the old head capsule pops off and falls
    const hp = EDGE.at(HEAD_S[j]), fx = hp[0] + age * 120, fy = hp[1] - 20 + age * 90 + age * age * 900;
    ctx.save(); ctx.translate(fx, fy); ctx.rotate(age * 9); D.dot(ctx, 0, 0, q.L * .07, Lv.INK); ctx.restore();
  });
  // molt: freeze and dull before, the new bigger caterpillar slides out of the old skin
  const m = EV.molts.findIndex((x) => t >= x - .55 && t < x + .7);
  if (m >= 0 && t < EV.molts[m]) {
    const q = INSTAR[m], d = ss(EV.molts[m] - .55, EV.molts[m] - .1, t);
    edgeLarva(ctx, m, t, { eat: 1 - d, dull: d * .7, limp: d * .5 });
    screen(ctx); const hp = F.toScreen(c, ...EDGE.at(HEAD_S[m] - q.L * .5).slice(0, 2)); F.shiver(ctx, hp[0], hp[1] - 20 * c.z, q.L * .5 * c.z, d, t);
  } else if (m >= 0) {
    const age = t - EV.molts[m], q = INSTAR[m + 1], prev = INSTAR[m];
    const L = lerp(prev.L * 1.05, q.L, M.spring(age, 1.8, 6)), sh = lerp(HEAD_S[m], HEAD_S[m + 1], M.expoOut(clamp(age / .7)));
    edgeLarva(ctx, m + 1, t, { L, headS: sh, eat: ss(.3, .7, age) });
    screen(ctx); const hp = F.toScreen(c, ...EDGE.at(sh - L * .5).slice(0, 2));
    F.burst(ctx, hp[0], hp[1], age, { r: 160, col: '#fffbe0', life: .6, rays: 12 });
    F.flash(ctx, age, { a: .25, k: 10, col: '#ffffff' });
  } else edgeLarva(ctx, i, t, { lift: ss(36.6, 37.4, t) * .5, eat: 1 - ss(36.6, 37.0, t) });
  // frass: little pellets dropping on the beat
  M.cam(ctx, c);
  for (let b = 0; b < 20; b++) {
    const tb = 25.3 + b * .625, age = t - tb, j = instarAt(tb), q = INSTAR[j];
    if (age < 0 || age > .9) continue;
    const p = EDGE.at(HEAD_S[j] - q.L * .98);
    D.dot(ctx, p[0] - age * 40, p[1] + 10 + age * age * 1400, q.L * .03, '#3a5a22', 1 - ss(.6, .9, age));
  }
  S.foreground(ctx, c, t, { y: 1300, dof: 12, n: 6, seed: 5 });
  // HUD: stage badge, 1 cm ruler that shrinks as we zoom out, weight counter at the end
  U.badge(ctx, 932, 172, i + 1, ss(25.2, 25.6, t) * (1 - ss(37.1, 37.5, t)), { n: 5, r: 80, word: 'STAGE' });
  U.ruler(ctx, 60, 990, 98 * c.z, 10, ss(25.4, 25.8, t) * (1 - ss(37.1, 37.5, t)), { label: '1 cm' });
  const xa = ss(EV.x2000, EV.x2000 + .2, t) * (1 - ss(37.1, 37.5, t));
  if (xa > 0) {
    const v = Math.round(Math.pow(2000, M.expoOut(clamp((t - EV.x2000) / 1.1))));
    const pop = M.spring(t - EV.x2000, 2, 6);
    screen(ctx); ctx.save(); ctx.translate(800, 330); ctx.scale(clamp(pop, 0, 1.2), clamp(pop, 0, 1.2)); ctx.translate(-800, -330);
    U.counter(ctx, 800, 360, v, xa, { size: 110, fmt: (x) => '×' + Math.round(x).toLocaleString('en-US'), col: '#fff3dc' });
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    D.text(ctx, 'heavier in two weeks', 800, 412, { font: 'BaskSI', size: 36, color: '#fff3dc', alpha: xa * clamp((t - EV.x2000 - .3) * 3), align: 'center' });
    ctx.restore();
  }
}

// ===================================================================== S5: the bird (37.5-42.5)
function heldPts(tip, L, sw) {
  const pts = [];
  for (let i = 0; i <= 20; i++) { const u = i / 20, a = Math.PI / 2 + sw * u + .5 * u * u; pts.push([tip[0] + Math.cos(a) * u * L * .2 - 10, tip[1] + Math.sin(a) * u * L * 1.0]); }
  return pts.reverse();
}
function s5(ctx, lt, t) {
  const k = INSTAR[4], head = EDGE.at(HEAD_S[4]), mid = EDGE.at(HEAD_S[4] - k.L * .5);
  const grab = EV.grab - 37.5, spit = EV.spit - 37.5, land = EV.land2 - 37.5, off = EV.flyoff - 37.5, xt = EV.xray - 37.5;
  const c = F.rig(lt, [
    [0, { x: mid[0] + 60, y: mid[1] - 60, z: .92 }],
    [.9, { x: mid[0] + 40, y: mid[1] - 110, z: .85 }, M.sineInOut],
    [1.6, { x: mid[0] + 60, y: mid[1] - 300, z: .72 }, M.expoOut],
    [2.6, { x: mid[0] + 40, y: mid[1] - 260, z: .78 }, M.sineInOut],
    [3.2, { x: mid[0] + 60, y: mid[1] - 80, z: .9 }, M.expoOut],
    [5.0, { x: mid[0] + 40, y: mid[1] - 60, z: .98 }, M.sineInOut],
  ], { drift: .7, shakes: [[grab, 16], [spit, 10], [land, 8]] });
  leafStage(ctx, c, t);
  M.cam(ctx, c);
  // the shadow sweeping over the leaf
  const sh = inv(0, 1.0, lt);
  if (sh > 0 && sh < 1) { ctx.save(); ctx.filter = 'blur(30px)'; ctx.fillStyle = rgba('#0a1a10', .35 * Math.sin(Math.PI * sh)); ctx.beginPath(); ctx.ellipse(lerp(-800, 2200, sh), mid[1] - 40, 380, 120, -.2, 0, TAU); ctx.fill(); ctx.restore(); }
  // jay: dives in, grabs, hovers gagging, spits, leaves
  const JK = [[0, -1400, -900], [grab - .35, mid[0] - 520, mid[1] - 380], [grab, head[0] - 330, head[1] + 10], [grab + .5, head[0] - 260, head[1] - 380], [spit, head[0] - 200, head[1] - 380], [off, head[0] - 120, head[1] - 460], [off + 1.6, head[0] + 1800, head[1] - 1400]];
  const [jx, jy, jh] = S.flight(JK, lt);
  const gag = ss(xt + .3, xt + .5, lt) * (1 - ss(off + .2, off + .4, lt));
  const shake = gag * Math.sin(lt * 34) * .22 + (lt > spit && lt < spit + .25 ? -.5 * Math.sin(Math.PI * (lt - spit) / .25) : 0);
  const jay = { x: jx, y: jy, s: 2.6, dir: 1, flap: Math.sin(lt * 26) * (lt > grab - .2 && lt < grab + .1 ? .2 : 1), beak: lt < grab - .15 ? ss(grab - .6, grab - .3, lt) : lt < spit ? .15 : lt < spit + .3 ? 1 : .2, shake, gag, tilt: Math.sin(jh) * .3 };
  const held = lt >= grab && lt < spit, falling = lt >= spit && lt < land;
  if (!held && !falling) {
    edgeLarva(ctx, 4, t, { eat: lt < .3 || lt > land + .4 ? 1 : 0, lift: lt < grab ? ss(.4, .9, lt) * .5 : 0 });
    if (lt > land) { screen(ctx); const p = F.toScreen(c, mid[0], mid[1] - 40); for (let r = 0; r < 3; r++) { const age = lt - land - .3 - r * .35; if (age > 0 && age < 1) D.ring(ctx, p[0], p[1], 60 + age * 260, ['#ffd23a', '#ffffff', '#c45cff'][r], (1 - age) * .9, 5); } M.cam(ctx, c); }
  }
  let beakTip = null;
  if (lt > grab - 1.2 && lt < off + 1.6) beakTip = Bd.jay(ctx, jay);
  const sw = Math.sin(lt * 7) * .25 + shake * .6;
  if (held && beakTip) Lv.larva(ctx, { path: Lv.polyPath(heldPts(beakTip, k.L, sw)), s0: 0, L: k.L, instar: 5, t, up: 1, limp: .5, shadow: false, toxin: ss(xt, xt + .3, lt) * (1 - ss(spit - .1, spit, lt)) });
  if (falling) {
    const u = (lt - spit) / (land - spit), x0 = beakTip ? beakTip[0] : head[0] - 100, y0 = (beakTip ? beakTip[1] : head[1] - 300) + 60;
    const x = lerp(x0, mid[0], u), y = lerp(y0, mid[1] - k.L * .12, u) - Math.sin(Math.PI * u) * 160;
    const rot = u * 4, pts = []; for (let i = 0; i <= 16; i++) { const a = rot + i / 16 * 2.2; pts.push([x + Math.cos(a) * k.L * .32, y + Math.sin(a) * k.L * .32]); }
    Lv.larva(ctx, { path: Lv.polyPath(pts), s0: 0, L: k.L * .95, instar: 5, t, up: -1, shadow: false });
  }
  // x-ray iris on the caterpillar in the beak: the stored poison glows
  const xr = inv(xt, xt + .25, lt) * (1 - inv(spit - .15, spit + .05, lt));
  if (xr > 0 && beakTip) {
    const p = F.toScreen(c, beakTip[0] - 20, beakTip[1] + k.L * .45);
    F.iris(ctx, p[0], p[1], 250 * M.expoOut(xr), (g) => {
      g.fillStyle = rgba('#120a24'); g.fillRect(0, 0, W, H);
      M.cam(g, c); F.blueprint(g, c, .6, 60, { col: '#5a3a9a' });
      const path = Lv.polyPath(heldPts(beakTip, k.L, sw));
      g.save(); g.globalAlpha = .45; Lv.larva(g, { path, s0: 0, L: k.L, instar: 5, t, up: 1, limp: .5, shadow: false }); g.restore();
      Lv.larva(g, { path, s0: 0, L: k.L, instar: 5, t, up: 1, limp: .5, toxin: 1.7, alpha: .75, shadow: false });
    }, { col: '#e8c8ff', col2: '#c45cff' });
  }
  screen(ctx);
  if (gag > 0 && beakTip) { const p = F.toScreen(c, jx + 150, jy - 150); F.shiver(ctx, p[0], p[1], 110, gag, t, { col: '#c8ff9a', w: 4 }); }
  F.flash(ctx, lt - grab, { a: .35, k: 14, col: '#ffffff' });
  F.whipLines(ctx, 0, ss(4.6, 5.0, lt) * 1.2, t, { a: .4, col: '#fff6e0' });
}

// ===================================================================== S6: wander, silk pad, J-hang, night (42.5-50)
const TWIG = (() => { const pts = []; for (let x = -1400; x <= 2400; x += 40) pts.push([x, 520 + 24 * Math.sin(x * .0026) + 10 * Math.sin(x * .011)]); return pts; })();
const TW_R = 18;
const UNDER = Lv.polyPath(TWIG.map(([x, y]) => [x, y + TW_R]));
const PAD_S = 1650; // where the silk pad goes (arc length along the twig underside)
function twigDraw(ctx) {
  D.ribbon(ctx, TWIG, TW_R * 2, TW_R * 1.6, true);
  const g = ctx.createLinearGradient(0, 480, 0, 560); g.addColorStop(0, '#a07a52'); g.addColorStop(1, '#4a3020');
  ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = rgba('#2a1a10', .5); ctx.lineWidth = 2; ctx.stroke();
  for (let i = 0; i < 26; i++) { const p = TWIG[i * 3 + 2]; ctx.strokeStyle = rgba('#d8b890', .35); ctx.lineWidth = 2; D.line(ctx, p[0] - 10, p[1] - 6, p[0] + 14, p[1] - 4); }
  P.leaf(ctx, { x: 300, y: 500, ang: -2.3, L: 260, W: 70, col: '#6a8a3a', curl: .1 });
  P.leaf(ctx, { x: 1240, y: 516, ang: -.9, L: 300, W: 80, col: '#7a9440', curl: -.1 });
}
function s6(ctx, lt, t) {
  const L = 440, crawlEnd = 2.5, padT = EV.silk - 42.5, cutT = 4.1, dropT = EV.drop - 42.5, curlT = EV.curl - 42.5, nightT = EV.night - 42.5;
  const tod = lt < nightT ? lerp(.665, .72, lt / nightT) : lerp(.72, .96, ss(nightT, 7.4, lt));
  // the crawl phase moves it forward until the head reaches the pad spot
  const step = .55 * L / (13 + .55), phase = Math.min(lt, crawlEnd) * 1.25;
  const s0 = PAD_S - L - crawlEnd * 1.25 * step;
  const hp = UNDER.at(s0 + L + phase * step), atPad = UNDER.at(PAD_S);
  const c = lt < cutT ? F.rig(lt, [
    [0, { x: hp[0] - 300, y: hp[1] + 60, z: .9 }],
    [crawlEnd, { x: atPad[0] - 220, y: atPad[1] + 40, z: .95 }, M.sineInOut],
    [padT + .3, { x: atPad[0] - 40, y: atPad[1] + 30, z: 1.7 }, M.expoInOut],
    [cutT, { x: atPad[0] - 20, y: atPad[1] + 30, z: 1.8 }, M.sineInOut],
  ], { drift: .6 }) : F.rig(lt - cutT, [
    [0, { x: atPad[0] + 300, y: atPad[1] + 120, z: .95 }],
    [dropT - cutT + .3, { x: atPad[0] + 160, y: atPad[1] + 230, z: .9 }, M.expoOut],
    [3.4, { x: atPad[0] + 110, y: atPad[1] + 260, z: 1.05 }, M.sineInOut],
  ], { drift: .5, shakes: [[dropT - cutT, 7]] });
  S.meadowBack(ctx, c, t, tod, { sun: [200, 760 - 300 * (1 - ss(0, nightT, lt))], sunR: 58, sunA: 1 - ss(nightT, nightT + .8, lt), rays: .6 * (1 - ss(nightT - .5, nightT + .5, lt)), bokehN: 16, bokehA: .2, dof: 5, bokehCols: ['#ffd090', '#ffb070', '#fff0c0'] });
  if (lt > nightT) { const mp = F.toScreen(S.layerCam(c, .1), 840, 240 - 120 * ss(nightT, 7.4, lt)); Wd.moon(ctx, mp[0], mp[1], 34, ss(nightT + .3, nightT + 1.2, lt)); }
  M.cam(ctx, c);
  twigDraw(ctx);
  // silk pad: strands woven back and forth under the twig
  const silk = ss(padT, padT + 1.4, lt);
  if (silk > 0) {
    const r = rng(4); ctx.lineCap = 'round';
    for (let i = 0; i < Math.floor(60 * silk); i++) { const a = atPad[0] + (r() - .5) * 46, b = atPad[0] + (r() - .5) * 46; ctx.strokeStyle = rgba('#ffffff', .55); ctx.lineWidth = 1.4; D.line(ctx, a, atPad[1] + 2 + r() * 4, b, atPad[1] + 2 + r() * 6); }
    D.glow(ctx, atPad[0], atPad[1] + 4, 40, '#ffffff', .35 * silk);
  }
  if (lt < cutT) {
    const spin = lt > padT && lt < cutT ? Math.sin(lt * 14) * .3 : 0;
    const res = Lv.larva(ctx, { path: UNDER, s0, L, instar: 5, t, up: -1, phase: lt < crawlEnd ? phase : crawlEnd * 1.25, lift: spin, shadow: false });
    if (lt > padT && lt < cutT) { // a glinting thread from the mouth to the pad
      const h = res.head; ctx.strokeStyle = rgba('#ffffff', .85); ctx.lineWidth = 1.5; D.line(ctx, h.x + h.fx * h.r, h.y + h.fy * h.r, atPad[0] + Math.sin(lt * 14) * 18, atPad[1] + 4);
      screen(ctx); const sp = F.toScreen(c, atPad[0] + Math.sin(lt * 14) * 18, atPad[1] + 4); D.spark(ctx, sp, 1.2, .9); M.cam(ctx, c);
    }
  } else {
    // tail gripping the pad: drop down, curl into the J, then go limp through the night
    const drop = clamp(M.spring(lt - dropT, 1.6, 5.5), 0, 1.08), curl = M.sineInOut(inv(curlT, curlT + .7, lt));
    const sway = Math.sin(lt * 2.2) * .03 * (1 - ss(nightT, nightT + 1.5, lt));
    ctx.save(); ctx.translate(atPad[0], atPad[1]); ctx.rotate(sway); ctx.translate(-atPad[0], -atPad[1]);
    Lv.larva(ctx, { path: Lv.jPath(atPad[0], atPad[1] + 2, L * .97, lt < dropT ? 0 : drop, curl), s0: 0, L, instar: 5, t, up: -1, limp: ss(nightT, 7.3, lt), shadow: false });
    ctx.restore();
  }
  // night time-lapse: a clock races through the hours
  const hrs = lerp(0, 15, ss(nightT + .2, 7.2, lt)), ca = ss(nightT + .2, nightT + .6, lt) * (1 - ss(7.2, 7.5, lt));
  U.clock(ctx, 930, 180, 70, hrs, ca, { col: '#9fc8ff', label: `${Math.round(hrs)} h`, labelCol: '#e8f0ff' });
  screen(ctx);
  F.whipLines(ctx, Math.PI, ss(cutT - .25, cutT, lt) * (1 - ss(cutT, cutT + .25, lt)) * 1.3, t, { a: .4, col: '#fff0d8' });
  F.whipLines(ctx, 0, (1 - ss(0, .35, lt)) * 1.2, t, { a: .4, col: '#fff0d8' });
  F.flash(ctx, lt - cutT, { a: .4, k: 14 });
  F.zoomLines(ctx, 540, 600, ss(7.1, 7.5, lt), t, { dir: -1, a: .35, col: '#cfe0ff' });
}

module.exports = { s4, s5, s6, TWIG, UNDER, PAD_S, twigDraw };
