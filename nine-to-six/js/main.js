(() => {
  const $ = id => document.getElementById(id), q = new URLSearchParams(location.search);
  const canvas = $('film');
  let last = -1, t = 0, playing = false, loop = false, muted = false, recording = null;
  let audio = null, buffer = null, gain = null, source = null, startAt = 0, track = null;
  function draw(at, force = false) { const f = clamp(Math.floor(at * FPS), 0, Math.floor(DURATION * FPS) - 1); if (f === last && !force) return; last = f; renderFilm(f / FPS); }
  window.renderAt = at => draw(at, true); // deterministic frame hook for previews
  if (q.has('t') || q.has('sheet')) {
    document.body.classList.add('shot');
    if (q.has('t')) draw(Number(q.get('t')), true);
    else {
      const [a, b, step] = q.get('sheet').split(',').map(Number), times = [];
      for (let tt = a; tt < b - .0001; tt += step) times.push(tt);
      const cols = Number(q.get('cols') || 5), cell = 320, rows = Math.ceil(times.length / cols), sheet = document.createElement('canvas');
      sheet.width = cols * cell; sheet.height = rows * cell; const s = sheet.getContext('2d');
      for (let i = 0; i < times.length; i++) {
        draw(times[i], true); const x = i % cols * cell, y = Math.floor(i / cols) * cell;
        s.drawImage(canvas, x, y, cell, cell); s.fillStyle = '#3a2f28'; s.fillRect(x + 7, y + 7, 61, 26);
        s.fillStyle = '#fff'; s.font = '18px system-ui'; s.fillText(times[i].toFixed(1), x + 13, y + 27);
      }
      document.body.innerHTML = ''; document.body.appendChild(sheet);
    }
    return;
  }
  draw(0, true);
  Music.build(p => { $('status').textContent = `Composing an original score… ${Math.round(p * 100)}%`; }).then(m => {
    track = m; $('status').textContent = 'Play Nine to Six'; $('play').disabled = false; $('rec').disabled = false;
  }).catch(e => { $('status').textContent = 'Audio could not be prepared'; console.error(e); });
  function ensureAudio() {
    if (audio) return;
    audio = new (window.AudioContext || window.webkitAudioContext)();
    buffer = audio.createBuffer(2, track.L.length, track.SR);
    buffer.copyToChannel(track.L, 0); buffer.copyToChannel(track.R, 1);
    gain = audio.createGain(); gain.gain.value = muted ? 0 : 1; gain.connect(audio.destination);
  }
  function startSource(at) {
    if (source) { try { source.stop(); } catch { } source.disconnect(); }
    source = audio.createBufferSource(); source.buffer = buffer; source.connect(gain);
    source.start(0, Math.max(0, Math.min(at, DURATION - .01))); startAt = audio.currentTime - at;
  }
  function play() { if (!track) return; ensureAudio(); audio.resume(); if (t >= DURATION - .05) t = 0; startSource(t); playing = true; $('overlay').classList.add('hidden'); $('play').textContent = 'pause'; }
  function pause() { if (!playing) return; t = clamp(audio.currentTime - startAt, 0, DURATION); playing = false; if (source) { try { source.stop(); } catch { } source = null; } $('play').textContent = 'play'; }
  function seek(v) { t = clamp(v, 0, DURATION); if (playing) startSource(t); draw(t, true); ui(); }
  function ui() { $('scrub').value = t; $('time').textContent = `${t.toFixed(1)} / ${DURATION}`; }
  function frame() {
    if (playing) {
      t = audio.currentTime - startAt;
      if (t >= DURATION) {
        if (recording) { stopRecording(); t = DURATION - .01; pause(); }
        else if (loop) { t = 0; startSource(0); } else { t = DURATION - .01; pause(); }
      }
    }
    draw(t); ui(); requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  function pickType() { return ['video/mp4;codecs=avc1.640028,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'].find(x => MediaRecorder.isTypeSupported(x)) || ''; }
  function startRecording() {
    if (recording || !track) return;
    ensureAudio(); audio.resume();
    const dest = audio.createMediaStreamDestination(); gain.connect(dest);
    const stream = new MediaStream([...canvas.captureStream(FPS).getVideoTracks(), ...dest.stream.getAudioTracks()]);
    const type = pickType(), rec = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: 12000000, audioBitsPerSecond: 192000 });
    const chunks = []; rec.ondataavailable = e => e.data.size && chunks.push(e.data);
    rec.onstop = () => {
      gain.disconnect(dest); stream.getTracks().forEach(tr => tr.stop());
      const blob = new Blob(chunks, { type: type || 'video/webm' }), url = URL.createObjectURL(blob), a = document.createElement('a');
      a.href = url; a.download = `nine-to-six.${type.includes('mp4') ? 'mp4' : 'webm'}`; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 30000); recording = null; $('rec').textContent = 'save video'; $('rec').classList.remove('active');
    };
    recording = rec; $('rec').textContent = 'recording…'; $('rec').classList.add('active');
    t = 0; last = -1; draw(0, true); rec.start(250); play();
  }
  function stopRecording() { if (recording && recording.state !== 'inactive') setTimeout(() => recording.stop(), 150); }
  $('overlay').onclick = play;
  $('overlay').onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); play(); } };
  $('play').onclick = () => playing ? pause() : play();
  $('scrub').oninput = e => seek(Number(e.target.value));
  $('loop').onclick = () => { loop = !loop; $('loop').textContent = `loop: ${loop ? 'on' : 'off'}`; };
  $('mute').onclick = () => { muted = !muted; if (gain) gain.gain.value = muted ? 0 : 1; $('mute').textContent = `sound: ${muted ? 'off' : 'on'}`; };
  $('rec').onclick = startRecording;
  addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT' && e.key !== ' ') return;
    if (e.key === ' ') { e.preventDefault(); playing ? pause() : play(); }
    else if (e.key === 'ArrowRight') { if (playing) pause(); seek(t + 1 / FPS); }
    else if (e.key === 'ArrowLeft') { if (playing) pause(); seek(t - 1 / FPS); }
    else if (e.key.toLowerCase() === 'm') $('mute').click();
  });
})();
