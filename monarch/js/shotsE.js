// Shots 14-16 (112.5-137.5 s): misty oyamel-fir mountains in Mexico fill with streams of monarchs; the trees sag
// under millions of clustered butterflies; sunlight breaks through and they burst into the air like an orange
// blizzard. In spring they head north; a worn old female lays an egg on fresh Texas milkweed and flies off into the
// light; the egg becomes the first station of the life-cycle ring; the title; a butterfly flies into the camera.
const { W, H, TAU, clamp, lerp, inv, ss, hash, rgba, mix, PAL, rng } = require('./core');
const D = require('./draw');
const M = require('./motion');
const F = require('./fx');
const U = require('./ui');
const Wd = require('./world');
const P = require('./plants');
const B = require('./butterfly');
const Lv = require('./larva');
const Pu = require('./pupa');
const Mp = require('./map');
const S = require('./scene');
const { EV } = require('./cues');

const screen = (ctx) => ctx.setTransform(1, 0, 0, 1, 0, 0);

// ===================================================================== S14: winter in Mexico (112.5-122.5)
const MEXSKY = ['#7f9cc8', '#c3d2e8', '#eef2f6'];
function forest(ctx, c, t, o) {
  const TR = require('./trees'), FR = TR.firs();
  const warm = o.warm ?? 0, cover = o.cover ?? 1, open = o.open ?? 0, mistCol = mix('#e8eef8', '#fff0dc', warm);
  Wd.sky(ctx, .4, { horizon: 640, cols: MEXSKY.map((col, i) => mix(col, ['#ffb070', '#ffd8a0', '#fff0d0'][i], warm * .6)) });
  if (warm > 0) { Wd.rays(ctx, 900, -40, warm, t, { a0: 2.0, spread: 1.4, n: 14, col: '#fff0c0', len: 1600 }); }
  Wd.mountains(ctx, c, t, { mist: .45 - warm * .15, mistCol, cover: cover * .9, warm });
  // three ranks of big oyamel firs; the butterflies' weight shows as hanging bunches fading in, basking wings as they open
  for (const [k, n, y, h, cov, seed, haze] of [[.5, 9, 980, 520, .6, 31, .4], [.75, 6, 1120, 760, .85, 41, .2], [1.0, 4, 1400, 1150, 1, 51, .04]]) {
    const g = Wd.layerBegin(); M.cam(g, S.layerCam(c, k));
    for (let i = 0; i < n; i++) {
      const f = FR[(i + seed) % 3], x = -500 + i * (2100 / n) + hash(i + seed) * 120, hh = h * (.85 + hash(i + seed + 9) * .3);
      const sw = (Math.sin(t * .6 + i * 1.3) * .01 + Math.sin(t * 1.7 + i) * .004) * k, fl = hash(i + seed + 5) < .5, bl = k < .6 || !!o.dof;
      const cv = clamp(cover * cov * (.75 + hash(i + seed + 3) * .5));
      TR.drawSprite(g, f.bare, x, y, hh, { sway: sw, flip: fl, blur: bl });
      if (cv > .01) TR.drawSprite(g, f.cover, x, y, hh, { sway: sw, flip: fl, blur: bl, alpha: cv });
      if (cv > .01 && open > .01) TR.drawSprite(g, f.open, x, y, hh, { sway: sw, flip: fl, blur: bl, alpha: cv * open });
    }
    Wd.layerEnd(ctx, { haze: haze + .1 * (1 - warm), hazeCol: mix('#dfe8f4', '#ffe4c0', warm), hazeTop: 150, hazeFall: .5 });
  }
  screen(ctx);
  const g = ctx.createLinearGradient(0, 600, 0, H); g.addColorStop(0, rgba('#e8eef8', 0)); g.addColorStop(1, rgba(mix('#d8e2f0', '#ffe0c0', warm), .35)); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}
