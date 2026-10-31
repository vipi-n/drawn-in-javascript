// Act 1: intro (CRT power-on + pixel title), 1958 Tennis for Two, 1962 Spacewar!, 1972 Pong / Odyssey, 1977 Atari 2600.
const { W, H, TAU, clamp, lerp, ss, io3, out3, out5, back, rgba, mix, mixs, hash, rng, noise, win, cues } = require('./core');
const G = require('./gfx');
const R = require('./retro');
const T = require('./type');
const { B, BEAT, BAR, EV } = cues;

// ---------------------------------------------------------------- intro
function intro(ctx, t) {
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  const p0 = EV.power;
  if (t < p0) return;
  const u = t - p0;
  // power-on: a bright line, then the raster opens vertically
  const open = out3(ss(.18, .5, u)), line = ss(0, .12, u);
  if (open < 1) {
    const lw = W * out3(line), lh = 3 + open * H;
    G.glow(ctx, W / 2, H / 2, 420 * line, '#bfe6ff', .55 * (1 - open));
    ctx.fillStyle = `rgba(235,245,255,${.95 * (1 - open * .7)})`; ctx.fillRect(W / 2 - lw / 2, H / 2 - lh / 2, lw, lh);
    if (open <= 0) return;
  }
  const fadeStatic = 1 - ss(.45, 1.1, u);
  R.screen(ctx, 0, (1 - open) * H / 2, W, H * open, (c, x, y, w, h) => {
    // deep blue night with pixel stars drifting down (three parallax layers)
    G.vgrad(c, 0, H, [[0, '#050318'], [.6, '#0b0a34'], [1, '#1e0d3e']]);
    const P = rng(7);
    for (let i = 0; i < 160; i++) {
      const layer = i % 3, sp = [6, 14, 28][layer], sz = [3, 4, 6][layer];
      const sx = Math.floor(P() * W / sz) * sz, sy = ((P() * H + t * sp) % H), tw = .5 + .5 * Math.sin(t * (1 + P() * 3) + i);
      c.fillStyle = `rgba(${200 + layer * 20},${210 + layer * 15},255,${(.3 + .5 * tw) * (.5 + layer * .25)})`;
      c.fillRect(sx, Math.floor(sy / sz) * sz, sz, sz);
    }
    // pixel horizon grid (synthwave floor) under the title
    const hz = 700;
    G.vgrad(c, hz, H, [[0, '#2a0f4a'], [1, '#07020f']]);
    c.strokeStyle = 'rgba(255,80,200,.5)'; c.lineWidth = 2;
    for (let k = 0; k < 14; k++) { const z = ((k + (t * .9) % 1) / 14), yy = hz + Math.pow(z, 2.2) * (H - hz); c.globalAlpha = z; c.beginPath(); c.moveTo(0, yy); c.lineTo(W, yy); c.stroke(); }
    c.globalAlpha = 1;
    for (let k = -12; k <= 12; k++) { c.beginPath(); c.moveTo(W / 2 + k * 24, hz); c.lineTo(W / 2 + k * 190, H); c.stroke(); }
    G.glow(c, W / 2, hz, 640, '#ff4fd0', .28);
    c.fillStyle = 'rgba(255,120,220,.9)'; c.fillRect(0, hz - 1, W, 3);
    // the title: letters fall in one by one and bounce, landing on EV.title
    const word = 'VIDEO GAMES', p = 14, tx = W / 2, ty = 330;
    const drop = (i) => { const a = EV.title - .75 + i * .045, k = clamp((t - a) / .55); return k <= 0 ? -900 : -(1 - out5(k)) * 520 + Math.sin(clamp(k * 1.4) * Math.PI) * -18 * (1 - k); };
    const vis = (i) => t > EV.title - .75 + i * .045;
    const n = [...word].filter((_, i) => vis(i)).length;
    if (n) {
      const pressed = t > EV.press ? (Math.floor((t - EV.press) * 12) % 2 === 0 && t < EV.press + .6 ? .35 : 1) : 1;
      T.pixText(c, word, tx + p * .6, ty + p * .6, p, { align: 'center', color: '#3a0a5c', reveal: n / word.length, drop });
      T.pixText(c, word, tx, ty, p, { align: 'center', grad: ['#fff6cf', '#ffcd4a', '#ff8a2a', '#ff3d6e'], reveal: n / word.length, drop, alpha: pressed, inset: .6 });
    }
    // subtitle + tagline
    const sa = ss(EV.title + .4, EV.title + 1, t);
    T.pixText(c, 'A HISTORY \u00b7 1958 \u2014 TODAY', tx, ty + 130, 5, { align: 'center', color: '#9fe8ff', alpha: sa, shadow: 'rgba(80,200,255,.8)', shadowBlur: 12 });
    G.text(c, 'from a single green dot to three billion players', tx, ty + 210, { font: 'IoI', size: 30, color: '#ffe9c9', align: 'center', alpha: ss(EV.title + .9, EV.title + 1.6, t), shadow: 14 });
    // PRESS START blinks, then flashes when pressed
    if (t > B(2) - .2) {
      const pressedK = t > EV.press ? Math.floor((t - EV.press) * 14) % 2 : Math.floor(t * 2.2) % 2;
      const fade = 1 - ss(EV.press + .7, EV.press + 1.1, t);
      if (pressedK === 0) T.pixText(c, 'PRESS START', tx, 560, 6, { align: 'center', color: '#ffffff', alpha: ss(B(2) - .2, B(2), t) * fade, shadow: 'rgba(255,255,255,.6)', shadowBlur: 10 });
    }
    // static at switch-on
    if (fadeStatic > 0) {
      const f = Math.floor(t * 60), Q = rng(f + 3);
      for (let i = 0; i < 1400; i++) { const v = Q() * 255 | 0; c.fillStyle = `rgba(${v},${v},${v},${.7 * fadeStatic})`; c.fillRect((Q() * W / 4 | 0) * 4, (Q() * H / 4 | 0) * 4, 4, 4); }
    }
  }, { r: 0, glow: .4, scan: .3, pitch: 4, vig: .7, glass: .5 });
  if (t > EV.press && t < EV.press + .25) { ctx.fillStyle = `rgba(255,255,255,${.35 * (1 - (t - EV.press) / .25)})`; ctx.fillRect(0, 0, W, H); }
}

