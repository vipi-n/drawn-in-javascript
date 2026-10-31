// Scenes 3-4: STAGE 1 the egg, STAGE 2 the larva.
const core = require('./core');
const { W, H, TAU, clamp, lerp, ss, io3, out3, out5, back, win, rgba, mix, rng, noise, hash, cues } = core;
const { B, BEAT, BAR, EV } = cues;
const G = require('./gfx');
const T = require('./type');
const ANT = require('./ant');
const BR = require('./brood');
const WD = require('./world');
const { along, gait } = require('./s1');

// the nest interior: deep soil + one big warm chamber
function nest(ctx, lt, o = {}) {
  WD.soil(ctx, o.sy ?? -1700, { dim: .25 });
  WD.chamber(ctx, o.cx ?? 540, o.cy ?? 1070, o.rx ?? 610, o.ry ?? 440, { light: o.light ?? .85, seed: 3 });
  WD.dust(ctx, lt, 30, { y0: 660, h: 800, a: .3 });
}
const FLOOR = 1430;

// ------------------------------------------------------------------ EGG
const PILE = [[250, FLOOR - 34], [322, FLOOR - 30], [288, FLOOR - 78], [210, FLOOR - 70], [362, FLOOR - 74], [252, FLOOR - 118]];
function egg(ctx, lt) {
  const lays = EV.eggLays.map((t) => t - B(7));
  const zoom = io3(ss(2.7, 3.7, lt)), macro = ss(3.2, 3.8, lt);
  // --- wide: the founding chamber, the queen lays
  if (macro < 1) {
    ctx.save();
    const z = lerp(1, 3.2, zoom), fx = 286, fy = FLOOR - 70;
    ctx.translate(fx, fy); ctx.scale(z, z); ctx.translate(-fx, -fy);
    nest(ctx, lt);
    ANT.draw(ctx, 700, FLOOR, 1.5, { caste: 'queen', flip: true, ant: lt * .3, gaster: Math.sin(lt * 1.5) * .03, jaw: .2 });
    const shown = lays.filter((t) => lt > t).length + 2;
    PILE.slice(0, Math.min(PILE.length, shown)).forEach(([x, y], i) => {
      const born = i < 2 ? -1 : lays[i - 2], k = back(ss(born, born + .35, lt), 2.2);
      BR.egg(ctx, x, y, 36 * k, { ang: (hash(i) - .5) * .8, glow: born > 0 ? Math.exp(-(lt - born) * 3) : 0 });
    });
    ctx.restore();
    T.heading(ctx, lt - .15, 3.1, 80, 660, 1, 'EGG', 'about half a millimetre long');
    T.caption(ctx, lt - .5, 2.4, 1600, ['Alone in the dark, the queen', 'lays her *first eggs*.'], { size: 52 });
  }
  if (macro <= 0) return;
  // --- macro: one egg, the embryo inside
  ctx.save(); ctx.globalAlpha *= macro;
  ctx.fillStyle = '#0d0805'; ctx.fillRect(0, 0, W, H);
  G.glow(ctx, 540, 1000, 900, '#7a4a24', .55);
  const split = ss(7.9, 8.8, lt);
  // neighbours, blurred
  G.blurred(ctx, 14, (c) => { BR.egg(c, 150, 640, 170, { ang: .4 }); BR.egg(c, 960, 1420, 200, { ang: -.3 }); BR.egg(c, 980, 560, 120, { ang: .9 }); }, { alpha: .75 * (1 - split) });
  const ex = lerp(540, 540, split), ey = lerp(1000, 640, split), er = lerp(250, 120, io3(split));
  const xr = ss(4.3, 5.0, lt), dev = ss(4.8, 7.9, lt);
  // scan reveal: the x-ray is printed in behind a sweeping line
  const scanY = lerp(ey - er * .8, ey + er * .8, ss(4.3, 5.0, lt));
  BR.egg(ctx, ex, ey, er, { ang: -.2, glow: .5 });
  if (xr > 0) {
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, scanY); ctx.clip();
    BR.egg(ctx, ex, ey, er, { ang: -.2, xray: 1, dev, t: lt });
    ctx.restore();
    if (xr < 1) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = rgba('#dffffb', .9 * Math.sin(Math.PI * xr)); ctx.fillRect(ex - er * 1.2, scanY - 2, er * 2.4, 4); G.glow(ctx, ex, scanY, er, T.TEAL, .3 * Math.sin(Math.PI * xr)); ctx.restore(); }
  }
  T.ruler(ctx, ex - er, ey + er * .64 + 70, er * 2, '≈ 0.5 mm', win(3.7, 4.0, 5.2, 5.6, lt) * (1 - split), { k: ss(3.7, 4.3, lt) });
  if (split < .5) {
    T.tag(ctx, lt - 5.1, 2.7, ex + er * .7, ey - er * .45, ex + er * .55, ey - er * 1.2, 'CHORION', 'the protective eggshell');
    T.tag(ctx, lt - 5.5, 2.3, ex - er * .45, ey + er * .2, ex - er * .55, ey + er * 1.0, 'YOLK', 'food for the embryo', { side: -1 });
    T.tag(ctx, lt - 6.4, 1.45, ex + er * .1, ey + er * .4, ex + er * .35, ey + er * 1.05, 'EMBRYO', 'cells → segments → larva', { color: T.TEAL });
    T.caption(ctx, lt - 4.6, 3.3, 1620, ['Inside, one cell divides into *thousands*', 'and builds a tiny *larva*.'], { size: 48 });
  }
  // --- the queen chooses: fertilised -> female, unfertilised -> male
  if (split > 0) {
    const a = split * (1 - ss(10.2, 10.6, lt));
    ctx.save(); ctx.globalAlpha *= a;
    G.text(ctx, 'SHE CHOOSES THE SEX', 540, 880, { font: 'CondB', size: 44, color: T.CREAM, align: 'center', track: 6, alpha: ss(8.4, 8.8, lt) });
    const k1 = ss(8.7, 9.3, lt), k2 = ss(9.1, 9.7, lt);
    T.arrow(ctx, 470, 920, 290, 1080, out3(k1), T.AMBER, { w: 4 }); T.arrow(ctx, 610, 920, 790, 1080, out3(k2), T.TEAL, { w: 4 });
    const bx = [280, 800];
    [[0, k1, 'FERTILISED', 'FEMALE', 'worker or queen', T.AMBER], [1, k2, 'UNFERTILISED', 'MALE', 'only for mating', T.TEAL]].forEach(([i, k, l1, l2, l3, col]) => {
      if (k <= 0) return;
      const x = bx[i];
      ctx.save(); ctx.globalAlpha *= k;
      ctx.fillStyle = 'rgba(10,6,3,.6)'; ctx.strokeStyle = rgba(col, .9); ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(x - 230, 1100, 460, 380, 22); ctx.fill(); ctx.stroke();
      G.text(ctx, l1, x, 1150, { font: 'Mono', size: 22, color: col, align: 'center', track: 4 });
      ANT.draw(ctx, x + (i ? 10 : 20), 1340, i ? .78 : .82, { caste: i ? 'male' : 'worker', wings: i ? 1 : 0, ant: lt * .4, phase: lt * .6 });
      G.text(ctx, l2, x, 1418, { font: 'CondH', size: 62, color: T.CREAM, align: 'center', track: 4 });
      G.text(ctx, l3, x, 1458, { font: 'Mono', size: 20, color: '#ffe2bd', align: 'center' });
      ctx.restore();
    });
    ctx.restore();
    T.caption(ctx, lt - 8.6, 2.0, 1640, ['Using her stored sperm, *she decides*.'], { size: 50 });
  }
  ctx.restore();
}

