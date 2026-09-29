// The film: a timeline of scenes, each a pure function of time t (seconds).

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

// ============ 0 - 14.6 : the long run (Triassic -> Jurassic) ============
function camX(t) {
  const a = 3.9, r = .7, v = 285, x = t - a;
  return 540 + (x <= 0 ? 0 : x < r ? v * x * x / (2 * r) : v * (x - r / 2));
}
function sunState(t) {
  let x = 880, y = 150, r = 28, rays = 0, col = C.yellow, arc = true, spin = t * .15;
  if (t > 3.4) { const u = ease(inv(3.4, 4.4, t)); x = lerp(880, 850, u); y = lerp(150, 190, u); r = lerp(28, 48, u); rays = u; arc = u < .5; }
  if (t > 10.8) { const u = ease(inv(10.8, 12.8, t)); x = lerp(850, 600, u); y = lerp(190, 330, u); r = lerp(48, 78, u); rays = 1 - u; col = mix(C.yellow, C.orange, u); }
  return { x, y, r, rays, col, arc, spin };
}
function dfState(t) {
  if (t < 2.0) return null;
  if (t < 3.35) {
    const u = inv(2.0, 3.35, t), e = Math.min(1, u * 2.2), a = u * TAU * 1.1 - Math.PI * .9;
    const x = lerp(-150, 540 + 210 * Math.cos(a), easeOut(e)), y = G_(-330) + 70 * Math.sin(a * 1.6);
    const dx = -Math.sin(a);
    return { x, y, dir: u < .35 ? 1 : (dx >= 0 ? 1 : -1) };
  }
  if (t < 4.3) { const u = inv(3.35, 4.3, t); return { x: lerp(620, 800, easeOut(u)), y: G_(-320) + Math.sin(t * 5) * 20, dir: 1 }; }
  if (t < 7.6) {
    let y = G_(-310) + Math.sin(t * 3.1) * 40;
    if (t > 5.4 && t < 6.1) y += Math.sin(inv(5.4, 6.1, t) * Math.PI) * 170;
    return { x: camX(t) - 540 + 800 + Math.sin(t * 2) * 60, y, dir: 1 };
  }
  if (t < 8.6) { const u = inv(7.6, 8.6, t); return { x: camX(t) - 540 + lerp(860, 1250, u), y: lerp(G_(-320), -80, easeIn(u)), dir: 1 }; }
  return null;
}
function G_(dy) { return GROUND + dy; }

function babyState(t) {
  const df = dfState(t);
  const lookAt = df ? clamp((df.x - 560) / 150, -1, 1) : .6;
  if (t < 1.2) return null;
  if (t < 3.2) { const rise = backOut(inv(1.2, 1.55, t)); return { x: 540, y: G_(-50) + (1 - rise) * 150, sit: true, lx: lookAt, ly: df ? clamp((df.y - G_(-220)) / 100, -1, 1) : 0, look: lookAt * .12, inShell: true }; }
  if (t < 3.45) { const u = inv(3.2, 3.45, t); return { x: 540 + u * 20, y: G_(-50) - Math.sin(u * Math.PI) * 50, sit: true, lx: 1, ly: -1, look: -.3 * u, mouth: 'o', inShell: true }; }
  if (t < 3.95) { const u = inv(3.45, 3.95, t); return { x: lerp(560, 740, u), y: lerp(G_(-50), GROUND - 20, u) - Math.sin(u * Math.PI) * 130, rot: -Math.PI * easeOut(u), mouth: 'o', lx: .2 }; }
  if (t < 4.3) { const u = inv(3.95, 4.3, t); return { x: 720, y: GROUND - 20 * (1 - u), rot: -Math.PI - Math.PI * backOut(inv(.4, 1, u)), lx: 1, stars: u < .5 ? u : null }; }
  const off = 170 + Math.sin(t * 1.7) * 30;
  const X = Math.max(720 + (t - 4.3) * 220, camX(t) + off - 360);
  let rot = 0, run = t * 3.3, y = GROUND, mouth = null, st = null;
  if (t > 5.75 && t < 6.7) {
    const u = inv(5.75, 5.95, t), v = inv(6.45, 6.7, t);
    rot = 1.45 * easeOut(u) * (1 - backOut(v)); run = null; y = GROUND + 4; mouth = 'o';
    if (t > 5.95 && t < 6.45) st = inv(5.95, 6.45, t);
    return { x: X - (t - 5.75) * 60 * (1 - v), y, rot, run, mouth, lx: .5, stars: st };
  }
  if (t < 13.3) return { x: X, y, run, lx: t > 8.2 && t < 12 ? .5 : .9, ly: t > 8.2 && t < 12 ? -.8 : 0 };
  if (t < 14.1) {
    const s0 = sunState(t), wx = camX(t) - 540 + s0.x - 40;
    const u = inv(13.3, 14.1, t);
    return { x: lerp(X, wx, ease(u)), y: GROUND - Math.sin(Math.min(1, u * 1.5) * Math.PI) * 60, run: t * 3.3, lx: .6, ly: -1 };
  }
  const u = inv(14.1, 14.6, t);
  const s0 = sunState(t);
  return { x: camX(t) - 540 + s0.x - 40 - easeIn(u) * 900, y: GROUND - 30, rot: -u * 6, mouth: 'o', lx: -1, zoom: u };
}

