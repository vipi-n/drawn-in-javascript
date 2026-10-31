// Thumba, 1963: the fishing-village beach at dusk, the first launch from the sand, its trail over the sea.
// Ground-level camera: (hy horizon row, f focal px, hc eye height m, cx principal column); world X right, Z forward.
const { W, H, BAR, clamp, lerp, ss, hash, rng, noise2 } = require('./core');
const G = require('./gfx');
const Wt = require('./water');
const F = require('./flora');
const SK = require('./sky');
const PE = require('./people');
const E = require('./earthside');
const { rgba, mixc, glow } = G;

const DUSK = [[0, [6, 10, 30]], [.4, [34, 28, 66]], [.72, [140, 62, 80]], [.9, [232, 118, 72]], [1, [255, 164, 92]]];
function duskSky(c, hy, t, sun, o = {}) {
  G.vgrad(c, o.stops ?? DUSK, 0, hy + 1);
  G.stars(c, t, { alpha: .45, milky: false, sx: o.sx ?? 0, mask: (x, y) => y < hy - 260 });
  SK.streaks(c, { y0: 110, y1: hy - 50, n: 13, sun, t, seed: o.seed ?? 4, lit: [255, 140, 120], dark: [50, 36, 72], glow: [255, 214, 160], alpha: .5, drift: 3, reach: 700 });
  glow(c, sun[0], sun[1], 1000, [255, 110, 60], .33); glow(c, sun[0], sun[1], 260, [255, 196, 120], .6);
  if (o.disc !== false) { c.fillStyle = 'rgb(255,234,186)'; c.beginPath(); c.arc(sun[0], sun[1], 23, 0, Math.PI * 2); c.fill(); glow(c, sun[0], sun[1], 70, [255, 250, 220], .8); }
}
const proj = (V) => ({
  x: (X, Z) => V.cx + X / Z * V.f, y: (Z, Y = 0) => V.hy + (V.hc - Y) * V.f / Z, s: (Z) => V.f / Z,
});

// kattumaram: logs lashed into a raft with an upswept bow, lying on the sand
function catamaran(ctx, V, X, Z, ang, col, rim) {
  const p = proj(V), ca = Math.cos(ang), sa = Math.sin(ang), Lh = 1.9, Wh = .38;
  const pt = (u, v, y) => { const x = X + ca * u - sa * v, z = Z + sa * u + ca * v; return [p.x(x, z), p.y(z, y)]; };
  const sh = new PE.Shapes();
  // hull as a lofted outline: bottom, top, bow sweep
  const top = [], bot = [];
  for (let i = 0; i <= 12; i++) { const u = lerp(-Lh, Lh, i / 12), lift = Math.max(0, (u - Lh * .55) / (Lh * .45)) ** 2 * .55; top.push(pt(u, -Wh, .32 + lift)); bot.push(pt(u, Wh, lift * .9)); }
  PE.poly(sh, [...top, ...bot.reverse()]);
  PE.rimFill(ctx, sh, { body: col, rim, rimA: .9, rimW: 2.5, lx: -1, ly: -.6, soft: true });
  // log seams catching the sky
  ctx.strokeStyle = rgba(mixc(col, rim, .45), .55); ctx.lineWidth = 1; ctx.beginPath();
  for (const v of [-.25, 0, .25]) for (let i = 0; i <= 10; i++) { const [x, y] = pt(lerp(-Lh, Lh * .5, i / 10), v, .33); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
  ctx.stroke();
}
function fishermen(ctx, V, list, col, rim, t) {
  const p = proj(V);
  for (const [X, Z, o] of list) {
    const sh = new PE.Shapes(), fr = new PE.Shapes();
    PE.side(sh, fr, p.x(X, Z), p.y(Z), p.s(Z), o.walk ? t * 1.1 : 0, { still: !o.walk, dress: 'dhoti', head: o.head ?? 'hair', armRest: o.arm ?? .15, ...o });
    PE.rimFill(ctx, fr, { body: mixc(col, [0, 0, 0], .2), rim, rimA: .5, rimW: 1.5, lx: -1, ly: -.3 });
    PE.rimFill(ctx, sh, { body: col, rim, rimA: .8, rimW: 1.6, lx: -1, ly: -.3, soft: true });
  }
}
function birds(ctx, lt, x0, y0, n, col, sc = 1) {
  ctx.strokeStyle = rgba(col); ctx.lineWidth = 1.8 * sc; ctx.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const x = x0 + lt * 38 + i * 34 * sc + hash(i) * 40 * sc, y = y0 + Math.sin(i * 1.7) * 24 * sc + i * 5 * sc + Math.sin(lt * .8 + i) * 4, f = Math.sin(lt * 8 + i * 2) * 6 * sc, w = 10 * sc * (.7 + hash(i + 3) * .5);
    ctx.beginPath(); ctx.moveTo(x - w, y - f); ctx.quadraticCurveTo(x - w * .4, y - 3 * sc, x, y); ctx.quadraticCurveTo(x + w * .4, y - 3 * sc, x + w, y - f); ctx.stroke();
  }
}