// ---------------------------------------------------------------- 1958: Tennis for Two
// rally: a hit every 2 beats from EV.rally0, bounce on the odd beat. returns [x, y] in court units (x -1..1, y up)
function tennisBall(T0) {
  const tb = Math.max(0, T0 - EV.rally0) / BEAT, k = Math.floor(tb / 2), s = (tb - 2 * k), dir = k % 2 ? -1 : 1;
  if (T0 < EV.rally0) return [-.8, .45];
  let x, y;
  if (s < 1) { x = lerp(-.8, .42, s); y = .45 * (1 - s) + 4 * .42 * s * (1 - s); }
  else { const q = s - 1; x = lerp(.42, .8, q); y = .4 * q + 4 * .26 * q * (1 - q); }
  return [x * dir, y];
}
function tennis(ctx, t, T0) {
  R.room(ctx, t, { tint: '#5cff9a', ga: .16, seed: 3 });
  ctx.save(); R.cam(ctx, t, BAR * 3, 1.02, 1.08, 455, 400);
  R.scope(ctx, T0, (c, x, y, w, h) => {
    const cx = x + w / 2, cy = y + h / 2, Rr = w / 2;
    // graticule
    c.strokeStyle = 'rgba(70,170,110,.22)'; c.lineWidth = 1;
    for (let i = -5; i <= 5; i++) { c.beginPath(); c.moveTo(cx + i * Rr / 5, y); c.lineTo(cx + i * Rr / 5, y + h); c.stroke(); c.beginPath(); c.moveTo(x, cy + i * Rr / 5); c.lineTo(x + w, cy + i * Rr / 5); c.stroke(); }
    c.save(); c.globalCompositeOperation = 'lighter';
    const gy = cy + Rr * .38, sx = Rr * .78, sy = Rr * .62;
    const ph = '#8dffb5';
    c.strokeStyle = rgba(ph, .85); c.lineWidth = 3; c.shadowColor = ph; c.shadowBlur = 10;
    c.beginPath(); c.moveTo(cx - Rr * .86, gy); c.lineTo(cx + Rr * .86, gy); c.stroke();
    c.beginPath(); c.moveTo(cx, gy); c.lineTo(cx, gy - Rr * .16); c.stroke();
    c.shadowBlur = 0;
    // phosphor persistence trail
    for (let i = 26; i >= 0; i--) {
      const tt = T0 - i * .014, [bx, by] = tennisBall(tt), a = Math.pow(1 - i / 27, 2.2);
      G.glow(c, cx + bx * sx, gy - by * sy, 10 + 4 * (1 - i / 27), ph, .55 * a);
    }
    const [bx, by] = tennisBall(T0), px = cx + bx * sx, py = gy - by * sy;
    G.glow(c, px, py, 34, ph, .6); c.fillStyle = '#eafff1'; c.beginPath(); c.arc(px, py, 4.5, 0, TAU); c.fill();
    c.restore();
  });
  ctx.restore();
}

