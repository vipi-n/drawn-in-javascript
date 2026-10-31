// Act 2: the arcade golden age (invaders / maze chase / girders), the 1983 crash, the revival (Tetris, NES, Game Boy).
const { W, H, TAU, clamp, lerp, ss, io3, out3, out5, back, rgba, mix, mixs, hash, rng, noise, fbm, cues } = require('./core');
const G = require('./gfx');
const R = require('./retro');
const T = require('./type');
const { B, BEAT, BAR, EV } = cues;

// ================================================================ ARCADE
const AW = 112, AH = 128;
// invaders (original 8x8 designs, two frames each)
const INV = [
  [['...##...', '..####..', '.######.', '##.##.##', '########', '..#..#..', '.#.##.#.', '#.#..#.#'], ['...##...', '..####..', '.######.', '##.##.##', '########', '.#.##.#.', '#......#', '.#....#.']],
  [['..#..#..', '...##...', '..####..', '.##..##.', '########', '#.####.#', '#.#..#.#', '...##...'], ['..#..#..', '#..##..#', '#.####.#', '###..###', '########', '..####..', '.#....#.', '#......#']],
  [['..####..', '.######.', '########', '##.##.##', '########', '..#..#..', '.##..##.', '##....##'], ['..####..', '.######.', '########', '##.##.##', '########', '.##..##.', '#..##..#', '.#....#.']],
];
const BOOM = ['#..#...#', '.#.#..#.', '..#..#..', '##....##', '..#..#..', '.#..#.#.', '#...#..#'];
const CANNON = ['....#....', '...###...', '.#######.', '#########', '#########'];
// march: a tick every beat, then every half beat, then quarter (they speed up as they thin out)
function marchTicks(T0) {
  const u = T0 - EV.invaders + 1.5;
  if (u < 0) return 0;
  const a = 2.2, b = 3.6;
  if (u < a) return Math.floor(u / BEAT);
  if (u < b) return Math.floor(a / BEAT) + Math.floor((u - a) / (BEAT / 2));
  return Math.floor(a / BEAT) + Math.floor((b - a) / (BEAT / 2)) + Math.floor((u - b) / (BEAT / 4));
}
const SHOTS = [[1, 4], [2.5, 6], [3.5, 2], [4.5, 5], [5.5, 3]]; // [beats after start, column]
function invadersScreen(p, T0) {
  p.fillStyle = '#000'; p.fillRect(0, 0, AW, AH);
  const n = marchTicks(T0), span = 26, ph = n % (span * 2), off = ph < span ? ph : span * 2 - ph, down = Math.floor(n / span) * 4;
  const fx = 6 + off * 1, fy = 22 + down;
  const dead = new Map();
  SHOTS.forEach(([bt, col]) => { const ts = EV.invaders + bt * BEAT, hitT = ts + .22; if (T0 > hitT) { const k = 'c' + col; dead.set(k, (dead.get(k) ?? 0) + 1); } });
  const boom = [];
  for (let r = 0; r < 5; r++) for (let c = 0; c < 8; c++) {
    const killedFromBottom = dead.get('c' + c) ?? 0;
    if (4 - r < killedFromBottom) continue;
    const type = r === 0 ? 0 : r < 3 ? 1 : 2, x = fx + c * 11, y = fy + r * 10;
    R.sprite(p, INV[type][n % 2], x, y, { '#': '#f4f4f4' });
  }
  // shots + explosions
  SHOTS.forEach(([bt, col]) => {
    const ts = EV.invaders + bt * BEAT, hitT = ts + .22, k = SHOTS.filter((s) => s[1] === col && s[0] < bt).length;
    const ax = fx + col * 11 + 4, ay = fy + (4 - k) * 10 + 4;
    if (T0 >= ts && T0 < hitT) { const y = lerp(112, ay, (T0 - ts) / .22); p.fillStyle = '#fff'; p.fillRect(ax, y, 1, 4); }
    if (T0 >= hitT && T0 < hitT + .25) R.sprite(p, BOOM, ax - 4, ay - 3, { '#': '#fff' });
  });
  // cannon glides under its next target
  const nxt = SHOTS.find(([bt]) => EV.invaders + bt * BEAT > T0) ?? SHOTS[SHOTS.length - 1];
  const prev = [...SHOTS].reverse().find(([bt]) => EV.invaders + bt * BEAT <= T0);
  const tx = fx + nxt[1] * 11, px0 = prev ? fx + prev[1] * 11 : 50, tn = EV.invaders + nxt[0] * BEAT, tp = prev ? EV.invaders + prev[0] * BEAT : tn - 1;
  const cxp = lerp(px0, tx, io3(clamp((T0 - tp) / Math.max(.1, tn - tp - .1))));
  R.sprite(p, CANNON, cxp, 114, { '#': '#fff' });
  // bunkers
  for (let i = 0; i < 4; i++) { const bx = 10 + i * 26; p.fillStyle = '#fff'; p.fillRect(bx, 100, 12, 6); p.fillRect(bx + 1, 99, 10, 1); p.clearRect(bx + 4, 104, 4, 2); }
  p.fillStyle = '#fff'; p.fillRect(0, 124, AW, 1);
  T.pixText(p, 'SCORE ' + String(10 * SHOTS.filter(([bt]) => EV.invaders + bt * BEAT + .22 < T0).length * 3 + 120).padStart(4, '0'), 4, 4, 1, { color: '#fff' });
  // mystery ship
  const ux = lerp(-12, 120, clamp((T0 - EV.invaders - 1.2) / 2.4));
  p.fillStyle = '#fff'; p.fillRect(ux, 14, 10, 3); p.fillRect(ux + 2, 13, 6, 1); p.fillRect(ux + 1, 17, 2, 1); p.fillRect(ux + 7, 17, 2, 1);
  // the cabinet's cellophane: red band for the saucer, green for the cannon zone
  p.globalCompositeOperation = 'multiply';
  p.fillStyle = '#ff3a3a'; p.fillRect(0, 12, AW, 8);
  p.fillStyle = '#39ff6a'; p.fillRect(0, 96, AW, 30);
  p.globalCompositeOperation = 'source-over';
}