function worldProps(x0, x1, t) {
  const cell = 150;
  for (let i = Math.floor(x0 / cell) - 1; i <= Math.ceil(x1 / cell); i++) {
    const wx = i * cell + hash(i * 3 + 1) * 90, h = hash(i * 7 + 5);
    if (wx > 380 && wx < 760) continue;
    if (h < .32) tuft(wx, GROUND + 26 + hash(i) * 10, .9);
    else if (h < .47) horsetail(wx, GROUND + 4, 70 + hash(i * 9) * 60);
    else if (h < .55) pebble(wx, GROUND + 30, 10);
    else if (h < .63) { tuft(wx, GROUND + 30, 1.1); tuft(wx + 22, GROUND + 26, .8); }
  }
}

function sceneEarly(t) {
  paper();
  const cx = camX(t);
  let zx = cx, zy = 540, zs = 1;
  const S = sunState(t);
  const sunW = { x: cx - 540 + S.x, y: S.y };
  if (t > 13.3) {
    const u = ease(inv(13.3, 14.6, t));
    zs = Math.pow(3.55, u);
    zx = lerp(cx, sunW.x, u); zy = lerp(540, sunW.y, u);
  }
  camera(zx, zy, zs);
  sun(sunW.x, sunW.y, S.r, { rays: S.rays, color: S.col, arc: S.arc, spin: S.spin, core: t > 11 ? C.deep : null });

  // pterosaur (sky)
  if (t > 11.2 && t < 13.4) { const u = inv(11.2, 13.4, t); ptero(cx - 540 + lerp(1250, -250, u), 230 - Math.sin(u * Math.PI) * 60, t, { s: 1.1, dir: -1 }); }

  groundLine(cx - 700, cx + 700);
  groundTexture(cx - 700, cx + 700);
  // sauropod B (farther, smaller)
  if (t > 10.0 && t < 14.6) sauropod(camX(10.3) - 540 + 1640 - 55 * (t - 10.3), GROUND, t, { s: .46, dir: -1, walk: t * .5 + .3, neck: .1 });
  worldProps(cx - 620, cx + 620, t);
  if (t > 11.6 && t < 14.6) stego(camX(11.6) - 540 + 1180 - 60 * (t - 11.6), GROUND + 4, t, { s: 1, dir: -1 });

  // egg stage
  const B = babyState(t);
  if (t < 1.2) {
    let rot = 0;
    if (t > .25 && t < .55) rot = Math.sin(inv(.25, .55, t) * TAU * 2) * .08;
    if (t > .8 && t < 1.15) rot = Math.sin(inv(.8, 1.15, t) * TAU * 2.5) * .11;
    egg(540, GROUND, { eye: 1, lx: Math.sin(t * 5) * .8, rot, blink: t > .58 && t < .72 ? 1 : 0 });
    if (rot) shake(540, GROUND - 110, 115, 6, -2.6, -.5, 14);
    mushroom(660, GROUND + 2, 1.2);
  } else if (cx < 1400) {
    const u = inv(1.2, 1.9, t);
    const tx = lerp(540, 380, u), ty = lerp(GROUND - 160, GROUND - 22, u) - Math.sin(u * Math.PI) * 260;
    if (B && B.inShell) { eggBottomBack(540, GROUND); drawBaby(B, t); }
    eggBottom(540, GROUND);
    if (u < 1) eggTop(tx, ty, -u * 2.9);
    else shellChip(380, GROUND + 2, 3.1, 1.3);
    mushroom(660, GROUND + 2, 1.2);
  }
  // sauropod A (near)
  if (t > 6.9 && t < 13.2) sauropod(camX(7.2) - 540 + 1330 + 60 * (t - 7.2), GROUND + 6, t, { s: 1, dir: 1, walk: t * .45 });
  if (B && !B.inShell) drawBaby(B, t);

  const D = dfState(t);
  if (D) dragonfly(D.x, D.y, t, { dir: D.dir, s: 1.5 });
  screen();
}
function drawBaby(B, t) {
  baby(B.x, B.y, { run: B.run ?? null, sit: B.sit, rot: B.rot ?? 0, lx: B.lx, ly: B.ly, look: B.look, mouth: B.mouth, t });
  if (B.stars != null) stars(B.x + 10, B.y - 150, B.stars);
  if (B.zoom) speedLines(B.x + 120, B.y - 60, 5, 160, 22, 1);
}

