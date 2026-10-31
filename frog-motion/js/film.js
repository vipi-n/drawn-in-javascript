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

let A = null, B = null, CC = null;
function canv() { const cv = C.createCanvas(W, H); return { cv, g: cv.getContext('2d') }; }
function drawShot(g, sh, t) {
  G.reset(g); g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
  g.save(); sh.f(g, clamp(t - sh.a, 0, sh.b - sh.a - 1e-4), t); g.restore();
  G.reset(g);
}
// lens fringing: red channel scaled out from the centre, cyan kept, recombined additively
function chroma(ctx, src, px) {
  const R = G.buf('caR'), Q = G.buf('caC');
  R.g.drawImage(src, 0, 0); R.g.globalCompositeOperation = 'multiply'; R.g.fillStyle = '#ff0000'; R.g.fillRect(0, 0, W, H);
  Q.g.drawImage(src, 0, 0); Q.g.globalCompositeOperation = 'multiply'; Q.g.fillStyle = '#00ffff'; Q.g.fillRect(0, 0, W, H);
  const s = 1 + px / 540;
  ctx.save(); G.reset(ctx); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'lighter';
  ctx.drawImage(Q.cv, 0, 0);
  ctx.drawImage(R.cv, W / 2 - W * s / 2, H / 2 - H * s / 2, W * s, H * s);
  ctx.restore();
}
const IMPACTS = [7.2, 17.4, 33.6, 51.6, 72.6, 88.8, 98.4, 122.4, 131.4];
const LEAK = { dive: '#ffe2b0', zoom: '#d8fff0', zoomOut: '#d8fff0', crack: '#e8f6ff', pupil: '#ffd890', bubbles: '#e0fff4', whip: '#fff0c8' };

function frame(ctx, f) {
  const t = Math.min(DURATION - 1e-6, f / FPS);
  AN.clear();
  const tr = TRANS.find((q) => Math.abs(t - q.at) < q.d / 2);
  let ca = 0;
  for (const T0 of IMPACTS) if (t >= T0 && t < T0 + .6) ca = Math.max(ca, 4.5 * Math.exp(-(t - T0) * 7));
  if (tr) {
    if (!A) { A = canv(); B = canv(); }
    if (!CC) CC = canv();
    const sa = SHOTS.find((s) => s.b === tr.at), sb = SHOTS.find((s) => s.a === tr.at);
    drawShot(A.g, sa, t);
    drawShot(B.g, sb, t);
    const u = clamp((t - (tr.at - tr.d / 2)) / tr.d), k = Math.sin(Math.PI * u);
    G.reset(CC.g);
    FX[tr.kind](CC.g, A.cv, B.cv, u, t, tr.o ?? {});
    G.reset(CC.g);
    // a light leak sweeps across the cut
    const lx = lerp(-200, W + 200, u), ly = H * (.3 + .4 * hash(Math.round(tr.at * 10)));
    G.glow(CC.g, lx, ly, 820, LEAK[tr.kind] ?? '#fff0d0', .2 * k, 'screen');
    G.glow(CC.g, W - lx * .6, H - ly, 520, '#ffc890', .1 * k, 'screen');
    G.reset(ctx);
    chroma(ctx, CC.cv, Math.max(ca, 5 * k));
  } else if (ca > .3) {
    if (!CC) CC = canv();
    const sh = SHOTS.find((s) => t >= s.a && t < s.b) || SHOTS[SHOTS.length - 1];
    drawShot(CC.g, sh, t);
    chroma(ctx, CC.cv, ca);
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
