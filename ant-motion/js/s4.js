// Scenes 7-8: the colony grows into a city; new queens fly and the cycle closes.
const core = require('./core');
const { W, H, TAU, clamp, lerp, ss, io3, out3, out5, back, win, rgba, mix, rng, noise, hash, cues } = core;
const { B, BEAT, BAR, EV } = cues;
const G = require('./gfx');
const T = require('./type');
const ANT = require('./ant');
const BR = require('./brood');
const WD = require('./world');
const S1 = require('./s1');

const SY = 470;
// nest layout in screen space at the wide shot
const CH = {
  queen: { x: 520, y: 1470, rx: 190, ry: 92, at: -1 },
  nursery: { x: 262, y: 1150, rx: 175, ry: 84, at: -1 },
  food: { x: 822, y: 940, rx: 160, ry: 76, at: 1 },
  waste: { x: 866, y: 1352, rx: 122, ry: 62, at: 2 },
  pupae: { x: 250, y: 742, rx: 150, ry: 70, at: 3 },
};
const TUN = [
  { pts: [[560, SY], [548, 600], [575, 760], [540, 900], [520, 1060], [540, 1220], [525, 1400]], at: -1, n: 7, v: 70 },
  { pts: [[540, 900], [440, 940], [330, 1000], [280, 1080]], at: -1, n: 3, v: 55 },
  { pts: [[548, 690], [650, 730], [760, 800], [812, 880]], at: 1, n: 3, v: 60 },
  { pts: [[540, 1220], [650, 1262], [760, 1300], [836, 1310]], at: 2, n: 2, v: 50 },
  { pts: [[575, 760], [460, 724], [350, 706], [282, 722]], at: 3, n: 3, v: 55 },
];
const POP = [12, 150, 1200, 4000, 10000];
const popT = EV.pop.map((t) => t - B(25));
// shown count rolls up toward the next key over each year
function shownPop(lt) {
  let n = POP[0], yr = 1, idx = 0;
  for (let i = 0; i < popT.length; i++) if (lt >= popT[i]) { idx = i; }
  const k = io3(ss(popT[idx], popT[idx] + 1.2, lt));
  n = idx === 0 ? POP[0] : lerp(POP[idx - 1], POP[idx], k);
  if (lt < popT[0]) n = lerp(1, 12, ss(.4, popT[0], lt));
  yr = idx + 1;
  return { n: Math.round(n), yr, idx };
}

// heading-aware placement of a walker on a path
function walker(ctx, pts, u, s, t, o = {}) {
  const [x, y, a0] = S1.along(pts, u);
  const a = o.back ? a0 + Math.PI : a0, right = Math.cos(a) >= 0;
  ANT.draw(ctx, x, y + (o.dy ?? 6) * s, s, { caste: 'worker', flip: !right, rot: right ? a : a - Math.PI, phase: t * (o.pace ?? 2.4) + (o.ph ?? 0), ant: t * .7 + (o.ph ?? 0), lod: o.lod ?? 1, callow: o.callow ?? 0 });
  return [x, y];
}

function camera(lt) {
  const K = [
    [0, 2.6, 520, 1500, 540, 1080], [.6, 2.6, 520, 1500, 540, 1080], [3.2, 1, 540, 960, 540, 960],
    [5.0, 1, 540, 960, 540, 960], [6.0, 1.75, 720, 480, 540, 860], [8.0, 1.75, 720, 480, 540, 860], [9.0, 1, 540, 960, 540, 960],
  ];
  let i = 0; while (i < K.length - 1 && lt > K[i + 1][0]) i++;
  if (i >= K.length - 1) return K[K.length - 1].slice(1);
  const a = K[i], b = K[i + 1], k = io3(clamp((lt - a[0]) / (b[0] - a[0])));
  return a.slice(1).map((v, j) => lerp(v, b[j + 1], k));
}

