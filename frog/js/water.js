// Water: underwater backdrops, god rays, live caustics, drifting motes, bubbles, ripples, the surface from below,
// the over-under split (waterline / meniscus) and wave-broken reflections.
const { C, W, H, TAU, clamp, lerp, hash, noise, rgba, mix, ss } = require('./core');
const G = require('./gfx');

// ---------------------------------------------------------------- live caustics (tileable, computed per frame)
const CS = 112;
let CAUS = null, CAUS_T = null;
function causticTile(time) {
  if (CAUS && CAUS_T === time) return CAUS.cv;
  if (!CAUS) { const cv = C.createCanvas(CS, CS); CAUS = { cv, g: cv.getContext('2d'), im: null }; CAUS.im = CAUS.g.createImageData(CS, CS); }
  const d = CAUS.im.data, inten = .005;
  for (let y = 0; y < CS; y++) for (let x = 0; x < CS; x++) {
    const px = (x / CS) * TAU - 250, py = (y / CS) * TAU - 250;
    let ix = px, iy = py, c = 1;
    for (let n = 0; n < 5; n++) {
      const t = time * (1 - 3.5 / (n + 1));
      const nx = px + Math.cos(t - ix) + Math.sin(t + iy), ny = py + Math.sin(t - iy) + Math.cos(t + ix);
      ix = nx; iy = ny;
      c += 1 / Math.hypot(px / (Math.sin(ix + t) / inten), py / (Math.cos(iy + t) / inten));
    }
    c /= 5; c = 1.17 - Math.pow(c, 1.4);
    const v = Math.min(1, Math.pow(Math.abs(c), 8));
    const k = (y * CS + x) * 4;
    d[k] = 255; d[k + 1] = 255; d[k + 2] = 255; d[k + 3] = v * 255;
  }
  CAUS.g.putImageData(CAUS.im, 0, 0);
  CAUS_T = time;
  return CAUS.cv;
}
// tile the caustic over a rectangle; sy squashes it for a floor seen at a grazing angle
function caustics(g, x0, y0, w, h, t, a = .5, o = {}) {
  if (a < .01) return;
  const tile = causticTile(t * (o.speed ?? .55)), sz = o.size ?? 300, sy = o.sy ?? 1, ox = o.ox ?? 0, oy = o.oy ?? 0;
  g.save();
  g.beginPath(); g.rect(x0, y0, w, h); g.clip();
  g.globalCompositeOperation = o.comp ?? 'lighter'; g.globalAlpha = a;
  g.imageSmoothingEnabled = true;
  const th = sz * sy, sx0 = x0 - (((ox % sz) + sz) % sz), sy0 = y0 - (((oy % th) + th) % th);
  for (let yy = sy0; yy < y0 + h; yy += th) for (let xx = sx0; xx < x0 + w; xx += sz) g.drawImage(tile, xx, yy, sz, th);
  g.restore();
}

// ---------------------------------------------------------------- underwater backdrop
// o: {top, mid, deep, sy (screen y of surface), sun (screen x of light), rays, t, murk}
function under(g, o) {
  const sy = o.sy ?? -200, t = o.t ?? 0;
  g.fillStyle = G.lin(g, 0, Math.min(sy, H * .2), 0, H, [[0, o.top ?? '#8fd3c0'], [.45, o.mid ?? '#2f7d70'], [1, o.deep ?? '#0b2f33']]);
  g.fillRect(0, 0, W, H);
  // light pool under the sun
  const sx = o.sun ?? W * .6;
  G.glow(g, sx, Math.max(sy, -100), 900, o.light ?? '#d9fff0', .22 * (o.glow ?? 1), 'screen');
  if ((o.rays ?? 1) > 0) rays(g, { ...o, sx, sy });
}
function rays(g, o) {
  const t = o.t ?? 0, n = o.n ?? 9, a0 = o.rays ?? 1, sy = o.sy ?? -100, lean = o.lean ?? .22;
  G.layer(g, 'rays', (b) => {
    b.globalCompositeOperation = 'lighter';
    for (let i = 0; i < n; i++) {
      const u = (i + .5) / n, x0 = lerp(-200, W + 200, u) + noise(t * .11 + i, 3) * 90 + (o.sx - W / 2) * .3;
      const w0 = 40 + hash(i + 7) * 90, ang = lean + noise(t * .07 + i * 3, 4) * .06, L = 900 + hash(i + 3) * 500;
      const fl = clamp(.55 + .45 * noise(t * .45 + i * 1.7, 9)) * (.45 + .55 * hash(i + 11));
      const dx = Math.sin(ang), dy = Math.cos(ang), w1 = w0 * 2.4;
      const gr = b.createLinearGradient(x0, sy, x0 + dx * L, sy + dy * L);
      const c = o.rayCol ?? '#e8fff4';
      gr.addColorStop(0, rgba(c, .42 * fl * a0)); gr.addColorStop(.35, rgba(c, .2 * fl * a0)); gr.addColorStop(1, rgba(c, 0));
      b.fillStyle = gr;
      b.beginPath(); b.moveTo(x0 - w0 / 2, sy); b.lineTo(x0 + w0 / 2, sy);
      b.lineTo(x0 + dx * L + w1 / 2, sy + dy * L); b.lineTo(x0 + dx * L - w1 / 2, sy + dy * L); b.closePath(); b.fill();
    }
  }, { k: 2, blur: 7, comp: 'screen' });
}

