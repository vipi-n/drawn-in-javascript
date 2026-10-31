// Act I: night pond + title (S1), the call in over-under at dawn (S2), amplexus + egg laying underwater (S3).
const { W, H, TAU, clamp, lerp, hash, rgba, mix, ss, io3, out3, in3, spring, noise } = require('./core');
const G = require('./gfx');
const Cm = require('./cam');
const Wt = require('./water');
const Wd = require('./world');
const Sk = require('./sky');
const Fl = require('./flora');
const Fr = require('./frog');
const An = require('./anim');
const Sp = require('./spawn');
const T = require('./type');
const AN = require('./anchors');
const L = require('./life');
const MG = require('./mg');
const { SHOT, EV } = require('./cues');

const NIGHT = { top: '#33402f', side: '#434a38', belly: '#80847a', dark: '#141810', spot: '#1c2016', mask: '#1d1a14', line: '#0b0d09', fold: '#8a967e', eye: '#e8b24a', leg: '#3a4232', throat: '#a2a89c' };
const DAWN = { top: '#7a8a40', side: '#a39552', belly: '#f0dcae', line: '#2a2210', leg: '#8a8444' };

// draws a frog into a layer so it can be split at a waterline and mirrored
function frogLayer(name, o) { const L = G.buf(name, W, H); Fr.frog(L.g, o); return L; }

// ---------------------------------------------------------------- S1: night chorus + title
function s1(g, e, t) {
  const cam = Cm.rig([[0, -540, -60, 1.04], [3.5, -330, -24, 1.22], [6.6, -210, -6, 1.3], [9.5, 40, 0, 1.18], [12, 90, 150, 1.32]], e, { hand: .6, seed: 11 });
  const hy = 452 - cam.y * .4;
  Wd.aboveSet(g, cam, t, {
    sky: 'night', hy, wy: H + 600, stars: 1, moon: [800 - cam.x * .08, 180 - cam.y * .08, 30],
    trees: ['#0e1828', '#08101a'], reedSil: '#05090f', mist: .22, mistCol: '#7d93b8', waterDeep: '#040a14', glint: '#b8ccff',
  });
  Wd.glitter(g, 800 - cam.x * .1, hy + 12, H, t, .85, '#dfe8ff');
  // bats hunting across the moon, fireflies over the reeds (reflected in the water)
  for (const [t0, t1, x0, x1, y0, s0] of [[1.4, 6.6, 1180, -140, 205, .8], [8.2, 11.6, -120, 1200, 120, .55]]) {
    if (e < t0 || e > t1) continue;
    const u = (e - t0) / (t1 - t0);
    L.bat(g, lerp(x0, x1, u) - cam.x * .1, y0 - cam.y * .08 + Math.sin(e * 2.6) * 34 + Math.sin(e * 7.1) * 8, s0, t);
  }
  L.fireflies(g, cam, t, { n: 44, y0: 90, y1: hy + 40, water: hy + 10, size: 1.6, a: 1.3 });
  // the frog surfaces, calls twice
  const [sx, sy] = Cm.toScreen(cam, -330, 110, 1), s = 1.6 * cam.z;
  const rise = out3(ss(EV.eyes, EV.eyes + 1.3, e)), wlL = lerp(-70, -27, rise);
  const k = An.sac(e, EV.croak0, { h: .3 });
  if (e > EV.eyes - .1) {
    const fo = { x: sx, y: sy - wlL * s, s, pose: { float: 1 }, pitch: -.2 + Math.sin(t * .9) * .015, pal: NIGHT, rim: '#a8c4ff', blink: An.blink(e, 5, 3.6), wet: 1.4, t, throat: An.throat(t) * .4, drops: .9 * rise, glint: rise, pupil: 1.3 };
    const L = frogLayer('s1frog', fo);
    g.save(); g.beginPath(); g.rect(0, 0, W, sy + 1); g.clip(); g.drawImage(L.cv, 0, 0); g.restore();
    g.save(); g.beginPath(); g.rect(0, sy, W, H); g.clip(); g.globalAlpha = .07; g.drawImage(L.cv, 0, 0); g.restore();
    Wt.reflect(g, L.cv, sy + 1, t, { a: .32, amp: 2.5, depth: 140 });
    // eye shine in the dark
    const eye = Fr.toWorld(fo, 66, -24);
    G.glow(g, eye[0], eye[1], 26 * s, '#ffd27a', .25 * rise, 'screen');
    // vocal sacs bulge at the surface beside the jaw
    if (k > .01) {
      const jaw = Fr.toWorld(fo, 60, 14);
      for (const [dx, a] of [[10, .9]]) {
        const cx = jaw[0] + dx * s, rx = (7 + 12 * k) * s, ry = (4 + 9 * k) * s;
        g.save(); g.globalAlpha = a;
        g.fillStyle = G.rad(g, cx - rx * .3, sy - ry * .4, rx * 1.3, [[0, '#e8f0ff', .9], [.6, '#a8b8cc', .75], [1, '#4a5a70', .7]]);
        g.beginPath(); g.ellipse(cx, sy + ry * .15, rx, ry, 0, Math.PI, TAU); g.fill();
        g.strokeStyle = '#0b0d09'; g.lineWidth = 2; g.stroke();
        g.restore();
      }
    }
    Wt.ripple(g, sx + 20 * s, sy + 2, e - EV.eyes, { speed: 120, life: 2.6, rings: 3, flat: .22, a: .5 });
    for (const c of EV.croak0) Wt.ripple(g, sx + 50 * s, sy + 2, e - c, { speed: 160, life: 2.2, rings: 4, flat: .22, a: .45, hi: '#dfe8ff' });
    const jw = Fr.toWorld(fo, 70, 10);
    MG.soundWaves(g, jw[0], sy - 6, e, EV.croak0, { ang: -.55, spread: .75, R: 190, col: '#e4ecff' });
  }
  // fireflies of pollen / night motes
  Wt.motes(g, cam, t, { col: '#c8d8ff', a: .35, sets: [{ n: 40, p: .6, r: [1, 2], a: .4, seed: 7 }] });
  // near reeds sliding past the lens
  G.layer(g, 's1near', (b) => {
    Cm.push(b, cam, 1.7);
    Fl.cattail(b, -857, 900, 1100, t, { sil: '#03060b', leaves: 4 });
    Fl.cattail(b, 300, 980, 1250, t, { sil: '#03060b', leaves: 3 });
    b.restore();
  }, { k: 3, blur: 6 });
  // title
  if (e > EV.title - .1) {
    const te = e - EV.title, sink = ss(10.2, 11.4, e);
    T.title(g, te, 800, t, { size: 214, gap: 24, sink, fade: 1 - ss(11.2, 11.8, e) });
    const a = ss(.9, 1.6, te) * (1 - ss(10.1, 10.8, e));
    if (a > 0) {
      T.shadowOn(g, .6, 14);
      G.text(g, 'THE LIFE CYCLE OF THE', W / 2, 604, { font: 'SvM', size: 24, track: .34, color: '#e9f0ff', align: 'center', per: (i) => ({ a: a * ss(.9 + i * .025, 1.3 + i * .025, te), dy: (1 - out3(clamp((te - .9 - i * .025) / .5))) * 10 }) });
      T.shadowOff(g);
    }
  }
}

