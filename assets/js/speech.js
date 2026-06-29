/**
 * Thin wrappers around the Web Speech APIs.
 *
 * - Speech.listen(onResult, onEnd) : start dictation, returns a stop() fn.
 * - Speech.speak(text, voiceCfg)   : speak via SpeechSynthesis.
 * - Speech.pickVoice(voiceCfg)     : pick the best voice based on prefs.
 */
(function (global) {
  const synth = global.speechSynthesis;
  const SR =
    global.SpeechRecognition ||
    global.webkitSpeechRecognition ||
    null;

  let voices = [];
  function refreshVoices() {
    if (synth) voices = synth.getVoices();
  }
  if (synth) {
    refreshVoices();
    synth.onvoiceschanged = refreshVoices;
  }

  function pickVoice(voiceCfg = {}) {
    if (!voices.length) refreshVoices();
    if (!voices.length) return null;
    const pref = (voiceCfg.gender || 'any').toLowerCase();
    const femaleHints = /(female|woman|samantha|victoria|karen|tessa|aria|zira|lily|joanna|amy|google.*female)/i;
    const maleHints = /(male|man|daniel|alex|fred|david|guy|google.*male)/i;
    const langPref = (global.navigator.language || 'en-US').toLowerCase();

    const scored = voices.map((v) => {
      let score = 0;
      if (v.lang && v.lang.toLowerCase().startsWith(langPref.split('-')[0])) score += 3;
      if (v.lang && v.lang.toLowerCase() === langPref) score += 2;
      if (pref === 'female' && femaleHints.test(v.name)) score += 4;
      if (pref === 'male' && maleHints.test(v.name)) score += 4;
      if (pref !== 'any' && pref === 'female' && maleHints.test(v.name)) score -= 2;
      if (pref !== 'any' && pref === 'male' && femaleHints.test(v.name)) score -= 2;
      if (v.localService) score += 1;
      return { v, score };
    });
    scored.sort((a, b) => b.score - a.score);
    return scored[0].v;
  }

  function speak(text, voiceCfg = {}) {
    if (!synth || !text) return;
    try { synth.cancel(); } catch (_) {}
    const u = new SpeechSynthesisUtterance(text);
    const voice = pickVoice(voiceCfg);
    if (voice) u.voice = voice;
    u.rate = clamp(voiceCfg.rate ?? 1, 0.5, 1.5);
    u.pitch = clamp(voiceCfg.pitch ?? 1, 0.5, 1.5);
    u.volume = 1;
    synth.speak(u);
  }

  function stopSpeaking() {
    if (synth) {
      try { synth.cancel(); } catch (_) {}
    }
  }

  function listen({ onResult, onEnd, onError } = {}) {
    if (!SR) {
      onError && onError(new Error('SpeechRecognition not supported in this browser.'));
      return null;
    }
    const rec = new SR();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = global.navigator.language || 'en-US';

    rec.onresult = (e) => {
      const transcript = Array.from(e.results)
        .map((r) => r[0]?.transcript || '')
        .join(' ')
        .trim();
      if (transcript) onResult && onResult(transcript);
    };
    rec.onerror = (e) => onError && onError(e.error || e);
    rec.onend = () => onEnd && onEnd();

    try {
      rec.start();
    } catch (err) {
      onError && onError(err);
      return null;
    }
    return {
      stop: () => {
        try { rec.stop(); } catch (_) {}
      },
      abort: () => {
        try { rec.abort(); } catch (_) {}
      },
    };
  }

  function clamp(n, lo, hi) {
    if (Number.isNaN(Number(n))) return lo;
    return Math.min(hi, Math.max(lo, Number(n)));
  }

  global.Speech = {
    supported: { recognition: !!SR, synthesis: !!synth },
    listen,
    speak,
    stopSpeaking,
    pickVoice,
  };
})(window);
