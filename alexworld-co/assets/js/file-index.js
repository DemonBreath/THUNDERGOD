/**
 * Registry of every file on the site that an imported agent is allowed to read.
 */
(function (global) {
  const FILES = [
    { path: 'README.md', kind: 'text', description: 'Project overview.' },
    { path: 'index.html', kind: 'html', description: 'Host — import mind, chat, dream body.' },
    { path: 'export.html', kind: 'html', description: 'Forge a consciousness QR code.' },
    { path: 'about.html', kind: 'html', description: 'About Alexworld and the CSNS schema.' },
    { path: 'assets/css/style.css', kind: 'css', description: 'Site styles.' },
    { path: 'assets/js/main.js', kind: 'js', description: 'Host bootstrap — import, chat, body dream.' },
    { path: 'assets/js/consciousness.js', kind: 'js', description: 'CSNS schema, encode, decode.' },
    { path: 'assets/js/body.js', kind: 'js', description: 'Body dreamer — hardware picked around the mind.' },
    { path: 'assets/js/scanner.js', kind: 'js', description: 'Camera + QR scanning.' },
    { path: 'assets/js/generator.js', kind: 'js', description: 'QR encoder on the export page.' },
    { path: 'assets/js/speech.js', kind: 'js', description: 'Speech recognition and synthesis.' },
    { path: 'assets/js/engine.js', kind: 'js', description: 'Local response engine.' },
    { path: 'assets/js/file-index.js', kind: 'js', description: 'This file — the agent\'s map of the site.' },
    { path: 'samples/aria.json', kind: 'json', description: 'Sample: Aria, a curious archivist.' },
    { path: 'samples/thunder.json', kind: 'json', description: 'Sample: Thunder, a terse oracle.' },
    { path: 'samples/rift.json', kind: 'json', description: 'Sample: Rift — warm, initiative-first.' },
  ];

  const cache = new Map();

  async function read(path) {
    if (cache.has(path)) return cache.get(path);
    const res = await fetch(path, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Failed to read ${path}: ${res.status}`);
    const text = await res.text();
    cache.set(path, text);
    return text;
  }

  function list() {
    return FILES.slice();
  }

  function find(query) {
    if (!query) return [];
    const q = query.toLowerCase();
    return FILES.filter(
      (f) =>
        f.path.toLowerCase().includes(q) ||
        f.description.toLowerCase().includes(q) ||
        f.kind.toLowerCase() === q
    );
  }

  function summarize(text, maxChars = 240) {
    if (!text) return '';
    const cleaned = text.replace(/\s+/g, ' ').trim();
    if (cleaned.length <= maxChars) return cleaned;
    return cleaned.slice(0, maxChars - 1).trimEnd() + '…';
  }

  global.FileIndex = { list, read, find, summarize };
})(window);
