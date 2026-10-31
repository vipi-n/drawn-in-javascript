// Print a per-second loudness profile of each recording, to pick usable segments.  node tools/levels.js
const fs = require('fs'), path = require('path');
const { decode } = require('./calls');
const dir = path.join(__dirname, '..', 'assets', 'sfx');
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.mp3'))) {
  const x = decode(path.join(dir, f)), SR = 48000, secs = Math.floor(x.length / SR), out = [];
  for (let s = 0; s < Math.min(secs, 120); s++) { let e = 0; for (let i = s * SR; i < (s + 1) * SR; i++) e += x[i] * x[i]; out.push(Math.round(10 * Math.log10(e / SR + 1e-12))); }
  let pk = 0; for (const v of x) pk = Math.max(pk, Math.abs(v));
  console.log(f, (x.length / SR).toFixed(1) + 's peak', pk.toFixed(2));
  console.log('  ' + out.join(' '));
}
