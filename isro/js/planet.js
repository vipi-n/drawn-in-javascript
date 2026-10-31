// Per-pixel layer: procedural Earth / Moon / Mars / Sun spheres and lunar ground.
// Everything here writes into one reused ImageData that is put as the base layer of a frame.
const fs = require('fs'), path = require('path');
const { C, W, H, clamp, lerp, smooth, rng, noise2, noise3, fbm3, hash } = require('./core');
const LAND = require('./land');

const CACHE = path.join(__dirname, '..', 'build', 'tex');
fs.mkdirSync(CACHE, { recursive: true });

function cached(name, w, h, ch, gen) {
  const f = path.join(CACHE, `${name}_${w}x${h}x${ch}.bin`);
  if (fs.existsSync(f)) return { w, h, ch, d: new Uint8Array(fs.readFileSync(f)) };
  console.error('generating texture', name);
  const d = gen();
  fs.writeFileSync(f, Buffer.from(d.buffer));
  return { w, h, ch, d };
}
const sq = (x) => x * x;
const sph = (lon, lat) => [Math.cos(lat) * Math.sin(lon), Math.sin(lat), Math.cos(lat) * Math.cos(lon)];
const gauss = (lon, lat, cx, cy, sx, sy) => Math.exp(-(((lon - cx) / sx) ** 2) - (((lat - cy) / sy) ** 2));
const CITIES = [[77.2, 28.6, 1], [72.9, 19.1, 1], [88.4, 22.6, .9], [80.3, 13.1, .8], [77.6, 13, .8], [78.5, 17.4, .8], [72.6, 23, .7], [73.9, 18.5, .6], [80.9, 26.8, .6], [75.8, 26.9, .6], [85.1, 25.6, .5], [90.4, 23.8, .8], [67, 24.9, .8], [74.3, 31.5, .7], [76.9, 8.5, .4], [76.3, 10, .5], [83.3, 17.7, .4], [75.9, 22.7, .5], [79.1, 21.1, .5], [76.8, 30.7, .4], [85.8, 20.3, .4], [74.9, 32.7, .3], [79.9, 6.9, .4], [55.3, 25.2, .7], [51.5, 25.3, .4], [46.7, 24.7, .6], [31.2, 30, .8], [121.5, 31.2, 1], [116.4, 39.9, 1], [113.3, 23.1, 1], [114.1, 22.5, .9], [104.1, 30.7, .6], [106.6, 29.6, .6], [139.7, 35.7, 1], [135.5, 34.7, .8], [127, 37.6, .9], [100.5, 13.8, .8], [106.8, -6.2, .8], [103.8, 1.35, .7], [121, 14.6, .7], [2.35, 48.9, .8], [-.1, 51.5, .8], [13.4, 52.5, .6], [37.6, 55.8, .8], [28.9, 41, .7], [51.4, 35.7, .7], [44.4, 33.3, .5], [3.4, 6.5, .6], [36.8, -1.3, .4], [28, -26.2, .6]];

