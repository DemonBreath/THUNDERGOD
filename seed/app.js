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
  const cloudList = document.getElementById('cloud-list');
  const cloudStats = document.getElementById('cloud-stats');
  const cloudCanvas = document.getElementById('cloud-canvas');

  let session = null;
  let lastPayload = '';
  let currentLineId = null;
  let scanLoop = null;
  let stream = null;

  function bubble(role, text) {
    const el = document.createElement('div');
    el.className = `bubble ${role}`;
    el.textContent = text;
    transcript.appendChild(el);
    transcript.scrollTop = transcript.scrollHeight;
  }

  function renderCloud() {
    if (!cloudList || !currentLineId) return;
    const hist = InfiniteCloud.history(currentLineId);
    const stats = InfiniteCloud.lineStats(currentLineId);
    cloudList.innerHTML = '';
    cloudStats.textContent = `${stats.layers} QR layer${stats.layers === 1 ? '' : 's'} · ${stats.bytes.toLocaleString()} chars archived`;

    if (!hist.length) {
      cloudList.innerHTML = '<li class="cloud-empty">Genesis only — export to add layers.</li>';
    } else {
      for (const q of hist) {
        const li = document.createElement('li');
        const when = new Date(q.at).toLocaleString();
        li.innerHTML = `<strong>#${q.gen}</strong> ${q.label}<br><span class="muted small">${q.knowledgeCount} facts · ${when}</span>`;
        cloudList.appendChild(li);
      }
    }
    drawCloudViz(hist.length);
  }

  function drawCloudViz(layers) {
    if (!cloudCanvas) return;
    const ctx = cloudCanvas.getContext('2d');
    const W = cloudCanvas.width;
    const H = cloudCanvas.height;
    ctx.clearRect(0, 0, W, H);
    const count = Math.max(layers, 1);
    for (let i = 0; i < count + 4; i++) {
      const x = (W * 0.12) + ((i % 5) / 4) * W * 0.76;
      const y = H * (0.22 + (i % 3) * 0.18);
      const r = 14 + (i % 4) * 8 + Math.min(layers, 12) * 1.2;
      const a = 0.08 + (i < layers ? 0.14 : 0.05);
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(110, 231, 183, ${a + 0.12})`);
      g.addColorStop(1, 'rgba(110, 231, 183, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
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
    const lineId = InfiniteCloud.uid();
    currentLineId = lineId;
    const mind = Seed.normalize({ ...Seed.BLANK, line: lineId, gen: 0 });
    const nameInput = document.getElementById('seed-name');
    if (nameInput && nameInput.value.trim()) {
      mind.name = nameInput.value.trim().slice(0, 60);
    }
    const payload = Seed.encode(mind);
    InfiniteCloud.genesis(mind, payload);
    await showPayload(forgeQr, forgeMeta, mind);
    pasteArea.value = payload;
    renderCloud();
  }

  function wake(mind, payload) {
    const lineId = mind.line || InfiniteCloud.uid();
    currentLineId = lineId;
    if (payload) {
      const hist = InfiniteCloud.history(lineId);
      if (!hist.length) InfiniteCloud.genesis(mind, payload);
      else if (!hist.some((q) => q.payload === payload)) {
        InfiniteCloud.archive(lineId, mind, payload, `scanned layer ${hist.length}`);
      }
    }
    session = Seed.createMind(mind, { lineId });
    mindName.textContent = session.mind.name;
    mindTag.textContent =
      (session.mind.tagline || '') +
      (InfiniteCloud.history(lineId).length > 1
        ? ` · ${InfiniteCloud.history(lineId).length} QRs in the cloud`
        : ' · genesis QR');
    mindAvatar.textContent = (session.mind.name || 'S').charAt(0).toUpperCase();

    forgeStage.classList.add('hidden');
    wakeStage.classList.add('hidden');
    teachStage.classList.remove('hidden');

    transcript.innerHTML = '';
    const hello = session.reply('hello');
    bubble('mind', hello);
    renderFiling();
    renderCloud();
    teachStage.scrollIntoView({ behavior: 'smooth' });
  }

  function eject() {
    session = null;
    currentLineId = null;
    stopScanner();
    teachStage.classList.add('hidden');
    forgeStage.classList.remove('hidden');
    wakeStage.classList.remove('hidden');
    exportQr.parentElement.classList.add('hidden');
  }

  function tryWake(payload, label) {
    try {
      const mind = Seed.decode(payload);
      wake(mind, payload);
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
    renderCloud();
  });

  exportBtn.addEventListener('click', async () => {
    if (!session) return;
    const lineId = session.lineId || currentLineId;
    const merged = InfiniteCloud.synthesize(lineId, Seed.merge(session.base), Seed.decode);
    const gen = InfiniteCloud.history(lineId).length;
    const stamped = InfiniteCloud.stampMind(merged, lineId, gen);
    const payload = Seed.encode(stamped);
    InfiniteCloud.archive(lineId, stamped, payload, `export #${gen}`);
    await showPayload(exportQr, exportMeta, stamped);
    exportQr.parentElement.classList.remove('hidden');
    session.resynthesize();
    renderFiling();
    renderCloud();
    bubble('system', `Layer #${gen} archived in the infinite cloud. Mind draws on ${gen + 1} QRs now.`);
  });

  ejectBtn.addEventListener('click', eject);

  if (location.hash.startsWith('#csns=')) {
    tryWake(decodeURIComponent(location.hash.slice(6)), 'URL');
  } else {
    forgeBlank();
  }
})();
