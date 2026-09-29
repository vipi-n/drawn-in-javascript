// Scenery and props for the human story.

// ---------- trees ----------
function foliage(cx, cy, rx, ry, seedN = 1, col = C.green) {
  const ells = [];
  for (let k = 0; k < 7; k++) {
    const a = k / 7 * TAU + hash(seedN * 13 + k) * .6;
    ells.push([cx + Math.cos(a) * rx * .55, cy + Math.sin(a) * ry * .45, rx * (.42 + hash(seedN + k * 7) * .16), ry * (.46 + hash(seedN * 3 + k) * .16)]);
  }
  ells.push([cx, cy, rx * .6, ry * .6]);
  const sh = blobUnion(cx, cy, ells, 90);
  under(sh);
  crayon(sh, col, { gap: 6, w: 8, alpha: .9 });
  crayon(circ(cx - rx * .25, cy - ry * .25, rx * .38, ry * .3), C.lime, { gap: 5, w: 7, alpha: .7 });
  ink(sh, 2.6);
  const sq = [];
  for (let k = 0; k < 6; k++) {
    const px = cx + (hash(seedN * 5 + k) - .5) * rx * 1.1, py = cy + (hash(seedN * 9 + k) - .5) * ry * .9;
    sq.push(circ(px, py, 12, 8, .3, 2.6));
  }
  ink(sq, 1.6);
}
function trunk(x, gy, top, w, lean = 0) {
  const sh = `M ${x - w * .5} ${gy} C ${x - w * .42} ${gy - 120}, ${x - w * .36 + lean} ${top + 160}, ${x - w * .3 + lean} ${top} L ${x + w * .3 + lean} ${top} C ${x + w * .36 + lean} ${top + 160}, ${x + w * .42} ${gy - 120}, ${x + w * .5} ${gy} C ${x + w * .7} ${gy + 6}, ${x + w * .9} ${gy + 4}, ${x + w} ${gy + 8} L ${x - w} ${gy + 8} C ${x - w * .9} ${gy + 4}, ${x - w * .7} ${gy + 6}, ${x - w * .5} ${gy} Z`;
  under(sh); crayon(sh, C.brown, { gap: 5, w: 7, angle: -1.3, alpha: .85 });
  crayon(`M ${x + w * .05} ${gy} L ${x + w * .3} ${gy} L ${x + w * .2 + lean} ${top} L ${x + w * .05 + lean} ${top} Z`, C.tan, { gap: 4, w: 6, angle: -1.4, alpha: .6 });
  ink(sh, 2.8);
  const bark = [];
  for (let k = 0; k < 6; k++) { const yy = lerp(gy - 60, top + 40, k / 5), xx = x + (hash(k * 7 + x) - .5) * w * .5 + lean * (1 - (yy - top) / (gy - top)); bark.push(`M ${xx} ${yy} Q ${xx + 6} ${yy - 14} ${xx} ${yy - 28}`); }
  ink(bark.join(' '), 1.6);
}
function bough(x0, y0, x1, y1, w = 26) {
  const sh = tube([x0, y0, lerp(x0, x1, .5), lerp(y0, y1, .5) - 10, x1, y1], w, w * .55);
  under(sh); crayon(sh, C.brown, { gap: 4, w: 6, angle: -.2, alpha: .85 }); ink(sh, 2.6);
}
function vine(x, y0, len, t, seedN = 1) {
  const p = [];
  for (let k = 0; k <= 14; k++) { const u = k / 14; p.push(x + Math.sin(u * 5 + seedN + t * 1.2) * 8 * u, y0 + u * len); }
  const pl = poly(p);
  crayonLine(pl, C.green, 5, { passes: 1 }); ink(pl, 1.4);
  for (let k = 3; k < 14; k += 4) { const lx = p[2 * k], ly = p[2 * k + 1]; const lf = circ(lx + (k % 8 ? 9 : -9), ly, 9, 5); under(lf); crayon(lf, C.lime, { gap: 3, w: 4, amp: .6 }); ink(lf, 1.4); }
}
// the opening tree pair; grips are where hands can hold on
const GRIP1 = { x: 520, y: 336 }, GRIP2 = { x: 900, y: 318 };
function jungle(t) {
  trunk(150, GROUND, 150, 96, 6);
  trunk(1330, GROUND, 140, 90, -6);
  bough(180, 350, 660, 330, 30);
  bough(1300, 330, 780, 310, 28);
  vine(420, 250, 180, t, 1); vine(760, 240, 120, t, 4); vine(1040, 250, 210, t, 7);
  foliage(160, 150, 330, 170, 3);
  foliage(620, 110, 260, 140, 8, mix(C.green, C.teal, .3));
  foliage(1260, 140, 330, 170, 5);
}