// ---------------------------------------------------------------- 1962: Spacewar!
const NEEDLE = [[15, 0], [5, -2], [-9, -2], [-14, -6], [-11, 0], [-14, 6], [-9, 2], [5, 2]];
const WEDGE = [[13, 0], [-10, -9], [-5, 0], [-10, 9]];
function ship(c, pts, x, y, a, s, col, thrust) {
  c.save(); c.translate(x, y); c.rotate(a); c.scale(s, s);
  c.strokeStyle = col; c.lineWidth = 1.6 / s; c.shadowColor = col; c.shadowBlur = 8;
  c.beginPath(); pts.forEach(([px, py], i) => (i ? c.lineTo(px, py) : c.moveTo(px, py))); c.closePath(); c.stroke();
  if (thrust > 0) { c.beginPath(); c.moveTo(-12, -2); c.lineTo(-12 - thrust * 10, 0); c.lineTo(-12, 2); c.stroke(); }
  c.restore();
}
function orbit(T0, ph, rx, ry, sp) { const a = ph + T0 * sp; return [Math.cos(a) * rx, Math.sin(a) * ry, a + Math.PI / 2 * Math.sign(sp)]; }
function spacewar(ctx, t, T0) {
  R.room(ctx, t, { tint: '#9cc8ff', ga: .17, seed: 9, desk1: '#1f2228', desk2: '#121418' });
  ctx.save(); R.cam(ctx, t, BAR * 2, 1.0, 1.06, 540, 400);
  R.pdp(ctx, T0, (c, x, y, w, h) => {
    const cx = x + w / 2, cy = y + h / 2;
    const P = rng(21), col = '#d9ecff';
    // the "Expensive Planetarium": a real-sky starfield creeping slowly across
    for (let i = 0; i < 130; i++) { const sx = ((P() * w * 1.4 - T0 * 6) % (w * 1.4) + w * 1.4) % (w * 1.4) + x - w * .2, sy = y + P() * h, b = P(); c.fillStyle = rgba('#cfe3ff', .25 + .6 * b * b); c.fillRect(sx, sy, b > .85 ? 2.5 : 1.5, b > .85 ? 2.5 : 1.5); }
    c.save(); c.globalCompositeOperation = 'lighter';
    // the central star: flickering spokes
    const f = Math.floor(T0 * 30);
    c.strokeStyle = rgba('#fff6d8', .9); c.lineWidth = 1.5; c.shadowColor = '#fff2c0'; c.shadowBlur = 10;
    for (let k = 0; k < 8; k++) { const a = k / 8 * TAU + f * .37, l = 6 + hash(f * 9 + k) * 16; c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + Math.cos(a) * l, cy + Math.sin(a) * l); c.stroke(); }
    G.glow(c, cx, cy, 60, '#fff0c0', .35);
    // two ships in gravity orbits
    const A = orbit(T0, .3, 140, 110, .55), Bq = orbit(T0, 3.6, 165, 120, .46);
    const thr = (k) => .5 + .5 * Math.sin(T0 * 22 + k);
    ship(c, NEEDLE, cx + A[0], cy + A[1], A[2], 2.3, col, thr(0));
    ship(c, WEDGE, cx + Bq[0], cy + Bq[1], Bq[2], 2.3, col, thr(2));
    // torpedoes
    EV.torp.forEach((tt, i) => {
      const age = T0 - tt; if (age < 0 || age > 1.4) return;
      const src = orbit(tt, i % 2 ? 3.6 : .3, i % 2 ? 165 : 140, i % 2 ? 120 : 110, i % 2 ? .46 : .55);
      const d = src[2], px = cx + src[0] + Math.cos(d) * age * 190, py = cy + src[1] + Math.sin(d) * age * 190;
      G.glow(c, px, py, 12, col, .8 * (1 - age / 1.4)); c.fillStyle = '#fff'; c.fillRect(px - 1.5, py - 1.5, 3, 3);
    });
    c.restore();
  });
  ctx.restore();
}

