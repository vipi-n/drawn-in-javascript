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

// ---------------- shots: every scene gets its own composition, card entrance/exit and camera ----------------
// card: [centreX, centreY, scale, rotation]; text: lyric box; cat: [x, feetY, scale, facing]
const LAYOUTS = {
  right: { card: [1415, 520, 0.66, 0.02], text: { x: 110, w: 900, cy: 330, h: 440 }, cat: [330, 1012, 0.9, 1] },
  left: { card: [505, 520, 0.66, -0.02], text: { x: 960, w: 860, cy: 330, h: 440 }, cat: [1590, 1012, 0.9, -1] },
  stack: { card: [960, 702, 0.5, 0.015], text: { x: 960, w: 1560, cy: 200, h: 280, align: 'center' }, cat: [1430, 1012, 0.9, -1] },
  big: { card: [1640, 822, 0.34, 0.06], text: { x: 960, w: 1450, cy: 390, h: 470, align: 'center', base: 168, rot: -0.025 }, cat: [330, 1012, 0.9, 1] },
  closeL: { card: [560, 545, 0.86, -0.012], text: { x: 1090, w: 740, cy: 360, h: 520 }, cat: [1610, 1012, 0.9, -1] },
  closeR: { card: [1360, 545, 0.86, 0.012], text: { x: 110, w: 740, cy: 340, h: 470 }, cat: [320, 1012, 0.9, 1] },
  low: { card: [1380, 395, 0.6, 0.02], text: { x: 110, w: 980, cy: 830, h: 300, rot: -0.015 }, cat: [1760, 1012, 0.9, -1] },
  perch: { card: [1300, 652, 0.56, 0], text: { x: 110, w: 860, cy: 480, h: 560 }, cat: [1430, 379, 0.72, -1], perch: true },
};
const SHOT_LAYOUT = {
  title: 'big', slack: 'right', invite: 'closeL', morning: 'low', prompt: 'perch', ide: 'closeR', time: 'stack', status: 'left',
  linkedin: 'closeR', fired: 'low', babysit: 'perch', standup: 'closeR', leetcode: 'perch', juniors: 'stack', review: 'left',
  podcast: 'right', outage: 'closeL', babysit2: 'low', craft: 'low', wifi: 'closeL', freeze: 'stack', js: 'perch', context: 'closeR',
  parking: 'big', seat: 'left', desk: 'closeL', pager: 'closeR', final: 'big',
};
// the chorus scenes repeat, so their layouts rotate between the three choruses
const CHORUS_LAYOUT = {
  prod: ['big', 'big'], sorry: ['stack', 'perch'], diff: ['closeL', 'closeR'], badge: ['right', 'left', 'right'],
  accept: ['big', 'big', 'big'], ship: ['low', 'stack', 'low'], money: ['left', 'right', 'stack'],
};
const ENTERS = ['pop', 'drop', 'flip', 'rise', 'spin', 'unfold', 'side', 'zoom'], EXITS = ['shrink', 'fall', 'toss', 'flyUp', 'flipOut', 'zoomOut'];
const CAMZ = [[1.0, 0, 0], [1.035, -14, -8], [1.015, 10, -4], [1.045, 0, -12], [1.02, -10, 6], [1.03, 12, -6]];
{
  const seen = {};
  SCENES.forEach((s, i) => {
    s.idx = i;
    const n = seen[s.name] = (seen[s.name] || 0) + 1, ch = CHORUS_LAYOUT[s.name];
    s.lay = { ...LAYOUTS[ch ? ch[(n - 1) % ch.length] : SHOT_LAYOUT[s.name] || 'right'] };
    if (s.name === 'title') s.lay.noCard = true;
    s.enter = ENTERS[(i * 3 + 1) % ENTERS.length]; s.exit = EXITS[(i * 5 + 2) % EXITS.length];
    s.cam = CAMZ[(i * 2 + 1) % CAMZ.length];
  });
}
const sceneAt = t => { let i = 0; while (i + 1 < SCENES.length && SCENES[i + 1].start <= t) i++; return SCENES[i]; };
const cardBob = (s, t) => Math.sin(t * 1.1 + s.idx * 1.7) * 6;
function catSpot(S, t) {
  const [x, y, s, dir] = S.lay.cat;
  return { x, y: y + (S.lay.perch ? cardBob(S, t) : 0), s, dir };
}

