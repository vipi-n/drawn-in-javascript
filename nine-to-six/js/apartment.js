// Scene 1: the flat. A bedroom, a bathroom door and a kitchen, seen in one long pan.
const BED_SIT_X = 770, DOOR_X = 2010;

function alarmClock(x, y, t, ringing) {
  const shake = ringing ? Math.sin(t * 90) * .05 : 0;
  push(x, y, 1, shake);
  for (const s of [-1, 1]) { cut(circ(s * 26, -42, 15), '#c9463b', { w: 2, amp: .3 }); }
  line(seg(0, -58, 0, -46), 3, C.line);
  cut(rrect(-32, 30, 14, 14, 3), C.line, { line: null, shadow: false }); cut(rrect(18, 30, 14, 14, 3), C.line, { line: null, shadow: false });
  cut(circ(0, 0, 40), '#e0603f', { w: 2.4, amp: .4, shadow: .8 });
  cut(circ(0, 0, 31), C.white, { w: 1.8, amp: .3, shadow: false });
  const h = clockAt(t);
  line(seg(0, 0, Math.cos(((h % 12) / 12) * TAU - Math.PI / 2) * 15, Math.sin(((h % 12) / 12) * TAU - Math.PI / 2) * 15), 3, C.line, { amp: .1 });
  line(seg(0, 0, Math.cos((h % 1) * TAU - Math.PI / 2) * 24, Math.sin((h % 1) * TAU - Math.PI / 2) * 24), 2, C.line, { amp: .1 });
  pop();
  if (ringing) {
    for (let k = 0; k < 3; k++) {
      const j = Math.sin(t * 30 + k * 2) * 4;
      sketch(curve(x + 58 + k * 12 + j, y - 30 - k * 10, x + 76 + k * 12 + j, y - 6, x + 76 + k * 12 + j, y + 6, x + 58 + k * 12 + j, y + 30 + k * 10), 1, { w: 3.2, amp: .3 });
      sketch(curve(x - 58 - k * 12 - j, y - 30 - k * 10, x - 76 - k * 12 - j, y - 6, x - 76 - k * 12 - j, y + 6, x - 58 - k * 12 - j, y + 30 + k * 10), 1, { w: 3.2, amp: .3 });
    }
  }
}

function quiltPatches(x0, y0, x1, y1) {
  const cw = 60, ch = 44;
  for (let r = 0; r * ch < y1 - y0 + ch; r++) for (let c = 0; c * cw < x1 - x0 + cw; c++) {
    const i = r * 20 + c, col = C.leaves[Math.floor(hash(i * 3 + 2) * C.leaves.length)];
    cut(rrect(x0 + c * cw, y0 + r * ch, cw, ch, 0), col, { pat: PATS[Math.floor(hash(i * 5) * PATS.length)], line: '#fbf8f0', w: 2, shadow: false, amp: .2 });
  }
}

function bedroomBed(t) {
  const k = ease(inv(7.6, 8.3, t)), breathe = Math.sin(t * 1.5) * 2 * (1 - k);
  cut(rrect(190, 560, 30, 290, 5), C.wood, { line: C.line, w: 1.8, amp: .4 });
  cut(rrect(200, 722, 622, 40, 6), C.wood, { line: C.line, w: 1.8, amp: .4 });
  cut(rrect(806, 760, 16, 90, 4), C.wood, { line: C.line, w: 1.6, amp: .3 });
  cut(rrect(206, 690, 604, 44, 16), '#f6f1e6', { line: C.line, w: 1.8, amp: .4 });
  cut(rrect(226, 648, 132, 48, 22), C.white, { line: C.line, w: 1.8, amp: .4 });
  if (t < 8.1) {
    // head on the pillow
    cut(circ(300, 636, 38), HERO.skin, { w: 1.9, amp: .4 });
    cut(dome(295, 632, 42, 40), HERO.hair, { pat: 'speck', w: 1.8, amp: .4, shadow: false });
    cut(poly([256, 632, 280, 636, 272, 660, 254, 654], true), HERO.hair, { w: 1.4, amp: .3, shadow: false });
    const awake = t > 5.2;
    if (!awake) line(curve(312, 640, 320, 646, 332, 646, 340, 640), 2.4, C.black, { amp: .2 });
    else { cut(circ(326, 640, 8), C.white, { line: C.line, w: 1.6, shadow: false }); dot(322, 641, 4, C.black); }
    line(seg(322, 668, 340, 668), 2, C.line, { amp: .2 });
  }
  // quilt
  const top = 640 + breathe + k * 44, q = poly([330, 700, 350, top + 14, 430, top, 560, top + 6, 700, top + 30 + k * 10, 810, 718 + k * 20, 812, 768, 330, 768], true);
  cut(q, C.leaves[0], { line: null, shadow: .8, amp: .4 });
  clipTo(q); quiltPatches(320, top - 10, 820, 780); unclip();
  line(q, 2.2, C.line, { amp: .5 });
}

