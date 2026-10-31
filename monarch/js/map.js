// Stylised map of North America (lon/lat outline, Great Lakes, labels) with migration routes, generation markers and
// the overwintering sites. Map units: 20 per degree, origin at 95°W 35°N; x east, y south.
const { TAU, clamp, lerp, ss, hash, rgba, mix, rng, PAL } = require('./core');
const D = require('./draw');

const K = 20, LON0 = -95, LAT0 = 35, CS = Math.cos(LAT0 * Math.PI / 180);
const proj = (lon, lat) => [(lon - LON0) * CS * K, -(lat - LAT0) * K];

const COAST = [
  [-128.5, 52.6], [-127.8, 51], [-127.5, 50.3], [-125.5, 48.9], [-124.7, 48.4], [-124.1, 46.9], [-123.9, 45.5], [-124.1, 44], [-124.4, 42.8], [-124.2, 41.5],
  [-124.4, 40.4], [-123.7, 39], [-122.9, 38], [-122.5, 37.6], [-121.9, 36.6], [-121, 35.6], [-120.6, 34.6], [-119.5, 34.4], [-118.5, 34], [-117.9, 33.6],
  [-117.2, 32.7], [-116.8, 31.8], [-116.2, 30.4], [-115.3, 29.5], [-114.2, 28.3], [-114.1, 27.6], [-112.9, 26.6], [-112.1, 25.3], [-111.6, 24.4], [-110.3, 23.2],
  [-109.4, 23.2], [-109.8, 24.2], [-110.7, 24.8], [-111.3, 26], [-112.2, 27.3], [-112.8, 28.4], [-113.6, 29.6], [-114.5, 30.8], [-114.8, 31.8], [-113.6, 31.3],
  [-112.9, 30.5], [-112.2, 29.2], [-111.1, 27.9], [-109.8, 26.6], [-108.9, 25.4], [-107.8, 24.5], [-106.4, 23.2], [-105.5, 22], [-105.3, 20.8], [-105.6, 20.3],
  [-104.9, 19.3], [-104.3, 19.1], [-103.4, 18.4], [-102.2, 17.95], [-101.1, 17.3], [-99.9, 16.8], [-98.6, 16.4], [-97.3, 15.9], [-96.2, 15.6], [-95, 16.1],
  [-94, 16], [-93, 15.4], [-92.2, 14.6], [-91.4, 13.9], [-89.6, 13.4], [-88, 13.2], [-87.5, 13.8], [-88.2, 15.7], [-88.2, 16.5], [-88.3, 18.4], [-87.5, 19.6],
  [-86.8, 21.2], [-87.6, 21.5], [-88.9, 21.4], [-90.4, 21.2], [-90.7, 20], [-91.2, 18.7], [-92, 18.6], [-93, 18.4], [-94.4, 18.15], [-95.2, 18.7], [-96.1, 19.2],
  [-96.4, 19.9], [-97.2, 20.8], [-97.7, 21.8], [-97.8, 23], [-97.6, 24.4], [-97.2, 25.9], [-97.4, 26.9], [-97.3, 27.8], [-96.4, 28.4], [-95, 29.2], [-94, 29.7],
  [-93, 29.75], [-91.8, 29.5], [-90.6, 29.1], [-89.4, 28.95], [-89.2, 29.4], [-89.7, 30.1], [-88.9, 30.4], [-88, 30.5], [-87, 30.4], [-86, 30.3], [-85.3, 29.7],
  [-84.3, 30], [-83.5, 29.5], [-82.8, 28.3], [-82.6, 27.5], [-82.1, 26.6], [-81.7, 25.9], [-81, 25.15], [-80.4, 25.2], [-80.1, 26.2], [-80, 26.9], [-80.4, 27.9],
  [-80.6, 28.5], [-81, 29.2], [-81.4, 30.3], [-81.5, 31], [-80.9, 32.1], [-80, 32.6], [-79.2, 33.2], [-78.5, 33.9], [-77.8, 34.2], [-76.7, 34.7], [-75.6, 35.3],
  [-75.8, 36.5], [-76, 36.9], [-75.6, 37.6], [-75.1, 38.4], [-75, 38.8], [-74.4, 39.4], [-74, 40.4], [-73.4, 40.7], [-72, 41.1], [-71.2, 41.5], [-70.5, 41.6],
  [-69.95, 41.7], [-70.6, 42.1], [-70.8, 42.6], [-70.6, 43.1], [-70.2, 43.7], [-69, 44.1], [-67.8, 44.5], [-67, 44.9], [-66, 44.6], [-65.4, 43.6], [-64, 44.4],
  [-62, 45], [-60.8, 45.6], [-60, 46.2], [-61.5, 47.2], [-64.5, 48.6], [-66.5, 49.2], [-64.5, 50.2], [-60, 50.2], [-57.2, 51.4], [-55.8, 52.6],
];
const LAKES = [
  [[-92.1, 46.7], [-90.5, 46.6], [-88.5, 47], [-87.2, 46.5], [-85, 46.6], [-84.6, 46.5], [-84.8, 47.3], [-85.7, 47.9], [-87, 48.5], [-88.5, 48.8], [-89.6, 48.2], [-91, 47.6]],
  [[-87.8, 41.7], [-87, 41.7], [-86.3, 42.5], [-86.2, 43.7], [-86.4, 44.6], [-85.6, 45], [-85, 45.8], [-86.2, 45.9], [-87.6, 45.4], [-88, 44.5], [-87.5, 43]],
  [[-84.6, 45.8], [-83.5, 45.9], [-81.6, 45.9], [-80.2, 45.4], [-80.5, 44.7], [-81.7, 44.1], [-82.4, 43], [-82.5, 43.6], [-83.3, 44.2], [-83.4, 45]],
  [[-83.4, 41.7], [-82.2, 41.5], [-80.5, 42], [-79, 42.7], [-79.2, 42.9], [-80.5, 42.6], [-82, 42.1], [-83.1, 42]],
  [[-79.8, 43.3], [-78.5, 43.4], [-76.4, 43.5], [-76.2, 44.1], [-77.5, 44], [-79, 43.75], [-79.6, 43.6]],
];
const PLACES = {
  mexico: proj(-100.3, 19.6), california: proj(-121.9, 36.6), texas: proj(-98.5, 29.4), north: proj(-80, 45),
  gen1: proj(-97.5, 31.5), gen2: proj(-90, 37.5), gen3: proj(-84, 43.5), gen3b: proj(-95, 46), gen3c: proj(-74, 43),
};

