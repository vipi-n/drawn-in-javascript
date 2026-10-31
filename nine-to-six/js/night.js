// The night: a bar, a bowl of noodles, and the way home.
const BAR_OUT = 140, BAR_IN = 145, NIGHTST = 156, HOME_T0 = 166;

function roadAndPavement(night) {
  const x0 = viewL() - 20, x1 = viewR() + 20;
  cut(rrect(x0, GROUND, x1 - x0, 46, 0), mix('#e7dfcf', '#57566e', night * .8), { pat: 'dots', line: C.line, w: 1.6, amp: .4, shadow: false });
  cut(rrect(x0, GROUND + 46, x1 - x0, 240, 0), mix('#8b8783', '#3e3e52', night * .8), { pat: 'speck', line: C.line, w: 1.6, amp: .4, shadow: false });
  for (let x = Math.floor(x0 / 120) * 120; x < x1; x += 120) cut(rrect(x, GROUND + 160, 60, 8, 2), mix('#f2ecdc', '#8a89a0', night), { line: null, shadow: false, amp: 0 });
}
function cat(x, y, t) {
  push(x, y, 1);
  const tail = Math.sin(t * 2) * 14;
  cut(limb([-28, -10, -56, -16 + tail * .3, -70, -46 + tail], [12, 10, 8]), '#8f8d92', { pat: 'stripe', w: 1.5, amp: .3, shadow: false });
  cut(ell(0, -26, 30, 24), '#8f8d92', { pat: 'stripe', w: 1.8, amp: .4, shadow: .5 });
  cut(circ(32, -52, 19), '#8f8d92', { w: 1.8, amp: .4, shadow: .5 });
  for (const s of [-1, 1]) cut(poly([32 + s * 15, -60, 32 + s * 20, -82, 32 + s * 4, -68], true), '#8f8d92', { w: 1.5, amp: .3, shadow: false });
  const blink = (t * .4) % 1 < .06;
  if (blink) line(seg(34, -54, 48, -54), 2, C.line); else { dot(40, -54, 4, '#e2b446'); dot(40, -54, 1.6, C.black); }
  dot(50, -46, 2, C.redD);
  pop();
}
function neon(x, y, txt, size, col, t) {
  const on = Math.sin(t * 9) > -.92 ? 1 : .55;
  ctx.save(); ctx.shadowColor = col; ctx.shadowBlur = 30; ctx.font = `${size}px ${HAND}`; ctx.textAlign = 'center'; ctx.fillStyle = col; ctx.globalAlpha = on;
  ctx.fillText(txt, x, y); ctx.shadowBlur = 12; ctx.fillText(txt, x, y); ctx.restore();
}

function heroBarOut(t) {
  const S = { vis: true, x: 200, P: Object.assign({}, STAND), o: { id: true, bag: true, t, tie: true }, flip: false };
  if (t < 143.2) { S.x = lerp(160, 950, inv(140, 143.2, t)); S.P = walkPose(S.x / (STRIDE * .75), { lean: .05, amp: .75 }); S.P.eye = .85; S.P.mouth = 'flat'; return S; }
  S.x = 950;
  if (t < 144.6) {
    const up = kf([[143.2, 0], [143.6, 1], [144.2, 1], [144.6, 0]], t);
    S.P = Object.assign({}, STAND, { lean: .05, a1: [lerp(10, 66, up), lerp(-124, -232, up)], tilt: .14 * up, eye: .8, mouth: 'sad' });
    S.P = mixP(walkPose(950 / (STRIDE * .75), { lean: .05, amp: .75 }), S.P, ease(inv(143.2, 143.7, t)));
    S.o.h1 = up > .6 ? () => { cut(rrect(-9, -26, 20, 36, 4), '#2a2a34', { w: 1.2, amp: .2, shadow: false }); cut(rrect(-6, -22, 14, 28, 2), '#ffd0d0', { line: null, shadow: false, amp: 0 }); } : null;
    return S;
  }
  S.x = lerp(950, 1150, inv(144.6, 145.1, t)); S.P = walkPose(S.x / STRIDE, { lean: .07 }); if (t > 145) S.vis = false; return S;
}

