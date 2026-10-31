// Typography for the film: fact cards (odometer year, typed title, two lines), the era timeline along the top,
// and a 5x7 bitmap font for everything that lives "inside" a game screen.
const { W, H, TAU, clamp, lerp, ss, out3, out5, back, rgba, hash } = require('./core');
const G = require('./gfx');
const { CARDS } = require('./cues');

const GOLD = '#f4c36a', CREAM = '#fff3df', SOFT = '#f1dcc0', PHOS = '#7dffb0';

// ---------------------------------------------------------------- 5x7 bitmap font
const FONT = {
  A: '.###.|#...#|#...#|#####|#...#|#...#|#...#', B: '####.|#...#|#...#|####.|#...#|#...#|####.', C: '.###.|#...#|#....|#....|#....|#...#|.###.',
  D: '####.|#...#|#...#|#...#|#...#|#...#|####.', E: '#####|#....|#....|####.|#....|#....|#####', F: '#####|#....|#....|####.|#....|#....|#....',
  G: '.###.|#...#|#....|#.###|#...#|#...#|.####', H: '#...#|#...#|#...#|#####|#...#|#...#|#...#', I: '.###.|..#..|..#..|..#..|..#..|..#..|.###.',
  J: '..###|...#.|...#.|...#.|...#.|#..#.|.##..', K: '#...#|#..#.|#.#..|##...|#.#..|#..#.|#...#', L: '#....|#....|#....|#....|#....|#....|#####',
  M: '#...#|##.##|#.#.#|#.#.#|#...#|#...#|#...#', N: '#...#|#...#|##..#|#.#.#|#..##|#...#|#...#', O: '.###.|#...#|#...#|#...#|#...#|#...#|.###.',
  P: '####.|#...#|#...#|####.|#....|#....|#....', Q: '.###.|#...#|#...#|#...#|#.#.#|#..#.|.##.#', R: '####.|#...#|#...#|####.|#.#..|#..#.|#...#',
  S: '.####|#....|#....|.###.|....#|....#|####.', T: '#####|..#..|..#..|..#..|..#..|..#..|..#..', U: '#...#|#...#|#...#|#...#|#...#|#...#|.###.',
  V: '#...#|#...#|#...#|#...#|#...#|.#.#.|..#..', W: '#...#|#...#|#...#|#.#.#|#.#.#|#.#.#|.#.#.', X: '#...#|#...#|.#.#.|..#..|.#.#.|#...#|#...#',
  Y: '#...#|#...#|.#.#.|..#..|..#..|..#..|..#..', Z: '#####|....#|...#.|..#..|.#...|#....|#####',
  0: '.###.|#...#|#..##|#.#.#|##..#|#...#|.###.', 1: '..#..|.##..|..#..|..#..|..#..|..#..|.###.', 2: '.###.|#...#|....#|...#.|..#..|.#...|#####',
  3: '#####|...#.|..#..|...#.|....#|#...#|.###.', 4: '...#.|..##.|.#.#.|#..#.|#####|...#.|...#.', 5: '#####|#....|####.|....#|....#|#...#|.###.',
  6: '..##.|.#...|#....|####.|#...#|#...#|.###.', 7: '#####|....#|...#.|..#..|.#...|.#...|.#...', 8: '.###.|#...#|#...#|.###.|#...#|#...#|.###.',
  9: '.###.|#...#|#...#|.####|....#|...#.|.##..', '.': '.....|.....|.....|.....|.....|.##..|.##..', '!': '..#..|..#..|..#..|..#..|..#..|.....|..#..',
  '-': '.....|.....|.....|.###.|.....|.....|.....', ':': '.....|.##..|.##..|.....|.##..|.##..|.....', '?': '.###.|#...#|....#|...#.|..#..|.....|..#..',
  '\u00b7': '.....|.....|.....|..#..|.....|.....|.....', ',': '.....|.....|.....|.....|.##..|..#..|.#...', '%': '##..#|##..#|...#.|..#..|.#...|#..##|#..##',
  '$': '..#..|.####|#.#..|.###.|..#.#|####.|..#..', '\u2014': '.....|.....|.....|#####|.....|.....|.....', ' ': '.....|.....|.....|.....|.....|.....|.....',
  '\u2665': '.....|.#.#.|#####|#####|.###.|..#..|.....',
};
const GLYPH = {};
for (const k in FONT) GLYPH[k] = FONT[k].split('|').map((r) => [...r].map((c) => c === '#'));
const pixWidth = (s, p, gap = 1) => s.length * (5 + gap) * p - gap * p;
// draw str with p-sized pixels. o: {align, color, alpha, reveal (0..1 per char count), glow, shadow, grad:[top,bottom]}
function pixText(ctx, str, x, y, p, o = {}) {
  if ((o.alpha ?? 1) <= .002) return 0;
  const gap = o.gap ?? 1, w = pixWidth(str, p, gap);
  let sx = o.align === 'center' ? x - w / 2 : o.align === 'right' ? x - w : x;
  const n = o.reveal === undefined ? str.length : Math.floor(o.reveal * str.length + 1e-6);
  ctx.save();
  ctx.globalAlpha *= o.alpha ?? 1;
  if (o.grad) { const g = ctx.createLinearGradient(0, y, 0, y + 7 * p); o.grad.forEach((c, i) => g.addColorStop(i / (o.grad.length - 1), c)); ctx.fillStyle = g; } else ctx.fillStyle = o.color ?? '#fff';
  if (o.shadow) { ctx.shadowColor = o.shadow; ctx.shadowBlur = o.shadowBlur ?? p * 2; }
  const inset = o.inset ?? 0;
  for (let i = 0; i < n; i++) {
    const g = GLYPH[str[i]] || GLYPH[str[i].toUpperCase()] || GLYPH[' '];
    const k = o.drop ? o.drop(i) : 0;
    for (let r = 0; r < 7; r++) for (let c = 0; c < 5; c++) if (g[r][c]) ctx.fillRect(Math.round(sx + c * p) + inset, Math.round(y + r * p + k) + inset, Math.ceil(p) - 2 * inset, Math.ceil(p) - 2 * inset);
    sx += (5 + gap) * p;
  }
  ctx.restore();
  return w;
}