// ---------------------------------------------------------------- 1972: Pong, then the Odyssey overlay
const PW = 128, PH = 110;
const pongY = (k) => 18 + hash(k * 7 + 3) * 74;
function pongState(T0) {
  const tb = Math.max(0, T0 - EV.pong0) / BEAT, k = Math.floor(tb / 2), s = (tb - 2 * k) / 2;
  const y0 = pongY(k), y1 = pongY(k + 1), wall = k % 2 ? 4 : PH - 6;
  const by = s < .5 ? lerp(y0, wall, s * 2) : lerp(wall, y1, s * 2 - 1);
  const bx = k % 2 ? lerp(116, 10, s) : lerp(10, 116, s);
  // paddle centres ease between the hits they make
  const left = (() => { const kk = Math.floor(k / 2) * 2, yA = pongY(kk), yB = pongY(kk + 2); return lerp(yA, yB, io3(clamp((tb - kk * 2) / 4))); })();
  const right = (() => { const kk = Math.floor((k - 1) / 2) * 2 + 1, yA = pongY(kk), yB = pongY(kk + 2); return lerp(yA, yB, io3(clamp((tb - kk * 2) / 4))); })();
  return { bx, by, left, right };
}
function pong(ctx, t, T0) {
  R.room(ctx, t, { tint: '#d8e8ff', ga: .14, seed: 12 });
  ctx.save(); R.cam(ctx, t, BAR * 3, 1.0, 1.07, 480, 450);
  R.tv70(ctx, T0, (c, x, y, w, h) => {
    const L = R.lowres('pong', PW, PH), p = L.c;
    p.fillStyle = '#060606'; p.fillRect(0, 0, PW, PH);
    p.fillStyle = '#f2f2ee';
    for (let yy = 2; yy < PH; yy += 6) p.fillRect(63, yy, 2, 3);
    const s = pongState(T0);
    p.fillRect(6, Math.round(s.left - 6), 3, 12); p.fillRect(119, Math.round(s.right - 6), 3, 12);
    p.fillRect(Math.round(s.bx - 1), Math.round(s.by - 1), 3, 3);
    T.pixText(p, '3', 44, 6, 2, { color: '#f2f2ee' }); T.pixText(p, '5', 74, 6, 2, { color: '#f2f2ee' });
    R.blit(c, L.cv, x, y, w, h);
    // Odyssey: a translucent plastic overlay is laid over the picture
    const ok = out3(ss(EV.overlay - .2, EV.overlay + .6, T0));
    if (ok > 0) {
      c.save(); c.translate(0, (1 - ok) * -h);
      c.globalAlpha = .5; c.fillStyle = '#1f8a4c'; c.fillRect(x, y, w, h);
      c.fillStyle = '#c45a2a'; c.fillRect(x, y, w, h * .12); c.fillRect(x, y + h * .88, w, h * .12);
      c.globalAlpha = .7; c.strokeStyle = '#f4f1e6'; c.lineWidth = 4; c.strokeRect(x + 26, y + h * .16, w - 52, h * .68);
      c.beginPath(); c.moveTo(x + w / 2, y + h * .16); c.lineTo(x + w / 2, y + h * .84); c.moveTo(x + 26, y + h / 2); c.lineTo(x + w - 26, y + h / 2); c.stroke();
      c.globalAlpha = .9; c.fillStyle = 'rgba(255,255,240,.12)'; c.fillRect(x, y, w, 8);
      c.restore();
      c.save(); c.globalAlpha = ok; c.fillStyle = 'rgba(240,235,210,.85)'; c.fillRect(x + w / 2 - 70, y + 6, 140, 26); c.restore();
      T.pixText(c, 'OVERLAY', x + w / 2, y + 12, 2, { align: 'center', color: '#3a2a14', alpha: ok });
    }
  });
  ctx.restore();
}