// ---------------- EARTH ----------------
const EW = 2048, EH = 1024;
function genEarth() {
  // rasterise coastlines
  const cv = C.createCanvas(EW, EH), g = cv.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, EW, EH);
  const P = ([lo, la]) => [(lo + 180) / 360 * EW, (90 - la) / 180 * EH];
  const poly = (pts, col) => { g.fillStyle = col; g.beginPath(); pts.forEach((p, i) => { const [x, y] = P(p); i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.closePath(); g.fill(); };
  LAND.land.forEach((p) => poly(p, '#fff'));
  LAND.water.forEach((p) => poly(p, '#000'));
  g.fillStyle = '#fff'; g.fillRect(0, EH * (1 - 22 / 180), EW, EH); // Antarctica
  const raw = cv.data();
  const m = new Float32Array(EW * EH);
  for (let i = 0; i < EW * EH; i++) m[i] = raw[i * 4] / 255;
  // blur for coast distance
  const blur = (src, r) => {
    const a = new Float32Array(src.length), b = new Float32Array(src.length);
    for (let y = 0; y < EH; y++) { let s = 0; for (let x = -r; x <= r; x++) s += src[y * EW + ((x + EW) % EW)]; for (let x = 0; x < EW; x++) { a[y * EW + x] = s / (2 * r + 1); s += src[y * EW + (x + r + 1) % EW] - src[y * EW + (x - r + EW) % EW]; } }
    for (let x = 0; x < EW; x++) { let s = 0; for (let y = -r; y <= r; y++) s += a[clamp(y, 0, EH - 1) * EW + x]; for (let y = 0; y < EH; y++) { b[y * EW + x] = s / (2 * r + 1); s += a[clamp(y + r + 1, 0, EH - 1) * EW + x] - a[clamp(y - r, 0, EH - 1) * EW + x]; } }
    return b;
  };
  const m2 = blur(m, 2), coast = blur(m, 14);
  const out = new Uint8Array(EW * EH * 6);
  const desert = [200, 165, 112], sand = [214, 186, 136], forest = [32, 62, 30], green = [62, 88, 40], savanna = [128, 116, 62], tundra = [104, 96, 78], snow = [236, 240, 246], plateau = [128, 112, 92];
  const mix = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
  for (let y = 0; y < EH; y++) {
    const lat = (90 - (y + .5) * 180 / EH), la = lat * Math.PI / 180;
    for (let x = 0; x < EW; x++) {
      const lon = (x + .5) * 360 / EW - 180, lo = lon * Math.PI / 180;
      const [px, py, pz] = sph(lo, la);
      const i = y * EW + x;
      const n1 = fbm3(px * 9 + 3, py * 9, pz * 9, 5), n2 = fbm3(px * 30, py * 30 + 7, pz * 30, 4);
      const landv = smooth(clamp((m2[i] - .5 + n1 * .1 + n2 * .07) * 5 + .5));
      // aridity map
      let ar = gauss(lon, lat, 12, 23, 26, 8) + gauss(lon, lat, 46, 22, 10, 7) + gauss(lon, lat, 60, 29, 9, 5) * .9 + gauss(lon, lat, 71, 26.5, 3.5, 2.5) * .9
        + gauss(lon, lat, 92, 41, 16, 5) * .85 + gauss(lon, lat, 131, -25, 15, 7) + gauss(lon, lat, 20, -23, 6, 5) * .7 + gauss(lon, lat, -110, 33, 8, 6) * .7
        + gauss(lon, lat, 55, 42, 12, 5) * .6 + gauss(lon, lat, -69, -45, 4, 8) * .5 + gauss(lon, lat, 32, 15, 10, 4) * .5;
      ar = clamp(ar + n1 * .5);
      let wet = clamp(gauss(lat, 0, 0, 0, 12, 1) + gauss(lon, lat, 80, 14, 9, 8) * .7 + gauss(lon, lat, 88, 24, 6, 3) * .6 + gauss(lon, lat, 102, 15, 12, 10) * .8 + gauss(lon, lat, 112, 0, 15, 8) + gauss(lon, lat, -60, -5, 15, 10) + gauss(lon, lat, 20, 0, 10, 6));
      let c = mix(savanna, green, clamp(wet * 1.2 + n2 * .3));
      c = mix(c, forest, clamp(wet - .5) * 1.6);
      c = mix(c, mix(desert, sand, clamp(.5 + n2)), clamp(ar * 1.4 - .2));
      if (Math.abs(lat) > 50) c = mix(c, tundra, clamp((Math.abs(lat) - 50) / 15));
      c = mix(c, plateau, gauss(lon, lat, 87, 33, 10, 3.5) * .8);
      // Himalaya snow line
      const hx = clamp((lon - 73) / 22), hlat = lerp(35, 28, hx), dh = Math.abs(lat - hlat);
      const ridge = 1 - Math.abs(fbm3(px * 25, py * 25, pz * 25, 4) * 2);
      let sn = (lon > 70 && lon < 97 ? clamp(1 - dh / 2.2) : 0) * clamp(ridge * 1.2 - .45) * .8;
      sn += gauss(lon, lat, 82, 34, 14, 3) * clamp(ridge * 1.3 - .7) * .6 + gauss(lon, lat, 70, 37.5, 5, 2) * clamp(ridge * 1.5 - .6);
      sn += clamp((Math.abs(lat) - 66) / 6) * (lat < 0 ? 1 : .5);
      c = mix(c, snow, clamp(sn));
      const br = 1 + n2 * .35;
      const deep = [6, 20, 52], shallow = [18, 64, 104];
      let oc = mix(deep, shallow, clamp(coast[i] * 2.2 + n1 * .2));
      if (Math.abs(lat) > 60) oc = mix(oc, [60, 80, 100], clamp((Math.abs(lat) - 60) / 20) * .5);
      const col = mix(oc, [c[0] * br, c[1] * br, c[2] * br], landv);
      // city lights
      const pop = gauss(lon, lat, 80, 22, 10, 9) + gauss(lon, lat, 82, 26.5, 6, 2.5) * .9 + gauss(lon, lat, 76.5, 11, 3, 3) * .5 + gauss(lon, lat, 114, 30, 9, 9) * .9
        + gauss(lon, lat, 10, 49, 14, 7) * .9 + gauss(lon, lat, 137, 36, 4, 3) + gauss(lon, lat, 50, 28, 8, 5) * .5 + gauss(lon, lat, 31, 30, 2, 3) * .7 + gauss(lon, lat, 127, 37, 2, 2) * .8 + .015;
      const cl = CITIES.reduce((s, [cx, cy, k]) => s + k * Math.exp(-(sq(lon - cx) + sq(lat - cy)) / .12), 0);
      const sp = hash(i * .1373) < .07 * pop ? .3 + .7 * hash(i * 3.1) : 0;
      const lights = clamp((clamp(cl) + sp * .55) * landv * (1 - clamp(ar * 1.2 - .3) * .5));
      // clouds, stronger in tropics/mid latitudes, thin over deserts
      const wx = fbm3(px * 3, py * 3, pz * 3, 3) * 1.5;
      const cn = fbm3(px * 5 + wx, py * 5 + wx, pz * 5 - wx, 6);
      const band = .5 + .5 * gauss(lat, 0, 5, 0, 10, 1) + .45 * gauss(Math.abs(lat), 0, 50, 0, 14, 1);
      const cloud = clamp(smooth(clamp((cn - .06) * 3)) * band * (1 - ar * .8) * .95 + clamp(fbm3(px * 22, py * 22, pz * 22, 3) * 1.4) * .1 * band);
      const o = i * 6;
      out[o] = clamp(col[0], 0, 255); out[o + 1] = clamp(col[1], 0, 255); out[o + 2] = clamp(col[2], 0, 255);
      out[o + 3] = (1 - landv) * 255; out[o + 4] = lights * 255; out[o + 5] = cloud * 255;
    }
  }
  return out;
}

// ---------------- crater fields (Moon, Mars) ----------------
function craterHeight(w, h, count, seed, depthK, fbmK, freq) {
  const ht = new Float32Array(w * h), r = rng(seed);
  for (let y = 0; y < h; y++) {
    const la = Math.PI / 2 - (y + .5) * Math.PI / h;
    for (let x = 0; x < w; x++) {
      const lo = (x + .5) * 2 * Math.PI / w - Math.PI, [px, py, pz] = sph(lo, la);
      ht[y * w + x] = fbm3(px * freq, py * freq, pz * freq, 6) * fbmK;
    }
  }
  const dl = 2 * Math.PI / w;
  for (let k = 0; k < count; k++) {
    const u = r(), rad = Math.min(.16, .0045 * Math.pow(1 / Math.max(u, .002), .55));
    const clo = r() * 2 * Math.PI - Math.PI, cla = Math.asin(r() * 2 - 1), c = sph(clo, cla);
    const depth = rad * depthK * (.7 + r() * .6), ext = rad * 2.3;
    const y0 = Math.max(0, Math.floor((Math.PI / 2 - cla - ext) / dl)), y1 = Math.min(h - 1, Math.ceil((Math.PI / 2 - cla + ext) / dl));
    const cosl = Math.max(.05, Math.cos(cla) - ext), xr = Math.ceil(ext / dl / cosl), cx = Math.floor((clo + Math.PI) / dl);
    const peak = rad > .03;
    for (let y = y0; y <= y1; y++) {
      const la = Math.PI / 2 - (y + .5) * dl;
      for (let xx = cx - xr; xx <= cx + xr; xx++) {
        const x = ((xx % w) + w) % w, lo = (x + .5) * dl - Math.PI, p = sph(lo, la);
        const d = Math.acos(clamp(p[0] * c[0] + p[1] * c[1] + p[2] * c[2], -1, 1)) / rad;
        if (d > 2.3) continue;
        let v;
        if (d < 1) v = (d * d - 1) * .9 + .25 * Math.exp(-sq((d - 1) / .12)) + (peak ? .35 * Math.exp(-sq(d / .18)) : 0);
        else v = .25 * Math.exp(-sq((d - 1) / .3));
        ht[y * w + x] += v * depth;
      }
    }
  }
  return ht;
}
function gradients(ht, w, h, scale) {
  const gx = new Float32Array(w * h), gy = new Float32Array(w * h), dl = 2 * Math.PI / w;
  for (let y = 0; y < h; y++) {
    const cl = Math.max(.08, Math.cos(Math.PI / 2 - (y + .5) * Math.PI / h));
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      gx[i] = (ht[y * w + (x + 1) % w] - ht[y * w + (x - 1 + w) % w]) / (2 * dl * cl) * scale;
      gy[i] = (ht[Math.max(0, y - 1) * w + x] - ht[Math.min(h - 1, y + 1) * w + x]) / (2 * dl) * scale;
    }
  }
  return [gx, gy];
}
const MW = 2048, MH = 1024;
function genMoon() {
  const ht = craterHeight(MW, MH, 5200, 11, .22, .006, 14);
  const [gx, gy] = gradients(ht, MW, MH, 1);
  const out = new Uint8Array(MW * MH * 3), rays = [[-.2, -.75, .02], [.6, .3, .012], [-.9, .4, .014]];
  for (let y = 0; y < MH; y++) {
    const la = Math.PI / 2 - (y + .5) * Math.PI / MH;
    for (let x = 0; x < MW; x++) {
      const lo = (x + .5) * 2 * Math.PI / MW - Math.PI, [px, py, pz] = sph(lo, la), i = y * MW + x;
      const mare = smooth(clamp((fbm3(px * 1.6 + 2, py * 1.6, pz * 1.6, 5) + .02 + .12 * pz) * 5));
      let a = lerp(.66, .3, mare) * (1 + fbm3(px * 25, py * 25, pz * 25, 4) * .35) + ht[i] * 2;
      for (const [rl, rb, rr] of rays) {
        const c = sph(rl, rb), d = Math.acos(clamp(px * c[0] + py * c[1] + pz * c[2], -1, 1)) / rr;
        if (d < 14) { const ang = Math.atan2(py - c[1], px - c[0]); a += (.35 * Math.pow(Math.max(0, noise3(ang * 6, rl * 3, 1)), 2) * Math.exp(-d / 5) + .2 * Math.exp(-d)) ; }
      }
      out[i * 3] = clamp(a, 0, 1) * 255;
      out[i * 3 + 1] = clamp(gx[i] * 6 + 128, 0, 255); out[i * 3 + 2] = clamp(gy[i] * 6 + 128, 0, 255);
    }
  }
  return out;
}
const RW = 1024, RH = 512;
function genMars() {
  const ht = craterHeight(RW, RH, 900, 23, .12, .01, 10);
  const [gx, gy] = gradients(ht, RW, RH, 1);
  const out = new Uint8Array(RW * RH * 5);
  for (let y = 0; y < RH; y++) {
    const la = Math.PI / 2 - (y + .5) * Math.PI / RH;
    for (let x = 0; x < RW; x++) {
      const lo = (x + .5) * 2 * Math.PI / RW - Math.PI, [px, py, pz] = sph(lo, la), i = y * RW + x;
      const f = fbm3(px * 2.2, py * 2.2 + 4, pz * 2.2, 6), f2 = fbm3(px * 18, py * 18, pz * 18, 4);
      const dark = smooth(clamp((f + .04) * 6)), bright = smooth(clamp((-f - .12) * 5));
      let c = [196, 104, 58];
      c = c.map((v, k) => lerp(v, [104, 58, 40][k], dark * .85));
      c = c.map((v, k) => lerp(v, [222, 160, 112][k], bright * .7));
      // Valles Marineris
      const lat = la * 180 / Math.PI, lon = lo * 180 / Math.PI;
      const vm = lon > -100 && lon < -40 ? Math.exp(-(((lat + 8 + 4 * Math.sin(lon * .1)) / .7) ** 2)) * clamp(1 - Math.abs(lon + 70) / 32) * (.6 + .4 * f2) : 0;
      c = c.map((v, k) => lerp(v, [120, 62, 40][k], vm * .5));
      const cap = smooth(clamp((Math.abs(lat) - 74 + f2 * 6) / 4));
      c = c.map((v) => v * (1 + f2 * .25));
      c = c.map((v, k) => lerp(v, [240, 236, 230][k], cap));
      out[i * 5] = clamp(c[0], 0, 255); out[i * 5 + 1] = clamp(c[1], 0, 255); out[i * 5 + 2] = clamp(c[2], 0, 255);
      out[i * 5 + 3] = clamp(gx[i] * 6 + 128, 0, 255); out[i * 5 + 4] = clamp(gy[i] * 6 + 128, 0, 255);
    }
  }
  return out;
}

