// Composites one frame: the current shot's world (or two worlds mid-transition), then the kinetic lyric, hits and grain.
const BUF_A = createCanvas(W, H), BUF_B = createCanvas(W, H);
function into(cv, fn) {
  const prev = c; c = cv.getContext('2d');
  c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; c.clearRect(0, 0, W, H);
  fn(); c = prev;
}

function glitch(t, g, R) {
  if (g <= 0.02) return;
  const src = c.canvas;
  tctx.setTransform(1, 0, 0, 1, 0, 0); tctx.globalAlpha = 1; tctx.clearRect(0, 0, W, H); tctx.drawImage(src, 0, 0);
  const f = Math.floor(t * FPS), n = 5 + Math.floor(g * 12);
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.beginPath(); c.rect(R.x, R.y, R.w, R.h); c.clip();
  for (let i = 0; i < n; i++) {
    const y = R.y + hash(i, f) * R.h, h = 8 + hash(i, f + 1) * 60, dx = (hash(i, f + 2) - 0.5) * 100 * g;
    c.drawImage(tmp, R.x, y, R.w, h, R.x + dx, y, R.w, h);
  }
  c.globalCompositeOperation = 'screen'; c.globalAlpha = 0.35 * g;
  c.drawImage(tmp, 10 * g, 0); c.drawImage(tmp, -10 * g, 0);
  c.restore(); c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
}

