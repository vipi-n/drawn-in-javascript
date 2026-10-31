// Lunch (twenty minutes, alone) and the long afternoon.
function bowl(x, y, col, food) {
  cut(dome(x, y, 34, 22), col, { pat: 'dots', line: C.line, w: 1.6, amp: .3, shadow: .5 });
  cut(ell(x, y - 18, 28, 9), food, { pat: 'ldots', line: C.line, w: 1.2, amp: .3, shadow: false });
}
function spoon() { line(seg(0, 0, 34, -10), 4, '#c9c4b8', { amp: .1 }); cut(ell(38, -12, 10, 6, -.3), '#c9c4b8', { line: C.line, w: 1.2, amp: .1, shadow: false }); }

function lunchScene(t) {
  screen(); ctx.fillStyle = '#f0e2c8'; ctx.fillRect(0, 0, W, H);
  view(800, 1.1, 900);
  wallRect(-300, 1700, '#f0e2c8', 'dots');
  floorRect(-300, 1700, '#c9b79c', '#a8977c');
  windowFrame(1040, 210, 260, 230, t);
  windowFrame(120, 210, 260, 230, t);
  clockFace(700, 130, 50, clockAt(t), { w: 2.8 });
  cut(rrect(420, 296, 560, 50, 6), C.redD, { line: C.line, w: 2, amp: .4 }); hand('CANTEEN  ·  LUNCH 1–1:30', 700, 332, 30, C.cream);
  // his table
  push(0, 60, 1);
  cut(rrect(470, 640, 560, 16, 3), '#e9d6b8', { pat: 'check', line: C.line, w: 2, amp: .3, shadow: .8 });
  for (const lx of [490, 1000]) cut(rrect(lx, 656, 14, 134, 2), '#8a6a44', { line: C.line, w: 1.6, amp: .3 });
  cut(rrect(486, 626, 330, 14, 4), '#8f8d92', { line: C.line, w: 1.6, amp: .3, shadow: .5 });
  bowl(515, 626, '#c8463b', '#e2b446'); bowl(585, 626, '#3f8a86', '#f1cf6a'); bowl(665, 626, '#e2b446', '#fbf8f0');
  cut(ell(760, 624, 34, 8), '#d98a3d', { pat: 'dots', line: C.line, w: 1.4, amp: .3, shadow: .4 });
  // phone propped against a glass
  cut(rrect(900, 560, 46, 74, 5), '#2a2a34', { line: C.line, w: 1.6, amp: .2, shadow: .6 }); cut(rrect(905, 566, 36, 58, 3), '#a8d4ff', { line: null, shadow: false, amp: 0 });
  if (Math.floor(t * 2) % 2) cut(circ(942, 562, 7), C.red, { line: null, shadow: false, amp: 0 });
  cut(rrect(960, 590, 30, 46, 6), '#cfe4ec', { line: C.line, w: 1.4, amp: .2, shadow: false });
  pop();
  // bench and the man eating fast
  cut(rrect(340, 750, 170, 16, 4), C.wood, { line: C.line, w: 1.8, amp: .3, shadow: .6 });
  for (const lx of [360, 480]) cut(rrect(lx, 766, 10, 84, 2), '#8a6a44', { line: C.line, w: 1.4, amp: .3 });
  const bt = bite(t, .7), mouth = bt.lift, glance = (t > 108.2 && t < 109) || (t > 110.2 && t < 110.8);
  const P = Object.assign({}, SIT, { hy: -134, hx: 26, f1: [80, 0], f2: [102, 0], lean: .14, tilt: .12, eye: .7 });
  P.a1 = [lerp(150, 66, ease(mouth)), lerp(-198, -262, ease(mouth))]; P.a2 = [112, -160];
  P.mouth = bt.chew ? 'chew' : 'flat';
  if (glance) { P.look = 1; P.tilt = .3; P.a1 = [130, -198]; }
  if (t > 111.2) { P.a1 = [60, -262]; P.mouth = 'open'; P.mo = .3; P.eye = .9; P.tilt = -.1; }
  man(400, GROUND + 4, 1, P, { id: true, t, h1: () => spoon() });
  // the others, laughing together
  cut(rrect(1180, 700, 260, 16, 3), '#e9d6b8', { pat: 'check', line: C.line, w: 2, amp: .3, shadow: .8 });
  for (const lx of [1200, 1410]) cut(rrect(lx, 716, 14, 134, 2), '#8a6a44', { line: C.line, w: 1.6, amp: .3 });
  folk(1130, GROUND + 6, 1, 31, { dir: 1, sit: true, phone: false, t, sway: 3 }); folk(1490, GROUND + 6, 1, 32, { dir: -1, sit: true, phone: false, t, sway: 3 });
  folk(1100, GROUND - 10, .96, 33, { dir: 1, sit: true, phone: false, t: t + 1, sway: 3 });
  for (let k = 0; k < 3; k++) { const p = (t * .8 + k / 3) % 1; ctx.globalAlpha = Math.sin(p * Math.PI); hand(['ha!', 'ha ha', 'ha!'][k], 1200 + k * 90, 500 - p * 60, 30, C.sketch); ctx.globalAlpha = 1; }
  // twenty minutes
  screen();
  const left = 1 - inv(106.6, 112.3, t);
  pill(540, 60, 480, 66, C.paper, .9);
  hand('lunch break', 400, 72, 32, C.line, 'left');
  cut(rrect(560, 50, 170, 20, 8), C.white, { line: C.line, w: 1.6, amp: .2, shadow: false });
  cut(rrect(560, 50, Math.max(4, 170 * left), 20, 8), left < .35 ? C.red : '#7fb069', { line: null, shadow: false, amp: 0 });
  if (t > 111.3 && t < 112.6) hand('already?', 300, 330, 44, C.sketch);
}

function afternoonScene(t) {
  const cam = kf([[113, 1000], [116, 1250], [126, 1250], [128.4, 1520]], t), zoom = kf([[113, 1.15], [125, 1.15], [128.4, .95]], t);
  officeFloor(t, cam, true, zoom);
  bossVisit(t, 117.4, 120.5, cam);
  if (t > 117.9 && t < 120) { const k = backOut(inv(117.9, 118.3, t)); push(1010, 470, k); cut(poly([-150, -46, 150, -46, 150, 36, 40, 36, 20, 60, 10, 36, -150, 36], true), C.white, { line: C.line, w: 2.4, amp: .5, shadow: .9 }); hand('One more thing...', 0, 4, 34, C.redD); pop(); }
  screen();
  const dim = inv(120, 126.5, t) * .45;
  if (dim > 0) { ctx.globalAlpha = dim; ctx.fillStyle = '#1d2456'; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
}
