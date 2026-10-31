// Sky, hills, ground, trees and the race course. Everything is a flat paper cut-out.
const DUSK = {
  hills: [['#d3e3e6', '#d9c6d6'], ['#aecfd3', '#bba9cb'], ['#8dbfc0', '#9c8fba'], ['#6ea7a5', '#7b73a1']],
  bands: ['#c9adc7', '#efc0b6', '#f2d9b0'],
  ground: ['#f0ebdf', '#e8ddd0'],
  sun: ['#f1dc93', '#f2b46f']
};
const duskAt = t => ease(inv(29, 46, t));

// piecewise-smooth keyframes: [[t, v], ...]
function kf(keys, t) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    if (t <= keys[i][0]) return lerp(keys[i - 1][1], keys[i][1], ease(inv(keys[i - 1][0], keys[i][0], t)));
  }
  return keys[keys.length - 1][1];
}

// screen y of the horizon for a camera that keeps GROUND at screen y = g
const horizonY = (s, g) => g + (HORIZON - GROUND) * s;

function tornBand(y0, y1, color, alpha, salt) {
  const pts = [];
  for (let x = -20; x <= W + 20; x += 14) pts.push(x, y0 + (hash(salt + x / 14) - .5) * 7);
  for (let x = W + 20; x >= -20; x -= 14) pts.push(x, y1 + (hash(salt + 99 + x / 14) - .5) * 7);
  cut(poly(pts, true), color, { line: null, shadow: false, amp: 0, alpha });
}

function sunDisc(x, y, r, color) {
  push(x, y, 1);
  ctx.strokeStyle = C.goldD; ctx.lineWidth = 1.4; ctx.lineCap = 'round';
  for (let k = 0; k < 16; k++) {
    const a = k / 16 * TAU + .1, r1 = r * 1.22, r2 = r * (1.42 + (k % 2) * .16);
    ctx.beginPath(); ctx.moveTo(Math.cos(a) * r1, Math.sin(a) * r1); ctx.lineTo(Math.cos(a) * r2, Math.sin(a) * r2); ctx.stroke();
  }
  cut(circ(0, 0, r), color, { pat: 'speck', line: C.goldD, w: 1.6, shadow: .5 });
  pop();
}

function cloud(x, y, w, h) {
  const p = [], n = 40;
  for (let k = 0; k <= n; k++) {
    const u = k / n * 2 - 1;
    p.push(x + u * w / 2, y - h * Math.sqrt(Math.max(0, 1 - u * u)) * (.72 + .28 * Math.abs(Math.sin(u * 7.4 + 1))));
  }
  p.push(x + w / 2, y, x - w / 2, y);
  cut(poly(p, true), C.white, { line: '#b9b2a4', w: 1.3, shadow: .3, amp: .4 });
}

// pointed ridge, optionally fringed with tiny fir trees
function hillLayer(camX, camY, s, par, amp, color, k, fringe) {
  camera(camX * par, camY, s);
  const x0 = Math.floor(viewL() / 7) * 7 - 14, x1 = viewR() + 14, pts = [];
  for (let x = x0; x <= x1; x += 7) {
    const a = 1 - Math.abs(Math.sin(x * .0042 + k)), b = 1 - Math.abs(Math.sin(x * .0111 + k * 2.3));
    let h = amp * (.62 * Math.pow(a, 1.25) + .38 * b) + amp * .12;
    if (fringe) { const i = Math.floor(x / 14), f = Math.abs(((x % 14) + 14) % 14 / 7 - 1); h += fringe * (.35 + .65 * hash(i + k * 31)) * (1 - f) * (hash(i * 7 + 3) < .82 ? 1 : .2); }
    pts.push(x, HORIZON - h);
  }
  pts.push(x1, HORIZON + 40, x0, HORIZON + 40);
  cut(poly(pts, true), color, { line: null, shadow: false, amp: 0 });
}