let T = {};
function tex(name) {
  if (T[name]) return T[name];
  if (name === 'earth') T.earth = cached('earth', EW, EH, 6, genEarth);
  if (name === 'moon') T.moon = cached('moon', MW, MH, 3, genMoon);
  if (name === 'mars') T.mars = cached('mars', RW, RH, 5, genMars);
  return T[name];
}

// ---------------- pixel buffer ----------------
class Pix {
  constructor(ctx) { this.img = ctx.createImageData(W, H); this.d = this.img.data; }
  clear(r = 0, g = 0, b = 0) { const d = this.d; for (let i = 0; i < d.length; i += 4) { d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = 255; } }
  add(x, y, r, g, b) {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const i = (y * W + x) * 4, d = this.d; d[i] += r; d[i + 1] += g; d[i + 2] += b;
  }
  stars(t, o = {}) {
    const a = o.alpha ?? 1, r = rng(o.seed ?? 5), n = o.n ?? 2200, sx = o.sx ?? 0, sy = o.sy ?? 0;
    for (let k = 0; k < n; k++) {
      const x0 = r() * (W + 400) - 200 + sx, y0 = r() * (H + 400) - 200 + sy, m = Math.pow(r(), 7), c = r();
      const x = Math.floor(((x0 % (W + 400)) + W + 400) % (W + 400) - 200), y = Math.floor(((y0 % (H + 400)) + H + 400) % (H + 400) - 200);
      const b = (25 + m * 600) * a * (.8 + .2 * Math.sin(t * 2 + k));
      const cr = c < .2 ? [1, .85, .7] : c > .8 ? [.75, .85, 1] : [1, 1, 1];
      this.add(x, y, b * cr[0], b * cr[1], b * cr[2]);
      if (m > .2) { const b2 = b * .3; this.add(x + 1, y, b2, b2, b2); this.add(x - 1, y, b2, b2, b2); this.add(x, y + 1, b2, b2, b2); this.add(x, y - 1, b2, b2, b2); }
    }
  }
  put(ctx) { ctx.putImageData(this.img, 0, 0); }
}