// ---------------------------------------------------------------- the era timeline (top of frame)
const Y0 = 1955, Y1 = 2026, TX0 = 92, TX1 = 988, TY = 62;
const yearX = (y) => lerp(TX0, TX1, (y - Y0) / (Y1 - Y0));
const cardYear = (c) => (c[2] === 'TODAY' ? 2025 : +c[2]);
// smoothly moving marker year at time t
function markerYear(t) {
  let y = 1958;
  for (let i = 0; i < CARDS.length; i++) {
    const c = CARDS[i], prev = i ? cardYear(CARDS[i - 1]) : 1955;
    if (t >= c[0] - .5) y = lerp(prev, cardYear(c), out3(ss(c[0] - .5, c[0] + .6, t)));
  }
  return y;
}
function timeline(ctx, t, a) {
  if (a <= 0.001) return;
  ctx.save(); ctx.globalAlpha = a;
  const my = markerYear(t), mx = yearX(my);
  // rail
  ctx.strokeStyle = 'rgba(255,240,220,.22)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(TX0, TY); ctx.lineTo(TX1, TY); ctx.stroke();
  const g = ctx.createLinearGradient(TX0, 0, mx, 0); g.addColorStop(0, 'rgba(244,195,106,.15)'); g.addColorStop(1, 'rgba(244,195,106,.95)');
  ctx.strokeStyle = g; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(TX0, TY); ctx.lineTo(mx, TY); ctx.stroke();
  for (let y = 1955; y <= 2025; y += 5) {
    const x = yearX(y), dec = y % 10 === 0, past = y <= my + .01;
    ctx.fillStyle = past ? 'rgba(244,195,106,.9)' : 'rgba(255,240,220,.35)';
    ctx.fillRect(x - 1, TY - (dec ? 8 : 4), 2, dec ? 16 : 8);
    if (dec) G.text(ctx, String(y), x, TY + 30, { font: 'OptB', size: 14, color: past ? '#f7deb0' : '#c9bba6', align: 'center', track: 2, alpha: past ? .9 : .55 });
  }
  // the dots of the cards already passed
  for (const c of CARDS) if (c[0] <= t + .3) { const x = yearX(cardYear(c)); ctx.fillStyle = 'rgba(255,230,180,.85)'; ctx.beginPath(); ctx.arc(x, TY, 3.2, 0, TAU); ctx.fill(); }
  // marker: glowing pixel square + year chip
  G.glow(ctx, mx, TY, 34, GOLD, .55);
  ctx.fillStyle = '#fff6e2'; ctx.fillRect(Math.round(mx - 6), TY - 6, 12, 12);
  ctx.strokeStyle = GOLD; ctx.lineWidth = 2; ctx.strokeRect(Math.round(mx - 10), TY - 10, 20, 20);
  ctx.restore();
}

