// The Tortoise and the Hare: a cut-paper retelling. Every frame is drawn from a time value.
const START_LINE = 840, FINISH = 3600, TREE_X = 2800, NAP_X = 2560;
const HARE_Y = 980, HARE_S = .9;
const T_GO = 15, T_TAPE = 50, TORT0 = 605, TORT1 = 3375;
const TORT_V = (TORT1 - TORT0) / (T_TAPE - T_GO);

// ---------- where everybody is ----------
function tortX(t) {
  if (t < 5.6) return lerp(300, TORT0, 1 - Math.pow(1 - inv(0, 5.6, t), 1.6));
  if (t < T_GO) return TORT0;
  if (t < T_TAPE) return lerp(TORT0, TORT1, (t - T_GO) / (T_TAPE - T_GO));
  if (t < 55.4) return TORT1 + TORT_V * (t - T_TAPE);
  return TORT1 + TORT_V * 5.4 + TORT_V * .7 * (1 - Math.exp(-(t - 55.4) / .7));
}
const tortHeadPass = sx => sx - 225 <= TORT1 ? T_GO + (sx - 225 - TORT0) / TORT_V : T_TAPE + (sx - 225 - TORT1) / TORT_V;

function hareState(t) {
  const S = { x: 3000, P: HARE.stand, flip: false, vis: false, sq: 0, run: 0 };
  if (t < 4.3) return S;
  S.vis = true;
  const stand = (o = {}) => Object.assign({}, HARE.stand, o);
  if (t < 6.7) { // hops in from the right, facing the tortoise
    S.flip = true; S.x = lerp(1560, 1060, inv(4.3, 6.4, t)); S.run = 1;
    S.P = hareRun(((t - 4.3) / .7) % 1, 1);
    if (t > 6.2) S.P = mixPose(S.P, HARE.stand, ease(inv(6.2, 6.7, t)));
    return S;
  }
  if (t < 9.7) { // laughs
    const w = Math.sin(t * 21);
    S.flip = true; S.x = 1060;
    S.P = stand({ mouth: .75 + .25 * w, eye: .9, tilt: -.2, ang: -1.12 + .05 * w, hy: -96 + w * 5, ear: .15 + .1 * w });
    return S;
  }
  if (t < 13) { // smug, listening
    S.flip = true; S.x = 1060;
    S.P = stand({ ear: .1 + .1 * Math.sin(t * 1.3), tilt: .04, hy: -96 + Math.sin(t * 1.6) });
    if (t > 11.6 && t < 12.3) S.P.ear = .05;
    return S;
  }
  if (t < 14.1) { // hops to the start line
    const u = inv(13, 14.1, t);
    S.flip = true; S.x = lerp(1060, 700, ease(u)); S.run = 1;
    S.P = mixPose(stand(), hareRun((u * 2) % 1, .8), ease(inv(0, .25, u)));
    if (u > .85) S.P = mixPose(S.P, HARE.crouch, ease(inv(.85, 1, u)));
    return S;
  }
  if (t < T_GO) { // ready, set...
    S.x = 700; S.P = Object.assign({}, HARE.crouch, { hy: HARE.crouch.hy + Math.sin(t * 30) * 1.2 });
    return S;
  }
  if (t < 21) { // the dash
    const u = inv(T_GO, 21, t);
    S.x = 700 + 1650 * ease(u); S.run = 1;
    const ph = S.x / 210;
    S.P = hareRun(ph % 1, 1.1);
    const w = ease(inv(0, .1, u));
    S.P = mixPose(HARE.crouch, S.P, w);
    if (u > .9) S.P = mixPose(S.P, stand({ mouth: .3 }), ease(inv(.9, 1, u)));
    return S;
  }
  if (t < 24.6) { // looks back, chuckles
    S.flip = true; S.x = 2350 + inv(21, 22, t) * 30;
    const w = Math.sin(t * 9);
    S.P = stand({ mouth: t > 22.6 ? .5 + .3 * w : .2, eye: t > 22.6 ? .8 : 0, tilt: t > 22.6 ? -.15 : .05, hy: -96 + (t > 22.6 ? w * 3 : 0) });
    return S;
  }
  if (t < 27.6) { // strolls to the tree
    const u = inv(24.6, 27.6, t);
    S.x = lerp(2380, NAP_X, ease(u)); S.run = 1;
    S.P = mixPose(stand(), hareRun((S.x / 150) % 1, .35), ease(inv(0, .12, u)));
    if (u > .85) S.P = mixPose(S.P, stand({ mouth: 0 }), ease(inv(.85, 1, u)));
    return S;
  }
  if (t < 29.4) { // yawn and stretch
    S.x = NAP_X; const u = inv(27.6, 29.4, t), y = Math.sin(u * Math.PI);
    S.P = stand({ mouth: y, eye: .6 + .3 * y, p1x: lerp(40, 46, y), p1y: lerp(-140, -270, y), p2x: lerp(24, 30, y), p2y: lerp(-132, -262, y), tilt: -.2 * y, ear: .4 * y });
    return S;
  }
  if (t < 31.6) { // curls up
    S.x = NAP_X; S.P = mixPose(stand({ eye: .8 }), HARE.lie, ease(inv(29.4, 31.6, t)));
    return S;
  }
  if (t < 47.1) { // asleep
    S.x = NAP_X; S.P = Object.assign({}, HARE.lie); S.sq = Math.sin(t * 2.4) * 3;
    return S;
  }
  if (t < 48.1) { // wakes with a start
    S.x = NAP_X;
    const u = ease(inv(47.1, 47.8, t));
    S.P = mixPose(HARE.lie, stand({ eye: -1, mouth: .7, ear: 0 }), u);
    if (t < 47.4) S.P.eye = lerp(1, -1, inv(47.1, 47.4, t));
    return S;
  }
  if (t < 52.4) { // sprint, too late
    const u = inv(48.1, 51.0, t);
    S.x = t < 51 ? NAP_X + (3462 - NAP_X) * ease(u) : 3462 + 24 * (1 - Math.pow(1 - inv(51, 52.4, t), 2)); S.run = 1;
    let P = hareRun((S.x / 210) % 1, 1.15);
    P = mixPose(stand({ eye: -1, mouth: .7 }), P, ease(inv(48.1, 48.5, t)));
    if (t > 51) P = mixPose(P, HARE.pant, ease(inv(51.1, 52.4, t)));
    S.P = P; return S;
  }
  S.x = 3486;
  const b = Math.sin(t * 7);
  const calm = ease(inv(56, 58.5, t));
  S.P = mixPose(Object.assign({}, HARE.pant, { hy: HARE.pant.hy + b * 2, mouth: .6 + .2 * b }), stand({ ang: -.95, hdy: -34, tilt: .18, ear: .35, mouth: 0, eye: 0, p1x: 12, p1y: -62, p2x: -4, p2y: -58 }), calm);
  return S;
}

