// Shots 1-3 (0-25 s): a backlit stained-glass wing pulls back to a monarch basking on milkweed at dawn, takes off and
// loops the title; she tastes a milkweed leaf with her feet and lays one egg under it; macro of the egg over four days
// (x-ray lens on the larva inside, the head darkening the tip); the caterpillar chews out, eats its shell, cuts a ring.
const { W, H, TAU, clamp, lerp, inv, ss, hash, rgba, mix, PAL, rng } = require('./core');
const D = require('./draw');
const M = require('./motion');
const F = require('./fx');
const U = require('./ui');
const Wd = require('./world');
const P = require('./plants');
const B = require('./butterfly');
const Lv = require('./larva');
const S = require('./scene');
const Cr = require('./critters');
const { EV } = require('./cues');

const screen = (ctx) => ctx.setTransform(1, 0, 0, 1, 0, 0);

// ===================================================================== S1: title (0-10)
const PLANT = { x: 560, y: 1480, s: 2.0, seed: 2 };
const LOOP = [[4.4, 0, 0], [5.0, 600, 470], [5.7, 840, 300], [6.4, 820, 90], [7.1, 560, -20], [7.8, 250, 40], [8.4, 150, 250], [9.0, 380, 470], [9.6, 700, 640], [10.2, 900, 820]];

