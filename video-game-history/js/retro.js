// Retro kit: low-res pixel canvases, CRT compositing (phosphor glow, scanlines, glass), the room every machine
// sits in, a camera, and the period hardware drawn as clean product illustrations.
const { C, W, H, TAU, clamp, lerp, ss, io3, rgba, mix, mixs, shade, hash, rng, noise, fbm2 } = require('./core');
const G = require("./gfx");
const shd = (c, k) => rgba(shade(c, k), 1);

// ---------------------------------------------------------------- low-res pixel canvases
const LR = {};
function lowres(key, w, h) {
  let L = LR[key];
  if (!L) { const cv = C.createCanvas(w, h); L = LR[key] = { cv, c: cv.getContext('2d'), w, h }; }
  const c = L.c;
  c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; c.filter = 'none';
  c.imageSmoothingEnabled = false; c.clearRect(0, 0, w, h);
  return L;
}
function blit(ctx, cv, x, y, w, h) { ctx.save(); ctx.imageSmoothingEnabled = false; ctx.drawImage(cv, x, y, w, h); ctx.restore(); }
// sprite from rows of chars; pal maps char -> colour ('.' = transparent)
function sprite(c, rows, x, y, pal, o = {}) {
  const fx = o.flip;
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    for (let k = 0; k < row.length; k++) {
      const ch = row[k]; if (ch === '.' || ch === ' ') continue;
      const col = pal[ch]; if (!col) continue;
      c.fillStyle = col; c.fillRect(Math.round(x + (fx ? row.length - 1 - k : k)), Math.round(y + r), 1, 1);
    }
  }
}

// ---------------------------------------------------------------- CRT screen compositing
const SCAN = {};
function scanCanvas(pitch) {
  if (SCAN[pitch]) return SCAN[pitch];
  const cv = C.createCanvas(W, H), c = cv.getContext('2d');
  c.fillStyle = '#000';
  for (let y = 0; y < H; y += pitch) c.fillRect(0, y + pitch * .58, W, pitch * .42);
  return (SCAN[pitch] = cv);
}
let small = null;
// fn(c, x, y, w, h) paints the picture inside the rect; o: {r, circle, bg, glow, scan, pitch, vig, glass, flicker}
function screen(ctx, x, y, w, h, fn, o = {}) {
  const L = G.getLayer(1), c = L.ctx;
  c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; c.filter = 'none';
  c.clearRect(0, 0, W, H);
  const path = (k) => { k.beginPath(); if (o.circle) k.arc(x + w / 2, y + h / 2, w / 2, 0, TAU); else k.roundRect(x, y, w, h, o.r ?? 18); };
  c.save(); path(c); c.clip();
  c.fillStyle = o.bg ?? '#000'; c.fillRect(x, y, w, h);
  fn(c, x, y, w, h);
  c.restore();
  ctx.save(); ctx.globalAlpha *= o.alpha ?? 1;
  ctx.drawImage(L.cv, 0, 0);
  if ((o.glow ?? .5) > 0) {
    if (!small) small = C.createCanvas(W / 4, H / 4);
    const s = small.getContext('2d');
    s.setTransform(1, 0, 0, 1, 0, 0); s.clearRect(0, 0, W / 4, H / 4); s.filter = `blur(${o.glowR ?? 3}px)`; s.drawImage(L.cv, 0, 0, W / 4, H / 4); s.filter = 'none';
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha *= (o.glow ?? .5) * (o.flicker ?? 1); ctx.drawImage(small, 0, 0, W, H); ctx.restore();
  }
  ctx.save(); path(ctx); ctx.clip();
  if ((o.scan ?? .3) > 0) { ctx.globalAlpha = (o.scan ?? .3) * (o.alpha ?? 1); ctx.drawImage(scanCanvas(o.pitch ?? 4), 0, 0); ctx.globalAlpha = o.alpha ?? 1; }
  const cx = x + w / 2, cy = y + h / 2;
  const vg = ctx.createRadialGradient(cx, cy, Math.min(w, h) * .3, cx, cy, Math.hypot(w, h) * .58);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, `rgba(0,0,0,${o.vig ?? .5})`);
  ctx.fillStyle = vg; ctx.fillRect(x, y, w, h);
  if ((o.glass ?? 1) > 0) {
    const hg = ctx.createLinearGradient(x, y, x + w * .6, y + h * .7);
    hg.addColorStop(0, `rgba(255,255,255,${.1 * (o.glass ?? 1)})`); hg.addColorStop(.5, `rgba(255,255,255,${.025 * (o.glass ?? 1)})`); hg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = hg; ctx.beginPath(); ctx.ellipse(x + w * .3, y + h * .2, w * .55, h * .3, -.35, 0, TAU); ctx.fill();
  }
  ctx.restore();
  ctx.restore();
}

