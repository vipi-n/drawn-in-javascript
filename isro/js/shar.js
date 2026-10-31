// Sriharikota launch complex: sky palettes, lightning masts, umbilical towers, pedestals.
const { W, H, clamp, lerp, hash, rng, noise2, smooth } = require('./core');
const { rgba, mixc, vgrad, glow, puff } = require('./gfx');

const PAL = {
  day: { top: [30, 80, 156], mid: [104, 156, 212], low: [206, 216, 224], sun: [255, 250, 236], sea: [36, 86, 122], seaFar: [126, 164, 192], glint: [255, 252, 240], foam: [246, 248, 250], sand: [204, 186, 150], tree: [34, 58, 36], treeLit: [92, 124, 66], haze: [186, 202, 214], steel: [120, 126, 136], steelLit: [236, 238, 240], concrete: [176, 172, 164], cloud: [246, 248, 252], cloudSh: [150, 162, 182] },
  dusk: { top: [10, 14, 46], mid: [84, 58, 108], low: [238, 128, 84], sun: [255, 170, 110], sea: [40, 32, 60], seaFar: [150, 90, 110], glint: [255, 190, 140], foam: [230, 200, 210], sand: [70, 50, 60], tree: [12, 9, 16], treeLit: [70, 40, 50], haze: [150, 100, 120], steel: [60, 50, 70], steelLit: [255, 190, 140], concrete: [90, 70, 80], cloud: [255, 176, 150], cloudSh: [70, 54, 96] },
  dawn: { top: [28, 42, 92], mid: [150, 124, 158], low: [255, 186, 138], sun: [255, 222, 176], sea: [58, 66, 96], seaFar: [206, 160, 150], glint: [255, 214, 170], foam: [255, 232, 214], sand: [166, 134, 116], tree: [26, 30, 34], treeLit: [124, 96, 70], haze: [226, 182, 166], steel: [96, 92, 104], steelLit: [255, 206, 160], concrete: [150, 130, 124], cloud: [255, 214, 186], cloudSh: [120, 104, 130] },
  night: { top: [2, 4, 12], mid: [6, 12, 28], low: [22, 28, 44], sun: [0, 0, 0], sea: [6, 10, 18], seaFar: [20, 26, 40], glint: [255, 220, 180], foam: [110, 120, 140], sand: [26, 24, 26], tree: [5, 7, 9], treeLit: [44, 38, 30], haze: [36, 40, 52], steel: [18, 20, 26], steelLit: [255, 214, 160], concrete: [40, 38, 40], cloud: [30, 34, 46], cloudSh: [10, 12, 18] },
};

// ---------------- sky & clouds ----------------
function sky(ctx, hy, t, p, o = {}) {
  vgrad(ctx, [[0, p.top], [.62, p.mid], [1, p.low]], -40, hy + 2);
  if (o.sunX != null) { glow(ctx, o.sunX, o.sunY, 900, p.sun, .35); glow(ctx, o.sunX, o.sunY, 180, [255, 255, 250], .55); }
  if (o.clouds === false) return;
  const r = rng(o.seed ?? 31);
  for (let i = 0; i < (o.n ?? 6); i++) {
    const base = r() * (hy - 120) * .75 + 60, depth = .4 + r() * .6, wdt = (180 + r() * 380) * depth;
    const cx = ((r() * (W + 900) + t * (6 + 10 * depth)) % (W + 900)) - 450;
    const cy = base + (o.dy ?? 0) * depth;
    for (let j = 0; j < 11; j++) {
      const u = j / 10 - .5, px = cx + u * wdt + (r() - .5) * 40 * depth, rr = (40 + r() * 70) * depth * (1 - Math.abs(u) * .9);
      puff(ctx, px, cy - rr * .45, rr, mixc(p.cloud, p.cloudSh, .25), .55 * (o.cloudA ?? 1), p.cloud, .8);
    }
  }
}