const PANEL_SCR = { x: 0, y: 0, w: 0, h: 0 };
function cardPose(s, t) {
  const [cx0, cy0, sc, r0] = s.lay.card, w = STAGE_W * sc, h = STAGE_H * sc, side = cx0 < W / 2 ? -1 : 1;
  let cx = cx0, cy = cy0 + cardBob(s, t), sx = 1, sy = 1, rot = r0 + Math.sin(t * 0.7 + s.idx) * 0.006, a = 1, py = 0;
  const k = clamp((t - s.start) / 0.75);
  switch (s.enter) {
    case 'pop': { const b = backOut(k, 1.7); sx = sy = b; rot += (1 - k) * 0.35 * side; break; }
    case 'drop': cy -= (1 - bounceOut(k)) * (cy0 + h); rot += (1 - k) * 0.2 * side; break;
    case 'rise': cy += (1 - backOut(k, 1.3)) * (H - cy0 + h * 0.6); rot -= (1 - k) * 0.15 * side; break;
    case 'flip': sx = Math.max(0.02, backOut(k, 1.4)); break;
    case 'spin': { const e = expoOut(k); sx = sy = e; rot += (1 - e) * Math.PI * side; break; }
    case 'unfold': sy = Math.max(0.02, elastic(k)); py = -h / 2; break;
    case 'side': cx += (1 - backOut(k, 1.2)) * side * (W / 2 + w); rot += (1 - k) * 0.12 * side; break;
    case 'zoom': { const e = expoOut(k); sx = sy = lerp(2.0, 1, e); a = clamp(k * 3); break; }
  }
  const eo = clamp((t - s.end) / 0.42);
  if (eo > 0) {
    const e = easeIn(eo);
    switch (s.exit) {
      case 'shrink': sx *= 1 - e; sy *= 1 - e; rot += e * 0.5 * side; break;
      case 'fall': cy += e * 1000; rot += e * 0.6 * side; break;
      case 'toss': cx += e * side * 1500; rot += e * 0.7 * side; break;
      case 'flyUp': cy -= e * 1100; rot -= e * 0.3 * side; break;
      case 'flipOut': sx *= Math.max(0.01, 1 - e); break;
      case 'zoomOut': sx *= 1 + e * 0.7; sy *= 1 + e * 0.7; a *= 1 - eo; break;
    }
  }
  return { cx, cy, w, h, sc, sx, sy, rot, a, py };
}

function drawCard(s, t, P) {
  if (s.lay.noCard) return;
  const q = cardPose(s, t), { w, h } = q;
  if (q.a <= 0.01 || q.sx < 0.01 || q.sy < 0.01) return;
  PANEL_SCR.x = q.cx - w / 2; PANEL_SCR.y = q.cy - h / 2; PANEL_SCR.w = w; PANEL_SCR.h = h;
  c.save(); c.globalAlpha = q.a; c.translate(q.cx, q.cy + q.py); c.rotate(q.rot); c.scale(q.sx, q.sy); c.translate(-w / 2, -h / 2 - q.py);
  const back = s.idx % 3, R = 22;
  if (back === 0) { rr(18, 20, w, h, R); c.fillStyle = rgba(P.a); c.fill(); rr(18, 20, w, h, R); c.strokeStyle = INK; c.lineWidth = 8; c.stroke(); }
  else if (back === 1) { rr(14, 18, w, h, R); c.fillStyle = 'rgba(18,12,28,0.8)'; c.fill(); }
  else { rr(-16, 18, w, h, R); c.fillStyle = '#FFF3DC'; c.fill(); rr(-16, 18, w, h, R); c.strokeStyle = INK; c.lineWidth = 8; c.stroke(); }
  rr(0, 0, w, h, R); c.fillStyle = INK; c.fill();
  c.save(); rr(0, 0, w, h, R); c.clip();
  c.fillStyle = lg(0, 0, 0, h, [[0, rgba(mixc(P.bg, '#232A66', 0.45))], [1, rgba(mixc(P.bg, '#05050F', 0.35))]]); c.fillRect(0, 0, w, h);
  withAlpha(0.45, () => c.drawImage(GRID, 0, 0));
  c.save(); c.scale(q.sc, q.sc); c.translate(-STAGE.x0, -STAGE.y0);
  const fn = SC[s.name]; if (fn) fn(t, s, P, t - s.start);
  c.restore();
  c.restore();
  rr(0, 0, w, h, R); c.strokeStyle = INK; c.lineWidth = 10; c.stroke();
  rr(6, 6, w - 12, h - 12, R - 5); c.strokeStyle = 'rgba(255,255,255,0.2)'; c.lineWidth = 2; c.stroke();
  if (s.idx % 2) [[60, -4, -0.32], [w - 60, -4, 0.3]].forEach(([x, y, a]) => at(x, y, 1, a, () => {
    fillRR(-52, -15, 104, 30, 4, 'rgba(255,238,176,0.92)'); rr(-52, -15, 104, 30, 4); c.strokeStyle = 'rgba(18,12,28,0.25)'; c.lineWidth = 2; c.stroke();
  }));
  else [[34, 30], [w - 34, 30]].forEach(([x, y]) => { circle(x + 2, y + 4, 13, 'rgba(0,0,0,0.35)'); circle(x, y, 13, '#FF3D7F'); ring(x, y, 13, INK, 4); circle(x - 4, y - 4, 4, 'rgba(255,255,255,0.7)'); });
  c.restore();
}