// ---------------------------------------------------------------- S2: the call (over-under, dawn)
function s2(g, e, t) {
  const cam = Cm.rig([[0, -60, 0, 1.0], [3, -20, 0, 1.06], [6, 30, 20, 1.18]], e, { hand: .5, seed: 21 });
  cam.z *= 1 + Cm.pulse(t, SHOT.call, EV.grab - .3);
  const wy = 452 + Math.sin(t * 1.25) * 7 + Math.sin(t * 2.3) * 3;
  const hy = wy - 92;
  const hero = { x: Cm.toScreen(cam, 130, 0, 1)[0], y: wy + 4 * 1.25 * cam.z, s: 1.25 * cam.z, pose: { float: 1 }, pitch: -.06 + Math.sin(t * 1.25 + .5) * .02, pal: DAWN, rim: '#ffd9b8', male: 1, wet: 1.3, t, drops: .8, glint: .7, breath: An.breath(t, 2) };
  hero.sac = An.sac(t, EV.calls, { h: .16, r: .16 });
  hero.blink = An.blink(t, 9);
  // female approaches from the lower left with breast strokes
  const fs = An.stroke(t - SHOT.call, 1.1, .3);
  const fx = Cm.toScreen(cam, -620 + Math.min(600, fs.dist * 230), 0, 1)[0], fyy = lerp(wy + 380, wy + 170, ss(SHOT.call + .5, SHOT.call + 5.4, t));
  const fem = { x: fx, y: fyy, s: 1.35 * cam.z, pose: An.swimPose(fs.ext), pitch: -.12, plump: 1, wet: .6, t, alpha: ss(SHOT.call + .6, SHOT.call + 1.6, t) };
  const grab = ss(EV.grab - .3, EV.grab + .4, t);
  if (grab > 0) { hero.y += grab * 90 * cam.z; hero.pose = { float: 1 - grab, hang: grab }; hero.pitch += grab * .3; }
  Wd.overUnder(g, wy, t, (a) => {
    Wd.aboveSet(a, cam, t, {
      sky: 'dawn', hy, wy, sun: [760 - cam.x * .1, hy - 40, 24, .95], clouds: 1, cloudCol: '#ffe6d6', cloudShadow: '#7a5a7a',
      trees: ['#6b5a7a', '#463e58'], mist: .6, mistCol: '#ffd8cc', waterDeep: '#3a4a62', glint: '#ffe2c8', reedSil: '#34402f',
    });
    // dawn life: gnats glittering in the low sun, a damselfly patrolling the reeds, striders + whirligigs on the water
    const sunX = 760 - cam.x * .1;
    L.gnats(a, sunX - 140, hy - 96, t, { n: 30, r: 74, col: '#ffe4b8', a: .75 });
    { const [dx, dy, df] = L.hover(t, 330 - cam.x * .45, hy - 78, 80, 3); L.damselfly(a, dx, dy, .85, t, { flip: df, c: '#4aa8e8' }); }
    { const [dx, dy, df] = L.hover(t + 3, 930 - cam.x * .3, hy - 40, 50, 8); L.damselfly(a, dx, dy, .42, t, { flip: df, c: '#5aa0c0', alpha: .8 }); }
    L.striders(a, 40, 600, hy + 58, t, { n: 2, s: .5, flat: .22, dy: 24 });
    L.whirligigs(a, Cm.toScreen(cam, -300, 0, 1)[0], wy - 10, t, { n: 4, s: .9, flat: .22 });
    // distant males calling in turn on the far water
    const far = [[140, hy + 26, .26, .3], [330, hy + 40, .34, 1.5], [880, hy + 30, .3, .9], [980, hy + 56, .42, 2.1]];
    for (const [x, y, s0, ph] of far) {
      const calls = EV.calls.map((c) => c + .3 + (ph % 1) * .3);
      const fo = { x: x - cam.x * .3, y: y + 6 * s0, s: s0, pose: { float: 1 }, pal: DAWN, sac: An.sac(t, calls, { h: .14, r: .14 }), wet: 1, t, noLegs: true };
      a.save(); a.beginPath(); a.rect(0, 0, W, y); a.clip(); Fr.frog(a, fo); a.restore();
      if (fo.sac > .01) { a.fillStyle = rgba('#fff6ea', .9); a.beginPath(); a.ellipse(x - cam.x * .3 + 60 * s0, y, (12 + 20 * fo.sac) * s0, (8 + 16 * fo.sac) * s0, 0, Math.PI, TAU); a.fill(); }
      Wt.ripple(a, x - cam.x * .3 + 30 * s0, y + 1, ((t - ph) % 1.2), { speed: 40, life: 1.2, rings: 2, flat: .2, a: .35 });
    }
    Fr.frog(a, hero);
    for (const c of EV.calls) Wt.ripple(a, hero.x + 50 * hero.s, wy + 1, t - c, { speed: 150, life: 1.6, rings: 3, flat: .18, a: .55 });
    { const sp = Fr.toWorld(hero, 70, 12); MG.soundWaves(a, sp[0], sp[1] - 4, t, EV.calls, { ang: -.7, spread: .7, R: 170, life: .75 }); }
    for (const [x, y, s0, ph] of far) MG.soundWaves(a, x - cam.x * .3 + 60 * s0, y - 4, t, EV.calls.map((c) => c + .3 + (ph % 1) * .3), { ang: -1.2, spread: .6, R: 50, r0: 6, w: 1.2, a: .5, n: 2, life: .6 });
  }, (b) => {
    Wd.underSet(b, cam, t, { look: 'dawn', surf: wy - 540 + cam.y, floor: 560, seed: 2, sun: 760 });
    L.plankton(b, cam, t, { k: .8, col: '#f0d0a8' });
    Fr.frog(b, fem);
    Fr.frog(b, hero);
    Wd.underFront(b, cam, t, { look: 'dawn', n: 2, xs: [-760, 900] });
    b.fillStyle = G.lin(b, 0, wy, 0, H, [[0, '#6aa8a0', .12], [1, '#0b2531', .3]]); b.fillRect(0, wy - 20, W, H);
  });
  // splash when he lunges
  if (Math.abs(t - EV.grab) < 1.2) Wt.ripple(g, hero.x, wy + 2, t - EV.grab + .1, { speed: 220, life: 1.2, rings: 4, flat: .2, a: .8 });
}