// ---------- savanna ----------
function acacia(x, gy, s = 1, seedN = 1) {
  push(x, gy, s);
  const tr = 'M -12 0 C -10 -60, -14 -110, -40 -170 L -26 -176 C -6 -130, 0 -110, 4 -100 C 16 -130, 40 -160, 70 -180 L 80 -170 C 50 -150, 22 -110, 14 -60 C 12 -30, 14 -10, 16 0 Z';
  under(tr); crayon(tr, C.brown, { gap: 4, w: 6, alpha: .8 }); ink(tr, 2.4);
  const top = blobUnion(10, -196, [[-80, -190, 110, 30], [60, -196, 120, 32], [0, -212, 110, 34]].map(([a, b, c, d]) => [a + 10, b, c, d]), 70);
  under(top); crayon(top, mix(C.green, C.gold, .35), { gap: 5, w: 7, alpha: .9 }); ink(top, 2.4);
  ink('M -90 -186 Q -70 -176 -50 -186 M 40 -190 Q 60 -180 80 -190 M -20 -206 Q 0 -196 20 -206', 1.5);
  pop();
}
function tallGrass(x0, x1, gy, h, seedN = 1, col = C.gold) {
  const blades = [];
  for (let x = x0; x < x1; x += 13) {
    const k = Math.round(x / 13), hh = h * (.6 + hash(k * 7 + seedN) * .5), lean = (hash(k * 3 + seedN) - .5) * 30;
    blades.push(`M ${x} ${gy + 6} Q ${x + lean * .3} ${gy - hh * .5} ${x + lean} ${gy - hh}`);
  }
  const d = blades.join(' ');
  crayonLine(d, col, 7, { passes: 1, alpha: .85 });
  ink(d, 1.5, mix(C.ink, C.gold, .3));
}
function giraffe(x, gy, t, o = {}) {
  const s = o.s ?? 1, dir = o.dir ?? 1, ph = o.walk ?? t * .8;
  push(x, gy, s * dir, 0, s);
  const legs = [[-60, .5, 1], [50, 0, 1], [-40, 0, 0], [70, .5, 0]];
  const L = k => { const [lx, off, far] = legs[k]; push(lx, -200, 1, Math.sin((ph + off) * TAU) * .22); const sh = tube([0, 0, 0, 100, 2, 196], 20, 13); under(sh); crayon(sh, C.yellow, { gap: 4, w: 5, alpha: far ? .6 : .9 }); ink(sh, 2.4); ink('M -8 190 L 10 190', 3); pop(); };
  L(0); L(1);
  const bob = Math.sin(ph * TAU * 2) * 3;
  push(0, bob);
  ink('M -86 -222 C -100 -200, -104 -170, -100 -150', 2.2);
  const neck = tube([60, -236, 110, -330, 150, -420], 44, 26);
  under(neck); crayon(neck, C.yellow, { gap: 4, w: 6 }); ink(neck, 2.6);
  const body = blobUnion(0, -226, [[0, -226, 96, 44], [60, -234, 50, 40]]);
  under(body); crayon(body, C.yellow, { gap: 5, w: 7 });
  for (const [sx, sy, sr] of [[-50, -236, 14], [-10, -214, 12], [30, -240, 13], [-70, -212, 9], [70, -222, 11], [10, -250, 9], [110, -300, 9], [128, -350, 8], [140, -390, 7]]) blot(circ(sx, sy, sr, sr * .8), C.orange, 1.2);
  ink(body, 2.6);
  push(154, -428, 1, Math.sin(t * 1.3) * .08);
  const hd = blobUnion(10, 0, [[0, 0, 26, 18], [30, 8, 20, 13]]);
  ink('M -6 -16 L -10 -36 M 8 -16 L 8 -38', 3); dot(-10, -38, 4.5); dot(8, -40, 4.5);
  under(hd); crayon(hd, C.yellow, { gap: 4, w: 5 }); ink(hd, 2.4);
  eyeball(8, -2, 7, { lx: .6, pupil: .6 }); dot(44, 6, 2.2);
  pop();
  pop();
  L(2); L(3);
  pop();
}
function elephant(x, gy, t, o = {}) {
  const s = o.s ?? 1, dir = o.dir ?? 1, ph = o.walk ?? t * .9, col = o.color ?? C.grey;
  push(x, gy, s * dir, 0, s);
  const legs = [[-70, .5, 1], [50, 0, 1], [-50, 0, 0], [70, .5, 0]];
  const L = k => { const [lx, off, far] = legs[k]; push(lx, -90, 1, Math.sin((ph + off) * TAU) * .15); const sh = tube([0, 0, 0, 86], 38, 34); under(sh); crayon(sh, col, { gap: 4, w: 6, alpha: far ? .6 : .9 }); ink(sh, 2.4); pop(); };
  L(0); L(1);
  const body = blobUnion(0, -150, [[0, -150, 110, 72], [70, -170, 50, 50]]);
  under(body); crayon(body, col, { gap: 5, w: 7 }); ink(body, 2.6);
  ink('M -108 -150 C -124 -130, -126 -110, -120 -96', 2.2);
  push(110, -170, 1, Math.sin(t * 1.6) * .06);
  const trunkP = tube([30, 0, 50, 50, 44, 100, 60, 120], 30, 14);
  under(trunkP); crayon(trunkP, col, { gap: 4, w: 5 }); ink(trunkP, 2.4);
  const hd = circ(10, -6, 46, 44); under(hd); crayon(hd, col, { gap: 4, w: 6 }); ink(hd, 2.6);
  const ear = blobUnion(-20, -4, [[-22, -4, 34, 44]]); under(ear); crayon(ear, C.pink, { gap: 4, w: 5, alpha: .7 }); ink(ear, 2.4);
  const tusk = 'M 34 30 C 50 50, 70 52, 84 40 C 66 42, 52 36, 42 24 Z'; under(tusk, C.white); ink(tusk, 2);
  eyeball(26, -16, 7, { lx: .6, pupil: .6 });
  pop();
  L(2); L(3);
  pop();
}

