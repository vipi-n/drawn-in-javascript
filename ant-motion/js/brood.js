// Brood: egg (with the embryo inside), larva (with organs), silk cocoon, pupa.
//   egg(ctx, x, y, r, o)      o: {ang, xray, dev 0..1 (embryo development), a, glow}
//   larva(ctx, x, y, s, o)    o: {ang, t (wiggle clock), xray, fed 0..1 (gut fill), hl {...}, a, mouth 0..1}
//   cocoon(ctx, x, y, s, o)   o: {ang, spin 0..1 (silk laid down), xray (see-through), mec 0..1 (meconium), a, tear 0..1}
//   pupa(ctx, x, y, s, o)     o: {ang, k 0..1 (white -> eyes -> body pigment), a}
const { TAU, clamp, lerp, ss, rgba, mix, rng, noise, hash } = require('./core');
const G = require('./gfx');
const ANT = require('./ant');
const { AMBER, TEAL } = ANT;

// ------------------------------------------------------------------ egg
function eggPath(c, r) { c.beginPath(); c.ellipse(0, 0, r, r * .64, 0, 0, TAU); }
function egg(ctx, x, y, r, o = {}) {
  const a = o.a ?? 1, xr = clamp(o.xray ?? 0), dev = clamp(o.dev ?? 0);
  if (a <= 0) return;
  ctx.save(); ctx.translate(x, y); ctx.rotate(o.ang ?? 0); ctx.globalAlpha *= a;
  if (o.glow) G.glow(ctx, 0, 0, r * 2.4, '#fff1d0', .25 * o.glow);
  // pearly translucent shell
  eggPath(ctx, r);
  const g = ctx.createRadialGradient(-r * .35, -r * .3, r * .05, 0, 0, r * 1.05);
  g.addColorStop(0, rgba('#fffdf6', 1 - xr * .6)); g.addColorStop(.6, rgba('#f2e6cf', 1 - xr * .65)); g.addColorStop(1, rgba('#c9b08a', 1 - xr * .5));
  ctx.fillStyle = g; ctx.fill();
  if (xr > 0) {
    ctx.save(); eggPath(ctx, r); ctx.clip();
    ctx.fillStyle = rgba('#081a1c', .6 * xr); ctx.fillRect(-r, -r, 2 * r, 2 * r);
    // yolk granules shrink as the embryo uses them
    const R = rng(7), yolk = 1 - dev * .75;
    for (let i = 0; i < 70; i++) {
      const an = R() * TAU, rr = Math.sqrt(R()) * .78, px = Math.cos(an) * rr * r, py = Math.sin(an) * rr * r * .62, gr = r * (.035 + R() * .05) * yolk;
      if (gr < .6) continue;
      ctx.fillStyle = rgba(mix('#ffc76a', '#ff9f43', R()), (.45 + .3 * R()) * xr * yolk); ctx.beginPath(); ctx.arc(px, py, gr, 0, TAU); ctx.fill();
    }
    embryo(ctx, r, dev, xr, o.t ?? 0);
    ctx.restore();
    // membranes
    ctx.strokeStyle = rgba(TEAL, .9 * xr); ctx.lineWidth = Math.max(1.2, r * .025); eggPath(ctx, r); ctx.stroke();
    ctx.strokeStyle = rgba(TEAL, .4 * xr); ctx.lineWidth = 1; eggPath(ctx, r * .93); ctx.stroke();
  }
  // specular + sticky sheen
  G.ellipseGlow(ctx, -r * .35, -r * .3, r * .45, r * .2, '#ffffff', .55 * (1 - xr * .5));
  ctx.strokeStyle = rgba('#fff8ea', .5); ctx.lineWidth = Math.max(1, r * .03); ctx.beginPath(); ctx.ellipse(0, 0, r * .96, r * .6, 0, Math.PI * .9, Math.PI * 1.4); ctx.stroke();
  ctx.restore();
}
// embryo inside an egg of radius r: blastoderm -> germ band -> segmented, curled embryo with head + mandibles
function embryo(ctx, r, dev, xr, t) {
  const A = (c, a) => rgba(c, a * xr);
  if (dev < .35) {
    // cleavage: nuclei migrate to the surface and form a single cell layer (blastoderm)
    const k = dev / .35, n = Math.round(lerp(2, 64, k * k));
    for (let i = 0; i < n; i++) {
      const an = i / n * TAU + hash(i) * .2, rr = lerp(.15 + hash(i + 9) * .3, .86, ss(.2, 1, k));
      const px = Math.cos(an) * rr * r, py = Math.sin(an) * rr * r * .62, cr = r * lerp(.11, .045, k);
      ctx.fillStyle = A('#bff8f0', .7); ctx.strokeStyle = A(TEAL, .95); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(px, py, cr, 0, TAU); ctx.fill(); ctx.stroke();
    }
    return;
  }
  // germ band -> curled embryo: a band along the lower side that thickens, segments and curls into a C
  const k = clamp((dev - .35) / .65);
  const curl = ss(.35, 1, k), n = 13;
  const pts = [], ws = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n, an = lerp(Math.PI * .95, Math.PI * .05, u) + Math.PI * 0, rad = lerp(.78, .52, curl) * r;
    const yy = Math.sin(an) * rad * .62 * lerp(.9, 1.1, curl) + lerp(r * .2, 0, curl);
    pts.push([Math.cos(an) * rad, yy]);
    ws.push(r * lerp(.06, .16, ss(0, .6, k)) * (1 - .4 * Math.abs(u - .45)));
  }
  ctx.save(); ctx.globalAlpha *= xr;
  G.taper(ctx, pts, ws);
  const g = ctx.createLinearGradient(-r, 0, r, 0); g.addColorStop(0, 'rgba(190,250,240,.85)'); g.addColorStop(1, 'rgba(120,220,210,.8)');
  ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = rgba(TEAL, 1); ctx.lineWidth = 1.4; ctx.stroke();
  // segment ticks appear
  const seg = ss(.25, .7, k);
  ctx.strokeStyle = rgba('#0b3b3a', .8 * seg); ctx.lineWidth = 1.2;
  for (let i = 2; i < n - 1; i++) {
    const [px, py] = pts[i], [qx, qy] = pts[i + 1], dx = qx - px, dy = qy - py, d = Math.hypot(dx, dy) || 1, nx = -dy / d, ny = dx / d, w = ws[i] * .9;
    ctx.beginPath(); ctx.moveTo(px - nx * w, py - ny * w); ctx.lineTo(px + nx * w, py + ny * w); ctx.stroke();
  }
  // head capsule + mandibles at the front end
  const hd = ss(.55, .95, k);
  if (hd > 0) {
    const [hx, hy] = pts[n];
    ctx.fillStyle = rgba('#e6fffb', .9 * hd); ctx.beginPath(); ctx.arc(hx, hy, ws[n] * 1.5, 0, TAU); ctx.fill();
    ctx.fillStyle = rgba('#a5562a', .9 * hd); ctx.beginPath(); ctx.arc(hx + ws[n] * .9, hy + ws[n] * .6, ws[n] * .45, 0, TAU); ctx.fill();
  }
  // heartbeat-like pulse of the dorsal vessel
  const p = .5 + .5 * Math.sin(t * 7);
  ctx.strokeStyle = rgba('#ffffff', .3 + .3 * p * k); ctx.lineWidth = 1; ctx.beginPath(); G.curve(ctx, pts.slice(2, n - 1)); ctx.stroke();
  ctx.restore();
}