// slow camera: each shot has its own framing; the camera glides between them and creeps in during a shot
function camAt(s, t) { const k = clamp((t - s.start) / Math.max(1, s.end - s.start)); return [s.cam[0] + 0.014 * k, s.cam[1], s.cam[2]]; }
function camera(t) {
  let i = 0; while (i + 1 < SCENES.length && SCENES[i + 1].start <= t) i++;
  const cur = camAt(SCENES[i], t); if (!i) return cur;
  const prev = camAt(SCENES[i - 1], SCENES[i].start), m = easeInOut((t - SCENES[i].start) / 1.4);
  return cur.map((v, j) => lerp(prev[j], v, m));
}

// small ink doodles drifting through the frame so it never sits still
const DOOD = Array.from({ length: 16 }, (_, i) => ({ x: hash(i, 11) * W, y: hash(i, 12) * H, s: 0.6 + hash(i, 13) * 0.7, k: i % 6, v: 12 + hash(i, 14) * 22, r: hash(i, 15) * TAU }));
function doodles(t, P) {
  c.lineJoin = 'round'; c.lineCap = 'round';
  for (const d of DOOD) {
    const y = ((d.y - t * d.v) % (H + 200) + H + 200) % (H + 200) - 100, x = d.x + Math.sin(t * 0.5 + d.r) * 30, rot = d.r + t * 0.35 * (d.k % 2 ? 1 : -1);
    at(x, y, d.s, rot, () => withAlpha(0.55, () => {
      c.strokeStyle = INK; c.lineWidth = 5;
      if (d.k === 0) { star(0, 0, 24, '#FFF7E8'); c.stroke(); }
      else if (d.k === 1) { fillRR(-24, -8, 48, 16, 6, '#FFF7E8'); fillRR(-8, -24, 16, 48, 6, '#FFF7E8'); }
      else if (d.k === 2) { ring(0, 0, 18, INK, 12); ring(0, 0, 18, '#FFF7E8', 6); }
      else if (d.k === 3) { c.beginPath(); for (let i = 0; i <= 12; i++) { const xx = -40 + i * 7, yy = Math.sin(i * 1.2 + t * 3) * 8; i ? c.lineTo(xx, yy) : c.moveTo(xx, yy); } c.lineWidth = 11; c.stroke(); c.strokeStyle = rgba(P.a); c.lineWidth = 5; c.stroke(); }
      else if (d.k === 4) { c.font = font(F.cond, 46, '900'); c.textAlign = 'center'; c.lineWidth = 8; c.strokeText('</>', 0, 16); c.fillStyle = '#FFF7E8'; c.fillText('</>', 0, 16); }
      else { c.beginPath(); c.moveTo(0, -22); c.lineTo(20, 14); c.lineTo(-20, 14); c.closePath(); c.fillStyle = rgba(P.b); c.fill(); c.stroke(); }
    }));
  }
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
