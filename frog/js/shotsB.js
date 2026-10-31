// Act II: frogspawn swelling + rising (S4), the embryo macro from one cell to hatching (S5), hatchlings (S6).
const { W, H, TAU, clamp, lerp, hash, rgba, mix, ss, io3, out3, in3, spring, noise, wobble } = require('./core');
const G = require('./gfx');
const Cm = require('./cam');
const Wt = require('./water');
const Wd = require('./world');
const Fl = require('./flora');
const Fr = require('./frog');
const Sp = require('./spawn');
const AN = require('./anchors');
const { SHOT, EV } = require('./cues');

// ---------------------------------------------------------------- S4: frogspawn
const S4C = { n: 150, seed: 21 };
let S4FOCUS = null;
function s4Focus() {
  if (S4FOCUS) return S4FOCUS;
  // front-most egg of the fully swollen, risen clump
  const P = Sp.blobPts(S4C.n, S4C.seed);
  let best = 0; P.forEach((p, i) => { if (p[2] - Math.abs(p[0]) * .3 - Math.abs(p[1]) * .3 > P[best][2] - Math.abs(P[best][0]) * .3 - Math.abs(P[best][1]) * .3) best = i; });
  const q = Sp.clumpEgg(0, -300, { ...S4C, size: 230, swell: 1, t: 0 }, best);
  S4FOCUS = { i: best, x: q[0], y: q[1] };
  return S4FOCUS;
}
function s4(g, e, t) {
  const F = s4Focus();
  const cam = Cm.rig([[0, -40, 70, 1.02], [4.6, 30, 40, 1.16], [7.0, 10, -250, 1.22], [8.3, F.x * .7, F.y * .9 + 20, 1.7], [9.6, F.x, F.y, 3.4]], e, { hand: .5, seed: 41 });
  const lapse = ss(.2, .6, e) * (1 - ss(4.2, 4.8, e));
  const sw = io3(ss(.4, 4.6, e)), rise = io3(ss(4.6, 7.0, e));
  const tl = t + lapse * e * 3;  // time-lapse clock for light + water
  Wd.underSet(g, cam, tl, { look: 'sun', surf: -420, floor: 420, seed: 5, sun: 640 + Math.sin(tl * .5) * 120 * lapse, lean: .2 + lapse * Math.sin(tl) * .1 });
  // other clumps (communal spawning)
  G.layer(g, 'bgclumps', (b) => {
    Cm.push(b, cam, .72);
    Sp.clump(b, -560, lerp(40, -200, rise * .8), { n: 90, size: lerp(110, 170, sw), swell: sw, seed: 7, t });
    Sp.clump(b, 560, lerp(150, -120, rise * .7), { n: 80, size: lerp(100, 150, sw), swell: sw * .95, seed: 9, t });
    b.restore();
  }, { k: 2, blur: 3 });
  // weed stem through the clump
  Cm.push(g, cam, 1);
  Fl.elodea(g, 60, 440, 760, tl, { c: '#2c6a3a', c2: '#8fc96a', cur: 6 });
  const cy = lerp(110, -300, rise), co = { ...S4C, size: lerp(150, 230, sw), swell: sw, t };
  G.glow(g, 0, cy, 330 * lerp(.6, 1, sw), '#f0fff0', .16 + .2 * rise, 'screen');
  Sp.clump(g, 0, cy, co);
  g.restore();
  const fq = Sp.clumpEgg(0, cy, co, F.i), fs = Cm.toScreen(cam, fq[0], fq[1], 1);
  AN.set('poles', fs, [fs[0] + 170, fs[1] - 150]);
  // sun dapples through the jelly near the surface
  if (rise > .5) G.glow(g, ...Cm.toScreen(cam, 0, -420, 1), 520 * cam.z, '#fff8d8', .25 * rise, 'screen');
  Wd.underFront(g, cam, tl, { look: 'sun', n: 2, xs: [-900, 820] });
  // time-lapse flicker
  if (lapse > 0) { g.fillStyle = rgba('#ffffff', .04 * lapse * (.5 + .5 * Math.sin(t * 40))); g.fillRect(0, 0, W, H); }
}

// ---------------------------------------------------------------- S5: the embryo (darkfield macro)
// [e, gs, linear?]
const GS = [[0, 1], [1.8, 2.2], [2.4, 2.6], [3.0, 3.6], [3.6, 4.6], [4.2, 5.6], [4.8, 6.6], [5.4, 7.6], [6.0, 8.6], [7.8, 9.4], [8.4, 10, 1],
  [10.8, 12.3, 1], [11.4, 13, 1], [13.8, 16, 1], [14.4, 16.6, 1], [15.6, 18.2, 1], [17.4, 19.2, 1], [18.2, 19.8, 1], [19.2, 20.6, 1]];