// ---------- stones & sparks ----------
function rock(x, gy, r, seedN = 1, col = C.stone) {
  const sh = blobUnion(x, gy - r * .5, [[x, gy - r * .5, r, r * .55], [x + r * .3, gy - r * .7, r * .6, r * .5]], 40);
  under(sh); crayon(sh, col, { gap: 4, w: 5, alpha: .8 }); ink(sh, 2.4);
}
function handaxe(x, y, rot = 0, s = 1) {
  push(x, y, s, rot);
  const sh = 'M 0 -34 C 14 -20, 20 4, 16 20 C 8 30, -8 30, -16 20 C -20 4, -14 -20, 0 -34 Z';
  under(sh); crayon(sh, C.stone, { gap: 3, w: 4 }); ink(sh, 2.4);
  ink('M -6 -14 L 4 -4 L -4 8 M 8 -10 L 2 2 M 6 12 L -2 18', 1.4);
  pop();
}
function sparks(x, y, u, n = 8, R = 90, seedN = 1) {
  if (u <= 0 || u >= 1) return;
  const out = [];
  for (let k = 0; k < n; k++) {
    const a = hash(k * 5 + seedN) * TAU, d = R * (.3 + .7 * easeOut(u)) * (.6 + hash(k + seedN * 3) * .5), l = 14 * (1 - u) + 4;
    out.push(seg(x + Math.cos(a) * d, y + Math.sin(a) * d, x + Math.cos(a) * (d + l), y + Math.sin(a) * (d + l)));
  }
  for (const sg of out) crayonLine(sg, u < .5 ? C.yellow : C.orange, 6, { passes: 1 });
  ink(out, 1.6, C.deep);
}
function burst(x, y, r, col = C.yellow) {
  const p = [];
  for (let k = 0; k < 16; k++) { const a = k / 16 * TAU, rr2 = k % 2 ? r * .5 : r; p.push(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2); }
  const sh = poly(p, true);
  under(sh, C.cream); crayon(sh, col, { gap: 4, w: 6 }); ink(sh, 2.4, C.deep);
}