// continuous canopy of a palm grove standing `inl` metres inland of the shoreline X = X0 + kZ, receding to its vanishing point
function groveBand(ctx, V, X0, k, inl, Ht, near, far, seed) {
  const vpx = V.cx + k * V.f, x0 = Math.max(-10, Math.ceil(vpx) + 1);
  if (x0 > W) return;
  const top = [];
  for (let x = x0; x <= W + 12; x += 3) {
    const a = (x - V.cx) / V.f - k; if (a <= 1e-4) continue;
    const Z = (X0 + k * 0 + inl) / a; if (Z <= 1) continue;
    const s = V.f / Z, n1 = noise2(Z / 14, seed), n2 = noise2(Z / 5, seed + 4);
    const hh = Ht * (.82 + .18 * n1) + Math.abs(Math.sin(Z / 3.2 + n2 * 2)) * 1.6;
    top.push([x, V.hy + V.hc * s - hh * s, V.hy + V.hc * s + 1]);
  }
  if (!top.length) return;
  const g = ctx.createLinearGradient(vpx, 0, W, 0); g.addColorStop(0, rgba(far)); g.addColorStop(.35, rgba(mixc(far, near, .6))); g.addColorStop(1, rgba(near));
  ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(vpx, V.hy + 1);
  for (const [x, y] of top) ctx.lineTo(x, Math.min(V.hy, y));
  for (let i = top.length - 1; i >= 0; i--) ctx.lineTo(top[i][0], top[i][2]);
  ctx.closePath(); ctx.fill();
}

