// The director: picks the scene for a frame, blends transitions, draws the life-cycle HUD across the stage scenes,
// then the film look + watermark.
const core = require('./core');
const { W, H, FPS, clamp, lerp, ss, rgba, cues } = core;
const G = require('./gfx');
const T = require('./type');
const { SCENES, DURATION, B, BEAT } = cues;

const mods = {};
for (const m of ['s1', 's2', 's3', 's4']) {
  try { Object.assign(mods, require('./' + m)); } catch (e) { if (e.code !== 'MODULE_NOT_FOUND' || !String(e.message).includes('/' + m)) throw e; }
}

// transition into scene id: [type, length (s)], centred on the cut
const TRANS = {
  found: ['dissolve', 1.0], egg: ['iris', 1.1], larva: ['scan', .9], pupa: ['scan', .9], adult: ['flash', .6], colony: ['iris', 1.2], cycle: ['scan', 1.0],
};

function sceneAt(t) { for (let i = 0; i < SCENES.length; i++) if (t < SCENES[i][2]) return i; return SCENES.length - 1; }
function run(ctx, i, t) {
  const [id, a] = SCENES[i];
  ctx.save();
  const fn = mods[id];
  if (!fn) { ctx.fillStyle = '#140d08'; ctx.fillRect(0, 0, W, H); G.text(ctx, id + '  ' + (t - a).toFixed(2), 60, 400, { size: 60 }); }
  else fn(ctx, t - a, t);
  ctx.restore();
}
function layer() {
  const L = G.getLayer(7);
  L.ctx.setTransform(1, 0, 0, 1, 0, 0); L.ctx.globalAlpha = 1; L.ctx.globalCompositeOperation = 'source-over'; L.ctx.filter = 'none';
  L.ctx.clearRect(0, 0, W, H);
  return L;
}
function blend(ctx, top, k, type) {
  if (type === 'iris') {
    // the next scene opens inside a lens with a honeycomb edge
    const r = lerp(0, Math.hypot(W, H) * .56, ss(0, 1, k));
    ctx.save(); ctx.beginPath(); ctx.arc(W / 2, H / 2, r, 0, Math.PI * 2); ctx.clip(); ctx.drawImage(top, 0, 0); ctx.restore();
    ctx.save(); ctx.strokeStyle = rgba(T.TEAL, .9 * Math.sin(k * Math.PI)); ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(W / 2, H / 2, r, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    return;
  }
  if (type === 'scan') {
    // a teal scan line sweeps down; the next scene is printed in behind it
    const y = lerp(-40, H + 40, ss(0, 1, k));
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, y); ctx.clip(); ctx.drawImage(top, 0, 0); ctx.restore();
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createLinearGradient(0, y - 160, 0, y); g.addColorStop(0, 'rgba(94,242,224,0)'); g.addColorStop(1, 'rgba(94,242,224,.35)');
    ctx.fillStyle = g; ctx.fillRect(0, y - 160, W, 160); ctx.fillStyle = 'rgba(220,255,250,.9)'; ctx.fillRect(0, y - 2, W, 4);
    ctx.restore();
    return;
  }
  ctx.save(); ctx.globalAlpha = k; ctx.drawImage(top, 0, 0); ctx.restore();
  if (type === 'flash') { ctx.fillStyle = `rgba(255,236,200,${Math.sin(k * Math.PI) * .75})`; ctx.fillRect(0, 0, W, H); }
}

// life-cycle progress: which stage node (0 egg .. 3 adult) and the day count of a typical worker (~8 weeks egg -> adult)
const KEYS = [[B(7), 0, 0], [B(10, 3), 0, 13], [B(11), 1, 14], [B(15, 3), 1, 34], [B(16), 2, 35], [B(20, 3), 2, 55], [B(21, 2), 3, 56], [B(25), 3, 58]];
function progress(t) {
  if (t <= KEYS[0][0]) return [0, 0];
  for (let i = 1; i < KEYS.length; i++) if (t <= KEYS[i][0]) {
    const [a, pa, da] = KEYS[i - 1], [b, pb, db] = KEYS[i], u = (t - a) / (b - a), e = pa === pb ? u : ss(0, 1, u);
    return [lerp(pa, pb, e) + (pa === pb ? u * .35 : 0), lerp(da, db, u)];
  }
  return [3, 58];
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
  G.bloom(ctx, .22);
  G.vignette(ctx, .5, .4);
  // the life-cycle HUD rides over the four stage scenes
  const ha = ss(B(7) + .2, B(7) + .9, t) * (1 - ss(B(25) - .6, B(25), t));
  if (ha > 0) { const [p, d] = progress(t); T.hud(ctx, t, ha, p, 'DAY ' + String(Math.round(d)).padStart(2, '0')); }
  const fin = 1 - ss(0, .5, t), fout = ss(DURATION - 1.4, DURATION - .05, t);
  if (fin > 0 || fout > 0) { ctx.fillStyle = `rgba(0,0,0,${Math.max(fin, fout)})`; ctx.fillRect(0, 0, W, H); }
  G.grain(ctx, f, .04);
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

module.exports = { frame, progress };
