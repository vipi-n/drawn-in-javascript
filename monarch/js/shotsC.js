// Shots 7-10 (50-82.5 s): under the moon the J caterpillar splits its skin, wriggles it up and off, and the soft pupa
// shrinks into a jade chrysalis while gold dots appear; an x-ray iris shows the body dissolving and the imaginal discs
// building wings, legs, eyes and antennae over ten days; at dawn the clear case cracks, the butterfly hangs and pumps up
// its crumpled wings, zips its proboscis, dries, then takes its first flight into a wide morning sky.
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
const S = require('./scene');
const SB = require('./shotsB');
const { EV } = require('./cues');

const screen = (ctx) => ctx.setTransform(1, 0, 0, 1, 0, 0);
const PAD = SB.UNDER.at(SB.PAD_S);
const CH = { x: PAD[0], y: PAD[1] + 2, h: 250 };
// the hanging chrysalis swings gently from its silk pad in the breeze
const swing = (t, k = 1) => (Math.sin(t * 1.25) * .045 + Math.sin(t * 2.9 + 1) * .015) * k;
function pendulum(ctx, t, k, fn) { ctx.save(); ctx.translate(CH.x, CH.y); ctx.rotate(swing(t, k)); ctx.translate(-CH.x, -CH.y); fn(); ctx.restore(); }

function stage(ctx, c, t, tod, o = {}) {
  S.meadowBack(ctx, c, t, tod, { sun: o.sun, sunR: 54, sunA: o.sunA ?? 0, rays: o.rays ?? 0, bokehN: 16, bokehA: o.bokehA ?? .18, dof: 6, bokehCols: o.bokehCols ?? ['#9fc0ff', '#ffd0a0', '#ffffff'], mist: o.mist ?? 0 });
  if (o.moon) { const mp = F.toScreen(S.layerCam(c, .1), 840, 120); Wd.moon(ctx, mp[0], mp[1], 34, o.moon); }
  M.cam(ctx, c);
  SB.twigDraw(ctx);
}

// ===================================================================== S7: the chrysalis forms (50-57.5)
function s7(ctx, lt, t) {
  const split = EV.split - 50, twist = EV.twist - 50, fall = EV.skinFall - 50, shape = EV.shape - 50;
  const tod = lerp(.96, 1.2, ss(3, 7.5, lt));
  const c = F.rig(lt, [
    [0, { x: CH.x + 70, y: CH.y + 250, z: 1.15, r: .03 }],
    [1.2, { x: CH.x + 70, y: CH.y + 230, z: 1.45, r: -.02 }, M.sineInOut],
    [4.0, { x: CH.x - 40, y: CH.y + 190, z: 1.6, r: .025 }, M.sineInOut],
    [5.0, { x: CH.x + 30, y: CH.y + 160, z: 1.85, r: 0 }, M.expoInOut],
    [7.5, { x: CH.x - 20, y: CH.y + 140, z: 2.2, r: -.02 }, M.sineInOut],
  ], { drift: 1.0, shakes: [[split, 4], [twist, 9], [fall, 5]].concat(EV.wriggles.map((w) => [w - 50, 3])) });
  stage(ctx, c, t, tod, { moon: 1 - ss(5.5, 7.5, lt) * .6, bokehCols: ['#8fb0ff', '#c0a0ff', '#ffffff'] });
  // moonlit rim
  M.cam(ctx, c);
  D.glow(ctx, CH.x + 60, CH.y + 160, 260, '#8fb4ff', .25);
  const L = 440;
  if (lt < split + .25) {
    const curl = lerp(1, .75, ss(0, split, lt));
    Lv.larva(ctx, { path: Lv.jPath(CH.x, CH.y, L * .97, 1, curl), s0: 0, L, instar: 5, t, up: -1, limp: 1, dull: ss(0, split, lt) * .3, shadow: false, alpha: 1 - ss(split, split + .25, lt) });
  }
  if (lt > split) {
    // skin climbs in steps with each wriggle, then the shrivelled bundle drops away
    let low = 1 - ss(split, split + .4, lt) * .15;
    EV.wriggles.forEach((w) => { low -= .16 * ss(w - 50, w - 50 + .3, lt); });
    low = Math.max(.12, low);
    const wob = EV.wriggles.reduce((a, w) => a + Math.exp(-Math.max(0, lt - (w - 50)) * 4) * (lt > w - 50 ? 1 : 0), 0) + (lt > twist && lt < fall + .3 ? 1.4 : 0);
    const el = 1 - M.expoOut(inv(shape, shape + 2.2, lt));
    const spin = lt > twist && lt < fall + .4 ? Math.sin((lt - twist) * 30) * .12 * (1 - ss(fall, fall + .4, lt)) : 0;
    const gold = EV.gold.filter((g) => lt > g - 50).length / EV.gold.length;
    pendulum(ctx, t, ss(shape, shape + 1, lt), () => {
      Pu.chrysalis(ctx, CH.x, CH.y, { h: CH.h, el, wob: Math.min(1.5, wob), t, gold: ss(0, .2, gold) * gold, rot: spin, alpha: ss(split, split + .2, lt) });
      if (lt < fall) Pu.skinSleeve(ctx, CH.x, CH.y + CH.h * .1, CH.h * 1.45, low, { t, rot: spin });
    });
    if (lt >= fall) { // falling skin
      const age = lt - fall; ctx.save(); ctx.translate(CH.x + age * 80, CH.y + age * age * 1600); ctx.rotate(age * 6); Pu.skinSleeve(ctx, 0, 0, CH.h * 1.45, .12, { t }); ctx.restore();
    }
    // gold dots sparkle into being
    screen(ctx);
    EV.gold.forEach((g, i) => {
      const age = lt - (g - 50); if (age < 0 || age > .8) return;
      const ang = Math.PI * (i + .5) / EV.gold.length, r = Pu.prof(.3) * CH.h * .9;
      const p = F.toScreen(c, CH.x + Math.cos(ang) * r, CH.y + CH.h * .1 + CH.h * .28 + Math.sin(ang) * r * .2);
      D.spark(ctx, p, 1.6 * (1 - age), 1 - age / .8, '#fff2a0'); F.burst(ctx, p[0], p[1], age, { r: 40, col: '#ffe9a0', life: .5, rays: 8, n: 1 });
    });
  }
  F.zoomLines(ctx, 540, 520, ss(7.1, 7.5, lt), t, { a: .4, col: '#e0f4ff' });
}

