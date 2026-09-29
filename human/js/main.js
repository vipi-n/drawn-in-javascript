(() => {
  const canvas = document.getElementById('film');
  setCtx(canvas.getContext('2d'));
  const $ = id => document.getElementById(id);
  const params = new URLSearchParams(location.search);

  let lastFrame = -1;
  function draw(t, force) {
    const f = Math.min(Math.floor(t * FPS), Math.floor(DURATION * FPS) - 1);
    if (f === lastFrame && !force) return;
    lastFrame = f;
    beginFrame(f);
    renderFilm(f / FPS);
  }

  // ---- test / preview hooks: ?t=12.5  ?sheet=start,end,step  ?bench=1 ----
  if (params.has('t') || params.has('sheet') || params.has('bench')) {
    document.body.classList.add('shot');
    const go = () => {
      if (params.has('t')) { draw(parseFloat(params.get('t')), true); return; }
      if (params.has('bench')) {
        const [a0, b0] = (params.get('bench').includes(',') ? params.get('bench').split(',').map(Number) : [0, DURATION]);
        const t0 = performance.now(), f0 = Math.floor(a0 * FPS), f1 = Math.floor(b0 * FPS), times = [];
        for (let f = f0; f < f1; f++) { const a = performance.now(); beginFrame(f); renderFilm(f / FPS); times.push([performance.now() - a, f / FPS]); }
        const top = times.slice().sort((x, y) => y[0] - x[0]).slice(0, 6).map(([d, tt]) => `${d.toFixed(0)}ms@${tt.toFixed(2)}`).join(' ');
        document.body.setAttribute('data-bench', `avg ${((performance.now() - t0) / times.length).toFixed(1)}ms worst ${top}`);
        return;
      }
      const [a, b, st] = params.get('sheet').split(',').map(Number);
      const times = []; for (let t = a; t < b - 1e-6; t += st) times.push(t);
      const cols = parseInt(params.get('cols') || '6'), cell = 360, rows = Math.ceil(times.length / cols);
      const sheet = document.createElement('canvas'); sheet.width = cols * cell; sheet.height = rows * cell;
      const sx = sheet.getContext('2d'); sx.fillStyle = '#fff'; sx.fillRect(0, 0, sheet.width, sheet.height);
      times.forEach((t, i) => {
        draw(t, true);
        sx.drawImage(canvas, (i % cols) * cell, Math.floor(i / cols) * cell, cell - 4, cell - 4);
        sx.fillStyle = '#d00'; sx.font = '22px sans-serif'; sx.fillText(t.toFixed(2), (i % cols) * cell + 6, Math.floor(i / cols) * cell + 24);
      });
      document.body.innerHTML = ''; document.body.style.padding = 0; document.body.appendChild(sheet);
    };
    (document.fonts ? document.fonts.load(`44px "Patrick Hand"`).catch(() => {}) : Promise.resolve()).then(go, go);
    return;
  }

  // ---- player ----
  let t = 0, playing = false, loop = true, muted = false, recording = null;
  let ac = null, buffer = null, src = null, gain = null, startAt = 0, track = null;

  draw(0, true);
  if (document.fonts) document.fonts.load(`44px "Patrick Hand"`).then(() => draw(t, true)).catch(() => {});

  Music.build(p => { $('status').textContent = `composing the music… ${Math.round(p * 100)}%`; }).then(m => {
    track = m;
    $('status').textContent = 'play with sound';
    $('play').disabled = false; $('rec').disabled = false;
  });

  function ensureAudio() {
    if (ac) return;
    ac = new (window.AudioContext || window.webkitAudioContext)();
    buffer = ac.createBuffer(2, track.L.length, track.SR);
    buffer.copyToChannel(track.L, 0); buffer.copyToChannel(track.R, 1);
    gain = ac.createGain(); gain.gain.value = muted ? 0 : 1; gain.connect(ac.destination);
  }
  function startSource(at) {
    if (src) { try { src.onended = null; src.stop(); } catch (e) { } src.disconnect(); }
    src = ac.createBufferSource(); src.buffer = buffer; src.connect(gain);
    src.start(0, Math.max(0, at)); startAt = ac.currentTime - at;
  }
  function play() {
    if (!track) return;
    ensureAudio(); ac.resume();
    if (t >= DURATION - .05) t = 0;
    startSource(t); playing = true;
    $('overlay').classList.add('hidden'); $('play').textContent = 'pause';
  }
  function pause() {
    if (!playing) return;
    t = ac.currentTime - startAt; playing = false;
    if (src) { src.onended = null; src.stop(); src = null; }
    $('play').textContent = 'play';
  }
  function seek(v) { t = clamp(v, 0, DURATION); if (playing) startSource(t); draw(t, true); ui(); }

  function ui() {
    $('scrub').value = t;
    $('time').textContent = `${t.toFixed(1)} / ${DURATION}`;
  }
  function frame() {
    if (playing) {
      t = ac.currentTime - startAt;
      if (t >= DURATION) {
        if (recording) { finishRecording(); t = DURATION - .01; pause(); }
        else if (loop) { t = 0; startSource(0); }
        else { t = DURATION - .01; pause(); }
      }
    }
    draw(t); ui();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // ---- recording ----
  function pickType() {
    const types = ['video/mp4;codecs=avc1.640028,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
    return types.find(x => window.MediaRecorder && MediaRecorder.isTypeSupported(x)) || '';
  }
  function startRecording() {
    if (!track || recording) return;
    ensureAudio(); ac.resume();
    const dest = ac.createMediaStreamDestination(); gain.connect(dest);
    const stream = new MediaStream([...canvas.captureStream(FPS).getVideoTracks(), ...dest.stream.getAudioTracks()]);
    const type = pickType();
    const rec = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: 14e6, audioBitsPerSecond: 192e3 });
    const chunks = [];
    rec.ondataavailable = e => e.data.size && chunks.push(e.data);
    rec.onstop = () => {
      gain.disconnect(dest);
      const blob = new Blob(chunks, { type: type || 'video/webm' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
      a.download = `still-curious.${type.includes('mp4') ? 'mp4' : 'webm'}`; a.click();
      $('rec').textContent = 'save video'; $('rec').classList.remove('rec');
      recording = null;
    };
    recording = rec;
    $('rec').textContent = 'recording…'; $('rec').classList.add('rec');
    t = 0; lastFrame = -1; draw(0, true);
    rec.start(250); play();
  }
  function finishRecording() { if (recording && recording.state !== 'inactive') setTimeout(() => recording.stop(), 150); }

  // ---- controls ----
  $('overlay').onclick = () => track && play();
  $('play').onclick = () => (playing ? pause() : play());
  $('scrub').oninput = e => seek(parseFloat(e.target.value));
  $('loop').onclick = () => { loop = !loop; $('loop').textContent = `loop: ${loop ? 'on' : 'off'}`; };
  $('mute').onclick = () => { muted = !muted; if (gain) gain.gain.value = muted ? 0 : 1; $('mute').textContent = `sound: ${muted ? 'off' : 'on'}`; };
  $('rec').onclick = () => (recording ? null : startRecording());
  addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT' && e.key !== ' ') return;
    if (e.key === ' ') { e.preventDefault(); playing ? pause() : play(); }
    else if (e.key === 'ArrowRight') { if (playing) pause(); seek(t + 1 / FPS); }
    else if (e.key === 'ArrowLeft') { if (playing) pause(); seek(t - 1 / FPS); }
    else if (e.key.toLowerCase() === 'r') seek(0);
    else if (e.key.toLowerCase() === 'm') $('mute').click();
    else if (e.key.toLowerCase() === 'l') $('loop').click();
  });
})();