function activeTransition(t) {
  for (let j = 1; j < SCENES.length; j++) {
    const S = SCENES[j], kind = S.spec.tin; if (!kind) continue;
    const D = TDUR[kind], t0 = S.start - D * 0.4;
    if (t0 > t) break;
    if (t < t0 + D) return { j, kind, k: (t - t0) / D };
  }
  return null;
}
// motion-blurred draw: averages copies spread along (bx, by)
function blurImg(img, x, y, bx, by) {
  const n = Math.abs(bx) + Math.abs(by) > 4 ? 16 : 1;
  for (let j = 0; j < n; j++) { const u = n > 1 ? j / (n - 1) - 0.5 : 0; c.globalAlpha = 1 / (j + 1); c.drawImage(img, x + u * bx, y + u * by); }
  c.globalAlpha = 1;
}
function compose(tr, RA, P, t) {
  const k = tr.k, A = BUF_A, B = BUF_B, dir = tr.j % 2 ? 1 : -1;
  if (tr.kind === 'whip') { const e = easeInOut(k), b = Math.sin(Math.PI * k) * 150 * dir; blurImg(A, -dir * e * W, 0, b, 0); blurImg(B, dir * (1 - e) * W, 0, b, 0); }
  else if (tr.kind === 'tilt') { const e = easeInOut(k), b = Math.sin(Math.PI * k) * 130; blurImg(A, 0, e * H, 0, b); blurImg(B, 0, -(1 - e) * H, 0, b); }
  else if (tr.kind === 'spin') {
    const draw = (img, rot, s) => { c.save(); c.translate(W / 2, H / 2); c.rotate(rot); c.scale(s, s); c.translate(-W / 2, -H / 2); c.drawImage(img, 0, 0); c.restore(); };
    if (k < 0.5) { const e = easeIn(k * 2); draw(A, e * e * 1.0 * dir, 1 + e * 1.4); }
    else { const e = easeOut((k - 0.5) * 2); draw(B, -(1 - e) * (1 - e) * 1.0 * dir, 1 + (1 - e) * 1.4); }
    const f = 1 - Math.abs(k - 0.5) * 5; if (f > 0) { c.fillStyle = `rgba(255,247,232,${f * 0.85})`; c.fillRect(0, 0, W, H); }
  }
  else if (tr.kind === 'splat') {
    c.drawImage(A, 0, 0);
    const R = j => Math.max(0, k * 1.6 - hash(j, tr.j) * 0.6) * 1100, N = 12, X = j => hash(j, tr.j + 1) * W, Y = j => hash(j, tr.j + 2) * H;
    c.beginPath();
    for (let j = 0; j < N; j++) {
      const r = R(j) * 1.08 + 10; if (r <= 10) continue; c.moveTo(X(j) + r, Y(j)); c.arc(X(j), Y(j), r, 0, TAU);
      for (let q = 0; q < 5; q++) { const a = hash(j, q + 9) * TAU, d = r + 20 + hash(j, q + 19) * 70, rr0 = 8 + hash(j, q + 29) * 22; c.moveTo(X(j) + Math.cos(a) * d + rr0, Y(j) + Math.sin(a) * d); c.arc(X(j) + Math.cos(a) * d, Y(j) + Math.sin(a) * d, rr0, 0, TAU); }
    }
    c.fillStyle = rgba(P.a); c.fill();
    c.save(); c.beginPath(); for (let j = 0; j < N; j++) { const r = R(j); if (r <= 0) continue; c.moveTo(X(j) + r, Y(j)); c.arc(X(j), Y(j), r, 0, TAU); } c.clip(); c.drawImage(B, 0, 0); c.restore();
  }
  else if (tr.kind === 'dive') {
    const R = RA.on && RA.w > 50 ? RA : { x: W / 2 - 300, y: H / 2 - 300, w: 600, h: 600 };
    const e = easeInOut(k), pcx = R.x + R.w / 2, pcy = R.y + R.h / 2;
    const sEnd = Math.max(W / R.w, H / R.h) * 1.02, s = Math.pow(sEnd, e), cx = lerp(pcx, W / 2, e), cy = lerp(pcy, H / 2, e);
    c.save(); c.translate(cx, cy); c.scale(s, s); c.translate(-pcx, -pcy); c.drawImage(A, 0, 0); c.restore();
    const rw = R.w * s, rh = R.h * s, bs = s / sEnd;
    c.save(); c.beginPath(); c.rect(cx - rw / 2, cy - rh / 2, rw, rh); c.clip();
    c.globalAlpha = clamp((k - 0.12) / 0.35); c.drawImage(B, cx - W * bs / 2, cy - H * bs / 2, W * bs, H * bs);
    c.restore(); c.globalAlpha = 1;
  }
  else {
    c.drawImage(k < 0.5 ? A : B, 0, 0);
    const f = Math.floor(t * FPS);
    for (let i = 0; i < 12; i++) { const y = hash(i, f) * H, h = 10 + hash(i, f + 1) * 90, dx = (hash(i, f + 2) - 0.5) * 300; c.drawImage(k < 0.5 ? B : A, 0, y, W, h, dx, y, W, h); }
    const fl = 1 - Math.abs(k - 0.5) * 4; if (fl > 0) { c.fillStyle = `rgba(255,59,92,${fl * 0.35})`; c.fillRect(0, 0, W, H); }
  }
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
  const tr = activeTransition(t);
  if (tr) {
    into(BUF_A, () => renderShot(tr.j - 1, t, P)); const RA = { ...PROP_RECT };
    into(BUF_B, () => renderShot(tr.j, t, P));
    c.save(); c.translate(sx, sy); compose(tr, RA, P, t); c.restore();
  } else {
    let i = 0; while (i + 1 < SCENES.length && SCENES[i + 1].start <= t) i++;
    c.save(); c.translate(sx, sy); renderShot(i, t, P); c.restore();
  }
  c.setTransform(1, 0, 0, 1, 0, 0);
  lyrics(t, P, null);
  for (const [col, a] of flashes) { c.globalCompositeOperation = 'screen'; c.fillStyle = rgba(col, clamp(a * 0.5)); c.fillRect(0, 0, W, H); }
  c.globalCompositeOperation = 'source-over';
  finishComic(t);
  const fade = Math.min(clamp(t / 0.35), clamp((DUR - t) / 1.4));
  if (fade < 1) { c.fillStyle = `rgba(0,0,0,${1 - fade})`; c.fillRect(0, 0, W, H); }
  return canvas;
}
