// Single source of truth for the film's clock. Picture AND music both read this file, so they stay locked.
// 90 BPM, 4/4 -> 1 beat = 0.6667 s, 1 bar = 2.6667 s, 34 bars = 90.67 s. Every scene starts on a bar line.
const BPM = 90, BEAT = 60 / BPM, BAR = BEAT * 4, BARS = 34, DURATION = BARS * BAR;
const B = (bar, beat = 0) => bar * BAR + beat * BEAT;

// [id, start, end, mood]
const SCENES = [
  ['flight', B(0), B(4), 'summer evening after rain: winged queens and males pour out and rise; title; airy, soaring, hopeful'],
  ['found', B(4), B(7), 'a mated queen lands, stores sperm for life, snaps off her wings and digs a sealed chamber; earthy, determined'],
  ['egg', B(7), B(11), 'STAGE 1: she lays eggs; inside an egg the embryo forms; fertilised = female, unfertilised = male; delicate wonder'],
  ['larva', B(11), B(16), 'STAGE 2: hatch, fed mouth-to-mouth, four moults, inside the larva; diet decides worker or queen; playful growth'],
  ['pupa', B(16), B(21), 'STAGE 3: spins a silk cocoon, body dissolves and rebuilds, colour comes in; suspended mystery, rising'],
  ['adult', B(21), B(25), 'STAGE 4: sisters cut her free, a pale callow darkens, full anatomy; heroic reveal'],
  ['colony', B(25), B(30), 'the nest city: chambers, castes, jobs by age, pheromone trail, population grows; driving, busy'],
  ['cycle', B(30), B(34), 'years later new winged queens leave; the life-cycle ring and lifespans; end card; grand then peaceful'],
];

// Story events (seconds). The score places hits / risers / one-shots on these.
const EV = {
  title: B(1),
  takeoff: [B(1, 2), B(2), B(2, 1), B(2, 2.5), B(3)],
  landing: B(4, 1),
  sperm: B(4, 3),
  wingSnap: [B(5, 2), B(5, 2.5), B(5, 3), B(5, 3.5)],
  digStart: B(6),
  seal: B(6, 3),
  egg1: B(7, 1),
  eggLays: [B(7, 1), B(7, 2.5), B(7, 3.5)],
  scanEgg: B(8),
  embryo: [B(8), B(9, 2)],
  sexSplit: B(10),
  hatch: B(11),
  feed: [B(11, 2), B(12, 1)],
  molts: [B(12, 2), B(13), B(13, 2), B(14)],
  scanLarva: B(14),
  caste: B(15),
  spin: B(16),
  meconium: B(17, 2),
  scanPupa: B(18),
  eyes: B(19),
  color: B(19, 2),
  cut: B(21),
  emerge: B(21, 2),
  darken: [B(21, 2), B(22, 2)],
  anatomy: B(22, 2),
  colonyStart: B(25),
  trail: B(27),
  roles: B(28),
  pop: [B(25, 2), B(26, 2), B(27, 2), B(28, 2), B(29, 2)],
  newQueens: B(30),
  ring: B(31),
  end: B(33),
};

module.exports = { BPM, BEAT, BAR, BARS, DURATION, B, SCENES, EV };
