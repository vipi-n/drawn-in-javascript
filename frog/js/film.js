// The cut: shot table, transitions, text layers (chapters, callouts, bubble clock), finishing (grade, grain, vignette).
const { C, W, H, FPS, DURATION, clamp, lerp, ss, hash, rgba } = require('./core');
const G = require('./gfx');
const T = require('./type');
const FX = require('./fx');
const AN = require('./anchors');
const { SHOT, CHAPTERS, CALLS, CLOCK } = require('./cues');
const SA = require('./shotsA');
let SB = {}, SC = {}, SD = {};
try { SB = require('./shotsB'); } catch (e) { if (e.code !== 'MODULE_NOT_FOUND') throw e; }
try { SC = require('./shotsC'); } catch (e) { if (e.code !== 'MODULE_NOT_FOUND') throw e; }
try { SD = require('./shotsD'); } catch (e) { if (e.code !== 'MODULE_NOT_FOUND') throw e; }

const stub = (name) => (g, e) => { g.fillStyle = '#123'; g.fillRect(0, 0, W, H); G.text(g, name + ' ' + e.toFixed(1), 60, 100, { font: 'SvM', size: 40 }); };
const SHOTS = [
  { a: SHOT.open, b: SHOT.call, f: SA.s1 },
  { a: SHOT.call, b: SHOT.amplex, f: SA.s2 },
  { a: SHOT.amplex, b: SHOT.spawn, f: SA.s3 },
  { a: SHOT.spawn, b: SHOT.embryo, f: SB.s4 || stub('spawn') },
  { a: SHOT.embryo, b: SHOT.hatch, f: SB.s5 || stub('embryo') },
  { a: SHOT.hatch, b: SHOT.tadpole, f: SB.s6 || stub('hatch') },
  { a: SHOT.tadpole, b: SHOT.legs, f: SC.s7 || stub('tadpole') },
  { a: SHOT.legs, b: SHOT.froglet, f: SC.s8 || stub('legs+meta') },
  { a: SHOT.froglet, b: SHOT.grow, f: SD.s9 || stub('froglet') },
  { a: SHOT.grow, b: SHOT.winter, f: SD.s10 || stub('grow') },
  { a: SHOT.winter, b: SHOT.spring, f: SD.s11 || stub('winter') },
  { a: SHOT.spring, b: DURATION, f: SD.s12 || stub('spring') },
];
const TRANS = [
  { at: SHOT.call, d: 1.2, kind: 'dive' },
  { at: SHOT.amplex, d: 1.0, kind: 'dive' },
  { at: SHOT.spawn, d: 1.2, kind: 'bubbles' },
  { at: SHOT.embryo, d: 1.2, kind: 'zoom', o: { fx: 540, fy: 540, depth: 3.4 } },
  { at: SHOT.hatch, d: 1.2, kind: 'zoomOut', o: { fx: 330, fy: 470 } },
  { at: SHOT.tadpole, d: 1.0, kind: 'whip', o: { dir: 1 } },
  { at: SHOT.legs, d: 1.0, kind: 'bubbles' },
  { at: SHOT.froglet, d: 1.2, kind: 'dive', o: { dir: 1 } },
  { at: SHOT.grow, d: .9, kind: 'pupil' },
  { at: SHOT.winter, d: 1.2, kind: 'dive' },
  { at: SHOT.spring, d: 1.2, kind: 'crack' },
];

let A = null, B = null;
function canv() { const cv = C.createCanvas(W, H); return { cv, g: cv.getContext('2d') }; }
function drawShot(g, sh, t) {
  G.reset(g); g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
  g.save(); sh.f(g, clamp(t - sh.a, 0, sh.b - sh.a - 1e-4), t); g.restore();
  G.reset(g);
}

function frame(ctx, f) {
  const t = Math.min(DURATION - 1e-6, f / FPS);
  AN.clear();
  const tr = TRANS.find((q) => Math.abs(t - q.at) < q.d / 2);
  if (tr) {
    if (!A) { A = canv(); B = canv(); }
    const sa = SHOTS.find((s) => s.b === tr.at), sb = SHOTS.find((s) => s.a === tr.at);
    drawShot(A.g, sa, t);
    drawShot(B.g, sb, t);
    G.reset(ctx);
    const u = clamp((t - (tr.at - tr.d / 2)) / tr.d);
    FX[tr.kind](ctx, A.cv, B.cv, u, t, tr.o ?? {});
  } else {
    const sh = SHOTS.find((s) => t >= s.a && t < s.b) || SHOTS[SHOTS.length - 1];
    drawShot(ctx, sh, t);
  }
  G.reset(ctx);
  // vignette + gentle grade
  const vg = ctx.createRadialGradient(W / 2, H / 2, W * .38, W / 2, H / 2, W * .78);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(2,10,12,.42)');
  ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  // text layers
  for (const [a, d, n, name, sub] of CHAPTERS) T.chapter(ctx, n, name, sub, t - a, d, t);
  for (const [a, d, key, label, sub] of CALLS) { if (t < a || t > a + d) continue; const an = AN.get(key); if (an) T.callout(ctx, an[0], an[1], label, sub, t - a, d, t); }
  T.clock(ctx, CLOCK, t);
  // grain
  const GR = G.grain();
  ctx.save(); ctx.globalAlpha = .045; ctx.globalCompositeOperation = 'overlay';
  ctx.drawImage(GR[f % 4], -(hash(f) * 256 | 0), -(hash(f + 7) * 256 | 0), 1536, 1536);
  ctx.restore();
  // fades
  const fade = Math.max(1 - ss(0, 1.2, t), ss(DURATION - 1.4, DURATION - .05, t));
  if (fade > 0) { ctx.fillStyle = rgba('#000000', fade); ctx.fillRect(0, 0, W, H); }
  T.watermark(ctx);
}

module.exports = { frame, SHOTS, TRANS };
