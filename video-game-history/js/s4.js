// Act 4: PS2 + the connected planet, Wii / phones / voxels, the esports arena + today's landscape, and the epilogue
// (every era in a mosaic, back to the single dot, THANK YOU FOR PLAYING).
const { C, W, H, TAU, clamp, lerp, ss, io3, out3, out5, back, outElastic, rgba, mix, mixs, shade, hash, rng, noise, fbm, fbm2, win, cues } = require('./core');
const G = require('./gfx');
const R = require('./retro');
const T = require('./type');
const { B, BEAT, BAR, EV, SCENES } = cues;
const sh = (c, k) => rgba(shade(c, k), 1);

const fmt = (n) => Math.round(n).toLocaleString('en-US');

// ================================================================ ONLINE: PS2, then the planet
function ps2(ctx, t, T0) {
  const age = T0 - EV.ps2;
  G.vgrad(ctx, 0, H, [[0, '#01030c'], [.6, '#04123a'], [1, '#020614']]);
  // translucent towers rising out of a blue haze (the start-up mood of the era)
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const P = rng(91);
  for (let i = 0; i < 26; i++) {
    const x = P() * W, z = .3 + P() * .7, hgt = (80 + P() * 340) * z * (.6 + .4 * ss(0, 2 + P(), age)), w = 26 * z, base = 640 + (1 - z) * -140;
    const g = ctx.createLinearGradient(0, base - hgt, 0, base); g.addColorStop(0, `rgba(120,170,255,${.02 + .1 * z})`); g.addColorStop(1, `rgba(60,110,255,${.12 * z})`);
    ctx.fillStyle = g; ctx.fillRect(x - w / 2 + Math.sin(t * .2 + i) * 4, base - hgt, w, hgt);
    ctx.fillStyle = `rgba(170,210,255,${.25 * z})`; ctx.fillRect(x - w / 2 + Math.sin(t * .2 + i) * 4, base - hgt, w, 2);
  }
  ctx.restore();
  G.glow(ctx, 700, 420, 520, '#3a6aff', .25);
  G.motes(ctx, t, 60, { color: '#9cc0ff', a: .4, size: .8, seed: 92, drift: [2, -10] });
  // the slab: a black console standing on end, its logo light glowing blue
  ctx.save(); R.cam(ctx, t, 4, 1.0, 1.06, 700, 420);
  const cx = 720, cy = 420, w = 190, h = 500;
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(-.05);
  ctx.shadowColor = 'rgba(0,0,0,.8)'; ctx.shadowBlur = 50; ctx.shadowOffsetY = 20;
  const g = ctx.createLinearGradient(-w / 2, 0, w / 2, 0); g.addColorStop(0, '#0b0c10'); g.addColorStop(.5, '#22252d'); g.addColorStop(1, '#08090c');
  ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, 10); ctx.fill(); ctx.shadowColor = 'transparent';
  ctx.fillStyle = '#050608'; ctx.fillRect(-w / 2 + 20, -h / 2, 16, h);
  ctx.strokeStyle = 'rgba(140,170,255,.25)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, 10); ctx.stroke();
  for (let i = 0; i < 14; i++) { ctx.fillStyle = 'rgba(255,255,255,.05)'; ctx.fillRect(-w / 2 + 50, -h / 2 + 30 + i * 32, w - 70, 14); }
  ctx.fillStyle = '#0a0b0e'; ctx.fillRect(w / 2 - 34, -h / 2 + 40, 10, h - 80);
  const pulse = .6 + .4 * Math.sin(T0 * 2.2);
  G.glow(ctx, w / 2 - 29, -h / 2 + 60, 40, '#4a8aff', .9 * pulse); ctx.fillStyle = '#9cc4ff'; ctx.fillRect(w / 2 - 32, -h / 2 + 52, 6, 16);
  G.glow(ctx, w / 2 - 29, h / 2 - 70, 22, '#3aff6a', .7); ctx.fillStyle = '#7aff9a'; ctx.fillRect(w / 2 - 31, h / 2 - 74, 4, 8);
  ctx.restore();
  G.ellipseGlow(ctx, cx, cy + h / 2 + 18, 200, 24, '#3a6aff', .35);
  ctx.restore();
  // the counter
  const k = io3(ss(.4, 3.0, age)), n = 160e6 * k;
  G.text(ctx, fmt(n) + (k > .999 ? '+' : ''), 90, 400, { font: 'Didot', size: 78, color: '#eaf1ff', alpha: ss(.2, .6, age), shadow: 24 });
  G.text(ctx, 'CONSOLES SOLD', 94, 446, { font: 'OptB', size: 20, color: '#9cc0ff', track: 8, alpha: ss(.4, .9, age) });
  ctx.strokeStyle = rgba('#9cc0ff', .5 * ss(.4, .9, age)); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(94, 470); ctx.lineTo(94 + 300 * out3(ss(.5, 1.4, age)), 470); ctx.stroke();
}

