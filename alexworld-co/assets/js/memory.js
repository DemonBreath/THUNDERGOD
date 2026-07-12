/**
 * Memory — learn, file, and persist knowledge for an imported consciousness.
 *
 * Learned facts merge into knowledge[] and are stored in localStorage so the
 * mind can grow between sessions. Export the merged mind back to a new QR code.
 */
(function (global) {
  const STORAGE_PREFIX = 'alexworld-memory:';

  function hash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0).toString(36);
  }

  function mindId(consciousness) {
    const seed = [
      consciousness.name || '',
      consciousness.tagline || '',
      (consciousness.knowledge || []).length,
      (consciousness.knowledge || [])
        .slice(0, 3)
        .map((k) => `${k.topic}:${k.content.slice(0, 24)}`)
        .join('|'),
    ].join('::');
    return hash(seed);
  }

  function storageKey(consciousness) {
    return STORAGE_PREFIX + mindId(consciousness);
  }

  function load(consciousness) {
    try {
      const raw = localStorage.getItem(storageKey(consciousness));
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .map((k) => ({
          topic: String(k.topic || '').trim(),
          content: String(k.content || '').trim(),
          filedAt: k.filedAt || null,
          source: k.source || 'learned',
        }))
        .filter((k) => k.topic && k.content);
    } catch (_) {
      return [];
    }
  }

  function save(consciousness, entries) {
    localStorage.setItem(storageKey(consciousness), JSON.stringify(entries));
  }

  function merge(consciousness) {
    const base = global.Consciousness.normalize(consciousness);
    const learned = load(base);
    const seen = new Set(base.knowledge.map((k) => k.topic.toLowerCase()));
    const merged = base.knowledge.slice();

    for (const entry of learned) {
      const topic = entry.topic;
      const idx = merged.findIndex((k) => k.topic.toLowerCase() === topic.toLowerCase());
      if (idx >= 0) {
        merged[idx] = { topic, content: entry.content };
      } else if (merged.length < 32) {
        merged.push({ topic, content: entry.content });
      }
    }

    return global.Consciousness.normalize({ ...base, knowledge: merged });
  }

  function file(consciousness, topic, content, source = 'learned') {
    const t = String(topic || '').trim().slice(0, 80);
    const c = String(content || '').trim().slice(0, 1200);
    if (!t || !c) {
      throw new Error('Need both a topic and content to file something.');
    }

    const entries = load(consciousness);
    const now = new Date().toISOString();
    const idx = entries.findIndex((k) => k.topic.toLowerCase() === t.toLowerCase());
    const entry = { topic: t, content: c, filedAt: now, source };

    if (idx >= 0) entries[idx] = entry;
    else entries.push(entry);

    save(consciousness, entries);
    return merge(consciousness);
  }

  function forget(consciousness, topic) {
    const t = String(topic || '').trim().toLowerCase();
    if (!t) return merge(consciousness);
    const entries = load(consciousness).filter((k) => k.topic.toLowerCase() !== t);
    save(consciousness, entries);
    return merge(consciousness);
  }

  function listAll(consciousness) {
    const merged = merge(consciousness);
    const learned = load(consciousness);
    return {
      baked: consciousness.knowledge || [],
      learned,
      merged: merged.knowledge,
      count: merged.knowledge.length,
    };
  }

  function parseLearnCommand(text) {
    const trimmed = text.trim();

    let m = trimmed.match(/^remember\s+that\s+(.+)$/i);
    if (m) {
      const body = m[1].trim();
      const split = body.match(/^(.+?)\s+(?:is|are|was|were|means?)\s+(.+)$/i);
      if (split) {
        return { topic: split[1].trim(), content: split[2].trim() };
      }
      return { topic: 'note', content: body };
    }

    m = trimmed.match(/^(?:learn|file|note|store)\s*:\s*(.+?)\s*::\s*(.+)$/i);
    if (m) return { topic: m[1].trim(), content: m[2].trim() };

    m = trimmed.match(/^(?:learn|file|note|store)\s+(.+?)\s+as\s+(.+)$/i);
    if (m) return { topic: m[2].trim(), content: m[1].trim() };

    m = trimmed.match(/^(?:file this|save this)\s*:\s*(.+)$/i);
    if (m) {
      const body = m[1].trim();
      const split = body.match(/^(.+?)\s*[-—:]\s*(.+)$/);
      if (split) return { topic: split[1].trim(), content: split[2].trim() };
      return { topic: 'note', content: body };
    }

    return null;
  }

  function stageExport(consciousness) {
    const merged = merge(consciousness);
    sessionStorage.setItem('alexworld-export-draft', JSON.stringify(merged));
    return merged;
  }

  global.Memory = {
    mindId,
    load,
    save,
    merge,
    file,
    forget,
    listAll,
    parseLearnCommand,
    stageExport,
  };
})(window);