function s1(ctx, lt, t) {
  const tod = lerp(.235, .29, ss(0, 9, lt));
  // where the macro starts: a point on the right forewing of the perched butterfly
  const c = F.rig(lt, [
    [0, { x: 622, y: 500, z: 7.4, r: -.12 }],
    [3.0, { x: 556, y: 560, z: 1.75 }, M.expoInOut],
    [4.35, { x: 548, y: 575, z: 1.55 }, M.sineInOut],
    [5.4, { x: 590, y: 380, z: 1.0 }, M.quintInOut],
    [8.3, { x: 520, y: 300, z: .96 }, M.sineInOut],
    [9.35, { x: 600, y: 560, z: 1.08 }, M.sineInOut],
    [10.0, { x: 760, y: 760, z: 2.6 }, M.expoIn],
  ], { drift: .6, shakes: [[EV.title, 6]] });
  S.meadowBack(ctx, c, t, tod, { sun: [880, 600 - 140 * ss(0, 9, lt)], sunR: 50, rays: .5 + .5 * ss(2, 5, lt), mist: .8, bokehN: 10, flare: ss(2.6, 4, lt) });
  const mac = 1 - ss(1.4, 2.8, lt);
  if (mac > 0) { // golden backlight: the low sun right behind the wing
    screen(ctx);
    const bg = ctx.createRadialGradient(560, 470, 40, 560, 470, 900);
    bg.addColorStop(0, rgba('#fff0b0', mac)); bg.addColorStop(.35, rgba('#ffb04a', mac)); bg.addColorStop(1, rgba('#7a2a10', mac));
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  }
  // mid-ground milkweed and flowers, a little soft
  M.cam(ctx, S.layerCam(c, .8));
  for (let i = 0; i < 6; i++) P.milkweed(ctx, -200 + i * 260, 1280, { s: .9 + hash(i) * .3, t, seed: i + 5, dof: 2.5, leafA: .95 });
  M.cam(ctx, c);
  const plant = P.milkweed(ctx, PLANT.x, PLANT.y, { s: PLANT.s, t, seed: PLANT.seed, pairs: 4 });
  const perch = [plant.top[0] - 8, plant.top[1] - 2 * PLANT.s * 14 - 70];
  // the butterfly: basks with its wings breathing open, flutters, lifts off and loops the title
  const loop = LOOP.map((k, i) => (i === 0 ? [k[0], perch[0], perch[1]] : k));
  if (lt < EV.takeoff) {
    const breathe = .12 + .1 * Math.sin(lt * 1.6), flut = lt > 3.7 ? Math.abs(Math.sin((lt - 3.7) * 9)) * .9 * ss(3.7, 3.9, lt) : 0;
    B.butterfly(ctx, { x: perch[0], y: perch[1], s: 1.35, yaw: -.06, pitch: .18, flap: breathe + flut, glow: 1 - ss(1.5, 3.2, lt), macro: 1 - ss(1.2, 2.6, lt), legs: 1 });
  } else {
    S.trail(ctx, loop, lt, 18, .04, '#fff0c0', ss(4.6, 5, lt));
    S.flyer(ctx, loop, lt, { s: 1.15 - .25 * ss(4.4, 6, lt), f: 4.4, glide: .4 });
  }
  S.foreground(ctx, c, t, { y: 1250, dof: 10 });
  // macro: soft edges so the glass glows in the middle
  if (mac > 0) {
    screen(ctx);
    ctx.save(); ctx.globalCompositeOperation = 'multiply';
    const g = ctx.createRadialGradient(540, 520, 300, 540, 540, 860);
    g.addColorStop(0, rgba('#ffffff')); g.addColorStop(1, rgba(mix('#ffffff', '#6a2a10', mac * .7)));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
  // flare sweeping across the glass
  const fl = inv(EV.flare - .5, EV.flare + 1.2, lt);
  if (fl > 0 && fl < 1) { screen(ctx); ctx.save(); ctx.globalCompositeOperation = 'lighter'; const x = lerp(-200, 1300, M.sineInOut(fl)); const g = ctx.createLinearGradient(x - 220, 0, x + 220, 0); g.addColorStop(0, rgba('#ffd890', 0)); g.addColorStop(.5, rgba('#fff0c8', .35 * Math.sin(Math.PI * fl))); g.addColorStop(1, rgba('#ffd890', 0)); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore(); }
  Wd.motes(ctx, t, { cx: c.x, cy: c.y, n: 30, a: .45 });
  // title
  const ta = 1 - ss(EV.titleOut + .5, EV.titleOut + 1.0, lt);
  if (lt > EV.title - .1 && ta > 0) {
    screen(ctx);
    ctx.save(); ctx.globalAlpha = ta;
    D.glow(ctx, 540, 360, 520, '#2a0c20', .35 * ss(EV.title - .1, EV.title + .4, lt));
    const tp = inv(EV.title, EV.title + .9, lt), to = inv(EV.titleOut, EV.titleOut + .6, lt);
    for (let k = 7; k >= 1; k--) M.kinetic(ctx, 'MONARCH', 540 + k * .9, 330 + k * 1.3, tp, { font: 'RockB', size: 156, track: 12, color: k > 1 ? '#7a2e0c' : '#c4561a', stagger: .55, out: to });
    M.kinetic(ctx, 'MONARCH', 540, 330, tp, { font: 'RockB', size: 156, track: 12, color: '#fff3dc', stagger: .55, out: to });
    const rule = 250 * M.spring(lt - (EV.title + .6), 1.4, 6) * (1 - ss(EV.titleOut, EV.titleOut + .4, lt));
    ctx.strokeStyle = rgba('#ffb347', .95); ctx.lineWidth = 3; if (rule > 0) { D.line(ctx, 540 - rule, 366, 540 + rule, 366); D.dot(ctx, 540, 366, 6 * clamp(rule / 250), '#ffb347'); }
    M.kinetic(ctx, 'the life cycle of a butterfly', 540, 428, inv(EV.title + .7, EV.title + 1.5, lt), { font: 'BaskSI', size: 52, color: '#fff4d2', stagger: .7, out: inv(EV.titleOut - .1, EV.titleOut + .4, lt) });
    ctx.restore();
  }
  F.zoomLines(ctx, 540, 600, ss(EV.dive, EV.dive + .4, lt), t, { r0: 80, a: .5, col: '#fff6dc' });
}

// ===================================================================== S2: the egg (10-20)
// the leaf seen side-on; tilt k = how much of its face we see (+ top surface, - underside)
const LEAF = { x: 250, y: 640, ang: -.05, L: 620, W: 170, curl: .04 };
function tiltLeaf(ctx, o, k) {
  // leaf edge thickness, then the leaf face squashed by k
  ctx.save(); ctx.translate(0, 5); ctx.globalAlpha *= .6; P.leaf(ctx, { ...o, flat: true, col: '#2c5420', W: o.W * Math.max(.05, Math.abs(k)) }); ctx.restore();
  ctx.save(); ctx.translate(o.x, o.y); ctx.rotate(o.ang); ctx.scale(1, k); ctx.rotate(-o.ang); ctx.translate(-o.x, -o.y);
  P.leaf(ctx, { ...o, under: k < 0, light: k < 0 ? .6 : 1.2 });
  ctx.restore();
}
const leafPt = (u, v, k) => { const p = P.leafAt(LEAF, u, 0), q = P.leafAt(LEAF, u, v); return [q[0], p[1] + (q[1] - p[1]) * k]; };
function eggMacro(ctx, c, lt, t, o = {}) {
  const hz = S.macroBack(ctx, c, t, { hz: 560 });
  M.cam(ctx, c);
  return hz;
}
const EGG = { x: 540, y: 800, h: 360 };

function s2(ctx, lt, t) {
  if (lt < EV.macro - 10) return s2leaf(ctx, lt, t);
  s2egg(ctx, lt, t);
}
function s2leaf(ctx, lt, t) {
  const swing = M.expoInOut(inv(2.9, 3.7, lt));
  const k = lerp(.5, -.95, swing);
  const c = F.rig(lt, [
    [0, { x: 640, y: 520, z: 1.0 }],
    [.6, { x: 590, y: 600, z: 1.35 }, M.expoOut],
    [2.6, { x: 575, y: 620, z: 1.55 }, M.sineInOut],
    [3.0, { x: 575, y: 640, z: 1.55 }],
    [3.75, { x: 610, y: 720, z: 6.5 }, M.expoIn],
  ], { drift: .5, shakes: [[EV.lay - 10, 5]] });
  S.meadowBack(ctx, c, t, .33, { sun: [960, 520], sunR: 46, rays: .5, bokehN: 12, bokehA: .2 });
  M.cam(ctx, S.layerCam(c, .7));
  for (let i = 0; i < 5; i++) P.milkweed(ctx, -100 + i * 300, 1300, { s: 1.1, t, seed: i + 11, dof: 5 });
  { const [bx, by, bh] = Cr.beePath(t, 260, 860, 260, 110, 9); Cr.bee(ctx, bx, by, 1.0, bh, t, { alpha: .9 }); }
  M.cam(ctx, c);
  // the plant's stem and a second leaf behind
  P.stem(ctx, [[LEAF.x - 6, 1400], [LEAF.x - 14, 1000], [LEAF.x, LEAF.y], [LEAF.x - 24, 200]], 26, 18, { col: '#6f924a' });
  P.leaf(ctx, { x: LEAF.x - 10, y: 420, ang: Math.PI + .5, L: 420, W: 120, curl: -.08, col: '#5a9440' });
  tiltLeaf(ctx, LEAF, k);
  const feet = leafPt(.5, .5, k), eggPos = leafPt(.6, .88, k);
  const laid = lt > EV.lay - 10;
  if (laid && k < 0) {
    const pop = M.spring(lt - (EV.lay - 10), 2.4, 6);
    ctx.save(); ctx.translate(eggPos[0], eggPos[1]); ctx.scale(clamp(pop, 0, 1.3), clamp(pop, 0, 1.3)); Lv.egg(ctx, 0, 0, 18, { rot: Math.PI, noShadow: true }); ctx.restore();
  }
  // butterfly: flies in from the left, lands on the leaf, tastes it, curls her abdomen over the edge to lay
  const perch = [feet[0], feet[1] - 33];
  const landK = [[0, 80, 300], [.35, 300, 420], [.62, perch[0] - 20, perch[1] - 30], [.75, perch[0], perch[1]]];
  const leaveK = [[EV.leave - 10, perch[0], perch[1]], [EV.leave - 10 + .5, perch[0] + 140, perch[1] - 120], [EV.leave - 10 + 1.2, 980, 240]];
  if (lt < .7) S.flyer(ctx, landK, lt, { s: 1.05, f: 5 });
  else if (lt < EV.leave - 10) {
    const curl = ss(.95, 1.6, lt) * (1 - ss(2.25, 2.55, lt));
    const tap = (EV.taste[0] - 10 < lt && lt < EV.taste[1] - 10 + .25) ? Math.abs(Math.sin((lt - 1) * 18)) : 0;
    B.butterfly(ctx, { x: perch[0], y: perch[1] - tap * 2, s: 1.05, yaw: Math.PI / 2 + .08, roll: -Math.PI / 2 + .2, pitch: 0, flap: 1.32 + .08 * Math.sin(lt * 3), legs: 1, abdCurl: curl * 1.3 });
  } else S.flyer(ctx, leaveK, lt, { s: 1.05, f: 5 });
  screen(ctx);
  // feet tasting the leaf: little rings
  for (const tt of EV.taste) { const age = lt - (tt - 10), p = F.toScreen(c, feet[0] + 8, feet[1]); if (age > 0 && age < .7) D.ring(ctx, p[0], p[1], 8 + 50 * age, '#fff6d0', 1 - age / .7, 2.5); }
  // the egg leaves her abdomen: a glint at the leaf edge
  const tip = F.toScreen(c, perch[0] - 48, feet[1] + 26);
  F.burst(ctx, tip[0], tip[1], lt - (EV.lay - 10), { r: 60, col: '#fff2c0', life: .6, rays: 10 });
  D.glow(ctx, tip[0], tip[1], 40, '#fff6d0', .8 * Math.exp(-Math.max(0, lt - (EV.lay - 10)) * 3) * (lt > EV.lay - 10 ? 1 : 0));
  F.zoomLines(ctx, 540, 560, ss(3.1, 3.6, lt), t, { a: .45, col: '#f4ffe0' });
  F.flash(ctx, lt - 3.68, { a: .85, k: 26, col: '#f8fff0' });
}

// egg macro 13.75-20 and hatch 20-25 share this stage
function eggCam(lt0) {
  return F.rig(lt0, [
    [0, { x: 600, y: 580, z: 1.5, r: .05 }],
    [.7, { x: 560, y: 640, z: 1.0, r: -.02 }, M.expoOut],
    [2.6, { x: 470, y: 600, z: 1.12, r: .03 }, M.sineInOut],
    [4.6, { x: 610, y: 650, z: 1.22, r: -.03 }, M.sineInOut],
    [5.6, { x: 545, y: 590, z: 1.4, r: 0 }, M.sineInOut],
    [7.2, { x: 620, y: 650, z: 1.08, r: .02 }, M.sineInOut],
  ], { drift: 1.2, seed: 3 });
}
function s2egg(ctx, lt, t) {
  const lt0 = lt - (EV.macro - 10), c = eggCam(lt0);
  eggMacro(ctx, c, lt, t);
  const day = lt < EV.days[0] - 10 ? 0 : 1 + Math.min(3, EV.days.filter((d) => lt >= d - 10).length - 1) + clamp((lt - (EV.days[EV.days.length - 1] - 10)) / 1, 0, .99);
  const dark = ss(EV.days[2] - 10, EV.days[3] - 10 + .5, lt);
  const trem = lt > EV.tremble - 10 ? Math.sin(t * 40) * .03 * ss(EV.tremble - 10, EV.tremble - 10 + .2, lt) : 0;
  const hole = M.expoOut(inv(EV.chew - 10, EV.chew - 10 + .6, lt));
  Lv.egg(ctx, EGG.x, EGG.y, EGG.h, { dark, hole, rot: trem, curled: true });
  if (hole > .5) { // the black head pushes up through the hole
    const hp = ss(EV.chew - 10 + .4, 10, lt);
    D.dot(ctx, EGG.x, EGG.y - EGG.h * .86 - hp * 18, 22 * hp, Lv.INK);
    D.dot(ctx, EGG.x - 6, EGG.y - EGG.h * .86 - hp * 18 - 8, 5 * hp, '#ffffff', .25);
  }
  // scale bar: a real egg is about 1.2 mm tall
  const ra = ss(EV.macro - 10 + 1.1, EV.macro - 10 + 1.6, lt) * (1 - ss(18.2 - 10, 18.6 - 10, lt));
  const es0 = F.toScreen(c, EGG.x - 260, EGG.y), es1 = F.toScreen(c, EGG.x - 260, EGG.y - EGG.h / 1.2);
  if (ra > 0) { screen(ctx); ctx.save(); ctx.globalAlpha = ra; ctx.strokeStyle = rgba('#fff8e6'); ctx.lineWidth = 3; D.line(ctx, es0[0], es0[1], es1[0], es1[1] + (es0[1] - es1[1]) * (1 - M.expoOut(clamp((lt - 4.85) * 2)))); D.line(ctx, es0[0] - 12, es0[1], es0[0] + 12, es0[1]); D.line(ctx, es1[0] - 12, es1[1], es1[0] + 12, es1[1]); D.text(ctx, '1 mm', es0[0] - 22, (es0[1] + es1[1]) / 2 + 10, { font: 'DIN', size: 34, color: '#fff8e6', align: 'right' }); ctx.restore(); }
  // day badge
  U.badge(ctx, 930, 170, day, ss(EV.days[0] - 10 - .3, EV.days[0] - 10, lt) * (1 - ss(19.6 - 10, 20 - 10, lt)), { n: 4, r: 80 });
  // x-ray lens on the larva growing inside
  const lp = inv(EV.days[1] - 10 - .2, EV.days[1] - 10 + .5, lt) * (1 - ss(EV.tremble - 10 - .2, EV.tremble - 10 + .2, lt));
  if (lp > 0) {
    const src = F.toScreen(c, EGG.x, EGG.y - EGG.h * .45);
    D.callout(ctx, { x: src[0], y: src[1], r: 60 }, { x: 830, y: 450, r: 150 }, lp, (g, kk) => {
      g.save(); g.translate(830, 450); g.fillStyle = rgba('#0a1830'); g.fillRect(-160, -160, 320, 320);
      F.blueprint(g, { x: 0, y: 0, z: 1 }, .5, 30);
      const grow = ss(EV.days[1] - 10, EV.days[3] - 10, lt);
      g.strokeStyle = rgba('#bfe6ff', .9); g.lineWidth = 3; g.beginPath(); g.ellipse(0, 10, 70, 110, 0, 0, TAU); g.stroke();
      // the curled larva: segments brightening as it forms, already squirming
      for (let i = 0; i < 12; i++) { const a = -2.4 + i * .42 * (.8 + .2 * grow) + Math.sin(t * 3 + i * .6) * .06 * grow, r = 38 + Math.sin(t * 2.2) * 3 * grow; const x = Math.cos(a) * r, y = 10 + Math.sin(a) * r * 1.3; D.dot(g, x, y, (6 + 5 * grow) * (1 - i * .03), mix('#6fb8e8', '#e8f6ff', grow), .5 + .5 * grow); }
      D.dot(g, Math.cos(-2.4) * 38, 10 + Math.sin(-2.4) * 49, 13 * grow + 4, '#ffffff', .9 * grow);
      g.restore();
    }, { col: '#dff4ff', bg: '#0a1830' });
  }
  Wd.motes(ctx, t, { cx: c.x * 3, cy: c.y * 3, n: 34, a: .55 });
  F.flash(ctx, lt - (EV.macro - 10), { a: .6, k: 10, col: '#f8fff0' });
}

// ===================================================================== S3: hatch, first meal, ring trench (20-25)
function s3(ctx, lt, t) {
  if (lt < 3.0) return s3out(ctx, lt, t);
  s3trench(ctx, lt, t);
}
function s3out(ctx, lt, t) {
  const c0 = eggCam(lt + 20 - EV.macro), follow = ss(.2, 1.2, lt) * (1 - ss(1.7, 2.4, lt));
  const c = { ...c0, x: lerp(c0.x, 640, follow), y: lerp(c0.y, 560, follow), z: c0.z * (1 + .18 * follow) };
  eggMacro(ctx, c, lt, t);
  const L = 300, top = EGG.y - EGG.h * .86;
  // path = the surface it walks on: up the inside of the shell, over the rim of the hole, down the outside, onto the leaf
  const side = []; for (let i = 0; i <= 24; i++) { const v = .86 - i / 24 * .66; side.push([EGG.x + Lv.eggProfile(v) * EGG.h, EGG.y - v * EGG.h]); }
  const first = Lv.polyPath([[EGG.x - 10, EGG.y - 20], [EGG.x - 6, top + 40], [EGG.x + 10, top - 6], ...side, [EGG.x + Lv.eggProfile(.08) * EGG.h + 26, EGG.y]]);
  const path = Lv.polyPath([...first.pts, [EGG.x + 1400, EGG.y]]);
  const out = M.sineInOut(inv(EV.emerge - 20, 1.9, lt));
  const s0 = lerp(0, first.len + 200 - L, out);
  const eat = lt > 1.9;
  // the egg (eaten from the top on each munch after it is out)
  const bites = EV.shell.filter((x) => lt > x - 20).length;
  const eggH = EGG.h * (1 - bites * .2 - (lt > EV.shell[3] - 20 + .3 ? .2 : 0));
  // body inside the egg is hidden: clip it out
  ctx.save();
  ctx.beginPath(); ctx.rect(-2000, -2000, 5000, 5000);
  for (let i = 0; i <= 40; i++) { const v = i / 40; const px = Lv.eggProfile(v) * EGG.h, py = EGG.y - v * EGG.h; if (i) ctx.lineTo(EGG.x + px, py); else ctx.moveTo(EGG.x + px, py); }
  for (let i = 40; i >= 0; i--) { const v = i / 40; ctx.lineTo(EGG.x - Lv.eggProfile(v) * EGG.h, EGG.y - v * EGG.h); }
  ctx.closePath(); ctx.clip('evenodd');
  if (!eat) Lv.larva(ctx, { path, s0, L, instar: 1, phase: lt * 1.4, step: .4, t, up: 1 });
  ctx.restore();
  if (eggH > 10) {
    ctx.save(); ctx.beginPath(); ctx.rect(0, EGG.y - eggH, W, eggH + 50); ctx.clip();
    Lv.egg(ctx, EGG.x, EGG.y, EGG.h, { hole: 1, noShadow: bites > 0 });
    ctx.restore();
    if (bites > 0) { ctx.strokeStyle = rgba('#fffbe8', .9); ctx.lineWidth = 3; ctx.beginPath(); const r = Lv.eggProfile(eggH / EGG.h) * EGG.h; for (let i = 0; i <= 12; i++) { const x = EGG.x - r + i / 12 * r * 2, y = EGG.y - eggH + (i % 2 ? 6 : -4); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); } ctx.stroke(); }
  }
  if (eat) { // turned round on the leaf, munching the shell down
    const p2 = Lv.linePath(EGG.x + 380, EGG.y - 2, Math.PI);
    Lv.larva(ctx, { path: p2, s0: 0, L, instar: 1, eat: 1, chew: lt, t, up: -1 });
    for (const b of EV.shell) { const age = lt - (b - 20); if (age > 0 && age < .5) { for (let i = 0; i < 5; i++) D.dot(ctx, EGG.x + 60 + Math.cos(i * 2.1) * age * 120, EGG.y - eggH + Math.sin(i * 1.3) * age * 80 + age * age * 300, 4, '#f6e9bf', 1 - age * 2); } }
  }
  F.flash(ctx, lt - 2.95, { a: .7, k: 20, col: '#f8fff0' });
}
// top-down: the tiny caterpillar walks a ring, cutting the latex veins; white latex beads; then it eats the disc inside
function s3trench(ctx, lt, t) {
  const l = lt - 3.0;
  const c = F.rig(l, [[0, { x: 540, y: 540, z: 1.5, r: .1 }], [2, { x: 540, y: 540, z: 1.15, r: -.05 }, M.sineInOut]], { drift: .6, seed: 9 });
  screen(ctx); ctx.fillStyle = rgba('#3f7a2e'); ctx.fillRect(0, 0, W, H);
  M.cam(ctx, c);
  P.leaf(ctx, { x: -300, y: 560, ang: -.08, L: 1800, W: 620, curl: 0, macro: 1, veinA: .45 });
  const R0 = 150, cx = 520, cy = 540, prog = clamp(l / 1.5);
  // trench ring with latex beads
  ctx.strokeStyle = rgba('#e8f0c0', .95); ctx.lineWidth = 9; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(cx, cy, R0, -Math.PI / 2, -Math.PI / 2 + TAU * prog); ctx.stroke();
  for (let i = 0; i < 14; i++) { const a = -Math.PI / 2 + TAU * i / 14; if (i / 14 > prog) break; D.dot(ctx, cx + Math.cos(a) * R0, cy + Math.sin(a) * R0, 6 * ss(i / 14, i / 14 + .1, prog), '#ffffff', .95); }
  const eatIn = ss(1.5, 2.0, l);
  if (eatIn > 0) { ctx.fillStyle = rgba('#1f3a14', eatIn * .85); ctx.beginPath(); ctx.arc(cx, cy, R0 * .92 * eatIn, 0, TAU); ctx.fill(); }
  const ang = -Math.PI / 2 + TAU * prog, circ = [];
  for (let i = 0; i <= 60; i++) { const a = ang - 1.6 + i / 60 * 1.6; circ.push([cx + Math.cos(a) * R0, cy + Math.sin(a) * R0]); }
  Lv.larva(ctx, { path: Lv.polyPath(circ), s0: Lv.polyPath(circ).len - 230, L: 220, instar: 1, phase: l * 2, t, up: -1, shadow: false });
  F.whipLines(ctx, 0, ss(1.6, 2.0, l), t, { a: .3, col: '#f4ffe0' });
}

module.exports = { s1, s2, s3, tiltLeaf, LEAF };