function gsAt(e) {
  if (e <= GS[0][0]) return GS[0][1];
  for (let i = 1; i < GS.length; i++) if (e <= GS[i][0]) { const u = (e - GS[i - 1][0]) / (GS[i][0] - GS[i - 1][0]); return lerp(GS[i - 1][1], GS[i][1], GS[i][2] ? u : io3(u)); }
  return GS[GS.length - 1][1];
}
function s5(g, e, t) {
  const gs = gsAt(e);
  // a small zoom kick on every cell division
  let kick = 0;
  for (const d of EV.divisions) kick += wobble(t - d, 2.2, 5) * .03 + (t > d ? Math.exp(-(t - d) * 4) * .025 : 0);
  const cam = Cm.rig([[0, -30, 10, 1.0, -.03], [4, 34, -16, 1.07, .045], [8, -26, 14, 1.12, -.035], [12, 30, 14, 1.18, .035], [16, -22, -10, 1.13, -.025], [19.2, 40, 0, 1.02, .02]], e, { hand: .45, seed: 51 });
  cam.z *= 1 + kick;
  // darkfield backdrop
  g.fillStyle = G.rad(g, W / 2, H / 2, W * .75, [[0, '#0f3330'], [.45, '#071c1c'], [1, '#020807']]); g.fillRect(0, 0, W, H);
  Wt.motes(g, cam, t, { col: '#9fe8d0', a: .6, dx: 16, dy: -12, sets: [{ n: 90, p: .4, r: [1, 2.2], a: .38, seed: 4 }, { n: 14, p: 1.5, r: [14, 34], a: .07, seed: 6, bokeh: 1 }] });
  const [cx, cy] = Cm.toScreen(cam, 0, 0, 1), Rs = 222 * cam.z;
  const hatchK = ss(EV.hatchOut - .2, EV.hatchOut + 1.2, t);
  // capsule rings (the membrane thins and opens at hatching)
  Sp.capsule(g, cx, cy, Rs * 1.3, t, { a: 1 - hatchK * .85, thin: ss(19.6, 20.2, gs) });
  G.glow(g, cx, cy, Rs * 1.7, '#7fe0c0', .08, 'screen');
  const rigK = ss(16.4, 17.4, gs);
  if (rigK < 1) {
    g.save(); g.globalAlpha = 1 - rigK;
    Sp.sphere(g, cx, cy, Rs, gs, t, { rot: Math.sin(t * .3) * .05 + cam.r, stretch: rigK * .35 });
    g.restore();
  }
  if (rigK > 0) {
    const tw = Math.max(0, Math.sin(t * 9) * ss(18, 18.6, gs) * (Math.sin(t * 1.7) > .3 ? 1 : .15)), hatchW = ss(19.6, 20.2, gs);
    const ox = hatchK * Rs * 2.2, oy = -hatchK * Rs * .6;
    const ro = { x: cx - Rs * .05 + ox, y: cy + Rs * .05 + oy, s: Rs / 132, tad: 1, hatch: 1, tailLen: lerp(.12, .42, ss(16.5, 19, gs)) * (1 + hatchW * .2), curl: lerp(1.5, .2, hatchK), pitch: lerp(.42, -.1, hatchK) + tw * .12 - (1 - rigK) * .1 + cam.r,
      gills: ss(18.6, 19.8, gs) * .55, oper: 0, yolk: 1, legs: 0, arms: 0, swim: .15 + tw * .6 + hatchW * .9, t, freq: 3 + hatchW * 2, alpha: rigK, flip: 1, wet: .5, rim: '#9ff0d8' };
    Fr.frog(g, ro);
    // heartbeat (stage 19 on), one beat per musical beat
    const hb = ss(18.1, 18.4, gs) * (1 - hatchK);
    if (hb > 0) {
      const beat = Math.exp(-(((t - EV.heart) % .6 + .6) % .6) * 7);
      const hp = Fr.toWorld(ro, 40, 30);
      G.glow(g, hp[0], hp[1], 24 * cam.z * (1 + beat * .5), '#ff4a3a', .75 * hb * (.45 + .55 * beat));
      AN.set('heart', hp, [hp[0] + 160, hp[1] + 120]);
    }
  }
  // callout anchors on the sphere
  const rr = Math.sin(t * .3) * .05 + cam.r, cr = Math.cos(rr), sr = Math.sin(rr);
  const pt = (p) => { const v = Sp.project(gs, t, p); return [cx + (v[0] * cr - v[1] * sr) * Rs, cy + (v[0] * sr + v[1] * cr) * Rs]; };
  AN.set('crescent', pt([0, -.22, .97]), [cx + Rs * .55 + 120, cy + Rs * .75 + 80]);
  AN.set('plug', pt([0, -1, 0]), [cx + Rs + 60, cy + Rs * .5]);
  AN.set('tube', pt([0, .25, .97]), [cx + Rs * .6 + 80, cy - Rs - 60]);
}