function bilin(T, u, v, c0, nc, out) {
  const w = T.w, h = T.h, d = T.d, ch = T.ch;
  u = u - .5; v = clamp(v - .5, 0, h - 1.001);
  const x0 = Math.floor(u), y0 = Math.floor(v), fx = u - x0, fy = v - y0;
  const xa = ((x0 % w) + w) % w, xb = (xa + 1) % w, ya = y0, yb = Math.min(h - 1, y0 + 1);
  const i00 = (ya * w + xa) * ch, i10 = (ya * w + xb) * ch, i01 = (yb * w + xa) * ch, i11 = (yb * w + xb) * ch;
  for (let k = 0; k < nc; k++) {
    const c = c0 + k;
    out[k] = ((d[i00 + c] * (1 - fx) + d[i10 + c] * fx) * (1 - fy) + (d[i01 + c] * (1 - fx) + d[i11 + c] * fx) * fy) / 255;
  }
}
const tone = (x) => 255 * (1 - Math.exp(-x * 1.15));

// o: {cx, cy, r, kind, lon0, lat0 (deg), roll, sun:[x,y,z] view (y up, z to viewer), exposure, atmo, cloudShift}
function sphere(P, o) {
  const kind = o.kind, Tx = tex(kind), d = P.d;
  const lon0 = (o.lon0 ?? 0) * Math.PI / 180, lat0 = (o.lat0 ?? 0) * Math.PI / 180, roll = (o.roll ?? 0) * Math.PI / 180;
  const cr = Math.cos(roll), sr = Math.sin(roll), cL = Math.cos(lon0), sL = Math.sin(lon0), cA = Math.cos(-lat0), sA = Math.sin(-lat0);
  let [lx, ly, lz] = o.sun ?? [-1, .3, .6];
  { const n = Math.hypot(lx, ly, lz); lx /= n; ly /= n; lz /= n; }
  const toBody = (x, y, z) => { const y1 = y * cA - z * sA, z1 = y * sA + z * cA; return [x * cL + z1 * sL, y1, -x * sL + z1 * cL]; };
  const Lb = toBody(lx, ly, lz);
  const r = o.r, cx = o.cx, cy = o.cy, expo = o.exposure ?? 1;
  const halo = kind === 'earth' ? (o.halo ?? .035) : kind === 'mars' ? .015 : 0;
  const ext = r * (1 + halo * 1.6) + 2;
  const xs = Math.max(0, Math.floor(cx - ext)), xe = Math.min(W - 1, Math.ceil(cx + ext));
  const ys = Math.max(0, Math.floor(cy - ext)), ye = Math.min(H - 1, Math.ceil(cy + ext));
  const s = [0, 0, 0, 0, 0, 0], s2 = [0, 0, 0];
  const hx = lx, hy = ly, hz = lz + 1, hn = Math.hypot(hx, hy, hz);
  const atmo = o.atmo ?? (kind === 'mars' ? [1, .55, .35] : [.35, .6, 1]);
  const cshift = (o.cloudShift ?? 0) * Math.PI / 180;
  const bump = o.bump ?? 1;
  for (let y = ys; y <= ye; y++) {
    for (let x = xs; x <= xe; x++) {
      const qx = (x + .5 - cx) / r, qy = (y + .5 - cy) / r;
      const vx = qx * cr + qy * sr, vy = -(-qx * sr + qy * cr);
      const d2 = vx * vx + vy * vy, dist = Math.sqrt(d2);
      const idx = (y * W + x) * 4;
      if (dist > 1) {
        if (!halo) {
          continue;
        }
        const hh = (dist - 1) / halo;
        if (hh > 1.6) continue;
        const lam = (vx * lx + vy * ly) / dist;
        const it = Math.exp(-hh * 3.2) * smooth(clamp((lam + .25) / .55)) * 1.3 * (o.haloK ?? 1);
        d[idx] = Math.min(255, d[idx] + tone(atmo[0] * it * expo)); d[idx + 1] = Math.min(255, d[idx + 1] + tone(atmo[1] * it * expo)); d[idx + 2] = Math.min(255, d[idx + 2] + tone(atmo[2] * it * expo));
        continue;
      }
      const cov = clamp((1 - dist) * r + .5);
      const vz = Math.sqrt(Math.max(0, 1 - d2));
      const [bx, by, bz] = toBody(vx, vy, vz);
      const lon = Math.atan2(bx, bz), lat = Math.asin(clamp(by, -1, 1));
      let R = 0, G = 0, Bc = 0;
      const lam0 = bx * Lb[0] + by * Lb[1] + bz * Lb[2];
      if (kind === 'earth') {
        const u = (lon / (2 * Math.PI) + .5) * Tx.w, v = (.5 - lat / Math.PI) * Tx.h;
        bilin(Tx, u, v, 0, 5, s);
        const cu = ((lon + cshift) / (2 * Math.PI) + .5) * Tx.w;
        bilin(Tx, cu, v, 5, 1, s2);
        const cl = s2[0];
        const dif = Math.max(0, lam0), day = smooth(clamp((lam0 + .06) / .2));
        const k = (.015 + 1.25 * Math.pow(dif, .85));
        R = s[0] * k; G = s[1] * k; Bc = s[2] * k;
        // ocean glint
        const nd = (vx * hx + vy * hy + vz * hz) / hn;
        const sp = Math.pow(Math.max(0, nd), 70) * 1.4 * s[3] * (1 - cl) * day + Math.pow(Math.max(0, nd), 8) * .06 * s[3] * day;
        R += sp; G += sp * .92; Bc += sp * .8;
        const ck = .02 + 1.3 * Math.pow(dif, .8);
        R = lerp(R, .95 * ck, cl * .92); G = lerp(G, .97 * ck, cl * .92); Bc = lerp(Bc, 1 * ck, cl * .92);
        const nl = s[4] * (1 - day) * (1 - cl * .75) * (o.lights ?? 1) * .55;
        R += nl * 1.3; G += nl * .85; Bc += nl * .45;
        // atmosphere & sunset band
        const fr = Math.pow(1 - vz, 2.2), litA = smooth(clamp((lam0 + .2) / .5));
        const sunset = Math.exp(-sq((lam0 - .02) / .07)) * .5;
        R += (atmo[0] * fr * 1.1 + sunset * 1.0 * fr) * litA + sunset * .05;
        G += (atmo[1] * fr * 1.1 + sunset * .45 * fr) * litA + sunset * .02;
        Bc += (atmo[2] * fr * 1.1 + sunset * .2 * fr) * litA;
      } else {
        const isM = kind === 'mars';
        const u = (lon / (2 * Math.PI) + .5) * Tx.w, v = (.5 - lat / Math.PI) * Tx.h;
        bilin(Tx, u, v, 0, isM ? 5 : 3, s);
        const gxv = (s[isM ? 3 : 1] - .502) * 255 / 6 * bump, gyv = (s[isM ? 4 : 2] - .502) * 255 / 6 * bump;
        const sl = Math.sin(lat), cl2 = Math.cos(lat), so = Math.sin(lon), co = Math.cos(lon);
        // perturb normal along east/north tangents
        let nx = bx - (gxv * co + gyv * (-sl * so)), ny = by - gyv * cl2, nz = bz - (gxv * -so + gyv * (-sl * co));
        const nn = Math.hypot(nx, ny, nz); nx /= nn; ny /= nn; nz /= nn;
        const lam = nx * Lb[0] + ny * Lb[1] + nz * Lb[2];
        const mu0 = Math.max(0, lam), mu = Math.max(.05, vz);
        const ls = mu0 / (mu0 + mu) * 2;
        const sh = (isM ? .55 * mu0 + .45 * ls : .35 * mu0 + .65 * ls) * smooth(clamp(lam0 * 8 + .6));
        const alb = isM ? [s[0], s[1], s[2]] : [s[0] * 1.02, s[0] * 1.0, s[0] * .96];
        const amb = o.ambient ?? .008;
        R = alb[0] * (sh * 1.25 + amb); G = alb[1] * (sh * 1.25 + amb); Bc = alb[2] * (sh * 1.25 + amb);
        if (isM) { const fr = Math.pow(1 - vz, 3) * smooth(clamp((lam0 + .1) / .4)); R += fr * .5; G += fr * .25; Bc += fr * .15; }
      }
      const tint = o.tint ?? [1, 1, 1];
      R = tone(R * expo * tint[0]); G = tone(G * expo * tint[1]); Bc = tone(Bc * expo * tint[2]);
      d[idx] = lerp(d[idx], R, cov); d[idx + 1] = lerp(d[idx + 1], G, cov); d[idx + 2] = lerp(d[idx + 2], Bc, cov);
    }
  }
}