// ============ 14.6 - 22.5 : T-rex ============
const REX_X = 300;
function rexEyeWorld() { return { x: REX_X + 60 + 100, y: GROUND - 500 - 58 }; }
function sceneRex(t) {
  paper();
  const E = rexEyeWorld();
  let cx = 540, cy = 540, z = 1;
  if (t < 15.5) { cx = E.x; cy = E.y; z = 15; }
  else if (t < 16.3) { const u = ease(inv(15.5, 16.3, t)); z = 15 * Math.pow(2.3 / 15, u); cx = lerp(E.x, 470, u); cy = lerp(E.y, 330, u); }
  else if (t < 17.3) { z = 2.3; cx = 470; cy = 330; }
  else if (t < 17.9) { const u = ease(inv(17.3, 17.9, t)); z = 2.3 * Math.pow(1 / 2.3, u); cx = lerp(470, 540, u); cy = lerp(330, 540, u); }
  // landing shake
  let sx = 0, sy = 0;
  if (t > 18.35 && t < 18.6) { sx = rr(-8, 8); sy = rr(-8, 8); }
  OFF_X = sx; OFF_Y = sy;
  camera(cx, cy, z);

  // ground bands
  crayon(`M -200 ${GROUND + 2} L 1300 ${GROUND + 2} L 1300 ${GROUND + 34} L -200 ${GROUND + 30} Z`, C.tan, { gap: 5, w: 7, angle: -.1, alpha: .6 });
  crayon(`M -200 ${GROUND + 96} L 1300 ${GROUND + 100} L 1300 ${GROUND + 118} L -200 ${GROUND + 114} Z`, C.tan, { gap: 5, w: 7, angle: -.1, alpha: .5 });
  groundLine(-200, 1300);
  horsetail(560, GROUND + 6, 100); horsetail(590, GROUND + 10, 80);
  tuft(80, GROUND + 20, 1.2); tuft(700, GROUND + 26, 1);

  // background trike herd
  const herd = [[930, 1.0, .46, 21.45], [1040, .9, .42, 21.6], [860, 1.1, .38, 21.75]];
  for (const [hx, , hs, ht] of herd) {
    if (t < ht) continue;
    const u = inv(ht, ht + .25, t);
    trike(hx, lerp(-100, GROUND - 60, easeIn(u)), t, { s: hs, lx: -1 });
    if (u < 1) speedLines(hx, lerp(-100, GROUND - 60, easeIn(u)) - 200, 3, 80, 26, 0);
  }

  // T-rex
  let jaw = 0, look = 0, arm, blink = 0, pupil = .22;
  if (t < 14.9) pupil = lerp(.02, .22, ease(inv(14.6, 14.9, t)));
  if (t > 15.0 && t < 15.34) blink = tri(inv(15.0, 15.34, t) * .5) * 1.0;
  if (t > 16.35 && t < 17.25) jaw = Math.sin(inv(16.35, 17.25, t) * Math.PI) * 1.1;
  if (t > 18.4) look = .12;
  if (t > 19.45 && t < 19.7) jaw = Math.sin(inv(19.45, 19.7, t) * Math.PI) * .5;
  if (t > 19.2 && t < 20.1) arm = Math.sin(t * 40) * .5;
  if (t > 21.25 && t < 22.35) { jaw = Math.min(1, Math.sin(inv(21.25, 22.35, t) * Math.PI) * 1.5); look = .05; }
  if (t > 22.05) pupil = .1;
  trex(REX_X, GROUND, t, { jaw, look, arm, blink, pupil, bob: t < 16.3 ? 0 : 1 });
  const head = { x: REX_X + 60, y: GROUND - 500 };
  if (t > 16.35 && t < 17.25) {
    const u = inv(16.35, 17.25, t);
    roar(head.x + 250, head.y + 10, u, 1, 4);
    for (let k = 0; k < 6; k++) leaf(head.x + 320 + ((u * 1.6 + k / 6) % 1) * 500, head.y - 60 + k * 26 + Math.sin(u * 9 + k) * 20, u * 8 + k, 1.2, k % 2 ? C.green : C.lime);
  }
  if (t > 21.25 && t < 22.35) {
    const u = inv(21.25, 22.35, t);
    roar(head.x + 250, head.y + 10, u, 1, 5);
    for (let k = 0; k < 7; k++) leaf(head.x + 300 + ((u * 1.4 + k / 7) % 1) * 600, head.y + k * 30 + Math.sin(u * 7 + k) * 30, u * 9 + k, 1.1, k % 2 ? C.green : C.lime);
  }
  if (t > 19.35 && t < 19.9) shake(head.x + 120, head.y - 40, 150, 7, -2.8, -.4, 22);

  // main trike
  if (t > 18.0) {
    const u = inv(18.0, 18.35, t);
    const y = lerp(-250, GROUND, easeIn(u));
    const sq = t > 18.35 && t < 18.6 ? 1 - Math.sin(inv(18.35, 18.6, t) * Math.PI) * .12 : 1;
    let lx = -1, ly = 0;
    const df = rexDf(t);
    if (df) { lx = clamp((df.x - 700) / 120, -1, 1); ly = clamp((df.y - 560) / 100, -1, 1); }
    push(820, y, 1, 0, sq); push(-820, -y);
    trike(820, y, t, { s: .85, lx, ly, eyeR: 15, pupil: t > 21.3 && t < 22.3 ? .35 : .55 });
    pop(); pop();
    if (u < 1) speedLines(820, y - 330, 4, 120, 26, 0);
    puff(820, GROUND, inv(18.35, 18.9, t), 5, 26);
    if (t > 21.3 && t < 22.3) speedLines(1000, GROUND - 200, 6, 160, 30, 1);
  }
  const df = rexDf(t);
  if (df) dragonfly(df.x, df.y, t, { dir: df.dir, s: .9 });

  // raptors
  if (t > 20.1 && t < 21.6) {
    for (let k = 0; k < 3; k++) {
      const u = (t - 20.1 - k * .22) * 1050;
      const x = 1250 - u;
      if (x > -200 && x < 1300) { raptor(x, GROUND + 140 + k * 8, t, { dir: -1, s: 1, walk: t * 4.5 + k * .3, color: k === 1 ? C.deep : C.orange }); speedLines(x + 130, GROUND + 90 + k * 8, 3, 90, 18, 1); }
    }
  }
  OFF_X = 0; OFF_Y = 0;
  screen();
}
function rexDf(t) {
  if (t < 18.9 || t > 20.6) return null;
  if (t < 19.4) { const u = inv(18.9, 19.4, t); return { x: lerp(1200, 640, easeOut(u)), y: lerp(120, 330, easeOut(u)), dir: -1 }; }
  if (t < 20.0) { const a = (t - 19.4) * 14; return { x: 640 + Math.cos(a) * 50, y: 320 + Math.sin(a * 1.3) * 30, dir: Math.sin(a) > 0 ? -1 : 1 }; }
  const u = inv(20.0, 20.6, t); return { x: lerp(640, 1250, easeIn(u)), y: lerp(320, 60, u), dir: 1 };
}

