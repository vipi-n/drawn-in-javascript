// Renderer.
//   node amoeba-motion/tools/render.js --times 1,5.5,20 [--cols 3 --cell 360 --out build/sheet.png]   contact sheet
//   node amoeba-motion/tools/render.js --at 12.5                                                      single full-size frame
//   node amoeba-motion/tools/render.js --video [--jobs 12] [--music]                                  full film -> amoeba-life-cycle-motion.mp4
//   node amoeba-motion/tools/render.js --chunk a b out.mp4                                            (worker) frames [a,b)
const fs = require('fs'), path = require('path'), os = require('os');
const { spawn, spawnSync } = require('child_process');
const core = require('../js/core');
const { C, W, H, FPS, FRAMES } = core;

const ROOT = path.join(__dirname, '..'), BUILD = path.join(ROOT, 'build');
fs.mkdirSync(BUILD, { recursive: true });
const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };

function setup() {
  core.fonts();
  require('../js/tex').build();
  const film = require('../js/film');
  const cv = C.createCanvas(W, H), ctx = cv.getContext('2d', { alpha: false });
  return { cv, ctx, film };
}

async function chunk(a, b, out) {
  const { cv, ctx, film } = setup();
  // a named FIFO opened in blocking mode: stdin pipes gave ffmpeg truncated raw packets
  const fifo = out + '.fifo';
  if (fs.existsSync(fifo)) fs.unlinkSync(fifo);
  spawnSync('mkfifo', [fifo]);
  const ff = spawn('ffmpeg', ['-nostdin', '-y', '-v', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${W}x${H}`, '-r', String(FPS), '-i', fifo,
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-pix_fmt', 'yuv420p', '-g', '48', '-threads', '2', out], { stdio: ['ignore', 'inherit', 'inherit'] });
  const closed = new Promise((r, j) => ff.on('close', (c) => c ? j(new Error('ffmpeg ' + c)) : r()));
  const fd = fs.openSync(fifo, 'w');
  for (let f = a; f < b; f++) {
    film.frame(ctx, f);
    const buf = cv.data();
    let off = 0;
    while (off < buf.length) off += fs.writeSync(fd, buf, off, buf.length - off);
  }
  fs.closeSync(fd);
  await closed;
  fs.unlinkSync(fifo);
}

function sheet(times) {
  const { cv, ctx, film } = setup();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'amoeba-'));
  times.forEach((t, i) => {
    const t0 = Date.now();
    film.frame(ctx, Math.min(FRAMES - 1, Math.round(t * FPS)));
    fs.writeFileSync(path.join(dir, `f${String(i).padStart(3, '0')}.png`), cv.toBuffer('image/png'));
    console.log(`t=${t.toFixed(2)} ${Date.now() - t0} ms`);
  });
  const cols = +opt('--cols', Math.min(3, times.length)), cell = +opt('--cell', 360), rows = Math.ceil(times.length / cols);
  const out = opt('--out', path.join(BUILD, 'sheet.png'));
  spawnSync('ffmpeg', ['-nostdin', '-y', '-v', 'error', '-i', path.join(dir, 'f%03d.png'), '-vf', `scale=${cell}:-1,tile=${cols}x${rows}:padding=4`, '-frames:v', '1', out], { stdio: 'inherit' });
  fs.rmSync(dir, { recursive: true });
  console.log(out);
}

async function video() {
  const jobs = +opt('--jobs', 12), size = 96;
  const wav = path.join(BUILD, 'score.wav');
  if (!fs.existsSync(wav) || args.includes('--music')) spawnSync('node', [path.join(ROOT, 'js', 'music.js'), wav], { stdio: 'inherit' });
  const segDir = path.join(BUILD, 'seg'); fs.mkdirSync(segDir, { recursive: true });
  const parts = [];
  for (let a = 0; a < FRAMES; a += size) parts.push([a, Math.min(FRAMES, a + size), path.join(segDir, `s${String(a / size).padStart(3, '0')}.mp4`)]);
  const todo = parts.filter((p) => args.includes('--resume') ? !fs.existsSync(p[2]) : true);
  console.log(`${FRAMES} frames, ${parts.length} chunks, ${todo.length} to render, ${jobs} jobs`);
  const t0 = Date.now(); let done = 0, next = 0;
  await new Promise((resolve, reject) => {
    let running = 0;
    const launch = () => {
      if (next >= todo.length && running === 0) return resolve();
      while (running < jobs && next < todo.length) {
        const [a, b, out] = todo[next++], tmp = out + '.part.mp4';
        running++;
        const p = spawn('node', [__filename, '--chunk', a, b, tmp], { stdio: 'inherit' });
        p.on('close', (c) => {
          running--;
          if (c) return reject(new Error(`chunk ${a} failed`));
          fs.renameSync(tmp, out); done++;
          const el = (Date.now() - t0) / 1000;
          console.log(`chunk ${a}-${b} done  ${done}/${todo.length}  ${el.toFixed(0)}s elapsed`);
          launch();
        });
      }
    };
    launch();
  });
  const list = path.join(segDir, 'list.txt');
  fs.writeFileSync(list, parts.map((p) => `file '${p[2]}'`).join('\n'));
  const final = path.join(ROOT, 'amoeba-life-cycle-motion.mp4');
  spawnSync('ffmpeg', ['-nostdin', '-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-i', wav, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-shortest', '-movflags', '+faststart', final], { stdio: 'inherit' });
  console.log('wrote', final, `${((Date.now() - t0) / 60000).toFixed(1)} min`);
}

(async () => {
  if (args.includes('--chunk')) { const i = args.indexOf('--chunk'); await chunk(+args[i + 1], +args[i + 2], args[i + 3]); return; }
  if (args.includes('--video')) return video();
  if (args.includes('--at')) { const t = +opt('--at'); const { cv, ctx, film } = setup(); film.frame(ctx, Math.round(t * FPS)); const out = opt('--out', path.join(BUILD, `at-${t}.png`)); fs.writeFileSync(out, cv.toBuffer('image/png')); console.log(out); return; }
  const times = opt('--times');
  if (times) return sheet(times.split(',').map(Number));
  console.log('see header for usage');
})().catch((e) => { console.error(e); process.exit(1); });