// fibonacci sphere with a procedural land mask
const GLOBE = (() => {
  const pts = [], n = 2600, ga = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / (n - 1)) * 2, r = Math.sqrt(1 - y * y), th = ga * i, x = Math.cos(th) * r, z = Math.sin(th) * r;
    const land = fbm2(x * 1.6 + z * .7 + 4, y * 1.9 + z * 1.1 + 2, 4) + .12 * Math.cos(y * 3);
    pts.push([x, y, z, land > .06]);
  }
  return pts;
})();
const LAND = GLOBE.filter((p) => p[3]);
function globe(ctx, t, T0) {
  const age = T0 - EV.net, wow = ss(EV.wow - .4, EV.wow + .6, T0);
  const col = mix('#5aff8a', '#ffc65a', wow), col2 = mix('#3aff6a', '#ff7a3a', wow);
  G.vgrad(ctx, 0, H, [[0, '#020409'], [.5, rgba(mix('#041a10', '#1a0c22', wow), 1)], [1, '#020306']]);
  const P = rng(5); for (let i = 0; i < 200; i++) { const b = P(); ctx.fillStyle = `rgba(220,230,255,${.15 + .5 * b * b})`; ctx.fillRect(P() * W, P() * H, 1.6, 1.6); }
  const cx = 540, cy = 440, Rr = 300 + 30 * out3(wow), yaw = T0 * .28, tilt = .35;
  G.glow(ctx, cx, cy, Rr * 1.7, col, .22);
  const rot = (p) => { const c = Math.cos(yaw), s = Math.sin(yaw); let x = p[0] * c + p[2] * s, z = -p[0] * s + p[2] * c, y = p[1]; const ct = Math.cos(tilt), st = Math.sin(tilt); const y2 = y * ct - z * st, z2 = y * st + z * ct; return [x, y2, z2]; };
  // atmosphere rim
  ctx.save(); ctx.strokeStyle = rgba(col, .35); ctx.lineWidth = 3; ctx.shadowColor = col; ctx.shadowBlur = 30; ctx.beginPath(); ctx.arc(cx, cy, Rr + 4, 0, TAU); ctx.stroke(); ctx.restore();
  const sp = ctx.createRadialGradient(cx - Rr * .3, cy - Rr * .3, Rr * .1, cx, cy, Rr); sp.addColorStop(0, rgba(col, .1)); sp.addColorStop(1, 'rgba(0,0,0,.6)');
  ctx.fillStyle = sp; ctx.beginPath(); ctx.arc(cx, cy, Rr, 0, TAU); ctx.fill();
  for (const p of GLOBE) {
    const [x, y, z] = rot(p); if (z < -.05) continue;
    const lit = .35 + .65 * z;
    ctx.fillStyle = p[3] ? rgba(col, .9 * lit) : rgba(col, .1 * lit);
    const s = p[3] ? 2.6 : 1.6; ctx.fillRect(cx + x * Rr - s / 2, cy - y * Rr - s / 2, s, s);
  }
  // connections: arcs between land points, pulses travelling along them
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const nArc = Math.floor(lerp(10, 46, ss(0, 5, age)));
  for (let i = 0; i < nArc; i++) {
    const a = LAND[Math.floor(hash(i * 3 + 1) * LAND.length)], b = LAND[Math.floor(hash(i * 7 + 5) * LAND.length)];
    const born = i * .11, life = ((T0 - EV.net + 1.2 - born) % 3.2 + 3.2) % 3.2, grow = clamp(life / .9), fade = 1 - ss(2.4, 3.2, life);
    const dot = a[0] * b[0] + a[1] * b[1] + a[2] * b[2], om = Math.acos(clamp(dot, -.999, .999)); if (om < .25) continue;
    const pts = [];
    for (let k = 0; k <= 24; k++) {
      const u = k / 24 * grow, s0 = Math.sin((1 - u) * om) / Math.sin(om), s1 = Math.sin(u * om) / Math.sin(om), alt = 1 + Math.sin(u / Math.max(grow, .01) * Math.PI) * .22 * om * grow;
      const v = [(a[0] * s0 + b[0] * s1) * alt, (a[1] * s0 + b[1] * s1) * alt, (a[2] * s0 + b[2] * s1) * alt], r = rot(v);
      pts.push([cx + r[0] * Rr, cy - r[1] * Rr, r[2]]);
    }
    if (pts[pts.length - 1][2] < -.2 && pts[0][2] < -.2) continue;
    ctx.strokeStyle = rgba(i % 3 ? col : col2, .55 * fade); ctx.lineWidth = 1.6;
    ctx.beginPath(); pts.forEach(([x, y, z], k) => { if (z < -.1) { ctx.moveTo(x, y); return; } k ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.stroke();
    const head = pts[pts.length - 1]; if (head[2] > -.05) G.glow(ctx, head[0], head[1], 14, '#ffffff', .7 * fade);
  }
  ctx.restore();
  // live counter
  const online = lerp(250000, 12e6, io3(ss(EV.wow - .2, EV.wow + 2.2, T0))) + Math.sin(T0 * 3) * 1200 + age * 30000;
  G.text(ctx, fmt(online), 540, 186, { font: 'Didot', size: 58, color: '#fff6e6', align: 'center', alpha: ss(.2, .8, age), shadow: 20 });
  G.text(ctx, wow > .5 ? 'PLAYERS IN ONE WORLD' : 'PLAYERS ONLINE', 540, 220, { font: 'OptB', size: 16, color: col, align: 'center', track: 8, alpha: ss(.4, 1, age) });
}
function online(ctx, t, T0) { if (T0 < EV.net) ps2(ctx, t, T0); else globe(ctx, t, T0); if (T0 > EV.net && T0 < EV.net + .3) { ctx.fillStyle = `rgba(255,255,255,${.35 * (1 - (T0 - EV.net) / .3)})`; ctx.fillRect(0, 0, W, H); } }

// ================================================================ EVERYONE: Wii, phone, voxels
function wii(ctx, t, T0) {
  const age = T0 - EV.wii, strike = EV.wii + 2.35;
  R.room(ctx, t, { tint: '#bfe4ff', ga: .22, seed: 101, top: '#0d1018', mid: '#151a24', desk1: '#3a2a1e', desk2: '#22180f' });
  ctx.save(); R.cam(ctx, age, 4, 1.0, 1.05, 520, 400);
  // flat TV with the sensor bar
  const x = 150, y = 150, w = 760, h = 430;
  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 40; ctx.fillStyle = '#0c0d10'; ctx.beginPath(); ctx.roundRect(x, y, w, h, 10); ctx.fill(); ctx.restore();
  ctx.fillStyle = '#16181d'; ctx.fillRect(500, y + h, 80, 60); ctx.fillRect(420, y + h + 56, 240, 10);
  ctx.fillStyle = '#18191d'; ctx.beginPath(); ctx.roundRect(440, y - 22, 200, 16, 6); ctx.fill();
  for (const s of [-1, 1]) G.glow(ctx, 540 + s * 80, y - 14, 26, '#ff5a8a', .3);
  R.screen(ctx, x + 14, y + 14, w - 28, h - 28, (c, sx, sy, sw, sh) => {
    // bowling: a wooden lane in perspective, ball rolls into the pins
    G.vgrad(c, sy, sy + sh, [[0, '#5a9ae0'], [.3, '#a8d4f4'], [1, '#dcecf8']]);
    const vx = sx + sw / 2, vy = sy + sh * .28;
    c.fillStyle = '#e0b070'; c.beginPath(); c.moveTo(vx - 40, vy); c.lineTo(vx + 40, vy); c.lineTo(sx + sw * .82, sy + sh); c.lineTo(sx + sw * .18, sy + sh); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(150,90,40,.35)'; c.lineWidth = 2; for (let i = 1; i < 10; i++) { c.beginPath(); c.moveTo(vx - 40 + i * 8, vy); c.lineTo(sx + sw * .18 + i * sw * .064, sy + sh); c.stroke(); }
    c.fillStyle = '#6a6a7a'; c.beginPath(); c.moveTo(vx - 40, vy); c.lineTo(vx - 48, vy); c.lineTo(sx + sw * .1, sy + sh); c.lineTo(sx + sw * .18, sy + sh); c.fill(); c.beginPath(); c.moveTo(vx + 40, vy); c.lineTo(vx + 48, vy); c.lineTo(sx + sw * .9, sy + sh); c.lineTo(sx + sw * .82, sy + sh); c.fill();
    const hitK = clamp((T0 - strike) / .9);
    const pins = [[0, 0], [-1, -1], [1, -1], [-2, -2], [0, -2], [2, -2], [-3, -3], [-1, -3], [1, -3], [3, -3]];
    pins.forEach(([px, pz], i) => {
      const fly = hitK > 0 ? out3(hitK) : 0, dir = px === 0 ? (i % 2 ? 1 : -1) : Math.sign(px);
      const X = vx + px * 9 + dir * fly * (40 + i * 6), Y = vy + 20 + pz * 3 - fly * (30 + hash(i) * 40) + fly * fly * 30, rot = fly * dir * (2 + i * .3);
      c.save(); c.translate(X, Y); c.rotate(rot); c.fillStyle = '#fff'; c.beginPath(); c.ellipse(0, 0, 5, 12, 0, 0, TAU); c.fill(); c.fillStyle = '#e83a3a'; c.fillRect(-4, -6, 8, 2); c.restore();
    });
    const rk = clamp((T0 - (strike - 1.4)) / 1.4), bz = Math.pow(rk, 1.4);
    if (rk < 1.05) { const bx = lerp(sx + sw * .55, vx, bz), by = lerp(sy + sh * .92, vy + 24, bz), br = lerp(46, 9, bz); c.fillStyle = '#2a3aa8'; c.beginPath(); c.arc(bx, by - br * .6, br, 0, TAU); c.fill(); c.fillStyle = 'rgba(255,255,255,.4)'; c.beginPath(); c.arc(bx - br * .35, by - br, br * .3, 0, TAU); c.fill(); }
    if (T0 > strike + .15) T.pixText(c, 'STRIKE!', vx, sy + 40, 9, { align: 'center', grad: ['#fff6a0', '#ffb23a', '#ff4a2a'], alpha: ss(strike + .15, strike + .3, T0), drop: (i) => Math.sin(T0 * 8 + i * .7) * 4 });
  }, { r: 4, glow: .3, scan: 0, vig: .2, glass: .5 });
  // the remote: swung like a bowling arm, with a motion trail
  const sw = clamp((T0 - (strike - 2.0)) / .8), ang = lerp(.55, -.3, io3(sw)) + Math.sin(T0 * 1.3) * .05;
  const piv = [830, 1010];
  for (let k = 8; k >= 0; k--) {
    const a = lerp(.55, -.3, io3(clamp((T0 - k * .03 - (strike - 2.0)) / .8)));
    ctx.save(); ctx.translate(piv[0], piv[1]); ctx.rotate(a); ctx.globalAlpha = k ? .06 * (1 - k / 9) * (sw > 0 && sw < 1 ? 1 : 0) : 1;
    ctx.shadowColor = k ? 'transparent' : 'rgba(0,0,0,.5)'; ctx.shadowBlur = 20;
    const g = ctx.createLinearGradient(-26, 0, 26, 0); g.addColorStop(0, '#d8dce2'); g.addColorStop(.5, '#ffffff'); g.addColorStop(1, '#c4c8cf');
    ctx.scale(1.35, 1.35); ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(-26, -380, 52, 250, 20); ctx.fill();
    if (!k) {
      ctx.shadowColor = 'transparent';
      ctx.fillStyle = '#bfc4cc'; ctx.fillRect(-9, -350, 18, 6); ctx.fillRect(-3, -356, 6, 18);
      ctx.fillStyle = '#e8eaee'; ctx.beginPath(); ctx.arc(0, -305, 11, 0, TAU); ctx.fill(); ctx.strokeStyle = '#c4c8cf'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = '#3ab0ff'; for (let i = 0; i < 4; i++) ctx.fillRect(-12 + i * 7, -160, 4, 4);
    }
    ctx.restore();
  }
  ctx.restore();
}
function phoneApp(ctx, t, T0) {
  const age = T0 - EV.phone;
  R.room(ctx, t, { tint: '#ff7ad8', ga: .2, seed: 111, top: '#0a0812', mid: '#140f1e' });
  ctx.save(); R.cam(ctx, age, 3.4, 1.0, 1.06, 540, 430);
  R.phone(ctx, T0, (c, x, y, w, h) => {
    const g = c.createLinearGradient(x, y, x + w, y + h); g.addColorStop(0, '#3a1a8a'); g.addColorStop(1, '#ff5a8a'); c.fillStyle = g; c.fillRect(x, y, w, h);
    const open = out5(ss(1.0, 1.5, age));
    // home screen: icons pop in
    const cols = ['#ff3a5a', '#ffb23a', '#3ad86a', '#3ab0ff', '#b85aff', '#ff7a3a', '#3affd8', '#ffd23a', '#5a7aff', '#ff5ab8', '#7aff5a', '#ff3a9a', '#3a8aff', '#ffa83a', '#8a5aff', '#3ad8a8'];
    if (open < 1) {
      for (let i = 0; i < 16; i++) {
        const gx = i % 4, gy = Math.floor(i / 4), k = back(clamp((age - i * .04) / .35)), s = 52 * k;
        const ix = x + 34 + gx * 66 + 26, iy = y + 90 + gy * 86 + 26;
        c.save(); c.globalAlpha = 1 - open; c.translate(ix, iy); c.scale(1 + open * (i === 9 ? 6 : 0), 1 + open * (i === 9 ? 6 : 0));
        c.fillStyle = cols[i]; c.beginPath(); c.roundRect(-s / 2, -s / 2, s, s, 13 * k); c.fill();
        c.fillStyle = 'rgba(255,255,255,.85)'; c.beginPath(); c.arc(0, 0, s * .2, 0, TAU); c.fill();
        c.restore();
      }
      if (age > .75 && age < 1.2) { const k = (age - .75) / .45; c.strokeStyle = `rgba(255,255,255,${1 - k})`; c.lineWidth = 3; c.beginPath(); c.arc(x + 34 + 66 + 26, y + 90 + 2 * 86 + 26, 10 + k * 40, 0, TAU); c.stroke(); }
    }
    if (open > 0) {
      // the game: a grid of gems; a swap, a match, a cascade
      c.save(); c.globalAlpha = open;
      c.fillStyle = '#1a0c3a'; c.fillRect(x, y, w, h);
      const gc = ['#ff3a5a', '#3ab0ff', '#ffd23a', '#3ad86a', '#b85aff'], gs = 42, ox = x + (w - 6 * gs) / 2, oy = y + 120;
      const pop = ss(2.0, 2.25, age), fall = out3(ss(2.25, 2.7, age));
      for (let r = 0; r < 9; r++) for (let q = 0; q < 6; q++) {
        let ci = Math.floor(hash(r * 17 + q * 5) * 5);
        if (r === 4 && q >= 1 && q <= 3) ci = 2;
        const matched = r === 4 && q >= 1 && q <= 3;
        let dy = 0, sc = 1;
        if (matched) { sc = 1 - pop; if (fall > 0) { sc = 1; ci = Math.floor(hash(r * 3 + q * 11 + 99) * 5); dy = (1 - fall) * -gs * 5; } }
        else if (r < 4 && fall > 0 && q >= 1 && q <= 3) dy = 0;
        const X = ox + q * gs + gs / 2, Y = oy + r * gs + gs / 2 + dy;
        c.save(); c.translate(X, Y); c.scale(sc, sc); c.rotate(Math.PI / 4);
        c.fillStyle = gc[ci]; c.fillRect(-13, -13, 26, 26); c.fillStyle = 'rgba(255,255,255,.45)'; c.fillRect(-13, -13, 26, 7); c.restore();
      }
      if (pop > 0 && pop < 1) for (let k = 0; k < 18; k++) { const a = k / 18 * TAU, d = pop * 70; G.glow(c, ox + 2 * gs + Math.cos(a) * d, oy + 4.5 * gs + Math.sin(a) * d * .6, 10, '#ffd23a', 1 - pop); }
      T.pixText(c, 'SCORE ' + (age > 2.1 ? '1,250' : '950'), x + w / 2, y + 66, 3, { align: 'center', color: '#fff' });
      c.restore();
    }
  });
  ctx.restore();
}
// isometric voxel island, built block by block
function voxels(ctx, t, T0) {
  const age = T0 - EV.mine;
  G.vgrad(ctx, 0, H, [[0, '#6ab0ff'], [.55, '#bfe2ff'], [1, '#e8f4ff']]);
  for (let i = 0; i < 6; i++) { const cx = ((i * 230 + t * 14) % 1400) - 160, cy = 150 + (i % 3) * 60; ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.fillRect(cx, cy, 120, 24); ctx.fillRect(cx + 24, cy - 16, 72, 16); }
  ctx.save(); R.cam(ctx, age, 3.4, 1.02, 1.1, 540, 470);
  const N = 9, s = 34, ox = 540, oy = 360;
  const iso = (x, y, z) => [ox + (x - y) * s, oy + (x + y) * s * .5 - z * s];
  const cube = (x, y, z, top, left, right, k = 1) => {
    const [px, py] = iso(x, y, z), d = (1 - k) * -60;
    ctx.save(); ctx.translate(0, d); ctx.globalAlpha = clamp(k * 3);
    ctx.fillStyle = top; ctx.beginPath(); ctx.moveTo(px, py - s * .5); ctx.lineTo(px + s, py); ctx.lineTo(px, py + s * .5); ctx.lineTo(px - s, py); ctx.closePath(); ctx.fill();
    ctx.fillStyle = left; ctx.beginPath(); ctx.moveTo(px - s, py); ctx.lineTo(px, py + s * .5); ctx.lineTo(px, py + s * 1.5); ctx.lineTo(px - s, py + s); ctx.closePath(); ctx.fill();
    ctx.fillStyle = right; ctx.beginPath(); ctx.moveTo(px + s, py); ctx.lineTo(px, py + s * .5); ctx.lineTo(px, py + s * 1.5); ctx.lineTo(px + s, py + s); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.12)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.restore();
  };
  const hgt = (x, y) => { const d = Math.hypot(x - 4, y - 4); if (d > 4.6) return -1; return Math.max(0, Math.round(1 + fbm2(x * .35 + 2, y * .35 + 7, 2) * 3 - d * .25)); };
  const blocks = [];
  for (let x = 0; x < N; x++) for (let y = 0; y < N; y++) {
    const hh = hgt(x, y); if (hh < 0) continue;
    for (let z = -2; z <= hh; z++) blocks.push([x, y, z, z === hh ? (hh === 0 && (x + y) % 3 === 0 ? 'water' : 'grass') : z > hh - 2 ? 'dirt' : 'stone', 0]);
  }
  // the build: a little house + a tree, a block per half beat
  const surf = (x, y) => hgt(x, y) + 1;
  const plan = [];
  for (const [x, y] of [[2, 3], [3, 3], [4, 3], [2, 4], [4, 4], [2, 5], [3, 5], [4, 5]]) plan.push([x, y, surf(3, 4), 'plank']);
  for (const [x, y] of [[2, 3], [4, 3], [2, 5], [4, 5], [3, 5]]) plan.push([x, y, surf(3, 4) + 1, 'plank']);
  for (const [x, y] of [[2, 3], [3, 3], [4, 3], [2, 4], [3, 4], [4, 4], [2, 5], [3, 5], [4, 5]]) plan.push([x, y, surf(3, 4) + 2, 'roof']);
  plan.forEach((b, i) => blocks.push([...b, EV.mine - .4 + i * BEAT * .25]));
  for (let z = 0; z < 3; z++) blocks.push([6, 6, surf(6, 6) + z, 'log', 0]);
  for (const [dx, dy, dz] of [[0, 0, 3], [-1, 0, 2], [1, 0, 2], [0, -1, 2], [0, 1, 2], [0, 0, 4]]) blocks.push([6 + dx, 6 + dy, surf(6, 6) + dz, 'leaf', 0]);
  const PAL = { grass: ['#6ad84a', '#7a5a3a', '#5a4228'], dirt: ['#8a6440', '#7a5a3a', '#5a4228'], stone: ['#9a9aa2', '#7a7a82', '#5e5e66'], water: ['#4aa8ff', '#3a88d8', '#2a6ab8'], plank: ['#d8a868', '#b8884a', '#8a6232'], roof: ['#c84a3a', '#a83a2a', '#7a2a1e'], log: ['#9a7448', '#6a4a28', '#4a321a'], leaf: ['#3ab83a', '#2a982a', '#1e7a1e'] };
  blocks.sort((a, b) => (a[0] + a[1]) - (b[0] + b[1]) || a[2] - b[2]);
  for (const [x, y, z, kind, at] of blocks) {
    const k = at ? out3(clamp((T0 - at) / .22)) : 1; if (k <= 0) continue;
    const [a, b2, c] = PAL[kind]; cube(x, y, z, a, b2, c, k);
  }
  // the little builder + a floating block-cursor
  const nb = plan.findIndex((b, i) => EV.mine - .4 + i * BEAT * .25 > T0), tgt = plan[Math.max(0, nb)] ?? plan[plan.length - 1];
  const [cxp, cyp] = iso(tgt[0], tgt[1], tgt[2]);
  ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cxp, cyp - s * .5); ctx.lineTo(cxp + s, cyp); ctx.lineTo(cxp, cyp + s * .5); ctx.lineTo(cxp - s, cyp); ctx.closePath(); ctx.stroke();
  const [hx, hy] = iso(5, 2, surf(5, 2));
  ctx.fillStyle = '#3ab0d8'; ctx.fillRect(hx - 8, hy - 30, 16, 18); ctx.fillStyle = '#3a3aa8'; ctx.fillRect(hx - 8, hy - 12, 16, 12); ctx.fillStyle = '#c89a6a'; ctx.fillRect(hx - 8, hy - 46, 16, 16);
  ctx.fillStyle = '#4a2a1a'; ctx.fillRect(hx - 8, hy - 46, 16, 5);
  ctx.restore();
}
function everyone(ctx, t, T0) {
  if (T0 < EV.phone) wii(ctx, t, T0); else if (T0 < EV.mine) phoneApp(ctx, t, T0); else voxels(ctx, t, T0);
  const since = T0 < EV.phone ? 9 : T0 < EV.mine ? T0 - EV.phone : T0 - EV.mine;
  if (since < .25) { ctx.fillStyle = `rgba(255,255,255,${.4 * (1 - since / .25)})`; ctx.fillRect(0, 0, W, H); }
}

