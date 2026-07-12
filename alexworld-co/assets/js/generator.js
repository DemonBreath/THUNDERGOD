/**
 * Export page: form -> consciousness JSON -> CSNS payload -> QR.
 */
(function () {
  const form = document.getElementById('export-form');
  const wrap = document.getElementById('qr-canvas-wrap');
  const info = document.getElementById('qr-info');
  const payloadEl = document.getElementById('qr-payload');
  const rawJsonArea = document.getElementById('raw-json');
  const applyRawBtn = document.getElementById('apply-raw');
  const downloadBtn = document.getElementById('download-json');

  let lastConsciousness = null;
  let lastPayload = '';

  function readKnowledge(raw) {
    return raw
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const idx = line.indexOf('::');
        if (idx < 0) return { topic: 'note', content: line };
        return {
          topic: line.slice(0, idx).trim(),
          content: line.slice(idx + 2).trim(),
        };
      });
  }

  function formToConsciousness() {
    const fd = new FormData(form);
    return window.Consciousness.normalize({
      v: 1,
      name: fd.get('name'),
      tagline: fd.get('tagline'),
      persona: fd.get('persona'),
      voice: {
        rate: Number(fd.get('rate')),
        pitch: Number(fd.get('pitch')),
        gender: fd.get('voice_gender'),
      },
      knowledge: readKnowledge(String(fd.get('knowledge') || '')),
    });
  }

  function consciousnessToForm(c) {
    form.elements.name.value = c.name || '';
    form.elements.tagline.value = c.tagline || '';
    form.elements.persona.value = c.persona || '';
    form.elements.rate.value = c.voice?.rate ?? 1;
    form.elements.pitch.value = c.voice?.pitch ?? 1;
    form.elements.voice_gender.value = c.voice?.gender || 'any';
    form.elements.knowledge.value = (c.knowledge || [])
      .map((k) => `${k.topic} :: ${k.content}`)
      .join('\n');
  }

  async function renderQR(text) {
    wrap.innerHTML = '';
    const canvas = document.createElement('canvas');
    wrap.appendChild(canvas);
    await QRCode.toCanvas(canvas, text, {
      errorCorrectionLevel: 'L',
      margin: 2,
      width: 360,
      color: { dark: '#0b0d12', light: '#ffffff' },
    });
  }

  async function generate(c) {
    lastConsciousness = c;
    lastPayload = window.Consciousness.encode(c);

    try {
      await renderQR(lastPayload);
      payloadEl.textContent = lastPayload;
      const jsonLen = JSON.stringify(c).length;
      info.textContent = `Encoded ${jsonLen} bytes of JSON into a ${lastPayload.length}-character QR payload. Scan it on the Host page.`;
    } catch (err) {
      wrap.innerHTML = `<div class="muted small">QR error: ${err.message}. The consciousness is probably too large — try fewer/shorter knowledge entries.</div>`;
      payloadEl.textContent = lastPayload;
      info.textContent = `Payload is ${lastPayload.length} chars — QR encoder couldn't render it. Try trimming the persona or knowledge.`;
    }
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const c = formToConsciousness();
      await generate(c);
    } catch (err) {
      alert(err.message);
    }
  });

  applyRawBtn.addEventListener('click', async () => {
    try {
      const raw = rawJsonArea.value.trim();
      if (!raw) throw new Error('Paste some JSON first.');
      const c = window.Consciousness.decode(raw);
      consciousnessToForm(c);
      await generate(c);
    } catch (err) {
      alert(err.message);
    }
  });

  downloadBtn.addEventListener('click', () => {
    const c = lastConsciousness || formToConsciousness();
    const blob = new Blob([JSON.stringify(c, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${(c.name || 'consciousness').toLowerCase().replace(/\s+/g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  });

  // Prefill with the Aria sample so the page isn't empty on load.
  (async () => {
    try {
      const params = new URLSearchParams(location.search);
      const draft = sessionStorage.getItem('alexworld-export-draft');
      if (params.get('from') === 'host' && draft) {
        const c = window.Consciousness.normalize(JSON.parse(draft));
        consciousnessToForm(c);
        await generate(c);
        info.textContent += ' Loaded learned knowledge from the Host session.';
        sessionStorage.removeItem('alexworld-export-draft');
        return;
      }

      const res = await fetch('samples/aria.json', { cache: 'no-store' });
      if (res.ok) {
        const sample = window.Consciousness.normalize(await res.json());
        consciousnessToForm(sample);
        await generate(sample);
      }
    } catch (_) {
      /* offline fine */
    }
  })();
})();