// ---------- camera ----------
const SHOTS = [
  { a: 0, b: 14.4, f: t => ({ x: lerp(660, 740, t / 14.4), s: 1, g: 850 }) },
  { a: 14.4, b: 21, d: .9, f: t => ({ x: Math.max(780, hareState(t).x + 300), s: 1, g: 850 }) },
  { a: 21, b: 24.6, d: 1.2, f: t => ({ x: (hareState(t).x + tortX(t)) / 2, s: .62, g: 830 }) },
  { a: 24.6, b: 41.5, d: 1.6, f: t => ({ x: 2600 + (t - 24.6) * 1.5, s: 1.04, g: 850 }) },
  { a: 41.5, b: 47.1, d: 1.8, f: t => ({ x: tortX(t) + 250, s: 1, g: 850 }) },
  { a: 47.1, b: 48.4, d: 0, f: t => ({ x: NAP_X + 50, s: 1.3, g: 600 }) },
  { a: 48.4, b: 50, d: 0, f: t => ({ x: 3330, s: 1, g: 850 }) },
  { a: 50, b: 55.5, d: .8, f: t => ({ x: lerp(3330, 3640, ease(inv(50, 55.5, t))), s: lerp(1, 1.05, ease(inv(50, 55, t))), g: 850 }) },
  { a: 55.5, b: 61, d: 1, f: t => ({ x: 3640, s: lerp(1.05, .95, ease(inv(55.5, 60, t))), g: 850 }) }
];
function camAt(t) {
  let i = 0; while (i < SHOTS.length - 1 && t >= SHOTS[i].b) i++;
  const cur = SHOTS[i]; let c = cur.f(t);
  const d = cur.d ?? 0;
  if (i > 0 && d > 0 && t < cur.a + d) {
    const p = SHOTS[i - 1].f(t), w = ease(inv(cur.a, cur.a + d, t));
    c = { x: lerp(p.x, c.x, w), s: lerp(p.s, c.s, w), g: lerp(p.g, c.g, w) };
  }
  return c;
}