// ---------- fire & night ----------
function flame(w, h, tip, col, alpha = .95) {
  const sh = `M ${-w} 0 C ${-w} ${-h * .4}, ${-w * .3} ${-h * .6}, ${tip} ${-h} C ${w * .3} ${-h * .6}, ${w} ${-h * .4}, ${w} 0 C ${w * .5} ${w * .5}, ${-w * .5} ${w * .5}, ${-w} 0 Z`;
  under(sh, C.cream); crayon(sh, col, { gap: 4, w: 6, alpha }); return sh;
}
function campfire(x, gy, t, o = {}) {
  const s = o.s ?? 1, k = o.size ?? 1;
  push(x, gy, s);
  for (const [a, b, c, d] of [[-60, 6, 50, -16], [60, 6, -50, -16]]) { const lg = tube([a, b, c, d], 20, 18); under(lg); crayon(lg, C.brown, { gap: 4, w: 5 }); ink(lg, 2.4); }
  if (k > .02) {
    const f = (i, sp) => Math.sin(t * sp + i * 2.1);
    const outer = flame(46 * k, (150 + f(1, 11) * 18) * k, f(2, 7) * 16 * k, C.red, .9);
    const mid = flame(32 * k, (110 + f(3, 13) * 14) * k, f(4, 9) * 12 * k, C.orange);
    const inner = flame(18 * k, (66 + f(5, 15) * 10) * k, f(6, 10) * 8 * k, C.yellow);
    ink(outer, 2.4, C.deep); ink(mid, 1.8, C.deep); ink(inner, 1.6, C.gold);
    for (let i = 0; i < 4; i++) { const u = (t * .8 + i / 4) % 1; dot(Math.sin(t * 3 + i * 4) * 30 * k, (-150 - u * 160) * k, 3 * (1 - u) + 1, i % 2 ? C.yellow : C.orange); }
  }
  pop();
}
function torchFlame(x, y, t, k = 1) {
  push(x, y, k);
  const f = Math.sin(t * 12);
  flame(16, 46 + f * 6, f * 5, C.orange); flame(9, 26, f * 3, C.yellow);
  ink(`M -16 0 C -16 -18, -5 -28, ${f * 5} ${-46 - f * 6} C 5 -28, 16 -18, 16 0 C 8 8, -8 8, -16 0 Z`, 2, C.deep);
  pop();
}
function nightSky(t, col = C.night, top = -60, bottom = 1140) {
  crayon(`M -60 ${top} L 1140 ${top} L 1140 ${bottom} L -60 ${bottom} Z`, col, { gap: 5, w: 9, angle: -.2, alpha: .9, cross: true, amp: 2, ragged: 2, base: col, baseAlpha: .85 });
}
function skyStars(t, n = 26, ymax = 600) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const x = hash(i * 17 + 3) * 1080, y = 30 + hash(i * 23 + 1) * (ymax - 30), r = 5 + 4 * Math.abs(Math.sin(t * 2 + i));
    out.push(seg(x - r, y, x + r, y), seg(x, y - r, x, y + r));
  }
  ink(out, 2, C.cream);
}
function glow(x, y, r, col = C.orange, a = .35) {
  crayon(circ(x, y, r, r * .8), col, { gap: 7, w: 10, alpha: a * .6, amp: 4, ragged: r * .35 });
  crayon(circ(x, y, r * .6, r * .5), col, { gap: 7, w: 10, alpha: a * .6, amp: 3, ragged: r * .2 });
}

// ---------- snow ----------
function flakes(t, n = 50, wind = 0, fall = 70, col = C.white, seedN = 1, size = 6) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const sp = fall * (.7 + hash(i * 3 + seedN) * .6);
    const y = ((hash(i * 5 + seedN) * 1200 + t * sp) % 1200) - 60;
    const x = (((hash(i * 7 + seedN) * 1400 + t * wind * (.8 + hash(i) * .4) + Math.sin(t * 1.5 + i) * 20) % 1400) + 1400) % 1400 - 160;
    const r = size * (.6 + hash(i * 11) * .6);
    if (Math.abs(wind) > 250) out.push(seg(x, y, x - wind * .06, y - fall * .02));
    else out.push(seg(x - r, y, x + r, y), seg(x - r * .5, y - r * .87, x + r * .5, y + r * .87), seg(x - r * .5, y + r * .87, x + r * .5, y - r * .87));
  }
  ink(out, 2.2, col);
}
function snowHills(x0, x1, gy, seedN = 1) {
  const p = [x0, gy + 300];
  for (let x = x0; x <= x1; x += 40) p.push(x, gy - 30 - 40 * Math.sin(x * .004 + seedN) - 20 * Math.sin(x * .011 + seedN * 2));
  p.push(x1, gy + 300);
  const sh = poly(p, true);
  under(sh, C.white); crayon(sh, C.sky, { gap: 8, w: 6, alpha: .35, angle: -.1 }); ink(sh, 2.4);
}

