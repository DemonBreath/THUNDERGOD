/**
 * INFINITE CLOUD — unbounded QR history storage.
 * Start from one QR. Every export becomes another layer in the cloud.
 * The mind draws upon the whole history, not just the latest code.
 */
(() => {
  'use strict';

  const CLOUD_KEY = 'infinite-cloud:lines';
  const MAX_LINES = 256;

  function uid() {
    if (crypto?.randomUUID) return crypto.randomUUID();
    return 'line-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
  }

  function hash(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
    return Math.abs(h).toString(36);
  }

  function readIndex() {
    try {
      const raw = localStorage.getItem(CLOUD_KEY);
      return raw ? JSON.parse(raw) : { lines: {} };
    } catch {
      return { lines: {} };
    }
  }

  function writeIndex(index) {
    localStorage.setItem(CLOUD_KEY, JSON.stringify(index));
  }

  function ensureLine(lineId) {
    const index = readIndex();
    if (!index.lines[lineId]) {
      index.lines[lineId] = {
        id: lineId,
        name: 'Seed',
        created: Date.now(),
        qrs: [],
      };
      writeIndex(index);
    }
    return index.lines[lineId];
  }

  function genesis(mind, payload) {
    const lineId = mind.line || uid();
    const line = ensureLine(lineId);
    line.name = mind.name || line.name;
    const entry = {
      id: hash(payload) + '-' + line.qrs.length,
      gen: line.qrs.length,
      at: Date.now(),
      payload,
      knowledgeCount: mind.knowledge?.length || 0,
      label: line.qrs.length === 0 ? 'genesis QR' : `generation ${line.qrs.length}`,
    };
    const exists = line.qrs.some((q) => q.payload === payload);
    if (!exists) line.qrs.push(entry);
    const index = readIndex();
    index.lines[lineId] = line;
    writeIndex(index);
    return { lineId, entry, line };
  }

  function archive(lineId, mind, payload, label) {
    const line = ensureLine(lineId);
    line.name = mind.name || line.name;
    const entry = {
      id: hash(payload) + '-' + line.qrs.length,
      gen: line.qrs.length,
      at: Date.now(),
      payload,
      knowledgeCount: mind.knowledge?.length || 0,
      label: label || `generation ${line.qrs.length}`,
    };
    if (!line.qrs.some((q) => q.payload === payload)) {
      line.qrs.push(entry);
    }
    const index = readIndex();
    index.lines[lineId] = line;
    writeIndex(index);
    return entry;
  }

  function history(lineId) {
    const line = readIndex().lines[lineId];
    return line ? line.qrs.slice() : [];
  }

  function allKnowledgeFromCloud(lineId, decodeFn) {
    const items = [];
    const seen = new Set();
    for (const qr of history(lineId)) {
      try {
        const mind = decodeFn(qr.payload);
        for (const k of mind.knowledge || []) {
          const key = k.topic.toLowerCase();
          if (!seen.has(key)) {
            seen.add(key);
            items.push({
              topic: k.topic,
              content: k.content,
              fromGen: qr.gen,
              fromLabel: qr.label,
            });
          }
        }
      } catch {
        /* skip corrupt layer */
      }
    }
    return items;
  }

  function synthesize(lineId, currentMind, decodeFn) {
    const cloudKnowledge = allKnowledgeFromCloud(lineId, decodeFn);
    const merged = [...(currentMind.knowledge || [])];
    const topics = new Set(merged.map((k) => k.topic.toLowerCase()));

    for (const k of cloudKnowledge) {
      const key = k.topic.toLowerCase();
      const idx = merged.findIndex((m) => m.topic.toLowerCase() === key);
      if (idx >= 0) {
        merged[idx] = { topic: k.topic, content: k.content };
      } else if (merged.length < 32) {
        merged.push({ topic: k.topic, content: k.content });
        topics.add(key);
      }
    }

    return {
      ...currentMind,
      knowledge: merged,
      cloudLayers: history(lineId).length,
    };
  }

  function recall(lineId, query, currentKnowledge, decodeFn) {
    const q = query.toLowerCase();
    const pool = [
      ...currentKnowledge.map((k) => ({ ...k, fromGen: 'now' })),
      ...allKnowledgeFromCloud(lineId, decodeFn),
    ];

    const direct = pool.find(
      (k) => q.includes(k.topic.toLowerCase()) || k.topic.toLowerCase().includes(q)
    );
    if (direct) {
      return {
        content: direct.content,
        topic: direct.topic,
        fromGen: direct.fromGen,
      };
    }

    let best = null;
    let score = 0;
    for (const k of pool) {
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
    return best ? { content: best.content, topic: best.topic, fromGen: best.fromGen } : null;
  }

  function stampMind(mind, lineId, gen) {
    return { ...mind, line: lineId, gen };
  }

  function lineStats(lineId) {
    const qrs = history(lineId);
    return {
      layers: qrs.length,
      bytes: qrs.reduce((n, q) => n + (q.payload?.length || 0), 0),
      oldest: qrs[0]?.at || null,
      newest: qrs[qrs.length - 1]?.at || null,
    };
  }

  function listLines() {
    const index = readIndex();
    return Object.values(index.lines)
      .map((line) => ({
        id: line.id,
        name: line.name,
        layers: line.qrs.length,
        created: line.created,
      }))
      .sort((a, b) => b.created - a.created)
      .slice(0, MAX_LINES);
  }

  window.InfiniteCloud = {
    genesis,
    archive,
    history,
    synthesize,
    recall,
    stampMind,
    lineStats,
    listLines,
    allKnowledgeFromCloud,
    uid,
  };
})();
