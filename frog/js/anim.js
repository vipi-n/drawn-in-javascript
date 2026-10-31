// Character motion helpers: frog swim strokes (with distance), croak envelopes, blinks, buccal pumping, hops.
const { TAU, clamp, lerp, hash, out3, io3, in3, ss, spring } = require('./core');

// frog breast-stroke: fast kick (legs extend), glide, slow recovery. ext 0 = folded, 1 = extended
const TABLE = (() => {
  const n = 200, v = [], cum = [0];
  for (let i = 0; i < n; i++) { const u = (i + .5) / n; v.push(u < .16 ? 3 * (u / .16) : u < .55 ? 3 * Math.exp(-(u - .16) * 7) : .12); }
  for (let i = 0; i < n; i++) cum.push(cum[i] + v[i] / n);
  return cum;
})();
function stroke(t, P = 1.1, ph = 0) {
  const tt = t / P + ph, k = Math.floor(tt), u = tt - k;
  const ext = u < .16 ? out3(u / .16) : u < .55 ? 1 : 1 - io3((u - .55) / .45);
  const D = TABLE[TABLE.length - 1], i = Math.min(TABLE.length - 1, Math.floor(u * (TABLE.length - 1)));
  return { ext, dist: (k + TABLE[i] / D) * D, u };
}
// pose weights for a swimming frog from the stroke extension
const swimPose = (ext) => ({ swimOut: ext, swimIn: 1 - ext });

// vocal sac / croak envelope for a list of call times
function sac(t, calls, o = {}) {
  let v = 0;
  const a = o.a ?? .07, h = o.h ?? .2, r = o.r ?? .22;
  for (const c of calls) {
    const e = t - c;
    if (e < 0 || e > a + h + r) continue;
    v = Math.max(v, e < a ? out3(e / a) : e < a + h ? 1 - .08 * Math.sin((e - a) * 40) : 1 - io3((e - a - h) / r));
  }
  return v;
}
// natural blinks (nictitating membrane) at irregular intervals
function blink(t, seed = 1, every = 3.2) {
  const k = Math.floor(t / every), e = t - (k * every + hash(k * 13 + seed) * every * .6);
  return e > 0 && e < .22 ? Math.sin(Math.PI * e / .22) : 0;
}
// buccal pumping: the throat flutters ~3 Hz
const throat = (t, seed = 0) => .5 + .5 * Math.sin(t * TAU * 2.8 + seed);

// a hop from (x0,y0) to (x1,y1) over duration d starting at t0: returns {x, y, pose, pitch}
function hop(t, t0, d, x0, y0, x1, y1, height = 120) {
  const e = (t - t0) / d;
  if (e <= -.25) return { x: x0, y: y0, pose: { sit: 1 }, pitch: 0, air: 0 };
  if (e < 0) { const c = ss(-.25, 0, e); return { x: x0, y: y0 + c * 6, pose: { sit: 1 - c, crouch: c }, pitch: 0, air: 0 }; }
  if (e > 1.25) return { x: x1, y: y1, pose: { sit: 1 }, pitch: 0, air: 0 };
  if (e > 1) { const c = ss(1, 1.25, e); return { x: x1, y: y1 + (1 - c) * 8, pose: { crouch: 1 - c, sit: c }, pitch: 0, air: 0 }; }
  const x = lerp(x0, x1, e), y = lerp(y0, y1, e) - Math.sin(Math.PI * e) * height;
  const ext = e < .5 ? out3(e * 2.2) : 1 - io3((e - .5) * 2);
  return { x, y, pose: { leap: ext, crouch: 1 - ext }, pitch: lerp(-.25, .45, e), air: 1 };
}

module.exports = { stroke, swimPose, sac, blink, throat, hop };