// ===================================================================== S8: metamorphosis, x-ray (57.5-67.5)
// folded adult inside the hanging pupa (pupa coords: origin at the top of the body, y down, h = height)
function inside(ctx, h, prog, t, a = 1) {
  const g = (a0, a1) => ss(a0, a1, prog);
  ctx.save(); ctx.globalAlpha *= a; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  // forewing folded along the side: base near the thorax, tip toward the bottom
  ctx.save(); ctx.translate(-h * .06, h * .36); ctx.rotate(1.5); const ws = h * .0058; ctx.scale(ws, ws);
  const wp = g(.15, .55), fill = g(.72, .95);
  if (fill > 0) {
    ctx.save(); D.shape(ctx, B.FW); ctx.clip();
    ctx.fillStyle = rgba('#ff8a1a', .85 * fill); ctx.fillRect(-10, -60, 130, 100);
    ctx.strokeStyle = rgba('#1a1210', fill); ctx.lineWidth = 3.2;
    for (const k in B.FV) { ctx.beginPath(); D.trace(ctx, B.FV[k], false); ctx.stroke(); }
    ctx.lineWidth = 18; D.shape(ctx, B.FW); ctx.stroke();
    ctx.restore();
  }
  ctx.strokeStyle = rgba('#bff4ff', .95); ctx.lineWidth = 2.4 / ws;
  D.strokePart(ctx, B.FW.concat([B.FW[0]]), wp, false, true);
  ctx.strokeStyle = rgba('#8fe3ff', .7); ctx.lineWidth = 1.4 / ws;
  Object.values(B.FV).forEach((v, i) => D.strokePart(ctx, v, g(.3 + i * .015, .6 + i * .015), false, true));
  ctx.restore();
  // eyes, antennae, legs and proboscis along the front, down to the head at the bottom
  const eye = g(.2, .45);
  ctx.strokeStyle = rgba('#ffd6ff', .95); ctx.lineWidth = 2.6;
  if (eye > 0) { ctx.beginPath(); ctx.arc(h * .1, h * .86, h * .055 * eye, 0, TAU); ctx.stroke(); D.glow(ctx, h * .1, h * .86, h * .1, '#ff9cf0', .4 * eye); }
  ctx.strokeStyle = rgba('#d8c8ff', .95); ctx.lineWidth = 2;
  for (let i = 0; i < 2; i++) D.strokePart(ctx, [[h * .14, h * .82], [h * (.17 + i * .03), h * .55], [h * (.12 + i * .03), h * .22]], g(.3 + i * .05, .65 + i * .05), false, true);
  for (let i = 0; i < 3; i++) D.strokePart(ctx, [[h * .05, h * .5 + i * h * .04], [h * .16, h * .62 + i * h * .05], [h * .12, h * .78 + i * h * .03]], g(.35 + i * .05, .7), false, true);
  ctx.strokeStyle = rgba('#ffe6a0', .95); D.strokePart(ctx, [[h * .1, h * .9], [h * .2, h * .7], [h * .18, h * .45]], g(.4, .75), false, true);
  // abdomen rings in the dome at the top
  ctx.strokeStyle = rgba('#9fe8c8', .8); ctx.lineWidth = 2;
  for (let i = 0; i < 6; i++) { const y = h * (.06 + i * .045), r = Pu.prof(y / h) * h * .8; D.strokePart(ctx, [[-r, y], [0, y + r * .2], [r, y]], g(.25 + i * .05, .55 + i * .05), false, true); }
  ctx.restore();
}
function s8(ctx, lt, t) {
  const iris = EV.iris - 57.5, soup = EV.soup - 57.5, discs = EV.discs - 57.5, grow = EV.grow - 57.5, colour = EV.colour - 57.5, back = EV.back - 57.5;
  const c = F.rig(lt, [
    [0, { x: CH.x - 20, y: CH.y + 140, z: 2.2, r: -.02 }],
    [iris + .5, { x: CH.x + 10, y: CH.y + 150, z: 2.6, r: .02 }, M.sineInOut],
    [back, { x: CH.x - 10, y: CH.y + 140, z: 2.8 }, M.sineInOut],
    [8.4, { x: CH.x + 60, y: CH.y + 190, z: 1.75, r: -.03 }, M.expoOut],
    [10, { x: CH.x + 20, y: CH.y + 170, z: 1.9, r: 0 }, M.sineInOut],
  ], { drift: 1.0 });
  const clear = ss(back, back + 2.2, lt);
  const colourScene = () => {
    stage(ctx, c, t, lerp(.2, .3, ss(0, 10, lt)), { sun: [100, 700], sunA: ss(back, 10, lt), rays: .5 * ss(back, 10, lt), bokehCols: ['#ffd0a0', '#ffb0c0', '#ffffff'] });
    M.cam(ctx, c);
    pendulum(ctx, t, 1, () => Pu.chrysalis(ctx, CH.x, CH.y, { h: CH.h, t, clear, gold: 1 }));
    Wd.motes(ctx, t, { cx: c.x, cy: c.y, n: 24, a: .45 * ss(back, back + 1, lt) });
  };
  const xray = (g) => {
    g.fillStyle = rgba('#0b0a26'); g.fillRect(0, 0, W, H);
    const bg = g.createRadialGradient(540, 560, 50, 540, 560, 700); bg.addColorStop(0, rgba('#2a1a5a', .9)); bg.addColorStop(1, rgba('#0b0a26', 0)); g.fillStyle = bg; g.fillRect(0, 0, W, H);
    M.cam(g, c); F.blueprint(g, c, .5, 40, { col: '#3a3a8a' });
    g.save(); g.translate(CH.x, CH.y + CH.h * .1);
    const h = CH.h;
    // case outline, turning construction rings
    g.strokeStyle = rgba('#8fe3ff', .9); g.lineWidth = 2.2; g.beginPath();
    for (let i = 0; i <= 40; i++) { const v = i / 40; g.lineTo(Pu.prof(v) * h, v * h); }
    for (let i = 40; i >= 0; i--) { const v = i / 40; g.lineTo(-Pu.prof(v) * h, v * h); }
    g.closePath(); g.stroke();
    F.turningRing(g, 0, h * .5, h * .62, t, { col: '#6a8aff', a: .5, speed: 30 });
    F.turningRing(g, 0, h * .5, h * .74, -t, { col: '#c060ff', a: .35, dash: [4, 12], speed: 20 });
    // the old body: a curled caterpillar outline that melts into a swirl of particles
    const melt = ss(soup, soup + 1.4, lt), build = ss(grow, colour + .4, lt);
    if (melt < 1) { g.strokeStyle = rgba('#9fffd0', .8 * (1 - melt)); g.lineWidth = 3; g.beginPath(); g.ellipse(0, h * .5, h * .14, h * .38, 0, 0, TAU); g.stroke(); }
    g.save(); g.globalCompositeOperation = 'lighter';
    const r = rng(8);
    for (let i = 0; i < 160; i++) {
      const a0 = r() * TAU, rad = Math.sqrt(r()) * h * .22, sp = (.4 + r()) * (r() < .5 ? 1 : -1);
      const a = a0 + t * sp * melt, v = .5 + Math.sin(a0 * 3 + t) * .3;
      const x = Math.cos(a) * rad * (1 - build * .6), y = h * v + Math.sin(a) * rad * 1.6 * (1 - build * .6);
      const col = ['#5ff0ff', '#ff6ae0', '#ffd34a', '#9a7aff'][i % 4];
      D.glow(g, x, y, 7 + r() * 9, col, .35 * melt * (1 - build * .7));
    }
    g.restore();
    // imaginal discs: bright seeds that bloom into wing, eye, antennae, legs
    const dp = ss(discs, discs + .6, lt);
    const SEEDS = [[-h * .02, h * .38, '#5ff0ff'], [h * .1, h * .86, '#ff9cf0'], [h * .14, h * .8, '#d8c8ff'], [h * .08, h * .52, '#d8c8ff'], [h * .1, h * .9, '#ffe6a0']];
    SEEDS.forEach(([x, y, col], i) => {
      const k = ss(discs + i * .15, discs + i * .15 + .3, lt) * (1 - build * .8);
      if (k <= 0) return;
      D.glow(g, x, y, 40 * k, col, .9 * k); D.dot(g, x, y, 5 * k, '#ffffff');
      for (const d of [0, .4]) { const u = ((lt - discs - i * .15 - d) % 1.2) / 1.2; if (u > 0) D.ring(g, x, y, 6 + u * 50, col, (1 - u) * .8 * k, 2); }
    });
    if (dp > 0) inside(g, h, ss(grow, colour + .6, lt), t, 1);
    g.restore();
  };
  if (lt < iris) colourScene();
  else if (lt < back + .6) {
    const op = M.expoInOut(inv(iris, iris + .7, lt)), cl = M.expoInOut(inv(back - .1, back + .6, lt));
    if (op < 1 || cl > 0) colourScene();
    const cs = F.toScreen(c, CH.x, CH.y + CH.h * .6);
    const R = lt < back - .1 ? 1600 * op : 1600 * (1 - cl);
    F.iris(ctx, cs[0], cs[1], R, xray, { col: '#bff4ff', col2: '#c060ff' });
  } else colourScene();
  // day badge across the ten days
  const day = 1 + 9 * ss(soup, colour + .8, lt);
  U.badge(ctx, 930, 172, day, ss(soup - .2, soup + .2, lt) * (1 - ss(9.4, 9.9, lt)), { n: 10, r: 80, col: '#8f7aff' });
  F.flash(ctx, lt - iris, { a: .5, k: 12, col: '#d8f4ff' });
  F.flash(ctx, lt - back, { a: .55, k: 10, col: '#fff4e0' });
}

