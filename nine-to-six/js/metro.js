// Scene 3: the metro. Platform and boarding, the packed carriage, and the train crossing the city.
const PLAT_T0 = 50, INSIDE_T0 = 57.4, VIA_T0 = 72, VIA_T1 = 80;
const DOORS = [480, 780, 1060];

function metroCar(x, t, open, o = {}) {
  const L = 560, top = GROUND - 300, bot = GROUND - 40, col = o.col || '#e9eef0';
  // bogies and wheels
  for (const bx of [x + 90, x + L - 190]) { cut(rrect(bx, bot, 100, 18, 4), '#3a3b48', { line: C.line, w: 1.5, amp: .3, shadow: false }); for (const wx of [20, 80]) cut(circ(bx + wx, GROUND - 12, 20), '#2a2a34', { line: C.line, w: 1.8, amp: .3, shadow: false }); }
  const body = rrect(x, top, L, bot - top, 28);
  cut(body, col, { pat: 'ldots', line: C.line, w: 2.4, amp: .5, shadow: 1 });
  clipTo(body);
  cut(rrect(x, GROUND - 150, L, 34, 0), o.band || C.red, { line: C.line, w: 1.4, amp: .3, shadow: false });
  cut(rrect(x, GROUND - 112, L, 10, 0), C.gold, { line: null, shadow: false, amp: 0 });
  cut(rrect(x, top, L, 26, 0), '#c9d3d8', { line: C.line, w: 1.4, amp: .3, shadow: false });
  unclip();
  // windows with the heads of people inside
  for (const [wx, ww] of [[18, 74], [215, 150], [488, 54]]) {
    cut(rrect(x + wx, top + 46, ww, 110, 10), o.night ? '#f4d28a' : '#b9d6e2', { line: C.line, w: 1.8, amp: .3, shadow: false });
    for (let k = 0; k < Math.max(1, Math.floor(ww / 60)); k++) {
      const hx = x + wx + 30 + k * 60, c = FOLK_HAIR[Math.floor(hash(wx + k + (o.id || 0)) * 5)];
      cut(circ(hx, top + 138, 20), FOLK_SKIN[Math.floor(hash(wx + k * 3) * 5)], { w: 1.3, amp: .3, shadow: false });
      cut(dome(hx, top + 134, 21, 20), c, { w: 1.2, amp: .3, shadow: false });
    }
  }
  // sliding doors
  for (const dx of [100, 380]) {
    const dxa = x + dx;
    cut(rrect(dxa, top + 26, 100, bot - top - 26, 4), '#f5efdc', { pat: 'grid', line: C.line, w: 1.8, amp: .3, shadow: false });
    if (open > 0) { line(seg(dxa + 50, top + 34, dxa + 50, bot - 6), 5, '#b9b9c2', { amp: .2 }); }
    const pw = 50 * (1 - open);
    if (pw > 1) {
      for (const side of [0, 1]) {
        const px = side ? dxa + 100 - pw : dxa;
        cut(rrect(px, top + 26, pw, bot - top - 26, 3), '#c9d6dc', { pat: 'stripe', line: C.line, w: 1.8, amp: .3, shadow: false });
        if (pw > 24) cut(rrect(px + (side ? 6 : pw - 6 - Math.min(pw - 12, 24)), top + 50, Math.min(pw - 12, 24), 76, 5), '#b9d6e2', { line: C.line, w: 1.4, amp: .2, shadow: false });
      }
    }
  }
  // coupling
  cut(rrect(x + L - 4, GROUND - 100, 30, 26, 4), '#2a2a34', { line: C.line, w: 1.4, amp: .2, shadow: false });
}