// ---------- cave ----------
function caveWall(t, lightX, lightY, lightR) {
  crayon('M -60 -60 L 1140 -60 L 1140 1140 L -60 1140 Z', '#5a4030', { gap: 6, w: 9, angle: -.3, alpha: .9, cross: true, base: '#4a3428', baseAlpha: .95 });
  crayon(circ(lightX, lightY, lightR, lightR * .85), C.cave, { gap: 4, w: 9, alpha: .8, angle: -.5, ragged: lightR * .3 });
  crayon(circ(lightX, lightY, lightR * .75, lightR * .62), '#b48a62', { gap: 4, w: 9, alpha: .75, angle: -.6, ragged: lightR * .22 });
  crayon(circ(lightX, lightY, lightR * .5, lightR * .42), '#c9a27a', { gap: 4, w: 9, alpha: .7, angle: -.4, ragged: lightR * .15 });
  crayon(circ(lightX, lightY, lightR * .3, lightR * .25), C.gold, { gap: 7, w: 9, alpha: .25, ragged: lightR * .1 });
  ink('M 120 200 C 180 260, 160 330, 220 380 M 860 160 C 820 240, 880 300, 840 380 M 600 90 C 640 130, 620 170, 660 200 M 300 700 C 360 690, 420 720, 470 700', 2, '#3a2a20');
}
function handPath(x, y, s = 1, rot = 0) {
  const parts = [circ(0, 0, 30, 34)];
  const fingers = [[-26, -10, -54, -40, 12], [-12, -28, -20, -80, 12], [4, -32, 4, -88, 12], [18, -28, 26, -80, 11], [28, -16, 44, -60, 10]];
  for (const [a, b, c, d, w] of fingers) parts.push(tube([a, b, c, d], w * 1.4, w * 1.2));
  parts.push(tube([0, 20, 0, 60], 44, 40));
  return parts.map(pt => ({ p: pt.p.map((v, i) => i % 2 ? y + (pt.p[i - 1] * Math.sin(rot) + v * Math.cos(rot)) * s : x + (v * Math.cos(rot) - pt.p[i + 1] * Math.sin(rot)) * s), c: true }));
}
function stencil(x, y, u, s = 1, rot = 0, seedN = 1) {
  if (u <= 0) return;
  const n = Math.floor(90 * clamp(u));
  for (let i = 0; i < n; i++) {
    const a = hash(i * 7 + seedN) * TAU, d = Math.sqrt(hash(i * 13 + seedN)) * 115 * s;
    const px = x + Math.cos(a) * d, py = y - 20 * s + Math.sin(a) * d * 1.05;
    crayonLine(seg(px, py, px + 5, py + 3), C.ochre, 9, { passes: 1, alpha: .75 });
  }
  for (const p of handPath(x, y, s, rot)) blot(p, '#c49872', .5);
}
// draw only the first fraction u of a shape's length
function inkReveal(shape, u, w = 3, color = C.ink) {
  if (u <= 0) return;
  const list = subs(shape);
  let total = 0; const lens = list.map(sb => { let L = 0; for (let k = 2; k < sb.p.length; k += 2) L += Math.hypot(sb.p[k] - sb.p[k - 2], sb.p[k + 1] - sb.p[k - 1]); total += L; return L; });
  let left = total * clamp(u); const out = [];
  let tip = [list[0].p[0], list[0].p[1]];
  list.forEach((sb, i) => {
    if (left <= 0) return;
    if (lens[i] <= left) { out.push({ p: sb.p, c: sb.c && u >= 1 }); left -= lens[i]; tip = [sb.p[sb.p.length - 2], sb.p[sb.p.length - 1]]; return; }
    const p = [sb.p[0], sb.p[1]]; let L = 0;
    for (let k = 2; k < sb.p.length; k += 2) { L += Math.hypot(sb.p[k] - sb.p[k - 2], sb.p[k + 1] - sb.p[k - 1]); if (L > left) break; p.push(sb.p[k], sb.p[k + 1]); }
    if (p.length >= 4) out.push({ p, c: false });
    tip = [p[p.length - 2], p[p.length - 1]];
    left = 0;
  });
  if (out.length) crayonLine(out, color, w, { passes: 1, amp: 1.2 });
  return tip;
}
const CAVE_MAMMOTH = 'M 0 0 C -10 -60, 40 -110, 110 -110 C 150 -130, 200 -120, 220 -80 C 240 -50, 250 0, 236 40 C 228 70, 214 80, 206 60 M 232 -20 C 262 -10, 272 20, 256 44 M 0 0 C -6 30, 0 60, 6 90 M 40 20 L 44 90 M 170 30 L 172 90 M 200 30 L 204 90 M 6 0 C 60 20, 140 24, 206 10';
function caveFigures() {
  return [seg(330, 40, 330, 90), seg(330, 90, 318, 120), seg(330, 90, 342, 120), seg(316, 60, 346, 60), circ(330, 28, 9),
    seg(390, 40, 390, 90), seg(390, 90, 378, 120), seg(390, 90, 402, 120), seg(376, 58, 420, 36), circ(390, 28, 9)];
}