// ------------------------------------------------------------------ larva
// spine from tail (top-back) curving forward and down to the small head ("crook-neck" ant larva)
function larvaSpine(s, t = 0, wig = 1) {
  const n = 12, pts = [], ws = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n, an = lerp(-2.25, .95, u) + Math.sin(t * 2.2 + u * 2) * .05 * wig;
    const rad = lerp(46, 38, u) * s;
    pts.push([Math.cos(an) * rad * 1.15, Math.sin(an) * rad]);
    const prof = Math.sin(Math.PI * Math.pow(u, .85)) * (u < .86 ? 1 : lerp(1, .55, (u - .86) / .14));
    ws.push((10 + 22 * prof) * s);
  }
  return { pts, ws, n };
}
function larva(ctx, x, y, s, o = {}) {
  const a = o.a ?? 1, xr = clamp(o.xray ?? 0), t = o.t ?? 0, hl = o.hl ?? {};
  if (a <= 0) return;
  ctx.save(); ctx.translate(x, y); ctx.rotate(o.ang ?? 0); if (o.flip) ctx.scale(-1, 1); ctx.globalAlpha *= a;
  const { pts, ws, n } = larvaSpine(s, t, o.wig ?? 1);
  // body
  G.taper(ctx, pts, ws);
  const g = ctx.createRadialGradient(-10 * s, -18 * s, 4 * s, 0, 0, 70 * s);
  g.addColorStop(0, rgba('#fffaf0', 1 - xr * .7)); g.addColorStop(.65, rgba('#f1e2c4', 1 - xr * .72)); g.addColorStop(1, rgba('#cfb48a', 1 - xr * .6));
  ctx.fillStyle = g; ctx.fill();
  ctx.save(); G.taper(ctx, pts, ws); ctx.clip();
  if (xr > 0) { ctx.fillStyle = rgba('#071a1c', .62 * xr); ctx.fillRect(-120 * s, -120 * s, 240 * s, 240 * s); }
  // gut contents seen through the skin (darker when well fed)
  const fed = clamp(o.fed ?? .5);
  if (xr < 1) {
    const gp = pts.slice(2, n - 2), gw = ws.slice(2, n - 2).map((w) => w * .48);
    G.taper(ctx, gp, gw); ctx.fillStyle = rgba(mix('#d9b98a', '#9c6a3a', fed), .55 * (1 - xr)); ctx.fill();
  }
  // segment creases
  ctx.strokeStyle = rgba('#a88a60', .5 * (1 - xr * .5)); ctx.lineWidth = 1.4 * s;
  for (let i = 1; i < n - 1; i++) {
    const [px, py] = pts[i], [qx, qy] = pts[i + 1], dx = qx - px, dy = qy - py, d = Math.hypot(dx, dy) || 1, nx = -dy / d, ny = dx / d, w = ws[i];
    ctx.beginPath(); ctx.moveTo(px - nx * w, py - ny * w); ctx.quadraticCurveTo(px + dx * .2, py + dy * .2, px + nx * w, py + ny * w); ctx.stroke();
  }
  G.ellipseGlow(ctx, -14 * s, -30 * s, 30 * s, 12 * s, '#ffffff', .45 * (1 - xr));
  ctx.restore();
  // tiny hooked hairs
  if ((o.lod ?? 2) >= 2) {
    ctx.strokeStyle = rgba('#e9d8b8', .7 * (1 - xr * .5)); ctx.lineWidth = .9;
    for (let i = 1; i < n; i++) for (const sd of [-1, 1]) {
      const [px, py] = pts[i], [qx, qy] = pts[i + 1] || pts[i], dx = qx - px, dy = qy - py, d = Math.hypot(dx, dy) || 1, nx = -dy / d * sd, ny = dx / d * sd, w = ws[i];
      const bx = px + nx * w, by = py + ny * w; ctx.beginPath(); ctx.moveTo(bx, by); ctx.quadraticCurveTo(bx + nx * 6 * s, by + ny * 6 * s, bx + nx * 7 * s + dx * .2, by + ny * 7 * s + dy * .2); ctx.stroke();
    }
  }
  // head: small capsule with brown mandibles; mouth opens when fed
  const [hx, hy] = pts[n], hr = ws[n] * 1.05;
  ctx.fillStyle = rgba('#f6ead2', 1 - xr * .5); ctx.beginPath(); ctx.arc(hx, hy, hr, 0, TAU); ctx.fill();
  ctx.strokeStyle = rgba('#b89868', .8); ctx.lineWidth = 1.2; ctx.stroke();
  const mo = clamp(o.mouth ?? 0);
  ctx.fillStyle = rgba('#8a4a20', .95);
  ctx.save(); ctx.translate(hx + hr * .55, hy + hr * .5); ctx.rotate(.9 + mo * .4); ctx.beginPath(); ctx.ellipse(0, 0, hr * .42, hr * .16, 0, 0, TAU); ctx.fill(); ctx.restore();
  ctx.save(); ctx.translate(hx + hr * .3, hy + hr * .75); ctx.rotate(1.3 - mo * .4); ctx.beginPath(); ctx.ellipse(0, 0, hr * .42, hr * .16, 0, 0, TAU); ctx.fill(); ctx.restore();
  if (xr > 0) larvaOrgans(ctx, pts, ws, n, s, xr, hl, fed, t);
  ctx.restore();
  return { pts, ws, head: [hx, hy], mouth: [hx + hr * .7, hy + hr * .8] };
}
// inside the larva: midgut (a closed sac - no connection to the hindgut until pupation), hindgut, paired silk
// glands running to the mouth, fat body lobes, imaginal discs (future legs, wings, eyes) waiting in the thorax.
function larvaOrgans(ctx, pts, ws, n, s, k, hl, fed, t) {
  const T = (a) => rgba(TEAL, a * k);
  ctx.save();
  ctx.strokeStyle = T(.95); ctx.lineWidth = 2; G.taper(ctx, pts, ws); ctx.stroke();
  // fat body: bubbly lobes under the skin
  const R = rng(31);
  for (let i = 0; i < 26; i++) {
    const j = 1 + Math.floor(R() * (n - 3)), [px, py] = pts[j], w = ws[j], sd = R() < .5 ? -1 : 1;
    const [qx, qy] = pts[j + 1], dx = qx - px, dy = qy - py, d = Math.hypot(dx, dy) || 1, nx = -dy / d * sd, ny = dx / d * sd;
    const rr = w * (.72 + R() * .18), bx = px + nx * rr, by = py + ny * rr, br = (3 + R() * 4) * s;
    ctx.fillStyle = rgba('#fff3c4', (.35 + .4 * (hl.fat ?? 0)) * k); ctx.beginPath(); ctx.arc(bx, by, br, 0, TAU); ctx.fill();
  }
  // midgut: big closed sac with food
  const mg = pts.slice(3, n - 3), mw = ws.slice(3, n - 3).map((w) => w * .55);
  G.taper(ctx, mg, mw);
  ctx.fillStyle = rgba(AMBER, (.25 + .35 * fed + .3 * (hl.gut ?? 0)) * k); ctx.fill(); ctx.strokeStyle = rgba(AMBER, k); ctx.lineWidth = 2; ctx.stroke();
  if (hl.gut) { const [cx, cy] = pts[Math.floor(n / 2)]; G.glow(ctx, cx, cy, 50 * s, AMBER, .3 * hl.gut * k); }
  // hindgut: short tube at the tail end, ending blind against the midgut (a visible gap)
  const [ax, ay] = pts[0], [bx2, by2] = pts[2];
  ctx.strokeStyle = rgba('#ff9a6c', .95 * k); ctx.lineWidth = 3 * s; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(lerp(ax, bx2, .8), lerp(ay, by2, .8)); ctx.stroke();
  // the gap marker
  const gx = lerp(bx2, pts[3][0], .5), gy = lerp(by2, pts[3][1], .5);
  ctx.strokeStyle = rgba('#ffffff', .9 * k); ctx.lineWidth = 1.5; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.arc(gx, gy, 7 * s, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
  // silk (labial) glands: paired coiled tubes from mid-body to the mouth
  for (let sd = 0; sd < 2; sd++) {
    ctx.strokeStyle = rgba('#e8fffb', (.6 + .35 * (hl.silk ?? 0)) * k); ctx.lineWidth = (2 + (hl.silk ?? 0) * 1.5) * s;
    ctx.beginPath();
    for (let i = 4; i <= n; i++) {
      const [px, py] = pts[i], [qx, qy] = pts[Math.min(n, i + 1)], dx = qx - px, dy = qy - py, d = Math.hypot(dx, dy) || 1, nx = -dy / d, ny = dx / d;
      const off = ws[i] * (.62 + .08 * Math.sin(i * 2.3 + sd * 3)) * (i > n - 2 ? .2 : 1);
      const xx = px + nx * off + Math.sin(i * 1.7 + sd) * 2 * s, yy = py + ny * off;
      i === 4 ? ctx.moveTo(xx, yy) : ctx.lineTo(xx, yy);
    }
    ctx.stroke();
  }
  if (hl.silk) { const [hx, hy] = pts[n]; G.glow(ctx, hx, hy, 26 * s, '#e8fffb', .4 * hl.silk * k); }
  // imaginal discs: future adult parts, folded and waiting (front segments)
  const disc = [[n - 2, -.2, 'leg'], [n - 3, -.15, 'leg'], [n - 4, -.1, 'leg'], [n - 3, .45, 'wing'], [n - 1, .35, 'eye']];
  disc.forEach(([j, side, kind], i) => {
    const [px, py] = pts[j], [qx, qy] = pts[j + 1], dx = qx - px, dy = qy - py, d = Math.hypot(dx, dy) || 1, nx = -dy / d, ny = dx / d;
    const off = ws[j] * side * 1.3, cx = px + nx * off, cy = py + ny * off, pulse = .8 + .2 * Math.sin(t * 4 + i);
    const r = (kind === 'wing' ? 4 : 5) * s * (1 + (hl.disc ?? 0) * .5);
    G.glow(ctx, cx, cy, r * 3.5, TEAL, (.35 + .5 * (hl.disc ?? 0)) * k * pulse);
    ctx.fillStyle = rgba(TEAL, .95 * k); ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fill();
    ctx.strokeStyle = rgba('#ffffff', .8 * k); ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(cx, cy, r * .55, 0, Math.PI * 1.5); ctx.stroke();
  });
  ctx.restore();
}
// larva organ anchor (local, unrotated) for labels
function larvaAnchor(s, part, t = 0) {
  const { pts, ws, n } = larvaSpine(s, t);
  const m = Math.floor(n / 2);
  return {
    gut: pts[m], hind: [lerp(pts[2][0], pts[3][0], .5), lerp(pts[2][1], pts[3][1], .5)], head: pts[n], silk: pts[n - 2], fat: [pts[2][0], pts[2][1] - ws[2]],
    disc: pts[n - 3], tail: pts[0],
  }[part];
}

// ------------------------------------------------------------------ cocoon
function capsule(c, s) { c.beginPath(); c.ellipse(0, 0, 92 * s, 50 * s, 0, 0, TAU); }
function cocoon(ctx, x, y, s, o = {}) {
  const a = o.a ?? 1, spin = clamp(o.spin ?? 1), xr = clamp(o.xray ?? 0), tear = clamp(o.tear ?? 0);
  if (a <= 0) return;
  ctx.save(); ctx.translate(x, y); ctx.rotate(o.ang ?? 0); ctx.globalAlpha *= a;
  // silk strands accumulate around the capsule outline: each strand a skewed loop
  const R = rng(55), N = 140, shown = Math.floor(N * spin);
  const op = ss(.35, 1, spin) * (1 - xr * .8);
  if (op > 0) {
    capsule(ctx, s);
    const g = ctx.createRadialGradient(-30 * s, -20 * s, 5 * s, 0, 0, 100 * s);
    g.addColorStop(0, rgba('#f3dfb8', op)); g.addColorStop(.7, rgba('#d8b27e', op)); g.addColorStop(1, rgba('#a9824f', op));
    ctx.fillStyle = g; ctx.fill();
  }
  for (let i = 0; i < shown; i++) {
    const tilt = (R() - .5) * 1.6, rx = (70 + R() * 26) * s, ry = (30 + R() * 22) * s, a0 = R() * TAU, len = 1.5 + R() * 3;
    ctx.strokeStyle = rgba(i > shown - 6 ? '#fffaf0' : '#f6e6c6', (.25 + .4 * R()) * (1 - xr * .6) * (i > shown - 6 ? 1.4 : 1));
    ctx.lineWidth = (.8 + R() * .9) * s;
    ctx.beginPath(); ctx.ellipse((R() - .5) * 10 * s, (R() - .5) * 6 * s, rx, ry, tilt * .3, a0, a0 + len); ctx.stroke();
  }
  if (op > 0) {
    // papery fibre texture + gloss
    ctx.save(); capsule(ctx, s); ctx.clip();
    const R2 = rng(77);
    ctx.strokeStyle = rgba('#8a6a40', .18 * op); ctx.lineWidth = 1;
    for (let i = 0; i < 60; i++) { const px = (R2() - .5) * 180 * s, py = (R2() - .5) * 100 * s; ctx.beginPath(); ctx.moveTo(px, py); ctx.quadraticCurveTo(px + 10 * s, py + (R2() - .5) * 8 * s, px + 22 * s, py + (R2() - .5) * 6 * s); ctx.stroke(); }
    G.ellipseGlow(ctx, -20 * s, -26 * s, 55 * s, 14 * s, '#fff8e8', .5 * op);
    ctx.restore();
  }
  // meconium: the larva's stored waste, expelled as a dark pellet at the rear end
  const mec = clamp(o.mec ?? 0);
  if (mec > 0) { G.glow(ctx, -80 * s, 4 * s, 18 * s, '#000', .5 * mec); ctx.fillStyle = rgba('#2e1c10', .95 * mec); ctx.beginPath(); ctx.ellipse(-82 * s, 4 * s, 9 * s * mec, 12 * s * mec, 0, 0, TAU); ctx.fill(); }
  if (xr > 0) { ctx.strokeStyle = rgba(TEAL, .9 * xr); ctx.lineWidth = 2; capsule(ctx, s); ctx.stroke(); ctx.strokeStyle = rgba(TEAL, .35 * xr); ctx.setLineDash([4, 6]); ctx.beginPath(); ctx.ellipse(0, 0, 86 * s, 44 * s, 0, 0, TAU); ctx.stroke(); ctx.setLineDash([]); }
  // the sisters' cut: a ragged slit opening along the front
  if (tear > 0) {
    ctx.save(); ctx.fillStyle = rgba('#120a05', .9); ctx.beginPath();
    const L = 70 * s * tear;
    ctx.moveTo(90 * s, -4 * s);
    for (let i = 0; i <= 10; i++) { const u = i / 10; ctx.lineTo(90 * s - L * u, -4 * s - Math.sin(u * Math.PI) * 18 * s * tear + (i % 2 ? 2 : -2) * s); }
    for (let i = 10; i >= 0; i--) { const u = i / 10; ctx.lineTo(90 * s - L * u, -4 * s + Math.sin(u * Math.PI) * 16 * s * tear + (i % 2 ? -2 : 2) * s); }
    ctx.fill(); ctx.restore();
  }
  ctx.restore();
}

// ------------------------------------------------------------------ pupa (exarate: legs + antennae free, folded)
function pupa(ctx, x, y, s, o = {}) {
  const k = clamp(o.k ?? 0), a = o.a ?? 1;
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha *= a;
  // white -> eyes darken first -> body takes colour
  const eyeK = ss(.0, .35, k), body = ss(.4, 1, k);
  ANT.draw(ctx, x, y, s, { caste: o.caste ?? 'worker', legsUp: 1, head: .55, antFold: 1, pale: 1 - body, callow: 1 - body * .55, eyeK, rot: o.ang ?? 0, jaw: 0, lod: o.lod ?? 2, xray: o.xray ?? 0 });
  ctx.restore();
}

// shape-morph used inside the cocoon: larva silhouette dissolving into the pupa (histolysis / rebuild)
function dissolve(ctx, x, y, s, k, t, o = {}) {
  // larval tissue breaks into a soup of cells; imaginal discs grow into legs/antennae/eyes
  const R = rng(91), n = 90;
  ctx.save(); ctx.translate(x, y);
  for (let i = 0; i < n; i++) {
    const an = R() * TAU, rr = Math.sqrt(R()), lx = Math.cos(an) * rr * 70 * s, ly = Math.sin(an) * rr * 32 * s;
    const drift = Math.sin(t * 1.3 + i) * 6 * s * Math.sin(Math.PI * k);
    const cr = (3 + R() * 5) * s * (1 - Math.abs(k - .5) * 1.2);
    if (cr <= .3) continue;
    ctx.fillStyle = rgba(R() < .2 ? TEAL : '#fff0d0', (.35 + .3 * R()) * Math.sin(Math.PI * k) * (o.a ?? 1));
    ctx.beginPath(); ctx.arc(lx + drift, ly + Math.cos(t + i) * 3 * s, cr, 0, TAU); ctx.fill();
  }
  ctx.restore();
}

function sheet(ctx, x, y) {
  egg(ctx, x, y, 40, {}); egg(ctx, x + 110, y, 40, { xray: 1, dev: .2 }); egg(ctx, x + 220, y, 40, { xray: 1, dev: .9, t: 1 });
  larva(ctx, x + 60, y + 150, 1, { t: 0 }); larva(ctx, x + 260, y + 150, 1, { xray: 1, fed: .8 });
  cocoon(ctx, x + 60, y + 290, .8, { spin: .5 }); cocoon(ctx, x + 260, y + 290, .8, { spin: 1, mec: 1 });
  pupa(ctx, x - 300, y + 280, .9, { k: .1 }); pupa(ctx, x - 600, y + 280, .9, { k: .8 });
}

module.exports = { egg, larva, larvaAnchor, cocoon, pupa, dissolve, sheet };
