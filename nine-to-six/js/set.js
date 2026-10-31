// Shared set pieces: sky and light, skylines, walls, clocks, phones, red-pencil icons and captions.
const view = (cx, s = 1, g = 850) => { const cy = GROUND - (g - 540) / s; camera(cx, cy, s); return cy; };

// smooth keyframes [[t, v], ...]
function kf(keys, t) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) if (t <= keys[i][0]) return lerp(keys[i - 1][1], keys[i][1], ease(inv(keys[i - 1][0], keys[i][0], t)));
  return keys[keys.length - 1][1];
}

// film time -> hour of the day shown on clocks
const CLOCK = [[0, 7.75], [7, 7.75], [22, 8.5], [30.5, 8.66], [46, 8.85], [56, 8.95], [80, 9.92], [88, 10], [105, 12.9], [107, 13], [113, 13.55], [126, 18], [128, 18.05], [138, 19.2], [146, 19.7], [156, 21.7], [164, 22.4], [176, 24], [184, 24.7], [187.5, 24.9]];
const clockAt = t => lin(CLOCK, t);
function hhmm(h) {
  const hh = Math.floor(h) % 24, mm = Math.floor((h % 1) * 60), ap = hh < 12 ? 'am' : 'pm', h12 = hh % 12 || 12;
  return `${h12}:${String(mm).padStart(2, '0')} ${ap}`;
}

// ---------- sky ----------
const SKY = [
  [0, ['#f0cdbb', '#f5dcc3', '#f7ead3']], [22, ['#cfe3ea', '#e4eee9', '#f3efe0']], [100, ['#bcdcea', '#d8ebef', '#f3f0e2']],
  [116, ['#e3c8a8', '#f0d6ae', '#f6e6c4']], [127, ['#c7a8c8', '#ecb9a6', '#f2d29f']], [141, ['#28325c', '#39426f', '#4d517e']],
  [180, ['#2b3560', '#3b4472', '#4f5382']], [187.5, ['#e2bfc6', '#f0d0c0', '#f6e4cf']]
];
function skyAt(t) {
  let i = 1; while (i < SKY.length - 1 && t > SKY[i][0]) i++;
  const a = SKY[i - 1], b = SKY[i], u = ease(inv(a[0], b[0], t));
  return a[1].map((c, k) => mix(c, b[1][k], u));
}
const nightAt = t => clamp(inv(131, 141, t) * (1 - inv(181, 187, t)));
function tornBand(y0, y1, color, alpha, salt) {
  const pts = [];
  for (let x = -20; x <= W + 20; x += 14) pts.push(x, y0 + (hash(salt + x / 14) - .5) * 7);
  for (let x = W + 20; x >= -20; x -= 14) pts.push(x, y1 + (hash(salt + 99 + x / 14) - .5) * 7);
  cut(poly(pts, true), color, { line: null, shadow: false, amp: 0, alpha });
}
function skyDraw(t, hy) {
  const s = skyAt(t), n = nightAt(t);
  screen();
  ctx.fillStyle = s[0]; ctx.fillRect(0, 0, W, H);
  tornBand(hy * .38, hy * .7, s[1], 1, 5); tornBand(hy * .7, hy + 60, s[2], 1, 17);
  if (n > 0) {
    ctx.globalAlpha = n;
    for (let i = 0; i < 46; i++) { const x = hash(i * 3) * W, y = hash(i * 7 + 1) * hy * .8, r = 1.4 + hash(i) * 2; dot(x, y, r, '#f6efd0'); }
    cut(circ(840, 170, 46), C.moon, { pat: 'speck', line: '#c9b98a', w: 1.5, shadow: .3 });
    cut(circ(862, 156, 40), s[0], { line: null, shadow: false, amp: 0 });
    ctx.globalAlpha = 1;
  } else {
    const sx = lin([[0, 220], [22, 260], [100, 540], [116, 760], [127, 880]], t), sy = lin([[0, 520], [22, 240], [90, 130], [118, 250], [130, 470]], t);
    ctx.globalAlpha = 1 - inv(129, 135, t);
    cut(circ(sx, sy, 48), mix('#f1dc93', '#f2a76f', inv(0, 22, 22 - t) * .6 + inv(112, 130, t)), { pat: 'speck', line: C.goldD, w: 1.5, shadow: .4 });
    ctx.globalAlpha = 1;
  }
}

