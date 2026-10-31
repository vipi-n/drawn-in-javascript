// Split .ttc collections into single-face buffers and list their names: node frog/tools/faces.js file.ttc ...
const fs = require('fs');
function faces(file) {
  const b = fs.readFileSync(file);
  if (b.toString('latin1', 0, 4) !== 'ttcf') return [b];
  const n = b.readUInt32BE(8), out = [];
  for (let k = 0; k < n; k++) {
    const off = b.readUInt32BE(12 + 4 * k), nt = b.readUInt16BE(off + 4), tabs = [];
    for (let i = 0; i < nt; i++) {
      const p = off + 12 + 16 * i;
      tabs.push({ tag: b.slice(p, p + 4), sum: b.readUInt32BE(p + 4), o: b.readUInt32BE(p + 8), l: b.readUInt32BE(p + 12) });
    }
    let size = 12 + 16 * nt;
    for (const t of tabs) size += (t.l + 3) & ~3;
    const o = Buffer.alloc(size);
    b.copy(o, 0, off, off + 12);
    let pos = 12 + 16 * nt;
    tabs.forEach((t, i) => {
      const p = 12 + 16 * i;
      t.tag.copy(o, p); o.writeUInt32BE(t.sum, p + 4); o.writeUInt32BE(pos, p + 8); o.writeUInt32BE(t.l, p + 12);
      b.copy(o, pos, t.o, t.o + t.l); pos += (t.l + 3) & ~3;
    });
    out.push(o);
  }
  return out;
}
function fullName(buf) {
  const nt = buf.readUInt16BE(4);
  for (let i = 0; i < nt; i++) {
    const p = 12 + 16 * i;
    if (buf.toString('latin1', p, p + 4) !== 'name') continue;
    const o = buf.readUInt32BE(p + 8), cnt = buf.readUInt16BE(o + 2), so = o + buf.readUInt16BE(o + 4);
    for (let r = 0; r < cnt; r++) {
      const q = o + 6 + 12 * r, pid = buf.readUInt16BE(q), id = buf.readUInt16BE(q + 6), len = buf.readUInt16BE(q + 8), off = buf.readUInt16BE(q + 10);
      if (id !== 4) continue;
      const s = buf.slice(so + off, so + off + len);
      if (pid === 3 || pid === 0) { let t = ''; for (let k = 0; k + 1 < s.length; k += 2) t += String.fromCharCode(s.readUInt16BE(k)); return t; }
      return s.toString('latin1');
    }
  }
  return '?';
}
module.exports = { faces };
if (require.main === module) for (const f of process.argv.slice(2)) faces(f).forEach((b, i) => console.log(f.split('/').pop(), i, fullName(b)));