function food(ctx, x, y, s) {
  // a fallen seed head + crumbs, the foragers' prize
  ctx.save(); ctx.translate(x, y);
  G.ellipseGlow(ctx, 0, 4, 70 * s, 10 * s, '#000', .5);
  for (let i = 0; i < 7; i++) { const a = -.4 + i * .14, r = 1; ctx.save(); ctx.rotate(a); ctx.beginPath(); ctx.ellipse(30 * s, -18 * s, 26 * s, 13 * s, 0, 0, TAU); const g = ctx.createLinearGradient(0, -34 * s, 0, 0); g.addColorStop(0, '#f2d08a'); g.addColorStop(1, '#a6743a'); ctx.fillStyle = g; ctx.fill(); ctx.restore(); }
  ctx.restore();
}

function contents(ctx, lt, vis) {
  const q = CH.queen;
  // queen + egg pile + attendants
  ANT.draw(ctx, q.x + 30, q.y + q.ry * .78, .58, { caste: 'queen', flip: true, ant: lt * .4, gaster: 1.15, lod: 2 });
  const R = rng(4);
  for (let i = 0; i < 14; i++) BR.egg(ctx, q.x - 110 + R() * 70, q.y + q.ry * .62 + R() * 18, 7);
  ANT.draw(ctx, q.x - 40, q.y + q.ry * .8, .4, { caste: 'worker', ant: lt + 1, head: .2 + .2 * Math.sin(lt * 3), lod: 1 });
  ANT.draw(ctx, q.x + 150, q.y + q.ry * .7, .38, { caste: 'worker', flip: true, ant: lt + 2, lod: 1 });
  // nursery: eggs, larvae of all sizes, a nurse
  const n = CH.nursery, R2 = rng(6);
  for (let i = 0; i < 6; i++) BR.larva(ctx, n.x - 120 + i * 40, n.y + n.ry * .62 - (i % 2) * 14, .26 + R2() * .14, { t: lt + i, lod: 1, ang: R2() - .5 });
  for (let i = 0; i < 8; i++) BR.egg(ctx, n.x + 90 + R2() * 40, n.y + n.ry * .66 + R2() * 12, 6);
  ANT.draw(ctx, n.x + 10, n.y + n.ry * .82, .38, { caste: 'worker', ant: lt + 3, head: .3, lod: 1 });
  // food store
  if (vis[1] > 0) {
    ctx.save(); ctx.globalAlpha *= vis[1];
    const f = CH.food, R3 = rng(8);
    for (let i = 0; i < 26; i++) { const x = f.x - 120 + R3() * 240, y = f.y + f.ry * (.5 + R3() * .35), r = 6 + R3() * 6; ctx.fillStyle = rgba(mix('#b88a4a', '#f0cf8c', R3()), 1); ctx.beginPath(); ctx.ellipse(x, y, r, r * .6, R3() * 3, 0, TAU); ctx.fill(); }
    ctx.restore();
  }
  if (vis[2] > 0) {
    ctx.save(); ctx.globalAlpha *= vis[2];
    const w = CH.waste, R4 = rng(9);
    for (let i = 0; i < 40; i++) { const x = w.x - 90 + R4() * 180, y = w.y + w.ry * (.45 + R4() * .4), r = 2 + R4() * 5; ctx.fillStyle = rgba(mix('#1a120c', '#4a3626', R4()), 1); ctx.beginPath(); ctx.ellipse(x, y, r, r * .7, 0, 0, TAU); ctx.fill(); }
    ctx.restore();
  }
  if (vis[3] > 0) {
    ctx.save(); ctx.globalAlpha *= vis[3];
    const p = CH.pupae;
    for (let i = 0; i < 5; i++) BR.cocoon(ctx, p.x - 90 + i * 44, p.y + p.ry * .6 - (i % 2) * 10, .32, { spin: 1, mec: 1, ang: (i - 2) * .12 });
    ctx.restore();
  }
}

