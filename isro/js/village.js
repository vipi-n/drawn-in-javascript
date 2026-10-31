// 1981: APPLE carried on a bullock cart along a village road at golden hour (camera dollies with the cart).
const { W, H, clamp, lerp, hash, rng, noise2 } = require('./core');
const G = require('./gfx');
const F = require('./flora');
const SK = require('./sky');
const PE = require('./people');
const CA = require('./cattle');
const { rgba, mixc, glow, vgrad } = G;

const wrap = (x, span) => ((x % span) + span) % span;
// a row of things scattered along a strip, scrolled by `scroll` (px), wrapping across the frame
function strip(seed, n, span) { const r = rng(seed), out = []; for (let i = 0; i < n; i++) out.push({ x: r() * span, a: r(), b: r(), c: r(), seed: Math.floor(r() * 1e4) }); return out.sort((p, q) => p.b - q.b); }
const FAR = strip(19, 70, W + 600), MID = strip(23, 26, W + 900), HUTS = strip(29, 5, W + 1400), NEAR = strip(31, 4, W + 2200);

function hut(ctx, x, y, s, col, roof, lampA) {
  const sh = new PE.Shapes();
  PE.poly(sh, [[x - 3.2 * s, y], [x - 3.2 * s, y - 2.3 * s], [x + 3.2 * s, y - 2.3 * s], [x + 3.2 * s, y]]);
  PE.poly(sh, [[x - 4 * s, y - 2.1 * s], [x - 2.4 * s, y - 4 * s], [x + 2.4 * s, y - 4 * s], [x + 4 * s, y - 2.1 * s]]);
  PE.rimFill(ctx, sh, { body: col, rim: roof, rimA: .7, rimW: 1.5, lx: -1, ly: -.6, soft: true });
  if (lampA > 0) { ctx.fillStyle = rgba([255, 190, 110], lampA); ctx.fillRect(x + .6 * s, y - 1.7 * s, .8 * s, 1.7 * s); glow(ctx, x + 1 * s, y - .9 * s, 5 * s, [255, 160, 70], .3 * lampA); }
}

