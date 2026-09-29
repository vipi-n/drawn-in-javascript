// Characters and props. All drawn in local coordinates with origin at the feet / ground contact.

function under(shape, color = C.paper) { blot(shape, color, .6); }
function clipTo(shape) {
  const p = new Path2D();
  for (const s of subs(shape)) { p.moveTo(s.p[0], s.p[1]); for (let k = 1; k < s.p.length / 2; k++) p.lineTo(s.p[2 * k], s.p[2 * k + 1]); p.closePath(); }
  ctx.save(); ctx.clip(p);
}
function unclip() { ctx.restore(); }

function eyeball(x, y, r, o = {}) {
  const lx = (o.lx ?? 0) * r * .28, ly = (o.ly ?? 0) * r * .28;
  under(circ(x, y, r), o.white ?? C.white);
  if (o.ring) crayon(circ(x + lx, y + ly, r * .8), o.ring, { gap: 3, w: 4, amp: .6, ragged: 1 });
  dot(x + lx, y + ly, r * (o.pupil ?? .6));
  dot(x + lx + r * .22, y + ly - r * .22, r * .16, C.white);
  dot(x + lx - r * .18, y + ly + r * .18, r * .08, C.white);
  ink(circ(x, y, r), o.w ?? 2.6);
}
function blush(x, y, rx = 7, ry = 4) { crayon(circ(x, y, rx, ry), C.pink, { gap: 3, w: 4, amp: 1, alpha: .8 }); }
function shake(x, y, r, n = 6, a0 = 0, a1 = TAU, len = 12) {
  const out = [];
  for (let k = 0; k < n; k++) {
    const a = a0 + (a1 - a0) * (k + .5) / n + rr(-.1, .1);
    out.push(seg(x + Math.cos(a) * r, y + Math.sin(a) * r, x + Math.cos(a) * (r + len), y + Math.sin(a) * (r + len)));
  }
  ink(out, 2.2);
}
function speedLines(x, y, n, len, spread, dir = -1) {
  const out = [];
  for (let k = 0; k < n; k++) {
    const yy = y + (k - n / 2) * spread + hash(k * 13) * 6, l = len * (.6 + hash(k * 7) * .6);
    out.push(seg(x, yy, x + dir * l, yy));
  }
  ink(out, 2);
}

// ---------------- sky ----------------
function sun(x, y, r, o = {}) {
  const col = o.color ?? C.yellow;
  under(circ(x, y, r));
  crayon(circ(x, y, r * .98), o.fill ?? C.cream, { gap: 5, w: 6, amp: 1.5, alpha: .5 });
  crayonLine(spiral(x, y, r * .78, o.turns ?? 3, r * .06), col, r * .28, { amp: 1.2 });
  if (o.core) crayonLine(spiral(x, y, r * .4, 2, 1), o.core, r * .2, { amp: 1 });
  ink(circ(x, y, r), o.w ?? 2.6);
  if (o.rays) {
    const n = o.n ?? 10, out = [];
    for (let k = 0; k < n; k++) {
      const a = k / n * TAU + (o.spin ?? 0), r1 = r * 1.35, r2 = r * (1.35 + o.rays * .35);
      out.push(seg(x + Math.cos(a) * r1, y + Math.sin(a) * r1, x + Math.cos(a) * r2, y + Math.sin(a) * r2));
    }
    ink(out, 2.4);
  }
  if (o.arc) ink(circ(x + r * .15, y, r * 1.28, r * 1.3, -1.35, 1.5), 2.4);
}
function moon(x, y, r, o = {}) {
  under(circ(x, y, r), C.cream);
  crayon(circ(x, y, r * .96), '#f3dd98', { gap: 5, w: 7, amp: 1.5, alpha: .8, cross: true });
  ink(circ(x, y, r), 3, o.line ?? C.ink);
}