function sceneFlee(t) {
  paper();
  if (t < 22.55) { screen(); return; }
  camera(540, 540, 1);
  groundLine(-100, 1200);
  const u = inv(22.55, 23.4, t);
  const x = lerp(560, -200, easeIn(u));
  trex(x, GROUND, t, { color: false, walk: t * 3.2, dir: -1, s: .85, look: -.1, jaw: .3 });
  speedLines(x + 380, GROUND - 260, 5, 140, 30, 1);
  ink(`M ${x - 50} ${GROUND - 560} L ${x - 50} ${GROUND - 610} M ${x - 30} ${GROUND - 560} L ${x - 24} ${GROUND - 600}`, 2.6);
  screen();
}

// ============ 23.4 - 27.4 : sunset & asteroid ============
const SSUN = { x: 640, y: 770 };
function sunsetArcs(t) {
  const cols = [C.pink, C.yellow, C.orange, C.rose, C.yellow, C.pink, C.gold];
  for (let k = 0; k < 7; k++) {
    const R = 180 + k * 92;
    let a = Math.PI + .12;
    let j = 0;
    while (a < TAU - .1) {
      const len = .35 + hash(k * 31 + j) * .9, gap = .06 + hash(k * 17 + j) * .2;
      const a1 = Math.min(TAU - .1, a + len);
      crayonLine(circ(SSUN.x, SSUN.y, R, R * .92, a, a1), cols[(k + j) % cols.length], 34 - k * 1.5, { passes: 1, alpha: .8, amp: 3 });
      a = a1 + gap; j++;
    }
  }
  for (let k = 0; k < 11; k++) {
    const a = Math.PI + (k + .5) / 11 * Math.PI;
    crayonLine(seg(SSUN.x + Math.cos(a) * 110, SSUN.y + Math.sin(a) * 105, SSUN.x + Math.cos(a) * 150, SSUN.y + Math.sin(a) * 142), k % 2 ? C.orange : C.yellow, 14, { passes: 1 });
  }
}
function sceneSunset(t) {
  paper();
  let cx = 540, cy = 540, z = 1;
  if (t < 26.0) { const u = ease(inv(24.0, 26.0, t)); z = lerp(1, 1.18, u); cx = lerp(540, 480, u); cy = lerp(540, 600, u); }
  else { const u = ease(inv(26.0, 26.35, t)); z = lerp(1.18, 2.7, u); cx = lerp(480, 250, u); cy = lerp(600, 700, u); }
  camera(cx, cy, z);
  sunsetArcs(t);
  const sh = `M ${SSUN.x - 80} ${SSUN.y} C ${SSUN.x - 80} ${SSUN.y - 110}, ${SSUN.x + 80} ${SSUN.y - 110}, ${SSUN.x + 80} ${SSUN.y} Z`;
  under(sh, C.cream); crayon(sh, C.yellow, { gap: 5, w: 8, cross: true }); ink(sh, 2.4, C.gold);
  // asteroid
  if (t > 24.2) {
    const u = inv(25.3, 26.45, t);
    const ax = lerp(230, SSUN.x - 10, easeIn(u)), ay = lerp(110, SSUN.y - 40, easeIn(u));
    const r = lerp(9, 16, inv(24.2, 25, t));
    asteroid(ax, ay, r, u > 0 ? 40 + u * 240 : 0, Math.atan2(SSUN.y - 40 - 110, SSUN.x - 10 - 230));
    if (t > 24.8 && t < 25.6) { const v = inv(24.8, 25.6, t); crayonLine(circ(ax, ay, lerp(40, 150, easeOut(Math.min(1, v * 1.5))) * (1 - Math.max(0, v - .7) * 1.5)), C.red, 10, { passes: 1 }); }
  }
  for (let k = 0; k < 2; k++) ptero(560 + k * 110 + (t - 23.4) * 30, 180 + k * 40 + Math.sin(t * 2 + k) * 10, t + k, { s: .55, dir: 1, speed: 7 });

  crayon(`M -100 ${GROUND - 60} L 1200 ${GROUND - 60} L 1200 ${GROUND - 44} L -100 ${GROUND - 46} Z`, C.yellow, { gap: 4, w: 6, alpha: .5, angle: -.05 });
  groundLine(-100, 1200, GROUND - 60);
  stego(860, GROUND - 58, t, { s: 1.1, dir: -1, walk: t * .6 });
  const grazing = Math.sin(t * 3) * .05;
  trike(470, GROUND - 40, t, { s: .8, dir: -1, body: C.orange, frill: C.rose, look: t > 24.3 ? -.05 : .25 + grazing, lx: t > 26 ? -1 : 1, ly: t > 24.4 ? -1 : .5, eyeR: 15, stripes: true });
  ptero(520, GROUND - 330, t * .3, { s: .45, dir: 1, speed: 20 });
  const lookUp = t > 24.3;
  trike(160, GROUND - 16, t, { s: .56, dir: -1, lx: lookUp ? -.8 : .8, ly: lookUp ? -1 : 0, eyeR: 20, pupil: .6, look: lookUp ? .15 : 0, tear: t > 26.05 ? inv(26.05, 26.5, t) : 0 });
  if (t > 24.05 && t < 25.5) hand('?', 190, GROUND - 250 - Math.sin(inv(24.05, 24.3, t) * Math.PI) * 10, 70);
  shrew(330, GROUND + 4, t, { s: .6, walk: t * 2, dir: 1 });
  for (const [fx, fs] of [[40, 1.1], [100, .9], [260, .8], [980, .9], [1050, 1.1]]) fern(fx, GROUND + 60, 150 * fs, .3, 1);
  tuft(680, GROUND - 40, 1.4); tuft(760, GROUND - 30, 1);
  pebble(210, GROUND + 20, 14);
  screen();
}
function sceneImpact(t) {
  paper();
  camera(540, 540, 1);
  const u = inv(26.45, 27.0, t);
  if (t < 27.0) {
    sunsetArcs(t);
    const R = 60 + easeOut(u) * 320;
    crayon(circ(SSUN.x, SSUN.y, R * 1.3, R), C.yellow, { gap: 5, w: 9, cross: true, alpha: .85 });
    crayon(circ(SSUN.x, SSUN.y, R * .5, R * .4), C.orange, { gap: 4, w: 7 });
    const out = [];
    for (let k = 0; k < 22; k++) { const a = hash(k * 5) * TAU, L = 200 + hash(k * 3) * 600 * (.3 + u); out.push(seg(SSUN.x, SSUN.y - 20, SSUN.x + Math.cos(a) * L, SSUN.y - 20 + Math.sin(a) * L)); }
    ink(out, 3);
    dot(SSUN.x, SSUN.y - 20, 14, C.red); ink(circ(SSUN.x, SSUN.y - 20, 22), 2.6);
    crayon(`M -100 ${GROUND - 60} L 1200 ${GROUND - 60} L 1200 ${GROUND + 200} L -100 ${GROUND + 200} Z`, C.paper, { gap: 4, w: 7, alpha: .4 });
    groundLine(-100, 1200, GROUND - 60);
    trike(150, GROUND - 20, t, { s: .42, dir: -1, lx: .8, ly: -.5, eyeR: 20, pupil: .3 });
    trike(430, GROUND - 40, t, { s: .62, dir: -1, body: C.orange, frill: C.rose, lx: 1, eyeR: 15, pupil: .3 });
  } else {
    const v = inv(27.0, 27.45, t);
    const R = lerp(300, 1400, easeOut(v));
    crayon(circ(SSUN.x, GROUND, R, R * .75), C.yellow, { gap: 7, w: 8, alpha: .35 * (1 - v) });
    ink(circ(SSUN.x, GROUND, R, R * .75, Math.PI, TAU), 2.6);
    groundLine(-100, 1200);
    crayonLine(seg(-50, GROUND - 4, 1150, GROUND - 4), C.orange, 10, { passes: 1, alpha: v });
  }
  screen();
}

