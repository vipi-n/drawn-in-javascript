// Scene 4: the office. The tower, the desk, the inbox, lunch, and the long afternoon.
const OFF_T0 = 80, FLOOR_T0 = 88, LUNCH_T0 = 106, AFT_T0 = 113, OFF_T1 = 128;
const BOSS = Object.assign({}, HERO, { shirt: '#6f7186', shirtD: '#5b5d72', pants: '#2b2b33', pantsD: '#22222a', hair: '#b9b3aa', skin: '#efc7a0', skinD: '#d7a97e', tie: '#e2b446', shoe: '#2a2a2a', shoeD: '#1f1f1f' });
const HERO_DESK_X = 1200;

function officeOutside(t) {
  cityBackdrop(t, 800, 1, 850, '#d8d2c2');
  view(800, 1, 850);
  const n = nightAt(t), open = kf([[84.4, 0], [85.2, 1], [86.6, 1], [87.3, 0]], t);
  // the tower: glass curtain wall, floor bands, a stone base
  cut(rrect(470, -700, 690, GROUND + 700, 3), '#8fb4c6', { line: C.line, w: 2.4, amp: .6, shadow: 1 });
  for (let y = -680; y < GROUND - 440; y += 72) {
    cut(rrect(470, y, 690, 18, 0), '#6b8fa3', { line: null, shadow: false, amp: 0 });
    for (let x = 470; x < 1160; x += 115) { const lit = hash(x + y) < .3; cut(rrect(x + 10, y + 24, 95, 42, 2), lit ? '#f7ecc0' : '#b9d6e2', { line: '#5e7f91', w: 1.2, amp: .2, shadow: false }); }
  }
  cut(rrect(470, GROUND - 440, 690, 440, 2), '#d9d2c2', { pat: 'ldots', line: C.line, w: 2, amp: .5, shadow: .8 });
  // lit lobby seen through the glass
  cut(rrect(640, GROUND - 400, 360, 400, 2), '#f6e7c4', { line: C.line, w: 2, amp: .3, shadow: false });
  ctx.fillStyle = '#c9b79c'; ctx.fillRect(640, GROUND - 30, 360, 30);
  cut(rrect(930, GROUND - 330, 60, 330, 2), '#b9c4cc', { pat: 'stripe', line: C.line, w: 1.6, amp: .3, shadow: false });
  cut(circ(960, GROUND - 350, 6), '#f2c94c', { line: null, shadow: false, amp: 0 });
    plant(690);
  // the people, inside and out
  const walkers = [];
  for (let i = 0; i < 5; i++) { const x = 60 + ((t * (52 + hash(i) * 22) + i * 330) % 900); walkers.push({ x, id: 500 + i, y: GROUND + 8 + (i % 3) * 14 }); }
  for (const w of walkers) { const a = 1 - inv(860, 930, w.x); if (a > 0) fade(a, () => folk(w.x, w.x > 700 ? GROUND - 4 : w.y, w.x > 700 ? .94 : .98, w.id, { dir: 1, walk: true, t, phone: w.id % 2 === 0, bag: true })); }
  const hx = lin([[80.3, 80], [85.2, 810], [87, 930]], t), inside = hx > 700;
  if (t < 87.8) fade(1 - inv(87, 87.7, t), () => man(hx, inside ? GROUND - 2 : GROUND + 22, inside ? .95 : 1, walkPose(hx / (STRIDE * .9), { lean: .06, amp: .9 }), { bag: true, id: true, t, tie: true }));
  // glass doors: two fixed panes, two that slide apart
  const panes = [[640, 0], [730, -open * 84], [820, open * 84], [910, 0]];
  for (const [px, dx] of panes) {
    ctx.globalAlpha = .34; cut(rrect(px + dx + 1, GROUND - 396, 88, 396, 2), '#cfe8f2', { line: null, shadow: false, amp: 0 }); ctx.globalAlpha = 1;
    cut(rrect(px + dx + 1, GROUND - 396, 88, 396, 2), 'rgba(0,0,0,0)', { line: '#5a6a72', w: 3, amp: .2, shadow: false });
    ctx.globalAlpha = .28; cut(poly([px + dx + 14, GROUND - 390, px + dx + 40, GROUND - 390, px + dx + 14, GROUND - 230, px + dx - 12, GROUND - 230], true), '#ffffff', { line: null, shadow: false, amp: 0 }); ctx.globalAlpha = 1;
  }
  for (const hxp of [810, 830]) cut(rrect(hxp - 2, GROUND - 220, 4, 80, 2), '#8f979c', { line: C.line, w: 1, amp: .1, shadow: false });
  cut(rrect(634, GROUND - 404, 372, 10, 0), '#5a6a72', { line: C.line, w: 1.6, amp: .2, shadow: false });
  // canopy, columns, sign, clock
  cut(rrect(600, GROUND - 430, 440, 22, 2), '#3a4a5a', { line: C.line, w: 2, amp: .3, shadow: 1 });
  for (const cx of [612, 1028]) cut(rrect(cx - 7, GROUND - 410, 14, 410, 2), '#b9c4cc', { line: C.line, w: 1.8, amp: .3, shadow: .6 });
  cut(rrect(620, GROUND - 516, 400, 76, 6), C.navy, { line: C.line, w: 2, amp: .3, shadow: .8 });
  hand('NORTHWIND', 820, GROUND - 464, 52, C.cream);
  clockFace(820, GROUND - 590, 38, clockAt(t), { w: 2.2 });
  // pavement, planters
  ctx.fillStyle = '#c9c4b4'; ctx.fillRect(viewL(), GROUND, viewR() - viewL(), 70);
  line(seg(viewL(), GROUND, viewR(), GROUND), 2, C.line, { amp: .4 });
  for (const px of [540, 1100]) { cut(rrect(px - 40, GROUND - 52, 80, 52, 4), '#8a6a44', { pat: 'stripe', line: C.line, w: 1.8, amp: .3, shadow: .7 }); for (let j = 0; j < 5; j++) cut(circ(px - 30 + j * 15, GROUND - 62 - (j % 2) * 10, 14), C.green, { pat: 'ldots', w: 1.2, amp: .3, shadow: false }); }
}