// ---------------------------------------------------------------- drifting motes (marine snow) with parallax + bokeh
function motes(g, cam, t, o = {}) {
  const sets = o.sets ?? [
    { n: 150, p: .35, r: [.8, 1.8], a: .32, seed: 1 },
    { n: 60, p: .8, r: [1.4, 3], a: .3, seed: 2 },
    { n: 9, p: 1.6, r: [10, 26], a: .08, seed: 3, bokeh: 1 },
  ];
  const col = o.col ?? '#e6fff4', zx = cam ? cam.x : 0, zy = cam ? cam.y : 0, z = cam ? cam.z : 1;
  g.save();
  for (const L of sets) {
    const s = Math.pow(z, L.p), WW = W + 300, HH = H + 300;
    for (let i = 0; i < L.n; i++) {
      const h0 = hash(i * 7 + L.seed * 1000), h1 = hash(i * 7 + 1 + L.seed * 1000), h2 = hash(i * 7 + 2 + L.seed * 1000);
      let x = h0 * WW + t * (o.dx ?? 6) * (.5 + h2) + Math.sin(t * .4 + i) * 6 - zx * L.p * s;
      let y = h1 * HH + t * (o.dy ?? -4) * (.5 + h1) + Math.cos(t * .33 + i * 1.3) * 5 - zy * L.p * s;
      x = ((x % WW) + WW) % WW - 150; y = ((y % HH) + HH) % HH - 150;
      x = W / 2 + (x - W / 2) * s; y = H / 2 + (y - H / 2) * s;
      const r = lerp(L.r[0], L.r[1], h2) * Math.sqrt(s), a = L.a * (.4 + .6 * hash(i + 99)) * (o.a ?? 1);
      if (L.bokeh) { g.fillStyle = G.rad(g, x, y, r, [[0, col, a], [.7, col, a * .8], [1, col, 0]]); g.fillRect(x - r, y - r, 2 * r, 2 * r); }
      else { g.fillStyle = rgba(col, a); g.fillRect(x - r / 2, y - r / 2, r, r); }
    }
  }
  g.restore();
}

// ---------------------------------------------------------------- bubbles
function bubble(g, x, y, r, t = 0, a = 1, ph = 0) {
  if (r < .4 || a < .01) return;
  const wob = Math.sin(t * 19 + ph) * .07 * Math.min(1, r / 6);
  g.save(); g.translate(x, y); g.scale(1 + wob, 1 - wob); g.globalAlpha *= a;
  g.fillStyle = G.rad(g, 0, 0, r, [[0, '#ffffff', 0], [.62, '#dffcff', .05], [.9, '#ffffff', .32], [1, '#ffffff', .6]]);
  G.circle(g, 0, 0, r); g.fill();
  g.fillStyle = 'rgba(255,255,255,.85)'; G.ellipse(g, -r * .38, -r * .42, r * .28, r * .17, -.7); g.fill();
  g.fillStyle = 'rgba(255,255,255,.35)'; G.ellipse(g, r * .42, r * .45, r * .14, r * .08, -.7); g.fill();
  g.restore();
}
// a rising stream released from (x0,y0) starting at t0; rate per second; returns nothing
function stream(g, x0, y0, t, t0, t1, o = {}) {
  const rate = o.rate ?? 6, life = o.life ?? 2.2, seed = o.seed ?? 1, rise = o.rise ?? 160;
  const k0 = Math.floor((t - life - t0) * rate), k1 = Math.floor((Math.min(t, t1) - t0) * rate);
  for (let k = Math.max(0, k0); k <= k1; k++) {
    const tb = t0 + k / rate + hash(k + seed * 77) * .1 / rate, e = t - tb;
    if (e < 0 || e > life) continue;
    const r = (o.r ?? 4) * (.5 + hash(k * 3 + seed) * .9) * (1 + e * .15);
    const y = y0 - (rise * e + 40 * e * e);
    const x = x0 + Math.sin(e * 7 + k) * (3 + e * 6) + (hash(k + 5 + seed) - .5) * 10 + (o.drift ?? 0) * e;
    if (o.top !== undefined && y < o.top) continue;
    bubble(g, x, y, r, t, Math.min(1, e * 8) * (1 - ss(life * .8, life, e)), k);
  }
}

