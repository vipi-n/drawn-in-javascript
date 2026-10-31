// Nine to Six: one man, one ordinary day. Every frame is drawn from a time value.
let _film = null;
const CAPS = [
  [24.3, 26.7, 'Nothing to eat.'], [36, 39, 'Breakfast, on the move.'], [65.2, 71.2, 'Standing. The whole way.'],
  [108.4, 111.6, 'Twenty minutes for lunch.'], [119, 124.4, 'Same tasks. More tasks.'], [129.6, 135.6, 'Same train. Even more crowded.'],
  [148.4, 151, 'One beer. For himself.'], [173, 177.8, 'Five minutes a night, for his own dream.']
];

function titleCard(t) {
  if (t > 5.4) return;
  const a = Math.min(inv(.2, .8, t), 1 - inv(4.3, 5.3, t));
  screen(); fade(a, () => {
    pill(540, 300, 660, 300, C.paper, .78);
    hand(typed('Nine to Six', t, .4, 2), 540, 320, 132, C.line);
    hand(typed('a day in the life', t, 2, 3.4), 540, 400, 54, C.redD);
    sketch(curve(250, 350, 400, 372, 700, 346, 830, 366), inv(3.2, 4, t), { w: 4, amp: .6 });
  });
}
function endCard(t) {
  if (t < 185.4) return;
  screen(); ctx.globalAlpha = inv(185.4, 186.6, t); ctx.fillStyle = C.paper; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1;
  if (t > 186) { boat(540, 690, 1.25, inv(186, 187.3, t), { w: 5 }); hand(typed('Someday.', t, 186.2, 187), 540, 470, 140, C.redD); }
}

function apartmentCam(t) {
  return kf([[0, 470], [8, 500], [13, 560], [16.4, 600], [19, 1000], [21.5, 1190], [22.6, 1350], [26.6, 1420], [29, 1880], [30.5, 1990]], t);
}

function streetCam(t) { return Math.max(560, heroStreet(t).x + 170); }

// a torn sheet of paper sweeps across; the scene changes while it fully covers the frame
function wipe(t, tc, dur = .9, col = C.paper) {
  const p = (t - (tc - dur / 2)) / dur; if (p <= 0 || p >= 1) return;
  const first = p < .5, e = lerp(-70, W + 70, first ? p * 2 : (p - .5) * 2), pts = [];
  for (let y = -20; y <= H + 20; y += 16) pts.push(e + (hash(Math.floor(y / 16) + 7) - .5) * 26, y);
  screen();
  cut(poly(first ? [...pts, -40, H + 20, -40, -20] : [...pts, W + 40, H + 20, W + 40, -20], true), col, { line: null, shadow: 1.6, amp: 0 });
  line(poly(pts), 2, '#cfc7b4', { amp: 0 });
}

function renderFilm(t) {
  if (!_film) { _film = document.getElementById('film'); setCtx(_film.getContext('2d')); }
  t = clamp(t, 0, DURATION - 1 / FPS);
  beginFrame(Math.floor(t * FPS));
  paper();
  ctx.globalAlpha = 1;
  if (t < 30.5) apartment(t, apartmentCam(t));
  else if (t < 50) streetScene(t, streetCam(t));
  else if (t < INSIDE_T0) platformScene(t);
  else if (t < VIA_T0) carriageScene(t, false);
  else if (t < VIA_T1) viaductScene(t, false);
  else if (t < FLOOR_T0) officeOutside(t);
  else if (t < LUNCH_T0) officeFloorScene(t);
  else if (t < AFT_T0) lunchScene(t);
  else if (t < OFF_T1) afternoonScene(t);
  else if (t < 136.5) carriageScene(t, true);
  else if (t < 140) viaductScene(t, true);
  else if (t < BAR_IN) barOutside(t);
  else if (t < NIGHTST) barInside(t);
  else if (t < HOME_T0) nightStreet(t);
  else homeNight(t);
  screen();
  wipe(t, 30.5); wipe(t, INSIDE_T0); wipe(t, VIA_T0); wipe(t, FLOOR_T0); wipe(t, LUNCH_T0); wipe(t, AFT_T0); wipe(t, OFF_T1); wipe(t, 136.5); wipe(t, BAR_OUT); wipe(t, BAR_IN, .7); wipe(t, NIGHTST); wipe(t, HOME_T0);
  const nightUI = nightAt(t) > .5;
  for (const [a, b, txt, size] of CAPS) caption(txt, t, a, b, size || 38, 1044, C.line, nightUI);
  if (t > 72.6 && t < 78.6) { fade(Math.min(inv(72.6, 73.2, t), inv(78.6, 78, t)), () => { pill(540, 176, 560, 96); hand('one hour later...', 540, 196, 64, C.line); }); }
  if (t > 5) stamp(t, nightUI ? 'night' : '');
  titleCard(t);
  endCard(t);
  grainOverlay();
}