// maze (14 x 16 tiles of 8 px), mirrored halves
const HALF = ['#######', '#......', '#.##.##', '#o##.##', '#......', '#.##.#.', '#......', '###.#==', '   .#  ', '###.###', '#......', '#.##.##', '#o.#...', '##.#.##', '#......', '#######'];
const MAZE = HALF.map((h) => h + [...h].reverse().join(''));
const wallAt = (c, r) => r >= 0 && r < 16 && c >= 0 && c < 14 && MAZE[r][c] === '#';
const PAC_PATH = () => [[EV.pac - .3, 1, 14], [EV.pac + 1.5, 12, 14], [EV.pellet, 12, 12], [EV.pellet + .3, 12, 14], [EV.pac + 5 * BEAT + .3, 3, 14]];
function along(path, T0) {
  if (T0 <= path[0][0]) return [path[0][1], path[0][2], 1, 0];
  for (let i = 1; i < path.length; i++) if (T0 <= path[i][0]) { const [a, x0, y0] = path[i - 1], [b, x1, y1] = path[i], u = (T0 - a) / (b - a); return [lerp(x0, x1, u), lerp(y0, y1, u), Math.sign(x1 - x0), Math.sign(y1 - y0)]; }
  const l = path[path.length - 1]; return [l[1], l[2], -1, 0];
}
function pacScreen(p, T0) {
  p.fillStyle = '#000'; p.fillRect(0, 0, AW, AH);
  const oy = 0;
  // walls: outline wall tiles where they meet corridors (the double blue line look)
  p.fillStyle = '#2b3cff';
  for (let r = 0; r < 16; r++) for (let c = 0; c < 14; c++) {
    if (!wallAt(c, r)) { if (MAZE[r][c] === '=') { p.fillStyle = '#ffb8de'; p.fillRect(c * 8, oy + r * 8 + 3, 8, 2); p.fillStyle = '#2b3cff'; } continue; }
    const x = c * 8, y = oy + r * 8;
    if (!wallAt(c, r - 1)) p.fillRect(x, y + 1, 8, 1);
    if (!wallAt(c, r + 1)) p.fillRect(x, y + 6, 8, 1);
    if (!wallAt(c - 1, r)) p.fillRect(x + 1, y, 1, 8);
    if (!wallAt(c + 1, r)) p.fillRect(x + 6, y, 1, 8);
  }
  const path = PAC_PATH(), [px, py, dx, dy] = along(path, T0);
  // dots (eaten along the pac path so far)
  const eaten = (c, r) => {
    for (let i = 1; i < path.length; i++) {
      const [a, x0, y0] = path[i - 1], [b, x1, y1] = path[i]; if (T0 < a) break;
      const u = clamp((T0 - a) / (b - a)), xe = lerp(x0, x1, u), ye = lerp(y0, y1, u);
      if (r === y0 && y0 === y1 && c >= Math.min(x0, xe) - .3 && c <= Math.max(x0, xe) + .3) return true;
      if (c === x0 && x0 === x1 && r >= Math.min(y0, ye) - .3 && r <= Math.max(y0, ye) + .3) return true;
    }
    return false;
  };
  for (let r = 0; r < 16; r++) for (let c = 0; c < 14; c++) {
    const ch = MAZE[r][c]; if ((ch !== '.' && ch !== 'o') || eaten(c, r)) continue;
    p.fillStyle = '#ffcfb0';
    if (ch === '.') p.fillRect(c * 8 + 3, oy + r * 8 + 3, 2, 2);
    else if (Math.floor(T0 * 5) % 2 === 0) { p.fillRect(c * 8 + 2, oy + r * 8 + 1, 4, 6); p.fillRect(c * 8 + 1, oy + r * 8 + 2, 6, 4); }
  }
  // ghosts trail pac; after the pellet they turn blue and flee
  const blue = T0 > EV.pellet, flash = blue && T0 > EV.pellet + 2.2 && Math.floor(T0 * 8) % 2 === 0;
  const cols = ['#ff2a2a', '#ffb8ff', '#3fffff', '#ffb84f'];
  cols.forEach((col, i) => {
    let gx, gy;
    if (!blue) { const [x, y] = along(path, T0 - .35 - i * .32); gx = x; gy = y; }
    else { const age = T0 - EV.pellet, [x, y] = along(path, EV.pellet - .35 - i * .32); gx = Math.max(-2, x - age * (2.6 + i * .2)); gy = 14; if (y < 14) gx = x - age * 2.6; }
    const X = Math.round(gx * 8), Y = Math.round(oy + gy * 8), fr = Math.floor(T0 * 8) % 2;
    const body = blue ? (flash ? '#f4f4f4' : '#2121ff') : col;
    R.sprite(p, ['..####..', '.######.', '########', '########', '########', '########', '########', fr ? '#.##.##.' : '.##.##.#'], X, Y, { '#': body });
    if (!blue) { p.fillStyle = '#fff'; p.fillRect(X + 1, Y + 2, 2, 3); p.fillRect(X + 5, Y + 2, 2, 3); p.fillStyle = '#2121ff'; p.fillRect(X + 2 + (dx > 0 ? 0 : -1) + 0, Y + 3, 1, 2); p.fillRect(X + 6 + (dx > 0 ? 0 : -1), Y + 3, 1, 2); }
    else { p.fillStyle = flash ? '#ff2a2a' : '#ffcfb0'; p.fillRect(X + 2, Y + 3, 1, 1); p.fillRect(X + 5, Y + 3, 1, 1); p.fillRect(X + 1, Y + 5, 6, 1); }
  });
  // pac: per-pixel disc with a chomping wedge
  const mouth = Math.abs(Math.sin(T0 * 16)) * .8, ang = dy ? (dy > 0 ? Math.PI / 2 : -Math.PI / 2) : dx < 0 ? Math.PI : 0;
  p.fillStyle = '#ffe600';
  const X0 = px * 8 + 4, Y0 = oy + py * 8 + 4;
  for (let yy = -5; yy <= 5; yy++) for (let xx = -5; xx <= 5; xx++) {
    if (xx * xx + yy * yy > 21) continue;
    let a = Math.atan2(yy, xx) - ang; a = Math.atan2(Math.sin(a), Math.cos(a));
    if (Math.abs(a) < mouth && xx * xx + yy * yy > 1) continue;
    p.fillRect(Math.round(X0 + xx - .5), Math.round(Y0 + yy - .5), 1, 1);
  }
  T.pixText(p, '1UP  2370', 4, 129 - 9, 1, { color: '#fff' });
}

