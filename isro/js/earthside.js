// Silhouette world: palms (via flora), church, cyclist, mission control.
const { W, H, clamp, lerp, hash, rng, noise2, fbm2 } = require('./core');
const { rgba, glow, vgrad, mixc } = require('./gfx');

function palm(ctx, x, y, h, o = {}) {
  return require('./flora').palm(ctx, x, y, h, { ...o, color: o.color ?? [8, 6, 12] });
}

function church(ctx, x, y, s, o = {}) {
  const col = rgba(o.color ?? [10, 8, 16]), glowA = o.glow ?? 1;
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(x - 6 * s, y); ctx.lineTo(x - 6 * s, y - 6 * s); ctx.lineTo(x - 3.2 * s, y - 6 * s); ctx.lineTo(x - 3.2 * s, y - 8 * s);
  ctx.lineTo(x, y - 11.5 * s); ctx.lineTo(x + 3.2 * s, y - 8 * s); ctx.lineTo(x + 3.2 * s, y - 6 * s); ctx.lineTo(x + 6 * s, y - 6 * s); ctx.lineTo(x + 6 * s, y);
  ctx.fill();
  ctx.fillRect(x - .9 * s, y - 13.5 * s, 1.8 * s, 2.5 * s);
  ctx.fillRect(x - .15 * s, y - 15.6 * s, .3 * s, 2.2 * s); ctx.fillRect(x - .8 * s, y - 15 * s, 1.6 * s, .3 * s);
  // nave extends back
  ctx.fillRect(x + 6 * s, y - 5 * s, 10 * s, 5 * s);
  if (glowA > 0) {
    const win = (wx, wy, ww, wh) => {
      ctx.fillStyle = rgba([255, 196, 110], .9 * glowA);
      ctx.beginPath(); ctx.moveTo(wx, wy + wh); ctx.lineTo(wx, wy + ww / 2); ctx.arc(wx + ww / 2, wy + ww / 2, ww / 2, Math.PI, 0); ctx.lineTo(wx + ww, wy + wh); ctx.fill();
      glow(ctx, wx + ww / 2, wy + wh / 2, ww * 4, [255, 170, 80], .25 * glowA);
    };
    win(x - .6 * s, y - 3.6 * s, 1.2 * s, 3.6 * s);
    win(x - 2.4 * s, y - 7 * s, .7 * s, 1.4 * s); win(x + 1.7 * s, y - 7 * s, .7 * s, 1.4 * s);
    for (let i = 0; i < 4; i++) win(x + (7.5 + i * 2.2) * s, y - 3.6 * s, .7 * s, 1.6 * s);
  }
}

// two-bone IK; bend picks the joint on the +x (1) or -x (-1) side, or 'down' for elbows
function ik(a, b, l1, l2, bend) {
  const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.min(l1 + l2 - 1e-4, Math.max(1e-4, Math.hypot(dx, dy)));
  const p = (l1 * l1 - l2 * l2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, l1 * l1 - p * p));
  const bx = a[0] + p * dx / d, by = a[1] + p * dy / d, px = -dy / d, py = dx / d;
  const k1 = [bx + h * px, by + h * py], k2 = [bx - h * px, by - h * py];
  if (bend === 'down') return k1[1] < k2[1] ? k1 : k2;
  return (k1[0] - k2[0]) * bend > 0 ? k1 : k2;
}
// foot offset along a walk cycle: planted (sliding back at ground speed) for `duty`, then swung forward
function gait(ph, duty, stride, lift) {
  ph = ((ph % 1) + 1) % 1;
  if (ph < duty) return [stride * (.5 - ph / duty), 0];
  const u = (ph - duty) / (1 - duty), e = u * u * (3 - 2 * u);
  return [stride * (-.5 + e), Math.sin(Math.PI * u) * lift];
}
const seg = (ctx, P, a, b, w) => { ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(...P(...a)); ctx.lineTo(...P(...b)); ctx.stroke(); };

