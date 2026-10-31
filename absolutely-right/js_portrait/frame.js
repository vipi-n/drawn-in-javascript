// Composites one frame: background, scenes with transitions, captions, HUD, hits and grain.
function glitch(t, g) {
  if (g <= 0.02) return;
  tctx.setTransform(1, 0, 0, 1, 0, 0); tctx.globalAlpha = 1; tctx.clearRect(0, 0, W, H); tctx.drawImage(canvas, 0, 0);
  const f = Math.floor(t * FPS), n = 5 + Math.floor(g * 12);
  for (let i = 0; i < n; i++) {
    const y = VIEW.y0 + hash(i, f) * (STAGE.y1 - STAGE.y0) * VIEW.s, h = 8 + hash(i, f + 1) * 70, dx = (hash(i, f + 2) - 0.5) * 120 * g;
    c.drawImage(tmp, 0, y, W, h, dx, y, W, h);
  }
  c.globalCompositeOperation = 'screen'; c.globalAlpha = 0.35 * g;
  c.drawImage(tmp, 10 * g, 0); c.drawImage(tmp, -10 * g, 0);
  c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
}

function renderFrame(t) {
  c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
  const P = palette(t);
  background(t, P);
  let sx = 0, sy = 0; const flashes = [];
  for (const h of HITS) {
    const d = t - h.t; if (d < 0 || d > 1) continue;
    const e = Math.exp(-d * 7);
    sx += h.shake * e * Math.sin(d * 85 + h.t * 7); sy += h.shake * e * Math.cos(d * 71 + h.t * 3);
    if (h.flash) flashes.push([h.color, h.flash * Math.exp(-d * 6)]);
  }
  const drift = 1 + kick(t, 8, 2) * 0.006 * (0.4 + feat('energy', t));
  GLITCH = 0;
  c.save(); c.translate(sx, sy);
  c.translate(540, VIEW.y0); c.scale(VIEW.s, VIEW.s); c.translate(-540, -STAGE.y0);
  c.translate(STAGE.cx, STAGE.cy); c.scale(drift, drift); c.translate(-STAGE.cx, -STAGE.cy);
  for (const s of SCENES) {
    if (t < s.start || t > s.end + OUT_T) continue;
    const lt = t - s.start, kin = s.start <= 0 ? 1 : easeOut(lt / 0.45), kout = clamp((t - s.end) / OUT_T);
    const sc = (s.start <= 0 ? 1 : lerp(0.9, 1, backOut(clamp(lt / 0.55), 1.3))) * (1 + 0.07 * easeIn(kout));
    c.save();
    c.globalAlpha = clamp(kin * 1.6) * (1 - kout);
    c.translate(STAGE.cx, STAGE.cy + (1 - kin) * 80 - easeIn(kout) * 50); c.scale(sc, sc); c.translate(-STAGE.cx, -STAGE.cy);
    const fn = SC[s.name];
    if (fn) fn(t, s, P, lt);
    c.restore();
  }
  c.restore();
  glitch(t, GLITCH);
  c.save(); c.translate(sx * 0.5, sy * 0.5); hero(t, P); c.restore();
  c.save(); c.translate(sx * 0.3, sy * 0.3); subtitles(t, P); c.restore();
  hud(t, P);
  for (const [col, a] of flashes) { c.globalCompositeOperation = 'screen'; c.fillStyle = rgba(col, clamp(a * 0.5)); c.fillRect(0, 0, W, H); }
  c.globalCompositeOperation = 'source-over';
  finish(t);
  const fade = Math.min(clamp(t / 0.35), clamp((DUR - t) / 1.4));
  if (fade < 1) { c.fillStyle = `rgba(0,0,0,${1 - fade})`; c.fillRect(0, 0, W, H); }
  return canvas;
}