function bedsideTable(t, ringing) {
  cut(rrect(30, 650, 150, 200, 6), C.wood, { pat: 'stripe', line: C.line, w: 1.8, amp: .4 });
  cut(rrect(40, 668, 130, 8, 3), C.woodD, { line: null, shadow: false });
  cut(rrect(44, 776, 122, 22, 3), C.red, { line: C.line, w: 1.6, amp: .3, shadow: false });
  cut(rrect(52, 798, 110, 20, 3), C.mustard, { line: C.line, w: 1.6, amp: .3, shadow: false });
  alarmClock(105, 606, t, ringing);
}

function bedroomProps(t) {
  windowFrame(390, 230, 200, 290, t);
  // curtains
  for (const [cx, sg] of [[380, -1], [600, 1]]) {
    cut(rrect(cx - 30, 210, 60, 350, 8), '#e9a7a4', { pat: 'flower', line: C.line, w: 1.6, amp: .5 });
    for (let j = -1; j <= 1; j++) line(seg(cx + j * 16, 214, cx + j * 16 + sg * 2, 556), 1.3, '#c98682', { amp: .4, alpha: .7 });
  }
  // the pinned dream
  cut(rrect(650, 330, 170, 130, 3), '#fbf8f0', { line: C.line, w: 1.6, amp: .5, shadow: 1 });
  dot(735, 340, 5, C.redD);
  boat(735, 405, .48, 1, { w: 3 });
  // shelf with a plant
  cut(rrect(880, 420, 130, 12, 3), C.wood, { line: C.line, w: 1.6, amp: .3 });
  cut(dome(945, 420, 24, 20), '#c9865a', { line: C.line, w: 1.6, amp: .3 });
  for (let j = 0; j < 5; j++) cut(leafShape(945, 402, 46, 18, -Math.PI / 2 + (j - 2) * .5 + Math.sin(t + j) * .04), C.green, { pat: 'ldots', w: 1.3, amp: .3 });
  // morning light on the floor
  const lg = 1 - inv(6, 20, t);
  if (lg > 0) { ctx.globalAlpha = .22 * lg; cut(poly([400, 520, 590, 520, 700, 850, 470, 850], true), '#fff0b0', { line: null, shadow: false, amp: 0 }); ctx.globalAlpha = 1; }
}