// ------------------------------------------------------------------ LARVA
const LX = 520, LY = FLOOR - 100;
const SIZES = [.75, 1.05, 1.35, 1.65, 1.95];
function larva(ctx, lt) {
  const molts = EV.molts.map((t) => t - B(11)), feeds = EV.feed.map((t) => t - B(11));
  const scanK = ss(7.8, 8.4, lt) * (1 - ss(10.7, 11.2, lt)), fork = ss(10.9, 11.4, lt);
  nest(ctx, lt);
  // other brood in the nursery
  PILE.slice(0, 4).forEach(([x, y], i) => BR.egg(ctx, x - 120, y + 6, 30, { ang: hash(i + 3) - .5 }));
  BR.larva(ctx, 900, FLOOR - 60, .9, { t: lt + 2, ang: .3, flip: true });
  // our larva: hatches, grows in steps (moults)
  const hatch = ss(0, 1.1, lt);
  let si = 0; molts.forEach((m) => { if (lt > m) si++; });
  const prevS = SIZES[Math.max(0, si - 1)], curS = SIZES[si], mk = si ? back(ss(molts[si - 1], molts[si - 1] + .45, lt), 1.6) : 1;
  const ls = lerp(prevS, curS, si ? mk : 1) * lerp(.35, 1, out3(ss(.3, 1.2, lt)));
  if (lt < 1.4) {
    // egg shell cracking open
    const a = 1 - ss(.7, 1.3, lt);
    ctx.save(); ctx.globalAlpha *= a;
    const open = ss(.15, .9, lt);
    ctx.save(); ctx.translate(LX - 20 * open, LY - 10 * open); ctx.rotate(-.5 * open); BR.egg(ctx, -10, 0, 80, { ang: -.2 }); ctx.restore();
    ctx.save(); ctx.translate(LX + 40 * open, LY + 10 * open); ctx.rotate(.4 * open); ctx.beginPath(); ctx.rect(0, -80, 120, 160); ctx.clip(); BR.egg(ctx, -10, 0, 80, { ang: -.2 }); ctx.restore();
    ctx.restore();
  }
  const mouthOpen = feeds.reduce((p, f) => p + win(f - .3, f, f + .5, f + .9, lt), 0);
  const fed = clamp(.25 + .2 * si + mouthOpen * .2);
  const L = BR.larva(ctx, LX, LY, ls, { t: lt, ang: -.15, a: ss(.2, .6, lt), fed, mouth: mouthOpen });
  // shed skin slipping off at each moult
  molts.forEach((m, i) => {
    const u = lt - m; if (u < 0 || u > 1.2) return;
    ctx.save(); ctx.globalAlpha *= (1 - u / 1.2) * .7;
    ctx.translate(-40 * u, 30 * u);
    ctx.strokeStyle = '#fff6e4'; ctx.lineWidth = 2; ctx.setLineDash([5, 5]);
    const sp = (() => { const n = 12, pts = [], ws = []; for (let k = 0; k <= n; k++) { const uu = k / n, an = lerp(-2.25, .95, uu), rad = lerp(46, 38, uu) * SIZES[i]; pts.push([LX + Math.cos(an - .15) * rad * 1.15, LY + Math.sin(an - .15) * rad]); ws.push((10 + 22 * Math.sin(Math.PI * Math.pow(uu, .85))) * SIZES[i]); } return [pts, ws]; })();
    G.taper(ctx, sp[0], sp[1]); ctx.stroke(); ctx.setLineDash([]);
    ctx.restore();
    G.glow(ctx, LX, LY, 160 * curS, '#fff1c8', .35 * Math.exp(-u * 4));
  });
  // nurse: walks in, feeds twice, leaves
  const nIn = ss(1.0, 2.0, lt), nOut = ss(4.0, 5.2, lt), nx = lerp(1400, 830, nIn) + nOut * 700;
  if (nx < 1450) {
    const bend = feeds.reduce((p, f) => p + win(f - .5, f - .2, f + .5, f + .8, lt), 0);
    ANT.draw(ctx, nx, FLOOR, 1.45, { caste: 'worker', flip: true, phase: gait((1400 - nx) + nOut * 1400, 1.45), head: bend * .35, jaw: .3 + bend * .4, ant: lt * .6 });
    // droplet passing mouth to mouth
    feeds.forEach((f) => {
      const u = ss(f - .25, f + .25, lt); if (u <= 0 || u >= 1) return;
      const [mx, my] = ANT.toScreen(nx, FLOOR, 1.45, [120, -72], true), [tx, ty] = [LX + L.mouth[0] * Math.cos(-.15) - L.mouth[1] * Math.sin(-.15), LY + L.mouth[0] * Math.sin(-.15) + L.mouth[1] * Math.cos(-.15)];
      const x = lerp(mx, tx, u), y = lerp(my, ty, u) - Math.sin(Math.PI * u) * 30;
      G.glow(ctx, x, y, 34, T.AMBER, .7); ctx.fillStyle = '#ffd27a'; ctx.beginPath(); ctx.arc(x, y, 9, 0, TAU); ctx.fill();
    });
  }
  T.heading(ctx, lt - .25, 3.2, 80, 660, 2, 'LARVA', 'no legs, no eyes, always hungry');
  T.tag(ctx, lt - 1.9, 2.0, 680, LY - 90, 700, LY - 420, 'TROPHALLAXIS', 'mouth-to-mouth feeding');
  T.caption(ctx, lt - 1.5, 2.5, 1600, ['It can\'t feed itself, so *nurses*', 'feed it *mouth to mouth*.'], { size: 52 });
  // moult counter
  const ia = win(3.6, 4.0, 7.5, 7.9, lt);
  if (ia > 0) {
    G.text(ctx, 'INSTAR', 540, 470, { font: 'Mono', size: 22, color: T.AMBER, align: 'center', track: 6, alpha: ia });
    for (let i = 0; i < 5; i++) {
      const on = i <= si, x = 540 + (i - 2) * 110, r = 18 + i * 5;
      ctx.save(); ctx.globalAlpha *= ia;
      ctx.fillStyle = on ? rgba(T.AMBER, .95) : 'rgba(255,240,220,.12)'; ctx.strokeStyle = rgba(T.CREAM, .6); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x, 540, r, 0, TAU); ctx.fill(); ctx.stroke();
      G.text(ctx, ['I', 'II', 'III', 'IV', 'V'][i], x, 550, { font: 'CondB', size: 26, color: on ? '#1a0f08' : T.CREAM, align: 'center' });
      ctx.restore();
    }
    T.caption(ctx, lt - 4.1, 3.6, 1600, ['It eats, grows and *moults*,', 'shedding its skin *several times*.'], { size: 52 });
  }
  // x-ray: inside the larva
  if (scanK > 0) {
    T.lens(ctx, lt - 7.8, 3.4, LX, LY, 540, 960, 380, (c, R) => {
      const s = 3.3, cx = 500, cy = 960;
      BR.larva(c, cx, cy, s, { t: lt, xray: 1, fed: .8, ang: -.15, lod: 1, hl: { gut: win(8.6, 8.9, 9.6, 9.9, lt), silk: win(9.2, 9.5, 10.3, 10.6, lt), disc: win(9.8, 10.1, 11, 11.2, lt), fat: win(8.9, 9.2, 10, 10.3, lt) } });
      const P = (part) => { const [x, y] = BR.larvaAnchor(s, part, lt), a = -.15; return [cx + x * Math.cos(a) - y * Math.sin(a), cy + x * Math.sin(a) + y * Math.cos(a)]; };
      const [gx, gy] = P('gut'), [hx2, hy2] = P('hind'), [sx, sy] = P('silk'), [fx, fy] = P('fat'), [dx, dy] = P('disc');
      T.tag(c, lt - 8.6, 2.6, gx, gy, gx - 120, gy + 210, 'MIDGUT', 'a closed bag: no exit yet!', { side: -1, size: 30, subSize: 20 });
      T.tag(c, lt - 8.9, 2.3, fx, fy, fx + 40, fy - 120, 'FAT BODY', 'stored energy', { size: 28, subSize: 19 });
      T.tag(c, lt - 9.25, 1.95, sx, sy, sx + 20, sy + 190, 'SILK GLANDS', 'to spin the cocoon', { color: '#e8fffb', size: 28, subSize: 19 });
      T.tag(c, lt - 9.7, 1.5, dx, dy, dx + 60, dy - 170, 'IMAGINAL DISCS', 'future legs, wings, eyes', { color: T.TEAL, size: 28, subSize: 19 });
    }, { label: 'X-RAY · INSIDE THE LARVA', sr: 60 * ls });
    T.caption(ctx, lt - 8.1, 2.9, 1620, ['Its gut has *no exit*: all its waste', 'stays inside until it *pupates*.'], { size: 50 });
  }
  // caste fork: diet decides
  if (fork > 0) {
    const a = fork;
    ctx.save(); ctx.globalAlpha *= a;
    ctx.fillStyle = 'rgba(8,5,3,.72)'; ctx.fillRect(0, 0, W, H);
    G.glow(ctx, 540, 640, 260, '#ffcf8a', .3);
    BR.larva(ctx, 540, 640, 1.1, { t: lt, ang: -.15 });
    G.text(ctx, 'SAME EGG · DIFFERENT FATE', 540, 470, { font: 'Mono', size: 24, color: T.AMBER, align: 'center', track: 4 });
    const k1 = ss(11.3, 11.8, lt), k2 = ss(11.6, 12.1, lt);
    T.arrow(ctx, 470, 740, 300, 930, out3(k1), T.CREAM, { w: 4 }); T.arrow(ctx, 610, 740, 780, 930, out3(k2), T.AMBER, { w: 4 });
    if (k1 > 0) { ctx.save(); ctx.globalAlpha *= k1; G.text(ctx, 'NORMAL DIET', 300, 990, { font: 'Mono', size: 22, color: T.CREAM, align: 'center', track: 3 }); ANT.draw(ctx, 320, 1220, .95, { caste: 'worker', ant: lt * .5 }); G.text(ctx, 'WORKER', 300, 1310, { font: 'CondH', size: 70, color: T.CREAM, align: 'center', track: 4 }); G.text(ctx, 'sterile female', 300, 1352, { font: 'Mono', size: 20, color: '#ffe2bd', align: 'center' }); ctx.restore(); }
    if (k2 > 0) { ctx.save(); ctx.globalAlpha *= k2; G.text(ctx, 'EXTRA FOOD + HORMONES', 780, 990, { font: 'Mono', size: 22, color: T.AMBER, align: 'center', track: 3 }); ANT.draw(ctx, 820, 1220, .8, { caste: 'queen', wings: 1, ant: lt * .5 }); G.text(ctx, 'QUEEN', 780, 1310, { font: 'CondH', size: 70, color: T.AMBER, align: 'center', track: 4 }); G.text(ctx, 'winged · fertile', 780, 1352, { font: 'Mono', size: 20, color: '#ffe2bd', align: 'center' }); ctx.restore(); }
    ctx.restore();
    T.caption(ctx, lt - 11.6, 1.75, 1600, ['Mostly, *food* decides its future.'], { size: 54 });
  }
}

module.exports = { egg, larva, nest, FLOOR, PILE };
