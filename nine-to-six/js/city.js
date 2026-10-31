// Scene 2: the street outside. Shops, a bun stall, taxis that never stop, and the way down to the metro.
const S2 = 30.5; // scene start
const STALL_X = 560, CABSTOP_X = 1000, METRO_X = 1720;

function shopRow(t, camX, night) {
  const cell = 270, a = Math.floor(viewL() / cell) - 1, b = Math.ceil(viewR() / cell) + 1;
  const pal = ['#e8cbb0', '#c9d6c3', '#dcc9dc', '#f0dfae', '#b9cfd6', '#e6b9a6'];
  for (let i = a; i <= b; i++) {
    const x = i * cell, w = cell - 14 + hash(i * 3) * 14, h = 330 + hash(i * 7) * 120, col = mix(pal[Math.floor(hash(i) * pal.length)], '#232a4c', night * .7);
    cut(rrect(x, GROUND - h, w, h, 2), col, { pat: 'ldots', line: C.line, w: 1.6, amp: .5, shadow: .5 });
    const rows = Math.floor((h - 130) / 70);
    for (let r = 0; r < rows; r++) for (let c = 0; c < 3; c++) {
      const lit = night > 0 && hash(i * 31 + r * 7 + c) < .5;
      cut(rrect(x + 22 + c * ((w - 44) / 3), GROUND - h + 24 + r * 70, (w - 44) / 3 - 14, 44, 3), lit ? '#f4d28a' : mix('#b9d6e2', '#3a4272', night), { line: C.line, w: 1.4, amp: .3, shadow: false });
    }
    const aw = ['#c8463b', '#3f8a86', '#e2b446', '#28416f'][Math.floor(hash(i * 5) * 4)];
    cut(poly([x + 8, GROUND - 150, x + w - 8, GROUND - 150, x + w, GROUND - 112, x, GROUND - 112], true), aw, { pat: 'stripe', line: C.line, w: 1.5, amp: .3 });
    cut(rrect(x + 18, GROUND - 110, w - 36, 110, 2), mix('#fdf3d8', '#3a3a5c', night * .8), { line: C.line, w: 1.4, amp: .3, shadow: false });
    cut(rrect(x + w * .55, GROUND - 100, 44, 100, 2), C.woodD, { line: C.line, w: 1.4, amp: .3, shadow: false });
    if (hash(i * 9) < .5) { const nm = ['CAFE', 'PHARMACY', 'BOOKS', 'SALON', 'KIRANA', 'BANK'][Math.floor(hash(i * 13) * 6)]; hand(nm, x + w / 2, GROUND - 158, 30, mix(C.line, '#f6efd0', night)); }
  }
}

function lamp(x, night) {
  cut(rrect(x - 5, GROUND - 330, 10, 330, 2), '#4a4a54', { line: C.line, w: 1.4, amp: .3 });
  cut(poly([x - 6, GROUND - 336, x + 60, GROUND - 336, x + 60, GROUND - 326, x - 6, GROUND - 324], true), '#4a4a54', { line: C.line, w: 1.4, amp: .3 });
  cut(ell(x + 52, GROUND - 322, 18, 8), night > 0 ? '#ffe9a0' : '#e8e4d8', { line: C.line, w: 1.4, amp: .2, shadow: false });
  if (night > 0) { ctx.globalAlpha = .22 * night; cut(poly([x + 40, GROUND - 316, x + 66, GROUND - 316, x + 130, GROUND + 60, x - 20, GROUND + 60], true), '#ffe9a0', { line: null, shadow: false, amp: 0 }); ctx.globalAlpha = 1; }
}

function streetTree(x, id, t) {
  cut(limb([x, GROUND, x + 2, GROUND - 120, x, GROUND - 190], [22, 16, 12]), C.bark, { line: null, shadow: .6, amp: .4 });
  for (let i = 0; i < 16; i++) {
    const a = hash(id * 50 + i) * TAU, r = Math.sqrt(hash(id * 50 + i + 9)), lx = x + Math.cos(a) * r * 70, ly = GROUND - 230 + Math.sin(a) * r * 50;
    cut(leafShape(lx, ly, 46, 26, hash(id * 50 + i + 3) * TAU + Math.sin(t * 1.4 + i) * .1), C.leaves[Math.floor(hash(id * 50 + i + 5) * C.leaves.length)], { pat: PATS[Math.floor(hash(id * 50 + i * 3) * PATS.length)], w: 1.1, amp: .3, shadow: .5 });
  }
}