// ---------- the floor ----------
function screenContent(kind, t, seed = 0) {
  ctx.fillStyle = kind === 'code' ? '#1f2438' : '#f7f4ea'; ctx.fillRect(-100, -100, 400, 300);
  if (kind === 'code') for (let r = 0; r < 9; r++) { const w = 30 + hash(seed + r * 3 + Math.floor(t * 2)) * 80; ctx.fillStyle = ['#7fd1b9', '#ffd66b', '#9fb4ff', '#f28b82'][r % 4]; ctx.fillRect(-56 + (r % 3) * 14, -50 + r * 12, w, 5); }
  else if (kind === 'sheet') { for (let r = 0; r < 7; r++) for (let c = 0; c < 6; c++) { ctx.fillStyle = (r + c) % 2 ? '#e9eee8' : '#f7f4ea'; ctx.fillRect(-60 + c * 22, -52 + r * 14, 21, 13); if (hash(seed + r * 7 + c) < .6) { ctx.fillStyle = '#7a8a9a'; ctx.fillRect(-57 + c * 22, -48 + r * 14, 6 + hash(seed + r + c * 3) * 10, 3); } } }
  else { for (let r = 0; r < 7; r++) { ctx.fillStyle = r < 3 ? '#dbe7f6' : '#f7f4ea'; ctx.fillRect(-60, -52 + r * 14, 132, 12); ctx.fillStyle = '#5a6a7a'; ctx.fillRect(-56, -49 + r * 14, 30, 3); ctx.fillStyle = '#9aa7b3'; ctx.fillRect(-20, -49 + r * 14, 40 + hash(seed + r) * 26, 3); } }
}
function monitor(x, t, kind, on = true, seed = 0) {
  cut(rrect(x - 10, 560, 20, 76, 2), '#8f8d92', { line: C.line, w: 1.4, amp: .3, shadow: false });
  cut(rrect(x - 50, 628, 100, 12, 4), '#8f8d92', { line: C.line, w: 1.4, amp: .3, shadow: false });
  cut(rrect(x - 92, 440, 184, 130, 8), '#2a2a34', { line: C.line, w: 2.2, amp: .4, shadow: .9 });
  cut(rrect(x - 82, 450, 164, 108, 3), '#0f1220', { line: null, shadow: false, amp: 0 });
  if (on) { clipTo(rrect(x - 82, 450, 164, 108, 3)); push(x + 2, 508, 1.3); screenContent(kind, t, seed); pop(); unclip(); ctx.globalAlpha = .12; cut(rrect(x - 82, 450, 164, 108, 3), '#a8d4ff', { line: null, shadow: false, amp: 0 }); ctx.globalAlpha = 1; }
}
function paperPile(x, h, t) {
  for (let k = 0; k < h; k++) cut(rrect(x - 44 + Math.sin(k * 2.3) * 6, 640 - (k + 1) * 8, 88, 8, 1), k % 3 === 2 ? '#e8e0c8' : C.white, { line: C.line, w: 1.1, amp: .3, shadow: k === h - 1 ? .5 : false });
}
function mug(x, t) {
  cut(rrect(x - 18, 600, 36, 40, 6), C.white, { pat: 'dots', line: C.line, w: 1.6, amp: .3, shadow: .5 });
  cut(rrect(x + 16, 610, 14, 20, 6), 'rgba(0,0,0,0)', { line: C.line, w: 2, amp: .2, shadow: false });
  for (let k = 0; k < 3; k++) { const p = (t * .5 + k / 3) % 1; ctx.globalAlpha = (1 - p) * .8; line(curve(x - 6 + k * 6, 596, x - 12 + k * 6, 580 - p * 30, x + k * 6, 570 - p * 40, x - 4 + k * 6, 550 - p * 50), 2, '#c9c4b8', { amp: .5 }); ctx.globalAlpha = 1; }
}
function plant(x) {
  cut(dome(x, 640, 22, 20), '#c9865a', { line: C.line, w: 1.6, amp: .3 });
  for (let j = 0; j < 4; j++) cut(leafShape(x, 622, 46, 16, -Math.PI / 2 + (j - 1.5) * .5), C.green, { pat: 'ldots', w: 1.2, amp: .3 });
}
function chair(x, t) {
  cut(rrect(x - 40, 748, 92, 16, 6), '#3a3a48', { line: C.line, w: 1.8, amp: .3, shadow: .7 });
  cut(rrect(x - 52, 610, 16, 146, 6), '#3a3a48', { line: C.line, w: 1.8, amp: .3 });
  line(seg(x, 764, x, 826), 6, '#5a5a66', { amp: .2 }); line(seg(x - 50, 836, x + 50, 836), 6, '#5a5a66', { amp: .2 });
  for (const wx of [-46, 46]) dot(x + wx, 842, 7, '#2a2a34');
}
function deskUnit(x, t, kind, o = {}) {
  push(0, 46, 1);
  cut(rrect(x + 40, 396, 330, 254, 4), '#b7c3c9', { pat: 'grid', line: C.line, w: 1.8, amp: .5, shadow: .5 });
  push(0, -46, 1); chair(x + 30, t); pop();
  cut(rrect(x + 50, 640, 300, 16, 3), C.wood, { line: C.line, w: 2, amp: .3, shadow: .8 });
  for (const lx of [66, 330]) cut(rrect(x + lx, 656, 12, 134, 2), '#8a6a44', { line: C.line, w: 1.6, amp: .3, shadow: false });
  monitor(x + 200, t, kind, o.on !== false, o.seed || 0);
  cut(rrect(x + 118, 626, 74, 14, 4), '#d7d2c6', { pat: 'grid', line: C.line, w: 1.4, amp: .3, shadow: .4 });
  if (o.mouse) cut(ell(x + 236, 634, 17, 8), '#d7d2c6', { line: C.line, w: 1.4, amp: .2, shadow: .4 });
  if (o.pile) paperPile(x + 300, o.pile, t);
  if (o.mug) mug(x + 84, t);
  if (o.plant) plant(x + 330);
  pop();
}

