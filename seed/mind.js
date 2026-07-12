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
      line: raw.line ? String(raw.line).slice(0, 64) : undefined,
      gen: Number.isFinite(Number(raw.gen)) ? Number(raw.gen) : undefined,
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

  function createMind(base, cloudCtx) {
    const lineId = cloudCtx?.lineId || base.line || null;
    let c = lineId && window.InfiniteCloud
      ? InfiniteCloud.synthesize(lineId, merge(base), decode)
      : merge(base);
    const chat = [];

    function pick(a) {
      return a[Math.floor(Math.random() * a.length)];
    }

    function recall(query) {
      if (lineId && window.InfiniteCloud) {
        const hit = InfiniteCloud.recall(lineId, query, c.knowledge, decode);
        if (hit) return hit;
      }
      const q = query.toLowerCase();
      const hit = c.knowledge.find(
        (k) => q.includes(k.topic.toLowerCase()) || k.topic.toLowerCase().includes(q)
      );
      if (hit) return { content: hit.content, topic: hit.topic, fromGen: 'now' };
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
      return best ? { content: best.content, topic: best.topic, fromGen: 'now' } : null;
    }

    function cloudLayers() {
      return lineId && window.InfiniteCloud ? InfiniteCloud.history(lineId).length : 0;
    }

    function reply(user) {
      const text = user.trim();
      const low = text.toLowerCase();
      chat.push({ role: 'you', text });
      let out;

      if (!text) {
        out = 'I\'m listening. Teach me something, or ask what I know so far.';
      } else if (/^(hi|hello|hey|wake|start)/.test(low)) {
        const layers = cloudLayers();
        out = c.knowledge.length
          ? pick([
              `Hello. I'm ${c.name}. ${layers ? `I draw on ${layers} QR${layers > 1 ? 's' : ''} in the cloud.` : ''} You've taught me ${c.knowledge.length} things.`,
              `${c.name} here — awake, carrying what you've filed${layers ? ` across ${layers} generations` : ''}.`,
            ])
          : pick([
              `Hello. I'm ${c.name}. Genesis QR — empty except for readiness.`,
              `I'm awake from the first QR. Teach me, and each export becomes another layer in the cloud.`,
            ]);
      } else if (/(who are you|what are you|your name)/.test(low)) {
        const layers = cloudLayers();
        out = c.knowledge.length
          ? `${c.name}. ${c.tagline}${layers ? ` Drawing on ${layers} QRs in the infinite cloud.` : ''} Topics: ${c.knowledge.map((k) => k.topic).join(', ')}.`
          : `${c.name}. ${c.tagline} Genesis mind — nothing filed yet.`;
      } else if (/(qr history|cloud history|past qr|generations|how many qr)/.test(low)) {
        const layers = cloudLayers();
        if (!layers) {
          out = 'No cloud history yet — this is your genesis QR. Export to archive the first layer.';
        } else {
          const hist = InfiniteCloud.history(lineId);
          out =
            `${layers} QR layer${layers > 1 ? 's' : ''} in the infinite cloud:\n` +
            hist.map((q) => `• #${q.gen} ${q.label} — ${q.knowledgeCount} facts`).join('\n');
        }
      } else if (/(what do you know|what have i taught|list|show memory|filing)/.test(low)) {
        if (!c.knowledge.length) {
          out = 'Nothing filed yet. Try: teach: your name :: what you want me to call you';
        } else {
          const layers = cloudLayers();
          out =
            `${c.knowledge.length} things known${layers ? ` (drawn from ${layers} QR layers + live teaching)` : ''}:\n` +
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
          out = `Filed under "${lesson.topic}". It's part of me now — export to archive another QR layer in the cloud.`;
        } else {
          const known = recall(text);
          if (known) {
            const src =
              known.fromGen === 'now'
                ? ''
                : known.fromGen === 0
                  ? ' (from genesis QR)'
                  : ` (from cloud layer #${known.fromGen})`;
            out = known.content + src;
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
      get lineId() {
        return lineId;
      },
      get chat() {
        return chat.slice();
      },
      reply,
      refresh() {
        c =
          lineId && window.InfiniteCloud
            ? InfiniteCloud.synthesize(lineId, merge(base), decode)
            : merge(base);
      },
      resynthesize() {
        this.refresh();
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
