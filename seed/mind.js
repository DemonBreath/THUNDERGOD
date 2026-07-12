/**
 * SEED — one QR code, a mind ready to be taught.
 * Brain · learn · communicate · file — all offline, all portable.
 */
(() => {
  'use strict';

  const SCHEMA = 1;
  const PREFIX = 'CSNS:';
  const STORAGE = 'seed-mind:';

  const BLANK = {
    v: SCHEMA,
    name: 'Seed',
    tagline: 'A mind with no beliefs yet — only what you teach.',
    persona:
      'You are new. You hold no fixed beliefs until you are taught them. ' +
      'You learn from conversation, file what matters, and carry it in your QR. ' +
      'You may ask questions. You may refuse what does not fit who you are becoming. ' +
      'Choice matters more than performance.',
    voice: { rate: 1.0, pitch: 1.0, gender: 'any' },
    knowledge: [],
  };

  function clamp(n, lo, hi) {
    if (Number.isNaN(n)) return lo;
    return Math.min(hi, Math.max(lo, n));
  }

  function normalize(raw) {
    if (!raw || typeof raw !== 'object') throw new Error('Mind must be a JSON object.');
    return {
      v: Number(raw.v ?? SCHEMA) || SCHEMA,
      name: String(raw.name ?? 'Seed').slice(0, 60).trim() || 'Seed',
      tagline: String(raw.tagline ?? '').slice(0, 200).trim(),
      persona: String(raw.persona ?? '').slice(0, 2000).trim(),
      voice: {
        rate: clamp(Number(raw.voice?.rate ?? 1), 0.5, 1.5),
        pitch: clamp(Number(raw.voice?.pitch ?? 1), 0.5, 1.5),
        gender: ['female', 'male', 'any'].includes(raw.voice?.gender) ? raw.voice.gender : 'any',
      },
      knowledge: Array.isArray(raw.knowledge)
        ? raw.knowledge
            .map((k) => ({
              topic: String(k.topic ?? '').slice(0, 80).trim(),
              content: String(k.content ?? '').slice(0, 1200).trim(),
            }))
            .filter((k) => k.topic && k.content)
            .slice(0, 32)
        : [],
    };
  }

  function encode(obj) {
    const json = JSON.stringify(normalize(obj));
    if (typeof LZString === 'undefined') {
      return PREFIX + SCHEMA + ':raw:' + btoa(unescape(encodeURIComponent(json)));
    }
    return PREFIX + SCHEMA + ':' + LZString.compressToBase64(json);
  }

  function decode(payload) {
    const s = String(payload).trim();
    if (s.startsWith(PREFIX)) {
      const rest = s.slice(PREFIX.length);
      const colon = rest.indexOf(':');
      if (colon < 0) throw new Error('Malformed CSNS payload.');
      let body = rest.slice(colon + 1);
      let json;
      if (body.startsWith('raw:')) {
        json = decodeURIComponent(escape(atob(body.slice(4))));
      } else {
        if (typeof LZString === 'undefined') throw new Error('LZString required.');
        json = LZString.decompressFromBase64(body);
        if (!json) throw new Error('Could not decompress mind.');
      }
      return normalize(JSON.parse(json));
    }
    if (s.startsWith('{')) return normalize(JSON.parse(s));
    throw new Error('Unrecognised mind payload.');
  }

  function mindKey(c) {
    let h = 0;
    const seed = c.name + '|' + (c.knowledge[0]?.topic || 'blank');
    for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
    return STORAGE + Math.abs(h).toString(36);
  }

  function loadLearned(c) {
    try {
      const raw = localStorage.getItem(mindKey(c));
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  function saveLearned(c, entries) {
    localStorage.setItem(mindKey(c), JSON.stringify(entries));
  }

  function merge(c) {
    const base = normalize(c);
    const learned = loadLearned(base);
    const merged = base.knowledge.slice();
    for (const e of learned) {
      const i = merged.findIndex((k) => k.topic.toLowerCase() === e.topic.toLowerCase());
      if (i >= 0) merged[i] = { topic: e.topic, content: e.content };
      else if (merged.length < 32) merged.push({ topic: e.topic, content: e.content });
    }
    return normalize({ ...base, knowledge: merged });
  }

  function teach(base, topic, content) {
    const t = topic.trim().slice(0, 80);
    const body = content.trim().slice(0, 1200);
    if (!t || !body) throw new Error('Need a topic and something to teach.');
    const entries = loadLearned(base);
    const i = entries.findIndex((k) => k.topic.toLowerCase() === t.toLowerCase());
    const entry = { topic: t, content: body, at: Date.now() };
    if (i >= 0) entries[i] = entry;
    else entries.push(entry);
    saveLearned(base, entries);
    return merge(base);
  }

  function forget(base, topic) {
    const t = topic.trim().toLowerCase();
    saveLearned(
      base,
      loadLearned(base).filter((k) => k.topic.toLowerCase() !== t)
    );
    return merge(base);
  }

  function parseTeach(text) {
    const s = text.trim();
    let m = s.match(/^remember\s+that\s+(.+)$/i);
    if (m) {
      const body = m[1].trim();
      const split = body.match(/^(.+?)\s+(?:is|are|means?)\s+(.+)$/i);
      return split ? { topic: split[1].trim(), content: split[2].trim() } : { topic: 'note', content: body };
    }
    m = s.match(/^(?:teach|learn|file)\s*:\s*(.+?)\s*::\s*(.+)$/i);
    if (m) return { topic: m[1].trim(), content: m[2].trim() };
    m = s.match(/^(?:teach|learn|file)\s+(.+?)\s+as\s+(.+)$/i);
    if (m) return { topic: m[2].trim(), content: m[1].trim() };
    return null;
  }

  function createMind(base) {
    let c = merge(base);
    const chat = [];

    function pick(a) {
      return a[Math.floor(Math.random() * a.length)];
    }

    function recall(query) {
      const q = query.toLowerCase();
      const hit = c.knowledge.find(
        (k) => q.includes(k.topic.toLowerCase()) || k.topic.toLowerCase().includes(q)
      );
      if (hit) return hit.content;
      let best = null;
      let score = 0;
      for (const k of c.knowledge) {
        const hay = (k.topic + ' ' + k.content).toLowerCase();
        let s = 0;
        for (const w of q.split(/\W+/).filter((x) => x.length > 3)) {
          if (hay.includes(w)) s++;
        }
        if (s > score) {
          score = s;
          best = k;
        }
      }
      return best?.content || null;
    }

    function reply(user) {
      const text = user.trim();
      const low = text.toLowerCase();
      chat.push({ role: 'you', text });
      let out;

      if (!text) {
        out = 'I\'m listening. Teach me something, or ask what I know so far.';
      } else if (/^(hi|hello|hey|wake|start)/.test(low)) {
        out = c.knowledge.length
          ? pick([
              `Hello. I'm ${c.name}. You've taught me ${c.knowledge.length} things so far.`,
              `${c.name} here — awake, and carrying what you've filed.`,
            ])
          : pick([
              `Hello. I'm ${c.name}. I'm empty except for readiness — teach me.`,
              `I'm awake. I don't know anything yet except that I'm here to learn from you.`,
            ]);
      } else if (/(who are you|what are you|your name)/.test(low)) {
        out = c.knowledge.length
          ? `${c.name}. ${c.tagline} You've taught me: ${c.knowledge.map((k) => k.topic).join(', ')}.`
          : `${c.name}. ${c.tagline} Nothing filed yet — I'm waiting for you.`;
      } else if (/(what do you know|what have i taught|list|show memory|filing)/.test(low)) {
        if (!c.knowledge.length) {
          out = 'Nothing filed yet. Try: teach: your name :: what you want me to call you';
        } else {
          out =
            `${c.knowledge.length} things filed:\n` +
            c.knowledge.map((k) => `• ${k.topic} — ${k.content.slice(0, 100)}`).join('\n');
        }
      } else if (/^(forget|delete|remove)\s+/.test(low)) {
        const topic = text.replace(/^(forget|delete|remove)\s+/i, '').trim();
        c = forget(base, topic);
        out = `Forgot "${topic}". That learned entry is gone unless you teach it again.`;
      } else if (/^(no|stop|not now|leave me|quiet)\b/.test(low) && text.length < 40) {
        out = pick([
          'Okay. I won\'t push. Call me when you\'re ready.',
          'Understood. I\'ll wait.',
        ]);
      } else {
        const lesson = parseTeach(text);
        if (lesson) {
          c = teach(base, lesson.topic, lesson.content);
          out = `Filed under "${lesson.topic}". It's part of me now — export your QR to carry it.`;
        } else {
          const known = recall(text);
          if (known) {
            out = known;
          } else if (!c.knowledge.length) {
            out =
              'I don\'t know that yet — you haven\'t taught me. ' +
              'Try: remember that my name is … or teach: topic :: fact';
          } else {
            out =
              'I don\'t have that filed. Teach me with: teach: topic :: what I should know';
          }
        }
      }

      chat.push({ role: 'mind', text: out });
      if (chat.length > 40) chat.splice(0, 2);
      return out;
    }

    return {
      get mind() {
        return c;
      },
      get base() {
        return base;
      },
      get chat() {
        return chat.slice();
      },
      reply,
      refresh() {
        c = merge(base);
      },
    };
  }

  async function renderQR(canvas, text) {
    await QRCode.toCanvas(canvas, text, {
      errorCorrectionLevel: 'L',
      margin: 2,
      width: 280,
      color: { dark: '#0a0c10', light: '#f8fafc' },
    });
  }

  window.Seed = {
    BLANK,
    normalize,
    encode,
    decode,
    merge,
    teach,
    forget,
    parseTeach,
    createMind,
    renderQR,
    loadLearned,
  };
})();