// Sun disc with limb darkening and boiling granulation
function sunDisc(P, o) {
  const { cx, cy, r } = o, t = o.t ?? 0, d = P.d;
  const xs = Math.max(0, Math.floor(cx - r - 2)), xe = Math.min(W - 1, Math.ceil(cx + r + 2));
  const ys = Math.max(0, Math.floor(cy - r - 2)), ye = Math.min(H - 1, Math.ceil(cy + r + 2));
  for (let y = ys; y <= ye; y++) for (let x = xs; x <= xe; x++) {
    const qx = (x + .5 - cx) / r, qy = (y + .5 - cy) / r, d2 = qx * qx + qy * qy;
    if (d2 > 1.02) continue;
    const dist = Math.sqrt(d2), cov = clamp((1 - dist) * r + .5), mu = Math.sqrt(Math.max(0, 1 - d2));
    const g = noise3(qx * 38, qy * 38, t * .6) * .5 + noise3(qx * 90, qy * 90, t * 1.1) * .3 + noise3(qx * 7, qy * 7, t * .2) * .4;
    const ld = .35 + .65 * Math.pow(mu, .6);
    const I = ld * (1 + g * .22);
    const idx = (y * W + x) * 4;
    const R = tone(I * 1.9), G = tone(I * 1.0 * (.6 + .4 * mu)), Bc = tone(I * .38 * mu);
    d[idx] = lerp(d[idx], R, cov); d[idx + 1] = lerp(d[idx + 1], G, cov); d[idx + 2] = lerp(d[idx + 2], Bc, cov);
  }
}