// a proper car: long low body, rounded cabin, wheel arches, lights; 780 px nose to tail at scale 1
function car(x, y, sc, o = {}) {
  const dir = o.dir ?? 1, body = o.col || '#e2b446', dark = '#2a2a34';
  push(x, y, dir * sc, 0, sc);
  ctx.fillStyle = 'rgba(40,30,20,.22)'; ctx.beginPath(); ctx.ellipse(0, 4, 400, 14, 0, 0, TAU); ctx.fill();
  const shell = 'M-392,-62 C-392,-108 -378,-128 -340,-134 L-262,-146 C-214,-228 -168,-248 -96,-248 L96,-248 C168,-248 214,-214 262,-150 L346,-136 C386,-128 394,-100 394,-62 L394,-34 L-392,-34 Z';
  cut(shell, body, { pat: o.taxi ? null : 'ldots', line: C.line, w: 2.4, amp: .4, shadow: .9 });
  if (o.taxi) { clipTo(shell); cut(rrect(-400, -112, 800, 18, 0), C.white, { pat: 'check', line: C.line, w: 1.4, amp: .3, shadow: false }); unclip(); }
  // windows: rear, front, with the driver and (when taken) a passenger
  cut('M-236,-150 C-204,-222 -168,-236 -110,-236 L-36,-236 L-36,-150 Z', '#b9d6e2', { line: C.line, w: 2, amp: .3, shadow: false });
  cut('M-16,-236 L96,-236 C150,-236 188,-208 222,-150 L-16,-150 Z', '#b9d6e2', { line: C.line, w: 2, amp: .3, shadow: false });
  cut(circ(120, -188, 20), FOLK_SKIN[1], { w: 1.4, amp: .3, shadow: false }); cut(dome(120, -192, 21, 22), '#2b2422', { w: 1.3, amp: .3, shadow: false });
  if (o.full) { cut(circ(-110, -186, 20), FOLK_SKIN[3], { w: 1.4, amp: .3, shadow: false }); cut(dome(-110, -190, 21, 22), '#4a3324', { w: 1.3, amp: .3, shadow: false }); }
  line('M-16,-236 L-16,-110 M-36,-150 L-36,-56', 2, C.line, { amp: .3 });
  line(seg(-200, -52, 252, -52), 1.6, 'rgba(58,47,40,.45)', { amp: .3 });
  cut(rrect(6, -128, 38, 8, 4), '#9a8a70', { line: C.line, w: 1.2, amp: .2, shadow: false });
  cut(rrect(-370, -50, 40, 22, 6), '#3a3b48', { line: C.line, w: 1.4, amp: .2, shadow: false });
  cut(rrect(352, -50, 44, 22, 6), '#3a3b48', { line: C.line, w: 1.4, amp: .2, shadow: false });
  cut('M372,-112 L394,-104 L394,-86 L368,-90 Z', '#fff6c0', { line: C.line, w: 1.4, amp: .2, shadow: false });
  cut('M-392,-116 L-372,-118 L-372,-92 L-392,-92 Z', '#d8483a', { line: C.line, w: 1.4, amp: .2, shadow: false });
  if (o.taxi) {
    cut(rrect(-44, -272, 88, 28, 6), C.white, { line: C.line, w: 2, amp: .3 }); hand('TAXI', 0, -250, 24, C.line);
    cut(circ(-58, -258, 7), o.full ? C.red : '#5fcf7a', { line: C.line, w: 1.2, amp: .2, shadow: false });
  }
  for (const wx of [-250, 252]) {
    cut(circ(wx, -34, 70), dark, { line: null, shadow: false, amp: 0 });
    cut(circ(wx, -34, 56), '#1f1f27', { line: C.line, w: 2, amp: .3, shadow: false });
    cut(circ(wx, -34, 32), '#c9c4b8', { pat: 'net', line: C.line, w: 1.4, amp: .2, shadow: false });
    dot(wx, -34, 7, '#7d7a72');
  }
  pop();
}