// ================================================================ TODAY: arena, then the landscape
const ridgeCache = {};
function ridge(seed, w, f, amp, oct = 5) {
  const key = seed + ':' + w; if (ridgeCache[key]) return ridgeCache[key];
  const a = new Float32Array(w + 1); for (let x = 0; x <= w; x++) { const n = fbm(x * f + seed * 13.1, oct); a[x] = (1 - Math.abs(n)) * amp; }
  return (ridgeCache[key] = a);
}
// cinematic landscape painted into the rect [0,w]x[0,h] of c
function landscape(c, w, h, t, o = {}) {
  const k = w / 1080;
  const sunX = w * .7, sunY = h * (.49 - .02 * Math.sin(t * .05));
  const sky = c.createLinearGradient(0, 0, 0, h * .62); sky.addColorStop(0, '#0e1a4a'); sky.addColorStop(.45, '#5a4a8a'); sky.addColorStop(.75, '#ff9a6a'); sky.addColorStop(1, '#ffd89a');
  c.fillStyle = sky; c.fillRect(0, 0, w, h);
  const P = rng(3); for (let i = 0; i < 80; i++) { const b = P(); c.fillStyle = `rgba(255,255,255,${(.1 + .4 * b) * (1 - P())})`; c.fillRect(P() * w, P() * h * .3, 1.4 * k, 1.4 * k); }
  G.glow(c, sunX, sunY, 420 * k, '#ffd08a', .55); G.glow(c, sunX, sunY, 120 * k, '#fff4d8', .9);
  c.fillStyle = '#fffaf0'; c.beginPath(); c.arc(sunX, sunY, 26 * k, 0, TAU); c.fill();
  // cloud bands
  c.save(); c.globalAlpha = .5;
  for (let i = 0; i < 5; i++) { const y = h * (.18 + i * .05), x0 = ((t * (4 + i) * k + i * 300 * k) % (w * 1.6)) - w * .3; const g = c.createLinearGradient(0, y - 10 * k, 0, y + 10 * k); g.addColorStop(0, 'rgba(255,190,170,0)'); g.addColorStop(.5, `rgba(255,${180 + i * 10},${160 + i * 10},.5)`); g.addColorStop(1, 'rgba(255,190,170,0)'); c.fillStyle = g; c.beginPath(); c.ellipse(x0, y, 380 * k, 14 * k, 0, 0, TAU); c.fill(); }
  c.restore();
  // mountain layers with atmospheric perspective
  const layers = [[.5, '#a07aa8', 120, .0035, 1], [.56, '#7a5a92', 150, .005, 2], [.62, '#523e78', 170, .007, 3], [.69, '#2e2450', 150, .009, 4], [.76, '#1a1530', 110, .012, 5]];
  const horizon = h * .78;
  layers.forEach(([y0, col, amp, f, seed], li) => {
    const rd = ridge(seed, 1080, f * 1080 / 1080, amp), par = (t * (2 + li * 3)) % 1080;
    c.fillStyle = col; c.beginPath(); c.moveTo(0, horizon);
    for (let x = 0; x <= 1080; x += 4) { const xx = Math.floor((x + par) % 1080); c.lineTo(x * k, (h * y0 - rd[xx] * k * .9)); }
    c.lineTo(w, horizon); c.closePath(); c.fill();
    const mist = c.createLinearGradient(0, h * y0 - 40 * k, 0, h * y0 + 30 * k); mist.addColorStop(0, 'rgba(255,190,170,0)'); mist.addColorStop(1, `rgba(255,190,170,${.22 - li * .03})`);
    c.fillStyle = mist; c.fillRect(0, h * y0 - 40 * k, w, 70 * k);
  });
  // lake with the sky + sun reflected, gentle ripples
  const lg = c.createLinearGradient(0, horizon, 0, h); lg.addColorStop(0, '#ffb88a'); lg.addColorStop(.3, '#7a5a8a'); lg.addColorStop(1, '#141028');
  c.fillStyle = lg; c.fillRect(0, horizon, w, h - horizon);
  c.save(); c.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 40; i++) { const y = horizon + Math.pow(i / 40, 1.6) * (h - horizon), ww = (30 + i * 4) * k * (1 + .3 * Math.sin(t * 2 + i)); c.fillStyle = `rgba(255,230,180,${.5 * (1 - i / 40)})`; c.fillRect(sunX - ww / 2 + Math.sin(t * 1.5 + i * .7) * 6 * k, y, ww, 1.6 * k); }
  c.restore();
  c.fillStyle = 'rgba(255,220,190,.25)'; c.fillRect(0, horizon, w, 1.5 * k);
  // foreground pines + shore
  c.fillStyle = '#07060e';
  c.beginPath(); c.moveTo(0, h); c.lineTo(0, h * .84); for (let x = 0; x <= w * .34; x += 6 * k) c.lineTo(x, h * .84 + Math.sin(x / k * .02) * 6 * k + (x / w) * 40 * k); c.lineTo(w * .34, h); c.closePath(); c.fill();
  const pine = (x, y, s) => { c.beginPath(); c.moveTo(x, y - s); for (let i = 0; i <= 6; i++) { const yy = y - s + i / 6 * s, ww = (i / 6) * s * .32; c.lineTo(x + ww, yy); c.lineTo(x + ww * .45, yy); } c.lineTo(x - s * .32 * .45, y); for (let i = 6; i >= 0; i--) { const yy = y - s + i / 6 * s, ww = (i / 6) * s * .32; c.lineTo(x - ww * .45, yy); c.lineTo(x - ww, yy); } c.closePath(); c.fill(); };
  [[40, .9, 260], [110, .92, 200], [170, .9, 300], [240, .93, 180], [990, .95, 240], [1050, .94, 320]].forEach(([x, y, s]) => pine(x * k, h * y, s * k));
  // birds
  c.strokeStyle = 'rgba(20,14,30,.75)'; c.lineWidth = 2 * k;
  for (let i = 0; i < 7; i++) { const bx = (w * .2 + t * 40 * k + i * 26 * k) % (w * 1.2), by = h * .3 + Math.sin(i * 1.7) * 30 * k + (i % 3) * 14 * k, fl = Math.sin(t * 8 + i) * 5 * k; c.beginPath(); c.moveTo(bx - 8 * k, by - fl); c.lineTo(bx, by); c.lineTo(bx + 8 * k, by - fl); c.stroke(); }
  G.lightShafts(c, t, sunX, sunY, Math.PI * .62, 1.3, h * 1.1, '#ffd8a0', .07 * (o.shafts ?? 1), 9, 4);
}
function arena(ctx, t, T0) {
  const age = T0 - EV.arena;
  G.vgrad(ctx, 0, H, [[0, '#04030a'], [.5, '#0b0820'], [1, '#030206']]);
  // the big screen shows the live match
  const sx = 230, sy = 130, sw = 620, sh = 349;
  const L = G.getLayer(3), lc = L.ctx; lc.setTransform(1, 0, 0, 1, 0, 0); lc.clearRect(0, 0, W, H);
  landscape(lc, sw, sh, t + 30, { shafts: .6 });
  T.pixText(lc, 'GRAND FINAL', sw / 2, 18, 4, { align: 'center', color: '#fff' });
  lc.fillStyle = 'rgba(0,0,0,.45)'; lc.fillRect(0, sh - 40, sw, 40);
  G.text(lc, 'TEAM AURORA  3', 20, sh - 13, { font: 'OptB', size: 18, color: '#7ad8ff', track: 2 }); G.text(lc, '2  TEAM EMBER', sw - 20, sh - 13, { font: 'OptB', size: 18, color: '#ff8a5a', track: 2, align: 'right' });
  G.glow(ctx, 540, 300, 700, '#5a8aff', .25);
  ctx.save(); ctx.fillStyle = '#111'; ctx.fillRect(sx - 10, sy - 10, sw + 20, sh + 20); ctx.drawImage(L.cv, 0, 0, sw, sh, sx, sy, sw, sh); ctx.restore();
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .08; ctx.drawImage(scanFine(), sx, sy, sw, sh); ctx.restore();
  // stage with two team desks
  ctx.fillStyle = '#16122a'; ctx.beginPath(); ctx.moveTo(120, 640); ctx.lineTo(960, 640); ctx.lineTo(1040, 720); ctx.lineTo(40, 720); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(122,216,255,.8)'; ctx.fillRect(120, 638, 840, 3);
  for (const [dx, col] of [[300, '#3ab0ff'], [780, '#ff6a3a']]) {
    ctx.fillStyle = '#0a0814'; ctx.fillRect(dx - 150, 580, 300, 60); ctx.fillStyle = col; ctx.fillRect(dx - 150, 580, 300, 4); G.glow(ctx, dx, 600, 180, col, .25);
    for (let i = 0; i < 3; i++) { const px = dx - 100 + i * 100; ctx.fillStyle = col; ctx.fillRect(px - 26, 548, 52, 30); G.glow(ctx, px, 560, 40, col, .3); ctx.fillStyle = '#050409'; ctx.beginPath(); ctx.arc(px, 540, 14, 0, TAU); ctx.fill(); ctx.fillRect(px - 20, 552, 40, 30); }
  }
  // sweeping spotlights
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 6; i++) {
    const bx = 80 + i * 184, a = Math.PI / 2 + Math.sin(t * .9 + i * 1.3) * .5, len = 900, wd = .09;
    const g = ctx.createLinearGradient(bx, 0, bx + Math.cos(a) * len, Math.sin(a) * len); g.addColorStop(0, rgba(i % 2 ? '#7ad8ff' : '#ff8ad8', .22)); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(bx, -10); ctx.lineTo(bx + Math.cos(a - wd) * len, Math.sin(a - wd) * len); ctx.lineTo(bx + Math.cos(a + wd) * len, Math.sin(a + wd) * len); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
  // confetti after the winning moment
  const cf = T0 - (EV.arena + BAR);
  if (cf > 0) { ctx.save(); for (let i = 0; i < 160; i++) { const x = hash(i) * W + Math.sin(cf * 2 + i) * 30, y = -40 + (cf * (120 + hash(i + 5) * 140) + hash(i + 9) * 300) % 800; ctx.fillStyle = ['#ffd23f', '#ff5a8a', '#7ad8ff', '#7aff8a'][i % 4]; ctx.globalAlpha = .85; ctx.save(); ctx.translate(x, y); ctx.rotate(cf * 4 + i); ctx.fillRect(-4, -2, 8, 4); ctx.restore(); } ctx.restore(); }
  // the crowd: heads and raised arms in silhouette, phone lights twinkling
  for (let row = 0; row < 3; row++) {
    const y0 = 700 + row * 60, n = 15 + row * 2;
    for (let i = 0; i < n; i++) {
      const x = (i + .5) / n * W + (row % 2) * 30 + Math.sin(i * 3.1) * 10, jump = Math.max(0, Math.sin(t * 6 + i * 1.7 + row)) * (cf > 0 ? 12 : 3);
      ctx.fillStyle = ['#0b0916', '#08060f', '#040308'][row];
      ctx.beginPath(); ctx.arc(x, y0 - jump, 26 + row * 3, 0, TAU); ctx.fill(); ctx.fillRect(x - 40 - row * 3, y0 + 20 - jump, 80 + row * 6, 200);
      if (hash(i * 7 + row) > .55) { const ax = x + (hash(i) - .5) * 40; ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = 12; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x, y0 + 20 - jump); ctx.lineTo(ax, y0 - 70 - jump - (cf > 0 ? 20 : 0)); ctx.stroke(); if (hash(i + row * 3) > .5) G.glow(ctx, ax, y0 - 76 - jump, 16, '#ffffff', .5 + .5 * Math.sin(t * 3 + i)); }
    }
  }
}
let fineScan = null;
function scanFine() { if (fineScan) return fineScan; const cv = C.createCanvas(620, 349), c = cv.getContext('2d'); c.fillStyle = '#9cf'; for (let y = 0; y < 349; y += 3) c.fillRect(0, y, 620, 1); return (fineScan = cv); }
function todayScene(ctx, t, T0) {
  const age = T0 - EV.today;
  ctx.save(); R.cam(ctx, age, BAR * 3, 1.0, 1.1, 640, 420, { dy: -20 });
  landscape(ctx, W, H, t);
  ctx.restore();
  // the numbers, counted up in the sky
  const k1 = io3(ss(.4, 2.6, age)), k2 = io3(ss(2.8, 5.0, age));
  const a1 = ss(.2, .7, age), a2 = ss(2.6, 3.1, age);
  G.text(ctx, fmt(3.4e9 * k1), 540, 200, { font: 'Didot', size: 76, color: '#fff8ec', align: 'center', alpha: a1, shadow: 26 });
  G.text(ctx, 'PEOPLE WHO PLAY', 540, 240, { font: 'OptB', size: 18, color: '#ffe0b0', align: 'center', track: 10, alpha: a1 });
  G.text(ctx, '$' + fmt(180e9 * k2), 540, 330, { font: 'Didot', size: 62, color: '#fff8ec', align: 'center', alpha: a2, shadow: 26 });
  G.text(ctx, 'A YEAR \u2014 MORE THAN MOVIES AND MUSIC COMBINED', 540, 366, { font: 'OptB', size: 15, color: '#ffe0b0', align: 'center', track: 6, alpha: a2 });
}
function today(ctx, t, T0) { if (T0 < EV.today) arena(ctx, t, T0); else todayScene(ctx, t, T0); }