// ---------------- ground & plants ----------------
function groundLine(x0, x1, y = GROUND, w = 3) {
  ink(seg(x0, y, x1, y), w);
}
function groundTexture(x0, x1, y = GROUND, seedN = 1) {
  const out = [];
  for (let x = x0; x < x1; x += 60) {
    const h = hash(Math.floor(x / 60) * 31 + seedN);
    if (h < .45) continue;
    const yy = y + 10 + h * 22;
    out.push(seg(x + h * 30, yy, x + h * 30 + 30 + h * 50, yy));
  }
  ink(out, 1.8);
}
function tuft(x, y, s = 1, col = C.green) {
  push(x, y, s);
  const blades = ['M -8 0 C -10 -12, -14 -20, -18 -26', 'M -2 0 C -2 -14, 0 -26, 2 -34', 'M 4 0 C 6 -10, 12 -18, 18 -22', 'M 0 0 C -4 -8, -8 -12, -12 -14'];
  for (const b of blades) crayonLine(b, col, 5, { passes: 1 });
  ink(blades.join(' '), 2);
  pop();
}
function horsetail(x, y, h = 90, s = 1) {
  push(x, y, s);
  crayonLine(`M 0 0 L 0 ${-h}`, C.green, 7, { passes: 1 });
  let d = `M 0 0 L 0 ${-h}`;
  for (let yy = -14; yy > -h + 6; yy -= 14) d += ` M -6 ${yy + 5} L 0 ${yy} L 6 ${yy + 5}`;
  d += ` M -3 ${-h + 8} L 0 ${-h - 10} L 3 ${-h + 8}`;
  ink(d, 2);
  pop();
}
function fern(x, y, h = 140, lean = .3, s = 1, grow = 1) {
  if (grow <= 0) return;
  push(x, y, s);
  const stems = [], leaves = [];
  const fronds = [[-.55 + lean * .4, .75], [lean * .5, 1], [.6 + lean * .4, .8]];
  for (const [bend, hs] of fronds) {
    const len = h * hs * grow, n = 11, pts = [0, 0];
    let px = 0, py = 0;
    for (let k = 1; k <= n; k++) {
      const t = k / n, a = -Math.PI / 2 + bend * (.3 + t * 1.3);
      px += Math.cos(a) * len / n; py += Math.sin(a) * len / n; pts.push(px, py);
      if (k > 1) {
        const L = (8 + 28 * Math.sin(Math.min(1, t * 1.25) * Math.PI) * .9) * Math.min(1, grow * 1.4);
        for (const sd of [-1, 1]) {
          const la = a + sd * 1.0;
          leaves.push(seg(px, py, px + Math.cos(la) * L, py + Math.sin(la) * L));
        }
      }
    }
    stems.push(poly(pts));
  }
  for (const l of leaves) crayonLine(l, C.green, 7, { passes: 1, alpha: .85 });
  ink(stems, 2.2); ink(leaves, 1.4);
  pop();
}
function sprout(x, y, h, curl = 1, s = 1) {
  if (h <= 2) return;
  push(x, y, s);
  const pts = [];
  const n = 16;
  for (let k = 0; k <= n; k++) { const t = k / n; pts.push(Math.sin(t * 2) * 6, -t * h); }
  const topX = pts[2 * n], topY = pts[2 * n + 1], R = Math.min(22, h * .25) * curl;
  for (let k = 1; k <= 28; k++) {
    const t = k / 28, a = Math.PI - t * TAU * .95, rad = R * (1 - t * .7);
    pts.push(topX + R + Math.cos(a) * rad, topY + Math.sin(a) * rad * 1.05 - (1 - t) * 0);
  }
  const p = poly(pts);
  crayonLine(p, C.lime, 13, { passes: 2 });
  ink(p, 1.6, C.green);
  pop();
}
function mound(x, y, rw = 110, rh = 50, o = {}) {
  const sh = `M ${x - rw} ${y} C ${x - rw * .8} ${y - rh}, ${x - rw * .3} ${y - rh * 1.05}, ${x} ${y - rh} C ${x + rw * .5} ${y - rh * 1.05}, ${x + rw * .85} ${y - rh * .6}, ${x + rw} ${y} Z`;
  under(sh);
  crayon(sh, o.color ?? C.grey, { gap: 5, w: 6, alpha: .85, cross: true });
  ink(sh, 2.6);
}
function bush(x, y, r = 40, col = C.green) {
  const sh = [circ(x, y, r, r * .8), circ(x - r * .7, y + r * .2, r * .6), circ(x + r * .7, y + r * .15, r * .65)];
  crayon(sh, col, { gap: 5, w: 7, alpha: .9 });
  ink([circ(x - r * .7, y + r * .2, r * .6, r * .6, 1.6, 4.6), circ(x, y, r, r * .8, 3.3, 6.2), circ(x + r * .7, y + r * .15, r * .65, r * .65, 4.8, 7.8)], 2.2);
  ink([seg(x - r * .2, y + r * .1, x + r * .3, y - r * .3), seg(x + r * .1, y - r * .1, x + r * .5, y + r * .2)], 1.6);
}
function mushroom(x, y, s = 1) {
  push(x, y, s);
  const cap = 'M -16 -14 C -18 -32, 16 -34, 16 -14 C 8 -10, -8 -10, -16 -14 Z';
  const stem = 'M -6 -12 L -7 0 L 6 0 L 5 -12';
  under(cap); crayon(cap, C.yellow, { gap: 3, w: 5, amp: 1 }); crayon(stem + ' Z', C.yellow, { gap: 3, w: 4, amp: 1, alpha: .6 });
  ink(cap, 2); ink(stem, 2);
  pop();
}
function pebble(x, y, r = 12) {
  const sh = circ(x, y - r * .45, r, r * .5);
  under(sh); crayon(sh, C.grey, { gap: 3, w: 4, amp: 1, alpha: .6 }); ink(sh, 2);
}

// ---------------- egg ----------------
const EGG = 'M 0 -210 C 55 -210, 80 -110, 78 -70 C 76 -25, 45 0, 0 0 C -45 0, -76 -25, -78 -70 C -80 -110, -55 -210, 0 -210 Z';
const EGG_RIM = 'L -60 -112 L -45 -130 L -25 -110 L -6 -132 L 14 -112 L 34 -130 L 54 -110 L 79 -124';
const EGG_BOTTOM = `M -79 -122 ${EGG_RIM} C 82 -70, 60 0, 0 0 C -60 0, -82 -60, -79 -122 Z`;
const EGG_TOP = `M -79 -122 ${EGG_RIM} C 76 -170, 45 -210, 0 -210 C -45 -210, -78 -170, -79 -122 Z`;

function eggSpots(o = {}) {
  crayon('M 22 -186 C 46 -190, 62 -150, 52 -128 C 38 -118, 16 -140, 22 -186 Z', C.yellow, { gap: 4, w: 6, amp: 2 });
  const f = [circ(-30, -150, 2.2), circ(40, -70, 2), circ(-50, -85, 1.8), circ(10, -40, 2)];
  for (const s of f) blot(s);
}
function egg(x, y, o = {}) {
  const s = o.s ?? 1;
  push(x, y, s, o.rot ?? 0);
  under(EGG);
  eggSpots();
  if (o.eye != null) {
    const hole = 'M -34 -112 C -36 -140, -6 -150, 16 -144 C 36 -136, 40 -110, 30 -94 C 18 -80, -26 -84, -34 -112 Z';
    under(hole, '#dfe6f2');
    crayon(circ(-2 + (o.lx ?? 0) * 6, -114, 26), C.blue, { gap: 3, w: 4, amp: .6, alpha: .6 });
    const bl = o.blink ?? 0;
    if (bl < .8) {
      push(0, -114, 1, 0, 1 - bl);
      dot(-2 + (o.lx ?? 0) * 6, 0, 21);
      dot(6 + (o.lx ?? 0) * 6, -8, 5.5, C.white); dot(-8 + (o.lx ?? 0) * 6, 8, 2.5, C.white);
      pop();
    } else ink('M -26 -112 Q -2 -104 24 -112', 2.6);
    ink(hole, 2.6);
    ink('M 20 -150 L 30 -160 L 34 -150 M -36 -100 L -48 -94', 2);
  }
  ink('M -40 -58 L -30 -66 L -22 -58 L -10 -70 M 30 -60 L 38 -50 L 48 -56', 2);
  ink('M -52 -22 L -46 -12 M -38 -16 L -33 -6 M -24 -12 L -20 -3 M 30 -10 L 34 -20 M 44 -16 L 48 -26', 1.6);
  ink(EGG, 2.8);
  pop();
}
function eggBottom(x, y, o = {}) {
  push(x, y, o.s ?? 1, o.rot ?? 0);
  under(EGG_BOTTOM);
  ink('M -40 -58 L -30 -66 L -22 -58 L -10 -70 M 30 -60 L 38 -50 L 48 -56 M -10 -100 L 0 -90 L -6 -80 L 4 -72', 2);
  ink('M -52 -22 L -46 -12 M -38 -16 L -33 -6 M -24 -12 L -20 -3 M 30 -10 L 34 -20 M 44 -16 L 48 -26', 1.6);
  ink(EGG_BOTTOM, 2.8);
  pop();
}
function eggBottomBack(x, y, o = {}) { push(x, y, o.s ?? 1, o.rot ?? 0); under(EGG_BOTTOM); pop(); }
function eggTop(x, y, rot = 0, s = 1) {
  push(x, y, s, rot);
  push(0, 160);
  under(EGG_TOP);
  crayon('M 22 -186 C 46 -190, 62 -150, 52 -128 C 38 -118, 16 -140, 22 -186 Z', C.yellow, { gap: 4, w: 6, amp: 2 });
  ink(EGG_TOP, 2.8);
  pop(); pop();
}
function shellChip(x, y, rot = 0, s = 1) {
  push(x, y, s, rot);
  const sh = 'M -40 0 L -30 -30 L -18 -20 L -5 -38 L 8 -22 L 20 -34 L 32 -8 C 20 4, -20 6, -40 0 Z';
  under(sh); crayon('M -30 -4 L -26 -24 L -14 -16 L -4 -30 L 6 -18 L 4 -2 Z', C.yellow, { gap: 4, w: 6, amp: 2 });
  ink(sh, 2.6); pop();
}

