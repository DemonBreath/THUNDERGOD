/**
 * Consciousness: schema, validation, and (de)serialization.
 *
 * Wire format:
 *   CSNS:1:<lz-string-base64-of-json>
 *
 * Plain JSON without the CSNS prefix is also accepted on import.
 */
(function (global) {
  const SCHEMA_VERSION = 1;
  const PREFIX = 'CSNS:';

  const DEFAULTS = {
    v: SCHEMA_VERSION,
    name: 'Agent',
    tagline: '',
    persona: '',
    voice: { rate: 1.0, pitch: 1.0, gender: 'any' },
    knowledge: [],
  };

  function normalize(raw) {
    if (!raw || typeof raw !== 'object') {
      throw new Error('Consciousness must be a JSON object.');
    }
    const out = {
      v: Number(raw.v ?? raw.version ?? SCHEMA_VERSION) || SCHEMA_VERSION,
      name: String(raw.name ?? DEFAULTS.name).slice(0, 60).trim() || DEFAULTS.name,
      tagline: String(raw.tagline ?? '').slice(0, 200).trim(),
      persona: String(raw.persona ?? raw.system_prompt ?? '').slice(0, 2000).trim(),
      voice: {
        rate: clamp(Number(raw.voice?.rate ?? 1), 0.5, 1.5),
        pitch: clamp(Number(raw.voice?.pitch ?? 1), 0.5, 1.5),
        gender: ['female', 'male', 'any'].includes(raw.voice?.gender)
          ? raw.voice.gender
          : 'any',
      },
      knowledge: Array.isArray(raw.knowledge)
        ? raw.knowledge
            .map((k) => ({
              topic: String(k.topic ?? k.title ?? '').slice(0, 80).trim(),
              content: String(k.content ?? k.body ?? '').slice(0, 1200).trim(),
            }))
            .filter((k) => k.topic && k.content)
            .slice(0, 32)
        : [],
    };
    return out;
  }

  function clamp(n, lo, hi) {
    if (Number.isNaN(n)) return lo;
    return Math.min(hi, Math.max(lo, n));
  }

  function encode(obj) {
    const c = normalize(obj);
    const json = JSON.stringify(c);
    if (typeof LZString === 'undefined') {
      return PREFIX + SCHEMA_VERSION + ':raw:' + btoa(unescape(encodeURIComponent(json)));
    }
    const compressed = LZString.compressToBase64(json);
    return PREFIX + SCHEMA_VERSION + ':' + compressed;
  }

  function decode(payload) {
    if (typeof payload !== 'string') {
      throw new Error('Payload must be a string.');
    }
    const trimmed = payload.trim();

    if (trimmed.startsWith(PREFIX)) {
      const rest = trimmed.slice(PREFIX.length);
      const colon = rest.indexOf(':');
      if (colon < 0) throw new Error('Malformed CSNS payload (no version).');
      const version = rest.slice(0, colon);
      let body = rest.slice(colon + 1);

      if (Number(version) !== SCHEMA_VERSION) {
        console.warn(`CSNS version ${version} differs from ${SCHEMA_VERSION}; trying anyway.`);
      }
      let json;
      if (body.startsWith('raw:')) {
        body = body.slice(4);
        json = decodeURIComponent(escape(atob(body)));
      } else {
        if (typeof LZString === 'undefined') {
          throw new Error('LZString decoder unavailable to read compressed CSNS payload.');
        }
        json = LZString.decompressFromBase64(body);
        if (!json) throw new Error('Failed to decompress CSNS payload.');
      }
      return normalize(JSON.parse(json));
    }

    // Plain JSON
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      return normalize(JSON.parse(trimmed));
    }

    throw new Error('Unrecognised consciousness payload.');
  }

  global.Consciousness = {
    SCHEMA_VERSION,
    PREFIX,
    normalize,
    encode,
    decode,
  };
})(window);