// ---------------- launch complex ----------------
function lattice(ctx, x, yb, w, h, col, lw, panels) {
  ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath();
  ctx.moveTo(x, yb); ctx.lineTo(x, yb - h); ctx.moveTo(x + w, yb); ctx.lineTo(x + w, yb - h);
  const n = panels ?? Math.max(3, Math.round(h / w));
  for (let i = 0; i <= n; i++) { const y = yb - h * i / n; ctx.moveTo(x, y); ctx.lineTo(x + w, y); if (i < n) { ctx.moveTo(x, y); ctx.lineTo(x + w, y - h / n); ctx.moveTo(x + w, y); ctx.lineTo(x, y - h / n); } }
  ctx.stroke();
}
// tapering lightning-protection mast with blinking aviation lights
function mast(ctx, x, yb, h, p, t, o = {}) {
  const w0 = h * .05, w1 = h * .012, steel = rgba(mixc(p.steel, p.haze, o.haze ?? 0)), lw = Math.max(1, h * .004);
  ctx.strokeStyle = steel; ctx.lineWidth = lw * 1.6; ctx.beginPath();
  ctx.moveTo(x - w0, yb); ctx.lineTo(x - w1, yb - h * .9); ctx.moveTo(x + w0, yb); ctx.lineTo(x + w1, yb - h * .9); ctx.stroke();
  ctx.lineWidth = lw; ctx.beginPath();
  for (let i = 0; i < 18; i++) { const u0 = i / 18, u1 = (i + 1) / 18, a0 = lerp(w0, w1, u0), a1 = lerp(w1 * 0 + w0, w1, u1); ctx.moveTo(x - a0, yb - h * .9 * u0); ctx.lineTo(x + a1, yb - h * .9 * u1); ctx.moveTo(x + a0, yb - h * .9 * u0); ctx.lineTo(x - a1, yb - h * .9 * u1); }
  ctx.stroke();
  ctx.lineWidth = lw * 1.3; ctx.beginPath(); ctx.moveTo(x, yb - h * .9); ctx.lineTo(x, yb - h); ctx.stroke();
  const on = Math.sin(t * 3 + x) > 0;
  for (const u of [1, .6]) { const ly = yb - h * u; ctx.fillStyle = 'rgb(255,60,40)'; ctx.fillRect(x - 2, ly - 2, 4, 4); if (on) glow(ctx, x, ly, 26, [255, 50, 30], .8); }
}
// umbilical tower: square lattice, work platforms, service arms toward the vehicle, red/white crown
function umbilical(ctx, x, yb, w, h, p, o = {}) {
  const steel = rgba(mixc(p.steel, p.haze, o.haze ?? 0)), lit = rgba(p.steelLit, o.night ? .55 : .8), lw = Math.max(1.2, w * .035);
  ctx.fillStyle = rgba(mixc(p.steel, [0, 0, 0], .5), .22); ctx.fillRect(x, yb - h, w, h);
  lattice(ctx, x + w * .18, yb, w * .64, h, rgba(mixc(p.steel, [0, 0, 0], .3), .8), lw * .6);
  lattice(ctx, x, yb, w, h, steel, lw);
  ctx.strokeStyle = lit; ctx.lineWidth = lw * .9; ctx.beginPath(); const lx = (o.lightSide ?? -1) < 0 ? x : x + w; ctx.moveTo(lx, yb); ctx.lineTo(lx, yb - h); ctx.stroke();
  ctx.fillStyle = steel;
  const floors = Math.round(h / (w * 1.6));
  for (let i = 1; i <= floors; i++) { const y = yb - h * i / floors; ctx.fillRect(x - w * .25, y - w * .06, w * 1.5, w * .1); }
  for (const [u, L] of o.arms ?? []) {
    const y = yb - h * u, dir = o.armDir ?? 1, x0 = dir > 0 ? x + w : x, x1 = x0 + dir * L;
    ctx.strokeStyle = steel; ctx.lineWidth = lw * .8; ctx.beginPath();
    ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.moveTo(x0, y + w * .22); ctx.lineTo(x1, y + w * .12);
    for (let k = 0; k <= 6; k++) { const xx = lerp(x0, x1, k / 6); ctx.moveTo(xx, y); ctx.lineTo(lerp(x0, x1, (k + 1) / 6), y + w * .2); }
    ctx.stroke();
  }
  // crown: cabin, red/white bands, antenna
  const cy = yb - h;
  ctx.fillStyle = rgba(mixc(p.steelLit, p.steel, .4)); ctx.fillRect(x - w * .1, cy - w * .7, w * 1.2, w * .7);
  for (let i = 0; i < 4; i++) { ctx.fillStyle = i % 2 ? 'rgb(236,236,236)' : 'rgb(200,46,40)'; ctx.fillRect(x - w * .1, cy - w * .7 - (i + 1) * w * .14, w * 1.2, w * .14); }
  ctx.strokeStyle = steel; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(x + w * .5, cy - w * 1.26); ctx.lineTo(x + w * .5, cy - w * 2.6); ctx.stroke();
  const on = Math.sin((o.t ?? 0) * 3) > 0;
  if (on) glow(ctx, x + w * .5, cy - w * 2.6, 30, [255, 60, 40], .9);
}
// mobile service tower parked away from the pad
function serviceTower(ctx, x, yb, w, h, p, o = {}) {
  const hz = o.haze ?? 0, body = mixc(mixc(p.steelLit, p.steel, .45), p.haze, hz), side = mixc(mixc(p.steel, [0, 0, 0], .2), p.haze, hz);
  ctx.fillStyle = rgba(side); ctx.fillRect(x + w, yb - h * .96, w * .25, h * .96);
  const g = ctx.createLinearGradient(x, 0, x + w, 0); g.addColorStop(0, rgba(body)); g.addColorStop(1, rgba(mixc(body, [0, 0, 0], .15)));
  ctx.fillStyle = g; ctx.fillRect(x, yb - h, w, h);
  ctx.strokeStyle = rgba(mixc(body, [0, 0, 0], .3), .6); ctx.lineWidth = 1; ctx.beginPath();
  for (let i = 1; i < 16; i++) { const y = yb - h * i / 16; ctx.moveTo(x, y); ctx.lineTo(x + w, y); }
  for (let i = 1; i < 6; i++) { const xx = x + w * i / 6; ctx.moveTo(xx, yb); ctx.lineTo(xx, yb - h); }
  ctx.stroke();
  ctx.fillStyle = rgba(mixc(body, [0, 0, 0], .55)); ctx.fillRect(x + w * .38, yb - h * .9, w * .24, h * .9);
  lattice(ctx, x + w * .3, yb - h, w * .4, h * .12, rgba(mixc(p.steel, p.haze, hz)), 1.2, 3);
  if (o.night) for (let i = 0; i < 9; i++) glow(ctx, x + w * (.1 + .8 * hash(i)), yb - h * (.1 + .8 * hash(i + 3)), 14, [255, 220, 160], .6);
}
// launch pedestal on the pad apron with jet-deflector ducts
function pedestal(ctx, cx, yb, w, h, p, o = {}) {
  const top = rgba(mixc(p.steel, [0, 0, 0], .1)), face = ctx.createLinearGradient(0, yb - h, 0, yb);
  face.addColorStop(0, rgba(mixc(p.steelLit, p.steel, .55))); face.addColorStop(1, rgba(mixc(p.steel, [0, 0, 0], .45)));
  ctx.fillStyle = face; ctx.fillRect(cx - w / 2, yb - h, w, h);
  ctx.fillStyle = top; ctx.fillRect(cx - w / 2 - 4, yb - h - 4, w + 8, 6);
  ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(cx - w * .18, yb - h * .65, w * .36, h * .65);
  ctx.fillStyle = 'rgba(0,0,0,.5)';
  for (const sd of [-1, 1]) ctx.fillRect(cx + sd * w * .75 - w * .12, yb - h * .2, w * .24, h * .2);
}
// concrete apron and ground
function apron(ctx, gy, p, o = {}) {
  vgrad(ctx, [[0, mixc(p.concrete, p.haze, .25)], [1, mixc(p.concrete, [0, 0, 0], .35)]], gy - 2, o.y1 ?? H + 40);
}