// cyclist with a rocket nose cone on the carrier, driven by distance travelled (m). y = ground, s = px per metre
function cyclist(ctx, x, y, s, dist, o = {}) {
  const C0 = o.color ?? [14, 9, 8], col = rgba(C0), far = rgba(mixc(C0, [70, 46, 40], .3));
  const wa = dist / .34, ca = -wa / 2.2, bump = noise2(dist * 2.3, 1.7) * .006;
  const P = (px, py) => [x + px * s, y - (py + bump) * s];
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const BB = [0, .3], crank = .17, hip = [-.17, 1.03], sh = [.13, 1.5 + .01 * Math.sin(2 * ca)], hand = [.36, 1.12];
  const leg = (a, c) => {
    const pedal = [BB[0] + Math.cos(a) * crank, BB[1] + Math.sin(a) * crank], ankle = [pedal[0] - .02, pedal[1] + .07];
    const knee = ik(hip, ankle, .46, .47, 1);
    ctx.strokeStyle = c; seg(ctx, P, hip, knee, .14 * s); seg(ctx, P, knee, ankle, .1 * s); seg(ctx, P, [ankle[0] - .04, ankle[1] - .04], [pedal[0] + .1, pedal[1] - .01], .06 * s);
    ctx.lineWidth = .025 * s; ctx.beginPath(); ctx.moveTo(...P(...BB)); ctx.lineTo(...P(...pedal)); ctx.stroke();
  };
  const arm = (c) => { const el = ik(sh, hand, .3, .3, 'down'); ctx.strokeStyle = c; seg(ctx, P, sh, el, .09 * s); seg(ctx, P, el, hand, .075 * s); };
  leg(ca + Math.PI, far); arm(far);
  ctx.strokeStyle = col;
  const wheel = (cx) => {
    const [X, Y] = P(cx, .34);
    ctx.lineWidth = .05 * s; ctx.beginPath(); ctx.arc(X, Y, .32 * s, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = .007 * s; ctx.beginPath();
    for (let k = 0; k < 18; k++) { const b = wa + k * Math.PI / 9; ctx.moveTo(X + Math.cos(b) * .03 * s, Y + Math.sin(b) * .03 * s); ctx.lineTo(X + Math.cos(b + .3) * .31 * s, Y + Math.sin(b + .3) * .31 * s); }
    ctx.stroke();
    ctx.fillStyle = col; ctx.beginPath(); ctx.arc(X, Y, .035 * s, 0, Math.PI * 2); ctx.fill();
  };
  wheel(-.52); wheel(.56);
  const seat = [-.2, .95], headT = [.4, .92], rear = [-.52, .34], front = [.56, .34];
  ctx.lineWidth = .035 * s; ctx.beginPath();
  const L = (a, b) => { ctx.moveTo(...P(...a)); ctx.lineTo(...P(...b)); };
  L(rear, BB); L(BB, seat); L(seat, rear); L(seat, headT); L(BB, headT); L(headT, front); L(headT, [.45, 1.12]); L([.45, 1.12], [.32, 1.13]);
  L([-.2, .78], [-.75, .78]); L([-.75, .78], rear);
  ctx.stroke();
  ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(...P(-.2, .97), .11 * s, .03 * s, 0, 0, Math.PI * 2); ctx.fill();
  ctx.lineWidth = .02 * s; ctx.beginPath(); ctx.arc(...P(...BB), .09 * s, 0, Math.PI * 2); ctx.stroke();
  // nose cone lashed to the carrier, catching the sunrise
  const [cx0, cy0] = P(-.28, .9), [cx1, cy1] = P(-1.15, .84);
  const g = ctx.createLinearGradient(0, cy0 - .2 * s, 0, cy0 + .2 * s);
  g.addColorStop(0, rgba([255, 220, 170])); g.addColorStop(.3, rgba([214, 164, 120])); g.addColorStop(.6, rgba([90, 62, 50])); g.addColorStop(1, rgba([30, 20, 18]));
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.moveTo(cx0, cy0 - .19 * s); ctx.quadraticCurveTo(cx0 - .45 * s, cy0 - .17 * s, cx1, cy1); ctx.quadraticCurveTo(cx0 - .45 * s, cy0 + .14 * s, cx0, cy0 + .16 * s); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = col; ctx.lineWidth = .02 * s; ctx.beginPath(); ctx.moveTo(...P(-.45, 1.08)); ctx.lineTo(...P(-.45, .74)); ctx.moveTo(...P(-.75, 1.03)); ctx.lineTo(...P(-.75, .76)); ctx.stroke();
  // shirt torso leaning over the bars, head with a slight nod
  ctx.strokeStyle = col; ctx.lineCap = 'round';
  ctx.lineWidth = .24 * s; ctx.beginPath(); ctx.moveTo(...P(hip[0], hip[1] + .05)); ctx.quadraticCurveTo(...P(-.1, 1.35), ...P(...sh)); ctx.stroke();
  ctx.fillStyle = col; ctx.beginPath(); ctx.arc(...P(sh[0] + .1, sh[1] + .19 + .006 * Math.sin(ca * 2)), .105 * s, 0, Math.PI * 2); ctx.fill();
  ctx.lineWidth = .07 * s; ctx.beginPath(); ctx.moveTo(...P(sh[0] + .02, sh[1] + .05)); ctx.lineTo(...P(sh[0] + .07, sh[1] + .14)); ctx.stroke();
  leg(ca, col); arm(col);
  // warm rim light on the sun side
  ctx.strokeStyle = 'rgba(255,170,100,.35)'; ctx.lineWidth = .015 * s;
  ctx.beginPath(); ctx.arc(...P(sh[0] + .1, sh[1] + .19), .105 * s, -1.2, .6); ctx.stroke();
}

// mission control: screen with descent plot. k = deviation amount, alt in km
function control(ctx, t, o = {}) {
  vgrad(ctx, [[0, [4, 8, 14]], [1, [2, 3, 6]]]);
  const sx = o.sx ?? 260, sy = o.sy ?? 150, sw = o.sw ?? 1400, sh = o.sh ?? 640, z = o.zoom ?? 1;
  ctx.save();
  ctx.translate(W / 2, H / 2); ctx.scale(z, z); ctx.translate(-W / 2 + (o.px ?? 0), -H / 2 + (o.py ?? 0));
  // screen
  ctx.fillStyle = 'rgb(6,16,24)'; ctx.fillRect(sx, sy, sw, sh);
  glow(ctx, sx + sw / 2, sy + sh / 2, sw * .7, [40, 120, 160], .12);
  ctx.strokeStyle = 'rgba(80,140,170,.18)'; ctx.lineWidth = 1; ctx.beginPath();
  for (let i = 0; i <= 12; i++) { ctx.moveTo(sx + 60 + i * (sw - 120) / 12, sy + 60); ctx.lineTo(sx + 60 + i * (sw - 120) / 12, sy + sh - 60); }
  for (let i = 0; i <= 8; i++) { ctx.moveTo(sx + 60, sy + 60 + i * (sh - 120) / 8); ctx.lineTo(sx + sw - 60, sy + 60 + i * (sh - 120) / 8); }
  ctx.stroke();
  const X = (u) => sx + 60 + u * (sw - 120), Y = (v) => sy + 60 + (1 - v) * (sh - 120);
  const plan = (u) => Math.pow(1 - u, 1.6) * .95;
  ctx.strokeStyle = 'rgba(255,70,60,.9)'; ctx.lineWidth = 3; ctx.beginPath();
  for (let i = 0; i <= 100; i++) { const u = i / 100; i ? ctx.lineTo(X(u), Y(plan(u))) : ctx.moveTo(X(u), Y(plan(u))); }
  ctx.stroke();
  const prog = o.prog ?? .5, dev = o.dev ?? 0;
  ctx.strokeStyle = 'rgba(90,255,140,1)'; ctx.lineWidth = 4; ctx.shadowColor = 'rgba(90,255,140,.8)'; ctx.shadowBlur = 14; ctx.beginPath();
  let ex = 0, ey = 0;
  for (let i = 0; i <= 100; i++) {
    const u = prog * i / 100, off = dev * Math.pow(clamp((u - .78) / .2), 2) * .25;
    ex = X(u + off * .3); ey = Y(plan(u) + off * .5 - off * .2);
    i ? ctx.lineTo(ex, ey) : ctx.moveTo(ex, ey);
  }
  ctx.stroke(); ctx.shadowBlur = 0;
  glow(ctx, ex, ey, 30, [90, 255, 140], .9);
  ctx.font = '22px Mono'; ctx.fillStyle = 'rgba(140,220,200,.85)'; ctx.textAlign = 'left';
  ctx.fillText('VIKRAM  ROUGH BRAKING ▸ FINE BRAKING', sx + 70, sy + 40);
  ctx.textAlign = 'right'; ctx.fillText(`ALT ${(o.alt ?? 5).toFixed(2)} KM`, sx + sw - 70, sy + 40);
  ctx.restore();
  // silhouettes of engineers at consoles
  ctx.fillStyle = 'rgb(2,3,5)';
  ctx.fillRect(0, H - 250, W, 250);
  const r = rng(12);
  for (let i = 0; i < 11; i++) {
    const hx = 60 + i * 180 + r() * 60, hy = H - 250 - r() * 40, hs = 70 + r() * 30;
    ctx.beginPath(); ctx.ellipse(hx, hy - hs * .55, hs * .3, hs * .38, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(hx - hs * .9, H - 120); ctx.quadraticCurveTo(hx - hs * .8, hy - hs * .1, hx, hy - hs * .15); ctx.quadraticCurveTo(hx + hs * .8, hy - hs * .1, hx + hs * .9, H - 120); ctx.fill();
  }
  for (let i = 0; i < 6; i++) glow(ctx, 150 + i * 330, H - 200, 120, [60, 160, 200], .08);
}

module.exports = { palm, church, cyclist, control };