// ------------------------------------------------------------------ COLONY
function colony(ctx, lt) {
  const P = shownPop(lt);
  const vis = [1, ss(1.8, 2.6, lt), ss(3.4, 4.1, lt), ss(popT[2] - .4, popT[2] + .5, lt)];
  const [z, fx, fy, cx, cy] = camera(lt);
  const S = (x, y) => [cx + (x - fx) * z, cy + (y - fy) * z];
  ctx.save();
  ctx.translate(cx, cy); ctx.scale(z, z); ctx.translate(-fx, -fy);
  WD.sky(ctx, SY, lt, { sunX: 820, sunH: 260 });
  WD.soil(ctx, SY, { dim: .15 });
  WD.ground(ctx, SY, { seed: 4 });
  // tunnels + chambers grow in as the colony grows
  for (const tn of TUN) { const a = tn.at < 0 ? 1 : vis[tn.at]; if (a <= 0) continue; ctx.save(); ctx.globalAlpha *= a; WD.tunnel(ctx, tn.pts, 34, { light: .55 }); ctx.restore(); }
  for (const [k, c] of Object.entries(CH)) { const a = c.at < 0 ? 1 : vis[c.at]; if (a <= 0) continue; ctx.save(); ctx.globalAlpha *= a; WD.chamber(ctx, c.x, c.y, c.rx * (.7 + .3 * a), c.ry * (.7 + .3 * a), { light: .9, seed: k.length * 7 }); ctx.restore(); }
  contents(ctx, lt, vis);
  // traffic: more ants on more tunnels as the population climbs
  const busy = .45 + .55 * ss(0, 4, P.idx + ss(popT[P.idx], popT[P.idx] + 1, lt));
  TUN.forEach((tn, ti) => {
    const a = tn.at < 0 ? 1 : vis[tn.at]; if (a <= 0) return;
    const len = S1.along(tn.pts, 1)[3], n = Math.max(1, Math.round(tn.n * busy * 1.6));
    for (let i = 0; i < n; i++) {
      const dir = i % 2 ? 1 : -1, u0 = hash(ti * 31 + i), u = ((u0 + dir * lt * tn.v / len) % 1 + 1) % 1;
      ctx.save(); ctx.globalAlpha *= a; walker(ctx, tn.pts, u, .3, lt, { back: dir < 0, ph: u0 * 9, dy: 9 }); ctx.restore();
    }
  });
  // surface: pheromone trail to food, foragers both ways
  const FX = 930, trail = [[560, SY], [640, SY - 2], [720, SY + 1], [800, SY - 1], [FX - 50, SY]];
  const tk = ss(5.3, 6.6, lt), ta = ss(5.2, 5.6, lt);
  if (lt > 4.8) {
    food(ctx, FX, SY, .7);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 40; i++) {
      const u = i / 39; if (u > tk) break;
      const [x, y] = S1.along(trail, u), pul = .5 + .5 * Math.sin(lt * 6 - u * 14);
      ctx.fillStyle = rgba(T.TEAL, (.35 + .45 * pul) * ta); ctx.beginPath(); ctx.arc(x, y + 3, 2.6, 0, TAU); ctx.fill();
      G.glow(ctx, x, y + 3, 14, T.TEAL, .12 * pul * ta);
    }
    ctx.restore();
    // the scout lays the trail, then a stream follows it
    if (tk < 1) walker(ctx, trail, tk, .36, lt, { lod: 2, back: true, dy: 0, pace: 3.4 });
    const nF = Math.round(lerp(0, 7, ss(6.2, 7.6, lt)));
    for (let i = 0; i < nF; i++) { const dir = i % 2 ? 1 : -1, u = ((hash(i + 70) + dir * (lt - 6) * .16) % 1 + 1) % 1; walker(ctx, trail, u, .34, lt, { lod: 2, back: dir < 0, ph: i * 2, dy: 0, pace: 3 }); }
  }
  WD.meadow(ctx, SY + 6, lt, { n: 26, h: 90, seed: 14 });
  // builders carry pellets in the upper tunnel during the roles beat
  ctx.restore();

  // ------------- labels
  const lab = (k, title, sub, d, t0, lx, ly, side) => { const c = CH[k], [x, y] = S(c.x, c.y); T.tag(ctx, lt - t0, d, x, y, lx, ly, title, sub, { side, size: 30, subSize: 20 }); };
  if (lt < 5.2) {
    lab('queen', 'QUEEN', 'only lays eggs, for years', 2.0, 3.1, 90, 1390, 1);
    lab('nursery', 'NURSERY', 'eggs · larvae · pupae', 1.9, 3.2, 120, 960, 1);
    lab('food', 'FOOD STORE', 'seeds · insects', 1.6, 3.5, 1000, 720, -1);
    lab('waste', 'WASTE', 'kept apart from the brood', 1.1, 4.0, 1000, 1200, -1);
  }
  const [tx, ty] = S(720, SY);
  T.tag(ctx, lt - 5.9, 2.1, tx, ty, 520, 1220, 'PHEROMONE TRAIL', 'a scent path the others follow', { color: T.TEAL, side: 1 });
  // roles by age
  if (lt > 8.6 && lt < 11.4) {
    const [nx, ny] = S(CH.nursery.x + 10, CH.nursery.y + 40), [bx, by] = S(460, 724), [fx2, fy2] = S(700, SY - 10);
    T.tag(ctx, lt - 8.8, 2.6, nx, ny, 140, 1300, 'NURSE', 'young · stays deep', { side: 1, size: 30, subSize: 20 });
    T.tag(ctx, lt - 9.2, 2.2, bx, by, 380, 560, 'BUILDER · GUARD', 'middle-aged', { side: 1, size: 30, subSize: 20 });
    T.tag(ctx, lt - 9.6, 1.8, fx2, fy2, 1000, 620, 'FORAGER', 'oldest · works outside', { side: -1, size: 30, subSize: 20 });
    // age strip
    const a = win(8.7, 9.1, 11, 11.4, lt), k = out3(ss(8.8, 10, lt));
    ctx.save(); ctx.globalAlpha *= a;
    ctx.fillStyle = 'rgba(8,5,3,.6)'; ctx.fillRect(0, 1760, W, 96);
    T.arrow(ctx, 170, 1808, lerp(170, 910, k), 1808, 1, T.AMBER, { w: 3 });
    G.text(ctx, 'YOUNG', 80, 1816, { font: 'Mono', size: 22, color: T.CREAM, align: 'left', track: 3 });
    G.text(ctx, 'OLD', 1000, 1816, { font: 'Mono', size: 22, color: T.CREAM, align: 'right', track: 3 });
    ctx.restore();
  }
  // captions
  T.caption(ctx, lt - .3, 2.7, 1640, ['The first workers take over.', 'The queen now *only lays eggs*.'], { size: 50 });
  T.caption(ctx, lt - 3.1, 2.0, 1640, ['The nest grows into', 'an *underground city*.'], { size: 52 });
  T.caption(ctx, lt - 5.3, 2.9, 1640, ['Scouts lay *scent trails*', 'so others can find food.'], { size: 52 });
  T.caption(ctx, lt - 8.4, 2.9, 1640, ['Jobs change with age: *nurse*,', 'then *builder*, then *forager*.'], { size: 50 });
  T.caption(ctx, lt - 11.4, 1.9, 1640, ['In a few years: *thousands* of ants.', '(millions in some species)'], { size: 50 });
  // population counter
  const pa = ss(.3, .8, lt);
  if (pa > 0) {
    ctx.save(); ctx.globalAlpha *= pa;
    const bg = ctx.createLinearGradient(0, 60, 0, 380); bg.addColorStop(0, 'rgba(8,5,3,.55)'); bg.addColorStop(1, 'rgba(8,5,3,0)');
    ctx.fillStyle = bg; ctx.fillRect(0, 60, W, 320);
    G.text(ctx, `COLONY  ·  YEAR ${P.yr}`, 540, 150, { font: 'Mono', size: 24, color: T.AMBER, align: 'center', track: 6 });
    const num = P.n >= 10000 ? '10,000+' : P.n.toLocaleString('en-US');
    G.text(ctx, num, 540, 290, { font: 'CondH', size: 136, color: T.CREAM, align: 'center', shadow: 24 });
    G.text(ctx, P.n <= 1 ? 'QUEEN' : 'WORKERS', 540, 336, { font: 'CondD', size: 30, color: T.CREAM, align: 'center', track: 10, alpha: .8 });
    // pips for years
    for (let i = 0; i < 5; i++) { ctx.fillStyle = i < P.yr ? T.AMBER : 'rgba(255,240,220,.25)'; ctx.fillRect(540 - 110 + i * 46, 176, 36, 5); }
    ctx.restore();
  }
}