// ---------- farming & civilisation ----------
function wheat(x, gy, h, t, seedN = 1) {
  if (h < 3) return;
  const lean = Math.sin(t * 2 + seedN) * 6 + (hash(seedN) - .5) * 10;
  const stem = `M ${x} ${gy} Q ${x + lean * .3} ${gy - h * .5} ${x + lean} ${gy - h}`;
  crayonLine(stem, C.gold, 4, { passes: 1 }); ink(stem, 1.4);
  if (h > 40) {
    const hx = x + lean, hy = gy - h, gs = [];
    for (let k = 0; k < 4; k++) { gs.push(circ(hx - 5, hy + 6 - k * 9, 4.5, 7), circ(hx + 5, hy + 2 - k * 9, 4.5, 7)); }
    for (const g of gs) { under(g, C.cream); crayon(g, C.gold, { gap: 3, w: 3, amp: .5 }); }
    ink(gs, 1.4);
  }
}
function hut(x, gy, s = 1) {
  push(x, gy, s);
  const wall = 'M -80 0 L -76 -80 L 76 -80 L 80 0 Z';
  under(wall); crayon(wall, C.tan, { gap: 5, w: 6 }); ink(wall, 2.6);
  const door = 'M -20 0 L -20 -50 C -20 -64, 20 -64, 20 -50 L 20 0 Z'; under(door, '#4a3428'); ink(door, 2.2);
  const roof = 'M -110 -70 L 0 -170 L 110 -70 C 60 -60, -60 -60, -110 -70 Z';
  under(roof); crayon(roof, C.gold, { gap: 4, w: 6, angle: -1.1 }); ink(roof, 2.6);
  ink('M -60 -80 L -20 -150 M -20 -74 L 10 -150 M 30 -76 L 30 -150 M 70 -80 L 40 -140', 1.5);
  pop();
}
function pyramid(x, gy, w, h) {
  const sh = `M ${x - w / 2} ${gy} L ${x} ${gy - h} L ${x + w / 2} ${gy} Z`;
  under(sh); crayon(sh, C.yellow, { gap: 5, w: 7, alpha: .85 });
  crayon(`M ${x} ${gy - h} L ${x + w / 2} ${gy} L ${x + w * .1} ${gy} Z`, C.gold, { gap: 4, w: 6, alpha: .7 });
  ink(sh, 2.6);
  const ls = []; for (let k = 1; k < 5; k++) { const yy = gy - h * k / 5, hw = w / 2 * (1 - k / 5); ls.push(seg(x - hw, yy, x + hw, yy)); }
  ink(ls, 1.4);
}
function palm(x, gy, h = 220, t = 0) {
  const tr = `M ${x - 10} ${gy} C ${x - 4} ${gy - h * .5}, ${x + 20} ${gy - h * .8}, ${x + 30} ${gy - h} L ${x + 42} ${gy - h} C ${x + 32} ${gy - h * .8}, ${x + 12} ${gy - h * .5}, ${x + 10} ${gy} Z`;
  under(tr); crayon(tr, C.tan, { gap: 4, w: 5 }); ink(tr, 2.2);
  const cx = x + 36, cy = gy - h, fr = [];
  for (let k = 0; k < 6; k++) { const a = -Math.PI * .95 + k / 5 * Math.PI * .9 + Math.sin(t * 1.5 + k) * .05; fr.push(`M ${cx} ${cy} Q ${cx + Math.cos(a) * 60} ${cy + Math.sin(a) * 60 - 20} ${cx + Math.cos(a) * 110} ${cy + Math.sin(a) * 60 + 30}`); }
  crayonLine(fr.join(' '), C.green, 16, { passes: 1 }); ink(fr.join(' '), 1.8);
}
function cart(x, gy, spin, s = 1) {
  push(x, gy, s);
  const box = 'M -70 -44 L 70 -44 L 60 -100 L -64 -100 Z';
  const hay = blobUnion(0, -106, [[-30, -104, 40, 20], [20, -108, 44, 22]]);
  under(hay); crayon(hay, C.gold, { gap: 4, w: 5 }); ink(hay, 2);
  under(box); crayon(box, C.brown, { gap: 4, w: 6 }); ink(box, 2.6);
  ink('M -70 -70 L -120 -80', 3);
  const wr = 42; under(circ(0, -wr, wr)); crayon(circ(0, -wr, wr * .95), C.tan, { gap: 4, w: 5, alpha: .5 });
  const sp = []; for (let k = 0; k < 4; k++) { const a = spin + k * Math.PI / 4; sp.push(seg(-Math.cos(a) * wr, -wr - Math.sin(a) * wr, Math.cos(a) * wr, -wr + Math.sin(a) * wr)); }
  ink(sp, 2); ink(circ(0, -wr, wr), 2.8); dot(0, -wr, 6);
  pop();
}
function ship(x, y, t, s = 1) {
  push(x, y + Math.sin(t * 2) * 5, s, Math.sin(t * 1.6) * .03);
  const hull = 'M -150 -30 L 150 -40 C 130 10, 90 20, 0 22 C -90 20, -130 10, -150 -30 Z';
  for (const [mx, h] of [[-50, 200], [60, 240]]) {
    ink(`M ${mx} -30 L ${mx} ${-30 - h}`, 3);
    const sail = `M ${mx - 60} ${-60 - h * .2} C ${mx - 50} ${-40 - h * .5}, ${mx + 70} ${-40 - h * .5}, ${mx + 60} ${-60 - h * .2} L ${mx + 50} ${-30 - h * .9} C ${mx + 20} ${-20 - h * .95}, ${mx - 30} ${-20 - h * .95}, ${mx - 50} ${-30 - h * .9} Z`;
    under(sail, C.white); crayon(sail, C.cream, { gap: 5, w: 6, alpha: .8 }); ink(sail, 2.4);
  }
  const flag = `M 60 -270 L ${100 + Math.sin(t * 8) * 6} -262 L 60 -250 Z`; under(flag); crayon(flag, C.red, { gap: 3, w: 4 }); ink(flag, 2);
  under(hull); crayon(hull, C.brown, { gap: 4, w: 7 }); ink(hull, 2.8);
  ink('M -110 -14 L 110 -20', 1.6);
  for (let k = -3; k <= 3; k++) ink(circ(k * 30, -4, 5), 1.6);
  pop();
}
function waves(x0, x1, y, t) {
  const out = [];
  for (let x = x0; x < x1; x += 70) { const xx = x + ((t * 30) % 70); out.push(`M ${xx} ${y} q 17 -12 35 0 q 17 12 35 0`); }
  ink(out.join(' '), 2, C.blue);
}
function lamp(x, gy, on = 0) {
  ink(`M ${x} ${gy} L ${x} ${gy - 300} Q ${x} ${gy - 330} ${x + 40} ${gy - 330}`, 5);
  ink(`M ${x - 20} ${gy} L ${x + 20} ${gy}`, 5);
  const shade = `M ${x + 20} ${gy - 334} L ${x + 60} ${gy - 334} L ${x + 70} ${gy - 310} L ${x + 10} ${gy - 310} Z`;
  if (on > 0) crayon(circ(x + 40, gy - 290, 70 * on, 60 * on), C.yellow, { gap: 6, w: 8, alpha: .5 });
  under(shade); crayon(shade, C.dark, { gap: 3, w: 4 }); ink(shade, 2.2);
  bulb(x + 40, gy - 300, .6, on > .5);
}
function bulb(x, y, s = 1, lit = true) {
  push(x, y, s);
  const g = 'M -18 0 C -30 -14, -26 -44, 0 -46 C 26 -44, 30 -14, 18 0 L 10 10 L -10 10 Z';
  under(g, lit ? C.cream : C.white); if (lit) crayon(g, C.yellow, { gap: 4, w: 5 }); ink(g, 2.4);
  ink('M -10 14 L 10 14 M -8 20 L 8 20 M -6 -2 L -4 -22 L 4 -22 L 6 -2', 1.8);
  if (lit) ink([seg(-40, -24, -54, -28), seg(40, -24, 54, -28), seg(0, -60, 0, -74), seg(-28, -50, -38, -60), seg(28, -50, 38, -60)], 2);
  pop();
}
function car(x, gy, t, s = 1, spin = 0) {
  push(x, gy, s);
  const body = 'M -110 -30 L -110 -60 C -100 -70, -70 -72, -54 -72 L -40 -112 L 50 -112 L 60 -72 L 104 -66 C 116 -60, 118 -40, 112 -30 Z';
  under(body); crayon(body, C.red, { gap: 4, w: 6 }); ink(body, 2.6);
  const win = 'M -30 -104 L 42 -104 L 50 -76 L -40 -76 Z'; under(win, '#dfe6f2'); crayon(win, C.sky, { gap: 4, w: 5, alpha: .5 }); ink(win, 2); ink('M 6 -104 L 6 -76', 2);
  for (const wx of [-66, 66]) {
    under(circ(wx, -28, 26)); crayon(circ(wx, -28, 25), C.dark, { gap: 3, w: 5 });
    ink(circ(wx, -28, 26), 2.6); under(circ(wx, -28, 10), C.grey); ink(circ(wx, -28, 10), 1.8);
    ink(seg(wx + Math.cos(spin) * 10, -28 + Math.sin(spin) * 10, wx - Math.cos(spin) * 10, -28 - Math.sin(spin) * 10), 1.6);
  }
  dot(110, -52, 6, C.yellow); ink(circ(110, -52, 7), 1.8);
  pop();
}
function rocket(x, y, t, o = {}) {
  const s = o.s ?? 1;
  push(x, y, s);
  if (o.flame) {
    const L = o.flame, f = 1 + Math.sin(t * 30) * .12;
    const sh = `M -30 0 C -30 ${60 * L}, -10 ${120 * L * f}, 0 ${190 * L * f} C 10 ${120 * L * f}, 30 ${60 * L}, 30 0 Z`;
    under(sh, C.cream); crayon(sh, C.orange, { gap: 4, w: 6 }); crayon(`M -14 0 C -14 ${40 * L}, -4 ${80 * L}, 0 ${110 * L * f} C 4 ${80 * L}, 14 ${40 * L}, 14 0 Z`, C.yellow, { gap: 3, w: 5 }); ink(sh, 2, C.deep);
  }
  const body = 'M -34 -10 L -34 -220 C -34 -280, -10 -320, 0 -340 C 10 -320, 34 -280, 34 -220 L 34 -10 Z';
  const finL = 'M -34 -90 L -70 -20 L -70 10 L -34 -10 Z', finR = 'M 34 -90 L 70 -20 L 70 10 L 34 -10 Z';
  for (const f of [finL, finR]) { under(f); crayon(f, C.red, { gap: 3, w: 5 }); ink(f, 2.4); }
  under(body, C.white); ink(body, 2.8);
  const nose = 'M -26 -262 C -20 -290, -8 -320, 0 -340 C 8 -320, 20 -290, 26 -262 Z'; under(nose); crayon(nose, C.red, { gap: 3, w: 5 }); ink(nose, 2.4);
  under(circ(0, -190, 16), '#dfe6f2'); crayon(circ(0, -190, 14), C.sky, { gap: 3, w: 4, alpha: .6 }); ink(circ(0, -190, 16), 2.6);
  ink('M -34 -120 L 34 -120 M -34 -40 L 34 -40', 1.8);
  pop();
}
function smoke(x, gy, u, n = 7, seedN = 1) {
  if (u <= 0) return;
  for (let k = 0; k < n; k++) {
    const side = k % 2 ? 1 : -1, d = (40 + hash(k + seedN) * 90) * easeOut(u) + k * 18;
    const r = (30 + hash(k * 3 + seedN) * 26) * (.5 + u);
    const c = circ(x + side * d, gy - r * .6 - hash(k * 5) * 40 * u, r, r * .8);
    under(c, C.white); crayon(c, C.grey, { gap: 6, w: 6, alpha: .35 }); ink(c, 2.2);
  }
}
function earth(x, y, r) {
  under(circ(x, y, r)); crayon(circ(x, y, r * .97), C.blue, { gap: 4, w: 6 });
  clipTo(circ(x, y, r));
  crayon(blobUnion(x - r * .3, y - r * .2, [[x - r * .35, y - r * .25, r * .35, r * .3], [x - r * .15, y + r * .1, r * .2, r * .35]]), C.green, { gap: 3, w: 5 });
  crayon(circ(x + r * .45, y + r * .25, r * .25, r * .2), C.green, { gap: 3, w: 5 });
  unclip();
  ink(circ(x, y, r), 2.6);
}
function moonGround(gy) {
  const p = [-100, gy];
  for (let x = -100; x <= 1200; x += 40) p.push(x, gy - 10 * Math.sin(x * .01) - 6 * Math.sin(x * .031));
  p.push(1200, 1200, -100, 1200);
  const sh = poly(p, true);
  under(sh, '#d8d6d0'); crayon(sh, C.grey, { gap: 6, w: 8, alpha: .6, cross: true }); ink(sh, 2.6);
  for (const [cx, cy, r] of [[180, gy + 90, 50], [820, gy + 150, 70], [520, gy + 250, 40], [980, gy + 60, 30]]) { crayon(circ(cx, cy, r, r * .35), C.dark, { gap: 4, w: 5, alpha: .4 }); ink(circ(cx, cy, r, r * .35, Math.PI, TAU), 2); }
}
function bootPrint(x, y, s = 1, a = 1) {
  push(x, y, s);
  const sole = 'M -40 -90 C -40 -120, 40 -120, 40 -90 L 36 80 C 36 110, -36 110, -36 80 Z';
  crayon(sole, C.dark, { gap: 4, w: 6, alpha: .7 * a }); ink(sole, 2.4);
  const r = []; for (let k = 0; k < 9; k++) r.push(seg(-32, -80 + k * 20, 32, -80 + k * 20)); ink(r, 2.2, C.paper);
  pop();
}
function boot(x, y, s = 1) {
  push(x, y, s);
  const sh = 'M -46 0 L -44 -150 L 30 -150 L 36 -60 C 60 -50, 70 -30, 70 0 Z';
  under(sh, C.white); crayon(sh, C.grey, { gap: 6, w: 6, alpha: .3 }); ink(sh, 2.8);
  ink('M -48 -12 L 72 -12 M -44 -110 L 30 -110', 2.2);
  pop();
}