function stall(t, cx = STALL_X + 120, label = 'HOT BUNS', canopy = '#c8463b', glow = 0) {
  const x = cx;
  cut(rrect(x - 90, GROUND - 150, 180, 150, 6), C.woodD, { pat: 'stripe', line: C.line, w: 2, amp: .4 });
  cut(rrect(x - 104, GROUND - 168, 208, 22, 6), C.wood, { line: C.line, w: 2, amp: .3 });
  cut(circ(x - 60, GROUND, 24), '#2a2a34', { line: C.line, w: 1.8, amp: .3 }); cut(circ(x + 60, GROUND, 24), '#2a2a34', { line: C.line, w: 1.8, amp: .3 });
  cut(rrect(x - 40, GROUND - 210, 80, 44, 8), '#d7d2c6', { pat: 'ldots', line: C.line, w: 1.8, amp: .3 });
  for (let k = 0; k < 3; k++) { const p = (t * .6 + k / 3) % 1; ctx.globalAlpha = 1 - p; cut(circ(x - 20 + k * 20 + Math.sin(p * 5 + k) * 6, GROUND - 216 - p * 70, 9 + p * 12), '#fbf8f0', { line: '#c9c4b8', w: 1.2, shadow: false, amp: .6 }); ctx.globalAlpha = 1; }
  // umbrella
  line(seg(x + 70, GROUND - 168, x + 70, GROUND - 330), 5, C.line, { amp: .3 });
  cut(dome(x + 70, GROUND - 320, 150, 60), canopy, { pat: 'stripe', line: C.line, w: 2, amp: .4, shadow: .8 });
  hand(label, x - 4, GROUND - 100, 26, C.cream);
  if (glow > 0) { ctx.globalAlpha = .2 * glow; cut(poly([x - 60, GROUND - 260, x + 180, GROUND - 260, x + 260, GROUND + 40, x - 140, GROUND + 40], true), '#ffe9a0', { line: null, shadow: false, amp: 0 }); ctx.globalAlpha = 1; }
  folk(x + 22, GROUND, .95, 88, { dir: -1, shirt: '#f6efd0', phone: false, bag: false, t });
}

function metroEntrance(t) {
  const x = METRO_X;
  cut(poly([x - 20, GROUND, x + 60, GROUND - 320, x + 330, GROUND - 320, x + 330, GROUND], true), '#c9c4d6', { pat: 'grid', line: C.line, w: 2, amp: .5, shadow: .9 });
  cut(poly([x + 40, GROUND, x + 92, GROUND - 250, x + 300, GROUND - 250, x + 300, GROUND], true), '#2a2a3c', { line: C.line, w: 2, amp: .4, shadow: false });
  for (let k = 0; k < 6; k++) line(seg(x + 60 + k * 14, GROUND - 6 - k * 34, x + 300, GROUND - 6 - k * 34), 2, '#5a5a74', { amp: .3 });
  cut(circ(x + 170, GROUND - 372, 50), C.red, { line: C.line, w: 2.4, amp: .4, shadow: .9 });
  hand('M', x + 170, GROUND - 354, 66, C.white);
  cut(rrect(x + 60, GROUND - 320, 230, 44, 6), C.navy, { line: C.line, w: 1.8, amp: .3 });
  hand('METRO', x + 175, GROUND - 288, 32, C.cream);
}