// ------------------------------------------------------------------ CYCLE
const R5 = rng(77);
const ALATES = Array.from({ length: 34 }, (_, i) => {
  const q = R5() < .4, side = R5() < .5 ? -1 : 1;
  return { q, te: .05 + Math.pow(R5(), .9) * 2.6, vx: side * (60 + R5() * 220), vy: 140 + R5() * 170, z: .42 + R5() * .55, ph: R5() * 10, wob: R5() * TAU, hx: side * (50 + R5() * 140) };
});
const RING = [
  { k: 'EGG', d: '1–2 weeks', a: -90 },
  { k: 'LARVA', d: '1–3 weeks', a: -18 },
  { k: 'PUPA', d: '2–3 weeks', a: 54 },
  { k: 'ADULT', d: 'worker or queen', a: 126 },
  { k: 'FLIGHT', d: 'a new colony', a: 198 },
];
function icon(ctx, i, x, y, t) {
  if (i === 0) BR.egg(ctx, x, y, 26, { ang: -.3, glow: .4 });
  if (i === 1) BR.larva(ctx, x - 2, y + 6, .52, { t, lod: 1, fed: .7 });
  if (i === 2) BR.cocoon(ctx, x, y, .5, { spin: 1, mec: 1, ang: -.2 });
  if (i === 3) ANT.draw(ctx, x + 6, y + 18, .32, { caste: 'worker', ant: t, lod: 2 });
  if (i === 4) ANT.draw(ctx, x + 4, y + 18, .3, { caste: 'queen', wings: 1, spread: 1, flap: t * 20, ant: t, lod: 2 });
}
function cycle(ctx, lt) {
  const HX = 540, HY = 1280;
  WD.sky(ctx, HY, lt + 40, { dusk: .55, sunX: 300, sunH: 70 });
  WD.soil(ctx, HY, { dim: .2 });
  WD.ground(ctx, HY, { seed: 11 });
  S1.mound(ctx, HX, HY);
  const list = ALATES.map((f) => [f, S1.flyer(f, lt)]).filter(([, p]) => p).sort((a, b) => a[0].z - b[0].z);
  for (const [f, p] of list) {
    const sx = HX + p.x * (p.walk ? 1 : .6 + f.z), sy = HY + (p.walk ? p.y + 52 * Math.pow(Math.abs(p.x) / 260, 1.4) : p.y * (.7 + f.z * .6));
    if (sy < -80 || sy > H + 80) continue;
    S1.drawFlyer(ctx, f, p, sx, sy, lt, f.z > .5 ? 2 : 1);
  }
  WD.meadow(ctx, HY + 10, lt, { n: 40, h: 200, seed: 21 });
  T.heading(ctx, lt - .15, 2.5, 80, 560, 'FULL CIRCLE', 'AGAIN', 'new queens leave to start their own');
  T.caption(ctx, lt - .25, 2.5, 1640, ['Years later, the colony raises', '*new winged queens* and males…'], { size: 50 });

  // ring diagram
  const rT = EV.ring - B(30), ra = ss(rT - .3, rT + .3, lt);
  if (ra > 0) {
    ctx.save(); ctx.globalAlpha *= ra;
    const bg = ctx.createRadialGradient(540, 900, 100, 540, 900, 1200); bg.addColorStop(0, 'rgba(22,12,8,.93)'); bg.addColorStop(1, 'rgba(6,3,2,.97)');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    const cx = 540, cy = 880, R = 300;
    // faint guide ring + growing arc
    ctx.strokeStyle = 'rgba(255,220,180,.1)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke();
    const ak = io3(ss(rT, rT + 2.6, lt)), a0 = -Math.PI / 2;
    ctx.strokeStyle = T.AMBER; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(cx, cy, R, a0, a0 + TAU * ak); ctx.stroke();
    const ah = a0 + TAU * ak; G.glow(ctx, cx + Math.cos(ah) * R, cy + Math.sin(ah) * R, 40, T.AMBER, .6 * (ak < 1 ? 1 : 0));
    RING.forEach((n, i) => {
      const ang = n.a * Math.PI / 180, nx = cx + Math.cos(ang) * R, ny = cy + Math.sin(ang) * R;
      const k = back(ss(rT + i * .5, rT + i * .5 + .45, lt));
      if (k <= 0) return;
      // arrowheads mid-arc
      const am = ang + (TAU / 5) / 2, mx = cx + Math.cos(am) * R, my = cy + Math.sin(am) * R;
      if (ak * TAU > (am - a0 + TAU) % TAU) { ctx.save(); ctx.translate(mx, my); ctx.rotate(am + Math.PI / 2); ctx.fillStyle = T.AMBER; ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(-8, -9); ctx.lineTo(-8, 9); ctx.closePath(); ctx.fill(); ctx.restore(); }
      ctx.save(); ctx.translate(nx, ny); ctx.scale(k, k);
      ctx.fillStyle = '#1e120a'; ctx.beginPath(); ctx.arc(0, 0, 78, 0, TAU); ctx.fill();
      ctx.strokeStyle = i === 4 ? T.TEAL : T.AMBER; ctx.lineWidth = 3; ctx.stroke();
      icon(ctx, i, 0, 0, lt);
      ctx.restore();
      const lo = 130, lx = cx + Math.cos(ang) * (R + lo), ly = cy + Math.sin(ang) * (R + lo * .78) + 10;
      const al = Math.cos(ang) > .3 ? 'left' : Math.cos(ang) < -.3 ? 'right' : 'center';
      const ox = al === 'left' ? -40 : al === 'right' ? 40 : 0;
      G.text(ctx, n.k, lx + ox, ly, { font: 'CondH', size: 46, color: i === 4 ? T.TEAL : T.CREAM, align: al, track: 4, alpha: ss(0, .6, k) });
      G.text(ctx, n.d, lx + ox, ly + 34, { font: 'Mono', size: 21, color: T.AMBER, align: al, track: 1, alpha: ss(0, .6, k) });
    });
    const ck = ss(rT + 2.4, rT + 3.0, lt);
    G.text(ctx, '6–10', cx, cy + 22, { font: 'CondH', size: 128, color: T.CREAM, align: 'center', alpha: ck, shadow: 20 });
    G.text(ctx, 'WEEKS · EGG TO ADULT', cx, cy + 70, { font: 'Mono', size: 20, color: T.AMBER, align: 'center', track: 3, alpha: ck });
    // lifespans
    const lT = rT + 2.6, rows = [['QUEEN', 'up to 28 years', 1, T.AMBER], ['WORKER', 'months to a few years', .22, T.CREAM], ['MALE', 'a few weeks', .05, '#9fb0c0']];
    rows.forEach(([nm, txt, f, col], i) => {
      const k = out3(ss(lT + i * .25, lT + i * .25 + 1.1, lt)), y = 1370 + i * 76;
      if (k <= 0) return;
      G.text(ctx, nm, 90, y, { font: 'CondB', size: 34, color: T.CREAM, align: 'left', track: 3, alpha: k });
      ctx.fillStyle = 'rgba(255,240,220,.1)'; ctx.fillRect(280, y - 22, 700, 14);
      ctx.fillStyle = col; ctx.fillRect(280, y - 22, Math.max(6, 700 * f * k), 14);
      G.text(ctx, txt, 280, y + 22, { font: 'Mono', size: 19, color: T.AMBER, align: 'left', alpha: ss(.5, 1, k) });
    });
    G.text(ctx, 'LIFESPAN', 90, 1300, { font: 'Mono', size: 20, color: T.AMBER, align: 'left', track: 6, alpha: ss(lT, lT + .4, lt) });
    ctx.restore();
    T.caption(ctx, lt - rT - .2, 2.4, 1680, ['…and the cycle *begins again*.'], { size: 54 });
    T.caption(ctx, lt - lT - .4, 2.2, 1680, ['A queen can live for *decades*.'], { size: 54 });
  }
  // end card
  const eT = EV.end - B(30), ea = ss(eT, eT + .5, lt);
  if (ea > 0) {
    ctx.save(); ctx.globalAlpha *= ea; ctx.fillStyle = '#070403'; ctx.fillRect(0, 0, W, H); ctx.restore();
    G.motes(ctx, lt, 40, { color: '#ffd8a0', seed: 5, a: .25 * ea, drift: [3, -8] });
    S1.title(ctx, lt - eT - .1, ea);
    G.text(ctx, 'one queen  ·  one egg  ·  one city', 540, 1010, { font: 'CondMI', size: 44, color: T.AMBER, align: 'center', track: 2, alpha: ss(eT + 1.0, eT + 1.6, lt) });
  }
}

module.exports = { colony, cycle };
