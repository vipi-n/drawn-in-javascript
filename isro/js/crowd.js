// Spectators watching a launch from across the lagoon, ~6 km from the pad: the crowd seen from behind,
// arms and phones and tricolours raised, the rocket climbing on a pillar of fire reflected in the water.
const { W, H, clamp, lerp, ss, hash, rng, noise2 } = require('./core');
const G = require('./gfx');
const Wt = require('./water');
const F = require('./flora');
const SK = require('./sky');
const PE = require('./people');
const S = require('./shar');
const { rocket } = require('./rockets');
const { VEH, alt } = require('./launch');
const { rgba, mixc, glow, puff } = G;

// deterministic crowd: rows from the water's edge back toward the camera
const CROWD = (() => {
  const r = rng(2023), out = [];
  const rows = [[66, 52, 1.3], [54, 44, 1.25], [44, 36, 1.2], [36, 30, 1.15], [29, 24, 1.1], [23, 18, 1.05], [18.5, 13, 1.0]];
  for (const [Z, n, spread] of rows) {
    for (let i = 0; i < n; i++) {
      const z = Z + (r() - .5) * 2.4, halfW = z * W / 2 / 4000 * spread + 1.5;
      const fem = r() < .4, kid = r() < .08, q = r();
      const kind = q < .3 ? 'cheer2' : q < .55 ? 'cheer1' : q < .67 ? 'phone' : q < .73 ? 'flag' : q < .83 ? 'clap' : 'watch';
      out.push({
        Z: z, X: lerp(-halfW, halfW, (i + r() * .8) / n), fem, kid, kind,
        dress: fem ? (r() < .7 ? 'saree' : 'shirt') : (r() < .25 ? 'dhoti' : 'shirt'),
        head: fem ? (r() < .6 ? 'bun' : 'braid') : (r() < .12 ? 'cap' : r() < .06 ? 'turban' : 'hair'),
        scale: (kid ? .6 : fem ? .93 : 1) * (.94 + r() * .12), build: .9 + r() * .25,
        prop: kind === 'flag' ? 'flag' : kind === 'phone' ? 'phone' : null, react: r() * .9, jump: kind === 'cheer2' && r() < .4, ph: r() * 6.28, sh: kid ? 0 : r() < .05 ? 1 : 0,
      });
    }
  }
  return out.sort((a, b) => b.Z - a.Z);
})();

function flag(ctx, x0, y0, len, t, lit, alpha = 1) {
  // stick then a cloth that ripples in the wind
  ctx.strokeStyle = rgba([30, 24, 20], alpha); ctx.lineWidth = Math.max(1, len * .03); ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0 + len * .05, y0 - len); ctx.stroke();
  const fx = x0 + len * .05, fy = y0 - len, fw = len * .62, fh = len * .42, N = 10;
  const wv = (u) => Math.sin(u * 5 - t * 7) * fh * .12 * u;
  const band = (k, c) => {
    ctx.fillStyle = rgba(mixc(c, [0, 0, 0], .45 - lit * .4), alpha); ctx.beginPath();
    for (let i = 0; i <= N; i++) { const u = i / N; ctx.lineTo(fx + u * fw, fy + k * fh / 3 + wv(u)); }
    for (let i = N; i >= 0; i--) { const u = i / N; ctx.lineTo(fx + u * fw, fy + (k + 1) * fh / 3 + wv(u)); }
    ctx.fill();
  };
  band(0, [255, 153, 51]); band(1, [245, 245, 245]); band(2, [19, 136, 8]);
  if (fh > 10) { ctx.strokeStyle = rgba([0, 0, 128], alpha * .8); ctx.lineWidth = Math.max(.8, fh * .03); ctx.beginPath(); ctx.arc(fx + fw * .5, fy + fh * .5 + wv(.5), fh * .13, 0, Math.PI * 2); ctx.stroke(); }
}