const land = (() => {
  const pts = COAST.map(([a, b]) => proj(a, b));
  // close round the top edge of the map
  const [x0] = proj(-128.5, 55), [x1] = proj(-55, 55), [, yt] = proj(0, 85);
  return pts.concat([[x1 + 400, pts[pts.length - 1][1]], [x1 + 400, yt], [x0 - 400, yt], [x0 - 400, pts[0][1]]]);
})();

// o: t, a (alpha), season (0 spring .. 1 autumn tint), labels, grid
function map(ctx, o = {}) {
  const t = o.t ?? 0;
  ctx.save();
  if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
  // ocean
  const og = ctx.createRadialGradient(0, 0, 100, 0, 0, 1600);
  og.addColorStop(0, rgba('#1d5a86')); og.addColorStop(1, rgba('#0b2440'));
  ctx.fillStyle = og; ctx.fillRect(-2600, -1400, 5200, 2800);
  // graticule
  ctx.strokeStyle = rgba('#8fd0ff', .1); ctx.lineWidth = 1.5;
  for (let lon = -140; lon <= -40; lon += 10) { const a = proj(lon, 10), b = proj(lon, 60); D.line(ctx, a[0], a[1], b[0], b[1]); }
  for (let lat = 10; lat <= 60; lat += 10) { const a = proj(-140, lat), b = proj(-40, lat); D.line(ctx, a[0], a[1], b[0], b[1]); }
  // soft coastal glow and wave lines
  ctx.save(); D.shape(ctx, land, true); ctx.lineWidth = 60; ctx.strokeStyle = rgba('#3f8fc0', .25); ctx.stroke(); ctx.lineWidth = 26; ctx.strokeStyle = rgba('#6ab8e0', .25); ctx.stroke(); ctx.restore();
  // land
  ctx.beginPath(); ctx.moveTo(land[0][0], land[0][1]); for (const p of land) ctx.lineTo(p[0], p[1]); ctx.closePath();
  const season = o.season ?? 0;
  const lg = ctx.createLinearGradient(0, -500, 0, 400);
  lg.addColorStop(0, rgba(mix('#b9d38a', '#d9a65a', season))); lg.addColorStop(.55, rgba(mix('#d4d79a', '#e8c27a', season))); lg.addColorStop(1, rgba('#e6cf96'));
  ctx.fillStyle = lg; ctx.fill();
  ctx.save(); ctx.clip();
  // relief: mountain ranges as soft darker bands
  const ridge = (pts, w, a) => { ctx.strokeStyle = rgba('#8a7a50', a); ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); D.trace(ctx, pts.map(([a1, b1]) => proj(a1, b1)), false); ctx.stroke(); };
  ridge([[-121, 52], [-116, 47], [-111, 43], [-107, 39], [-106, 35], [-105, 31]], 70, .18); // Rockies
  ridge([[-108, 29], [-105, 25], [-103, 21.5]], 50, .2); // Sierra Madre Occidental
  ridge([[-100.5, 25], [-99, 21.5], [-98, 19.6]], 40, .18);
  ridge([[-104.5, 19.6], [-101, 19.4], [-97.3, 19.1]], 34, .22); // volcanic belt
  ridge([[-84, 34.5], [-80, 37.5], [-76, 41], [-72, 44]], 40, .14); // Appalachians
  for (let i = 0; i < 160; i++) { const p = land[Math.floor(hash(i) * (land.length - 4))], q = [p[0] + (hash(i + 1) - .5) * 700, p[1] + (hash(i + 2) - .5) * 700]; D.dot(ctx, q[0], q[1], 3 + hash(i + 3) * 5, '#9ab070', .12); }
  ctx.restore();
  ctx.strokeStyle = rgba('#fff6dc', .85); ctx.lineWidth = 3; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(land[0][0], land[0][1]); for (let i = 1; i < COAST.length; i++) ctx.lineTo(land[i][0], land[i][1]); ctx.stroke();
  for (const lk of LAKES) { const pts = lk.map(([a, b]) => proj(a, b)); D.shape(ctx, pts); ctx.fillStyle = rgba('#3a86b8'); ctx.fill(); ctx.strokeStyle = rgba('#fff6dc', .7); ctx.lineWidth = 2; ctx.stroke(); }
  if (o.labels !== false) {
    const lab = (s, lon, lat, size) => { const [x, y] = proj(lon, lat); D.text(ctx, s, x, y, { font: 'AvDemi', size, color: '#6a5a3a', alpha: .55 * (o.labelA ?? 1), align: 'center', track: size * .35 }); };
    lab('CANADA', -101, 51.2, 30); lab('UNITED STATES', -99, 39.5, 30); lab('MEXICO', -102.5, 24.2, 28);
  }
  ctx.restore();
}