// ============ 27.4 - 30 : dust ============
function sceneDust(t) {
  paper();
  camera(540, 540, 1);
  const u = inv(27.4, 29.2, t);
  const h = lerp(20, 330, easeOut(u));
  const cl = cloud(-120, 1200, GROUND - 6, h, 3);
  under(cl);
  if (t > 28.1) crayon(cl, C.dark, { gap: lerp(12, 4, inv(28.1, 29.4, t)), w: 7, angle: -.35, alpha: lerp(.2, .9, inv(28.1, 29.4, t)), cross: t > 28.8 });
  ink(cl, 2.6);
  const cl2 = cloud(-60, 480, GROUND - 6, h * .6, 11);
  under(cl2); if (t > 28.1) crayon(cl2, C.grey, { gap: 8, w: 6, angle: -.3, alpha: .5 }); ink(cl2, 2.4);
  crayonLine(seg(-50, GROUND - 6, 1150, GROUND - 6), C.orange, 16, { passes: 2 });
  crayonLine(seg(-50, GROUND - 2, 1150, GROUND - 2), C.red, 6, { passes: 1, alpha: .6 });
  groundLine(-100, 1200);
  if (t > 28.6) {
    const v = inv(28.6, 30.0, t);
    const yb = lerp(-60, 920, easeIn(v));
    crayon(`M -60 -60 L 1140 -60 L 1140 ${yb - 180} L -60 ${yb} Z`, C.black, { gap: 5, w: 9, angle: -.22, alpha: .95, cross: true });
  }
  screen();
}