function cartShot(ctx, P, lt, d) {
  const gy = 868, s = 132, v = 1.05, dist = 2 + lt * v, px = 640 + lt * 6, cam = dist * s;
  const sun = [600 - lt * 4, 690], hzY = 792;
  // sky
  vgrad(ctx, [[0, [58, 62, 104]], [.35, [150, 104, 118]], [.62, [236, 150, 92]], [.85, [255, 190, 112]], [1, [255, 214, 140]]], 0, hzY + 2);
  SK.streaks(ctx, { y0: 90, y1: hzY - 120, n: 15, sun, t: lt, seed: 41, lit: [255, 196, 140], dark: [110, 84, 110], glow: [255, 236, 190], alpha: .55, reach: 800, drift: 6 });
  glow(ctx, sun[0], sun[1], 1200, [255, 150, 70], .38); glow(ctx, sun[0], sun[1], 300, [255, 230, 170], .7);
  ctx.fillStyle = 'rgb(255,248,226)'; ctx.beginPath(); ctx.arc(sun[0], sun[1], 54, 0, Math.PI * 2); ctx.fill();
  glow(ctx, sun[0], sun[1], 110, [255, 255, 235], .85);
  // far tree line: palms and mango canopies in the haze
  const farHaze = [214, 132, 96], midHaze = [170, 96, 74];
  ctx.fillStyle = rgba(mixc([90, 50, 46], farHaze, .55));
  ctx.beginPath(); ctx.moveTo(-10, hzY + 4);
  for (let x = -10; x <= W + 10; x += 6) ctx.lineTo(x, hzY - 14 - 16 * Math.max(0, noise2((x + cam * .05) * .006, 3)) - 8 * noise2((x + cam * .05) * .03, 5));
  ctx.lineTo(W + 10, hzY + 4); ctx.fill();
  for (const t of FAR) { const x = wrap(t.x - cam * .05, W + 600) - 300; F.palm(ctx, x, hzY + 2, 40 + t.a * 46, { seed: t.seed, color: mixc([70, 40, 40], farHaze, .5), lean: (t.c - .5) * .3, t: lt, fronds: 12 }); }
  // paddy fields between, catching the sky
  vgrad(ctx, [[0, mixc([120, 80, 60], farHaze, .5)], [.5, [150, 92, 64]], [1, [96, 56, 40]]], hzY, gy - 6);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 9; i++) { const y = hzY + 6 + i * i * .8 + i * 3, a = .05 + .03 * Math.sin(i * 2.1); const g = ctx.createLinearGradient(sun[0] - 700, 0, sun[0] + 700, 0); g.addColorStop(0, rgba([255, 200, 120], 0)); g.addColorStop(.5, rgba([255, 210, 140], a * 2.2)); g.addColorStop(1, rgba([255, 200, 120], 0)); ctx.fillStyle = g; ctx.fillRect(0, y, W, 1.5 + i * .3); }
  ctx.restore();
  // village houses and the palm grove at mid distance
  for (const hh of HUTS) { const x = wrap(hh.x - cam * .2, W + 1400) - 600; hut(ctx, x, hzY + 26 + hh.a * 10, 9 + hh.a * 4, mixc([40, 22, 22], midHaze, .35), [255, 180, 120], hh.c > .4 ? .85 : 0); }
  for (const t of MID) { const x = wrap(t.x - cam * .22, W + 900) - 400, y = hzY + 30 + t.b * 18; F.palm(ctx, x, y, 170 + t.a * 170, { seed: t.seed, color: mixc([30, 16, 18], midHaze, .3 - t.b * .12), lean: (t.c - .5) * .45, t: lt, sway: Math.sin(lt * .8 + t.seed) }); }
  SK.haze(ctx, hzY - 60, gy + 20, [255, 170, 110], .22);
  // dusty village track: ruts and stones passing at walking pace, the low sun skimming the dust
  vgrad(ctx, [[0, [120, 70, 44]], [.18, [74, 42, 28]], [.55, [36, 20, 14]], [1, [16, 9, 7]]], gy - 18, H + 20);
  { const g = ctx.createRadialGradient(sun[0], gy - 10, 0, sun[0], gy - 10, 900); g.addColorStop(0, rgba([255, 200, 130], .45)); g.addColorStop(1, rgba([255, 200, 130], 0)); ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.fillRect(0, gy - 20, W, 200); ctx.restore(); }
  for (const [ry, w] of [[gy + 16, 6], [gy + 50, 8], [gy + 110, 10]]) {
    ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.beginPath(); ctx.moveTo(0, ry);
    for (let x = 0; x <= W; x += 20) ctx.lineTo(x, ry + noise2((x + cam) * .004, ry) * 3); for (let x = W; x >= 0; x -= 20) ctx.lineTo(x, ry + w + noise2((x + cam) * .004, ry) * 3); ctx.fill();
    ctx.fillStyle = 'rgba(255,190,130,.1)'; ctx.fillRect(0, ry - 2, W, 1.5);
  }
  { const r = rng(3), span = W + 300;
    for (let i = 0; i < 260; i++) {
      const yy = gy - 6 + Math.pow(r(), 1.6) * (H - gy + 20), k = (yy - gy + 30) / (H - gy + 30), x = wrap(r() * span - cam * (.9 + k * .6), span) - 150, w = 1.5 + r() * 7 * k;
      ctx.fillStyle = rgba([12, 7, 5], .7); ctx.beginPath(); ctx.ellipse(x, yy, w, w * .45, 0, 0, Math.PI * 2); ctx.fill();
      if (x < sun[0] + 800) { ctx.fillStyle = rgba([255, 196, 140], .35 * Math.exp(-Math.abs(x - sun[0]) / 600)); ctx.fillRect(x - w * .6, yy - w * .45, w * .8, 1.2); }
    }
  }
  // the convoy, with roadside palms behind it sliding past
  for (const t of NEAR) { const x = wrap(t.x - cam * .62, W + 2200) - 900; F.palm(ctx, x, gy - 14 + t.a * 6, 560 + t.a * 160, { seed: t.seed + 5, color: [22, 12, 12], lean: (t.c - .5) * .5, t: lt, sway: Math.sin(lt * .6 + t.seed), metres: 15 }); }
  CA.cart(ctx, px, gy + 4, s, dist, { rim: [255, 206, 140], body: [18, 11, 9], sun: [-1, -.2] });
  // hoof and wheel dust left hanging in the air, glowing where the sun is behind it
  for (let i = 0; i < 40; i++) {
    const tb = Math.floor(lt * 7) / 7 - i / 7, age = lt - tb; if (tb < -3 || age > 5) continue;
    const kk = Math.floor(tb * 7), wx = px + (hash(kk) * 4.6 - .6) * s - age * v * s * .9;
    const near = Math.exp(-Math.abs(wx - sun[0]) / 500);
    G.puff(ctx, wx, gy - age * 18 - hash(kk + 2) * 14, 14 + age * 30, mixc([214, 150, 100], [255, 220, 170], near), (.1 + .1 * near) * (1 - age / 5), [255, 220, 160], .8);
  }
  SK.rays(ctx, sun[0], sun[1], { n: 70, len: 1500, color: [255, 210, 150], alpha: .045, t: lt, seed: 3, a0: -Math.PI * 1.05, a1: Math.PI * .05 });
  SK.motes(ctx, lt, { n: 140, y0: 500, y1: gy + 40, sun, reach: 420, alpha: .7, seed: 8 });
  // foreground verge, out of focus
  ctx.save(); ctx.filter = 'blur(4px)';
  F.grass(ctx, -40, W + 40, H + 6, 30, 150, { seed: 9 + Math.floor(cam * 1.5 / 3000), n: 260, t: lt, colors: [[8, 4, 3], [14, 8, 5]], width: 3 });
  ctx.restore();
  { const r = rng(9), span = W + 300, fs = cam * 1.5; ctx.strokeStyle = 'rgb(8,4,3)'; ctx.lineWidth = 2.5; ctx.beginPath();
    for (let i = 0; i < 160; i++) { const x = wrap(r() * span - fs, span) - 150, h = 20 + r() * 90, sw = Math.sin(lt * 1.5 + i) * 8; ctx.moveTo(x, H); ctx.quadraticCurveTo(x + 4, H - h * .6, x + sw + 8 * (r() - .5), H - h); }
    ctx.stroke(); }
}

module.exports = { cartShot, hut };
