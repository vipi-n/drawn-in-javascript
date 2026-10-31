// One cue sheet for pictures AND score. 100 BPM: beat .6 s, bar 2.4 s. 56 bars = 134.4 s.
const BEAT = .6, BAR = 2.4;

const SHOT = {
  open: 0, call: 12, amplex: 18, spawn: 24, embryo: 33.6, hatch: 52.8, tadpole: 62.4, legs: 76.8,
  froglet: 100.8, grow: 110.4, winter: 117.6, spring: 122.4, end: 134.4,
};

const EV = {
  // night pond + title
  eyes: 2.4, croak0: [4.8, 6.0], title: 7.2, dive: 11.4,
  // the call (over-under, dawn)
  calls: [12.6, 13.2, 13.8, 14.4, 15.0, 15.6, 16.2], female: 14.4, grab: 17.4,
  // amplexus + eggs
  pads: 19.2, eggs: 20.4, eggsEnd: 23.4, fert: 21.0,
  // frogspawn
  swell: 24.6, count: 26.4, rise: 28.8, zoom: 32.4,
  // embryo (macro)
  divisions: [36.0, 36.6, 37.2, 37.8, 38.4, 39.0, 39.6], heart: 49.2, hatchOut: 51.6,
  // hatchling
  wriggle: 54.0, oper: 57.6, swimOff: 61.8,
  // tadpole + danger
  graze: 64.8, gulp: 68.4, nymph: 70.8, strike: 72.6, calm: 75.0,
  // legs + metamorphosis
  bud: 77.4, toes: 82.2, kick: 84.0, thyroid: 87.0, pop: 88.8, tail: 90.0, mouthW: 91.2, lungs: 93.6, colour: 96.0, reveal: 98.4,
  // froglet
  surface: 101.4, climb: 103.2, rain: 104.4, tongue1: 108.0,
  // growing up
  tongue2: 112.2, autumn: 114.6,
  // winter
  ice: 117.6, mud: 119.4,
  // spring + finale
  crack: 122.4, swimUp: 124.8, croak1: [126.0, 127.2], spawn2: 129.0, pull: 129.6, endTitle: 131.4, lastCroak: 133.2,
};

// stage headers: [start, dur, numeral, title, subline]
const CHAPTERS = [
  [12.9, 4.4, '1', 'The Call', 'early spring · males sing to females'],
  [24.6, 4.2, '2', 'Frogspawn', 'one clump · up to 2,000 eggs'],
  [34.2, 4.0, '3', 'Embryo', 'Gosner stages 1–19 · about 2 weeks'],
  [53.4, 3.8, '4', 'Hatchling', 'no mouth yet · living on yolk'],
  [63.0, 3.8, '5', 'Tadpole', 'weeks 3–6 · an algae grazer'],
  [77.4, 3.8, '6', 'Legs', 'weeks 6–9 · hind legs first'],
  [87.0, 4.0, '7', 'Metamorphosis', 'weeks 9–12 · driven by thyroid hormone'],
  [101.4, 3.6, '8', 'Froglet', 'weeks 12–16 · out of the water'],
  [110.9, 3.6, '9', 'Adult', '2–3 years to breed'],
];

// callouts: [start, dur, key, label, sub]  (positions come from the shot that owns the key)
const CALLS = [
  [19.3, 2.4, 'pads', 'nuptial pads', 'grip on the thumbs'],
  [21.2, 2.2, 'fert', 'fertilised outside', 'sperm meets the eggs in water'],
  [29.4, 2.4, 'poles', 'dark top · pale yolk', 'pigment soaks up warmth'],
  [35.0, 1.6, 'crescent', 'grey crescent', 'the future back'],
  [43.4, 2.0, 'plug', 'yolk plug', 'gastrulation'],
  [45.6, 1.8, 'tube', 'neural tube', 'brain + spinal cord'],
  [49.3, 1.8, 'heart', 'heartbeat', null],
  [54.4, 2.0, 'gills', 'external gills', null],
  [56.0, 1.6, 'gland', 'sticky gland', null],
  [59.6, 1.8, 'spiracle', 'spiracle', 'water out · left side'],
  [65.3, 2.0, 'beak', 'horny beak + tiny teeth', 'scrapes algae'],
  [67.0, 1.4, 'gut', 'long coiled gut', null],
  [71.0, 1.4, 'nymph', 'dragonfly nymph', null],
  [84.6, 1.9, 'hidden', 'front legs grow hidden', null],
  [87.4, 1.6, 'thyroid', 'thyroid hormone', null],
  [89.0, 1.8, 'pop', 'left arm exits the spiracle', null],
  [90.6, 1.8, 'tailfood', 'tail absorbed = food', null],
  [92.3, 1.6, 'mouthW', 'wide mouth · real tongue', null],
  [93.8, 1.6, 'lungs', 'gills → lungs', null],
  [95.4, 1.5, 'gutS', 'short gut · now a hunter', null],
  [103.6, 1.6, 'stub', 'tail stub', null],
  [112.6, 1.8, 'swallow', 'eyes push food down', null],
  [119.8, 2.0, 'skin', 'breathes through its skin', 'hibernating in mud'],
];

// time badge (bubble counter): [time, unit, value]
const CLOCK = [
  [33.9, 'DAY', '1'], [39.6, 'DAY', '2'], [41.4, 'DAY', '3'], [44.4, 'DAY', '4'], [47.4, 'DAY', '6'], [49.2, 'DAY', '9'], [51.0, 'DAY', '14'],
  [52.4, null, null],
  [63.0, 'WEEK', '3'], [68.4, 'WEEK', '5'], [72.6, null, null],
  [77.4, 'WEEK', '6'], [80.4, 'WEEK', '7'], [82.8, 'WEEK', '8'], [85.2, 'WEEK', '9'], [89.4, 'WEEK', '10'], [92.4, 'WEEK', '11'], [96.0, 'WEEK', '12'], [99.6, null, null],
  [101.4, 'WEEK', '14'], [109.8, null, null],
  [111.0, 'YEAR', '1'], [115.2, 'YEAR', '2'], [120.6, 'YEAR', '3'], [124.0, null, null],
];

module.exports = { BEAT, BAR, SHOT, EV, CHAPTERS, CALLS, CLOCK };