// ============ 30 - 39.2 : darkness ============
function darkSky(bottom, t, dripT = 1) {
  if (bottom < -40) return;
  const p = [-60, -60, 1140, -60];
  for (let x = 1140; x >= -60; x -= 30) {
    const k = Math.round(x / 30), d = hash(k * 13 + 2);
    let y = bottom + Math.sin(x * .02) * 10 + d * 12;
    p.push(x, y);
    if (d > .72) { const L = (30 + hash(k * 7) * 90) * dripT; p.push(x - 4, y + L, x - 10, y + L, x - 12, y); }
  }
  crayon(poly(p, true), C.black, { gap: 5, w: 9, angle: -.18, alpha: .9, cross: true, amp: 2, ragged: 2, base: '#2b2a28', baseAlpha: .88 });
}
function embers(t, bottom, n = 70) {
  for (let i = 0; i < n; i++) {
    const x = hash(i * 3 + 1) * 1100 - 10 + Math.sin(t * 1.3 + i) * 12;
    const y = ((hash(i * 5 + 2) * 1000 + t * (40 + hash(i) * 60)) % 1000) - 40;
    if (y > bottom - 10) continue;
    const col = [C.white, C.yellow, C.red, C.orange, C.grey, C.white][i % 6];
    const a = hash(i * 11) * TAU;
    crayonLine(seg(x, y, x + Math.cos(a) * 10, y + Math.sin(a) * 10 + 4), col, 4, { passes: 1, alpha: .85 });
  }
}
function ash(t, top, n = 30) {
  for (let i = 0; i < n; i++) {
    const x = hash(i * 7 + 3) * 1080 + Math.sin(t * 2 + i) * 20;
    const y = top + ((hash(i * 9) * 600 + t * 90) % 520);
    if (y > GROUND - 5) continue;
    crayonLine(seg(x, y, x + 6, y + 8), C.black, 6, { passes: 1 });
  }
}
function sceneDark(t) {
  paper();
  camera(540, 540, 1);
  let bottom = 900;
  if (t > 31.8) bottom = lerp(900, 430, ease(inv(31.8, 32.8, t)));
  if (t > 38.2) bottom = lerp(430, -200, easeIn(inv(38.2, 39.0, t)));
  groundLine(-100, 1200);
  // skeleton
  if (t > 32.3) skeleton(800, GROUND - 4, 1.1, C.ink);
  // lonely trike
  if (t > 32.8 && t < 38.0) {
    let x = lerp(-150, 420, easeOut(inv(32.8, 35.2, t)));
    const walking = t < 35.2;
    let y = GROUND, sq = 1, look = walking ? .1 : lerp(.1, -.25, ease(inv(35.4, 36.0, t)));
    if (t > 36.6) { const v = ease(inv(36.6, 37.4, t)); sq = lerp(1, .6, v); look = lerp(-.25, .45, v); }
    push(x, y, 1, 0, sq); push(-x, -y);
    trike(x, y, t, { s: .55, dir: -1, walk: walking ? t * 1.2 : null, lx: t > 35.4 ? .3 : 1, ly: t > 35.4 ? -1 : .4, eyeR: 18, sad: true, tear: t > 35.8 ? ((t - 35.8) * .8) % 1 : 0, stripes: true });
    pop(); pop();
    if (t > 37.5) shake(x - 60, y - 90, 110, 8, 0, TAU, 16);
  }
  if (t >= 38.0) {
    const v = inv(38.0, 38.7, t);
    mound(400, GROUND, 110, 60, { color: v < 1 ? mix(C.yellow, C.grey, v) : C.grey });
    sprout(400, GROUND - 58, lerp(0, 70, easeOut(inv(38.4, 39.0, t))));
  }
  if (t > 38.35) {
    const v = inv(38.35, 39.2, t);
    sun(230, lerp(420, 280, easeOut(v)), 44, { rays: easeOut(v), spin: t * .2 });
    for (let k = 0; k < 5; k++) { const a = k * 1.3 + t * 2, r = 70 + k * 10; stars(400 + Math.cos(a) * r, GROUND - 100 + Math.sin(a) * 30, t + k); }
  }
  if (t < 39.1) {
    const dripT = t < 31.8 ? .2 : 1;
    darkSky(bottom, t, dripT);
    embers(t, bottom);
    if (t > 32.8 && t < 38.2) ash(t, bottom, 26);
    if (t > 35.8 && bottom > 330) { const v = inv(35.8, 36.8, t); moon(290, 210, 70 * easeOut(v), { line: C.cream }); }
  }
  screen();
}