// ---------- red pencil sketches ----------
function scallop(cx, cy, rx, ry) {
  const p = [];
  for (let k = 0; k <= 90; k++) {
    const a = k / 90 * TAU, f = 1 + .11 * Math.abs(Math.sin(a * 4.5));
    p.push(cx + Math.cos(a) * rx * f, cy + Math.sin(a) * ry * f);
  }
  return { p, c: true };
}
function challengeBubble(t, tx) {
  const x0 = tx + 230, y0 = 430;
  const u = (a, b) => inv(a, b, t), fade = 1 - inv(13, 13.5, t);
  ctx.globalAlpha = fade;
  sketch([circ(tx + 160, y0 + 150, 8), circ(tx + 195, y0 + 105, 12)], u(9.7, 10.1), { w: 3.4, amp: .5 });
  sketch(scallop(x0 + 60, y0, 210, 118), u(9.9, 11), { w: 3.6, amp: .9 });
  // flag on the far horizon
  sketch([seg(x0 + 190, y0 + 55, x0 + 190, y0 - 55), poly([x0 + 190, y0 - 55, x0 + 250, y0 - 36, x0 + 190, y0 - 18], true)], u(11, 11.8), { w: 3.6, amp: .5 });
  // the tortoise's steady steps and the hare's big bounds
  const steps = [x0 - 120, y0 + 55]; for (let k = 0; k < 7; k++) steps.push(x0 - 120 + (k + 1) * 44, y0 + 55 - (k % 2) * 8);
  sketch(poly(steps), u(11.7, 12.6), { w: 3.4, dash: 8, amp: .4 });
  const hb = []; for (let k = 0; k < 3; k++) hb.push(...bez(x0 - 120 + k * 106, y0 + 28, x0 - 100 + k * 106, y0 - 60, x0 - 20 + k * 106, y0 - 60, x0 + k * 106, y0 + 28, 8));
  sketch(poly(hb), u(12, 12.9), { w: 3.4, dash: 14, amp: .4 });
  ctx.globalAlpha = 1;
}

// ---------- captions ----------
const CAPS = [
  [6.8, 9.5, '“Ha! You? Race me? You’re so slow!”', 40],
  [9.9, 13.1, '“Slow, yes. But let’s race.”', 40],
  [21.3, 24.3, 'The hare was far, far ahead...', 40],
  [25.6, 29.3, '“I have plenty of time for a nap.”', 40],
  [33, 40.5, 'Plod, plod, plod. The tortoise never stopped.', 40],
  [42, 46.8, 'Step by step, all afternoon...', 40],
  [47.6, 50, 'The hare woke up... too late!', 40],
  [52.4, 55, 'The tortoise had won the race.', 42],
  [55.7, 59.6, 'Slow and steady wins the race.', 56]
];
function captions(t) {
  for (const [a, b, s, size] of CAPS) {
    if (t < a || t > b) continue;
    ctx.globalAlpha = Math.min(inv(a, a + .3, t), inv(b, b - .5, t));
    const shown = typed(s, t, a, a + Math.min(1.6, (b - a) * .5)), y = size > 50 ? 1005 : 1060;
    ctx.font = `${size}px ${HAND}`;
    const w = ctx.measureText(s).width + 50;
    ctx.globalAlpha *= .85; cut(rrect(540 - w / 2, y - size * .95, w, size * 1.45, 18), C.paper, { line: null, shadow: false, amp: .3 });
    ctx.globalAlpha = Math.min(inv(a, a + .3, t), inv(b, b - .5, t));
    hand(shown, 540, y, size, size > 50 ? C.redD : C.line);
    ctx.globalAlpha = 1;
  }
}