// ---------- skylines ----------
function skyline(camX, camY, s, par, baseY, col, o = {}) {
  camera(camX * par, camY, s);
  const cell = o.cell ?? 150, a = Math.floor(viewL() / cell) - 1, b = Math.ceil(viewR() / cell) + 1, n = o.night || 0;
  for (let i = a; i <= b; i++) {
    const w = (o.w0 ?? 84) + hash(i * 5 + o.seed) * (o.w1 ?? 56), h = (o.h0 ?? 100) + hash(i * 11 + o.seed) * (o.h1 ?? 240);
    const x = i * cell + hash(i * 3 + o.seed) * (cell - w);
    cut(rrect(x, baseY - h, w, h + 6, 3), col, { line: o.line ?? null, w: 1.4, shadow: false, amp: .3 });
    if (o.win) {
      const cols = Math.max(2, Math.floor(w / 24)), rows = Math.floor(h / 30);
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const lit = hash(i * 131 + r * 17 + c) < (n > 0 ? .45 : .06);
        ctx.fillStyle = lit && n > 0 ? `rgba(244,200,110,${.9 * n})` : o.win;
        ctx.fillRect(x + 8 + c * ((w - 16) / cols) + 2, baseY - h + 14 + r * 30, (w - 16) / cols - 6, 14);
      }
    }
    if (hash(i * 7 + o.seed) < .3) line(seg(x + w / 2, baseY - h, x + w / 2, baseY - h - 28), 2, col === '#fff' ? C.line : C.line, { amp: .2 });
  }
}
// far-to-near city with a ground plane; g = screen y of the ground line
function cityBackdrop(t, camX, s, g, groundCol = '#d9d3c4') {
  const camY = view(camX, s, g), hy = g + (HORIZON - GROUND) * s, n = nightAt(t), sk = skyAt(t);
  skyDraw(t, hy);
  const tone = (a, k) => mix(mix(a, sk[2], .35), '#1f2748', n * k);
  const win = n > 0 ? mix('#c9d6de', '#27305a', n) : 'rgba(255,255,255,.55)';
  skyline(camX, camY, s, .12, HORIZON, tone('#c9d8dc', .75), { seed: 1, win, night: n, h0: 160, h1: 300, w0: 90, w1: 60, cell: 170 });
  skyline(camX, camY, s, .25, HORIZON, tone('#aebfc4', .8), { seed: 9, win, night: n, h0: 110, h1: 240, w0: 96, w1: 70, cell: 190 });
  skyline(camX, camY, s, .45, HORIZON + 4, tone('#92a7ad', .85), { seed: 21, win, night: n, h0: 70, h1: 180, w0: 110, w1: 80, cell: 220 });
  screen();
  const hyy = g + (HORIZON - GROUND) * s;
  ctx.fillStyle = mix(groundCol, '#3a3b52', n * .8); ctx.fillRect(0, hyy, W, H - hyy + 2);
  return camY;
}

// ---------- rooms ----------
function wallRect(x0, x1, col, pat, top = -500) {
  ctx.fillStyle = col; ctx.fillRect(x0, top, x1 - x0, GROUND - top);
  if (pat) { ctx.fillStyle = pattern(pat); ctx.globalAlpha = .7; ctx.fillRect(x0, top, x1 - x0, GROUND - top); ctx.globalAlpha = 1; }
}
function floorRect(x0, x1, col, plank = '#a98457') {
  ctx.fillStyle = col; ctx.fillRect(x0, GROUND, x1 - x0, 600);
  for (let k = 0; k < 6; k++) line(seg(x0, GROUND + 30 + k * k * 8 + k * 14, x1, GROUND + 30 + k * k * 8 + k * 14), 1.2, plank, { amp: .4, alpha: .6 });
  cut(rrect(x0, GROUND - 20, x1 - x0, 20, 2), '#f2ecdd', { line: C.line, w: 1.4, amp: .3, shadow: false });
  line(seg(x0, GROUND, x1, GROUND), 2, C.line, { amp: .4 });
}
function windowFrame(x, y, w, h, t, night) {
  const sk = skyAt(t);
  cut(rrect(x, y, w, h, 4), sk[0], { line: null, shadow: false, amp: 0 });
  cut(rrect(x, y + h * .5, w, h * .5, 4), sk[2], { line: null, shadow: false, amp: 0 });
  clipTo(rrect(x, y, w, h, 4));
  const n = nightAt(t);
  for (let i = 0; i < 6; i++) { const bw = w / 5, bh = 40 + hash(i * 3 + 4) * 90; cut(rrect(x + i * bw * .9 - 8, y + h - bh, bw, bh + 4, 2), mix('#aebfc4', '#1f2748', n * .8), { line: null, shadow: false, amp: 0 }); }
  unclip();
  cut(rrect(x, y, w, h, 4), 'rgba(0,0,0,0)', { line: C.line, w: 4, shadow: .8, amp: .4 });
  line(seg(x + w / 2, y, x + w / 2, y + h), 4, C.line, { amp: .3 }); line(seg(x, y + h / 2, x + w, y + h / 2), 4, C.line, { amp: .3 });
}
function clockFace(x, y, r, hours, o = {}) {
  cut(circ(x, y, r), o.face || C.white, { line: C.line, w: o.w ?? 2.6, shadow: .8, amp: .4 });
  for (let k = 0; k < 12; k++) { const a = k / 12 * TAU; line(seg(x + Math.cos(a) * r * .82, y + Math.sin(a) * r * .82, x + Math.cos(a) * r * .92, y + Math.sin(a) * r * .92), r > 30 ? 2 : 1.2, C.line, { amp: .1 }); }
  const hr = (hours % 12) / 12 * TAU - Math.PI / 2, mn = (hours % 1) * TAU - Math.PI / 2;
  line(seg(x, y, x + Math.cos(hr) * r * .5, y + Math.sin(hr) * r * .5), r * .09 + 1.5, C.line, { amp: .1 });
  line(seg(x, y, x + Math.cos(mn) * r * .78, y + Math.sin(mn) * r * .78), r * .06 + 1, C.line, { amp: .1 });
  dot(x, y, r * .07, C.redD);
}