// ---------------------------------------------------------------- room + camera
function room(ctx, t, o = {}) {
  const tint = o.tint ?? '#6cf2a8';
  G.vgrad(ctx, 0, H, [[0, o.top ?? '#07080e'], [.62, o.mid ?? '#0c0c14'], [1, o.bot ?? '#120e10']]);
  // light spilling from the screen onto the wall
  G.glow(ctx, o.gx ?? 540, o.gy ?? 430, o.gr ?? 760, tint, (o.ga ?? .2) * (o.flicker ?? 1));
  // desk surface
  if (o.desk !== false) {
    const dy = o.deskY ?? 735;
    G.vgrad(ctx, dy, H, [[0, o.desk1 ?? '#2a1c14'], [.25, o.desk2 ?? '#1a110c'], [1, '#080506']]);
    ctx.fillStyle = rgba(tint, .08 * (o.flicker ?? 1)); ctx.fillRect(0, dy, W, 3);
    G.ellipseGlow(ctx, o.gx ?? 540, dy + 30, 520, 60, tint, .16 * (o.flicker ?? 1));
  }
  G.bokeh(ctx, t, 9, { colors: o.bokeh ?? [tint, '#ffcf8a'], a: .05, rmin: 30, rmax: 110, seed: o.seed ?? 4, y0: 80, y1: 700 });
  G.motes(ctx, t, 34, { color: '#ffe8c0', a: .22, size: .7, seed: (o.seed ?? 4) + 7, drift: [5, -4] });
}
// slow push (z0 -> z1) about (cx, cy) over [0, dur], plus a breath of drift
function cam(ctx, t, dur, z0 = 1, z1 = 1.06, cx = 540, cy = 430, o = {}) {
  const k = o.ease === false ? clamp(t / dur) : io3(t / dur), z = lerp(z0, z1, k);
  const dx = (o.dx ?? 0) * k + Math.sin(t * .35) * 3, dy = (o.dy ?? 0) * k + Math.cos(t * .29) * 2;
  ctx.translate(cx + dx, cy + dy); ctx.scale(z, z); ctx.translate(-cx, -cy);
}