// ---------------------------------------------------------------- Thumba beach at dusk, looking along the coast
const TH_WAVES = Wt.spectrum(21, 1.15, { swell: .8 });
const TH_GROVE = (() => {
  const r = rng(63), out = [];
  for (let i = 0; i < 90; i++) out.push({ Z: 24 + Math.pow(r(), 1.7) * 1000, inl: 12 + r() * 60, Hm: 12 + r() * 10, lean: (r() - .5) * .4, seed: i * 7 + 1 });
  return out.sort((a, b) => b.Z - a.Z);
})();
function thumba(ctx, P, lt, d) {
  const hy = 600, V = { hy, f: 1500, hc: 1.7, cx: 960 + 60 - lt * 11 };
  const k = .26, X0 = -2.5, n = Math.hypot(1, k), Xs = (Z) => X0 + k * Z, p = proj(V);
  const sun = [V.cx - 560, hy - 8], sil = [10, 7, 14], rim = [255, 150, 100];
  Wt.scene(ctx, {
    hy, t: lt, f: V.f, hc: V.hc, cx: V.cx, waves: TH_WAVES,
    sky: (c) => duskSky(c, hy, lt, sun, { sx: V.cx - 960 }),
    deep: [14, 12, 30], foam: [222, 172, 176], sand: [100, 74, 70], wet: [50, 36, 48],
    sun: { x: sun[0], y: sun[1], i: .9, col: [255, 170, 100] }, fog: 6000, caps: .15,
    shore: { nx: -1 / n, nz: k / n, c0: -X0 / n, wob: 2.5, surfW: 38, surfLen: 16, surfSpeed: 3.4, runup: 3.2, period: 7.5, beachW: 26 },
    land: (X, Z, fx, fz, out) => { const v = 1 + noise2(X * .2, Z * .2) * .25; out[0] = 26 * v; out[1] = 20 * v; out[2] = 26 * v; },
  });
  // grove receding along the coast, church and huts among it
  const hz = [150, 76, 92];
  const palmAt = (g) => {
    const X = Xs(g.Z) + g.inl, x = p.x(X, g.Z), h = g.Hm * p.s(g.Z);
    if (x < -h * .6 || x > W + h * .6) return;
    if (Math.abs(g.Z - 175) < 8 && Math.abs(g.inl - 30) < 10) return;
    F.palm(ctx, x, p.y(g.Z) + 1, h, { seed: g.seed, lean: g.lean, color: sil, haze: hz, hazeK: clamp(Math.pow(g.Z / 1100, .7)) * .75, t: lt, sway: Math.sin(lt * .7 + g.seed) });
    if (g.seed % 9 === 1 && g.Z > 50 && g.Z < 400) {
      // fisherman's hut with a lamp in the doorway
      const s = p.s(g.Z), hx = x + 4 * s, hy2 = p.y(g.Z);
      ctx.fillStyle = rgba(mixc(sil, hz, clamp(g.Z / 1100) * .7)); ctx.beginPath(); ctx.moveTo(hx - 3 * s, hy2); ctx.lineTo(hx - 3 * s, hy2 - 2.2 * s); ctx.lineTo(hx, hy2 - 3.6 * s); ctx.lineTo(hx + 3.2 * s, hy2 - 2.2 * s); ctx.lineTo(hx + 3.2 * s, hy2); ctx.fill();
      ctx.fillStyle = rgba([255, 180, 90], .9); ctx.fillRect(hx - .4 * s, hy2 - 1.6 * s, .8 * s, 1.6 * s); glow(ctx, hx, hy2 - .8 * s, 6 * s, [255, 160, 70], .35);
    }
  };
  for (const g of TH_GROVE) if (g.inl > 50) palmAt(g);
  groveBand(ctx, V, X0, k, 50, 9, mixc(sil, hz, .15), mixc(sil, hz, .8), 5);
  for (const g of TH_GROVE) if (g.inl <= 50) palmAt(g);
  { const Z = 175, s = p.s(Z); E.church(ctx, p.x(Xs(Z) + 30, Z), p.y(Z), s, { color: mixc(sil, hz, .2), glow: .9 + .1 * Math.sin(lt * 7) }); }
  // catamarans drawn up on the sand, fishermen mending nets
  const ang = Math.atan2(-k, 1) + Math.PI;
  catamaran(ctx, V, Xs(21) + 9, 21, ang + .08, [34, 22, 30], rim);
  catamaran(ctx, V, Xs(15) + 7.5, 15, ang - .05, [28, 18, 26], rim);
  catamaran(ctx, V, Xs(29) + 11, 29, ang + .2, [38, 26, 34], rim);
  fishermen(ctx, V, [[Xs(16) + 6.5, 16, { scale: .98, arm: .3 }], [Xs(22) + 9.5, 22, { head: 'turban', scale: 1.02 }], [Xs(30) + 3, 30, { walk: true, phase: .3 }]], [14, 9, 12], rim, lt);
  birds(ctx, lt, 180, 250, 7, [16, 10, 22]);
  birds(ctx, lt * .8, 760, 330, 4, [30, 20, 34], .7);
  // framing palms: one leaning over the beach on the right, fronds of another overhead at left
  F.palm(ctx, 1990 - lt * 20, 1250, 1180, { seed: 31, lean: -.27, bend: .7, color: [5, 3, 7], t: lt, sway: Math.sin(lt * .6), metres: 16 });
  ctx.save(); ctx.filter = 'blur(3px)';
  F.palm(ctx, -560 - lt * 26, 1640, 1700, { seed: 32, lean: .44, color: [3, 2, 5], t: lt, sway: Math.sin(lt * .5 + 2), metres: 17 });
  ctx.restore();
}