function officeBack(t, camX) {
  const s = skyAt(t), n = nightAt(t);
  ctx.fillStyle = '#e6e2d6'; ctx.fillRect(-400, -500, 3200, GROUND + 500);
  ctx.fillStyle = pattern('ldots'); ctx.globalAlpha = .7; ctx.fillRect(-400, -500, 3200, GROUND + 500); ctx.globalAlpha = 1;
  ctx.fillStyle = '#cfcabd'; ctx.fillRect(-400, 700, 3200, GROUND - 700);
  for (let k = 0; k < 6; k++) windowFrame(180 + k * 420, 150, 320, 250, t);
  clockFace(1090, 125, 46, clockAt(t), { w: 2.6 });
  // carpet
  ctx.fillStyle = '#8fa0b0'; ctx.fillRect(-400, GROUND, 3200, 600);
  ctx.fillStyle = pattern('check'); ctx.globalAlpha = .18; ctx.fillRect(-400, GROUND, 3200, 600); ctx.globalAlpha = 1;
  line(seg(-400, GROUND, 3200, GROUND), 2, C.line, { amp: .4 });
  cut(rrect(-400, GROUND - 16, 3600, 16, 0), '#f2ecdd', { line: C.line, w: 1.4, amp: .3, shadow: false });
}

// seated at the desk with both hands on the keyboard, fingers tapping in turn
function typePose(t, o = {}) {
  const P = Object.assign({}, SIT, { hy: -136, hx: 36, lean: .14, f1: [90, 0], f2: [112, 0], eye: .3, mouth: 'flat', look: 1 });
  const rate = o.rate ?? 1, k1 = Math.max(0, Math.sin(t * 13 * rate)), k2 = Math.max(0, Math.sin(t * 9.4 * rate + 1.3));
  P.a1 = [122 + Math.sin(t * 2.6) * 3, -190 - k1 * 7];
  P.a2 = [158 + Math.sin(t * 2.1) * 3, -190 - k2 * 7];
  P.tilt = .14 + .03 * Math.sin(t * .7);
  P.hdy = Math.max(0, Math.sin(t * 1.9)) * 2;
  return P;
}