// ---------------------------------------------------------------- materials
function metal(ctx, x, y, w, h, r, c0, c1, o = {}) {
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = o.shadow ?? 40; ctx.shadowOffsetY = o.sy ?? 18;
  const g = ctx.createLinearGradient(x, y, x, y + h); g.addColorStop(0, c0); g.addColorStop(1, c1);
  ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fill();
  ctx.shadowColor = 'transparent';
  // top bevel + rim light
  ctx.strokeStyle = o.rim ?? 'rgba(255,255,255,.22)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(x + 1.5, y + 1.5, w - 3, h - 3, r); ctx.stroke();
  const hl = ctx.createLinearGradient(x, y, x, y + h * .35); hl.addColorStop(0, 'rgba(255,255,255,.12)'); hl.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = hl; ctx.beginPath(); ctx.roundRect(x, y, w, h * .35, [r, r, 0, 0]); ctx.fill();
  ctx.restore();
}
function knob(ctx, x, y, r, ang = -.6, c = '#20242a') {
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,.55)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 3;
  const g = ctx.createRadialGradient(x - r * .3, y - r * .4, r * .1, x, y, r); g.addColorStop(0, shd(c, .35)); g.addColorStop(1, shd(c, -.35));
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, r - 1, 0, TAU); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x + Math.cos(ang) * r * .25, y + Math.sin(ang) * r * .25); ctx.lineTo(x + Math.cos(ang) * r * .8, y + Math.sin(ang) * r * .8); ctx.stroke();
  ctx.restore();
}
function screw(ctx, x, y, r = 5) {
  const g = ctx.createRadialGradient(x - 1, y - 1, 0, x, y, r); g.addColorStop(0, '#d9dde2'); g.addColorStop(1, '#5c626a');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x - r * .6, y); ctx.lineTo(x + r * .6, y); ctx.stroke();
}
let wood = null;
function woodTex() {
  if (wood) return wood;
  const w = 512, h = 512, cv = C.createCanvas(w, h), c = cv.getContext('2d'), id = c.createImageData(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const n = fbm2(x * .004, y * .05, 4), ring = Math.sin((x * .018 + n * 6 + fbm2(x * .01, y * .01, 2) * 3) * 3.2) * .5 + .5;
    const k = .55 + .3 * ring + .15 * fbm2(x * .2, y * .02, 2);
    const col = mix('#3b2213', '#9a6234', clamp(k));
    const i = (y * w + x) * 4; id.data[i] = col[0]; id.data[i + 1] = col[1]; id.data[i + 2] = col[2]; id.data[i + 3] = 255;
  }
  c.putImageData(id, 0, 0);
  return (wood = cv);
}
function woodPanel(ctx, x, y, w, h, r, o = {}) {
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,.65)'; ctx.shadowBlur = o.shadow ?? 44; ctx.shadowOffsetY = 20;
  ctx.fillStyle = '#4a2a16'; ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.clip();
  ctx.globalAlpha = .95; ctx.drawImage(woodTex(), x, y, w, h); ctx.globalAlpha = 1;
  const g = ctx.createLinearGradient(x, y, x, y + h); g.addColorStop(0, 'rgba(255,220,170,.18)'); g.addColorStop(.4, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.4)');
  ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  ctx.restore();
  ctx.strokeStyle = 'rgba(255,220,170,.22)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(x + 1, y + 1, w - 2, h - 2, r); ctx.stroke();
}
function label(ctx, s, x, y, o = {}) { G.text(ctx, s, x, y, { font: 'OptB', size: o.size ?? 11, color: o.color ?? '#dfe5ea', track: o.track ?? 2, align: o.align ?? 'center', alpha: o.alpha ?? .7 }); }