function phoneCabUI(t) {
  const a = 39.4, u = k => inv(a + k, a + k + .5, t);
  ctx.fillStyle = '#eaf0e6'; ctx.fillRect(-88, -168, 176, 336);
  // map
  for (let k = -3; k <= 3; k++) { line(seg(-88, k * 24 - 40, 88, k * 24 - 40 + k * 4), 6, '#fbf8f0', { amp: .2 }); line(seg(k * 26, -168, k * 26 + 10, 60), 6, '#fbf8f0', { amp: .2 }); }
  for (let k = 0; k < 4; k++) { const cx = -60 + ((t * 30 + k * 60) % 140), cy = -110 + k * 34; cut(rrect(cx - 9, cy - 5, 18, 10, 3), '#e2b446', { line: '#3a2f28', w: 1, amp: 0, shadow: false }); }
  cut(circ(0, -40, 9), C.red, { line: C.line, w: 1.4, amp: .1, shadow: false });
  // card
  cut(rrect(-88, 40, 176, 128, 0), C.white, { line: null, shadow: false, amp: 0 });
  hand('RideNow', 0, -146, 24, C.line);
  if (t < a + 1.6) { hand('Finding a cab' + '.'.repeat(1 + Math.floor(t * 3) % 3), 0, 84, 24, C.line); }
  else {
    hand('Sedan  ·  42 min away', 0, 76, 21, C.line);
    ctx.globalAlpha = u(1.7); hand('₹ 899', -36, 116, 40, C.line);
    cut(rrect(20, 96, 60, 28, 8), C.red, { line: null, shadow: false, amp: 0 }); hand('2.8x', 50, 118, 22, C.white); ctx.globalAlpha = 1;
    ctx.globalAlpha = u(2.4); cut(rrect(-70, 130, 140, 30, 10), '#2a7d6c', { line: null, shadow: false, amp: 0 }); hand('BOOK', 0, 153, 22, C.white); ctx.globalAlpha = 1;
  }
}

function heroStreet(t) {
  const S = { vis: true, x: 110, P: Object.assign({}, STAND), o: { id: true, bag: true, t }, flip: false, phone: false };
  const walk = (x0, x1, ta, tb, rate = 1.55, lean = .12, amp = 1) => { S.x = lerp(x0, x1, inv(ta, tb, t)); S.P = walkPose(S.x / (STRIDE * amp), { lean, amp }); };
  if (t < 30.7) { S.vis = false; return S; }
  if (t < 33.6) { walk(110, STALL_X, 30.7, 33.6, 1.9, .16, 1.1); S.P.eye = .5; return S; }
  if (t < 35.4) { // buys a bun
    S.x = STALL_X;
    const reach = kf([[33.6, 0], [34.1, 1], [34.6, 1], [35.0, 0]], t);
    S.P = mixP(walkPose(S.x / (STRIDE * 1.1), { lean: .12, amp: 1.1 }), Object.assign({}, STAND, { lean: .08, a1: [lerp(10, 92, reach), lerp(-124, -170, reach)], eye: .3 }), ease(inv(33.6, 34.1, t)));
    S.o.h1 = t < 34.6 ? () => cut(rrect(-4, -8, 44, 20, 2), '#7fb069', { pat: 'grid', line: C.line, w: 1.2, amp: .2, shadow: false }) : () => bunProp(0);
    return S;
  }
  if (t < 38.9) { // eats as he walks
    walk(STALL_X, CABSTOP_X, 35.4, 38.9, 1.5, .06, .8);
    const eaten = inv(35.6, 38.4, t), b = bite(t, .55);
    S.P.a1 = [lerp(44, 70, b.lift), lerp(-196, -240, b.lift)]; S.P.mouth = b.chew ? 'chew' : 'flat'; S.P.tilt = .04 + .06 * b.lift; S.P.eye = .45;
    S.o.h1 = () => bunProp(eaten); S.o.t = t; return S;
  }
  if (t < 44.6) { // stands at the kerb with his phone
    S.x = CABSTOP_X; S.phone = t > 39.2 && t < 43.6;
    const up = kf([[38.9, 0], [39.4, 1], [43.4, 1], [44, 0]], t);
    S.P = mixP(walkPose(S.x / (STRIDE * .8), { lean: .06, amp: .8 }), Object.assign({}, STAND, { lean: .06, a1: [lerp(10, 66, up), lerp(-124, -232, up)], tilt: .16 * up, eye: .45, mouth: t > 43.6 ? 'sigh' : 'flat', brow: t > 42.8 ? -3 : 0 }), ease(inv(38.9, 39.5, t)));
    S.o.h1 = up > .6 ? () => { cut(rrect(-9, -26, 20, 36, 4), '#2a2a34', { w: 1.2, amp: .2, shadow: false }); cut(rrect(-6, -22, 14, 28, 2), '#a8d4ff', { line: null, shadow: false, amp: 0 }); } : null;
    return S;
  }
  walk(CABSTOP_X, METRO_X + 130, 44.6, 48.6, 1.6, .14, 1.05);
  S.P.eye = .55; S.P.mouth = 'flat';
  if (t > 48.6) S.vis = false;
  return S;
}
function bunProp(bite) {
  cut(ell(14, -4, 22 - bite * 12, 15 - bite * 5), '#d9a25f', { pat: 'dots', line: C.line, w: 1.4, amp: .3, shadow: false });
  cut(rrect(-4, 2, 30, 14, 2), C.white, { line: C.line, w: 1.2, amp: .2, shadow: false });
}

