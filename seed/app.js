/**
 * SEED UI — forge blank QR, wake mind, teach, export.
 */
(() => {
  'use strict';

  const forgeStage = document.getElementById('forge-stage');
  const wakeStage = document.getElementById('wake-stage');
  const teachStage = document.getElementById('teach-stage');

  const forgeQr = document.getElementById('forge-qr');
  const forgeMeta = document.getElementById('forge-meta');
  const forgeBtn = document.getElementById('forge-btn');
  const copyPayload = document.getElementById('copy-payload');
  const downloadJson = document.getElementById('download-json');

  const pasteArea = document.getElementById('paste-area');
  const pasteLoad = document.getElementById('paste-load');
  const fileInput = document.getElementById('file-input');
  const scannerVideo = document.getElementById('scanner-video');
  const scannerCanvas = document.getElementById('scanner-canvas');
  const scannerStart = document.getElementById('scanner-start');
  const scannerStop = document.getElementById('scanner-stop');
  const scannerStatus = document.getElementById('scanner-status');

  const mindName = document.getElementById('mind-name');
  const mindTag = document.getElementById('mind-tag');
  const mindAvatar = document.getElementById('mind-avatar');
  const transcript = document.getElementById('transcript');
  const chatForm = document.getElementById('chat-form');
  const chatInput = document.getElementById('chat-input');
  const exportQr = document.getElementById('export-qr');
  const exportMeta = document.getElementById('export-meta');
  const exportBtn = document.getElementById('export-btn');
  const ejectBtn = document.getElementById('eject-btn');
  const filingList = document.getElementById('filing-list');
  const filingCount = document.getElementById('filing-count');

  let session = null;
  let lastPayload = '';
  let scanLoop = null;
  let stream = null;

  function bubble(role, text) {
    const el = document.createElement('div');
    el.className = `bubble ${role}`;
    el.textContent = text;
    transcript.appendChild(el);
    transcript.scrollTop = transcript.scrollHeight;
  }

  function renderFiling() {
    if (!session) return;
    const learned = Seed.loadLearned(session.base);
    const merged = session.mind.knowledge;
    filingList.innerHTML = '';
    filingCount.textContent = `${merged.length} filed · ${learned.length} taught here`;

    if (!merged.length) {
      const li = document.createElement('li');
      li.textContent = 'Empty. Teach me your first fact.';
      filingList.appendChild(li);
      return;
    }

    for (const k of merged) {
      const li = document.createElement('li');
      const taught = learned.some((e) => e.topic.toLowerCase() === k.topic.toLowerCase());
      li.innerHTML = `<strong>${k.topic}</strong>${taught ? ' · taught' : ''}<br>${k.content}`;
      filingList.appendChild(li);
    }
  }

  async function showPayload(canvas, metaEl, mind) {
    const payload = Seed.encode(mind);
    lastPayload = payload;
    canvas.parentElement.classList.remove('hidden');
    await Seed.renderQR(canvas, payload);
    metaEl.textContent = `${payload.length} chars · ${mind.knowledge.length} knowledge entries · scan to wake`;
    return payload;
  }

  async function forgeBlank() {
    const mind = Seed.normalize({ ...Seed.BLANK });
    const nameInput = document.getElementById('seed-name');
    if (nameInput && nameInput.value.trim()) {
      mind.name = nameInput.value.trim().slice(0, 60);
    }
    await showPayload(forgeQr, forgeMeta, mind);
    pasteArea.value = Seed.encode(mind);
  }

  function wake(mind) {
    session = Seed.createMind(mind);
    mindName.textContent = session.mind.name;
    mindTag.textContent = session.mind.tagline;
    mindAvatar.textContent = (session.mind.name || 'S').charAt(0).toUpperCase();

    forgeStage.classList.add('hidden');
    wakeStage.classList.add('hidden');
    teachStage.classList.remove('hidden');

    transcript.innerHTML = '';
    const hello = session.reply('hello');
    bubble('mind', hello);
    renderFiling();
    teachStage.scrollIntoView({ behavior: 'smooth' });
  }

  function eject() {
    session = null;
    stopScanner();
    teachStage.classList.add('hidden');
    forgeStage.classList.remove('hidden');
    wakeStage.classList.remove('hidden');
    exportQr.parentElement.classList.add('hidden');
  }

  function tryWake(payload, label) {
    try {
      const mind = Seed.decode(payload);
      wake(mind);
    } catch (err) {
      alert(`Could not wake mind${label ? ' from ' + label : ''}: ${err.message}`);
    }
  }

  function stopScanner() {
    if (scanLoop) cancelAnimationFrame(scanLoop);
    scanLoop = null;
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      stream = null;
    }
    scannerStart.disabled = false;
    scannerStop.disabled = true;
    scannerStatus.textContent = 'Camera idle.';
  }

  async function startScanner() {
    if (typeof jsQR === 'undefined') {
      scannerStatus.textContent = 'jsQR not loaded.';
      return;
    }
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
      scannerVideo.srcObject = stream;
      await scannerVideo.play();
      scannerStart.disabled = true;
      scannerStop.disabled = false;
      scannerStatus.textContent = 'Scanning for your mind…';

      const ctx = scannerCanvas.getContext('2d');
      const tick = () => {
        if (!stream) return;
        if (scannerVideo.readyState === scannerVideo.HAVE_ENOUGH_DATA) {
          scannerCanvas.width = scannerVideo.videoWidth;
          scannerCanvas.height = scannerVideo.videoHeight;
          ctx.drawImage(scannerVideo, 0, 0);
          const image = ctx.getImageData(0, 0, scannerCanvas.width, scannerCanvas.height);
          const code = jsQR(image.data, image.width, image.height, {
            inversionAttempts: 'dontInvert',
          });
          if (code && code.data) {
            stopScanner();
            tryWake(code.data, 'QR scan');
            return;
          }
        }
        scanLoop = requestAnimationFrame(tick);
      };
      tick();
    } catch (err) {
      stopScanner();
      scannerStatus.textContent = `Camera error: ${err.message}`;
    }
  }

  forgeBtn.addEventListener('click', () => forgeBlank());
  copyPayload.addEventListener('click', () => {
    if (!lastPayload) return;
    navigator.clipboard?.writeText(lastPayload).then(
      () => { forgeMeta.textContent = 'Payload copied.'; },
      () => alert('Copy failed.')
    );
  });
  downloadJson.addEventListener('click', () => {
    const mind = session ? session.mind : Seed.BLANK;
    const blob = new Blob([JSON.stringify(Seed.merge(mind), null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'seed-mind.json';
    a.click();
    URL.revokeObjectURL(a.href);
  });

  pasteLoad.addEventListener('click', () => {
    const v = pasteArea.value.trim();
    if (!v) return alert('Paste a CSNS payload or JSON first.');
    tryWake(v, 'paste');
  });

  fileInput.addEventListener('change', async () => {
    const f = fileInput.files?.[0];
    if (!f) return;
    tryWake(await f.text(), f.name);
  });

  scannerStart.addEventListener('click', startScanner);
  scannerStop.addEventListener('click', stopScanner);

  chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!session) return;
    const text = chatInput.value.trim();
    if (!text) return;
    chatInput.value = '';
    bubble('you', text);
    const out = session.reply(text);
    session.refresh();
    bubble('mind', out);
    renderFiling();
  });

  exportBtn.addEventListener('click', async () => {
    if (!session) return;
    const merged = Seed.merge(session.base);
    await showPayload(exportQr, exportMeta, merged);
    exportQr.parentElement.classList.remove('hidden');
    bubble('system', 'Updated QR ready — scan it anywhere to carry what you taught.');
  });

  ejectBtn.addEventListener('click', eject);

  if (location.hash.startsWith('#csns=')) {
    tryWake(decodeURIComponent(location.hash.slice(6)), 'URL');
  } else {
    forgeBlank();
  }
})();