function heroDesk(t) {
  const S = { x: HERO_DESK_X, P: typePose(t), o: { id: true, t }, vis: true };
  if (t < FLOOR_T0 + 1.6) { S.x = lerp(560, HERO_DESK_X - 60, inv(FLOOR_T0, FLOOR_T0 + 1.6, t)); S.P = walkPose(S.x / STRIDE, { lean: .07 }); S.o.bag = true; return S; }
  if (t < FLOOR_T0 + 2.2) { S.x = lerp(HERO_DESK_X - 60, HERO_DESK_X, inv(FLOOR_T0 + 1.6, FLOOR_T0 + 2.2, t)); S.P = Object.assign({}, STAND, { lean: .02 }); S.o.bag = true; return S; }
  if (t < 91.2) { S.P = mixP(Object.assign({}, STAND, { lean: .02 }), typePose(t), ease(inv(FLOOR_T0 + 2.2, 91.2, t))); S.P.a1 = [lerp(10, 70, ease(inv(90.2, 91.2, t))), lerp(-124, -152, inv(90.2, 91.2, t))]; S.P.a2 = [lerp(-6, 88, ease(inv(90.2, 91.2, t))), -150]; S.o.bag = inv(90.2, 90.6, t) < 1; return S; }
  if (t < 92.6) { S.P.mouth = 'sigh'; S.P.eye = .85; const w = ease(inv(92, 92.6, t)); const T = typePose(t); S.P.a1 = [lerp(70, T.a1[0], w), lerp(-152, T.a1[1], w)]; S.P.a2 = [lerp(88, T.a2[0], w), lerp(-150, T.a2[1], w)]; return S; }
  if (t < 100) { if (t > 94.6 && t < 95.4) { S.P.tilt = .3; S.P.look = 1; } if (t > 96.2) { S.P.brow = -4; S.P.mouth = 'sad'; S.P.eye = .9; } return S; }
  if (t < 102.3) { // the note
    const sc = Math.sin(t * 16) * 4;
    S.P.a1 = [150 + sc, -196 + Math.sin(t * 12) * 2]; S.P.a2 = [128, -192]; S.P.tilt = .24; S.P.mouth = 'smile'; S.P.eye = .3; S.P.lean = .2;
    S.o.h1 = () => cut(rrect(-4, -5, 22, 10, 2), C.red, { line: C.line, w: 1, amp: .1, shadow: false });
    return S;
  }
  S.P = typePose(t, { rate: 1.15 }); S.P.mouth = 'sad'; S.P.eye = .85; S.P.brow = 3; return S;
}