// the crowd layer. light: [x,y] screen position of the rocket flame; tl: seconds since the crowd started reacting
function crowd(ctx, V, tl, t, light, o) {
  const night = o.night, body = o.body, rim = o.rim, phones = [];
  for (const c of CROWD) {
    const s = V.f / c.Z, x = V.cx + c.X * s, y = V.hy + V.hc * s;
    if (x < -2 * s || x > W + 2 * s) continue;
    const u = ss(c.react, c.react + .6, tl + .4), wave = t * (6 + hash(c.ph) * 4) + c.ph, K = c.kind;
    const upL = u * (K === 'cheer2' ? 1 : K === 'clap' ? .4 : K === 'cheer1' ? .12 : 0), upR = u * (K === 'watch' ? .05 : K === 'clap' ? .4 : 1);
    const jump = c.jump && u > .7 ? Math.max(0, Math.sin(t * 7.5 + c.ph)) * .1 : 0;
    const sh = new PE.Shapes();
    const clap = K === 'clap' ? 1.5 + Math.sin(t * 14 + c.ph) * .25 : undefined;
    const r = PE.back(sh, x, y, s, { arms: [{ up: upL, wave: K === 'cheer2' ? wave : 0, bend: clap }, { up: upR, wave: K === 'phone' || K === 'clap' ? 0 : wave + 1.3, bend: K === 'phone' ? .9 : clap }], jump, nod: Math.sin(t * 3 + c.ph) * u }, { dress: c.dress, head: c.head, female: c.fem, scale: c.scale, build: c.build });
    // a child riding on shoulders
    if (c.sh) PE.back(sh, x, y - 1.32 * s * c.scale, s, { arms: [{ up: u, wave: wave + 2 }, { up: u * .9, wave: wave + 3 }], spread: .2 }, { scale: .55, dress: 'shirt' });
    const hz = clamp((c.Z - 18) / 60) * (o.hazeK ?? .35);
    const dx = light[0] - x, dy = light[1] - (y - 1.4 * s);
    PE.rimFill(ctx, sh, { body: mixc(body, o.haze, hz), rim, rimA: o.rimA ?? .6, rimW: Math.min(2.6, Math.max(1, s * .009)), lx: dx, ly: dy });
    if (c.prop === 'flag' && upR > .3) flag(ctx, r.hands[1][0], r.hands[1][1], .9 * s, t + c.ph, night ? .1 : .5);
    if (c.prop === 'phone' && upR > .4) phones.push([r.hands[1][0], r.hands[1][1] - .05 * s, s]);
  }
  // phone screens held up to film it
  for (const [x, y, s] of phones) {
    const w = .075 * s, h = .14 * s;
    ctx.fillStyle = 'rgb(12,12,14)'; ctx.fillRect(x - w / 2 - 1, y - h - 1, w + 2, h + 2);
    ctx.fillStyle = night ? 'rgb(40,46,70)' : 'rgb(120,130,150)'; ctx.fillRect(x - w / 2, y - h, w, h);
    ctx.fillStyle = 'rgb(255,220,150)'; ctx.fillRect(x - w * .1, y - h * .55, w * .2, h * .12);
    if (night) glow(ctx, x, y - h / 2, h * 1.6, [150, 180, 255], .25);
  }
}