// ---------------- baby dino ----------------
const BABY = {
  tail: 'M -14 -46 C -36 -44, -54 -54, -72 -86 C -64 -56, -44 -34, -12 -30 Z',
  body: 'M -16 -62 C -28 -50, -28 -30, -15 -22 C -4 -15, 14 -15, 21 -26 C 27 -38, 24 -52, 16 -64 Z',
  belly: 'M -8 -46 C -2 -56, 17 -54, 19 -39 C 19 -26, 4 -21, -6 -26 C -12 -32, -12 -39, -8 -46 Z',
  leg: 'M -4 0 C -6 8, -5 14, -3 22 L 9 22',
  arm: 'M 14 -48 C 20 -46, 24 -42, 29 -44 M 25 -43 L 28 -38',
  head: 'M -18 -8 C -24 -36, -2 -58, 22 -56 C 42 -54, 57 -42, 57 -26 C 57 -12, 44 -4, 28 -4 C 12 -4, -12 0, -18 -8 Z',
  cap: 'M -21 -24 C -26 -52, -2 -72, 22 -65 C 35 -62, 41 -52, 41 -43 L 34 -48 L 28 -40 L 20 -48 L 12 -38 L 6 -47 L -3 -37 L -11 -45 Z',
  capPatch: 'M -14 -34 C -16 -54, 4 -66, 20 -60 C 28 -56, 30 -50, 28 -46 L 18 -44 L 10 -38 L 2 -44 L -8 -36 Z'
};
// o: s, dir, run (phase 0..1 or null), rot, look (head rotation), lx/ly (eye), sit, mouth ('o','smile'), cap (bool)
function baby(x, y, o = {}) {
  const s = o.s ?? 1.7, dir = o.dir ?? 1;
  push(x, y, s * dir, 0, s);
  if (o.rot) { ctx.translate(0, -45); ctx.rotate(o.rot); ctx.translate(0, 45); }
  const ph = o.run, running = ph != null;
  const bob = running ? -Math.abs(Math.sin(ph * TAU)) * 6 : 0;
  ctx.translate(0, bob);
  const la = running ? Math.sin(ph * TAU) * .85 : 0;
  if (!o.sit) {
    push(-7, -24, 1, la); ink(BABY.leg, 2.6); pop();
  }
  push(-14, -40, 1, running ? Math.sin(ph * TAU * 2) * .12 : Math.sin((o.t ?? 0) * 3) * .05);
  push(14, 40); under(BABY.tail); ink(BABY.tail, 2.6); pop();
  pop();
  under(BABY.body);
  crayon(BABY.belly, C.yellow, { gap: 4, w: 6, amp: 1.5 });
  ink(BABY.body, 2.6);
  if (!o.sit) { push(8, -24, 1, -la); ink(BABY.leg, 2.6); pop(); }
  push(0, 0, 1, running ? -la * .3 : (o.arm ?? 0)); ink(BABY.arm, 2.4); pop();
  push(6, -60, 1, o.look ?? 0);
  under(BABY.head);
  blush(18, -14);
  if (o.cap !== false) { under(BABY.cap); crayon(BABY.capPatch, C.yellow, { gap: 4, w: 6, amp: 1.5 }); }
  ink(BABY.head, 2.6);
  if (o.cap !== false) ink(BABY.cap, 2.4);
  eyeball(28, -30, o.eyeR ?? 12, { lx: o.lx ?? .6, ly: o.ly ?? 0, ring: C.blue });
  dot(51, -27, 1.6);
  if (o.mouth === 'o') ink(circ(44, -12, 4, 5), 2.2);
  else ink('M 34 -12 Q 42 -8 50 -13', 2.2);
  pop();
  pop();
}

// ---------------- dragonfly ----------------
function dragonfly(x, y, t, o = {}) {
  const s = o.s ?? 1, dir = o.dir ?? 1;
  push(x, y, s * dir, o.rot ?? 0, s);
  const flap = Math.sin(t * 70) * .5 + .5;
  const wings = [[-14, -6, -.35], [-24, -6, .45]];
  for (const [wx, wy, wa] of wings) {
    push(wx, wy, 1, wa);
    push(0, 0, 1, 0, .4 + flap * .6);
    const wsh = circ(0, -34, 10, 32);
    under(wsh, 'rgba(255,255,255,.55)');
    crayon(wsh, C.sky, { gap: 5, w: 4, alpha: .35, amp: 1 });
    ink(wsh, 1.8); ink('M 0 -4 L 0 -60 M 0 -20 L 6 -28 M 0 -38 L -6 -46', 1.2);
    pop(); pop();
  }
  const abd = 'M -26 -4 L -122 -1 C -126 1, -126 4, -122 5 L -26 5 Z';
  under(abd); crayon(abd, C.orange, { gap: 3, w: 4, amp: .8 });
  ink(abd, 2); ink('M -46 -3 L -46 5 M -64 -2 L -64 4 M -82 -2 L -82 4 M -100 -1 L -100 4', 1.4);
  const th = circ(-16, 0, 12, 9); under(th); crayon(th, C.orange, { gap: 3, w: 4, amp: .8, alpha: .7 }); ink(th, 2);
  eyeball(0, -2, 11, { lx: .8, ring: C.orange, pupil: .5 });
  pop();
}