// ---------------------------------------------------------------- S6: hatchlings on the jelly
const HATCHERS = [[-330, -170, .62, .2], [-420, 120, .55, 1.3], [-170, 250, .5, 2.2], [-520, -20, .45, 3.1], [-260, -320, .4, .7]];
function s6(g, e, t) {
  const cam = Cm.rig([[0, -60, 0, .92], [2.4, -10, 10, 1.05], [4.8, 40, 20, 1.12], [7.2, 70, 10, 1.18], [9.6, 30, 0, 1.12]], e, { hand: .5, seed: 61 });
  const lapse = ss(4.6, 5.0, e) * (1 - ss(7.0, 7.4, e));
  const tl = t + lapse * (e - 4.6) * 3;
  Wd.underSet(g, cam, tl, { look: 'sun', surf: -700, floor: 460, seed: 6, sun: 520 });
  // the spent jelly mass
  G.layer(g, 's6jelly', (b) => {
    Cm.push(b, cam, .9);
    const P = Sp.blobPts(70, 33);
    for (const [px, py, pz] of P) Sp.egg(b, -380 + px * 260, py * 260, 44 + pz * 6, { a: lerp(.5, .9, (pz + 1) / 2), inner: () => {} });
    b.restore();
  }, { k: 1 });
  // other hatchlings hanging on
  Cm.push(g, cam, .9);
  for (const [x, y, s, ph] of HATCHERS) {
    const w = Math.max(0, Math.sin(t * .9 + ph * 3)) ** 8;
    Fr.frog(g, { x, y, s, flip: -1, tad: 1, hatch: lerp(1, .3, ss(4.8, 7.2, e)), gills: 1 - ss(4.8, 7.2, e) * .9, oper: ss(4.8, 7.2, e), legs: 0, arms: 0, tailLen: .9, swim: .12 + w * .8, pitch: .5 + Math.sin(t * .7 + ph) * .08, t: t + ph, freq: 3, wet: .4 });
  }
  g.restore();
  // the hero hatchling, facing left (we see its LEFT side -> spiracle)
  const tc = ss(4.8, 7.2, e), off = ss(8.4, 9.6, e);
  const wr = Math.max(0, Math.sin((t - EV.wriggle) * 7)) * ss(EV.wriggle, EV.wriggle + .1, t) * (1 - ss(EV.wriggle + .8, EV.wriggle + 1.2, t));
  const [hx, hy] = Cm.toScreen(cam, 120 - off * 900, 40 - off * 120, 1);
  const hero = { x: hx, y: hy, s: 1.32 * cam.z, flip: -1, tad: 1, hatch: lerp(1, .12, tc), yolk: 1 - tc * .8, gills: 1 - ss(5.4, 7.2, e), oper: ss(4.8, 7.0, e), legs: 0, arms: 0,
    tailLen: lerp(.85, 1, tc), swim: .1 + wr * .9 + off * 1.2, freq: 2.6 + off * 2, pitch: lerp(.35, 0, ss(8, 9, e)) + Math.sin(t * .8) * .04, t, wet: .6, rim: '#e8fff0' };
  Fr.frog(g, hero);
  AN.set('gills', Fr.toWorld(hero, 0, -40), [hx + 150, hy - 200]);
  AN.set('gland', Fr.toWorld(hero, 78, 38), [hx - 330, hy + 170]);
  AN.set('spiracle', Fr.toWorld(hero, 20, 42), [hx + 120, hy + 180]);
  Wd.underFront(g, cam, tl, { look: 'sun', n: 2, xs: [-800, 900] });
  if (lapse > 0) { g.fillStyle = rgba('#ffffff', .04 * lapse * (.5 + .5 * Math.sin(t * 37))); g.fillRect(0, 0, W, H); }
}

module.exports = { s4, s5, s6, gsAt };