// ============ 39.2 - 45.9 : life returns -> robin ============
const MOUND_X = 400;
function lifeCam(t) {
  if (t < 39.2) return { x: 540, y: 540 };
  if (t < 42.3) return { x: lerp(540, 800, ease(inv(39.2, 42.3, t))), y: 540 };
  const u = ease(inv(42.3, 43.3, t));
  return { x: lerp(800, 870, u), y: lerp(540, 520, u) };
}
function sceneLife(t) {
  paper();
  const cam = lifeCam(t);
  camera(cam.x, cam.y, 1);
  sun(cam.x - 540 + 230, 280, 44, { rays: 1, spin: t * .2 });
  groundLine(-200, 1800);
  groundTexture(-200, 1800, GROUND, 5);
  mound(MOUND_X, GROUND, 110, 60);
  sprout(MOUND_X, GROUND - 58, lerp(70, 120, easeOut(inv(39.0, 41, t))));
  const ferns = [[560, 39.2, 170, .3], [640, 39.3, 210, -.2], [90, 39.4, 150, .25], [1000, 40.2, 200, .3], [1120, 40.3, 230, -.25], [1240, 41.2, 180, .3], [1330, 41.3, 150, -.3], [180, 40.1, 120, -.3], [720, 40.4, 140, .3]];
  for (const [fx, ft, fh, fl] of ferns) fern(fx, GROUND + 4, fh, fl, 1, easeOut(inv(ft, ft + .6, t)));
  for (const [tx, tt] of [[480, 39.3], [760, 39.6], [300, 40.2], [900, 40.5], [1180, 41]]) if (t > tt) tuft(tx, GROUND + 24, 1.1);
  if (t > 39.6 && t < 40.8) beetle(lerp(820, 980, inv(39.6, 40.8, t)), GROUND + 2, t, { s: 1.2 });
  if (t > 39.3 && t < 40.4) { const v = inv(39.3, 40.4, t); push(260, GROUND - 20); ink(`M 0 0 C 10 -30, 40 -40, 60 -26`, 2.2); pop(); }
  if (t > 40.2 && t < 41.5) { const v = inv(40.2, 41.5, t); shrew(lerp(600, 1060, v), GROUND + 2, t, { s: 1.15, puff: t > 40.9 && t < 41.3 ? inv(40.9, 41.3, t) : 0 }); }
  if (t > 41.2 && t < 42.6) { const v = inv(41.2, 42.6, t); mammoth(lerp(560, 1500, v), GROUND + 4, t, { s: .95 }); }
  if (t > 42.3) {
    const g = easeOut(inv(42.3, 42.8, t));
    const x1 = lerp(300, 1420, g);
    branch(300, 660, x1, 640);
    if (g > .3) bush(330, 620, 44);
    if (g > .6) { bush(560, 600, 36); leaf(700, 628, -.6, 1.1); }
    if (g > .9) leaf(1000, 624, .5, 1.1, C.lime);
  }
  const rb = robinState(t);
  if (rb.worm) worm(rb.worm, 640, t, { s: 1.2, up: rb.wormUp });
  if (rb.wormBang) hand('!', rb.worm - 10, 590, 48);
  if (rb.mode === 'robin') robin(rb.x, rb.y, t, { fly: rb.fly, s: 1, chirp: rb.chirp, look: rb.look });
  else if (rb.mode === 'rex') {
    trex(rb.x + 60, rb.y, t, { s: .28, jaw: rb.jaw, look: -.05, walk: null, bob: 0 });
    if (rb.rawr) hand('rawr', rb.x + 150, rb.y - 200, 40);
  }
  if (rb.poof) shake(rb.x + 10, rb.y - 70, 90, 10, 0, TAU, 20);
  if (rb.swoosh) crayonLine(circ(rb.x, rb.y - 80, 100, 100, -2.4 + rb.swoosh * 2, -1 + rb.swoosh * 2.6), C.red, 8, { passes: 1 });
  if (rb.chirp) roar(rb.x + 100, rb.y - 130, (t * .7) % 1, 1, 2);
  screen();
}
function robinState(t) {
  const S = { mode: null };
  if (t < 42.5) return S;
  S.mode = 'robin';
  if (t < 43.25) {
    const u = inv(42.5, 43.25, t);
    S.x = lerp(1100, 800, easeOut(u)); S.y = lerp(250, 646, easeOut(u)); S.fly = u < .9;
  } else { S.x = 800; S.y = 646; }
  if (t > 43.4) S.worm = lerp(1320, 1040, easeOut(inv(43.4, 44.3, t)));
  if (t > 44.1 && t < 44.3) S.look = -.1;
  if (t > 44.25 && t < 44.4) S.poof = 1;
  if (t >= 44.35 && t < 45.0) { S.mode = 'rex'; S.jaw = t > 44.5 ? .8 + Math.sin(t * 30) * .15 : 0; S.rawr = t > 44.5; }
  if (t > 44.55 && t < 45.1) { S.wormUp = 1; S.wormBang = 1; }
  if (t > 45.0 && t < 45.25) S.swoosh = inv(45.0, 45.25, t);
  if (t > 45.3 && t < 45.9) S.chirp = Math.sin(t * 20) > 0;
  return S;
}

