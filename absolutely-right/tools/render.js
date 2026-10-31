// Offline renderer for the lyric video.
//   node tools/render.js --times 3,20,48 [--cols 4 --cell 360 --out sheet.png]   contact sheet of chosen moments
//   node tools/render.js --still 48.9 [--out still.png]                          one full-size frame
//   node tools/render.js --video [--jobs 8]                                       all frames in parallel, then MP4 with the song
const fs = require('node:fs'), os = require('node:os'), path = require('node:path'), vm = require('node:vm');
const { spawn } = require('node:child_process');
const Canvas = require(path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas'));
const root = path.resolve(__dirname, '..'), args = process.argv.slice(2);
const opt = (n, d) => args.includes(n) ? args[args.indexOf(n) + 1] : d;

for (const f of ['Avenir Next Condensed.ttc', 'Avenir Next.ttc', 'Avenir.ttc', 'Menlo.ttc']) Canvas.GlobalFonts.registerFromPath('/System/Library/Fonts/' + f);
Canvas.GlobalFonts.registerFromPath('/System/Library/Fonts/Supplemental/Impact.ttf');
const TL = JSON.parse(fs.readFileSync(path.join(root, 'build', 'timeline.json'), 'utf8'));
const ctx = vm.createContext({ console, TL, createCanvas: Canvas.createCanvas });
for (const f of ['core.js', 'draw.js', 'cat.js', 'comic.js', 'scenes.js', 'subs.js', 'frame.js'])
  vm.runInContext(fs.readFileSync(path.join(root, 'js', f), 'utf8'), ctx, { filename: f });
const render = t => vm.runInContext(`renderFrame(${t})`, ctx);
const { W, H, FPS, DUR } = vm.runInContext('({ W, H, FPS, DUR })', ctx);
const FRAMES = Math.floor(DUR * FPS), OUTDIR = path.join(root, 'build', 'frames');

async function main() {
  fs.mkdirSync(path.join(root, 'previews'), { recursive: true });
  if (args.includes('--poses')) {
    const poses = vm.runInContext('Object.keys(POSES)', ctx), moods = vm.runInContext('Object.keys(CAT_MOODS)', ctx), cols = 6, cw = 320, ch = 360, cr = Number(opt('--crop', 800));
    const sheet = Canvas.createCanvas(cols * cw, Math.ceil(poses.length / cols) * ch), s = sheet.getContext('2d');
    poses.forEach((p, i) => {
      vm.runInContext(`HERO_FORCE = { pose: '${p}', mood: '${moods[i % moods.length]}' }`, ctx);
      const x = i % cols * cw, y = Math.floor(i / cols) * ch;
      s.drawImage(render(Number(opt('--at', 20))), Number(opt('--cx', 960)) - cr / 2, 1040 - cr * 1.125, cr, cr * 1.125, x, y, cw, ch);
      s.fillStyle = 'rgba(0,0,0,0.7)'; s.fillRect(x + 4, y + 4, 190, 26); s.fillStyle = '#fff'; s.font = '18px Menlo'; s.fillText(p + '/' + moods[i % moods.length], x + 9, y + 23);
    });
    const out = path.join(root, 'previews', opt('--out', 'poses.png')); fs.writeFileSync(out, sheet.toBuffer('image/png')); console.log(out); return;
  }
  if (args.includes('--times')) {
    const times = opt('--times').split(',').map(Number), cols = Number(opt('--cols', 4)), cw = Number(opt('--cell', 360)), ch = cw * H / W;
    const sheet = Canvas.createCanvas(cols * cw, Math.ceil(times.length / cols) * ch), s = sheet.getContext('2d');
    times.forEach((t, i) => {
      const x = i % cols * cw, y = Math.floor(i / cols) * ch;
      s.drawImage(render(t), x, y, cw, ch);
      s.fillStyle = 'rgba(0,0,0,0.7)'; s.fillRect(x + 4, y + 4, 74, 26); s.fillStyle = '#fff'; s.font = '18px Menlo'; s.fillText(t.toFixed(2), x + 9, y + 23);
    });
    const out = path.join(root, 'previews', opt('--out', 'sheet.png'));
    fs.writeFileSync(out, sheet.toBuffer('image/png')); console.log(out); return;
  }
  if (args.includes('--still')) {
    const out = path.join(root, 'previews', opt('--out', 'still.png'));
    fs.writeFileSync(out, render(Number(opt('--still'))).toBuffer('image/png')); console.log(out); return;
  }
  if (args.includes('--frames')) {
    const [a, b] = opt('--frames').split(',').map(Number);
    for (let f = a; f < b; f++) fs.writeFileSync(path.join(OUTDIR, `f${String(f).padStart(5, '0')}.jpg`), render(f / FPS).encodeSync('jpeg', 93));
    return;
  }
  if (!args.includes('--video') && !args.includes('--mux')) throw new Error('Choose --times, --still, --video or --mux');
  if (args.includes('--mux')) return mux();
  fs.mkdirSync(OUTDIR, { recursive: true });
  const jobs = []; for (let a = 0; a < FRAMES; a += 90) jobs.push([a, Math.min(FRAMES, a + 90)]);
  const N = Number(opt('--jobs', Math.max(2, os.cpus().length - 1))), start = Date.now(); let done = 0;
  console.log(`${FRAMES} frames, ${N} workers`);
  await Promise.all(Array.from({ length: N }, async () => {
    while (jobs.length) {
      const [a, b] = jobs.shift();
      await new Promise((res, rej) => spawn(process.execPath, [__filename, '--frames', `${a},${b}`], { stdio: 'inherit' }).on('exit', code => code ? rej(new Error(`worker ${a} failed`)) : res()));
      done += b - a; console.log(`frames ${done}/${FRAMES} (${Math.round((Date.now() - start) / 1000)} s)`);
    }
  }));
  await mux();
}

// The Suno master peaks above 0 dBFS, so it gets a small lift into a -1 dB limiter before AAC.
async function mux() {
  const out = path.join(root, 'youre-absolutely-right-landscape.mp4');
  await new Promise((res, rej) => spawn('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(OUTDIR, 'f%05d.jpg'),
    '-i', path.join(root, 'song.aifc'),
    '-vf', 'scale=in_range=pc:out_range=tv:in_color_matrix=bt601:out_color_matrix=bt709,format=yuv420p',
    '-af', `aresample=48000,volume=2dB,alimiter=limit=0.89:attack=4:release=60:level=false,afade=t=out:st=${(DUR - 1.4).toFixed(2)}:d=1.4`, '-ac', '2',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-profile:v', 'high', '-color_range', 'tv',
    '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709',
    '-c:a', 'aac', '-b:a', '320k', '-movflags', '+faststart', '-shortest', out], { stdio: 'inherit' })
    .on('exit', code => code ? rej(new Error(`ffmpeg ${code}`)) : res()));
  console.log(`video: ${out}`);
}
main().catch(e => { console.error(e); process.exitCode = 1; });