// a close look at the roost: three sagging fir branches heavy with clustered monarchs at three depths; a few live ones
// shiver their wings to warm up and, once the sun hits, open them to bask
function clusterClose(ctx, c, t, open) {
  const TR = require('./trees'), CS = TR.clusters();
  const rows = [[.6, 110, 430, true, .32, -60], [.82, 330, 580, false, .12, 80], [1.08, 560, 800, false, 0, -20]];
  rows.forEach(([k, top, h, bl, haze, dx], ri) => {
    const g = Wd.layerBegin(); M.cam(g, S.layerCam(c, k));
    const sk = h / CS[0].h, ax = 540 + dx - CS[0].w * sk / 2, ay = top + 90 * sk;
    g.translate(ax, ay); g.rotate(Math.sin(t * .7 + ri * 2) * .008 + Math.sin(t * 1.9 + ri) * .003); g.translate(-ax, -ay);
    TR.drawSprite(g, CS[0], 540 + dx, top + h, h, { blur: bl });
    if (open > .01) TR.drawSprite(g, CS[1], 540 + dx, top + h, h, { blur: bl, alpha: open });
    // live ones on the nearest branch
    if (ri === 2) for (let i = 0; i < 7; i++) {
      const sx = 260 + i * 170 + hash(i + 40) * 60, sy = CS[0].sag(sx) + 40 + hash(i + 41) * 120;
      const x = 540 + dx + (sx - CS[0].w / 2) * sk, y = top + sy * sk, bask = hash(i + 42) < .25 + open * .75;
      const shiver = Math.sin(t * 38 + i * 3) * .05 * (1 - open), opening = bask ? ss(0, 1, open * 1.4 - hash(i + 43) * .4) : 0;
      const breathe = .5 + .5 * Math.sin(t * (1.2 + hash(i + 44)) + i * 2);
      B.butterfly(g, { x, y, s: .46 * sk, yaw: (hash(i + 45) - .5) * .6, roll: lerp((hash(i) < .5 ? -1 : 1) * (Math.PI / 2 - .25), .2 * Math.sign(hash(i) - .5), opening), pitch: .15, flap: lerp(1.42 + shiver, .2 + .35 * breathe, opening), legs: 1 });
    }
    Wd.layerEnd(ctx, { haze, hazeCol: mix('#dfe8f4', '#ffe8c8', open), hazeTop: 0, hazeFall: .6 });
  });
}
// thousands of monarchs pouring up out of the trees (screen space)
function blizzard(ctx, t, age, n = 700) {
  const r = rng(5);
  for (let i = 0; i < n; i++) {
    const depth = .25 + Math.pow(r(), 1.5) * 1.2, x0 = r() * 1300 - 110, y0 = 700 + r() * 500, delay = r() * 1.6, sp = 160 + r() * 260;
    const a = age - delay;
    if (a <= 0) continue;
    const swirl = Math.sin(a * (1 + r()) + i) * 80 * depth;
    const x = x0 + swirl + a * 40 * (r() - .3), y = y0 - a * sp * depth - a * a * 20;
    if (y < -60 || x < -80 || x > 1160) continue;
    B.mini(ctx, x, y, 10 + 30 * depth, -Math.PI / 2 + Math.sin(a * 2 + i) * .6, Math.sin(t * (18 + r() * 8) + i) * .95, { a: clamp(a * 3) * (.5 + .5 * Math.min(1, depth)) });
  }
}
function s14(ctx, lt, t) {
  const cl = EV.cluster - 112.5, sb = EV.sunbreak - 112.5, bu = EV.burst - 112.5;
  const warm = ss(sb - .3, sb + 1.2, lt), open = ss(sb, bu + .3, lt) * .7;
  if (lt < cl) {
    const c = F.rig(lt, [[0, { x: 540, y: 300, z: .8 }], [cl, { x: 600, y: 560, z: 1.05 }, M.sineInOut]], { drift: .6 });
    forest(ctx, c, t, { cover: lerp(.3, .8, lt / cl) });
    screen(ctx);
    // streams of monarchs gliding down into the forest
    const r = rng(9);
    for (let i = 0; i < 160; i++) {
      const d = .3 + r() * .9, ph = r(), u = (ph + lt * .18 * d) % 1;
      const x = lerp(-100 + r() * 400, 400 + r() * 700, u), y = lerp(-80 + r() * 200, 560 + r() * 300, u * u);
      B.mini(ctx, x, y, 10 + 22 * d, .9, Math.sin(t * 20 + i) * .9, { a: Math.sin(Math.PI * u) });
    }
    snow(ctx, t, .5);
    // (entered through a cloud wipe in film.js)
  } else if (lt < bu) {
    const c = F.rig(lt - cl, [[0, { x: 520, y: 560, z: 1.0 }], [bu - cl, { x: 560, y: 520, z: 1.12 }, M.sineInOut]], { drift: .5 });
    forest(ctx, { x: 540, y: 560, z: 1.1 }, t, { cover: 1, warm, open, dof: 1 });
    screen(ctx); ctx.fillStyle = rgba('#dfe8f4', .35 * (1 - warm)); ctx.fillRect(0, 0, W, H);
    clusterClose(ctx, c, t, open);
    snow(ctx, t, 1 - warm);
    screen(ctx); const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, rgba('#ffe6b0', .35 * warm)); g.addColorStop(1, rgba('#ff9a40', 0)); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // a counter of how many cluster here: millions
    const ca = ss(cl + .4, cl + .8, lt) * (1 - ss(sb - .3, sb, lt));
    if (ca > 0) { const v = Math.pow(10, lerp(3, 7, M.expoOut(clamp((lt - cl - .4) / 1.4)))); U.counter(ctx, 540, 190, v, ca, { size: 100, col: '#fff6e8', fmt: (x) => x > 9.5e6 ? 'millions' : (Math.round(x / 1000) * 1000).toLocaleString('en-US') }); }
    F.flash(ctx, lt - cl, { a: .45, k: 10 });
    F.flash(ctx, lt - sb, { a: .3, k: 4, col: '#fff2d0' });
  } else {
    const age = lt - bu;
    const c = F.rig(age, [[0, { x: 560, y: 600, z: 1.1 }], [3.1, { x: 540, y: 320, z: .8 }, M.sineInOut]], { drift: .8, shakes: [[0, 8]] });
    forest(ctx, c, t, { cover: 1 - ss(0, 2, age) * .7, warm: 1, open: .8 });
    screen(ctx);
    blizzard(ctx, t, age, 760);
    Wd.motes(ctx, t, { n: 40, a: .6, col: '#fff0c8' });
    F.flash(ctx, age, { a: .5, k: 6, col: '#fff2d0' });
  }
}
function snow(ctx, t, a) {
  if (a <= .02) return;
  screen(ctx);
  for (let i = 0; i < 80; i++) { const x = ((hash(i) * 1200 + t * 20 + Math.sin(t + i) * 30) % 1200) - 60, y = ((hash(i + 5) * 1200 + t * (40 + hash(i + 9) * 40)) % 1200) - 60; D.dot(ctx, x, y, 1.5 + hash(i + 3) * 2.5, '#ffffff', .6 * a); }
}