// ================================================================ EPILOGUE
const STILLS = [['tennis', 10.5, '1958'], ['spacewar', 18.5, '1962'], ['pong', 23.5, '1972'], ['pong', 28.2, '1972'], ['atari', 33.5, '1977'], ['arcade', 37.0, '1978'], ['arcade', 40.5, '1980'], ['arcade', 43.6, '1981'],
  ['crash', 49.5, '1983'], ['revival', 53.9, '1984'], ['revival', 56.4, '1985'], ['revival', 59.6, '1989'], ['bits16', 64.0, '1991'], ['threed', 68.0, '1993'], ['threed', 72.0, '1994'], ['threed', 76.0, '1996'],
  ['online', 79.5, '2000'], ['online', 83.5, '2001'], ['online', 86.8, '2004'], ['everyone', 90.6, '2006'], ['everyone', 93.6, '2008'], ['everyone', 96.6, '2011'], ['today', 100.5, '2017'], ['today', 108.0, 'TODAY']];
let thumbs = null;
function getThumbs() {
  if (thumbs) return thumbs;
  const mods = Object.assign({}, require('./s1'), require('./s2'), require('./s3'), module.exports);
  const big = C.createCanvas(W, H), bc = big.getContext('2d');
  thumbs = STILLS.map(([id, at]) => {
    const sc = SCENES.find((s) => s[0] === id);
    bc.setTransform(1, 0, 0, 1, 0, 0); bc.globalAlpha = 1; bc.globalCompositeOperation = 'source-over'; bc.filter = 'none'; bc.fillStyle = '#000'; bc.fillRect(0, 0, W, H);
    bc.save(); mods[id](bc, at - sc[1], at); bc.restore();
    const cv = C.createCanvas(360, 360), c = cv.getContext('2d'); c.imageSmoothingQuality = 'high'; c.drawImage(big, 60, 20, 960, 960, 0, 0, 360, 360);
    return cv;
  });
  return thumbs;
}
const COLS = 6, TS = 158, GAP = 12, GX = (W - (COLS * TS + (COLS - 1) * GAP)) / 2, GY = 150;
const tilePos = (i) => [GX + (i % COLS) * (TS + GAP), GY + Math.floor(i / COLS) * (TS + GAP)];
function mosaic(ctx, t, T0) {
  const age = T0 - EV.mosaic, th = getThumbs();
  G.vgrad(ctx, 0, H, [[0, '#06050c'], [1, '#0e0a14']]);
  const zoomK = io3(ss(EV.dot - 1.5, EV.dot - .05, T0));
  const [tx, ty] = tilePos(0), tcx = tx + TS / 2, tcy = ty + TS / 2;
  // zoom into the first tile: its oscilloscope screen sits at ~ (36%, 50%) of the thumb
  const fx = tx + TS * .4, fy = ty + TS * .44, Z = lerp(1, 7.5, zoomK);
  ctx.save();
  ctx.setTransform(Z, 0, 0, Z, lerp(0, W / 2 - fx * Z, zoomK), lerp(0, 430 - fy * Z, zoomK));
  const drift = Math.sin(t * .3) * 4;
  th.forEach((cv, i) => {
    const [x, y] = tilePos(i), k = back(clamp((age - .15 - i * .09) / .45), 1.4), a = clamp((age - .15 - i * .09) / .25);
    if (a <= 0) return;
    ctx.save(); ctx.translate(x + TS / 2, y + TS / 2 + drift * (i % 2 ? 1 : -1)); ctx.scale(k, k); ctx.globalAlpha = a;
    ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 16; ctx.fillStyle = '#000'; ctx.fillRect(-TS / 2, -TS / 2, TS, TS); ctx.shadowColor = 'transparent';
    ctx.drawImage(cv, -TS / 2, -TS / 2, TS, TS);
    ctx.strokeStyle = 'rgba(255,236,200,.35)'; ctx.lineWidth = 1.5; ctx.strokeRect(-TS / 2 + .75, -TS / 2 + .75, TS - 1.5, TS - 1.5);
    ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(-TS / 2, TS / 2 - 22, TS, 22);
    T.pixText(ctx, STILLS[i][2], 0, TS / 2 - 17, 2, { align: 'center', color: '#ffe6b8' });
    ctx.restore();
  });
  ctx.restore();
  const ta = ss(1.8, 2.6, age) * (1 - ss(EV.dot - 2, EV.dot - 1.4, T0));
  G.text(ctx, '1958  \u2014  TODAY', 540, 905, { font: 'Didot', size: 56, color: '#f4c36a', align: 'center', alpha: ta, shadow: 18 });
  G.text(ctx, 'every era, every player, every memory', 540, 955, { font: 'IoI', size: 28, color: '#f1dcc0', align: 'center', alpha: ta, shadow: 12 });
  if (zoomK > .6) { ctx.fillStyle = `rgba(0,0,0,${ss(.6, 1, zoomK)})`; ctx.fillRect(0, 0, W, H); }
}
// the single dot again, and goodbye
function dotScene(ctx, t, T0) {
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  const age = T0 - EV.dot, fadeIn = ss(0, .6, age);
  const s1 = require('./s1');
  const tt = EV.rally0 + age + BEAT * 4, ph = '#8dffb5';
  const thanks = ss(EV.thanks - .2, EV.thanks + .6, T0);
  const gy = lerp(560, 700, thanks), sx = 300, sy = 260;
  const P = (q) => { const [bx, by] = s1.tennisBall(q); return [540 + bx * sx, gy - by * sy]; };
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = fadeIn * (1 - ss(EV.end - 2.4, EV.end - .8, T0));
  ctx.strokeStyle = rgba(ph, .5); ctx.lineWidth = 2; ctx.shadowColor = ph; ctx.shadowBlur = 10; ctx.beginPath(); ctx.moveTo(540 - sx * 1.05, gy); ctx.lineTo(540 + sx * 1.05, gy); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(540, gy); ctx.lineTo(540, gy - 46); ctx.stroke(); ctx.shadowBlur = 0;
  for (let i = 30; i >= 0; i--) { const [x, y] = P(tt - i * .014), a = Math.pow(1 - i / 31, 2.2); G.glow(ctx, x, y, 12, ph, .55 * a); }
  const [x, y] = P(tt); G.glow(ctx, x, y, 48, ph, .6); ctx.fillStyle = '#eafff1'; ctx.beginPath(); ctx.arc(x, y, 5.5, 0, TAU); ctx.fill();
  ctx.restore();
  const la = ss(.5, 1.3, age) * (1 - thanks);
  G.text(ctx, 'It all began with a single dot.', 540, 820, { font: 'IoI', size: 42, color: '#fff0dc', align: 'center', alpha: la, shadow: 16 });
  if (thanks > 0) {
    const fade = 1 - ss(EV.end - 1.6, EV.end - .2, T0);
    const drop = (i) => -(1 - out5(clamp((T0 - EV.thanks - i * .04) / .5))) * 120;
    T.pixText(ctx, 'THANK YOU', 540 + 7, 237, 13, { align: 'center', color: '#1a0830', alpha: thanks * fade, drop });
    T.pixText(ctx, 'THANK YOU', 540, 230, 13, { align: 'center', grad: ['#fff6cf', '#ffcd4a', '#ff8a2a', '#ff3d6e'], alpha: thanks * fade, drop, inset: .6 });
    T.pixText(ctx, 'FOR PLAYING', 540 + 5, 365, 9, { align: 'center', color: '#1a0830', alpha: thanks * fade, drop: (i) => drop(i + 9) });
    T.pixText(ctx, 'FOR PLAYING', 540, 360, 9, { align: 'center', color: '#9fe8ff', alpha: thanks * fade, drop: (i) => drop(i + 9), shadow: 'rgba(80,200,255,.8)', shadowBlur: 14 });
    const blink = Math.floor((T0 - EV.thanks) * 2) % 2 === 0;
    if (blink) T.pixText(ctx, '\u2665  PLAYER ONE  \u2665', 540, 470, 4, { align: 'center', color: '#ff7a8a', alpha: ss(EV.thanks + .8, EV.thanks + 1.2, T0) * fade });
  }
}
function epilogue(ctx, t, T0) { if (T0 < EV.dot) mosaic(ctx, t, T0); else dotScene(ctx, t, T0); }

module.exports = { online, everyone, today, epilogue, landscape };
