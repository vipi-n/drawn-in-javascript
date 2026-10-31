// The lyric is the main on-screen text: each line builds word by word in big inked type inside its shot's text box.
// Lines rotate through entrance/exit styles, and some words act out their meaning.
const EMPH = /^(prod|god|ten-x|10x|accept|gpu|lgtm|javascript|career|bot|dev|leetcode|readme|green|screens|right|dead|head|tokens|repo|fast|lasts|stack|fear|exceeded|chat|spot|lunch|call|interview|dread|bed|minutes|fired|babysitting|wrong|tab|vibe|money|hire|clue|tonight|staring|sunday|prompt|weeks|linkedin|bug|ai|nine|coffee|feature|test|eleven|ceo|half|work|confident|polite|deleted|apologized|rewrote|thousand|engineer|future|shipping|standup|stuff|more|tree|robot|juniors|intern|seniors|review|files|founder|podcast|six|steering|craftsman|for-loop|wi-fi's|internet|froze|fifty|window|new|parking|senior|desk|badge|question|manager|breaks|guess|exit|wrote|reviewed|better|four|status|down)$/;
const SMALL = /^(a|an|the|of|on|in|to|and|at|by|my|it|is|i|i'm|for|with|but|then|so|its|it's|now|that's|who|what|am|be|than|their|all|me|his|he|like|do|up|back|into|just|still|they|where|are|was|did|some|not|nobody's|got|used|we're|said|says|how|this|about|really|out|gonna|'cause|while|hey|when|until|till|off|keep|much|our|can't|won't|i've|you|your)$/;
const KCOL = { in: '#FFD23F', v1: '#FFD23F', p1: '#1FD1F9', c1: '#FFD23F', v2: '#FFD23F', p2: '#FF3D7F', c2: '#FFD23F', b: '#FFD23F', x: '#E11D48', c3: '#1FD1F9', o: '#FFD23F' };
// word -> effect it performs once it has landed
const WFX = {
  deleted: 'glitch', exceeded: 'glitch', career: 'glitch', chat: 'glitch', prod: 'shake', fired: 'shake', tokens: 'shake', panic: 'shake',
  down: 'sink', bed: 'sink', dead: 'tip', lost: 'tip', head: 'tip', wrong: 'wobble', bot: 'wobble', clue: 'wobble', bug: 'wobble',
  froze: 'ice', fear: 'shiver', staring: 'ice', dread: 'shiver', scared: 'shiver', fast: 'speed', shipping: 'speed',
  money: 'gold', lasts: 'gold', green: 'green', lgtm: 'green', right: 'beat', accept: 'beat', 'ten-x': 'beat', thousand: 'beat', god: 'halo',
};
const WFX_COL = { glitch: '#FF3B5C', shake: '#FF3B5C', ice: '#9BE7FF', shiver: '#C4B5FD', gold: '#FFD23F', green: '#4ADE80', halo: '#FFE58A', tip: '#B8C0CC' };
const TSTYLES = ['pop', 'slam', 'drop', 'rise', 'flip', 'stretch', 'swing'], TEXITS = ['up', 'scatter', 'fall', 'shrink', 'zoom', 'left'];

const TITLE_LINE = { id: 'title', text: "You're absolutely right!", words: [{ text: "You're", start: 0.25, end: 0.6 }, { text: 'absolutely', start: 0.6, end: 1.0 }, { text: 'right!', start: 1.0, end: 1.6 }] };
const KLINES = [TITLE_LINE, ...LINES];
const LINE_SCENE = { title: SCENES[0] };
SCENES.forEach(s => s.lines.forEach(l => { LINE_SCENE[l.id] = s; }));
KLINES.forEach((l, i) => {
  const big = /absolutely/i.test(l.text) && l.words.length <= 4;
  l.style = big ? 'slam' : /^x-/.test(l.id) ? 'type' : /-9$/.test(l.id) ? 'slam' : TSTYLES[(i * 3 + 1) % TSTYLES.length];
  l.exitStyle = TEXITS[(i * 5 + 2) % TEXITS.length];
});

const KL = {};
function kLayout(l) {
  if (KL[l.id]) return KL[l.id];
  const B = LINE_SCENE[l.id].lay.text, center = B.align === 'center';
  const big = /absolutely/i.test(l.text) && l.words.length <= 4;
  const words = l.words.map((w, i) => {
    const key = clean(w.text).replace(/'s$/, ''), raw = clean(w.text);
    return {
      ...w, up: w.text.toUpperCase().replace(/["“”]/g, '').replace(/[,;]+$/, '').replace(/\.+$/, ''),
      emph: big ? /right/i.test(w.text) : EMPH.test(key), small: !big && SMALL.test(raw), fx: WFX[key] || WFX[raw] || null,
      rot: (hash(i, l.words.length) - 0.5) * 0.07, i,
    };
  });
  if (!words.some(w => w.emph)) words.reduce((a, b) => (b.up.length > a.up.length && !b.small ? b : a)).emph = true;
  let S = (B.base || (B.w < 800 ? 116 : 128)) * (big ? 1.3 : 1), rows;
  for (;;) {
    rows = [[]]; let x = 0, prev = S;
    for (const w of words) {
      w.size = S * (w.emph ? 1.28 : w.small ? 0.56 : 1);
      c.font = font(F.cond, w.size, '900'); w.w = c.measureText(w.up).width;
      const gap = Math.max(S * 0.2, (prev + w.size) * 0.13); prev = w.size;
      if (x > 0 && x + gap + w.w > B.w) { rows.push([]); x = 0; }
      if (x > 0) x += gap;
      w.x = x; x += w.w; rows[rows.length - 1].push(w);
    }
    const total = rows.reduce((s, r) => s + Math.max(...r.map(w => w.size)) * 0.94, 0);
    if ((rows.length <= 4 && total <= B.h) || S <= 56) break;
    S -= 6;
  }
  const total = rows.reduce((s, r) => s + Math.max(...r.map(w => w.size)) * 0.94, 0);
  let y = B.cy - total / 2;
  rows.forEach(r => {
    const rh = Math.max(...r.map(w => w.size)) * 0.94, rw = r[r.length - 1].x + r[r.length - 1].w, ox = center ? B.x - rw / 2 : B.x;
    y += rh; r.forEach(w => { w.x += ox; w.y = y - rh * 0.1; });
  });
  return (KL[l.id] = { words, big, B });
}

// entrance transform for one word, k = 0..1 through its entrance
function wordIn(style, k, w) {
  const o = { dx: 0, dy: 0, sx: 1, sy: 1, rot: w.rot, a: 1, px: 0 };
  if (style === 'pop') { const s = lerp(0.3, 1, backOut(k, 2.1)); o.sx = o.sy = s; o.rot = w.rot * (1 + (1 - k) * 4); o.a = clamp(k * 4); }
  else if (style === 'slam') { const s = lerp(2.5, 1, easeOut(k)); o.sx = o.sy = s; o.a = clamp(k * 3); }
  else if (style === 'drop') { o.dy = -(1 - bounceOut(k)) * 230; o.a = clamp(k * 4); o.rot = w.rot * (1 + (1 - k) * 3); }
  else if (style === 'rise') { o.dy = (1 - expoOut(k)) * w.size * 0.9; o.clip = true; }
  else if (style === 'flip') { o.sx = Math.max(0.02, backOut(k, 1.8)); o.a = clamp(k * 5); }
  else if (style === 'stretch') { o.sy = Math.max(0.02, elastic(k)); o.sx = lerp(1.5, 1, easeOut(k)); o.a = clamp(k * 5); }
  else if (style === 'swing') { o.rot = w.rot + (1 - elastic(k)) * -1.1; o.px = -w.w / 2; o.a = clamp(k * 5); }
  return o;
}
function wordOut(style, e, w, o) {
  const q = easeIn(e);
  if (style === 'up') { o.dy -= q * 100; o.a *= 1 - e; }
  else if (style === 'scatter') { o.dx += (hash(w.i, 7) - 0.5) * 1100 * q; o.dy += (hash(w.i, 9) - 0.65) * 800 * q; o.rot += (hash(w.i, 3) - 0.5) * 2.4 * e; o.a *= 1 - e * 0.85; }
  else if (style === 'fall') { o.dy += q * 760; o.rot += (hash(w.i, 5) - 0.5) * 1.4 * e; }
  else if (style === 'shrink') { o.sx *= 1 - q; o.sy *= 1 - q; }
  else if (style === 'zoom') { o.sx *= 1 + e * 0.8; o.sy *= 1 + e * 0.8; o.a *= 1 - e; }
  else if (style === 'left') { o.dx -= q * 1500; o.rot -= q * 0.15; }
}

function inkWord(s, size, fill, fx, t) {
  const dp = size * 0.07, by = size * 0.35;
  c.fillStyle = INK; c.fillText(s, dp, by + dp);
  if (fx === 'glitch') { const j = Math.floor(t * 18); c.fillStyle = 'rgba(0,229,255,0.85)'; c.fillText(s, -6 + (hash(j, 1) - 0.5) * 8, by); c.fillStyle = 'rgba(255,0,140,0.85)'; c.fillText(s, 6 + (hash(j, 2) - 0.5) * 8, by); }
  c.strokeStyle = INK; c.lineWidth = size * 0.13; c.strokeText(s, 0, by);
  c.fillStyle = fill; c.fillText(s, 0, by);
}

// draws only the lines of shot S, so a newer shot always layers over the one leaving
function lyrics(t, P, S) {
  const col = KCOL[P.key] || '#FFD23F';
  for (let i = 0; i < KLINES.length; i++) {
    const l = KLINES[i], nx = KLINES[i + 1];
    if (S && LINE_SCENE[l.id] !== S) continue;
    const n = l.words.length, nStart = nx ? nx.words[0].start : DUR + 1;
    const tIn = l.words[0].start - 0.15, tOut = nx ? Math.max(l.words[n - 1].start + 0.2, nStart - 0.3) : DUR;
    const outLen = 0.24 + n * 0.012;
    if (t < tIn || t > tOut + outLen) continue;
    const L = kLayout(l), B = L.B;
    c.save();
    if (B.rot) { c.translate(B.x, B.cy); c.rotate(B.rot); c.translate(-B.x, -B.cy); }
    c.textAlign = 'center'; c.textBaseline = 'alphabetic'; c.lineJoin = 'round';
    for (const w of L.words) {
      const t0 = w.start - 0.06, d = t - t0; if (d < 0) continue;
      const dur = l.style === 'slam' ? 0.22 : l.style === 'type' ? Math.max(0.15, w.end - w.start) : 0.32;
      const k = clamp(d / dur), o = wordIn(l.style, k, w), landed = d > dur;
      const live = t >= t0 && t <= w.end + 0.08;
      const e = clamp((t - tOut - w.i * 0.012) / 0.24);
      if (e > 0) wordOut(l.exitStyle, e, w, o);
      if (o.a <= 0.01 || o.sx <= 0.01 || o.sy <= 0.01) continue;
      // the word acting out its meaning
      let fill = w.emph ? col : '#FFF7E8';
      if (w.fx && WFX_COL[w.fx]) fill = WFX_COL[w.fx];
      const ld = Math.max(0, d - dur);
      if (landed && w.fx) {
        if (w.fx === 'shake' || w.fx === 'glitch') { o.dx += Math.sin(t * 61) * 4; o.dy += Math.cos(t * 53) * 3; }
        else if (w.fx === 'sink') { o.dy += easeOut(ld / 0.6) * w.size * 0.22; o.rot += easeOut(ld / 0.6) * 0.06; }
        else if (w.fx === 'tip') { o.rot += backOut(clamp(ld / 0.5), 2) * 0.22; o.dy += easeOut(ld / 0.5) * w.size * 0.1; }
        else if (w.fx === 'wobble') o.rot += Math.sin(t * 7 + w.i) * 0.09;
        else if (w.fx === 'ice' || w.fx === 'shiver') o.dx += Math.sin(t * 80 + w.i) * 2.5;
        else if (w.fx === 'beat') { const b = kick(t, 10, 1) * 0.07; o.sx *= 1 + b; o.sy *= 1 + b; }
      }
      if (w.emph && landed && !w.fx) { const b = kick(t, 9, 2) * 0.025; o.sx *= 1 + b; o.sy *= 1 + b; }
      const sc = live && landed ? 1.04 : 1;
      const cx = w.x + w.w / 2 + o.dx, cy = w.y - w.size * 0.35 + o.dy - (live ? 4 : 0);
      c.save(); c.globalAlpha *= o.a; c.translate(cx + o.px, cy); c.rotate(o.rot); c.translate(-o.px, 0);
      if (w.fx === 'speed') c.transform(1, 0, -0.22, 1, 0, 0);
      c.scale(o.sx * sc, o.sy * sc);
      if (o.clip && !landed) { c.beginPath(); c.rect(-w.w / 2 - w.size * 0.3, -w.size * 0.75 - o.dy, w.w + w.size * 0.6, w.size * 1.35); c.clip(); }
      c.font = font(F.cond, w.size, '900');
      if (w.fx === 'speed' && landed) for (let j = 0; j < 4; j++) { const ph = (t * 3 + j * 0.25) % 1; withAlpha(0.8 * (1 - ph), () => line(-w.w / 2 - 30 - ph * 140, -w.size * 0.25 + j * w.size * 0.18, -w.w / 2 - 110 - ph * 160, -w.size * 0.25 + j * w.size * 0.18, '#FFF7E8', 7)); }
      if (w.fx === 'halo' && landed) { c.beginPath(); c.ellipse(0, -w.size * 0.62 + Math.sin(t * 3) * 4, w.w * 0.32, w.size * 0.09, 0, 0, TAU); c.strokeStyle = INK; c.lineWidth = 16; c.stroke(); c.strokeStyle = '#FFE58A'; c.lineWidth = 8; c.stroke(); }
      if (w.fx === 'gold') fill = lg(0, -w.size * 0.55, 0, w.size * 0.3, [[0, '#FFF3B0'], [0.5, '#FFD23F'], [1, '#F59E0B']]);
      if (l.style === 'type') {
        const str = w.up.slice(0, Math.max(1, Math.ceil(w.up.length * clamp(k * 1.3))));
        c.save(); c.translate(-w.w / 2, 0); c.textAlign = 'left'; inkWord(str, w.size, fill, landed ? w.fx : null, t);
        if (!landed || (live && (t * 4 | 0) % 2)) fillRR(c.measureText(str).width + 8, -w.size * 0.4, w.size * 0.14, w.size * 0.72, 3, '#FFF7E8');
        c.restore();
      } else inkWord(w.up, w.size, fill, landed ? w.fx : null, t);
      if (w.fx === 'ice' && landed) { c.fillStyle = 'rgba(255,255,255,0.9)'; for (let j = 0; j < 5; j++) { const x = -w.w / 2 + (j + 0.5) * w.w / 5, y0 = w.size * 0.33; c.beginPath(); c.moveTo(x - 7, y0); c.lineTo(x + 7, y0); c.lineTo(x, y0 + 16 + (j % 2) * 12); c.closePath(); c.fill(); } }
      if (w.fx === 'gold' && landed) for (let j = 0; j < 3; j++) { const ph = (t * 1.2 + j / 3) % 1; withAlpha(Math.sin(ph * Math.PI), () => star(-w.w / 2 + hash(j, 4) * w.w, -w.size * 0.55 - ph * 30, 9 + j * 3, '#FFF7C2')); }
      // comic impact lines when a key word lands
      if ((w.emph || l.style === 'slam') && d > dur * 0.7 && d < dur + 0.32 && e <= 0) {
        const q = clamp((d - dur * 0.7) / 0.4);
        withAlpha(1 - q, () => { for (let j = 0; j < 8; j++) { const a = j / 8 * TAU + 0.2, r0 = Math.max(w.w, w.size) * 0.55 + q * 30, r1 = r0 + 26 + q * 26; line(Math.cos(a) * r0, -w.size * 0.1 + Math.sin(a) * r0 * 0.55, Math.cos(a) * r1, -w.size * 0.1 + Math.sin(a) * r1 * 0.55, INK, 7); line(Math.cos(a) * r0, -w.size * 0.1 + Math.sin(a) * r0 * 0.55, Math.cos(a) * r1, -w.size * 0.1 + Math.sin(a) * r1 * 0.55, rgba(col), 3); } });
      }
      c.restore();
    }
    c.restore();
  }
}