// ---------- red pencil icons ----------
function place(shape, cx, cy, sc = 1) {
  return subs(shape).map(s => { const p = s.p.slice(); for (let k = 0; k < p.length; k += 2) { p[k] = cx + p[k] * sc; p[k + 1] = cy + p[k + 1] * sc; } return { p, c: s.c }; });
}
function boatShapes() {
  return [curve(-62, 0, -44, 36, 44, 36, 66, 0), seg(-62, 0, 66, 0), seg(2, 0, 2, -104), poly([8, -100, 8, -16, 64, -16], true), poly([-4, -96, -4, -30, -44, -30], true),
    curve(-96, 52, -70, 40, -56, 64, -30, 52), curve(30, 54, 56, 42, 70, 66, 100, 54), circ(72, -92, 18)];
}
function boat(cx, cy, sc, u, o = {}) { sketch(place(boatShapes(), cx, cy, sc), u, Object.assign({ w: 4 }, o)); }
function officeIcon(cx, cy, sc, t0, t) {
  const u = (a, b) => inv(t0 + a, t0 + b, t);
  sketch(place([rrect(-52, -110, 104, 150, 3)], cx, cy, sc), u(0, .8), { w: 3.6 });
  const wins = []; for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) wins.push(rrect(-38 + c * 30, -94 + r * 32, 18, 18, 2));
  sketch(place(wins, cx, cy, sc), u(.7, 1.6), { w: 3 });
  sketch(place([circ(96, -70, 30), seg(96, -70, 96, -92), seg(96, -70, 112, -62)], cx, cy, sc), u(1.5, 2.2), { w: 3.4 });
  sketch(place([rrect(70, 6, 74, 12, 2), rrect(66, 20, 82, 12, 2), rrect(72, 34, 70, 12, 2), rrect(68, 48, 78, 12, 2)], cx, cy, sc), u(2.1, 2.8), { w: 3 });
}
function scallop(cx, cy, rx, ry) {
  const p = [];
  for (let k = 0; k <= 90; k++) { const a = k / 90 * TAU, f = 1 + .11 * Math.abs(Math.sin(a * 4.5)); p.push(cx + Math.cos(a) * rx * f, cy + Math.sin(a) * ry * f); }
  return { p, c: true };
}
function thoughtCloud(cx, cy, rx, ry, tx, ty, u) {
  sketch([circ(tx, ty, 8), circ(lerp(tx, cx, .3), lerp(ty, cy, .3) + 4, 12)], inv(0, .12, u), { w: 3.4, amp: .5 });
  sketch(scallop(cx, cy, rx, ry), inv(.08, .5, u), { w: 3.6, amp: .9 });
}

// ---------- phone ----------
function phone(cx, cy, sc, screenFn, o = {}) {
  push(cx, cy, sc, o.rot || 0);
  cut(rrect(-100, -190, 200, 380, 26), '#2a2a34', { line: C.line, w: 3, shadow: 1, amp: .5 });
  cut(rrect(-88, -168, 176, 336, 14), o.screen || '#f4f1e8', { line: null, shadow: false, amp: 0 });
  clipTo(rrect(-88, -168, 176, 336, 14)); if (screenFn) screenFn(); unclip();
  cut(rrect(-24, -182, 48, 8, 4), '#15151c', { line: null, shadow: false, amp: 0 });
  pop();
}

// ---------- captions and stamps ----------
function pill(x, y, w, h, col = C.paper, a = .88) {
  ctx.globalAlpha = a; cut(rrect(x - w / 2, y - h / 2, w, h, 16), col, { line: null, shadow: .4, amp: .3 }); ctx.globalAlpha = 1;
}
function stamp(t, tone) {
  const s = hhmm(clockAt(t));
  ctx.font = `40px ${HAND}`; const w = ctx.measureText(s).width + 70;
  pill(30 + w / 2, 62, w, 62, tone === 'night' ? '#39426f' : C.paper, .86);
  clockFace(64, 62, 19, clockAt(t), { w: 1.8, face: C.white });
  hand(s, 90, 76, 40, tone === 'night' ? '#f6efd0' : C.line, 'left');
}
function caption(text, t, a, b, size = 38, y = 1044, col = C.line, night) {
  if (t < a || t > b) return;
  const al = Math.min(inv(a, a + .35, t), inv(b, b - .45, t)), shown = typed(text, t, a, a + Math.min(1.6, (b - a) * .55));
  ctx.font = `${size}px ${HAND}`; const w = ctx.measureText(text).width + 56;
  pill(540, y - size * .34, w, size * 1.5, night ? '#39426f' : C.paper, .88 * al);
  ctx.globalAlpha = al; hand(shown, 540, y, size, night ? '#f6efd0' : col); ctx.globalAlpha = 1;
}