// ---------------------------------------------------------------- hardware. Each returns its screen rect {x,y,w,h}.
// 1958 oscilloscope + two hand controllers
function scope(ctx, t, content, o = {}) {
  const x = 210, y = 175, w = 660, h = 450;
  // controller wires + boxes
  for (const s of [-1, 1]) {
    const bx = 540 + s * 300, by = 700;
    ctx.strokeStyle = '#111'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(540 + s * 200, y + h - 6); ctx.bezierCurveTo(540 + s * 230, y + h + 50, bx - s * 40, by - 70, bx, by - 22); ctx.stroke();
    metal(ctx, bx - 70, by - 28, 140, 62, 10, '#b9c0c7', '#6b737c', { shadow: 18, sy: 8 });
    knob(ctx, bx - 26, by + 3, 15, -1.2 + Math.sin(t * 2.1 + s) * .5, '#2a2f36');
    ctx.fillStyle = '#c03a2b'; ctx.beginPath(); ctx.arc(bx + 34, by + 3, 9, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.3)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(bx + 34, by + 3, 9, 0, TAU); ctx.stroke();
  }
  metal(ctx, x, y, w, h, 24, '#59636e', '#272c33');
  for (const [sx, sy] of [[x + 18, y + 18], [x + w - 18, y + 18], [x + 18, y + h - 18], [x + w - 18, y + h - 18]]) screw(ctx, sx, sy);
  const cx = x + 245, cy = y + h / 2, R = 172;
  // bezel rings
  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.7)'; ctx.shadowBlur = 20;
  const bg = ctx.createRadialGradient(cx, cy - 30, R * .5, cx, cy, R + 34); bg.addColorStop(0, '#0b0d0f'); bg.addColorStop(.86, '#2b3036'); bg.addColorStop(1, '#8b939c');
  ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(cx, cy, R + 30, 0, TAU); ctx.fill(); ctx.restore();
  ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, R + 29, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
  // right control panel
  const px = x + 470;
  ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.beginPath(); ctx.roundRect(px, y + 40, 160, h - 80, 12); ctx.fill();
  [['INTENSITY', y + 105], ['FOCUS', y + 195], ['TIME / DIV', y + 285], ['VOLTS / DIV', y + 375]].forEach(([s, ky], i) => {
    knob(ctx, px + 80, ky - 10, i === 2 ? 30 : 24, -2 + i * .9);
    label(ctx, s, px + 80, ky + 36);
  });
  label(ctx, 'OSCILLOSCOPE', cx, y + h - 22, { size: 12, track: 5, alpha: .55 });
  const S = { x: cx - R, y: cy - R, w: 2 * R, h: 2 * R };
  screen(ctx, S.x, S.y, S.w, S.h, content, { circle: true, bg: '#020a05', glow: .75, scan: 0, vig: .7, glowR: 2.5 });
  return S;
}
// 1962 PDP-1 Type 30 round display in its cabinet
function pdp(ctx, t, content) {
  const x = 230, y = 130, w = 620, h = 600;
  metal(ctx, x, y, w, h, 18, '#8aa1ad', '#435661', { rim: 'rgba(255,255,255,.3)' });
  ctx.fillStyle = 'rgba(0,0,0,.14)'; for (let i = 0; i < 6; i++) ctx.fillRect(x + 20, y + h - 70 + i * 9, w - 40, 3);
  const cx = 540, cy = y + 270, R = 205;
  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.7)'; ctx.shadowBlur = 26;
  const bg = ctx.createRadialGradient(cx, cy - 40, R * .6, cx, cy, R + 40); bg.addColorStop(0, '#050608'); bg.addColorStop(.85, '#1b2126'); bg.addColorStop(1, '#6f7f88');
  ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(cx, cy, R + 36, 0, TAU); ctx.fill(); ctx.restore();
  label(ctx, 'TYPE 30  PRECISION CRT DISPLAY', cx, y + h - 86, { size: 12, track: 4, color: '#eef4f7', alpha: .6 });
  const S = { x: cx - R, y: cy - R, w: 2 * R, h: 2 * R };
  screen(ctx, S.x, S.y, S.w, S.h, content, { circle: true, bg: '#03050a', glow: .8, scan: 0, vig: .75, glowR: 2.5 });
  return S;
}
// 1970s wood-grain TV with rabbit ears
function tv70(ctx, t, content, o = {}) {
  const x = 175, y = 190, w = 730, h = 520;
  ctx.strokeStyle = '#c7ccd1'; ctx.lineWidth = 3; ctx.lineCap = 'round';
  for (const s of [-1, 1]) { const ex = 540 + s * 190, ey = 60; ctx.beginPath(); ctx.moveTo(540 + s * 10, y + 4); ctx.lineTo(ex, ey); ctx.stroke(); ctx.fillStyle = '#e9edf0'; ctx.beginPath(); ctx.arc(ex, ey, 5, 0, TAU); ctx.fill(); }
  ctx.fillStyle = '#23272c'; ctx.beginPath(); ctx.ellipse(540, y + 4, 44, 14, 0, Math.PI, TAU); ctx.fill();
  woodPanel(ctx, x, y, w, h, 34);
  // screen surround
  const sx = x + 40, sy = y + 40, sw = 512, sh = 440;
  ctx.fillStyle = '#17120e'; ctx.beginPath(); ctx.roundRect(sx - 14, sy - 14, sw + 28, sh + 28, 46); ctx.fill();
  ctx.strokeStyle = 'rgba(255,230,190,.25)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(sx - 14, sy - 14, sw + 28, sh + 28, 46); ctx.stroke();
  // side panel: dials + grille
  const px = x + w - 150;
  ctx.fillStyle = '#d7d2c4'; ctx.beginPath(); ctx.roundRect(px, y + 40, 112, h - 80, 14); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.roundRect(px, y + 40, 112, h - 80, 14); ctx.fill();
  const dx = px + 56;
  ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 1.5;
  for (let i = 0; i < 12; i++) { const a = -Math.PI / 2 + i / 12 * TAU; ctx.beginPath(); ctx.moveTo(dx + Math.cos(a) * 38, y + 120 + Math.sin(a) * 38); ctx.lineTo(dx + Math.cos(a) * 44, y + 120 + Math.sin(a) * 44); ctx.stroke(); }
  knob(ctx, dx, y + 120, 32, -1.1, '#3b3f44'); knob(ctx, dx, y + 220, 22, .6, '#3b3f44');
  label(ctx, 'CHANNEL', dx, y + 172, { color: '#fff', size: 10 }); label(ctx, 'VOLUME', dx, y + 258, { color: '#fff', size: 10 });
  ctx.fillStyle = 'rgba(20,12,8,.75)'; for (let i = 0; i < 11; i++) ctx.fillRect(px + 16, y + 290 + i * 15, 80, 7);
  const S = { x: sx, y: sy, w: sw, h: sh };
  screen(ctx, S.x, S.y, S.w, S.h, content, { r: 44, bg: '#0a0b0c', glow: .55, scan: .32, pitch: 4, vig: .65, ...o });
  return S;
}
// 1980s/90s plastic CRT TV. o.color body colour
function tv80(ctx, t, content, o = {}) {
  const x = 150, y = 150, w = 780, h = 580, body = o.body ?? '#2b2d31';
  metal(ctx, x, y, w, h, 30, shd(body, .14), shd(body, -.25), { rim: 'rgba(255,255,255,.14)' });
  const sx = x + 50, sy = y + 46, sw = 560, sh = 448;
  ctx.fillStyle = '#0c0d0f'; ctx.beginPath(); ctx.roundRect(sx - 20, sy - 20, sw + 40, sh + 40, 34); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(sx - 20, sy - 20, sw + 40, sh + 40, 34); ctx.stroke();
  const px = x + w - 118;
  for (let i = 0; i < 16; i++) { ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.fillRect(px, y + 70 + i * 13, 70, 6); }
  for (let i = 0; i < 4; i++) { ctx.fillStyle = '#4a4d53'; ctx.beginPath(); ctx.roundRect(px + 4, y + 320 + i * 34, 62, 22, 6); ctx.fill(); }
  ctx.fillStyle = o.led ?? '#ff3b30'; ctx.beginPath(); ctx.arc(px + 35, y + h - 60, 5, 0, TAU); ctx.fill(); G.glow(ctx, px + 35, y + h - 60, 18, o.led ?? '#ff3b30', .6);
  label(ctx, o.brand ?? 'COLOR TV', px + 35, y + 50, { size: 10, track: 3, alpha: .5 });
  const S = { x: sx, y: sy, w: sw, h: sh };
  screen(ctx, S.x, S.y, S.w, S.h, content, { r: 28, bg: '#000', glow: .45, scan: .3, pitch: 4, vig: .55, ...o.scr });
  return S;
}
// arcade cabinet front; marquee text glows
function arcade(ctx, t, content, o = {}) {
  const x = 250, y = 98, w = 580, h = 720, neon = o.neon ?? '#ff3fb5';
  // side panels (slight perspective)
  ctx.fillStyle = '#0f0b18'; ctx.beginPath(); ctx.moveTo(x - 36, y + 30); ctx.lineTo(x, y); ctx.lineTo(x, y + h); ctx.lineTo(x - 36, y + h); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x + w + 36, y + 30); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w + 36, y + h); ctx.closePath(); ctx.fill();
  metal(ctx, x, y, w, h, 10, '#1d1730', '#0b0813', { rim: rgba(neon, .5) });
  ctx.strokeStyle = rgba(neon, .9); ctx.lineWidth = 3; ctx.shadowColor = neon; ctx.shadowBlur = 18;
  ctx.beginPath(); ctx.moveTo(x - 36, y + 30); ctx.lineTo(x, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w + 36, y + 30); ctx.stroke(); ctx.shadowBlur = 0;
  // marquee
  const my = y + 14, mh = 78;
  const mg = ctx.createLinearGradient(x, my, x, my + mh); mg.addColorStop(0, o.m0 ?? '#ffcf4a'); mg.addColorStop(1, o.m1 ?? '#ff6a1f');
  ctx.fillStyle = mg; ctx.beginPath(); ctx.roundRect(x + 20, my, w - 40, mh, 8); ctx.fill();
  G.glow(ctx, 540, my + mh / 2, 320, o.m0 ?? '#ffcf4a', .22);
  const pt = require('./type');
  pt.pixText(ctx, o.marquee ?? 'ARCADE', 540, my + 18, 6, { align: 'center', color: '#1b0d2a', inset: .5 });
  // screen bezel
  const sw = 448, sh = 512, sx = 540 - sw / 2, sy = my + mh + 22;
  ctx.fillStyle = '#000'; ctx.beginPath(); ctx.roundRect(sx - 18, sy - 14, sw + 36, sh + 28, 12); ctx.fill();
  ctx.strokeStyle = rgba(neon, .35); ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(sx - 18, sy - 14, sw + 36, sh + 28, 12); ctx.stroke();
  // control panel lip
  ctx.fillStyle = '#231a38'; ctx.beginPath(); ctx.moveTo(x - 20, y + h - 70); ctx.lineTo(x + w + 20, y + h - 70); ctx.lineTo(x + w + 50, y + h); ctx.lineTo(x - 50, y + h); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(430, y + h - 34, 12, 0, TAU); ctx.fill(); ctx.fillStyle = '#e8262b'; ctx.beginPath(); ctx.arc(430 + Math.sin(t * 5) * 3, y + h - 58, 14, 0, TAU); ctx.fill();
  ctx.strokeStyle = '#111'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(430, y + h - 34); ctx.lineTo(430 + Math.sin(t * 5) * 3, y + h - 56); ctx.stroke();
  [[600, '#ffd23f'], [650, '#3fd4ff'], [700, '#ff3fb5']].forEach(([bx, c]) => { ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(bx, y + h - 40, 15, 9, 0, 0, TAU); ctx.fill(); });
  const S = { x: sx, y: sy, w: sw, h: sh };
  screen(ctx, S.x, S.y, S.w, S.h, content, { r: 8, bg: '#000', glow: .6, scan: .3, pitch: 4, vig: .45 });
  return S;
}
// 1989 handheld
function handheld(ctx, t, content) {
  const x = 365, y = 108, w = 350, h = 640;
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 18;
  const g = ctx.createLinearGradient(x, y, x + w, y + h); g.addColorStop(0, '#d8d5cc'); g.addColorStop(1, '#a9a69c');
  ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(x, y, w, h, [14, 14, 90, 14]); ctx.fill(); ctx.restore();
  ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(x + 1, y + 1, w - 2, h - 2, [14, 14, 90, 14]); ctx.stroke();
  ctx.strokeStyle = 'rgba(0,0,0,.18)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + 18, y + 22); ctx.lineTo(x + w - 18, y + 22); ctx.stroke();
  // bezel
  const bx = x + 25, by = y + 42, bw = w - 50, bh = 270;
  ctx.fillStyle = '#5d5f70'; ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, [10, 10, 40, 10]); ctx.fill();
  ctx.fillStyle = '#d43a3a'; ctx.beginPath(); ctx.arc(bx + 20, by + 110, 5, 0, TAU); ctx.fill(); G.glow(ctx, bx + 20, by + 110, 14, '#ff4040', .6);
  label(ctx, 'BATTERY', bx + 20, by + 132, { size: 7, track: 1, color: '#c9cbe0', alpha: .7 });
  ctx.strokeStyle = '#7d2b4a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(bx + 14, by + 16); ctx.lineTo(bx + bw - 14, by + 16); ctx.stroke();
  ctx.strokeStyle = '#2b3a7a'; ctx.beginPath(); ctx.moveTo(bx + 14, by + 21); ctx.lineTo(bx + bw - 14, by + 21); ctx.stroke();
  // d-pad, A/B, start/select, speaker
  const dy = y + 420;
  ctx.fillStyle = '#26262b'; ctx.fillRect(x + 50, dy - 13, 84, 26); ctx.fillRect(x + 79, dy - 42, 26, 84);
  ctx.fillStyle = '#3a3a42'; ctx.beginPath(); ctx.arc(x + 92, dy, 7, 0, TAU); ctx.fill();
  for (const [ax, ay, l] of [[x + 290, dy - 22, 'A'], [x + 228, dy + 4, 'B']]) {
    ctx.fillStyle = '#9b2357'; ctx.beginPath(); ctx.arc(ax, ay, 21, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(ax, ay, 20, Math.PI, Math.PI * 1.7); ctx.stroke();
    label(ctx, l, ax, ay + 40, { color: '#2b3a7a', size: 12, alpha: .8 });
  }
  for (const [sx, l] of [[x + 130, 'SELECT'], [x + 200, 'START']]) {
    ctx.save(); ctx.translate(sx, y + 520); ctx.rotate(-.45); ctx.fillStyle = '#8f8c86'; ctx.beginPath(); ctx.roundRect(-20, -6, 40, 12, 6); ctx.fill(); ctx.restore();
    label(ctx, l, sx, y + 548, { color: '#2b3a7a', size: 9, alpha: .75 });
  }
  ctx.save(); ctx.translate(x + 270, y + 585); ctx.rotate(-.45); ctx.fillStyle = 'rgba(0,0,0,.25)'; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.roundRect(-30, -24 + i * 9, 60, 4, 2); ctx.fill(); } ctx.restore();
  const S = { x: bx + 30, y: by + 30, w: 240, h: 216 };
  screen(ctx, S.x, S.y, S.w, S.h, content, { r: 3, bg: '#8b9a3c', glow: .12, scan: 0, vig: .25, glass: .6 });
  return S;
}
// beige PC monitor (also the dark terminal variant)
function monitor(ctx, t, content, o = {}) {
  const x = 170, y = 140, w = 740, h = 560, c0 = o.c0 ?? '#e2d9c3', c1 = o.c1 ?? '#b2a78f';
  ctx.fillStyle = shd(c1, -.3); ctx.beginPath(); ctx.moveTo(470, y + h - 10); ctx.lineTo(610, y + h - 10); ctx.lineTo(660, y + h + 50); ctx.lineTo(420, y + h + 50); ctx.closePath(); ctx.fill();
  metal(ctx, x, y, w, h, 22, c0, c1, { rim: 'rgba(255,255,255,.4)' });
  const sx = x + 50, sy = y + 44, sw = 640, sh = 400;
  ctx.fillStyle = shd(c1, -.45); ctx.beginPath(); ctx.roundRect(sx - 18, sy - 18, sw + 36, sh + 36, 20); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,.2)'; for (let i = 0; i < 9; i++) ctx.fillRect(x + w - 190 + i * 14, y + h - 58, 6, 26);
  ctx.fillStyle = o.led ?? '#4cff6a'; ctx.beginPath(); ctx.arc(x + 80, y + h - 46, 5, 0, TAU); ctx.fill(); G.glow(ctx, x + 80, y + h - 46, 16, o.led ?? '#4cff6a', .6);
  label(ctx, o.brand ?? 'PERSONAL COMPUTER', x + 200, y + h - 40, { size: 11, track: 4, color: o.lc ?? '#5b5345', alpha: .7, align: 'left' });
  const S = { x: sx, y: sy, w: sw, h: sh };
  screen(ctx, S.x, S.y, S.w, S.h, content, { r: 16, bg: '#000', glow: .5, scan: .28, pitch: 4, vig: .5, ...o.scr });
  return S;
}
// modern phone
function phone(ctx, t, content, o = {}) {
  const w = 330, h = 660, x = 540 - w / 2, y = 105;
  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.7)'; ctx.shadowBlur = 50; ctx.shadowOffsetY = 20;
  ctx.fillStyle = '#0c0d10'; ctx.beginPath(); ctx.roundRect(x, y, w, h, 52); ctx.fill(); ctx.restore();
  ctx.strokeStyle = '#4a4f58'; ctx.lineWidth = 3; ctx.beginPath(); ctx.roundRect(x, y, w, h, 52); ctx.stroke();
  const S = { x: x + 14, y: y + 14, w: w - 28, h: h - 28 };
  screen(ctx, S.x, S.y, S.w, S.h, content, { r: 40, bg: '#000', glow: .35, scan: 0, vig: .15, glass: .7 });
  ctx.fillStyle = '#000'; ctx.beginPath(); ctx.roundRect(540 - 48, y + 26, 96, 26, 13); ctx.fill();
  return S;
}

module.exports = { lowres, blit, sprite, screen, room, cam, metal, knob, screw, woodPanel, woodTex, label, scope, pdp, tv70, tv80, arcade, handheld, monitor, phone };