function fridge(t, open) {
  const x = 1330, y = 340, w = 170, h = 510;
  cut(rrect(x, y, w, h, 10), '#f7f2c8', { line: C.line, w: 2, amp: .4, shadow: .9 });
  if (open > .02) {
    for (const sy of [y + 150, y + 270, y + 390]) line(seg(x + 8, sy, x + w - 8, sy), 3, '#b9c9c6', { amp: .3 });
    cut(ell(x + 60, y + 258, 15, 11), C.gold, { w: 1.4, amp: .3, shadow: false });
    cut(rrect(x + 108, y + 174, 26, 96, 6), '#9fcbe0', { w: 1.4, amp: .3, shadow: false });
    line(seg(x + 112, y + 200, x + 130, y + 200), 2, C.white);
    // the lonely lemon glows in the light
  }
  const dw = w * (1 - .78 * open), dx = x - 30 * open;
  cut(rrect(dx, y - 4, dw, h + 8, 10), '#a9d3cf', { pat: 'ldots', line: C.line, w: 2, amp: .4, shadow: .9 });
  cut(rrect(dx + dw - 20 - (1 - open) * 4, y + 100, 9, 120, 4), C.white, { line: C.line, w: 1.4, amp: .2, shadow: false });
  if (open > .3) { ctx.globalAlpha = .28 * open; cut(poly([x + 10, y + h, x + w, y + h, x + w + 80, 850 + 60, x - 90, 850 + 60], true), '#fff2b0', { line: null, shadow: false, amp: 0 }); ctx.globalAlpha = 1; }
}

function kitchenProps(t) {
  cut(rrect(1560, 520, 560, 250, 0), '#f3efe4', { pat: 'grid', line: null, shadow: false, amp: 0 });
  clockFace(1660, 380, 44, clockAt(t), { w: 2.6 });
  // calendar with a circled date
  cut(rrect(1800, 300, 100, 120, 4), C.white, { line: C.line, w: 1.8, amp: .4 });
  cut(rrect(1800, 300, 100, 26, 4), C.red, { line: C.line, w: 1.8, amp: .3 });
  hand('FRI', 1850, 386, 34, C.line);
  sketch(circ(1850, 372, 40, 30), inv(21, 22, t), { w: 3, amp: .5 });
  // counter
  cut(rrect(1560, 700, 470, 150, 4), '#c9b79c', { pat: 'stripe', line: C.line, w: 1.8, amp: .4, shadow: .7 });
  cut(rrect(1550, 686, 490, 20, 4), '#e8e0d0', { line: C.line, w: 1.8, amp: .3 });
  // kettle, an empty bread bin, an empty fruit bowl
  cut(dome(1620, 686, 32, 40), '#b9c4cc', { pat: 'ldots', line: C.line, w: 1.8, amp: .3 });
  cut(rrect(1712, 626, 96, 60, 8), C.tan, { line: C.line, w: 1.8, amp: .3 });
  hand('bread', 1760, 664, 26, C.line);
  cut(dome(1900, 686, 46, 22), '#d98a3d', { line: C.line, w: 1.8, amp: .3 });
  const door = kf([[27.9, 0], [28.9, 1]], t);
  cut(rrect(1930, 320, 190, 530, 6), C.wood, { line: C.line, w: 2, amp: .4, shadow: .8 });
  if (door > 0) {
    cut(rrect(1946, 336, 158, 514, 4), mix('#fdf3c8', skyAt(30)[0], .4), { line: null, shadow: false });
    cut(poly([1946, 336, 1946 + 158 * (1 - door * .8), 336 + 10 * door, 1946 + 158 * (1 - door * .8), 850 - 10 * door, 1946, 850], true), C.woodD, { line: C.line, w: 1.8, amp: .3 });
  } else {
    cut(rrect(1946, 336, 158, 514, 4), C.woodD, { pat: 'stripe', line: C.line, w: 1.8, amp: .3 });
    cut(circ(2084, 600, 8), C.gold, { w: 1.4, amp: .2 });
  }
  // shoes, a hook and a bag
  cut(rrect(1900, 500, 12, 30, 2), C.wood, { line: C.line, w: 1.4 });
  if (t < 28.3) {
    push(1780, 560, 1, Math.sin(t * .8) * .02);
    cut(rrect(-30, -52, 60, 100, 16), HERO.bag, { pat: 'flower', line: C.line, w: 1.8, amp: .5, shadow: .7 });
    pop();
  }
}