// ---------------- sauropod ----------------
const SAURO = {
  body: 'M -450 -520 C -430 -660, -190 -760, 100 -750 C 300 -742, 420 -650, 415 -545 C 410 -470, 360 -440, 300 -440 C 120 -400, -150 -396, -330 -440 C -410 -452, -460 -480, -450 -520 Z',
  neck: 'M 280 -720 C 360 -900, 460 -1090, 600 -1140 C 660 -1160, 726 -1142, 736 -1102 C 742 -1070, 708 -1052, 664 -1060 C 580 -1046, 490 -900, 405 -560 Z',
  tail: 'M -430 -540 C -580 -500, -780 -330, -1020 -140 C -780 -350, -600 -448, -420 -462 Z',
  legFill: 'M -86 -436 C -84 -360, -66 -200, -64 -60 C -70 -30, -80 -12, -78 -4 C -40 8, 40 8, 80 -6 C 76 -20, 64 -40, 62 -70 C 66 -210, 84 -360, 86 -436 Z',
  leg: 'M -86 -490 C -84 -330, -66 -200, -64 -60 C -70 -30, -80 -12, -78 -4 C -40 8, 40 8, 80 -6 C 76 -20, 64 -40, 62 -70 C 66 -210, 84 -330, 86 -490',
  toes: 'M -50 -2 L -50 -18 M -16 3 L -16 -15 M 18 3 L 18 -15 M 52 -3 L 52 -19',
  wrinkles: 'M -44 -250 Q -14 -238 16 -250 M -40 -160 Q -10 -148 22 -162 M -34 -340 Q -8 -330 20 -342 M -50 -80 Q -20 -70 10 -82'
};
function sauroLeg(lx, phase, stride, far) {
  const sw = phase < .35;
  const u = sw ? phase / .35 : (phase - .35) / .65;
  const dx = sw ? lerp(-stride / 2, stride / 2, ease(u)) : lerp(stride / 2, -stride / 2, u);
  const lift = sw ? Math.sin(u * Math.PI) * 34 : 0;
  push(lx + dx * .5, -lift);
  under(SAURO.legFill);
  if (far) crayon(SAURO.legFill, C.grey, { gap: 7, w: 6, alpha: .25 });
  ink(SAURO.leg, 3); ink(SAURO.toes, 2.2); ink(SAURO.wrinkles, 1.8);
  pop();
}
function sauropod(x, y, t, o = {}) {
  const s = o.s ?? 1, dir = o.dir ?? 1, ph = (o.walk ?? t * .45), stride = 130;
  push(x, y, s * dir, 0, s);
  const bob = Math.sin(ph * TAU * 2) * 6;
  sauroLeg(-300, (ph + .5) % 1, stride, true);
  sauroLeg(200, (ph + .0) % 1, stride, true);
  push(0, bob);
  push(-420, -500, 1, Math.sin(ph * TAU) * .03); push(420, 500);
  under(SAURO.tail);
  clipTo(SAURO.tail); crayonLine('M -430 -520 C -600 -470, -800 -320, -1010 -150', C.teal, 26, { amp: 3, passes: 1 }); unclip();
  ink(SAURO.tail, 3); pop(); pop();
  push(330, -620, 1, Math.sin(ph * TAU + 1) * .025 + (o.neck ?? 0)); push(-330, 620);
  under(SAURO.neck);
  clipTo(SAURO.neck);
  crayonLine('M 280 -760 C 380 -930, 480 -1110, 610 -1160', C.teal, 50, { amp: 3 });
  crayonLine('M 360 -700 C 420 -860, 500 -1010, 590 -1080', C.teal, 24, { amp: 3, passes: 1, alpha: .6 });
  unclip();
  ink(SAURO.neck, 3);
  dot(696, -1114, 5); ink('M 714 -1078 Q 724 -1080 732 -1088', 2);
  pop(); pop();
  under(SAURO.body);
  clipTo(SAURO.body);
  for (let k = 0; k < 7; k++) {
    const yy = -780 + k * 52, w1 = 26 + (k % 3) * 8;
    crayonLine(`M -460 ${yy + 70} C -300 ${yy - 10 + k * 4}, -140 ${yy + 40}, 20 ${yy} C 160 ${yy - 36}, 290 ${yy + 30}, 430 ${yy - 20}`, C.teal, w1, { amp: 6, passes: 1 });
  }
  unclip();
  ink(SAURO.body, 3);
  ink('M -260 -484 Q -210 -474 -160 -486 M 70 -482 Q 120 -472 170 -484 M -80 -470 Q -40 -462 0 -472', 1.8);
  pop();
  sauroLeg(-210, (ph + .0) % 1, stride);
  sauroLeg(290, (ph + .5) % 1, stride);
  pop();
}

// ---------------- stegosaurus ----------------
function stego(x, y, t, o = {}) {
  const s = o.s ?? 1, dir = o.dir ?? 1, ph = o.walk ?? t * 1.5;
  push(x, y, s * dir, 0, s);
  const body = 'M -70 -36 C -60 -80, 30 -90, 62 -44 L 92 -40 C 104 -46, 114 -40, 112 -30 C 108 -22, 96 -22, 86 -26 L 56 -24 C 30 -18, -40 -18, -70 -36 Z';
  const tail = 'M -66 -44 C -100 -40, -120 -30, -140 -18 C -110 -24, -90 -26, -64 -30 Z';
  for (let k = 0; k < 4; k++) { const lx = [-46, -24, 22, 44][k], a = Math.sin((ph + k * .5) * TAU) * .3; push(lx, -24, 1, a); ink('M 0 0 L 0 24 L 8 24', 2.4); pop(); }
  const plates = [];
  for (let k = 0; k < 6; k++) { const px = -60 + k * 22, py = -70 + Math.abs(k - 2.5) * 6; plates.push(poly([px - 10, py + 12, px, py - 20, px + 10, py + 12], true)); }
  for (const p of plates) { under(p); crayon(p, C.lime, { gap: 3, w: 4, amp: 1 }); ink(p, 2); }
  under(tail); ink(tail, 2.4); ink('M -130 -24 L -140 -40 M -120 -28 L -126 -46', 2);
  under(body); crayon(body, C.green, { gap: 4, w: 5, amp: 1.5, alpha: .55 }); ink(body, 2.4);
  dot(100, -35, 2.5);
  pop();
}

// ---------------- pterosaur ----------------
function ptero(x, y, t, o = {}) {
  const s = o.s ?? 1, dir = o.dir ?? 1, f = Math.sin(t * (o.speed ?? 9));
  push(x, y, s * dir, 0, s);
  const wingY = f * 36;
  const wing1 = `M -10 0 L -40 ${-10 - wingY} L -80 ${-6 - wingY * 1.3} L -30 12 Z`;
  const wing2 = `M 10 0 L 40 ${-10 - wingY} L 80 ${-6 - wingY * 1.3} L 30 12 Z`;
  for (const w of [wing1, wing2]) { under(w); crayon(w, C.pink, { gap: 4, w: 5, amp: 1.5, alpha: .8 }); ink(w, 2.2); }
  const body = 'M -30 4 C -20 -8, 20 -10, 36 -6 L 70 -4 L 36 4 C 20 12, -20 12, -30 4 Z';
  under(body); crayon(body, C.yellow, { gap: 3, w: 4, amp: 1 }); ink(body, 2.2);
  ink('M 24 -8 L 8 -26', 2.4);
  dot(28, -3, 2.4);
  pop();
}

