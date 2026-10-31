// Rig / asset test sheets: node frog/tools/test.js <name> [out.png]
const fs = require('fs'), path = require('path');
const core = require('../js/core');
const { C, W, H } = core;
const G = require('../js/gfx');
core.fonts();
const name = process.argv[2] || 'frog';
const out = process.argv[3] || path.join(__dirname, '..', 'build', `test-${name}.png`);
fs.mkdirSync(path.dirname(out), { recursive: true });

const TESTS = {
  embryo(g) {
    const S = require('../js/spawn');
    g.fillStyle = '#04100e'; g.fillRect(0, 0, W, H);
    const st = (process.env.ST || '1,2.4,3.2,3.9,4.9,6.9,8.2,9.4,10.4,11.3,12.4,14,15.2,16,5.9,7.9').split(',').map(Number);
    const n = Math.ceil(Math.sqrt(st.length)), cw = W / n;
    st.forEach((gs, i) => {
      const cx = (i % n) * cw + cw / 2, cy = Math.floor(i / n) * cw + cw / 2, t0 = Date.now();
      S.capsule(g, cx, cy, cw * .3, 0);
      S.sphere(g, cx, cy, cw * .26, gs, 0);
      G.text(g, String(gs), cx - cw / 2 + 8, cy - cw / 2 + 22, { font: 'SvM', size: 18, color: '#9fe' });
      console.log(gs, Date.now() - t0, 'ms');
    });
  },
  clump(g) {
    const S = require('../js/spawn');
    g.fillStyle = '#2f6f62'; g.fillRect(0, 0, W, H);
    S.clump(g, 300, 300, { n: 120, size: 200, swell: 0 });
    S.clump(g, 780, 300, { n: 120, size: 200, swell: 1 });
    S.clump(g, 300, 780, { n: 120, size: 200, swell: 1, stage: 1.2, t: 1 });
    S.clump(g, 780, 780, { n: 120, size: 200, swell: 1, stage: 1.9, t: 2 });
  },
  frog(g) {
    const F = require('../js/frog');
    g.fillStyle = '#cfd8c8'; g.fillRect(0, 0, W, H);
    const cells = (process.env.CELLS ? JSON.parse(process.env.CELLS) : null) || [
      { pose: { sit: 1 } }, { pose: { crouch: 1 } }, { pose: { leap: 1 } },
      { pose: { swimOut: 1 } }, { pose: { swimIn: 1 } }, { pose: { float: 1 } },
      { pose: { sit: 1 }, sac: 1, male: 1 }, { pose: { sit: 1 }, mouth: 1, tongue: { x: 260, y: -40, k: 1 } }, { pose: { hang: 1 }, young: 1, tail: .5, s: .8 },
    ];
    const n = Math.ceil(Math.sqrt(cells.length)), cw = W / n;
    cells.forEach((c, i) => {
      const cx = (i % n) * cw + cw / 2, cy = Math.floor(i / n) * cw + cw * .55, sc = (c.s ?? .95) * 3 / n, gl = cy + cw * .17;
      g.strokeStyle = 'rgba(0,0,0,.15)'; g.beginPath(); g.moveTo(cx - cw / 2 + 10, gl); g.lineTo(cx + cw / 2 - 10, gl); g.stroke();
      const onGround = c.pose && (c.pose.sit || c.pose.crouch);
      F.frog(g, { x: cx, ...c, y: onGround ? gl - F.groundY(c.pose) * sc : cy, s: sc });
    });
  },
};
const cv = C.createCanvas(W, H), g = cv.getContext('2d');
TESTS[name](g, cv);
fs.writeFileSync(out, cv.toBuffer('image/png'));
console.log(out);
