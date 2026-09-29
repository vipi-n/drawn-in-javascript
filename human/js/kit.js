// Shared drawing helpers (copied from the dinosaur film so this film stands alone).

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
function cloud(x0, x1, yb, h, seedN = 1) {
  const p = [x0, yb]; const n = Math.max(4, Math.round((x1 - x0) / 90));
  for (let k = 0; k < n; k++) {
    const a = lerp(x0, x1, k / n), b = lerp(x0, x1, (k + 1) / n), hh = h * (.55 + hash(k * 11 + seedN) * .45) * Math.sin(lerp(.25, 2.9, (k + .5) / n));
    for (let j = 0; j <= 10; j++) { const u = j / 10; p.push(lerp(a, b, u), yb - hh - Math.sin(u * Math.PI) * (b - a) * .35); }
  }
  p.push(x1, yb);
  return { p, c: true };
}
function hexToRgb(h) { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
function mix(a, b, u) {
  u = Math.round(clamp(u) * 6) / 6;
  const A = hexToRgb(a), B = hexToRgb(b);
  return '#' + A.map((v, i) => Math.round(lerp(v, B[i], u)).toString(16).padStart(2, '0')).join('');
}
function leaf(x, y, rot, s = 1, col = C.green) {
  push(x, y, s, rot);
  const sh = 'M -16 0 C -8 -10, 8 -10, 16 0 C 8 10, -8 10, -16 0 Z';
  under(sh); crayon(sh, col, { gap: 3, w: 4, amp: 1 }); ink(sh, 1.8); ink('M -14 0 L 14 0', 1.2);
  pop();
}
function roar(x, y, u, dir = 1, n = 4) {
  const out = [];
  for (let k = 0; k < n; k++) {
    const r = 30 + ((u * 3 + k / n) % 1) * 220;
    out.push(circ(x, y, r * .6, r, dir > 0 ? -.8 : Math.PI - .8, dir > 0 ? .8 : Math.PI + .8));
  }
  ink(out, 2.6);
}
function puff(x, y, u, n = 4, r = 22) {
  if (u <= 0 || u >= 1) return;
  const out = [];
  for (let k = 0; k < n; k++) {
    const a = Math.PI + (k + .5) / n * Math.PI, d = 20 + u * 70;
    out.push(circ(x + Math.cos(a) * d * 1.6, y + Math.sin(a) * d * .35 - 10, r * (1 - u * .5), r * (1 - u * .5) * .8));
  }
  ink(out, 2.2);
}
function stars(x, y, u) {
  const out = [];
  for (let k = 0; k < 3; k++) {
    const a = u * 5 + k * TAU / 3, px = x + Math.cos(a) * 40, py = y + Math.sin(a) * 12;
    out.push(seg(px - 7, py, px + 7, py), seg(px, py - 7, px, py + 7));
  }
  ink(out, 2.2);
}