// ===================================================================== S9: emergence (67.5-77.5)
const SHELL = { x: CH.x, y: CH.y };
function hangPose(o) { // freshly emerged: hanging under the shell, head up-left, closed wings drooping down-left
  return { yaw: -.72, roll: -Math.PI / 2 + (o.roll ?? .12), pitch: 0, flap: o.flap ?? 1.48, flapH: o.flapH, s: o.s ?? 1.12 };
}
function s9(ctx, lt, t) {
  const crack = EV.crack - 67.5, out = EV.out - 67.5, pump = EV.pump - 67.5, zip = EV.zip - 67.5, dry = EV.dry - 67.5;
  const c = F.rig(lt, [
    [0, { x: CH.x + 20, y: CH.y + 170, z: 1.9 }],
    [crack, { x: CH.x - 20, y: CH.y + 190, z: 2.15, r: .02 }, M.sineInOut],
    [out + .6, { x: CH.x + 30, y: CH.y + 300, z: 1.55, r: -.02 }, M.expoOut],
    [zip, { x: CH.x - 70, y: CH.y + 320, z: 1.45, r: .025 }, M.sineInOut],
    [dry, { x: CH.x + 10, y: CH.y + 340, z: 1.3, r: -.02 }, M.sineInOut],
    [10, { x: CH.x - 10, y: CH.y + 300, z: 1.25, r: 0 }, M.sineInOut],
  ], { drift: 1.0, shakes: [[crack, 10], [out, 6]] });
  const tod = lerp(.3, .38, ss(0, 10, lt));
  stage(ctx, c, t, tod, { sun: [120, 560], sunA: 1, rays: .9, bokehCols: ['#ffe0a0', '#ffc0d0', '#ffffff'], mist: .5 });
  M.cam(ctx, c);
  const twitch = lt < crack ? Math.sin(lt * 40) * .02 * ss(crack - .8, crack - .2, lt) : 0;
  ctx.save(); ctx.translate(CH.x, CH.y); ctx.rotate(swing(t, lerp(1, .7, ss(0, 1.2, lt)))); ctx.translate(-CH.x, -CH.y);
  if (lt < out) Pu.chrysalis(ctx, CH.x, CH.y, { h: CH.h, t, clear: 1, crack: ss(crack, crack + .3, lt), rot: twitch });
  else Pu.chrysalis(ctx, CH.x, CH.y, { h: CH.h, t, empty: true });
  if (lt >= out) {
    // slide out of the split case, grab hold, hang; wings pump up while the abdomen shrinks
    const slide = M.expoOut(inv(out, out + .9, lt));
    const open = M.sineInOut(inv(pump, dry, lt));
    const abd = lerp(1.75, 1.05, ss(pump, dry, lt));
    const base = [SHELL.x + 16, SHELL.y + CH.h * .96 + 14];
    const pos = [lerp(SHELL.x, base[0], slide), lerp(SHELL.y + CH.h * .6, base[1], slide)];
    const opening = EV.opens.reduce((a, o) => a + Math.sin(Math.PI * clamp((lt - (o - 67.5)) / .9)), 0);
    const pulse = open > 0 && open < 1 ? Math.max(0, Math.sin(lt * 5.2)) * .12 : 0; // little pumping shrugs
    const feet = [[SHELL.x - 14, SHELL.y + CH.h * .98], [SHELL.x - 4, SHELL.y + CH.h * 1.0], [SHELL.x + 8, SHELL.y + CH.h * 1.0], [SHELL.x + 18, SHELL.y + CH.h * .97]];
    B.butterfly(ctx, { x: pos[0], y: pos[1], ...hangPose({ flap: 1.48 - opening * .95 - pulse, flapH: 1.44 - opening * .9 - pulse * .8 }), open: .02 + .98 * open, abd, feet: slide > .5 ? feet : null, prob: 0, droop: 1 - open * .7 });
    // fluid pulses travelling into the wing veins while they expand
    if (open > 0 && open < 1) { screen(ctx); const p = F.toScreen(c, pos[0] - 60, pos[1] + 70); for (let k = 0; k < 3; k++) { const u = ((lt * 1.6 + k / 3) % 1); D.glow(ctx, lerp(p[0] + 40, p[0] - 80, u), lerp(p[1] - 40, p[1] + 90, u), 30, '#ffe9a0', .5 * Math.sin(Math.PI * u)); } }
  }
  ctx.restore();
  Wd.motes(ctx, t, { cx: c.x, cy: c.y, n: 30, a: .5 });
  screen(ctx);
  if (lt > crack && lt < crack + .8) { const p = F.toScreen(c, CH.x, CH.y + CH.h * 1.05); F.burst(ctx, p[0], p[1], lt - crack, { r: 120, col: '#fff6d8', life: .7, rays: 14 }); }
  // the proboscis zips: two halves join from base to tip (callout lens)
  const zp = inv(zip, zip + .5, lt) * (1 - ss(dry - .4, dry, lt));
  if (zp > 0) {
    const hd = F.toScreen(c, SHELL.x + 6, SHELL.y + CH.h * 1.12);
    D.callout(ctx, { x: hd[0], y: hd[1], r: 26 }, { x: 830, y: 760, r: 165 }, zp, (g) => {
      g.save(); g.translate(830, 760);
      const bgc = g.createRadialGradient(0, 0, 10, 0, 0, 180); bgc.addColorStop(0, '#fff3dc'); bgc.addColorStop(1, '#f2c890'); g.fillStyle = bgc; g.fillRect(-170, -170, 340, 340);
      D.dot(g, -95, -95, 60, '#1d1614'); D.dot(g, -78, -112, 16, '#4a3a32'); // head + eye
      const z = clamp((lt - zip - .3) / 2.0), curl = .6 + .4 * Math.sin((lt - zip) * 3);
      for (const sd of [-1, 1]) {
        g.strokeStyle = rgba('#2b1d18'); g.lineWidth = 9; g.lineCap = 'round'; g.beginPath();
        for (let i = 0; i <= 40; i++) {
          const u = i / 40, a = u * 4.2 * curl, r = 120 * (1 - u * .72), sep = u > z ? (u - z) * 22 * sd : 0;
          const x = -60 + Math.cos(a - .9) * r * .9 + sep, y = -40 + Math.sin(a - .9) * r * .9 + sep * .6;
          if (i) g.lineTo(x, y); else g.moveTo(x, y);
        }
        g.stroke();
      }
      // zipper teeth glint at the join point
      const a = z * 4.2 * curl, r = 120 * (1 - z * .72); D.spark(g, [-60 + Math.cos(a - .9) * r * .9, -40 + Math.sin(a - .9) * r * .9], 1.2, .9, '#fff6c0');
      g.restore();
    }, { col: '#fff6e0', bg: '#f2c890' });
  }
  // drying clock
  const da = ss(dry, dry + .4, lt) * (1 - ss(9.5, 9.9, lt));
  const hrs = lerp(0, 2, ss(dry, 9.6, lt));
  U.clock(ctx, 930, 180, 70, hrs, da, { max: 2, col: '#ffb347', label: `${hrs.toFixed(1)} h` });
}

