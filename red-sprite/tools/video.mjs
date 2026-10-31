// Renders the slow-motion ignition clip: drives index.html?anim in headless Chrome over the
// DevTools protocol and pipes every frame straight into ffmpeg.
// Usage: node tools/video.mjs [--w=1080] [--fps=30] [--duration=9] [--seed=7] [--out=output/red-sprites-live.mp4]
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v = 'true'] = a.replace(/^--/, '').split('=');
    return [k, v];
  })
);
const opts = {
  width: Number(args.w ?? 1080),
  fps: Number(args.fps ?? 30),
  duration: Number(args.duration ?? 9),
  seed: Number(args.seed ?? 7),
};
const out = path.resolve(root, args.out ?? 'output/red-sprites-live.mp4');
const chromePath = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const port = 19000 + Math.floor(Math.random() * 20000);
const profile = mkdtempSync(path.join(os.tmpdir(), 'red-sprite-video-'));
const url = `${pathToFileURL(path.join(root, 'index.html')).href}?anim=1`;

const chrome = spawn(
  chromePath,
  [
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--allow-file-access-from-files',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profile}`,
    url,
  ],
  { stdio: 'ignore' }
);

async function pageSocketUrl() {
  for (let k = 0; k < 150; k++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      const page = list.find((p) => p.type === 'page' && p.url.includes('index.html'));
      if (page) return page.webSocketDebuggerUrl;
    } catch {
      // Chrome is still starting.
    }
    await sleep(100);
  }
  throw new Error('Chrome did not expose a debugging endpoint');
}

async function main() {
  const ws = new WebSocket(await pageSocketUrl());
  await once(ws, 'open');
  let nextId = 0;
  const pending = new Map();
  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data);
    const resolve = pending.get(msg.id);
    if (resolve) {
      pending.delete(msg.id);
      resolve(msg);
    }
  });
  const send = (method, params = {}) =>
    new Promise((resolve) => {
      const id = ++nextId;
      pending.set(id, resolve);
      ws.send(JSON.stringify({ id, method, params }));
    });
  const evaluate = async (expression) => {
    const msg = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (msg.error) throw new Error(msg.error.message);
    if (msg.result.exceptionDetails) {
      throw new Error(msg.result.exceptionDetails.exception?.description ?? msg.result.exceptionDetails.text);
    }
    return msg.result.result.value;
  };

  for (let k = 0; !(await evaluate('typeof window.Anim === "object"')); k++) {
    if (k > 100) throw new Error('Animation page did not load');
    await sleep(100);
  }
  const info = await evaluate(`Anim.init(${JSON.stringify(opts)})`);
  console.log(`Rendering ${info.frames} frames at ${info.width}×${info.height}, ${info.fps} fps`);

  mkdirSync(path.dirname(out), { recursive: true });
  const ff = spawn(
    'ffmpeg',
    [
      '-y', '-loglevel', 'error',
      '-f', 'image2pipe', '-framerate', String(info.fps), '-c:v', 'mjpeg', '-i', '-',
      '-vf', 'scale=in_range=pc:out_range=tv:in_color_matrix=bt601:out_color_matrix=bt709,format=yuv420p',
      '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-movflags', '+faststart',
      out,
    ],
    { stdio: ['pipe', 'inherit', 'inherit'] }
  );
  let ffDone = false;
  const closed = new Promise((resolve) => ff.on('close', (code) => resolve(code)));
  closed.then(() => (ffDone = true));
  ff.stdin.on('error', () => {});
  const drained = () => new Promise((resolve) => {
    const done = () => {
      ff.stdin.off('drain', done);
      resolve();
    };
    ff.stdin.on('drain', done);
    closed.then(done);
  });

  const t0 = Date.now();
  for (let i = 0; i < info.frames; i++) {
    if (ffDone) throw new Error('ffmpeg stopped early');
    const data = await evaluate(`Anim.frame(${i})`);
    const buf = Buffer.from(data.slice(data.indexOf(',') + 1), 'base64');
    if (!ff.stdin.write(buf)) await drained();
    if (i % 10 === 0 || i === info.frames - 1) {
      process.stdout.write(`\r  frame ${i + 1}/${info.frames}  ${((Date.now() - t0) / 1000).toFixed(0)} s`);
    }
  }
  ff.stdin.end();
  const code = await closed;
  ws.close();
  if (code !== 0) throw new Error(`ffmpeg exited with ${code}`);
  console.log(`\nWrote ${path.relative(root, out)}`);
}

try {
  await main();
} catch (err) {
  console.error(`\n${err.message}`);
  process.exitCode = 1;
} finally {
  chrome.kill();
  await sleep(200);
  rmSync(profile, { recursive: true, force: true });
}