// ===================================================================== S15: the journey home (122.5-127.5)
function s15(ctx, lt, t) {
  const egg = EV.lastEgg - 122.5, glow = EV.glow - 122.5;
  if (lt < 2.0) return mapNorth(ctx, lt, t);
  const l = lt - 2.0;
  const c = F.rig(l, [[0, { x: 560, y: 560, z: 1.1 }], [1.0, { x: 540, y: 560, z: 1.35 }, M.sineInOut], [glow - 2, { x: 520, y: 600, z: 1.4 }, M.sineInOut], [3.5, { x: 470, y: 690, z: 4.5 }, M.expoIn]], { drift: .6 });
  S.meadowBack(ctx, c, t, .35, { sun: [880, 480], sunR: 60, rays: 1, bokehN: 16, bokehA: .22, dof: 5, mist: .4, bokehCols: ['#a8c8ff', '#fff0c0', '#ffd0e8'] });
  // Texas spring: bluebonnets
  M.cam(ctx, S.layerCam(c, .85));
  for (let i = 0; i < 26; i++) P.blazingStar(ctx, -300 + i * 70, 1250 + hash(i) * 60, .8, { t, seed: i, h: 200, dof: 3 });
  M.cam(ctx, c);
  // a young milkweed sprout
  P.stem(ctx, [[480, 1200], [478, 900], [470, 620]], 18, 10, { col: '#86b25a' });
  P.leaf(ctx, { x: 476, y: 720, ang: -.45, L: 300, W: 90, col: '#86c25a' }); P.leaf(ctx, { x: 476, y: 720, ang: Math.PI + .45, L: 280, W: 84, col: '#7ab850' });
  P.leaf(ctx, { x: 472, y: 640, ang: -1.1, L: 180, W: 50, col: '#9ad06a' }); P.leaf(ctx, { x: 472, y: 640, ang: Math.PI + 1.1, L: 170, W: 48, col: '#9ad06a' });
  const eggPt = [470 + Math.cos(-.45) * 200 + 10, 720 + Math.sin(-.45) * 200 + 34];
  const leave = egg + .9, keys = [[leave, 660, 600], [leave + .7, 820, 420], [leave + 2.0, 1100, 160]];
  if (lt < leave + 2.0 && l < 0 + 99) {
    if (lt < leave) {
      const curl = ss(egg - .6, egg - .1, lt) * (1 - ss(egg + .3, egg + .7, lt));
      B.butterfly(ctx, { x: 660, y: 600, s: 1.15, yaw: -Math.PI / 2 - .12, roll: Math.PI / 2 - .25, flap: 1.3 + .1 * Math.sin(t * 3), legs: 1, abdCurl: curl * 1.3, worn: 1 });
    } else {
      const fade = 1 - ss(glow, glow + 1.2, lt);
      ctx.save(); ctx.globalAlpha *= fade; S.trail(ctx, keys, lt, 12, .05, '#fff0c0', .8); S.flyer(ctx, keys, lt, { s: 1.1, f: 4.2 }); ctx.restore();
      if (lt > glow) { const [fx, fy] = S.flight(keys, lt); D.glow(ctx, fx, fy, 200 * ss(glow, glow + 1, lt), '#fff2c8', .6 * (1 - ss(glow + .6, glow + 1.6, lt))); }
    }
  }
  if (lt > egg) {
    const pop = M.spring(lt - egg, 2.4, 6);
    ctx.save(); ctx.translate(eggPt[0], eggPt[1]); ctx.scale(clamp(pop, 0, 1.3), clamp(pop, 0, 1.3)); Lv.egg(ctx, 0, 0, 22, { rot: Math.PI, noShadow: true }); ctx.restore();
    D.glow(ctx, eggPt[0], eggPt[1], 60 + 140 * ss(glow, glow + 1, lt), '#fff2b0', .4 + .5 * ss(glow, glow + 1, lt));
  }
  screen(ctx);
  F.zoomLines(ctx, 540, 600, ss(4.5, 5.0, lt), t, { a: .4, col: '#fff6dc' });
  F.flash(ctx, lt - 4.95, { a: .9, k: 18, col: '#fff8e6' });
}
function mapNorth(ctx, lt, t) {
  const c = F.rig(lt, [[0, { x: -70, y: 230, z: 1.7 }], [2, { x: -60, y: 170, z: 1.45 }, M.sineInOut]], { drift: .5 });
  M.cam(ctx, c);
  Mp.map(ctx, { t, season: .1 });
  const mx = Mp.PLACES.mexico, tx = Mp.PLACES.texas;
  Mp.pin(ctx, mx[0], mx[1], 2 + lt);
  const rt = [mx, [mx[0] + 30, mx[1] - 120], [tx[0] - 10, tx[1] + 60], tx];
  Mp.route(ctx, rt, M.sineInOut(inv(.1, 1.4, lt)), { t, w: 8, col: '#9be07a' });
  for (let i = 0; i < 10; i++) { const u = clamp(inv(.1, 1.4, lt) - i * .04); if (u <= 0) continue; const q = D.partial(rt, u), e = q[q.length - 1]; B.mini(ctx, e[0] + Math.sin(i * 2.3) * 40, e[1] + Math.cos(i * 1.9) * 26, 18, -Math.PI / 2 + Math.sin(i) * .3, Math.sin(t * 22 + i) * .9); }
  U.season(ctx, 932, 176, 70, lerp(1.6, 2.6, lt / 2), ss(0, .3, lt));
  F.flash(ctx, lt, { a: .5, k: 10 });
  F.whipLines(ctx, -Math.PI / 2, ss(1.7, 2.0, lt), t, { a: .3 });
}