// ---------------------------------------------------------------- ripples (perspective rings on a surface)
function ripple(g, x, y, e, o = {}) {
  const sp = o.speed ?? 90, flat = o.flat ?? .32, life = o.life ?? 2.4, n = o.rings ?? 3;
  if (e < 0 || e > life) return;
  g.save();
  for (let k = 0; k < n; k++) {
    const ek = e - k * .16;
    if (ek <= 0) continue;
    const r = sp * ek * (1 - .25 * ek / life) + 2, a = (o.a ?? .7) * (1 - ek / life) * (1 - k * .25);
    if (a <= .01) continue;
    g.lineWidth = Math.max(1, 3 - ek); g.strokeStyle = rgba(o.hi ?? '#ffffff', a);
    G.ellipse(g, x, y, r, r * flat); g.stroke();
    g.lineWidth = Math.max(1, 2.5 - ek); g.strokeStyle = rgba(o.lo ?? '#000000', a * .35);
    G.ellipse(g, x, y + 2.5, r * 1.01, r * flat * 1.02); g.stroke();
  }
  g.restore();
}

// ---------------------------------------------------------------- waterline (over-under)
// wavy waterline y at screen x
const wl = (x, y, t, amp = 1) => y + amp * (Math.sin(x * .011 + t * 1.7) * 4 + Math.sin(x * .027 - t * 2.3) * 2 + Math.sin(x * .053 + t * 3.1) * 1);
function clipWater(g, y, t, below = true, amp = 1) {
  g.beginPath();
  g.moveTo(-40, below ? H + 40 : -40);
  for (let x = -40; x <= W + 40; x += 24) g.lineTo(x, wl(x, y, t, amp));
  g.lineTo(W + 40, below ? H + 40 : -40);
  g.closePath(); g.clip();
}
// the surface seen edge-on: bright underside, dark meniscus, soft highlight above
function meniscus(g, y, t, o = {}) {
  const amp = o.amp ?? 1;
  const line = (dy) => { g.beginPath(); for (let x = -40; x <= W + 40; x += 12) { const yy = wl(x, y, t, amp) + dy; x === -40 ? g.moveTo(x, yy) : g.lineTo(x, yy); } };
  g.save();
  g.lineCap = 'round';
  g.strokeStyle = rgba(o.dark ?? '#06231f', .5); g.lineWidth = 10; line(7); g.stroke();
  g.strokeStyle = rgba(o.under ?? '#c9fff0', .75); g.lineWidth = 4; line(2); g.stroke();
  g.strokeStyle = rgba('#ffffff', .9); g.lineWidth = 1.6; line(-.5); g.stroke();
  g.restore();
  // soft bloom along the line
  G.layer(g, 'meniscus', (b) => { b.strokeStyle = rgba(o.under ?? '#c9fff0', .5); b.lineWidth = 26; b.beginPath(); for (let x = -40; x <= W + 40; x += 24) { const yy = wl(x, y, t, amp); x === -40 ? b.moveTo(x, yy) : b.lineTo(x, yy); } b.stroke(); }, { k: 3, blur: 6, comp: 'screen', alpha: .55 });
}
// underside of the surface when looking up from below: total-reflection sheen with perspective ripples
function surfaceBelow(g, y, t, o = {}) {
  const top = o.top ?? -60, c = o.col ?? '#bff7e6';
  g.save();
  g.fillStyle = G.lin(g, 0, top, 0, y, [[0, o.far ?? '#3c8d7e'], [1, c]]);
  g.fillRect(0, top, W, y - top);
  g.globalCompositeOperation = 'screen';
  for (let k = 0; k < 26; k++) {
    const u = k / 26, yy = lerp(y, top, Math.pow(u, .7)), amp = lerp(10, 2, u), a = lerp(.4, .08, u);
    g.strokeStyle = rgba('#ffffff', a); g.lineWidth = lerp(3, 1, u);
    g.beginPath();
    for (let x = -20; x <= W + 20; x += 16) {
      const yy2 = yy + Math.sin(x * (.012 + u * .03) + t * (1.4 + u) + k * 1.7) * amp + noise(x * .01 + k, 5 + Math.floor(t)) * 0;
      x === -20 ? g.moveTo(x, yy2) : g.lineTo(x, yy2);
    }
    g.stroke();
  }
  g.restore();
}