function streetScene(t, camX) {
  const night = nightAt(t);
  cityBackdrop(t, camX, 1, 850, '#d6cfbf');
  view(camX, 1, 850);
  shopRow(t, camX, night);
  streetTree(280, 1, t); streetTree(1380, 2, t); streetTree(2100, 3, t);
  lamp(820, night); lamp(1500, night);
  // apartment building door at the start
  cut(rrect(-220, GROUND - 520, 340, 520, 4), '#dcc9b0', { pat: 'grid', line: C.line, w: 2, amp: .5, shadow: .9 });
  cut(rrect(30, GROUND - 190, 90, 190, 4), '#fdf3c8', { line: C.line, w: 2, amp: .4, shadow: false });
  hand('HOME', -60, GROUND - 300, 40, C.line);
  stall(t);
  metroEntrance(t);
  // pavement and road
  const x0 = viewL() - 20, x1 = viewR() + 20;
  cut(rrect(x0, GROUND, x1 - x0, 46, 0), '#e7dfcf', { pat: 'dots', line: C.line, w: 1.6, amp: .4, shadow: false });
  cut(rrect(x0, GROUND + 46, x1 - x0, 240, 0), '#8b8783', { pat: 'speck', line: C.line, w: 1.6, amp: .4, shadow: false });
  for (let x = Math.floor(x0 / 120) * 120; x < x1; x += 120) cut(rrect(x, GROUND + 160, 60, 8, 2), '#f2ecdc', { line: null, shadow: false, amp: 0 });
  // taxis, all taken
  const cars = [[31.5, 1, 0], [36.2, -1, 1], [40.4, 1, 2], [44.3, -1, 3], [47.2, 1, 4]];
  for (const [t0, dir, id] of cars) {
    const age = t - (S2 + t0 - 30.5 + 0); if (age < 0 || age > 5) continue;
    const x = dir > 0 ? camX - 900 + age * 480 : camX + 900 - age * 480;
    car(x, GROUND + 214, .78, { dir, taxi: id % 2 === 0, full: true, col: id % 3 === 0 ? '#c8463b' : '#e2b446' });
  }
  // people going the other way
  for (let i = 0; i < 5; i++) {
    const dir = i % 2 ? 1 : -1, sp = 70 + hash(i) * 40, base = 300 + i * 380, px = base + ((t * sp * dir) % 400);
    if (px > 120 && px < 2100) folk(px, GROUND + 6 + (i % 2) * 10, .9, 100 + i, { dir, walk: true, t, phone: i % 2 === 0 });
  }
  const H1 = heroStreet(t);
  if (H1.vis) man(H1.x, GROUND + 4, 1, H1.P, Object.assign({ flip: H1.flip, t }, H1.o));
  if (t > 34.4 && t < 35.4) hand('thanks!', H1.x + 40, GROUND - 320, 30, C.sketch);
  if (t > 39.2 && t < 43.9) {
    screen();
    const k = backOut(inv(39.2, 39.7, t)) * (1 - inv(43.3, 43.9, t));
    ctx.globalAlpha = .55 * k; ctx.fillStyle = '#3a2f28'; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1;
    phone(540, 520, 1.55 * k, () => phoneCabUI(t));
    if (t > 42.6) { const s = backOut(inv(42.6, 43, t)); push(540, 860, s); hand('No cabs. Surge pricing.', 0, 0, 44, '#fff2b0'); pop(); }
  }
  if (t > 48.4) { screen(); ctx.globalAlpha = inv(48.4, 49.9, t); ctx.fillStyle = '#2a2a3c'; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
}