// ---------------------------------------------------------------- fact card
const BASE = 872;
function card(ctx, t, c) {
  const [a, b, year, title, l1, l2] = c, u = t - a, dur = b - a;
  if (u < -0.05 || u > dur + .05) return;
  const fin = ss(0, .3, u), fout = 1 - ss(dur - .32, dur - .02, u), A = fin * fout;
  if (A <= 0) return;
  const lift = (1 - fout) * -14;
  ctx.save(); ctx.translate(0, lift);
  // year: odometer digits roll up into place, staggered
  const x = 64;
  let cx = x;
  const ys = String(year);
  ctx.save(); ctx.beginPath(); ctx.rect(x - 10, BASE - 92, 520, 112); ctx.clip();
  for (let i = 0; i < ys.length; i++) {
    const ch = ys[i], k = out5(ss(.04 + i * .07, .5 + i * .07, u));
    const w = G.measure(ctx, ch, { font: 'Didot', size: 84 });
    G.text(ctx, ch, cx, BASE + (1 - k) * 96, { font: 'Didot', size: 84, color: GOLD, alpha: A, shadow: 16 });
    cx += w + 2;
  }
  ctx.restore();
  // rule draws out from the year
  const rk = out3(ss(.2, .9, u));
  ctx.strokeStyle = rgba(GOLD, .75 * A); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx + 18, BASE - 28); ctx.lineTo(lerp(cx + 18, W - 64, rk), BASE - 28); ctx.stroke();
  // little pixel badge at the rule's end (a 1-up heart)
  if (rk > .98) pixText(ctx, '\u2665', W - 64 - 18, BASE - 38, 3, { color: '#ff6b6b', alpha: A * ss(.9, 1.1, u), shadow: 'rgba(255,90,90,.7)', shadowBlur: 8 });
  // title types on, with a block cursor
  const n = title.length, typ = clamp((u - .25) / Math.max(.35, Math.min(.9, n * .045)));
  const shown = title.slice(0, Math.floor(typ * n + 1e-6));
  const tw = G.text(ctx, shown, x, BASE + 48, { font: 'OptB', size: 36, color: CREAM, track: 5, alpha: A, shadow: 14 });
  if (u > .2 && (typ < 1 || (Math.floor(u * 2.2) % 2 === 0 && u < 2.2))) { ctx.fillStyle = rgba(PHOS, .9 * A); ctx.fillRect(x + tw + 12, BASE + 20, 16, 30); }
  // the two lines rise in
  const k1 = out3(ss(.55, 1.05, u)), k2 = out3(ss(.75, 1.25, u));
  G.text(ctx, l1, x, BASE + 88 + (1 - k1) * 14, { font: 'IoI', size: 25, color: SOFT, alpha: A * k1 * .96, shadow: 10 });
  if (l2) G.text(ctx, l2, x, BASE + 121 + (1 - k2) * 14, { font: 'IoI', size: 25, color: '#e6c99c', alpha: A * k2 * .9, shadow: 10 });
  ctx.restore();
}
function cards(ctx, t) { for (const c of CARDS) card(ctx, t, c); }
// legibility scrim under the cards
function scrim(ctx, a) {
  if (a <= 0) return;
  const g = ctx.createLinearGradient(0, 720, 0, H);
  g.addColorStop(0, 'rgba(4,4,8,0)'); g.addColorStop(.35, `rgba(4,4,8,${.55 * a})`); g.addColorStop(1, `rgba(4,4,8,${.86 * a})`);
  ctx.fillStyle = g; ctx.fillRect(0, 720, W, H - 720);
  const g2 = ctx.createLinearGradient(0, 0, 0, 130);
  g2.addColorStop(0, `rgba(4,4,8,${.6 * a})`); g2.addColorStop(1, 'rgba(4,4,8,0)');
  ctx.fillStyle = g2; ctx.fillRect(0, 0, W, 130);
}

module.exports = { pixText, pixWidth, GLYPH, timeline, card, cards, scrim, GOLD, CREAM, SOFT, PHOS, yearX };
