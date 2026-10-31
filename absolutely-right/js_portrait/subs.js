// Word-synced kinetic captions and the HUD.
const EMPH = /^(prod|god|ten-x|10x|accept|gpu|lgtm|javascript|career|bot|dev|leetcode|readme|green|screens|right|dead|head|tokens|repo|fast|lasts|stack|fear|exceeded|chat|spot|lunch|call|interview|dread|bed|minutes|fired|babysitting|wrong|tab|vibe|money|hire|clue|tonight|staring|sunday|prompt|weeks|linkedin|bug|ai|god)$/;
const SUBL = {};
function subLayout(l) {
  if (SUBL[l.id]) return SUBL[l.id];
  const big = /absolutely/i.test(l.text) && l.words.length <= 4;
  const words = l.words.map(w => ({ ...w, up: w.text.toUpperCase(), emph: EMPH.test(clean(w.text).replace(/'s$/, '')) }));
  let size = big ? 96 : 72, rows;
  const maxW = 940;
  for (;;) {
    c.font = font(F.cond, size, '900');
    const sp = size * 0.24;
    rows = [[]]; let x = 0;
    for (const w of words) {
      w.w = c.measureText(w.up).width;
      if (x > 0 && x + sp + w.w > maxW) { rows.push([]); x = 0; }
      if (x > 0) x += sp;
      w.x0 = x; x += w.w; rows[rows.length - 1].push(w);
    }
    if (rows.length <= 3 || size <= 52) break;
    size -= 4;
  }
  const lh = size * 1.1, total = rows.length * lh;
  rows.forEach((r, ri) => {
    const rw = r[r.length - 1].x0 + r[r.length - 1].w;
    r.forEach(w => { w.row = ri; w.x = 540 - rw / 2 + w.x0; w.y = SUB_Y - total / 2 + lh * (ri + 0.5) + size * 0.36; });
  });
  return (SUBL[l.id] = { size, words, big });
}

function subtitles(t, P) {
  for (let i = 0; i < LINES.length; i++) {
    const l = LINES[i], nx = LINES[i + 1];
    const pv = LINES[i - 1], close = pv && l.start - pv.end < 0.6;
    const tIn = l.start - (close ? 0.16 : 0.3), tOut = Math.min(nx ? nx.start - 0.2 : DUR, l.end + 1.6);
    if (t < tIn || t > tOut + 0.16) continue;
    const L = subLayout(l), S = L.size;
    const kin = easeOut((t - tIn) / 0.18), kout = easeIn(clamp((t - tOut) / 0.15));
    c.save(); c.globalAlpha = kin * (1 - kout); c.translate(0, (1 - kin) * 30 - kout * 70);
    let ai = -1;
    for (let j = 0; j < L.words.length; j++) if (t >= L.words[j].start - 0.05) ai = j;
    const lastW = L.words[L.words.length - 1];
    const hlOn = ai >= 0 && (ai < L.words.length - 1 || t < Math.max(lastW.end, lastW.start + 0.35) + 0.15);
    // sliding highlighter
    let hlM = 1;
    if (hlOn) {
      const w = L.words[ai], pw = L.words[ai - 1];
      const m = pw && pw.row === w.row ? easeOut((t - w.start + 0.05) / 0.13) : 1;
      hlM = m;
      const padX = S * 0.15, rect = q => [q.x - padX, q.y - S * 0.84, q.w + padX * 2, S * 1.02];
      const A = pw && pw.row === w.row ? rect(pw) : rect(w), B = rect(w);
      const R = A.map((v, k) => lerp(v, B[k], m));
      const sc = pw && pw.row === w.row ? 1 : backOut(clamp((t - w.start + 0.05) / 0.2), 2.4);
      const col = w.emph ? P.b : P.a;
      at(R[0] + R[2] / 2, R[1] + R[3] / 2, sc, (ai % 2 ? 0.018 : -0.018), () => {
        glow(rgba(col, 0.75), 34);
        fillRR(-R[2] / 2, -R[3] / 2, R[2], R[3], S * 0.2, rgba(col));
        noGlow();
        fillRR(-R[2] / 2 + 4, -R[3] / 2 + 3, R[2] - 8, R[3] * 0.38, S * 0.16, 'rgba(255,255,255,0.22)');
      });
    }
    c.font = font(F.cond, S, '900'); c.textAlign = 'left'; c.textBaseline = 'alphabetic';
    L.words.forEach((w, j) => {
      const sung = t >= w.start - 0.05;
      if (!sung) { c.fillStyle = 'rgba(255,255,255,0.16)'; c.fillText(w.up, w.x, w.y); return; }
      const kp = backOut(clamp((t - w.start + 0.05) / 0.3), 2.2), active = hlOn && j === ai && hlM > 0.55;
      const s = lerp(0.5, 1, kp) * (active ? 1.06 : 1);
      at(w.x + w.w / 2, w.y - S * 0.35 + (1 - kp) * 26, s, 0, () => {
        if (active) c.fillStyle = '#0B0B14';
        else {
          c.shadowColor = 'rgba(0,0,0,0.6)'; c.shadowBlur = 18; c.shadowOffsetY = 6;
          c.fillStyle = w.emph || L.big ? lg(0, -S * 0.7, 0, 0, [[0, rgba(mixc(P.a, '#ffffff', 0.45))], [1, rgba(L.big ? P.a : P.b)]]) : '#FFFFFF';
        }
        c.fillText(w.up, -w.w / 2, S * 0.35);
        noGlow();
      });
    });
    c.restore();
  }
}

function hud(t, P) {
  const k = ease(t, 0.2, 0.6);
  withAlpha(k, () => {
    fillRR(70, 52, 56, 56, 18, rgba(P.a, 0.22));
    rr(70, 52, 56, 56, 18); c.strokeStyle = rgba(P.a, 0.6); c.lineWidth = 2; c.stroke();
    robot(98, 82, 0.18, { t, body: false, shadow: false, mood: 'happy', acc: P.a, bob: 0 });
    text('absolutely-right', 142, 78, { size: 26, font: F.mono });
    text('~/career $ ./survive.sh', 142, 104, { size: 18, font: F.mono, color: 'rgba(255,255,255,0.4)' });
    for (let i = 0; i < 16; i++) {
      const v = band(i + 4, t), h = 3 + v * 34, x = 740 + i * 17;
      fillRR(x, 98 - h, 10, h, 3, rgba(mixc(P.a, P.b, i / 15), 0.25 + 0.6 * v));
    }
  });
}