// ---------- ground props ----------
function tuft(x, y, sc = 1, col = C.line) {
  for (let k = 0; k < 4; k++) {
    const a = -Math.PI / 2 + (k - 1.5) * .28, l = (16 + hash(x + k) * 12) * sc;
    line(seg(x, y, x + Math.cos(a) * l, y + Math.sin(a) * l), 1.4, col, { amp: .3 });
  }
}
function pebble(x, y, sc = 1) {
  cut(dome(x, y, 30 * sc, 17 * sc), C.stone, { line: C.line, w: 1.4, shadow: .5, amp: .5 });
}
function smallFlower(x, y, col, sc = 1) {
  line(seg(x, y, x + 2, y - 34 * sc), 1.6, C.green, { amp: .3 });
  for (let k = 0; k < 5; k++) { const a = k / 5 * TAU; cut(circ(x + 2 + Math.cos(a) * 6 * sc, y - 36 * sc + Math.sin(a) * 6 * sc, 5 * sc), col, { line: null, shadow: false, amp: 0 }); }
  cut(circ(x + 2, y - 36 * sc, 3.4 * sc), C.gold, { line: null, shadow: false, amp: 0 });
}
function groundProps(t) {
  const a = Math.floor(viewL() / 260) - 1, b = Math.ceil(viewR() / 260) + 1;
  for (let i = a; i <= b; i++) {
    const x = i * 260 + hash(i * 13) * 200;
    if (hash(i * 5 + 1) < .8) tuft(x, GROUND, .8 + hash(i) * .5);
    if (hash(i * 7 + 2) < .26) pebble(x + 90, GROUND + 1, .8 + hash(i * 3) * .6);
    if (hash(i * 11 + 4) < .3) smallFlower(x + 150, GROUND, [C.red, C.gold, '#e9a7a4', '#9fcbe0'][i & 3], .9 + hash(i * 2) * .4);
  }
}

// ---------- patchwork tree ----------
function tree(x, gy, sc, id, t, o = {}) {
  push(x, gy, sc);
  const sway = Math.sin(t * 1.3 + id) * .015;
  const bark = C.bark;
  cut(limb([0, 0, 2, -90, 6, -190], [42, 30, 20]), bark, { line: null, shadow: .7, amp: .5 });
  for (const [bx, by] of [[-105, -250], [8, -300], [110, -250], [-55, -215], [62, -218]]) {
    cut(limb([4, -150, bx * .5 + 4, (by - 150) / 2 - 150 + 40, bx, by], [15, 11, 6]), bark, { line: null, shadow: .5, amp: .4 });
  }
  const N = o.bare ? 0 : 54;
  for (let i = 0; i < N; i++) {
    const u = hash(id * 100 + i * 3), v = hash(id * 100 + i * 5 + 1), r = Math.sqrt(u);
    const a = v * TAU, lx = Math.cos(a) * r * 165, ly = -265 + Math.sin(a) * r * 105;
    const fall = o.fall ? clamp((o.fall * 1.4 - hash(id * 7 + i) * .9) / .5) : 0;
    if (fall >= 1) continue;
    const ang = hash(id * 100 + i * 7 + 2) * TAU + Math.sin(t * 1.6 + i) * .12 + fall * 4;
    const ox = lx + Math.sin(fall * 6 + i) * 30 * fall, oy = ly + fall * fall * 300;
    const col = C.leaves[Math.floor(hash(id * 100 + i * 11) * C.leaves.length)];
    const pt = PATS[Math.floor(hash(id * 100 + i * 13) * PATS.length)];
    ctx.globalAlpha = 1 - fall * fall;
    cut(leafShape(ox, oy, 52 + hash(i) * 14, 30 + hash(i * 3) * 8, ang), col, { pat: pt, w: 1.2, shadow: .6, amp: .4 });
    ctx.globalAlpha = 1;
  }
  pop();
}

// ---------- race course ----------
function startLine(t) {
  const x = START_LINE, sx = 340;
  cut(rrect(x - 7, GROUND - 6, 14, 150, 3), C.white, { pat: 'check', line: C.line, w: 1.4, shadow: .6, amp: .4 });
  // little signpost
  cut(rrect(sx - 6, GROUND - 150, 12, 150, 3), C.wood, { line: C.line, w: 1.4, amp: .5 });
  push(sx, GROUND - 130, 1, -.04);
  cut(poly([-70, -30, 78, -30, 108, 0, 78, 30, -70, 30], true), C.sand, { pat: 'ldots', line: C.line, w: 1.6, amp: .5 });
  hand('START', 6, 12, 32, C.line);
  pop();
}