// ---------------------------------------------------------------- S3: amplexus + eggs
const EGG_N = 110;
function s3(g, e, t) {
  const cam = Cm.rig([[0, 30, -30, 1.22], [1.4, 70, -40, 1.55], [3.0, 60, -30, 1.55], [4.4, 0, 70, 1.12], [6, -30, 150, 1.0]], e, { hand: .6, seed: 31 });
  Wd.underSet(g, cam, t, { look: 'dawn', surf: -760, floor: 300, seed: 3, sun: 700 });
  L.plankton(g, cam, t, { k: 1, col: '#f0d0a8' });
  const drift = [Math.sin(t * .5) * 10, Math.sin(t * .7) * 8 - ss(SHOT.amplex + 5, SHOT.amplex + 6, t) * 60];
  const P = (x, y) => Cm.toScreen(cam, x + drift[0], y + drift[1], 1);
  const z = cam.z;
  const [fx, fy] = P(0, 0);
  const fem = { x: fx, y: fy, s: 1.3 * z, pose: { hang: 1 }, pitch: .06, plump: 1 - ss(EV.eggs, EV.eggsEnd, t) * .6, wet: .7, t, blink: An.blink(t, 4) };
  const [mx, my] = P(-24, -58);
  const male = { x: mx, y: my, s: 1.0 * z, pose: { hang: 1 }, pitch: .07 + Math.sin(t * 2) * .02, arm: [1.35, 1.15, .55], male: 1, wet: .7, t, throat: An.throat(t) * .5, blink: An.blink(t, 8) };
  Fr.frog(g, fem);
  Fr.frog(g, male);
  const hand = Fr.joint(male, 'hand');
  AN.set('pads', hand, [hand[0] + 150, hand[1] - 130]);
  // eggs leave the female's vent and gather in a clump on a weed stem
  const vent = Fr.toWorld(fem, -98, 6), clumpC = P(-150, 250), pts = Sp.blobPts(EGG_N, 12);
  const [mvx, mvy] = Fr.toWorld(male, -98, 6);
  // weed stem the eggs stick to
  Cm.push(g, cam, 1); Fl.elodea(g, -150 + drift[0] * .3, 560, 420, t, { c: '#2c5a38', c2: '#7aa35a', cur: 8, seed: -150 }); g.restore();
  for (let i = 0; i < EGG_N; i++) {
    const te = EV.eggs + i * (3 / EGG_N), tau = t - te;
    if (tau < 0) continue;
    const q = pts[i], tgt = [clumpC[0] + q[0] * 64 * z, clumpC[1] + q[1] * 54 * z];
    const k = io3(clamp(tau / 1.9)), wob = Math.sin(tau * 5 + i) * 6 * (1 - k) * z;
    const x = lerp(vent[0], tgt[0], k) + wob, y = lerp(vent[1], tgt[1], k) + Math.sin(Math.PI * k) * 40 * z;
    Sp.egg(g, x, y, (5 + 3.5 * ss(0, 3, tau)) * z, { core: lerp(.85, .62, ss(0, 3, tau)), a: Math.min(1, tau * 6) * lerp(.7, 1, (q[2] + 1) / 2) });
  }
  // milt shimmer from the male
  const mk = ss(EV.fert - .4, EV.fert, t) * (1 - ss(EV.eggsEnd - .4, EV.eggsEnd + .2, t));
  if (mk > 0) {
    g.save(); g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 140; i++) {
      const tau = ((t * .9 + hash(i) * 3) % 3) / 3, ang = hash(i + 3) * TAU;
      const x = lerp(mvx, vent[0] - 30 * z, tau) + Math.cos(ang) * tau * 70 * z + noise(t + i, 3) * 10, y = lerp(mvy, vent[1] + 60 * z, tau) + Math.sin(ang) * tau * 50 * z;
      g.fillStyle = rgba('#e8fff8', .55 * mk * (1 - tau)); g.fillRect(x, y, 2, 2);
    }
    g.restore();
    G.glow(g, (mvx + vent[0]) / 2, (mvy + vent[1]) / 2 + 30 * z, 90 * z, '#dffff4', .18 * mk, 'screen');
  }
  AN.set('fert', [lerp(vent[0], clumpC[0], .4), lerp(vent[1], clumpC[1], .45)], [lerp(vent[0], clumpC[0], .4) + 170, lerp(vent[1], clumpC[1], .45) + 90]);
  L.plankton(g, cam, t, { front: true, col: '#f0d0a8' });
  Wd.underFront(g, cam, t, { look: 'dawn', n: 2, xs: [-820, 760] });
  // magnified thumb: the dark, rough nuptial pad that grips the female
  MG.lens(g, clamp(hand[0] - 270, 150, W - 150), clamp(hand[1] + 190, 170, H - 250), 108, hand, t - (EV.pads + .15), 2.0, MG.padCloseup, { t, mag: '×20' });
}

module.exports = { s1, s2, s3, NIGHT, DAWN, frogLayer };