// ---------------------------------------------------------------- per-row shifted copies (reflections, refraction)
// map(k) -> [srcY, dx, alpha] for destination row y0+k. One getImageData + one drawImage: drawing a canvas in
// hundreds of thin strips is very slow with this canvas backend.
let SRB = null;
function shiftRows(g, src, y0, n, map, o = {}) {
  y0 = Math.floor(y0); n = Math.min(Math.floor(n), H - y0);
  if (n <= 0) return;
  const sd = src.getContext('2d').getImageData(0, 0, W, H).data;
  if (!SRB || SRB.h < n) { const h = Math.max(n, 64), cv = C.createCanvas(W, h); SRB = { cv, g: cv.getContext('2d'), h }; SRB.im = SRB.g.createImageData(W, h); }
  const od = SRB.im.data; od.fill(0, 0, n * W * 4);
  for (let k = 0; k < n; k++) {
    const m = map(k), sy = Math.round(m[0]), dx = Math.max(-W + 1, Math.min(W - 1, Math.round(m[1]))), a = m[2];
    if (sy < 0 || sy >= H || a <= .003) continue;
    const s = sy * W * 4, d = k * W * 4;
    if (dx >= 0) od.set(sd.subarray(s, s + (W - dx) * 4), d + dx * 4); else od.set(sd.subarray(s - dx * 4, s + W * 4), d);
    if (a < .997) for (let i = d + 3; i < d + W * 4; i += 4) od[i] *= a;
  }
  SRB.g.putImageData(SRB.im, 0, 0);
  g.save(); g.globalAlpha *= o.a ?? 1; g.drawImage(SRB.cv, 0, 0, W, n, 0, y0, W, n); g.restore();
}

// ---------------------------------------------------------------- reflection of a layer below a horizon line, broken by waves
// src: canvas holding the scene above the line (screen space). Rows are mirrored and shifted.
function reflect(g, src, y, t, o = {}) {
  const depth = Math.min(o.depth ?? (H - y), H - Math.floor(y)), amp = o.amp ?? 6, a0 = o.a ?? .55;
  shiftRows(g, src, y, depth, (k) => {
    const u = k / depth;
    return [y - k - 1, Math.sin(k * .09 * (1 + u * 2) + t * 2.1) * amp * (.3 + u * 1.6) + noise(k * .05 + t * .8, 7) * amp * u, a0 * (1 - u * u)];
  });
  if (o.tint) { g.save(); g.fillStyle = G.lin(g, 0, y, 0, y + depth, [[0, o.tint, o.tintA0 ?? .25], [1, o.tint, o.tintA1 ?? .6]]); g.fillRect(0, y, W, depth); g.restore(); }
}

// ---------------------------------------------------------------- rain
function rain(g, t, o = {}) {
  const n = o.n ?? 160, a = o.a ?? .35, ang = o.ang ?? .12, len = o.len ?? 60, sp = o.speed ?? 1500;
  g.save(); g.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const d = .4 + hash(i + 3) * .9, x0 = hash(i) * (W + 300) - 150, ph = hash(i + 9);
    const y = ((t * sp * d + ph * (H + 400)) % (H + 400)) - 200, x = x0 + y * Math.tan(ang);
    g.strokeStyle = rgba(o.col ?? '#e8f4ff', a * d * .8); g.lineWidth = d * 1.6;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x - Math.sin(ang) * len * d, y - Math.cos(ang) * len * d); g.stroke();
  }
  g.restore();
}
// impact rings on a horizontal surface band [y0, y1] (perspective: smaller further up)
function rainRings(g, t, y0, y1, o = {}) {
  const n = o.n ?? 40, rate = o.rate ?? 1.6;
  for (let i = 0; i < n; i++) {
    const per = 1 / rate * (.6 + hash(i) * .8), ph = hash(i + 4) * per, k = Math.floor((t + ph) / per), e = (t + ph) - k * per;
    const u = hash(i * 31 + k * 7), x = hash(i * 17 + k * 13) * W, y = lerp(y0, y1, u), s = lerp(.35, 1.1, u);
    ripple(g, x, y, e, { speed: 50 * s, life: .9, rings: 2, flat: .28, a: (o.a ?? .5) * s });
  }
}

module.exports = { causticTile, caustics, under, rays, motes, bubble, stream, ripple, wl, clipWater, meniscus, surfaceBelow, shiftRows, reflect, rain, rainRings };