// ===================================================================== S10: first flight (77.5-82.5)
const FLY = [[0, 0, 0], [.6, 120, -160], [1.3, 380, -420], [2.2, 760, -520], [3.2, 1200, -380], [4.2, 1640, -520], [5.2, 2100, -700]];
function s10(ctx, lt, t) {
  const st = [SHELL.x + 16, SHELL.y + CH.h * .96 + 14];
  const keys = FLY.map(([tt, dx, dy]) => [tt, st[0] + dx, st[1] + dy]);
  const [bx, by] = S.flight(keys, lt);
  const c = F.rig(lt, [
    [0, { x: CH.x - 10, y: CH.y + 300, z: 1.25 }],
    [1.4, { x: bx - 40, y: by + 60, z: .95 }, M.expoInOut],
    [5.0, { x: bx - 80, y: by + 40, z: .8 }, M.sineInOut],
  ], { drift: .8, seed: 2 });
  // keep the camera on the flyer once it is moving
  const follow = ss(.9, 1.6, lt), cc = { ...c, x: lerp(c.x, bx - 60 + 30 * Math.sin(lt), follow), y: lerp(c.y, by + 40, follow) };
  const tod = .4;
  S.meadowBack(ctx, cc, t, tod, { sun: [cc.x + 300, 300], sunR: 58, rays: 1, bokehN: 10, mist: .3 });
  M.cam(ctx, cc);
  if (lt < 1.5) { SB.twigDraw(ctx); ctx.save(); ctx.translate(CH.x, CH.y); ctx.rotate(swing(t, .7 * (1 - ss(.5, 1.5, lt)))); ctx.translate(-CH.x, -CH.y); Pu.chrysalis(ctx, CH.x, CH.y, { h: CH.h, t, empty: true, alpha: 1 }); if (lt < .5) B.butterfly(ctx, { x: st[0], y: st[1], ...hangPose({ flap: 1.48 - Math.abs(Math.sin(lt * 14)) * 1.2 }), open: 1 }); ctx.restore(); }
  // other monarchs far away in the sky
  for (let i = 0; i < 4; i++) { const ph = lt * .8 + i * 1.7; const x = cc.x - 500 + ((i * 410 + lt * 90) % 1400), y = cc.y - 380 + i * 90 + Math.sin(ph) * 30; B.mini(ctx, x, y, 22 + i * 4, Math.sin(ph) * .4, Math.sin(lt * 26 + i) * .9); }
  if (lt >= .5) { S.trail(ctx, keys, lt, 14, .04, '#fff4c8', ss(1, 1.6, lt) * .8); S.flyer(ctx, keys, lt, { s: 1.15, f: 4.6, glide: .35 }); }
  S.foreground(ctx, cc, t, { y: 1700, dof: 12, n: 6, seed: 3 });
  Wd.motes(ctx, t, { cx: cc.x, cy: cc.y, n: 26, a: .45 });
  F.whipLines(ctx, -.4, ss(4.6, 5.0, lt), t, { a: .35, col: '#ffffff' });
}

module.exports = { s7, s8, s9, s10, CH, hangPose };
