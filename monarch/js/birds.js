// A blue jay for the attack scene: side view (facing +x), flapping wings, crest, opening beak, head shake.
const { TAU, clamp, lerp, rgba, mix } = require('./core');
const D = require('./draw');

const INK = '#141824';
// o: x, y, s, dir (1 faces right, -1 left), flap (-1 down .. 1 up), beak (0..1 open), shake (head rotation), tilt, gag
function jay(ctx, o) {
  const s = o.s ?? 1, f = o.flap ?? 0, bk = o.beak ?? 0;
  ctx.save(); ctx.translate(o.x ?? 0, o.y ?? 0); ctx.scale(s * (o.dir ?? 1), s); ctx.rotate(o.tilt ?? 0);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  const wing = (far) => { // a wing hinged at the shoulder; flap swings it up/down, foreshortened through the middle
    const k = far ? .8 : 1, a = -f * 1.1 * k, len = 150;
    const tip = [Math.cos(Math.PI + .5 + a) * len * .2 - 30, Math.sin(-Math.PI / 2 + a * 1.2) * len * Math.abs(Math.cos(a * .3)) * .9];
    ctx.save(); ctx.translate(-6, -22);
    ctx.beginPath(); ctx.moveTo(20, 0); ctx.quadraticCurveTo(tip[0] * .4 + 10, tip[1] * .7, tip[0], tip[1]); ctx.quadraticCurveTo(tip[0] - 40, tip[1] * .5 + 30, -60, 14); ctx.closePath();
    ctx.fillStyle = rgba(far ? '#2d5aa0' : '#3b74c8'); ctx.fill(); ctx.strokeStyle = rgba(INK, .9); ctx.lineWidth = 3; ctx.stroke();
    ctx.save(); ctx.clip();
    ctx.strokeStyle = rgba('#10182a', .8); ctx.lineWidth = 4;
    for (let i = 0; i < 4; i++) { const u = .35 + i * .15; ctx.beginPath(); ctx.moveTo(lerp(20, tip[0], u) - 20, lerp(0, tip[1], u) - 10); ctx.lineTo(lerp(20, tip[0], u) + 20, lerp(0, tip[1], u) + 10); ctx.stroke(); }
    ctx.fillStyle = rgba('#ffffff', .85); ctx.beginPath(); ctx.ellipse(lerp(-60, tip[0], .5), lerp(14, tip[1], .5) + 10, 8, 4, .5, 0, TAU); ctx.fill();
    ctx.restore(); ctx.restore();
  };
  wing(true);
  // tail
  ctx.beginPath(); ctx.moveTo(-60, -10); ctx.lineTo(-150, -30 + f * 6); ctx.lineTo(-156, -6 + f * 6); ctx.lineTo(-62, 10); ctx.closePath();
  ctx.fillStyle = rgba('#2f62b0'); ctx.fill(); ctx.strokeStyle = rgba(INK); ctx.lineWidth = 3; ctx.stroke();
  ctx.strokeStyle = rgba('#10182a', .7); ctx.lineWidth = 3; for (let i = 1; i < 4; i++) D.line(ctx, -60 - i * 24, -12 - i * 5 + f * 1.5, -62 - i * 24, 9 - i * 4 + f * 1.5);
  // body
  ctx.beginPath(); ctx.ellipse(0, 0, 72, 40, -.12, 0, TAU);
  const g = ctx.createLinearGradient(0, -40, 0, 40); g.addColorStop(0, '#4a86d8'); g.addColorStop(.5, '#7aa8e0'); g.addColorStop(1, '#eef3f8');
  ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = rgba(INK); ctx.lineWidth = 3.5; ctx.stroke();
  ctx.save(); ctx.clip(); ctx.fillStyle = rgba('#f4f7fb'); ctx.beginPath(); ctx.ellipse(20, 30, 60, 26, -.1, 0, TAU); ctx.fill(); ctx.restore();
  // head
  ctx.save(); ctx.translate(58, -30); ctx.rotate(o.shake ?? 0);
  ctx.beginPath(); ctx.moveTo(-26, -6); ctx.lineTo(-30, -52); ctx.lineTo(-6, -34); ctx.lineTo(-14, -60); ctx.lineTo(10, -30); ctx.closePath(); // crest
  ctx.fillStyle = rgba('#3b74c8'); ctx.fill(); ctx.strokeStyle = rgba(INK); ctx.lineWidth = 3; ctx.stroke();
  ctx.beginPath(); ctx.arc(0, 0, 30, 0, TAU); ctx.fillStyle = rgba('#5b92dc'); ctx.fill(); ctx.stroke();
  ctx.fillStyle = rgba('#f4f7fb'); ctx.beginPath(); ctx.ellipse(10, 12, 20, 14, .2, 0, TAU); ctx.fill();
  ctx.strokeStyle = rgba('#141824'); ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(4, 4, 25, .2, 1.9); ctx.stroke(); // black necklace
  // beak: upper + hinged lower
  const op = bk * .5;
  ctx.fillStyle = rgba('#20232c');
  ctx.beginPath(); ctx.moveTo(24, -6); ctx.lineTo(62, 2); ctx.lineTo(24, 6); ctx.closePath(); ctx.fill();
  ctx.save(); ctx.translate(24, 4); ctx.rotate(op); ctx.beginPath(); ctx.moveTo(0, -2); ctx.lineTo(34, 2); ctx.lineTo(0, 8); ctx.closePath(); ctx.fill(); ctx.restore();
  // eye (squeezed shut when gagging)
  if ((o.gag ?? 0) > .5) { ctx.strokeStyle = rgba(INK); ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(4, -10); ctx.lineTo(14, -6); ctx.lineTo(4, -2); ctx.stroke(); }
  else { D.dot(ctx, 8, -6, 6.5, INK); D.dot(ctx, 10, -8, 2.2, '#ffffff'); }
  ctx.restore();
  wing(false);
  ctx.restore();
  // where the beak tip is (world), so prey can be attached to it
  const c = Math.cos(o.tilt ?? 0), sn = Math.sin(o.tilt ?? 0), bx = 58 + 50, by = -30 + 4;
  return [(o.x ?? 0) + s * (o.dir ?? 1) * (bx * c - by * sn), (o.y ?? 0) + s * (bx * sn + by * c)];
}

module.exports = { jay };