// ---------- effects ----------
function dustPuffs(t, ranges) {
  for (const [a, b, dir] of ranges) {
    for (let tk = a; tk < b; tk += .12) {
      const age = t - tk; if (age < 0 || age > .9) continue;
      const hs = hareState(tk), r = 12 + age * 60, x = hs.x - dir * (60 + age * 50 * dir), y = HARE_Y - 10 - age * 34;
      cut(circ(x, y, r), '#efe6d3', { line: '#b9ad97', w: 1.2, shadow: false, amp: .8, alpha: (1 - age / .9) * .8 });
    }
  }
}
function speedLines(t, a, b, hs) {
  if (t < a || t > b) return;
  const f = Math.floor(t * 12);
  for (let k = 0; k < 5; k++) {
    const y = HARE_Y - 60 - k * 42 - hash(f + k * 7) * 16, l = 120 + hash(f * 3 + k) * 110, x0 = hs.x - 190 - hash(f + k) * 60;
    sketch(seg(x0 - l, y, x0, y), 1, { w: 3.4, alpha: .8, amp: .3 });
  }
}
function zzz(t, hx, hy) {
  for (let k = 0; k < 3; k++) {
    const p = ((t * .42 + k / 3) % 1);
    ctx.globalAlpha = Math.sin(p * Math.PI);
    hand('z', hx + 20 + p * 40 + Math.sin(p * 6 + k) * 6, hy - 40 - p * 150, 32 + p * 30, C.sketch);
  }
  ctx.globalAlpha = 1;
}
function confetti(t, cx) {
  for (let i = 0; i < 34; i++) {
    const t0 = 50 + hash(i * 3) * 2.6, age = t - t0; if (age < 0) continue;
    const x0 = cx - 320 + hash(i * 5 + 1) * 700, y0 = GROUND - 620, rest = GROUND + 20 + hash(i * 7) * 110;
    const y = Math.min(rest, y0 + age * (80 + hash(i * 9) * 60)), fallen = y >= rest;
    const x = x0 + (fallen ? 0 : Math.sin(age * 2.2 + i) * 40), a = fallen ? hash(i) * TAU : age * (1 + hash(i)) + i;
    ctx.globalAlpha = 1 - inv(56, 59.5, t) * .7;
    cut(leafShape(x, y, 40, 22, a), C.leaves[i % C.leaves.length], { pat: PATS[(i * 5) % PATS.length], w: 1.1, amp: .3, shadow: .4 });
  }
  ctx.globalAlpha = 1;
}
function rosette(x, y, k) {
  push(x, y, k, Math.sin(k * 3) * .06);
  for (const s of [-1, 1]) cut(poly([s * 8, 20, s * 34, 78, s * 20, 66, s * 6, 82, s * -2, 30], true), s < 0 ? C.red : C.redD, { line: C.line, w: 1.4, amp: .3 });
  cut(circ(0, 0, 40), C.goldD, { line: C.line, w: 1.6, amp: .4 });
  cut(circ(0, 0, 32), C.gold, { pat: 'flower', line: C.goldD, w: 1.6, amp: .3, shadow: false });
  hand('1', 0, 15, 46, C.line);
  pop();
}