// ============ 45.9 - 47.5 : nest -> egg (loops to start) ============
function sceneNest(t) {
  paper();
  const u = ease(inv(45.9, 46.3, t));
  if (u < 1) {
    OFF_Y = -u * 1080;
    sceneLifeContent(45.9);
    OFF_Y = 0;
  }
  OFF_Y = (1 - u) * 1080;
  camera(540, 540, 1);
  const fall = easeIn(inv(46.75, 47.05, t));
  if (t > 46.75) groundLine(-100, 1200);
  const land = t > 47.05 ? Math.sin(inv(47.05, 47.2, t) * Math.PI) * 8 : 0;
  const eggY = lerp(GROUND - 46, GROUND, fall) - land;
  if (fall < 1) nest(540, GROUND + 10 + fall * 500, 1.05);
  let rot = 0;
  if (t > 47.2) rot = Math.sin(inv(47.2, 47.5, t) * TAU * 2) * .06;
  if (fall < 1) { push(0, 0); egg(540, eggY, { s: .95, rot }); pop(); nestFront(540, GROUND + 10 + fall * 500, 1.05); }
  else egg(540, eggY, { s: 1, rot });
  if (t > 46.5) {
    sun(880, 150, 28, { arc: true });
  }
  if (t > 46.9) { const v = inv(46.9, 47.5, t); dragonfly(lerp(-100, 700, v), 160, t, { s: .45 }); dragonfly(lerp(-220, 580, v), 175, t + .2, { s: .45 }); }
  if (u < 1) for (let k = 0; k < 5; k++) crayonLine(seg(150 + k * 190, -200 + k * 80, 170 + k * 190, 60 + k * 80), k % 2 ? C.green : C.lime, 26, { passes: 1, alpha: .8 * (1 - u) });
  OFF_Y = 0;
  screen();
}
function nestFront(x, y, s) {
  push(x, y, s);
  const lip = 'M -140 -70 C -100 -40, 100 -40, 140 -70 C 130 -30, 90 -4, 0 -4 C -90 -4, -130 -30, -140 -70 Z';
  under(lip); crayon(lip, C.brown, { gap: 5, w: 8, cross: true }); ink(lip, 2.6);
  ink('M -120 -44 Q 0 -20 120 -44 M -90 -22 Q 0 -8 90 -22 M -150 -64 L -118 -74 M 118 -76 L 156 -62', 2);
  pop();
}
function sceneLifeContent(t) { // reuse life scene without clearing paper
  const cam = lifeCam(t);
  camera(cam.x, cam.y, 1);
  groundLine(-200, 1800);
  mound(MOUND_X, GROUND, 110, 60);
  sprout(MOUND_X, GROUND - 58, 120);
  for (const [fx, fh, fl] of [[560, 170, .3], [640, 210, -.2], [1000, 200, .3], [1120, 230, -.25], [1240, 180, .3]]) fern(fx, GROUND + 4, fh, fl);
  branch(300, 660, 1420, 640); bush(330, 620, 44); bush(560, 600, 36);
  robin(800, 646, t, {});
}

// ============ captions ============
const ERAS = [
  [0, 230], [7.4, 230], [8.0, 160], [13.6, 160], [14.4, 68], [28.6, 68], [29.0, 66],
  [39.2, 66], [39.5, 40], [40.3, 40], [40.6, 20], [41.3, 20], [41.6, 5], [42.3, 5], [42.6, 0], [99, 0]
];
function eraValue(t) {
  for (let i = 0; i < ERAS.length - 1; i++) {
    const [t0, v0] = ERAS[i], [t1, v1] = ERAS[i + 1];
    if (t >= t0 && t < t1) return Math.round(lerp(v0, v1, (t - t0) / (t1 - t0)));
  }
  return 0;
}
function drawCaption(t) {
  screen();
  const y = 1000;
  if (t < .7) return;
  if (t < 45.2) {
    let s = `${eraValue(t)} million years ago`;
    if (t < 1.6) s = s.slice(0, Math.floor(inv(.7, 1.6, t) * s.length));
    if (t > 44.85) s = s.slice(0, Math.ceil((1 - inv(44.85, 45.2, t)) * s.length));
    if (s) hand(s, 540, y, 44);
    return;
  }
  let s = 'still here.';
  if (t < 45.9) s = s.slice(0, Math.floor(inv(45.25, 45.9, t) * s.length + 1));
  if (t > 47.1) s = s.slice(0, Math.ceil((1 - inv(47.1, 47.48, t)) * s.length));
  if (s) hand(s, 540, y + 6, 72);
}

// ============ timeline ============
const SCENES = [
  [0, 14.6, sceneEarly],
  [14.6, 22.5, sceneRex],
  [22.5, 23.4, sceneFlee],
  [23.4, 26.45, sceneSunset],
  [26.45, 27.4, sceneImpact],
  [27.4, 30.0, sceneDust],
  [30.0, 39.1, sceneDark],
  [39.1, 45.9, sceneLife],
  [45.9, 47.5, sceneNest]
];
function renderFilm(t) {
  t = clamp(t, 0, DURATION - 1e-4);
  for (const [a, b, fn] of SCENES) if (t >= a && t < b) { fn(t); break; }
  drawCaption(t);
}
