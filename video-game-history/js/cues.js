// Single source of truth for the film's clock. Picture AND music both read this file, so they stay locked.
// 90 BPM, 4/4 -> 1 beat = 0.667 s, 1 bar = 2.667 s, 48 bars = 128 s. Every scene starts on a bar line.
const BPM = 90, BEAT = 60 / BPM, BAR = BEAT * 4, BARS = 48, DURATION = BARS * BAR;
const B = (bar, beat = 0) => bar * BAR + beat * BEAT;

// [id, start, end, mood]
const SCENES = [
  ['intro', B(0), B(3), 'a CRT switches on in the dark; the title assembles in pixels; PRESS START; hushed, tender'],
  ['tennis', B(3), B(6), '1958 oscilloscope tennis, a green dot arcing over a net; music-box innocence'],
  ['spacewar', B(6), B(8), '1962 vector starships orbit a star on a round PDP-1 screen; wonder'],
  ['pong', B(8), B(11), '1972 Pong on a wood-grain TV, the Odyssey overlay; playful, first chip voices'],
  ['atari', B(11), B(13), '1977 a cartridge drops into the Atari 2600; colour arrives'],
  ['arcade', B(13), B(17), 'golden age: Space Invaders, Pac-Man, Donkey Kong; driving and joyful'],
  ['crash', B(17), B(19), '1983 the crash, cartridges buried in a night desert; sorrow'],
  ['revival', B(19), B(23), 'Tetris, NES + Mario-era side-scroller, Game Boy; hope returns, bouncing'],
  ['bits16', B(23), B(25), '16-bit console wars, Mode 7 vs speed; energetic'],
  ['threed', B(25), B(29), 'Doom, PlayStation, Nintendo 64: the leap into 3D; epic swell'],
  ['online', B(29), B(33), 'PS2, Xbox, World of Warcraft, a planet connected; soaring theme'],
  ['everyone', B(33), B(37), 'Wii, smartphones, Minecraft: games for everyone; warm, gentle'],
  ['today', B(37), B(42), 'esports arena, then a breathtaking modern landscape and the numbers; the grand climax'],
  ['epilogue', B(42), B(48), 'every era in a mosaic, back to the single dot, THANK YOU FOR PLAYING; nostalgic farewell'],
];