// girders + barrels
const GIRD = [[120, 0], [98, 1], [76, -1], [54, 1]]; // [y at left, slope sign]
const gy = (k, x) => GIRD[k][0] - GIRD[k][1] * (x / 112) * 5;
const BARREL_PATH = (() => {
  const P = [[22, gy(3, 22) - 4]];
  P.push([104, gy(3, 104) - 4]); P.push([108, gy(2, 108) - 4]);
  P.push([6, gy(2, 6) - 4]); P.push([2, gy(1, 2) - 4]);
  P.push([104, gy(1, 104) - 4]); P.push([108, gy(0, 108) - 4]);
  P.push([-10, gy(0, -10) - 4]);
  const L = [0]; for (let i = 1; i < P.length; i++) L.push(L[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
  return { P, L };
})();
const BSPEED = 44;
function barrelAt(s) {
  const { P, L } = BARREL_PATH;
  if (s <= 0 || s >= L[L.length - 1]) return null;
  for (let i = 1; i < P.length; i++) if (s <= L[i]) { const u = (s - L[i - 1]) / (L[i] - L[i - 1]); return [lerp(P[i - 1][0], P[i][0], u), lerp(P[i - 1][1], P[i][1], u), i]; }
  return null;
}
const HERO = ['..RRRR..', '.RRRRRRR', '.KKSSK..', 'KSKSSSS.', '.SSSKKK.', '..SSSS..', '.RBBRR..', 'RBBYBBYR', 'SBBBBBBS', '.BB..BB.', 'KK....KK'];
const HERO2 = ['..RRRR..', '.RRRRRRR', '.KKSSK..', 'KSKSSSS.', '.SSSKKK.', '..SSSS..', '.RBBRR..', 'RBBYBBYR', '.BBBBBBS', '.BBBBB..', '..KK.KK.'];
const HPAL = { R: '#e8382a', S: '#ffc89a', B: '#3156e8', K: '#5a2a0a', Y: '#ffd23f' };
const APE = ['....KKKKKK....', '...KKKKKKKK...', '..KKFFKKFFKK..', '..KKFKFFKFKK..', '..KKFFFFFFKK..', '...KFKKKKFK...', '..KKKFFFFKKK..', '.KKKKKKKKKKKK.', 'KKKKKFFFFKKKKK', 'KKKKFFFFFFKKKK', 'KK.KKFFFFKK.KK', 'KK.KKKKKKKK.KK', '...KKK..KKK...', '..KKKK..KKKK..'];
const LADY = ['YYY..', 'YSSY.', '.SS..', 'PPPP.', 'PPPPP', '.PPP.', 'PPPPP', 'PPPPP', '.S.S.'];
const BAR_SPAWN = (i) => EV.dk - 9 + i * BEAT * 2;
function dkScreen(p, T0) {
  p.fillStyle = '#000'; p.fillRect(0, 0, AW, AH);
  // ladders
  p.fillStyle = '#3fd7ff';
  for (const [k, x] of [[0, 80], [1, 30], [2, 70], [0, 20]]) { const y0 = gy(k + 1, x) + 2, y1 = gy(k, x); for (let y = y0; y < y1; y += 3) p.fillRect(x, y, 6, 1); p.fillRect(x, y0, 1, y1 - y0); p.fillRect(x + 5, y0, 1, y1 - y0); }
  // girders (red beams with rivet holes)
  for (let k = 0; k < 4; k++) for (let x = 0; x < 112; x += 4) {
    const y = Math.round(gy(k, x)); if (k === 3 && x > 108) continue;
    p.fillStyle = '#ff3f6a'; p.fillRect(x, y, 4, 4); p.fillStyle = '#000'; p.fillRect(x + 1, y + 1, 2, 2);
  }
  p.fillStyle = '#ff3f6a'; p.fillRect(36, 32, 40, 3);
  // ape pounding at the top-left, lady above
  const bob = Math.floor(T0 / (BEAT / 2)) % 2;
  R.sprite(p, APE, 6, 54 - 14 - bob - 5, { K: '#a2461a', F: '#f2b06a' });
  R.sprite(p, LADY, 54, 23, { Y: '#ffd23f', S: '#ffc89a', P: '#ff6fc8' });
  if (Math.floor(T0 * 1.5) % 2 === 0) T.pixText(p, 'HELP!', 62, 14, 1, { color: '#3fd7ff' });
  // barrel stack beside the ape
  p.fillStyle = '#c8742a'; for (const [bx, by] of [[0, 36], [0, 44], [5, 36], [5, 44]]) { p.fillRect(bx, by, 5, 8); }
  // barrels
  const heroX = 60;
  for (let i = 0; i < 12; i++) {
    const s = (T0 - BAR_SPAWN(i)) * BSPEED, b = barrelAt(s); if (!b) continue;
    const roll = Math.floor(s / 3) % 2;
    p.fillStyle = '#d88a3a'; p.fillRect(Math.round(b[0]) - 3, Math.round(b[1]) - 3, 6, 6);
    p.fillStyle = '#7a3e12'; p.fillRect(Math.round(b[0]) - 3, Math.round(b[1]) - 1 + roll, 6, 1); p.fillRect(Math.round(b[0]) - 1 + roll, Math.round(b[1]) - 3, 1, 6);
  }
  // hero runs on the bottom girder and hops each barrel as it passes
  let jump = 0;
  for (let i = 0; i < 12; i++) {
    const { L } = BARREL_PATH, sHero = L[6] + (108 - heroX), tp = BAR_SPAWN(i) + sHero / BSPEED, d = (T0 - tp) / .42;
    if (Math.abs(d) < 1) jump = Math.max(jump, Math.cos(d * Math.PI / 2) * 13);
  }
  const hx = heroX + Math.sin(T0 * 1.3) * 6, fr = Math.floor(T0 * 10) % 2;
  R.sprite(p, jump > 1 ? HERO2 : fr ? HERO : HERO2, hx - 4, gy(0, hx) - 11 - jump, HPAL);
  T.pixText(p, 'BONUS 4600', 46, 4, 1, { color: '#3fd7ff' });
}

const CABS = [
  { name: 'INVADERS', neon: '#39ff6a', m0: '#a6ff4a', m1: '#1db954', draw: invadersScreen, key: 'inv' },
  { name: 'MAZE CHASE', neon: '#ffd23f', m0: '#ffe94a', m1: '#ff9a1f', draw: pacScreen, key: 'pac' },
  { name: 'GIRDERS', neon: '#ff3f6a', m0: '#ff8a4a', m1: '#ff2a55', draw: dkScreen, key: 'dk' },
];
function arcade(ctx, t, T0) {
  // which cabinet the camera faces: pans between them on the card changes
  const k = out5(ss(EV.pac - .45, EV.pac + .25, T0)) + out5(ss(EV.dk - .45, EV.dk + .25, T0));
  const ci = Math.round(k), tint = mix(CABS[Math.floor(k)].neon, CABS[Math.min(2, Math.floor(k) + 1)].neon, k % 1);
  // a dark arcade hall: neon floor carpet, other cabinets glowing far away
  G.vgrad(ctx, 0, H, [[0, '#07040f'], [.6, '#120a24'], [1, '#05030a']]);
  G.bokeh(ctx, t, 16, { colors: ['#ff3fb5', '#3fd4ff', '#ffd23f', '#39ff6a'], a: .1, rmin: 20, rmax: 70, seed: 33, y0: 120, y1: 560, drift: [-14 * (1 + k), 0] });
  G.glow(ctx, 540, 420, 700, tint, .2);
  ctx.save(); R.cam(ctx, t, BAR * 4, 1.0, 1.04, 540, 440);
  for (let i = 0; i < 3; i++) {
    const dx = (i - k) * 760;
    if (Math.abs(dx) > 1100) continue;
    ctx.save(); ctx.translate(dx, 0);
    const cab = CABS[i];
    R.arcade(ctx, T0, (c, x, y, w, h) => { const L = R.lowres(cab.key, AW, AH); cab.draw(L.c, T0); R.blit(c, L.cv, x, y, w, h); }, { neon: cab.neon, m0: cab.m0, m1: cab.m1, marquee: cab.name });
    ctx.restore();
  }
  ctx.restore();
}

// ================================================================ CRASH (1983)
function crash(ctx, t, T0) {
  const u = t / (BAR * 2);
  G.vgrad(ctx, 0, 620, [[0, '#04061a'], [.55, '#151338'], [.85, '#3b2246'], [1, '#6a3448']]);
  const P = rng(41);
  for (let i = 0; i < 150; i++) { const x = P() * W, y = P() * 520, b = P(); ctx.fillStyle = `rgba(230,235,255,${(.2 + .7 * b * b) * (.7 + .3 * Math.sin(t * 2 + i))})`; ctx.fillRect(x, y, b > .9 ? 2.5 : 1.5, b > .9 ? 2.5 : 1.5); }
  G.glow(ctx, 250, 170, 160, '#dfe6ff', .28); ctx.fillStyle = '#eef0ff'; ctx.beginPath(); ctx.arc(250, 170, 34, 0, TAU); ctx.fill();
  ctx.fillStyle = 'rgba(20,20,40,.18)'; ctx.beginPath(); ctx.arc(238, 162, 8, 0, TAU); ctx.arc(260, 182, 5, 0, TAU); ctx.fill();
  // mesas
  const ridge = (y0, amp, f, col, seed) => { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, H); for (let x = 0; x <= W; x += 6) { const n = fbm(x * f + seed, 3), m = Math.max(0, n) * 2; ctx.lineTo(x, y0 - amp * Math.min(1, m * 1.6)); } ctx.lineTo(W, H); ctx.closePath(); ctx.fill(); };
  ridge(600, 130, .004, '#2a1a35', 3); ridge(640, 70, .007, '#1d1426', 11);
  G.vgrad(ctx, 630, H, [[0, '#3a2a30'], [.4, '#251a1f'], [1, '#0d090b']]);
  // bulldozer headlights rake across the pit
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const hx = lerp(980, 900, u);
  const gl = ctx.createRadialGradient(hx, 600, 0, hx, 600, 620); gl.addColorStop(0, 'rgba(255,226,170,.5)'); gl.addColorStop(1, 'rgba(255,226,170,0)');
  ctx.fillStyle = gl; ctx.beginPath(); ctx.moveTo(hx, 595); ctx.lineTo(160, 640); ctx.lineTo(240, 760); ctx.closePath(); ctx.fill();
  ctx.restore();
  ctx.fillStyle = '#0b0809'; ctx.beginPath(); ctx.roundRect(hx - 10, 560, 150, 60, 8); ctx.fill(); ctx.fillRect(hx + 30, 520, 70, 50); ctx.fillRect(hx - 40, 590, 30, 50);
  G.glow(ctx, hx - 2, 596, 30, '#ffe2aa', .9);
  // the pit of cartridges, slowly buried by sand
  ctx.save(); R.cam(ctx, t, BAR * 2, 1.0, 1.07, 480, 680);
  ctx.fillStyle = '#120c0e'; ctx.beginPath(); ctx.ellipse(470, 690, 360, 70, 0, 0, TAU); ctx.fill();
  const Q = rng(77), labels = ['#ff5d2e', '#3fb2ff', '#ffd23f', '#7cff6a', '#ff4fb0', '#b48cff'];
  const sand = lerp(0, 1, ss(.1, 1, u));
  for (let i = 0; i < 46; i++) {
    const x = 160 + Q() * 620, y = 650 + Q() * 70, a = (Q() - .5) * 1.4, col = labels[(Q() * 6) | 0];
    const buried = (y - 640) / 90 < sand * .9 + Q() * .2 - .2;
    ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.globalAlpha = buried ? .25 : 1;
    ctx.fillStyle = '#17171a'; ctx.fillRect(-26, -22, 52, 44); ctx.fillStyle = col; ctx.fillRect(-20, -17, 40, 24);
    ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(-20, -17, 40, 3);
    ctx.fillStyle = 'rgba(255,226,170,.25)'; ctx.fillRect(-26, -22, 52, 2);
    ctx.restore();
  }
  // sand drifts in over the pile
  const sg = ctx.createLinearGradient(0, 640, 0, 760); sg.addColorStop(0, 'rgba(96,70,64,.0)'); sg.addColorStop(1, 'rgba(60,44,40,1)');
  ctx.fillStyle = sg; ctx.beginPath(); ctx.ellipse(470, 760 - sand * 50, 420, 40 + sand * 60, 0, Math.PI, TAU); ctx.fill();
  // falling sand grains
  ctx.fillStyle = 'rgba(210,170,140,.6)';
  for (let i = 0; i < 160; i++) { const s = hash(i), ph = (t * (.8 + s) + hash(i + 7)) % 1, x = 640 + hash(i + 3) * 160 - ph * 220, y = 560 + ph * ph * 160; ctx.fillRect(x, y, 2, 2); }
  ctx.restore();
  // the sales graph, falling off a cliff
  const gx = 620, gy0 = 140, gw = 390, gh = 220, gk = out3(ss(.6, 3.2, t));
  ctx.save(); ctx.globalAlpha = ss(.2, .8, t);
  ctx.fillStyle = 'rgba(6,6,14,.6)'; ctx.beginPath(); ctx.roundRect(gx - 20, gy0 - 44, gw + 40, gh + 94, 14); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.lineWidth = 1.5; ctx.stroke();
  G.text(ctx, 'US VIDEO GAME SALES', gx, gy0 - 14, { font: 'OptB', size: 15, color: '#f1dcc0', track: 4 });
  const pts = [[1980, 1.1], [1981, 2.4], [1982, 3.0], [1983, 3.2], [1984, .8], [1985, .1]];
  const X = (y) => gx + (y - 1980) / 5 * gw, Y = (v) => gy0 + gh - v / 3.4 * gh;
  ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.lineWidth = 1;
  for (let v = 0; v <= 3; v++) { ctx.beginPath(); ctx.moveTo(gx, Y(v)); ctx.lineTo(gx + gw, Y(v)); ctx.stroke(); G.text(ctx, '$' + v + 'B', gx - 8, Y(v) + 4, { font: 'Opt', size: 11, color: '#cbb', align: 'right', alpha: .7 }); }
  pts.forEach(([y]) => G.text(ctx, "'" + String(y).slice(2), X(y), gy0 + gh + 22, { font: 'OptB', size: 12, color: '#d8c8b8', align: 'center', alpha: .8 }));
  const n = gk * (pts.length - 1), i0 = Math.floor(n);
  ctx.strokeStyle = '#ff4a4a'; ctx.lineWidth = 4; ctx.lineJoin = 'round'; ctx.shadowColor = '#ff2a2a'; ctx.shadowBlur = 14; ctx.beginPath();
  for (let i = 0; i <= Math.min(i0, pts.length - 1); i++) i ? ctx.lineTo(X(pts[i][0]), Y(pts[i][1])) : ctx.moveTo(X(pts[i][0]), Y(pts[i][1]));
  let ex = X(pts[0][0]), ey = Y(pts[0][1]);
  if (i0 < pts.length - 1) { const f = n - i0; ex = lerp(X(pts[i0][0]), X(pts[i0 + 1][0]), f); ey = lerp(Y(pts[i0][1]), Y(pts[i0 + 1][1]), f); ctx.lineTo(ex, ey); } else { ex = X(1985); ey = Y(.1); }
  ctx.stroke(); ctx.shadowBlur = 0;
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ex, ey, 5, 0, TAU); ctx.fill();
  if (gk > .98) G.text(ctx, '\u221297%', X(1985) - 6, Y(1.6), { font: 'Didot', size: 54, color: '#ff5a5a', align: 'right', alpha: ss(3.2, 3.6, t), shadow: 16 });
  ctx.restore();
}