// ---------------- Second Launch Pad ----------------
// square lattice lightning/flood-light tower: tapering legs, platforms with lamp banks, mast on top
function lightTower(ctx, x, yb, h, p, t, o = {}) {
  const wb = h * .1, wt = h * .04, top = yb - h * .88, lw = Math.max(1, h * .003), night = o.night;
  const steel = rgba(mixc(p.steel, [0, 0, 0], .15)), lit = rgba(p.steelLit, night ? .4 : .7);
  const wAt = (u) => lerp(wb, wt, u);
  ctx.strokeStyle = steel; ctx.lineWidth = lw * 2;
  ctx.beginPath(); ctx.moveTo(x - wb / 2, yb); ctx.lineTo(x - wt / 2, top); ctx.moveTo(x + wb / 2, yb); ctx.lineTo(x + wt / 2, top); ctx.stroke();
  ctx.lineWidth = lw; ctx.beginPath();
  const n = 20;
  for (let i = 0; i < n; i++) {
    const u0 = i / n, u1 = (i + 1) / n, y0 = lerp(yb, top, u0), y1 = lerp(yb, top, u1), a = wAt(u0) / 2, b = wAt(u1) / 2;
    ctx.moveTo(x - a, y0); ctx.lineTo(x + b, y1); ctx.moveTo(x + a, y0); ctx.lineTo(x - b, y1); ctx.moveTo(x - a, y0); ctx.lineTo(x + a, y0);
    // inner face, seen through the near one
    ctx.moveTo(x - a * .55, y0); ctx.lineTo(x + b * .55, y1);
  }
  ctx.stroke();
  ctx.strokeStyle = lit; ctx.lineWidth = lw; ctx.beginPath(); const sd = o.litSide ?? -1; ctx.moveTo(x + sd * wb / 2, yb); ctx.lineTo(x + sd * wt / 2, top); ctx.stroke();
  ctx.fillStyle = steel;
  for (const u of [.16, .3, .44, .58, .72, .86]) {
    const y = lerp(yb, top, u), w = wAt(u) + h * .035;
    ctx.fillRect(x - w / 2, y - h * .004, w, h * .007);
    ctx.fillRect(x - w / 2, y - h * .016, lw, h * .012); ctx.fillRect(x + w / 2 - lw, y - h * .016, lw, h * .012);
    if (u < .8) for (const k of [-.3, 0, .3]) {
      const lx = x + (o.lampSide ?? 1) * w * .45 + k * w * .25, ly = y - h * .01;
      ctx.fillStyle = 'rgb(255,248,230)'; ctx.fillRect(lx - h * .004, ly - h * .004, h * .008, h * .008);
      glow(ctx, lx, ly, h * (night ? .028 : .016), [255, 244, 220], night ? .75 : .45);
      ctx.fillStyle = steel;
    }
  }
  ctx.strokeStyle = steel; ctx.lineWidth = lw * 1.5; ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x, yb - h); ctx.stroke();
  if (Math.sin(t * 3 + x) > 0) glow(ctx, x, yb - h, 26, [255, 50, 30], .9);
  ctx.fillStyle = 'rgb(255,60,40)'; ctx.fillRect(x - 2, yb - h - 2, 4, 4);
}
// umbilical tower behind the vehicle with wide service platforms, red railings and an orange crane
function slpTower(ctx, cx, yb, s, th, p, o = {}) {
  const tw = 13 * s, x0 = cx - tw / 2, top = yb - th, night = o.night, lw = Math.max(1, s * .12);
  const dark = mixc(p.steel, [0, 0, 0], .45), mid = mixc(p.steel, [0, 0, 0], .2);
  const g = ctx.createLinearGradient(x0, 0, x0 + tw, 0);
  g.addColorStop(0, rgba(mixc(mid, p.steelLit, .15))); g.addColorStop(.5, rgba(dark)); g.addColorStop(1, rgba(mixc(dark, [0, 0, 0], .2)));
  ctx.fillStyle = g; ctx.fillRect(x0, top, tw, th);
  // lattice bays on the open faces
  ctx.strokeStyle = rgba(mixc(mid, p.steelLit, .2), .7); ctx.lineWidth = lw; ctx.beginPath();
  for (const fx of [0, .22, .78, 1]) { ctx.moveTo(x0 + fx * tw, yb); ctx.lineTo(x0 + fx * tw, top); }
  for (let y = yb; y > top; y -= 3.2 * s) {
    ctx.moveTo(x0, y); ctx.lineTo(x0 + .22 * tw, y - 3.2 * s); ctx.moveTo(x0 + .22 * tw, y); ctx.lineTo(x0, y - 3.2 * s);
    ctx.moveTo(x0 + .78 * tw, y); ctx.lineTo(x0 + tw, y - 3.2 * s); ctx.moveTo(x0 + tw, y); ctx.lineTo(x0 + .78 * tw, y - 3.2 * s);
    ctx.moveTo(x0, y); ctx.lineTo(x0 + tw, y);
  }
  ctx.stroke();
  // service platforms reaching out on both sides
  for (const u of o.levels ?? [.24, .52, .8]) {
    const y = yb - th * u, L = 19 * s, dh = 3 * s;
    for (const sd of [-1, 1]) {
      const xa = sd < 0 ? x0 - L : x0 + tw, xb = xa + L;
      ctx.fillStyle = rgba(dark); ctx.fillRect(xa, y, L, dh);
      ctx.strokeStyle = rgba(mixc(mid, p.steelLit, .25), .8); ctx.lineWidth = lw * .8; ctx.beginPath();
      for (let k = 0; k <= 10; k++) { const xx = lerp(xa, xb, k / 10); ctx.moveTo(xx, y + dh); ctx.lineTo(lerp(xa, xb, (k + .5) / 10), y); ctx.lineTo(lerp(xa, xb, (k + 1) / 10), y + dh); }
      ctx.moveTo(xa, y + dh); ctx.lineTo(xb, y + dh); ctx.stroke();
      const outer = sd < 0 ? xa : xb - 3 * s;
      ctx.strokeRect(outer, y - 2.6 * s, 3 * s, dh + 2.6 * s);
      ctx.fillStyle = rgba(mixc(p.steelLit, p.steel, .35)); ctx.fillRect(xa, y - .35 * s, L, .5 * s);
      // red railings, a few yellow and green service boxes
      ctx.fillStyle = 'rgb(206,42,34)'; ctx.fillRect(xa, y - 1.4 * s, L, Math.max(1.5, .22 * s));
      for (let k = 0; k <= 12; k++) ctx.fillRect(lerp(xa, xb, k / 12), y - 1.4 * s, Math.max(1, .14 * s), 1.1 * s);
      for (let k = 0; k < 3; k++) { ctx.fillStyle = k % 2 ? 'rgb(226,178,40)' : 'rgb(40,150,70)'; ctx.fillRect(lerp(xa, xb, .2 + k * .27), y - 1.1 * s, 1.1 * s, .8 * s); }
      if (night) for (let k = 0; k < 4; k++) glow(ctx, lerp(xa, xb, .15 + k * .23), y + dh, 3 * s, [255, 230, 180], .5);
    }
  }
  // red umbilical arms to the vehicle
  ctx.fillStyle = 'rgb(196,48,36)';
  for (const u of o.arms ?? []) { const y = yb - th * u; ctx.fillRect(cx - 6 * s, y, 12 * s, .7 * s); ctx.fillRect(cx - 6 * s, y + .7 * s, .4 * s, 1.6 * s); ctx.fillRect(cx + 5.6 * s, y + .7 * s, .4 * s, 1.6 * s); }
  // crown and orange crane jib
  ctx.fillStyle = rgba(mid); ctx.fillRect(x0 + tw * .1, top - 4 * s, tw * .8, 4 * s);
  ctx.fillStyle = 'rgb(214,120,40)'; ctx.fillRect(x0 + tw * .55, top - 7 * s, 3 * s, 3 * s);
  ctx.strokeStyle = 'rgb(206,112,36)'; ctx.lineWidth = Math.max(1.5, .35 * s); ctx.beginPath();
  ctx.moveTo(x0 + tw * .6, top - 6 * s); ctx.lineTo(x0 - 11 * s, top - 2 * s); ctx.moveTo(x0 + tw * .6, top - 4.6 * s); ctx.lineTo(x0 - 11 * s, top - 1.4 * s);
  for (let k = 0; k < 9; k++) { const u = k / 9, xa = lerp(x0 + tw * .6, x0 - 11 * s, u), ya = lerp(top - 6 * s, top - 2 * s, u); ctx.moveTo(xa, ya); ctx.lineTo(xa - 1.2 * s, ya + 1.5 * s); }
  ctx.stroke();
}
// white launch pedestal carrying the ISRO logo and the site name
function slpPedestal(ctx, cx, yb, w, h, p, o = {}) {
  const x0 = cx - w / 2, y0 = yb - h, light = o.night ? .55 : 1;
  ctx.fillStyle = rgba(mixc([40, 40, 44], p.haze, 0)); ctx.fillRect(x0 - w * .03, y0 - h * .04, w * 1.06, h * 1.04);
  const g = ctx.createLinearGradient(0, y0, 0, yb); g.addColorStop(0, rgba([246 * light, 246 * light, 244 * light])); g.addColorStop(1, rgba([214 * light, 214 * light, 210 * light]));
  ctx.fillStyle = g; ctx.fillRect(x0, y0, w, h);
  ctx.fillStyle = 'rgb(200,40,32)'; ctx.fillRect(x0 - w * .08, y0 - h * .1, w * 1.16, Math.max(2, h * .035));
  require('./emblems').isroLogo(ctx, cx, y0 + h * .3, h * .42, { alpha: o.night ? .8 : 1 });
  ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.letterSpacing = '0px';
  ctx.fillStyle = rgba([24, 40, 110], o.night ? .7 : 1);
  ctx.font = `${h * .1}px AvDemi`; ctx.fillText('SDSC SHAR', cx, y0 + h * .67);
  ctx.font = `${h * .07}px AvDemi`; ctx.fillText('SRIHARIKOTA', cx, y0 + h * .8);
  ctx.restore();
}

module.exports = { PAL, sky, mast, umbilical, serviceTower, pedestal, apron, lattice, lightTower, slpTower, slpPedestal };
