// Pop-art look: sunburst / swirl / halftone backgrounds, taped comic panels, wipes, giant punch words and the ink caption strip.
const INK = '#120C1C';
const BG = {
  in: { st: 'dots', c: ['#1B2150', '#2C3580'] },
  v1: { st: 'swirl', c: ['#0F6AA6', '#F2862B'] },
  p1: { st: 'burst', c: ['#FF5FA2', '#FFC93C'] },
  c1: { st: 'burst', c: ['#D91C34', '#FF7A2F'] },
  v2: { st: 'burst', c: ['#2459E8', '#58B0FF'] },
  p2: { st: 'burst', c: ['#FFB81F', '#FF6A1A'] },
  c2: { st: 'burst', c: ['#B3125A', '#FF4D4D'] },
  b: { st: 'spot', c: ['#0A0F2E', '#1F2F85'] },
  x: { st: 'news', c: ['#EFE7D4', '#D9CEB5'] },
  c3: { st: 'burst', c: ['#FFC93C', '#FF3D7F'] },
  o: { st: 'swirl', c: ['#3A1D78', '#FF6B35'] },
};

function halftone(col, spacing, maxR, fx, fy, reach) {
  c.fillStyle = col; c.beginPath();
  for (let y = spacing / 2; y < H; y += spacing) for (let x = ((y / spacing | 0) % 2 ? spacing : spacing / 2); x < W; x += spacing) {
    const r = maxR * clamp(1 - Math.hypot(x - fx, y - fy) / reach);
    if (r > 0.8) { c.moveTo(x + r, y); c.arc(x, y, r, 0, TAU); }
  }
  c.fill();
}
function burst(t, c0, c1) {
  const cx = W * 0.5, cy = H * 0.52, n = 22, R = 2600, k = kick(t, 6, 2), rot = t * 0.06;
  c.fillStyle = c0; c.fillRect(0, 0, W, H); c.fillStyle = c1;
  for (let i = 0; i < n; i += 2) {
    const a0 = rot + i / n * TAU, a1 = rot + (i + 1) / n * TAU;
    c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + Math.cos(a0) * R, cy + Math.sin(a0) * R); c.lineTo(cx + Math.cos(a1) * R, cy + Math.sin(a1) * R); c.closePath(); c.fill();
  }
  const g = c.createRadialGradient(cx, cy, 0, cx, cy, 900 * (1 + 0.06 * k)); g.addColorStop(0, 'rgba(255,255,255,0.4)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  halftone('rgba(0,0,0,0.16)', 26, 11, 0, H, 1100); halftone('rgba(0,0,0,0.12)', 26, 9, W, 0, 900);
}
function swirl(t, c0, c1) {
  const cx = W * 0.5, cy = H * 0.46, N = 28, sp = t * 1.1, fr = sp % 1, base = Math.floor(sp);
  c.fillStyle = c0; c.fillRect(0, 0, W, H);
  for (let i = N; i >= 0; i--) {
    const u = i + fr, r = Math.pow(u / N, 1.7) * 1900, ox = Math.cos(u * 0.3 - t * 0.6) * u * 5, oy = Math.sin(u * 0.3 - t * 0.6) * u * 4;
    circle(cx + ox, cy + oy, r, (i + base) % 2 ? c1 : c0);
  }
  const g = c.createRadialGradient(cx, cy, 0, cx, cy, 700); g.addColorStop(0, 'rgba(10,10,30,0.6)'); g.addColorStop(1, 'rgba(10,10,30,0)');
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  halftone('rgba(0,0,0,0.18)', 26, 11, 0, H, 1000);
}
function spot(t, c0, c1) {
  c.fillStyle = lg(0, 0, 0, H, [[0, c0], [1, c1]]); c.fillRect(0, 0, W, H);
  const cx = W * 0.5 + Math.sin(t * 0.5) * 120;
  c.beginPath(); c.moveTo(cx - 70, -20); c.lineTo(cx + 70, -20); c.lineTo(cx + 760, H); c.lineTo(cx - 760, H); c.closePath();
  c.fillStyle = lg(0, 0, 0, H, [[0, 'rgba(255,255,255,0.28)'], [1, 'rgba(255,255,255,0.03)']]); c.fill();
  halftone('rgba(255,255,255,0.07)', 28, 8, W / 2, 0, 1300);
}
function news(t, c0, c1) {
  c.fillStyle = lg(0, 0, 0, H, [[0, c0], [1, c1]]); c.fillRect(0, 0, W, H);
  halftone('rgba(20,12,28,0.55)', 30, 14, 0, H, 1200); halftone('rgba(20,12,28,0.4)', 30, 11, W, 0, 1000);
}
function dots(t, c0, c1) {
  c.fillStyle = lg(0, 0, W, H, [[0, c0], [1, c1]]); c.fillRect(0, 0, W, H);
  halftone('rgba(255,255,255,0.1)', 30, 9, W * 0.5, H * 0.5, 1300);
  for (let i = 0; i < 14; i++) {
    const x = (hash(i, 1) * W + t * 20 * (1 + hash(i, 2))) % W, y = hash(i, 3) * H;
    withAlpha(0.18, () => text(GLYPHS[i % GLYPHS.length], x, y, { size: 56, font: F.mono, color: '#fff' }));
  }
}
const BGFN = { burst, swirl, spot, news, dots };
function comicBg(t, P) {
  let i = 0; while (i + 1 < SEC_STARTS.length && SEC_STARTS[i + 1].t <= t) i++;
  const cur = BG[SEC_STARTS[i].s], prev = i ? BG[SEC_STARTS[i - 1].s] : cur, k = smooth((t - SEC_STARTS[i].t) / 0.4);
  if (k < 1) BGFN[prev.st](t, prev.c[0], prev.c[1]);
  withAlpha(k, () => BGFN[cur.st](t, cur.c[0], cur.c[1]));
}