// ---------------- T-rex ----------------
const REX = {
  body: 'M 40 -520 C -40 -490, -110 -400, -150 -330 C -200 -250, -300 -160, -470 -50 C -300 -120, -200 -170, -120 -200 C -60 -220, 20 -230, 60 -280 C 110 -340, 130 -420, 110 -480 Z',
  back: 'M 30 -500 C -40 -470, -100 -390, -140 -320 C -190 -240, -290 -160, -440 -70',
  front: 'M 110 -470 C 125 -410, 105 -330, 60 -285 C 30 -255, -20 -240, -70 -222',
  thighFill: 'M -176 -340 C -236 -250, -196 -140, -100 -158 C -26 -172, -26 -262, -56 -330 Z',
  thigh: 'M -168 -318 C -232 -250, -196 -140, -100 -158 C -26 -172, -26 -262, -52 -318',
  shin: 'M -126 -180 L -150 -34 L -160 0 L -60 0 C -72 -12, -104 -16, -114 -34 L -80 -172 Z',
  head: 'M -40 12 C -60 -40, -20 -92, 60 -97 C 150 -102, 222 -82, 242 -52 C 252 -36, 246 -20, 230 -18 L 70 -10 C 30 -8, -10 6, -40 12 Z',
  headTeal: 'M -34 -24 C -22 -78, 60 -100, 160 -94 C 200 -92, 232 -72, 240 -52 C 190 -70, 120 -78, 60 -68 C 20 -58, -10 -40, -34 -24 Z',
  jaw: 'M -6 0 C 40 30, 150 42, 214 22 C 228 16, 226 2, 212 0 L 60 -4 Z',
  arm: 'M 0 0 C 14 4, 26 14, 32 22 M 32 22 L 42 20 M 32 22 L 36 32'
};
function rexEye(x, y, r, o = {}) {
  const bl = clamp(o.blink ?? 0);
  under(circ(x, y, r), C.white);
  clipTo(circ(x, y, r));
  crayon(circ(x, y, r * .98), C.orange, { gap: 4, w: 6, amp: 1, alpha: .85 });
  crayonLine(spiral(x, y, r * .8, 3, r * .1), C.deep, r * .16, { amp: .6, passes: 1, alpha: .7 });
  const pw = r * (o.pupil ?? .22), ph = r * .86;
  blot(`M ${x} ${y - ph} C ${x + pw} ${y - ph * .5}, ${x + pw} ${y + ph * .5}, ${x} ${y + ph} C ${x - pw} ${y + ph * .5}, ${x - pw} ${y - ph * .5}, ${x} ${y - ph} Z`, C.black, .3);
  dot(x + r * .35, y - r * .4, r * .09, C.white);
  if (bl > 0) {
    const lid = `M ${x - r * 1.1} ${y - r * 1.1} L ${x + r * 1.1} ${y - r * 1.1} L ${x + r * 1.1} ${y - r + bl * r * 2} C ${x + r * .5} ${y - r + bl * r * 2.1}, ${x - r * .5} ${y - r + bl * r * 2.1}, ${x - r * 1.1} ${y - r + bl * r * 2} Z`;
    under(lid, o.lidColor ?? C.paper);
    ink(`M ${x - r} ${y - r + bl * r * 2} C ${x - r * .5} ${y - r + bl * r * 2.1}, ${x + r * .5} ${y - r + bl * r * 2.1}, ${x + r} ${y - r + bl * r * 2}`, 2.4);
  }
  unclip();
  ink(circ(x, y, r), 2.6);
}
// o: s, dir, walk (phase), jaw (0..1), look, blink, arm, color(false=outline only)
function trex(x, y, t, o = {}) {
  const s = o.s ?? 1, dir = o.dir ?? 1, ph = o.walk, walking = ph != null, colored = o.color !== false;
  push(x, y, s * dir, 0, s);
  const la = walking ? Math.sin(ph * TAU) * .35 : 0;
  const bob = walking ? -Math.abs(Math.sin(ph * TAU)) * 14 : Math.sin(t * 2.2) * 3 * (o.bob ?? 1);
  const leg = (a, dx) => {
    push(-110 + dx, -250 + bob * .3, 1, a); push(110, 250);
    under(REX.shin); ink(REX.shin, 2.8); ink('M -150 -2 L -165 8 M -120 0 L -125 10', 2);
    under(REX.thighFill);
    if (colored) crayon('M -186 -300 C -176 -330, -80 -330, -60 -290 C -90 -250, -160 -240, -186 -300 Z', C.teal, { gap: 5, w: 7, alpha: .8 });
    ink(REX.thigh, 2.8);
    ink('M -150 -200 Q -120 -186 -90 -196', 1.6);
    pop(); pop();
  };
  leg(-la + .05, 40);
  push(0, bob);
  under(REX.body);
  if (colored) {
    clipTo(REX.body);
    crayonLine(REX.back, C.teal, 44, { amp: 4 });
    crayonLine(REX.front, C.orange, 34, { amp: 4 });
    crayonLine('M 90 -440 C 80 -400, 60 -360, 30 -330', C.orange, 20, { passes: 1 });
    unclip();
  }
  ink(REX.body, 2.8);
  ink('M 50 -360 L 80 -350 M 30 -310 L 62 -300 M 0 -270 L 30 -262', 1.8);
  pop();
  leg(la, 0);
  push(0, bob);
  push(104, -392, 1, o.arm ?? Math.sin(t * 3) * .15); ink(REX.arm, 2.6); pop();
  push(60, -500, 1, o.look ?? 0);
  const jaw = clamp(o.jaw ?? 0);
  push(-6, 0, 1, jaw * .55);
  under(REX.jaw);
  if (jaw > .05 && colored) crayon('M 30 4 C 80 20, 150 26, 200 12 L 60 0 Z', C.rose, { gap: 3, w: 5, amp: 1.5 });
  ink(REX.jaw, 2.6);
  let tz = 'M 70 0';
  for (let xx = 70; xx < 200; xx += 16) tz += ` L ${xx + 8} -11 L ${xx + 16} ${-1 + (xx - 70) * .02}`;
  ink(tz, 1.8);
  pop();
  if (jaw > .05 && colored) crayon('M 60 -8 C 100 0, 180 10, 230 -10 L 230 -18 L 70 -10 Z', C.pink, { gap: 3, w: 5, amp: 1, alpha: .7 });
  under(REX.head);
  if (colored) crayon(REX.headTeal, C.teal, { gap: 5, w: 7, amp: 2 });
  ink(REX.head, 2.8);
  let tt = 'M 76 -12';
  for (let xx = 76; xx < 224; xx += 15) tt += ` L ${xx + 7} 0 L ${xx + 15} -14`;
  ink(tt, 1.8);
  rexEye(100, -58, 18, { blink: o.blink ?? 0, pupil: o.pupil });
  ink('M 66 -84 Q 104 -100 140 -80', 3.4);
  dot(226, -56, 3);
  pop();
  pop();
  pop();
}

