// Per-pixel sea and beach. A perspective water plane reflects the sky that was actually drawn above it
// (clouds, sun, glow), with Fresnel, a wave spectrum that fades with pixel footprint, sun glitter,
// breaking surf, swash and wet sand. Rendered into an offscreen layer and drawn through the caller's transform.
const { C, W, H, clamp, lerp, rng, noise2 } = require('./core');

let LAY = null;
function layer() {
  if (!LAY) { const cv = C.createCanvas(W, H); LAY = { cv, ctx: cv.getContext('2d') }; }
  const c = LAY.ctx;
  c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; c.filter = 'none';
  return LAY;
}

// sine table
const TN = 4096, TAB = new Float32Array(TN + 1);
for (let i = 0; i <= TN; i++) TAB[i] = Math.sin(i / TN * Math.PI * 2);
const I2P = TN / (Math.PI * 2);
function fsin(a) { let u = a * I2P; u -= Math.floor(u / TN) * TN; const i = u | 0, f = u - i; return TAB[i] + (TAB[i + 1] - TAB[i]) * f; }

// directional wave spectrum; dir = travel direction in radians, 0 = toward the camera (-Z)
function spectrum(seed, dir, o = {}) {
  const n = o.n ?? 22, lmin = o.lmin ?? .14, lmax = o.lmax ?? 30, r = rng(seed), out = [];
  for (let i = 0; i < n; i++) {
    const u = i / (n - 1), lam = lmax * Math.pow(lmin / lmax, u) * (.82 + r() * .36);
    const k = 2 * Math.PI / lam, a = dir + (r() - .5) * (.9 + u * 2.4);
    const steep = (o.steep ?? .075) * (.55 + r() * .9) * (u < .25 ? (o.swell ?? .7) : 1);
    out.push({ kx: Math.sin(a) * k, kz: -Math.cos(a) * k, k, w: Math.sqrt(9.81 * k) * (o.speed ?? 1), ph: r() * 6.283, A: steep / k });
  }
  return out;
}
const DEFAULT_WAVES = spectrum(17, .25);

const sm = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };

let CSB = null;
function cumul(d, rows) {
  const n = W * rows * 3;
  if (!CSB || CSB.length < n) CSB = new Float32Array(W * H * 3);
  for (let x = 0; x < W; x++) { CSB[x * 3] = 0; CSB[x * 3 + 1] = 0; CSB[x * 3 + 2] = 0; }
  for (let y = 1; y < rows; y++) {
    const p = (y - 1) * W * 3, q = y * W * 3, s = (y - 1) * W * 4;
    for (let x = 0; x < W; x++) { CSB[q + x * 3] = CSB[p + x * 3] + d[s + x * 4]; CSB[q + x * 3 + 1] = CSB[p + x * 3 + 1] + d[s + x * 4 + 1]; CSB[q + x * 3 + 2] = CSB[p + x * 3 + 2] + d[s + x * 4 + 2]; }
  }
  return CSB;
}