// ===================================================================== S16: the cycle and the title (127.5-137.5)
const RING = { x: 540, y: 560, r: 300 };
const ST = [-Math.PI * .75, -Math.PI * .25, Math.PI * .25, Math.PI * .75];
function s16(ctx, lt, t) {
  const name = EV.name - 127.5, fly = EV.fly - 127.5, fin = EV.final - 127.5;
  screen(ctx);
  const g = ctx.createRadialGradient(540, 520, 60, 540, 560, 820);
  g.addColorStop(0, '#3a2a6a'); g.addColorStop(.55, '#1a1440'); g.addColorStop(1, '#0a0820'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  Wd.bokeh(ctx, t * 2.5, { n: 18, a: .2, cols: ['#ffcf6a', '#ff9a50', '#c0a0ff'], r0: 20, r1: 80, par: .6, cx: lt * 120, cy: -lt * 60 });
  Wd.motes(ctx, t, { n: 30, a: .5, col: '#ffd890' });
  const zoomIn = M.expoIn(inv(fly, fin, lt));
  ctx.save();
  // the whole ring breathes: a slow push in with a gentle roll
  const z = lerp(.9, 1.06, M.sineInOut(clamp(lt / fly))) * (1 + .015 * Math.sin(t * 1.7)), rr = .05 * Math.sin(lt * .6) - .03 * zoomIn;
  ctx.translate(540, 560); ctx.scale(z, z); ctx.rotate(rr); ctx.translate(-540, -560);
  // ring drawn clockwise from the top, stations popping on
  const rp = M.expoInOut(inv(0, 1.2, lt));
  ctx.strokeStyle = rgba('#ffcf6a', .9); ctx.lineWidth = 5; ctx.lineCap = 'round';
  D.arcPart(ctx, RING.x, RING.y, RING.r, -Math.PI * .75, rp);
  ctx.strokeStyle = rgba('#ffcf6a', .25); ctx.lineWidth = 16; D.arcPart(ctx, RING.x, RING.y, RING.r, -Math.PI * .75, rp);
  F.turningRing(ctx, RING.x, RING.y, RING.r + 40, t, { col: '#c0a0ff', a: .35 * rp, dash: [3, 14] });
  // chevrons between stations
  for (let i = 0; i < 4; i++) {
    const a = ST[i] + Math.PI / 4, on = ss(EV.stations[i] - 127.5 + .2, EV.stations[i] - 127.5 + .5, lt);
    if (on <= 0) continue;
    const x = RING.x + Math.cos(a) * RING.r, y = RING.y + Math.sin(a) * RING.r, d = a + Math.PI / 2;
    ctx.save(); ctx.translate(x, y); ctx.rotate(d); ctx.globalAlpha = on; ctx.strokeStyle = rgba('#fff6e2'); ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(-10, -14); ctx.lineTo(6, 0); ctx.lineTo(-10, 14); ctx.stroke(); ctx.restore();
  }
  // the four stations
  EV.stations.forEach((st, i) => {
    const age = lt - (st - 127.5);
    if (age <= 0) return;
    const pop = M.spring(age, 2, 6), a = ST[i], x = RING.x + Math.cos(a) * RING.r, y = RING.y + Math.sin(a) * RING.r;
    ctx.save(); ctx.globalAlpha = clamp(age * 4);
    ctx.fillStyle = rgba('#fff6e2'); ctx.shadowColor = 'rgba(0,0,0,.4)'; ctx.shadowBlur = 20;
    ctx.beginPath(); ctx.arc(x, y, 92 * clamp(pop, 0, 1.15), 0, TAU); ctx.fill(); ctx.shadowColor = 'transparent';
    ctx.strokeStyle = rgba('#ffcf6a'); ctx.lineWidth = 5; ctx.stroke();
    ctx.save(); ctx.beginPath(); ctx.arc(x, y, 88 * clamp(pop, 0, 1.15), 0, TAU); ctx.clip();
    ctx.translate(x, y); ctx.scale(clamp(pop, 0, 1.15), clamp(pop, 0, 1.15));
    if (i === 0) Lv.egg(ctx, 0, 52, 110, {});
    if (i === 1) { const ph = t * 1.2, step = .55 * 170 / 13.55; Lv.larva(ctx, { path: Lv.linePath(-78, 30, 0), s0: -ph * step, L: 170, instar: 5, t, phase: ph, shadow: false }); }
    if (i === 2) { ctx.fillStyle = rgba('#6b4a2a'); ctx.fillRect(-60, -78, 120, 10); Pu.chrysalis(ctx, 0, -68, { h: 130, t, pad: true }); }
    if (i === 3 && lt < fly) B.butterfly(ctx, { x: 0, y: 4, s: .62, flap: .25 + .25 * Math.sin(t * 3), sex: 0 });
    ctx.restore(); ctx.restore();
    F.burst(ctx, x, y, age, { r: 140, col: '#ffcf6a', life: .6, rays: 10 });
  });
  // a gold spark running round the cycle
  if (lt > 1.2) { const a = -Math.PI * .75 + (lt - 1.2) * 1.4; const p = [RING.x + Math.cos(a) * RING.r, RING.y + Math.sin(a) * RING.r]; D.glow(ctx, p[0], p[1], 50, '#ffe9a0', .8); D.dot(ctx, p[0], p[1], 7, '#ffffff'); }
  // four generations orbiting outside the ring
  for (let i = 0; i < 4; i++) { const a = lt * .5 + i * TAU / 4; B.mini(ctx, RING.x + Math.cos(a) * (RING.r + 40), RING.y + Math.sin(a) * (RING.r + 40), i === 3 ? 30 : 20, a + Math.PI / 2, Math.sin(t * 20 + i) * .9, { a: ss(1.4, 2.2, lt), col: i === 3 ? '#ffb347' : '#f28a1d' }); }
  // the title in the middle
  const ta = 1 - ss(fly + .2, fly + .5, lt);
  if (lt > name - .1 && ta > 0) {
    ctx.save(); ctx.globalAlpha = ta;
    for (let q = 5; q >= 1; q--) M.kinetic(ctx, 'MONARCH', 540 + q * .8, 560 + q * 1.1, inv(name, name + .8, lt), { font: 'RockB', size: 96, track: 8, color: '#7a2e0c', stagger: .5 });
    M.kinetic(ctx, 'MONARCH', 540, 560, inv(name, name + .8, lt), { font: 'RockB', size: 96, track: 8, color: '#fff3dc', stagger: .5 });
    M.kinetic(ctx, 'four generations, one great journey', 540, 612, inv(name + .6, name + 1.4, lt), { font: 'BaskSI', size: 30, color: '#ffd890', stagger: .7 });
    ctx.restore();
  }
  ctx.restore();
  // the butterfly at the last station flies at the camera until its wing fills the frame
  if (lt >= fly) {
    const u = M.expoIn(inv(fly, fin + .3, lt)), dx = Math.cos(ST[3]) * RING.r, dy = Math.sin(ST[3]) * RING.r;
    const a0 = [540 + z * (dx * Math.cos(rr) - dy * Math.sin(rr)), 560 + z * (dx * Math.sin(rr) + dy * Math.cos(rr))];
    const x = lerp(a0[0], 560, M.sineInOut(clamp(u * 1.4))), y = lerp(a0[1], 520, M.sineInOut(clamp(u * 1.4)));
    B.butterfly(ctx, { x, y, s: .62 * Math.exp(u * 3.6), flap: .3 + .5 * Math.sin((lt - fly) * 12) * (1 - u), pitch: -.2, glow: u });
  }
  // ending card
  const ea = ss(fin + .1, fin + .4, lt);
  if (ea > 0) {
    screen(ctx); ctx.fillStyle = rgba('#0a0606', ea); ctx.fillRect(0, 0, W, H);
    D.text(ctx, 'plant milkweed', 540, 540, { font: 'BaskSI', size: 54, color: '#ffd890', align: 'center', alpha: ss(fin + .5, fin + 1.0, lt) });
    D.text(ctx, 'every monarch begins on one', 540, 600, { font: 'AvMed', size: 28, color: '#fff3dc', align: 'center', alpha: ss(fin + .8, fin + 1.3, lt) * .85 });
    B.mini(ctx, 540, 450, 34, -Math.PI / 2, Math.sin(t * 6) * .8, { a: ss(fin + .5, fin + 1.0, lt) });
  }
  F.flash(ctx, lt, { a: .8, k: 8, col: '#fff6e0' });
  F.flash(ctx, lt - fin, { a: .9, k: 6, col: '#ffcf6a' });
}

module.exports = { s14, s15, s16 };