// ---------------- triceratops ----------------
function frillShape(cx, cy, R) {
  const p = [];
  for (let k = 0; k <= 60; k++) {
    const a = -Math.PI * 1.25 + k / 60 * Math.PI * 1.35, r = R + Math.abs(Math.sin(k / 60 * Math.PI * 7)) * R * .1;
    p.push(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  }
  p.push(cx + R * .3, cy + R * .6, cx - R * .1, cy + R * .4);
  return { p, c: true };
}
// facing left by default. o: s, walk, body, frill, eyeR, lx, look, cry, tear
function trike(x, y, t, o = {}) {
  const s = o.s ?? 1, dir = o.dir ?? 1, ph = o.walk, walking = ph != null;
  const bodyCol = o.body ?? C.yellow, frillCol = o.frill ?? C.orange;
  push(x, y, s * dir, 0, s);
  const bob = walking ? -Math.abs(Math.sin(ph * TAU * 2)) * 5 : 0;
  const legs = [[-40, 0], [140, .5], [-10, .5], [170, 0]];
  const body = 'M -60 -190 C 0 -250, 150 -252, 205 -170 C 232 -120, 222 -62, 192 -44 L 60 -44 C 20 -44, -40 -62, -80 -92 Z';
  const tail = 'M 196 -126 C 240 -112, 272 -82, 306 -58 C 262 -64, 232 -72, 200 -76 Z';
  const legSh = 'M -18 0 L -20 -56 L 20 -56 L 18 0 C 10 4, -10 4, -18 0 Z';
  const drawLeg = (k) => { const [lx, off] = legs[k]; const a = walking ? Math.sin((ph + off) * TAU) * .3 : 0; push(lx, -44 + bob, 1, a); push(0, 44); under(legSh); crayon(legSh, bodyCol, { gap: 4, w: 5, amp: 1, alpha: .7 }); ink(legSh, 2.4); ink('M -10 0 L -10 -8 M 2 2 L 2 -8', 1.6); pop(); pop(); };
  drawLeg(2); drawLeg(3);
  push(0, bob);
  under(tail); crayon(tail, bodyCol, { gap: 4, w: 6, amp: 1.5 }); ink(tail, 2.6);
  under(body); crayon(body, bodyCol, { gap: 6, w: 8 });
  if (o.stripes !== false) crayonLine('M 20 -200 C 40 -150, 50 -110, 40 -70 M 90 -224 C 110 -170, 116 -120, 110 -60 M 150 -212 C 166 -170, 170 -120, 160 -70', frillCol, 16, { passes: 1, alpha: .6 });
  ink(body, 2.6);
  pop();
  drawLeg(0); drawLeg(1);
  push(-70, -150 + bob, 1, o.look ?? 0);
  const fr = frillShape(10, -30, 108);
  under(fr); crayon(fr, frillCol, { gap: 6, w: 8, cross: true });
  const rad = [];
  for (let k = 0; k < 7; k++) { const a = -Math.PI * 1.15 + k / 6 * Math.PI * 1.1; rad.push(seg(10 + Math.cos(a) * 40, -30 + Math.sin(a) * 40, 10 + Math.cos(a) * 95, -30 + Math.sin(a) * 95)); }
  ink(rad, 1.6); ink(fr, 2.4);
  const head = 'M 36 -40 C -10 -60, -70 -40, -100 10 L -128 36 C -118 52, -98 56, -80 50 C -40 76, 10 66, 40 30 C 52 10, 50 -20, 36 -40 Z';
  under(head); crayon(head, bodyCol, { gap: 5, w: 7 });
  blush(-50, 30, 9, 5);
  ink(head, 2.6);
  const horns = ['M -30 -38 C -50 -70, -70 -90, -96 -104 C -80 -80, -64 -50, -54 -34 Z', 'M 0 -46 C -10 -80, -26 -100, -48 -118 C -36 -90, -24 -64, -20 -44 Z', 'M -94 2 C -104 -14, -110 -26, -122 -36 C -118 -16, -112 0, -106 10 Z'];
  for (const h of horns) { under(h, C.white); ink(h, 2.2); }
  const er = o.eyeR ?? 14;
  eyeball(-40, 0, er, { lx: o.lx ?? -.6, ly: o.ly ?? 0, ring: C.blue, pupil: o.pupil ?? .55 });
  ink(`M ${-40 - er} ${-er - 6} Q -40 ${-er - 14} ${-40 + er} ${-er - 4}`, 2.2);
  if (o.tear) { const ty = er + (o.tear * 40); blot(`M -46 ${ty} C -52 ${ty + 8}, -50 ${ty + 14}, -44 ${ty + 14} C -38 ${ty + 14}, -38 ${ty + 8}, -44 ${ty} Z`, C.sky); ink(`M -46 ${ty} C -52 ${ty + 8}, -50 ${ty + 14}, -44 ${ty + 14} C -38 ${ty + 14}, -38 ${ty + 8}, -46 ${ty} Z`, 1.6); }
  ink(o.sad ? 'M -104 44 Q -90 34 -74 42' : 'M -104 40 Q -90 48 -74 42', 2);
  dot(-110, 18, 2.4);
  pop();
  pop();
}

// ---------------- raptor ----------------
function raptor(x, y, t, o = {}) {
  const s = o.s ?? 1, dir = o.dir ?? 1, ph = o.walk ?? t * 4;
  push(x, y, s * dir, 0, s);
  const bob = -Math.abs(Math.sin(ph * TAU)) * 6;
  const leg = 'M 0 0 L 12 22 L 2 40 L 16 42';
  push(-10, -44 + bob, 1, Math.sin(ph * TAU) * .8); ink(leg, 2.4); pop();
  push(0, bob);
  const body = 'M -110 -60 C -60 -70, -20 -80, 20 -70 C 40 -66, 50 -80, 60 -96 C 72 -108, 100 -104, 104 -92 C 106 -84, 90 -80, 76 -80 C 64 -60, 50 -40, 20 -36 C -20 -32, -60 -44, -110 -60 Z';
  under(body); crayon(body, o.color ?? C.orange, { gap: 4, w: 6, amp: 1.5 }); ink(body, 2.4);
  dot(88, -94, 2.6); ink('M 30 -56 L 40 -46 L 46 -48', 2);
  pop();
  push(8, -44 + bob, 1, -Math.sin(ph * TAU) * .8); ink(leg, 2.4); pop();
  pop();
}

// ---------------- robin ----------------
const ROBIN = {
  body: 'M -60 -70 C -60 -118, -14 -140, 26 -132 C 60 -124, 72 -92, 62 -62 C 52 -36, 22 -26, -8 -28 C -40 -32, -60 -48, -60 -70 Z',
  head: 'M 6 -130 C 10 -162, 60 -168, 70 -134 C 74 -118, 64 -104, 50 -100 Z',
  breast: 'M 44 -150 C 76 -136, 80 -92, 62 -60 C 46 -38, 20 -44, 22 -72 C 24 -104, 30 -132, 44 -150 Z',
  wing: 'M -52 -86 C -30 -104, 12 -98, 24 -76 C 2 -58, -30 -56, -62 -60 Z',
  tail: 'M -56 -62 L -104 -54 L -98 -38 L -48 -44 Z',
  back: 'M -58 -80 C -50 -120, -10 -142, 30 -140 C 50 -150, 64 -150, 66 -140 C 40 -134, 10 -126, -10 -110 C -30 -96, -46 -84, -58 -80 Z'
};
function robin(x, y, t, o = {}) {
  const s = o.s ?? 1, dir = o.dir ?? 1;
  push(x, y, s * dir, o.rot ?? 0, s);
  if (!o.fly) ink('M -6 -30 L -8 0 M 12 -30 L 14 0 M -18 0 L 4 0 M 4 0 L 26 0', 2.4);
  push(-50, -50, 1, o.fly ? Math.sin(t * 30) * .2 : Math.sin(t * 4) * .06); push(50, 50);
  under(ROBIN.tail); crayon(ROBIN.tail, C.brown, { gap: 3, w: 4, amp: 1 }); ink(ROBIN.tail, 2.2);
  pop(); pop();
  under(ROBIN.body);
  crayon(ROBIN.back, C.brown, { gap: 4, w: 6, amp: 2, alpha: .75 });
  crayon(ROBIN.breast, C.red, { gap: 4, w: 6, amp: 2 });
  crayon('M 40 -140 C 60 -130, 62 -100, 50 -80 C 40 -100, 36 -120, 40 -140 Z', C.orange, { gap: 3, w: 5, amp: 1.5, alpha: .8 });
  ink(ROBIN.body, 2.6);
  push(o.fly ? -20 : 0, o.fly ? -80 : 0, 1, o.fly ? Math.sin(t * 34) * .9 - .4 : 0); push(o.fly ? 20 : 0, o.fly ? 80 : 0);
  under(ROBIN.wing); crayon(ROBIN.wing, C.brown, { gap: 4, w: 6, amp: 1.5 }); ink(ROBIN.wing, 2.4);
  ink('M -40 -80 Q -20 -86 0 -80 M -44 -70 Q -24 -76 -4 -70', 1.4);
  pop(); pop();
  push(38, -128, 1, o.look ?? 0); push(-38, 128);
  const beakOpen = o.chirp ? 6 : 0;
  ink(`M 68 -136 L 88 ${-130 - beakOpen} L 70 -126 M 70 -126 L 86 ${-124 + beakOpen} L 68 -118`, 2.4);
  under(circ(52, -136, 9), C.white); dot(53, -136, 4.5); dot(55, -138, 1.2, C.white); ink(circ(52, -136, 9), 2);
  pop(); pop();
  pop();
}
function worm(x, y, t, o = {}) {
  const s = o.s ?? 1, dir = o.dir ?? 1, p = [];
  for (let k = 0; k <= 16; k++) { const u = k / 16; p.push(-u * 60, -Math.max(0, Math.sin(u * Math.PI * 2 + t * 6)) * 7 - (k < 3 && o.up ? (3 - k) * 7 * o.up : 0)); }
  push(x, y, s * dir, 0, s);
  const sh = poly(p);
  crayonLine(sh, C.pink, 12, { amp: .6 });
  ink(sh, 1.4, C.rose);
  dot(p[0] + 2, p[1] - 3, 1.8);
  pop();
}
function branch(x0, y0, x1, y1, o = {}) {
  const d = `M ${x0} ${y0} C ${lerp(x0, x1, .3)} ${y0 - 6}, ${lerp(x0, x1, .6)} ${y1 + 6}, ${x1} ${y1} L ${x1} ${y1 + 12} C ${lerp(x0, x1, .6)} ${y1 + 18}, ${lerp(x0, x1, .3)} ${y0 + 8}, ${x0} ${y0 + 12} Z`;
  under(d); crayon(d, C.tan, { gap: 3, w: 4, amp: 1, alpha: .7 }); ink(d, 2.4);
  ink(`M ${lerp(x0, x1, .2)} ${y0 + 6} L ${lerp(x0, x1, .26)} ${y0 + 6} M ${lerp(x0, x1, .55)} ${lerp(y0, y1, .55) + 6} L ${lerp(x0, x1, .62)} ${lerp(y0, y1, .55) + 5}`, 1.6);
}
function nest(x, y, s = 1) {
  push(x, y, s);
  const bowl = 'M -140 -70 C -130 10, 130 10, 140 -70 C 60 -56, -60 -56, -140 -70 Z';
  under(bowl); crayon(bowl, C.brown, { gap: 5, w: 8, cross: true }); ink(bowl, 2.8);
  ink('M -150 -64 L -120 -76 M 120 -78 L 158 -62 M -110 -40 Q 0 -22 110 -40 M -80 -20 Q 0 -6 80 -20', 2);
  pop();
}

// ---------------- mammals / bugs ----------------
function mammoth(x, y, t, o = {}) {
  const s = o.s ?? 1, ph = o.walk ?? t * 1.2;
  push(x, y, s * (o.dir ?? 1), 0, s);
  const legSh = 'M -20 0 L -22 -90 L 22 -90 L 20 0 Z';
  const legs = [[-100, 0], [60, .5], [-70, .5], [90, 0]];
  const L = (k) => { const [lx, off] = legs[k]; push(lx, -90, 1, Math.sin((ph + off) * TAU) * .2); push(0, 90); under(legSh); crayon(legSh, C.brown, { gap: 4, w: 6, amp: 1.5 }); ink(legSh, 2.6); pop(); pop(); };
  L(2); L(3);
  const body = 'M -150 -100 C -150 -220, -40 -270, 60 -250 C 120 -240, 150 -200, 160 -150 C 170 -100, 150 -80, 120 -80 L -120 -80 C -140 -82, -150 -90, -150 -100 Z';
  under(body); crayon(body, C.brown, { gap: 5, w: 8, cross: true });
  const hair = []; for (let k = 0; k < 12; k++) { const hx = -140 + k * 24; hair.push(seg(hx, -90, hx - 4, -70)); }
  ink(body, 2.8); ink(hair, 1.8);
  const trunkA = Math.sin(t * 2) * .12;
  push(150, -170, 1, trunkA);
  const head = 'M -40 -60 C -20 -100, 40 -100, 60 -60 C 70 -30, 60 20, 50 60 C 48 90, 30 110, 16 100 C 30 80, 30 40, 20 10 C 0 0, -30 -20, -40 -60 Z';
  under(head); crayon(head, C.brown, { gap: 5, w: 7 }); ink(head, 2.6);
  const tusk = 'M 30 10 C 60 30, 90 20, 100 -10 C 80 10, 60 14, 36 -2 Z';
  under(tusk, C.white); ink(tusk, 2.2);
  dot(28, -42, 3.5);
  pop();
  L(0); L(1);
  pop();
}
function shrew(x, y, t, o = {}) {
  const s = o.s ?? 1, ph = o.walk ?? t * 5;
  push(x, y, s * (o.dir ?? 1), 0, s);
  const body = 'M -60 -30 C -60 -70, 20 -80, 50 -50 L 78 -34 C 70 -24, 56 -20, 40 -18 C 0 -10, -60 -8, -60 -30 Z';
  ink('M -58 -24 C -80 -20, -96 -26, -110 -34', 2.2);
  for (const [lx, off] of [[-30, 0], [20, .5]]) { push(lx, -16, 1, Math.sin((ph + off) * TAU) * .5); ink('M 0 0 L 0 16 L 6 16', 2.2); pop(); }
  under(body); crayon(body, C.brown, { gap: 4, w: 6, amp: 1.5 }); crayon('M -40 -30 C -20 -40, 20 -40, 40 -28 C 10 -18, -30 -18, -40 -30 Z', C.tan, { gap: 3, w: 5, amp: 1, alpha: .7 }); ink(body, 2.4);
  const ear = circ(20, -62, 10, 12); under(ear); crayon(ear, C.pink, { gap: 3, w: 4, amp: .6 }); ink(ear, 2);
  eyeball(40, -46, 8, { lx: .7, pupil: .6 });
  dot(78, -35, 3, C.rose);
  if (o.puff) { for (let k = 0; k < 3; k++) ink(circ(-82 - k * 14 - o.puff * 30, -40 - k * 6 - o.puff * 12, 8 + k * 3 + o.puff * 6), 2); }
  pop();
}
function beetle(x, y, t, o = {}) {
  const s = o.s ?? 1;
  push(x, y, s * (o.dir ?? 1), 0, s);
  const ph = t * 4, lg = [];
  for (let k = 0; k < 3; k++) { const lx = -14 + k * 14, a = Math.sin((ph + k * .33) * TAU) * 4; lg.push(`M ${lx} -8 L ${lx - 6 + a} 0`); }
  ink(lg.join(' '), 1.8);
  const shell = 'M -26 -10 C -26 -34, 20 -38, 26 -14 C 20 -6, -20 -4, -26 -10 Z';
  under(shell); crayon(shell, C.teal, { gap: 3, w: 5, amp: 1 }); ink(shell, 2.2); ink('M 0 -34 L 0 -8', 1.6);
  const hd = circ(32, -14, 8); under(hd); ink(hd, 2); ink('M 36 -20 C 42 -30, 48 -32, 52 -30 M 34 -21 C 36 -32, 40 -36, 44 -38', 1.6);
  dot(35, -15, 2);
  pop();
}
function skeleton(x, y, s = 1, col = C.white) {
  push(x, y, s);
  const ribs = [];
  for (let k = 0; k < 5; k++) ribs.push(circ(40 + k * 22, 0, 20 + k * 6, 60 + k * 10, Math.PI * 1.05, Math.PI * 1.95));
  ink(ribs, 2.6, col);
  ink('M 20 -40 C 80 -60, 120 -90, 140 -110', 2.4, col);
  const skull = 'M -110 -4 C -118 -30, -80 -48, -40 -44 C -10 -40, 6 -24, 4 -6 C -30 -2, -80 2, -110 -4 Z';
  under(skull, C.paper); ink(skull, 2.6, col);
  ink(circ(-30, -28, 8), 2, col);
  let tz = 'M -100 -6'; for (let xx = -100; xx < -20; xx += 12) tz += ` L ${xx + 6} -14 L ${xx + 12} -6`; ink(tz, 1.6, col);
  pop();
}
function asteroid(x, y, r, tail = 0, ang = .8) {
  if (tail > 0) {
    const tx = x - Math.cos(ang) * tail, ty = y - Math.sin(ang) * tail;
    crayonLine(seg(tx, ty, x, y), C.orange, r * 1.1, { passes: 1 });
    crayonLine(seg(lerp(tx, x, .4), lerp(ty, y, .4), x, y), C.red, r * 1.4, { passes: 1 });
    ink([seg(tx, ty - r * .6, x, y - r * .6), seg(tx + 10, ty + r * .6, x, y + r * .6)], 1.6);
  }
  under(circ(x, y, r), C.white);
  crayon(circ(x, y, r * .95), C.red, { gap: 3, w: 5, amp: .8 });
  ink(circ(x, y, r), 2.4);
}
function cloud(x0, x1, yb, h, seedN = 1) {
  const p = [x0, yb]; const n = Math.max(4, Math.round((x1 - x0) / 90));
  for (let k = 0; k < n; k++) {
    const a = lerp(x0, x1, k / n), b = lerp(x0, x1, (k + 1) / n), hh = h * (.55 + hash(k * 11 + seedN) * .45) * Math.sin(lerp(.25, 2.9, (k + .5) / n));
    for (let j = 0; j <= 10; j++) { const u = j / 10; p.push(lerp(a, b, u), yb - hh - Math.sin(u * Math.PI) * (b - a) * .35); }
  }
  p.push(x1, yb);
  return { p, c: true };
}