// a route drawn progressively: glowing gold line with travelling dashes and an arrowhead
function route(ctx, pts, p, o = {}) {
  if (p <= 0) return null;
  const q = D.partial(pts, p);
  const col = o.col ?? '#ffcf4a';
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = rgba('#3a1a04', .35 * (o.a ?? 1)); ctx.lineWidth = (o.w ?? 8) * 1.9; ctx.beginPath(); D.trace(ctx, q, false); ctx.stroke();
  ctx.strokeStyle = rgba(col, .3 * (o.a ?? 1)); ctx.lineWidth = (o.w ?? 8) * 3.4; ctx.beginPath(); D.trace(ctx, q, false); ctx.stroke();
  ctx.strokeStyle = rgba(col, .95 * (o.a ?? 1)); ctx.lineWidth = o.w ?? 8; ctx.beginPath(); D.trace(ctx, q, false); ctx.stroke();
  ctx.setLineDash([14, 22]); ctx.lineDashOffset = -(o.t ?? 0) * 60; ctx.strokeStyle = rgba('#fffbe6', .8 * (o.a ?? 1)); ctx.lineWidth = (o.w ?? 8) * .4;
  ctx.beginPath(); D.trace(ctx, q, false); ctx.stroke(); ctx.setLineDash([]);
  const e = q[q.length - 1], f = q[Math.max(0, q.length - 3)], ang = Math.atan2(e[1] - f[1], e[0] - f[0]);
  if (o.arrow !== false && q.length > 2) D.arrow(ctx, e[0] - Math.cos(ang) * 4, e[1] - Math.sin(ang) * 4, e[0] + Math.cos(ang) * 10, e[1] + Math.sin(ang) * 10, 1, col, 0, (o.w ?? 8) * 3.2, o.a ?? 1);
  ctx.restore();
  return e;
}
// map pin with pulsing ring
function pin(ctx, x, y, age, o = {}) {
  if (age <= 0) return;
  const k = clamp(age * 3), col = o.col ?? '#ff5a3c';
  for (const d of [0, .5]) { const u = ((age - d) % 1.4) / 1.4; if (age > d) D.ring(ctx, x, y, 10 + u * 70, col, .8 * (1 - u), 3); }
  D.glow(ctx, x, y, 50, col, .4 * k);
  ctx.fillStyle = rgba(col); ctx.beginPath(); ctx.arc(x, y - 22 * k, 13 * k, Math.PI * .85, Math.PI * .15); ctx.lineTo(x, y); ctx.closePath(); ctx.fill();
  D.dot(ctx, x, y - 22 * k, 5 * k, '#fff6e0');
}

module.exports = { map, proj, route, pin, PLACES, COAST, LAKES, K };
