// Motion QA: mean frame-to-frame difference (YAVG of tblend difference at 30 fps, 270 px) per second + share of
// near-static frames.  node frog/tools/motion.js [video]
const { spawnSync } = require('child_process');
const file = process.argv[2] || require('path').join(__dirname, '..', 'frog-life-cycle.mp4');
const r = spawnSync('ffmpeg', ['-v', 'error', '-i', file, '-vf', 'fps=30,scale=270:270,tblend=all_mode=difference,signalstats,metadata=print:key=lavfi.signalstats.YAVG:file=-', '-f', 'null', '-'], { encoding: 'utf8', maxBuffer: 1 << 28 });
const v = [...r.stdout.matchAll(/YAVG=([\d.]+)/g)].map((m) => +m[1]);
const mean = v.reduce((a, b) => a + b, 0) / v.length, stat = v.filter((x) => x < .6).length / v.length;
console.log(`frames ${v.length}  mean ${mean.toFixed(2)}  near-static ${(stat * 100).toFixed(1)}%`);
let line = '';
for (let s = 0; s * 30 < v.length; s++) {
  const w = v.slice(s * 30, s * 30 + 30), m = w.reduce((a, b) => a + b, 0) / w.length;
  line += `${String(s).padStart(3)}:${m.toFixed(1).padStart(5)} `;
  if (s % 10 === 9) { console.log(line); line = ''; }
}
if (line) console.log(line);