// fact cards: [start, end, year, title, line1, line2]
const CARDS = [
  [B(3, .5), B(6), '1958', 'TENNIS FOR TWO', 'Physicist William Higinbotham builds a tennis game on an oscilloscope', 'to entertain visitors at Brookhaven National Laboratory, New York'],
  [B(6), B(8), '1962', 'SPACEWAR!', 'MIT students program two duelling starships on a PDP-1 computer', 'copies of it spread to computer labs across America'],
  [B(8), B(9, 2), '1972', 'PONG', 'Atari\u2019s coin-op ping-pong becomes the first smash hit', 'the first machine \u201cbroke\u201d \u2014 it was jammed full of quarters'],
  [B(9, 2), B(11), '1972', 'MAGNAVOX ODYSSEY', 'Ralph Baer\u2019s invention: the very first home video game console', 'no sound, no colour \u2014 players taped plastic overlays onto the TV'],
  [B(11), B(13), '1977', 'ATARI 2600', 'Games arrive on swappable cartridges: one console, endless games', 'around 30 million sold \u2014 video games move into the living room'],
  [B(13), B(14, 2), '1978', 'SPACE INVADERS', 'Taito\u2019s alien march starts the golden age of the arcade', 'the aliens speed up as you shoot them \u2014 fewer left for the chip to draw'],
  [B(14, 2), B(15, 3), '1980', 'PAC-MAN', 'Toru Iwatani designs a maze chase that everyone can love', 'each ghost has its own mind: Blinky, Pinky, Inky and Clyde'],
  [B(15, 3), B(17), '1981', 'DONKEY KONG', 'Shigeru Miyamoto\u2019s first game as a designer', 'its little hero \u201cJumpman\u201d is later renamed \u2014 Mario'],
  [B(17), B(19), '1983', 'THE GREAT CRASH', 'Too many rushed games: US sales fall about 97% by 1985', 'Atari buries unsold cartridges in the New Mexico desert'],
  [B(19), B(20, 2), '1984', 'TETRIS', 'Alexey Pajitnov codes it in Moscow, drawn with [ ] text characters', 'the name: \u201ctetra\u201d (four) + tennis, his favourite sport'],
  [B(20, 2), B(21, 3), '1985', 'NES \u00b7 SUPER MARIO BROS.', 'Nintendo brings video games back to life in America', 'Super Mario Bros. sells over 40 million copies'],
  [B(21, 3), B(23), '1989', 'GAME BOY', 'Four AA batteries, a green screen \u2014 and Tetris in the box', 'more than 118 million sold, with the Game Boy Color'],
  [B(23), B(25), '1991', 'THE 16-BIT CONSOLE WARS', 'Super Nintendo vs Sega Genesis: Mode 7 against pure speed', 'Sonic the Hedgehog races into the fight'],
  [B(25), B(26, 2), '1993', 'DOOM', 'id Software turns the first-person shooter into a phenomenon', 'shared as shareware \u2014 the whole first episode was free'],
  [B(26, 2), B(27, 3), '1994', 'PLAYSTATION', 'Sony bets on CD-ROMs and 3D polygons', 'the first console to ship 100 million units'],
  [B(27, 3), B(29), '1996', 'NINTENDO 64', 'Super Mario 64 shows the world how to move in 3D', 'steered with a brand-new analog stick'],
  [B(29), B(30, 2), '2000', 'PLAYSTATION 2', 'It plays DVDs too \u2014 and becomes a record breaker', 'more than 160 million consoles sold'],
  [B(30, 2), B(31, 3), '2001', 'XBOX \u00b7 HALO', 'Microsoft enters the arena; Xbox Live (2002) takes consoles online', 'friends now play together from different cities'],
  [B(31, 3), B(33), '2004', 'WORLD OF WARCRAFT', 'Millions of strangers share one living, persistent world', 'at its peak: 12 million subscribers'],
  [B(33), B(34, 2), '2006', 'NINTENDO WII', 'Motion controls bring grandparents into the game', 'Wii Sports: about 83 million copies'],
  [B(34, 2), B(35, 3), '2008', 'THE APP STORE', 'Smartphones put a game console in every pocket', 'today mobile earns about half of all game revenue'],
  [B(35, 3), B(37), '2011', 'MINECRAFT', 'Markus \u201cNotch\u201d Persson\u2019s block world: if you can imagine it, build it', 'the best-selling video game ever \u2014 over 300 million copies'],
  [B(37), B(39), '2017', 'SWITCH \u00b7 FORTNITE \u00b7 ESPORTS', 'Games become places to meet, to watch, and to compete', 'esports finals now fill entire stadiums'],
  [B(39), B(42), 'TODAY', 'A WORLD AT PLAY', 'About 3.4 billion people play video games', 'roughly $180 billion a year \u2014 more than movies and music combined'],
];

// Story events (seconds). The score places hits / risers / one-shots on these.
const EV = {
  power: .35,                 // CRT switches on
  title: B(1),                // title lands
  press: B(2, 2),             // PRESS START pressed
  rally0: B(3),               // first tennis hit (then one hit every 2 beats, bounce on the odd beat)
  torp: [B(6, 1), B(6, 3), B(7, 1), B(7, 2.5)],
  pong0: B(8),                // first pong paddle hit (paddle every 2 beats, wall on the odd beat)
  overlay: B(9, 2),
  cart: B(11, 1),             // cartridge drops in
  power2600: B(11, 3),
  invaders: B(13), pac: B(14, 2), pellet: B(15, .5), dk: B(15, 3),
  crash: B(17),
  tetris: B(19), clear: B(20, 1), mario: B(20, 2), bump: [B(20, 3.5), B(21, 1.5)], gameboy: B(21, 3),
  bits16: B(23),
  doom: B(25), ps1: B(26, 2), n64: B(27, 3),
  ps2: B(29), net: B(30, 2), wow: B(31, 3),
  wii: B(33), phone: B(34, 2), mine: B(35, 3),
  arena: B(37), today: B(39), peak: B(39),
  mosaic: B(42), dot: B(44, 2), thanks: B(46),
  end: DURATION,
};

module.exports = { BPM, BEAT, BAR, BARS, DURATION, B, SCENES, CARDS, EV };
