// The hero amoeba's crawl, shared by the pond lens (S2) and the crawling shot (S3) so the dive matches exactly.
const { BAR } = require('./core');
const A = require('./amoeba');
const M = require('./motion');

// one pseudopod per half bar: it shoots out on the beat, then the body pours into it
const HERO = A.makeGait({
  t0: 8.75, x: 150, y: 560, h: -.05, R: 150, step: BAR / 2, len: 104, n: 12, turn: .5, seed: 4, sideP: .65, steerK: .5,
  steer: (ts, x, y) => Math.atan2(560 - y, 420),
});

function hero(t, R = 150) {
  const g = A.gaitAt(HERO, t, R), h = g.h;
  return {
    x: g.x, y: g.y, R, t, seed: 3, pods: g.pods, lead: g.lead, flow: g.flow, stretch: g.stretch, g,
    nuc: { a: h + Math.PI + .35, u: .28, r: R * .2 },
    cv: { a: h + Math.PI - .95, u: .6, r: R * .15, ph: ((t / BAR) % 1 + 1) % 1 },
    food: [{ a: h + .95, u: .5, r: R * .085, dig: .3 }, { a: h + 2.5, u: .55, r: R * .07, dig: .65 }, { a: h - 2.2, u: .45, r: R * .065, dig: .1, col: '#c76fa3' }],
  };
}
// trails the hero with a little lag and leads it slightly; drift runs on global time so S2 and S3 agree
function followCam(t) {
  const [x, y] = A.gaitCam(HERO, t, .9, 7), g = A.gaitAt(HERO, t);
  return M.drift({ x: x + Math.cos(g.h) * 70, y: y + Math.sin(g.h) * 40, z: 1, r: 0 }, t, .8);
}

// S7 starts zoomed on the leaf litter; S6 already irises out into it, so the rig lives here
const S7CAM = [
  [-1, { x: 432, y: 905, z: 5, r: .06 }],
  [.9, { x: 540, y: 560, z: 1.04, r: 0 }, M.sineInOut],
  [2.2, { x: 520, y: 640, z: 1.15, r: -.01 }, M.sineInOut],
  [2.75, { x: 434, y: 916, z: 3.6, r: -.05 }, M.expoIn],
];
const s7cam = (lt) => require('./fx').rig(lt, S7CAM, { drift: .5, seed: 17 });

module.exports = { HERO, hero, followCam, s7cam };
