// The director: picks the scene for a frame, blends transitions, then the film look, the cards + timeline, watermark.
const core = require('./core');
const { W, H, FPS, clamp, lerp, ss, rgba, hash, cues } = core;
const G = require('./gfx');
const T = require('./type');
const { SCENES, DURATION, B } = cues;

const mods = {};
for (const m of ['s1', 's2', 's3', 's4']) {
  try { Object.assign(mods, require('./' + m)); } catch (e) { if (e.code !== 'MODULE_NOT_FOUND' || !String(e.message).includes('/' + m)) throw e; }
}

// transition into scene id: [type, length (s)], centred on the cut
const TRANS = {
  tennis: ['iris', 1.1], spacewar: ['dissolve', .9], pong: ['glitch', .6], atari: ['dissolve', .8], arcade: ['flash', .5],
  crash: ['dissolve', 1.0], revival: ['glitch', .6], bits16: ['flash', .5], threed: ['glitch', .6], online: ['flash', .6],
  everyone: ['dissolve', .9], today: ['dissolve', 1.0], epilogue: ['dissolve', 1.4],
};

function sceneAt(t) { for (let i = 0; i < SCENES.length; i++) if (t < SCENES[i][2]) return i; return SCENES.length - 1; }
function run(ctx, i, t) {
  const [id, a] = SCENES[i];
  ctx.save();
  const fn = mods[id];
  if (!fn) { ctx.fillStyle = '#101418'; ctx.fillRect(0, 0, W, H); G.text(ctx, id + '  ' + (t - a).toFixed(2), 60, 400, { size: 40 }); }
  else fn(ctx, t - a, t);
  ctx.restore();
}
function layer() {
  const L = G.getLayer(7);
  L.ctx.setTransform(1, 0, 0, 1, 0, 0); L.ctx.globalAlpha = 1; L.ctx.globalCompositeOperation = 'source-over'; L.ctx.filter = 'none';
  L.ctx.clearRect(0, 0, W, H);
  return L;
}
function blend(ctx, top, k, type, t) {
  if (type === 'iris') {
    const r = lerp(0, Math.hypot(W, H) * .56, ss(0, 1, k));
    ctx.save(); ctx.beginPath(); ctx.arc(W / 2, 430, r, 0, Math.PI * 2); ctx.clip(); ctx.drawImage(top, 0, 0); ctx.restore();
    ctx.save(); ctx.strokeStyle = `rgba(140,255,190,${.8 * Math.sin(k * Math.PI)})`; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(W / 2, 430, r, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    return;
  }
  if (type === 'glitch') {
    // horizontal slices of the incoming picture, jittered, as if the channel were changing
    const f = Math.floor(t * 30), n = 18;
    for (let i = 0; i < n; i++) {
      const y0 = i * H / n, h = H / n + 1, show = hash(f * 31 + i) < k * 1.15 - .05;
      if (!show) continue;
      const dx = (1 - k) * (hash(f * 7 + i * 3) - .5) * 160;
      ctx.drawImage(top, 0, y0, W, h, dx, y0, W, h);
    }
    const s = Math.sin(k * Math.PI);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 5; i++) { const y = hash(f * 13 + i) * H; ctx.fillStyle = `rgba(200,230,255,${.25 * s})`; ctx.fillRect(0, y, W, 2 + hash(f + i) * 6); }
    ctx.restore();
    return;
  }
  ctx.save(); ctx.globalAlpha = k; ctx.drawImage(top, 0, 0); ctx.restore();
  if (type === 'flash') { ctx.fillStyle = `rgba(255,250,235,${Math.sin(k * Math.PI) * .75})`; ctx.fillRect(0, 0, W, H); }
}

function frame(ctx, f) {
  core.fonts();
  const t = f / FPS, i = sceneAt(t);
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none';
  let done = false;
  if (i > 0) {
    const [type, d] = TRANS[SCENES[i][0]] || ['dissolve', .8], b = SCENES[i][1];
    if (t < b + d / 2) { run(ctx, i - 1, t); const L = layer(); run(L.ctx, i, t); blend(ctx, L.cv, ss(b - d / 2, b + d / 2, t), type, t); done = true; }
  }
  if (!done && i + 1 < SCENES.length) {
    const [type, d] = TRANS[SCENES[i + 1][0]] || ['dissolve', .8], b = SCENES[i + 1][1];
    if (t > b - d / 2) { run(ctx, i, t); const L = layer(); run(L.ctx, i + 1, t); blend(ctx, L.cv, ss(b - d / 2, b + d / 2, t), type, t); done = true; }
  }
  if (!done) run(ctx, i, t);
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none';
  G.bloom(ctx, .18);
  G.vignette(ctx, .5, .45);
  // cards + timeline live from the first fact to the end of "today"
  const ui = ss(B(3) - .2, B(3, 1), t) * (1 - ss(B(42) - .6, B(42) + .2, t));
  T.scrim(ctx, ui);
  T.timeline(ctx, t, ui);
  T.cards(ctx, t);
  const fin = 1 - ss(0, .5, t), fout = ss(DURATION - 1.4, DURATION - .05, t);
  if (fin > 0 || fout > 0) { ctx.fillStyle = `rgba(0,0,0,${Math.max(fin, fout)})`; ctx.fillRect(0, 0, W, H); }
  G.grain(ctx, f, .04);
  xmark(ctx);
}

// X logo badge + handle, bottom-left (same mark as the other shorts)
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