function heroDeskAny(t) {
  if (t < LUNCH_T0) return heroDesk(t);
  const S = { x: HERO_DESK_X, P: typePose(t, { rate: .9 }), o: { id: true, t }, vis: true };
  if (t < 114.6) { S.x = lerp(560, HERO_DESK_X - 60, inv(AFT_T0, 114.6, t)); S.P = walkPose(S.x / (STRIDE * .8), { lean: .08, amp: .8 }); S.P.eye = .8; S.o.bag = true; return S; }
  if (t < 115.6) { S.x = lerp(HERO_DESK_X - 60, HERO_DESK_X, inv(114.6, 115.0, t)); S.P = mixP(Object.assign({}, STAND, { lean: .04, eye: .8 }), typePose(t, { rate: .9 }), ease(inv(115, 115.6, t))); return S; }
  if (t < 125.6) {
    S.P.eye = .75 - .15 * inv(118, 125, t);
    if (t > 119.2 && t < 120.8) { S.P.a1 = [58, -276]; S.P.tilt = .05; S.P.eye = .95; S.P.lean = .06; }
    if (t > 122.4 && t < 123.6) { S.P.tilt = .36; S.P.eye = .95; S.P.hdy = 6; }
    if (t > 121.3 && t < 122.2) { S.P.look = -1; S.P.tilt = .2; }
    if (t > 124.8) { S.P.mouth = 'sigh'; S.P.eye = .85; }
    return S;
  }
  if (t < 126.7) { const w = ease(inv(125.6, 126.4, t)); S.P = mixP(typePose(t, { rate: .9 }), Object.assign({}, STAND, { lean: .06, eye: .7, mouth: 'sigh' }), w); if (t > 126.1) S.P.a1 = [30, -300 * inv(126.1, 126.5, t) - 120 * (1 - inv(126.1, 126.5, t))]; S.o.bag = true; return S; }
  S.x = lerp(HERO_DESK_X, 1900, inv(126.7, 128.2, t)); S.P = walkPose(S.x / (STRIDE * .9), { lean: .1, amp: .9 }); S.P.eye = .8; S.o.bag = true; return S;
}

function officeFloor(t, camX, afternoon, zoom = 1.15) {
  screen(); paper();
  view(camX, zoom, 905);
  officeBack(t, camX);
  // colleagues
  const leaveT = afternoon ? [118.5, 121, 123, 124.4] : [1e9, 1e9, 1e9, 1e9];
  const desks = [[300, 'code', 1], [720, 'sheet', 2], [HERO_DESK_X, 'sheet', 0], [1650, 'code', 4], [2080, 'mail', 5]];
  desks.forEach(([x, kind, id], i) => {
    if (i === 2) return;
    const gone = afternoon && i < 5 && t > leaveT[Math.min(3, i > 2 ? i - 1 : i)];
    const lt = leaveT[Math.min(3, i > 2 ? i - 1 : i)], lu = afternoon ? t - lt : -1;
    deskUnit(x, t, kind, { on: !gone || lu < .8, seed: id * 11, mug: i % 2 === 0, plant: i === 1 || i === 3, pile: 2 + id % 3 });
    if (!gone) folk(x + 34, GROUND + 4, 1, 60 + id, { dir: 1, sit: true, type: true, phone: false, t, sway: 1 });
    else if (lu < 4.5) folk(x + 30 + lu * 230, GROUND + 6, 1, 60 + id, { dir: 1, walk: true, phone: false, bag: true, t });
  });
  // his desk
  const pile = Math.floor(lin([[88, 1], [96, 2], [102.4, 6], [106, 7], [113, 7], [116.5, 10], [122, 14], [127, 16]], t));
  deskUnit(HERO_DESK_X, t, t < 96.4 ? 'sheet' : 'mail', { seed: 3, pile, mug: true, plant: false, on: !(afternoon && t > 126.3) });
  // the phone on the desk buzzes
  const buzz = (t > 94.6 && t < 95.6) || (t > 109 && false) || (afternoon && t > 121.2 && t < 122.2);
  push(HERO_DESK_X + 274, 682, 1, buzz ? Math.sin(t * 70) * .03 : 0);
  cut(rrect(-12, -8, 44, 14, 4), '#2a2a34', { line: C.line, w: 1.4, amp: .2, shadow: .5 }); pop();
  // the hero
  const H1 = heroDeskAny(t);
  if (H1.vis && (t < LUNCH_T0 || afternoon)) man(H1.x, GROUND + 4, 1, H1.P, Object.assign({ t }, H1.o));
  // sticky note with a red sketch that gets covered
  if (t > 100 && t < 103) { push(HERO_DESK_X + 150, 658, 1, -.06); cut(rrect(-30, -30, 60, 60, 2), '#fff08a', { line: C.line, w: 1.2, amp: .3, shadow: .5 }); boat(0, 4, .22, inv(100.4, 102.2, t), { w: 2 }); pop(); }
  if (buzz) hand('bzzzt', HERO_DESK_X + 288, 638, 30, C.sketch);
  return H1;
}

