// Offline export of the exact JavaScript canvas frames and synthesized score.
//   node tortoise/tools/render.js --at 12.5
//   node tortoise/tools/render.js --sheet 0,60,4      (contact sheet in previews/)
//   node tortoise/tools/render.js --video
const fs = require('node:fs'), os = require('node:os'), path = require('node:path'), vm = require('node:vm');
const { spawn } = require('node:child_process'); const { once } = require('node:events');
const root = path.resolve(__dirname, '..'), args = process.argv.slice(2);
const Canvas = require(path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas'));
const canvas = Canvas.createCanvas(1080, 1080), ctx = canvas.getContext('2d', { alpha: false });
const sandbox = vm.createContext({ console, setTimeout, Float32Array, Path2D: Canvas.Path2D, document: { getElementById: () => canvas, createElement: () => Canvas.createCanvas(1080, 1080) } });
for (const f of ['paper', 'scenery', 'cast', 'film']) vm.runInContext(fs.readFileSync(path.join(root, `js/${f}.js`), 'utf8'), sandbox, { filename: `${f}.js` });
const draw = t => vm.runInContext(`renderFilm(${t})`, sandbox, { timeout: 20000 });
const dir = path.join(root, 'previews');

function writeWav(m, dest) {
  const n = m.L.length, buf = Buffer.alloc(44 + n * 4);
  buf.write('RIFF', 0); buf.writeUInt32LE(buf.length - 8, 4); buf.write('WAVEfmt ', 8);
  buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22);
  buf.writeUInt32LE(m.SR, 24); buf.writeUInt32LE(m.SR * 4, 28); buf.writeUInt16LE(4, 32);
  buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(n * 4, 40);
  for (let i = 0, p = 44; i < n; i++, p += 4) {
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, m.L[i])) * 32767), p);
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, m.R[i])) * 32767), p + 2);
  }
  fs.writeFileSync(dest, buf);
}

async function main() {
  fs.mkdirSync(dir, { recursive: true });
  if (args.includes('--at')) {
    const t = Number(args[args.indexOf('--at') + 1] || 0); draw(t);
    const out = path.join(dir, `at-${String(t).replace('.', '-')}.png`);
    fs.writeFileSync(out, canvas.toBuffer('image/png')); console.log(out); return;
  }
  if (args.includes('--sheet') || args.includes('--times')) {
    const list = args.includes('--times') ? args[args.indexOf('--times') + 1].split(',').map(Number) : null;
    const [a, b, step] = list ? [list[0], list[list.length - 1], 0] : args[args.indexOf('--sheet') + 1].split(',').map(Number), cols = 3, cell = 480, times = [];
    const crop = args.includes('--crop') ? args[args.indexOf('--crop') + 1].split(',').map(Number) : [0, 0, 1080, 1080];
    if (list) times.push(...list); else for (let t = a; t < b - 1e-6; t += step) times.push(t);
    const sheet = Canvas.createCanvas(cols * cell, Math.ceil(times.length / cols) * cell), s = sheet.getContext('2d');
    times.forEach((t, i) => {
      draw(t); const x = i % cols * cell, y = Math.floor(i / cols) * cell;
      s.drawImage(canvas, crop[0], crop[1], crop[2], crop[3], x, y, cell, cell); s.fillStyle = '#222'; s.fillRect(x + 4, y + 4, 62, 24);
      s.fillStyle = '#fff'; s.font = '18px sans-serif'; s.fillText(t.toFixed(1), x + 9, y + 22);
    });
    const out = path.join(dir, `sheet-${a}-${b}${args.includes('--crop') ? '-crop' : ''}.png`);
    fs.writeFileSync(out, sheet.toBuffer('image/png')); console.log(out); return;
  }
  if (!args.includes('--video')) throw new Error('Choose --at TIME, --sheet A,B,STEP, or --video');
  vm.runInContext(fs.readFileSync(path.join(root, 'js/music.js'), 'utf8'), sandbox, { filename: 'music.js' });
  const music = await vm.runInContext('Music.build(()=>{})', sandbox);
  const score = path.join(root, 'original-score.wav'); writeWav(music, score); console.log(`score: ${score}`);
  const out = path.join(root, 'tortoise-and-hare.mp4');
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'rawvideo', '-pixel_format', 'rgba', '-video_size', '1080x1080', '-framerate', '24', '-i', 'pipe:0', '-i', score, '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', '-shortest', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  ff.stdin.on('error', e => { throw e; });
  const start = Date.now();
  for (let f = 0; f < 60 * 24; f++) {
    draw(f / 24);
    if (!ff.stdin.write(canvas.data())) await once(ff.stdin, 'drain');
    if (f % 120 === 0) console.log(`render ${Math.floor(f / 24)} / 60 s (${Math.round((Date.now() - start) / 1000)} s elapsed)`);
  }
  ff.stdin.end(); const [code] = await once(ff, 'exit'); if (code !== 0) throw new Error(`ffmpeg exited ${code}`);
  console.log(`video: ${out}`);
}
main().catch(e => { console.error(e); process.exitCode = 1; });