// ---------------------------------------------------------------- 21 Nov 1963: Nike-Apache on the rail, Thumba beach
const NIKE_IGN = BAR * 1.5;
const NK_GROVE = (() => {
  const r = rng(91), out = [];
  for (let i = 0; i < 80; i++) out.push({ Z: 40 + Math.pow(r(), 1.5) * 900, inl: 6 + r() * 70, Hm: 12 + r() * 10, lean: (r() - .5) * .4, seed: i * 5 + 3 });
  return out.sort((a, b) => b.Z - a.Z);
})();
const NK_WAVES = Wt.spectrum(33, 1.35, { swell: .8 });
function launcher(ctx, x, gy, s, fire, rim) {
  const sh = new PE.Shapes(), body = mixc([16, 12, 16], [255, 150, 70], clamp(fire) * .1);
  // A-frame and rail
  PE.poly(sh, [[x - 2.4 * s, gy], [x - .5 * s, gy - 3.3 * s], [x + .2 * s, gy - 3.3 * s], [x - 1.7 * s, gy]]);
  PE.poly(sh, [[x + 2.4 * s, gy], [x + .55 * s, gy - 3.3 * s], [x - .1 * s, gy - 3.3 * s], [x + 1.75 * s, gy]]);
  PE.capsule(sh, [x - 2.1 * s, gy - 1.2 * s], [x + 2.1 * s, gy - 1.2 * s], .06 * s, .06 * s);
  PE.poly(sh, [[x + .2 * s, gy - .2 * s], [x + .38 * s, gy - .2 * s], [x + .38 * s, gy - 9.2 * s], [x + .2 * s, gy - 9.2 * s]]);
  PE.poly(sh, [[x - 3.6 * s, gy + .1 * s], [x + 3.6 * s, gy + .1 * s], [x + 3.4 * s, gy - .45 * s], [x - 3.4 * s, gy - .45 * s]]);
  // cable drum and junction box beside it
  PE.oval(sh, [x + 5 * s, gy - .55 * s], .55 * s, .55 * s);
  PE.poly(sh, [[x - 6.2 * s, gy], [x - 4.6 * s, gy], [x - 4.6 * s, gy - 1.2 * s], [x - 6.2 * s, gy - 1.2 * s]]);
  PE.rimFill(ctx, sh, { body, rim, rimA: .85, rimW: 2, lx: -1, ly: -.5, soft: true });
  ctx.strokeStyle = rgba(body); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x - 4.6 * s, gy - .9 * s); ctx.quadraticCurveTo(x - 2 * s, gy + .1 * s, x - .1 * s, gy - 1.6 * s); ctx.moveTo(x + 4.5 * s, gy - .6 * s); ctx.quadraticCurveTo(x + 2.5 * s, gy, x + .4 * s, gy - 1.4 * s); ctx.stroke();
}
// the watchers: scientists and villagers on the sand, seen from behind and in profile; arms go up at liftoff
function watchers(ctx, V, tl, list, col, rim, flame) {
  const p = proj(V);
  for (const w of list) {
    const x = p.x(w.X, w.Z), y = p.y(w.Z), s = p.s(w.Z), u = tl > w.react ? ss(w.react, w.react + .5, tl) : 0;
    const sh = new PE.Shapes(), fr = new PE.Shapes();
    if (w.side) {
      ctx.save();
      if (w.flip) { ctx.translate(2 * x, 0); ctx.scale(-1, 1); }
      PE.side(sh, fr, x, y, s, 0, { still: true, dress: w.dress, head: w.head, armRest: lerp(.12, 2.5, u * (w.arm ?? 1)), scale: w.scale ?? 1 });
      PE.rimFill(ctx, fr, { body: mixc(col, [0, 0, 0], .2), rim, rimA: .4, rimW: 1.4, lx: w.flip ? 1 : -1, ly: -.4 });
      PE.rimFill(ctx, sh, { body: col, rim, rimA: .8, rimW: 1.6, lx: w.flip ? 1 : -1, ly: -.4, soft: true });
      ctx.restore();
    } else {
      const wave = tl * 9 + w.X;
      PE.back(sh, x, y, s, { arms: [{ up: u * (w.l ?? 1), wave }, { up: u * (w.r ?? .8), wave: wave + 1 }], jump: u > .5 && w.jump ? Math.max(0, Math.sin(tl * 8 + w.X)) * .08 : 0, spread: .07 }, { dress: w.dress, head: w.head, female: w.dress === 'saree', scale: w.scale ?? 1 });
      const dx = flame ? flame[0] - x : 0, dy = flame ? flame[1] - y : -1;
      PE.rimFill(ctx, sh, { body: col, rim: flame && tl > 0 ? [255, 190, 110] : rim, rimA: .9, rimW: 1.8, lx: dx, ly: dy, soft: true });
    }
  }
}
const NK_PEOPLE = [
  { X: -5.2, Z: 15, dress: 'shirt', l: 1, r: .9, react: .25, jump: true },
  { X: -4.4, Z: 15.6, dress: 'shirt', head: 'cap', l: .6, r: 1, react: .4 },
  { X: -6.3, Z: 16.4, dress: 'saree', head: 'bun', l: 0, r: .7, react: .6, scale: .93 },
  { X: 4.6, Z: 14.5, dress: 'dhoti', l: 1, r: 1, react: .3, jump: true },
  { X: 5.5, Z: 15.2, dress: 'shirt', l: .2, r: 1, react: .45 },
  { X: -9, Z: 21, side: true, dress: 'shirt', arm: 1, react: .35 },
  { X: 8.6, Z: 20, side: true, flip: true, dress: 'dhoti', head: 'turban', arm: .9, react: .5 },
  { X: 9.6, Z: 20.6, side: true, flip: true, dress: 'shirt', arm: 0, react: 9 },
];
function nikePad(ctx, P, lt, d, t, o = {}) {
  const tl = lt - NIKE_IGN, h = tl > 0 ? .5 * 55 * tl * tl : 0, hy = 640;
  const V = { hy, f: 1400, hc: 4, cx: 960 }, p = proj(V), Z0 = 27, s = p.s(Z0), gy = p.y(Z0), lx = 960;
  const fl = tl > 0 ? clamp(1.4 - tl * .4) : 0, k = .136, X0 = -12.6, n = Math.hypot(1, k), Xs = (Z) => X0 + k * Z;
  const sun = [300, hy + 14], rim = [255, 156, 110];
  ctx.save(); S1shake(ctx, tl > 0 ? 9 * Math.exp(-tl * .8) : 0, lt);
  const ry = gy - 30 - h * s;
  Wt.scene(ctx, {
    hy, t: lt, f: V.f, hc: V.hc, cx: V.cx, waves: NK_WAVES,
    sky: (c) => { duskSky(c, hy, lt, sun, { disc: false, seed: 7 }); if (tl > 0) glow(c, lx, ry, 700, [255, 140, 60], .35 * fl); },
    deep: [16, 13, 30], foam: [214, 166, 172], sand: [96, 70, 68], wet: [48, 35, 46],
    sun: null, fog: 6000, caps: .12,
    shore: { nx: -1 / n, nz: k / n, c0: -X0 / n, wob: 2, surfW: 36, surfLen: 15, surfSpeed: 3.3, runup: 3, period: 7.2, beachW: 30 },
    land: (X, Z, fx, fz, out) => { const v = 1 + noise2(X * .2, Z * .2) * .25; out[0] = 24 * v; out[1] = 18 * v; out[2] = 24 * v; },
  });
  const hz = [150, 76, 92], sil = [10, 7, 14];
  const nkPalm = (g) => {
    const X = Xs(g.Z) + 34 + g.inl, x = p.x(X, g.Z), hh = g.Hm * p.s(g.Z);
    if (x < -hh * .6 || x > W + hh * .6) return;
    F.palm(ctx, x, p.y(g.Z) + 1, hh, { seed: g.seed, lean: g.lean, color: sil, haze: hz, hazeK: clamp(Math.pow(g.Z / 1000, .7)) * .75, t: lt, sway: Math.sin(lt * .7 + g.seed) });
  };
  for (const g of NK_GROVE) if (g.inl > 56) nkPalm(g);
  groveBand(ctx, V, X0, k, 90, 9, mixc(sil, hz, .15), mixc(sil, hz, .8), 9);
  for (const g of NK_GROVE) if (g.inl <= 56) nkPalm(g);
  // blockhouse with a lit window
  { const Z = 48, X = 14, x = p.x(X, Z), y = p.y(Z), s2 = p.s(Z), sh = new PE.Shapes(); PE.poly(sh, [[x, y], [x + 7 * s2, y], [x + 7 * s2, y - 2.8 * s2], [x, y - 2.8 * s2]]); PE.rimFill(ctx, sh, { body: [18, 12, 18], rim, rimA: .6, rimW: 1.5, lx: -1, ly: -.3 }); ctx.fillStyle = 'rgba(255,200,120,.9)'; ctx.fillRect(x + 1.2 * s2, y - 1.9 * s2, 1.4 * s2, .7 * s2); glow(ctx, x + 1.9 * s2, y - 1.5 * s2, 4 * s2, [255, 170, 80], .35); }
  // exhaust
  const ny = (tb) => gy - 30 - (tb > NIKE_IGN ? .5 * 55 * (tb - NIKE_IGN) ** 2 : 0) * s;
  if (tl > 0) G.smokeColumn(ctx, lt, (tb) => tb >= NIKE_IGN ? { x: lx + 2, y: ny(tb), on: true } : null, { start: NIKE_IGN, rate: 45, life: 6, groundY: gy, r0: 20, grow: 90, down: 260, ground: 360, lift: 30, alpha: .45, color: [200, 186, 180], fire: [255, 150, 70], flame: () => ({ x: lx, y: ny(lt), k: fl, r: 500 }) });
  launcher(ctx, lx, gy, s, fl, rim);
  if (tl > 0) { glow(ctx, lx, ry + 40, 900, [255, 140, 60], .45 * fl); G.plume(ctx, lx, ry, 150 + tl * 120, 16, lt, { glow: 2 }); }
  require('./rockets').rocket(ctx, 'nike', lx + .29 * s, ry, s, { light: -1, tint: tl > 0 ? [1.3, .95, .75] : [.62, .5, .6] });
  if (tl > 0) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = rgba([255, 150, 60], .2 * fl); ctx.fillRect(0, 0, W, H); ctx.restore(); }
  watchers(ctx, V, tl, NK_PEOPLE, [12, 8, 12], rim, tl > 0 ? [lx, ry] : null);
  ctx.restore();
}
function S1shake(ctx, amt, t) { if (amt > 0) ctx.translate((noise2(t * 23, 1.3) * 2) * amt, (noise2(t * 19, 7.1) * 2) * amt); }

