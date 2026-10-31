// Shots 11-13 (82.5-112.5 s): sipping nectar with the uncoiled proboscis; male and female side by side; a courtship
// spiral and a mated pair; a quick egg-laying montage across milkweed plants; a map of the summer's four generations
// moving north (season wheel); autumn: the long-lived 4th generation rises, joins a river of monarchs over fall colours,
// steers by the sun, and the routes converge across the map on the mountains of central Mexico (4,800 km counter).
const { W, H, TAU, clamp, lerp, inv, ss, hash, rgba, mix, PAL, rng } = require('./core');
const D = require('./draw');
const M = require('./motion');
const F = require('./fx');
const U = require('./ui');
const Wd = require('./world');
const P = require('./plants');
const B = require('./butterfly');
const Lv = require('./larva');
const Mp = require('./map');
const S = require('./scene');
const Cr = require('./critters');
const { EV } = require('./cues');

const screen = (ctx) => ctx.setTransform(1, 0, 0, 1, 0, 0);

// ===================================================================== S11: adult life (82.5-92.5)
function s11(ctx, lt, t) {
  const sexes = EV.sexes - 82.5, court = EV.court - 82.5, eggs = EV.eggs[0] - 82.5;
  if (lt < sexes) return nectar(ctx, lt, t);
  if (lt < court) return twoSexes(ctx, lt - sexes, t);
  if (lt < eggs) return courtship(ctx, lt - court, t);
  return eggMontage(ctx, lt - eggs, t);
}
function nectar(ctx, lt, t) {
  const c = F.rig(lt, [[0, { x: 620, y: 520, z: 1.1 }], [.8, { x: 560, y: 560, z: 1.7 }, M.expoOut], [2.5, { x: 548, y: 568, z: 1.85 }, M.sineInOut]], { drift: .6 });
  S.meadowBack(ctx, c, t, .45, { sun: [900, 300], sunR: 50, rays: .6, bokehN: 16, bokehA: .22, dof: 5 });
  M.cam(ctx, S.layerCam(c, .8));
  for (let i = 0; i < 5; i++) P.coneflower(ctx, -100 + i * 320, 1300, 1.6, { t, seed: i, dof: 4, h: 260 + hash(i) * 100 });
  M.cam(ctx, c);
  // a big pink milkweed umbel
  P.stem(ctx, [[520, 1400], [530, 1000], [540, 700]], 22, 14);
  P.leaf(ctx, { x: 532, y: 900, ang: -.5, L: 320, W: 90 }); P.leaf(ctx, { x: 532, y: 900, ang: Math.PI + .5, L: 300, W: 86 });
  P.umbel(ctx, 540, 640, 120, { t, seed: 9 });
  // a bumblebee working the neighbouring flowers
  { const [bx, by, bh] = Cr.beePath(t, 690, 590, 120, 80, 3); Cr.bee(ctx, bx, by, 1.4, bh, t); }
  const land = [[0, 140, 300], [.5, 380, 420], [.85, 520, 540], [1.0, 536, 548]];
  if (lt < 1.0) S.flyer(ctx, land, lt, { s: 1.1, f: 5 });
  else {
    const sip = EV.sip - 82.5, pr = M.expoOut(inv(sip - .25, sip + .3, lt));
    const fl = .95 + .25 * Math.sin(lt * 2.4);
    const F0 = B.butterfly(ctx, { x: 536, y: 548, s: 1.1, yaw: Math.PI / 2 + .25, roll: -Math.PI / 2 + .45, pitch: .1, flap: fl, legs: 1, prob: pr, probTo: [598, 618] });
    // nectar pulses up the straw
    if (pr > .9) { screen(ctx); for (let k = 0; k < 3; k++) { const u = ((lt * 1.8 + k / 3) % 1), p = F.toScreen(c, lerp(598, 556, u), lerp(618, 570, u)); D.glow(ctx, p[0], p[1], 14, '#fff2a0', .9 * Math.sin(Math.PI * u)); } }
  }
  F.whipLines(ctx, 0, ss(2.2, 2.5, lt), t, { a: .35 });
}
function twoSexes(ctx, l, t) {
  screen(ctx);
  const g = ctx.createRadialGradient(540, 520, 80, 540, 540, 820);
  g.addColorStop(0, '#fff6e6'); g.addColorStop(1, '#f2d6b0'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // slowly turning sunburst behind them
  ctx.save(); ctx.translate(540, 540); ctx.rotate(t * .12); ctx.fillStyle = rgba('#ffffff', .22);
  for (let k = 0; k < 16; k++) { ctx.rotate(TAU / 16); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(900, -70); ctx.lineTo(900, 70); ctx.closePath(); ctx.fill(); }
  ctx.restore();
  Wd.bokeh(ctx, t * 3, { n: 12, a: .25, cols: ['#ffffff', '#ffe0b0'], r0: 40, r1: 90, par: .5, cx: l * 300 });
  const k = M.spring(l, 1.6, 6), dy = Math.sin(t * 1.6) * 14, zoom = 1 + l * .05;
  ctx.save(); ctx.translate(540, 540); ctx.scale(clamp(k, 0, 1.1) * zoom, clamp(k, 0, 1.1) * zoom); ctx.translate(-540, -540);
  B.butterfly(ctx, { x: 300, y: 520 + dy, s: 1.2, flap: .15 + .3 * Math.max(0, Math.sin(t * 3.2)), yaw: Math.sin(t * .9) * .08, sex: 0 });
  B.butterfly(ctx, { x: 780, y: 520 - dy, s: 1.2, flap: .15 + .3 * Math.max(0, Math.sin(t * 3.2 + 1.3)), yaw: -Math.sin(t * .9) * .08, sex: 1 });
  ctx.restore();
  U.sexSymbol(ctx, 300, 790, 22, false, ss(.2, .5, l), '#c4561a');
  U.sexSymbol(ctx, 780, 790, 22, true, ss(.3, .6, l), '#c4561a');
  // rings on the male's two scent spots
  for (const sd of [-1, 1]) { const x = 540 + (780 + sd * 30.6 * 1.2 - 540) * (1 + l * .05), y = 540 + (520 - dy + 62 * 1.2 - 540) * (1 + l * .05); for (const d of [.6, 1.0, 1.4]) { const u = (l - d) / .9; if (u > 0 && u < 1) D.ring(ctx, x, y, 8 + 40 * u, '#e8701c', 1 - u, 3); } }
  // the female's heavier veins
  for (const [x, y] of [[300 + 60, 520 + 2], [300 - 60, 520 + 2]]) { const u = (l - .9) / 1; if (u > 0 && u < 1) D.ring(ctx, 540 + (x - 540) * (1 + l * .05), 540 + (y + dy - 540) * (1 + l * .05), 10 + 50 * u, '#7a3a90', 1 - u, 3); }
  F.flash(ctx, l, { a: .5, k: 12 });
  F.whipLines(ctx, Math.PI, ss(2.2, 2.5, l), t, { a: .3 });
}
function courtship(ctx, l, t) {
  const pair = EV.pair - EV.court;
  const c = F.rig(l, [[0, { x: 540, y: 520, z: 1 }], [2.5, { x: 540, y: 380, z: 1.15 }, M.sineInOut]], { drift: .8 });
  S.meadowBack(ctx, c, t, .5, { sun: [860, 260], sunR: 46, rays: .7, bokehN: 12, dof: 3, flock: { t0: 87.2, dur: 6, y: 170, n: 6, s: 6 } });
  M.cam(ctx, c);
  if (l < pair) {
    // two butterflies spiralling up around each other
    for (const [i, ph] of [[0, 0], [1, Math.PI]]) {
      const keys = []; for (let k = 0; k <= 12; k++) { const tt = k * .15, a = tt * 5.5 + ph; keys.push([tt, 540 + Math.cos(a) * (160 - tt * 30), 700 - tt * 200 + Math.sin(a) * 50]); }
      S.trail(ctx, keys, l, 12, .03, i ? '#ffe0b0' : '#ffd0e0', .7);
      S.flyer(ctx, keys, l, { s: .85, f: 5.5, sex: i, ph: i * .3 });
    }
  } else {
    // a mated pair resting tail to tail on a leaf
    const k = ss(pair, pair + .4, l);
    P.leaf(ctx, { x: 260, y: 560, ang: -.05, L: 560, W: 130 });
    ctx.save(); ctx.globalAlpha = k;
    B.butterfly(ctx, { x: 470, y: 470, s: 1.0, yaw: -Math.PI / 2 - .2, roll: Math.PI / 2 - .25, flap: 1.4 + .05 * Math.sin(t * 3), legs: 1, sex: 1 });
    B.butterfly(ctx, { x: 610, y: 470, s: 1.0, yaw: Math.PI / 2 + .2, roll: -Math.PI / 2 + .25, flap: 1.42 + .05 * Math.sin(t * 3 + 1), legs: 1, sex: 0 });
    ctx.restore();
    D.glow(ctx, 540, 500, 220, '#fff0d0', .3 * k);
  }
}
// four quick cuts on the beat: each time a new milkweed leaf, an egg glints underneath
function eggMontage(ctx, l, t) {
  const i = Math.min(3, Math.floor(l / .625)), u = l - i * .625;
  const tints = [['#a8d888', '#e8f4c8'], ['#b8e0a0', '#f2f6d8'], ['#a0d0b0', '#e0f0e0'], ['#c0e090', '#f6f2c8']];
  const c = { x: 540 + (i % 2 ? 40 : -40) + u * 60, y: 560, z: 1.1 + u * .15, r: (i % 2 ? .06 : -.06) };
  S.macroBack(ctx, c, t + i * 3, { top: tints[i][0], mid: tints[i][1], hz: 520 + i * 30 });
  M.cam(ctx, c);
  Lv.egg(ctx, 540, 760, 260, { alpha: ss(.08, .14, u) });
  // her abdomen curling in from above as the egg appears; a wing edge in the corner
  const dip = Math.sin(Math.PI * clamp(u / .45)), lift = 1 - ss(.32, .6, u);
  ctx.save(); ctx.globalAlpha *= lift;
  const tipY = 330 + dip * 150 - (1 - lift) * 200;
  const spine = D.bez([980, -120], [860, 40], [640, tipY - 220], [552, tipY], 20);
  D.tube(ctx, spine, spine.map((_, j) => lerp(58, 20, j / 20)));
  ctx.fillStyle = rgba(PAL.body); ctx.fill();
  ctx.save(); ctx.clip(); ctx.strokeStyle = rgba('#3c302b'); ctx.lineWidth = 4; for (let j = 4; j < 20; j += 3) { const p = spine[j]; D.line(ctx, p[0] - 60, p[1] - 30, p[0] + 60, p[1] + 30); } ctx.restore();
  for (let j = 3; j < 19; j += 2) D.dot(ctx, spine[j][0] - 10, spine[j][1] + 14, 5, '#fffaf0', .85);
  ctx.restore();
  ctx.save(); ctx.globalAlpha *= lift; B.butterfly(ctx, { x: 1160, y: -160, s: 5.2, yaw: Math.PI / 2 + .6, roll: -Math.PI / 2 + .3, flap: 1.35 }); ctx.restore();
  screen(ctx);
  F.burst(ctx, 540, 600, u - .12, { r: 160, col: '#fff6d0', life: .5, rays: 12 });
  U.counter(ctx, 920, 170, i < 3 ? i + 1 : lerp(4, 500, M.expoOut(clamp(u / .55))), 1, { size: 84, col: '#fff6e0' });
  D.text(ctx, 'eggs', 920, 210, { font: 'AvDemi', size: 26, color: '#fff6e0', align: 'center', alpha: .9 });
  F.flash(ctx, u, { a: .35, k: 16 });
  F.whipLines(ctx, i % 2 ? Math.PI : 0, (1 - clamp(u / .2)) * .8, t, { a: .3 });
}

// ===================================================================== S12: four generations on the map (92.5-100)
const GENS = [
  { p: Mp.PLACES.gen1, m: 3.5, from: Mp.proj(-100, 22) },
  { p: Mp.PLACES.gen2, m: 5.5, from: Mp.PLACES.gen1 },
  { p: Mp.PLACES.gen3, m: 7.3, from: Mp.PLACES.gen2 },
  { p: Mp.proj(-86, 46.5), m: 8.6, from: Mp.PLACES.gen3 },
];
function cycleIcon(ctx, x, y, r, spin, a, gold) {
  ctx.save(); ctx.globalAlpha *= a; ctx.translate(x, y);
  ctx.fillStyle = rgba(gold ? '#ffcf4a' : '#fff6e2'); ctx.strokeStyle = rgba(gold ? '#a86a10' : '#c4561a'); ctx.lineWidth = 4;
  ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = rgba(gold ? '#a86a10' : '#e8701c', .8); ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(0, 0, r * .62, spin, spin + TAU * .8); ctx.stroke();
  for (let k = 0; k < 4; k++) { const a2 = spin + k * TAU / 4; D.dot(ctx, Math.cos(a2) * r * .62, Math.sin(a2) * r * .62, r * .12, ['#f6e9bf', '#ffd23a', '#5fc98a', '#f28a1d'][k]); }
  ctx.restore();
}
function s12(ctx, lt, t) {
  // the camera rides north with each new generation
  const G = GENS.map((g) => g.p), gk = (i, z, r) => ({ x: G[i][0] + 40, y: G[i][1] + 30, z, r });
  const c = F.rig(lt, [
    [0, { x: G[0][0], y: G[0][1] + 200, z: .6, r: -.04 }],
    [EV.gen[0] - 92.5 + .2, gk(0, 1.05, .02), M.expoOut],
    [EV.gen[1] - 92.5 + .2, gk(1, 1.0, -.02), M.quintInOut],
    [EV.gen[2] - 92.5 + .2, gk(2, .95, .02), M.quintInOut],
    [EV.gen[3] - 92.5 + .2, { x: G[3][0] - 60, y: G[3][1] + 200, z: .78, r: 0 }, M.quintInOut],
    [7.5, { x: G[3][0] - 90, y: G[3][1] + 230, z: .72, r: -.02 }, M.sineInOut],
  ], { drift: 1.0 });
  M.cam(ctx, c);
  const season = ss(0, 7.5, lt) * .55;
  Mp.map(ctx, { t, season });
  // generations: each an arrow north, a spinning life-cycle icon and a number
  GENS.forEach((g, i) => {
    const t0 = EV.gen[i] - 92.5, age = lt - t0;
    if (age < -.6) return;
    const p = Mp.route(ctx, [g.from, [lerp(g.from[0], g.p[0], .5) + 30, lerp(g.from[1], g.p[1], .5)], g.p], clamp((age + .6) / .6), { t, w: 6, col: i === 3 ? '#ffcf4a' : '#ffffff', a: .9 });
    if (age > 0) {
      const k = M.spring(age, 2, 6);
      cycleIcon(ctx, g.p[0], g.p[1], 36 * clamp(k, 0, 1.2), t * 3 + i, 1, i === 3);
      D.text(ctx, String(i + 1), g.p[0] + 52, g.p[1] - 26, { font: 'DIN', size: 64, color: i === 3 ? '#ffcf4a' : '#fff6e2', alpha: clamp(age * 4) });
      for (let b = 0; b < 4 + i * 2; b++) { const a = t * .8 + b * 1.7, rr = 60 + b * 9; B.mini(ctx, g.p[0] + Math.cos(a) * rr, g.p[1] + Math.sin(a) * rr * .6, 16, a + Math.PI / 2, Math.sin(t * 24 + b) * .9, { col: i === 3 ? '#ffb347' : '#f28a1d', a: clamp(age * 2) }); }
      if (i === 3) { D.glow(ctx, g.p[0], g.p[1], 160, '#ffcf4a', .35 * clamp(age * 2) * (.8 + .2 * Math.sin(t * 4))); }
    }
  });
  // season wheel
  const month = lerp(2.2, 8.6, ss(.4, 7.4, lt));
  U.season(ctx, 932, 176, 70, month, ss(.3, .7, lt));
  // life spans: summer generations vs the super generation
  const la = ss(EV.gen[3] - 92.5 + .2, EV.gen[3] - 92.5 + .6, lt);
  if (la > 0) {
    screen(ctx); ctx.save(); ctx.globalAlpha = la;
    ctx.fillStyle = rgba('#1c1418', .7); F.rrect(ctx, 60, 700, 440, 150, 22); ctx.fill();
    D.text(ctx, '1–3', 90, 760, { font: 'DIN', size: 34, color: '#fff6e2' }); D.text(ctx, '4', 90, 820, { font: 'DIN', size: 34, color: '#ffcf4a' });
    const g1 = ss(.2, .6, (lt - (EV.gen[3] - 92.5))), g4 = ss(.3, 1.2, (lt - (EV.gen[3] - 92.5)));
    ctx.fillStyle = rgba('#fff6e2'); F.rrect(ctx, 150, 742, 46 * g1, 20, 10); ctx.fill();
    ctx.fillStyle = rgba('#ffcf4a'); F.rrect(ctx, 150, 802, 320 * g4, 20, 10); ctx.fill();
    D.text(ctx, 'weeks', 210, 760, { font: 'AvDemi', size: 22, color: '#fff6e2', alpha: g1 });
    D.text(ctx, 'months', 470, 790, { font: 'AvDemi', size: 22, color: '#ffcf4a', alpha: g4, align: 'right' });
    ctx.restore();
  }
  // (entered through a swarm wipe in film.js)
  F.zoomLines(ctx, 540, 540, 1 - ss(0, .6, lt), t, { dir: -1, a: .4 });
}

// ===================================================================== S13: the great migration (100-112.5)
const ROUTES = [
  [[-80, 45], [-84, 41], [-90, 36.5], [-96, 31.5], [-99, 26], [-100.3, 19.6]],
  [[-74, 43], [-79, 39], [-86, 35], [-94, 31], [-98.5, 27], [-100.2, 19.7]],
  [[-95, 46], [-96.5, 41], [-97.5, 35], [-98.6, 29], [-99.8, 24], [-100.3, 19.6]],
  [[-87, 44.5], [-89, 39], [-92.5, 34], [-97, 29.5], [-99.6, 23], [-100.3, 19.6]],
];
const WEST = [[-117, 46], [-119.5, 41.5], [-121.5, 38.5], [-121.9, 36.6]];
function s13(ctx, lt, t) {
  const rise = EV.rise - 100, swarm = EV.swarm - 100, route = EV.route - 100, arrive = EV.arrive - 100;
  if (lt < swarm) return autumnTakeoff(ctx, lt, t);
  if (lt < route) return riverOfWings(ctx, lt - swarm, t, lt);
  return mapRoute(ctx, lt - route, t);
}
function autumnTakeoff(ctx, lt, t) {
  const rise = EV.rise - 100;
  const keys = [[rise, 560, 640], [rise + .5, 600, 520], [rise + 1.3, 720, 300], [rise + 2.4, 900, 0]];
  const [bx, by] = S.flight(keys, lt);
  const c = F.rig(lt, [[0, { x: 560, y: 640, z: 1.5 }], [rise, { x: 560, y: 610, z: 1.35 }, M.sineInOut], [2.5, { x: 640, y: 380, z: 1.0 }, M.expoInOut]], { drift: .6 });
  S.meadowBack(ctx, c, t, .66, { sun: [260, 560], sunR: 60, rays: .9, bokehN: 14, bokehA: .2, autumn: 1, mist: .5, bokehCols: ['#ffd090', '#ffb070', '#fff0c0'], flock: { t0: 99.6, dur: 5, y: 210, n: 11, v: 1, s: 9, x0: 1180, x1: -120, slope: .04 } });
  M.cam(ctx, c);
  // milkweed in autumn: pods splitting, seeds floating off on silk
  P.milkweed(ctx, 520, 1400, { s: 1.8, t, seed: 3, umbels: false, pods: ss(0, 1.2, lt) * .9 + .1, tint: ['#c8a050', .55], pairs: 3 });
  P.goldenrod(ctx, 760, 1300, 1.6, { t, seed: 2 }); P.goldenrod(ctx, 300, 1300, 1.4, { t, seed: 5 });
  for (let i = 0; i < 14; i++) { const a = (lt * .25 + hash(i)) % 1, x = 560 + i * 30 + a * 500 + Math.sin(t + i) * 30, y = 700 - a * 700 + Math.cos(t * .8 + i) * 20; P.seed(ctx, x, y, 26, Math.sin(Math.PI * a), Math.sin(t + i) * .3); }
  if (lt < rise) B.butterfly(ctx, { x: 560, y: 640, s: 1.2, yaw: Math.PI / 2 + .1, roll: -Math.PI / 2 + .55, flap: .9 + .3 * Math.sin(lt * 2), legs: 1 });
  else { S.trail(ctx, keys, lt, 12, .04, '#ffe0a0', .8); S.flyer(ctx, keys, lt, { s: 1.2, f: 4.4 }); }
  // others rising from the meadow
  for (let i = 0; i < 8; i++) { const a = clamp((lt - rise - i * .12) / 1.6); if (a <= 0) continue; const x = 200 + i * 110 + a * 300, y = 900 - a * 900 + Math.sin(t * 2 + i) * 30; B.mini(ctx, x, y, 34, -.9, Math.sin(t * 24 + i) * .9); }
  S.foreground(ctx, c, t, { y: 1500, dof: 12, n: 6, seed: 8 });
  // (entered through a swarm wipe in film.js)
  F.zoomLines(ctx, 600, 300, ss(2.1, 2.5, lt), t, { a: .4, col: '#fff0d8' });
}
function riverOfWings(ctx, l, t, lt) {
  const c = F.rig(l, [[0, { x: 460, y: 300, z: 1.25, r: .04 }], [1.2, { x: 560, y: 420, z: 1.0, r: -.02 }, M.expoOut], [4, { x: 980, y: 470, z: .92, r: .02 }, M.sineInOut]], { drift: 1.0 });
  const hz = 340 - (c.y - 420) * .3;
  Wd.sky(ctx, .62, { horizon: hz + 30 });
  Wd.clouds(ctx, .62, t, { px: -c.x * .3, n: 6, y0: 30, yr: hz - 150, s: .8 });
  Wd.autumnLand(ctx, c, t, { tod: .62, horizon: hz });
  screen(ctx);
  // a river of monarchs streaming to the right/south across the view, at three depths
  const r = rng(12);
  for (let i = 0; i < 90; i++) {
    const depth = .3 + r() * .9, speed = 140 * depth, y0 = 120 + r() * 520, ph = r() * 1600;
    const x = ((ph + l * speed + t * 10) % 1500) - 200, y = y0 + Math.sin(t * 1.4 + i) * 18 * depth - (x - 540) * .12 * depth;
    B.mini(ctx, x, y, 14 + 30 * depth, -.12 + Math.sin(t + i) * .1, Math.sin(t * 20 * (1.1 - depth * .3) + i * 2.1) * .95, { a: .55 + .45 * depth });
  }
  // a few riding a thermal: circling upward
  for (let i = 0; i < 5; i++) { const a = l * 2.2 + i * TAU / 5, rr = 70 + i * 6; B.mini(ctx, 760 + Math.cos(a) * rr, 380 - l * 40 - i * 10 + Math.sin(a) * rr * .35, 26, a + Math.PI / 2, .5 + Math.sin(t * 6 + i) * .3); }
  // the hero, gliding close to camera
  const hx = 420 + Math.sin(l * .8) * 40, hy = 560 + Math.sin(l * 1.3) * 26;
  B.butterfly(ctx, { x: hx, y: hy, s: 1.25, ...S.flyPose(-.05, Math.sin(l * 1.1) * .15, .6), flap: B.flapAt(l, { f: 3.6, mid: .4, amp: .7, glide: .6 }) });
  // sun compass: the sun's angle and the heading south-west
  const ca = ss(EV.compass - 100 - 2.5 - .2, EV.compass - 100 - 2.5 + .3, l) * (1 - ss(3.8, 4.0, l));
  if (ca > 0) {
    ctx.save(); ctx.globalAlpha = ca; ctx.translate(880, 200);
    ctx.fillStyle = rgba('#1c1418', .65); ctx.beginPath(); ctx.arc(0, 0, 120, 0, TAU); ctx.fill();
    ctx.strokeStyle = rgba('#fff6e2', .8); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, 100, 0, TAU); ctx.stroke();
    for (let k = 0; k < 4; k++) { const a = k * TAU / 4 - Math.PI / 2; D.text(ctx, 'NESW'[k], Math.cos(a) * 82, Math.sin(a) * 82 + 9, { font: 'DIN', size: 26, color: '#fff6e2', align: 'center' }); }
    const sa = -Math.PI / 2 + .9 + Math.sin(t * .5) * .1, ha = Math.PI * .75;
    Wd.sun(ctx, 880 + Math.cos(sa) * 100, 200 + Math.sin(sa) * 100, 16, 1);
    ctx.setTransform(1, 0, 0, 1, 880, 200);
    D.angleArc(ctx, 0, 0, 46, sa, ha, ss(0, .8, l - (EV.compass - 102.5)), '#ffcf4a', 1, 4);
    D.arrow(ctx, 0, 0, Math.cos(ha) * 70, Math.sin(ha) * 70, 1, '#ffcf4a', 5, 18);
    B.mini(ctx, 0, 0, 22, ha, Math.sin(t * 20) * .8);
    ctx.restore();
  }
  F.whipLines(ctx, 0, .25, t, { a: .15 });
  F.flash(ctx, l, { a: .45, k: 10, col: '#fff6e0' });
  F.zoomLines(ctx, 540, 540, ss(3.6, 4.0, l), t, { a: .35, col: '#fff6e0' });
}
function mapRoute(ctx, l, t) {
  const arrive = EV.arrive - EV.route;
  const target = Mp.PLACES.mexico;
  const c = F.rig(l, [
    [0, { x: 60, y: -300, z: 1.3, r: .05 }],
    [1.2, { x: -120, y: -100, z: .7, r: 0 }, M.expoOut],
    [arrive, { x: target[0] - 20, y: target[1] - 80, z: .95 }, M.sineInOut],
    [6.0, { x: target[0], y: target[1], z: 3.2 }, M.expoIn],
  ], { drift: .5 });
  M.cam(ctx, c);
  Mp.map(ctx, { t, season: .8 });
  const pr = M.sineInOut(inv(.2, arrive - .2, l));
  ROUTES.forEach((rt, i) => Mp.route(ctx, rt.map(([a, b]) => Mp.proj(a, b)), clamp(pr * 1.05 - i * .03), { t, w: i ? 5 : 8, col: '#ffcf4a', a: i ? .75 : 1 }));
  Mp.route(ctx, WEST.map(([a, b]) => Mp.proj(a, b)), clamp(pr * 1.2 - .1), { t, w: 4, col: '#ffe9b0', a: .6 });
  // little monarchs riding the main route
  const main = ROUTES[0].map(([a, b]) => Mp.proj(a, b));
  for (let i = 0; i < 12; i++) { const u = clamp(pr - i * .05); if (u <= 0) continue; const q = D.partial(main, u), e = q[q.length - 1], f = q[Math.max(0, q.length - 2)]; B.mini(ctx, e[0] + Math.sin(i * 2.1) * 30, e[1] + Math.cos(i * 1.7) * 20, 18, Math.atan2(e[1] - f[1], e[0] - f[0]), Math.sin(t * 22 + i) * .9); }
  if (l > arrive) Mp.pin(ctx, target[0], target[1], l - arrive);
  if (l > arrive - .4) { const p = Mp.proj(-121.9, 36.6); Mp.pin(ctx, p[0], p[1], l - arrive + .3, { col: '#ffb347' }); }
  // distance counter
  const km = 4800 * pr;
  U.counter(ctx, 540, 200, km, ss(.2, .5, l) * (1 - ss(5.4, 5.9, l)), { size: 100, unit: 'km', fmt: (v) => Math.round(v / 10) * 10 >= 1000 ? (Math.round(v / 10) * 10).toLocaleString('en-US') : String(Math.round(v / 10) * 10) });
  F.zoomLines(ctx, 540, 540, ss(5.3, 6.0, l), t, { a: .45, col: '#e8f0ff' });
  F.flash(ctx, l, { a: .5, k: 10 });
}

module.exports = { s11, s12, s13, cycleIcon };
