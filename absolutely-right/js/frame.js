// Composites one frame: comic background, camera, doodles, the shot's card, the kinetic lyric, the cat, wipes and hits.
function glitch(t, g, R) {
  if (g <= 0.02) return;
  tctx.setTransform(1, 0, 0, 1, 0, 0); tctx.globalAlpha = 1; tctx.clearRect(0, 0, W, H); tctx.drawImage(canvas, 0, 0);
  const f = Math.floor(t * FPS), n = 5 + Math.floor(g * 12);
  c.save(); c.beginPath(); c.rect(R.x, R.y, R.w, R.h); c.clip();
  for (let i = 0; i < n; i++) {
    const y = R.y + hash(i, f) * R.h, h = 8 + hash(i, f + 1) * 60, dx = (hash(i, f + 2) - 0.5) * 100 * g;
    c.drawImage(tmp, R.x, y, R.w, h, R.x + dx, y, R.w, h);
  }
  c.globalCompositeOperation = 'screen'; c.globalAlpha = 0.35 * g;
  c.drawImage(tmp, 10 * g, 0); c.drawImage(tmp, -10 * g, 0);
  c.restore(); c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
}

function renderFrame(t) {
  c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
  const P = palette(t);
  let sx = 0, sy = 0; const flashes = [];
  for (const h of HITS) {
    const d = t - h.t; if (d < 0 || d > 1) continue;
    const e = Math.exp(-d * 7);
    sx += h.shake * e * Math.sin(d * 85 + h.t * 7); sy += h.shake * e * Math.cos(d * 71 + h.t * 3);
    if (h.flash) flashes.push([h.color, h.flash * Math.exp(-d * 6)]);
  }
  const drift = 1 + kick(t, 8, 2) * 0.004 * (0.4 + feat('energy', t));
  const [cz, cx, cy] = camera(t);
  GLITCH = 0;
  c.save(); c.translate(sx, sy);
  c.translate(W / 2, H / 2); c.scale(drift, drift);
  c.save(); const bz = 1 + (cz - 1) * 0.5; c.scale(bz, bz); c.translate(-W / 2 + cx * 0.5, -H / 2 + cy * 0.5);
  comicBg(t, P);
  c.restore();
  c.scale(cz, cz); c.translate(-W / 2 + cx, -H / 2 + cy);
  doodles(t, P);
  for (const s of SCENES) {
    if (t < s.start - 0.2 || t > s.end + 0.8) continue;
    if (t >= s.start && t <= s.end + 0.45) drawCard(s, t, P);
    if (GLITCH > 0.02) { glitch(t, GLITCH, PANEL_SCR); GLITCH = 0; }
    lyrics(t, P, s);
  }
  pet(t, P);
  c.restore();
  wipes(t, P);
  for (const [col, a] of flashes) { c.globalCompositeOperation = 'screen'; c.fillStyle = rgba(col, clamp(a * 0.5)); c.fillRect(0, 0, W, H); }
  c.globalCompositeOperation = 'source-over';
  finishComic(t);
  const fade = Math.min(clamp(t / 0.35), clamp((DUR - t) / 1.4));
  if (fade < 1) { c.fillStyle = `rgba(0,0,0,${1 - fade})`; c.fillRect(0, 0, W, H); }
  return canvas;
}