function barOutside(t) {
  const night = nightAt(t);
  cityBackdrop(t, 900, 1, 850, '#d6cfbf'); view(900, 1, 850);
  shopRow(t, 900, night);
  lamp(500, night); lamp(1420, night);
  cut(rrect(1010, GROUND - 400, 330, 400, 3), '#3b2f3f', { pat: 'ldots', line: C.line, w: 2, amp: .5, shadow: 1 });
  cut(rrect(1050, GROUND - 330, 250, 90, 8), '#241a28', { line: C.line, w: 2, amp: .3 });
  neon(1175, GROUND - 262, 'BAR', 84, '#ff6f91', t);
  const open = inv(144.5, 145, t);
  cut(rrect(1100, GROUND - 210, 130, 210, 3), open > 0 ? '#f6c86a' : '#5a3b2a', { line: C.line, w: 2, amp: .3, shadow: false });
  cut(rrect(1250, GROUND - 200, 70, 90, 4), '#f6c86a', { line: C.line, w: 1.8, amp: .3, shadow: false });
  cut(rrect(1030, GROUND - 200, 60, 90, 4), '#f6c86a', { line: C.line, w: 1.8, amp: .3, shadow: false });
  for (const [sx, sc] of [[1050, .8], [1275, .9]]) folk(sx + 30, GROUND - 106, .55 * sc, 620 + sx, { dir: 1, phone: false, shadow: false, t });
  if (open > 0) { ctx.globalAlpha = .25 * open; cut(poly([1100, GROUND, 1230, GROUND, 1300, GROUND + 90, 1060, GROUND + 90], true), '#ffe9a0', { line: null, shadow: false, amp: 0 }); ctx.globalAlpha = 1; }
  roadAndPavement(night);
  const H1 = heroBarOut(t);
  if (H1.vis) man(H1.x, GROUND + 6, 1, H1.P, Object.assign({ flip: H1.flip, t }, H1.o));
  if (t > 143.3 && t < 144.4) hand('bzzzt', 1010, GROUND - 330, 34, C.sketch);
  screen();
  if (t < 140.5) { ctx.globalAlpha = 1 - inv(140, 140.5, t); ctx.fillStyle = '#20264a'; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
}

// ---------- inside the bar ----------
function beerMug(x, y, sc, level, foam, t, o = {}) {
  push(x, y, sc, o.rot || 0);
  cut(rrect(38, -88, 34, 60, 16), 'rgba(0,0,0,0)', { line: '#d9d4c6', w: 4, amp: .2, shadow: false });
  cut(rrect(-44, -114, 88, 114, 10), 'rgba(238,244,246,.55)', { line: C.line, w: 2.2, amp: .3, shadow: .8 });
  const lh = 100 * level;
  if (level > .01) {
    clipTo(rrect(-40, -110, 80, 106, 8));
    cut(rrect(-42, -4 - lh, 84, lh + 4, 0), '#e8a93a', { pat: 'ldots', line: null, shadow: false, amp: 0 });
    for (let k = 0; k < 7; k++) { const p = (t * .7 + k * .29) % 1; if (level > .1) dot(-28 + k * 9, -6 - p * lh, 2.2, 'rgba(255,240,200,.85)'); }
    unclip();
    for (let k = 0; k < 5; k++) cut(circ(-32 + k * 16, -4 - lh - 2 + Math.sin(k * 2) * 3, 12 * foam + 3), '#fbf8f0', { line: '#d9d4c6', w: 1.2, amp: .3, shadow: false });
  }
  pop();
}

function barInside(t) {
  screen(); ctx.fillStyle = '#3a2a34'; ctx.fillRect(0, 0, W, H);
  view(800, 1.08, 890);
  wallRect(-300, 1800, '#4b3140', 'ldots');
  ctx.fillStyle = '#5a3f36'; ctx.fillRect(-300, GROUND, 2100, 600);
  for (let k = 0; k < 5; k++) line(seg(-300, GROUND + 30 + k * 34, 1800, GROUND + 30 + k * 34), 1.2, '#3e2a24', { amp: .4 });
  line(seg(-300, GROUND, 1800, GROUND), 2, C.line, { amp: .4 });
  // bottle shelves
  for (const sy of [360, 490]) {
    cut(rrect(700, sy, 700, 12, 3), C.wood, { line: C.line, w: 1.6, amp: .3 });
    for (let k = 0; k < 14; k++) { const bx = 720 + k * 48, bh = 60 + hash(k + sy) * 30; cut(rrect(bx - 10, sy - bh, 20, bh, 5), C.leaves[(k + (sy > 400 ? 3 : 0)) % C.leaves.length], { pat: PATS[k % PATS.length], line: C.line, w: 1.4, amp: .3, shadow: .4 }); cut(rrect(bx - 5, sy - bh - 14, 10, 16, 3), C.leaves[(k + 2) % C.leaves.length], { line: C.line, w: 1.2, amp: .2, shadow: false }); }
  }
  neon(300, 350, 'COLD BEER', 56, '#7fe0c8', t);
  for (const lx of [560, 1000, 1360]) { line(seg(lx, -100, lx, 170), 3, C.line); cut(dome(lx, 210, 44, 40), '#c8463b', { line: C.line, w: 2, amp: .4 }); ctx.globalAlpha = .16; cut(poly([lx - 40, 210, lx + 40, 210, lx + 150, 850, lx - 150, 850], true), '#ffe9a0', { line: null, shadow: false, amp: 0 }); ctx.globalAlpha = 1; }
  // regulars at the far end
  folk(180, GROUND - 6, .96, 71, { dir: 1, sit: true, phone: false, t, sway: 3 });
  folk(330, GROUND - 6, .96, 72, { dir: -1, sit: true, phone: false, t: t + 1, sway: 3 });
  for (const sx of [130, 280]) { cut(rrect(sx - 4, 740, 8, 110, 2), '#5a5a66', { line: C.line, w: 1.2, amp: .2, shadow: false }); }
  hand('ha ha!', 260, 520 + Math.sin(t * 3) * 6, 34, C.sketch);
  // bartender
  folk(1250, GROUND - 14, 1.02, 90, { dir: -1, shirt: '#f6efd0', phone: false, bag: false, t });
  // counter
  cut(rrect(760, 640, 800, 22, 6), '#b0714a', { line: C.line, w: 2, amp: .4, shadow: .9 });
  cut(rrect(770, 662, 780, 190, 2), '#6d3f2a', { pat: 'stripe', line: C.line, w: 2, amp: .4, shadow: false });
  cut(rrect(1010, 560, 26, 82, 4), '#c9c4b8', { line: C.line, w: 1.6, amp: .3 });
  const pull = t > 147.3 && t < 149.4 ? -.5 : 0;
  push(1023, 566, 1, pull); cut(rrect(-6, -46, 12, 50, 5), C.red, { line: C.line, w: 1.4, amp: .2, shadow: false }); pop();
  // stool and hero
  const seatT = inv(146.3, 147, t);
  cut(rrect(650, 738, 90, 20, 8), C.red, { line: C.line, w: 2, amp: .3, shadow: .8 }); cut(rrect(690, 758, 10, 92, 2), '#5a5a66', { line: C.line, w: 1.2, amp: .2 });
  line(seg(660, 810, 730, 810), 4, '#5a5a66', { amp: .2 });
  const level = lin([[147.4, 0], [149.4, .86], [151.4, .86], [151.9, .6], [152.5, .6], [153, .34], [153.4, .34]], t);
  const foamK = lin([[147.4, 1], [149.4, 1], [153.4, .3]], t);
  const drinking = t > 151.4 && t < 153.4, holding = t > 150.7 && t < 153.9;
  let mugX = 1000; if (t > 149.8) mugX = lerp(1000, 850, inv(149.8, 150.6, t));
  if (!holding && t > 147.2) beerMug(mugX, 640, .55, level, foamK, t);
  // hero
  const P = Object.assign({}, SIT, { hy: -146, f1: [62, -40], f2: [84, -38], lean: .1, tilt: .1, eye: .75, a1: [150, -216], a2: [156, -214], mouth: 'flat' });
  let hx = 700, vis = true;
  if (t < 147) { hx = lerp(250, 700, inv(145.1, 146.4, t)); if (t < 146.4) { Object.assign(P, walkPose(hx / (STRIDE * .8), { lean: .08, amp: .8 })); } else Object.assign(P, STAND, { eye: .8 }); if (t >= 146.4) { const s2 = inv(146.4, 147, t); Object.assign(P, mixP(STAND, Object.assign({}, SIT, { hy: -146, f1: [62, -40], f2: [84, -38], a1: [150, -216], a2: [156, -214] }), ease(s2))); } }
  let h1 = null;
  if (t > 150.6 && t < 153.9) {
    const grab = inv(150.6, 151.4, t), lift = drinking ? inv(151.4, 151.8, t) * (1 - inv(153.1, 153.5, t)) : (t < 151.4 ? 0 : t < 153.5 ? 1 : 0);
    P.a1 = [lerp(146, 64, ease(lift)), lerp(-216, -234, ease(lift))];
    if (t < 150.9) P.a1 = [lerp(190, 146, inv(150.6, 150.9, t)), -216];
    P.tilt = .1 - .3 * lift; P.eye = lift > .5 ? .95 : .75;
    h1 = () => beerMug(0, 30, .5, level, foamK, t, { rot: -1.0 * lift });
  }
  if (t > 153.4 && t < 155) { P.mouth = 'smile'; P.eye = .9; P.tilt = -.1; }
  if (t > 154.2) { P.mouth = 'sad'; P.eye = .6; P.tilt = .12; }
  if (t > 154 && t < 155.6) { P.a1 = [150, -210]; }
  man(hx, GROUND + 4, 1, P, { id: true, t, h1, tie: true });
  if (t > 153.5 && t < 155) { push(hx + 46, GROUND - 202, 1); cut(poly([-12, 0, 14, -2, 12, 6, -10, 6], true), C.white, { line: null, shadow: false, amp: 0 }); pop(); }
  // napkin doodle and the phone
  if (t > 153.8) { push(940, 634, 1, -.05); cut(rrect(-38, -6, 76, 8, 1), C.white, { line: C.line, w: 1.2, amp: .2, shadow: .4 }); boat(0, -6, .16, inv(154, 155.4, t), { w: 2 }); pop(); }
  const buzz = t > 154.8 && t < 155.6;
  push(1070, 634, 1, buzz ? Math.sin(t * 70) * .05 : 0); cut(rrect(-14, -8, 48, 12, 4), '#2a2a34', { line: C.line, w: 1.4, amp: .2, shadow: .5 }); cut(rrect(-8, -6, 36, 6, 2), '#ffd0d0', { line: null, shadow: false, amp: 0 }); pop();
  if (buzz) hand('bzzzt', 1090, 604, 30, C.sketch);
  // close-up of the pour
  if (t > 147.3 && t < 149.7) {
    const k = backOut(inv(147.3, 147.8, t)) * (1 - inv(149.3, 149.7, t));
    screen(); ctx.globalAlpha = .5 * k; ctx.fillStyle = '#20141c'; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1;
    const lv = lin([[147.4, 0], [149.4, .86]], t);
    if (lv < .86) line(seg(540, 200, 540, 520 - lv * 200), 8, '#e8a93a', { amp: .3 });
    beerMug(540, 760, 3 * k, lv, lin([[147.4, 1], [149.4, 1]], t), t);
  }
}

// ---------- noodles and the walk home ----------
function nightStreet(t) {
  const night = nightAt(t), camX = kf([[156, 900], [160.8, 900], [165, 1500]], t);
  cityBackdrop(t, camX, 1, 850, '#d6cfbf'); view(camX, 1, 850);
  shopRow(t, camX, night);
  for (const lx of [420, 1080, 1700]) lamp(lx, night);
  streetTree(1320, 5, t);
  stall(t, 1000, 'NOODLES', '#3f8a86', 1);
  // home
  cut(rrect(1560, GROUND - 480, 340, 480, 4), '#7d7390', { pat: 'grid', line: C.line, w: 2, amp: .5, shadow: .9 });
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) cut(rrect(1590 + c * 100, GROUND - 440 + r * 90, 60, 56, 3), hash(r * 3 + c) < .4 ? '#f4d28a' : '#39426f', { line: C.line, w: 1.4, amp: .3, shadow: false });
  cut(rrect(1650, GROUND - 190, 90, 190, 4), '#f4d28a', { line: C.line, w: 2, amp: .4, shadow: false });
  hand('HOME', 1730, GROUND - 210, 34, '#f6efd0');
  cat(760, GROUND + 6, t);
  roadAndPavement(night);
  // the man
  let x = 940, P = Object.assign({}, STAND), o = { id: true, bag: true, t, tie: true }, vis = true;
  const eat = t < 160.6;
  if (t < 156.7) { x = lerp(400, 940, inv(156, 156.7, t)); P = walkPose(x / (STRIDE * .8), { lean: .08, amp: .8 }); }
  else if (eat) {
    const b = bite(t, .5), m = b.lift;
    P = Object.assign({}, STAND, { lean: .06, tilt: .06 + .08 * m, a1: [lerp(70, 62, m), lerp(-176, -236, m)], a2: [64, -170], eye: .65, mouth: b.chew ? 'chew' : 'flat' });
    o.h2 = () => { cut(dome(0, 0, 30, 18), '#f6efd0', { line: C.line, w: 1.6, amp: .3, shadow: false }); cut(ell(0, -12, 24, 8), '#e2b446', { pat: 'wave', line: C.line, w: 1.2, amp: .3, shadow: false }); for (let k = 0; k < 2; k++) { const p = (t * .8 + k * .5) % 1; ctx.globalAlpha = 1 - p; dot(-6 + k * 12, -20 - p * 30, 3 + p * 4, '#fbf8f0'); ctx.globalAlpha = 1; } };
    o.h1 = () => { line(seg(0, 0, 36, -14), 3, '#7b5234', { amp: .1 }); line(seg(4, 4, 38, -8), 3, '#7b5234', { amp: .1 }); };
  } else {
    x = lerp(940, 1700, inv(160.6, 165.4, t)); P = walkPose(x / (STRIDE * .7), { lean: .04, amp: .7 }); P.eye = .85; P.mouth = 'flat'; P.tilt = .14;
    if (t > 165.2) vis = false;
  }
  if (vis) man(x, GROUND + 6, 1, P, o);
  if (t > 157 && t < 160) hand('...finally, dinner.', 940, GROUND - 350, 36, '#f6efd0');
  screen();
}

