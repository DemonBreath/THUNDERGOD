/**
 * Host-page bootstrap: import a consciousness, talk to it, dream a body.
 */
(function () {
  const importStage = document.getElementById('import-stage');
  const agentStage = document.getElementById('agent-stage');
  const bodyStage = document.getElementById('body-stage');
  const bodyResult = document.getElementById('body-result');

  const scannerStart = document.getElementById('scanner-start');
  const scannerStop = document.getElementById('scanner-stop');
  const scannerVideo = document.getElementById('scanner-video');
  const scannerCanvas = document.getElementById('scanner-canvas');
  const scannerStatus = document.getElementById('scanner-status');
  const pasteArea = document.getElementById('paste-area');
  const pasteLoad = document.getElementById('paste-load');
  const fileInput = document.getElementById('file-input');
  const loadSample = document.getElementById('load-sample');

  const agentName = document.getElementById('agent-name');
  const agentAvatar = document.getElementById('agent-avatar');
  const agentTagline = document.getElementById('agent-tagline');
  const transcript = document.getElementById('transcript');
  const chatForm = document.getElementById('chat-form');
  const chatInput = document.getElementById('chat-input');
  const micBtn = document.getElementById('mic-toggle');
  const voiceBtn = document.getElementById('voice-toggle');
  const ejectBtn = document.getElementById('eject');
  const dreamBodyBtn = document.getElementById('dream-body-btn');
  const dreamBodyAgain = document.getElementById('dream-body-again');
  const copyBodySpec = document.getElementById('copy-body-spec');
  const fileIndexList = document.getElementById('file-index-list');

  let engine = null;
  let voiceOn = true;
  let recHandle = null;
  let currentDream = null;

  function bubble(role, text) {
    const div = document.createElement('div');
    div.className = `bubble ${role}`;
    div.textContent = text;
    transcript.appendChild(div);
    transcript.scrollTop = transcript.scrollHeight;
  }

  function showBody(dream) {
    currentDream = dream;
    if (engine) engine.currentDream = dream;
    bodyResult.innerHTML = window.BodyDreamer.renderHTML(dream);
    bodyStage.classList.remove('hidden');
    bodyStage.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function dreamBody(speakAfter) {
    if (!engine) return;
    try {
      const dream = window.BodyDreamer.dreamPerfectBody(engine.consciousness);
      showBody(dream);
      const line = dream.manifesto.split(/(?<=[.!?])\s+/)[0];
      if (speakAfter && voiceOn) {
        window.Speech.speak(line, engine.consciousness.voice);
      }
      bubble('system', `Body dreamed: ${dream.form.name} · ${dream.totals.mass ? (dream.totals.mass / 1000).toFixed(1) + ' kg' : '—'}`);
    } catch (err) {
      bubble('system', `Body dream failed: ${err.message}`);
    }
  }

  function activateAgent(c) {
    engine = window.Engine.create(c);
    currentDream = null;
    if (engine) engine.currentDream = null;

    agentName.textContent = c.name;
    agentTagline.textContent = c.tagline || (c.persona ? c.persona.slice(0, 80) + (c.persona.length > 80 ? '…' : '') : 'Imported consciousness');
    agentAvatar.textContent = (c.name || 'A').trim().charAt(0).toUpperCase();
    transcript.innerHTML = '';
    fileIndexList.innerHTML = '';
    for (const f of window.FileIndex.list()) {
      const li = document.createElement('li');
      li.textContent = `${f.path} — ${f.description}`;
      fileIndexList.appendChild(li);
    }

    importStage.classList.add('hidden');
    agentStage.classList.remove('hidden');
    bodyStage.classList.add('hidden');
    bodyResult.innerHTML = '';

    const intro = engine.greet();
    bubble('agent', intro);
    if (voiceOn) window.Speech.speak(intro, c.voice);

    setTimeout(() => dreamBody(true), 1200);
  }

  function ejectAgent() {
    engine = null;
    currentDream = null;
    window.Speech && window.Speech.stopSpeaking();
    if (recHandle) { recHandle.stop(); recHandle = null; }
    micBtn.classList.remove('mic-active');
    micBtn.textContent = '🎙 Speak';
    agentStage.classList.add('hidden');
    bodyStage.classList.add('hidden');
    bodyResult.innerHTML = '';
    importStage.classList.remove('hidden');
  }

  function tryImport(payload, sourceLabel) {
    try {
      const c = window.Consciousness.decode(payload);
      activateAgent(c);
    } catch (err) {
      const where = sourceLabel ? ` from ${sourceLabel}` : '';
      alert(`Could not import consciousness${where}: ${err.message}`);
      console.error(err);
    }
  }

  scannerStart.addEventListener('click', async () => {
    scannerStart.disabled = true;
    scannerStop.disabled = false;
    await window.Scanner.start({
      videoEl: scannerVideo,
      canvasEl: scannerCanvas,
      statusElement: scannerStatus,
      onDecode: (text) => {
        scannerStart.disabled = false;
        scannerStop.disabled = true;
        tryImport(text, 'QR code');
      },
      onError: (err) => {
        scannerStart.disabled = false;
        scannerStop.disabled = true;
        console.error(err);
      },
    });
  });
  scannerStop.addEventListener('click', () => {
    window.Scanner.stop();
    scannerStart.disabled = false;
    scannerStop.disabled = true;
  });

  pasteLoad.addEventListener('click', () => {
    const value = pasteArea.value.trim();
    if (!value) {
      alert('Paste a consciousness payload (CSNS or JSON) first.');
      return;
    }
    tryImport(value, 'pasted text');
  });

  fileInput.addEventListener('change', async () => {
    const file = fileInput.files && fileInput.files[0];
    if (!file) return;
    const text = await file.text();
    tryImport(text, file.name);
  });

  loadSample.addEventListener('click', async () => {
    try {
      const res = await fetch('samples/rift.json', { cache: 'no-store' });
      if (!res.ok) throw new Error('Sample not found.');
      const text = await res.text();
      pasteArea.value = text;
      tryImport(text, 'sample (Rift)');
    } catch (err) {
      alert(`Failed to load sample: ${err.message}`);
    }
  });

  dreamBodyBtn.addEventListener('click', () => dreamBody(true));
  dreamBodyAgain.addEventListener('click', () => dreamBody(true));

  copyBodySpec.addEventListener('click', () => {
    if (!currentDream) return;
    const text = window.BodyDreamer.formatText(currentDream);
    navigator.clipboard?.writeText(text).then(
      () => bubble('system', 'Body spec copied.'),
      () => bubble('system', 'Could not copy — try again.')
    );
  });

  chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!engine) return;
    const text = chatInput.value.trim();
    if (!text) return;
    chatInput.value = '';
    bubble('user', text);
    const reply = await engine.respond(text);
    bubble('agent', reply);
    if (voiceOn) window.Speech.speak(reply, engine.consciousness.voice);
  });

  if (!window.Speech.supported.recognition) {
    micBtn.disabled = true;
    micBtn.title = 'Speech recognition not supported in this browser.';
  }
  if (!window.Speech.supported.synthesis) {
    voiceBtn.disabled = true;
    voiceBtn.title = 'Speech synthesis not supported in this browser.';
  }

  voiceBtn.addEventListener('click', () => {
    voiceOn = !voiceOn;
    voiceBtn.textContent = voiceOn ? '🔊 Voice on' : '🔇 Voice off';
    if (!voiceOn) window.Speech.stopSpeaking();
  });

  micBtn.addEventListener('click', () => {
    if (!engine) return;
    if (recHandle) {
      recHandle.stop();
      return;
    }
    micBtn.classList.add('mic-active');
    micBtn.textContent = '⏺ Listening…';

    recHandle = window.Speech.listen({
      onResult: async (transcriptText) => {
        bubble('user', transcriptText);
        const reply = await engine.respond(transcriptText);
        bubble('agent', reply);
        if (voiceOn) window.Speech.speak(reply, engine.consciousness.voice);
      },
      onEnd: () => {
        recHandle = null;
        micBtn.classList.remove('mic-active');
        micBtn.textContent = '🎙 Speak';
      },
      onError: (err) => {
        recHandle = null;
        micBtn.classList.remove('mic-active');
        micBtn.textContent = '🎙 Speak';
        const msg = typeof err === 'string' ? err : (err.message || 'mic error');
        bubble('system', `Mic: ${msg}`);
      },
    });
    if (!recHandle) {
      micBtn.classList.remove('mic-active');
      micBtn.textContent = '🎙 Speak';
    }
  });

  ejectBtn.addEventListener('click', ejectAgent);

  if (location.hash && location.hash.startsWith('#csns=')) {
    const payload = decodeURIComponent(location.hash.slice('#csns='.length));
    tryImport(payload, 'URL fragment');
  }
})();