function stationBackdrop(t) {
  screen();
  ctx.fillStyle = '#7fa6a8'; ctx.fillRect(0, 0, W, H);
  view(800, 1, 850);
  ctx.fillStyle = '#7fa6a8'; ctx.fillRect(-200, -300, 2400, GROUND + 300);
  ctx.fillStyle = pattern('grid'); ctx.globalAlpha = .9; ctx.fillRect(-200, -300, 2400, GROUND + 300); ctx.globalAlpha = 1;
  ctx.fillStyle = '#2f3a4a'; ctx.fillRect(-200, -300, 2400, 360);
  for (let x = 120; x < 1600; x += 340) { cut(rrect(x, 40, 200, 12, 4), '#fff7c8', { line: null, shadow: false, amp: 0 }); ctx.globalAlpha = .13; cut(poly([x, 52, x + 200, 52, x + 300, 420, x - 100, 420], true), '#fff7c8', { line: null, shadow: false, amp: 0 }); ctx.globalAlpha = 1; }
  // pillars and posters
  for (const px of [330, 930, 1530]) cut(rrect(px - 34, 60, 68, 800, 2), '#c9c4b8', { pat: 'ldots', line: C.line, w: 2, amp: .4, shadow: .8 });
  const posters = [[560, 210, '#e9a7a4', 'SALE'], [1200, 200, '#9fcbe0', 'TRAVEL'], [180, 210, '#e2b446', 'PIZZA']];
  for (const [px, py, pc, tx] of posters) { cut(rrect(px - 70, py, 140, 190, 4), pc, { pat: 'flower', line: C.line, w: 2, amp: .4, shadow: .6 }); cut(rrect(px - 54, py + 14, 108, 40, 4), C.white, { line: C.line, w: 1.4, amp: .3, shadow: false }); hand(tx, px, py + 46, 30, C.redD); }
  // destination board
  cut(rrect(640, 92, 320, 78, 8), '#15151c', { line: C.line, w: 2, amp: .3, shadow: .8 });
  hand('Platform 2', 800, 128, 30, '#ffd66b'); hand(t < 53 ? 'Next train: 1 min' : 'Doors opening', 800, 160, 26, '#ffd66b');
  // floor
  const y0 = GROUND + 46;
  ctx.fillStyle = '#8f8d92'; ctx.fillRect(-200, GROUND, 2400, 600);
  ctx.fillStyle = '#2c2c34'; ctx.fillRect(-200, GROUND - 4, 2400, 50);
  cut(rrect(-200, y0, 2400, 16, 0), '#f2c94c', { pat: 'stripe', line: C.line, w: 1.4, amp: .3, shadow: false });
  hand('MIND THE GAP', 800, y0 + 40, 26, '#f2c94c');
  for (const px of [330, 930, 1530]) cut(rrect(px - 34, GROUND + 46, 68, 12, 0), '#a9a7ad', { line: null, shadow: false });
}

