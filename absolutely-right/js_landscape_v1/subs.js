// The lyric is the main on-screen text: each line builds word by word in big inked type, key words larger and coloured.
const EMPH = /^(prod|god|ten-x|10x|accept|gpu|lgtm|javascript|career|bot|dev|leetcode|readme|green|screens|right|dead|head|tokens|repo|fast|lasts|stack|fear|exceeded|chat|spot|lunch|call|interview|dread|bed|minutes|fired|babysitting|wrong|tab|vibe|money|hire|clue|tonight|staring|sunday|prompt|weeks|linkedin|bug|ai|nine|coffee|feature|test|eleven|ceo|half|work|confident|polite|deleted|apologized|rewrote|thousand|engineer|future|shipping|standup|stuff|more|tree|robot|juniors|intern|seniors|review|files|founder|podcast|six|steering|craftsman|for-loop|wi-fi's|internet|froze|fifty|window|new|parking|senior|desk|badge|question|manager|breaks|guess|exit|wrote|reviewed|better|four|status)$/;
const SMALL = /^(a|an|the|of|on|in|to|and|at|by|my|it|is|i|i'm|for|with|but|then|so|its|it's|now|that's|who|what|am|be|than|their|all|me|his|he|like|do|up|back|into|just|still|they|where|are|was|did|some|not|nobody's|got|used|we're|said|says|how|this|about|really|out|gonna|'cause|while|hey|when|until|till|off|keep|much|our|can't|won't|i've|you|your)$/;
const KCOL = { in: '#FFD23F', v1: '#FFD23F', p1: '#1FD1F9', c1: '#FFD23F', v2: '#FFD23F', p2: '#FF3D7F', c2: '#FFD23F', b: '#FFD23F', x: '#E11D48', c3: '#1FD1F9', o: '#FFD23F' };
const KTEXT = { x0: 100, cy: 318, maxW: 1080, maxH: 470 };

const TITLE_LINE = { id: 'title', text: "You're absolutely right!", words: [{ text: "You're", start: 0.25, end: 0.6 }, { text: 'absolutely', start: 0.6, end: 1.0 }, { text: 'right!', start: 1.0, end: 1.6 }] };
const KLINES = [TITLE_LINE, ...LINES];
const KL = {};
function kLayout(l) {
  if (KL[l.id]) return KL[l.id];
  const big = /absolutely/i.test(l.text) && l.words.length <= 4;
  const words = l.words.map((w, i) => {
    const key = clean(w.text).replace(/'s$/, '');
    return { ...w, up: w.text.toUpperCase().replace(/["“”]/g, '').replace(/[,;]+$/, '').replace(/\.+$/, ''), emph: big ? /right/i.test(w.text) : EMPH.test(key), small: !big && SMALL.test(clean(w.text)), rot: (hash(i, l.words.length) - 0.5) * 0.07 };
  });
  if (!words.some(w => w.emph)) words.reduce((a, b) => (b.up.length > a.up.length && !b.small ? b : a)).emph = true;
  let S = big ? 172 : 128, rows;
  for (;;) {
    c.font = font(F.cond, S, '900');
    const gap = S * 0.2; rows = [[]]; let x = 0;
    for (const w of words) {
      w.size = S * (w.emph ? 1.28 : w.small ? 0.56 : 1);
      c.font = font(F.cond, w.size, '900'); w.w = c.measureText(w.up).width;
      if (x > 0 && x + gap + w.w > KTEXT.maxW) { rows.push([]); x = 0; }
      if (x > 0) x += gap;
      w.x = x; x += w.w; rows[rows.length - 1].push(w);
    }
    const total = rows.reduce((s, r) => s + Math.max(...r.map(w => w.size)) * 0.94, 0);
    if ((rows.length <= 4 && total <= KTEXT.maxH) || S <= 60) break;
    S -= 6;
  }
  const total = rows.reduce((s, r) => s + Math.max(...r.map(w => w.size)) * 0.94, 0);
  let y = KTEXT.cy - total / 2;
  rows.forEach(r => { const rh = Math.max(...r.map(w => w.size)) * 0.94; y += rh; r.forEach(w => { w.x += KTEXT.x0; w.y = y - rh * 0.1; }); });
  return (KL[l.id] = { words, big });
}

function lyrics(t, P) {
  const col = KCOL[P.key] || '#FFD23F';
  for (let i = 0; i < KLINES.length; i++) {
    const l = KLINES[i], nx = KLINES[i + 1];
    const tIn = l.words[0].start - 0.15, tOut = nx ? nx.words[0].start - 0.16 : DUR;
    if (t < tIn || t > tOut + 0.24) continue;
    const L = kLayout(l), ko = easeIn(clamp((t - tOut) / 0.24));
    c.save(); c.globalAlpha = 1 - ko; c.translate(0, -ko * 70);
    c.textAlign = 'center'; c.textBaseline = 'alphabetic'; c.lineJoin = 'round';
    for (const w of L.words) {
      const d = t - (w.start - 0.06); if (d < 0) continue;
      const k = backOut(clamp(d / 0.26), 2.1), live = t >= w.start - 0.06 && t <= w.end + 0.08;
      const sc = lerp(0.35, 1, k) * (live ? 1.04 : 1);
      at(w.x + w.w / 2, w.y - w.size * 0.35 - (live ? 4 : 0), sc, w.rot * (1 + (1 - k) * 4), () => {
        c.font = font(F.cond, w.size, '900');
        const dp = w.size * 0.07, by = w.size * 0.35;
        c.fillStyle = INK; c.fillText(w.up, dp, by + dp);
        c.strokeStyle = INK; c.lineWidth = w.size * 0.13; c.strokeText(w.up, 0, by);
        c.fillStyle = w.emph ? col : '#FFF7E8'; c.fillText(w.up, 0, by);
      });
    }
    c.restore();
  }
}