function bossVisit(t, t0, t1, camX) {
  if (t < t0 || t > t1) return;
  const u = inv(t0, t0 + 1.4, t), v = inv(t1 - 1.4, t1, t), x = lerp(500, 1010, ease(u)) - (t > t1 - 1.4 ? 520 * ease(v) : 0);
  const P = (u < 1 || v > 0) ? walkPose((t > t1 - 1.4 ? -x : x) / (STRIDE * .8), { lean: .05, amp: .8 }) : Object.assign({}, STAND, { lean: .04, a1: [80, -190], mouth: 'open', mo: .5 + .3 * Math.sin(t * 9) });
  const dropped = t > t0 + 1.8;
  man(x, GROUND + 26, 1.04, P, { pal: BOSS, t, flip: t > t1 - 1.4, h1: !dropped ? () => { cut(rrect(-6, -12, 70, 50, 3), '#e2b446', { line: C.line, w: 1.6, amp: .3, shadow: .5 }); hand('URGENT', 30, 22, 18, C.redD); } : null, tie: true });
}

function officeFloorScene(t) {
  const cam = kf([[88, 900], [90, 1150], [100, 1240], [104, 1250], [106, 1250]], t);
  officeFloor(t, cam, false);
  bossVisit(t, 102.4, 105.4, cam);
  if (t > 102.9 && t < 105) { const k = backOut(inv(102.9, 103.3, t)); push(1010, 470, k); cut(poly([-150, -46, 150, -46, 150, 36, 40, 36, 20, 60, 10, 36, -150, 36], true), C.white, { line: C.line, w: 2.4, amp: .5, shadow: .9 }); hand('Need this by 5!', 0, -8, 34, C.redD); hand('Also that other thing.', 0, 24, 24, C.line); pop(); }
  // the inbox, close up
  if (t > 96.3 && t < 99.9) {
    const k = backOut(inv(96.3, 96.9, t)) * (1 - inv(99.4, 99.9, t));
    screen(); ctx.globalAlpha = .55 * k; ctx.fillStyle = '#3a2f28'; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1;
    push(540, 500, k);
    cut(rrect(-400, -290, 800, 560, 22), '#2a2a34', { line: C.line, w: 3, amp: .5, shadow: 1 });
    cut(rrect(-378, -268, 756, 516, 8), '#f7f4ea', { line: null, shadow: false, amp: 0 });
    cut(rrect(-378, -268, 756, 46, 8), '#3f6ea0', { line: null, shadow: false, amp: 0 });
    const unread = Math.floor(lin([[96.3, 9], [99.4, 148]], t));
    hand(`Inbox (${unread})`, -300, -236, 30, C.white);
    const subj = ['Re: Re: URGENT', 'Meeting in 5 min', 'Fwd: Fwd: report', 'Quick question??', 'Deadline moved up', 'Can you join a call?', 'Re: Re: Re: budget'];
    for (let r = 0; r < 7; r++) {
      const at = 96.5 + r * .4, s = ease(inv(at, at + .3, t)), y = -190 + r * 60;
      ctx.globalAlpha = s; cut(rrect(-360 + (1 - s) * 200, y, 720, 50, 4), r % 2 ? '#eef2f6' : '#fdfcf6', { line: '#c9c4b8', w: 1.2, amp: .2, shadow: false });
      dot(-332 + (1 - s) * 200, y + 25, 8, '#3f6ea0'); hand(subj[r], -300 + (1 - s) * 200, y + 33, 26, C.line, 'left'); ctx.globalAlpha = 1;
    }
    pop();
  }
}