function finishGate(t, tHead) {
  const x = FINISH;
  // two poles with a chequered banner
  for (const px of [x - 30, x + 90]) cut(rrect(px - 7, GROUND - 330, 14, 340, 3), C.wood, { line: C.line, w: 1.4, amp: .5 });
  const sw = Math.sin(t * 2.1) * 3;
  cut(poly([x - 40, GROUND - 335 + sw, x + 100, GROUND - 335 - sw, x + 100, GROUND - 275 - sw, x - 40, GROUND - 275 + sw], true), C.white, { pat: 'check', line: C.line, w: 1.6, amp: .5 });
  cut(rrect(x - 25, GROUND - 322, 110, 36, 8), C.cream, { line: C.line, w: 1.4, amp: .4, shadow: .3 });
  hand('FINISH', x + 30, GROUND - 292, 32, C.redD);
  // streamers the runners push through
  for (let i = 0; i < 9; i++) {
    const sx = x + 12 + i * 9, pass = tHead(sx), dt = t - pass;
    let dx = Math.sin(t * 2 + i) * 3;
    if (dt > 0) dx = 46 * Math.exp(-dt * 1.8) * Math.cos(dt * 6 + i * .6) - 6 * Math.exp(-dt * .8);
    else if (dt > -1.0) dx = -14 * inv(-1.0, 0, dt) + dx;
    const top = GROUND - 275, col = [C.red, C.white, C.gold][i % 3];
    const pts = [sx, top, sx + dx * .25, top + 55, sx + dx * .7, top + 110, sx + dx, top + 170, sx + dx * .8, GROUND - 20];
    cut(limb(pts, [9, 9, 9, 9, 7]), col, { pat: i % 3 === 1 ? 'stripe' : null, line: C.line, w: 1, amp: .3, shadow: .4 });
  }
}

// paper-torn sky transitions, sun, clouds, hills, ground plane
function backdrop(t, camX, camY, s, g) {
  const d = duskAt(t);
  screen(); paper(C.paper);
  const hy = horizonY(s, g);
  if (d > 0) {
    tornBand(-10, 250, DUSK.bands[0], d, 11);
    tornBand(250, 410, DUSK.bands[1], d, 33);
    tornBand(410, hy + 60, DUSK.bands[2], d, 57);
  }
  const sx = kf([[0, 160], [30, 470], [60, 830]], t) - camX * .012;
  const sy = kf([[0, 250], [14, 150], [30, 190], [44, 390], [56, 560]], t) + (s - 1) * -60;
  sunDisc(sx, sy, 50, mix(DUSK.sun[0], DUSK.sun[1], d));
  ctx.globalAlpha = 1 - d * .8;
  for (let i = 0; i < 5; i++) { const cx = ((i * 330 + 90 - t * 6 - camX * .05) % 1700 + 1700) % 1700 - 300; cloud(cx, 140 + (i % 3) * 70 + (s - 1) * -60, 130 + hash(i) * 60, 26 + hash(i + 4) * 8); }
  ctx.globalAlpha = 1;
  const camYh = camY;
  hillLayer(camX, camYh, s, .1, 105, mix(DUSK.hills[0][0], DUSK.hills[0][1], d), 1.3, 0);
  hillLayer(camX, camYh, s, .2, 70, mix(DUSK.hills[1][0], DUSK.hills[1][1], d), 4.1, 7);
  hillLayer(camX, camYh, s, .35, 34, mix(DUSK.hills[2][0], DUSK.hills[2][1], d), 7.7, 16);
  hillLayer(camX, camYh, s, .6, 8, mix(DUSK.hills[3][0], DUSK.hills[3][1], d), 2.2, 18);
  screen();
  ctx.fillStyle = mix(DUSK.ground[0], DUSK.ground[1], d); ctx.fillRect(0, hy, W, H - hy + 2);
}