// a stage floor in front of the background for the engineer to stand on
function floor(t, P) {
  c.fillStyle = lg(0, FLOOR_Y, 0, H, [[0, 'rgba(18,12,28,0.38)'], [1, 'rgba(18,12,28,0.72)']]); c.fillRect(0, FLOOR_Y, W, H - FLOOR_Y);
  c.strokeStyle = 'rgba(255,255,255,0.1)'; c.lineWidth = 2; c.beginPath();
  for (let i = -12; i <= 12; i++) { c.moveTo(W / 2 + i * 60, FLOOR_Y); c.lineTo(W / 2 + i * 260, H); }
  for (let j = 1; j < 6; j++) { const y = FLOOR_Y + (H - FLOOR_Y) * Math.pow(j / 6, 1.6); c.moveTo(0, y); c.lineTo(W, y); }
  c.stroke();
  c.fillStyle = INK; c.fillRect(0, FLOOR_Y - 3, W, 7);
}

// ---------------- the lyric visual: a small card pinned on the right ----------------
SCENES.forEach((s, i) => { s.idx = i; });
const PANEL_SCR = { x: 0, y: 0, w: 0, h: 0 };

function drawPanel(s, t, P, lt) {
  const kb = backOut(clamp(lt / 0.55), 1.2), ko = easeIn(clamp((t - s.end) / OUT_T));
  const px = W - 80 - PANEL.w, rot = ((s.idx % 2) ? 0.022 : -0.018) + Math.sin(t * 0.7 + s.idx) * 0.004 + (1 - kb) * 0.12 + ko * 0.25;
  const cx = px + PANEL.w / 2 + (1 - kb) * 900, cy = PANEL.y + PANEL.h / 2 + ko * 900;
  PANEL_SCR.x = cx - PANEL.w / 2; PANEL_SCR.y = cy - PANEL.h / 2; PANEL_SCR.w = PANEL.w; PANEL_SCR.h = PANEL.h;
  c.save(); c.translate(cx, cy); c.rotate(rot); c.translate(-PANEL.w / 2, -PANEL.h / 2);
  rr(16, 18, PANEL.w, PANEL.h, 24); c.fillStyle = 'rgba(18,12,28,0.85)'; c.fill();
  rr(0, 0, PANEL.w, PANEL.h, 24); c.fillStyle = INK; c.fill();
  c.save(); rr(0, 0, PANEL.w, PANEL.h, 24); c.clip();
  c.fillStyle = lg(0, 0, 0, PANEL.h, [[0, rgba(mixc(P.bg, '#232A66', 0.45))], [1, rgba(mixc(P.bg, '#05050F', 0.35))]]); c.fillRect(0, 0, PANEL.w, PANEL.h);
  withAlpha(0.45, () => c.drawImage(GRID, 0, 0));
  c.save(); c.scale(PANEL.scale, PANEL.scale); c.translate(-STAGE.x0, -STAGE.y0);
  const fn = SC[s.name]; if (fn) fn(t, s, P, lt);
  c.restore();
  c.restore();
  rr(0, 0, PANEL.w, PANEL.h, 24); c.strokeStyle = INK; c.lineWidth = 10; c.stroke();
  rr(6, 6, PANEL.w - 12, PANEL.h - 12, 19); c.strokeStyle = 'rgba(255,255,255,0.2)'; c.lineWidth = 2; c.stroke();
  [[60, -4, -0.32], [PANEL.w - 60, -4, 0.3]].forEach(([x, y, a]) => at(x, y, 1, a, () => {
    fillRR(-52, -15, 104, 30, 4, 'rgba(255,238,176,0.92)'); rr(-52, -15, 104, 30, 4); c.strokeStyle = 'rgba(18,12,28,0.25)'; c.lineWidth = 2; c.stroke();
  }));
  c.restore();
}

// coloured stripes sweep across only when the song section changes
function wipes(t, P) {
  for (let i = 1; i < SEC_STARTS.length; i++) {
    const k = (t - (SEC_STARTS[i].t - 0.25)) / 0.6; if (k <= 0 || k >= 1) continue;
    const x = lerp(-700, W + 1100, easeInOut(k));
    [[INK, -230], [P.b, -110], [P.a, 0]].forEach(([col, off]) => {
      c.beginPath(); c.moveTo(x + off, -10); c.lineTo(x + off + 300, -10); c.lineTo(x + off + 40, H + 10); c.lineTo(x + off - 260, H + 10); c.closePath();
      c.fillStyle = Array.isArray(col) ? rgba(col) : col; c.fill();
    });
  }
}

function finishComic(t) {
  c.globalAlpha = 0.45; c.drawImage(VIGN, 0, 0); c.globalAlpha = 1;
  c.globalCompositeOperation = 'overlay'; c.globalAlpha = 0.1;
  c.drawImage(GRAIN[Math.floor(t * FPS) % GRAIN.length], 0, 0, W, H);
  c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
}