// where the man is, and what he is doing
function heroApt(t) {
  const S = { vis: true, x: BED_SIT_X, P: Object.assign({}, STAND), o: { id: false, t }, flip: false, pj: true };
  if (t < 8) { S.vis = false; return S; }
  if (t < 16.5) { // sits on the edge of the bed
    const sit = Object.assign({}, SIT, { hy: -188, hx: 0, f1: [70, -8], f2: [92, -6], a1: [26, -130], a2: [40, -126], eye: .45, look: 0 });
    let P = sit;
    const yawn = inv(8.6, 9.4, t) * (1 - inv(10.6, 11.2, t));
    if (t >= 8.6 && t < 11.4) { P = Object.assign({}, sit, { mouth: 'open', mo: yawn, eye: .95, a1: [34, -300 * yawn - 130 * (1 - yawn)], a2: [26, -280 * yawn - 126 * (1 - yawn)], lean: -.08 * yawn, tilt: -.1 * yawn }); }
    else if (t >= 11.4 && t < 12.6) P = Object.assign({}, sit, { eye: .8, a1: [50, -262], a2: [30, -100], mouth: 'flat', tilt: .1 });
    else if (t >= 12.6 && t < 14.4) P = Object.assign({}, sit, { eye: .5, mouth: 'sigh', lean: .12, tilt: .14, brow: -3 });
    else if (t >= 14.4 && t < 15.5) {
      P = Object.assign({}, sit, { eye: .3, a1: [58, -232], lean: .1, tilt: .16 });
      S.o.h1 = () => { cut(rrect(-10, -26, 22, 40, 4), '#2a2a34', { w: 1.3, amp: .2, shadow: false }); cut(rrect(-7, -22, 16, 30, 2), '#a8d4ff', { line: null, shadow: false, amp: 0 }); };
    } else if (t >= 15.5) { P = Object.assign({}, sit, { eye: .5, mouth: 'sad', tilt: -.12, look: -1, brow: 3 }); S.flip = true; }
    S.P = P; return S;
  }
  const dressedAfter = 20.4;
  S.pj = t < dressedAfter;
  const wk = (x0, x1, ta, tb) => { const x = lerp(x0, x1, inv(ta, tb, t)); return x; };
  if (t < 18.4) { S.x = wk(BED_SIT_X, 1060, 16.5, 18.4); S.P = mixP(Object.assign({}, SIT, { hy: -188, f1: [70, -8], f2: [92, -6], a1: [26, -130], a2: [40, -126], eye: .5, mouth: 'flat' }), walkPose(S.x / STRIDE, { lean: .08 }), ease(inv(16.5, 17.3, t))); S.P.eye = .6; return S; }
  if (t < 20.4) { S.x = 1060; S.vis = false; return S; }
  if (t < 21.8) { S.x = wk(1060, 1240, 20.4, 21.8); S.P = walkPose(S.x / STRIDE, { lean: .09 }); S.o.bag = false; S.o.id = true; return S; }
  S.o.id = true;
  if (t < 26.8) { // at the fridge
    S.x = 1240;
    const rummage = inv(22.2, 22.8, t);
    S.P = Object.assign({}, STAND, { lean: .05 + .05 * rummage, tilt: .1, a1: [62 + 14 * Math.sin(t * 2) * rummage, -196], mouth: t > 23.6 && t < 25 ? 'sad' : 'flat', eye: .5, brow: t > 23.6 ? 3 : 0 });
    if (t > 24.9) { S.P.look = 1; S.P.tilt = -.15; S.P.eye = .2; S.P.a1 = [30, -210]; S.P.mouth = 'open'; S.P.mo = .4; }
    S.P = mixP(walkPose(S.x / STRIDE, { lean: .09 }), S.P, ease(inv(21.8, 22.4, t)));
    return S;
  }
  const ex = wk(1240, 2030, 26.8, 29.4);
  S.x = ex; S.P = walkPose(ex / (STRIDE * 1.1), { lean: .13, amp: 1.1 }); S.o.bag = t > 28.3 - 0.5 && ex > 1780; S.P.eye = .4;
  if (ex > 1900 && t > 28.2) S.P.a1 = [30, -220];
  if (t > 29.2) S.vis = false;
  return S;
}