// ---------------- lunar ground (ray-cast plane, baked low-sun lighting) ----------------
const GS = 1024;
function genGround() {
  // periodic value noise
  const r = rng(77), lat = (n) => { const a = new Float32Array(n * n); for (let i = 0; i < a.length; i++) a[i] = r() * 2 - 1; return a; };
  const L = [8, 16, 32, 64, 128, 256].map((n) => [n, lat(n)]);
  const pn = (n, a, x, y) => { const X = x * n, Y = y * n, xi = Math.floor(X), yi = Math.floor(Y), fx = X - xi, fy = Y - yi, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
    const g = (i, j) => a[((j % n + n) % n) * n + ((i % n + n) % n)]; return lerp(lerp(g(xi, yi), g(xi + 1, yi), u), lerp(g(xi, yi + 1), g(xi + 1, yi + 1), u), v); };
  const ht = new Float32Array(GS * GS);
  for (let y = 0; y < GS; y++) for (let x = 0; x < GS; x++) {
    let s = 0, amp = 1;
    for (const [n, a] of L) { s += pn(n, a, x / GS, y / GS) * amp; amp *= .5; }
    ht[y * GS + x] = s * 1.3;
  }
  // craters (tile spans 200 m; heights in metres; texel = 0.195 m)
  for (let k = 0; k < 650; k++) {
    const u = r(), rad = Math.min(160, 2.2 * Math.pow(1 / Math.max(u, .01), .62)), cx = r() * GS, cy = r() * GS, depth = rad * .2 * (.6 + r() * .6), ext = rad * 2.2;
    for (let y = Math.floor(cy - ext); y <= cy + ext; y++) for (let x = Math.floor(cx - ext); x <= cx + ext; x++) {
      const d = Math.hypot(x - cx, y - cy) / rad;
      if (d > 2.2) continue;
      const v = d < 1 ? (d * d - 1) * .9 + .22 * Math.exp(-sq((d - 1) / .12)) : .22 * Math.exp(-sq((d - 1) / .3));
      const i = (((y % GS) + GS) % GS) * GS + (((x % GS) + GS) % GS);
      ht[i] += v * depth;
    }
  }
  // boulders
  for (let k = 0; k < 1500; k++) {
    const cx = r() * GS, cy = r() * GS, rad = .6 + Math.pow(r(), 4) * 5;
    for (let y = Math.floor(cy - rad); y <= cy + rad; y++) for (let x = Math.floor(cx - rad); x <= cx + rad; x++) {
      const d = Math.hypot(x - cx, y - cy) / rad; if (d > 1) continue;
      ht[(((y % GS) + GS) % GS) * GS + (((x % GS) + GS) % GS)] += Math.sqrt(1 - d * d) * rad * .18;
    }
  }
  // baked lighting: sun low (elevation ~7 deg) from -x
  const el = 11 * Math.PI / 180, sx = -Math.cos(el), sy = Math.sin(el), tanE = Math.tan(el), tx = .195;
  const lum = new Float32Array(GS * GS);
  const at = (x, y) => ht[(((y % GS) + GS) % GS) * GS + (((x % GS) + GS) % GS)];
  for (let y = 0; y < GS; y++) for (let x = 0; x < GS; x++) {
    const gx = (at(x + 1, y) - at(x - 1, y)) / (2 * tx), gz = (at(x, y + 1) - at(x, y - 1)) / (2 * tx);
    let nx = -gx, ny = 1, nz = -gz; const nn = Math.hypot(nx, ny, nz); nx /= nn; ny /= nn; nz /= nn;
    const lam = Math.min(2.6, Math.max(0, -sx * nx + sy * ny) / sy);
    let shadow = 0; const h0 = at(x, y);
    for (let k = 1; k < 220; k += k < 20 ? 1 : 3) { const ex = at(x - k, y) - (h0 + k * tx * tanE); if (ex > 0) { shadow = Math.max(shadow, clamp(ex / .25)); if (shadow >= 1) break; } }
    const alb = .5 + pn(32, L[2][1], x / GS, y / GS) * .08 + pn(256, L[5][1], x / GS, y / GS) * .06;
    lum[y * GS + x] = alb * (lam * (1 - shadow) * .62 + .02);
  }
  // mip chain (level 0 lightly blurred to soften texel edges)
  const lb = new Float32Array(GS * GS);
  for (let y = 0; y < GS; y++) for (let x = 0; x < GS; x++) {
    let s = 0; for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) s += lum[(((y + j) & (GS - 1)) * GS) + ((x + i) & (GS - 1))] * (i || j ? (i && j ? .0625 : .125) : .25);
    lb[y * GS + x] = s;
  }
  const levels = [lb];
  let cur = lb, n = GS;
  while (n > 1) { const m = n >> 1, nx = new Float32Array(m * m); for (let y = 0; y < m; y++) for (let x = 0; x < m; x++) nx[y * m + x] = (cur[2 * y * n + 2 * x] + cur[2 * y * n + 2 * x + 1] + cur[(2 * y + 1) * n + 2 * x] + cur[(2 * y + 1) * n + 2 * x + 1]) / 4; levels.push(nx); cur = nx; n = m; }
  return levels;
}
let GROUND = null;
function groundTex() {
  if (GROUND) return GROUND;
  const f = path.join(CACHE, 'ground.bin');
  if (fs.existsSync(f)) {
    const all = new Float32Array(fs.readFileSync(f).buffer.slice(0)), lv = [];
    let off = 0, n = GS; while (n >= 1) { lv.push(all.subarray(off, off + n * n)); off += n * n; n >>= 1; }
    GROUND = lv;
  } else {
    console.error('generating ground');
    GROUND = genGround();
    const tot = GROUND.reduce((s, a) => s + a.length, 0), all = new Float32Array(tot); let off = 0;
    for (const a of GROUND) { all.set(a, off); off += a.length; }
    fs.writeFileSync(f, Buffer.from(all.buffer));
  }
  return GROUND;
}
function sampleLevel(lv, n, u, v) {
  u = u * n - .5; v = v * n - .5;
  const x0 = Math.floor(u), y0 = Math.floor(v), fx = u - x0, fy = v - y0;
  const xa = ((x0 % n) + n) % n, xb = (xa + 1) % n, ya = ((y0 % n) + n) % n, yb = (ya + 1) % n;
  return (lv[ya * n + xa] * (1 - fx) + lv[ya * n + xb] * fx) * (1 - fy) + (lv[yb * n + xa] * (1 - fx) + lv[yb * n + xb] * fx) * fy;
}
// camera: {x, z, h (m), pitch (rad, negative = down), yaw (rad), f (focal px)}
function ground(P, cam, o = {}) {
  const G = groundTex(), d = P.d, TILE = o.tile ?? 200;
  const cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch), cy = Math.cos(cam.yaw), sy = Math.sin(cam.yaw), f = cam.f;
  const expo = o.exposure ?? 1, tint = o.tint ?? [1.02, .99, .94];
  const nlev = G.length;
  for (let y = 0; y < H; y++) {
    const ry0 = -(y + .5 - H / 2) / f;
    for (let x = 0; x < W; x++) {
      const rx0 = (x + .5 - W / 2) / f;
      // pitch about X then yaw about Y
      const ry = ry0 * cp + sp, rz0 = -ry0 * sp + cp;
      if (ry >= -1e-4) continue;
      const rx = rx0 * cy + rz0 * sy, rz = -rx0 * sy + rz0 * cy;
      const len = Math.hypot(rx0, ry0, 1);
      const t = cam.h / -ry;
      const wx = cam.x + t * rx, wz = cam.z + t * rz;
      const fp = (t * len / f) / Math.sqrt(-ry / len) / (TILE / GS);
      let lvl = Math.log2(Math.max(1, fp));
      if (lvl > nlev - 2) lvl = nlev - 2;
      const l0 = Math.floor(lvl), fl = lvl - l0, n0 = GS >> l0, n1 = n0 >> 1;
      const u = wx / TILE, v = wz / TILE;
      let L = sampleLevel(G[l0], n0, u, v);
      if (fl > 0) L = lerp(L, sampleLevel(G[l0 + 1], n1, u, v), fl);
      // second, coarser octave for large-scale variation
      const u2 = wx / (TILE * 9.7) + .37, v2 = wz / (TILE * 9.7) + .11;
      let lvl2 = Math.max(0, Math.min(nlev - 2, lvl - Math.log2(9.7)));
      const m0 = Math.floor(lvl2), m1 = GS >> m0;
      const L2 = lerp(sampleLevel(G[m0], m1, u2, v2), sampleLevel(G[m0 + 1], m1 >> 1, u2, v2), lvl2 - m0);
      let lum = L * (.55 + 1.3 * L2);
      // fine regolith grain, faded out once a pixel covers it
      const pxm = t * len / f;
      if (pxm < .08) lum *= 1 + noise2(wx * 23, wz * 23) * .35 * (1 - pxm / .08);
      const fade = clamp(-ry / len * 40);
      lum = lerp(.3, lum, fade) * expo;
      const idx = (y * W + x) * 4;
      const a = clamp(-ry / len * 600);
      d[idx] = lerp(d[idx], tone(lum * tint[0]), a); d[idx + 1] = lerp(d[idx + 1], tone(lum * tint[1]), a); d[idx + 2] = lerp(d[idx + 2], tone(lum * tint[2]), a);
    }
  }
}
// project a world point (x, y up, z) for the same ground camera
function groundProject(cam, X, Y, Z) {
  let dx = X - cam.x, dy = Y - cam.h, dz = Z - cam.z;
  const cy = Math.cos(cam.yaw), sy = Math.sin(cam.yaw);
  const x1 = dx * cy - dz * sy, z1 = dx * sy + dz * cy;
  const cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
  const y2 = dy * cp - z1 * sp, z2 = dy * sp + z1 * cp;
  return [W / 2 + x1 / z2 * cam.f, H / 2 - y2 / z2 * cam.f, z2];
}

module.exports = { Pix, sphere, sunDisc, ground, groundProject, tex, groundTex };