// o: { veh, pal:'night'|'dawn', tau0 }
function gallery(ctx, P, lt, d, t, o) {
  const v = VEH[o.veh], p = S.PAL[o.pal], night = o.pal === 'night', tau = o.tau0 + lt;
  const V = { hy: 560, f: 4000, hc: 3.2, cx: 960 + Math.sin(lt * .5) * 6 + noise2(lt * 1.3, 4) * 4 };
  const Zpad = 4600, sp = V.f / Zpad, padX = V.cx + 150 * sp, padY = V.hy + V.hc * sp - 0;
  const a = alt(v, tau), pitch = clamp((tau - 9) * .02, 0, .25), rx = padX + Math.sin(pitch) * a * sp * .5, ry = padY - a * sp;
  const fire = 1, flameLen = 26 + Math.min(14, tau);
  const skyStops = night
    ? [[0, [2, 4, 12]], [.55, [8, 12, 30]], [1, [36, 30, 44]]]
    : [[0, [40, 60, 110]], [.5, [140, 130, 160]], [.82, [250, 184, 140]], [1, [255, 214, 170]]];
  Wt.scene(ctx, {
    hy: V.hy, t, f: V.f, hc: V.hc, cx: V.cx, waves: LAGOON, blur: .5,
    sky: (c) => {
      G.vgrad(c, skyStops, 0, V.hy + 1);
      if (night) G.stars(c, t, { alpha: .7, milky: true, mask: (x, y) => y < V.hy - 40 });
      else { glow(c, 260, V.hy - 10, 900, [255, 170, 110], .4); SK.streaks(c, { y0: 120, y1: V.hy - 80, n: 12, sun: [260, V.hy], t, seed: 61, lit: [255, 196, 150], dark: [110, 110, 150], alpha: .45 }); }
      // the flame lights the sky and the underside of the cloud deck
      glow(c, rx, ry, 1300, [255, 150, 70], night ? .4 : .12);
      if (night) SK.streaks(c, { y0: 90, y1: 380, n: 10, sun: [rx, ry], t, seed: 62, lit: [255, 150, 80], dark: [16, 16, 30], glow: [255, 200, 140], alpha: .55, reach: 520 });
      // distant shore: casuarina belt, the launch complex beyond
      farShore(c, V, t, p, night, [rx, ry], padX, padY, sp);
      // exhaust column from the pad to the vehicle, ground cloud spreading at the pad
      exhaust(c, V, tau, v, sp, padX, padY, night);
      rocket(c, o.veh, rx, ry, sp, { light: 1, tint: [1.3, 1.05, .9] });
      G.plume(c, rx, ry + .3 * sp, flameLen * sp * 1.6, 2.4 * sp, t, { glow: 1.4 });
      glow(c, rx, ry + flameLen * sp * .3, 90, [255, 230, 190], .55); glow(c, rx, ry + flameLen * sp * .25, 22, [255, 255, 240], .9);
    },
    deep: night ? [6, 8, 14] : [40, 52, 70], foam: [200, 200, 200], caps: 0, fog: 30000,
    sun: { x: rx, y: ry + 10, i: night ? 1.2 : .7, col: [255, 190, 110] },
    shore: { nx: 0, nz: 1, c0: 70, wob: 3, surfW: 6, surfLen: 3, surfSpeed: .8, runup: .3, period: 5, beachW: 6 },
    sand: night ? [34, 30, 30] : [120, 106, 92], wet: night ? [20, 18, 20] : [80, 70, 64],
    land: (X, Z, fx, fz, out) => { const n1 = noise2(X * .3, Z * .3) * .2 + noise2(X * 2, Z * 2) * .1, k = 1 + n1; const b = night ? [26, 22, 22] : [104, 94, 74]; out[0] = b[0] * k; out[1] = b[1] * k; out[2] = b[2] * k; },
  });
  G.flare(ctx, rx, ry + flameLen * sp * .3, .45, [255, 190, 130], .45);
  // crowd, lit from the rocket
  const body = night ? [6, 5, 7] : [26, 26, 36];
  crowd(ctx, V, lt + (o.react0 ?? .8), t, [rx, ry], { night, body, rim: night ? [255, 170, 90] : [255, 214, 170], haze: night ? [30, 26, 34] : [150, 140, 160], rimA: night ? .6 : .45 });
  // warm wash of the flame over everything
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = rgba([255, 150, 70], night ? .06 : .03); ctx.fillRect(0, 0, W, H); ctx.restore();
}
const LAGOON = Wt.spectrum(73, .2, { steep: .05, lmax: 6, lmin: .1, swell: .4 });

