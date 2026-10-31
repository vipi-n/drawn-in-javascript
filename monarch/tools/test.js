// Scratch harness: render rig poses onto one sheet.  node tools/test.js <what> [out.png]
const fs = require('fs'), path = require('path');
const core = require('../js/core');
const { C } = core;
core.fonts();
require('../js/tex').build();
const what = process.argv[2] || 'fly', out = process.argv[3] || `/tmp/mn/${what}.png`;
fs.mkdirSync(path.dirname(out), { recursive: true });
const cv = C.createCanvas(1080, 1080), ctx = cv.getContext('2d');
ctx.fillStyle = '#e9efe2'; ctx.fillRect(0, 0, 1080, 1080);
const label = (s, x, y) => { ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#333'; ctx.font = '15px AvMed'; ctx.fillText(s, x, y); ctx.restore(); };

if (what === 'fly') {
  const B = require('../js/butterfly');
  const P = Math.PI;
  const cells = [
    { flap: 0 }, { flap: 0, sex: 1 }, { flap: 0, roll: P },
    { yaw: P / 2, roll: -P / 2, flap: 1.45 }, { yaw: P / 2, roll: -P / 2 + .5, flap: .9 }, { yaw: P / 2, roll: -P / 2 + .9, flap: .3, pitch: .2 },
    { yaw: .5, roll: -.6, flap: .6, pitch: -.4 }, { yaw: P / 2, roll: -P / 2, flap: 1.4, legs: 1 }, { yaw: 0, roll: -P / 2, flap: 1.5, open: .2, abd: 1.6 },
  ];
  cells.forEach((c, i) => {
    const x = 180 + (i % 3) * 360, y = 190 + Math.floor(i / 3) * 350;
    B.butterfly(ctx, { x, y, s: 1.35, ...c });
    label(JSON.stringify(c).replace(/"/g, ''), x - 170, y + 160);
  });
}
if (what === 'big') {
  const B = require('../js/butterfly');
  B.butterfly(ctx, { x: 540, y: 560, s: 4.4, flap: .05, sex: +(process.argv[4] || 0), macro: 1 });
}
if (what === 'larva') {
  const Lv = require('../js/larva'), P = require('../js/plants');
  P.leaf(ctx, { x: 40, y: 200, ang: 0, L: 1000, W: 150, curl: .05 });
  [0, .5, 1].forEach((d, i) => Lv.egg(ctx, 80 + i * 70, 120, 60, { dark: d, hole: i === 2 ? 1 : 0 }));
  [1, 2, 3, 4, 5].forEach((inst, i) => {
    const L = [40, 70, 110, 160, 220][i];
    Lv.larva(ctx, { path: Lv.linePath(0, 330 + i * 0, 0), s0: 60 + i * 200 + (inst < 3 ? 60 : 0), L, instar: inst, phase: i * .21, t: i });
  });
  for (let k = 0; k < 4; k++) Lv.larva(ctx, { path: Lv.linePath(0, 520, 0), s0: 40 + k * 260, L: 220, instar: 5, phase: k * .25, t: k });
  Lv.larva(ctx, { path: Lv.linePath(0, 700, 0), s0: 40, L: 260, instar: 5, eat: 1, chew: .3, t: 1 });
  Lv.larva(ctx, { path: Lv.linePath(0, 700, 0), s0: 340, L: 260, instar: 5, lift: .8, toxin: 1, t: 2 });
  ctx.fillStyle = '#6b4a2a'; ctx.fillRect(640, 640, 420, 16);
  Lv.larva(ctx, { path: Lv.jPath(700, 656, 260 * .92, 1, 1), s0: 0, L: 260, instar: 5, up: -1, limp: 1, t: 1 });
  Lv.larva(ctx, { path: Lv.jPath(900, 656, 260 * .92, .5, .3), s0: 0, L: 260, instar: 5, up: -1, t: 1 });
  Lv.exuvia(ctx, 120, 980, 120, 16, 0);
}
if (what === 'plants') {
  const P = require('../js/plants');
  ctx.fillStyle = '#cfe6f2'; ctx.fillRect(0, 0, 1080, 1080);
  P.milkweed(ctx, 220, 1000, { s: 1.4, t: 1, pods: 0 });
  P.milkweed(ctx, 620, 1000, { s: .9, t: 2, seed: 4, eaten: .5, pods: .6 });
  P.coneflower(ctx, 820, 1000, 1.2, { t: 1 }); P.goldenrod(ctx, 940, 1000, 1, { t: 1 }); P.blazingStar(ctx, 1020, 1000, 1, {}); P.daisy(ctx, 760, 1000, 1, {});
  P.umbel(ctx, 880, 200, 110, { t: 0 });
  P.leaf(ctx, { x: 600, y: 360, ang: -.3, L: 300, under: true, bites: [[.7, .3, .9, 2]], hole: [.3, -.2, .3] });
  P.seed(ctx, 980, 420, 40, 1, .2);
}
if (what === 'pupa') {
  const Pu = require('../js/pupa');
  ctx.fillStyle = '#26324a'; ctx.fillRect(0, 0, 1080, 1080);
  ctx.fillStyle = '#6b4a2a'; ctx.fillRect(0, 60, 1080, 18); ctx.fillRect(0, 600, 1080, 18);
  const st = [{ el: 1, gold: 0 }, { el: .5, gold: 0, wob: 1 }, { el: 0, gold: 1 }, { el: 0, clear: .5 }, { el: 0, clear: 1, crack: 1 }];
  st.forEach((o, i) => { Pu.chrysalis(ctx, 110 + i * 210, 78, { h: 300, t: 1, ...o }); });
  Pu.chrysalis(ctx, 140, 618, { h: 300, el: 1, gold: 0 }); Pu.skinSleeve(ctx, 140, 618, 300, .9, { t: 1 });
  Pu.chrysalis(ctx, 400, 618, { h: 300, el: .8, gold: 0 }); Pu.skinSleeve(ctx, 400, 618, 300, .4, { t: 1 });
  Pu.chrysalis(ctx, 660, 618, { h: 300, empty: true });
  Pu.chrysalis(ctx, 900, 618, { h: 420, t: 2 });
}
if (what === 'map') {
  const Mp = require('../js/map');
  ctx.save(); ctx.translate(540, 540); ctx.scale(.85, .85);
  Mp.map(ctx, { t: 1, season: 0 });
  const r = [Mp.proj(-80, 45), Mp.proj(-88, 38), Mp.proj(-97, 31), Mp.proj(-100.3, 19.6)];
  Mp.route(ctx, r, .9, { t: 1 });
  Mp.pin(ctx, ...Mp.PLACES.mexico, 1);
  ctx.restore();
}
if (what === 'world') {
  const Wd = require('../js/world'), which = process.argv[4] || 'meadow', c = { x: 540, y: 540, z: 1 };
  if (which === 'meadow') { Wd.sky(ctx, .3, { horizon: 700 }); Wd.sun(ctx, 760, 520, 60); Wd.rays(ctx, 760, 520, 1, 1); Wd.clouds(ctx, .3, 1); Wd.meadow(ctx, c, 1, .3, { mist: 1 }); Wd.screen(ctx); Wd.bokeh(ctx, 1, {}); Wd.motes(ctx, 1); }
  if (which === 'autumn') { Wd.sky(ctx, .62, { horizon: 380 }); Wd.clouds(ctx, .62, 1, { n: 5, y0: 40, yr: 200, s: .8 }); Wd.autumnLand(ctx, c, 1, { horizon: 340 }); }
  if (which === 'mexico') { Wd.sky(ctx, .4, { horizon: 640, cols: ['#8fb0d8', '#c9d8ec', '#eef2f6'] }); Wd.mountains(ctx, c, 1, {}); Wd.screen(ctx); for (let i = 0; i < 5; i++) Wd.fir(ctx, 120 + i * 220, 1080, 700 + i * 40, { cover: i / 4, seed: i + 1, open: i === 4 ? .4 : 0 }); }
  if (which === 'night') { Wd.sky(ctx, .9, { horizon: 800, t: 1 }); Wd.moon(ctx, 800, 200, 40); Wd.meadow(ctx, c, 1, .9, {}); }
}
if (what === 'trees') {
  const Tr = require('../js/trees');
  const t0 = Date.now(); Tr.build(); Tr.firs(); console.log('build', Date.now() - t0, 'ms');
  const g = ctx.createLinearGradient(0, 0, 0, 1080); g.addColorStop(0, '#9cc8ee'); g.addColorStop(1, '#e8f2f6'); ctx.fillStyle = g; ctx.fillRect(0, 0, 1080, 1080);
  Tr.drawSprite(ctx, Tr.SPR.cloud[0], 240, 160, 150); Tr.drawSprite(ctx, Tr.SPR.cloud[1], 760, 200, 120);
  ctx.fillStyle = '#7ab050'; ctx.fillRect(0, 520, 1080, 560);
  const L = Tr.SPR.leaf;
  [['summer', 0], ['summer', 1], ['summer', 2], ['spring', 0], ['red', 0], ['orange', 1], ['yellow', 2], ['mixed', 0]].forEach(([p, i], k) => Tr.drawSprite(ctx, L[p][i], 70 + k * 130, 520, 230));
  [['bare', 0], ['cover', 1], ['open', 2]].forEach(([v, i], k) => Tr.drawSprite(ctx, Tr.SPR.fir[i][v], 200 + k * 340, 1075, 520));
}
if (what === 'cluster') {
  const Tr = require('../js/trees');
  const t0 = Date.now(); const cs = Tr.clusters(); console.log('build', Date.now() - t0, 'ms');
  ctx.fillStyle = '#c8d6e6'; ctx.fillRect(0, 0, 1080, 1080);
  Tr.drawSprite(ctx, cs[0], 540, 560, 460); Tr.drawSprite(ctx, cs[1], 540, 1080, 460);
}
if (what === 'module') require(path.resolve(process.argv[4]))(ctx);
fs.writeFileSync(out, cv.toBuffer('image/png'));
console.log(out);
