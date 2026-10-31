// render every Nth frame of the film headlessly and report any exceptions / slow frames: node tools/scan.js [step]
const core = require('../js/core'); const { C, W, H, FPS, FRAMES } = core; core.fonts();
const film = require('../js/film');
const cv = C.createCanvas(W, H), ctx = cv.getContext('2d', { alpha: false });
const step = +(process.argv[2] || 7); let bad = 0, slow = [];
for (let f = 0; f < FRAMES; f += step) {
  const t0 = Date.now();
  try { film.frame(ctx, f); } catch (e) { bad++; console.log('ERR frame', f, (f / FPS).toFixed(2), e.message.split('\n')[0], (e.stack.split('\n')[1] || '').trim()); if (bad > 15) break; }
  const ms = Date.now() - t0; if (ms > 900) slow.push([(f / FPS).toFixed(2), ms]);
}
console.log('errors', bad, 'slow', JSON.stringify(slow.slice(0, 20)));