// ================================================================ REVIVAL
// shared falling-block board: returns the grid (rows of 0/colour index) at time T0 for a scripted drop
const SH = { I: [[0, 0], [0, 1], [0, 2], [0, 3]], T: [[0, 0], [1, 0], [2, 0], [1, 1]], L: [[0, 0], [0, 1], [0, 2], [1, 2]], O: [[0, 0], [1, 0], [0, 1], [1, 1]], S: [[1, 0], [2, 0], [0, 1], [1, 1]] };
function board(T0, t0, rows, cols, script) {
  const g = []; for (let r = 0; r < rows; r++) g.push(new Array(cols).fill(0));
  // a settled base: bottom 4 rows full except the well column
  for (let r = rows - 4; r < rows; r++) for (let c = 0; c < cols; c++) if (c !== cols - 1) g[r][c] = 1 + ((r * 3 + c * 7) % 5);
  for (let r = rows - 6; r < rows - 4; r++) for (let c = 0; c < cols; c++) if (hash(r * 13 + c) < .45 && c < cols - 2) g[r][c] = 1 + ((r + c) % 5);
  let active = null, cleared = null;
  for (const s of script) {
    const { shape, col, start, land, row, color } = s, cells = SH[shape];
    if (T0 < start) break;
    if (T0 < land) { const k = (T0 - start) / (land - start), rr = Math.floor(lerp(-3, row, k)); active = { cells, col, row: rr, color }; break; }
    cells.forEach(([dx, dy]) => { if (row + dy >= 0) g[row + dy][col + dx] = color; });
    if (s.clear) {
      const full = []; for (let r = 0; r < rows; r++) if (g[r].every((v) => v)) full.push(r);
      const age = T0 - land;
      if (age < .35) cleared = { rows: full, age };
      else for (const r of full) { g.splice(r, 1); g.unshift(new Array(cols).fill(0)); }
    }
  }
  return { g, active, cleared };
}
function tetrisTerminal(c, x, y, w, h, T0) {
  const t0 = EV.tetris, rows = 20, cols = 10;
  const { g, active, cleared } = board(T0, t0, rows, cols, [
    { shape: 'T', col: 3, start: t0 - 1.2, land: t0 + .9, row: 14, color: 2 },
    { shape: 'I', col: 9, start: t0 + 1.1, land: EV.clear, row: 16, color: 3, clear: true },
    { shape: 'O', col: 4, start: EV.clear + .45, land: EV.clear + 2.6, row: 14, color: 4 },
  ]);
  if (active) active.cells.forEach(([dx, dy]) => { const r = active.row + dy; if (r >= 0 && r < rows) g[r][active.col + dx] = 9; });
  const fs = 17, cw = fs * .6, lh = 18, bx = x + w / 2 - 12 * cw * 1, by = y + 12;
  c.font = `${fs}px Menlo`; c.textBaseline = 'top';
  const green = '#46ff7a';
  c.shadowColor = green; c.shadowBlur = 6;
  for (let r = 0; r < rows; r++) {
    const flash = cleared && cleared.rows.includes(r) && Math.floor(cleared.age * 16) % 2 === 0;
    let s = '<!';
    for (let k = 0; k < cols; k++) s += g[r][k] ? (flash ? '==' : '[]') : ' .';
    s += '!>';
    c.fillStyle = flash ? '#eaffef' : green; c.fillText(s, bx, by + r * lh);
  }
  c.fillStyle = green; c.fillText('<!====================!>', bx, by + rows * lh); c.fillText('  \\/\\/\\/\\/\\/\\/\\/\\/\\/\\/', bx, by + (rows + 1) * lh);
  const lines = T0 > EV.clear + .35 ? 16 : 12;
  c.font = `15px Menlo`;
  [['FULL LINES: ' + lines], ['LEVEL: 3'], ['SCORE: ' + (T0 > EV.clear + .35 ? 2460 : 1260)]].forEach(([s], i) => c.fillText(s, x + 20, y + 40 + i * 24));
  ['7: LEFT   9: RIGHT', '   8: ROTATE', '4: SPEED UP', '5: DROP'].forEach((s, i) => c.fillText(s, x + w - 190, y + 40 + i * 22));
  if (cleared) { c.shadowBlur = 14; c.font = `bold 26px Menlo`; c.fillStyle = '#eaffef'; c.textAlign = 'center'; c.fillText('T E T R I S !', x + w / 2, y + h / 2 - 40); c.textAlign = 'left'; }
  c.shadowBlur = 0;
}
// NES-era side-scroller (140 x 112)
const NW = 140, NH = 112;
const scrollX = (T0) => (T0 - EV.mario + 1) * 34;
const HERO_X = 46;
function nesScreen(p, T0) {
  const sx = scrollX(T0);
  p.fillStyle = '#5c94fc'; p.fillRect(0, 0, NW, NH);
  // hills + clouds (parallax), pipes, blocks, ground
  const hill = (wx, s, col) => { const x = Math.round(wx - sx * .5); for (let yy = 0; yy < 18 * s; yy++) { const hw = Math.sqrt(Math.max(0, 1 - Math.pow(1 - yy / (18 * s), 2))) * 20 * s; p.fillStyle = col; p.fillRect(Math.round(x - hw), 96 - yy, Math.round(hw * 2), 1); } };
  for (let i = -1; i < 6; i++) { const base = Math.floor(sx * .5 / 120) * 120 + i * 120; hill(base + 30, 1.3, '#00a844'); hill(base + 90, .8, '#31c45a'); }
  const cloud = (cx, cy) => { p.fillStyle = '#fff'; p.fillRect(cx - 10, cy, 20, 6); p.fillRect(cx - 6, cy - 4, 12, 4); p.fillRect(cx - 14, cy + 2, 28, 3); };
  for (let i = -1; i < 5; i++) { const base = Math.floor(sx * .3 / 90) * 90 + i * 90; cloud(Math.round(base + 40 - sx * .3), 18 + (i % 2) * 8); }
  // blocks at the bumps, plus decoration bricks
  const bumps = EV.bump.map((tb) => scrollX(tb) + HERO_X + 2);
  const blk = (wx, wy, q, used) => {
    const x = Math.round(wx - sx); if (x < -10 || x > NW) return;
    p.fillStyle = used ? '#9a5a2a' : q ? '#fca044' : '#c84c0c'; p.fillRect(x, wy, 8, 8);
    p.fillStyle = '#000'; p.fillRect(x, wy + 7, 8, 1); p.fillRect(x + 7, wy, 1, 8);
    if (q && !used) { p.fillStyle = '#7a2a00'; p.fillRect(x + 3, wy + 2, 2, 1); p.fillRect(x + 4, wy + 3, 1, 1); p.fillRect(x + 3, wy + 5, 1, 1); }
    else if (!q) { p.fillStyle = '#000'; p.fillRect(x, wy + 3, 8, 1); p.fillRect(x + 3, wy, 1, 3); p.fillRect(x + 5, wy + 4, 1, 3); }
  };
  bumps.forEach((bx, i) => { const up = T0 > EV.bump[i] ? Math.max(0, Math.sin(clamp((T0 - EV.bump[i]) / .18) * Math.PI)) * 3 : 0; blk(bx - 8, 56, 0, false); blk(bx, 56 - up, 1, T0 > EV.bump[i]); blk(bx + 8, 56, 0, false); });
  // pipes
  for (const wx of [bumps[0] + 50, bumps[1] + 60]) { const x = Math.round(wx - sx); p.fillStyle = '#00a800'; p.fillRect(x, 74, 16, 22); p.fillRect(x - 2, 70, 20, 6); p.fillStyle = '#80f080'; p.fillRect(x + 2, 76, 2, 20); p.fillRect(x, 71, 2, 4); p.fillStyle = '#004800'; p.fillRect(x - 2, 75, 20, 1); }
  // ground bricks
  for (let x = -((sx | 0) % 16) - 16; x < NW + 16; x += 16) for (let r = 0; r < 2; r++) { const y = 96 + r * 8, o = r ? 8 : 0; p.fillStyle = '#c84c0c'; p.fillRect(x + o, y, 16, 8); p.fillStyle = '#fcbcb0'; p.fillRect(x + o, y, 16, 1); p.fillStyle = '#000'; p.fillRect(x + o + 15, y, 1, 8); p.fillRect(x + o, y + 7, 16, 1); }
  // coins pop from the bumped blocks
  EV.bump.forEach((tb, i) => { const a = T0 - tb; if (a < 0 || a > .55) return; const x = Math.round(bumps[i] - sx) + 2, y = 48 - Math.sin(a / .55 * Math.PI) * 22; p.fillStyle = '#ffd23f'; p.fillRect(x, y, 4, 7); p.fillStyle = '#fff6b0'; p.fillRect(x + 1, y + 1, 1, 5); });
  // the hero: jumps into each block
  let jy = 0;
  EV.bump.forEach((tb) => { const d = (T0 - tb) / .4; if (d > -1 && d < 1) jy = Math.max(jy, (1 - d * d) * 30); });
  const fr = Math.floor(T0 * 10) % 2;
  R.sprite(p, jy > 1 ? HERO2 : fr ? HERO : HERO2, HERO_X - 4, 85 - jy, HPAL);
  const coins = EV.bump.filter((tb) => T0 > tb).length;
  T.pixText(p, 'SCORE 00' + (4200 + coins * 200), 8, 8, 1, { color: '#fff' }); T.pixText(p, 'COINS ' + String(7 + coins).padStart(2, '0'), 86, 8, 1, { color: '#fff' });
}
// Game Boy screen (80 x 72, 4 shades)
const GB = ['#0f380f', '#306230', '#8bac0f', '#9bbc0f'];
function gbScreen(p, T0) {
  p.fillStyle = GB[3]; p.fillRect(0, 0, 80, 72);
  const rows = 17, cols = 10, t0 = EV.gameboy;
  const { g, active } = board(T0, t0, rows, cols, [
    { shape: 'L', col: 2, start: t0 - .5, land: t0 + 1.6, row: 10, color: 2 },
    { shape: 'S', col: 5, start: t0 + 1.7, land: t0 + 3.4, row: 10, color: 1 },
  ]);
  if (active) active.cells.forEach(([dx, dy]) => { const r = active.row + dy; if (r >= 0 && r < rows) g[r][active.col + dx] = 9; });
  p.fillStyle = GB[0]; p.fillRect(2, 0, 2, 72); p.fillRect(46, 0, 2, 72);
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const v = g[r][c]; if (!v) continue;
    const x = 5 + c * 4, y = 2 + r * 4;
    p.fillStyle = GB[0]; p.fillRect(x, y, 4, 4); p.fillStyle = v === 9 ? GB[2] : GB[1 + (v % 2)]; p.fillRect(x + 1, y + 1, 2, 2);
  }
  p.fillStyle = GB[2]; p.fillRect(50, 2, 28, 22); p.fillRect(50, 28, 28, 14); p.fillRect(50, 48, 28, 22);
  p.fillStyle = GB[0];
  T.pixText(p, 'SCORE', 52, 4, 1, { color: GB[0], gap: 0 }); T.pixText(p, '2460', 52, 14, 1, { color: GB[0], gap: 0 });
  T.pixText(p, 'LV 3', 52, 32, 1, { color: GB[0], gap: 0 });
  SH.O.forEach(([dx, dy]) => { p.fillStyle = GB[0]; p.fillRect(60 + dx * 4, 54 + dy * 4, 4, 4); p.fillStyle = GB[2]; p.fillRect(61 + dx * 4, 55 + dy * 4, 2, 2); });
}
function revival(ctx, t, T0) {
  const which = T0 < EV.mario ? 0 : T0 < EV.gameboy ? 1 : 2;
  // quick in-scene cuts on the card changes: a white pop + a short push
  const since = T0 - [EV.tetris, EV.mario, EV.gameboy][which], pop = 1 - ss(0, .25, since);
  if (which === 0) {
    R.room(ctx, t, { tint: '#46ff7a', ga: .16, seed: 51, desk1: '#1e1a16' });
    ctx.save(); R.cam(ctx, since, 4, 1.0, 1.05, 540, 420);
    R.monitor(ctx, T0, (c, x, y, w, h) => tetrisTerminal(c, x, y, w, h, T0), { c0: '#8f948e', c1: '#5c615c', brand: '\u042d\u041b\u0415\u041a\u0422\u0420\u041e\u041d\u0418\u041a\u0410 60', lc: '#e9efe9', led: '#ffb03a' });
    ctx.restore();
  } else if (which === 1) {
    R.room(ctx, t, { tint: '#7fb2ff', ga: .2, seed: 52 });
    ctx.save(); R.cam(ctx, since, 3.4, 1.0, 1.05, 540, 440);
    R.tv80(ctx, T0, (c, x, y, w, h) => { const L = R.lowres('nes', NW, NH); nesScreen(L.c, T0); R.blit(c, L.cv, x, y, w, h); }, { body: '#33353b', brand: 'COLOR TV' });
    ctx.restore();
  } else {
    R.room(ctx, t, { tint: '#9bbc0f', ga: .14, seed: 53, desk1: '#2a2218' });
    ctx.save(); R.cam(ctx, since, 3.4, 1.0, 1.06, 540, 400);
    ctx.translate(540, 430); ctx.rotate(-.03 + Math.sin(T0 * .8) * .012); ctx.translate(-540, -430);
    R.handheld(ctx, T0, (c, x, y, w, h) => { const L = R.lowres('gb', 80, 72); gbScreen(L.c, T0); R.blit(c, L.cv, x, y, w, h); });
    ctx.restore();
  }
  if (pop > 0 && T0 > EV.tetris + .1) { ctx.fillStyle = `rgba(255,255,255,${.4 * pop})`; ctx.fillRect(0, 0, W, H); }
}

module.exports = { arcade, crash, revival, SH, board, HERO, HERO2, HPAL };
