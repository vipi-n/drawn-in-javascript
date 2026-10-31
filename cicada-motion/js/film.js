// The director: picks the scene for a frame, blends transitions, then the film look + watermark.
const core = require('./core');
const { W, H, FPS, clamp, lerp, ss, rgba, hash, cues } = core;
const G = require('./gfx');
const { SCENES, DURATION } = cues;

const mods = {};
for (const m of ['s1', 's2', 's3', 's4', 's5']) {
  try { Object.assign(mods, require('./' + m)); } catch (e) { if (e.code !== 'MODULE_NOT_FOUND' || !String(e.message).includes('/' + m)) throw e; }
}

// transition into scene id: [type, length (s)], centred on the cut
const TRANS = {
  song: ['leak', 1.2], eggs: ['iris', 1.0], drop: ['leak', .8], underground: ['dissolve', .9], awakening: ['dissolve', .7],
  emergence: ['flash', .5], molt: ['dissolve', 1.2], chorus: ['leak', 1.0], return: ['dissolve', 1.2], epilogue: ['dissolve', 1.4],
};

function sceneAt(t) { for (let i = 0; i < SCENES.length; i++) if (t < SCENES[i][2]) return i; return SCENES.length - 1; }
function run(ctx, i, t) {
  const [id, a] = SCENES[i];
  ctx.save();
  const fn = mods[id];
  if (!fn) { ctx.fillStyle = '#101418'; ctx.fillRect(0, 0, W, H); G.text(ctx, id + '  ' + (t - a).toFixed(2), 60, 100, { size: 40 }); }
  else fn(ctx, t - a, t);
  ctx.restore();
}
function layer() {
  const L = G.getLayer(7);
  L.ctx.setTransform(1, 0, 0, 1, 0, 0); L.ctx.globalAlpha = 1; L.ctx.globalCompositeOperation = 'source-over'; L.ctx.filter = 'none';
  L.ctx.clearRect(0, 0, W, H);
  return L;
}
function leak(ctx, k, warm = '#ffcf8a') {
  // a band of warm light sweeping diagonally across the frame
  const f = Math.sin(clamp(k) * Math.PI);
  if (f <= 0) return;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const x = lerp(-W * .6, W * 1.6, k);
  const g = ctx.createLinearGradient(x - 500, 0, x + 500, H * .4);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(.45, rgba(warm, .35 * f)); g.addColorStop(.5, rgba('#fff2d8', .55 * f)); g.addColorStop(.55, rgba(warm, .35 * f)); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  G.glow(ctx, x, H * .35, 600, warm, .25 * f);
  ctx.restore();
}
function blend(ctx, top, k, type) {
  if (type === 'iris') {
    // circular reveal from the centre
    const r = lerp(0, Math.hypot(W, H) * .55, ss(0, 1, k));
    ctx.save(); ctx.beginPath(); ctx.arc(W / 2, H / 2, r, 0, Math.PI * 2); ctx.clip(); ctx.drawImage(top, 0, 0); ctx.restore();
    ctx.save(); ctx.strokeStyle = `rgba(255,240,210,${.8 * Math.sin(k * Math.PI)})`; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(W / 2, H / 2, r, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    return;
  }
  ctx.save(); ctx.globalAlpha = k; ctx.drawImage(top, 0, 0); ctx.restore();
  if (type === 'flash') { ctx.fillStyle = `rgba(255,232,190,${Math.sin(k * Math.PI) * .7})`; ctx.fillRect(0, 0, W, H); }
  if (type === 'leak') leak(ctx, k);
}

function frame(ctx, f) {
  core.fonts();
  const t = f / FPS, i = sceneAt(t);
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none';
  let done = false;
  if (i > 0) {
    const [type, d] = TRANS[SCENES[i][0]] || ['dissolve', .8], b = SCENES[i][1];
    if (t < b + d / 2) { run(ctx, i - 1, t); const L = layer(); run(L.ctx, i, t); blend(ctx, L.cv, ss(b - d / 2, b + d / 2, t), type); done = true; }
  }
  if (!done && i + 1 < SCENES.length) {
    const [type, d] = TRANS[SCENES[i + 1][0]] || ['dissolve', .8], b = SCENES[i + 1][1];
    if (t > b - d / 2) { run(ctx, i, t); const L = layer(); run(L.ctx, i + 1, t); blend(ctx, L.cv, ss(b - d / 2, b + d / 2, t), type); done = true; }
  }
  if (!done) run(ctx, i, t);
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none';
  G.bloom(ctx, .2);
  G.vignette(ctx, .5, .42);
  const fin = 1 - ss(0, 1.2, t), fout = ss(DURATION - 1.6, DURATION - .05, t);
  if (fin > 0 || fout > 0) { ctx.fillStyle = `rgba(0,0,0,${Math.max(fin, fout)})`; ctx.fillRect(0, 0, W, H); }
  G.grain(ctx, f, .045);
  xmark(ctx);
}

// X logo badge + handle, bottom-left
const X_LOGO = 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z';
let xLogo = null;
function xmark(ctx) {
  const { C } = core;
  if (!xLogo) { C.GlobalFonts.registerFromPath('/System/Library/Fonts/SFNS.ttf', 'XMark'); xLogo = new C.Path2D(X_LOGO); }
  const s = Math.min(W, H) / 1080, b = 27 * s, x = 30 * s, y = H - 22 * s - b, g = 16 * s;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none';
  ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = 7 * s; ctx.shadowOffsetY = 2 * s;
  ctx.fillStyle = 'rgba(0,0,0,.94)'; ctx.beginPath(); ctx.roundRect(x, y, b, b, 7 * s); ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.save(); ctx.translate(x + (b - g) / 2, y + (b - g) / 2); ctx.scale(g / 24, g / 24); ctx.fillStyle = '#fff'; ctx.fill(xLogo); ctx.restore();
  ctx.font = `600 ${20 * s}px XMark`; ctx.letterSpacing = `${.8 * s}px`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,20,30,.8)'; ctx.shadowBlur = 9 * s; ctx.shadowOffsetY = 2 * s;
  ctx.fillStyle = 'rgba(255,255,255,.94)'; ctx.fillText('@vipinxtwt', x + b + 11 * s, y + b / 2 + s);
  ctx.letterSpacing = '0px';
  ctx.restore();
}

module.exports = { frame };