// far shore of the lagoon: casuarina belt, lightning masts and towers of the pads, a few lights
function farShore(c, V, t, p, night, fl, px, py, sp) {
  const Zf = 3000, s = V.f / Zf, base = V.hy + V.hc * s;
  const treeC = night ? [8, 10, 12] : mixc([40, 52, 44], [190, 170, 170], .45);
  // launch complex behind the trees
  const steel = night ? [20, 22, 28] : mixc([90, 92, 100], [200, 180, 180], .5);
  for (const [dx, hh, w] of [[-33, 70, 4], [33, 70, 4], [-120, 48, 9], [140, 30, 30], [-260, 40, 22], [300, 62, 5]]) {
    c.fillStyle = rgba(steel); c.fillRect(px + dx * sp - w * sp / 2, py - hh * sp, w * sp, hh * sp);
    if (night) { glow(c, px + dx * sp, py - hh * sp, 6, [255, 60, 40], Math.sin(t * 3 + dx) > 0 ? .9 : .2); for (let k = 0; k < 3; k++) glow(c, px + dx * sp, py - hh * sp * (.3 + k * .2), 9, [255, 240, 210], .5); }
  }
  // tree belt
  const pts = [];
  for (let x = -10; x <= W + 10; x += 2) {
    const wx = (x - V.cx) / s, n1 = noise2(wx / 18, 3), n2 = noise2(wx / 5, 7);
    pts.push([x, base - (16 + 5 * n1 + 2.5 * Math.abs(n2)) * s]);
  }
  c.fillStyle = rgba(treeC); c.beginPath(); c.moveTo(-10, base + 2);
  for (const [x, y] of pts) c.lineTo(x, y);
  c.lineTo(W + 10, base + 2); c.closePath(); c.fill();
  // feathery crowns breaking the top edge
  c.strokeStyle = rgba(treeC); c.lineWidth = 1; c.beginPath();
  for (let i = 0; i < pts.length; i += 2) { const [x, y] = pts[i]; if (hash(i * .37) < .5) continue; const hh = (2 + hash(i) * 4) * s; c.moveTo(x, y + 2); c.lineTo(x + (hash(i + 1) - .5) * 3, y - hh); }
  c.stroke();
  if (night) {
    // the glow of the flame catches the top of the trees near the pad
    c.save(); c.globalCompositeOperation = 'lighter';
    const g = c.createRadialGradient(fl[0], base, 0, fl[0], base, 600); g.addColorStop(0, rgba([255, 140, 60], .35)); g.addColorStop(1, rgba([255, 140, 60], 0));
    c.fillStyle = g; c.fillRect(0, base - 40 * s, W, 40 * s + 2); c.restore();
    for (let i = 0; i < 14; i++) glow(c, hash(i * 3.1) * W, base - hash(i) * 6 * s, 5, [255, 220, 170], .45);
  }
}
function exhaust(c, V, tau, v, sp, padX, padY, night) {
  const life = 30, rate = 22, cl = night ? [150, 112, 98] : [240, 236, 232], sh = night ? [30, 26, 34] : [160, 160, 182];
  const list = [];
  for (let i = Math.max(0, Math.ceil((tau - life) * rate)); i <= Math.floor(tau * rate); i++) {
    const tb = i / rate, age = tau - tb, h1 = hash(i * 1.7), h2 = hash(i * 3.1);
    const y0 = padY - alt(v, tb) * sp;
    const r = (5 + 7 * Math.sqrt(age) * (.7 + .6 * h1)) * sp * (1 + 1.2 * clamp(1 - alt(v, tb) / 40));
    const x = padX + (h2 - .5) * 10 * sp * Math.sqrt(age) + age * 2.2 * sp * (1 - clamp((padY - y0) / 400));
    list.push([x, y0 - age * 1.2 * sp, r, age, y0]);
  }
  // ground cloud spreading sideways from the flame trench
  for (let i = 0; i < 46; i++) {
    const age = Math.min(tau, 14) * (.3 + hash(i) * .7), sd = hash(i + 7) < .5 ? -1 : 1;
    list.push([padX + sd * (15 + 60 * Math.sqrt(age) * hash(i + 2)) * sp, padY - (3 + 5 * hash(i + 4) + age * 1.2) * sp, (8 + 6 * Math.sqrt(age)) * sp, age + 1, padY]);
  }
  list.sort((a, b) => b[3] - a[3]);
  for (const [x, y, r, age, y0] of list) {
    const lit = clamp(1 - (y - (padY - alt(v, tau) * sp)) / (500 * sp + 200));
    puff(c, x, y, r, mixc(cl, sh, clamp(age / life * .8 + .1)), .7 * clamp(1 - age / life), [255, 160, 80], night ? lit * .9 + .1 : lit * .5);
  }
}

module.exports = { gallery, crowd, flag, CROWD };
