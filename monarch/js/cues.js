// One cue sheet shared by the pictures and the score (seconds; 96 BPM -> beat .625 s, bar 2.5 s).
const BEAT = .625, BAR = 2.5;
const SHOT = {
  title: 0, egg: 10, hatch: 20, grow: 25, bird: 37.5, wander: 42.5, pupa: 50, meta: 57.5, emerge: 67.5, flight: 77.5,
  adult: 82.5, gens: 92.5, migrate: 100, mexico: 112.5, ret: 122.5, finale: 127.5, end: 137.5,
};

// sound + picture events
const EV = {
  // title
  flare: 1.25, reveal: 3.0, takeoff: 4.4, title: 5.0, titleOut: 8.1, dive: 9.35,
  // egg
  land: 10.6, taste: [11.0, 11.3], lay: 11.875, leave: 12.8, macro: 13.75, days: [14.4, 15.4, 16.4, 17.4], tremble: 18.4, chew: 19.2,
  // hatch + growth
  emerge: 20.3, shell: [21.9, 22.2, 22.5, 22.8], trench: 23.4, molts: [27.5, 30.0, 32.5, 35.0], x2000: 35.6,
  // bird
  shadow: 37.5, grab: 38.45, xray: 39.1, spit: 40.0, land2: 40.55, flyoff: 41.0,
  // wander + J
  walk: 42.5, silk: 45.0, drop: 47.0, curl: 47.5, night: 48.2,
  // chrysalis
  split: 50.6, wriggles: [51.25, 51.875, 52.5, 53.125], twist: 53.75, skinFall: 54.3, shape: 54.6, gold: [55.6, 55.9, 56.2, 56.5, 56.8],
  // metamorphosis
  iris: 58.0, soup: 58.8, discs: 60.0, grow: 61.25, colour: 64.4, back: 65.3,
  // emergence
  crack: 68.75, out: 69.4, pump: 70.6, zip: 72.0, dry: 74.4, opens: [75.6, 76.6],
  // flight
  lift: 77.5, soar: 78.75,
  // adult
  sip: 83.4, sexes: 85.0, court: 87.5, pair: 89.0, eggs: [90.0, 90.625, 91.25, 91.875],
  // generations
  gen: [93.1, 94.9, 96.6, 98.2],
  // migration
  autumn: 100, rise: 101.2, swarm: 102.5, compass: 104.4, route: 106.5, arrive: 111.2,
  // mexico
  cluster: 115.6, sunbreak: 118.75, burst: 120.0,
  // return + finale
  north: 122.5, lastEgg: 125.0, glow: 126.3, ring: 127.5, stations: [128.4, 129.0, 129.6, 130.2], name: 131.25, fly: 134.4, final: 135.0,
};

const CHAPTERS = [
  { a: 10.3, d: 3.6, n: 1, s: 'the egg' },
  { a: 20.3, d: 3.8, n: 2, s: 'the caterpillar' },
  { a: 42.8, d: 3.6, n: 3, s: 'the chrysalis' },
  { a: 58.4, d: 3.6, n: 4, s: 'metamorphosis' },
  { a: 69.0, d: 3.6, n: 5, s: 'the butterfly' },
  { a: 92.9, d: 3.6, n: 6, s: 'four generations' },
  { a: 100.4, d: 3.6, n: 7, s: 'the great migration' },
  { a: 112.9, d: 3.6, n: 8, s: 'winter in Mexico' },
  { a: 122.8, d: 3.4, n: 9, s: 'the journey home' },
];

// short fact chips: [start, duration, text]
const FACTS = [
  [11.2, 2.4, 'eggs go only on milkweed'],
  [15.0, 2.9, 'smaller than a pinhead'],
  [22.0, 2.4, 'first meal: its own eggshell'],
  [28.0, 3.0, 'eats only milkweed'],
  [31.2, 3.0, '5 stages, 4 skin changes'],
  [40.6, 2.0, 'milkweed makes it poisonous'],
  [45.2, 2.2, 'spins a silk pad'],
  [48.4, 1.6, 'hangs in a "J" for a day'],
  [55.0, 2.4, 'chrysalis: about 10 days'],
  [61.5, 3.0, 'rebuilt from tiny cell clusters'],
  [70.9, 2.8, 'pumps fluid into its wings'],
  [74.6, 2.6, 'dries for about 2 hours'],
  [83.4, 1.7, 'sips nectar through a straw'],
  [85.4, 2.0, 'males have two black scent spots'],
  [90.3, 2.0, 'up to 500 eggs, one per leaf'],
  [93.3, 2.6, 'summer butterflies live 2–6 weeks'],
  [98.4, 1.9, 'the 4th generation lives 8 months'],
  [104.6, 2.2, 'steers by the sun'],
  [108.0, 2.6, 'up to 4,800 km to Mexico'],
  [116.2, 2.6, 'millions cluster on fir trees'],
  [124.9, 2.0, 'lays eggs, then her journey ends'],
];

module.exports = { BEAT, BAR, SHOT, EV, CHAPTERS, FACTS };
