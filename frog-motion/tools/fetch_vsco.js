// Fetch the CC0 VSCO-2-CE orchestral samples used by the score (https://github.com/sgossner/VSCO-2-CE, CC0 1.0).
//   node frog-motion/tools/fetch_vsco.js [--list]
const fs = require('fs'), path = require('path'), https = require('https');
const { execSync } = require('child_process');
const OUT = path.join(__dirname, '..', 'assets', 'vsco');
const TREE = path.join(OUT, 'tree.json');

// [folder, filter(name) -> keep?]
const PICK = [
  ['Strings/Violin Section/susVib', () => true],
  ['Strings/Viola Section/susvib', (n) => /_v1_/.test(n)],
  ['Strings/Cello Section/susvib', (n) => /_v1_1\.wav$/.test(n)],
  ['Strings/Solo Contrabass/SusNV', (n) => /_v1_/.test(n)],
  ['Strings/Violin Section/Trem', (n) => /_v1/.test(n)],
  ['Strings/Cello Section/trem', (n) => /_v1_/.test(n)],
  ['Strings/Violin Section/Pizz', () => true],
  ['Strings/Viola Section/pizz', (n) => /rr1/i.test(n)],
  ['Strings/Cello Section/pizzT', (n) => /RR1/.test(n)],
  ['Strings/Solo Contrabass/Pizz', (n) => /rr1/.test(n)],
  ['Strings/Violin Section/Spic', () => true],
  ['Strings/Viola Section/spic', (n) => /rr1/i.test(n)],
  ['Strings/Cello Section/spic', (n) => /rr1/i.test(n)],
  ['Strings/Harp', () => true],
  ['Woodwinds/Flute/susvib', () => true],
  ['Woodwinds/Flute/stac', () => true],
  ['Woodwinds/Clarinet/susLong', (n) => /_v2_/.test(n)],
  ['Woodwinds/Clarinet/stac', () => true],
  ['Woodwinds/Oboe/Vib', (n) => /_v1_/.test(n)],
  ['Woodwinds/Bassoon/stac', () => true],
  ['Woodwinds/Bassoon/sus', (n) => /_v1_/.test(n)],
  ['Brass/F Horn/sus', (n) => /_v[12]_/.test(n)],
  ['Brass/F Horn/mute', () => true],
  ['Percussion/Glock', () => true],
  ['Percussion/Marimba', () => true],
  ['Percussion/Xylo', () => true],
  ['Percussion/Timpani', () => true],
  ['Percussion/Timpani/Rolls', () => true],
  ['Percussion', (n) => /^(Guiro|LogDrum|Conga-HitN|Tumba-HitN|Quinto-HitN|Claves|Tamb1-Hit|Tamb1-Shake|Triangle3-Hit_|Sleighbells|BellTree)/.test(n)
    || /^(BDrumNewhit_v[357]_rr1|cymbal-crash1_(mf|ff)_rr1|susCymb1-cresc|susCymb1-hit_(mp|f)_rr1|gongHit_(mf|f)\.|bassdrum_rub[12])/.test(n)],
  ["VSCO 1 Percussion/varWood/Camo's Shaker", () => true],
  ['Keys/Upright Piano', (n) => /^Player_dyn1_rr1_0(0[8-9]|[1-4]\d)\.wav$/.test(n) && +n.match(/_(\d+)\.wav/)[1] % 2 === 0],
];

function get(url, file) {
  return new Promise((res, rej) => {
    https.get(url, { headers: { 'User-Agent': 'frog-film' } }, (r) => {
      if (r.statusCode >= 300 && r.statusCode < 400 && r.headers.location) return get(r.headers.location, file).then(res, rej);
      if (r.statusCode !== 200) return rej(new Error(r.statusCode + ' ' + url));
      const tmp = file + '.part', w = fs.createWriteStream(tmp);
      r.pipe(w); w.on('finish', () => { fs.renameSync(tmp, file); res(); }); w.on('error', rej);
    }).on('error', rej);
  });
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  if (!fs.existsSync(TREE)) execSync(`curl -sL -H "User-Agent: frog-film" "https://api.github.com/repos/sgossner/VSCO-2-CE/git/trees/master?recursive=1" -o "${TREE}"`);
  const files = JSON.parse(fs.readFileSync(TREE, 'utf8')).tree.filter((x) => x.type === 'blob' && /\.wav$/i.test(x.path));
  const want = [];
  for (const [dir, keep] of PICK) for (const f of files) {
    const parts = f.path.split('/'), name = parts.pop();
    if (parts.join('/') === dir && keep(name)) want.push(f);
  }
  const total = want.reduce((a, f) => a + f.size, 0);
  console.log(`${want.length} files, ${(total / 1e6).toFixed(0)} MB`);
  if (process.argv.includes('--list')) return;
  let next = 0, done = 0;
  const worker = async () => {
    while (next < want.length) {
      const f = want[next++], file = path.join(OUT, f.path);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      if (fs.existsSync(file) && fs.statSync(file).size === f.size) { done++; continue; }
      const url = 'https://raw.githubusercontent.com/sgossner/VSCO-2-CE/master/' + f.path.split('/').map(encodeURIComponent).join('/');
      for (let k = 0; k < 4; k++) { try { await get(url, file); break; } catch (e) { if (k === 3) console.error('FAILED', f.path, e.message); } }
      if (++done % 40 === 0) console.log(`${done}/${want.length}`);
    }
  };
  await Promise.all(Array.from({ length: 8 }, worker));
  console.log('done', done);
})();