function platformScene(t) {
  stationBackdrop(t);
  const arrive = ease(inv(51.2, 54.2, t)) , stopX = 50, trainX = lerp(stopX - 2300, stopX, 1 - Math.pow(1 - inv(51.2, 54.2, t), 2.4));
  const open = kf([[54.1, 0], [54.9, 1], [57.2, 1]], t);
  for (let i = 0; i < 3; i++) metroCar(trainX + i * 580, t, open, { id: i });
  // motion streaks while it slows
  const sp = 1 - inv(51.2, 54.2, t);
  if (t > 51.2 && sp > .05) for (let k = 0; k < 6; k++) { const y = GROUND - 250 + k * 40; line(seg(trainX + 1800 + k * 30, y, trainX + 1800 + 200 + k * 30, y), 3, '#ffffff', { alpha: sp * .7, amp: .2 }); }
  // the crowd on the platform
  const people = [];
  for (let i = 0; i < 17; i++) {
    const x0 = 360 + hash(i * 3 + 1) * 860, lane = GROUND + 96 + Math.floor(hash(i * 7) * 3) * 26, id = 200 + i;
    const door = DOORS.reduce((a, b) => Math.abs(b - x0) < Math.abs(a - x0) ? b : a);
    const u = ease(inv(54.7 + hash(i * 5) * 1.6, 55.9 + hash(i * 5) * 1.6, t));
    people.push({ id, x: lerp(x0, door + (hash(i * 9) - .5) * 62, u), y: lerp(lane, GROUND - 26 + hash(i * 13) * 26, u), sc: lerp(1, .68, u), a: 1, inside: u > .55, phone: hash(i * 11) < .6 && u < .2 });
  }
  const hu = ease(inv(56, 57.2, t)), hx0 = lin([[50.4, 250], [52.4, 640], [55.9, 640]], t);
  const hero = { x: lerp(hx0, 790, hu), y: lerp(GROUND + 118, GROUND - 2, hu), sc: lerp(1, .7, hu), a: 1 };
  const all = people.map(p => Object.assign(p, { kind: 'f' }));
  all.push(Object.assign(hero, { kind: 'h' }));
  all.sort((a, b) => a.y - b.y);
  for (const p of all) fade(p.a, () => {
    if (p.kind === 'f') folk(p.x, p.y, p.sc, p.id, { dir: p.x < 500 ? 1 : (hash(p.id) < .5 ? -1 : 1), phone: p.phone || t < 54.5 && hash(p.id * 3) < .6, sway: 2, t, walk: t > 54.7 && p.a > .2 && p.y < GROUND + 90 });
    else {
      const P = t < 52.6 ? walkPose(p.x / (STRIDE * .8), { lean: .08, amp: .8 }) : Object.assign({}, STAND, { lean: .04, eye: .55, mouth: 'flat', a1: [40, -226], tilt: .1 });
      if (t >= 52.6 && t < 54.7) P.mo = 0;
      if (t >= 55.9) Object.assign(P, walkPose(p.x / (STRIDE * .7), { lean: .12, amp: .7 }));
      man(p.x, p.y, p.sc * 1.02, P, { bag: true, id: true, t, h1: t >= 52.6 && t < 54.7 ? () => { cut(rrect(-9, -26, 20, 36, 4), '#2a2a34', { w: 1.2, amp: .2, shadow: false }); cut(rrect(-6, -22, 14, 28, 2), '#a8d4ff', { line: null, shadow: false, amp: 0 }); } : null });
    }
  });
  if (t > 55 && t < 57.2) hand('push... push...', 780, 520, 34, C.sketch);
  if (t < 51.4) { screen(); ctx.globalAlpha = 1 - inv(50, 51.2, t); ctx.fillStyle = '#2a2a3c'; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
}

// ---------- inside the carriage ----------
const STATIONS = ['Old Market', 'City Hall', 'Rajiv Chowk', 'Tech Park', 'Central Park'];
function windowsOutside(t, t0, tunnel, stopped) {
  const sk = skyAt(t), n = nightAt(t), speed = stopped ? 0 : 340;
  const wins = [[140, 300, 180, 210], [360, 300, 180, 210], [580, 300, 180, 210], [800, 300, 180, 210]];
  clipTo(wins.map(w => rrect(w[0], w[1], w[2], w[3], 10)));
  ctx.fillStyle = tunnel ? '#1b1b26' : sk[0]; ctx.fillRect(100, 300, 1000, 210);
  if (!tunnel) {
    ctx.fillStyle = sk[2]; ctx.fillRect(100, 400, 1000, 110);
    for (let i = -2; i < 16; i++) {
      const bw = 90 + hash(i * 3) * 50, x = ((i * 150 - (t - t0) * speed) % 2400 + 2400) % 2400 - 200, h = 60 + hash(i * 5) * 130;
      ctx.fillStyle = mix('#a5b9be', '#1f2748', n * .8); ctx.fillRect(x, 510 - h, bw, h);
      for (let r = 0; r < h / 26; r++) for (let c = 0; c < bw / 24; c++) { ctx.fillStyle = n > 0 && hash(i * 91 + r * 7 + c) < .5 ? '#f4d28a' : 'rgba(255,255,255,.4)'; ctx.fillRect(x + 8 + c * 24, 510 - h + 8 + r * 26, 12, 12); }
    }
  } else {
    for (let i = 0; i < 12; i++) { const x = ((i * 240 - (t - t0) * 700) % 2400 + 2400) % 2400 - 200; ctx.fillStyle = '#ffe9a0'; ctx.fillRect(x, 360, 46, 8); ctx.fillStyle = 'rgba(255,233,160,.25)'; ctx.fillRect(x - 60, 364, 170, 3); }
  }
  unclip();
  for (const w of wins) cut(rrect(w[0], w[1], w[2], w[3], 10), 'rgba(0,0,0,0)', { line: C.line, w: 4, amp: .3, shadow: .6 });
}

function carriage(t, o = {}) {
  const t0 = o.t0, sway = Math.sin(t * 3.1) * 5 + Math.sin(t * 7.3) * 1.5, ov = -200, wd = 1500;
  const night = nightAt(t) > .5 ? 1 : 0;
  screen(); ctx.fillStyle = '#6b6f73'; ctx.fillRect(0, 0, W, H);
  view(540 + sway * .6, 1, 850);
  // wall, curved ceiling, floor
  ctx.fillStyle = '#d4dad8'; ctx.fillRect(ov, -300, wd, GROUND + 300);
  ctx.fillStyle = '#eeebe0'; ctx.fillRect(ov, -300, wd, 470);
  cut(rrect(ov, 150, wd, 40, 0), '#c9c8bc', { line: null, shadow: .9, amp: 0 });
  ctx.fillStyle = '#b8bcbd'; ctx.fillRect(ov, 560, wd, GROUND - 560);
  ctx.fillStyle = pattern('grid'); ctx.globalAlpha = .35; ctx.fillRect(ov, 560, wd, GROUND - 560); ctx.globalAlpha = 1;
  // floor with rubber mat, joints and the yellow lines at the doors
  ctx.fillStyle = '#6b6f73'; ctx.fillRect(ov, GROUND, wd, 400);
  ctx.fillStyle = pattern('speck'); ctx.globalAlpha = .5; ctx.fillRect(ov, GROUND, wd, 400); ctx.globalAlpha = 1;
  for (let k = 0; k < 5; k++) line(seg(ov, GROUND + 26 + k * 44, ov + wd, GROUND + 26 + k * 44), 1.4, '#55595d', { amp: .3 });
  for (const dx of [-110, 1040]) cut(rrect(dx, GROUND + 4, 150, 14, 0), '#f2c94c', { pat: 'stripe', line: C.line, w: 1.2, amp: .2, shadow: false });
  line(seg(ov, GROUND, ov + wd, GROUND), 2, C.line, { amp: .4 });
  const stopped = o.stop && t > o.stop[0] && t < o.stop[1];
  // lights
  for (let x = -100; x < 1200; x += 300) {
    cut(rrect(x, 78, 200, 26, 12), '#fffbe0', { line: C.line, w: 1.6, amp: .3, shadow: false });
    ctx.globalAlpha = .1; cut(poly([x + 10, 104, x + 190, 104, x + 260, 560, x - 60, 560], true), '#fff7c8', { line: null, shadow: false, amp: 0 }); ctx.globalAlpha = 1;
    cut(rrect(x + 210, 84, 70, 14, 3), '#b8bcbd', { pat: 'stripe', line: C.line, w: 1.2, amp: .2, shadow: false });
  }
  // upper wall: line map and posters
  cut(rrect(250, 196, 560, 66, 6), C.white, { line: C.line, w: 2, amp: .3, shadow: .6 });
  line(seg(280, 232, 780, 232), 7, o.evening ? '#28416f' : C.red, { amp: .2 });
  const here = inv(t0, t0 + o.dur, t) * 9;
  for (let k = 0; k < 10; k++) { cut(circ(282 + k * 55.5, 232, 9), k <= here ? (o.evening ? '#28416f' : C.red) : C.white, { line: C.line, w: 2, amp: .15, shadow: false }); }
  hand('LINE 2', 340, 218, 18, C.line);
  for (const [px, pc, tx] of [[30, '#e9a7a4', 'SALE'], [880, '#9fcbe0', 'TRAVEL'], [1010, '#e2b446', 'PIZZA']]) { cut(rrect(px, 196, 100, 66, 3), pc, { pat: 'flower', line: C.line, w: 1.6, amp: .3, shadow: .4 }); hand(tx, px + 50, 238, 22, C.redD); }
  windowsOutside(t, t0, o.tunnel ? o.tunnel(t) : false, stopped);
  // the window reflections
  ctx.globalAlpha = .13;
  for (const wx of [140, 360, 580, 800]) cut(poly([wx + 20, 300, wx + 60, 300, wx + 20 + 70, 510, wx + 30, 510], true), '#ffffff', { line: null, shadow: false, amp: 0 });
  ctx.globalAlpha = 1;
  // doors at both ends of this stretch of carriage
  for (const dx of [-140, 1010]) {
    cut(rrect(dx, 186, 160, GROUND - 186, 6), '#c7d0d3', { pat: 'stripe', line: C.line, w: 2.4, amp: .4, shadow: .9 });
    cut(rrect(dx + 22, 250, 116, 300, 10), night ? '#3a4272' : '#b9d6e2', { line: C.line, w: 2, amp: .3, shadow: false });
    cut(rrect(dx + 76, 186, 8, GROUND - 186, 0), '#f2c94c', { line: null, shadow: false });
    cut(rrect(dx + 6, 600, 10, 160, 4), '#8f979c', { line: C.line, w: 1.2, amp: .2, shadow: false });
  }
  // led board
  const si = Math.min(STATIONS.length - 1, Math.floor((t - t0) / (o.dur / STATIONS.length)));
  cut(rrect(300, 112, 480, 52, 8), '#15151c', { line: C.line, w: 2, amp: .3, shadow: .8 });
  hand(`Next: ${STATIONS[(si + (o.evening ? 2 : 0)) % STATIONS.length]}`, 540, 148, 30, '#ffd66b');
  // ceiling rail, straps, poles
  line(seg(ov, 186, ov + wd, 186), 9, '#a9b4b8', { amp: .3 });
  for (let x = 30; x < 1100; x += 130) {
    const sw = Math.sin(t * 3 + x) * 6 + sway;
    line(seg(x, 190, x + sw, 480), 3, '#5a5a66', { amp: .2 });
    cut(poly([x + sw - 14, 470, x + sw + 14, 470, x + sw + 18, 520, x + sw - 18, 520], true), '#e2b446', { line: C.line, w: 1.6, amp: .3, shadow: .5 });
  }
  for (const px of [330, 760]) { cut(rrect(px - 6, 180, 12, 760, 4), '#d5dcdf', { line: C.line, w: 1.4, amp: .2, shadow: .6 }); cut(ell(px, 940, 26, 8), '#8f979c', { line: C.line, w: 1.2, amp: .2, shadow: false }); }
  // bench along the wall
  cut(rrect(ov, 640, wd, 116, 0), '#3f8a86', { pat: 'net', line: C.line, w: 2, amp: .4, shadow: false });
  cut(rrect(ov, 756, wd, 40, 4), '#2e6b68', { pat: 'stripe', line: C.line, w: 2, amp: .4, shadow: false });
  cut(rrect(ov, 796, wd, 54, 0), '#4d5558', { line: C.line, w: 1.6, amp: .3, shadow: false });
  for (let i = 0; i < 12; i++) { line(seg(-110 + i * 130, 640, -110 + i * 130, 796), 2, '#245551', { amp: .3 }); cut(rrect(-90 + i * 130, 812, 70, 20, 3), '#3b4244', { line: C.line, w: 1, amp: .2, shadow: false }); }
}

function carriageScene(t, evening) {
  const t0 = evening ? 128 : INSIDE_T0, dur = evening ? 8.5 : 14.6;
  carriage(t, { t0, dur, evening, tunnel: tt => !evening && tt < 60.2, stop: evening ? [132.8, 133.6] : [67.2, 68.2] });
  const seats = [130, 300, 470, 640, 810, 980];
  // seated commuters
  seats.forEach((sx, i) => {
    if (!evening && i === 3) {
      if (t < 61.6) folk(sx, GROUND + 4, 1, 41, { dir: 1, sit: true, phone: true, t, sway: 3 });
      else if (t > 63.2) { const u = inv(63.2, 63.8, t); folk(lerp(1150, sx, 1 - Math.pow(1 - u, 2)), GROUND + 4, 1.06, 77, { dir: 1, sit: u > .95, phone: false, t, walk: u < .95, sway: 3 }); }
    } else folk(sx + (i % 2) * 8, GROUND + 4, 1, 50 + i + (evening ? 30 : 0), { dir: i % 2 ? -1 : 1, sit: true, phone: hash(i + 3) < .8, t, sway: 3 });
  });
  // the man who gets up and leaves
  if (!evening && t >= 61.6 && t < 64) { const u = inv(61.6, 63, t); folk(lerp(640, 80, ease(u)), GROUND + 8, 1, 41, { dir: -1, walk: true, phone: true, t }); }
  // standing crowd
  const cr = [];
  const count = evening ? 22 : 15;
  for (let i = 0; i < count; i++) {
    const x = 20 + i * (1080 / count) + (hash(i * 7 + 3) - .5) * 40, y = GROUND + (hash(i * 13) < .5 ? 0 : 24) + (evening ? hash(i * 5) * 14 : 0);
    if (Math.abs(x - 560) < 62) continue;
    if (!evening && x > 650 && x < 790) continue;
    cr.push({ x, y, id: 300 + i + (evening ? 50 : 0) });
  }
  cr.sort((a, b) => a.y - b.y);
  const heroY = GROUND + 12;
  const heroPass = cr.filter(c => c.y <= heroY), heroFront = cr.filter(c => c.y > heroY);
  const sw = Math.sin(t * 3.1) * 5;
  const carSway = Math.sin(t * 3.1) * 5 + Math.sin(t * 7.3) * 1.5, strapSw = xs => Math.sin(t * 3 + xs) * 6 + carSway;
  const used = new Set([550]);
  for (const c of cr) {
    c.dir = hash(c.id) < .5 ? -1 : 1;
    const xs = 30 + 130 * Math.round((c.x - 30) / 130);
    if (hash(c.id * 5) < .6 && !used.has(xs) && Math.abs(xs - c.x) < 60) { used.add(xs); c.grip = true; c.x = xs + strapSw(xs) - c.dir * 12; } else c.x += sw * .5;
  }
  for (const c of heroPass) folk(c.x, c.y, 1.02, c.id, { dir: c.dir, grip: c.grip, phone: !c.grip && hash(c.id * 2) < .7, t, sway: 4 });
  // hero: one hand on the strap, phone in the other, knees soft and feet apart for balance
  const seatDrama = !evening && t > 62.3 && t < 64.6;
  const sS = strapSw(550), HX = 527;
  const P = Object.assign({}, STAND, { hy: -158 + Math.sin(t * 3.1 + 1) * 2, lean: .05 + sS * .004, f1: [-18, 0], f2: [28, 0], a1: [(550 + sS - HX) / 1.04, -346], a2: [60, -226], eye: .7, mouth: 'flat', tilt: .1 });
  let hx = HX;
  if (seatDrama) { const go = kf([[62.3, 0], [62.9, 1], [63.6, 1], [64.4, 0]], t); hx = HX + 40 * go; P.a1 = [lerp((550 + sS - HX) / 1.04, 64, go), lerp(-346, -132, go)]; P.f1 = [lerp(-18, -30, go), 0]; P.f2 = [lerp(28, 40, go), 0]; P.eye = t < 63.4 ? .05 : .8; P.mouth = t < 63.4 ? 'smile' : 'sad'; P.brow = t < 63.4 ? -3 : 3; P.look = 1; P.tilt = t < 63.4 ? -.05 : .2; }
  if (!evening && t > 64.6 && t < 68.6) P.eye = .45;
  const yawn = !evening && t > 69.4 && t < 71.2;
  if (yawn) { P.mouth = 'open'; P.mo = Math.sin(inv(69.4, 71.2, t) * Math.PI); P.eye = .95; P.tilt = -.12; }
  if (evening) { P.eye = .85; P.mouth = 'sad'; P.tilt = .24; P.lean += .05; P.brow = 4; P.a2 = [50, -150]; }
  const withPhone = !evening && t > 64.4 && t < 69;
  if (withPhone) P.a2 = [62, -238];
  man(hx, heroY, 1.04, P, { bag: true, id: true, t, h2: withPhone ? () => { cut(rrect(-9, -26, 20, 36, 4), '#2a2a34', { w: 1.2, amp: .2, shadow: false }); cut(rrect(-6, -22, 14, 28, 2), '#a8d4ff', { line: null, shadow: false, amp: 0 }); } : null });
  for (const c of heroFront) folk(c.x, c.y, 1.05, c.id, { dir: c.dir, grip: c.grip, phone: !c.grip && hash(c.id * 2) < .7, t, sway: 4 });
  if (evening) {
    // squashed against the doors: extra bodies in the foreground
    for (const px of [60, 300, 830, 1070]) folk(px + sw, GROUND + 70, 1.22, 400 + px, { dir: px % 2 ? -1 : 1, phone: px % 3 !== 0, t, sway: 5, shadow: false });
  }
  if (!evening) {
    if (t > 62.6 && t < 63.5) hand('a seat!', hx + 70, 480, 36, C.sketch);
    if (t > 64.5 && t < 68.4) {
      const k = backOut(inv(64.6, 65, t)) * (1 - inv(68, 68.4, t));
      push(hx + 190, 340, k);
      cut(poly([-140, -46, 140, -46, 140, 36, 40, 36, 20, 60, 10, 36, -140, 36], true), C.white, { line: C.line, w: 2.4, amp: .5, shadow: .9 });
      hand('Boss: where are you?', 0, -8, 30, C.redD); hand('Standup started!!', 0, 24, 26, C.line);
      pop();
    }
  }
}

// ---------- the train crossing the city ----------
function viaductScene(t, evening) {
  const u = inv(evening ? 136.5 : VIA_T0, evening ? 140 : VIA_T1, t), camX = 300 + u * 2400;
  const camY = cityBackdrop(t, camX, 1, 850, evening ? '#d8cfc0' : '#d9d3c4');
  view(camX, 1, 850);
  const n = nightAt(t);
  // tall near towers
  const cell = 330, a = Math.floor(viewL() / cell) - 1, b = Math.ceil(viewR() / cell) + 1;
  for (let i = a; i <= b; i++) {
    const x = i * cell + 20, w = 250 + hash(i) * 40, h = 480 + hash(i * 5) * 260;
    cut(rrect(x, GROUND - h - 120, w, h + 120, 3), mix(['#c9b9a6', '#b3c4c9', '#d3c0c5'][i % 3 < 0 ? 0 : Math.abs(i) % 3], '#1f2748', n * .6), { pat: 'ldots', line: C.line, w: 1.8, amp: .5, shadow: .5 });
    for (let r = 0; r < h / 56; r++) for (let c = 0; c < 4; c++) { const lit = n > 0 && hash(i * 131 + r * 17 + c) < .55; cut(rrect(x + 22 + c * 56, GROUND - h - 96 + r * 56, 36, 34, 3), lit ? '#f4d28a' : mix('#b9d6e2', '#3a4272', n), { line: C.line, w: 1.2, amp: .3, shadow: false }); }
  }
  // viaduct
  const trainX = camX - 340 + Math.sin(t * 5) * 1;
  for (let x = Math.floor(viewL() / 260) * 260; x < viewR() + 260; x += 260) cut(rrect(x - 26, GROUND - 130, 52, 180, 2), '#a9a7ad', { pat: 'ldots', line: C.line, w: 2, amp: .4, shadow: .6 });
  cut(rrect(viewL() - 20, GROUND - 134, viewR() - viewL() + 40, 34, 2), '#8f8d92', { pat: 'grid', line: C.line, w: 2, amp: .4, shadow: .8 });
  push(0, -142, 1);
  for (let i = 0; i < 3; i++) metroCar(trainX + i * 580 - 600, t, 0, { id: i + 5, night: n > .3, band: evening ? '#28416f' : C.red });
  pop();
}