// ---------- home, and the same day again ----------
const HOME_SIT_X = 1150;
function homeNight(t) {
  const camX = kf([[166, 950], [170, 900], [181, 900], [184, 820]], t);
  screen(); ctx.fillStyle = '#2a2b4c'; ctx.fillRect(0, 0, W, H);
  view(camX, 1.06, 890);
  const dawn = inv(181.5, 187, t);
  wallRect(-300, 1700, mix('#b9a89e', '#d4c4b4', dawn * .6), 'dots');
  ctx.fillStyle = mix('#7d6a54', '#a68a63', dawn * .5); ctx.fillRect(-300, GROUND, 2100, 600);
  line(seg(-300, GROUND, 1700, GROUND), 2, C.line, { amp: .4 });
  cut(rrect(-300, GROUND - 20, 2000, 20, 2), '#d9d0be', { line: C.line, w: 1.4, amp: .3, shadow: false });
  bedroomProps(t);
  bedsideTable(t, t > 184.2);
  const bedTime = 12;
  bedroomBed(bedTime);
  // the desk under a lamp
  push(0, 48, 1);
  cut(rrect(880, 640, 230, 18, 4), C.wood, { line: C.line, w: 2, amp: .4, shadow: .8 });
  for (const lx of [896, 1090]) cut(rrect(lx, 658, 12, 132, 2), '#8a6a44', { line: C.line, w: 1.6, amp: .3 });
  cut(rrect(1012, 626, 88, 14, 3), '#e8dfc6', { line: C.line, w: 1.6, amp: .3, shadow: .5 }); // sketchbook
  cut(rrect(960, 604, 34, 36, 6), C.white, { pat: 'dots', line: C.line, w: 1.6, amp: .3, shadow: .5 });
  line(seg(940, 640, 940, 560), 5, '#5a5a66', { amp: .2 }); line(seg(940, 560, 1010, 520), 5, '#5a5a66', { amp: .2 }); cut(dome(1022, 526, 32, 24), '#e2b446', { line: C.line, w: 1.8, amp: .3 });
  const lamp = 1 - .15 * dawn;
  ctx.globalAlpha = .28 * lamp; cut(poly([1000, 540, 1046, 540, 1130, 700, 880, 700], true), '#fff2b0', { line: null, shadow: false, amp: 0 }); ctx.globalAlpha = 1;
  pop();
  cut(rrect(1130, 738, 90, 16, 6), '#3a3a48', { line: C.line, w: 1.8, amp: .3, shadow: .7 }); cut(rrect(1204, 610, 16, 146, 6), '#3a3a48', { line: C.line, w: 1.8, amp: .3 });
  // the man
  let x = HOME_SIT_X, P, o = { id: true, t, tie: false, flip: true };
  const sitP = Object.assign({}, SIT, { hy: -146, f1: [80, 0], f2: [102, 0], a1: [106, -192], a2: [84, -188], eye: .5, lean: .14, hx: 18, tilt: .16, mouth: 'flat' });
  o.pal = HERO;
  if (t < 168.6) { x = lerp(1500, HOME_SIT_X + 40, inv(166, 168.2, t)); P = walkPose(-x / (STRIDE * .7), { lean: .05, amp: .7 }); P.eye = .85; o.bag = true; }
  else if (t < 169.2) { x = lerp(HOME_SIT_X + 40, HOME_SIT_X, inv(168.6, 169.2, t)); P = Object.assign({}, STAND, { lean: .05 }); o.bag = false; }
  else {
    P = sitP;
    if (t < 170.1) P = mixP(Object.assign({}, STAND, { lean: .05 }), sitP, ease(inv(169.2, 170.1, t)));
    if (t >= 172 && t < 178.4) { const st = Math.sin(t * 5); P.a1 = [104 + st * 5, -193 + Math.sin(t * 9) * 2]; P.tilt = .26; }
    if (t > 175) P.eye = lerp(.8, .95, inv(175, 178, t));
    if (t > 177.4 && t < 178.6) { P.tilt = .3; P.eye = .95; }
    if (t >= 178.6 && t < 184.9) { P.a1 = [96, -180]; P.a2 = [122, -178]; P.tilt = .42; P.lean = .3; P.eye = 1; P.mouth = 'sad'; P.hdy = 24; }
    if (t >= 184.9) { const w = inv(184.9, 185.5, t); P = mixP(P, sitP, ease(w)); P.eye = lerp(1, .5, w); P.mouth = 'sigh'; P.tilt = .1; }
    o.h1 = t >= 172 && t < 178.4 ? () => cut(rrect(-4, -5, 22, 10, 2), C.red, { line: C.line, w: 1, amp: .1, shadow: false }) : null;
  }
  man(x, GROUND + 4, 1, P, o);
  if (t >= 179 && t < 184.9) { for (let k = 0; k < 3; k++) { const p = (t * .35 + k / 3) % 1; ctx.globalAlpha = Math.sin(p * Math.PI); hand('z', 1090 + p * 44, 450 - p * 110, 30 + p * 26, '#f6efd0'); ctx.globalAlpha = 1; } }
  // close-up of the page
  if (t > 171.8 && t < 178.8) {
    const k = backOut(inv(171.8, 172.4, t)) * (1 - inv(178.2, 178.8, t));
    screen(); ctx.globalAlpha = .6 * k; ctx.fillStyle = '#141428'; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1;
    push(540, 520, k);
    cut(rrect(-360, -300, 720, 600, 10), '#fbf8f0', { line: C.line, w: 3, amp: .5, shadow: 1 });
    for (let r = 0; r < 9; r++) line(seg(-330, -230 + r * 60, 330, -230 + r * 60), 1.2, '#dad4c4', { amp: .3 });
    boat(0, 30, 2.05, lin([[172.4, 0], [176.5, .78], [178, .8]], t), { w: 6 });
    const pen = penAt(place(boatShapes(), 0, 30, 2.05), lin([[172.4, 0], [176.5, .78]], t));
    if (t < 176.8) { push(pen[0], pen[1], 1, -.5); line(seg(0, 0, 90, -150), 14, '#e0a040', { amp: .1 }); cut(poly([-4, 4, 4, 4, 0, -10], true), '#2a2a34', { line: null, shadow: false, amp: 0 }); pop(); }
    pop();
  }
  screen();
  if (t > 184.2) { const j = Math.sin(t * 60) * 3; if (t < 186) hand('RIIING!', 540 + j, 300, 96, C.red); }
}