// o: { hy, y1, t, cx, f, hc, sky(ctx), waves,
//      deep, sss, foam, sand, wet, land, sun:{x,y,i,col}, fog, caps,
//      shore:{nx,nz,c0,wob, surfW, surfLen, surfSpeed, runup, period, beachW} }
// returns the layer canvas (sky + water) ready to be drawn
function render(o) {
  const L = layer(), c = L.ctx;
  c.fillStyle = '#000'; c.fillRect(0, 0, W, H);
  o.sky(c);
  const hy = o.hy, t = o.t, cx = o.cx ?? W / 2, f = o.f ?? 1500, hc = o.hc ?? 2;
  const y0 = Math.max(0, Math.floor(hy)), y1 = Math.min(H, Math.ceil(o.y1 ?? H));
  if (y1 <= y0) return L.cv;
  const img = c.getImageData(0, 0, W, H), d = img.data;
  const waves = o.waves ?? DEFAULT_WAVES, N = waves.length;
  const KX = new Float32Array(N), KZ = new Float32Array(N), AK = new Float32Array(N), AA = new Float32Array(N), WT = new Float32Array(N), ATT = new Float32Array(N), SL2 = new Float32Array(N);
  let Asum = 0;
  waves.forEach((w, i) => { KX[i] = w.kx; KZ[i] = w.kz; AK[i] = w.A * w.k; AA[i] = w.A; WT[i] = w.w * t - w.ph; SL2[i] = (w.A * w.k) ** 2 / 2; if (i < 4) Asum += w.A; });
  const deep = o.deep ?? [8, 26, 40], sss = o.sss ?? null, foam = o.foam ?? [220, 225, 230];
  const sun = o.sun ?? null, fogD = o.fog ?? 4000, caps = o.caps ?? .25;
  let sdx = 0, sdy = 0, sdz = 0;
  if (sun) { const a = sun.x - cx, b = hy - sun.y, n = Math.hypot(a, b, f); sdx = a / n; sdy = b / n; sdz = f / n; }
  const sh = o.shore ?? null;
  const sand = o.sand ?? [190, 170, 140], wet = o.wet ?? [120, 100, 80], land = o.land ?? null;
  const surfW = sh?.surfW ?? 45, surfLen = sh?.surfLen ?? 20, surfC = sh?.surfSpeed ?? 3.6, runR = sh?.runup ?? 5, period = sh?.period ?? 7, beachW = sh?.beachW ?? 40;
  const yLimitSky = Math.max(0, y0 - 1);
  const col = [0, 0, 0];
  // sky lookup (bilinear) into rows above the horizon
  const skyAt = (xr, yr) => {
    if (xr < 0) xr = 0; else if (xr > W - 1.001) xr = W - 1.001;
    if (yr < 0) yr = 0; else if (yr > yLimitSky - .001) yr = yLimitSky - .001;
    const xi = xr | 0, yi = yr | 0, fx = xr - xi, fy = yr - yi, i00 = (yi * W + xi) * 4, i01 = i00 + W * 4;
    for (let k = 0; k < 3; k++) col[k] = (d[i00 + k] * (1 - fx) + d[i00 + 4 + k] * fx) * (1 - fy) + (d[i01 + k] * (1 - fx) + d[i01 + 4 + k] * fx) * fy;
  };
  const DX = new Float32Array(N), DZ = new Float32Array(N);
  for (let i = 0; i < N; i++) { const k = Math.sqrt(KX[i] * KX[i] + KZ[i] * KZ[i]); DX[i] = KX[i] / k; DZ[i] = KZ[i] / k; }
  // column prefix sums of the sky: a rough surface reflects a vertically smeared sky
  const SH = yLimitSky + 1, CS = cumul(d, SH);
  const skyBlur = (xr, yr, rad) => {
    if (rad < 1.2) return skyAt(xr, yr);
    let xi = Math.round(xr); if (xi < 0) xi = 0; else if (xi > W - 1) xi = W - 1;
    let a = Math.round(yr - rad), b = Math.round(yr + rad);
    if (a < 0) a = 0; if (b > SH - 1) b = SH - 1; if (a >= b) a = b - 1;
    if (a < 0) return skyAt(xr, yr);
    const n = b - a, ia = (a * W + xi) * 3, ib = (b * W + xi) * 3;
    col[0] = (CS[ib] - CS[ia]) / n; col[1] = (CS[ib + 1] - CS[ia + 1]) / n; col[2] = (CS[ib + 2] - CS[ia + 2]) / n;
  };
  // horizon colour per column for distance haze
  const HZ = new Float32Array(W * 3);
  for (let x = 0; x < W; x++) { skyAt(x, hy - 2); HZ[x * 3] = col[0]; HZ[x * 3 + 1] = col[1]; HZ[x * 3 + 2] = col[2]; }
  const wob = sh?.wob ?? 0, snx = sh?.nx ?? 0, snz = sh?.nz ?? 0, sc0 = sh?.c0 ?? 0;
  const wcol = [0, 0, 0], scol = [0, 0, 0];
  for (let y = y0; y < y1; y++) {
    const dy = y + .5 - hy; if (dy <= .05) continue;
    const Z = hc * f / dy, fxp = Z / f, fzp = Z / dy;
    // fade waves the pixel can no longer resolve; their slope variance becomes roughness
    let lost = 0;
    for (let i = 0; i < N; i++) { const fp = Math.sqrt((KX[i] * fxp) ** 2 + (KZ[i] * fzp) ** 2), a = 1 - sm(.45, 1.9, fp); ATT[i] = a; lost += (1 - a * a) * SL2[i]; }
    const sig2 = .0012 + lost, fog = 1 - Math.exp(-Z / fogD), blurR = Math.sqrt(lost) * f * (o.blur ?? .7);
    const capFade = 1 - sm(.6, 3, fzp), detail = 1 - sm(.05, .5, fzp), faw = 1 - sm(.4, 1.6, fzp / surfLen * 6);
    const fpd = Math.abs(snx) * fxp + Math.abs(snz) * fzp + .02;
    for (let x = 0; x < W; x++) {
      const X = (x + .5 - cx) * fxp, o4 = (y * W + x) * 4;
      // classify against the shoreline
      let ds = 1e9, along = 0, wash = 0, cover = 1;
      if (sh) {
        const ds0 = snx * X + snz * Z - sc0;
        along = -snz * X + snx * Z;
        if (ds0 < surfW + wob + 2) {
          ds = ds0 + wob * noise2(along * .013, 4.1);
          const ph = t / period + noise2(along * .02, 9.3) * .9, cyc = ph - Math.floor(ph);
          // run-up rushes in fast, drains slowly
          wash = runR * (cyc < .3 ? sm(0, .3, cyc) : 1 - sm(.3, 1, cyc)) * (.55 + .45 * noise2(along * .05, Math.floor(ph) * 3.1));
          cover = clamp((ds + wash) / fpd + .5);
        } else ds = ds0;
      }
      // ---------- land ----------
      if (cover < 1) {
        const dl = -ds; // metres inland of mean shoreline
        if (land && dl > beachW) land(X, Z, fxp, fzp, scol);
        else {
          const n1 = noise2(X * .55, Z * .55);
          let r = 1 + n1 * .1;
          if (detail > 0) r += (noise2(X * 7, Z * 7) * .1 + Math.sin(X * 2.2 + Z * 5.4 + n1 * 4) * .05) * detail;
          const wetK = sm(runR * 1.15, runR * .8, dl), line = Math.exp(-(((dl - runR * 1.2 + n1 * .8) / .22) ** 2)) * .3 * (.5 + .5 * noise2(along * .9, 2.2));
          for (let k = 0; k < 3; k++) scol[k] = lerp(sand[k], wet[k], wetK) * r * (1 - line);
          if (wetK > .05) {
            // wet sand is a dull mirror at grazing angles
            const vl = Math.sqrt(X * X + hc * hc + Z * Z), cv = 1 - hc / vl, F = .02 + .98 * cv * cv * cv * cv * cv;
            skyBlur(x + noise2(X * 2, Z * 2) * 3, hy - dy + noise2(X * 3, Z * 3) * 2, 7);
            const m = wetK * (.2 + .6 * F);
            for (let k = 0; k < 3; k++) scol[k] = lerp(scol[k], col[k], m);
          }
          if (dl > beachW * .8 && land) { land(X, Z, fxp, fzp, col); const m = sm(beachW * .8, beachW, dl); for (let k = 0; k < 3; k++) scol[k] = lerp(scol[k], col[k], m); }
        }
        if (cover <= 0) { d[o4] = scol[0]; d[o4 + 1] = scol[1]; d[o4 + 2] = scol[2]; d[o4 + 3] = 255; continue; }
      }
      // ---------- water ----------
      let sx = 0, sz = 0, hh = 0, hb = 0;
      for (let i = 0; i < N; i++) {
        const a = ATT[i]; if (a < .01) continue;
        const th = KX[i] * X + KZ[i] * Z - WT[i], s = fsin(th), co = fsin(th + 1.5707963);
        const g = AK[i] * a * co; sx += g * DX[i]; sz += g * DZ[i];
        hh += AA[i] * a * s; if (i < 4) hb += AA[i] * s;
      }
      let foamK = 0, shallow = 0, faceK = 0, swash = 0;
      if (sh && ds < surfW) {
        // breakers: crest lines parallel to the shore rolling in, whitewater left behind them
        const str = ds > 0 ? sm(surfW, surfW * .35, ds) : 1;
        const u0 = (ds + surfC * t) / surfLen + noise2(along * .03, 1.7) * .35, u = u0 - Math.floor(u0);
        if (u > .84) { const k = sm(.84, .985, u); faceK = k * str * faw; sx += snx * .6 * faceK; sz += snz * .6 * faceK; }
        else if (u < .35) { const k = 1 - u / .35; sx -= snx * .12 * k * str * faw; sz -= snz * .12 * k * str * faw; }
        const lace = .5 + .5 * noise2(X * 1.1 + Z * .2, Z * 1.1 - t * .35) + (detail > 0 ? noise2(X * 5, Z * 5 + t * .2) * .35 * detail : 0);
        const crest = u > .94 ? sm(.94, .99, u) : u < .5 ? Math.pow(1 - u / .5, 1.3) : 0;
        const inner = sm(surfW * .5, surfW * .1, ds);
        foamK = clamp(crest * str * str * (lace * 1.4 - .1)) * faw + (1 - faw) * str * .3;
        foamK = Math.max(foamK, clamp(lace * 1.3 - .55) * inner * .8);
        shallow = sm(surfW * .6, 0, ds);
        // swash sheet + its foam edge
        if (ds < 0) { swash = 1; const e = ds + wash; foamK = Math.max(foamK, clamp(Math.exp(-((e / .45) ** 2)) * (.5 + .6 * lace)), clamp(lace * .6 - .15)); }
      }
      if (caps > 0 && capFade > 0 && hb > Asum * .5) foamK = Math.max(foamK, sm(.5, .85, hb / Asum) * clamp(noise2(X * .25 + 3, Z * .25 - t * .1) * 3 - .6) * caps * capFade);
      // normal, view, reflection
      let nx = -sx, ny = 1, nz = -sz; { const n = Math.sqrt(nx * nx + 1 + nz * nz); nx /= n; ny /= n; nz /= n; }
      const vl = Math.sqrt(X * X + hc * hc + Z * Z), vx = X / vl, vy = -hc / vl, vz = Z / vl;
      const vn = vx * nx + vy * ny + vz * nz;
      const rx = vx - 2 * vn * nx; let ry = vy - 2 * vn * ny, rz = vz - 2 * vn * nz;
      if (rz < .05) rz = .05; if (ry < .0004) ry = .0004;
      skyBlur(cx + rx / rz * f, hy - ry / rz * f - blurR * .4, blurR);
      const cv = 1 - clamp(-vn, .02, 1), F = .02 + .98 * cv * cv * cv * cv * cv;
      // water body colour: deep, brighter and greener up the faces and crests
      const lift = clamp(.5 + hh * 2.2) * .7 + faceK * .9;
      for (let k = 0; k < 3; k++) wcol[k] = deep[k] * (.75 + lift * .6) + (sss ? sss[k] * faceK * .55 : 0);
      if (shallow > 0) for (let k = 0; k < 3; k++) wcol[k] = lerp(wcol[k], wet[k] * .8, shallow * .35 + swash * .4);
      for (let k = 0; k < 3; k++) wcol[k] = lerp(wcol[k], col[k], F);
      // sun glitter from the unresolved roughness
      if (sun && sun.i > 0) {
        let hx = sdx - vx, hyy = sdy - vy, hz = sdz - vz; const hn = Math.sqrt(hx * hx + hyy * hyy + hz * hz); hx /= hn; hyy /= hn; hz /= hn;
        const ax = -hx / hyy - sx, az = -hz / hyy - sz, e = (ax * ax + az * az) / (2 * sig2);
        if (e < 12) { const g = Math.exp(-e) / (6.283 * sig2) * sun.i * .0025 * (.3 + F); for (let k = 0; k < 3; k++) wcol[k] += sun.col[k] * g; }
      }
      if (foamK > 0) { const fk = clamp(foamK); for (let k = 0; k < 3; k++) wcol[k] = lerp(wcol[k], foam[k] * (.8 + .2 * ny) * (.85 + .15 * fk), fk); }
      // haze toward the horizon
      if (fog > .002) for (let k = 0; k < 3; k++) wcol[k] = lerp(wcol[k], HZ[x * 3 + k], fog);
      if (cover < 1) for (let k = 0; k < 3; k++) wcol[k] = lerp(scol[k], wcol[k], cover);
      d[o4] = wcol[0]; d[o4 + 1] = wcol[1]; d[o4 + 2] = wcol[2]; d[o4 + 3] = 255;
    }
  }
  c.putImageData(img, 0, 0);
  return L.cv;
}

// draw sky + sea through ctx's current transform
function scene(ctx, o) { const cv = render(o); ctx.drawImage(cv, 0, 0); }

// ground-plane projection helpers shared with the vector layers drawn on top
const cam = (o) => ({
  y: (Z) => o.hy + o.hc * o.f / Z,                        // screen row of a ground point at distance Z
  x: (X, Z) => (o.cx ?? W / 2) + X / Z * o.f,             // screen column
  s: (Z) => o.f / Z,                                      // pixels per metre at distance Z
  Z: (y) => o.hc * o.f / (y - o.hy),
});

module.exports = { render, scene, spectrum, cam, layer, fsin };
