// Single source of truth for the film's clock. Picture AND music both read this file, so they stay locked.
// 96 BPM, 4/4 -> 1 beat = 0.625 s, 1 bar = 2.5 s, 54 bars = 135 s. Every scene starts on a bar line.
const BPM = 96, BEAT = 60 / BPM, BAR = BEAT * 4, BARS = 54, DURATION = BARS * BAR;
const B = (bar, beat = 0) => bar * BAR + beat * BEAT;

// [id, start, end, mood]
const SCENES = [
  ['prologue', B(0), B(3), 'dusk forest roaring with cicadas; title; awe and mystery (D minor-ish, dark, big)'],
  ['song', B(3), B(8), 'morning branch: a male sings, a female answers with wing flicks, they pair, she cuts slits and lays eggs; warm, tender, playful'],
  ['eggs', B(8), B(12), 'inside the twig: eggs develop over six weeks (time-lapse), red eye-spots, then they hatch; delicate wonder, ticking clockwork'],
  ['drop', B(12), B(15), 'newborn nymphs let go, fall from the tree, land, an ant hunts them, they dig in; suspense then danger'],
  ['underground', B(15), B(27), 'seventeen years in the dark on a root: sap, moults, seasons pass above; patient, deeply emotional, grows and grows'],
  ['awakening', B(27), B(30), 'year 17, soil reaches 18 C, every nymph wakes and digs up; heartbeat, tension, huge build'],
  ['emergence', B(30), B(35), 'dusk: millions burst out of the ground, march and climb, a bird feasts, the swarm wins; EXCITING, driving'],
  ['molt', B(35), B(41), 'night: the final moult on the trunk, the back splits, a white adult hangs, wings unfold, dawn hardens it; held breath, wonder, glorious sunrise'],
  ['chorus', B(41), B(46), 'daylight: first flight, the forest roars with song; triumphant, joyful'],
  ['return', B(46), B(50), 'weeks later: adults die and fall; their bodies feed the soil and the tree; new nymphs drop; elegiac and grateful'],
  ['epilogue', B(50), B(54), 'the life-cycle ring; the egg motif returns; peaceful resolution'],
];

// Story events (seconds). The score places hits / risers / one-shots on these.
const EV = {
  title: B(1),                       // CICADA title lands
  chorusFade: [B(1, 2), B(3, 2)],    // forest chorus thins out into the morning
  maleCall: [[B(3, 2), B(4, 1)], [B(4, 2), B(5)]],   // two song phrases (rise-hold-fall)
  femaleLand: B(5),
  flick: [B(5, 1), B(5, 1.75)],      // female's wing-flick answers
  walk: [B(5, 2), B(5, 4)],          // male walks to her
  pair: B(6),
  cutStart: B(6),                    // ovipositor saws the twig
  eggLay: [B(6, 2), B(6, 3), B(7), B(7, 1), B(7, 2), B(7, 3)],
  eggsStart: B(8),
  eyeSpots: B(9, 3),
  hatch: [B(10, 2), B(10, 3), B(11), B(11, 1), B(11, 1.5), B(11, 2)],
  dropStart: B(12),
  letGo: B(12, 1),
  land: B(13, 1),
  ant: B(13, 3),
  dig: B(14),
  undergroundStart: B(15),
  rootFind: B(16, 2),
  year1: B(17, 2), yearStep: BEAT * 2,  // year n at year1 + (n-1)*yearStep -> year 17 at B(25, 2)
  molts: [2, 4, 7, 11],                 // underground moults (instars II..V) in these years
  warm: B(25, 2),                       // soil starts warming
  warm18: B(26, 2),                     // 18 C reached
  awakening: B(27),
  turret: B(28, 2),
  soilBreak: B(30),
  birdEat: B(32),
  climbStart: B(33),
  grip: B(35, 1),
  split: B(36),
  hang: [B(36, 2), B(37, 2)],
  curlUp: B(38),
  wingsExpand: [B(38), B(39, 3)],
  harden: [B(39, 3), B(41)],
  sunrise: B(40),
  firstFlight: B(41),
  chorusStart: B(42),
  chorusPeak: B(43),
  fall: B(46, 2),
  nutrients: [B(47, 2), B(49, 2)],
  epilogue: B(50),
  ring: B(51),
  end: DURATION,
};
const yearTime = (y) => EV.year1 + (y - 1) * EV.yearStep;
const moltTime = (y) => yearTime(y) - BEAT * .5;

module.exports = { BPM, BEAT, BAR, BARS, DURATION, B, SCENES, EV, yearTime, moltTime };