// ---------------------------------------------------------------- the climb into twilight, seen from the beach
const TR_WAVES = Wt.spectrum(44, .1, { swell: .7 });
function nikeTrailWide(ctx, P, lt, cut) {
  const hy = 760, V = { hy, f: 1400, hc: 3, cx: 960 };
  const pt = (u) => [620 + u * 520 + u * u * 260, hy - 10 - u * 650 - u * u * 120];
  const k = .3 + lt / cut * .3, [hx, hy2] = pt(k);
  Wt.scene(ctx, {
    hy, t: lt, f: V.f, hc: V.hc, cx: V.cx, waves: TR_WAVES,
    sky: (c) => {
      G.vgrad(c, [[0, [4, 8, 30]], [.55, [40, 34, 86]], [.85, [150, 72, 92]], [1, [236, 120, 74]]], 0, hy + 1);
      G.stars(c, lt, { alpha: .55, milky: false, mask: (x, y) => y < 560 });
      SK.streaks(c, { y0: 200, y1: hy - 60, n: 9, sun: [1400, hy + 30], t: lt, seed: 12, lit: [255, 150, 120], dark: [46, 34, 70], alpha: .45 });
      glow(c, 1400, hy, 800, [255, 110, 60], .3);
      // smoke trail lit pink by the set sun on top, shadowed violet below; freshest part glows from the motor
      for (let i = 0; i <= 90; i++) {
        const u = k * i / 90, age = (k - u) * 6, [x, y] = pt(u), wob = noise2(u * 9, 3) * 14 * age + age * 18;
        G.puff(c, x + wob, y, 5 + age * 9, mixc([120, 80, 120], [60, 46, 86], clamp(age * .3)), .55 * Math.exp(-age * .25), [255, 178, 150], .75);
      }
      c.save(); c.globalCompositeOperation = 'lighter'; c.lineCap = 'round'; c.strokeStyle = rgba([255, 200, 150], .5); c.lineWidth = 3; c.beginPath();
      for (let i = 0; i <= 12; i++) { const [x, y] = pt(k - .04 + .04 * i / 12); i ? c.lineTo(x, y) : c.moveTo(x, y); }
      c.stroke(); c.restore();
      glow(c, hx, hy2, 40, [255, 220, 170], .9);
    },
    deep: [12, 12, 30], foam: [200, 160, 176], sand: [80, 60, 64], wet: [40, 30, 44],
    sun: null, fog: 8000, caps: .1,
    shore: { nx: 0, nz: 1, c0: 24, wob: 2, surfW: 34, surfLen: 15, surfSpeed: 3.3, runup: 2.6, period: 7, beachW: 60 },
  });
  G.flare(ctx, hx, hy2, .3, [255, 190, 140], .55);
  F.palm(ctx, 110, H + 50, 820, { lean: .27, seed: 41, color: [3, 2, 6], sway: Math.sin(lt), t: lt, metres: 15 });
  F.palm(ctx, 1800, H + 50, 700, { lean: -.22, seed: 42, color: [3, 2, 6], sway: Math.sin(lt + 1), t: lt, metres: 15 });
  watchers(ctx, V, 9 + lt, [{ X: -2.2, Z: 14.5, dress: 'shirt', l: 1, r: .4, react: 0 }, { X: -1.3, Z: 15, dress: 'saree', head: 'bun', l: 0, r: 0, react: 0, scale: .93 }, { X: 2.6, Z: 16, dress: 'dhoti', l: .9, r: .9, react: 0 }], [6, 4, 8], [255, 150, 110], [hx, hy2]);
}

module.exports = { thumba, nikePad, nikeTrailWide, watchers, launcher, duskSky, proj, catamaran, fishermen, birds, DUSK, NIKE_IGN };