// ---------------------------------------------------------------- 1977: Atari 2600
function atari(ctx, t, T0) {
  const on = ss(EV.power2600 - .05, EV.power2600 + .5, T0);
  const hue = (T0 * .35) % 1, tint = mix('#ff9a3c', '#3cc8ff', .5 + .5 * Math.sin(hue * TAU));
  R.room(ctx, t, { tint: on ? tint : '#ffb46a', ga: .1 + .16 * on, seed: 15 });
  // colour arrives: the Atari palette sweeps across the wall once the console powers on
  if (on > 0) {
    ctx.save(); ctx.globalAlpha = .16 * on; ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 16; i++) { const c = mixs('#ff3b3b', '#3b6bff', ((i / 16 + T0 * .2) % 1)); ctx.fillStyle = c; ctx.fillRect(0, 120 + i * 30, W, 24); }
    ctx.restore();
  }
  ctx.save(); R.cam(ctx, t, BAR * 2, 1.16, 1.24, 520, 470, { dy: -20 });
  const cx = 500;
  // shadow
  G.ellipseGlow(ctx, cx, 690, 380, 40, '#000', .7);
  // body: sloped black ribbed top + front
  ctx.fillStyle = '#101012'; ctx.beginPath(); ctx.moveTo(cx - 330, 470); ctx.lineTo(cx - 290, 360); ctx.lineTo(cx + 290, 360); ctx.lineTo(cx + 330, 470); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.07)'; ctx.lineWidth = 3;
  for (let i = 1; i < 9; i++) { const yy = lerp(360, 470, i / 9), xx = lerp(290, 330, i / 9); ctx.beginPath(); ctx.moveTo(cx - xx, yy); ctx.lineTo(cx - 90, yy); ctx.moveTo(cx + 90, yy); ctx.lineTo(cx + xx, yy); ctx.stroke(); }
  ctx.fillStyle = '#1a1a1d'; ctx.beginPath(); ctx.roundRect(cx - 95, 368, 190, 96, 8); ctx.fill();
  ctx.fillStyle = '#050506'; ctx.beginPath(); ctx.roundRect(cx - 78, 392, 156, 18, 4); ctx.fill();
  // cartridge drops into the slot
  const ck = clamp((T0 - (EV.cart - .55)) / .55), cy = lerp(-120, 300, Math.pow(ck, 2.2)) + (T0 > EV.cart ? Math.sin(clamp((T0 - EV.cart) / .25) * Math.PI) * 6 : 0);
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, 401); ctx.clip();
  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 24; ctx.fillStyle = '#18181b'; ctx.beginPath(); ctx.roundRect(cx - 70, cy, 140, 150, 8); ctx.fill(); ctx.restore();
  const lg = ctx.createLinearGradient(0, cy + 14, 0, cy + 104); lg.addColorStop(0, '#ff5d2e'); lg.addColorStop(.5, '#ffb83a'); lg.addColorStop(1, '#2a1252');
  ctx.fillStyle = lg; ctx.fillRect(cx - 56, cy + 14, 112, 90);
  ctx.fillStyle = '#fff7da'; for (let i = 0; i < 9; i++) ctx.fillRect(cx - 50 + hash(i) * 100, cy + 18 + hash(i + 9) * 40, 3, 3);
  ctx.fillStyle = '#16083a'; ctx.beginPath(); ctx.moveTo(cx - 56, cy + 104); ctx.lineTo(cx - 20, cy + 70); ctx.lineTo(cx + 8, cy + 88); ctx.lineTo(cx + 34, cy + 62); ctx.lineTo(cx + 56, cy + 80); ctx.lineTo(cx + 56, cy + 104); ctx.fill();
  T.pixText(ctx, 'GAME', cx, cy + 116, 3, { align: 'center', color: '#f4f1e8' });
  ctx.restore();
  // front panel: wood grain with six switches
  R.woodPanel(ctx, cx - 340, 470, 680, 150, 12, { shadow: 30 });
  ctx.fillStyle = '#0d0d0f'; ctx.beginPath(); ctx.roundRect(cx - 340, 616, 680, 40, [0, 0, 14, 14]); ctx.fill();
  const labels = ['POWER', 'TV TYPE', 'LEFT', 'RIGHT', 'SELECT', 'RESET'];
  labels.forEach((l, i) => {
    const sx = cx - 270 + i * 108, up = i === 0 ? on : i === 1 ? 1 : .0;
    ctx.fillStyle = '#0b0b0c'; ctx.beginPath(); ctx.roundRect(sx - 18, 500, 36, 70, 6); ctx.fill();
    const g = ctx.createLinearGradient(sx - 10, 0, sx + 10, 0); g.addColorStop(0, '#9aa0a6'); g.addColorStop(.5, '#f3f5f7'); g.addColorStop(1, '#7b8187');
    ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(sx - 9, lerp(540, 508, up), 18, 26, 4); ctx.fill();
    R.label(ctx, l, sx, 592, { size: 11, color: '#fff6e8', alpha: .85 });
  });
  // joystick
  const jx = 905, jy = 610, tilt = Math.sin(T0 * 3.1) * .25 * on;
  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 20; ctx.fillStyle = '#121214'; ctx.beginPath(); ctx.roundRect(jx - 62, jy - 40, 124, 90, 12); ctx.fill(); ctx.restore();
  ctx.fillStyle = '#c8202a'; ctx.beginPath(); ctx.arc(jx - 38, jy - 22, 11, 0, TAU); ctx.fill();
  ctx.strokeStyle = '#1c1c1f'; ctx.lineWidth = 16; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(jx + 8, jy + 4); ctx.lineTo(jx + 8 + Math.sin(tilt) * 110, jy - 110); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(jx + 2, jy); ctx.lineTo(jx + 2 + Math.sin(tilt) * 110, jy - 106); ctx.stroke();
  ctx.fillStyle = '#0f0f11'; ctx.beginPath(); ctx.ellipse(jx + 8, jy + 6, 26, 12, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = '#0f0f11'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(jx - 62, jy + 20); ctx.bezierCurveTo(jx - 140, jy + 40, cx + 360, 560, cx + 338, 540); ctx.stroke();
  ctx.restore();
}

module.exports = { intro, tennis, spacewar, pong, atari, tennisBall };