// ---------- the film ----------
let _film = null;
function renderFilm(t) {
  if (!_film) { _film = document.getElementById('film'); setCtx(_film.getContext('2d')); }
  t = clamp(t, 0, DURATION - 1 / FPS);
  beginFrame(Math.floor(t * FPS));
  const cam = camAt(t), camY = GROUND - (cam.g - 540) / cam.s;
  backdrop(t, cam.x, camY, cam.s, cam.g);
  camera(cam.x, camY, cam.s);

  line(seg(viewL(), GROUND, viewR(), GROUND), 1.8, C.line, { amp: .5 });
  groundProps(t);
  startLine(t);
  tree(120, GROUND, .95, 1, t);
  tree(1900, GROUND, .7, 4, t);
  tree(4300, GROUND, .85, 6, t);
  tree(TREE_X, GROUND + 8, 1.25, 2, t, { fall: inv(31, 47, t) * .55 });
  finishGate(t, tortHeadPass);

  // tortoise
  const tx = tortX(t), walkIn = t < 5.6;
  const spd = walkIn ? 1 - inv(4, 5.6, t) * .8 : t > T_GO ? 1 - inv(55.4, 57, t) : 0;
  const talk = inv(9.6, 10.2, t) * (1 - inv(13.2, 13.8, t));
  let mood = 'calm';
  if (talk > .5 || t > 50.4) mood = 'joy';
  else if (t > 36 && t < 47.8) mood = 'tired';
  const strain = inv(46.5, 48.5, t) * (1 - inv(50, 50.6, t));
  tortoise(tx, GROUND, 1, {
    ph: tx / 68, mv: spd, mood, t,
    ext: .12 + .1 * Math.sin(t * .9) + strain * .9 + (t > 50 ? .3 * (1 - inv(50, 53, t)) : 0),
    up: 4 + talk * 20 + (t < 5.6 ? 3 : 0) + (t > 52 ? 10 * inv(52, 53, t) : 0),
    look: t > 38.8 && t < 41.5 ? -1 : 0, blink: ((t * .37) % 1) < .04, breath: Math.sin(t * 1.6) * 1.2
  });

  // hare
  const hs = hareState(t);
  if (hs.vis) {
    hare(hs.x, HARE_Y, HARE_S, hs.P, { flip: hs.flip, sq: hs.sq, blink: t > 22.6 && ((t * .3) % 1) < .05 && hs.P.eye < .5 });
    const dir = hs.flip ? -1 : 1;
    if (t >= 31.6 && t < 47.1) zzz(t, hs.x + 95, HARE_Y - 60);
    if (t >= 47.2 && t < 48.1) hand('!', hs.x + 30, HARE_Y - 300, 100 * backOut(inv(47.2, 47.5, t)), C.red);
    speedLines(t, 15.2, 20.6, hs); speedLines(t, 48.6, 50.8, hs);
  }
  dustPuffs(t, [[15.2, 20.7, 1], [48.3, 51.6, 1]]);
  if (t >= 9.7 && t < 13.5) challengeBubble(t, tortX(t));
  if (t >= T_TAPE && t < 57) confetti(t, FINISH);
  if (t >= 51.3) rosette(tx + 62, GROUND - 205 - 3 * Math.sin(t * 2), .85 * backOut(inv(51.3, 52, t)));

  screen();
  if (t >= T_GO + .1 && t < 17) {
    ctx.globalAlpha = 1 - inv(16.2, 17, t);
    hand('GO!', 540, 330, 150 * backOut(inv(T_GO + .1, T_GO + .5, t)), C.red);
    ctx.globalAlpha = 1;
  }
  captions(t);
  // title
  if (t < 5.4) {
    ctx.globalAlpha = 1 - inv(4.3, 5.4, t);
    hand(typed('The Tortoise', t, .3, 1.8), 540, 230, 104, C.line);
    hand(typed('and the Hare', t, 1.9, 3.2), 540, 335, 76, C.redD);
    sketch(curve(300, 372, 420, 392, 640, 366, 780, 384), inv(3.2, 3.9, t), { w: 4, amp: .6 });
    ctx.globalAlpha = 1;
  }
  const fadeOut = inv(59.2, 59.95, t);
  if (fadeOut > 0) { ctx.globalAlpha = fadeOut; ctx.fillStyle = C.paper; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
  grainOverlay();
}
