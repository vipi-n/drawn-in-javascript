// Renders index.html in headless Chrome and writes the canvas to a PNG.
// Usage: node tools/render.mjs [--w=1638] [--seed=7] [--out=output/red-sprites.png]
import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v = 'true'] = a.replace(/^--/, '').split('=');
    return [k, v];
  })
);
const width = args.w ?? '1638';
const seed = args.seed ?? '7';
const out = path.resolve(root, args.out ?? 'output/red-sprites.png');
const chrome = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const url = `${pathToFileURL(path.join(root, 'index.html')).href}?export=1&w=${width}&seed=${seed}`;
const profile = mkdtempSync(path.join(os.tmpdir(), 'red-sprite-chrome-'));

const t0 = Date.now();
const proc = spawn(chrome, [
  '--headless=new',
  '--disable-gpu',
  '--no-first-run',
  '--no-default-browser-check',
  '--allow-file-access-from-files',
  `--user-data-dir=${profile}`,
  '--virtual-time-budget=240000',
  '--dump-dom',
  url,
]);

const chunks = [];
proc.stdout.on('data', (c) => chunks.push(c));
proc.stderr.on('data', () => {});
proc.on('close', (code) => {
  rmSync(profile, { recursive: true, force: true });
  const dom = Buffer.concat(chunks).toString('utf8');
  const m = dom.match(/data:image\/png;base64,([A-Za-z0-9+/=]+)/);
  if (!m) {
    console.error(`No PNG found in Chrome output (exit ${code}).`);
    process.exit(1);
  }
  mkdirSync(path.dirname(out), { recursive: true });
  writeFileSync(out, Buffer.from(m[1], 'base64'));
  const title = dom.match(/<title>([^<]*)<\/title>/)?.[1] ?? '';
  console.log(`Wrote ${path.relative(root, out)} (${title}; wall ${((Date.now() - t0) / 1000).toFixed(1)} s)`);
});