function apartment(t, camX) {
  screen(); ctx.fillStyle = '#efe6d8'; ctx.fillRect(0, 0, W, H);
  view(camX, 1, 850);
  wallRect(-260, 1130, '#ead7c0', 'dots');
  wallRect(1130, 2260, '#d2e3db', 'ldots');
  floorRect(-260, 2260, '#d1ac7c');
  const ringing = t > 4 && t < 6.6;
  bedroomProps(t);
  bedsideTable(t, ringing);
  bedroomBed(t);
  kitchenProps(t);
  const open = kf([[22, 0], [22.9, 1], [26.1, 1], [26.9, 0]], t);
  fridge(t, open);
  // the man
  const H1 = heroApt(t);
  if (t >= 8 && t < 8.9) { /* sit-up pop handled by pose */ }
  // his arm slams the alarm
  if (t > 5.3 && t < 8.1) {
    const reach = kf([[5.3, 0], [6.2, 1], [7.3, 1], [8, 0]], t), slam = t > 6.3 && t < 6.6 ? 14 : 0;
    const hx = lerp(330, 120, reach), hy = lerp(690, 580 + slam, reach);
    cut(limb([340, 700, lerp(340, 220, reach), lerp(690, 650, reach) - 30 * reach, hx, hy], [30, 26, 22]), PJ.shirt, { pat: 'ldots', w: 1.7, amp: .4, shadow: .6 });
    cut(circ(hx, hy, 14), HERO.skin, { w: 1.6, amp: .3 });
  }
  if (H1.vis) {
    const pal = H1.pj ? PJ : HERO;
    const pop2 = t < 8.7 ? backOut(inv(8, 8.6, t)) : 1;
    man(H1.x, GROUND, 1, H1.P, Object.assign({ pal, flip: H1.flip, tie: !H1.pj, t }, H1.o));
  }
  // bathroom door
  const shut = t > 18.2 && t < 20.6;
  if (shut) {
    cut(rrect(1010, 300, 120, 550, 4), C.wood, { pat: 'stripe', line: C.line, w: 2, amp: .4, shadow: 1 });
    cut(circ(1112, 600, 8), C.gold, { w: 1.4, amp: .2 });
    cut(rrect(1040, 340, 60, 40, 6), C.cream, { line: C.line, w: 1.4, amp: .3, shadow: false }); hand('WC', 1070, 370, 26, C.line);
  } else {
    cut(rrect(1010, 300, 120, 550, 4), '#3d3a46', { line: C.line, w: 2, amp: .4, shadow: .8 });
    cut(poly([1010, 300, 1040, 306, 1040, 850, 1010, 850], true), C.wood, { line: C.line, w: 1.6, amp: .3, shadow: false });
  }
  // sounds you can see
  if (t > 23.5 && t < 25.2) hand('grrrr...', 1240 + 6, 560 + Math.sin(t * 30) * 2, 34, C.sketch);
  if (t > 12.1 && t < 15.6) {
    const u = inv(12.1, 13.0, t), fade = 1 - inv(15, 15.6, t);
    ctx.globalAlpha = fade; thoughtCloud(940, 250, 190, 110, 850, 470, u);
    officeIcon(920, 270, .82, 12.9, t); ctx.globalAlpha = 1;
  }
  if (t > 14.5 && t < 15.7) { const k = backOut(inv(14.5, 14.9, t)); push(880, 520, k); cut(circ(0, 0, 24), C.red, { line: C.line, w: 1.6, amp: .2 }); hand('9', 0, 11, 34, C.white); pop(); }
  if (t > 15.5 && t < 16.8) { ctx.globalAlpha = .9; boat(735, 405, .48, 1, { w: 3.6, color: '#df3a2e' }); ctx.globalAlpha = 1; }
}
